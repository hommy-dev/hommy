// ============================================================
// Sandbox-only email previews.
//
// Renders the REAL production templates (./template.ts + ./messages-digest.ts)
// against representative sample data, so the sandbox shows exactly what
// recipients get. No separate copy of the design lives here.
// ============================================================

import { renderEmail, type EmailContent } from './template'
import { renderMessagesDigestEmail } from './messages-digest'

const SAMPLE_LEAD: EmailContent = {
  preheader: 'A new roofing job near Plano just matched your coverage area.',
  heading: 'New roofing job near you',
  intro:
    'A homeowner in <strong>Plano, TX</strong> just posted a job that matches your coverage area. Receiving it is free — start the conversation when it looks like a fit.',
  highlight: {
    label: 'Job details',
    rows: [
      { label: 'Service', value: 'Roof replacement' },
      { label: 'Location', value: 'Plano, TX 75024' },
      { label: 'Timeline', value: 'Within 2 weeks' },
      { label: 'Posted', value: 'Just now' },
    ],
  },
  cta: { label: 'View the job', url: 'https://hommy.online/contractor/jobs' },
  note: 'It costs 1 credit to start the chat. You only pay the win fee if the homeowner accepts your quote.',
}

const SAMPLE_WELCOME: EmailContent = {
  preheader: "Your account is ready and we've added 300 credits to get you started.",
  heading: 'Welcome to Hommy',
  intro:
    "Your account is ready — and we've added <strong>300 credits</strong> to your wallet to get you started.",
  highlight: {
    label: 'Your starting credits',
    rows: [
      { label: 'Signup credits (never expire)', value: '50' },
      { label: 'Launch bonus (use by Sep 1, 2026)', value: '250' },
    ],
  },
  paragraphs: ['Here’s how credits work:'],
  bullets: [
    { strong: 'Getting leads is free.', text: 'Every matching job shows up at no cost.' },
    { strong: '1 credit to start a chat,', text: "which unlocks the homeowner's contact details." },
    {
      strong: 'You only pay the win fee when you win',
      text: 'a small % of the job, charged when the homeowner accepts your quote. No win, no fee.',
    },
  ],
  cta: { label: 'Open your dashboard', url: 'https://hommy.online/contractor' },
}

const SAMPLE_QUOTE: EmailContent = {
  preheader: 'Sarah M. approved your quote — the job is yours.',
  heading: 'Your quote was accepted',
  intro:
    '<strong>Sarah M.</strong> just accepted your quote for the roof replacement in Plano. Nice work — the job is yours.',
  highlight: {
    rows: [
      { label: 'Job', value: 'Roof replacement' },
      { label: 'Quote total', value: '$14,200' },
      { label: 'Homeowner', value: 'Sarah M.' },
    ],
  },
  paragraphs: ['Reach out to schedule the work and keep everything in one thread on Hommy.'],
  cta: { label: 'Open the conversation', url: 'https://hommy.online/contractor/messages' },
}

// A generic notification with no custom HTML — i.e. the fallback path.
const SAMPLE_SYSTEM: EmailContent = {
  preheader: 'Your verification is approved — you can now receive leads.',
  heading: "You're verified",
  intro:
    'Your license and insurance checked out. Your profile is live and you’ll start receiving matching roofing jobs in your area.',
  cta: { label: 'Open Hommy', url: 'https://hommy.online/contractor' },
}

export type EmailSample = { id: string; label: string; html: string }

export const EMAIL_SAMPLES: EmailSample[] = [
  { id: 'lead', label: 'New lead', html: renderEmail(SAMPLE_LEAD) },
  { id: 'welcome', label: 'Welcome', html: renderEmail(SAMPLE_WELCOME) },
  { id: 'quote', label: 'Quote accepted', html: renderEmail(SAMPLE_QUOTE) },
  { id: 'system', label: 'System (fallback)', html: renderEmail(SAMPLE_SYSTEM) },
  {
    id: 'digest',
    label: 'Message digest',
    html: renderMessagesDigestEmail({
      recipientName: 'Jordan Lee',
      totalUnread: 4,
      totalConversations: 3,
      conversations: [
        {
          conversationId: '1',
          actionUrl: '/contractor/messages/1',
          peerName: 'Sarah M.',
          latestPreview: 'Can you come take a look this Thursday afternoon? The leak got worse.',
          unreadCount: 2,
        },
        {
          conversationId: '2',
          actionUrl: '/contractor/messages/2',
          peerName: 'David R.',
          latestPreview: 'Thanks for the quote — a couple questions on the warranty.',
          unreadCount: 1,
        },
        {
          conversationId: '3',
          actionUrl: '/contractor/messages/3',
          peerName: 'Priya N.',
          latestPreview: 'Sounds good, see you then.',
          unreadCount: 1,
        },
      ],
    }).html,
  },
]
