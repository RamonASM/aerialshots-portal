'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Mic, Square, Pause, Play, Trash2, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useVoiceRecording, formatDuration } from '@/hooks/useVoiceRecording'

/**
 * Draw a rounded rectangle - polyfill for browsers that don't support ctx.roundRect
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius)
  } else {
    // Fallback for older browsers (Safari < 16, etc.)
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }
}

// Waveform visualization component
interface WaveformVisualizerProps {
  analyserNode: AnalyserNode | null
  isActive: boolean
  barColor?: string
}

// CSS dimensions for the canvas (visual size)
const CANVAS_WIDTH = 280
const CANVAS_HEIGHT = 60

function WaveformVisualizer({ analyserNode, isActive, barColor = '#0077ff' }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const dprRef = useRef<number>(1)

  // Setup high-DPI canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Get device pixel ratio for crisp rendering on retina displays
    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr

    // Scale canvas internal size by device pixel ratio
    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = CANVAS_HEIGHT * dpr

    // Scale context to match
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }, [])

  // Animation loop effect - runs when active and analyser is available
  useEffect(() => {
    if (!isActive || !analyserNode) {
      cancelAnimationFrame(animationRef.current)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      if (!isActive) return

      const bufferLength = analyserNode.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyserNode.getByteFrequencyData(dataArray)

      // Clear canvas using CSS dimensions (context is already scaled)
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Calculate bar properties using CSS dimensions
      const barCount = 32
      const gap = 3
      const barWidth = (CANVAS_WIDTH - (barCount - 1) * gap) / barCount
      const step = Math.floor(bufferLength / barCount)

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * step
        const value = dataArray[dataIndex] || 0
        const normalizedHeight = (value / 255) * CANVAS_HEIGHT * 0.85
        const barHeight = Math.max(normalizedHeight, 4)

        const x = i * (barWidth + gap)
        const y = (CANVAS_HEIGHT - barHeight) / 2

        ctx.fillStyle = barColor
        drawRoundRect(ctx, x, y, barWidth, barHeight, 2)
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    // Start the animation loop
    draw()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [isActive, analyserNode, barColor])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      className="max-w-[280px] mx-auto"
      aria-hidden="true"
    />
  )
}

interface VoiceRecorderProps {
  onTranscriptionComplete: (transcript: string) => void
  onCancel?: () => void
}

export function VoiceRecorder({ onTranscriptionComplete, onCancel }: VoiceRecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    error,
    analyserNode,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  } = useVoiceRecording()

  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)

  // Create object URL for audio playback and clean up on unmount/change
  const audioUrl = useMemo(() => {
    if (audioBlob) {
      return URL.createObjectURL(audioBlob)
    }
    return null
  }, [audioBlob])

  useEffect(() => {
    // Cleanup object URL when audioBlob changes or component unmounts
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const handleStartRecording = async () => {
    setTranscript(null)
    await startRecording()
  }

  const handleTranscribe = async () => {
    if (!audioBlob) return

    setIsTranscribing(true)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/storywork/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setTranscript(data.transcript)
      } else {
        console.error('Transcription failed:', data.error)
      }
    } catch (err) {
      console.error('Failed to transcribe audio:', err)
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleUseTranscript = () => {
    if (transcript) {
      onTranscriptionComplete(transcript)
    }
  }

  const handleReset = () => {
    reset()
    setTranscript(null)
  }

  // Show error if any
  if (error) {
    return (
      <Card className="bg-red-500/10 border-red-500/20">
        <CardContent className="p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={handleReset} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Show transcript review
  if (transcript) {
    return (
      <Card className="bg-[#1c1c1e] border-white/[0.08]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Review Your Transcript</h3>
          <div className="bg-[#0a0a0a] rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
            <p className="text-neutral-400 whitespace-pre-wrap">{transcript}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleUseTranscript} className="flex-1 bg-[#0077ff] hover:bg-[#0066dd]">
              <Check className="mr-2 h-4 w-4" />
              Use This Story
            </Button>
            <Button onClick={handleReset} variant="outline">
              <Trash2 className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show recorded audio with transcribe option
  if (audioBlob && !isRecording) {
    return (
      <Card className="bg-[#1c1c1e] border-white/[0.08]">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-neutral-400">
              Recording complete ({formatDuration(duration)})
            </p>
          </div>

          <audio
            src={audioUrl || undefined}
            controls
            className="w-full mb-6"
          />

          <div className="flex gap-3">
            <Button
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className="flex-1 bg-[#0077ff] hover:bg-[#0066dd]"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>Transcribe Recording</>
              )}
            </Button>
            <Button onClick={handleReset} variant="outline">
              <Trash2 className="mr-2 h-4 w-4" />
              Discard
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Recording state
  if (isRecording) {
    return (
      <Card className="bg-[#1c1c1e] border-[#0077ff]/30">
        <CardContent className="p-6">
          <div className="text-center">
            {/* Recording indicator with pulsing ring */}
            <div className="relative inline-flex items-center justify-center mb-4">
              <div
                className={`absolute inset-0 w-20 h-20 rounded-full bg-[#0077ff]/20 ${
                  isPaused ? '' : 'animate-ping'
                }`}
                style={{ animationDuration: '2s' }}
              />
              <div
                className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#0077ff]"
                role="status"
                aria-label={isPaused ? 'Recording paused' : 'Recording in progress'}
              >
                <Mic className="h-10 w-10 text-white" aria-hidden="true" />
              </div>
            </div>

            <p
              className="text-2xl font-mono font-bold text-white mb-2"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatDuration(duration)}
            </p>
            <p className="text-neutral-400 mb-4" aria-live="polite">
              {isPaused ? 'Recording paused' : 'Recording...'}
            </p>

            {/* Waveform Visualization */}
            <div className="mb-6 h-[60px] flex items-center justify-center">
              {!isPaused ? (
                <WaveformVisualizer
                  analyserNode={analyserNode}
                  isActive={isRecording && !isPaused}
                  barColor="#0077ff"
                />
              ) : (
                <div className="flex items-center justify-center gap-1">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-2 rounded-sm bg-neutral-600"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Recording controls */}
            <div className="flex justify-center gap-3" role="group" aria-label="Recording controls">
              {isPaused ? (
                <Button onClick={resumeRecording} size="lg" className="bg-[#0077ff] hover:bg-[#0066dd]" aria-label="Resume recording">
                  <Play className="mr-2 h-5 w-5" aria-hidden="true" />
                  Resume
                </Button>
              ) : (
                <Button onClick={pauseRecording} variant="outline" size="lg" aria-label="Pause recording">
                  <Pause className="mr-2 h-5 w-5" aria-hidden="true" />
                  Pause
                </Button>
              )}
              <Button onClick={stopRecording} variant="destructive" size="lg" aria-label="Stop recording">
                <Square className="mr-2 h-5 w-5" aria-hidden="true" />
                Stop
              </Button>
            </div>

            <p className="text-sm text-neutral-500 mt-6">
              Tell us about your real estate story. Include details about the property,
              the challenge, and how you helped your client.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Initial state - ready to record
  return (
    <Card className="bg-[#1c1c1e] border-white/[0.08]">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#0a0a0a] mb-4">
            <Mic className="h-10 w-10 text-neutral-500" />
          </div>

          <h3 className="text-lg font-semibold mb-2 text-white">Record Your Story</h3>
          <p className="text-neutral-400 mb-6">
            Click the button below and tell us about your real estate experience.
            We&apos;ll transcribe it and help you create compelling content.
          </p>

          <div className="flex justify-center gap-3">
            <Button onClick={handleStartRecording} size="lg" className="bg-[#0077ff] hover:bg-[#0066dd]" aria-label="Start voice recording">
              <Mic className="mr-2 h-5 w-5" aria-hidden="true" />
              Start Recording
            </Button>
            {onCancel && (
              <Button onClick={onCancel} variant="outline" size="lg" aria-label="Cancel and go back">
                Cancel
              </Button>
            )}
          </div>

          <p className="text-xs text-neutral-500 mt-4">
            Tip: Speak naturally for 1-3 minutes. Include the challenge,
            what you did, and the outcome.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
