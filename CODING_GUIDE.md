# Next.js 16 — Complete AI Coding Guide

> Stack: Next.js 16.2+ · Supabase · Drizzle · Tailwind · shadcn/ui
> This file is your source of truth. Read it before writing any Next.js code.
> AI models were trained on older Next.js — this corrects the outdated patterns they default to.

---

## BEFORE ANYTHING ELSE — THE AGENTS.MD SETUP

This is not optional if you are vibe coding. Do this first, before creating a single file.

Next.js ships version-matched documentation inside the next package. An AGENTS.md file at the root of your project directs agents to these bundled docs instead of their training data. The docs live at `node_modules/next/dist/docs/` and always match your installed version — no network request needed.

Internal Vercel research showed that always-available bundled context achieved a 100% pass rate on Next.js evals, compared to 79% with on-demand retrieval. That 21% difference is the difference between code that works and code that silently uses deprecated APIs.

**Create these two files at project root after `npm install`:**

```
# AGENTS.md
<!-- BEGIN:nextjs-agent-rules -->
# Next.js: ALWAYS read docs before coding
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`.
Your training data is outdated — the docs are the source of truth.
<!-- END:nextjs-agent-rules -->

# Project-specific rules (add yours below this line):
- Stack: Next.js 16, Supabase, Drizzle ORM, Tailwind, shadcn/ui
- Database schema is at src/lib/db/schema.ts
- Server Actions are in src/lib/actions/
- Auth helper is getRequiredUser() in src/lib/auth/session.ts
- cacheComponents: true is enabled — use "use cache" directive, NOT unstable_cache
- proxy.ts replaces middleware.ts — never create middleware.ts
- params and searchParams are always Promises — always await them
- Money fields use Decimal strings in DB — parse with parseFloat() for display only
```

```
# CLAUDE.md
@AGENTS.md
```

For Next.js 16.1 and earlier, run the codemod to generate these instead:

```bash
npx @next/codemod@latest agents-md
```

---

## 0. THE MENTAL MODEL

Two sentences. If you remember nothing else, remember these:

> **Everything runs at request time by default. You explicitly opt IN to caching with `"use cache"`.**

This is the opposite of Next.js 13/14. That version cached everything by default, causing stale data bugs everywhere. Next.js 15 started reversing this. Next.js 16 completed it. If AI writes code using `fetch({ cache: 'force-cache' })` or `unstable_cache()` — it's using old patterns. The correct pattern in v16 is `"use cache"` directive.

---

## 1. PROJECT SETUP

### next.config.ts

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables "use cache" directive + PPR — required for this guide
  cacheComponents: true,

  // Turbopack filesystem cache — much faster dev restarts on large projects
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  // Forward browser errors to terminal — critical for AI debugging (16.2+)
  // AI agents can't see the browser console. This makes errors visible.
  logging: {
    browserToTerminal: "error", // 'warn' | true (all) | false (disable)
  },

  // Custom cache profiles — reference by name in cacheLife()
  cacheLife: {
    // Almost never changes: platform config, pricing tiers, static content
    static: {
      stale: 60 * 60 * 24 * 7, // 7 days client-side
      revalidate: 60 * 60 * 24, // recheck once/day
      expire: 60 * 60 * 24 * 30, // max 30 days
    },
    // Contractor profiles, city pages, reviews — updates occasionally
    standard: {
      stale: 60, // 1 min client
      revalidate: 300, // recheck every 5 min
      expire: 3600, // max 1 hour
    },
    // Lead counts, active job statuses — updates frequently
    live: {
      stale: 10,
      revalidate: 30,
      expire: 60,
    },
  },

  images: {
    minimumCacheTTL: 14400, // 4 hours (v16 default — keep it)
  },
};

export default nextConfig;
```

### Folder Structure

