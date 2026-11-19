export type WeekId = 'w2' | 'w3' | 'w4' | 'w5' | 'w6' | 'w7'

/** docs/DESIGN.md 4절의 장면 유형 (엔진) */
export type SceneType =
  | 'sequence'
  | 'topology'
  | 'bits'
  | 'anatomy'
  | 'flow'
  | 'chart'
  | 'compare'
  | 'sandbox'
  | 'diagnose'
  | 'quiz'

export type Week = {
  id: WeekId
  no: number
  title: string
  /** 강의의 "오늘의 질문" */
  question: string
  /** Learning Objectives */
  objectives: string[]
  /** 강의자료 PDF 파일명 */
  source: string
  steps: Step[]
}

export type Step = {
  /** URL에 쓰는 id: "handshake" */
  id: string
  /** 표시 번호: "3-4" */
  no: string
  title: string
  /** 강의자료 페이지 번호 */
  slides: number[]
  scene: SceneType
  /** CURRICULUM.md의 ★ (Quick Check가 직접 다루는 Step) */
  star?: boolean
  /** 직접 해보기 지원 여부 */
  sandbox?: boolean
  /** 쉽게 보기 (비유) */
  easy?: Explain
  phases: Phase[]
  quiz?: Quiz[]
}

export type Explain = {
  title: string
  body: string
}

export type Phase = {
  /** 하단 바 라벨 (8자 이내) */
  label: string
  /** 오른쪽 패널 제목 */
  title: string
  /** 오른쪽 패널 본문 */
  body: string
  keyPoint?: string
  /** 흔한 오해 */
  pitfall?: string
  /** 실무 신호 */
  signal?: string
  /** 이 Phase만 다른 장면으로 그릴 때 (없으면 Step.scene) */
  scene?: SceneType
  /** 장면 유형별 상태 스냅샷 */
  state: unknown
}

export type Quiz = {
  q: string
  /** 없으면 주관식 (본인 말로 쓰고 → 모범답안 공개) */
  choices?: string[]
  answer: string
  why: string
}
