import { useSyncExternalStore } from 'react'
import type { StableId } from './types'

/**
 * Per-conversation composer draft, held in memory for the lifetime of the SPA.
 * Not persisted to IndexedDB (V1 scope: fix cross-conversation leakage, not full
 * draft recovery). Keyed by conversationId so A and B never share text/images.
 */
export type Draft = { text: string; imageIds: StableId[] }

const drafts = new Map<string, Draft>()
const subs = new Set<() => void>()
function emit() { subs.forEach(f => f()) }
function subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn) } }

/** Stable reference: materializes an empty draft on first read so useSyncExternalStore
 * sees a constant snapshot (never a fresh object each call). */
export function getDraft(id: string): Draft {
  let d = drafts.get(id)
  if (!d) { d = { text: '', imageIds: [] }; drafts.set(id, d) }
  return d
}
function put(id: string, d: Draft) { drafts.set(id, d); emit() }

export function setDraftText(id: string, text: string) { put(id, { text, imageIds: getDraft(id).imageIds }) }
export function addDraftImages(id: string, ids: StableId[]) { const cur = getDraft(id); put(id, { text: cur.text, imageIds: [...cur.imageIds, ...ids] }) }
export function removeDraftImage(id: string, img: StableId) { const cur = getDraft(id); put(id, { text: cur.text, imageIds: cur.imageIds.filter(x => x !== img) }) }
/** Clear text + image ids WITHOUT deleting attachments (ownership moves to a Message on send). */
export function clearDraft(id: string) { put(id, { text: '', imageIds: [] }) }
export function deleteDraft(id: string) { if (drafts.delete(id)) emit() }

export function useDraft(id: string): Draft { return useSyncExternalStore(subscribe, () => getDraft(id)) }

