// Server-side Cloudinary upload. The browser uploaders (upload.ts / chat-upload.ts)
// post a File to the unsigned preset from the client; this does the same from the
// server with a Buffer (e.g. a generated PDF), so we can persist `secure_url`.
// Uses the same unsigned preset + cloud name as the client — no SDK, no secrets.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim()

/**
 * Upload a raw file buffer to Cloudinary and return its `secure_url`, or null if
 * Cloudinary isn't configured or the upload fails. Never throws — callers treat a
 * null result as "no hosted copy" and degrade gracefully.
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer | Uint8Array,
  opts: { folder: string; filename: string; contentType?: string },
): Promise<string | null> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.warn('[cloudinary] missing cloud name / upload preset — skipping upload')
    return null
  }

  try {
    const form = new FormData()
    form.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: opts.contentType ?? 'application/octet-stream' }),
      opts.filename,
    )
    form.append('upload_preset', UPLOAD_PRESET)
    form.append('folder', opts.folder)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      console.error('[cloudinary] upload failed', res.status, await res.text().catch(() => ''))
      return null
    }
    const data = (await res.json()) as { secure_url?: string }
    return data.secure_url ?? null
  } catch (err) {
    console.error('[cloudinary] upload error', err)
    return null
  }
}
