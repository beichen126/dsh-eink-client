
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
    const root = document.documentElement
    let focused = false
    let lastInset = -1
    let poll: ReturnType<typeof setInterval> | undefined
    const measure = (): number => {
      // Keyboard height among the ways a device may report it. Focus is the trigger;
      // we poll while focused because many e-ink/embedded browsers shrink the visual
      // viewport for the keyboard WITHOUT firing a resize event.
      const vv = window.visualViewport
      const vvH = vv ? vv.height : window.innerHeight
      const vvInset = Math.max(0, window.innerHeight - vvH)
      const docInset = Math.max(0, window.innerHeight - document.documentElement.clientHeight)
      // docInset can be a ~15px scrollbar diff on desktop; only treat as a keyboard when meaningful.
      return Math.max(vvInset, docInset > 24 ? docInset : 0)
    }
    const apply = (): void => {
      const inset = focused ? measure() : 0
      if (inset !== lastInset) { lastInset = inset; root.style.setProperty('--dsw-keyboard-inset', inset + 'px') }
    }
    const isEditable = (t: any): boolean => !!(t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable))
    const startPoll = () => { if (!poll) poll = setInterval(apply, 120) }
    const stopPoll = () => { if (poll) { clearInterval(poll); poll = undefined } }
    const onFocusIn = (e: Event) => { if (isEditable(e.target)) { focused = true; apply(); startPoll() } }
    const onFocusOut = (e: Event) => { if (isEditable(e.target)) { focused = false; apply(); stopPoll() } }
    const onResize = () => { if (focused) apply() }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    window.visualViewport?.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      window.visualViewport?.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      stopPoll()
    }
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