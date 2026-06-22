import {defineField, defineType} from 'sanity'
import {SearchIcon} from '@sanity/icons'

/**
 * Reusable SEO metadata. Embedded as an object on documents (e.g. `post`) —
 * page-specific, not shared, so it's an object rather than a reference.
 * Frontend falls back to `title` / `excerpt` when these are blank.
 */
export const seoType = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  icon: SearchIcon,
  options: {collapsible: true, collapsed: true},
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      description: 'Overrides the post title in search results and browser tabs. ~60 characters.',
      validation: (rule) => rule.max(60).warning('Keep under 60 characters to avoid truncation'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      description: 'Shown in search results. Defaults to the excerpt if left blank. ~160 characters.',
      validation: (rule) => rule.max(160).warning('Keep under 160 characters to avoid truncation'),
    }),
    defineField({
      name: 'ogImage',
      title: 'Social share image',
      type: 'image',
      description: 'Used for Open Graph / Twitter cards. Defaults to the cover image if left blank.',
      options: {hotspot: true},
    }),
    defineField({
      name: 'noIndex',
      title: 'Hide from search engines',
      type: 'boolean',
      description: 'Adds a noindex tag so this post is excluded from search engines.',
      initialValue: false,
    }),
  ],
})
