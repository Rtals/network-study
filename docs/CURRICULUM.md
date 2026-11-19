# 커리큘럼 — Week → Step → Phase

- **Week** = 강의자료 PDF 1개 (왼쪽 사이드바의 큰 묶음)
- **Step** = 강의자료 안의 내용 묶음 (사이드바 목록 항목). `p.`는 강의자료 페이지 번호
- **Phase** = 중앙 무대 하단 진행 바에 표시되는 순서. `→`로 구분
- **장면**: `docs/DESIGN.md` 4절의 장면 유형
- **★** = 해당 Week의 Quick Check 문항이 직접 다루는 Step (시험 대비 우선순위). `QC Q1`은 강의자료 Quick Check의 문항 번호
- 🧪 = 직접 해보기(sandbox) 모드 지원
- 💡 = 강의자료에 "쉽게 보기" 비유 슬라이드가 있음 → 오른쪽 패널 "쉽게 보기" 탭에 사용

학습 목표, 과제 안내, Lab 안내 슬라이드는 Step으로 만들지 않고 **Week 개요 화면**(`/#/w3`)에 요약한다.
Phase 목록은 초안이다. 구현 전에 해당 페이지를 다시 읽고 Phase를 확정할 것.

---

## W2 · Internet & IP Networking
- 강의자료: `Network_Architecture_Week2_IP_Networking_Revised.pdf` (42p)
- 오늘의 질문: "내 PC의 FastAPI는 localhost:8000에서 잘 되는데, 왜 친구 PC에서는 안 열릴까?"
- Week 개요 화면: WHERE(IP) · HOW(Gateway·Routing) · WHO(Port) · CAN(NAT·Firewall) 4칸 지도. 각 칸을 누르면 해당 Step으로 이동

| # | Step | p. | 장면 | 하단 Phase 순서 | 직접 해보기 / 퀴즈 |
|---|---|---|---|---|---|
| 2-1 | 패킷은 어디로 가는가 | 2, 4 | topology | Laptop 출발 → Router의 next hop 결정 → ISP → Internet 라우터 → Cloud 도착 → "각 장비는 다음 hop만 안다" | 장비를 클릭하면 "이 장비가 아는 것"을 말풍선으로 표시 |
| 2-2 | IPv4 = 32비트, Network + Host | 5–7 | bits | 10진수 4칸 → 각 칸 2진 변환 → 32비트 나열 → /24 경계선 → Network / Host 색 분리 | 🧪 IP 직접 입력, prefix 슬라이더 |
| 2-3 ★ | Subnet Mask · CIDR · AND 연산 | 8–9 | bits | IP와 Mask 위아래 정렬 → 비트별 AND 진행 → Network 주소 도출 → 두 번째 IP도 AND → 같은/다른 네트워크 판정 | 🧪 IP 두 개 + prefix 입력 · QC Q1 |
| 2-4 ★ | Network · Broadcast · Host 범위 | 10–11 | bits | 0~255 주소 띠 → .0 Network 표시 → .255 Broadcast 표시 → 사용 가능 .1~.254 → 공식 2^(32−p)−2 → prefix를 바꾸며 띠 변화 | 🧪 prefix 슬라이더, "AWS 예약 5개" 토글 · QC Q2 |
| 2-5 | 서브넷 쪼개기 /24 → /26 | 12 | bits | /24 띠 → 2비트 빌림 → 4조각 분할 애니메이션 → 각 조각의 Network/Broadcast/Host 표 → "왜 나누나: 보안·가용성 경계" | 🧪 "내 IP는 몇 번째 서브넷?" 입력 문제 |
| 2-6 ★ | Host의 전달 판단 3단계 | 13–15 | flow + topology | 목적지 IP 확인 → 내 IP·목적지 AND → 같은가? → YES: ARP로 목적지 MAC, 스위치로 직접 / NO: ARP로 Gateway MAC, Gateway로 | 🧪 목적지 IP를 바꿔 분기 확인 · QC Q4 |
| 2-7 | Default Gateway와 Routing Table | 16–17 | sandbox | ipconfig 4줄 읽기 → 라우팅 테이블 3줄 → 목적지 입력 → 매칭되는 줄 모두 강조 → 가장 긴 prefix가 이김(LPM) → 0.0.0.0/0이 없으면? | 🧪 목적지 IP 입력 → LPM 결과 |
| 2-8 ★ | Hop마다 MAC은 바뀌고 IP는 유지 | 18 | topology | Hop1: 패킷 헤더 라벨(MAC aa→bb, IP 고정) → Hop2: MAC만 cc→dd로 교체 → Hop3: ee→ff → 표로 요약 → tracert가 보여주는 것 | 헤더 라벨에서 바뀐 필드를 깜빡임으로 강조 · QC Q5 |
| 2-9 ★ | Public/Private IP와 bind 주소 | 19–21 | sandbox | Private 대역 3개 → 주소 4종(localhost·127.0.0.1·0.0.0.0·192.168.x) → bind 주소 선택 → 내 PC / 같은 LAN / 인터넷에서 접속 시도 → O/X와 이유 | 🧪 bind 주소·방화벽 토글 → 3명의 접속 결과 · QC Q3, Q7 |
| 2-10 ★ | NAT와 PAT | 22–24 | topology | 내부 기기 3대 → 나가는 패킷 Src 변환 → NAT Table에 줄 생성 → 응답이 테이블 보고 원래 기기로 → 같은 51500 포트 충돌 회피 → 밖에서 먼저 온 패킷은 갈 곳 없음 | 🧪 외부에서 먼저 접속 시도 버튼 · QC Q6 |
| 2-11 | 외부에서 접속하게 만드는 3가지 | 25 | compare | ① Port Forwarding → ② Reverse Tunnel → ③ Cloud 배포 → trade-off 표 | 방식별 탭 + 작은 애니메이션 |
| 2-12 | 자동으로 처리되는 것: DHCP와 ARP | 26–27 | sequence + topology | DHCP: DISCOVER(브로드캐스트 파문) → OFFER → REQUEST → ACK(설정값 확정) / ARP: "Who has?" 브로드캐스트 → 해당 호스트만 Unicast 응답 → ARP Cache에 줄 추가 | DHCP·ARP 두 장면을 Phase로 이어서 |
| 2-13 | Port와 Socket 4-tuple | 28–29 | topology | 서버 하나에 포트 문 4개(80·443·22·8000) → 클라이언트 탭 2개 접속 → Src Port만 다른 두 연결 → 포트 범위 3구간 | 탭 추가 버튼 → 새 ephemeral 포트 |
| 2-14 | Firewall · Security Group · VPC | 30–32 | topology | 규칙 ALLOW 443 / DENY 22 → Cloud 계층 관문 → Host 계층 관문 → 둘 다 통과해야 접속 → VPC 구조(Public/Private Subnet, IGW, NAT GW) → VPC 주소 설계 3원칙 | 🧪 관문별 열기/닫기 토글 |
| 2-15 | Troubleshooting Ladder와 오류 메시지 | 33–36 | diagnose | 7단계 사다리 → 증상 선택 → 의심 계층 강조 → 확인 명령어 → refused vs timeout의 차이 | 🧪 증상 카드 고르기 |
| 2-Q | Quick Check | 40 | quiz | Q1~Q7 | 주관식: 본인 말로 쓰기 → 모범답안 공개 → 관련 Step 링크 |

