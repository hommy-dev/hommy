import 'dotenv/config'

import {createReadStream} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {resolve} from 'node:path'

import {createClient} from 'next-sanity'

import {apiVersion, dataset, projectId} from '../src/sanity/env'

/**
 * Seed the Sanity blog with authors, categories and posts (with uploaded cover
 * images and rich Portable Text bodies).
 *
 *   npx tsx scripts/seed-blog.ts            # upsert content (idempotent)
 *
 * Uses deterministic document _ids so re-running replaces rather than
 * duplicates. Cover images are pulled from public/bg/ and de-duplicated by
 * filename so re-runs don't pile up orphan assets.
 *
 * Requires SANITY_API_DEV_TOKEN (read+write) in .env.
 */

const token = process.env.SANITY_API_DEV_TOKEN
if (!token) {
  console.error('Missing SANITY_API_DEV_TOKEN in .env — needs a read+write token.')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
})

const PUBLIC_DIR = resolve(process.cwd(), 'public')

// ---------------------------------------------------------------------------
// Portable Text helpers
// ---------------------------------------------------------------------------

const key = () => randomUUID().slice(0, 12)

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}

function span(text: string, marks: string[] = []): Span {
  return {_type: 'span', _key: key(), text, marks}
}

function block(style: string, children: Span[], extra: Record<string, unknown> = {}) {
  return {_type: 'block', _key: key(), style, markDefs: [], children, ...extra}
}

const p = (text: string) => block('normal', [span(text)])
const h2 = (text: string) => block('h2', [span(text)])
const h3 = (text: string) => block('h3', [span(text)])

function bullets(items: string[]) {
  return items.map((item) =>
    block('normal', [span(item)], {listItem: 'bullet', level: 1}),
  )
}

function numbered(items: string[]) {
  return items.map((item) =>
    block('normal', [span(item)], {listItem: 'number', level: 1}),
  )
}

function callout(tone: string, title: string, content: string) {
  return {_type: 'callout', _key: key(), tone, title, content}
}

function pullQuote(quote: string, attribution?: string) {
  return {_type: 'pullQuote', _key: key(), quote, attribution}
}

function cta(label: string, href: string, variant: 'primary' | 'secondary' = 'primary') {
  return {
    _type: 'cta',
    _key: key(),
    label,
    variant,
    link: {
      _type: 'link',
      linkType: 'external',
      href,
      openInNewTab: false,
    },
  }
}

function imageBlock(assetId: string, alt: string, caption?: string) {
  return {
    _type: 'imageBlock',
    _key: key(),
    asset: {_type: 'image', asset: {_type: 'reference', _ref: assetId}},
    alt,
    caption,
  }
}

// ---------------------------------------------------------------------------
// Asset upload (de-duplicated by original filename)
// ---------------------------------------------------------------------------

const assetCache = new Map<string, string>()

