'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVoiceRecordingReturn {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
  error: string | null
  analyserNode: AnalyserNode | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  reset: () => void
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    setAnalyserNode(null)
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  const startRecording = useCallback(async () => {
    // Guard against double-start to prevent duplicate streams
    if (isRecording || mediaRecorderRef.current) {
      console.warn('Recording already in progress')
      return
    }

    try {
      setError(null)
      setAudioBlob(null)
      chunksRef.current = []

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create AudioContext and AnalyserNode for waveform visualization
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      setAnalyserNode(analyser)

      // Determine best supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/ogg'

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setIsRecording(false)
        setIsPaused(false)

        // Stop duration timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      mediaRecorder.onerror = () => {
        setError('Recording failed')
        cleanup()
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setDuration(0)

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone'
      setError(message)
      cleanup()
    }
  }, [cleanup, isRecording])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    // Clean up AudioContext to prevent memory leaks
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    setAnalyserNode(null)
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)

      // Pause duration timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)

      // Resume duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    }
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setIsRecording(false)
    setIsPaused(false)
    setDuration(0)
    setAudioBlob(null)
    setError(null)
  }, [cleanup])

  return {
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
  }
}

// Format duration as mm:ss
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
