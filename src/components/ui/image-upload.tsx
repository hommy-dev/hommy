'use client'

import { CldUploadWidget } from 'next-cloudinary'
import type {
  CloudinaryUploadWidgetResults,
  CloudinaryUploadWidgetError,
} from 'next-cloudinary'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'
import {
  CLOUDINARY_FOLDERS,
  parseWidgetResult,
  type CloudinaryFolder,
  type UploadResult,
} from '@/lib/cloudinary/config'
import { cn } from '@/lib/utils'

type ImageUploadAccept = 'image' | 'image+pdf'

const FORMAT_MAP: Record<ImageUploadAccept, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp'],
  'image+pdf': ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
}

interface ImageUploadProps {
  folder: CloudinaryFolder
  onUpload: (result: UploadResult) => void
  maxFiles?: number
  accept?: ImageUploadAccept
  maxFileSize?: number
  className?: string
  children?: React.ReactNode
}

export function ImageUpload({
  folder,
  onUpload,
  maxFiles = 1,
  accept = 'image',
  maxFileSize = 10_485_760,
  className,
  children,
}: ImageUploadProps) {
  function handleSuccess(results: CloudinaryUploadWidgetResults) {
    if (
      results.event !== 'success' ||
      !results.info ||
      typeof results.info === 'string'
    ) {
      return
    }
    const parsed = parseWidgetResult(results.info as Record<string, unknown>)
    onUpload(parsed)
  }

  function handleError(error: CloudinaryUploadWidgetError) {
    const message =
      typeof error === 'string'
        ? error
        : error?.statusText ?? 'Upload failed'
    showToast(message, { type: 'error' })
  }

  return (
    <CldUploadWidget
      uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
      options={{
        folder: CLOUDINARY_FOLDERS[folder],
        maxFiles,
        multiple: maxFiles > 1,
        clientAllowedFormats: FORMAT_MAP[accept],
        maxFileSize,
        sources: ['local', 'camera', 'url'],
        singleUploadAutoClose: true,
        showPoweredBy: false,
      }}
      onSuccess={handleSuccess}
      onError={handleError}
    >
      {({ open }) => (
        <div className={cn('inline-flex', className)}>
          {children ? (
            <button type="button" onClick={() => open()}>
              {children}
            </button>
          ) : (
            <Button type="button" variant="outline" onClick={() => open()}>
              <Upload className="size-4" />
              {maxFiles > 1 ? 'Upload files' : 'Upload'}
            </Button>
          )}
        </div>
      )}
    </CldUploadWidget>
  )
}

interface UploadedImagePreviewProps {
  url: string
  alt?: string
  onRemove?: () => void
  className?: string
}

export function UploadedImagePreview({
  url,
  alt = 'Uploaded image',
  onRemove,
  className,
}: UploadedImagePreviewProps) {
  return (
    <div
      className={cn(
        'group relative h-24 w-24 overflow-hidden rounded-md border border-border',
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="h-full w-full object-cover"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove image"
        >
          <X className="size-3.5 text-destructive" />
        </button>
      )}
    </div>
  )
}
