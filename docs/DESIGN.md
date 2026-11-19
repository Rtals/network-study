# 네트워크설계및구조 인터랙티브 학습 사이트 — 초기 설계

> 목표: 정적인 강의자료(Week 2–7, PDF 6개)를 "한 단계씩 넘기며 보는 애니메이션 + 직접 조작"으로 바꿔서, 시험 범위 개념을 직관적으로 이해하고 오래 기억한다.
> 참고: https://designed-to-scale.vercel.app (레슨/단계 단위 애니메이션 다이어그램)

---

## 1. 정보 구조 (3단 계층)

| 계층 | 이름 | 예시 | 표시 위치 |
|---|---|---|---|
| 대단계 | **Week** | W3 · TCP, UDP & Socket | 왼쪽 사이드바 (아코디언 헤더) |
| 소단계 | **Step** | 3-4 · 3-Way Handshake | 왼쪽 사이드바 (Week 아래 목록) |
| 진행 순서 | **Phase** | SYN → SYN+ACK → ACK → 데이터 | 중앙 하단 진행 바 |

- Week = 강의자료 PDF 1개. Step = 강의자료 안의 내용 묶음(슬라이드 1~6장). Phase = 그 Step의 애니메이션/UI가 진행되는 한 컷.
- 전체 Step 목록과 슬라이드 매핑은 `docs/CURRICULUM.md` 참고.

### URL
```
/#/w3                     → Week 개요 (Step 목록 + 학습 목표)
/#/w3/handshake           → Step 첫 Phase
/#/w3/handshake/3         → Step의 3번째 Phase
```
새로고침해도, 링크를 공유해도 같은 화면이 나와야 한다.

---

## 2. 화면 레이아웃

```
┌──────────────┬──────────────────────────────────────────┬──────────────────┐
│ 사이드바       │ 헤더: W3 › 3-4 3-Way Handshake    [따라가기|직접 해보기] │ 상세 설명          │
│ 260px        │                                          │ 360px            │
│              │                                          │                  │
│ ▸ W2 IP      │                                          │ ② SYN + ACK      │
│ ▾ W3 TCP/UDP │                                          │                  │
│   3-2 TCP/UDP │           중앙 무대 (Stage)              │ 본문 2~5문장       │
│   3-3 연결=상태│        SVG 애니메이션 / 인터랙티브 UI       │                  │
│  [3-4 핸드셰이크]│                                       │ ┌ 핵심 포인트 ┐    │
│   3-5 Seq/ACK│                                         │ └────────────┘    │
│   ...        │                                          │ ⚠ 흔한 오해         │
│ ▸ W4 DNS/HTTP│                                          │ 📄 W3 p.10–11     │
│ ▸ W5 REST    ├──────────────────────────────────────────┤                  │
│ ▸ W6 Security│ ●───●───○───○───○   ② SYN+ACK  2 / 5      │ [설명|쉽게 보기|퀴즈]│
│ ▸ W7 실시간    │ ◀  ⏯  ▶   1x   ↺                          │                  │
└──────────────┴──────────────────────────────────────────┴──────────────────┘
```

### 2-1. 왼쪽 사이드바 (Step 목록)
- Week 아코디언. 현재 Week는 펼쳐 둔다.
- Step 항목: 번호 + 짧은 제목 + ★(시험 우선). 현재 Step만 배경색으로 강조한다.
- 맨 아래: "Quick Check 모아보기", "오답 노트".
- **진도율·완료 체크는 넣지 않는다.** 이 사이트는 진도를 채우며 공부하는 도구가 아니라, 필요할 때 어려운 개념을 찾아 들어가 애니메이션·인터랙티브 UI로 이해하는 도구다. (Week 개요에도 진도 표시 없음)
- 접기 버튼(아이콘만 남김) → 중앙 무대를 넓게.

### 2-2. 중앙 무대 (Stage)
- 장면 유형(아래 4절) 중 하나를 렌더링한다. SVG 기반, 가로세로 비율 고정(16:10), 반응형으로 확대/축소.
- **두 가지 모드**
  - **따라가기**: 미리 짜인 Phase를 순서대로 재생. 하단 진행 바와 연동.
  - **직접 해보기**: 사용자가 값을 바꾸거나 패킷을 클릭해 손실시키는 등 자유롭게 조작. 이때 하단 바는 Phase 대신 **이벤트 로그**(예: `SYN 손실 → RTO 1s 대기 → 재전송`)를 보여 준다.
  - 직접 해보기가 의미 없는 Step(순수 개념)은 토글을 숨긴다.

