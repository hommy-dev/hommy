"use client"

// Live photo manager for an existing case study (Manage modal). Thin wrapper
// over the shared CaseStudyPhotos: every action hits the server immediately and
// updates local state. (The Add modal uses the same component, staged.)

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  addPortfolioImage,
  removePortfolioImage,
  updatePortfolioProject,
} from "@/lib/actions/portfolio"
import type { PortfolioImage } from "@/lib/data/portfolio"
import { MAX_IMAGES_PER_PROJECT } from "@/lib/portfolio/constants"
import { showToast } from "@/components/ui/toast"
import { CaseStudyPhotos, type CasePhoto } from "./case-study-photos"

export function PortfolioMedia({
  projectId,
  initial,
  cover,
}: {
  projectId: string
  initial: PortfolioImage[]
  cover: string | null
}) {
  const router = useRouter()
  const [items, setItems] = useState<PortfolioImage[]>(initial)
  const [coverUrl, setCoverUrl] = useState<string | null>(cover)
  const [busy, setBusy] = useState(false)

  const photos: CasePhoto[] = items.map((m) => ({
    key: m.id,
    kind: m.kind,
    imageUrl: m.imageUrl,
    beforeUrl: m.beforeUrl,
  }))

  async function addSingle(url: string) {
    setBusy(true)
    const res = await addPortfolioImage({ projectId, kind: "single", imageUrl: url })
    setBusy(false)
    if (!res.success || !res.data) {
      showToast(res.success ? "Could not add image." : res.error, { type: "error" })
      return
    }
    setItems((i) => [...i, res.data!])
    if (!coverUrl) setCoverUrl(res.data!.imageUrl)
    router.refresh()
  }

  async function addPair(beforeUrl: string, afterUrl: string) {
    setBusy(true)
    const res = await addPortfolioImage({
      projectId,
      kind: "before_after",
      imageUrl: afterUrl,
      beforeUrl,
    })
    setBusy(false)
    if (!res.success || !res.data) {
      showToast(res.success ? "Could not add." : res.error, { type: "error" })
      return
    }
    setItems((i) => [...i, res.data!])
    if (!coverUrl) setCoverUrl(res.data!.imageUrl)
    router.refresh()
  }

  async function remove(item: CasePhoto) {
    setBusy(true)
    const res = await removePortfolioImage(item.key)
    setBusy(false)
    if (!res.success) {
      showToast(res.error, { type: "error" })
      return
    }
    const next = items.filter((x) => x.id !== item.key)
    setItems(next)
    // Mirror the server's cover fallback (next image by order, else none).
    if (coverUrl === item.imageUrl) setCoverUrl(next[0]?.imageUrl ?? null)
    router.refresh()
  }

  async function setCover(item: CasePhoto) {
    const prev = coverUrl
    setCoverUrl(item.imageUrl) // optimistic
    setBusy(true)
    const res = await updatePortfolioProject({
      id: projectId,
      coverImageUrl: item.imageUrl,
    })
    setBusy(false)
    if (!res.success) {
      setCoverUrl(prev)
      showToast(res.error, { type: "error" })
      return
    }
    router.refresh()
  }

  return (
    <CaseStudyPhotos
      items={photos}
      coverUrl={coverUrl}
      max={MAX_IMAGES_PER_PROJECT}
      busy={busy}
      onAddSingle={addSingle}
      onAddPair={addPair}
      onRemove={remove}
      onSetCover={setCover}
    />
  )
}
