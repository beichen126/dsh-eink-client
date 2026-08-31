
import { fromMarkdown, type Options } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import type { Root } from 'mdast'
/** Parse GFM markdown into an mdast Root (nodes carry source position offsets). */
export function parseMarkdown(content: string): Root {
  return fromMarkdown(content, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] } as Options)
}