---

## W3 · TCP, UDP & Socket
- 강의자료: `Week03_TCP_UDP_Socket_Revised_1.pdf` (42p)
- 핵심 질문: "연결은 케이블이 아니라 양쪽 메모리에 남은 상태(state)다. 그 상태가 어떻게 생기고 사라지는가?"

| # | Step | p. | 장면 | 하단 Phase 순서 | 직접 해보기 / 퀴즈 |
|---|---|---|---|---|---|
| 3-1 | 전송계층의 역할과 Mux/Demux | 3, 5–7 | topology | 계층 지도(W2 → W3 위치) → 한 호스트에 앱 3개 → 하나의 IP로 모음(Mux) → 포트로 나눔(Demux) → UDP 2-tuple vs TCP 4-tuple → 포트 번호 3구간 | 🧪 UDP/TCP 토글로 demux 기준 비교 |
| 3-2 ★ | TCP vs UDP | 8 | compare | 같은 데이터 5조각 동시 전송 → 중간 손실 발생 → TCP: 재전송·순서 복원 / UDP: 빠진 채 도착 → 비교표 | 🧪 손실률 슬라이더 · QC Q2 |
| 3-3 | 연결 = 양쪽 커널의 상태(TCB) | 9 | topology | 오해: "선이 연결된다" → 실제: 양쪽에 TCB 박스 생성 → 중간 라우터는 모름 → TCB 내용(4-tuple·상태·순서번호·윈도우·타이머·버퍼) | TCB 항목에 마우스를 올려 설명 |
| 3-4 ★ | 3-Way Handshake | 10–11 | sequence | CLOSED/LISTEN → SYN(seq=x) · SYN_SENT → SYN+ACK(seq=y, ack=x+1) · SYN_RCVD → ACK(ack=y+1) · ESTABLISHED → 데이터 시작 → 왜 3번인가(옛 중복 SYN 차단) → 연결 비용(TCP/TLS1.3/TLS1.2/QUIC) | 🧪 메시지 클릭해 손실, RTT 슬라이더로 비용 계산 · QC Q1 · **M1 수직 슬라이스** |
| 3-5 | Seq/ACK는 바이트를 센다 | 12 | sequence | 바이트 눈금자 → seq=1, len=1460 → ack=1461 → seq=1461 → seq=2921, len=500 → 누적 ack=3421 → MSS 1460의 유래 | 🧪 "ack는 몇?" 예측 입력 후 공개 |
| 3-6 | 4-Way 종료와 상태 전이도 | 13–14 | sequence + flow | FIN → ACK(CLOSE_WAIT) → half-close 데이터 → FIN(LAST_ACK) → ACK(TIME_WAIT 2×MSL) → 상태 전이도에서 현재 상태 강조 | 전이도의 상태를 클릭하면 해당 Phase로 이동 |
| 3-7 ★ | TIME_WAIT vs CLOSE_WAIT | 15 | sandbox | 내가 먼저 닫음 → TIME_WAIT 60초 타이머 → 상대가 먼저 닫음 → 앱이 close() 안 함 → CLOSE_WAIT 누적 → `ss -tan` 카운터 | 🧪 close() 호출 토글 + 부하 버튼 → 상태 개수 변화 · QC Q8 |
| 3-8 ★ | 연결은 4-tuple로 식별된다 | 16 | sandbox | 4칸 tuple → 연결 #1 → #2(포트만 다름) → #3(IP만 다름) → #4(완전 동일 = 충돌) → listen 소켓 1 + 연결 소켓 N | 🧪 tuple 값을 직접 바꿔 충돌 판정 · QC Q4 |
| 3-9 ★ | 유실과 재전송 (RTO · Fast Retransmit) | 17–20 | sequence | 정상 도착 → 1461 유실 → 2921 도착·버퍼 보관(hole) → dup ACK ×3 → 즉시 재전송 → ack=4381 / 다른 경로: 마지막 조각 유실 → RTO 대기 → 지수 백오프 1×·2×·4× | 🧪 아무 세그먼트나 클릭해 손실 → 어떤 재전송이 일어나는지 · QC Q7 |
| 3-10 ★ | 슬라이딩 윈도우와 Flow Control | 21–22 | sandbox | 바이트 블록 띠 → 윈도우 구간 표시 → ACK 오면 미끄러짐 → rwnd 광고 → 수신 앱 느려짐 → win=0 정지 → Window Probe → BDP 계산 | 🧪 수신 앱 처리 속도·rwnd 슬라이더, BDP 계산기 · QC Q6 |
| 3-11 ★ | 혼잡 제어: Slow Start · AIMD | 23–25 | chart | 병목 라우터 큐 차오름 → 손실 = 혼잡 신호 → cwnd 그래프: Slow Start(2배) → ssthresh 넘으면 +1 → 3 dup ACK: 절반 → 타임아웃: 1부터 → Reno/CUBIC/BBR 비교 | 🧪 "3 dup ACK", "타임아웃" 이벤트 주입 버튼 · QC Q6 |
| 3-12 | UDP 헤더 8바이트와 QUIC | 26–27 | anatomy + compare | UDP 헤더 4필드 → UDP가 안 해주는 5가지 → "빠르다"의 맞는/틀린/숨은 비용 → QUIC: 스트림별 독립, 손실이 다른 스트림을 막지 않음 | HOL Blocking 비교 애니메이션 |
| 3-13 | TCP 헤더와 캡슐화 | 28–29 | anatomy | TCP 헤더 필드별 강조(Seq/Ack/Flags/Window/Options) → 각 필드가 어느 Step과 연결되는지 링크 → 캡슐화 스택 → MTU 1500 − 20 − 20 = MSS 1460 | 필드 클릭 → 관련 Step으로 이동 |
| 3-14 ★ | Socket API와 listen/연결 소켓 | 30–34 | flow + anatomy | socket() → bind() → listen() → connect()(핸드셰이크는 커널이) → accept()가 큐에서 꺼냄 → send/recv → close() → SYN queue / Accept queue → Python echo 코드 줄 강조 | 코드 줄과 호출 흐름 동기화 · QC Q3, Q5 |
| 3-15 ★ | 증상 → 원인 진단 | 35–37 | diagnose | ss/netstat 출력 읽기(Recv-Q/Send-Q) → 증상 선택 → 기술적 의미 → 의심 계층 → 먼저 확인할 것 → 좁히는 7단계 | 🧪 오류 메시지 카드 고르기 · QC Q9, Q10 |
| 3-16 | Design Choice: TCP / UDP / QUIC | 38 | sandbox | 사례 카드 9개 → 드래그해서 분류 → 정답과 이유 공개 | 🧪 드래그 분류 |
| 3-Q | Quick Check | 40 | quiz | Q1~Q10 | |