### 2-3. 하단 진행 바 (Phase 표시, 높이 ~72px)
- Phase 점(●○)과 짧은 라벨(8자 이내), `현재 / 전체` 표시.
- 컨트롤: ◀ 이전, ⏯ 자동재생, ▶ 다음, 속도(0.5x/1x/2x), ↺ 처음부터.
- 마지막 Phase에서 ▶ → "다음 Step으로" 버튼으로 바뀐다.
- 키보드: `←/→` Phase, `[` / `]` Step, `Space` 재생/정지.

### 2-4. 오른쪽 상세 설명 패널
- 현재 **Phase에 연동**해서 내용이 바뀐다.
- 구성
  1. Phase 제목
  2. 본문 (2~5문장, 강의자료 기반)
  3. 핵심 포인트 박스 (강의의 "핵심:" 문장)
  4. ⚠ 흔한 오해 / 실무 신호 (강의의 "오해 vs 실제", "실무 신호" 문장)
  5. 📄 출처 칩: `W3 p.10–11` (클릭하면 해당 페이지 이미지 미리보기, 선택 사항)
- 탭: **설명** | **쉽게 보기** (강의의 "쉽게 보기" 비유 슬라이드가 있는 Step만) | **퀴즈** (Step 마지막에 체크 질문)
- 1024px 미만에서는 오른쪽 패널을 드로어로 바꾼다. (데스크톱 학습이 기본이고, 모바일은 보기만 가능하면 충분)

---

## 3. 데이터 모델 — 콘텐츠와 렌더러를 분리한다

핵심 원칙: **Phase = 화면 상태 스냅샷**, **애니메이션 = 두 스냅샷 사이의 전환**.
레슨을 추가할 때 컴포넌트 코드를 새로 짜지 않고 데이터만 쓰는 구조를 목표로 한다.

```ts
// src/content/types.ts
export type Week = {
  id: 'w2' | 'w3' | 'w4' | 'w5' | 'w6' | 'w7';
  no: number;
  title: string;           // "TCP, UDP & Socket"
  question: string;        // 강의의 "오늘의 질문"
  objectives: string[];    // Learning Objectives
  source: string;          // PDF 파일명
  steps: Step[];
};

export type Step = {
  id: string;              // "handshake"
  no: string;              // "3-4"
  title: string;
  slides: number[];        // 강의자료 페이지 [10, 11]
  scene: SceneType;        // 아래 4절
  sandbox?: boolean;       // 직접 해보기 지원 여부
  easy?: Explain;          // 쉽게 보기 (비유)
  phases: Phase[];
  quiz?: Quiz[];
};

export type Phase = {
  label: string;           // 하단 바 라벨: "SYN+ACK"
  title: string;           // 오른쪽 패널 제목
  body: string;            // 오른쪽 패널 본문 (markdown)
  keyPoint?: string;
  pitfall?: string;
  state: unknown;          // 장면 유형별 상태 (SequenceState, TopologyState ...)
};

export type Quiz = {
  q: string;
  choices?: string[];      // 없으면 주관식(본인 말로 쓰고 → 모범답안 공개)
  answer: string;
  why: string;
};
```

---

## 4. 장면 유형 (재사용 컴포넌트 = "엔진")

강의자료 6개를 분석해 보면 시각 자료가 거의 다음 유형으로 수렴한다. 이것들을 먼저 탄탄하게 만들어 두면 나머지는 데이터 작업이다.

