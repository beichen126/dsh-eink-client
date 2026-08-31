import { useSyncExternalStore } from 'react'
import { getSetting, setSetting } from '../storage/storage'

export type Settings = { apiBaseUrl: string; apiKey: string; model: string }
export const DEFAULT_SETTINGS: Settings = { apiBaseUrl: 'https://api.deepseek.com', apiKey: '', model: 'deepseek-chat' }

let state: Settings = { ...DEFAULT_SETTINGS }
const subs = new Set<() => void>()
function set(next: Settings) { state = next; subs.forEach(f => f()) }
function useSettings<T>(sel: (s: Settings) => T): T { return useSyncExternalStore(fn => { subs.add(fn); return () => { subs.delete(fn) } }, () => sel(state)) }
export function getSettingsSnapshot(): Settings { return state }
export async function initSettings(): Promise<void> {
  const [base, key, model] = await Promise.all([getSetting('apiBaseUrl'), getSetting('apiKey'), getSetting('model')])
  set({ apiBaseUrl: base || DEFAULT_SETTINGS.apiBaseUrl, apiKey: key || '', model: model || DEFAULT_SETTINGS.model })
}
export async function saveSettings(next: Settings): Promise<void> {
  set(next)
  await Promise.all([setSetting('apiBaseUrl', next.apiBaseUrl), setSetting('apiKey', next.apiKey), setSetting('model', next.model)])
}
export { useSettings }