---

## W4 · DNS, HTTP & HTTPS
- 강의자료: `Week04_DNS_HTTP_HTTPS_Revised.pdf` (44p)
- 핵심 질문: "주소창에 URL을 치고 Enter를 누른 뒤 화면이 뜨기까지, 몇 번의 왕복(RTT)과 어떤 프로토콜들이 지나가는가?"
- Week 개요 화면: 4-1의 6단계 파이프라인을 **이 Week의 지도**로 사용 (각 단계 → 해당 Step 링크)

| # | Step | p. | 장면 | 하단 Phase 순서 | 직접 해보기 / 퀴즈 |
|---|---|---|---|---|---|
| 4-1 | URL을 치면 일어나는 일 | 3, 5 | flow | URL 파싱 → DNS 조회 → TCP 연결 → TLS 핸드셰이크 → HTTP 요청·응답 → 렌더링·추가 요청 | 각 단계 클릭 → 해당 Step 이동 |
| 4-2 ★ | URL 해부 | 6 | anatomy | scheme → host → port → path → query → fragment → "DNS는 host만 안다" | 🧪 URL 직접 입력 → 자동 분해 · QC Q1 |
| 4-3 ★ | 도메인 계층과 DNS 해석 과정 | 7–8 | sequence | 도메인을 오른쪽부터 읽기(. → kr → ac → inu) → Stub → Resolver(재귀) → Root → TLD → Authoritative(반복) → IP 응답 | 재귀/반복 구간 색 구분 · QC Q2 |
| 4-4 ★ | DNS 캐시와 TTL | 9 | topology | 캐시 층(브라우저·OS·리졸버) → 첫 질의는 끝까지 → 두 번째는 캐시 hit → TTL 카운트다운 → 레코드 변경 후 일부만 옛 IP | 🧪 TTL·레코드 변경 시점 조작 · QC Q3 |
| 4-5 | DNS 레코드와 dig 읽기, 트래픽 제어 | 10–12 | anatomy | 레코드 한 줄 구조 → A/AAAA/CNAME/MX/TXT/NS → dig 출력 섹션별 강조 → 같은 이름에 지역별 다른 IP(CDN) | dig 출력에 마우스를 올려 설명 |
| 4-6 ★ | HTTP 메시지 구조 | 13–15 | anatomy | Request 시작줄 → 헤더 → **빈 줄(\r\n)** → 본문 → Response 시작줄 → 나머지는 동일 | `\r\n` 보이기 토글 · QC Q4 |
| 4-7 ★ | Methods · 멱등성 · 재시도 | 16–17 | sequence | 메서드 표(안전/멱등) → POST 응답 유실 → 키 없이 재시도 → 결제 2번 → Idempotency-Key로 재시도 → 서버가 중복 감지 | 🧪 응답 유실 버튼, 키 사용 토글 · QC Q5 |
| 4-8 ★ | Status Code와 "누가 만들었나" | 18–20 | flow | 1xx~5xx 첫 자리 의미 → 자주 만나는 코드 → Browser → CDN → LB → App 경로 → 404는 App, 502는 중간 프록시 | 🧪 코드 카드를 만든 주체에 드래그 · QC Q6 |
| 4-9 | Header · Body · Content-Type · 로그인 상태 | 21–23 | anatomy | 주요 요청/응답 헤더 → Content-Type별 Body 형태 → 세션 쿠키 vs 토큰(간단히, W6에서 자세히) | W6 6-10, 6-11 링크 |
| 4-10 | HTTP 캐싱 | 24 | sequence | 첫 요청 200 + Cache-Control/ETag → 캐시 저장 → max-age 내 요청은 네트워크 없음 → 만료 후 If-None-Match → 304 | 🧪 시간 경과 슬라이더 |
| 4-11 ★ | HTTP/1.0 → 1.1 → 2 → 3 | 25–28 | compare | 1.0: 요청마다 새 연결 → 1.1: Keep-Alive, 한 번에 하나 → 2: 한 연결에 여러 스트림 → TCP 패킷 하나 손실 시 모든 스트림 정지 → 3(QUIC): 해당 스트림만 정지 → 비교표 | 🧪 손실 주입 버튼 · QC Q7 |
| 4-12 ★ | HTTPS가 지키는 것 / 지키지 못하는 것 | 29–31 | sandbox | 기밀성·무결성·인증 → 암호 세 가지 → 인증서 체인 검증 → 암호화돼도 보이는 것(도메인 SNI, IP, 크기) | 경로 중간 "엿보는 사람" 시점 토글 · QC Q8, Q9 (W6 6-5 재사용) |
| 4-13 | TLS 1.3 Handshake와 연결 비용 | 32–33 | sequence + chart | TCP 1 RTT → TLS 1 RTT → HTTP 요청 → RTT 30ms vs 150ms 총합 계산 → 줄이는 방법 | 🧪 RTT 슬라이더 → 워터폴 길이 변화 (W6 6-6과 엔진 공유) |
| 4-14 ★ | DevTools 워터폴과 curl -v | 34–37 | anatomy | 구간마다 다른 프로토콜(Architecture View) → Timing 탭 막대 하나씩(Queueing·DNS·Connect·SSL·TTFB·Download) → curl -v 출력 줄별 대응 | 막대 클릭 → 관련 Step 링크 · QC Q10 |
| 4-15 | 증상 → 원인, 좁히는 순서 (웹 요청 편) | 38–40 | diagnose | 이름 → 연결 → 암호 → 메시지 → 애플리케이션 순서 → 증상 선택 → 멈춘 단계 | 🧪 증상 카드 |
| 4-Q | Quick Check | 42 | quiz | Q1~Q10 | |

