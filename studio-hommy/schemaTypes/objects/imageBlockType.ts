import {defineField, defineType} from 'sanity'
import {ImageIcon} from '@sanity/icons'

/**
 * Inline image block for the Portable Text body. `alt` is required for
 * accessibility/SEO; `caption` renders beneath the figure when present.
 */
export const imageBlockType = defineType({
  name: 'imageBlock',
  title: 'Image',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'asset',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      description: 'Describe the image for screen readers and search engines.',
      validation: (rule) => rule.required().warning('Alt text is important for accessibility and SEO'),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption shown below the image.',
    }),
  ],
  preview: {
    select: {title: 'caption', subtitle: 'alt', media: 'asset'},
    prepare({title, subtitle, media}) {
      return {title: title || subtitle || 'Image', subtitle: title ? subtitle : undefined, media}
    },
  },
})
