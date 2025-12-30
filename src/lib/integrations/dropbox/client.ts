/**
 * Dropbox Integration Client
 *
 * Folder monitoring and auto-upload for edited photos from Dropbox
 */

// Types
export interface DropboxFile {
  id: string
  name: string
  path_lower: string
  path_display: string
  type: 'file' | 'folder'
  size?: number
  client_modified?: string
  server_modified?: string
  '.tag'?: string
}

export interface DropboxFolderMonitor {
  folder_path: string
  cursor: string
  auto_create_listing: boolean
  default_service_package?: string
  last_checked?: string
}

export interface DropboxWebhookEvent {
  list_folder: {
    accounts: string[]
  }
}

export interface ListFolderOptions {
  extensions?: string[]
  fetchAll?: boolean
}

export interface ListFolderResult {
  files: DropboxFile[]
  cursor: string
  has_more: boolean
}

export interface DetectNewPhotosResult {
  newFiles: DropboxFile[]
  newCursor: string
}

export interface DownloadResult {
  blob: Blob
  metadata: {
    name: string
    size?: number
  }
}

// API Base URL
const DROPBOX_API_URL = 'https://api.dropboxapi.com/2'
const DROPBOX_CONTENT_URL = 'https://content.dropboxapi.com/2'

/**
 * List folder contents with optional filtering
 */
export async function listFolderContents(
  accessToken: string,
  path: string,
  options: ListFolderOptions = {}
): Promise<ListFolderResult> {
  const { extensions, fetchAll } = options
  const allFiles: DropboxFile[] = []
  let cursor: string = ''
  let hasMore = true
  let isFirstRequest = true

  while (hasMore) {
    const url = isFirstRequest
      ? `${DROPBOX_API_URL}/files/list_folder`
      : `${DROPBOX_API_URL}/files/list_folder/continue`

    const body = isFirstRequest ? { path } : { cursor }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limited - please try again later')
      }
      if (response.status === 401) {
        throw new Error('Token expired or unauthorized')
      }

      const errorData = await response.json()
      if (errorData.error?.path?.['.tag'] === 'not_found') {
        throw new Error(`Folder not found: ${path}`)
      }
      throw new Error(`Dropbox API error: ${response.status}`)
    }

    const data = await response.json()
    const entries = data.entries || []

    // Filter files only (not folders)
    const files = entries.filter((entry: DropboxFile) => entry.type === 'file' || entry['.tag'] === 'file')
    allFiles.push(...files)

    cursor = data.cursor
    hasMore = fetchAll ? data.has_more : false
    isFirstRequest = false
  }

  // Filter by extension if specified
  let filteredFiles = allFiles
  if (extensions && extensions.length > 0) {
    const lowerExtensions = extensions.map((ext) => ext.toLowerCase())
    filteredFiles = allFiles.filter((file) => {
      const fileName = file.name.toLowerCase()
      return lowerExtensions.some((ext) => fileName.endsWith(ext))
    })
  }

  return {
    files: filteredFiles,
    cursor,
    has_more: false,
  }
}

/**
 * Detect new photos since last cursor using delta sync
 */
export async function detectNewPhotos(
  accessToken: string,
  lastCursor: string
): Promise<DetectNewPhotosResult> {
  const response = await fetch(`${DROPBOX_API_URL}/files/list_folder/continue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ cursor: lastCursor }),
  })

  if (!response.ok) {
    throw new Error(`Dropbox API error: ${response.status}`)
  }

  const data = await response.json()
  const entries = data.entries || []

  // Filter to only include new/modified files (not deleted)
  const newFiles = entries.filter(
    (entry: DropboxFile & { '.tag'?: string }) =>
      entry['.tag'] === 'file' || (entry.type === 'file' && entry['.tag'] !== 'deleted')
  )

  return {
    newFiles,
    newCursor: data.cursor,
  }
}

/**
 * Download file content from Dropbox
 */
export async function downloadFile(
  accessToken: string,
  path: string
): Promise<DownloadResult> {
  const response = await fetch(`${DROPBOX_CONTENT_URL}/files/download`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  })

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }

  const blob = await response.blob()
  const apiResult = response.headers.get('dropbox-api-result')
  const metadata = apiResult ? JSON.parse(apiResult) : { name: path.split('/').pop() || 'unknown' }

  return { blob, metadata }
}

/**
 * Setup folder monitoring with initial cursor
 */
export async function setupFolderMonitor(
  accessToken: string,
  folderPath: string,
  options: {
    auto_create_listing?: boolean
    default_service_package?: string
  } = {}
): Promise<DropboxFolderMonitor> {
  // First, get the initial cursor by listing the folder
  const result = await listFolderContents(accessToken, folderPath)

  return {
    folder_path: folderPath,
    cursor: result.cursor,
    auto_create_listing: options.auto_create_listing ?? false,
    default_service_package: options.default_service_package,
    last_checked: new Date().toISOString(),
  }
}

/**
 * Dropbox Client Class
 *
 * Convenient wrapper for Dropbox operations
 */
export class DropboxClient {
  private accessToken: string
  private _refreshToken?: string

  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken
    this._refreshToken = refreshToken
  }

  /**
   * Check if client has valid access token
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && this.accessToken.length > 0
  }

  /**
   * List files in a folder
   */
  async listFolder(path: string, options?: ListFolderOptions): Promise<DropboxFile[]> {
    const result = await listFolderContents(this.accessToken, path, options)
    return result.files
  }

  /**
   * Check if folder has changes since cursor
   */
  async hasChanges(cursor: string): Promise<boolean> {
    const response = await fetch(`${DROPBOX_API_URL}/files/list_folder/longpoll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cursor, timeout: 30 }),
    })

    if (!response.ok) {
      throw new Error(`Long poll failed: ${response.status}`)
    }

    const data = await response.json()
    return data.changes === true
  }

  /**
   * Get temporary download link for a file
   */
  async getTemporaryLink(path: string): Promise<string> {
    const response = await fetch(`${DROPBOX_API_URL}/files/get_temporary_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ path }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get temporary link: ${response.status}`)
    }

    const data = await response.json()
    return data.link
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string> {
    if (!this._refreshToken) {
      throw new Error('No refresh token available')
    }

    const appKey = process.env.DROPBOX_APP_KEY
    const appSecret = process.env.DROPBOX_APP_SECRET

    if (!appKey || !appSecret) {
      throw new Error('Dropbox app credentials not configured')
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this._refreshToken,
        client_id: appKey,
        client_secret: appSecret,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    const data = await response.json()
    this.accessToken = data.access_token
    return data.access_token
  }
}
