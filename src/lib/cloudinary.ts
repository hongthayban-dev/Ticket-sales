import { v2 as cloudinary } from 'cloudinary'

const stripBom = (s: string) => s.replace(/^﻿/, '')

cloudinary.config({
  cloud_name: stripBom(process.env.CLOUDINARY_CLOUD_NAME || ''),
  api_key:    stripBom(process.env.CLOUDINARY_API_KEY    || ''),
  api_secret: stripBom(process.env.CLOUDINARY_API_SECRET || ''),
})

export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string = 'ticket-sales',
  resourceType: 'image' | 'raw' | 'auto' = 'image'
): Promise<{ id: string; url: string; webViewLink: string }> {
  const publicId = `${folder}/${filename.replace(/\.[^/.]+$/, '')}`

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ public_id: publicId, resource_type: resourceType, overwrite: true }, (err, result) => {
        if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'))
        resolve({ id: result.public_id, url: result.secure_url, webViewLink: result.secure_url })
      })
      .end(buffer)
  })
}
