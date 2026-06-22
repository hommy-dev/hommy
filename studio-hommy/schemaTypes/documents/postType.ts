import {defineArrayMember, defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons'

/**
 * Blog post — the core content type powering the blog index (cards) and the
 * article page (hero, author, body, related posts). Service-neutral: nothing
 * here is roofing-specific.
 */
export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'meta', title: 'Meta'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (rule) =>
        rule.required().custom(async (slug, context) => {
          if (!slug?.current) return true
          if (!/^[a-z0-9-]+$/.test(slug.current)) {
            return 'Slug must be lowercase letters, numbers and hyphens only'
          }
          const client = context.getClient({apiVersion: '2026-06-01'})
          const id = context.document?._id?.replace(/^drafts\./, '')
          const count = await client.fetch(
            'count(*[_type == "post" && slug.current == $slug && _id != $id && _id != "drafts." + $id])',
            {slug: slug.current, id},
          )
          return count === 0 || 'Another post already uses this slug'
        }),
    }),
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      group: 'content',
      description: 'Small label above the title on featured cards, e.g. "HOW TO".',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'Short summary used on cards and as the SEO description fallback.',
      validation: (rule) =>
        rule.required().max(220).warning('Keep under ~220 characters for cards and SEO'),
    }),
    defineField({
      name: 'mainImage',
      title: 'Cover image',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => rule.required().warning('Alt text is important for accessibility and SEO'),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
      group: 'content',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: 'meta',
      to: [{type: 'category'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      group: 'meta',
      to: [{type: 'author'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'meta',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'readTime',
      title: 'Reading time (minutes)',
      type: 'number',
      group: 'meta',
      description: 'Shown as "x min read". Leave blank to let the site estimate it from the body.',
      validation: (rule) => rule.min(1).integer(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'meta',
      description: 'Promote this post to the featured slot on the blog index.',
      initialValue: false,
    }),
    defineField({
      name: 'relatedPosts',
      title: 'Related posts',
      type: 'array',
      group: 'meta',
      description: 'Up to 3 posts shown in the "Related articles" section.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'post'}],
        }),
      ],
      validation: (rule) => rule.max(3).unique(),
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  preview: {
    select: {title: 'title', author: 'author.name', category: 'category.title', media: 'mainImage'},
    prepare({title, author, category, media}) {
      const parts = [category, author].filter(Boolean)
      return {title, subtitle: parts.join(' · ') || undefined, media}
    },
  },
  orderings: [
    {
      title: 'Published, newest first',
      name: 'publishedDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
    {
      title: 'Title A–Z',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}],
    },
  ],
})
