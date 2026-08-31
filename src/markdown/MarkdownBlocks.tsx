
import { createElement, useMemo } from 'react'
import type { ReactNode } from 'react'
import { renderToString as katexRenderString } from 'katex'
import { parseMarkdown } from './parse'
import 'katex/dist/katex.min.css'
import { blockIdOf, tableIdOf, startOf, endOf } from './block-layer'
import type { Annotation } from '../annotations/annotation-types'
import css from './markdown.module.css'
import type { Root } from 'mdast'

type Cur = { v: number }
function kathRender(tex: string, display: boolean): string { try { return katexRenderString(tex, { displayMode: display, throwOnError: false }) } catch { return tex } }

function inline(node: any, cur: Cur): ReactNode {
  switch (node.type) {
    case 'text': {
      const st = cur.v; cur.v += node.value.length
      return <span data-canonical-start={st} data-canonical-end={cur.v}>{node.value}</span>
    }
    case 'break': {
      const st = cur.v; cur.v += 1
      return <br data-canonical-start={st} data-canonical-end={cur.v} />
    }
    case 'strong': return <strong>{node.children ? node.children.map((c: any) => inline(c, cur)) : ''}</strong>
    case 'emphasis': return <em>{node.children ? node.children.map((c: any) => inline(c, cur)) : ''}</em>
    case 'link': return <a href={node.url || '#'}>{node.children ? node.children.map((c: any) => inline(c, cur)) : ''}</a>
    case 'inlineMath': { const st = cur.v; cur.v += 1; return <span data-canonical-start={st} data-canonical-end={cur.v} data-math data-annotatable="false" className={css.mathInline} dangerouslySetInnerHTML={{ __html: kathRender(node.value || '', false) }}></span> }
    case 'inlineCode': { const st = cur.v; cur.v += (node.value || '').length; return <code data-canonical-start={st} data-canonical-end={cur.v}>{node.value}</code> }
    default: return node.children ? node.children.map((c: any) => inline(c, cur)) : (typeof node.value === 'string' ? node.value : '')
  }
}
function inlineList(nodes: any[] | undefined, cur: Cur): ReactNode { return nodes ? nodes.map((n, i) => <span key={i}>{inline(n, cur)}</span>) : null }

function innerBlock(node: any, cur: Cur): ReactNode {
  if (node.type === 'paragraph') return <p>{inlineList(node.children, cur)}</p>
  if (node.type === 'list') { const rows = node.children || []; return node.ordered ? <ol>{rows.map((li: any, i: number) => <li key={i}>{innerList(li, cur)}</li>)}</ol> : <ul>{rows.map((li: any, i: number) => <li key={i}>{innerList(li, cur)}</li>)}</ul> }
  if (node.type === 'listItem') return <li>{innerList(node, cur)}</li>
  if (node.type === 'blockquote') return <blockquote>{innerNodes(node.children || [], cur)}</blockquote>
  return inlineList(node.children, cur)
}
function innerNodes(nodes: any[], cur: Cur): ReactNode { return nodes.map((n, i) => <span key={i}>{innerBlock(n, cur)}</span>) }
function innerList(li: any, cur: Cur): ReactNode { return innerNodes(li.children || [], cur) }

function blockEl(node: any, messageId: string, annotations?: Annotation[], onTableAction?: (tableId: string) => void): ReactNode {
  const t = node.type
  const bid = blockIdOf(messageId, t === 'heading' ? 'heading' : t === 'paragraph' ? 'paragraph' : t === 'listItem' ? 'list-item' : t === 'blockquote' ? 'blockquote' : t === 'table' ? 'table' : t === 'code' ? 'code' : 'paragraph', startOf(node), endOf(node))
  if (t === 'heading') { const level = node.depth; const cur: Cur = { v: 0 }; return createElement('h' + Math.min(6, Math.max(1, level)), { 'data-block-id': bid, 'data-block-type': 'heading' }, inlineList(node.children, cur)) }
  if (t === 'paragraph') { const cur: Cur = { v: 0 }; return <p data-block-id={bid} data-block-type='paragraph'>{inlineList(node.children, cur)}</p> }
  if (t === 'list') { const cur: Cur = { v: 0 }; const rows = node.children || []; return node.ordered ? <ol>{rows.map((li: any, i: number) => <span key={i}>{blockEl(li, messageId)}</span>)}</ol> : <ul>{rows.map((li: any, i: number) => <span key={i}>{blockEl(li, messageId)}</span>)}</ul> }
  if (t === 'listItem') { const cur: Cur = { v: 0 }; return <li data-block-id={bid} data-block-type='list-item'>{innerNodes(node.children || [], cur)}</li> }
  if (t === 'blockquote') { const cur: Cur = { v: 0 }; return <blockquote data-block-id={bid} data-block-type='blockquote'>{innerNodes(node.children || [], cur)}</blockquote> }
  if (t === 'table') {
    const tid = tableIdOf(messageId, startOf(node), endOf(node))
    const rows: any[] = node.children || []
    const whole = !!annotations && annotations.some((a: any) => a.target && a.target.type === 'table' && a.target.tableId === tid)
    const coveredRect = (r: number, c: number) => { if (!annotations) return false; return annotations.some((a: any) => a.target && a.target.type === 'table-cells' && a.target.tableId === tid && r >= a.target.bounds.rowStart && r <= a.target.bounds.rowEnd && c >= a.target.bounds.columnStart && c <= a.target.bounds.columnEnd) }
    return (<div className={css.tableScroll + (whole ? ' ' + css.studyTableHighlighted : '')} data-table-id={tid} data-block-id={bid} data-block-type='table'>{onTableAction && <button className={css.tableAction} data-table-action={tid} onClick={(e) => { e.stopPropagation(); onTableAction(tid) }}>⋯</button>}<table><tbody>{rows.map((row: any, r: number) => (<tr key={r}>{row.children.map((cell: any, c: number) => { const cur: Cur = { v: 0 }; const hit = whole || coveredRect(r, c); return <td key={c} data-row={r} data-col={c} className={hit ? css.studyCellHighlighted : undefined}>{inlineList(cell.children, cur)}</td> })}</tr>))}</tbody></table></div>)
  }
  if (t === 'math') return <div data-block-id={bid} data-block-type='math' data-annotatable='false' className={css.mathBlock} dangerouslySetInnerHTML={{ __html: kathRender(node.value || '', true) }}></div>
  if (t === 'code') return <pre data-block-id={bid} data-block-type='code' data-annotatable='false'><code>{node.value || ''}</code></pre>
  return null
}

export function MarkdownBlocks({ content, messageId, annotations, onTableAction }: { content: string; messageId: string; annotations?: Annotation[]; onTableAction?: (tableId: string) => void }) {
  const root = useMemo<Root>(() => parseMarkdown(content), [content])
  const children = (root.children || []) as any[]
  return <div className={css.markdown} data-message-id={messageId}>{children.map((n, i) => <span key={i}>{blockEl(n, messageId, annotations, onTableAction)}</span>)}</div>
}