```
src/
├── app/
│   ├── page.tsx            # Homepage — public, no auth (homeowner lead intake)
│   ├── get-a-quote/        # Public homeowner pages — NO accounts for homeowners
│   ├── contractors/        # Public contractor recruitment + /contractors/signup
│   ├── roofing-contractors/[slug]/   # Public SEO city pages
│   ├── review/[token]/     # Tokenized homeowner review submission (no login)
│   ├── dashboard/          # Contractor CRM — auth required, role = contractor
│   │   ├── layout.tsx      # Auth guard here: getRequiredUser('contractor')
│   │   └── page.tsx
│   ├── admin/              # Admin — auth required, role = admin
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── auth/               # login + Supabase callback
│   └── api/                # inngest, push, webhooks/* (Stripe, Twilio)
├── lib/
│   ├── db/
│   │   ├── index.ts        # Drizzle client
│   │   └── schema.ts       # Schema
│   ├── supabase/
│   │   ├── server.ts       # Server-side client
│   │   ├── client.ts       # Browser client
│   │   └── middleware.ts   # handleProxyAuth() — called by proxy.ts
│   ├── auth/
│   │   └── session.ts      # getRequiredUser(), getOptionalUser()
│   ├── notifications/      # sendNotification() — SMS/email/push core
│   ├── inngest/            # client + functions/ (background jobs)
│   └── actions/            # ALL Server Actions live here — never inline them
│       ├── leads.ts
│       ├── projects.ts
│       └── estimates.ts
├── components/
│   ├── ui/                 # shadcn — never edit these
│   ├── dashboard/          # contractor CRM chrome (sidebar, nav)
│   ├── chat/ realtime/ presence/ notifications/   # reusable comms UI
│   └── admin/
└── proxy.ts                # Auth + routing — NOT middleware.ts

# NOTE: Homeowners are UNAUTHENTICATED. There is no /homeowner app and no
# HOMEOWNER role. Homeowners submit public forms and act via tokenized links
# (estimate acceptance, reviews); all homeowner comms are SMS + email.
```

---

## 2. proxy.ts — REPLACES MIDDLEWARE.TS

`middleware.ts` is deprecated in Next.js 16. Rename it to `proxy.ts` and rename the export to `proxy`.

**Rule: proxy.ts only checks if a session cookie EXISTS. No DB calls. No JWT verification. Keep it under 20ms.**

```ts
// src/proxy.ts
import { type NextRequest, NextResponse } from "next/server";

// Homei public surface (homeowners are unauthenticated). The real
// implementation lives in src/lib/supabase/middleware.ts (handleProxyAuth);
// proxy.ts just delegates to it. Everything NOT public requires a session.
const PUBLIC_PATHS = [
  "/",
  "/get-a-quote",
  "/thank-you",
  "/contractors",          // recruitment landing + /contractors/signup
  "/roofing-contractors",  // SEO city pages
  "/review",               // tokenized homeowner review flow
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/api/inngest",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets — always allow
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|svg|ico|css|js|woff2?)$/)
  )
    return NextResponse.next();

  // Webhooks — always allow (Stripe, Twilio have no session cookie)
  if (pathname.startsWith("/api/webhooks")) return NextResponse.next();

  // Public paths — allow
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublic) return NextResponse.next();

  // Protected — presence of any Supabase cookie is enough here. Layouts do
  // the real JWT validation + role check via getRequiredUser().
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasSession) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

---

## 3. AUTHENTICATION

### Supabase Server Client

```ts
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  // cookies() is async in Next.js 16 — always await it
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — proxy.ts handles redirect
          }
        },
      },
    }
  );
}
```

### getRequiredUser — the only auth function you need

```ts
// src/lib/auth/session.ts
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Only two authenticated roles — homeowners never log in.
type Role = "contractor" | "admin";

const ROLE_HOMES: Record<Role, string> = {
  contractor: "/dashboard",
  admin: "/admin",
};

// Use in layouts and pages. Redirects on failure — never returns null.
export async function getRequiredUser(requiredRole?: Role) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/auth/login");

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) redirect("/auth/login");

  if (requiredRole && dbUser.role !== requiredRole) {
    redirect(ROLE_HOMES[dbUser.role as Role]);
  }

  return dbUser;
}

