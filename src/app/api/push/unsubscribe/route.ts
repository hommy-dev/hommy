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

    const { endpoint } = await req.json() as { endpoint: string }
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, user.id),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/unsubscribe] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
