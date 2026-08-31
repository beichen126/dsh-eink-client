
import { useEffect, useMemo, useRef, useState } from 'react'
import { MarkdownBlocks } from '../markdown/MarkdownBlocks'
import { mapSelection } from './selection-mapper'
import { resolveToRange } from './range-resolver'
import { buildBlockMap } from './canonical'
import { useMessageAnnotations, toggleMessageSelection, toggleTableCellsMessage, toggleWholeTableMessage, refreshMessageAnnotations } from './annotation-store'
import { setMessageRanges, removeMessageRanges, highlightSupported } from './highlight-registry'
import { shouldToggleAll, normalizeBounds, hasExactRectangle, hasWholeTable } from './annotation-ops'
import type { SelectionMapping, TextSelectionSegment } from './selection-types'
import type { TableBounds } from './annotation-types'
import css from './annotate.module.css'

export function AnnotatedMarkdown({ content, messageId, conversationId }: { content: string; messageId: string; conversationId: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState<SelectionMapping | null>(null)
  const [pendingBox, setPendingBox] = useState<{ left: number; top: number } | null>(null)
  const annotations = useMessageAnnotations(conversationId, messageId)
  const { blocks, canonicalOf } = useMemo(() => buildBlockMap(content, messageId), [content, messageId])
  const hasHl = highlightSupported()
  useEffect(() => { void refreshMessageAnnotations(conversationId, messageId) }, [conversationId, messageId])

  // highlight resolved ranges for this message
  useEffect(() => {
    const msgEl = wrapRef.current?.querySelector('[data-message-id]')
    if (!msgEl) return
    const ranges = annotations.filter((a) => a.target.type === 'text').map((a) => resolveToRange(msgEl, messageId, a.target as any)).filter((r): r is Range => !!r)
    setMessageRanges(messageId, ranges)
    return () => { removeMessageRanges(messageId) }
  }, [annotations, messageId, content, hasHl])

  // selection -> pending
  useEffect(() => {
    function onSelChange() {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { setPending(null); setPendingBox(null); return }
      const msgEl = wrapRef.current?.querySelector('[data-message-id]')
      if (!msgEl) return
      const sm = sel.getRangeAt(0).startContainer, em = sel.getRangeAt(0).endContainer
      const inMsg = (n: Node) => { for (let e: any = n; e; e = e.parentElement) if (e.getAttribute && e.getAttribute('data-message-id')) return true; return false }
      if (!inMsg(sm) || !inMsg(em)) { setPending(null); setPendingBox(null); return }
      const range = sel.getRangeAt(0)
      const result = mapSelection(msgEl, messageId, range, (b) => blocks.get(b))
      if (result.kind === 'text' && result.segments.length) {
        setPending(result)
        const r = range.getBoundingClientRect()
        setPendingBox({ left: Math.min(r.left + r.width, window.innerWidth - 90), top: Math.max(8, r.top - 44) })
      } else if (result.kind === 'table-cross-cell') {
        setPending(result)
        const r = range.getBoundingClientRect()
        setPendingBox({ left: Math.min(r.left + r.width, window.innerWidth - 90), top: Math.max(8, r.top - 44) })
      } else { setPending(result); setPendingBox(null) }
    }
    document.addEventListener('selectionchange', onSelChange)
    document.addEventListener('pointerup', onSelChange)
    document.addEventListener('touchend', onSelChange)
    return () => { document.removeEventListener('selectionchange', onSelChange); document.removeEventListener('pointerup', onSelChange); document.removeEventListener('touchend', onSelChange) }
  }, [messageId, content, canonicalOf])

  const markCrossCell = () => { if (!pending || pending.kind !== 'table-cross-cell') return; const a = pending.startCell, b = pending.endCell; const bounds = normalizeBounds(a.row, a.column, b.row, b.column); void toggleTableCellsMessage(conversationId, messageId, pending.tableId, bounds); window.getSelection()?.removeAllRanges(); setPending(null); setPendingBox(null) }
  function doToggle() {
    if (!pending || pending.kind !== 'text') return
    toggleMessageSelection(conversationId, messageId, pending.segments, canonicalOf)
    window.getSelection()?.removeAllRanges()
    setPending(null); setPendingBox(null)
  }
  const fullyCovered = pending && pending.kind === 'text' ? shouldToggleAll(pending.segments.map((s) => ({ anchor: s.cell ? { scope: 'table-cell', tableId: s.cell.tableId, row: s.cell.row, column: s.cell.column } : { scope: 'block', blockId: s.blockId }, start: s.start, end: s.end })), annotations) === 'remove' : false

  const onTableAction = (tableId: string) => { void toggleWholeTableMessage(conversationId, messageId, tableId) }
  return (
    <div ref={wrapRef} className={css.wrap} data-highlight={hasHl}>
      <MarkdownBlocks content={content} messageId={messageId} annotations={annotations} onTableAction={onTableAction} />
      {pending && pending.kind === 'text' && pendingBox && (
        <button className={css.annotBtn} style={{ left: pendingBox.left, top: pendingBox.top }} onClick={doToggle}>{fullyCovered ? '取消标记' : '标记'}</button>
      )}
      {pending && pending.kind === 'table-cross-cell' && pendingBox && (
        <button className={css.annotBtn} style={{ left: pendingBox.left, top: pendingBox.top }} onClick={markCrossCell}>{hasExactRectangle(annotations, pending.tableId, normalizeBounds(pending.startCell.row, pending.startCell.column, pending.endCell.row, pending.endCell.column)) ? '取消标记' : '标记'}</button>
      )}
    </div>
  )
}