// For public pages that show different UI for logged-in users
export async function getOptionalUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    return dbUser ?? null;
  } catch {
    return null;
  }
}
```

### Route Group Auth Pattern

```tsx
// src/app/dashboard/layout.tsx
// One auth check gates the ENTIRE contractor section
import { getRequiredUser } from "@/lib/auth/session";

export default async function ContractorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects if not logged in OR wrong role — never reaches children
  const user = await getRequiredUser("contractor");
  return (
    <div className="flex h-screen">
      <ContractorSidebar user={user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

// src/app/dashboard/page.tsx
// No separate auth check needed — layout already did it
export default async function ContractorDashboard() {
  const user = await getRequiredUser("contractor"); // fast — React deduplicates the call
  const [leads, jobs] = await Promise.all([
    getLeads(user.id),
    getJobs(user.id),
  ]);
  return <DashboardView leads={leads} jobs={jobs} />;
}
```

---

## 4. CACHING — COMPLETE GUIDE

### The rules in one place

```
cacheComponents: true means:
  ✓ Everything is dynamic by default (runs every request)
  ✓ Add "use cache" to opt INTO caching
  ✓ Never cache anything that touches cookies/headers/session
  ✓ Cached functions CANNOT call cookies(), headers(), searchParams directly
  ✓ Pass user-specific values as arguments to cached functions
```

### "use cache" constraints — things AI gets wrong

```ts
// ❌ WRONG — cached functions cannot read cookies/headers directly
async function getUserData() {
  'use cache'
  const cookieStore = await cookies()  // ERROR: not allowed inside cached scope
  const token = cookieStore.get('token')
  ...
}

// ✅ CORRECT — read cookies OUTSIDE, pass result IN as argument
export default async function Page() {
  const user = await getRequiredUser() // reads cookies — NOT cached
  const data = await getUserData(user.id) // pass userId — cached safely
  return <View data={data} />
}

async function getUserData(userId: string) {
  'use cache'
  cacheLife('standard')
  cacheTag(`user-data-${userId}`) // per-user cache key
  return db.select().from(...)...
}

// ❌ WRONG — cannot pass Server Actions INTO cached components and call them there
async function CachedForm({ action }: { action: () => Promise<void> }) {
  'use cache'
  action() // ERROR: cannot invoke Server Actions inside cached scope
  return <form>...</form>
}

// ✅ CORRECT — pass Server Actions through, let Client Components call them
async function CachedForm({ action }: { action: () => Promise<void> }) {
  'use cache'
  // Only pass the action down — don't call it here
  return <ClientFormButton action={action} />
}
```

### Cache profiles reference

| Profile      | Stale  | Revalidate | Expire  | Use for             |
| ------------ | ------ | ---------- | ------- | ------------------- |
| `'seconds'`  | ~0     | ~1s        | ~1min   | Real-time data      |
| `'minutes'`  | ~1min  | ~1min      | ~5min   | Fast-changing       |
| `'hours'`    | ~5min  | ~1hr       | ~1day   | Moderately updated  |
| `'days'`     | ~1hr   | ~1day      | ~1week  | Slowly updated      |
| `'weeks'`    | ~1day  | ~1week     | ~1month | Rarely updated      |
| `'max'`      | ~1day  | ~1week     | ~1year  | Almost static       |
| `'static'`   | 7 days | 1 day      | 30 days | Custom (see config) |
| `'standard'` | 1 min  | 5 min      | 1 hour  | Custom (see config) |
| `'live'`     | 10 sec | 30 sec     | 1 min   | Custom (see config) |

### Caching data functions

```ts
// src/lib/data/contractor.ts
import { cacheLife, cacheTag } from "next/cache";

// Public contractor profile — safe to cache, same for all users
export async function getPublicContractorProfile(contractorId: string) {
  "use cache";
  cacheLife("standard");
  cacheTag(`contractor-profile-${contractorId}`);

  const [profile] = await db
    .select()
    .from(contractorProfiles)
    .where(eq(contractorProfiles.id, contractorId))
    .limit(1);

  return profile ?? null;
}

// City SEO page — cache aggressively
export async function getContractorsInCity(city: string, state: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`contractors-city-${city}-${state}`);

  return db
    .select()
    .from(contractorProfiles)
    .where(
      and(
        eq(contractorProfiles.status, "ACTIVE"),
        eq(contractorProfiles.primaryCity, city)
      )
    );
}

// Layout data — cache so layout doesn't hit DB on every navigation
export async function getContractorLayoutData(contractorId: string) {
  "use cache";
  cacheLife("standard");
  cacheTag(`contractor-layout-${contractorId}`);

  return db
    .select({
      id: contractorProfiles.id,
      businessName: contractorProfiles.businessName,
      avatarUrl: contractorProfiles.avatarUrl,
    })
    .from(contractorProfiles)
    .where(eq(contractorProfiles.id, contractorId))
    .limit(1);
}

// NEVER cache these — always dynamic:
export async function getActiveJobStatus(jobId: string) {
  // No "use cache" — job status changes constantly during active work
  return db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
}

export async function getUnreadNotificationCount(userId: string) {
  // No "use cache" — must always be fresh
  return db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
}
```

### Mixing cached and dynamic content (PPR)

```tsx
// app/dashboard/page.tsx — contractor command center
import { Suspense } from "react";

// No "use cache" at page level — page reads session (dynamic)
export default async function DashboardHome() {
  const user = await getRequiredUser("contractor");

  return (
    <div>
      {/* CACHED — loads from static shell instantly, same for everyone */}
      <Suspense fallback={<TipsSkeleton />}>
        <CachedGettingStartedSection />
      </Suspense>

      {/* DYNAMIC — streams in, contractor-specific */}
      <Suspense fallback={<PipelineSkeleton />}>
        <ActivePipeline contractorId={user.id} />
      </Suspense>

      <Suspense fallback={<LeadsSkeleton />}>
        <TodaysLeads contractorId={user.id} />
      </Suspense>
    </div>
  );
}

async function CachedGettingStartedSection() {
  "use cache";
  cacheLife("max");
  cacheTag("getting-started");
  return <GettingStartedUI />; // no DB call — pure static content
}

async function ActivePipeline({ contractorId }: { contractorId: string }) {
  // No cache — pipeline changes constantly
  const projects = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.contractorId, contractorId),
        inArray(projects.stage, [
          "new_lead",
          "contacted",
          "estimate_sent",
          "in_progress",
        ])
      )
    );
  return <PipelineBoard projects={projects} />;
}
```

### Cache invalidation after mutations

```ts
// updateTag() — use after Server Actions triggered by users
// User sees their own change immediately (read-your-writes)
export async function updateContractorProfile(
  contractorId: string,
  data: UpdateInput
) {
  "use server";
  const user = await getRequiredUser("contractor");
  await db
    .update(contractorProfiles)
    .set(data)
    .where(eq(contractorProfiles.id, contractorId));

  updateTag(`contractor-profile-${contractorId}`); // user sees change NOW
  updateTag(`contractor-layout-${contractorId}`);
  if (data.primaryCity)
    updateTag(`contractors-city-${data.primaryCity}-${data.primaryState}`);
}

