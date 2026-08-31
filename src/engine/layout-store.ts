
import { createStore, useStore } from './store'
import { SIDEBAR_DEFAULT, SIDEBAR_MIN, SIDEBAR_MAX, DETAILS_DEFAULT, DETAILS_MIN, DETAILS_MAX, clampWidth } from '../dsh/layout/columns'
export type LayoutState = { sidebar: number; details: number; narrow: boolean; narrowExpanded: boolean }
export const layoutStore = createStore<LayoutState>(() => ({ sidebar: SIDEBAR_DEFAULT, details: 0, narrow: false, narrowExpanded: false }), {
  setSidebar: (d, px) => ({ ...d, sidebar: clampWidth(px, SIDEBAR_MIN, SIDEBAR_MAX) }),
  setDetails: (d, px) => ({ ...d, details: clampWidth(px, DETAILS_MIN, DETAILS_MAX) }),
  toggleSidebar: (d) => ({ ...d, sidebar: d.sidebar === 0 ? SIDEBAR_DEFAULT : 0 }),
  setNarrow: (d, narrow) => ({ ...d, narrow, narrowExpanded: narrow ? d.narrowExpanded : false }),
  openDetails: (d) => ({ ...d, details: d.details === 0 ? DETAILS_DEFAULT : d.details }),
  closeDetails: (d) => ({ ...d, details: 0 }),
})
export function useLayoutStore<T>(sel: (s: LayoutState) => T): T { return useStore(layoutStore, sel) }