---

## W5 · Web & REST API
- 강의자료: `Week05_Web_REST_API_Revised.pdf` (62p)
- 핵심 질문: "브라우저 JavaScript가 fetch()를 호출해 학생 목록을 받아 오기까지, 어떤 약속이 지켜져야 하고 어디서 깨질 수 있는가?"
- 이 Week는 "쉽게 보기" 슬라이드가 많다 → 대부분 Step에서 오른쪽 패널 "쉽게 보기" 탭 활성화

| # | Step | p. | 장면 | 하단 Phase 순서 | 직접 해보기 / 퀴즈 |
|---|---|---|---|---|---|
| 5-1 | API는 계약이다 | 3, 5–7 | flow 💡 | 두 팀 사이의 경계선 → 식당 메뉴판 비유 → SSR → SPA(서버는 JSON만) 변화 | |
| 5-2 ★ | REST는 설계 스타일 | 8–10 | flow 💡 | 도서관 비유 → 6가지 제약 하나씩 → Uniform Interface 강조 | QC Q1 |
| 5-3 | Richardson Maturity Model | 11–12 | compare 💡 | 같은 요청("10번 학생 학년을 4로")을 Level 0~3으로 나란히 → 학생이 없을 때 각 Level의 응답 | 레벨 탭 |
| 5-4 | Resource vs Representation | 13–14 | sandbox 💡 | 자원 하나 → Accept 헤더 변경 → JSON / HTML / CSV 표현 전환 | 🧪 Accept 헤더 선택 |
| 5-5 ★ | URI 설계 규칙과 자원 트리 | 15–17 | sandbox 💡 | 명사=URI, 동사=Method → 나쁜 예/좋은 예 → Collection·Item·Sub-resource 트리 | 🧪 URI 입력 → 규칙 위반 피드백 · QC Q2 |
| 5-6 ★ | CRUD 매핑과 학생 한 명의 일생 | 18–19 | sequence 💡 | POST → 201 + Location, DB에 행 추가 → GET → 200 → PATCH → 200, 행 수정 → DELETE → 204, 행 삭제 | 요청마다 DB 표 변화 동기화 · QC Q4 |
| 5-7 ★ | PUT vs PATCH, 동사가 필요한 행위 | 20–21 | compare | 같은 수정 요청 → PUT: 빠진 필드 사라짐 / PATCH: 해당 필드만 → 수강 취소·출석 체크 같은 행위 표현법 | 🧪 필드 빼고 보내기 · QC Q3 |
| 5-8 | 상태 코드 고르기와 오류 응답 형식 | 22–24 | flow 💡 | 결정 트리(인증? 권한? 존재? 유효?) → 상황별 연습 → 일관된 오류 Body 형식 | 🧪 상황 카드 → 결정 트리 따라가기 |
| 5-9 ★ | 요청이 Backend 안에서 지나가는 길 | 25–27 | flow 💡 | Endpoint 해부(Method·Path·Query·Body → handler) → Uvicorn → Routing → Validation → Handler → DB → 단계별 실패 코드(404·405·422·500) → 버튼 하나의 여행 | 🧪 실패 지점 선택 → 응답 코드 · QC Q6 |
| 5-10 ★ | JSON과 Schema 검증 | 28–30 | sandbox 💡 | JSON 규칙 5개 → Pydantic 스키마 → 입구 검문소 → 잘못된 필드 → 422, handler는 실행 안 됨 | 🧪 JSON 편집기 → 검증 결과 · QC Q6 |
| 5-11 | 페이지 · 필터 · 정렬, 페이지네이션 | 31–32 | sandbox 💡 | 10만 명 한 번에? → limit/offset → 중간에 행 추가 시 중복 발생 → cursor 방식 | 🧪 페이지 넘기는 중 행 삽입 버튼 |
| 5-12 | 버전 관리와 OpenAPI / Swagger | 33–35 | anatomy 💡 | 배포된 앱은 즉시 업데이트 안 됨 → 버전 방식 비교 → openapi.yaml 해부 → Swagger UI 사용 순서 | |
| 5-13 | Stateless와 확장성 | 36–37 | topology 💡 | 서버 2대 + LB → Stateful: 두 번째 요청이 다른 서버로 가면 실패 → Stateless: 어느 서버든 처리 → 카페 비유 | 🧪 서버 수 늘리기 |
| 5-14 ★ | API 인증 방식 한눈에 | 38–39 | compare 💡 | 방식 비교표 → 손목밴드 비유 → 401 vs 403 | QC Q5 (W6 6-7 링크) |
| 5-15 ★ | Origin과 Same-Origin Policy | 40–42 | sandbox 💡 | Origin = scheme + host + port → 아파트 주소 비유 → SOP가 없다면? → SOP는 브라우저 안의 사용자를 지킨다 | 🧪 URL 두 개 입력 → 같은 Origin? 어디가 다른지 · QC Q7, Q8 |
| 5-16 ★ | CORS: Simple vs Preflight | 43–48 | sandbox + sequence 💡 | 요청 조건 선택 → Simple/Preflight 판정 → Simple: Origin 헤더 → 응답 ACAO 확인 / Preflight: OPTIONS 먼저 → 허용 헤더 → 실제 요청 | 🧪 **CORS 요청 빌더**(Method·Content-Type·Authorization) · QC Q9 |
| 5-17 ★ | CORS 오류 읽기와 `allow_origins=["*"]` 함정 | 49–52 | diagnose | 응답 헤더 정리 → `*` + credentials 문제 → Console 메시지 → 원인 → 조치 → CORS를 없애는 구조(같은 Origin, 프록시) | 🧪 Console 메시지 카드 · QC Q10 |
| 5-18 | Design Choice와 Troubleshooting | 53–56 | diagnose | Architecture View → REST/GraphQL/gRPC 등 선택 → 흔한 실패 → 브라우저를 빼고 curl로 확인 | |
| 5-Q | Quick Check | 60 | quiz | Q1~Q10 | |

