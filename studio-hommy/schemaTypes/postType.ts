import {defineField, defineType} from 'sanity'

/**
 * Starter content type so the Studio boots with something editable.
 * Replace / extend this with Hommy's real content model (e.g. marketing
 * pages, blog posts, SEO city-page copy) — see the sanity-best-practices
 * `schema` reference for modeling patterns.
 */
export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
    }),
    defineField({
      name: 'excerpt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [{type: 'block'}],
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'slug.current'},
  },
})
