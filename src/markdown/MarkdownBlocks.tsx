
import { createElement, useMemo } from 'react'
import type { ReactNode } from 'react'
import { parseMarkdown } from './parse'
import { blockIdOf, tableIdOf, startOf, endOf } from './block-layer'
import css from './markdown.module.css'
import type { Root } from 'mdast'

type Cur = { v: number }

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

function blockEl(node: any, messageId: string): ReactNode {
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
    return (<div className={css.tableScroll} data-table-id={tid} data-block-id={bid} data-block-type='table'><table><tbody>{rows.map((row: any, r: number) => (<tr key={r}>{row.children.map((cell: any, c: number) => { const cur: Cur = { v: 0 }; return <td key={c} data-row={r} data-col={c}>{inlineList(cell.children, cur)}</td> })}</tr>))}</tbody></table></div>)
  }
  if (t === 'code') return <pre data-block-id={bid} data-block-type='code' data-annotatable='false'><code>{node.value || ''}</code></pre>
  return null
}

export function MarkdownBlocks({ content, messageId }: { content: string; messageId: string }) {
  const root = useMemo<Root>(() => parseMarkdown(content), [content])
  const children = (root.children || []) as any[]
  return <div className={css.markdown} data-message-id={messageId}>{children.map((n, i) => <span key={i}>{blockEl(n, messageId)}</span>)}</div>
}

