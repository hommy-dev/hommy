# Build Plan — Engage → Chat → Quote → Accept → Work → Review

> The next module after lead fan-out. Source of truth for WHAT: `docs/HOMMY_PLATFORM.md` §4, §10.
> Patterns: `CODING_GUIDE.md` (Next.js 16). This file is the HOW and the task order.
> Status legend: ⬜ not started · 🟦 in progress · ✅ done.

> ## ⚠️ SUPERSEDED in parts (2026-06 — read this first)
> This file is the **historical build log** for the module; the loop shipped, but the **lead-economy stance changed afterward** (see `HOMMY_PLATFORM.md` header + §4). Where this log conflicts, the platform doc wins. What changed:
> - **No engage cap / no lock.** Broad fan-out, any offered pro may engage until hire/close. Ignore all `engageSlots` / `status='filled'` / "last-slot race" / D3 / D4 steps below.
> - **No lead expiry / no SLA cascade.** The `lead.recipient.sla` cron no longer expires offers or cascades — it now only sends a gentle **quote reminder** and auto-closes **abandoned** posts (30d, zero engagement). `slow_response` is no longer emitted.
> - **Viewing is telemetry only** — `markLeadViewed` no longer tightens any deadline; it's wired into `getJobDetailAction` (opening an offered lead's detail).
> - **Scoring rebalanced (carrots):** decline-with-reason = 0 (neutral), decline-no-reason = −3, fast/engage = +5/+3. No expiry penalties.
> - **Quotes & reviews are INLINE in chat** via `messages.meta` cards (`quote` / `event` / `review`), personalized & sided — not plain `system` body (D5 superseded). There is **no `/homeowner/quotes` page** (T4.4 removed); the contractor board is the unified `/contractor/jobs`.
> - **Homeowner gets notified** on quote sent / accepted / job completed; completion posts an inline review card.
> - Current messaging components: `conversation-rail`, `thread-view`, `messages-shell`, `message-bubble` (renders cards), `quote-card`, `review-card`, `job-control-panel` — not the older names listed in Phase 2.

---

## 0. Conventions (apply to every task)

### Design system (Hommy look)

Tokens live in `src/app/globals.css`. **Use tokens, never raw hex.**

- **No shadows.** Separate surfaces with `border border-border` on `bg-card` / `bg-canvas`. Do not use `shadow-*` utilities (the vars exist for legacy only). Elevation = border + background contrast, not blur.
- **Less rounded.** Default to `rounded-md` (≈6px) / `rounded-lg` (8px, the `--radius`). Reserve `rounded-full` for avatars, dots, and icon-only chips — never for cards, inputs, or buttons.
- **Calm palette.** Brand `primary` (`#1f00ce`) for primary actions only; `secondary` lime sparingly as accent. Status uses the semantic pairs (`success`/`warning`/`info`/`destructive` + their `-bg`). One primary action per view.
- **Layout & space.** Generous whitespace, clear hierarchy, no clutter. Follow the existing responsive scale: base utilities + `lg:` vw equivalents at the 1440 design width (e.g. `gap-3 lg:gap-[0.833vw]`, `h-8 lg:h-[2.222vw]`), as in `page-skeleton.tsx`.
- **Alive, not flashy.** Optimistic UI on send/engage/accept; `useTransition` pending states; subtle transitions (`transition-colors`, 150–200ms); skeletons while streaming; toast on action result. Micro-interactions over page reloads. Respect `prefers-reduced-motion`.
- **Empty/loading/error states** for every new surface — never a blank panel.

### Clean code

- **Small files.** Target < ~200 lines per file. Split a server component into: page (data + composition) → presentational sub-components → leaf client component for interactivity. Push `'use client'` to the leaf (`CODING_GUIDE.md` §6).
- **Layering:** Server Actions → `src/lib/actions/*`. Read queries → `src/lib/data/*`. Pure domain logic (pricing, slot math, score deltas) → `src/lib/<domain>/*`. Inngest jobs → `src/lib/inngest/functions/*`. UI → `src/components/<area>/*`. Never inline actions in components.
- One responsibility per module; shared types in a sibling `types.ts` when reused.

