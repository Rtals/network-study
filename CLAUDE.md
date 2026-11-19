# CLAUDE.md — 네트워크설계및구조 인터랙티브 학습 사이트

## 프로젝트 목적
대학 전공 과목 "네트워크 구조 및 설계"(Network Architecture & Design for AI Systems)의 강의자료 6개(Week 2–7)를
단계별 애니메이션과 인터랙티브 UI로 바꾼 학습용 웹사이트. 사용자는 이 과목을 수강하는 학생이고, 목표는 시험 대비와 개념 이해다.

## 먼저 읽을 문서
- `docs/DESIGN.md` — 정보 구조, 화면 레이아웃, 데이터 모델, 장면 유형(엔진), 기술 스택, 마일스톤
- `docs/CURRICULUM.md` — Week → Step → Phase 전체 목록과 강의자료 페이지 매핑
- `docs/lectures/*.pdf` — 원본 강의자료. **콘텐츠의 유일한 출처**

## 용어
- **Week**: 강의자료 PDF 1개 = 사이드바의 큰 묶음
- **Step**: Week 안의 내용 묶음 = 사이드바 목록 항목
- **Phase**: Step 안의 애니메이션 한 컷 = 중앙 하단 진행 바의 점 하나

## 화면 레이아웃 (고정)
- 왼쪽: Week 아코디언 + Step 목록 (260px)
- 중앙: 애니메이션/인터랙티브 무대(Stage) + 하단 Phase 진행 바
- 오른쪽: 현재 Phase에 연동된 상세 설명 (360px)

## 기술 스택
Vite + React + TypeScript, Tailwind CSS, Motion(framer-motion), React Router(HashRouter), Zustand, localStorage. 백엔드 없음. Vercel 정적 배포.

## 핵심 원칙
1. **콘텐츠와 렌더러 분리.** Step 데이터는 `src/content/wN/*.ts`, 렌더러는 `src/scenes/<유형>/`. 새 Step을 추가할 때 가능하면 데이터만 쓴다.
2. **Phase = 상태 스냅샷.** 애니메이션은 이전 Phase 상태 → 현재 Phase 상태의 전환으로 처리한다. Phase 안에 명령형 애니메이션 스크립트를 넣지 않는다.
3. **강의자료에 근거한 내용만.** 오른쪽 패널 본문은 해당 PDF 페이지를 읽고 쓴다. 강의자료에 없는 설명을 보탤 때는 `// 보충` 주석을 달고 최소한으로 한다. 모든 Step에 `slides`(페이지 번호)를 채운다.
4. **숫자는 계산으로.** 서브넷, Seq/ACK, BDP, RTT 합계, Polling 비용 등은 `src/lib/`의 순수 함수로 계산하고 단위 테스트(Vitest)를 작성한다. 하드코딩한 숫자는 강의자료 예시 값과 일치하는지 테스트로 확인한다.
5. **시각 규칙 준수.** 프로토콜 색상(L2 회색, IP 파랑, TCP 초록, UDP 주황, HTTP 보라, TLS 금색, DNS 청록, 오류 빨강)은 `src/theme.ts` 한 곳에서 정의하고 모든 장면이 공유한다.
6. **URL이 곧 상태.** `/#/:week/:step/:phase`로 어떤 화면이든 직접 열 수 있어야 한다.
7. **보안 공격 Step(6-15)은 완전한 가짜 시뮬레이션.** 실제 스크립트 실행, 실제 요청 전송, eval 사용 금지.

## 작업 방식
- 한 번에 마일스톤 하나 또는 Step 하나만 작업한다.
- Step을 구현하기 전에 **Phase 목록과 각 Phase의 오른쪽 패널 초안을 텍스트로 먼저 보여 주고** 확인을 받는다.
- 새 장면 유형이나 엔진 API를 바꿀 때는 이유와 영향 범위를 먼저 설명한다.
- 작업이 끝나면 실행 방법(`npm run dev`)과 브라우저에서 확인할 항목을 짧게 알려 준다.
- UI 텍스트는 한국어. 기술 용어는 강의자료 표기를 따른다(예: 3-Way Handshake, Subnet Mask, Preflight).

## 명령어
- `npm run dev` — 개발 서버
- `npm run test` — Vitest
- `npm run build` — 프로덕션 빌드
- `npm run lint` — ESLint