import {defineField, defineType} from 'sanity'
import {LinkIcon} from '@sanity/icons'

/**
 * Reusable link object — used both as a Portable Text annotation (mark) and
 * inside the CTA block. Toggles between an internal reference and an external
 * URL via `linkType` (the toggle pattern).
 */
export const linkType = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'linkType',
      title: 'Link type',
      type: 'string',
      options: {
        list: [
          {title: 'Internal page', value: 'internal'},
          {title: 'External URL', value: 'external'},
        ],
        layout: 'radio',
      },
      initialValue: 'internal',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'internalLink',
      title: 'Internal page',
      type: 'reference',
      to: [{type: 'post'}, {type: 'category'}],
      hidden: ({parent}) => parent?.linkType !== 'internal',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {linkType?: string} | undefined
          if (parent?.linkType === 'internal' && !value) return 'Select a page to link to'
          return true
        }),
    }),
    defineField({
      name: 'href',
      title: 'External URL',
      type: 'url',
      hidden: ({parent}) => parent?.linkType !== 'external',
      validation: (rule) =>
        rule
          .uri({scheme: ['http', 'https', 'mailto', 'tel']})
          .custom((value, context) => {
            const parent = context.parent as {linkType?: string} | undefined
            if (parent?.linkType === 'external' && !value) return 'Enter a URL'
            return true
          }),
    }),
    defineField({
      name: 'openInNewTab',
      title: 'Open in new tab',
      type: 'boolean',
      initialValue: false,
    }),
  ],
})