### Next.js 16 (from CODING_GUIDE.md)

- Everything dynamic by default; add `"use cache"` only to user-agnostic reads. **Never cache** lead/credit/quote/project status — these change constantly.
- Server Action order: auth (`getRequiredUser`) → Zod validate → authorize (ownership/membership) → business-rule check → DB mutation (transaction) → `updateTag()` for affected tags → typed result.
- `redirect()` outside try/catch. `params`/`searchParams` are Promises — await them. Realtime is client-only on top of server-provided initial data.
- Money = decimal strings, `parseFloat` for display only. Credits = integers.

---

## Phase 0 — Foundations (unblocks everything) — ✅ DONE

### T0.1 ✅ Credit ledger helper — `src/lib/credits/ledger.ts`

Append-only spend/grant against `credit_transactions` with cached `contractors.credit_balance`.

- `spendCredits(tx, { contractorId, kind, amount, sourceType, sourceId, createdBy })` — FIFO by `expires_at` (plan grants before never-expire purchases), writes negative txn + `balance_after`, updates cached balance. Must run **inside a passed Drizzle transaction** and row-lock the contractor.
- `grantCredits(tx, {...})` — positive entry (signup_bonus/purchase/plan_grant/promo/refund).
- `getBalance(contractorId)` — reads cached projection.
- **Decision gate (D2):** behavior when balance < amount → throw `InsufficientCreditsError`; callers decide UX.
- Acceptance: unit-level reasoning holds (balance_after chains correctly); no mutation outside a transaction.

### T0.2 ✅ Score events helper — `src/lib/reputation/score.ts`

`recordScoreEvent(tx, { contractorId, kind, delta, sourceType, sourceId, note })` → append `score_events`, update cached `contractors.profile_score`. Delta table in `src/lib/config/tunables.ts`.

### T0.3 ✅ Tunables config — `src/lib/config/tunables.ts`

SLA windows (24h post-view / 48h no-view), score deltas, review-request delay (72h). One place, no magic numbers.

> Note: the inherited `chat.ts` expects `LEAD_TUNABLES` and `tests/helpers/time.ts` expects `TIME_CONSTANTS` from this module — both are painters leftovers (Phase 2 cleanup), intentionally not re-added here.

### T0.4 ✅ Register Inngest functions — `src/lib/inngest/functions/index.ts`

`leadEngaged` registered. Add each remaining job to the `functions` array as built.

---

## Phase 1 — Engage (the critical path) — 🟦 mostly done

### T1.1 ✅ Engage action — `src/lib/actions/engage.ts`

`engageLead(leadId)` in one transaction:

1. `getRequiredUser('contractor')` → resolve active membership → `contractorId`.
2. Row-lock the lead; verify `status='open'` and `engagedCount < engageSlots` (**race-safe**, D3).
3. Verify this contractor has an `offered`/`viewed` recipient row (was matched).
4. `spendCredits` `lead_engagement` (`engagementCreditCost`). If insufficient → typed `INSUFFICIENT_CREDITS` result (D2).
5. `lead_recipients` → `engaged`, `engaged_at=now()`.
6. Upsert `contacts` (unique contractor+homeowner); create `projects` (stage `new_lead`, `lead_id`, `service_id`); create `conversations` (`type='lead'`, context=project) + two `conversation_participants` (homeowner `user` + contractor `contractor`).
7. If engaged count == `engageSlots` → lead `status='filled'` (D4: also expire remaining `offered`/`viewed`? default = leave them, gate engage).
8. `recordScoreEvent` `fast_engagement`. Emit `lead/engaged`.
9. `updateTag` leads + homeowner-requests + the contractor's projects/credits tags.

### T1.2 ✅ `lead/engaged` Inngest job — `src/lib/inngest/functions/lead-engaged.ts`

