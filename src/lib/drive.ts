import { google, drive_v3 } from 'googleapis'
import { Readable } from 'stream'

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!

function getAuth() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64!
  const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
  return new google.auth.GoogleAuth({
    credentials: json,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

async function getDriveClient(): Promise<drive_v3.Drive> {
  const auth = getAuth()
  return google.drive({ version: 'v3', auth })
}

export async function uploadFileToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  folderId: string = FOLDER_ID
): Promise<{ id: string; webViewLink: string }> {
  const drive = await getDriveClient()
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  const res = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  })

  // Make file publicly viewable
  await drive.permissions.create({
    fileId: res.data.id!,
    supportsAllDrives: true,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  return {
    id: res.data.id!,
    webViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`,
  }
}

export async function getFileAsBuffer(fileId: string): Promise<Buffer> {
  const drive = await getDriveClient()
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  )
  return Buffer.from(res.data as ArrayBuffer)
}

export async function deleteFile(fileId: string): Promise<void> {
  const drive = await getDriveClient()
  await drive.files.delete({ fileId })
}

export function getDirectDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

export function getViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`
}

export function getThumbnailUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`
}
