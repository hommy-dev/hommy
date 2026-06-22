import {defineArrayMember, defineType} from 'sanity'

/**
 * Portable Text body for blog posts. Standard text blocks plus custom blocks:
 * image, callout, pull quote, CTA, and embed. The `link` annotation reuses the
 * shared `link` object (internal reference or external URL).
 */
export const blockContentType = defineType({
  name: 'blockContent',
  title: 'Body',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'Heading 2', value: 'h2'},
        {title: 'Heading 3', value: 'h3'},
        {title: 'Heading 4', value: 'h4'},
        {title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Strong', value: 'strong'},
          {title: 'Emphasis', value: 'em'},
          {title: 'Underline', value: 'underline'},
          {title: 'Code', value: 'code'},
          {title: 'Highlight', value: 'highlight'},
        ],
        annotations: [defineArrayMember({type: 'link'})],
      },
    }),
    defineArrayMember({type: 'imageBlock'}),
    defineArrayMember({type: 'callout'}),
    defineArrayMember({type: 'pullQuote'}),
    defineArrayMember({type: 'cta'}),
    defineArrayMember({type: 'embed'}),
  ],
})
