'use client'

import { useEffect, useRef, useState } from 'react'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function usePushSubscription() {
  const [permission, setPermission] = useState<PermissionState>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const registered = useRef(false)

  // Register service worker and check current state on mount
  useEffect(() => {
    if (registered.current) return
    registered.current = true

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission as PermissionState)

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription()
        setSubscribed(!!sub)
      })
      .catch((err) => console.error('[usePushSubscription] SW registration failed', err))
  }, [])

  async function subscribe(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.warn('[usePushSubscription] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set')
      return false
    }

    setLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PermissionState)
      if (result !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      })

      const { endpoint, keys } = sub.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, keys }),
      })

      setSubscribed(true)
      return true
    } catch (err) {
      console.error('[usePushSubscription] subscribe error', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe(): Promise<void> {
    if (!('serviceWorker' in navigator)) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
        setSubscribed(false)
      }
    } catch (err) {
      console.error('[usePushSubscription] unsubscribe error', err)
    } finally {
      setLoading(false)
    }
  }

  return { permission, subscribed, loading, subscribe, unsubscribe }
}

// Converts VAPID base64 public key to Uint8Array required by pushManager.subscribe
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
