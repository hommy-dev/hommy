import {defineField, defineType} from 'sanity'
import {LaunchIcon} from '@sanity/icons'

/**
 * Call-to-action button embedded in the body. Reuses the shared `link` object
 * for its destination (internal reference or external URL).
 */
export const ctaType = defineType({
  name: 'cta',
  title: 'Call to action',
  type: 'object',
  icon: LaunchIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',
      options: {
        list: [
          {title: 'Primary', value: 'primary'},
          {title: 'Secondary', value: 'secondary'},
        ],
        layout: 'radio',
      },
      initialValue: 'primary',
    }),
  ],
  preview: {
    select: {title: 'label', variant: 'variant'},
    prepare({title, variant}) {
      return {title: title || 'Call to action', subtitle: `CTA · ${variant ?? 'primary'}`}
    },
  },
})
