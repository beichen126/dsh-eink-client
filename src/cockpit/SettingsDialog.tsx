
import { useState } from 'react'
import { useSettings, saveSettings, DEFAULT_SETTINGS } from '../engine/settings-store'
import { testConnection } from '../api/deepseek'
import { uiActions } from '../engine/ui-store'
import { Modal, Button, Input } from '../dsh/primitives'
import css from './cockpit.module.css'

export function SettingsDialog() {
  const s = useSettings(x => x)
  const [base, setBase] = useState(s.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl)
  const [key, setKey] = useState(s.apiKey)
  const [model, setModel] = useState(s.model || DEFAULT_SETTINGS.model)
  const [test, setTest] = useState<string | null>(null)
  const [testOk, setTestOk] = useState<boolean | null>(null)
  const [saved, setSaved] = useState(false)

  const onSave = async () => { await saveSettings({ apiBaseUrl: base.trim(), apiKey: key.trim(), model: model.trim() }); setSaved(true); setTimeout(() => setSaved(false), 1500) }
  const onTest = async () => {
    setTest('正在测试…'); setTestOk(null)
    const r = await testConnection({ apiKey: key.trim(), baseUrl: base.trim(), model: model.trim(), messages: [{ role: 'user', content: 'ping' }] })
    setTest(r.label); setTestOk(r.ok)
  }

  return (
    <Modal open onClose={uiActions.closeSettings} title="API 设置" closeLabel="关闭">
      <div className={css.field}><label>API Base URL</label><Input className={css.fieldInput} value={base} onChange={e => setBase(e.target.value)} placeholder={DEFAULT_SETTINGS.apiBaseUrl} /></div>
      <div className={css.field}><label>API Key</label><Input className={css.fieldInput} type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="sk-..." /></div>
      <div className={css.field}><label>Model</label><Input className={css.fieldInput} value={model} onChange={e => setModel(e.target.value)} placeholder="deepseek-chat" /></div>
      <div className={css.settingsHint}>API Key 仅保存在本机 IndexedDB，不进源码、不走 Git。</div>
      <div className={css.settingsActions}>
        <Button variant="outline" onClick={onTest}>{test ?? '测试连接'}</Button>
        <Button variant="primary" onClick={onSave}>{saved ? '已保存' : '保存'}</Button>
      </div>
      {test && <div className={css.testResult} data-ok={testOk === undefined ? undefined : String(testOk)}>{test}</div>}
    </Modal>
  )
}