// revalidateTag() — use in background jobs, webhooks, admin actions
// SWR: old content served until revalidation completes
export async function stripeWebhookHandler(event: Stripe.Event) {
  if (event.type === "account.updated") {
    const contractorId = event.data.object.metadata.contractorId;
    revalidateTag(`contractor-profile-${contractorId}`, "max"); // background — SWR ok
    revalidateTag(`contractor-layout-${contractorId}`, "max");
  }
}
```

**Rule: `updateTag` = user-initiated mutations. `revalidateTag` = background jobs, webhooks, admin.**

---

## 5. THE ACTIVITY COMPONENT BUG — READ THIS

This is the most dangerous gotcha in Next.js 16 with `cacheComponents: true`. It has broken many real apps.

**What happens:** When `cacheComponents: true` is enabled, Next.js wraps routes with React's `<Activity>` component. This means when you navigate away from a page, the previous page is NOT unmounted — it's hidden with `display: none`. When you navigate back, it's shown again with its state intact. Components do not remount.

**Why this breaks things:**

```tsx
// ❌ This breaks with cacheComponents: true

// User visits /checkout, pays, sees Success message
// User navigates to /shop
// User comes back to /checkout
// BUG: User sees old Success message because component never unmounted
function CheckoutPage() {
  const [step, setStep] = useState<"form" | "success">("form");

  return step === "success" ? (
    <SuccessMessage /> // Still showing — component was never reset
  ) : (
    <CheckoutForm onSuccess={() => setStep("success")} />
  );
}

