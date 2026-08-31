import { idbReplaceAll } from '../storage/idb'
import type { Annotation } from '../annotations/annotation-types'
import type { Attachment } from '../engine/types'
import { BACKUP_FORMAT, BACKUP_VERSION, type BackupV1 } from './backup-types'

export class BackupError extends Error { constructor(message: string) { super(message); this.name = 'BackupError' } }

function isObj(v: unknown): v is Record<string, any> { return typeof v === 'object' && v !== null && !Array.isArray(v) }
function isStr(v: unknown): v is string { return typeof v === 'string' }

function base64ToBlob(data: string, mime: string): Blob {
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime || 'application/octet-stream' })
}

/** Parse + validate an external backup. Throws BackupError with a human-readable reason on any failure. */
export function parseAndValidate(input: unknown): BackupV1 {
  if (!isObj(input)) throw new BackupError('不是一个有效的备份对象')
  if (input.format !== BACKUP_FORMAT) throw new BackupError('格式不匹配：不是 dsh-eink 备份文件')
  if (input.version !== BACKUP_VERSION) throw new BackupError('版本不支持：当前仅支持 v1')
  if (!Array.isArray(input.conversations)) throw new BackupError('缺少 conversations 数组')
  if (!Array.isArray(input.annotations)) throw new BackupError('缺少 annotations 数组')
  if (!Array.isArray(input.attachments)) throw new BackupError('缺少 attachments 数组')
  const settings = isObj(input.settings) ? input.settings : {}
  for (const c of input.conversations) {
    if (!isObj(c) || !isStr(c.id)) throw new BackupError('conversation 缺少 id')
    if (!Array.isArray(c.messages)) throw new BackupError('conversation 缺少 messages 数组')
    for (const m of c.messages) { if (!isObj(m) || !isStr(m.id) || !isStr(m.content)) throw new BackupError('message 结构无效') }
  }
  for (const a of input.annotations) { if (!isObj(a) || !isStr(a.id) || !isObj(a.target)) throw new BackupError('annotation 结构无效') }
  for (const at of input.attachments) { if (!isObj(at) || !isStr(at.id) || !isObj(at.meta) || !isStr(at.meta.id) || !isStr(at.data)) throw new BackupError('attachment 结构无效') }
  return input as BackupV1
}

/** Atomic replace-restore: decode attachments then write every store in ONE readwrite transaction. */
export async function restoreBackup(backup: BackupV1): Promise<void> {
  const attachments = backup.attachments.map((at) => ({ id: at.id, meta: at.meta as Attachment, blob: base64ToBlob(at.data, at.mimeType || at.meta.mimeType) }))
  const settings = [
    { key: 'apiBaseUrl', value: backup.settings?.apiBaseUrl || 'https://api.deepseek.com' },
    { key: 'model', value: backup.settings?.model || 'deepseek-chat' },
    { key: 'customSystemPrompt', value: backup.settings?.customSystemPrompt || '' },
    { key: 'customSystemPromptEnabled', value: backup.settings?.customSystemPromptEnabled ? 'true' : 'false' },
    { key: 'apiKey', value: '' },
  ]
  await idbReplaceAll({ settings, conversations: backup.conversations, attachments, annotations: backup.annotations as Annotation[] })
}
