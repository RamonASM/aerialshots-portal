/**
 * Video Skills Index
 *
 * FFmpeg-powered video generation skills for real estate marketing.
 */

// Types
export * from './types'

// Provider
export {
  checkFFmpegInstalled,
  getTempDir,
  getTempFilePath,
  downloadToTemp,
  cleanupTempFile,
  getVideoDuration,
  getVideoMetadata,
  getResolution,
  getFileSize,
  createFFmpegCommand,
  runFFmpegCommand,
  createKenBurnsSlideshow,
  createFadeSlideshow,
  addAudioToVideo,
  generateThumbnail,
  applyMotionEffect,
} from './ffmpeg-provider'

// Skills
export { slideshowSkill } from './slideshow'
export { motionSkill } from './motion'
export { audioOverlaySkill } from './audio'

// Default exports as named
import slideshowSkill from './slideshow'
import motionSkill from './motion'
import audioOverlaySkill from './audio'

/**
 * All video skills for registration
 */
export const videoSkills = [
  slideshowSkill,
  motionSkill,
  audioOverlaySkill,
]

export default videoSkills
