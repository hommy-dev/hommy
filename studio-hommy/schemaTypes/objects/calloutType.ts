import {defineField, defineType} from 'sanity'
import {BulbOutlineIcon} from '@sanity/icons'

/**
 * Highlighted note/aside inside the body — info, tip, warning, or success.
 */
export const calloutType = defineType({
  name: 'callout',
  title: 'Callout',
  type: 'object',
  icon: BulbOutlineIcon,
  fields: [
    defineField({
      name: 'tone',
      title: 'Tone',
      type: 'string',
      options: {
        list: [
          {title: 'Info', value: 'info'},
          {title: 'Tip', value: 'tip'},
          {title: 'Warning', value: 'warning'},
          {title: 'Success', value: 'success'},
        ],
        layout: 'radio',
      },
      initialValue: 'info',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Optional heading for the callout.',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'content', tone: 'tone'},
    prepare({title, subtitle, tone}) {
      return {title: title || subtitle || 'Callout', subtitle: `Callout · ${tone ?? 'info'}`}
    },
  },
})