---

## W6 · Authentication & Web Security
- 강의자료: `Week06_Authentication_Web_Security_Revised.pdf` (54p)
- 흐름: "Week 5의 API는 누구든 호출할 수 있었다 → 누가, 어떤 통로로, 무엇을 하는지 통제한다"
- Week 개요 화면: 회사 건물 비유(통로·신원·출입증·권한·기록)를 지도로 사용

| # | Step | p. | 장면 | 하단 Phase 순서 | 직접 해보기 / 퀴즈 |
|---|---|---|---|---|---|
| 6-1 | 보안의 큰 그림과 공격 지점 | 3, 5–6 | topology 💡 | 회사 건물 비유 → 요청 경로 위 공격 지점 → 각 지점의 방어 장치 | 지점 클릭 → 해당 Step 링크 |
| 6-2 ★ | HTTP는 엽서, HTTPS는 봉투 | 7 | topology 💡 | HTTP로 비밀번호 전송 → 중간 장비가 읽음 → HTTPS로 전송 → 암호문만 보임 | 🧪 HTTP/HTTPS 토글 · QC Q2 |
| 6-3 | 대칭키와 공개키 | 8–9 | sequence 💡 | 대칭키: 같은 열쇠, 열쇠 전달 문제 → 공개키: 열린 자물쇠 → TLS는 공개키로 열쇠 공유, 대칭키로 암호화 | |
| 6-4 | 해시와 전자서명 | 10 | sandbox | 입력 → 해시(지문) → 한 글자 바꾸면 완전히 다른 해시 → 개인키로 서명 → 공개키로 검증 | 🧪 텍스트 입력 → 해시 변화 |
| 6-5 ★ | 인증서와 신뢰 체인 | 11–12 | flow 💡 | 여권 비유 → Root CA(미리 설치) → Intermediate → 서버 인증서 → 서명을 한 단계씩 검증 → 도메인·기간 확인 | QC Q3 (W4 4-12에서 재사용) |
| 6-6 ★ | TLS 1.3 Handshake | 13–15 | sequence 💡 | (TCP 3-way 이후) ClientHello + 키 공유 → ServerHello + 인증서 + Finished → Client Finished → 암호화 통신 → 지켜 주는 것 / 지켜 주지 않는 것 → 인증서 오류 종류 | QC Q2 |
| 6-7 ★ | Authentication vs Authorization | 16–17 | flow 💡 | AuthN "누구세요?" → AuthZ "해도 되나요?" → 순서 → 실패 코드 401 / 403 → 호텔 비유 | 🧪 상황 카드 → 401/403 판정 · QC Q1 |
| 6-8 ★ | MFA와 비밀번호 저장 | 18–20 | sandbox 💡 | 인증 요소 3종 → 평문 저장 → 해시 한 번 → 같은 비밀번호 = 같은 해시(레인보우 테이블) → Salt 추가 → 느린 해시(bcrypt/argon2) | 🧪 비밀번호 입력 → 저장 방식별 DB 표 · QC Q4 |
| 6-9 | 로그인 한 번의 전체 흐름 | 21 | sequence | TLS 위 비밀번호 전송 → 해시 비교 → 출입증(세션/토큰) 발급 → 이후 요청에 출입증 첨부 | |
| 6-10 ★ | Cookie와 Session, 보안 속성 | 22–24 | sandbox 💡 | Set-Cookie → 브라우저가 자동 첨부 → 세탁소 번호표 비유(정보는 서버 장부) → HttpOnly / Secure / SameSite 속성별 차단 공격 | 🧪 속성 토글 → XSS·도청·CSRF 통과 여부 · QC Q5, Q6 |
| 6-11 ★ | 토큰 기반 인증과 JWT | 25–29 | anatomy 💡 | 세션(서버가 기억) vs 토큰(스스로 증명) → header.payload.signature 해부 → Base64URL은 인코딩일 뿐 → payload 변조 → 서명 불일치 → 서버 검증 순서 | 🧪 payload 수정 → 검증 실패 확인 · QC Q7 |
| 6-12 ★ | Access + Refresh Token과 저장 위치 | 30–33 | sequence 💡 | Access 만료 → 401 → Refresh로 재발급 → 놀이공원 이용권 비유 → 저장 위치별 XSS/CSRF 트레이드오프 → Session vs JWT 선택 기준 | 🧪 시간 경과 슬라이더 · QC Q8 |
| 6-13 ★ | OAuth 2.0과 PKCE | 34–36 | sequence 💡 | 비밀번호를 앱에 주면? → 발레파킹 키 비유 → 사용자·앱·인가서버·리소스서버 4자 흐름 → Authorization Code → 뒷단에서 토큰 교환 → scope | QC Q9 |
| 6-14 ★ | API Key와 인가 모델 | 37–38 | compare | API Key(프로그램 식별) vs 로그인 토큰(사용자 식별) → RBAC → 소유권 검사 | QC Q10 |
| 6-15 | 공격 실습실: IDOR · XSS · CSRF · SQLi | 39–42 | sandbox 💡 | IDOR: 주소창 숫자 변경 → XSS: 입력이 코드로 실행 → CSRF: 쿠키 자동 첨부 악용 → SQLi: `admin' --` → 각 방어 적용 후 재시도 | 🧪 **공격/방어 토글** (전부 가짜 시뮬레이션, 실제 실행 없음) |
| 6-16 | Rate Limiting · 보안 헤더 · Secret 관리 | 43–45 | chart | 무차별 대입 시도 그래프 → Rate Limit 적용 → 보안 응답 헤더 표 → 코드에 비밀 넣지 않기 | 🧪 시도 횟수 슬라이더 |
| 6-17 | Failure Modes와 Troubleshooting | 46–48 | diagnose | Architecture View → 증상 → 원인 → 확인 → 브라우저 → curl → 토큰 내용 → 서버 로그 순서 | 🧪 증상 카드 |
| 6-Q | Quick Check | 52 | quiz | Q1~Q10 | |

