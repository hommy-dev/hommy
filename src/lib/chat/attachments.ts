// Chat attachment rules — the single source of truth shared by the composer
// (client-side picking/validation), the sendMessage action (server-side
// re-validation), and the message bubble (rendering). Keep this free of
// server-only imports so both sides can use it.

import type { ChatAttachment } from '@/lib/db/schema'

/** Max size per file, app-side. Cloudinary plan limits apply on top of this. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024 // 25 MB

/** Max files in a single message. */
export const MAX_ATTACHMENTS_PER_MESSAGE = 10

// Executable / script types we refuse — a malware vector with no AV scanning in
// place. Everything else (images, PDFs, docs, archives, …) is allowed.
export const BLOCKED_EXTENSIONS: ReadonlySet<string> = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif', 'ps1', 'psm1', 'vbs', 'vbe',
  'js', 'jse', 'wsf', 'wsh', 'sh', 'bash', 'jar', 'app', 'apk', 'dmg', 'deb',
  'rpm', 'reg', 'dll', 'cpl', 'hta',
])

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot === -1 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

/** True if the filename's extension is on the executable/script blocklist. */
export function isBlockedFile(name: string): boolean {
  return BLOCKED_EXTENSIONS.has(extensionOf(name))
}

/** Human-readable byte size, e.g. "240 KB", "1.2 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${i === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}

/** Whether an attachment should render as an inline image thumbnail. */
export function isImage(file: ChatAttachment): boolean {
  return file.resourceType === 'image'
}
