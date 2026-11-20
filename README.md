# 🌐 네트워크 구조 및 설계 — 인터랙티브 학습 사이트

[network-study-two.vercel.app](https://network-study-two.vercel.app/#/w3/handshake)

대학 전공 과목 **「네트워크 구조 및 설계」**(Network Architecture & Design for AI Systems)를 공부하려고 만든 사이트입니다.

이 과목은 TCP 핸드셰이크, 서브넷, DNS, HTTPS 같은 개념을 다룹니다. 강의자료의 그림만으로는 패킷이 어떤 순서로 오가는지, 왜 그렇게 설계됐는지 머릿속에 그리기 어려웠습니다. 그래서 강의자료 내용을 **단계별 애니메이션과 직접 조작해 보는 화면**으로 다시 만들었습니다. 진도를 체크하는 사이트가 아니라, 헷갈리는 내용을 그때그때 열어 보고 눈으로 이해하는 사이트입니다.

## 무엇을 볼 수 있나

- **단계별 애니메이션.** 개념 하나를 여러 단계(Phase)로 나눠 보여 줍니다. 예를 들어 3-Way Handshake는 준비 → SYN → SYN+ACK → ACK → 데이터 → 왜 3번인가 → 연결 비용 순서로 진행됩니다. 패킷이 실제로 오가고, 기기의 상태(CLOSED, SYN_SENT, ESTABLISHED…)가 그 순간에 바뀝니다.
- **흐름 중심 설명.** 오른쪽 설명은 강의자료를 옮겨 적지 않고 "왜 필요한가 → 무엇을 주고받는가 → 그래서 무엇이 가능해지는가"가 이어지게 풀어 썼습니다. 강의자료에 없는 설명을 덧붙인 곳은 코드에 `// 보충`으로 표시해 두었습니다.
- **직접 해보기.** 조건을 바꾸면 결과가 바로 달라지는 화면입니다. 예를 들어 SYN을 계속 잃어버리게 하면, 재전송 대기가 1초 → 2초 → 4초로 늘어나다가 `Connection timed out`이 되는 과정을 볼 수 있습니다.
- **쉽게 보기와 퀴즈.** 비유로 다시 설명하는 탭과, 강의자료 Quick Check를 바탕으로 한 퀴즈가 있습니다.
- **어디서든 바로 열기.** 주소가 곧 화면입니다. 예: `/#/w3/handshake/4`는 W3 3-Way Handshake의 4단계입니다.

## 범위

| Week | 주제 |
|---|---|
| W2 | Internet & IP Networking |
| W3 | TCP, UDP & Socket |
| W4 | DNS, HTTP & HTTPS |
| W5 | Web & REST API |
| W6 | Authentication & Web Security |
| W7 | Real-time & IoT Networking |

## 참고

화면 디자인과 애니메이션 스타일(종이색 바탕, 고정폭 글꼴, 아이소메트릭 블록)은 [designed-to-scale.vercel.app](https://designed-to-scale.vercel.app/)을 참고했습니다. 코드와 그림은 이 프로젝트에서 직접 만들었습니다.
