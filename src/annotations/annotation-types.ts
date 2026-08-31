
import type { StableId } from '../engine/types'
export type TextAnchor =
  | { scope: 'block'; blockId: string }
  | { scope: 'table-cell'; tableId: string; row: number; column: number }
export type TextAnnotationTarget = {
  type: 'text'
  anchor: TextAnchor
  start: number
  end: number
  quote: { exact: string; prefix: string; suffix: string }
}
export type Annotation = {
  id: StableId
  conversationId: StableId
  messageId: StableId
  target: TextAnnotationTarget
  createdAt: number
  updatedAt: number
  version: 1
}
export const ANNOTATION_VERSION = 1 as const
