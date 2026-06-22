export const CLOUDINARY_FOLDERS = {
  avatars: 'hommy/avatars',
  banners: 'hommy/banners',
  portfolio: 'hommy/portfolio',
  projects: 'hommy/projects',
  documents: 'hommy/documents',
  jobs: 'hommy/jobs',
  disputes: 'hommy/disputes',
  reviews: 'hommy/reviews',
  // Chat attachments are nested per-conversation via the helper in
  // `lib/cloudinary/chat-upload.ts` — `hommy/chat/{conversationId}`.
  chat: 'hommy/chat',
} as const

export type CloudinaryFolder = keyof typeof CLOUDINARY_FOLDERS

export type UploadResult = {
  publicId: string
  secureUrl: string
  width: number
  height: number
  format: string
  bytes: number
  originalFilename: string
}

/**
 * Extract a consistent UploadResult from the raw Cloudinary widget response.
 * The widget returns a large info object — this picks only what the platform stores.
 */
export function parseWidgetResult(info: Record<string, unknown>): UploadResult {
  return {
    publicId: info.public_id as string,
    secureUrl: info.secure_url as string,
    width: info.width as number,
    height: info.height as number,
    format: info.format as string,
    bytes: info.bytes as number,
    originalFilename: info.original_filename as string,
  }
}
