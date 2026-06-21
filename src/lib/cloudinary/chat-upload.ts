// Chat attachment uploader — client-direct to Cloudinary with progress + abort.
//
// Mirrors photo-upload.ts (unsigned preset, XHR for progress), but posts to the
// `/auto/upload` endpoint so ANY file type is accepted (image / video / raw),
// and nests under homei/chat/{conversationId}. Returns a ready-to-store
// ChatAttachment — we keep secure_url because raw files deliver from a different
// path than images.

import type { ChatAttachment } from '@/lib/db/schema'

export type ChatUploadProgress = {
  loaded: number
  total: number
  percent: number
}

export async function uploadChatAttachment(args: {
  file: File
  conversationId: string
  onProgress?: (p: ChatUploadProgress) => void
  signal?: AbortSignal
}): Promise<ChatAttachment> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary environment variables are not configured')
  }

  const form = new FormData()
  form.append('file', args.file)
  form.append('upload_preset', uploadPreset)
  form.append('folder', `homei/chat/${args.conversationId}`)

  // `auto` lets Cloudinary classify the file (image/video/raw) and accept any type.
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`

  return new Promise<ChatAttachment>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)

    xhr.upload.addEventListener('progress', (ev) => {
      if (!ev.lengthComputable || !args.onProgress) return
      args.onProgress({
        loaded: ev.loaded,
        total: ev.total,
        percent: Math.round((ev.loaded / ev.total) * 100),
      })
    })

    xhr.addEventListener('load', () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new Error(
            `Cloudinary upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`,
          ),
        )
        return
      }
      try {
        const data = JSON.parse(xhr.responseText) as {
          public_id: string
          secure_url: string
          resource_type: 'image' | 'video' | 'raw'
          format?: string
          bytes: number
          width?: number
          height?: number
          original_filename?: string
        }
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          resourceType: data.resource_type,
          // Fall back to the picked file's name (raw uploads don't always echo one).
          name: args.file.name || data.original_filename || 'file',
          bytes: data.bytes,
          format: data.format ?? null,
          width: data.width,
          height: data.height,
        })
      } catch (err) {
        reject(err)
      }
    })

    xhr.addEventListener('error', () =>
      reject(new Error('Network error during Cloudinary upload')),
    )
    xhr.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError')),
    )

    if (args.signal) {
      args.signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(form)
  })
}
