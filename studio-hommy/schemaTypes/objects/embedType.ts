import {defineField, defineType} from 'sanity'
import {PlayIcon} from '@sanity/icons'

/**
 * Embedded media (YouTube / Vimeo) resolved on the frontend via oEmbed.
 */
export const embedType = defineType({
  name: 'embed',
  title: 'Embed',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      description: 'Paste a YouTube or Vimeo link.',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption shown below the embed.',
    }),
  ],
  preview: {
    select: {title: 'url', subtitle: 'caption'},
    prepare({title, subtitle}) {
      return {title: subtitle || title || 'Embed', subtitle: subtitle ? title : 'Embed'}
    },
  },
})
