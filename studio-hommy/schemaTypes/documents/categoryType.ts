import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons'

/**
 * Blog category. Drives the filter pills on the index and the tag on each card.
 * Referenced by `post.category`.
 */
export const categoryType = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Optional intro shown on the category page (and used for SEO).',
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'slug.current'},
  },
})
