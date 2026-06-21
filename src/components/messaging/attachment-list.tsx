import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '@/lib/db/schema'
import { formatBytes, isImage } from '@/lib/chat/attachments'
import { ImageZoom } from '@/components/kibo-ui/image-zoom'

/**
 * Renders the files on an attachment message: images as a thumbnail grid (tap to
 * open full size), everything else as a download chip (icon + name + size).
 * `mine` only tweaks the chip tint so it reads on either bubble side.
 */
export function AttachmentList({
  files,
  mine,
}: {
  files: ChatAttachment[]
  mine: boolean
}) {
  const images = files.filter(isImage)
  const others = files.filter((f) => !isImage(f))

  return (
    <div className="space-y-2 lg:space-y-[0.556vw]">
      {images.length > 0 ? (
        <div
          className={cn(
            'grid gap-1.5 lg:gap-[0.417vw]',
            images.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
          )}
        >
          {images.map((file) => (
            <div
              key={file.publicId}
              className="group relative overflow-hidden rounded-md lg:rounded-[0.556vw]"
            >
              <ImageZoom>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.url}
                  alt={file.name}
                  loading="lazy"
                  className="max-h-60 lg:max-h-[16vw] w-full object-cover"
                />
              </ImageZoom>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                download={file.name}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Download ${file.name}`}
                className="absolute right-2 top-2 lg:right-[0.556vw] lg:top-[0.556vw] z-10 grid size-8 lg:size-[2.222vw] place-items-center rounded-full bg-foreground/60 text-background opacity-0 backdrop-blur-sm transition-opacity hover:bg-foreground/80 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Icon name="download" className="size-4 lg:size-[1.111vw]" />
              </a>
            </div>
          ))}
        </div>
      ) : null}

      {others.map((file) => (
        <a
          key={file.publicId}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          download={file.name}
          className={cn(
            'flex items-center gap-2.5 lg:gap-[0.694vw] rounded-md lg:rounded-[0.556vw] border px-2.5 lg:px-[0.694vw] py-2 lg:py-[0.556vw] transition-colors',
            mine
              ? 'border-primary-foreground/25 bg-primary-foreground/10 hover:bg-primary-foreground/15'
              : 'border-border bg-background hover:bg-muted',
          )}
        >
          <span
            className={cn(
              'grid size-8 lg:size-[2.222vw] shrink-0 place-items-center rounded lg:rounded-[0.417vw]',
              mine ? 'bg-primary-foreground/15' : 'bg-muted',
            )}
          >
            <Icon name="document" className="size-4 lg:size-[1.111vw]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block max-w-48 lg:max-w-[14vw] truncate text-xs lg:text-[0.833vw] font-medium">
              {file.name}
            </span>
            <span className={cn('block text-[10px] lg:text-[0.694vw]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
              {formatBytes(file.bytes)}
            </span>
          </span>
          <Icon name="download" className="size-4 lg:size-[1.111vw] shrink-0" />
        </a>
      ))}
    </div>
  )
}