// ❌ Forms with the same field names appear twice in DOM simultaneously
// (Playwright strict mode fails because getByLabel("Email") matches 2 elements)
// Login page and Signup page both have Email + Password fields
// Both are in the DOM at the same time when navigating between them
```

**Real bugs confirmed from GitHub issues:**

- Dropdowns stay open after navigation
- Dialogs show stale state on return visit
- Forms with same field names create duplicate DOM elements
- State set from URL params (`?newEntry=true`) persists after the param is gone
- E2E tests fail because hidden routes are still in the DOM

**The fixes:**

```tsx
// Fix 1 — Reset state on pathname change using usePathname
"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function CheckoutPage() {
  const pathname = usePathname();
  const [step, setStep] = useState<"form" | "success">("form");

  // Reset when returning to this route
  useEffect(() => {
    setStep("form");
  }, [pathname]);

  return step === "success" ? <SuccessMessage /> : <CheckoutForm />;
}

// Fix 2 — Use key prop to force full remount
// Parent passes pathname as key, forcing fresh mount every navigation
function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname}>{children}</div>;
}

// Fix 3 — Use URL state instead of local state for important UI state
// URL state survives remounts naturally and is always in sync
("use client");
import { useSearchParams, useRouter } from "next/navigation";

function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const step = searchParams.get("step") ?? "form";

  function handleSuccess() {
    router.replace("/checkout?step=success");
  }

  return step === "success" ? (
    <SuccessMessage />
  ) : (
    <CheckoutForm onSuccess={handleSuccess} />
  );
}
```

**Which fix to use:**

- Forms and checkout flows → Fix 2 (key prop forces full remount)
- Dialog/modal state that depends on URL params → Fix 1 or Fix 3
- Simple UI state (dropdowns, accordions) → Fix 1
- Auth forms (login/signup) → Fix 2, also give fields unique `id` attributes per page

**If the Activity bugs are causing too many problems:** You can disable `cacheComponents` and use `"use cache"` without it, but you lose PPR benefits. The `"use cache"` directive itself works independently.

---

## 6. SERVER COMPONENTS VS CLIENT COMPONENTS

### Decision rule — one question

**"Does it need to run in the browser?"**

- Has `onClick`, `onChange`, event handlers → Client
- Has `useState`, `useReducer`, `useEffect` → Client
- Uses browser APIs (`window`, `localStorage`, `navigator`) → Client
- Subscribes to Supabase Realtime → Client
- Fetches data from DB → Server
- Reads cookies or session → Server
- Has no interactivity — just displays data → Server

### Push `'use client'` as low as possible

```tsx
// ❌ Entire page is client because of one interactive button
"use client";
export default function LeadInbox() {
  const leads = useLeads(); // now needs useEffect + fetch instead of direct DB
  const [filter, setFilter] = useState("all");
  return (
    <div>
      <FilterBar filter={filter} onChange={setFilter} />{" "}
      {/* only this needs client */}
      <LeadList leads={leads} filter={filter} />
    </div>
  );
}

// ✅ Only the interactive part is client
// page.tsx — Server Component
export default async function LeadInbox() {
  const user = await getRequiredUser("contractor");
  const leads = await getLeads(user.id); // direct DB call

  return (
    <div>
      <LeadListWithFilter leads={leads} />{" "}
      {/* Client Component with filter state */}
    </div>
  );
}

