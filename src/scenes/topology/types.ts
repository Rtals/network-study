import type { StageNote } from '../sequence/types'

/** 노드 종류: 블록 색·아이콘·높이가 정해져 있다 (layout.ts의 NODE_STYLE) */
export type TopoNodeKind =
  | 'browser'
  | 'network'
  | 'isp'
  | 'server'
  | 'auth'
  | 'db'
  | 'attacker'
  | 'person'
  | 'gate'
  | 'desk'
  | 'card'
  | 'floor'
  | 'log'

export type TopoNode = {
  id: string
  label: string
  /** 이름 아래 작은 글씨 */
  sub?: string
  kind: TopoNodeKind
  /** 레인 위 위치 (왼쪽 아래 → 오른쪽 위). sequence와 같은 레인 좌표 */
  t: number
  /** 레인에 수직인 오프셋 (+ = 화면 오른쪽 아래) */
  side?: number
}

/** 연결선. danger면 빨간 점선 (공격자 쪽으로 새는 길 등) */
export type TopoLink = {
  from: string
  to: string
  style?: 'normal' | 'danger'
  /** 양쪽 화살촉 (기본: normal은 양쪽, danger는 한쪽) */
  both?: boolean
}

/**
 * 알약 색의 뜻.
 * threat 빨강(공격) · defense 연두(방어) · term 연보라(웹 용어) · warn 호박(빠진 장치) · info 종이색
 * threat·term·warn·info는 블록 위에 쌓이고, defense는 블록 오른쪽 아래에 쌓인다.
 */
export type TagTone = 'threat' | 'defense' | 'term' | 'warn' | 'info'
export type TopoTag = { node: string; text: string; tone: TagTone }

/** 흐름 색: 요청 연두 · 응답 살구 · 위험(유출·남의 데이터) 빨강 */
export type FlowTone = 'request' | 'response' | 'danger'

/** 재생 순서의 한 칸 */
export type TopoBeat =
  /** 패킷이 path의 노드들을 차례로 지나간다. 지나는 노드 안에서는 잠깐 사라졌다 나온다 */
  | { kind: 'flow'; id: string; path: string[]; label: string; detail?: string; tone?: FlowTone }
  /** 한 노드에 알약을 차례로 붙인다 */
  | { kind: 'tags'; id: string; tags: TopoTag[] }
  /** 노드들(레인 위 이웃한 노드 하나 이상) 둘레 바닥에 점선 구역을 그린다 (예: TLS가 지키는 구간) */
  | { kind: 'zone'; id: string; nodes: string[]; label: string }

export type TopologyState = {
  kind: 'topology'
  nodes: TopoNode[]
  links: TopoLink[]
  /** Phase 시작부터 붙어 있는 알약 (앞 Phase에서 이어지는 것) */
  tags?: TopoTag[]
  beats: TopoBeat[]
  /** 무대 왼쪽 위 설명 칩. after = beat id (그 비트가 끝나면 등장, 읽을 시간만큼 쉰다) */
  notes?: StageNote[]
}

export function isTopologyState(s: unknown): s is TopologyState {
  return typeof s === 'object' && s !== null && (s as { kind?: unknown }).kind === 'topology'
}
