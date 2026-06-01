import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const userAgent = req.headers.get('user-agent') ?? undefined

    // Upsert: if subscription exists for this user+endpoint, skip; otherwise insert
    const existing = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, user.id),
          eq(pushSubscriptions.endpoint, body.endpoint)
        )
      )
      .limit(1)

    if (existing.length === 0) {
      await db.insert(pushSubscriptions).values({
        userId: user.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