// lead-list-with-filter.tsx
("use client");
export function LeadListWithFilter({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = leads.filter((l) => filter === "all" || l.status === filter);

  return (
    <div>
      <FilterBar filter={filter} onChange={setFilter} />
      {filtered.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
```

---

## 7. SERVER ACTIONS — THE CORRECT PATTERN

### File structure

All Server Actions go in `src/lib/actions/`. The `'use server'` at the top of the file makes every export in that file a Server Action — you don't add it per-function.

### The five rules — always in this order

```ts
// src/lib/actions/job.ts
"use server"; // file-level directive

import { z } from "zod";
import { db } from "@/lib/db";
import { getRequiredUser } from "@/lib/auth/session";
import { updateTag } from "next/cache";

const UpdateJobSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETE_PENDING"]),
  note: z.string().optional(),
});

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function updateJobStatus(
  jobId: string,
  formData: FormData
): Promise<ActionResult> {
  // Rule 1: Auth first, always
  const user = await getRequiredUser("contractor");

  // Rule 2: Validate input with Zod — never trust client data
  const parsed = UpdateJobSchema.safeParse({
    status: formData.get("status"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { success: false, error: "Invalid input" };

  // Rule 3: Authorization — does this user own this resource?
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return { success: false, error: "Job not found" };
  if (job.contractorId !== user.id)
    return { success: false, error: "Not authorized" };

  // Rule 4: Business logic validation — is this transition valid?
  if (
    parsed.data.status === "COMPLETE_PENDING" &&
    job.status !== "IN_PROGRESS"
  ) {
    return {
      success: false,
      error: "Job must be in progress to mark complete",
    };
  }

  // Rule 5: DB mutation
  await db
    .update(jobs)
    .set({ status: parsed.data.status, completedByContractorAt: new Date() })
    .where(eq(jobs.id, jobId));

  // Rule 6: Invalidate exactly the caches this mutation affects
  updateTag(`project-${jobId}`);
  updateTag(`contractor-projects-${user.id}`); // contractor pipeline view
  // (No homeowner portal — homeowners are unauthenticated; notify them via SMS/email instead.)

  return { success: true };
}
```

### Using actions in Client Components

```tsx
"use client";
import { useTransition } from "react";
import { updateJobStatus } from "@/lib/actions/job";
import { toast } from "sonner";

export function MarkCompleteButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateJobStatus(jobId, formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Job marked complete!");
    });
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="status" value="COMPLETE_PENDING" />
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Mark Complete"}
      </button>
    </form>
  );
}
```

### redirect() inside Server Actions — the try/catch trap

```ts
// ❌ BROKEN — redirect() throws internally, try/catch swallows it
export async function loginAction(formData: FormData) {
  "use server";
  try {
    await signIn(formData);
    redirect("/dashboard"); // this throw is caught below and silently swallowed
  } catch (error) {
    return { error: "Login failed" }; // redirect never happens
  }
}

// ✅ CORRECT — redirect() must be called OUTSIDE try/catch
export async function loginAction(formData: FormData) {
  "use server";
  let destination: string | null = null;

  try {
    await signIn(formData);
    destination = "/dashboard";
  } catch (error) {
    return { error: "Login failed" };
  }

  if (destination) redirect(destination); // outside try/catch — works correctly
}
```

---

## 8. DATA FETCHING PATTERNS

### Always parallel — never sequential

```tsx
// ❌ Sequential — total time = sum of all three
async function ContractorDashboard({ contractorId }: { contractorId: string }) {
  const leads = await getLeads(contractorId); // 120ms
  const jobs = await getJobs(contractorId); // 80ms — waits for leads
  const revenue = await getRevenue(contractorId); // 60ms — waits for jobs
  // Total: 260ms
}

// ✅ Parallel — total time = slowest one
async function ContractorDashboard({ contractorId }: { contractorId: string }) {
  const [leads, jobs, revenue] = await Promise.all([
    getLeads(contractorId), // all three
    getJobs(contractorId), // kick off
    getRevenue(contractorId), // simultaneously
  ]);
  // Total: 120ms
}
```

### Suspense streaming for independent sections

```tsx
export default async function Dashboard() {
  const user = await getRequiredUser("contractor");

  return (
    <div>
      {/* This renders immediately — no DB call */}
      <WelcomeHeader name={user.fullName} />

      {/* These stream in independently — don't block each other */}
      <Suspense fallback={<LeadsSkeleton />}>
        <LeadInbox contractorId={user.id} />
      </Suspense>

      <Suspense fallback={<JobsSkeleton />}>
        <ActiveJobs contractorId={user.id} />
      </Suspense>

      {/* Slow analytics — streams in last, doesn't block faster sections */}
      <Suspense fallback={<RevenueSkeleton />}>
        <RevenueChart contractorId={user.id} />
      </Suspense>
    </div>
  );
}
```

### When to use Route Handlers (API routes)

Only create `route.ts` files for:

- Stripe webhooks (external service POSTing to you)
- File downloads/signed URL generation
- SSE (Server-Sent Events) streams
- Any external service that can't call a Server Action

**Never create Route Handlers just to fetch data for your own pages.** Server Components query the DB directly.

---

## 9. ASYNC PARAMS AND SEARCHPARAMS — ALWAYS AWAIT

In Next.js 16, `params` and `searchParams` are always Promises. No exceptions. AI consistently forgets this.

```tsx
// ❌ Will throw in Next.js 16
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params; // TypeError: params is a Promise
}

// ✅ Server Component
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);
  return <JobView job={job} />;
}

