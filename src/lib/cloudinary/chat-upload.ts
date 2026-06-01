/**
 * Chat-attachment uploader — client-direct to Cloudinary with progress.
 *
 * Uses the existing unsigned upload preset (same pattern as avatars /
 * portfolio / projects). Files live at
 *   homei/chat/{conversationId}/{cloudinary-generated-public-id}
 *
 * We use XHR (not fetch) because we need `upload.onprogress` for the
 * progress UI — fetch doesn't expose that event.
 *
 * Returns provider-agnostic-ish metadata used by the UI layer.
 */

export type ChatAttachmentKind = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE'

export type ChatUploadResult = {
  publicId: string
  secureUrl: string
  resourceType: 'image' | 'video' | 'raw'
  format: string
  bytes: number
  // Image + video
  width?: number
  height?: number
  // Audio + video
  durationMs?: number
}

export type ChatUploadProgress = {
  loaded: number
  total: number
  percent: number
}

export async function uploadChatAttachment(
  file: File,
  args: {
    conversationId: string
    kind: ChatAttachmentKind
    onProgress?: (p: ChatUploadProgress) => void
    signal?: AbortSignal
  },
): Promise<ChatUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary environment variables are not configured')
  }

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', uploadPreset)
  form.append('folder', `homei/chat/${args.conversationId}`)

  // `auto` lets Cloudinary classify images vs video vs raw automatically.
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`

  return new Promise<ChatUploadResult>((resolve, reject) => {
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
        reject(new Error(`Cloudinary upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`))
        return
      }
      try {
        const data = JSON.parse(xhr.responseText) as {
          public_id: string
          secure_url: string
          resource_type: 'image' | 'video' | 'raw'
          format: string
          bytes: number
          width?: number
          height?: number
          duration?: number
        }
        resolve({
          publicId: data.public_id,
          secureUrl: data.secure_url,
          resourceType: data.resource_type,
          format: data.format,
          bytes: data.bytes,
          width: data.width,
          height: data.height,
          durationMs:
            typeof data.duration === 'number'
              ? Math.round(data.duration * 1000)
              : undefined,
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
 * Build a direct Cloudinary delivery URL from a public_id when we don't
 * have the secure_url cached (e.g. rehydrating from DB).
 */
export function buildCloudinaryUrl(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw',
  opts: { version?: number; format?: string } = {},
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) throw new Error('Cloudinary cloud name not configured')
  const ver = opts.version ? `v${opts.version}/` : ''
  const fmt = opts.format ? `.${opts.format}` : ''
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${ver}${publicId}${fmt}`
}