| 유형 | 설명 | 주 사용처 |
|---|---|---|
| `sequence` | **시퀀스(래더) 다이어그램**. 세로 생명선 2~4개, 메시지 화살표가 순서대로 날아감, 양옆에 상태 라벨(SYN_SENT 등), 메시지 클릭 시 손실 처리 | 3-way/4-way, DHCP, DNS 질의, TLS, CORS Preflight, 로그인, OAuth, WebSocket, MQTT QoS |
| `topology` | **네트워크 토폴로지**. 노드(PC·스위치·라우터·서버·브로커)·링크·이동하는 패킷. 패킷에 헤더 라벨, 노드에 표(NAT/ARP/라우팅 테이블) 부착 | 라우팅, Hop별 MAC/IP, NAT, ARP, Mux/Demux, MQTT, WebRTC |
| `bits` | **비트/주소 계산기**. 10진↔2진, prefix 슬라이더, AND 연산 애니메이션, 주소 범위 띠 | Subnet, CIDR, Broadcast, 서브넷 분할 |
| `anatomy` | **해부도**. 구조화된 텍스트/필드에 마우스를 올리면 의미 강조 | URL, HTTP 메시지, TCP/UDP 헤더, JWT, WS Frame, dig 출력, 코드 |
| `flow` | **파이프라인/플로차트/상태도**. 박스와 화살표, 현재 단계 강조 | URL 입력 후 과정, Backend 요청 경로, TCP 상태 전이도, 상태코드 결정 트리 |
| `chart` | **그래프 시뮬레이터**. 파라미터를 바꾸면 그래프가 실시간으로 변화 | cwnd(Slow Start/AIMD), Polling 비용, 메시지당 바이트, 연결 비용 |
| `compare` | **나란히 비교**. 같은 시나리오를 두 방식으로 동시 재생 | TCP vs UDP, HTTP/1.1 vs 2 vs 3, Session vs JWT, Mesh/SFU/MCU |
| `sandbox` | **전용 플레이그라운드**. 입력하면 결과가 바뀌는 맞춤형 UI | bind 주소 시뮬레이터, CORS 요청 빌더, Origin 비교기, Wildcard 매칭, 공격 실습실 |
| `diagnose` | **진단 시뮬레이터**. 증상/오류 메시지를 고르면 의심 계층과 확인 명령을 강조 | 매주 나오는 "증상 → 원인 매핑", "Troubleshooting Ladder" |
| `quiz` | Quick Check 전용 화면 | 매주 마지막 Step |

### 시각 규칙 (모든 Week 공통)
계층·프로토콜마다 색을 고정하면 주차가 바뀌어도 같은 시각 언어로 읽힌다.

| 대상 | 색 | 대상 | 색 |
|---|---|---|---|
| L2 / MAC | 회색 | HTTP | 보라 |
| L3 / IP | 파랑 | TLS / 암호화 | 금색 + 자물쇠 아이콘 |
| TCP | 초록 | DNS | 청록 |
| UDP | 주황 | 손실 / 오류 / 차단 | 빨강 + ✕ |

- 패킷은 둥근 사각형 + 라벨(`SYN seq=x`). 손실되면 빨간 ✕ 후 페이드아웃.
- 상태 라벨은 모노스페이스 폰트(`ESTABLISHED`).
- 애니메이션 기본 길이 600ms. 자동재생 시 Phase 사이 1.5초 쉼.

---

## 5. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 빌드 | Vite + React + TypeScript | Claude Code가 가장 안정적으로 다루는 조합 |
| 스타일 | Tailwind CSS | 3단 레이아웃을 빠르게 구성 |
| 애니메이션 | SVG + Motion (구 Framer Motion) | 상태 스냅샷 사이의 전환을 선언적으로 처리, 디버깅 쉬움 |
| 라우팅 | React Router (HashRouter) | `/#/w3/handshake/3` 구조, 정적 배포 호환 |
| 상태 | Zustand | 현재 Week/Step/Phase, 모드, 재생 상태 |
| 저장 | localStorage | 화면 설정(사이드바 접힘, 재생 속도), 퀴즈 결과, 오답. 백엔드 없음 |
| 차트 | 직접 SVG 또는 Recharts | `chart` 유형용 |
| 배포 | Vercel (정적) | 참고 사이트와 동일 |

---

## 6. 폴더 구조

