/**
 * FFmpeg Provider
 *
 * Wrapper for FFmpeg operations using fluent-ffmpeg.
 * Can be mocked for testing.
 */

import ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AspectRatio, VideoFormat, RESOLUTION_PRESETS } from './types'

/**
 * Check if FFmpeg is available on the system
 */
export async function checkFFmpegInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err)
    })
  })
}

/**
 * Get temp directory for video processing
 */
export function getTempDir(): string {
  const tempDir = path.join(os.tmpdir(), 'asm-video-processing')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  return tempDir
}

/**
 * Generate a unique temp file path
 */
export function getTempFilePath(extension: string): string {
  const tempDir = getTempDir()
  const filename = `video_${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`
  return path.join(tempDir, filename)
}

/**
 * Download a remote file to local temp storage
 */
export async function downloadToTemp(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${url} (${response.status})`)
  }

  // Determine extension from URL or content type
  const contentType = response.headers.get('content-type') || ''
  let extension = 'jpg'
  if (contentType.includes('png')) extension = 'png'
  else if (contentType.includes('webp')) extension = 'webp'
  else if (contentType.includes('audio')) extension = 'mp3'

  const urlPath = new URL(url).pathname
  const urlExtension = path.extname(urlPath).slice(1)
  if (urlExtension) extension = urlExtension

  const tempPath = getTempFilePath(extension)
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(tempPath, buffer)

  return tempPath
}

/**
 * Clean up temp files
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (error) {
    console.warn(`Failed to cleanup temp file: ${filePath}`, error)
  }
}

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`))
        return
      }
      resolve(metadata.format.duration || 0)
    })
  })
}

/**
 * Get video metadata
 */