Notifies the homeowner ("a contractor is interested") + wakes their inbox. Comms only; charge/project/conversation done inline in T1.1.

### T1.3 ✅ Wire the real Engage button — `src/components/dashboard/leads/leads-table.tsx`

Replaced the toast stub. `engageLead` via `useTransition`, success toast + `router.refresh()`, `INSUFFICIENT_CREDITS` → warning toast with a "Buy credits" action → billing. Works for single-row and bulk-select engage.

### T1.4 🟦 Contractor lead-detail + view tracking — `src/app/(dashboard)/contractor/leads/[leadId]/page.tsx`

`markLeadViewed(leadId)` action is **built** (sets `viewed` + tightens SLA to `viewed_at + 24h`). The lead-detail PAGE that calls it on open is **not built yet** — deferred: view-tracking only matters once the SLA cascade (Phase 6) is live. Engage currently works from the table.

---

## Phase 2 — Messaging (rewrite for v2) — 🟦 core done

> Built fresh against `conversations` / `conversation_participants` / `messages` in `src/components/messaging/*` (the orphaned painters `components/chat/*` is left untouched as reference). Dropped leakage scan + cold-open. Realtime needed NO migration — `0001`'s `my_conversation()` already authorizes the `chat:{id}` channel for both user participants and contractor-company members.

### T2.1 ✅ Conversation data layer — `src/lib/data/conversations.ts`

`getUserContractorIds`, `resolveParticipant` (viewer → one participant identity), `listConversationsForUser` (other-party display + unread via `last_read_at`), `getConversationForUser`, `listMessages` (cursor paging, computes `isMine`), `getConversationRecipientUserIds`, `countUnreadConversations`. Live (no `"use cache"`).

### T2.2 ✅ Message actions — `src/lib/actions/messages.ts`

`sendMessage` (auth → participant gate → insert → `chat:{id}` broadcast + role-aware notify/refresh of other participants), `markConversationRead`, `loadOlderMessages`. Text-only (D5).

### T2.3 ✅ Chat UI — `src/components/messaging/*`

`use-conversation-stream` (chat:{id} sub), `participant-avatar`, `conversation-list`, `message-bubble`, `message-composer`, `message-thread` (optimistic send + debounced mark-read + recomputes `isMine` on incoming), `conversation-thread-view`. Bordered surfaces, no shadow, `rounded-lg` bubbles, vw scale.

### T2.4 ✅ Real messages pages

Replaced `ComingSoon`: `/contractor/messages` + `/[conversationId]`, `/homeowner/messages` + `/[conversationId]`.

### T2.5 ✅ Cleanup — retire the painters chat (build now green)

Rewired `dashboard-shell.tsx`: dropped the `chat-store` dependency; the messages-nav badge now comes from SSR `navUnreadCounts` fed by `countUnreadConversations` in each role layout (the layout re-renders on the `message:new` user-event, so the badge stays live). Then deleted the whole dead painters cluster: `actions/{chat,chat-sync,presence}.ts`, `data/chat.ts`, `lib/chat/*`, `lib/presence/*`, `cloudinary/chat-upload.ts`, `components/chat/*`, `components/presence/*`, plus two orphaned painters test helpers (`tests/helpers/{system-messages,time}.ts`). Also removed a stray `shadow-xs` on the active nav item (design rule: no shadows).

> **`tsc --noEmit` now passes clean across the whole project; unit tests green.** The repo builds without the inherited chat errors.

---

## Phase 3 — Quote (estimate builder) — ✅ done

