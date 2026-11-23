import type { Transition } from 'motion/react'

/** 무대 글꼴: 고정폭 (한글은 Noto Sans KR로 대체) */
export const SANS = "'JetBrains Mono', 'Noto Sans KR', ui-monospace, monospace"
export const MONO = SANS

/** 선 그림의 외곽선 색 */
export const INK = '#211e1b'
/** 오브젝트 바깥 테두리 */
export const STROKE = 3
/** 안쪽 모서리와 세부선 */
export const STROKE_INNER = 1.2
/** 글자 상자 밑의 단단한 그림자 색 */
export const DROP = '#1c1a17'

/** 기기 그림 배율. 블록 크기(EXTENT)는 배율 적용 전 */
export const DEVICE_SCALE = 1

/** 기기 블록 한 변 (월드) */
export const TILE = 92
/** 클라이언트 블록 크기 (바닥 중심 기준, 경계 계산용) */
export const PC_EXTENT = { x0: -TILE / 2, x1: TILE / 2, y0: -TILE / 2, y1: TILE / 2, h: 64 }
/** 서버 블록 크기 */
export const SERVER_EXTENT = { x0: -TILE / 2, x1: TILE / 2, y0: -TILE / 2, y1: TILE / 2, h: 80 }

/**
 * 무대 위 글자 상자(이름표·상태 표지판·말풍선·막대 이름표)의 공통 모양.
 * 모든 장면이 이 값만 쓴다: 얇은 테두리, 같은 둥글기, 반투명 배경, 같은 글자 크기.
 */
export const TAG = {
  /** 테두리 두께 (오브젝트 외곽선보다 얇게) */
  STROKE: 1.6,
  /** 알약 모양 상자의 단단한 그림자 (아래로) */
  DROP: 3,
  R: 12,
  /** 배경 불투명도 */
  FILL_OPACITY: 0.94,
  FONT: 16,
  MONO: 14,
  H: 32,
  PAD: 14,
  /** 꼬리 길이 */
  TAIL: 10,
}

/** 공통 감속 곡선: 빠르게 출발해 부드럽게 멈춘다 */
export const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1]
/** 등장 애니메이션 (모든 상자·표지·패킷이 같은 속도와 감속을 쓴다) */
export const ENTER: Transition = { duration: 0.36, ease: EASE }

/**
 * 패킷이 화면 위를 움직이는 속도 (viewBox 단위 / ms). 도착하면 블록 안으로 사라지는 장면(topology)이 모두 같은 속도로 움직인다.
 * 도착 뒤에도 패킷이 남아 있는 sequence 장면(3-4, 6-6)은 고정 시간(sequence/timeline.ts의 TRAVEL_MS)을 쓴다.
 * 기준: 6-4 1단계(지문)에서 입력 → SHA-256 한 칸(화면 약 136px)을 0.65초에 건너는 속도.
 * 이동 시간 = 화면 거리 ÷ FLOW_SPEED (topology/layout.ts의 flowMs)
 */
export const FLOW_SPEED = 0.21
/** 패킷이 블록 안을 지나는(보이지 않는) 구간은 이만큼의 거리로 친다 */
export const HIDDEN_HOP_PX = 60