// ✅ Client Component — use React.use()
("use client");
import { use } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // React.use() unwraps the Promise
  return <div>{id}</div>;
}

// ✅ searchParams — same pattern
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const results = await search(q, parseInt(page));
  return <Results results={results} />;
}
```

---

## 10. ASYNC COOKIES AND HEADERS

```ts
// ❌ Sync — removed in Next.js 16
import { cookies, headers } from "next/headers";
const token = cookies().get("token"); // TypeError
const ua = headers().get("user-agent"); // TypeError

// ✅ Always await
const cookieStore = await cookies();
const token = cookieStore.get("token");

const headersList = await headers();
const ua = headersList.get("user-agent");
```

---

## 11. ENVIRONMENT VARIABLES AT RUNTIME

If you need to read an env var at request time (not at build time), use `connection()` first:

```ts
import { connection } from "next/server";

export default async function Page() {
  // connection() tells Next.js this page is dynamic
  // Without this, process.env reads can be inlined at build time
  await connection();

  const featureFlag = process.env.ENABLE_FEATURE_X;
  return <div>{featureFlag}</div>;
}
```

---

## 12. REAL-TIME WITH SUPABASE

Always client-side. Never attempt Supabase Realtime in a Server Component.

```tsx
// Pattern: Server Component provides initial data, Client Component adds real-time

// Server Component (page.tsx or async component)
async function JobUpdatesFeed({ jobId }: { jobId: string }) {
  const initialUpdates = await db
    .select()
    .from(jobUpdates)
    .where(eq(jobUpdates.jobId, jobId))
    .orderBy(asc(jobUpdates.createdAt));

  // Pass initial data — avoids loading state on first render
  return <JobUpdatesLive jobId={jobId} initialUpdates={initialUpdates} />;
}

