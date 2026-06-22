import {defineField, defineType} from 'sanity'
import {BlockquoteIcon} from '@sanity/icons'

/**
 * Emphasised pull-quote with optional attribution. Distinct from a standard
 * blockquote style so the frontend can render it large/standalone.
 */
export const pullQuoteType = defineType({
  name: 'pullQuote',
  title: 'Pull quote',
  type: 'object',
  icon: BlockquoteIcon,
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution',
      type: 'string',
      description: 'Who said it, e.g. "Jane Doe, Roofing Pro".',
    }),
  ],
  preview: {
    select: {title: 'quote', subtitle: 'attribution'},
    prepare({title, subtitle}) {
      return {title: title || 'Pull quote', subtitle: subtitle ? `— ${subtitle}` : undefined}
    },
  },
})
