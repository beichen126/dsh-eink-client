import { useEffect, useState } from 'react'
import { useSessions, sessionsActions, type ChatSession } from '../engine/sessions-store'
import { t } from '../engine/locale'
import { uiActions } from '../engine/ui-store'
import { galleryActions } from '../gallery/gallery-store'
import { NEW_TITLE } from '../engine/types'
import { Button, IconNewChatOutline16, IconSearchOutline16, IconSettingsOutline16, Input } from '../dsh/primitives'
import css from './cockpit.module.css'

function displayTitle(s: ChatSession): string {
  if (s.title && s.title !== NEW_TITLE) return s.title
  const first = s.messages.find((m: any) => m.role === 'user')
  if (!first) return '新会话'
  const raw = String(first.content || '')
  const stripped = raw.replace(/[*_~\[\]()#>]/g, '').replace(/\s+/g, ' ').trim()
  if (!stripped) return (first.images && first.images.length) ? '图片对话' : NEW_TITLE
  return stripped.length > 24 ? stripped.slice(0, 24) + '…' : stripped
}
function useFullscreen() {
  const [fs, setFs] = useState(false)
  useEffect(() => { const on = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', on); return () => document.removeEventListener('fullscreenchange', on) }, [])
  const toggle = () => { const el = document.documentElement as any; if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}) } else if (el && el.requestFullscreen) { const p = el.requestFullscreen({ navigationUI: 'hide' }); if (p && p.catch) p.catch(() => { el.requestFullscreen().catch(() => {}) }) } }
  return { fs, toggle }
}

export function Sidebar({ collapsed, width }: { collapsed: boolean; width: number }) {
  const sessions = useSessions(s => s.list)
  const current = useSessions(s => s.current)
  const currentConv = useSessions(s => s.byId[s.current || ''])
  const status = useSessions(s => s.status)
  const busy = status === 'sending' || status === 'streaming'
  const [q, setQ] = useState('')
  const { fs, toggle } = useFullscreen()
  const filtered = q ? sessions.filter(s => s.title.toLowerCase().includes(q.toLowerCase())) : sessions
  const fsTitle = fs ? '退出全屏' : '全屏'
  if (collapsed) {
    return <div className={css.sideRail} style={{ width }}>
      <Button aria-label="新建会话" title="新建会话" icon={<IconNewChatOutline16 />} onClick={() => sessionsActions.newChat()} />
      <Button aria-label="全屏" title={fsTitle} onClick={toggle}><span className={css.railText}>全</span></Button>
      <Button aria-label="设置" title="设置" icon={<IconSettingsOutline16 />} onClick={uiActions.openSettings} />
    </div>
  }
  return (
    <div className={css.sidebar} style={{ width }}>
      <div className={css.sidebarHead}>
        <div className={css.sidebarTitle}>会话</div>
        <div className={css.sidebarHeadBtns}>
          <Button onClick={() => galleryActions.open(currentConv?.id, 0)}>资料</Button>
          <Button icon={<IconSettingsOutline16 />} onClick={uiActions.openSettings} />
          <Button onClick={toggle}>{fsTitle}</Button>
          <Button icon={<IconNewChatOutline16 />} onClick={() => sessionsActions.newChat()}>{t('sidebar.newChat')}</Button>
        </div>
      </div>
      <div className={css.sidebarSearch}><Input icon={<IconSearchOutline16 />} value={q} onChange={e => setQ(e.target.value)} placeholder={t('sidebar.search')} /></div>
      <div className={css.sidebarList}>
        {filtered.map(s => <SessionRow key={s.id} session={s} active={s.id === current} busy={busy} />)}
        {filtered.length === 0 && <div className={css.sidebarEmpty}>暂无会话</div>}
      </div>
    </div>
  )
}

function SessionRow({ session, active, busy }: { session: ChatSession; active: boolean; busy: boolean }) {
  const [confirming, setConfirming] = useState(false)
  const doDelete = () => { if (confirming) { sessionsActions.remove(session.id); setConfirming(false) } else setConfirming(true) }
  const onOpen = () => { if (busy) { window.alert('正在生成，请先停止生成'); return } sessionsActions.open(session.id) }
  return (
    <div className={css.sessionRowWrap + (active ? ' ' + css.sessionRowWrapActive : '')}>
      <button className={css.sessionRow} onClick={onOpen}>
        <span className={css.sessionDot} data-state={active ? 'done' : 'idle'} />
        <span className={css.sessionTitle}>{displayTitle(session)}</span>
        <span className={css.sessionCount}>{session.messages.length}</span>
      </button>
      <button className={css.rowMenu} title="操作" onClick={doDelete}><span className={css.rowMenuDots}>⋯</span></button>
      {confirming && <div className={css.rowConfirm}><span>删除这个会话？</span><button onClick={doDelete}>删除</button><button onClick={() => setConfirming(false)}>取消</button></div>}
    </div>
  )
}