This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Homei

Homei is a two-sided **home-services** platform: exclusive lead generation on the
homeowner side, and a purpose-built CRM on the contractor side. It **launches with
roofing** as the first vertical, but the architecture is multi-vertical — more home
services (cleaning, gutters, etc.) come later on the same core. See
**`docs/HOMEI_PLATFORM.md`** for the full product & technical brief (the single
source of truth) — read §0 first for the multi-vertical naming/schema rules.

### Run the background-jobs dev server (Inngest)

```bash
pnpm dlx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

### Documentation

```
Root:
├── AGENTS.md         — Next.js 16 rules + docs index
├── CLAUDE.md         — points to AGENTS.md
├── CODING_GUIDE.md   — Next.js 16 patterns, auth, caching, common bugs
└── .impeccable.md    — design context (voice, aesthetic, principles)

docs/
└── HOMEI_PLATFORM.md — single source of truth: pages, flows, schema,
                          Inngest jobs, lead-assignment logic, pricing, env
```

### Useful scripts

```bash
pnpm db:generate         # generate Drizzle migrations from src/lib/db/schema.ts
pnpm db:migrate          # apply migrations
pnpm admin:create        # create an admin user
pnpm email:test -- --to=you@example.com   # Resend smoke test
```