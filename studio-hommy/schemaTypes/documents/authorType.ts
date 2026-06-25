import {defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons'

/**
 * Blog author. Referenced by `post.author` so the same person can be reused
 * across many posts and edited in one place. Kept deliberately minimal —
 * name, slug, photo, and an optional role for the byline.
 */
export const authorType = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      description: 'Static image or an animated GIF. GIFs are served as the original file so the animation is preserved.',
      options: {hotspot: true, accept: 'image/png,image/jpeg,image/webp,image/gif,image/avif'},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => rule.required().warning('Alt text is important for accessibility'),
        }),
      ],
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'Optional job title for the byline, e.g. "Content Writer".',
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'role', media: 'image'},
  },
})
