# Hommy — Launch Readiness & Roadmap

> Consolidated pre-launch audit, June 2026. Synthesized from four independent reviews — senior engineer (code/security/ledger), product designer (UX/flows), market researcher (competitors/pricing/regulatory), and founder/CPO strategist (model/GTM/vision). Items flagged by **2+ reviewers independently** are the highest-confidence and are marked ⭐.
>
> Status legend: 🔴 pre-launch (must fix) · 🟠 first 90 days · 🟢 vision bet. Effort: S / M / L. Type: Eng / Design / Ops / Legal / **Decision** (needs the founder's call, not just execution). Item status: ✅ done · ◐ partial · ⬜ to do.

## Progress log

**2026-06-26 — first no-decision batch shipped** (all applied to the **production** Supabase DB via `pnpm db:migrate`; migrations `0024`, `0025` committed):
- ✅ **RLS lockdown** — enabled Row Level Security on all 13 exposed app/reference tables (`0024_rls_lockdown.sql`). Verified flipped on; app reads fine via service-role bypass. Only PostGIS-owned `spatial_ref_sys` remains off (can't take ownership — handle via Supabase dashboard if desired).
- ✅ **Broadcast lead dedupe** — `createLead` reuses a fresh open lead (same homeowner + service + address within 6h) instead of re-fanning out (`src/lib/actions/leads.ts`).
- ✅ **`acceptEstimate` fan-out → Inngest** — moved the unbounded loser in-chat notice off the homeowner's accept click into the `quote-accepted` job (`accept-estimate.ts`, `quote-accepted.ts`).
- ✅ **Guest-signup rate limit** — new `guest_signup_attempts` table (RLS-enabled, `0025`) + per-IP throttle (10/hr, fail-open) in `createGuestHomeowner`.

**2026-06-26 — trust accuracy pass (#2)** (copy/links only, no DB):
- ✅ Removed **"background-checked"** everywhere (hero, `layout.tsx` + roofing SEO meta, OG image → "Verified pros", state/city page intros, `structured-data.tsx`, and the `hero-trust` badge → "Verified"). Verified contractor = uploads license + insurance, admin approves; we don't run background checks.
- ✅ Reframed the **fabricated speed stats** ("within the hour" / "24h") to the truthful "roofers notified the moment you post" (`trust-strip.tsx`, `faq.tsx`).
- ✅ Softened the licensed/insured wording to honest "provides … we review … kept on file" (`trust-strip.tsx`, `faq.tsx`). Kept **"licensed and insured"** since you require + admin-review both docs (matches the FAQ). *If you want it even more conservative, say so and I'll switch to "license on file."*
- ✅ Fixed dead **Terms / Privacy** links → `/terms`, `/privacy` (`contractor-signup-form.tsx`).
- ✅ Fixed **"Get verified"** button → `/contractor/settings/verification` (`contractor/jobs/page.tsx`).

**2026-06-26 — pricing fix (#3)** — decisions: engage stays **1 credit**; win fee **2.5%, min 30, max 290**:
- ✅ Set win fee floor 30 / cap 290 (`pricing.ts`); updated unit test (10/10 pass) + lifecycle/doc comments. Engage already = 1 in seed/config.
- ✅ Fixed the false "low credit" warning (`contractor/page.tsx`) — no longer claims "not enough to engage" (engage is just 1 credit).
- ✅ Quote builder now shows **"Win fee if accepted ~N credits"** + "only charged if accepted," so the win fee is never a surprise (`quote-builder-dialog.tsx`).
- ✅ Synced docs (`HOMMY_PLATFORM.md` §3.3: engage 1, floor 30, cap 290). The admin settings page already reads these live.
- ↪ Still open: a win can push a contractor negative while there are no live payments — that's the separate #5 ("don't block winners").

**2026-06-26 — #4 (photo) + #5 decision:**
- ✅ Photo on post-a-job: kept **optional** but strengthened the nudge ("optional, but recommended" + an inline tip "Even one photo helps roofers give you a faster, more accurate quote") — `what-step.tsx`. Decision: encourage, don't require (protects launch conversion). Phone OTP still pending (needs SMS/#7).
- ↪ #5 "don't block winners": decided to rely on early payments (see #5 row) — no code.
- ↪ #9 app-wide sizing: deferred to post-launch (Option 4) — usable now; proper rebuild is its own job (moved to 🟠).
- ↪ #7 SMS / A2P 10DLC + phone OTP (#4's last piece): deferred to post-launch by decision. Start the 10DLC registration before relying on SMS (~2-week lead time).

**✅ Pre-launch coding is complete.** Every 🔴 item is either shipped (#1, #2, #3, #4, #6, #8) or consciously deferred (#5 → early payments, #7 → post-launch, #9 → post-launch; #6 session-model parked). Remaining pre-launch work is non-code/ops (pricing was decided; pilot metro, payments setup when the first jobs complete, and the eventual 10DLC paperwork).

> **Deploy note:** the production DB already has the above (this repo's `DATABASE_URL` is production). Keep running `pnpm db:migrate` against prod on each deploy — the migration journal skips already-applied migrations and runs only new ones.

## Verdict

The **build is genuinely strong** — better than most pre-launch products. The money core is correct and tested (append-only integer ledger, row-locking, FIFO expiry), there is **no IDOR**, caching is clean, and the architecture is **truly multi-vertical- and AI-ready** (service-neutral `service_id` + `service_details` schema; the credit ledger already reserves `ai_agent`/`marketing` spend kinds; the messaging graph supports an AI participant with no schema change). What is **not** ready is the **edges and the go-to-market**: a real security hole (RLS), trust claims that aren't true yet, an app-wide responsive bug, and the model's two structural weaknesses — **leakage** and **two-sided cold-start**. Fix the 🔴 list and Hommy can launch a **controlled single-metro pilot**.

---

## Cross-cutting themes (multiple reviewers converged — treat as highest priority)

1. **⭐ Engage-vs-win pricing is unresolved and inconsistent** (all four). Docs say engage = 5 credits; code ships 1 (`src/lib/leads/pricing.ts:42`). The low-credit warning lies because of it; the win fee (40–250 credits) is never shown to a contractor before they commit; the market says target ~$10–30 engage with all-in cost-per-won-job kept **under** Angi's $400–900. One decision + a few code fixes.
2. **⭐ Trust accuracy** (UX + Business + Competitor). "Background-checked" is false, trust stats are fabricated, legal links are dead. The FTC's $7.2M HomeAdvisor settlement is the cautionary tale for exactly this.
3. **⭐ Lead quality + leakage** (Business + Dev + Competitor). No dedupe on broadcast leads, no homeowner phone verification, and the win-fee-only-on-accept model leaks unless on-platform hiring is the homeowner's easy path.
4. **⭐ Cold-start: seed one (storm-prone) metro first** (Business + Competitor). Contractors first; the direct-request flow works at even one contractor.
5. **⭐ Payments + TCPA/A2P 10DLC** (Business + Competitor + UX). No live payments, and SMS compliance is a hard, lead-time dependency.

---

## 🔴 PRE-LAUNCH (must fix) — ranked

| # | Status | Item | Why it matters | Type · Effort |
|---|---|---|---|---|
| 1 | ✅ | **Enable RLS on post-0001 tables** — done in `0024_rls_lockdown.sql` (13 tables; only `spatial_ref_sys` left, PostGIS-owned). Applied to prod. | Was world-readable/writable via Supabase's public API. Biggest single risk. | Eng · M |
| 2 | ✅ | **⭐ Make trust claims true** — done: removed "background-checked" sitewide; reframed fabricated speed stats; softened licensed/insured copy (kept "licensed and insured", admin-reviewed docs); fixed dead Terms/Privacy links and the "Get verified" misroute. See 2026-06-26 progress log. | False claims + FTC/liability against a trust-first brand. | Design/Ops · S |
| 3 | ✅ | **⭐ Resolve engage/win pricing + fix the lies it causes** — done: engage = 1 credit; win fee 2.5% / min 30 / max 290; fixed the false low-credit warning; quote builder shows the win fee before sending; docs synced. See 2026-06-26 progress log. | Core unit economics; a pro was being silently debited and blocked. | Eng · S/M |
| 4 | ✅ | **⭐ Lead-quality gate + broadcast dedupe** — ✅ dedupe shipped; ✅ photo strongly encouraged on post (kept optional, added a nudge — `what-step.tsx`). ↪ homeowner phone OTP deferred to post-launch (rides on SMS/#7). | #1 contractor-churn risk; spam fan-out to up to 25 inboxes. | Eng · M |
| 5 | ↪ | **Don't block winners** — DECIDED (2026-06-26): no cushion code. Real payments (Stripe / Lemon Squeezy) go in as soon as ~2–3 jobs complete, before anyone realistically hits the negative-balance block; the first few are topped up by hand. Keep the existing "you owe X, top up" notice. Resolved by the payments item in 🟠 (do it early). | A winning contractor shouldn't be frozen — but early payments prevent it without throwaway code. | Decision · resolved |
| 6 | ◐ | **Guest-account hardening** — ✅ per-IP rate limit shipped (`guest_signup_attempts` + `createGuestHomeowner`); ⬜ session-model change (don't mint a live session for an unowned email) parked as a product decision. | Account squatting / pre-takeover / spam. | Eng · M |
| 7 | ↪ | **TCPA + A2P 10DLC registration, consent capture, STOP handling.** DECIDED (2026-06-26): defer to post-launch. Privacy policy must state SMS opt-in data is NOT sold to lead-gens (or 10DLC is rejected). Registration has a ~2-week lead time — start it before you rely on SMS. | Carrier-filtering + $500–1,500/text exposure. | Post-launch (Legal/Eng) |
| 8 | ✅ | **Move `acceptEstimate` loser-notify fan-out to Inngest** — done (`accept-estimate.ts` → `quote-accepted` job). | Unbounded synchronous work on the homeowner's accept click; latency on hot leads. | Eng · S |
| 9 | ↪ | **App-wide `vw` undersizing** — DECIDED (2026-06-26): defer to post-launch (Option 4). Usable today; the proper fix (clamp text/spacing/icons, keep layout fluid) is a big focused job — see 🟠. (The "Get verified" misroute from this row was already fixed in the #2 trust pass.) | Looks small on 1024–1440 laptops, but not broken. | Post-launch |

**Shipped (no decision needed):** 1, 4-dedupe, 6-rate-limit, 8. · **Next no-decision work:** rest of 4 (phone OTP + photo). · **Need a quick decision from you:** 2 (background-check vs soften copy), 3 (pricing), 5 (launch with manual payments?), 7 (who owns SMS/10DLC), 9 (which `vw` fix approach), guest-session model, and **which pilot metro**.

---

## 🟠 FIRST 90 DAYS

- **Real payments via a Merchant-of-Record** (Paddle / Lemon Squeezy — avoids Stripe-entity friction for a Pakistan→US seller). UI + `purchase_intent` already anticipate it. **Do this early — it's also the fix for #5** (a winning contractor going negative): planned to go in as soon as the first ~2–3 jobs complete, so the negative-balance block never bites in practice.
- **App-wide sizing rebuild (#9, deferred from pre-launch).** Proper fix: clamp text/spacing/icons so they never get too small (laptops) or too large (big monitors), while layout widths stay fluid. The whole UI is built on raw `vw` tuned to 1440px, so this is a careful codemod + a full visual pass — its own focused job. Quick interim option if needed: floor just text + icon sizes.
- **Rebalance engage vs win fee with live data; publish an open `/pricing` page** (pricing opacity is a top-7 competitor complaint).
- **Automated "request a Google review on job completion"** — reviews drive ~45–53% of local-SEO visibility; cheap, and review message-cards already exist. Biggest SEO lever.
- **Leakage telemetry + hire-time trust wrapper** — quote PDF, license-on-file, "Hommy-tracked job," and a "who did you hire / were they on Hommy?" prompt on job close. Make `off_platform_flag` trivially reachable.
- **Estimating with realistic roofing numbers** — manual sq input + good/better/best now; measurement integration later.
- **Reliability** — transactional outbox / retry for Inngest sends (currently swallowed in `engage.ts:210`, `leads.ts:236`, `accept-estimate.ts:275`); unique index on `reviews.projectId`; concurrent engage/accept race tests; composite indexes (`projects(contractorId,stage)`, `lead_recipients(leadId,status)`, `estimates(projectId,createdAt DESC)`); image optimization (Cloudinary/`next/image`, ~18 raw `<img>`).
- **Storm-event GTM readiness** — the `storm_events` module is roofing's unfair-advantage demand engine; be ready to spike ads + alerts when a hailstorm hits.
- **Contractor activation funnel** instrumentation — signup → verified → engage → quote → won (PostHog events exist, grouped by company; complete the chain).
- **Smaller UX** — wire the built-but-unused wizard stepper (`get-a-quote/wizard-parts.tsx`); km → miles in onboarding; spam-call reassurance on the contact step; manual dispute process (admin `disputes` is a stub); deep-link stub redirects to the specific job; tokenize `status-banner.tsx`; remove demo scaffolding in `theme-toggle.tsx`.

---

## 🟢 VISION BETS

- **Mobile apps (iOS + Android)** — table-stakes per the market; field reps live on phones.
- **AI agents** — draft-quote assistant in the quote builder; an AI first-responder that engages leads within seconds (reinforces speed-to-lead without a punitive SLA); growth/ops agents. The ledger (`ai_agent` sink) + messaging graph already support this with no rewrite. **Start capturing training data now** (quote totals, cycle times, win/loss, per-metro pricing) — it can't be backfilled.
- **Social-media content management** — auto before/after posts from the portfolio media already captured.
- **Multi-vertical expansion** — abstract roofing nouns in the UI; consolidate inline `slug='roofing'` lookups onto the cached `roofingServiceId()` helper. This is also the **homeowner-LTV fix** (a roof is once-in-20-years; cleaning/gutters make homeowners return).
- **All-in-one collapse** — incumbents force Angi + JobNimbus/AccuLynx + EagleView/Hover + CompanyCam + NiceJob = $1,000–2,000+/mo. Bundle the workflow tools free, monetize demand.
- **Fast-follow capabilities** — aerial/AI instant estimate; consumer financing (Wisetack/Acorn) to raise close rates on five-figure roofs; scheduling/dispatch; supplier material ordering.
- **Foundational hardening** — defense-in-depth tenant isolation (RLS-aware read connection or a structural lint/test guard); transactional outbox for all cross-system comms; cron checkpointing for `lead-sla-cascade` + `credits-expire`.
- **Moat** = per-metro liquidity + the reputation/outcome-data graph (project-gated reviews competitors can't fake) + CRM switching costs (contacts/projects/conversations = the contractor's book of business).

---

## Metrics to instrument now (you can't backfill outcome data)

**North star:** on-platform **jobs won per metro per week** (captures liquidity + monetization in one number).

**Guardrails:**
- **Leakage gap** — realized vs theoretical win-fee revenue; engage→accept conversion; engaged-then-silent lead count; homeowner "hired off-platform" reports. *(The single metric that says whether the model works.)*
- **Liquidity** — leads/metro/week, engages per lead, quotes per lead, % leads with ≥3 quotes, **time-to-first-engage**.
- **Lead quality** — % with verified phone, % getting ≥1 engage, spam reports.
- **Contractor funnel** — signup→verified→first-engage activation; engage→quote→won; % blocked on negative balance; weekly active *engaging* contractors.
- **Monetization** — revenue per won job, purchase-intent→settled rate, ARPU.
- **Homeowner** — post→first-quote time, post→hire rate, review-submission rate.

---

## The one decision that unblocks the most

**Engage vs win-fee pricing** (and: keep the 250-credit cap?). Market math: keep all-in **cost-per-won-job clearly under Angi's $400–900** while staying "pay when you win" — roughly **~$10–30 engage + a low-single-digit % or capped win fee**. A flat 15% (AllBetter-style ≈ $1,400 on a $9,500 roof) would be *worse* than Angi per won job — avoid. Validate the win fee against roofing margins (~25–35%) before committing.

---

## Top risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Leakage** (engage cheap, close off-platform, dodge win fee; enforcement only bites honest pros) | 🔴 existential | Homeowner-side trust wrapper at hire-time; keep a low win-fee cap; "who did you hire" close flow; off-platform flag; detect engage-then-silent leads and ask the homeowner |
| **Cold-start (demand side)** | 🔴 | One metro; seed supply then manufacture demand via ads/storms; use the directory direct-request flow (works at 1 contractor); don't wait on SEO |
| **RLS off on public tables** | 🔴 | Enable RLS + scoped policies or revoke anon/authenticated grants; verify against the Supabase linter |
| **Junk leads churn contractors** | 🔴 | Phone OTP + required photo + dedupe before launch |
| **No live payments + auto negative-balance block** | 🟠 | Concierge billing with fast SLA; don't block winners; ship MoR payments as fast-follow |
| **Dispute resolution is a stub** | 🟠 | Acceptable at low volume if handled by hand; have a manual process |
| **TCPA / A2P 10DLC / CAN-SPAM** | 🟠 legal | Register 10DLC now; logged consent; STOP handling; unsubscribe + physical address on email |
| **Licensing-claim liability** | 🟠 legal | Actually verify or soften to "license on file"; keep reviews project-gated and un-incentivized |

---

## Notable strengths (don't break these)

- Credit ledger is correct and well-tested (integer credits, `FOR UPDATE` locking, append-only with cached projection, idempotent FIFO expiry; real Postgres integration tests).
- Concurrency is genuinely handled (engage + accept lock the lead/recipient/estimate with consistent order + status re-checks).
- No IDOR; clean `"use cache"` usage (no cross-tenant leak); auth hardening (no role self-assignment, Twilio webhook signature validation, safe callbacks, Realtime private-channel RLS).
- Multi-vertical neutrality is actually honored; ledger + messaging graph are AI-agent-ready.
- Best-in-class contractor value communication; excellent design-token/dark-mode layer; strong loading/empty/verification states; consistent discriminated-result error handling.
- Mature delivery hygiene (`strict: true`, near-zero `as any`/TODOs, CI with typecheck + real-Postgres integration + Playwright).

---

## Open questions to confirm with the team

1. Does verification actually inspect license/insurance docs, or just flip a status? (Decides the "licensed" claim.)
2. Deliberate intent behind engage = 1 credit vs the documented 5?
3. Are Supabase default anon/authenticated grants in place on the public schema? (Confirms severity of the RLS finding — treat as live until verified.)
4. Which metro for the pilot, and is launching without live payments (manual settlement) acceptable for it?

> Deep messaging-UX (in-chat quote/event/review cards, support-in-chat) and the homeowner dashboard were reviewed via code paths, not exhaustively — worth a dedicated follow-up pass.
