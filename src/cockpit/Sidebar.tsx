
import { useState } from 'react'
import { useSessions, sessionsActions, type ChatSession } from '../engine/sessions-store'
import { t } from '../engine/locale'
import { uiActions } from '../engine/ui-store'
import { Button, IconNewChatOutline16, IconSearchOutline16, Input } from '../dsh/primitives'
import { IconSettingsOutline16 } from '../dsh/primitives/icons/index.tsx'
import css from './cockpit.module.css'

export function Sidebar({ collapsed, width }: { collapsed: boolean; width: number }) {
  const sessions = useSessions(s => s.list)
  const current = useSessions(s => s.current)
  const [q, setQ] = useState('')
  const filtered = q ? sessions.filter(s => s.title.toLowerCase().includes(q.toLowerCase())) : sessions
  if (collapsed) {
    return <div className={css.sideRail} style={{ width }}>
      <Button icon={<IconNewChatOutline16 />} onClick={() => sessionsActions.newChat()} />
      <Button aria-label="设置" title="设置" icon={<IconSettingsOutline16 />} onClick={uiActions.openSettings} />
    </div>
  }
  return (
    <div className={css.sidebar} style={{ width }}>
      <div className={css.sidebarHead}>
        <div className={css.sidebarTitle}>会话</div>
        <div className={css.sidebarHeadBtns}>
          <Button aria-label="设置" title="设置" icon={<IconSettingsOutline16 />} onClick={uiActions.openSettings} />
          <Button icon={<IconNewChatOutline16 />} onClick={() => sessionsActions.newChat()}>{t('sidebar.newChat')}</Button>
        </div>
      </div>
      <div className={css.sidebarSearch}><Input icon={<IconSearchOutline16 />} value={q} onChange={e => setQ(e.target.value)} placeholder={t('sidebar.search')} /></div>
      <div className={css.sidebarList}>
        {filtered.map(s => <SessionRow key={s.id} session={s} active={s.id === current} />)}
        {filtered.length === 0 && <div className={css.sidebarEmpty}>暂无会话</div>}
      </div>
    </div>
  )
}

function SessionRow({ session, active }: { session: ChatSession; active: boolean }) {
  return (
    <button className={css.sessionRow + (active ? ' ' + css.sessionRowActive : '')} onClick={() => sessionsActions.open(session.id)}>
      <span className={css.sessionDot} data-state={active ? 'done' : 'idle'} />
      <span className={css.sessionTitle}>{session.title}</span>
      <span className={css.sessionCount}>{session.messages.length}</span>
    </button>
  )
}
