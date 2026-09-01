
import { useEffect, useMemo, useRef, useState } from 'react'
import { MarkdownBlocks } from '../markdown/MarkdownBlocks'
import { mapSelection } from './selection-mapper'
import { resolveToRange } from './range-resolver'
import { buildBlockMap } from './canonical'
import { useMessageAnnotations, toggleMessageSelection, toggleTableCellsMessage, toggleWholeTableMessage, toggleMathMessage, refreshMessageAnnotations } from './annotation-store'
import { setMessageRanges, removeMessageRanges, highlightSupported } from './highlight-registry'
import { shouldToggleAll, normalizeBounds, hasExactRectangle, hasWholeTable, hasMath } from './annotation-ops'
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

  useEffect(() => {
    const msgEl = wrapRef.current?.querySelector('[data-message-id]')
    if (!msgEl) return
    let ranges: Range[] = []
    try { ranges = annotations.filter((a) => a.target.type === 'text').map((a) => resolveToRange(msgEl, messageId, a.target as any)).filter((r): r is Range => !!r) } catch { ranges = [] }
    try { setMessageRanges(messageId, ranges) } catch { /* never crash the app on a bad highlight range */ }
    return () => { try { removeMessageRanges(messageId) } catch {} }
  }, [annotations, messageId, content, hasHl])

  useEffect(() => {
    let pressedMath: { id: string; kind: 'inline' | 'block' } | null = null
    function nearestMath(el: any): { id: string; kind: 'inline' | 'block' } | null {
      for (let e = el; e; e = e.parentElement) {
        const id = e.getAttribute && e.getAttribute('data-math-id')
        if (id) return { id, kind: e.getAttribute('data-math-kind') === 'block' ? 'block' : 'inline' }
      }
      return null
    }
    function onPointerDown(e: Event) { pressedMath = nearestMath(e.target as any) }
    function onSelChange() {
      const sel = window.getSelection()
      // Math click: pointerup landed on a formula (collapsed or no text selection).
      if (pressedMath) { setPending({ kind: 'math', mathId: pressedMath.id, mathKind: pressedMath.kind }); setPendingBox(null); pressedMath = null; return }
      if (!sel || sel.rangeCount === 0) { setPending(null); setPendingBox(null); return }
      const msgEl = wrapRef.current?.querySelector('[data-message-id]')
      if (!msgEl) { setPending(null); setPendingBox(null); return }
      if (sel.isCollapsed) { setPending(null); setPendingBox(null); return }
      try {
        const range = sel.getRangeAt(0)
        const mStart = nearestMath(range.startContainer as any)
        const mEnd = nearestMath(range.endContainer as any)
        if (mStart && mEnd && mStart.id === mEnd.id) { setPending({ kind: 'math', mathId: mStart.id, mathKind: mStart.kind }); setPendingBox(null); return }
        // A selection that crosses inline math now falls through to mapSelection: the
        // atomic math unit keeps text offsets aligned, so the passage (including a
        // formula) is markable as one text annotation instead of the bar vanishing.
        const inMsg = (n: Node) => { for (let e: any = n; e; e = e.parentElement) if (e.getAttribute && e.getAttribute('data-message-id')) return true; return false }
        if (!inMsg(range.startContainer) || !inMsg(range.endContainer)) { setPending(null); setPendingBox(null); return }
        const result = mapSelection(msgEl, messageId, range, (b) => blocks.get(b))
        if (result.kind === 'text' && result.segments.length) { setPending(result); const r = range.getBoundingClientRect(); setPendingBox({ left: Math.min(r.left + r.width, window.innerWidth - 90), top: Math.max(8, r.top - 44) }) }
        else if (result.kind === 'table-cross-cell') { setPending(result); const r = range.getBoundingClientRect(); setPendingBox({ left: Math.min(r.left + r.width, window.innerWidth - 90), top: Math.max(8, r.top - 44) }) }
        else { setPending(result); setPendingBox(null) }
      } catch { setPending(null); setPendingBox(null) }
    }
    document.addEventListener('selectionchange', onSelChange)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointerup', onSelChange)
    document.addEventListener('touchend', onSelChange)
    return () => { document.removeEventListener('selectionchange', onSelChange); document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('pointerup', onSelChange); document.removeEventListener('touchend', onSelChange) }
  }, [messageId, content, canonicalOf])

  const markCrossCell = () => { if (!pending || pending.kind !== 'table-cross-cell') return; const a = pending.startCell, b = pending.endCell; const bounds = normalizeBounds(a.row, a.column, b.row, b.column); void toggleTableCellsMessage(conversationId, messageId, pending.tableId, bounds); window.getSelection()?.removeAllRanges(); setPending(null); setPendingBox(null) }
  const onMathAction = (mathId: string, kind: 'inline' | 'block') => { setPending({ kind: 'math', mathId, mathKind: kind }); setPendingBox(null) }
  function doToggle() {
    try {
    if (!pending) return
    if (pending.kind === 'math') { void toggleMathMessage(conversationId, messageId, pending.mathId, pending.mathKind); window.getSelection()?.removeAllRanges(); setPending(null); setPendingBox(null); return }
    if (pending.kind !== 'text') return
    toggleMessageSelection(conversationId, messageId, pending.segments, canonicalOf)
    window.getSelection()?.removeAllRanges()
    setPending(null); setPendingBox(null)
    } catch { try { window.getSelection()?.removeAllRanges() } catch {}; setPending(null); setPendingBox(null) }
  }
  const mathCovered = pending && pending.kind === 'math' ? hasMath(annotations, pending.mathId) : false
  const fullyCovered = pending && pending.kind === 'text' ? shouldToggleAll(pending.segments.map((s) => ({ anchor: s.cell ? { scope: 'table-cell', tableId: s.cell.tableId, row: s.cell.row, column: s.cell.column } : { scope: 'block', blockId: s.blockId }, start: s.start, end: s.end })), annotations) === 'remove' : mathCovered

  const onTableAction = (tableId: string) => { void toggleWholeTableMessage(conversationId, messageId, tableId) }
  return (
    <div ref={wrapRef} className={css.wrap} data-highlight={hasHl}>
      <MarkdownBlocks content={content} messageId={messageId} annotations={annotations} onTableAction={onTableAction} onMathAction={onMathAction} />
      {pending && pending.kind === 'math' && (
        <div className={css.annotBar}><button className={css.annotBtn} onPointerUp={(e: any) => e.stopPropagation()} onTouchEnd={(e: any) => e.stopPropagation()} onPointerDown={(e: any) => e.stopPropagation()} onClick={doToggle}>{mathCovered ? '取消标记' : '标记公式'}</button></div>
      )}
      {pending && pending.kind === 'text' && (
        <div className={css.annotBar}><button className={css.annotBtn} onPointerUp={(e: any) => e.stopPropagation()} onTouchEnd={(e: any) => e.stopPropagation()} onPointerDown={(e: any) => e.stopPropagation()} onClick={doToggle}>{fullyCovered ? '取消标记' : '标记'}</button></div>
      )}
      {pending && pending.kind === 'table-cross-cell' && (
        <div className={css.annotBar}><button className={css.annotBtn} onPointerUp={(e: any) => e.stopPropagation()} onTouchEnd={(e: any) => e.stopPropagation()} onPointerDown={(e: any) => e.stopPropagation()} onClick={markCrossCell}>{hasExactRectangle(annotations, pending.tableId, normalizeBounds(pending.startCell.row, pending.startCell.column, pending.endCell.row, pending.endCell.column)) ? '取消标记' : '标记'}</button></div>
      )}
    </div>
  )
}