async function uploadImage(relPath: string): Promise<string> {
  if (assetCache.has(relPath)) return assetCache.get(relPath)!

  const filename = relPath.split('/').pop()!
  const existing = await client.fetch<string | null>(
    '*[_type == "sanity.imageAsset" && originalFilename == $filename][0]._id',
    {filename},
  )
  if (existing) {
    assetCache.set(relPath, existing)
    return existing
  }

  const abs = resolve(PUBLIC_DIR, relPath)
  const asset = await client.assets.upload('image', createReadStream(abs), {filename})
  assetCache.set(relPath, asset._id)
  return asset._id
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const authors = [
  {
    _id: 'author.maria-chen',
    name: 'Maria Chen',
    slug: 'maria-chen',
    role: 'Home Services Editor',
    bio: 'Maria has spent a decade writing about home improvement and connecting homeowners with trustworthy pros. She believes a good roof is the most underrated upgrade you can make.',
    image: 'bg/worker-1.jpeg',
    socialLinks: [
      {platform: 'twitter', url: 'https://twitter.com/hommy'},
      {platform: 'linkedin', url: 'https://www.linkedin.com/company/hommy'},
    ],
  },
  {
    _id: 'author.james-patterson',
    name: 'James Patterson',
    slug: 'james-patterson',
    role: 'Roofing Specialist',
    bio: 'A licensed roofing contractor for 18 years, James now helps homeowners understand the work behind their walls — and how to spot a job done right.',
    image: 'bg/worker-0.jpeg',
    socialLinks: [{platform: 'website', url: 'https://hommy.com'}],
  },
]

const categories = [
  {_id: 'category.roofing-101', title: 'Roofing 101', slug: 'roofing-101', description: 'The fundamentals every homeowner should know about their roof.'},
  {_id: 'category.maintenance', title: 'Maintenance', slug: 'maintenance', description: 'Keep your roof healthy and avoid costly surprises.'},
  {_id: 'category.storm-damage', title: 'Storm & Damage', slug: 'storm-damage', description: 'What to do when the weather does a number on your roof.'},
  {_id: 'category.costs', title: 'Costs & Financing', slug: 'costs-financing', description: 'Real numbers, budgeting tips, and how to pay for the work.'},
  {_id: 'category.hiring', title: 'Hiring a Pro', slug: 'hiring-a-pro', description: 'Find, vet, and work with a contractor you can trust.'},
]

type PostSeed = {
  slug: string
  title: string
  eyebrow?: string
  excerpt: string
  category: string
  author: string
  cover: string
  coverAlt: string
  readTime: number
  featured?: boolean
  daysAgo: number
  body: (assets: Record<string, string>) => unknown[]
  related?: string[]
}

const posts: PostSeed[] = [
  {
    slug: 'how-to-choose-roofing-material',
    title: 'How to Choose the Right Roofing Material for Your Home',
    eyebrow: 'GUIDE',
    excerpt:
      'Asphalt, metal, tile, or slate? The right roof depends on your climate, budget, and how long you plan to stay. Here is how the pros decide.',
    category: 'category.roofing-101',
    author: 'author.maria-chen',
    cover: 'bg/roof-replacement.jpg',
    coverAlt: 'A freshly replaced residential roof under a clear sky',
    readTime: 7,
    featured: true,
    daysAgo: 2,
    related: ['how-much-roof-replacement-cost', 'questions-before-hiring-roofer'],
    body: (a) => [
      p('Your roof is the single most important barrier between your home and the elements — and the material you choose shapes everything from your energy bills to how often you will be calling a contractor over the next 30 years.'),
      p('There is no universally "best" roof. The right choice balances four things: your climate, your budget, the look you want, and how long you plan to own the home. Let us walk through the most common options.'),
      h2('Asphalt shingles'),
      p('Asphalt shingles cover roughly four out of five homes in North America, and for good reason: they are affordable, widely available, and easy for any contractor to install and repair.'),
      ...bullets([
        'Lifespan: 15–30 years depending on quality',
        'Cost: the most budget-friendly option upfront',
        'Best for: most suburban homes and moderate climates',
      ]),
      callout('tip', 'Pro tip', 'Architectural (dimensional) shingles cost a little more than basic 3-tab shingles but last longer and resist wind far better. For most homeowners the upgrade pays for itself.'),
      h2('Metal roofing'),
      p('Metal has shed its "barn roof" reputation and become one of the fastest-growing choices for residential homes. It reflects heat, sheds snow, and can last half a century.'),
      imageBlock(a['bg/roof-inspection.jpg'], 'A contractor inspecting a metal roof panel', 'Metal roofs cost more upfront but can outlast two asphalt roofs.'),
      h2('Tile and slate'),
      p('Clay tile and natural slate are the premium end of the market — stunning, extremely durable, and heavy enough that your home may need additional structural support.'),
      pullQuote('A roof is not a place to chase the lowest bid. It is the one repair that protects every other repair you have ever made.', 'James Patterson, Roofing Specialist'),
      h2('How to make the call'),
      p('Start with your climate and your timeline, then let budget narrow the field. If you are staying put for decades, spending more on metal or tile often costs less per year of service than replacing cheaper shingles twice.'),
      callout('info', 'Not sure where to start?', 'A good local contractor will walk your roof, factor in your climate, and give you options at different price points — not just push their highest margin product.'),
      cta('Get matched with a roofing pro', 'https://hommy.com/get-a-quote'),
    ],
  },
  {
    slug: '10-signs-roof-needs-repair',
    title: "10 Signs Your Roof Needs Repair (Before It's Too Late)",
    eyebrow: 'CHECKLIST',
    excerpt:
      'Most roof problems are cheap to fix early and expensive to ignore. Here are the warning signs worth a five-minute look from the ground.',
    category: 'category.maintenance',
    author: 'author.james-patterson',
    cover: 'bg/roof-repair.jpg',
    coverAlt: 'Close-up of damaged shingles being repaired',
    readTime: 6,
    daysAgo: 9,
    related: ['seasonal-roof-maintenance-checklist', 'how-to-choose-roofing-material'],
    body: (a) => [
      p('The cruel thing about roof damage is that by the time you see a stain on your ceiling, the problem has usually been growing for months. The good news: most early warning signs are visible from the ground or your attic.'),
      h2('Look up from the curb'),
      ...numbered([
        'Shingles that are curling, cupping, or missing entirely',
        'Bald patches where the protective granules have worn away',
        'A roofline that sags or dips instead of running straight',
        'Dark streaks or green moss, especially on shaded slopes',
      ]),
      callout('warning', 'Stay off the roof', 'You do not need to climb up to spot trouble — and you should not. Most of these checks are safer (and just as effective) from the ground with a pair of binoculars.'),
      h2('Check the attic'),
      ...numbered([
        'Daylight visible through the roof boards',
        'Water stains or streaks on the rafters',
        'A musty smell or visible mold',
        'Sagging or damp insulation',
      ]),
      h2('Watch the details'),
      ...numbered([
        'Granules collecting in your gutters or at the base of downspouts',
        'Flashing around chimneys and vents that is cracked or pulling away',
      ]),
      pullQuote('Caught early, a flashing leak is a one-hour fix. Ignored, it rots the deck and becomes a five-figure job.', 'James Patterson'),
      p('If you spot two or more of these signs, it is worth having a professional take a closer look before the next big storm.'),
      cta('Find a local roofer', 'https://hommy.com/get-a-quote'),
    ],
  },
  {
    slug: 'what-to-do-after-storm-damage',
    title: 'What to Do After Storm Damage to Your Roof',
    eyebrow: 'HOW TO',
    excerpt:
      'High winds and hail can wreck a roof in minutes. Move fast, document everything, and avoid the storm-chasers — here is the right order of operations.',
    category: 'category.storm-damage',
    author: 'author.maria-chen',
    cover: 'bg/storm-damage.jpg',
    coverAlt: 'A roof with visible storm damage after severe weather',
    readTime: 8,
    featured: true,
    daysAgo: 16,
    related: ['10-signs-roof-needs-repair', 'questions-before-hiring-roofer'],
    body: (a) => [
      p('When a storm passes, the clock starts. Acting quickly protects your home from further damage and keeps your insurance claim clean. But moving fast does not mean signing the first contract a door-knocker hands you.'),
      h2('1. Make sure it is safe'),
      p('Stay clear of downed power lines and standing water. Do not climb onto a wet or damaged roof. From the ground, look for missing shingles, dents, and debris.'),
      h2('2. Document everything'),
      p('Before you touch anything, photograph the damage from multiple angles — the roof, the gutters, the siding, and any interior leaks. Timestamped photos are gold when you file a claim.'),
      callout('warning', 'Beware of storm chasers', 'After major storms, out-of-town crews flood the area offering instant cash deals. Many vanish the moment something goes wrong. Insist on a local, licensed, insured contractor with a real address.'),
      h2('3. Prevent further damage'),
      p('If water is actively getting in, a temporary tarp can stop the bleeding. Many roofers offer emergency tarping — and your insurer expects you to take reasonable steps to limit damage.'),
      imageBlock(a['bg/roof-inspection.jpg'], 'A roofer inspecting storm damage for an insurance claim', 'A professional inspection report strengthens your claim.'),
      h2('4. Call your insurer — and a roofer'),
      p('File your claim promptly, then get an independent inspection from a reputable local roofer. Having your own assessment alongside the adjuster keeps the estimate honest.'),
      pullQuote('The homeowners who do best after a storm are the ones who slow down for 48 hours, document, and choose a pro deliberately.', 'Maria Chen'),
      cta('Get a storm-damage inspection', 'https://hommy.com/get-a-quote'),
    ],
  },
  {
    slug: 'how-much-roof-replacement-cost',
    title: 'How Much Does a Roof Replacement Cost in 2026?',
    eyebrow: 'COSTS',
    excerpt:
      'Roof replacement runs anywhere from $8,000 to $30,000+. Here is what actually drives the price — and how to make sure you are comparing quotes fairly.',
    category: 'category.costs',
    author: 'author.maria-chen',
    cover: 'bg/house-lake.avif',
    coverAlt: 'A well-maintained house with a new roof beside a lake',
    readTime: 9,
    daysAgo: 24,
    related: ['how-to-choose-roofing-material', 'questions-before-hiring-roofer'],
    body: (a) => [
      p('A new roof is one of the larger home investments you will make, and the price range is wide enough to be confusing. Let us break down what you are actually paying for.'),
      h2('The big cost drivers'),
      ...bullets([
        'Roof size, measured in "squares" (one square = 100 sq ft)',
        'Material — asphalt is cheapest; metal, tile, and slate climb fast',
        'Pitch and complexity — steep, cut-up roofs cost more to work on',
        'Tear-off — removing old layers adds labor and disposal fees',
        'Your region and the season',
      ]),
      callout('info', 'Rough ballpark', 'For a typical single-family home, asphalt replacement often lands between $8,000 and $16,000. Metal can run $14,000–$30,000+. Tile and slate go higher still.'),
      h2('Why quotes vary so much'),
      p('Two bids on the same roof can differ by thousands — not because one contractor is ripping you off, but because they are quoting different materials, warranties, and scopes. Always compare like for like.'),
      pullQuote('The cheapest quote is rarely the cheapest roof. Ask what happens in year eight, not just day one.', 'James Patterson'),
      h2('Ways to manage the cost'),
      ...bullets([
        'Get at least three detailed, itemized quotes',
        'Ask about financing — many contractors offer it',
        'Time non-emergency work for the off-season',
        'Check whether part of the cost is insurable after storm damage',
      ]),
      cta('Compare quotes from vetted roofers', 'https://hommy.com/get-a-quote'),
    ],
  },
  {
    slug: 'questions-before-hiring-roofer',
    title: 'Questions to Ask Before Hiring a Roofing Contractor',
    eyebrow: 'HIRING',
    excerpt:
      'A great roofer will happily answer these. A bad one will dodge them. Use this list to separate the pros from the pretenders.',
    category: 'category.hiring',
    author: 'author.james-patterson',
    cover: 'bg/worker-0.jpeg',
    coverAlt: 'A professional roofing contractor on a job site',
    readTime: 6,
    daysAgo: 33,
    related: ['how-much-roof-replacement-cost', 'what-to-do-after-storm-damage'],
    body: (a) => [
      p('Hiring a roofer is a leap of faith — most of the work happens out of sight, and you will not know if corners were cut until it rains. The right questions, asked up front, protect you.'),
      h2('Credentials and protection'),
      ...numbered([
        'Are you licensed and fully insured? Can I see the certificates?',
        'Do you carry workers compensation for your crew?',
        'Are you local, and how long have you worked in this area?',
      ]),
      callout('warning', 'No insurance, no deal', 'If a contractor is not carrying liability and workers comp, an accident on your property can become your financial problem. This is non-negotiable.'),
      h2('The work itself'),
      ...numbered([
        'Will you remove the old roof, or install over it?',
        'What underlayment and flashing will you use?',
        'Who is the actual crew — your employees or subcontractors?',
        'How do you protect my landscaping and clean up nails?',
      ]),
      h2('Money and warranty'),
      ...numbered([
        'Is this a detailed, written, itemized quote?',
        'What is the payment schedule? (Avoid large upfront deposits.)',
        'What workmanship warranty do you offer, in writing?',
      ]),
      pullQuote('You are not just buying materials. You are buying the crew that installs them — and their willingness to come back.', 'James Patterson'),
      cta('Browse vetted roofing pros', 'https://hommy.com/get-a-quote'),
    ],
  },
  {
    slug: 'seasonal-roof-maintenance-checklist',
    title: 'Roof Maintenance Checklist: Seasonal Care That Saves You Money',
    eyebrow: 'CHECKLIST',
    excerpt:
      'Twenty minutes each season is all it takes to add years to your roof. Here is the simple, season-by-season routine the pros recommend.',
    category: 'category.maintenance',
    author: 'author.maria-chen',
    cover: 'bg/roof-inspection.jpg',
    coverAlt: 'A homeowner reviewing a roof maintenance checklist',
    readTime: 5,
    daysAgo: 41,
    related: ['10-signs-roof-needs-repair', 'how-to-choose-roofing-material'],
    body: (a) => [
      p('Roofs rarely fail overnight. They fail slowly, from small problems left unattended. A little seasonal attention is the cheapest insurance you can buy.'),
      h2('Spring'),
      ...bullets([
        'Inspect for winter damage — cracked or lifted shingles',
        'Clean gutters of pollen, seeds, and debris',
        'Check flashing around chimneys and vents',
      ]),
      h2('Summer'),
      ...bullets([
        'Trim overhanging branches that scrape the roof',
        'Look for moss or algae on shaded slopes',
        'Check attic ventilation — heat buildup ages shingles',
      ]),
      callout('tip', 'Make it a habit', 'Pair each check with something you already do seasonally — swapping the AC filter, putting away patio furniture — so it never gets forgotten.'),
      h2('Fall'),
      ...bullets([
        'Clear leaves from gutters before the first freeze',
        'Confirm downspouts drain away from the foundation',
        'Schedule any needed repairs before winter',
      ]),
      h2('Winter'),
      ...bullets([
        'Watch for ice dams along the eaves',
        'Rake heavy snow off low-slope sections if safe to do so',
        'Check the attic for condensation and frost',
      ]),
      pullQuote('The homeowners who never call me in a panic are the ones who spend twenty quiet minutes a season looking up.', 'James Patterson'),
      cta('Need a hand? Find a local pro', 'https://hommy.com/get-a-quote', 'secondary'),
    ],
  },
]

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

function isoDaysAgo(days: number): string {
  const ms = Date.now() - days * 24 * 60 * 60 * 1000
  return new Date(ms).toISOString()
}

async function main() {
  console.log(`Seeding blog into ${projectId}/${dataset}…\n`)

  // 1. Authors (with photos)
  for (const author of authors) {
    const imageId = await uploadImage(author.image)
    await client.createOrReplace({
      _id: author._id,
      _type: 'author',
      name: author.name,
      slug: {_type: 'slug', current: author.slug},
      role: author.role,
      bio: author.bio,
      image: {_type: 'image', asset: {_type: 'reference', _ref: imageId}, alt: `${author.name}, ${author.role}`},
      socialLinks: author.socialLinks.map((s) => ({_type: 'socialLink', _key: key(), ...s})),
    })
    console.log(`  author  ✓ ${author.name}`)
  }

  // 2. Categories
  for (const cat of categories) {
    await client.createOrReplace({
      _id: cat._id,
      _type: 'category',
      title: cat.title,
      slug: {_type: 'slug', current: cat.slug},
      description: cat.description,
    })
    console.log(`  category ✓ ${cat.title}`)
  }

  // 3. Pre-upload every cover + any inline images referenced by bodies
  const neededImages = new Set<string>()
  for (const post of posts) {
    neededImages.add(post.cover)
  }
  // Inline body images used across posts:
  ;['bg/roof-inspection.jpg'].forEach((i) => neededImages.add(i))
  const assets: Record<string, string> = {}
  for (const img of neededImages) {
    assets[img] = await uploadImage(img)
  }

  // 4. Posts (without relatedPosts — those are patched in a second pass so the
  //    targets all exist first and references stay strong)
  for (const post of posts) {
    await client.createOrReplace({
      _id: `post.${post.slug}`,
      _type: 'post',
      title: post.title,
      slug: {_type: 'slug', current: post.slug},
      eyebrow: post.eyebrow,
      excerpt: post.excerpt,
      mainImage: {
        _type: 'image',
        asset: {_type: 'reference', _ref: assets[post.cover]},
        alt: post.coverAlt,
      },
      body: post.body(assets),
      category: {_type: 'reference', _ref: post.category},
      author: {_type: 'reference', _ref: post.author},
      publishedAt: isoDaysAgo(post.daysAgo),
      readTime: post.readTime,
      featured: post.featured ?? false,
      seo: {
        metaTitle: post.title,
        metaDescription: post.excerpt.slice(0, 155),
        noIndex: false,
      },
    })
    console.log(`  post     ✓ ${post.title}`)
  }

  // 5. Related posts (second pass — all targets now exist)
  for (const post of posts) {
    if (!post.related?.length) continue
    await client
      .patch(`post.${post.slug}`)
      .set({
        relatedPosts: post.related.map((slug) => ({
          _type: 'reference',
          _key: key(),
          _ref: `post.${slug}`,
        })),
      })
      .commit()
  }

  console.log(`\nDone — ${authors.length} authors, ${categories.length} categories, ${posts.length} posts.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
