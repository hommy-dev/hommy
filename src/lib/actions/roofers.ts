"use server"

import {
  getRoofersDirectory,
  type RoofersDirectoryResult,
  type RoofersSort,
} from "@/lib/data/roofers"

/**
 * Server action backing the /roofers directory's live search + filters + "load
 * more". Thin wrapper over the cached `getRoofersDirectory` query.
 */
export async function searchRoofers(params: {
  q?: string
  subtype?: string
  near?: { lat: number; lng: number } | null
  stateSlug?: string
  sort?: RoofersSort
  page?: number
  pageSize?: number
}): Promise<RoofersDirectoryResult> {
  return getRoofersDirectory(params)
}