// Client Component adds Realtime on top
("use client");
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function JobUpdatesLive({
  jobId,
  initialUpdates,
}: {
  jobId: string;
  initialUpdates: JobUpdate[];
}) {
  const [updates, setUpdates] = useState(initialUpdates); // start with server data

  useEffect(() => {
    const supabase = createClient(); // create inside effect, not at component level

    const channel = supabase
      .channel(`job-updates-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_updates",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setUpdates((prev) => [...prev, payload.new as JobUpdate]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }; // always cleanup
  }, [jobId]); // jobId as dep — NOT supabase client

  return <UpdatesList updates={updates} />;
}
```

---

## 13. LOADING.TSX AND ERROR.TSX — WHEN TO USE EACH

```
loading.tsx — shows while the page's async Server Component is streaming in
error.tsx   — catches uncaught errors in the segment, shows fallback UI

Use loading.tsx when: the page itself is slow (not sub-components)
Use Suspense when:    individual sections within a page are slow
Use error.tsx:        at route segment level to catch DB errors, not-found, etc.
```

```tsx
// app/dashboard/jobs/loading.tsx
// Shows while jobs/page.tsx is fetching — Next.js shows this automatically
export default function JobsLoading() {
  return <JobsPageSkeleton />;
}

// app/dashboard/jobs/error.tsx
("use client"); // error.tsx MUST be a Client Component
export default function JobsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <p>Failed to load jobs: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## 14. PERFORMANCE CHECKLIST

Before shipping any page, verify:

**Rendering**

- [ ] Page is a Server Component unless it genuinely needs browser APIs
- [ ] `'use client'` boundary is at the leaf level — not wrapping the whole page
- [ ] Slow data sections are wrapped in `<Suspense>` with skeleton fallbacks
- [ ] Multiple DB calls use `Promise.all()` — no sequential awaits

**Caching**

- [ ] Cacheable functions have `"use cache"` + `cacheLife()` + `cacheTag()`
- [ ] No `cookies()` or `headers()` called inside a cached function
- [ ] User-specific cached data uses userId in the cache tag
- [ ] Job statuses, payment statuses, lead counts are NOT cached
- [ ] Server Actions call `updateTag()` for every tag they affect

**Auth**

- [ ] Route group layout calls `getRequiredUser()` with the right role
- [ ] Page files don't re-implement auth logic
- [ ] Server Actions start with `getRequiredUser()` as line 1
- [ ] Server Actions check resource ownership before mutating

**Activity Component (with cacheComponents: true)**

- [ ] Forms that must reset on navigation use `key={pathname}` or `useEffect` reset
- [ ] Dialog/modal state derived from URL params uses URL state, not local state
- [ ] Auth forms (login/signup) have unique field IDs to avoid DOM duplication
- [ ] Checkout/multi-step flows handle "stale success state" on return navigation

**Async APIs**

- [ ] `params` is typed as `Promise<{...}>` and awaited
- [ ] `searchParams` is typed as `Promise<{...}>` and awaited
- [ ] `cookies()` is awaited before accessing values
- [ ] `headers()` is awaited before accessing values

---

## 15. WHAT AI GETS WRONG — QUICK REFERENCE

These are the specific patterns AI models produce that are wrong in Next.js 16. Correct them immediately when you see them.

| AI writes this                                 | What's wrong                     | Use this instead                                    |
| ---------------------------------------------- | -------------------------------- | --------------------------------------------------- |
| `middleware.ts`                                | Deprecated in v16                | `proxy.ts` with `export function proxy()`           |
| `export default function middleware()`         | Wrong export name                | `export function proxy()`                           |
| `unstable_cache(fn, keys, opts)`               | Old pattern                      | `"use cache"` directive                             |
| `fetch(url, { cache: 'force-cache' })`         | Old caching model                | `"use cache"` directive                             |
| `export const revalidate = 60`                 | Route segment config for caching | `"use cache"` + `cacheLife()`                       |
| `export const dynamic = 'force-dynamic'`       | Old opt-out pattern              | Remove it — everything is dynamic by default in v16 |
| `experimental: { ppr: true }`                  | Removed in v16                   | `cacheComponents: true`                             |
| `params.id` (sync)                             | TypeError in v16                 | `const { id } = await params`                       |
| `cookies().get('token')` (sync)                | TypeError in v16                 | `const c = await cookies(); c.get('token')`         |
| `revalidateTag('tag')` (single arg in SA)      | Deprecated form                  | `updateTag('tag')` in Server Actions                |
| `router.refresh()` inside Server Action        | Can't use router on server       | `updateTag()` or `refresh()` from `next/cache`      |
| `try { redirect('/x') } catch {}`              | Redirect swallowed               | Move `redirect()` outside try/catch                 |
| Creating `api/data/route.ts` to fetch own data | Unnecessary round-trip           | Query DB directly in Server Component               |
