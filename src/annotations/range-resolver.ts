import type { TextAnnotationTarget } from './annotation-types'

type Leaf = { node: Node; br?: Element; cs: number; len: number }
function collectLeaves(scopeEl: Element): Leaf[] {
  const out: Leaf[] = []
  scopeEl.querySelectorAll('[data-canonical-start]').forEach((el) => {
    const cs = Number(el.getAttribute('data-canonical-start')) || 0
    const ce = Number(el.getAttribute('data-canonical-end')) || cs
    const n = el.firstChild
    if (n && n.nodeType === 3) out.push({ node: n, cs, len: (n.textContent || '').length })
    else if (el.tagName === 'BR') out.push({ node: el, br: el as Element, cs, len: 1 })
  })
  return out.sort((a, b) => a.cs - b.cs)
}
function boundary(leaf: Leaf, local: number): { node: Node; offset: number } {
  if (leaf.br) { const parent = leaf.br.parentElement; return { node: parent, offset: Array.prototype.indexOf.call(parent.childNodes, leaf.br) + (local === 0 ? 0 : 1) } }
  return { node: leaf.node, offset: Math.max(0, local) }
}
export function resolveToRange(msgEl: Element, messageId: string, target: TextAnnotationTarget): Range | null {
  const a = target.anchor
  let scope: Element | null = null
  if (a.scope === 'block') scope = msgEl.querySelector('[data-block-id="' + a.blockId + '"]')
  else scope = msgEl.querySelector('[data-table-id="' + a.tableId + '"] td[data-row="' + a.row + '"][data-col="' + a.column + '"]')
  if (!scope) return null
  const leaves = collectLeaves(scope)
  const range = document.createRange()
  let started = false
  for (const leaf of leaves) {
    const lo = leaf.cs, hi = leaf.cs + leaf.len
    if (!started && target.start < hi && lo <= target.end) { const b = boundary(leaf, target.start - lo); range.setStart(b.node, b.offset); started = true }
    if (started && target.end <= hi && target.end > lo) { const b = boundary(leaf, target.end - lo); range.setEnd(b.node, b.offset); break }
  }
  return started ? range : null
}
export function rangeBox(range: Range) { return range.getBoundingClientRect() }