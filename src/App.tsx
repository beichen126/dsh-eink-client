
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AppFrame } from './dsh/layout/AppFrame'
import { useSessions, initStore } from './engine/sessions-store'
import { initSettings } from './engine/settings-store'
import { useUi } from './engine/ui-store'
import { layoutStore, useLayoutStore } from './engine/layout-store'
import { SessionProvider } from './engine/session-context'
import { t } from './engine/locale'
import { Sidebar } from './cockpit/Sidebar'
import { Conversation } from './cockpit/Conversation'
import { SettingsDialog } from './cockpit/SettingsDialog'
import { Gallery } from './gallery/Gallery'

function renderSlot(key: string, owner?: any): ReactNode {
  if (key === 'sidebar') return <Sidebar collapsed={!!owner?.collapsed} width={owner?.width ?? 0} />
  if (key === 'conversation') return <Conversation />
  return null
}

function useKeyboardInset(): void {
  useEffect(() => {
    const setInset = () => {
      const vv = window.visualViewport
      const inset = vv ? Math.max(0, window.innerHeight - vv.height) : 0
      document.documentElement.style.setProperty('--dsw-keyboard-inset', inset + 'px')
    }
    setInset()
    if (window.visualViewport) window.visualViewport.addEventListener('resize', setInset)
    else window.addEventListener('resize', setInset)
    window.addEventListener('orientationchange', setInset)
    return () => { if (window.visualViewport) window.visualViewport.removeEventListener('resize', setInset); else window.removeEventListener('resize', setInset); window.removeEventListener('orientationchange', setInset) }
  }, [])
}

export function App() {
  useKeyboardInset()
  const ready = useSessions(s => s.ready)
  const settingsOpen = useUi(s => s.settingsOpen)
  useEffect(() => { void (async () => { await initSettings(); await initStore() })() }, [])
  if (!ready) {
    return (
      <div className="eink-boot">
        <div className="eink-boot-card">
          <div className="eink-boot-title">{t('brand.localBuild')}</div>
          <div className="eink-boot-hint">正在载入本地会话…</div>
        </div>
      </div>
    )
  }
  return (
    <>
      <AppFrame
        useStore={useLayoutStore as any}
        useSessions={useSessions as any}
        actions={layoutStore.actions as any}
        renderSlot={renderSlot as any}
        SessionProvider={SessionProvider as any}
        t={t as any}
      />
      {settingsOpen && <SettingsDialog />}
      <Gallery />
    </>
  )
}