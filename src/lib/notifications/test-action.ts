'use server'

import { getRequiredUser } from '@/lib/auth/session'
import { sendNotification, type NotificationType } from './index'

const SAMPLES: Array<{
  type: NotificationType
  title: string
  body: string
  actionUrl: string
}> = [
  {
    type: 'LEAD',
    title: '🎯 New lead in your area',
    body: 'A homeowner needs interior painting in Austin, TX. Tap to review and quote.',
    actionUrl: '/contractor/leads',
  },
  {
    type: 'QUOTE',
    title: '💬 New quote from John\'s Painting',
    body: 'Total $3,200 over 5 days · 4.8★ (32 reviews)',
    actionUrl: '/homeowner',
  },
  {
    type: 'JOB',
    title: '🎉 Your quote was accepted',
    body: 'The homeowner booked you for the bedroom repaint. Open the job to plan next steps.',
    actionUrl: '/contractor/jobs',
  },
  {
    type: 'PAYMENT',
    title: '💰 Payment released',
    body: 'Funds for the Smith residence are on their way to your account.',
    actionUrl: '/contractor/jobs',
  },
  {
    type: 'DISPUTE',
    title: '⚠️ Dispute opened',
    body: 'A homeowner raised a dispute on a recent job. Respond within 48 hours.',
    actionUrl: '/contractor/jobs',
  },
  {
    type: 'SYSTEM',
    title: '👋 Hello from PaintPro',
    body: 'This is a test notification — if you can see this toast, real-time is working.',
    actionUrl: '/',
  },
]

/**
 * Dev-only: send a notification to the calling user. The bell + toast
 * subscription should fire within ~1 second. Used by the floating
 * "Send test notification" button in development.
 *
 * Hard-blocked in production so it can never be invoked from a real app.
 */
export async function sendTestNotificationAction(
  type?: NotificationType,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, message: 'Test notifications are disabled in production.' }
  }

  const user = await getRequiredUser()
  const sample =
    (type && SAMPLES.find((s) => s.type === type)) ??
    SAMPLES[Math.floor(Math.random() * SAMPLES.length)]

  await sendNotification({
    userId: user.id,
    type: sample.type,
    title: sample.title,
    body: sample.body,
    actionUrl: sample.actionUrl,
    sendEmail: false,  // don't spam your inbox during testing
    sendSms: false,
    sendPush: true,    // Phase 4.2: fire OS-level browser push when subscribed
  })

  return { ok: true }
}