export async function getVideoMetadata(videoPath: string): Promise<{
  duration: number
  width: number
  height: number
  format: string
  size: number
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`))
        return
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video')

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        format: metadata.format.format_name || 'unknown',
        size: metadata.format.size || 0,
      })
    })
  })
}

/**
 * Get resolution for aspect ratio
 */
export function getResolution(aspectRatio: AspectRatio): { width: number; height: number } {
  const presets: Record<AspectRatio, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '4:3': { width: 1440, height: 1080 },
  }
  return presets[aspectRatio] || presets['16:9']
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath)
    return stats.size
  } catch {
    return 0
  }
}

/**
 * Create FFmpeg command
 */
export function createFFmpegCommand(): ffmpeg.FfmpegCommand {
  return ffmpeg()
}

/**
 * Run FFmpeg command and return output path
 */
export async function runFFmpegCommand(
  command: ffmpeg.FfmpegCommand,
  outputPath: string,
  timeout: number = 300000 // 5 min default
): Promise<void> {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        command.kill('SIGKILL')
        reject(new Error('FFmpeg processing timeout'))
      }, timeout)
    }

    command
      .output(outputPath)
      .on('end', () => {
        if (timeoutId) clearTimeout(timeoutId)
        resolve()
      })
      .on('error', (err) => {
        if (timeoutId) clearTimeout(timeoutId)
        reject(new Error(`FFmpeg error: ${err.message}`))
      })
      .run()
  })
}

/**
 * Create video from images with Ken Burns effect
 */
export async function createKenBurnsSlideshow(
  imagePaths: string[],
  outputPath: string,
  options: {
    duration: number
    resolution: { width: number; height: number }
    transitionDuration: number
  }
): Promise<void> {
  const { duration, resolution, transitionDuration } = options
  const { width, height } = resolution

  // Create filter complex for Ken Burns effect
  const filters: string[] = []
  const inputs: string[] = []

  imagePaths.forEach((_, index) => {
    // Scale and pad each image to fit resolution
    const scaleFilter = `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`

    // Ken Burns zoom effect
    const zoomDirection = index % 2 === 0 ? 'zoom-in' : 'zoom-out'
    const zoomFilter = zoomDirection === 'zoom-in'
      ? `zoompan=z='min(zoom+0.0015,1.2)':d=${duration * 25}:s=${width}x${height}`
      : `zoompan=z='if(lte(zoom,1.0),1.2,max(1.001,zoom-0.0015))':d=${duration * 25}:s=${width}x${height}`

    filters.push(`${scaleFilter},${zoomFilter}[v${index}]`)
    inputs.push(`[v${index}]`)
  })

  // Concat all segments
  const concatFilter = `${inputs.join('')}concat=n=${imagePaths.length}:v=1:a=0[outv]`
  filters.push(concatFilter)

  const command = ffmpeg()

  // Add all images as inputs
  imagePaths.forEach((imgPath) => {
    command.input(imgPath).loop(1).inputOptions(['-t', duration.toString()])
  })

  await runFFmpegCommand(
    command
      .complexFilter(filters)
      .outputOptions([
        '-map', '[outv]',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
      ]),
    outputPath
  )
}

/**
 * Create simple slideshow with fade transitions
 */
export async function createFadeSlideshow(
  imagePaths: string[],
  outputPath: string,
  options: {
    duration: number
    resolution: { width: number; height: number }
    transitionDuration: number
  }
): Promise<void> {
  const { duration, resolution, transitionDuration } = options
  const { width, height } = resolution

  const command = ffmpeg()

  // Create input file list
  const listPath = getTempFilePath('txt')
  const listContent = imagePaths
    .map(p => `file '${p}'\nduration ${duration}`)
    .join('\n')
  fs.writeFileSync(listPath, listContent)

  try {
    await runFFmpegCommand(
      command
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
        ]),
      outputPath
    )
  } finally {
    cleanupTempFile(listPath)
  }
}

/**
 * Add audio to video
 */
export async function addAudioToVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  options: {
    volume: number
    fadeIn?: number
    fadeOut?: number
    loop?: boolean
    videoDuration?: number
  }
): Promise<void> {
  const { volume, fadeIn = 0, fadeOut = 0, loop = false, videoDuration } = options

  const command = ffmpeg()
    .input(videoPath)
    .input(audioPath)

  const audioFilters: string[] = [`volume=${volume}`]

  if (fadeIn > 0) {
    audioFilters.push(`afade=t=in:st=0:d=${fadeIn}`)
  }

  if (fadeOut > 0 && videoDuration) {
    audioFilters.push(`afade=t=out:st=${videoDuration - fadeOut}:d=${fadeOut}`)
  }

  const inputOptions: string[] = []
  if (loop) {
    inputOptions.push('-stream_loop', '-1')
  }

  await runFFmpegCommand(
    command
      .inputOptions(inputOptions)
      .outputOptions([
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-af', audioFilters.join(','),
        '-shortest',
      ]),
    outputPath
  )
}

/**
 * Generate thumbnail from video
 */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  options: {
    time?: number
    width?: number
    height?: number
  }
): Promise<void> {
  const { time = 0, width, height } = options

  const command = ffmpeg()
    .input(videoPath)
    .seekInput(time)
    .frames(1)

  const filters: string[] = []
  if (width && height) {
    filters.push(`scale=${width}:${height}`)
  } else if (width) {
    filters.push(`scale=${width}:-1`)
  } else if (height) {
    filters.push(`scale=-1:${height}`)
  }

  if (filters.length > 0) {
    command.outputOptions(['-vf', filters.join(',')])
  }

  await runFFmpegCommand(command, outputPath)
}

/**
 * Apply motion effect to single image
 */
export async function applyMotionEffect(
  imagePath: string,
  outputPath: string,
  options: {
    motionType: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'kenburns'
    duration: number
    resolution: { width: number; height: number }
    zoomFactor?: number
  }
): Promise<void> {
  const { motionType, duration, resolution, zoomFactor = 1.2 } = options
  const { width, height } = resolution
  const frames = duration * 25 // 25 fps

  let zoomPanFilter: string

  switch (motionType) {
    case 'zoom_in':
      zoomPanFilter = `zoompan=z='min(zoom+${(zoomFactor - 1) / frames},${zoomFactor})':d=${frames}:s=${width}x${height}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
      break
    case 'zoom_out':
      zoomPanFilter = `zoompan=z='if(lte(zoom,1.0),${zoomFactor},max(1.0,zoom-${(zoomFactor - 1) / frames}))':d=${frames}:s=${width}x${height}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
      break
    case 'pan_left':
      zoomPanFilter = `zoompan=z='1.1':d=${frames}:s=${width}x${height}:x='iw*0.1-iw*0.1*on/${frames}':y='ih*0.05'`
      break
    case 'pan_right':
      zoomPanFilter = `zoompan=z='1.1':d=${frames}:s=${width}x${height}:x='iw*0.1*on/${frames}':y='ih*0.05'`
      break
    case 'kenburns':
    default:
      // Combine zoom and pan
      zoomPanFilter = `zoompan=z='min(zoom+0.0015,1.2)':d=${frames}:s=${width}x${height}:x='iw/2-(iw/zoom/2)+sin(on/${frames}*PI)*50':y='ih/2-(ih/zoom/2)'`
      break
  }

  const command = ffmpeg()
    .input(imagePath)
    .loop(1)
    .inputOptions(['-t', duration.toString()])

  await runFFmpegCommand(
    command
      .outputOptions([
        '-vf', `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=decrease,pad=${width * 2}:${height * 2}:(ow-iw)/2:(oh-ih)/2,${zoomPanFilter}`,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString(),
      ]),
    outputPath
  )
}
