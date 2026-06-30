// Central values for the legal pages (Privacy Policy, Terms of Service). Edit
// these once and both pages update.
//
// ⚠️ FILL THESE IN before launch and have a licensed attorney review the pages:
//   - `entity`: your registered legal entity name once formed (until then, the
//     brand name stands in).
//   - `governingState`: the U.S. state whose law governs (launch: Texas/Florida).
//   - `address`: your real business mailing address (required for CAN-SPAM,
//     and asked for by carriers/A2P).
//   - the email addresses must be live mailboxes you monitor.
//   - `effectiveDate`: the date you publish.

export const LEGAL = {
  brand: 'Hommy',
  /** TODO: replace with the registered legal entity name once incorporated. */
  entity: 'Hommy',
  site: 'hommy.online',
  url: 'https://www.hommy.online',
  supportEmail: 'support@hommy.online',
  privacyEmail: 'privacy@hommy.online',
  legalEmail: 'legal@hommy.online',
  /** TODO: confirm the governing-law state. */
  governingState: 'Texas',
  /** TODO: set your real business mailing address. */
  address: '[Business mailing address]',
  /** TODO: set the publication date. */
  effectiveDate: 'June 27, 2026',
} as const
