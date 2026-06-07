#!/usr/bin/env node
/**
 * px-to-vw-lg.mjs — gate pixel-based Tailwind sizing behind `lg:` as vw.
 *
 * Base viewport: 1440px. 1px = 0.069444vw, spacing unit × 0.27778 = vw.
 *
 * Rules (per className token):
 *   - base token (no breakpoint)  → keep it, AND add `lg:<vw>` (unless an
 *       `lg:` override of the same utility already exists in that className).
 *   - `lg:` token                 → replace with `lg:<vw>`.
 *   - `sm:` / `md:` token         → keep as-is (small devices keep fixed sizes).
 *   - `xl:` / `2xl:` token        → replace with `<bp>:<vw>`.
 *   - `max-w-*` (any breakpoint)  → REMOVED.
 *   - borders, shadows, rings, %, fractions, *-full, *-screen, colors,
 *       tracking, unitless leading, aspect, unitless utilities → untouched.
 *
 * Usage:
 *   node scripts/px-to-vw-lg.mjs                 # dry run on src/components/landing-page
 *   node scripts/px-to-vw-lg.mjs --apply         # write
 *   node scripts/px-to-vw-lg.mjs --apply a.tsx   # only these files
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join, extname, relative, resolve } from "node:path"

const ROOT = process.cwd()
const APPLY = process.argv.includes("--apply")
const FILE_ARGS = process.argv.slice(2).filter((a) => !a.startsWith("--"))
const DEFAULT_DIRS = [join(ROOT, "src/components"), join(ROOT, "src/app")]
const EXTS = new Set([".tsx", ".ts", ".jsx", ".js"])

const SCALE = 0.27778 // tailwind spacing unit -> vw
const PX = 0.069444 // px -> vw
const REM = 1.111 // rem -> vw

const FONT = {
  xs: 0.833, sm: 0.972, base: 1.111, lg: 1.25, xl: 1.389, "2xl": 1.667,
  "3xl": 2.083, "4xl": 2.5, "5xl": 3.333, "6xl": 4.167, "7xl": 5,
  "8xl": 6.667, "9xl": 8.889,
}
const ROUNDED = {
  none: 0, sm: 0.463, "": 0.324, md: 0.556, lg: 0.694, xl: 0.926,
  "2xl": 1.111, "3xl": 1.574, "4xl": 1.574,
}
// max-w named widths (rem × 1.111 -> vw). full/screen/none/min/max/fit -> keep.
const MAXW = {
  xs: 22.22, sm: 26.664, md: 31.108, lg: 35.552, xl: 39.996, "2xl": 46.662,
  "3xl": 53.328, "4xl": 62.216, "5xl": 71.104, "6xl": 79.992, "7xl": 88.88,
}

// utility prefixes, longest first so `min-h` wins over `m`, `px` over `p`, etc.
const PREFIXES = [
  "translate-x", "translate-y", "scroll-mt", "scroll-mb",
  "space-x", "space-y", "gap-x", "gap-y", "inset-x", "inset-y",
  "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl",
  "rounded-t", "rounded-r", "rounded-b", "rounded-l",
  "min-h", "max-h", "min-w", "max-w",
  "leading", "rounded", "inset", "basis", "size",
  "px", "py", "pt", "pr", "pb", "pl",
  "mx", "my", "mt", "mr", "mb", "ml",
  "gap", "top", "right", "bottom", "left",
  "text", "w", "h", "p", "m",
]

function fmt(n) {
  let s = n.toFixed(3)
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "")
  return s
}

// returns vw number, or null to skip (keep token untouched)
function computeVw(prefix, value) {
  // value is "" (rounded only), or a scale token like "8", or "[..]" arbitrary
  if (value === "" && prefix.startsWith("rounded")) return ROUNDED[""]

  // max-w named widths (full/screen/none/min/max/fit -> keep)
  if (prefix === "max-w" && !value.startsWith("[")) {
    return value in MAXW ? MAXW[value] : null
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1)
    if (/^-?\d*\.?\d+px$/.test(inner)) return parseFloat(inner) * PX
    if (/^-?\d*\.?\d+rem$/.test(inner)) return parseFloat(inner) * REM
    return null // %, vw, em, ch, vh, fr, calc, unitless ratio -> skip
  }

  // bare keyword/scale value
  if (["full", "screen", "auto", "min", "max", "fit", "none", "px"].includes(value)) {
    if (value === "px") return PX
    if (value === "none" && prefix.startsWith("rounded")) return ROUNDED.none
    return null
  }
  if (value.includes("/")) return null // fractions

  if (prefix === "text") return value in FONT ? FONT[value] : null
  if (prefix.startsWith("rounded")) return value in ROUNDED ? ROUNDED[value] : null

  // numeric spacing / leading scale
  if (/^-?\d*\.?\d+$/.test(value)) {
    const n = parseFloat(value)
    if (n === 0) return null // keep *-0
    return n * SCALE
  }
  return null
}

// classify one class token
function classify(token) {
  let bp = ""
  let t = token
  const bpm = t.match(/^(sm|md|lg|xl|2xl):/)
  if (bpm) {
    bp = bpm[1]
    t = t.slice(bpm[0].length)
  }
  let neg = ""
  if (t.startsWith("-")) {
    neg = "-"
    t = t.slice(1)
  }

  for (const prefix of PREFIXES) {
    if (t === prefix || t.startsWith(prefix + "-")) {
      const value = t === prefix ? "" : t.slice(prefix.length + 1)
      const vw = computeVw(prefix, value === "" ? "" : value)
      if (vw === null) return { kind: "keep" }
      const body = `${neg}${prefix}-[${fmt(vw)}vw]`
      return { kind: "convert", bp, key: `${neg}${prefix}`, body }
    }
  }
  return { kind: "keep" }
}

function transformClassList(str) {
  const tokens = str.split(/\s+/).filter(Boolean)
  if (tokens.length < 1) return str

  // utilities that already have an lg: override (so base shouldn't add one)
  const lgKeys = new Set()
  for (const tk of tokens) {
    if (tk.startsWith("lg:")) {
      const c = classify(tk)
      if (c.kind === "convert") lgKeys.add(c.key)
      else {
        // non-convert lg: (e.g. lg:min-h-screen) still counts as an override
        const m = tk.slice(3).match(/^(-?)((?:[a-z]+-)*[a-z]+)/)
        if (m) lgKeys.add(m[1] + m[2])
      }
    }
  }

  let changed = false
  const out = []
  for (const tk of tokens) {
    const c = classify(tk)
    if (c.kind === "remove") {
      changed = true
      continue
    }
    if (c.kind === "keep") {
      out.push(tk)
      continue
    }
    // convert
    if (c.bp === "lg" || c.bp === "xl" || c.bp === "2xl") {
      out.push(`${c.bp}:${c.body}`)
      changed = true
    } else if (c.bp === "sm" || c.bp === "md") {
      out.push(tk)
    } else {
      // base
      out.push(tk)
      if (!lgKeys.has(c.key)) {
        out.push(`lg:${c.body}`)
        changed = true
      }
    }
  }
  return changed ? out.join(" ") : str
}

// transform the contents of every string literal (class lists live there).
function transformFile(src) {
  let count = 0
  const apply = (s) => {
    const r = transformClassList(s)
    if (r !== s) count++
    return r
  }
  // double + single quoted strings (no newlines)
  let out = src
    .replace(/"([^"\n]*)"/g, (_m, s) => `"${apply(s)}"`)
    .replace(/'([^'\n]*)'/g, (_m, s) => `'${apply(s)}'`)
  // backtick templates: transform static parts between ${...}
  out = out.replace(/`([^`]*)`/gs, (_m, body) => {
    const parts = body.split(/(\$\{[^}]*\})/)
    const t = parts.map((p) => (p.startsWith("${") ? p : apply(p))).join("")
    return "`" + t + "`"
  })
  return { out, count }
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(name)) continue
      walk(p, acc)
    } else if (EXTS.has(extname(name))) acc.push(p)
  }
  return acc
}

const files = FILE_ARGS.length
  ? FILE_ARGS.map((a) => resolve(ROOT, a))
  : DEFAULT_DIRS.flatMap((d) => walk(d))

let touched = 0
let totalStrings = 0
const samples = []
for (const file of files) {
  const src = readFileSync(file, "utf8")
  const { out, count } = transformFile(src)
  if (out !== src) {
    touched++
    totalStrings += count
    if (samples.length < 14) {
      const a = src.split("\n")
      const b = out.split("\n")
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          samples.push({ file: relative(ROOT, file), line: i + 1, before: a[i].trim(), after: b[i].trim() })
          break
        }
      }
    }
    if (APPLY) writeFileSync(file, out, "utf8")
  }
}

console.log(`\npx -> lg:vw   (1440 base)   mode: ${APPLY ? "APPLY" : "DRY RUN"}`)
console.log(`files scanned: ${files.length}`)
console.log(`files changed: ${touched}`)
console.log(`class strings changed: ${totalStrings}\n`)
console.log("sample line diffs:")
for (const s of samples) {
  console.log(`\n  ${s.file}:${s.line}`)
  console.log(`  -  ${s.before}`)
  console.log(`  +  ${s.after}`)
}
console.log(APPLY ? "\nDone — files written.\n" : "\nDry run. Re-run with --apply to write.\n")