---

## W7 · Real-time & IoT Networking
- 강의자료: `Week07_Realtime_IoT_Networking_Revised.pdf` (54p)
- 흐름: "Week 5~6은 클라이언트가 묻고 서버가 답하는 세계 → 이번 주는 서버·기기가 먼저 말하는 세계"
- 마지막 Step 7-16(온도 값 하나의 여행)을 **전체 과정의 종합 장면**으로 만든다

| # | Step | p. | 장면 | 하단 Phase 순서 | 직접 해보기 / 퀴즈 |
|---|---|---|---|---|---|
| 7-1 | HTTP는 왜 실시간에 약한가 | 3, 5–7 | compare 💡 | Client-initiated 모델 → 카페 주문 비유 4가지(계속 묻기·기다리기·진동벨·전화) → 서비스별 지연 예산 | |
| 7-2 ★ | Polling과 비용 계산 | 8–9 | chart | 3초마다 요청 → 대부분 "변화 없음" → 1만 명이면 초당 요청 수 → 주기를 줄이면 요청↑, 지연↓ | 🧪 주기·사용자 수 슬라이더 · QC Q1 |
| 7-3 ★ | Long Polling | 10 | sequence | 요청 → 서버가 응답 보류 → 데이터 발생 시 응답 → 즉시 재요청 → 타임아웃 시 빈 응답 → 대기 중인 연결 수 = 서버 부담(async 필요) | QC Q2 |
| 7-4 ★ | SSE: 끝나지 않는 HTTP 응답 | 11–15 | anatomy + sequence 💡 | 응답이 안 닫힘 → `data:` 줄 → 빈 줄로 이벤트 종료 → id·Last-Event-ID로 재연결 → LLM 타자 효과 → 프록시 버퍼링 함정 | 🧪 빈 줄 빼기, 버퍼링 토글 → 한꺼번에 몰려 옴 · QC Q3, Q4 |
| 7-5 ★ | WebSocket Handshake와 Frame | 16–19 | sequence + anatomy 💡 | HTTP Upgrade 요청 → 101 Switching Protocols → Sec-WebSocket-Accept(해시, 암호화 아님) → 같은 TCP 연결로 양방향 → Frame 헤더 2~14바이트 해부 | QC Q5 |
| 7-6 | WebSocket 채팅과 연결 수명 | 20–21 | topology | 방에 3명 접속 → 메시지 broadcast → Heartbeat ping/pong → 네트워크 끊김 → Close Code → 백오프 재연결 | 🧪 사용자 추가, 연결 끊기 버튼 |
| 7-7 ★ | WebSocket 보안과 Scale-out | 22–23 | topology | 브라우저는 WS에 CORS 미적용 → 서버가 Origin 헤더 검사 → 서버 2대: A의 kim → B의 lee 전달 실패 → Redis Pub/Sub으로 해결 | QC Q6 |
| 7-8 | 4가지 방식 비교와 메시지당 바이트 | 24–25 | chart | 비교표(방향·연결·지연·호환) → 10바이트 센서 값 1개에 드는 총 바이트(로그 스케일) | |
| 7-9 ★ | WebRTC: Offer · Answer · ICE, STUN · TURN | 26–28 | sequence + topology 💡 | 왜 UDP인가 → Signaling 서버로 Offer/Answer 교환 → ICE 후보 수집 → STUN으로 바깥 주소 확인(W2 NAT 복습) → 직접 연결 실패 시 TURN 중계 | 🧪 NAT 종류 토글 → STUN 성공/TURN 필요 · QC Q7 |
| 7-10 | 참가자가 늘어나면: Mesh · SFU · MCU | 29 | topology | 참가자 수 증가 → Mesh 연결선 n(n−1)/2 폭증 → SFU(중계만) → MCU(합성) | 🧪 참가자 슬라이더 → 연결 수·업로드량 |
| 7-11 | IoT 네트워크의 제약과 BLE | 30–32 | flow | 5가지 제약 → 무선 링크 층 vs 메시지 프로토콜 층 구분 → BLE Advertising → 연결 → GATT Service·Characteristic | |
| 7-12 ★ | MQTT Pub/Sub와 Topic Wildcard | 33–36 | topology + sandbox 💡 | Publisher·Subscriber는 서로 모름 → Broker에 연결 → Topic으로 만남 → 유튜브 구독 비유 → 토픽 트리 → `+`(한 단계) / `#`(여러 단계) | 🧪 **Wildcard 매칭기**: 구독 패턴 × 발행 토픽 O/X · QC Q8 |
| 7-13 ★ | MQTT 세션과 QoS 0 · 1 · 2 | 37–39 | sequence 💡 | CONNECT → SUBSCRIBE → PUBLISH → PINGREQ → DISCONNECT / QoS 0: 1번 → QoS 1: PUBACK, 유실 시 중복 → QoS 2: 4단계 → 구간별 적용 → 우편 비유 | 🧪 패킷 손실 클릭 → 중복/유실 결과 · QC Q9 |
| 7-14 ★ | Retain · Last Will · Persistent Session | 40–41 | sandbox | 늦게 구독한 기기 → Retained로 마지막 값 즉시 수신 → 센서 비정상 종료 → Broker가 Last Will 발행 → 재접속 시 세션 복구 | 🧪 늦게 구독 / 전원 끄기 버튼 · QC Q10 |
| 7-15 | MQTT vs HTTP vs CoAP, MQTT 보안 | 42–43 | compare | 프로토콜 비교표 → 기본 브로커 위험(누구나 # 구독) → 인증·ACL·TLS | |
| 7-16 | 온도 값 하나의 여행 (종합) | 44–45 | topology | 센서가 24.5°C 측정 → MQTT PUBLISH → Broker → Bridge(FastAPI) 구독 → SSE로 브라우저 → 숫자 갱신 → 구간별 프로토콜·시간 | 구간 클릭 → 해당 Week/Step으로 이동 (W2~W7 복습 허브) |
| 7-17 | Design Choice와 Troubleshooting | 46–48 | diagnose | 질문 순서로 고르는 결정 트리 → 흔한 실패 → 한 구간씩 직접 연결해 보기 | 🧪 결정 트리 따라가기 |
| 7-Q | Quick Check | 52 | quiz | Q1~Q10 | |

---

## Week 간 연결 (중복 콘텐츠 정리)

같은 개념이 여러 주차에 나온다. **한 곳에서 자세히 만들고 나머지는 링크 + 요약**으로 처리해 작업량을 줄인다.

| 개념 | 자세히 만드는 곳 | 요약 + 링크 |
|---|---|---|
| TLS 1.3 Handshake, 인증서 체인 | W6 (6-5, 6-6) | W4 4-12, 4-13 |
| 세션 쿠키 vs 토큰 | W6 (6-10, 6-11) | W4 4-9, W5 5-14 |
| 401 vs 403 | W6 6-7 | W5 5-14 |
| NAT | W2 2-10 | W7 7-9 (STUN/TURN) |
| Connection refused vs timed out | W3 3-15 | W2 2-15 |
| QUIC / HOL Blocking | W3 3-12 | W4 4-11 |

## Step 수 요약

| Week | Step 수 | ★ Step 수 | 주요 신규 엔진 |
|---|---|---|---|
| W2 | 16 | 6 | topology, bits |
| W3 | 17 | 9 | sequence, chart, compare, diagnose |
| W4 | 16 | 9 | (재사용 위주) |
| W5 | 19 | 10 | sandbox: CORS 빌더, Origin 비교기 |
| W6 | 18 | 10 | sandbox: 공격 실습실 |
| W7 | 18 | 9 | sandbox: Wildcard 매칭기 |