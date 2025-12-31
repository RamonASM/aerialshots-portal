import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateAudioFile, cleanTranscript, MAX_FILE_SIZE } from '@/lib/transcription/service'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60 seconds for transcription

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Transcription service not configured' },
        { status: 503 }
      )
    }

    // Get the audio file from form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      const sizeMB = Math.round(audioFile.size / (1024 * 1024))
      return NextResponse.json(
        { success: false, error: `File is too large (${sizeMB}MB). Maximum size is 25MB.` },
        { status: 400 }
      )
    }

    // Validate file format
    const validation = validateAudioFile(audioFile)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Send to OpenAI Whisper API
    const openaiFormData = new FormData()
    openaiFormData.append('file', audioFile)
    openaiFormData.append('model', 'whisper-1')
    openaiFormData.append('language', 'en')
    openaiFormData.append('response_format', 'json')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiFormData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `Transcription failed: ${response.status}`
      console.error('OpenAI Whisper error:', errorMessage)
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    const data = await response.json()
    const transcript = cleanTranscript(data.text)

    return NextResponse.json({
      success: true,
      transcript,
      language: data.language || 'en',
    })
  } catch (error) {
    console.error('Transcription error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: `Transcription failed: ${message}` },
      { status: 500 }
    )
  }
}
