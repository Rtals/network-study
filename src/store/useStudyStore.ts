import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Mode = 'follow' | 'sandbox'
export type PanelTab = 'explain' | 'easy' | 'quiz'
export const SPEEDS = [0.5, 1, 2] as const
export type Speed = (typeof SPEEDS)[number]

type StudyState = {
  /** 따라가기 / 직접 해보기 */
  mode: Mode
  setMode: (mode: Mode) => void
  playing: boolean
  setPlaying: (playing: boolean) => void
  speed: Speed
  cycleSpeed: () => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  /** 사용자가 직접 펼치거나 접은 Week. 없으면 현재 Week만 펼친다. */
  expandedWeeks: Record<string, boolean>
  setWeekExpanded: (weekId: string, open: boolean) => void
  panelTab: PanelTab
  setPanelTab: (tab: PanelTab) => void
  /** 직접 해보기 모드의 이벤트 로그 */
  eventLog: string[]
  pushEvent: (message: string) => void
  clearEvents: () => void
  /** Step에 들어올 때 Step 단위 상태를 초기화 */
  enterStep: () => void
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set) => ({
      mode: 'follow',
      setMode: (mode) => set({ mode, playing: false }),
      playing: false,
      setPlaying: (playing) => set({ playing }),
      speed: 1,
      cycleSpeed: () =>
        set((s) => ({ speed: SPEEDS[(SPEEDS.indexOf(s.speed) + 1) % SPEEDS.length] })),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      expandedWeeks: {},
      setWeekExpanded: (weekId, open) =>
        set((s) => ({ expandedWeeks: { ...s.expandedWeeks, [weekId]: open } })),
      panelTab: 'explain',
      setPanelTab: (panelTab) => set({ panelTab }),
      eventLog: [],
      pushEvent: (message) => set((s) => ({ eventLog: [...s.eventLog, message] })),
      clearEvents: () => set({ eventLog: [] }),
      enterStep: () => set({ mode: 'follow', playing: false, panelTab: 'explain', eventLog: [] }),
    }),
    {
      name: 'network-study:v1',
      storage: createJSONStorage(() => localStorage),
      // v1: 진도(완료 체크) 기능을 없애면서 저장된 completed를 버린다
      version: 1,
      migrate: (persisted) => {
        const { completed: _drop, ...rest } = (persisted ?? {}) as Record<string, unknown>
        void _drop
        return rest as Partial<StudyState>
      },
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        speed: s.speed,
        expandedWeeks: s.expandedWeeks,
      }),
    },
  ),
)