> Needed a home for the builder, so this phase also brought a real contractor **projects list + detail** (front-running Phase 5's project surface). Stage *transitions* (T5.1) remain Phase 5.

### T3.1 ✅ Estimate actions — `src/lib/actions/estimates.ts`

`saveEstimateDraft` + `sendEstimate` (upsert draft → `sent`, `sent_at`, `accept_token` via `randomBytes`, project → `estimate_sent`, post `Quote sent — $X` system note, emit `quote/submitted`). Server **always recomputes** totals from line items (`src/lib/estimates/compute.ts`, integer-cents). Ownership-gated; typed errors. System-note helper: `src/lib/messaging/system.ts` (`postSystemMessage` / `getProjectConversationId`).

### T3.2 ✅ `quote/submitted` job — `src/lib/inngest/functions/quote-submitted.ts`

Notifies homeowner (bell/push/email, dedup) + `quote:new` realtime → live badge on `/homeowner/quotes` (Phase 4 page).

### T3.3 ✅ Quote builder UI — `src/components/dashboard/{estimates,projects}/*`

`quote-builder-dialog` (line-item editor add/remove, tax %, valid-days, live subtotal/tax/total, Save draft / Send), `estimate-list`, `projects-list`, `stage-badge`. Data: `src/lib/data/projects.ts`. Pages: `/contractor/projects` (list, replaced stub) + `/contractor/projects/[projectId]` (workspace: job + contact + quotes + Message link + builder). `tsc` + lint clean.

---

## Phase 4 — Accept = Win — ✅ done

### T4.1 ✅ Accept action — `src/lib/actions/accept-estimate.ts`

`acceptEstimate(estimateId)` (auth homeowner, ownership-gated) + `acceptEstimateByToken(token)` (public) → one `performAccept` core, one transaction (lead + estimate row-locked):

- `spendCredits` winner `lead_won` (`awardCreditCost`) with **`allowNegative`** — the full charge on the homeowner's action always succeeds (D2; affordability reserved at engage). Added `allowNegative` to `ledger.spendCredits`.
- estimate → `accepted` (+ `acceptedSnapshot`/ip/ua); lead → `awarded` (+ `awarded_to`/`awarded_at`); winner recipient → `won`, winner project → `in_progress`.
- Other engaged recipients → `lost`, their projects → `lost`; winner-vs-loser system notes posted to each conversation.
- `recordScoreEvent` `quote_accepted`. Emit `quote/accepted`. Revalidate affected pages.

### T4.2 ✅ Tokenized accept route — `src/app/accept/[token]/page.tsx`

Public (added `/accept` to proxy `PUBLIC_PATHS`). `getAcceptView(token)` renders the quote summary + states (sent → accept · accepted → done · awarded/other → closed). Client `AcceptByTokenButton` calls `acceptEstimateByToken`; refresh-into-accepted (Activity-safe). Standalone card on root layout (toaster is global).

### T4.3 ✅ `quote/accepted` job — `src/lib/inngest/functions/quote-accepted.ts`

Notifies the winning company's members ("You won the job! 🎉" + SMS) and the losers ("hired another contractor"); `quote:accepted` / `lead:updated` realtime. Registered.

### T4.4 ✅ Homeowner quotes page — `src/app/(dashboard)/homeowner/quotes/page.tsx`

Replaced stub: `getHomeownerQuotes` groups quotes per request; `quote-group` compares them side by side with `accept-quote-dialog` (confirm → `acceptEstimate`). Awarded requests show Hired / Not selected. `tsc` + lint + unit tests clean.

---

## Phase 5 — Work → Done → Review — ✅ done

### T5.1 ✅ Project stage transitions — `src/lib/actions/projects.ts`

`advanceProjectStage(projectId, toStage)` — forward-only guarded moves (`new_lead→contacted`, `contacted→estimate_sent`, `in_progress→completed`), ownership-gated, writes `activity_log`. On `completed` → emits `review/request.scheduled`. UI: `project-stage-actions.tsx` (contextual button) wired into the project detail header.

### T5.2 ✅ Projects page — built in Phase 3

`/contractor/projects` (list) + `/[projectId]` (workspace) already shipped. This phase added stage-management actions on the detail page. (A by-stage Kanban view is an optional future polish; the list + stage badges cover the pipeline.)

### T5.3 ✅ Review request job — `src/lib/inngest/functions/review-request.ts`

`step.sleep(REVIEW_REQUEST_DELAY_HOURS)` then — if still `completed` and no existing review — creates a pending `reviews` row with a `randomBytes` token and sends the homeowner a tokenized link (deduped). Registered.

### T5.4 ✅ Review submit — `src/lib/actions/reviews.ts` + `src/app/review/[token]/page.tsx`

`submitReview({token, rating, comment})` (public, token-authorized, double-submit-guarded): fills the review, **recomputes** `contractors.avg_rating`/`total_reviews`, records `review_received` (`reviewScoreDelta(rating)`), emits `review/submitted` (→ `review-submitted.ts` notifies the company). Page: `getReviewByToken` + `review-form` (interactive star picker) with invalid/already-submitted states.

### T5.5 ✅ Contractor reviews page — `src/app/(dashboard)/contractor/reviews/page.tsx`

Replaced stub: `getContractorReviews` → `reviews-summary` (avg + per-star distribution) + `review-list`. Shared `components/reviews/stars.tsx`. `tsc` + lint + tests clean.

---

## Phase 6 — SLA cascade & decline (automation) — ✅ done

> Shared step: `src/lib/leads/cascade.ts` `offerToNextContractor` — offers the lead to the next eligible company not yet offered (extended `findEligibleContractors` with `excludeContractorIds`/`limit`), with a fresh 48h SLA. No-op once the lead isn't `open`.

### T6.1 ✅ Decline action — `src/lib/actions/decline-lead.ts` (`declineLead`)

Recipient (`offered`/`viewed`) → `declined` + `decline_reason`; `recordScoreEvent` (`lead_ignored_with_reason` with a reason, `_no_reason` without); `offerToNextContractor` → re-emit `lead/created` to notify the new company (others deduped). UI: `decline-lead-dialog` (optional reason) wired beside Engage in the leads table.

### T6.2 ✅ Cascade cron — `src/lib/inngest/functions/lead-sla-cascade.ts`

Cron `*/15 * * * *`: finds `offered`/`viewed` recipients past `sla_deadline` on still-open leads → expires each (status-guarded), decays score (`slow_response` if viewed, else `lead_ignored_no_reason`) → `offerToNextContractor` → notifies the new company. Registered. This is what makes `markLeadViewed` (Phase 1) and the 24h/48h windows live.

---

## ✅ Module complete

All six phases shipped. The full lifecycle is live end-to-end: **post → free fan-out → engage (charge + project + chat) → message → quote → accept = win (full charge, award, others lost) → work → complete → review → reputation**, plus the SLA cascade + decline automation that keeps offers flowing. `tsc` + lint + unit tests green throughout; the inherited painters chat was retired (T2.5). Remaining platform work is outside this module: billing/credit purchase (Stripe), the `credits.expire` cron, and the roofing-only storm module.

---

## Decisions (locked 2026-06-12)

- **D2 — Award affordability: LOCKED → reserve at engage.** Engage is blocked unless the company can afford `engagementCreditCost + awardCreditCost`. The small fee is spent now; the award cost is only _checked_ (not spent) at engage, so the homeowner's later accept can always charge the full award. Re-checked at accept as a safety net.
- **D3 — Last-slot race:** row-lock lead (`SELECT … FOR UPDATE`) + conditional engaged-count check inside the engage transaction.
- **D4 — On lock:** silently gate (remaining `offered`/`viewed` rows stay; engage is blocked once `status='filled'`). No expiry/notify in MVP.
- **D5 — Chat MVP scope: LOCKED → text only + system notes as plain `body`.** No `message_attachments` table, no leakage scan, no cold-open. System events (quote sent/accepted) are `messages` rows with `sender_type='system'` and a human-readable `body`.
- **D6 — Who acts for a company:** any active member acts as the company; enforce membership in actions.
- **D8 — Cascade runtime:** Inngest cron.

## Suggested order

Phase 0 → 1 → 2 → 3 → 4 → 5 → 6. Phases 1–4 are the revenue spine (engage → chat → win); 5–6 are reputation + automation that follow the first working loop.
