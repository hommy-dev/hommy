/**
 * Generic image uploader — client-direct to Cloudinary with progress.
 *
 * Same pattern as `chat-upload.ts` (unsigned preset, XHR for progress)
 * but takes an explicit `folder` so it can be reused for job-update
 * photos, review photos, and any other image attachment site.
 *
 * Returns the Cloudinary `public_id` (which is what we store in DB —
 * matches the chat-attachment convention) plus secure URL and dimensions.
 */

export type PhotoUploadResult = {
  publicId: string
  secureUrl: string
  bytes: number
  width?: number
  height?: number
  format: string
}

export type PhotoUploadProgress = {
  loaded: number
  total: number
  percent: number
}

export async function uploadPhoto(args: {
  file: File
  folder: string
  onProgress?: (p: PhotoUploadProgress) => void
  signal?: AbortSignal
}): Promise<PhotoUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary environment variables are not configured')
  }

  const form = new FormData()
  form.append('file', args.file)
  form.append('upload_preset', uploadPreset)
  form.append('folder', args.folder)

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

  return new Promise<PhotoUploadResult>((resolve, reject) => {
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
          format: string
          bytes: number
          width?: number
          height?: number
        }
        resolve({
          publicId: data.public_id,
          secureUrl: data.secure_url,
          format: data.format,
          bytes: data.bytes,
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

/**
 * Build a direct Cloudinary delivery URL from a stored public_id.
 * Mirrors the helper in chat-upload.ts but for the simpler image-only case.
 */
export function buildPhotoUrl(publicId: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) throw new Error('Cloudinary cloud name not configured')
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`
}