```
network-study-site/
├── CLAUDE.md
├── docs/
│   ├── DESIGN.md            # 이 문서
│   ├── CURRICULUM.md        # Week → Step → Phase 전체 목록
│   └── lectures/            # 강의자료 PDF 6개 (Claude Code가 직접 읽음)
├── src/
│   ├── app/                 # 라우팅, 레이아웃 셸
│   ├── components/
│   │   ├── layout/          # Sidebar, Stage, PhaseBar, DetailPanel
│   │   └── ui/              # 버튼, 탭, 칩 등
│   ├── scenes/              # 장면 유형별 렌더러 (엔진)
│   │   ├── sequence/
│   │   ├── topology/
│   │   ├── bits/
│   │   ├── anatomy/
│   │   ├── flow/
│   │   ├── chart/
│   │   ├── compare/
│   │   ├── diagnose/
│   │   └── sandbox/         # Step 전용 플레이그라운드들
│   ├── content/
│   │   ├── types.ts
│   │   ├── w2/ … w7/        # Week별 Step 데이터 (.ts)
│   │   └── index.ts
│   ├── store/               # Zustand
│   └── lib/                 # 비트 계산, 내비게이션 등 순수 함수
└── public/slides/           # (선택) 출처 칩 미리보기용 페이지 이미지
```

---

## 7. 개발 순서 (마일스톤)

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| **M0** 셸 | 3단 레이아웃 + 하단 진행 바 + 라우팅 + 더미 데이터 | URL로 Week/Step/Phase 이동, 키보드 조작 동작 |
| **M1** 수직 슬라이스 | `sequence` 엔진 + **3-4 3-Way Handshake** 1개 완성 | 사이드바 → 무대 → 하단 바 → 오른쪽 패널이 모두 연동되고, 직접 해보기에서 SYN 손실 가능 |
| **M2** W3 완성 | `chart`, `anatomy`, `flow`, `compare`, `diagnose` 엔진 추가 | W3 전 Step 동작. 이 시점에 엔진 API 확정 |
| **M3** W2 | `topology`, `bits` 엔진 + W2 전 Step | 서브넷 계산기 정확도 검증(단위 테스트) |
| **M4** W4·W5 | 대부분 기존 엔진 재사용 + `sandbox`(CORS 빌더, Origin 비교기) | |
| **M5** W6·W7 | `sandbox`(공격 실습실, Wildcard 매칭) | |
| **M6** 마무리 | Quick Check, 오답 노트, Vercel 배포 | |

시험이 가깝다면 M1 이후에는 **시험 중요도가 높은 Step부터** 채운다 (CURRICULUM.md의 ★ 표시).
레슨을 다 만들지 못해도 각 Week의 ★ Step만 있으면 공부 도구로 바로 쓸 수 있다.

---

## 8. Claude Code에 일을 시키는 방법

1. 프로젝트 루트에 `CLAUDE.md`, `docs/`를 두고 `docs/lectures/`에 PDF 6개를 복사한다.
2. **한 번에 한 마일스톤씩** 요청한다. 예시 프롬프트:

```
M0을 진행해줘. docs/DESIGN.md의 2절 레이아웃과 3절 데이터 모델을 따르고,
content/w3에 Phase 3개짜리 더미 Step 2개만 넣어서 셸이 동작하는지 확인할 수 있게 해줘.
끝나면 실행 방법과 확인할 항목을 알려줘.
```

```
M1을 진행해줘. scenes/sequence 엔진을 만들고 CURRICULUM.md의 3-4 Step을 구현해.
오른쪽 패널 내용은 docs/lectures의 Week03 PDF p.10–11을 읽고 작성하되,
강의자료에 없는 내용은 넣지 말고 각 Phase에 출처 페이지를 달아줘.
```

```
CURRICULUM.md의 3-9 Step 데이터를 작성해줘. 먼저 Phase 목록과 각 Phase의
오른쪽 패널 초안을 보여주고, 내가 확인한 다음에 코드로 옮겨줘.
```

3. Step 데이터를 쓰기 전에 **Phase 목록을 먼저 텍스트로 확인**하는 습관을 들인다. 애니메이션 수정보다 텍스트 수정이 훨씬 싸다.
4. 계산이 들어가는 부분(서브넷, Seq/ACK 번호, BDP, Polling 비용)은 `lib/`에 순수 함수로 두고 **단위 테스트**를 같이 요청한다. 틀린 숫자로 공부하면 안 되니까.