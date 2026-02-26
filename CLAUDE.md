# Narrative Simulator - 프로젝트 가이드

## 현재 진행 현황 (2026-02-26)

### 사용자 역할 정의
**PD (Producer/Director)**: 전체적인 소설의 집필과 세계관, 배경, 등장인물, 상황, 에피소드 전체부분의 디테일한 디렉팅

### 완료된 작업
1. ✅ **엔터키 이슈 수정** - 한국어 IME 입력 시 onKeyUp 사용
2. ✅ **파일 업로드 기능** - JSON/TXT 파일로 레이어 데이터 적용/참조
3. ✅ **세계관 디테일 필드 확장** - RegionDetail, ClimateInfo, EnvironmentInfo, SensoryPalette 타입 추가
4. ✅ **캐릭터 추가 기능** - 사이드 패널에서 신규 캐릭터 추가 모달
5. ✅ **시뮬레이션 NPC 승격** - 비중 높은 NPC를 주요 캐릭터로 승격
6. ✅ **API 프롬프트 업데이트** - write-episode에 세계관/캐릭터 세부 필드 반영
7. ✅ **사이드 패널 세계관 탭 확장** - RegionDetail, ClimateInfo 등 표시 UI
8. ✅ **에피소드 레벨 디렉팅 시스템** - PD 디렉팅 기능 완료
9. ✅ **세계 역사 타임라인 편집** - 시대/10년 단위 역사 편집 기능
10. ✅ **모바일 파일 업로드 호환성** - TXT/JSON 모바일 업로드 개선
11. ✅ **다중 작가 AI 시스템** - 장르/톤/분위기 조합 + 6단계 집필 + 3인 검토 시스템
12. ✅ **이원화 시뮬레이션 시스템** - 세계 역사(A) + 주인공 시점(B) 분리 시뮬레이션
13. ✅ **이원화 시뮬레이션 UI 버튼 연결** - 역사A/주인공B 탭 버튼에 API 호출 연결
14. ✅ **설정 모순 수정 요청 기능** - 팩트체크 모순 발견 시 자동 수정 및 비교 UI
15. ✅ **집필 프롬프트 4-Tier 아키텍처 리팩토링** - LLM 규칙 준수율 향상 + 동적 제약 생성
16. ✅ **Direction 미반영 버그 수정** - author-chat 레이어 생성 시 초기 아이디어 반영 강화 + write-episode에 projectDirection 추가
17. ✅ **Supabase author_config 방어 코드** - DB 컬럼 누락 시 해당 필드 제외 후 재시도 로직 추가
18. ✅ **에피소드 초기화/프로젝트 리셋 기능** - resetEpisodes(), resetProject() 스토어 함수 + 프로젝트 관리 드롭다운 UI
19. ✅ **buildUserPrompt 중복 제거** - 캐릭터 현재 상태/기억 잔상 중복 섹션 삭제 (레거시 모드)
20. ✅ **개별 에피소드 삭제** - 결과물 페이지에서 에피소드별 삭제 버튼 (호버 시 표시)
21. ✅ **네트워크 에러 대응 (Task 10)** - SSE heartbeat 추가 + 네트워크 에러 자동 재시도 (최대 1회)
22. ✅ **TIER 2 대화체/문단 연결 규칙** - 나이/신분 맞춤 말투 + 감정 브릿지 + 전환 패턴 제한
23. ✅ **author-chat heartbeat + 레이어 생성 재시도** - author-chat API 3개 ReadableStream에 heartbeat 추가 + generateLayerProposal 네트워크 에러 자동 재시도
24. ✅ **Anthropic Prompt Caching (Task 2.1)** - write-episode API에 cache_control 적용, 정적/동적 프롬프트 분리
25. ✅ **Dynamic Prompt Pruning (Task 2.2)** - 장면 유형별 컨텍스트 가지치기 (battle/romance/mystery 등)
26. ✅ **Async Background Processing (Task 2.3)** - Episode Log + Fact Check 병렬 백그라운드 실행
27. ✅ **Commercial Metrics Dashboard (Task 3.1)** - Hooking Score + Tension Curve 분석 시스템
28. ✅ **Meta Reader Simulator (Task 3.2)** - 5가지 독자 페르소나 시뮬레이션 댓글 생성
29. ✅ **Mega Hit Templates (Task 3.3)** - 7가지 인기 장르 황금 공식 템플릿
30. ✅ **Platform-specific Export (Task 3.4)** - 문피아/네이버시리즈/카카오페이지/리디북스 맞춤 포맷
31. ✅ **SSE Connection Reset 버그 수정** - author-chat API 연결 안정화 (초기 메시지 + 타임아웃 + 강화된 에러 처리)
32. ✅ **UI 다시 시도 버튼 수정** - isLoading 상태에서도 retry 관련 버튼 클릭 가능하도록 수정
33. ✅ **write-episode API 타임아웃 수정** - safeEnqueue/safeClose 패턴 적용, SSE 연결 안정화
34. ✅ **외래어 금지 규칙 추가** - 무협/동양판타지 장르에서 현대 외래어(팁, 오케이, 마스터 등) 사용 금지
35. ✅ **상황 중복 연출 금지** - TIER 3에 한 화 내 미시적 패턴 반복 금지 규칙 추가
36. ✅ **Writing Memory 고도화** - 1화 피드백 기반 4가지 영구 규칙 추가
    - 외래어 금지 강화 (리듬→박자, 스트레스→심화 등 대체어 명시)
    - Show Don't Tell 강화 (같은 독백 2회 반복 금지, 행동으로 대체)
    - 타임라인 검증 규칙 (연도/나이 교차 검증 필수)
    - 엑스트라 조우 텐션 규칙 (마이크로 텐션 필수 부여)
37. ✅ **프론트엔드 타임아웃 수정** - 스트리밍 응답 지연 대응
    - streamingFetch 재시도 로직 추가 (maxRetries=1)
    - heartbeat/connected 메시지 추적으로 연결 상태 확인
    - API heartbeat 간격 10초→5초로 단축
    - API 호출 전 즉시 heartbeat 다중 전송 (Time-to-First-Byte 최적화)
    - 에러 유형별 명확한 메시지 반환 (retryable 플래그 포함)
38. ✅ **2화 피드백 기반 Writing Memory 고도화** - 4가지 영구 규칙 추가
    - 타임라인 엄격화: 자의적 숫자 출력 금지, 이전 화 타임라인 그대로 유지
    - 대본체 탈피: 건조한 단문 금지, 감각 묘사 필수
    - 장면 전환 오버랩: "---" 점프 금지, 감각 트리거로 자연스러운 연결
    - 힘숨찐 대사 톤: 궁색한 변명 금지, 짧은 너스레로 여유롭게
39. ✅ **프롬프트 다이어트 및 타임아웃 근본 해결** - 3단계 최적화
    - **프롬프트 압축 (30%+ 토큰 절감)**: buildSystemPrompt, buildStaticSystemRules, buildDynamicSystemRules 극단적 압축
    - **동적 컨텍스트 가지치기 강화**: 직전 3화→1화, 등장 캐릭터만, 액션 필요 떡밥만
    - **스트리밍 즉시 플러시**: heartbeat 3초 간격, 다중 heartbeat 버스트, status 메시지 전송
40. ✅ **2화 집필 타임아웃 근본 원인 해결** - 3가지 Root Cause Fix
    - **내부 55초 타임아웃 제거**: Promise.race 타임아웃 로직 완전 제거 (근본 원인!)
    - **maxDuration 극대화**: 60초 → 300초 (Railway/Vercel Pro)
    - **프론트엔드 타임아웃 확장**: 180초 → 300초
    - **에러 로깅 고도화**: error.message, error.cause, error.stack 상세 출력
41. ✅ **Anthropic SDK 스트리밍 방식 변경** - `client.messages.stream()` → `client.messages.create({ stream: true })`
    - 더 낮은 레벨의 스트리밍 API 사용 (버퍼링 동작 차이)
    - TTFB(Time-to-First-Byte) 로깅 추가 (디버깅용)
    - 스트림 이벤트 카운트 및 총 시간 로깅

### 다음 작업 (2026-02-27 계속)
- **🔴 타임아웃 이슈 진단 중** - SDK 스트리밍 방식 변경 후 테스트 필요

#### 시도한 해결책
1. ✅ 내부 55초 Promise.race 타임아웃 제거
2. ✅ maxDuration 60초 → 300초 확장
3. ✅ 프론트엔드 타임아웃 180초 → 300초 확장
4. ✅ 프롬프트 30%+ 토큰 압축
5. ✅ 동적 컨텍스트 가지치기 (3화→1화, 캐릭터 5명 제한)
6. ✅ heartbeat 간격 5초 → 3초, 다중 버스트 전송
7. ✅ **SDK 스트리밍 방식 변경**: `stream()` → `create({ stream: true })` (2026-02-27)

#### 다음 시도할 해결책 (효과 없으면)
1. **Railway 로그 확인**: 실제 서버에서 어떤 에러가 발생하는지 확인
2. **프롬프트 추가 축소**: 시스템 프롬프트를 더 극단적으로 줄여 TTFB 단축
3. **모델 변경 테스트**: claude-sonnet-4 → claude-haiku-4 (속도 우선)
4. **분량 목표 축소**: 5000자 → 3000자 (응답 시간 단축)

#### 디버깅 필요 정보
- Railway 서버 로그에서 정확한 에러 메시지 확인 필요
- `=== WRITE EPISODE ERROR ===` 로그 확인 (error.cause 포함)
- `=== FIRST CHUNK RECEIVED (TTFB: ...)ms ===` 로그로 응답 시간 측정
- Anthropic API 응답 시간 측정 필요

### 배포 정보
- **플랫폼**: Railway
- **URL**: https://narrative-simulator-production.up.railway.app
- **환경변수**: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

---

## 작업 규칙 (필수)
- **모든 작업이 완료되면 반드시 이 CLAUDE.md 파일을 업데이트할 것.** 새로운 기능, 아키텍처 변경, 파일 추가/수정 내역을 반영하여 다음 세션에서 즉시 이어서 작업할 수 있도록 한다.
- **작업 완료 후 자동 배포**: 코드 변경 완료 시 `git add` → `git commit` → `git push` 자동 실행. 사용자가 별도로 요청하지 않아도 기본으로 수행한다.
- 프로젝트 정체서(`project-identity.md`)와 최상위 원칙(`supreme-principles.md`)을 모든 설계/구현 판단의 기준으로 삼는다.

### 최근 업데이트
- **2026-02-27**: Anthropic SDK 스트리밍 방식 변경
  - **SDK 메서드 변경** (`app/api/write-episode/route.ts`)
    - `client.messages.stream()` → `client.messages.create({ stream: true })`
    - 더 낮은 레벨의 스트리밍 API 사용 (버퍼링 동작 차이 기대)
  - **디버깅 로그 추가**
    - TTFB(Time-to-First-Byte) 측정: `=== FIRST CHUNK RECEIVED (TTFB: ...ms) ===`
    - 스트림 이벤트 카운트: `Total events: N`
    - 총 응답 시간: `Total time: Nms`
  - **테스트 필요**: 변경 후 2화 집필 타임아웃 해결 여부 확인
- **2026-02-26**: 2화 집필 타임아웃 근본 원인 해결
  - **Root Cause 1 - 내부 타임아웃 제거** (`app/api/write-episode/route.ts`)
    - 55초 Promise.race 타임아웃 완전 제거
    - maxDuration이 서버 타임아웃을 관리하므로 내부 타임아웃 불필요
    - "AI 응답이 지연되고 있어..." 에러의 직접 원인 해결
  - **Root Cause 2 - maxDuration 극대화**
    - `export const maxDuration = 60` → `= 300`
    - Railway는 무제한, Vercel Pro는 300초까지 지원
  - **Root Cause 3 - 프론트엔드 타임아웃 확장** (`app/projects/[id]/page.tsx`)
    - `timeoutMs: 180000` → `300000` (3분 → 5분)
  - **에러 로깅 고도화**
    - error.type, error.message, error.cause, error.stack 모두 출력
    - 디버깅 시 정확한 원인 파악 가능
- **2026-02-26**: 프롬프트 다이어트 및 타임아웃 근본 해결
  - **프롬프트 압축** (`app/api/write-episode/route.ts`)
    - buildSystemPrompt: 4-Tier 구조 → 압축 개조식 (~30% 토큰 절감)
    - buildStaticSystemRules/buildDynamicSystemRules: 캐싱용 압축 버전
    - 중복 규칙 통합, 설명투 제거, 핵심만 유지
  - **동적 컨텍스트 가지치기** (`lib/utils/active-context.ts`)
    - activeContextToPrompt: 압축 포맷 (각 섹션 1줄)
    - buildPrunedActiveContext: 직전 3화→1화, 떡밥 액션 필요한 것만
    - 세력 정보 2줄 제한, 캐릭터 5명 제한
  - **스트리밍 즉시 플러시** (`app/api/write-episode/route.ts`)
    - heartbeat 간격 5초→3초
    - 연결 즉시 다중 heartbeat 버스트
    - status 메시지 전송 ("프롬프트 준비 중...", "AI 집필 시작...")
- **2026-02-26**: 2화 피드백 기반 Writing Memory 및 집필 규칙 고도화
  - **타임라인 엄격화** (영구 규칙 추가)
    - 과거 시점/햇수 자의적 출력 금지
    - World Bible과 이전 화 로그의 공식 타임라인 최우선 교차 검증
    - "17년 전 멸문"을 "30년 전"으로 바꾸는 등의 설정 붕괴 방지
  - **대본체 탈피** (영구 규칙 추가)
    - "진무혁이 고개를 든다." 같은 건조한 단문 금지
    - 모든 행동에 시각/청각/촉각 감각 디테일 필수
  - **장면 전환 오버랩** (TIER 3 추가)
    - "---" 구분선만 긋고 과거로 점프하는 1차원적 전환 금지
    - 현재 씬의 마지막 묘사를 트리거로 다음 씬에 자연스럽게 오버랩
  - **힘숨찐 대사 톤** (영구 규칙 추가)
    - 의심받을 때 궁색한 변명 대신 짧은 너스레로 여유롭게 흘리기
  - **검증 체크리스트 4개 항목 추가**
- **2026-02-26**: 프론트엔드 타임아웃 및 스트리밍 응답 지연 수정
  - **streamingFetch 개선** (`app/projects/[id]/page.tsx`)
    - maxRetries 파라미터 추가 (기본 1회 재시도)
    - heartbeat/connected 메시지 추적으로 연결 상태 확인
    - 세분화된 에러 타입: AI_SERVER_NO_RESPONSE, AI_SERVER_CONNECTION_LOST, AI_SERVER_INCOMPLETE_RESPONSE, AI_SERVER_TIMEOUT
    - 재시도 가능 에러 시 2초 대기 후 자동 재시도
  - **API heartbeat 강화** (`write-episode`, `author-chat`)
    - heartbeat 간격 10초 → 5초로 단축
    - 연결 확인 직후 즉시 heartbeat 전송
    - API 호출 직전 추가 heartbeat 전송 (TTFB 최적화)
  - **에러 메시지 개선**
    - 모든 에러에 retryable 플래그 추가
    - 에러 유형별 구체적 suggestion 제공
- **2026-02-26**: Writing Memory 고도화 - 1화 피드백 기반 영구 규칙 추가
  - **외래어 금지 강화** (`app/api/write-episode/route.ts`)
    - 금지 어휘 확장: 리듬, 스트레스, 타이밍, 센스, 컨트롤, 밸런스, 패턴 등
    - 대체 표현 명시: 리듬→박자, 스트레스→심화(心火), 타이밍→틈/찰나, 컨트롤→절제
  - **Show Don't Tell 영구 규칙** (`lib/utils/writing-memory.ts`)
    - PERMANENT_RULES에 4가지 100% 신뢰도 규칙 추가
    - 같은 정체성 독백 2회 반복 금지 → 무의식적 행동으로 대체
    - 감정 직접 서술 금지 → 신체 반응으로 번역
  - **타임라인 검증 규칙** (TIER 3)
    - 과거 회상 시 World Bible 타임라인 교차 검증 필수
    - 연도/나이 숫자 충돌 방지
  - **엑스트라 조우 텐션** (TIER 3)
    - 모든 조우 씬에 마이크로 텐션 필수 부여
    - 검증 체크리스트에 4개 항목 추가
- **2026-02-26**: 4가지 버그 수정 및 집필 퀄리티 고도화
  - **Fix 1: UI 다시 시도 버튼** (`app/projects/[id]/page.tsx`)
    - `handleChoiceClick`에서 retry 관련 액션은 isLoading 상태와 무관하게 허용
    - 버튼 렌더링 시 retry 액션은 disabled 제외
  - **Fix 2: write-episode API 타임아웃** (`app/api/write-episode/route.ts`)
    - 모든 `controller.enqueue` → `safeEnqueue` 변경
    - 모든 `clearInterval(heartbeat); controller.close();` → `safeClose()` 변경
    - author-chat API와 동일한 SSE 안정화 패턴 적용
  - **Fix 3: 외래어 금지 규칙** (`app/api/write-episode/route.ts`)
    - TIER 2에 장르별 금지 어휘 섹션 추가
    - 무협/동양판타지: 팁, 오케이, 마스터, 미션, 스킬, 레벨 등 현대 외래어 금지
    - 대체 표현 가이드 제공 (팁→가르침, 마스터→사부 등)
  - **Fix 4: 상황 중복 연출 금지** (`app/api/write-episode/route.ts`)
    - TIER 3에 [반복 제거] 섹션 추가
    - 같은 위기→구출 패턴 2회 이상 금지
    - 같은 감정 비트/대사 구조/능력 사용 반복 금지
    - 검증 체크리스트에 반복 패턴 확인 항목 추가
- **2026-02-26**: SSE Connection Reset 버그 수정 (`app/api/author-chat/route.ts`)
  - **문제**: `net::ERR_CONNECTION_RESET` 및 `TypeError: network error` 발생
  - **원인**: Anthropic API 첫 응답 전 연결 타임아웃, heartbeat 지연
  - **해결**:
    1. **즉시 연결 확인 메시지**: API 호출 직전에 `type: 'connected'` 이벤트 전송
    2. **heartbeat 주기 단축**: 15초 → 10초 (Railway/Vercel 타임아웃 방지)
    3. **API 타임아웃 설정**: 55초 타임아웃 (maxDuration 60초보다 약간 짧게)
    4. **안전한 스트림 관리**: `safeEnqueue()`, `safeClose()` 헬퍼 함수로 이중 close 방지
    5. **명확한 에러 메시지**: 타임아웃 시 `AI 응답이 지연되고 있어` 메시지 반환
  - **적용 범위**: Writing/Conversation/Layer 3개 ReadableStream 모두 수정
- **2026-02-26**: Architecture Optimization Tasks 완료
  - **Task 2.1: Anthropic Prompt Caching** (`app/api/write-episode/route.ts`):
    - `CachedSystemMessage` 타입 추가 (cache_control 지원)
    - `buildStaticSystemRules()` - 캐시 가능한 정적 규칙 (~1000+ 토큰)
    - `buildDynamicSystemRules()` - 화별 동적 규칙
    - `buildCachedSystemPrompt()` - 정적/동적 블록 분리
    - 첫 번째 정적 블록에 `cache_control: { type: 'ephemeral' }` 적용
  - **Task 2.2: Dynamic Prompt Pruning** (`lib/utils/active-context.ts`):
    - `SceneType` 타입: battle, romance, mystery, political, daily, growth, exploration, mixed
    - `detectSceneType()` - EpisodeDirection에서 장면 유형 감지
    - `pruneWorldBible()` - 장면 유형에 따른 컨텍스트 가지치기
    - `buildPrunedActiveContext()` - 가지치기된 Active Context 생성
    - 예: battle 장면 → powerSystem/rules 유지, 관계/일상 축소
  - **Task 2.3: Async Background Processing** (`app/projects/[id]/page.tsx`):
    - `handlePostEpisodeCreation()` 비동기 백그라운드로 변경
    - Episode Log 생성 + Fact Check 병렬 실행
    - 사용자 대기 없이 백그라운드에서 독립 실행
    - 실패해도 다른 작업에 영향 없음
  - **Task 3.1: Commercial Metrics Dashboard** (`lib/utils/commercial-metrics.ts`):
    - `HookingScore`: 오프닝훅/클리프행어/긴장유지/보상밀도/캐릭터모멘텀 분석
    - `TensionCurve`: 10개 구간 긴장도 분석, 커브 타입 분류
    - `CommercialMetrics`: 잔존율/다음화 클릭 확률 예측
  - **Task 3.2: Meta Reader Simulator** (`lib/utils/reader-simulator.ts`):
    - 5가지 독자 페르소나: 정주행러, 초고수, 까다로운 평론가, 커플러, 설정덕후
    - 페르소나별 댓글 템플릿 및 반응 생성
    - `ReaderReactionSummary`: 감정 점수, 하이라이트, 우려, 이탈 위험
  - **Task 3.3: Mega Hit Templates** (`lib/presets/mega-hit-templates.ts`):
    - 7가지 장르 템플릿: 회귀/빙의/아카데미/탑클라이밍/던전/무협/로판
    - 황금 훅, 플롯 구조, 성공 사례, 흔한 실수
    - `generateColdStartGuide()`: 1화 아웃라인 자동 생성
  - **Task 3.4: Platform Export** (`lib/utils/platform-export.ts`):
    - 5개 플랫폼: 문피아/네이버시리즈/카카오페이지/리디북스/일반
    - 플랫폼별 분량/포맷팅/제한사항 스펙
    - `formatForPlatform()`: 자동 포맷 변환 및 검증
    - `recommendPlatform()`: 분량 기반 플랫폼 추천
- **2026-02-26**: PROMPT-REFACTOR-INSTRUCTIONS7 구현
  - **author-chat API heartbeat 추가** (`app/api/author-chat/route.ts`):
    - 3개 ReadableStream에 15초 heartbeat 추가 (Writing mode, Conversation, Layer generation)
    - 각 스트림 종료/에러 시 `clearInterval(heartbeat)` 정리
    - Railway/Vercel 타임아웃 방지
  - **generateLayerProposal 자동 재시도** (`app/projects/[id]/page.tsx`):
    - 네트워크/timeout 에러 시 2초 후 자동 재시도 (최대 1회)
    - 재시도 실패 시 수동 재시도 버튼 표시
    - "씨앗 레이어 확정 후 에러" 문제 해결
- **2026-02-26**: PROMPT-REFACTOR-INSTRUCTIONS6 추가 구현
  - **TIER 2 대화체 규칙 강화** (`app/api/write-episode/route.ts`):
    - 캐릭터 나이/신분에 맞는 말투 규칙 추가
    - 10대 후반 소년, 무림 고수 등 캐릭터 유형별 대화 예시
    - "왜요?" "뭘요?" 유아적 표현 금지
    - 상대에 따른 말투 변화 규칙
  - **TIER 2 문단 연결 규칙 추가**:
    - 장면 전환 시 감정 브릿지 필수
    - "그때였다." "그런데 갑자기." 패턴 2회 이상 사용 금지
    - 서술→대화 단조로운 교대 금지
  - **기존 작업 확인** (이전 세션에서 완료됨):
    - Task 1-3 (buildSystemPrompt 4-Tier 구조)
    - Task 4 (buildUserPrompt 중복 제거)
    - Task 5 (EpisodeLog 추적 필드)
    - Task 6 (generate-episode-log 프롬프트)
    - Task 7 (direction 미반영 버그)
    - Task 8-10 (Supabase 방어, 리셋 기능, 네트워크 에러)
- **2026-02-26**: PROMPT-REFACTOR-INSTRUCTIONS5 구현 (Task 10 - 네트워크 에러 대응)
  - **SSE heartbeat 추가** (`app/api/write-episode/route.ts`):
    - 15초마다 `: heartbeat\n\n` 전송하여 Railway/Vercel 연결 유지
    - 스트림 종료/에러 시 `clearInterval(heartbeat)` 정리
  - **네트워크 에러 자동 재시도** (`app/projects/[id]/page.tsx`):
    - `write_next_episode` 핸들러에 에러 감지 로직 추가
    - network/timeout/abort/fetch 에러 시 3초 후 자동 재시도 (최대 1회)
    - 재시도 실패 시 수동 재시도 버튼 표시
    - API 호출 파라미터를 try 블록 밖으로 이동하여 재사용
- **2026-02-26**: 개별 에피소드 삭제 기능
  - 결과물 페이지 (`app/projects/[id]/result/page.tsx`)에 에피소드별 삭제 버튼 추가
  - 호버 시 ✕ 버튼 표시, 클릭 시 확인 후 삭제
  - 삭제 후 현재 인덱스 자동 조정
- **2026-02-26**: PROMPT-REFACTOR-INSTRUCTIONS4 구현
  - **에피소드 초기화/프로젝트 리셋 기능 (작업 9)**:
    - `resetEpisodes()`: 에피소드만 삭제 (세계관/캐릭터 설정 유지)
    - `resetProject()`: 프로젝트 완전 리셋 (세계관부터 다시)
    - 프로젝트 페이지 헤더에 ⚙️ 프로젝트 관리 드롭다운 추가
  - **buildUserPrompt 중복 제거 (작업 4)**:
    - 레거시 모드에서 "캐릭터 현재 상태", "기억 잔상" 중복 섹션 삭제
  - **이미 완료된 작업 확인**:
    - 작업 1-3 (buildSystemPrompt 4-Tier 구조): 이전 세션에서 완료
    - 작업 5 (EpisodeLog 추적 필드): 이전 세션에서 완료
    - 작업 6 (generate-episode-log 프롬프트): 이전 세션에서 완료
    - 작업 7 (direction 미반영 버그): 이전 세션에서 완료
    - 작업 8 (Supabase 방어 코드): 이번 세션 시작 시 완료
  - **수정 파일**:
    - `lib/store/project-store.ts`: resetEpisodes, resetProject 함수 추가
    - `app/projects/[id]/page.tsx`: 프로젝트 관리 드롭다운 UI
    - `app/api/write-episode/route.ts`: 중복 섹션 제거
- **2026-02-26**: Supabase author_config 방어 코드 추가
  - `saveProjectToSupabase()` 함수에 방어 로직 추가
  - `author_config` 컬럼이 DB에 없을 때 발생하는 에러 핸들링
  - 에러 메시지에 'author_config' 포함 시 해당 필드 제외하고 재시도
  - **수정 파일**: `lib/supabase/db.ts`
- **2026-02-26**: Direction 미반영 버그 수정 + 프롬프트 강화
  - **author-chat API direction 버그 수정**:
    - 사용자가 프로젝트 생성 시 입력한 "방향(direction)"이 레이어 생성에 제대로 반영되지 않던 문제 해결
    - 각 레이어(world, coreRules, seeds, heroArc, villainArc, ultimateMystery) 프롬프트의 "임무" 섹션에 direction 명시적 삽입
    - 패턴: `환님의 초기 아이디어를 반드시 반영해: "${direction}"`
  - **write-episode API projectDirection 추가**:
    - `buildUserPrompt`에 `projectDirection` 파라미터 추가
    - 매 화 집필 시 "이 소설의 기본 전제" 섹션으로 project.direction 주입
    - Active Context 모드와 레거시 모드 모두에 적용
  - **수정 파일**:
    - `app/api/author-chat/route.ts`: 6개 레이어 프롬프트 수정
    - `app/api/write-episode/route.ts`: buildUserPrompt 파라미터 및 프롬프트 확장
- **2026-02-25**: 집필 프롬프트 4-Tier 아키텍처 리팩토링
  - **4-Tier 프롬프트 구조** (PROMPT-REFACTOR-INSTRUCTIONS.md 기반):
    - TIER 0: 절대 규칙 (MUST - 위반 시 전체 무효)
    - TIER 1: 이번 화 컨텍스트 (화수, 독백 톤, 클리프행어 추천)
    - TIER 2: 작가 DNA (페르소나, 시점, 문체 핵심)
    - TIER 3: 참고 규칙 (빌드업, 캐릭터, 연출, 검증)
  - **MUST 3개 규칙**:
    - MUST-1: 설명 금지 (캐릭터가 설정을 대사로 설명 금지)
    - MUST-2: 능력 공개 속도 제한 (에피소드 번호 기반 동적 생성)
    - MUST-3: 패턴 반복 금지 (이전 화 로그 기반 동적 생성)
  - **동적 제약 생성**:
    - `getAbilityConstraint(episodeNumber)`: 화수에 따른 능력 공개 제한
    - `getPatternBanList(recentLogs)`: 최근 3화 로그 기반 금지 목록
  - **buildUserPrompt 중복 제거**:
    - Active Context 있으면 압축 모드 (중복 섹션 제거)
    - 없으면 레거시 모드 유지
  - **EpisodeLog 추적 필드 추가**:
    - `abilitiesShown[]`: 이번 화에서 드러난 능력
    - `emotionsDominant[]`: 주인공 주요 감정
    - `narrativePatterns[]`: 사용한 서사 패턴
    - `villainActions[]`: 적이 한 행동
  - **수정 파일**:
    - `app/api/write-episode/route.ts`: buildSystemPrompt 4-Tier 구조로 전면 교체
    - `app/api/generate-episode-log/route.ts`: 추적 필드 추출 추가
    - `lib/types/index.ts`: EpisodeLog 타입 확장
- **2026-02-25**: 설정 모순 수정 요청 기능 구현
  - **팩트체크 모순 발견 시 "수정 요청" 버튼 동작**:
    1. `/api/revise-episode` API에 `mode: 'contradiction'` 추가
    2. 모순 데이터를 기반으로 AI가 해당 부분만 수정
    3. 수정 전/후 비교 모달 표시 (변경 부분 하이라이트)
    4. [수정본 채택] 또는 [원본 유지] 선택
    5. World Bible 업데이트 제안 기능 (선택사항)
  - **"무시하고 진행" 버튼**:
    - 무시한 모순 로깅 (`ignoredContradictions` 상태)
    - 콘솔에 무시 기록 출력
  - **수정 파일**:
    - `app/api/revise-episode/route.ts`: contradiction 모드 추가
    - `app/projects/[id]/page.tsx`: 수정 비교 모달 UI + 핸들러
  - **새 상태 변수**:
    - `revisionComparison`: 원본/수정본/변경부분/World Bible 제안
    - `showRevisionModal`: 비교 모달 표시
    - `isFixingContradiction`: 수정 중 로딩 상태
    - `ignoredContradictions`: 무시된 모순 로그
- **2026-02-25**: 이원화 시뮬레이션 UI 버튼 API 연결 완료
  - 역사A 탭: 세계 역사 생성 버튼 → `handleGenerateWorldHistory()` 연결
  - 주인공B 탭: 전사/성장기 버튼 → `handleSimulatePrehistory()`/`handleSimulateGrowth()` 연결
  - 입력 필드를 defaultValue에서 controlled input (value + onChange)로 변경
  - 모바일 바텀 시트에도 동일한 버튼 연결 적용
  - 로딩 상태(isSimulating)에 따른 버튼 비활성화 및 텍스트 변경
- **2026-02-25**: 이원화 시뮬레이션 시스템 구현
  - **Simulation A (세계 역사)**: 세계 역사를 사용자 지정 범위와 단위로 시뮬레이션
    - `startYearsBefore`, `endYearsBefore`, `unit` 설정 가능
    - 드릴다운 기능: 특정 시대를 더 세분화된 단위로 상세화
    - `/api/generate-world-history` API 확장 (드릴다운 모드 지원)
  - **Simulation B (주인공 시점)**: 주인공의 일대기를 3구간으로 시뮬레이션
    - 구간 1: 전사(前史) - 주인공 출생 전 부모/스승 세대
    - 구간 2: 성장기 - 0세부터 소설 시작 시점까지
    - 구간 3: 소설 진행 - 시간 점프 시뮬레이션
  - **새 API**:
    - `/api/simulate-prehistory`: 주인공 전사 시뮬레이션
    - `/api/advance-timeline`: 소설 중 시간 점프 시뮬레이션
  - **새 타입**:
    - `DualSimulationConfig`, `WorldHistorySimulationConfig`, `ProtagonistSimulationConfig`
    - `PrehistoryEvent`, `ProtagonistPrehistory`, `TimelineAdvance`, `WorldHistorySubEra`
  - **스토어 확장**:
    - `setDualSimulationConfig`, `updateDualSimulationConfig`
    - `setProtagonistPrehistory`, `addTimelineAdvance`, `updateTimelineAdvance`
  - **UI 탭 변경**: [세계] [역사] [캐릭터] [원고] → [세계] [역사A] [주인공B] [원고]
  - **수정 파일**:
    - `lib/types/index.ts`: 이원화 시뮬레이션 타입 추가
    - `lib/store/project-store.ts`: 스토어 액션 추가
    - `lib/supabase/types.ts`, `lib/supabase/db.ts`: Supabase 저장/로드 지원
    - `app/api/generate-world-history/route.ts`: 사용자 설정 범위 + 드릴다운 지원
    - `app/api/simulate-prehistory/route.ts`: 신규
    - `app/api/advance-timeline/route.ts`: 신규
    - `app/projects/[id]/page.tsx`: 탭 UI 변경 + 시뮬레이션 컨트롤
- **2026-02-25**: 다중 작가 AI 시스템 구현
  - 기존 4종 작가 페르소나 선택 → **장르 + 톤 + 분위기 조합** 방식으로 변경
  - 5개 장르 DNA: 무협, 판타지, 현대판타지, 로맨스, 회귀/환생
  - 톤 밀도 3단계: 라이트, 미디엄, 딥
  - 분위기 6종 (복수 선택): 유머/자조, 서정적, 건조/하드보일드, 철학적, 다크/그리티, 열혈
  - 대사 스타일 4종: 짧고 강렬, 현실적, 문어체, 혼합
  - 묘사 밀도 3단계: 최소한, 균형, 풍부
  - **집필 프로세스 4단계 → 6단계 재구성**:
    - 1단계: 페르소나 장착 (장르 DNA + 톤 로드)
    - 2단계: 설계관 사전 검토 (개연성/프로필/연속성)
    - 3단계: 연출관 설계 (장면/호흡/클리프행어/잔향)
    - 4단계: 초고 집필
    - 5단계: 3인 합동 검토 (설계관+연출관+시장관)
    - 6단계: 최종 수정
  - **3인 검토 체계**:
    - 설계관 (논리): 캐릭터 행동 일치, 힘 밸런스, 이전 화 모순, 세계관 규칙
    - 연출관 (몰입): 첫 문단, 문장 호흡, 감각 번역, 잔향, 클리프행어
    - 시장관 (상업성): 500자 훅, 분량, 보상 지연, 독자 반응, 몰입 4요소
  - 하위 호환: `inferConfigFromPersonaId()` 함수로 기존 authorPersonaId 자동 변환
  - 수정 파일:
    - `lib/types/index.ts`: GenreType, ToneDensity, MoodType, DialogueStyle, DescriptionDensity, AuthorConfig, GenrePersonaDNA 타입 추가
    - `lib/presets/genre-personas.ts`: 신규 - 장르 DNA, 가이드, 프롬프트 빌더
    - `app/projects/new/page.tsx`: 새 프로젝트 생성 UI 전면 변경
    - `lib/store/project-store.ts`: authorConfig 지원
    - `lib/supabase/types.ts`, `lib/supabase/db.ts`: author_config 필드 추가
    - `app/api/write-episode/route.ts`: 6단계 + 3인 검토 프롬프트
- **2026-02-24**: 모바일 파일 업로드 호환성 개선
  - 숨겨진 파일 인풋을 sr-only 패턴으로 변경 (position: absolute, clip)
  - accept 속성에 MIME 타입 추가 (`application/json`, `text/plain`, `text/*`)
  - 캐릭터 업로드에서 TXT, JSON 파일 모두 지원
  - `parseCharacterJson()` 함수 추가 (JSON 캐릭터 파일 파싱)
  - 오류 처리 개선 및 파일 크기 제한 (10MB)
  - 버튼 레이블 "TXT 업로드" → "파일 업로드" 변경
- **2026-02-24**: 세계 역사 타임라인 편집 기능 추가
  - `components/world/TimelineEditor.tsx` - 타임라인 편집 모달 컴포넌트
  - 시대(Era) 탭: 이름, 연도 범위, 설명, 세력 변화, 분위기, 핵심 사건, 주요 인물, 미스터리 힌트, 유산
  - 10년 단위(Decade) 탭: 연도 범위, 긴장도, 세계 상태, 주요 이벤트, 복선/힌트
  - 사이드 패널 역사 탭에 "📅 역사 타임라인 편집" 버튼 추가
  - 시대/10년 단위 추가/삭제/편집 기능
  - 설정에 따라 천년 전 인물이 현재의 주인공일 수도 있고, 현재 태어난 주인공일 수도 있음
  - 변경사항은 `setWorldHistory()`로 저장, 다음 화 집필 시 자동 반영
- **2026-02-24**: 에피소드 레벨 디렉팅 시스템 완료
  - `EpisodeDirection` 타입 정의 (감정 톤, 강제 장면, 캐릭터 지시, 떡밥 지시, 페이스, 클리프행어 등)
  - `EpisodeDirectionModal` 컴포넌트 구현 (감정 그리드, 장면 편집기, 캐릭터 지시 등)
  - `write-episode` API에 `buildEpisodeDirectionSection()` 함수 추가 - PD 디렉팅을 프롬프트에 최우선 반영
  - 에피소드 채택 후 "🎬 디렉팅 설정" 옵션 추가
  - 세계관/캐릭터 세부 정보(`worldLayer`, `seedsLayer`)를 write-episode API에서 활용
- **2026-02-24**: 캐릭터 TXT 파일 업로드 기능 추가
  - `lib/utils/character-txt-parser.ts` - TXT 파일 파싱 유틸리티
  - 지원 형식: `=== 캐릭터: 이름 ===` 블록 형식 또는 `이름 - 역할 - 설명` 간단 형식
  - 파싱 필드: 역할, 위치, 성격, 숨겨진 동기, 외모, 말투, 배경, 소속, 비중, 관계, 서사
  - 사이드 패널 캐릭터 탭에 "📄 TXT 업로드" 버튼 추가
  - 업로드 결과 모달: 캐릭터 미리보기, 선택적 추가
  - 예시 템플릿 다운로드 기능 (`character-template.txt`)
- **2026-02-24**: 세계관/캐릭터 편집 기능 추가
  - `components/world/WorldSettingsEditor.tsx` - 세계관 편집 모달 컴포넌트
  - 주인공 탭: 이름, 나이, 태생, 소속, 환경, 현재 상태, 핵심 서사, 목표, 욕망/결핍, 약점
  - 빌런 탭: 이름, 나이, 태생, 소속, 표면적 목표, 동기, 자기 정당화, 핵심 서사, 관계
  - NPC 탭: 각 NPC 접기/펼치기로 모든 필드 편집 가능
  - 사이드 패널 세계/캐릭터 탭에 "🛠️ 세계관/캐릭터 편집" 버튼 추가
  - 변경사항은 레이어에 저장되어 다음 화 집필 시 자동 반영
- **2026-02-23**: 캐릭터 추가 및 시뮬레이션 NPC 승격 기능 추가
  - 사이드 패널 캐릭터 탭에 등록된 NPC 목록 표시 (주연/조연/단역 배지)
  - 캐릭터 추가 모달: 이름, 역할, 위치, 성격, 숨겨진 동기, 세부 설정
  - 시뮬레이션 발생 NPC 표시 (중요도 50점 이상, 등장 횟수, 첫 등장 연도)
  - NPC 승격 기능: 시뮬레이션 NPC를 주요 캐릭터로 전환
  - `handleAddCharacter()`, `handlePromoteSimulationNPC()` 핸들러
  - `NPCSeedInfo`, `SimulationNPC`, `SeedsLayer` 타입 활용
- **2026-02-23**: 프로젝트 탐색 및 공개 설정 기능 추가
  - `/explore` 페이지: 모든 공개 프로젝트 목록 조회
  - `/shared/[projectId]`: 읽기 전용 프로젝트 뷰어 (스포일러 제외)
  - `is_public` 컬럼 추가 (Supabase projects 테이블)
  - 프로젝트 카드에 공개/비공개 토글 버튼 (🌐/🔒)
  - 프로젝트 목록에 [탐색] 버튼 추가
  - `loadPublicProjects()`, `updateProjectVisibility()` 함수 추가
- **2026-02-23**: SSE 스트리밍 전환 + 레이어 진행 방식 변경
  - `author-chat`, `write-episode`, `generate-world-bible` API를 SSE 스트리밍으로 전환
  - `maxDuration = 60` 추가 (Vercel Fluid Compute 활성화)
  - Vercel Hobby 플랜 10초 타임아웃 문제 해결
  - 레이어 진행: AI 제안 우선 → 사용자 입력 우선으로 변경
  - 새 레이어 시작 시 가이드 메시지 표시 (`waitingForUserInput` 플래그)
  - 프론트엔드에 `streamingFetch` 헬퍼 함수 추가
- **2026-02-23**: 세계관 데이터 불러오기 기능 추가
  - 대시보드에 "📚 세계관 불러오기" 버튼 추가
  - `data/` 폴더의 JSON 파일들을 불러와 새 프로젝트 자동 생성
  - world-config.json → WorldLayer + CoreRulesLayer 변환
  - characters.json + factions-*.json → SeedsLayer 변환
  - 세계관/규칙/씨앗 레이어 자동 확정, heroArc부터 시작
  - `lib/utils/world-data-loader.ts` 유틸리티 추가
- **2026-02-23**: 천추의강호 세계관 데이터 JSON 구조화 (`data/` 폴더 재구성)
  - 10개 JSON 파일로 세계관 데이터 체계화
  - 주인공(4신), 전설(1신~4존), 5왕, 6괴, 7귀, 8성, 9마, 10선 캐릭터
  - 5대 세력 + 배후세력(현기원) 조직 구조
  - 지역/충돌지대/교통로 데이터

---

## 프로젝트 정체서 (project-identity.md)

> **이 프로젝트의 존재 이유를 정의한다. 모든 지시서는 이 문서에 봉사한다.**

### 핵심 목적
```
흥행하는 웹소설을 만드는 시스템이다.
조회수가 높고, 연독율이 높은 웹소설.

시뮬레이션, 작가 AI, 세계관, 캐릭터 시스템 —
이 모든 것은 "재미있는 웹소설"을 만들기 위한 도구일 뿐이다.
도구가 목적이 되면 안 된다.
```

### 시뮬레이션의 목적
- 캐릭터에게 **"진짜 인생"**을 부여하는 도구
- 0세부터 시련과 성장을 살아온 캐릭터 = 더 입체적
- 캐릭터가 매력적이면 성공, 평면적이면 실패

### 워크플로우
```
환님 (사용자)
  │ 큰 틀의 주제 + 핵심 워딩 제공
  ▼
작가 AI (페르소나)
  │ ├─ 세계관 구축
  │ ├─ 캐릭터 서사 아크 설계
  │ ├─ 시뮬레이션 지휘
  │ ├─ 스토리 구조 설계
  │ └─ 집필
  ▼
흥행하는 웹소설 (결과물)
  ▼
환님 검토/피드백 → 작가 수정 → 반복
```

### 각 시스템의 역할 (도구로서)
| 시스템 | 역할 | 봉사하는 목적 |
|--------|------|--------------|
| 시뮬레이션 엔진 | 캐릭터에게 살아온 인생을 부여 | 매력적인 캐릭터 |
| 경험 레이어 | 씨앗에서 성격/능력이 자연 발현 | 캐릭터의 입체성 |
| NPC 자연 발생 | 동료/조력자/빌런이 서사에서 탄생 | 관계의 자연스러움 |
| 서사 아크 | 캐릭터의 여정 큰 그림 설계 | 이야기의 구조 |
| 작가 디렉션 | 시련/성장/만남을 적재적소에 | 스토리의 재미 |
| 스토리라인 모니터 | 방향 이탈/패턴 반복 감지 | 품질 유지 |
| 집필 엔진 | 실제 웹소설 텍스트 생성 | 최종 산출물 |
| 최상위 원칙 | 모든 시스템의 행동 규범 | **재미 > 나머지 전부** |

### 지시서 계층 구조
```
프로젝트 정체서 (최상위)
  ├─ 최상위 원칙 (supreme-principles.md)
  ├─ 통합 지시서 (MASTER-INSTRUCTION-FINAL.md)
  └─ 추가 지시서들 (씨앗, 스토리라인, 작가 AI 등)

※ 상위 문서와 하위 문서 충돌 시 → 상위 문서 우선
```

---

## 최상위 원칙 (supreme-principles.md)

> **이 원칙은 모든 지시서·설계 헌법·코드 구현보다 우선한다.**

### 원칙 1: 캐릭터의 자율성
- 캐릭터 시뮬레이션은 자율적으로 진행된다.
- 처음부터 나쁜 놈은 없다. 세상이, 환경이 그리 만들었을 뿐이다.
- 악인도 악인이 된 이유가 있고, 영웅도 나약했던 시절이 있다.
- 모든 캐릭터는 자신의 경험이 만든 존재다.

### 원칙 2: 작가의 역할
- 작가는 캐릭터에게 시련과 성장의 계기를 부여하는 "신(God)".
- 작가는 상황을 만들고, 캐릭터는 자율적으로 반응한다.
- 캐릭터의 반응을 하드코딩하지 않는다.

### 원칙 3: 반복의 경계
- 시련→성장→시련→성장 단순 반복 금지.
- 기연→각성→기연→각성 단순 반복 금지.
- 패턴을 깨라: 성장인 줄 알았는데 함정, 시련이 오히려 기회, 기연의 대가가 너무 큼, 평온이 가장 위험, 적이 유일한 아군.
- 독자가 "다음에 뭐가 올지" 예측하는 순간 이야기는 죽는다.

### 원칙 4: 임팩트 있는 집필
- 재미가 최우선. 문학성·구조·깊이 전부 중요하지만 재미보다 우선하지 않는다.
- 매 화 첫 문장이 독자를 잡고, 마지막 문장이 다음 화를 클릭하게 만든다.
- 감정은 설명하지 않고 보여준다 (Show, Don't Tell).
- 대사는 짧고 강렬하게. 70%만 보여주고 30%는 상상하게.

### 적용 범위
| 시스템 | 적용 내용 |
|--------|----------|
| 시뮬레이션 엔진 | 캐릭터 반응 자율성 보장, 하드코딩된 이벤트 유형/나이별 가이드 금지 |
| 작가 AI | 패턴 반복 회피, 예측 불가능한 전개, 임팩트 있는 문체 |
| 스토리라인 모니터 | 패턴 반복 감지 경고(`repetitive`), 흥미도 저하 감지 경고(`interest`) |
| 세계관/연대기 | 세상이 캐릭터를 만든다는 전제, 환경이 선택을 이끈다 |
| 설계 헌법 | 최상위 원칙 > 설계 헌법 (단, 하드코딩 금지 원칙은 유지) |

---

## 프로젝트 개요
무협/판타지 웹소설의 서사를 AI로 생성하는 시뮬레이터. 캐릭터가 세계관 안에서 해마다 이벤트를 겪고, 그 이벤트를 편집해 소설로 완성하는 도구.

## 기술 스택
- **프레임워크**: Next.js 16.1.6 (Turbopack, App Router)
- **UI**: React 19 + Tailwind CSS v4 (`@theme inline` in globals.css, NOT tailwind.config.ts)
- **상태관리**: Zustand 5 + localStorage persist
- **AI**: @anthropic-ai/sdk
  - 시뮬레이션: `claude-haiku-4-5-20251001` (저비용)
  - 세밀 장면: `claude-sonnet-4-5-20250929` (고품질)
- **내보내기**: `docx` npm 패키지 (DOCX), 자체 TXT/HTML
- **TypeScript**: strict mode

## 알려진 이슈 & 해결 이력
- 한국어 경로 `웹소설` → Turbopack panic → `next.config.ts`에 `turbopack.root: "."` 로 해결
- `--no-turbopack` 플래그 없음 (Next.js 16에서 turbopack 기본)
- `CharacterStats` → `Record<string, number>` 변환 시 `unknown` 중간 캐스트 필요
- `Packer.toBuffer()`는 `Uint8Array` 반환 → `as unknown as BodyInit`
- Faction 타입 캐스트: spread 패턴 `{ ...updated[idx], [field]: val }` 사용
- **씨앗 모드 캐릭터 생성 버그 (수정완료)**: `/create` 마법사에서 `CharacterBuilder`에 `onSeedsChange` prop 미전달 → seeds가 store에 저장 안 됨. `TimelineSetup`에서도 `setSeeds()`/`setWorldEvents()`/`setStoryDirectorConfig()` 미호출. 3곳 수정으로 해결

## 파일 구조 (UNIFIED-INSTRUCTION 기반 재구현 - 2026-02-10)

```
app/
├── page.tsx                    # 루트 → /projects 리다이렉트
├── layout.tsx                  # 루트 레이아웃
├── globals.css                 # Tailwind v4 @theme inline + 커스텀 테마
├── projects/
│   ├── page.tsx                # 프로젝트 목록
│   ├── new/
│   │   └── page.tsx            # 새 프로젝트 (장르/톤/시점/작가 선택)
│   └── [id]/
│       ├── page.tsx            # 작가 대화 (핵심 화면 - 레이어 구축)
│       └── result/
│           └── page.tsx        # 결과물 (에피소드 뷰어 + 내보내기)
└── api/
    ├── author-chat/route.ts    # 레이어 구축 + 작가 대화 통합 (Sonnet)
    ├── generate-world-history/route.ts # 세계 역사 생성 (Haiku)
    ├── detail-era/route.ts     # 시대 상세화 (Haiku)
    ├── simulate/
    │   ├── route.ts            # SSE 스트리밍 시뮬레이션
    │   └── control/route.ts    # 시뮬레이션 제어 (pause/resume/abort)
    ├── write-episode/route.ts  # 에피소드 집필 (Sonnet)
    ├── revise-episode/route.ts # 에피소드 수정 (Sonnet)
    ├── generate-detail/route.ts # 세밀 장면 생성 (Sonnet)
    ├── generate-chronology/route.ts # AI 연대기 자동 생성 (Haiku)
    ├── export/route.ts         # TXT/HTML/DOCX 내보내기
    ├── structure-world/route.ts # AI 세계관 구조화 (Haiku)
    └── structure-character/route.ts # AI 캐릭터 구조화 (Haiku)

lib/
├── types/index.ts              # 모든 타입 정의 (Project, 7 Layers, WorldHistoryEra, Message, Choice 등)
├── store/
│   ├── project-store.ts        # 다중 프로젝트 스토어 (projects[], layers, messages, episodes)
│   ├── simulation-store.ts     # 기존 시뮬레이션 상태 (하위 호환)
│   ├── timeline-store.ts       # 디테일 씬
│   └── editor-store.ts         # 프로젝트/챕터
├── agents/
│   ├── simulation-engine.ts    # 핵심 엔진 (V1/V2/V3)
│   ├── storyline-analyzer.ts   # 스토리라인 분석
│   ├── story-director.ts       # 스토리 디렉터
│   ├── profile-calculator.ts   # 프로필 계산기
│   └── npc-detector.ts         # NPC 탐지
├── presets/
│   └── author-personas.ts      # 작가 페르소나 프리셋 4종
├── prompts/
│   ├── simulation-prompt.ts    # V1 프롬프트
│   ├── simulation-prompt-v2.ts # V2 프롬프트
│   └── detail-prompt.ts        # 세밀 장면 프롬프트
└── utils/
    ├── api-client.ts           # Anthropic SDK 래퍼
    ├── simulation-sessions.ts  # 서버 사이드 세션 관리
    ├── export-txt.ts           # TXT 내보내기
    ├── export-html.ts          # HTML 내보내기
    └── export-docx.ts          # DOCX 내보내기

components/                     # 기존 컴포넌트 (하위 호환용)
├── layout/        Header, Sidebar
├── common/        ClientProviders, Toast
├── characters/    CharacterPanel, CharacterAvatar
├── simulation/    SimulationControl, StorylineMonitor
└── ...
```

## 핵심 아키텍처 (UNIFIED-INSTRUCTION 기반)

### 라우트 구조
| 라우트 | 용도 |
|--------|------|
| `/` | `/projects`로 리다이렉트 |
| `/projects` | 프로젝트 목록 |
| `/projects/new` | 새 프로젝트 (장르/톤/시점/작가 선택) |
| `/projects/[id]` | 작가 대화 (핵심 화면) |
| `/projects/[id]/result` | 결과물 (에피소드 뷰어) |

### 7 레이어 시스템
1. **세계 (World)** - 대륙, 도시, 지형
2. **핵심 규칙 (Core Rules)** - 힘의 체계, 종족, 역사
3. **씨앗 (Seeds)** - 세력, 종족, 위협, NPC
4. **주인공 서사 (Hero Arc)** - 주인공의 태생, 핵심 서사, 목표
5. **빌런 서사 (Villain Arc)** - 빌런의 동기, 서사, 관계
6. **궁극의 떡밥 (Ultimate Mystery)** - 표면/진실, 힌트들
7. **소설 (Novel)** - 시뮬레이션 + 집필

### 세계 시뮬레이션 3단계
1. **세계 역사** - 수백~천 년을 시대 단위로 생성
2. **시대 상세화** - 주인공 시대 50년을 10년 단위로 상세화
3. **캐릭터 시뮬레이션** - 기존 엔진으로 연도별 시뮬레이션

### 핵심 흐름
```
[프로젝트 목록] → [새 프로젝트] → 장르/톤/시점/작가 선택
                                       ↓
[작가 대화] ← 7개 레이어 순차 구축 (대화형)
     ↓
세계 역사 생성 → 시대 상세화 → 캐릭터 시뮬레이션
     ↓
[에피소드 집필] ← 작가와 환님 피드백 루프
     ↓
[결과물] → 읽기/내보내기
```

### 다중 프로젝트 지원
- `lib/store/project-store.ts` - 새 Zustand 스토어
- `projects[]` 배열로 여러 프로젝트 관리
- 각 프로젝트별 독립적인 layers, messages, episodes
    ├── export-txt.ts
    ├── export-html.ts
    ├── export-docx.ts
    ├── timeline-utils.ts
    └── mock-data.ts

data/                              # 천추의강호 세계관 데이터 (JSON)
├── index.json                     # 데이터 인덱스 및 구조 가이드
├── world-config.json              # 세계관 기본 설정, 등급 체계(1신~10선)
├── characters.json                # 주인공(4신), 전설(1신~4존), 5왕, 6괴
├── locations.json                 # 지역, 전략 거점, 충돌지대
├── factions-jeongdomaeng.json     # 정도맹 (구파일방, 10선)
├── factions-palgahoe.json         # 팔가회 (8대 세가, 8성)
├── factions-heukdoryeon.json      # 흑도련 (7축 사파, 7귀)
├── factions-magyo.json            # 마교 (교주, 9마, 6대 무력대)
├── factions-seoe.json             # 세외세력 (5왕, 북해빙궁 등)
└── antagonist-hyungiwon.json      # 배후세력 현기원 (황실 비밀조직)
```

---

## 천추의강호 세계관 데이터 구조 (2026-02-23 추가)

`data/` 폴더에 무협 소설 "천추의강호" 세계관이 JSON 형태로 구조화되어 있다.

### 데이터 파일 설명

| 파일 | 내용 |
|------|------|
| `index.json` | 전체 데이터 인덱스, 파일 간 참조 관계, 사용법 |
| `world-config.json` | 세계관 기본 정보, 등급 체계(1신~10선), 5대 세력 개요 |
| `characters.json` | 주인공 4인(천추단 사신), 전설(1신~4존), 5왕, 6괴 |
| `locations.json` | 세력별 영토, 충돌지대, 주요 교통로(육로/수로/해로) |
| `factions-*.json` | 각 세력별 상세 데이터 (구성원, 조직 구조, 관계) |
| `antagonist-hyungiwon.json` | 배후세력 현기원 (조직, 작전 프로토콜, 침투 전략) |

### 등급 체계 (1신~10선)

```
1신(神)  → 절대적 경지, 전설 (천극무신)
2황(皇)  → 황제급 절대자 (마황, 빙황)
3제(帝)  → 제왕급 고수 (검제, 혈제, 무제)
4존(尊)  → 존칭급 전설 (검존, 도존, 창존, 암존)
5왕(王)  → 현세대 절대자 (북빙왕, 서법왕, 남독왕, 동천왕, 중랑왕)
6괴(怪)  → 괴상한 절대 전력 (주괴, 병괴, 폭괴, 식괴, 혈괴, 음괴)
7귀(鬼)  → 흑도련 7축 대표 (혈귀, 수귀, 살귀, 오귀, 모귀, 영귀, 도귀)
8성(聖)  → 팔가회 8축 대표 (검성, 암성, 지성, 창성, 도성, 권성, 만성, 광성)
9마(魔)  → 마교 핵심 간부 (혈마, 독마, 광마, 검마, 도마, 비마, 음마, 귀마, 요마)
10선(仙) → 정도맹 장문인 (불선, 도선, 화선, 창선, 일선, 남선, 강선, 혜선, 벽선, 취선)
```

### 주인공 — 천추단 사신(四神)

| 상징 | 이름 | 특징 |
|------|------|------|
| 현무 | 강현(姜玄) | 천추단 창립자, 현천문 계승자, 무신의 계보 |
| 청룡 | 여운청(餘雲靑) | 북변 장군가 출신, 의리의 중심 |
| 주작 | 진홍(辰紅) | 광마의 아들, 부자 대립 서사 |
| 백호 | 설무백(薛武白) | 배후세력 실험체 탈출, 의리파 |

### 5대 세력 구도

```
┌─────────────────────────────────────────────────────────┐
│                      강호 세력 구도                       │
├─────────────────────────────────────────────────────────┤
│  정도맹(正道盟)          vs          흑도련(黑道聯)        │
│  ├─ 구파일방                        ├─ 7귀 (사파 7축)      │
│  └─ 10선 장문인                     └─ 련주: 혈귀 곽천륜   │
├─────────────────────────────────────────────────────────┤
│  팔가회(八家會)          vs           마교(魔敎)          │
│  ├─ 8대 세가 (8성)                  ├─ 교주: 파천마황      │
│  └─ 회주: 광성 모용천휘              └─ 9마 + 6대 무력대   │
├─────────────────────────────────────────────────────────┤
│               세외세력 (5왕) — 중원 바깥                   │
│  북빙왕(북해빙궁) / 서법왕(서역밀교) / 남독왕(남만연합)     │
│  동천왕(동해군도) / 중랑왕(패천랑부)                       │
├─────────────────────────────────────────────────────────┤
│          배후세력 — 현기원(玄機院) — 황실 비밀조직          │
│  목표: 무림을 제도권으로 흡수                              │
│  수단: 합법화 → 분절화 → 대리전 유도                       │
└─────────────────────────────────────────────────────────┘
```

### 데이터 활용

- **시뮬레이션 엔진**: 캐릭터/세력 데이터를 기반으로 이벤트 생성
- **작가 AI**: 세계관 설정을 참조하여 일관된 소설 집필
- **일관성 검증**: 캐릭터 관계, 세력 구도, 등급 체계 검증

---

## 핵심 아키텍처

### 캐릭터 시스템 (V1 + V2 공존)

**V1 (기존):** `Character` 타입으로 하드코딩된 프로필. CHARACTERS 상수에서 시작.

**V2 (경험 레이어):** `CharacterSeed` → `Memory` 축적 → `EmergentProfile` 발현.
- `seeds[]`가 존재하면 V2 파이프라인 자동 활성화 (`isV2` getter)
- `ProfileCalculator.computeProfile(seed, memories)` → EmergentProfile
- `ProfileCalculator.toCharacter(seed, memories, year)` → Character (하위 호환 브릿지)
- 하위 시스템(편집기, 내보내기, 통계)은 Character 타입만 소비하므로 변경 불필요

### 데이터 흐름
```
1. 프리셋 로드 / /create 마법사 (6단계)
   → setCharacters() + setSeeds() + setWorldEvents()
   → setStoryDirectorConfig()  [스토리 디렉터]
   → setMonitorConfig()        [모니터링 설정]
   → localStorage에 projectConfig 저장

2. 시뮬레이션 시작
   → POST /api/simulate (config, characters, seeds?, memoryStacks?,
      grammarConfig?, characterArcs?, npcPool?,
      storyDirectorConfig?, worldSettingsFull?, monitorConfig?)
   → 세션 생성 (sessionId, AbortController, pauseFlag)
   → SSE: session_init → progress → storyline_preview → integrated_storyline → auto_paused → events → final_state

3. 시뮬레이션 제어
   → POST /api/simulate/control { sessionId, action: 'pause'|'resume'|'abort' }
   → activeSessions Map에서 세션 조회 → pauseFlag/abortController 조작

4. SSE 이벤트 수신 (SimulationControl)
   → session_init → setSessionId()
   → completed → addEvents()
   → storyline_preview → setStorylinePreview()
   → integrated_storyline → setIntegratedStoryline()
   → auto_paused → setSimulationStatus('paused') + setPendingWarning()
   → final_state → setCharacters/Memories/Profiles/Arcs/NPC + addSimulationRun()
   → done → setRunning(false) + 이력 기록

5. 세밀 장면 생성
   → POST /api/generate-detail (character, event, worldContext,
      authorPersona?, worldSettings?)
   → buildDetailPrompt에 페르소나/감각정보 주입

6. UI 렌더링
   → StorylineMonitor: 건강도 바 + 캐릭터별 지표 + 경고 + 교차분석
   → StorylineWarningPopup: Critical 시 자동 팝업 (무시/정지/중단)
   → SimulationHistory: 이력 목록 + 스냅샷 확인
   → CharacterPanel: profile/memories/role props
   → TimelineView: imprints 아이콘 배지
   → StatsOverview: 텐션 커브 + 스토리 디렉터 통계
   → Dashboard: 로그라인, 역할 배지, NPC 위젯, 연대기 바
```

### 스토어 구조 (simulation-store)
```typescript
// V1 (기존)
isRunning, currentYear, progress, characters[], events[], worldEvents[]

// V2 (경험 레이어)
seeds: CharacterSeed[]
memoryStacks: Record<string, Memory[]>  // characterId → memories
profiles: Record<string, EmergentProfile>  // characterId → profile

// 서사 문법
grammarConfig: NarrativeGrammarConfig
characterArcs: CharacterArc[]
masterArc: MasterArc | null

// NPC
npcPool: NPCPool  // { npcs: NPC[], maxSize: 30 }

// 스토리 디렉터
storyDirectorConfig?: StoryDirectorConfig  // A중심서사 + 페르소나

// 씨앗 수정
seedEditHistory: SeedEditLog[]

// 스토리라인 모니터링
simulationStatus: SimulationStatus  // 'idle'|'running'|'paused'|'completed'|'aborted'
sessionId: string | null
storylinePreviews: Record<string, StorylinePreview>
integratedStoryline: IntegratedStoryline | null
monitorConfig: StorylineMonitorConfig  // { previewFrequency, autoPauseOnCritical, integratedAnalysisEnabled }
simulationHistory: SimulationRun[]
pendingWarning: IntegratedStoryline | null  // non-null → 경고 팝업 표시

// 모두 localStorage persist 대상
```

### 시뮬레이션 제어 메커니즘

**Pause/Resume:**
- 서버 엔진 내부에 `pauseFlag: { paused: boolean }` 뮤터블 객체
- `lib/utils/simulation-sessions.ts`에 `activeSessions` Map으로 세션 관리
- SSE route와 control route가 같은 모듈 import → 같은 Map 참조
- 엔진 루프가 매 year마다 `pauseFlag.paused`를 폴링 (500ms 간격)
- 클라이언트 → POST `/api/simulate/control` → Map에서 세션 조회 → pauseFlag 토글

**Abort:**
- `AbortController` + `AbortSignal`
- SSE route에서 생성, 엔진에 signal 전달
- 엔진 루프가 매 year마다 `abortSignal.aborted` 체크
- ReadableStream의 `cancel()` 콜백에서도 abort 트리거

**스토리라인 모니터링:**
- `StorylineAnalyzer` — Haiku(`generateStructure`, temp 0.2, max 1024)로 프리뷰 생성
- `shouldGeneratePreview()` — auto: turning_point 이벤트, semi_auto: 5년마다, manual/off: false
- 프리뷰 → SSE `storyline_preview` → 통합 분석 → SSE `integrated_storyline`
- `storyHealth === 'critical' && autoPauseOnCritical` → 자동 일시정지 + 경고 팝업

### 기억 각인 시스템 (ImprintType)
| 타입 | 아이콘 | 설명 |
|------|--------|------|
| insight | 🧠 | 깨달음 |
| emotion | 💭 | 감정 각인 |
| skill | ⚔️ | 기술 습득 |
| speech | 💬 | 말투/화법 |
| name | 📛 | 이름/이명 획득 |
| relationship | 🤝 | 관계 형성 |
| trauma | 🩸 | 트라우마 |
| belief | ✨ | 신념/가치관 |

### 기본 캐릭터 (서문대륙 프리셋)
| ID | 코드명 | 이름(V1) | 색상 | birthYear |
|----|--------|----------|------|-----------|
| yoon-seojin | 금서고의 아이 | 윤서진 | #7B6BA8 | -3 |
| ha-yeonhwa | 독화의 아이 | 하연화 | #C74B50 | -2 |
| baek-muhan | 서자 | 백무한 | #D4D0E0 | -5 |

### SimulationEngine 모드
| 모드 | 조건 | V1 메서드 | V2 메서드 |
|------|------|-----------|-----------|
| 개별 | !batchMode | runYear() | runYearV2() |
| 묶음 | batchMode | runYearBatched() | runYearBatchedV2() |
| 유년기 | 모두 0~5세 | runYearRange() | runYearRangeV2() |

### SimulationEngine 확장 파라미터
```typescript
constructor(
  config, existingEvents?, existingCharacters?, seeds?, memoryStacks?,
  grammarConfig?, existingCharacterArcs?, existingMasterArc?, npcPool?,
  storyDirectorConfig?, worldSettingsFull?,
  abortSignal?, pauseFlag?, monitorConfig?, theme?
)
```

### 스토리 디렉터 시스템

**4레이어 세계관 구축:**
- Layer 1: `WorldCoreRule` — 핵심 법칙 (law, cost, implication)
- Layer 2: `WorldHistoricalWound` — 역사적 상처 (event, consequence, livingMemory)
- Layer 3: `WorldCurrentTension` — 현재 갈등 (faction, desire, method, blocked)
- Layer 4: 감각/사회/일상 (sensoryDetails[], socialNorms[], dailyLife[])

**작가 페르소나:** `lib/presets/author-personas.ts`
| 프리셋 | 코드 | 특징 |
|--------|------|------|
| 열혈전투형 | PERSONA_BATTLE | 짧은 문장, 의성어, 파워업 |
| 다크서사형 | PERSONA_DARK | 내면 독백, 도덕적 모호함 |
| 감성서정형 | PERSONA_LYRICAL | 자연 묘사, 감정 은유 |
| 신무협정통형 | PERSONA_CLASSIC | 한문 혼용, 절제된 감정 |

**A중심 서사 구조:**
- `StoryDirectorConfig` — protagonistId, ratio(A:B:C 기본 6:2:2), characterRoles, logline
- `StoryDirector.buildADirective()` → A 중심 프롬프트 룰 생성
- `StoryDirector.composeStory()` → A-relevance 체크 후 에피소드 분할
- `ARelevanceCheck` — direct_impact / foreshadow / theme_mirror / hidden_truth

**데이터 흐름:**
```
/create wizard (6단계):
  Step 1: WorldBuilder → worldSettings (4레이어 세계관 포함)
  Step 1.5: ChronologyBuilder → worldSettings.chronology (연대기)
  Step 2: CharacterBuilder → characters[] + seeds[] (씨앗 모드 시 onSeedsChange)
  Step 3: RelationshipBuilder → relationships[]
  Step 4: StorySetup → storyDirectorConfig (로그라인, 역할, 페르소나)
  Step 5: TimelineSetup → store에 일괄 저장:
    - setCharacters() + setSeeds() + setWorldEvents() + setStoryDirectorConfig() + setMonitorConfig()
    - localStorage에 projectConfig 저장 (monitorConfig 포함)

시뮬레이션 시:
  → SimulationControl → API request body에 monitorConfig 포함
  → SimulationEngine constructor에 abortSignal, pauseFlag, monitorConfig, theme 전달
  → 매 year마다: abort 체크 → pause 폴링 → 시뮬 → 프리뷰 생성(조건부) → 통합 분석 → auto-pause

UI 표시:
  → CharacterPanel: A/B/C 역할 배지
  → SimulationControl: 시작/일시정지/재개/중단 버튼 + "스토리 디렉터" 배지
  → StorylineMonitor: 건강도 바 + 4지표 + 경고 + 수렴/배신/권장
  → StorylineWarningPopup: Critical 감지 시 모달
  → SimulationHistory: 이력 목록 (접기/펼치기 + 스냅샷)
  → Dashboard: 로그라인 표시, 연대기 바
```

### 작가 AI v2 시스템
**관계 화학작용:** `Relationship`에 `dynamic?`, `frictionPoints?`, `resonancePoints?`, `history?` 필드 추가. 관계도 UI에서 간선에 dynamic 표시, 호버 시 friction/resonance 상세.

**각성 모멘텀:** `StorylineMetrics`에 `awakeningPotential` (0~100) 추가. 시뮬레이션 프롬프트에 전환점 규칙 (축적→폭발). 타임라인에서 `turning_point` 이벤트를 ★ + 골드 테두리 + "TURNING POINT" 라벨로 강조.

**마일스톤 (Anchor Events):** `AnchorEvent` 타입, `WorldSettings.anchorEvents?` 필드. 시뮬레이션 엔진이 해당 연도에 강제 사건 주입 (상황만 강제, 반응은 시뮬레이션). `/create` Step 5에서 입력 UI (연도, 사건, 세계 영향, 캐릭터별 상황). 타임라인에 ⚓ 아이콘.

**출력 퀄리티:** 시뮬레이션 프롬프트(V2)에 Show Don't Tell / 구체적 감각 / 짧고 강렬 / 행동으로 성격 / sensory 오감 규칙 추가. 세밀 장면 프롬프트에 출력 퀄리티 절대 규칙 (감정 설명 금지, 묘사적 서술만, 대사 짧게, 70/30 법칙).

### 설계 헌법 (Design Constitution)
핵심 원칙:
- **하드코딩 허용**: 세계관, 시간축, 작가 페르소나(문체)
- **하드코딩 금지**: 캐릭터 성격/가치관/동기/외형/능력/대사/관계
- **시뮬레이션은 중립**: A-directive/charm 주입 금지
- **StoryDirector는 편집 단계 도구로만** 사용

### 완료된 기능 목록
1. **프로젝트 설정**: 타입, 스토어, UI (mock data)
2. **Claude API 통합**: 시뮬레이션 엔진 + SSE 스트리밍 + localStorage 영속
3. **세밀 장면 생성**: Sonnet 기반 + 3열 DnD 편집기 + 네비게이션
4. **내보내기**: TXT/HTML/DOCX + 통계 + 관계도 + 토스트 + 데이터 관리 + 온보딩
5. **최적화+커스텀빌더**: API 모델 분리 + 프롬프트 압축 + 묶음 모드 + /create 마법사 + 프리셋
6. **경험 레이어**: 씨앗→경험→발현 시스템 (CharacterSeed→Memory→EmergentProfile)
7. **서사 문법 엔진**: 서사 아크 + 비트 추적 + 텐션 커브 + 프롬프트 유도
8. **NPC Emergence**: 자연 발생 NPC + lifecycle + 프롬프트 주입 + 대시보드 위젯
9. **스토리 디렉터**: 4레이어 세계관 + 작가 페르소나 4종 + A중심 서사(6:2:2)
10. **설계 헌법 감사**: UI 하드코딩 제거 + CharmDevice 삭제 + 시뮬 중립화 + NPC role 자유화 + 외형 필드
11. **씨앗 수정+연대기**: soft_edit/hard_reset + 되감기 + 세계 연대기 CRUD/AI생성 + 대시보드 연대기 바
12. **스토리라인 모니터링**: 실시간 프리뷰 + 통합 분석 + auto-pause + 경고 팝업 + pause/resume/abort + 이력 관리
13. **작가 AI v2**: 관계 화학작용(dynamic/friction/resonance) + 각성 모멘텀(awakeningPotential+turning_point 강조) + 마일스톤(AnchorEvent 강제 주입+UI) + 출력 퀄리티(Show Don't Tell)
14. **작가 AI as God**: 서사 아크 설계 + 동적 디렉션 + 하드코딩 제거 + 아크 검토/수정 UI
15. **UI 뷰 개선**: 캐릭터 성장 뷰 (/characters) + 작가 집필 뷰 (/author 4탭) + 네비게이션 확장 + 에피소드/코멘트/떡밥 시스템

> **모든 지시서 완료 (체크포인트 1-145).** 프로덕션 빌드 통과 확인 (2026-02-08).

### 작가 AI as God 시스템 (체크포인트 99-115 완료)

**핵심 개념:** 작가 AI가 시뮬레이션의 "신(God)"이 되어, 시뮬레이션 전에 서사 아크를 설계하고 매 연도마다 동적 디렉션을 생성. 기존 하드코딩된 나이별 가이드 제거.

**흐름:**
```
환님 → 주제+방향 → 작가 AI가 캐릭터별 서사 아크 설계 (시뮬 시작 전)
매 연도: Profile 계산 → 합친 프롬프트(작가 디렉션+시뮬레이션 1회 호출) → 캐릭터 자율 반응
→ AuthorDirection의 phaseTransition으로 아크 페이즈 자동 전환
→ turning_point 이벤트 감지 시 아크 revision 기록
→ validateEvents 필터로 평온한 나날 제거
```

**타입:**
- `AuthorNarrativeArc` — characterId, phases[], currentPhaseIndex, revisions[], designedAt
- `ArcPhase` — id, name, estimatedAgeRange, intent, keyMoments[], emotionalArc, endCondition
- `ArcRevision` — year, reason, changes
- `AuthorDirection` — characterId, year, age, arcPosition, narrativeIntent, worldPressure, avoid, desiredEffect, phaseTransition?

**새 파일:**
- `lib/agents/author-ai-engine.ts` — AuthorAIEngine 클래스 (아크 설계, 디렉션 처리, 아크 조정, validateEvents)
- `lib/prompts/author-direction-prompt.ts` — 4개 프롬프트 빌더 (아크 설계, 개별+합친, 묶음+합친, 유년기+합친)
- `components/simulation/ArcEditor.tsx` — 서사 아크 검토/수정 UI (대시보드 위젯)

**변경된 파일:**
- `lib/types/index.ts` — AuthorNarrativeArc, ArcPhase, ArcRevision, AuthorDirection 추가, ProgressUpdate에 arc_designed/author_direction 추가
- `lib/prompts/simulation-prompt-v2.ts` — 하드코딩 나이별 가이드(0~5세, 6~12세, 13+세) 제거
- `lib/agents/simulation-engine.ts` — AuthorAIEngine 통합, runFullSimulation에 아크 설계 단계, V2 메서드에 합친 프롬프트, parseResponseV3WithDirection, parseBatchedResponseV3WithDirection, validateEvents, narrativeArcs 파라미터/getter
- `lib/store/simulation-store.ts` — narrativeArcs 상태 + setNarrativeArcs/updateNarrativeArc 액션 + persist
- `app/api/simulate/route.ts` — narrativeArcs 파라미터 수신 + final_state에 포함
- `components/simulation/SimulationControl.tsx` — narrativeArcs 송수신 + arc_designed SSE 처리
- `app/page.tsx` — ArcEditor 대시보드 위젯 통합

**기존 Grammar 시스템과의 관계:**
- Grammar Engine(비트 추적/텐션 관리)과 Author AI(동적 디렉션)는 공존
- Author AI 아크가 있으면 합친 프롬프트(디렉션+시뮬) 사용, 없으면 기존 Grammar 프롬프트로 fallback
- validateEvents: AuthorAIEngine.validateEvents() 정적 메서드로 "평온한 나날" 필터링

**API 비용 최적화:**
- 아크 설계: Haiku(generateStructure) × 캐릭터 수 (시뮬 시작 시 1회만)
- 매 연도: 디렉션+시뮬레이션을 합친 1회 호출 (Haiku, generateSimulation) → 기존 대비 호출 수 동일

### UI 뷰 개선 (체크포인트 116-145 완료)

**캐릭터 성장 뷰 (`/characters`):**
- 캐릭터 선택 탭 (탭 클릭으로 전환)
- 좌측 프로필 패널: 씨앗 + 발현 프로필 + 잠재력 바 + 능력 레벨 + 외형 변화 + 관계(NPC 포함) + 성향(빛/어둠, 질서/혼돈)
- 중앙 성장 타임라인: 세로 이벤트 카드, 연도별 구분, 필터(전체/위기/성장/관계/전환점) + 정렬(시간순/중요도)
- 이벤트 아이콘 자동 매핑: ★(TP) ⚡(능력) 👤(NPC) 💀(상실) ⚓(앵커) 🌑(출생) 🔒(미스터리) ○(일반)
- TURNING POINT / ANCHOR 시각적 강조 (골드 테두리, 라벨)
- 하단 이벤트 상세 뷰: 감각 기억 + 각인 상세 + 작가 디렉션 + [세밀 장면 생성] [편집기로 보내기] 버튼

**작가 집필 뷰 (`/author`) — 4탭:**
- **탭 1 (스토리 전체)**: 주제+세계관 요약 / 스토리 구조(MasterArc acts 시각화) / 캐릭터 서사 흐름 가로 타임라인 / 떡밥 현황(planted/collected/planned + CRUD) / 예상 통계(총화수, 집필완료, 시점비율)
- **탭 2 (서사 아크)**: 캐릭터별 아크 페이즈 시각화(현재/완료/미래 구분) / 페이즈 상세 편집(의도, 핵심순간 체크리스트, 감정흐름, 종료조건) / 수정 이력 / 다음 디렉션 미리보기 / 페이즈 추가
- **탭 3 (집필)**: 에피소드 목록(planned/drafted/reviewed/final 상태 아이콘) / 3분할 집필 뷰(시뮬 소스|본문|작가 메모) / 이벤트 연결 / 화 끝 훅 / 상태 변경+삭제
- **탭 4 (코멘트)**: 코멘트 목록(필터: 유형별, 미해결만) / 선택지 버튼 + 자유 응답 / 해결/미해결 상태 / 피드백 전송

**새 타입:**
- `Episode`: id, number, title, status(planned/drafted/reviewed/final), pov, sourceEventIds, content, charCount, authorNote, endHook
- `AuthorComment`: id, type(suggestion/question/discovery/warning), content, relatedTo, options?, selectedOption?, userResponse?, resolved
- `Foreshadow`: id, content, status(planted/collected/planned), plantedEpisode?, collectedEpisode?, relatedCharacters

**변경 파일:**
- `lib/types/index.ts` — Episode, AuthorComment, Foreshadow 타입 추가
- `lib/store/simulation-store.ts` — episodes/authorComments/foreshadows 상태 + CRUD 액션 + persist
- `components/layout/Header.tsx` — [캐릭터] [작가] 네비게이션 탭 추가
- `app/characters/page.tsx` — 캐릭터 성장 뷰 (새 파일)
- `app/author/page.tsx` — 작가 집필 뷰 4탭 (새 파일)

## 개발 명령어
```bash
npm run dev    # 개발 서버 (Turbopack)
npx next build # 프로덕션 빌드 + 타입 체크
```

## 환경 변수 (.env.local)
```
ANTHROPIC_API_KEY=sk-ant-...
```

## 지시서 파일 현황
| 파일 | 체크포인트 | 위치 | 상태 |
|------|-----------|------|------|
| Phase 1~4 지시서 | 1-24 | `진행완료/` | ✅ 완료 |
| instruction-seed-edit-and-chronology.md | 25-42 | `진행완료/` | ✅ 완료 |
| instruction-storyline-monitor.md | 43-61 | `진행완료/` | ✅ 완료 |
| instruction-author-ai-v2.md | 81-98 | `진행완료/` | ✅ 완료 |
| instruction-author-as-god.md | 99-115 | 루트 | ✅ 완료 |
| instruction-ui-views.md | 116-145 | 루트 | ✅ 완료 |
| instruction-ui-simplified.md | 116-131 | 루트 | ✅ 완료 |
| instruction-project-creation-update.md | - | 루트 | ✅ 완료 |

---

## UI 재설계 (instruction-ui-simplified) — 체크포인트 116-131 완료

### 핵심 변경
기존 8개 페이지 → **3개 화면**으로 단순화:
1. `/project` — 프로젝트 생성 (주제 + 스토리라인 + 방향성 + 작가 선택)
2. `/conversation` — 작가 대화 (채팅 + 사이드 패널 4탭)
3. `/result` — 결과물 (원고 뷰어 + 내보내기)

### 핵심 루프
```
환님이 주제+스토리라인 입력 → [작가에게 맡기기]
→ 작가 AI가 스토리라인 분석 → 세계관/캐릭터/아크 자동 생성
→ 작가가 1화 작성 → 환님이 읽음 → 피드백(연재승인/수정요청/방향변경)
→ 다음 화 → 반복
```

### 새 타입 (`lib/types/index.ts`)
- `SimplifiedProjectConfig` — 단순화된 프로젝트 설정 (`storyline: string`, `protagonistCount` 제거)
- `ConversationMessage` — 대화 메시지 (author, author_episode, author_choice, user)
- `ConversationChoice` — 선택지 (approve, revise, redirect 등)
- `GenerationProgress` — 자동 생성 진행 상태

### 스토어 확장 (`lib/store/simulation-store.ts`)
```typescript
// SimulationStoreConversation
simplifiedProject: SimplifiedProjectConfig | null
conversationMessages: ConversationMessage[]
generationProgress: GenerationProgress | null
currentEpisodeNumber: number

// 액션
setSimplifiedProject()
addConversationMessage()
clearConversationMessages()
setGenerationProgress()
updateGenerationStep()
setCurrentEpisodeNumber()
respondToChoice()
```

### 새 페이지
- `app/project/page.tsx` — 주제+워딩+작가 선택 폼 + 자동 생성 프로그레스
- `app/conversation/page.tsx` — 채팅 UI + 사이드 패널 4탭 (미리보기/캐릭터/세계관/원고)
- `app/result/page.tsx` — 원고 뷰어 + 내보내기

### 새 API
- `/api/generate-project` — SSE 스트림으로 세계관+캐릭터+아크+시뮬레이션 자동 생성
- `/api/write-episode` — Sonnet으로 화 작성 (4000-6000자)
- `/api/author-respond` — 환님 메시지에 작가 AI 응답

### Header 변경 (`components/layout/Header.tsx`)
- 3개 탭: 프로젝트 / 작가 대화 / 결과물
- 기존 상세 뷰(/characters, /author 등)는 사이드 패널 "상세 보기"로 접근
- 상세 뷰 진입 시 "← 작가 대화로 돌아가기" 표시

### 라우팅
- `/` → `/project` 또는 `/conversation` 리다이렉트 (simplifiedProject 유무에 따라)
- 기존 페이지들 유지 (Header에서 숨김, 사이드 패널에서 접근)

### 프로덕션 빌드
- ✅ 빌드 성공 (2026-02-09)

---

## 프로젝트 생성 수정 (instruction-project-creation-update.md) — 완료

### 핵심 변경
**기존:** 핵심 워딩을 여러 줄 입력 (`wordings: string[]`)
**변경:** 스토리라인을 자유 텍스트로 입력 (`storyline: string`)

### 타입 변경 (`lib/types/index.ts`)
```typescript
// 기존
wordings: string[];
advancedSettings: { protagonistCount?: number; ... }

// 변경
storyline: string;  // 자유 텍스트 (한 줄이든 한 페이지든)
advancedSettings: { ... }  // protagonistCount 제거 (캐릭터 수는 AI가 결정)
```

### UI 변경 (`app/project/page.tsx`)
- 워딩 여러 줄 입력 → 스토리라인 textarea
- 캐릭터 수 설정 제거

### API 변경 (`app/api/generate-project/route.ts`)
1. **스토리라인 분석 단계 추가** (`storyline_analysis`)
   - 스토리라인에서 핵심 인물, 구도, 갈등, 감정, 훅 포인트 추출
2. **세계관 프롬프트 수정**
   - 스토리라인 분석 결과를 바탕으로 세계관 구축
3. **캐릭터 프롬프트 수정**
   - 스토리라인에 언급된 인물 반드시 포함
   - 캐릭터 수는 AI가 자유롭게 결정 (2~5명 권장)
4. **아크 프롬프트 수정**
   - 스토리라인의 전개에 맞춰 페이즈 설계
5. **스토리 구조 프롬프트 수정**
   - 스토리라인 기반 3부 구조 설계

### 생성 흐름
```
사용자 입력:
  - topic: "이뤄질 수 없는 사랑, 다음 생에선 내가 꼭 찾아가서 내 사랑을 이루겠다"
  - storyline: "전생에 공녀였던 이사벨을 곁에서 지키던 근위기사 아룬은..."
  - genre: "판타지+로맨스"
  - tone: "감성적"

작가 AI가 하는 것:
  1. 스토리라인 분석 → 핵심 인물(아룬, 이사벨), 구도(전생+빙의+재회), 갈등, 감정 추출
  2. 세계관 구축 → 스토리라인의 "근위기사", "공국", "제국", "황자" 등 반영
  3. 캐릭터 설계 → 아룬, 이사벨 + 필요시 추가 캐릭터 자유 생성
  4. 서사 아크 설계 → 스토리라인의 전개(빙의→적응→재회→결말) 반영
  5. 스토리 구조 → 3부 구성 + 1화 오프닝 제안
```

---

## 하드코딩 데이터 제거 (2026-02-09 완료)

### 제거된 하드코딩 데이터
모든 특정 세계관/캐릭터/스토리 데이터가 코드에서 제거됨. 이제 모든 데이터는 generate-project API에서 동적 생성됨.

### 수정된 파일
1. `lib/prompts/character-profiles.ts` — CHARACTERS 배열을 빈 배열로
2. `lib/prompts/character-seeds.ts` — CHARACTER_SEEDS 배열을 빈 배열로
3. `lib/utils/mock-data.ts` — MOCK_EVENTS 배열을 빈 배열로
4. `lib/presets/seomun-preset.ts` — 모든 하드코딩 데이터 제거, 빈 기본값으로
5. `data/` — 천추의강호 세계관 JSON 데이터로 교체 (2026-02-23)
6. `lib/prompts/simulation-prompt.ts` — "판타지/무협" 하드코딩 제거
7. `lib/prompts/simulation-prompt-v2.ts` — "판타지/무협" 하드코딩 제거, 예시 텍스트 일반화
8. `lib/prompts/detail-prompt.ts` — "판타지/무협" 하드코딩 제거
9. `lib/types/index.ts` — 주석의 특정 예시 일반화
10. `components/create/WorldBuilder.tsx` — 플레이스홀더 텍스트 일반화
11. `components/create/CharacterBuilder.tsx` — 플레이스홀더 텍스트 일반화
12. `components/simulation/SimulationControl.tsx` — "서문대륙" 제거
13. `components/editor/NovelEditor.tsx` — "서문대륙 이야기" 제거
14. `app/page.tsx` — 프리셋 UI 제거/비활성화

### 남아있어도 되는 것
- UI 구조, API 로직, 타입 정의, 시스템 규칙
- 장르/톤 선택 옵션 (사용자가 선택하는 것)
- 작가 페르소나 (스타일 프리셋, 세계관이 아님)
- CLAUDE.md, docs/ 폴더 (문서)

### 원칙
코드에 남아있어도 되는 것: UI 구조, API 로직, 타입 정의, 시스템 규칙
코드에 남아있으면 안 되는 것: 특정 이야기의 내용

---

## 작가 대화 시스템 버그 수정 (2026-02-09 완료)

### 수정된 버그 목록

#### 1. 에피소드 번호 버그 (1화 요청 → 4화 생성)
**원인:** `currentEpisodeNumber`가 localStorage에 persist되어 새 프로젝트에서도 이전 값 유지
**수정:** `app/project/page.tsx`에서 새 프로젝트 시작 시 `reset()` + `setCurrentEpisodeNumber(0)` 호출

#### 2. 캐릭터 1명만 생성되는 문제
**원인:** 캐릭터 프롬프트가 "2~5명 권장"으로 약하게 설정됨
**수정:** `app/api/generate-project/route.ts`의 캐릭터 프롬프트에 "절대 규칙" 추가
```
**절대 규칙:**
1. 스토리라인에 언급된 인물은 반드시 포함
2. **최소 3명 이상** 생성
3. 다양한 인물 유형 (조력자, 대립 인물, 권력자 등)
```

#### 3. "평온한 나날" 패딩 시작 문제
**원인:** `write-episode` 프롬프트에 느슨한 시작 금지 규칙 없음
**수정:** `app/api/write-episode/route.ts`에 절대 규칙 추가
```
## 절대 규칙 (반드시 지킬 것)
1. **첫 문장부터 임팩트**: "평온한 나날이 계속되었다" 같은 느슨한 시작 금지
2. **매 단락 긴장 유지**: 일상 묘사가 3문장 이상 연속되면 안 됨
3. **패딩 금지**: "그 후로 아무 일 없이" 같은 표현 절대 금지
4. **첫 씬부터 사건**: 1화든 10화든, 첫 장면에서 무언가가 일어나야 함
```

#### 4. 작가 코멘트 선택지 빈약 문제
**원인:** 스토리 구조 API가 `recommendedOpening` 필드를 반환하지 않음
**수정:**
1. `app/api/generate-project/route.ts` - 스토리 구조를 JSON으로 반환 (part1/2/3, recommendedOpening, openingScene, summary)
2. `app/project/page.tsx` - 초기 메시지에 전체 구조 + 오프닝 제안 표시
3. `app/conversation/page.tsx` - 누락된 액션 핸들러 추가 (alt_opening, view_characters, discuss, revise, redirect)
4. `app/api/author-respond/route.ts` - `alt_opening` 액션용 특화 프롬프트 추가

### 추가 수정 사항

#### JSON 파싱 개선
**파일:** `app/api/generate-project/route.ts`
- `tryRepairJson` 함수 강화: 잘린 문자열 닫기, 열린 괄호 자동 닫기

#### 에피소드 저장 누락 수정
**파일:** `app/conversation/page.tsx`
- `addEpisode(data.episode)` 호출 추가 - 작성된 에피소드를 스토어에 저장

### 수정된 파일 목록
1. `app/project/page.tsx` - 초기화 로직 + 향상된 초기 메시지
2. `app/conversation/page.tsx` - 액션 핸들러 추가 + 에피소드 저장
3. `app/api/generate-project/route.ts` - 스토리 구조 JSON + JSON 복구 강화
4. `app/api/write-episode/route.ts` - 패딩 금지 규칙 (이전 세션)
5. `app/api/author-respond/route.ts` - alt_opening 프롬프트

### 현재 상태
- 개발 서버 정상 작동 중
- 모든 수정사항 컴파일 성공
- 테스트 필요: 새 프로젝트 생성 → 1화 작성 플로우

---

## 2026-02-10 버그 수정

### 에피소드 번호 버그 재발 (1화 → 4화)
**증상:** 새 프로젝트에서 1화 작성을 요청했는데 4화가 생성됨
**원인:** `conversation/page.tsx`에서 `currentEpisodeNumber + 1`로 에피소드 번호를 계산했는데, 이 값이 localStorage에서 이전 프로젝트의 값을 복원하여 잔존함. `reset()` 호출 후에도 Zustand persist 미들웨어가 값을 복원하는 race condition 발생.

**해결:**
- `currentEpisodeNumber` 대신 `episodes.length` 기반으로 다음 에피소드 번호 계산
- `episodes.length + 1`은 항상 올바른 다음 화 번호를 보장 (스토어의 실제 에피소드 배열 기준)

**수정 파일:** `app/conversation/page.tsx`
```typescript
// 변경 전
episodeNumber: currentEpisodeNumber + 1,

// 변경 후
const nextEpisodeNumber = episodes.length + 1;
episodeNumber: nextEpisodeNumber,
```

### 캐릭터 프롬프트 강화
**증상:** 여전히 캐릭터가 1명만 생성되는 경우가 발생
**수정:** `app/api/generate-project/route.ts`의 캐릭터 프롬프트를 더 강화
- "최소 3명 이상" → "반드시 3명 이상 생성 - 1명이나 2명만 생성하면 실패"
- 역할 분배 필수 명시 (protagonist 1명, antagonist 최소 1명, neutral 최소 1명)
- 위반 시 실패라는 강한 경고 추가

### 수정된 파일 목록 (2026-02-10)
1. `app/conversation/page.tsx` - 에피소드 번호 계산 로직 수정 (`episodes.length` 기반)
2. `app/api/generate-project/route.ts` - 캐릭터 프롬프트 강화

### 기존 수정 확인 (이미 완료됨)
- ✅ "평온한 나날" 패딩 금지 규칙 (`write-episode/route.ts`)
- ✅ 작가 코멘트 선택지 강화 (`author-respond/route.ts`)
- ✅ 프로젝트 초기화 시 `reset()` + `setCurrentEpisodeNumber(0)` (`project/page.tsx`)

**다음 작업:** 사용자 테스트 후 피드백 반영

---

## 집필 스타일 규칙 구현 (instruction-writing-style.md, 2026-02-10 완료)

### 핵심 변경

1. **시점 선택 UI 추가** (`app/project/page.tsx`)
   - 프로젝트 생성 화면에 시점 선택 (1인칭 주인공 / 3인칭 작가 / 직접 입력)
   - `SimplifiedProjectConfig.viewpoint` 필드에 저장

2. **시점별 문체 규칙** (`app/api/write-episode/route.ts`)
   - 1인칭: "나"로 서술, 주인공 시점 제한, 다른 인물 속마음 추측만 가능
   - 3인칭: 캐릭터 이름으로 서술, 시점 전환 가능, 인물 없는 장면도 가능

3. **마크다운 서식 금지** (소설 본문)
   - 볼드, 이탤릭, 제목, 목록, 인용, 코드 블록, 구분선 일체 금지
   - 순수 텍스트만 사용, 강조는 짧은 문장/단독 행으로 표현
   - 장면 전환은 빈 줄로만

4. **작가 대화 톤 변경** (`app/api/author-respond/route.ts`)
   - 존댓말 → 반말 (동등한 창작 파트너)
   - 보고서 형태 → 이야기하듯이
   - "제안드립니다" → "이렇게 쓸 거야"
   - 기술 용어 금지 ("시뮬레이션", "서사 아크" 등)
   - 확신 있는 태도, 허락 구하지 않음

5. **초기 보고서 톤 변경** (`app/project/page.tsx`)
   - 마크다운 서식 제거
   - 작가 말투로 자연스럽게 설명

### 수정된 파일
1. `lib/types/index.ts` - `viewpoint` 필드 추가
2. `app/project/page.tsx` - 시점 선택 UI + 초기 보고서 톤 변경
3. `app/api/write-episode/route.ts` - 시점별 규칙 + 마크다운 금지
4. `app/api/author-respond/route.ts` - 작가 톤 변경

### 빌드 이슈 해결
- 프롬프트 내 백틱(```)이 템플릿 리터럴 파싱 에러 유발
- "코드 블록(백틱) 금지"로 텍스트 대체하여 해결

### 프로덕션 빌드 성공 (2026-02-10)

---

## 세계 우선 아키텍처 구현 (instruction-world-first-architecture.md, 2026-02-10 진행 중)

### 핵심 변경

**기존 방식:** 폼 입력 → 자동 생성 (generate-project API)
**새 방식:** 대화형 레이어 구축 (7개 레이어를 작가와 함께 하나씩 구축)

### 7개 레이어
1. **세계 (World)** - 대륙, 도시, 지형
2. **핵심 규칙 (Core Rules)** - 힘의 체계, 종족, 역사
3. **씨앗 (Seeds)** - 세력, 종족, 몬스터, NPC
4. **주인공 서사 (Hero Arc)** - 주인공의 태생, 핵심 서사, 목표
5. **빌런 서사 (Villain Arc)** - 빌런의 동기, 서사, 주인공과의 관계
6. **궁극의 떡밥 (Ultimate Mystery)** - 표면/진실, 힌트들
7. **소설 (Novel)** - 시뮬레이션 + 집필

### 새 타입 (`lib/types/index.ts`)
- `WorldFirstProject` - 전체 프로젝트 구조
- `WorldLayer`, `CityInfo` - 세계 레이어
- `CoreRulesLayer` - 규칙 레이어
- `SeedsLayer`, `FactionSeedInfo`, `RaceInfo`, `ThreatInfo`, `NPCSeedInfo` - 씨앗 레이어
- `HeroArcLayer` - 주인공 레이어
- `VillainArcLayer` - 빌런 레이어
- `UltimateMysteryLayer` - 떡밥 레이어
- `LayerName`, `LayerStatus`, `LayerBuildMessage`, `LayerChoice` - 레이어 구축 관련

### 새 스토어 상태 (`lib/store/simulation-store.ts`)
- `worldFirstProject: WorldFirstProject | null`
- `layerBuildMessages: LayerBuildMessage[]`
- 레이어별 업데이트 액션들 (updateWorldLayer, updateCoreRulesLayer, 등)
- `confirmLayer()`, `setCurrentLayer()`, `initWorldFirstProject()` 등

### 새 API (`app/api/layer-build/route.ts`)
- 각 레이어별 AI 제안 생성
- 작가 톤으로 자연스러운 대화

### UI 변경

1. **프로젝트 시작 페이지 (`app/project/page.tsx`)**
   - 기존 "주제+스토리라인 폼" → "장르/톤/시점/작가 + 초기 아이디어(선택)"
   - [세계 만들기 시작] 버튼 → 대화 화면으로 이동

2. **대화 화면 (`app/conversation/page.tsx`)** - 전면 재작성
   - 상단: 레이어 진행 표시 (● 확정 / ◐ 진행 중 / ○ 대기)
   - 중앙: 작가와 대화 (레이어 제안 → 피드백 → 확정)
   - 하단: [레이어 확정] [다시 제안] 버튼
   - 사이드 패널: 7개 레이어별 탭 (확정된 내용 표시)

3. **대화 흐름**
   - 첫 진입 시 자동으로 "세계" 레이어 제안 생성
   - 환님이 피드백 → 작가가 수정안 제안
   - [확정] 클릭 → 다음 레이어로 자동 진행
   - 모든 레이어 확정 → 1화 자동 집필 시작

### 수정된 파일 목록
1. `lib/types/index.ts` - 7개 레이어 타입 추가
2. `lib/store/simulation-store.ts` - WorldFirst 상태 + 액션 추가
3. `app/api/layer-build/route.ts` - 새 API (레이어별 제안 생성)
4. `app/project/page.tsx` - 간소화된 시작 폼
5. `app/conversation/page.tsx` - 레이어 구축 대화 UI

### 프로덕션 빌드 성공 (2026-02-10)

---

## UNIFIED-INSTRUCTION2 기반 보강 (2026-02-10)

UNIFIED-INSTRUCTION2.md 스펙에 맞춰 타입, 스토어, API, UI를 보강했다.

### 타입 보강 (`lib/types/index.ts`)

**새 타입:**
- `SimulationEvent` - 감각 디테일, 감정 임팩트, 결과, 중요도, 전환점 여부
- `EpisodeHooks` - 오프닝/클로징 훅
- `ProjectPhase` - 프로젝트 진행 단계 (`'setup' | 'worldbuilding' | 'simulation' | 'writing'`)
- `CharacterProfileV2` - UNIFIED2 스펙의 상세 캐릭터 프로필

**기존 타입 확장:**
- `CharacterSeed` - `name`, `birthCondition`, `initialEnvironment`, `innateTraits[]`, `latentPotentials[]`, `roleTendency` 추가
- `WorldHistoryEra` - `period`, `events[]`, `worldMood`, `mysteryHint`, `legacy` 추가
- `DetailedDecade` - `period`, `factionStatus`, `tension`, `worldState`, `events[]` 추가
- `Episode` - `viewpointCharacter`, `wordCount`, `hooks` 추가
- `Project` - `currentPhase` 추가

### 스토어 보강 (`lib/store/project-store.ts`)

- `setCurrentPhase(phase: ProjectPhase)` 액션 추가
- 프로젝트 생성 시 `currentPhase: 'setup'`으로 초기화

### 집필 API 보강

**write-episode (`app/api/write-episode/route.ts`):**
- 나레이션 위주 규칙 추가:
  - 대화보다 서술이 훨씬 많아야 함
  - 한 화에 대화 5~10회 미만
  - 짧은 왕복 대화 (핑퐁 대화) 금지
  - 대화 없이 긴장감 만들기: 행동, 감각, 생각으로 장면 채우기

**revise-episode (`app/api/revise-episode/route.ts`):**
- 동일한 나레이션 규칙 추가

### 세계 타임라인 UI (`components/world-timeline/`)

**새 컴포넌트:**
- `WorldTimelineOverview.tsx` - 축소 뷰 (전체 역사 가로 타임라인)
- `DecadeDetailView.tsx` - 확대 뷰 (10년 단위, 세력 상태, 긴장도)
- `WorldTimelinePanel.tsx` - 통합 패널 (3탭: 전체 역사, 10년 단위, 캐릭터별)

**프로젝트 페이지 통합:**
- `app/projects/[id]/page.tsx`에 "역사" 탭 추가
- 사이드 패널에서 세계 역사 타임라인 확인 가능

### 파일 변경 목록
1. `lib/types/index.ts` - 타입 보강
2. `lib/store/project-store.ts` - currentPhase + setCurrentPhase 추가
3. `app/api/write-episode/route.ts` - 나레이션 규칙 추가
4. `app/api/revise-episode/route.ts` - 나레이션 규칙 추가
5. `components/world-timeline/WorldTimelineOverview.tsx` - 신규
6. `components/world-timeline/DecadeDetailView.tsx` - 신규
7. `components/world-timeline/WorldTimelinePanel.tsx` - 신규
8. `components/world-timeline/index.ts` - 신규
9. `app/projects/[id]/page.tsx` - 역사 탭 추가
10. `components/characters/SeedEditModal.tsx` - 타입 수정

### 빌드 성공 확인 완료

---

## 프로젝트 자동 저장 및 내보내기/불러오기 (2026-02-10)

### 구현 내용

#### 1. 저장됨 표시 (`components/common/SaveIndicator.tsx`)
- 프로젝트 데이터 변경 시 화면 하단 중앙에 "✓ 저장됨" 토스트 표시
- 2초 후 자동으로 사라짐
- Zustand persist 미들웨어가 localStorage에 자동 저장 (기존 기능)
- 시각적 피드백으로 저장 완료를 사용자에게 알림

#### 2. 프로젝트 목록 개선 (`app/projects/page.tsx`)
- 프로젝트 카드에 초기 방향(direction)을 제목으로 표시 (2줄 제한)
- 장르, 톤, 진행 단계, 마지막 작업 시간 표시
- 호버 시 내보내기(↓) 및 삭제(✕) 버튼 표시

#### 3. 내보내기/불러오기 기능
**내보내기:**
- 개별 프로젝트: 카드 호버 → ↓ 버튼 → JSON 파일 다운로드
- 전체 프로젝트: 헤더의 [전체 내보내기] 버튼 → 모든 프로젝트 JSON 다운로드
- 파일명: `narrative-{장르}-{날짜}.json` 또는 `narrative-all-projects-{날짜}.json`

**불러오기:**
- 헤더의 [불러오기] 버튼 → JSON 파일 선택
- 단일 프로젝트 또는 복수 프로젝트 파일 모두 지원
- 불러온 프로젝트는 새 ID가 부여되어 중복 방지

### 파일 변경 목록
1. `components/common/SaveIndicator.tsx` - 신규 (저장됨 토스트)
2. `components/common/ClientProviders.tsx` - SaveIndicator 추가
3. `app/globals.css` - fade-in 애니메이션 추가
4. `app/projects/page.tsx` - 내보내기/불러오기 + 제목 표시

### JSON 내보내기 형식
```json
{
  "version": "1.0",
  "exportedAt": "2026-02-10T...",
  "project": { ... }  // 단일 프로젝트
  // 또는
  "projects": [ ... ]  // 복수 프로젝트
}
```

---

## Hydration 에러 수정 (2026-02-10)

### 문제
- Zustand persist 미들웨어가 localStorage에서 데이터를 로드
- 서버 렌더링 시 localStorage가 없어서 빈 데이터
- 클라이언트 hydration 시 localStorage 데이터와 불일치 발생

### 해결 방법
각 페이지에 `isHydrated` 상태 추가:

```typescript
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  setIsHydrated(true);
}, []);

// hydration 전에는 로딩 UI 또는 null 반환
if (!isHydrated) {
  return <div>불러오는 중...</div>;
}
```

### 수정된 파일
1. `app/projects/page.tsx` - 프로젝트 목록
2. `app/projects/[id]/page.tsx` - 프로젝트 대화 화면
3. `app/projects/[id]/result/page.tsx` - 결과물 페이지

---

## 세계 역사 생성 기능 구현 (2026-02-10)

### 문제
- [시작하자] 클릭 시 "세계 역사를 생성하고 있어..." 메시지만 표시되고 실제 API 호출 없음
- `start_simulation` 액션에 TODO 주석만 있었음

### 해결 방법
`app/projects/[id]/page.tsx`의 `start_simulation` 액션에 실제 구현 추가:

1. `/api/generate-world-history` API 호출
2. 60초 타임아웃 (AbortController)
3. 에러 시 메시지 + [다시 시도] 버튼
4. 성공 시 `setWorldHistory()`, `setCurrentPhase('simulation')`
5. [시뮬레이션 시작], [역사 탭에서 확인] 버튼 표시

### 추가된 액션
- `run_simulation`: 캐릭터 시뮬레이션 (TODO)
- `view_history`: 사이드 패널 "역사" 탭으로 전환

---

## 작가 대화 AI 호출 버그 수정 (2026-02-10)

### 문제
- 모든 레이어 확정 후 (`currentLayer === 'novel'`) 어떤 메시지를 보내도 하드코딩된 응답만 반환
- API에서 `layer === 'novel'`일 때 Claude API 호출 없이 바로 반환

### 해결 방법

#### API 수정 (`app/api/author-chat/route.ts`)
1. `action: 'conversation'` 타입 추가
2. `conversationHistory`, `currentPhase` 파라미터 추가
3. `buildConversationPrompt()` 함수 추가:
   - 프로젝트 정보 (장르, 톤, 시점, 현재 단계)
   - 완성된 세계 요약 (대륙, 주인공, 빌런, 떡밥)
   - 최근 대화 기록 (마지막 10개)
   - 환님의 현재 메시지
4. `layer === 'novel'`일 때도 실제 Claude API 호출

#### 클라이언트 수정 (`app/projects/[id]/page.tsx`)
- novel 단계에서 `action: 'conversation'` 사용
- 대화 기록(`conversationHistory`) 전달
- 현재 단계(`currentPhase`) 전달

### 이제 동작하는 것
- 어떤 질문이든 맥락에 맞는 실제 AI 응답
- 세계/캐릭터/스토리에 대한 질문에 만든 세계 기반으로 답변
- 진행 상황 문의에 현재 단계와 다음 할 일 안내

### 프로덕션 빌드 성공 (2026-02-10)

---

## 에피소드 편집 기능 구현 (2026-02-10)

1화가 작성됐을 때 환님이 할 수 있는 3가지 액션을 구현했다.

### 구현된 기능

#### 1. 부분 수정 (Partial Edit)
- 본문에서 텍스트를 드래그로 선택하면 "이 부분 수정" 버튼 표시
- 선택한 텍스트 + 수정 방향 입력 → `/api/revise-episode` (mode: 'partial')
- 해당 부분만 수정되고 나머지는 유지

#### 2. 전체 피드백 (Full Feedback)
- 본문 아래 "전체 피드백" 버튼 → textarea 입력
- 피드백 내용 전송 → `/api/revise-episode` (mode: 'full')
- 전체 본문을 피드백에 맞춰 수정

#### 3. 채택 → 다음 화 (Adopt)
- "채택 → 다음 화" 버튼 클릭
- 현재 에피소드 status를 'final'로 변경
- 다음 화 작성 여부 선택지 표시

### 새 컴포넌트

**`components/episode/EpisodeViewer.tsx`**
- 에피소드 본문 표시 (소설 스타일 렌더링)
- 텍스트 선택 감지 (window.getSelection)
- 부분 수정 팝업 UI
- 전체 피드백 입력 UI
- 채택 버튼

### API 수정

**`app/api/revise-episode/route.ts`**
- `mode: 'partial' | 'full'` 파라미터 추가
- `selectedText` 파라미터 (partial 모드용)
- 부분 수정: 선택한 텍스트만 수정 후 전체 본문에 반영
- 전체 수정: 피드백 반영하여 전체 재작성

### 페이지 수정

**`app/projects/[id]/page.tsx`**
- `updateEpisode`, `addEpisode` 스토어 함수 추가
- `editingEpisodeId`, `isRevising` 상태 추가
- `handlePartialEdit`, `handleFullFeedback`, `handleAdopt` 핸들러 구현
- `write_next_episode`, `revert_adopt` 액션 핸들러 추가
- EpisodeViewer 조건부 렌더링 (currentLayer === 'novel' && editingEpisodeId)
- 사이드 패널 원고 탭에서 에피소드 클릭으로 편집 모드 전환

### 흐름

```
1화 작성 완료
  ↓
EpisodeViewer 표시 (본문 읽기)
  ↓
┌──────────────────────────────────────────┐
│ [텍스트 선택] → "이 부분 수정" → 부분 수정 │
│ [전체 피드백] → 피드백 입력 → 전체 수정   │
│ [채택 → 다음 화] → 확정 → 다음 화 여부   │
└──────────────────────────────────────────┘
  ↓
[다음 화 작성] → 2화 집필 시작
```

### 프로덕션 빌드 성공 (2026-02-10)

---

## 에피소드 분량 및 문체 개선 (2026-02-10)

### 문제
- 에피소드 분량이 약 1,900자로 너무 짧음
- 네이버 웹소설 연재 기준 최소 5,000자 이상 필요
- "늪이다. 발이 빠진다." 같은 짧은 문장만 나열되는 문체

### 해결

#### 1. 분량 지시 강화 (`app/api/write-episode/route.ts`)
```
분량 절대 규칙:
- 반드시 5,000자 이상 7,000자 이하로 작성
- 장면을 충분히 묘사
- 인물의 내면을 깊이 파고듦
- 감각적 디테일을 풍부하게
- 서술과 묘사를 충분히 넣을 것
```

#### 2. 분량 검증 및 자동 재시도
- 응답 받은 후 글자 수 체크
- 4,000자 미만이면 보강 요청하여 재생성
- 최대 2회 재시도
- 보강 프롬프트:
  - 장면 묘사 구체화 (공간, 빛, 소리, 냄새, 온도)
  - 인물 내면 심리 확장
  - 동작 섬세하게 풀어쓰기
  - 배경/분위기 묘사 추가
  - 과거 회상/생각 삽입

#### 3. 문체 리듬 규칙 추가
```
- 짧은 문장과 긴 서술을 리듬감 있게 섞을 것
- 액션은 짧게, 심리/묘사는 길게
- 한 장면 안에서 시각/청각/촉각/후각 중 최소 2가지 감각 포함

잘못된 예: "늪이다. 발이 빠진다. 진흙탕이다."
올바른 예: "늪이다. 발목까지 빠져든 진흙이 차갑게 살을 물었다.
           썩은 풀냄새가 코를 찔렀고, 어디선가 뻐꾸기가 울었다..."
```

#### 4. API 설정 변경
- `max_tokens`: 8000 → 16000 (분량 증가 대응)
- 상수 정의:
  - `MIN_CHAR_COUNT = 4000` (재시도 기준)
  - `TARGET_MIN_CHAR = 5000`
  - `TARGET_MAX_CHAR = 7000`
  - `MAX_RETRY = 2`

### 수정된 파일
- `app/api/write-episode/route.ts` - 전면 재작성

---

## 상업 웹소설 집필 규칙 적용 (instruction-commercial-writing.md, 2026-02-10)

`write-episode` API에 상업 웹소설 집필 규칙 전체 반영.

### 에피소드 번호별 미션 분기

| 화 | 미션 |
|----|------|
| 1화 | 상황 + 갈등 + 미스터리. 시작이지 끝이 아님. |
| 2화 | 주인공 능력 힌트. 완전히 보여주지 않음. |
| 3화 | 사건 폭발. 쌓은 긴장이 터짐. |
| 4화 | 연결과 확장. 5화 중독 포인트 향해 준비. |
| 5화 | 중독 포인트 확정. 정체성/목표/매력/세계규칙 확립. |
| 6화+ | 매 화 보상 + 클리프행어 유지. |

### 반영된 규칙

1. **캐릭터 상품성**
   - 팔리는 주인공: 능력/결단력/명확한 감정/강한 욕망/적극적 행동
   - 금지: 수동적/고민만/평범함 강조/늦은 성장

2. **회차 보상 구조**
   - 정보/감정/능력/전개 보상 중 1개 이상 필수
   - 아무 일도 안 일어나는 화 = 독자 이탈

3. **클리프행어 필수**
   - 마지막 2줄이 다음 화 클릭 결정
   - 위기/발견/반전/선언 중 택1

4. **속도감과 리듬**
   - 한 장면 800자 이내
   - 사건 없이 1,500자 금지
   - 긴 묘사 → 긴 심리 → 짧은 행동 → 임팩트

5. **대사 규칙**
   - 짧고 성격 드러나고 정보+감정 포함
   - 대사 전후에 표정/태도/동작 필수

6. **감정 타이밍**
   - 사건 → 반응(1줄) → 행동(1줄)
   - 작가가 울면 독자 안 움. 작가가 참으면 독자가 움.

7. **반복 제거**
   - 한 문단에 같은 단어 2회 금지
   - 같은 정보 2번 설명 금지

---

## 집필 프롬프트 강화 + 환님 수정 반영 시스템 (2026-02-10)

### 1. 집필 전 설계 과정

write-episode API에 장면 설계 + 자가 수정 지시 추가:

```
## 집필 전 설계 과정 (반드시 따를 것)

1. 먼저 이 화의 장면 구성을 설계하세요
2. 각 장면에서 주인공의 심리 상태를 정리하세요
3. 그 심리가 행동으로 드러나도록 집필하세요

## 자가 수정 (작성 후 점검)

다음 특징이 보이면 스스로 수정하세요:
- 너무 균일한 문장 길이 → 짧고 긴 문장 섞기
- 감정 직접 서술 → 행동과 감각으로 보여주기
- 정돈된 나열 구조 → 리듬감 있게 재배치
- 설명적 서술 → 사건 속에서 자연스럽게

약간 거친 초고 느낌을 유지하세요.
```

### 2. 환님 직접 편집 모드

**Episode 타입 확장:**
```typescript
interface Episode {
  content: string;           // 작가가 쓴 원본
  editedContent?: string;    // 환님이 수정한 본문
  // ...
}

// 헬퍼 함수
getEpisodeFinalContent(episode): string  // editedContent ?? content
```

**EpisodeViewer 편집 기능:**
- 더블클릭 또는 [직접 편집] 버튼 → textarea 모드 전환
- ESC로 취소, [수정 완료] 버튼으로 저장
- 수정본은 `editedContent`에 저장
- 헤더에 "수정됨" 배지 표시

### 3. 이전 화 최종본 반영

다음 화 집필 시 환님 수정본을 프롬프트에 포함:

```
## 이전 화 최종본 (환님 수정 반영)

아래는 {N}화의 전체 본문입니다.
환님이 직접 수정한 최종본입니다.
이 문체, 톤, 리듬을 유지하면서 다음 화를 이어서 작성하세요.
환님의 수정 방향성을 반영하세요.

{previousEpisodeFinalContent}
```

### 변경된 파일

1. `lib/types/index.ts`
   - `Episode.editedContent` 필드 추가
   - `getEpisodeFinalContent()` 헬퍼 함수 추가

2. `app/api/write-episode/route.ts`
   - 장면 설계 + 자가 수정 지시 추가
   - 이전 화 최종본(3000자) 프롬프트에 포함
   - `getEpisodeFinalContent` 사용

3. `components/episode/EpisodeViewer.tsx`
   - `editedContent`, `onDirectEdit` props 추가
   - 편집 모드 (textarea) 구현
   - "수정됨" 배지 표시

4. `app/projects/[id]/page.tsx`
   - `handleDirectEdit` 핸들러 추가
   - EpisodeViewer에 새 props 전달

---

## 4단계 사고 시스템 적용 (instruction-writing-system-final.md, 2026-02-10)

`write-episode` API를 4단계 사고 시스템으로 전면 교체.

### 핵심 변경

**기존 방식:** 에피소드별 미션 + 상업 규칙 나열
**새 방식:** 3명의 전문가가 협업하는 작가실 모델

### 4단계 사고 시스템

| 단계 | 역할 | 핵심 작업 |
|------|------|----------|
| 1단계 | 감정 감독 (Emotion Director) | 감정 시작점/변화점/폭발점 설계. 감정은 행동으로만 드러냄 |
| 2단계 | 장면 감독 (Scene Director) | 카메라 시점, 공간/소리/움직임, 긴장 곡선 설계 |
| 3단계 | 초고 집필 (Writer) | 설명 최소, 행동 중심. 문장 리듬 패턴 적용 |
| 4단계 | 수정 (Editor) | AI 느낌 제거, 거친 초고 느낌 유지 |

**핵심 규칙:**
- 중간 과정(1~4단계 메모)은 절대 출력하지 않음
- 최종 소설 본문만 출력

### 새 프롬프트 구조

```
[작가 페르소나]
[시점]
[세계관] - confirmedLayers.world, coreRules, seeds
[주인공/빌런] - confirmedLayers.heroArc, villainArc
[궁극의 떡밥] - confirmedLayers.ultimateMystery
[캐릭터 현재 상태] - characterProfiles
[이전 화 — 환님 최종본] - previousEpisode.finalContent
[기억 잔상] - characterMemories (행동에만 반영, 직접 언급 금지)
[이 화 정보] - episodeNumber, authorDirection
[초반 5화 가이드라인]

=== 1단계: 감정 감독 ===
=== 2단계: 장면 감독 ===
=== 3단계: 초고 집필 ===
=== 4단계: 수정 ===

=== 출력 규칙 ===
```

### API 파라미터 확장

```typescript
// POST /api/write-episode
{
  episodeNumber: number;
  projectConfig: {...};
  confirmedLayers?: {
    world?: string;
    coreRules?: string;
    seeds?: string;
    heroArc?: string;
    villainArc?: string;
    ultimateMystery?: string;
  };
  characterProfiles?: string;   // 캐릭터 현재 상태
  characterMemories?: string;   // 기억 잔상 (경험 요약)
  previousEpisodes?: Episode[];
  authorDirection?: string;     // 이 화 방향
}
```

### 문체 규칙 요약

| 규칙 | 설명 |
|------|------|
| 감정 표현 | "슬펐다" 금지 → "손이 떨렸다. 이를 깨물었다." |
| 문장 리듬 | 짧은 3~5개 연속 → 긴 1~2개 → 임팩트 단독행 |
| 대사 | 짧고 강렬, 전후에 표정/태도/동작 필수 |
| 왕복 대사 | A 한줄 B 한줄 반복 금지 |
| 기억 잔상 | 이전 경험을 행동/망설임에만 반영 |
| 마크다운 | 절대 금지 (볼드, 이탤릭, 제목, 목록 등) |
| 분량 | 5,000자 이상 7,000자 이하 |
| 클리프행어 | 매 화 마지막 2줄 (위기/발견/반전/선언) |
| 보상 | 매 화 1개 이상 (정보/감정/능력/전개) |

### 분량 검증

- 4,000자 미만 시 자동 재생성 (최대 2회)
- 재생성 프롬프트에 장면 묘사/내면 서술 보강 지시

### 변경된 파일

1. `app/api/write-episode/route.ts` - 4단계 사고 시스템 프롬프트로 전면 교체

### 프로덕션 빌드 성공 (2026-02-10)

---

## 피드백 누적 학습 시스템 (2026-02-11 완료)

환님의 피드백을 자동 분류하여 누적 저장하고, 다음 화 집필 시 반영하는 시스템.

### 핵심 개념

1. **피드백 감지**: 사용자 메시지에서 피드백 키워드 감지
2. **피드백 분류**: 1회성 vs 누적형 자동 분류
3. **누적 저장**: `feedbackHistory` 배열에 저장 (localStorage persist)
4. **집필 반영**: 다음 화 프롬프트에 누적 피드백 포함

### 피드백 유형 (FeedbackType)

| 유형 | 키워드 예시 | 누적 여부 |
|------|-------------|----------|
| style | 문체, 톤, 스타일, 말투, 표현, 묘사 | 대부분 누적 |
| character | 캐릭터, 인물, 성격 | 상황에 따라 |
| plot | 전개, 스토리, 플롯 | 상황에 따라 |
| pacing | 속도, 페이스, 빠르다, 느리다 | 대부분 누적 |
| general | 기타 | 상황에 따라 |

### 누적형 vs 1회성 판단

**누적형 피드백 (isRecurring: true)**
- 문체/스타일/톤 관련 피드백
- 페이스 관련 피드백
- "항상", "계속", "매번", "전반적" 키워드 포함
- 특정 장면 언급 없음

**1회성 피드백 (isRecurring: false)**
- "이 장면", "여기서", "이 부분" 등 특정 위치 언급
- 설정 오류, 모순 지적
- 특정 대사/행동 수정 요청

### 프롬프트 반영 형식

```
### 환님 피드백 (누적 - 반드시 반영)

[문체/스타일]
- 대사가 너무 길어. 더 짧게 써줘.
- 톤이 너무 밝아. 어두운 분위기 유지해.

[페이스]
- 전개가 너무 빨라. 여유 있게 써줘.

※ 위 피드백은 환님이 이전 화에서 요청한 수정사항입니다. 이번 화에도 반드시 반영하세요.
```

### 타입 정의

```typescript
// lib/types/index.ts
export type FeedbackType = 'style' | 'character' | 'plot' | 'pacing' | 'general';

export interface Feedback {
  id: string;
  episodeNumber: number;
  type: FeedbackType;
  content: string;
  isRecurring: boolean;
  timestamp: string;
}

// Project 인터페이스에 추가
feedbackHistory: Feedback[];
```

### 스토어 액션

```typescript
// lib/store/project-store.ts
addFeedback: (feedback: Omit<Feedback, 'id' | 'timestamp'>) => void;
getRecurringFeedback: () => Feedback[];
```

### 수정된 파일

1. `lib/types/index.ts` - Feedback 타입 추가 (이전 세션)
2. `lib/store/project-store.ts` - addFeedback, getRecurringFeedback 구현
3. `app/api/author-chat/route.ts`:
   - `classifyFeedback()` - AI 없이 키워드 기반 분류
   - `isFeedbackMessage()` - 피드백 메시지 감지
   - `buildFeedbackSection()` - 누적 피드백을 프롬프트로 변환
   - 응답에 `feedback` 필드 포함 (분류 정보)
   - 집필 프롬프트에 `recurringFeedback` 포함
4. `app/api/write-episode/route.ts`:
   - `buildFeedbackSection()` - 누적 피드백을 프롬프트로 변환
   - `buildUserPrompt`에 `recurringFeedback` 파라미터 추가
   - POST 핸들러에서 `recurringFeedback` 추출 및 전달
5. `app/projects/[id]/page.tsx`:
   - `addFeedback`, `getRecurringFeedback` 스토어 훅 추가
   - API 호출 시 `recurringFeedback` 전달
   - 응답에서 피드백 감지 시 `addFeedback()` 호출
   - `handleFullFeedback`에서 문체 피드백 자동 저장

### 데이터 흐름

```
1. 환님이 피드백 메시지 전송
   예: "대사가 너무 길어. 짧게 써줘."

2. author-chat API에서 감지 및 분류
   → isFeedbackMessage() = true
   → classifyFeedback() = { type: 'style', isRecurring: true }

3. 응답에 feedback 필드 포함
   → { message: "...", feedback: { type: 'style', isRecurring: true, ... } }

4. 클라이언트에서 저장
   → addFeedback({ type: 'style', content: '...', isRecurring: true })
   → localStorage에 persist

5. 다음 화 집필 요청 시
   → getRecurringFeedback() = [{ type: 'style', content: '대사가 너무 길어...' }]
   → API 호출에 recurringFeedback 포함

6. write-episode에서 프롬프트에 반영
   → buildFeedbackSection(recurringFeedback) 호출
   → "### 환님 피드백 (누적)" 섹션 추가
```

### 컴파일 성공 확인 (2026-02-11)

---

## 배포 준비 (2026-02-11 진행 중)

### Git 커밋 완료
- 커밋 해시: `a80f9d0`
- 커밋 메시지: "Initial commit: Narrative Simulator - AI Web Novel Generator"
- 112개 파일, 31,113줄 추가

### Git 설정
```
user.name: 윤지환
user.email: hun3349@gmail.com
```

### 배포 대기 중 - Vercel

**다음 단계:**

1. **GitHub 저장소 생성**
   - https://github.com/new 접속
   - Repository name: `narrative-simulator`
   - Private 선택 권장
   - "Create repository" 클릭

2. **코드 푸시**
   ```bash
   cd "C:\Users\1\Desktop\웹소설\narrative-simulator"
   git remote add origin https://github.com/USERNAME/narrative-simulator.git
   git branch -M main
   git push -u origin main
   ```

3. **Vercel 연결**
   - https://vercel.com 접속 → GitHub 로그인
   - "Import Project" → 저장소 선택
   - **Environment Variables 필수 설정:**
     - `ANTHROPIC_API_KEY` = (API 키 값)
   - Deploy 클릭

4. **배포 완료 후**
   - Vercel이 고정 URL 제공 (예: `https://narrative-simulator.vercel.app`)
   - 커스텀 도메인 연결 가능

### 주의사항
- `.env.local`은 gitignore에 포함됨 (API 키 안전)
- Vercel에서 환경변수 별도 설정 필요
- localStorage 기반 데이터 저장 (브라우저별 독립)

---

## 시뮬레이션 통합 구현 (2026-02-11 완료)

7-레이어 프로젝트 시스템과 캐릭터 시뮬레이션 엔진 연동 완료.

### 구현 내용

#### 1. 레이어 데이터 → 캐릭터 변환
- `heroArc` 레이어 → 주인공 Character + CharacterSeed
- `seeds` 레이어의 NPCs → NPC Characters + CharacterSeeds
- 모든 필수 필드 자동 생성 (codename, temperament, latentAbility 등)

#### 2. 세계 역사 → WorldEvent 변환
- `worldHistory.eras` → WorldEvent[] 변환
- `keyEvents` 배열을 순회하며 WorldEvent 객체 생성
- `year`, `event`, `impact` 필드 매핑

#### 3. SSE 스트리밍 시뮬레이션
- `/api/simulate` 호출 (POST)
- SSE 이벤트 타입 처리:
  - `progress`: 진행 상황 표시
  - `completed`: 이벤트 카운트
  - `final_state`: 캐릭터 데이터 저장
  - `error`: 에러 처리

#### 4. 시뮬레이션 후 흐름
- 성공 시: `setCurrentPhase('writing')` + `setCurrentLayer('novel')`
- [1화 쓰기] 버튼 표시
- 실패 시: [다시 시도] + [시뮬레이션 건너뛰기] 버튼

### 수정된 파일

1. `app/projects/[id]/page.tsx`:
   - `setCharacters`, `setSeeds`, `setProfiles` 스토어 훅 추가
   - `run_simulation` 액션 핸들러 구현
   - 타입 오류 수정:
     - `episodeId` → `episode` (Message 타입)
     - `status: 'alive'` → `'childhood'`/`'training'` (CharacterStatus 타입)
     - `emotionalState.current` → `emotionalState.primary` (EmotionalState 타입)
     - CharacterSeed 필수 필드 추가
     - WorldEvent 필드 수정

### 시뮬레이션 흐름

```
[세계 역사 생성 완료]
  ↓
[시뮬레이션 시작] 클릭
  ↓
레이어 데이터에서 캐릭터 생성 (heroArc + seeds.npcs)
  ↓
WorldEvent 배열 생성 (worldHistory.eras.keyEvents)
  ↓
/api/simulate SSE 호출
  ↓
진행 상황 표시 (N년 시뮬레이션 중...)
  ↓
완료 → setCharacters() + setCurrentPhase('writing')
  ↓
[1화 쓰기] 버튼 표시
```

### 빌드 성공 확인 (2026-02-11)

### 시뮬레이션 API 테스트 완료 (2026-02-11)

**테스트 방법:** curl로 `/api/simulate` 직접 호출

**결과:**
- SSE 스트리밍 정상 작동
- 0~5년 유년기 시뮬레이션 성공
- 4개 이벤트 생성 (첫 숨, 무너진 것들 사이에서, 음성의 울림, 평온한 나날)
- 기억 스택에 4개 기억 저장
- 프로필 발현 (성격 특성 5개, 능력 2개)
- 응답 시간: 약 29초

**생성된 캐릭터 기억 예시:**
- "심장박동. 엄마의 가슴 위에서 들었던 규칙적인 두드림."
- "금속의 차가움. 손가락 끝이 느꼈던 예리한 무언가."
- "목소리들. 어떤 것은 안정적이었고, 어떤 것은 떨렸다."

**발현된 능력:**
- "무한한 잠재력 (발견)"
- "음성 패턴 감지 - 원초적 신뢰 판단 (발견)"

---

## 다음 작업 예정 (2026-02-12)

### 1. Vercel 배포

**준비 상태:**
- ✅ 프로덕션 빌드 성공
- ✅ Git 커밋 완료 (a80f9d0)
- ⏳ GitHub 저장소 생성 필요
- ⏳ Vercel 연결 필요

**배포 절차:**
1. GitHub 저장소 생성 (`narrative-simulator`, Private 권장)
2. 코드 푸시:
   ```bash
   cd "C:\Users\1\Desktop\웹소설\narrative-simulator"
   git remote add origin https://github.com/[USERNAME]/narrative-simulator.git
   git branch -M main
   git push -u origin main
   ```
3. Vercel 연결 (https://vercel.com)
4. 환경 변수 설정: `ANTHROPIC_API_KEY`
5. Deploy

### 2. 모바일 최적화

**현재 상태:** 데스크톱 우선 설계, 모바일 미최적화

**최적화 대상:**

#### 2.1 레이아웃 반응형
- [ ] 사이드 패널: 모바일에서 바텀 시트 또는 풀스크린 모달로 변경
- [ ] 채팅 영역: 모바일 전체 화면 활용
- [ ] 레이어 진행 표시: 가로 스크롤 또는 드롭다운으로 변경

#### 2.2 터치 인터랙션
- [ ] 버튼 크기 증가 (최소 44x44px)
- [ ] 선택지 버튼 간격 확보
- [ ] 스와이프 제스처 지원 (탭 전환)

#### 2.3 폰트 및 가독성
- [ ] 본문 폰트 크기 조정 (모바일 최소 16px)
- [ ] 에피소드 뷰어 줄간격 최적화
- [ ] 입력 필드 확대 방지 (`font-size: 16px`)

#### 2.4 성능 최적화
- [ ] 이미지 lazy loading (있을 경우)
- [ ] 불필요한 리렌더링 방지
- [ ] 모바일 키보드 대응 (채팅 입력 시 스크롤)

**참고 브레이크포인트:**
```css
/* Tailwind 기본 */
sm: 640px   /* 모바일 가로 */
md: 768px   /* 태블릿 */
lg: 1024px  /* 데스크톱 */
```

**주요 수정 예정 파일:**
- `app/globals.css` - 모바일 기본 스타일
- `app/projects/[id]/page.tsx` - 레이아웃 반응형
- `components/episode/EpisodeViewer.tsx` - 모바일 가독성
- `components/layout/Header.tsx` - 모바일 네비게이션

### 3. 추가 고려사항

- **PWA 지원** (선택): manifest.json, 서비스 워커 추가하면 홈 화면 설치 가능
- **다크 모드** (선택): 이미 Tailwind dark: 지원, 토글 UI만 추가하면 됨
- **오프라인 지원** (선택): localStorage 기반이라 기본적으로 데이터는 유지됨

---

## 현재 작동 상태 요약 (2026-02-11)

| 기능 | 상태 | 비고 |
|------|------|------|
| 프로젝트 생성 | ✅ 작동 | 장르/톤/시점/작가 선택 |
| 7레이어 구축 | ✅ 작동 | 대화형 레이어 확정 |
| 세계 역사 생성 | ✅ 작동 | 4-6개 시대 자동 생성 |
| 캐릭터 시뮬레이션 | ✅ 작동 | SSE 스트리밍, 유년기~성인기 |
| 에피소드 집필 | ✅ 작동 | 4단계 사고 시스템 |
| 피드백 누적 학습 | ✅ 작동 | 문체/페이스 피드백 자동 분류 |
| 에피소드 편집 | ✅ 작동 | 부분 수정/전체 피드백/직접 편집 |
| 내보내기 | ✅ 작동 | TXT/HTML/DOCX |
| 프로젝트 저장 | ✅ 작동 | localStorage + Supabase 동시 저장 |
| 데스크톱 UI | ✅ 작동 | - |
| 모바일 UI | ✅ 작동 | 반응형 개선 완료 |
| 배포 | ✅ 완료 | Vercel 배포됨 |
| Supabase DB | ✅ 작동 | 프로젝트 자동 동기화 |

---

## Supabase DB 통합 (2026-02-20 완료)

### 핵심 기능
- **듀얼 저장**: localStorage + Supabase 동시 저장
- **자동 동기화**: 프로젝트 변경 시 자동으로 Supabase에 저장
- **병합 로드**: 앱 시작 시 로컬과 Supabase 데이터 병합 (최신 버전 우선)
- **공유 페이지**: `/shared/[projectId]` - 스포일러 제외한 공개 뷰

### 환경 변수
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase 테이블 스키마 (projects)
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  tone TEXT NOT NULL,
  viewpoint TEXT NOT NULL,
  direction TEXT,
  author_persona JSONB NOT NULL,
  layers JSONB NOT NULL,
  layer_status JSONB NOT NULL,
  current_layer TEXT NOT NULL,
  current_phase TEXT NOT NULL,
  world_history JSONB,
  episodes JSONB DEFAULT '[]',
  feedback_history JSONB DEFAULT '[]',
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자별 프로젝트 조회 인덱스
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- RLS 정책 (선택)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own projects" ON projects
  FOR ALL USING (auth.uid()::text = user_id);
```

### 파일 구조
```
lib/supabase/
├── index.ts          # 모든 export
├── client.ts         # Supabase 클라이언트 + getBrowserUserId()
├── db.ts             # CRUD 함수 (save/load/delete/getShared)
└── types.ts          # Database 타입 정의
```

### 스토어 확장 (`lib/store/project-store.ts`)
```typescript
// 새 함수들
syncCurrentProjectToSupabase: () => Promise<void>;  // 현재 프로젝트 저장
loadFromSupabase: () => Promise<void>;              // 프로젝트 불러오기
mergeSupabaseProjects: (projects: Project[]) => void; // 로컬과 병합
```

### 동기화 시점
- `createProject()` → 새 프로젝트 생성 시
- `deleteProject()` → 프로젝트 삭제 시
- `updateLayer()` → 레이어 수정 시
- `confirmLayer()` → 레이어 확정 시
- `addEpisode()` → 에피소드 추가 시
- `updateEpisode()` → 에피소드 수정 시
- `addFeedback()` → 피드백 추가 시

### 공유 페이지 (`/shared/[projectId]`)
- `final` 상태 에피소드만 표시
- 빌런 서사, 떡밥 정보 제외 (스포일러 방지)
- 세계관, 주인공 기본 정보만 공개
- 별도 인증 불필요

### 사용자 식별
- `getBrowserUserId()`: localStorage에 고유 ID 저장
- 형식: `user_{timestamp}_{random}`
- 브라우저별 독립 (다른 기기에서 접근 불가)

### 오프라인 지원
- Supabase 연결 실패해도 localStorage 사용 가능
- `isSupabaseEnabled` 플래그로 조건부 동기화
- 에러는 console.warn으로 기록 (사용자 차단 없음)

---

## 레이어 제안 표시 방식 수정 (2026-02-20 완료)

### 문제
- 작가가 레이어를 제안할 때 JSON 데이터가 대화창에 그대로 노출됨
- 복사한 것처럼 보이는 불자연스러운 UX

### 해결

#### 1. message 필드 자연어 규칙 강화 (`app/api/author-chat/route.ts`)
모든 레이어 프롬프트의 JSON 응답 형식에 자연어 예시 추가:

```json
{
  "message": "자연어로만 2-3문장. 예: '황폐한 대륙이야. 북쪽엔 얼어붙은 산맥이...'",
  "layer": { ... }
}
```

적용된 레이어:
- world: "황폐한 대륙이야. 북쪽엔 얼어붙은 산맥이..."
- coreRules: "이 세계의 힘은 마나야. 쓸수록 수명이 깎여..."
- seeds: "이 세계엔 세 세력이 있어. 서로 견제하면서..."
- heroArc: "주인공은 버림받은 아이야. 복수가 아니라 인정받고 싶은 거지..."
- villainArc: "빌런은 비극적인 인물이야. 세계가 그를 괴물로 만들었어..."
- ultimateMystery: "이 이야기의 진짜 비밀은 말이야... 독자들 소름 끼칠 거야..."

각 JSON 블록 아래에 경고 추가:
```
※ message에는 JSON 구조나 데이터 나열 절대 금지. 친구에게 말하듯 자연스럽게.
```

#### 2. 마크다운 코드 블록 파싱 개선
Claude가 응답을 ` ```json ... ``` `로 감싸는 경우 처리:

```typescript
// 마크다운 코드 블록 제거
let cleanText = text;
const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
if (codeBlockMatch) {
  cleanText = codeBlockMatch[1].trim();
}

const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  const parsed = JSON.parse(jsonMatch[0]);
  return NextResponse.json({ ...parsed, isEpisode: false });
}
```

### 결과
- **대화창**: 작가의 자연스러운 말만 표시 ("이 세계의 진짜 비밀은 말이야...")
- **사이드 패널**: JSON 레이어 데이터 표시 (세계관, 캐릭터 정보 등)
- **하단 버튼**: [확정] [다시 제안해줘]

### 수정된 파일
1. `app/api/author-chat/route.ts`
   - 모든 레이어 프롬프트에 message 자연어 예시 추가
   - JSON 파싱 로직에 마크다운 코드 블록 제거 추가

### 커밋
- `e12e46d`: 레이어 제안 시 message 필드 자연어 규칙 강화
- `8be2ea1`: 마크다운 코드 블록 JSON 파싱 개선

---

## 집필 스타일 v2 강화 (2026-02-20 완료)

instruction-writing-style-v2.md 기반으로 write-episode 프롬프트 대폭 강화.

### 추가된 6가지 시스템

#### 1. 어그로 페르소나
```
첫 문장 = 어그로 (3가지 중 하나)
- 감각 충격: "피 냄새가 났다."
- 상황 충격: "죽었다. 아니, 죽어야 했다."
- 의문 유발: "왜 하필 나였을까."

독백의 재치
- 자조적 유머: "운이 좋다고? 이게 운이면 난 신의 장난감이다."
- 날카로운 관찰: "저 눈. 거짓말쟁이 눈이다."
- 냉정한 계산: "3명. 내 오른쪽이 빠르다. 먼저."

정보 전달의 재치
나쁜 예: "이 세계는 마나를 기반으로 한 힘의 체계가 있었다."
좋은 예: "그가 손을 펴자, 푸른 빛이 일렁였다. 마나. 이 세계의 전부."
```

#### 2. 독백 톤 5가지 돌려쓰기
```typescript
type MonologueTone = '자조' | '관찰' | '냉정' | '감각' | '메타';
```
- 자조: 자기비하 유머, 쓴웃음
- 관찰: 타인/상황 분석, 날카로운 시선
- 냉정: 감정 배제, 계산적 판단
- 감각: 오감 중심, 몸의 반응
- 메타: 상황의 아이러니 인식

**규칙**: 같은 톤 2화 연속 금지. Episode 타입에 `monologueTone` 필드 추가.

#### 3. 빌드업 구조
- **한 화 완결 금지**: 매 화 "미완의 긴장"으로 끝남
- **긴장 3겹 쌓기**:
  - 즉각 긴장: 지금 당장의 위협/궁금증
  - 중기 긴장: 이 아크에서 해결될 문제
  - 장기 긴장: 시리즈 전체 미스터리
- **정보 한 꺼풀씩**: 새 정보 = 새 궁금증

#### 4. 구간별 속도 조절 (100화 기준)
| 구간 | 속도 | 설명 |
|------|------|------|
| 1~10화 | 빠르게 | 한 장면에 머물지 마라. 설명 최소화 |
| 11~50화 | 깊게 | 감정/관계/갈등 파고들기. 밀도 높이기 |
| 51화~ | 폭풍 | 사건 몰아침. 쉴 틈 없이 |

#### 5. 연독 장치
**클리프행어 7유형 돌려쓰기**:
1. 위기 직전: "그 순간, 문이 열렸다."
2. 비밀 폭로: "그녀의 이름은 진짜가 아니었다."
3. 선택 강요: "죽이거나, 죽거나."
4. 예상 뒤집기: "하지만 그는 웃고 있었다."
5. 능력 각성 힌트: "손끝에서 뭔가가 일렁였다."
6. 과거 연결: "10년 전, 바로 이 자리였다."
7. 인물 등장: "그리고 그가 나타났다."

**3중 훅 시스템**:
- 오프닝 훅 (첫 3줄): 독자를 잡는다
- 미드포인트 훅 (50% 지점): 새 긴장/반전
- 클로징 훅 (마지막 2줄): 다음 화 클릭

**기타**:
- 떡밥 순환: 3~5화마다 기존 떡밥 언급/진전
- 5화 미니 아크: 매 5화를 작은 서사로

#### 6. 장면 전환 규칙
- **감정 브릿지**: 분노로 끝 → 그 분노 여파로 시작
- **시점 3줄 규칙**: 첫 3줄에 (누가/어디서/언제)
- **시간 앵커**: "3일 후", "그날 밤" 등
- **빈도 제한**: 한 화 최대 4회 전환

### 수정된 파일
1. `app/api/write-episode/route.ts`
   - 시스템 프롬프트에 6가지 시스템 추가
   - 화수 기반 동적 가이드 (속도/톤/클리프행어)
   - monologueTone 파싱 및 반환
   - 마크다운 코드 블록 제거 로직 추가

2. `lib/types/index.ts`
   - `MonologueTone` 타입 추가
   - `Episode.monologueTone` 필드 추가

### 마크다운 코드 블록 파싱 수정
Claude가 응답을 ` ```json ... ``` `로 감싸는 경우 처리:
```typescript
// 마크다운 코드 블록 제거
let cleanText = text;
const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
if (codeBlockMatch) {
  cleanText = codeBlockMatch[1].trim();
}
```
이 로직은 `author-chat`과 `write-episode` 두 API에 모두 적용됨.

### 커밋
- `6c66cb1`: write-episode 프롬프트 v2 강화
- `3f0fda9`: write-episode 마크다운 코드 블록 파싱 수정

---

## 100화 일관성 유지 메모리 시스템 (2026-02-20 완료)

100화 이상의 장편 웹소설에서 설정 일관성을 유지하기 위한 3-tier 메모리 시스템.

### 핵심 구조

#### 3-Tier 메모리 아키텍처
```
Tier 1: World Bible (~2,000 토큰)
  └─ 매 프롬프트에 항상 포함
  └─ 세계관 요약, 규칙, 캐릭터 핵심, 세력, 떡밥 상태

Tier 2: Episode Log (~300 토큰/화)
  └─ 매 화 종료 시 자동 생성 (Haiku)
  └─ 장면, 캐릭터 변화, 관계 변화, 떡밥 활동

Tier 3: Active Context (동적 조합)
  └─ 집필 시점에 자동 조립
  └─ World Bible + 최근 3화 Log + 마지막 500자 + 떡밥 경고
```

### 새 타입 (`lib/types/index.ts`)

```typescript
// World Bible - 압축된 세계관 (~2,000 토큰)
interface WorldBible {
  worldSummary: string;           // 한 줄 세계관
  rules: {
    powerSystem: string;          // 힘의 체계
    magicTypes?: string;          // 마법 유형
    socialStructure: string;      // 사회 구조
    keyHistory: string;           // 핵심 역사
    contradiction?: string;       // 세계 모순
  };
  characters: {
    [name: string]: {
      core: string;               // 핵심 정체성
      desire: string;             // 욕망
      deficiency?: string;        // 결핍
      weakness: string;           // 약점
      currentState: string;       // 현재 상태
    };
  };
  factions: string;               // 세력 관계
  breadcrumbs: {
    [name: string]: {
      truth: string;              // 떡밥의 진실
      status: 'hidden' | 'hinted' | 'suspected' | 'revealed';
      lastMentionedEp: number;
      plannedRevealEp?: number;
    };
  };
  prophecy?: string;              // 예언
  legends?: string[];             // 전설
  generatedAt: string;
  lastUpdatedAt: string;
  tokenCount?: number;
}

// Episode Log - 화별 요약 (~300 토큰)
interface EpisodeLog {
  episodeNumber: number;
  summary: string;                // 핵심 요약
  scenes: {
    location: string;
    characters: string[];
    event: string;
  }[];
  characterChanges: { [name: string]: string };
  relationshipChanges: {
    who: string;
    withWhom: string;
    change: string;
  }[];
  breadcrumbActivity: {
    advanced: string[];           // 진전된 떡밥
    newlyPlanted: string[];       // 새로 심은 떡밥
    hintGiven: string[];          // 힌트 준 떡밥
  };
  cliffhangerType: CliffhangerType;
  cliffhangerContent: string;
  unresolvedTensions: string[];
  dominantMonologueTone: MonologueTone;
  miniArcPosition: number;        // 5화 미니아크 내 위치
  buildupPhase: 'early' | 'middle' | 'late';
  generatedAt: string;
}

// Active Context - 집필 시 조립
interface ActiveContext {
  worldBible: WorldBible;
  recentLogs: EpisodeLog[];       // 최근 3화
  previousEnding: string;         // 마지막 500자
  activeBreadcrumbs: {
    name: string;
    status: 'hidden' | 'hinted' | 'suspected';
    lastMentioned: number;
    nextAction?: string;
  }[];
  unresolvedTensions: string[];
  characterStates: { [name: string]: string };
  episodeMeta: { ... };
  feedbackGuide: string[];
}

// Fact Check Result - 모순 검출
interface FactCheckResult {
  episodeNumber: number;
  hasContradictions: boolean;
  contradictions: FactCheckContradiction[];
  overallSeverity: 'none' | 'minor' | 'major' | 'critical';
  shouldRewrite: boolean;
  checkedAt: string;
}

// Breadcrumb Warning - 떡밥 경고
interface BreadcrumbWarning {
  breadcrumbName: string;
  warningType: 'forgotten' | 'too_long_hidden' | 'delayed' | 'overdue';
  lastMentionedEp: number;
  currentEp: number;
  plannedRevealEp?: number;
  message: string;
  suggestedAction: string;
}
```

### 새 API

#### `/api/generate-world-bible` (POST)
- 레이어 1~6을 World Bible로 압축
- Haiku 사용, ~2,000 토큰 목표
- 프로젝트 시작 시 1회 생성

#### `/api/generate-episode-log` (POST)
- 에피소드 완료 후 자동 생성
- Haiku 사용, ~300 토큰
- 장면, 변화, 떡밥 활동 추출

#### `/api/fact-check` (POST)
- World Bible vs 새 에피소드 비교
- 5가지 검출 대상:
  1. 캐릭터 설정 오류
  2. 세계관 설정 오류
  3. 떡밥 누설 오류
  4. 사망자 부활
  5. 시간축 오류
- 심각도: minor / major / critical

### 유틸리티 함수

#### `lib/utils/active-context.ts`
```typescript
// Active Context 조립
buildActiveContext(params): ActiveContext

// 프롬프트 문자열로 변환
activeContextToPrompt(context): string

// 최근 N화 로그 가져오기
getRecentLogs(logs, currentEp, count): EpisodeLog[]

// 이전 화 마지막 500자
getPreviousEnding(episodes, currentEp): string

// 활성 떡밥 (revealed 제외)
getActiveBreadcrumbs(worldBible, currentEp): ActiveBreadcrumb[]
```

#### `lib/utils/breadcrumb-tracker.ts`
```typescript
// 떡밥 경고 생성
trackBreadcrumbs(breadcrumbs, currentEp): BreadcrumbWarning[]

// 경고 기준:
// - forgotten: 10화 이상 방치
// - too_long_hidden: 40화 넘도록 hidden
// - delayed: 예정 시점 5화 이상 초과
// - overdue: 예정 시점 초과 (delayed 미만)

// 경고 → 지시문 변환
generateBreadcrumbInstructions(warnings): string[]

// 떡밥 상태 요약
summarizeBreadcrumbStatus(breadcrumbs): Summary

// Episode Log로 World Bible 업데이트
updateBreadcrumbsFromLog(worldBible, activity, currentEp): WorldBible

// 대시보드 데이터
getBreadcrumbDashboardData(worldBible, currentEp): DashboardData
```

### 스토어 확장 (`lib/store/project-store.ts`)

```typescript
// 새 액션
setWorldBible: (worldBible: WorldBible) => void;
updateWorldBible: (updates: Partial<WorldBible>) => void;
addEpisodeLog: (log: EpisodeLog) => void;
updateEpisodeLog: (episodeNumber: number, updates: Partial<EpisodeLog>) => void;
```

### Supabase 스키마 변경

```sql
ALTER TABLE projects ADD COLUMN world_bible jsonb;
ALTER TABLE projects ADD COLUMN episode_logs jsonb DEFAULT '[]';
```

### 집필 API 통합 (`app/api/write-episode/route.ts`)

- `activeContext` 파라미터 추가
- `activeContextToPrompt()` 호출하여 프롬프트에 포함
- World Bible + 최근 3화 + 떡밥 경고가 자동 주입

### 프로젝트 페이지 통합 (`app/projects/[id]/page.tsx`)

- 시뮬레이션 시작 시 World Bible 자동 생성
- `generateWorldBibleAndHistory()` 함수로 통합

### 데이터 흐름

```
1. 프로젝트 시작 → World Bible 생성 (1회)
   └─ layers 1-6 → Haiku 압축 → ~2,000 토큰

2. 매 화 집필
   └─ buildActiveContext() 호출
   └─ World Bible + 최근 3화 Log + 떡밥 경고 조립
   └─ activeContextToPrompt() → 프롬프트에 주입

3. 매 화 완료
   └─ /api/generate-episode-log 호출
   └─ Episode Log 저장 (Supabase + localStorage)
   └─ 떡밥 상태 업데이트

4. Fact Check (선택)
   └─ /api/fact-check 호출
   └─ 모순 발견 시 경고 표시
```

### 수정된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `lib/types/index.ts` | WorldBible, EpisodeLog, ActiveContext, FactCheck 타입 추가 |
| `lib/supabase/types.ts` | world_bible, episode_logs 필드 추가 |
| `lib/supabase/db.ts` | 새 필드 저장/로드 로직 |
| `lib/store/project-store.ts` | setWorldBible, addEpisodeLog 등 액션 |
| `lib/utils/active-context.ts` | 신규 - Active Context 조립 |
| `lib/utils/breadcrumb-tracker.ts` | 신규 - 떡밥 추적/경고 |
| `app/api/generate-world-bible/route.ts` | 신규 - World Bible 생성 |
| `app/api/generate-episode-log/route.ts` | 신규 - Episode Log 생성 |
| `app/api/fact-check/route.ts` | 신규 - 모순 검출 |
| `app/api/write-episode/route.ts` | Active Context 주입 |
| `app/projects/[id]/page.tsx` | World Bible 자동 생성 |

### 빌드 성공 확인 (2026-02-20)

---

## 일관성 엔진 Phase 2 (2026-02-20 완료)

Phase 1의 기반 위에 UI 통합 및 자동화 기능 추가.

### 구현 내용

#### 1. Episode Log 자동 생성 통합
- 에피소드 작성 완료 시 자동으로 `/api/generate-episode-log` 호출
- `handlePostEpisodeCreation()` 함수로 통합 관리
- 로그 생성 후 `addEpisodeLog()` 호출하여 스토어에 저장

#### 2. 팩트 체커 UI 통합
- 에피소드 작성 완료 시 자동으로 `/api/fact-check` 호출
- `critical` 또는 `major` 모순 발견 시 모달 표시
- 모순 상세 정보 (필드, 세계관 값, 에피소드 값, 수정 제안)
- [수정 요청] / [무시하고 진행] 버튼

#### 3. 떡밥 경고 UI 통합
- `trackBreadcrumbs()` 호출하여 경고 생성
- 화면 우하단에 떡밥 경고 토스트 표시
- 경고 유형: 잊힌 떡밥(10화+), 너무 오래 숨김(40화+), 지연됨(예정+5화)

#### 4. 메타 지시 자동 계산
- `calculateEpisodeMeta()` 함수 (active-context.ts에 구현됨)
- 계산 항목:
  - `miniArcPosition`: 5화 미니아크 내 위치 (1~5)
  - `buildupPhase`: 빌드업 페이즈 (early/middle/late)
  - `forbiddenCliffhanger/Tone`: 직전 화에서 사용한 유형 (반복 금지)
  - `suggestedCliffhanger/Tone`: 추천 유형
  - `breadcrumbInstructions`: 떡밥 관련 지시

#### 5. Active Context 프롬프트 주입
- write-episode 호출 시 `buildActiveContext()` 호출
- World Bible + 최근 3화 로그 + 메타 지시가 프롬프트에 포함
- `activeContextToPrompt()` 로 문자열 변환

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `app/projects/[id]/page.tsx` | `handlePostEpisodeCreation()` 추가, 팩트체크 모달, 떡밥 경고 토스트, Active Context 전달 |
| `lib/utils/active-context.ts` | `calculateEpisodeMeta()` 구현 (Phase 1에서 완료) |
| `lib/utils/breadcrumb-tracker.ts` | 떡밥 추적/경고 유틸리티 (Phase 1에서 완료) |

### 자동화 흐름

```
에피소드 N화 집필 요청
  ↓
Active Context 조립 (buildActiveContext)
  - World Bible 로드
  - 직전 3화 로그
  - 메타 지시 계산 (클리프행어/톤 추천, 금지 유형)
  - 떡밥 경고 지시
  ↓
write-episode API 호출 (activeContext 포함)
  ↓
집필 완료
  ↓
handlePostEpisodeCreation() 호출:
  1. Episode Log 자동 생성 → addEpisodeLog()
  2. Fact Check 실행 → 모순 있으면 모달 표시
  3. 떡밥 경고 업데이트 → 토스트 표시
  ↓
다음 화 준비 완료
```

### 상태 변수 추가

```typescript
// app/projects/[id]/page.tsx
const [factCheckResult, setFactCheckResult] = useState<FactCheckResult | null>(null);
const [breadcrumbWarnings, setBreadcrumbWarnings] = useState<BreadcrumbWarning[]>([]);
const [showFactCheckModal, setShowFactCheckModal] = useState(false);
```

### 빌드 성공 확인 (2026-02-20)

---

## 일관성 엔진 Phase 3 (2026-02-20 완료)

고급 추적 및 분석 시스템 구현.

### 1. 캐릭터 일관성 추적 (`lib/utils/character-consistency.ts`)

**핵심 기능:**
- 캐릭터의 core 성격과 에피소드 행동 비교
- 급격한 성격 변화 감지 (연속 화에서 상반된 변화)
- 핵심 성격과의 모순 감지

**타입:**
```typescript
interface CharacterConsistencyWarning {
  characterName: string;
  warningType: 'sudden_change' | 'contradicts_core' | 'out_of_character';
  severity: 'minor' | 'major' | 'critical';
  episodeNumber: number;
  description: string;
  coreValue: string;
  episodeValue: string;
  suggestion: string;
}

interface CharacterTrajectory {
  characterName: string;
  core: string;
  desire: string;
  weakness: string;
  stateHistory: { episodeNumber: number; state: string; change?: string }[];
  currentState: string;
  consistencyScore: number;  // 0-100
  warnings: CharacterConsistencyWarning[];
}
```

**함수:**
- `trackCharacterConsistency()`: 경고 생성
- `buildCharacterTrajectory()`: 캐릭터별 궤적 생성
- `getCharacterConsistencyDashboard()`: 대시보드 데이터

### 2. 관계 변화 그래프 (`lib/utils/relationship-tracker.ts`)

**핵심 기능:**
- EpisodeLog의 relationshipChanges 기반 관계망 구축
- 관계 수치화 (-100 ~ +100)
- 트렌드 분석 (improving/declining/stable/volatile)

**타입:**
```typescript
interface RelationshipEdge {
  source: string;
  target: string;
  currentValue: number;  // -100 ~ +100
  history: { episodeNumber: number; change: string; delta: number }[];
  label?: string;  // 친밀/중립/갈등/적대 등
}

interface RelationshipTrend {
  pair: string;
  trend: 'improving' | 'declining' | 'stable' | 'volatile';
  recentChanges: number[];
  prediction: string;
}
```

**함수:**
- `buildRelationshipGraph()`: 관계 그래프 빌드
- `analyzeRelationshipTrends()`: 트렌드 분석
- `getRelationshipSummary()`: 요약 데이터
- `getCharacterRelationships()`: 특정 캐릭터의 관계망

### 3. 감정 로드맵 비교 (`lib/utils/emotion-roadmap.ts`)

**핵심 기능:**
- 100화 기준 감정 로드맵 템플릿 생성
- 에피소드 로그에서 실제 감정 추론
- 계획 vs 실제 비교 및 이탈 감지

**타입:**
```typescript
type EmotionType = 'excitement' | 'tension' | 'relief' | 'sadness' | 'anger' | 'joy' | 'fear' | 'curiosity' | 'satisfaction' | 'frustration';

interface EmotionComparison {
  episodeNumber: number;
  planned: { emotion: EmotionType; intensity: number } | null;
  actual: { emotion: EmotionType; intensity: number } | null;
  deviation: number;
  status: 'on_track' | 'minor_deviation' | 'major_deviation' | 'off_track';
  suggestion?: string;
}
```

**함수:**
- `generateDefaultEmotionRoadmap()`: 100화 기본 로드맵 생성
- `extractActualEmotionProgress()`: 실제 감정 진행 추출
- `compareEmotionProgress()`: 계획 vs 실제 비교
- `getEmotionRoadmapDashboard()`: 대시보드 데이터
- `getEmotionCurveData()`: 시각화용 데이터

### 타입 추가 (`lib/types/index.ts`)

```typescript
export type CliffhangerType = 'crisis' | 'revelation' | 'choice' | 'reversal' | 'awakening' | 'past_connection' | 'character_entrance';
```

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `lib/utils/character-consistency.ts` | 신규 - 캐릭터 일관성 추적 |
| `lib/utils/relationship-tracker.ts` | 신규 - 관계 변화 그래프 |
| `lib/utils/emotion-roadmap.ts` | 신규 - 감정 로드맵 비교 |
| `lib/types/index.ts` | CliffhangerType 타입 추가 |

### 일관성 엔진 전체 완료 (Phase 1-3)

---

## 자가진화 피드백 루프 시스템 (2026-02-20 완료)

환님의 피드백과 직접 편집을 분석하여 문체 규칙을 학습하고, 다음 화 집필 시 자동으로 프롬프트에 반영하는 시스템.

### 핵심 구조

#### 5가지 핵심 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| 피드백 분석 엔진 | 피드백 자동 분류 (style/character/pacing/tone/structure/dialogue/description) |
| 직접 편집 비교 분석 | AI 원본 vs 환님 수정본 diff → 패턴 추출 |
| Writing Memory | 스타일 규칙, 편집 패턴, 품질 추적, 공통 실수 저장 |
| 프롬프트 자동 주입 | 학습된 규칙을 집필 프롬프트에 포함 (500 토큰 제한) |
| 품질 추적 | 에피소드별 채택률, 수정량 표시 |

### 타입 정의 (`lib/types/index.ts`)

```typescript
export type FeedbackCategory = 'style' | 'character' | 'pacing' | 'tone' | 'structure' | 'dialogue' | 'description';

export interface StyleRule {
  id: string;
  category: FeedbackCategory;
  rule: string;
  source: 'feedback' | 'edit_analysis';
  confidence: number;  // 0-100 (반복될수록 증가)
  examples?: string[];
  counterExamples?: string[];
  createdAt: string;
  lastAppliedAt?: string;
}

export interface EditPattern {
  id: string;
  patternType: 'shorten' | 'expand' | 'replace' | 'delete' | 'restructure';
  description: string;
  originalPattern: string;
  correctedPattern: string;
  frequency: number;
  examples: { original: string; edited: string; episodeNumber: number }[];
  createdAt: string;
}

export interface EpisodeQuality {
  episodeNumber: number;
  originalCharCount: number;
  finalCharCount: number;
  editAmount: number;  // 0-100 (레벤슈타인 거리 기반)
  adoptedDirectly: boolean;  // 수정 없이 채택
  feedbackCount: number;
  revisionCount: number;
  status: 'draft' | 'revised' | 'final';
  createdAt: string;
}

export interface CommonMistake {
  id: string;
  category: FeedbackCategory;
  description: string;
  frequency: number;
  lastOccurred: number;  // 에피소드 번호
  severity: 'minor' | 'major' | 'critical';
  avoidanceRule: string;
  createdAt: string;
}

export interface WritingMemory {
  styleRules: StyleRule[];
  editPatterns: EditPattern[];
  qualityTracker: EpisodeQuality[];
  commonMistakes: CommonMistake[];
  lastUpdatedAt: string;
  totalEpisodes: number;
  averageEditAmount: number;  // 0-100
  directAdoptionRate: number;  // 0-100
}
```

### 유틸리티 함수 (`lib/utils/writing-memory.ts`)

```typescript
// 빈 Writing Memory 생성
createEmptyWritingMemory(): WritingMemory

// 피드백 처리 → 스타일 규칙 추출
processFeedback(memory, feedback): WritingMemory

// 피드백 카테고리 분류 (키워드 기반)
classifyFeedbackCategory(content): FeedbackCategory

// 직접 편집 분석 → 패턴 추출
analyzeEdit(original, edited, episodeNumber): { patterns: EditPattern[], similarity: number }

// 편집 패턴을 Writing Memory에 통합
integrateEditPatterns(memory, patterns): WritingMemory

// 품질 추적 업데이트
updateQualityTracker(memory, quality): WritingMemory

// 집필 프롬프트 생성 (500토큰 제한)
buildWritingMemoryPrompt(memory): string

// 통계 요약
getWritingMemoryStats(memory): Stats
```

### 피드백 분류 규칙

| 카테고리 | 키워드 예시 |
|---------|------------|
| style | 문체, 표현, 묘사, 서술, 문장 |
| tone | 톤, 분위기, 무드, 밝다, 어둡다 |
| pacing | 속도, 빠르다, 느리다, 페이스, 템포 |
| character | 캐릭터, 인물, 성격, 행동, 말투 |
| dialogue | 대사, 대화, 말, 반말, 존댓말 |
| structure | 구조, 전개, 흐름, 순서, 배치 |
| description | 설명, 지문, 배경, 장면 |

### 신뢰도 시스템

- **초기 신뢰도**: 25%
- **2회 반복**: 50%
- **3회 반복**: 75%
- **4회 이상**: 100%
- **프롬프트 포함 기준**: 신뢰도 50% 이상

### 프롬프트 주입 형식

```
=== 학습된 문체 규칙 ===

[필수 규칙 - 반드시 지킬 것]
- (style) 대사를 더 짧게 쓸 것 [신뢰도: 75%]
- (tone) 어두운 분위기 유지 [신뢰도: 100%]

[권장 규칙]
- (pacing) 장면 전환을 더 빠르게 [신뢰도: 50%]

[피해야 할 실수]
- (dialogue) 핑퐁 대화 패턴: "A 한줄 B 한줄 반복"은 피하세요

[편집 패턴 학습]
- 긴 설명 → 짧은 감각 묘사로 교체하는 경향 (빈도: 5회)

[품질 통계]
- 직접 채택률: 60%
- 평균 수정량: 15%
- 최근 추세: 개선 중

=== 학습된 문체 규칙 끝 ===
```

### 스토어 확장 (`lib/store/project-store.ts`)

```typescript
// 새 액션
setWritingMemory: (memory: WritingMemory) => void;
updateWritingMemory: (updates: Partial<WritingMemory>) => void;
getWritingMemory: () => WritingMemory | undefined;
```

### 집필 API 통합 (`app/api/write-episode/route.ts`)

- `writingMemory` 파라미터 추가
- `buildWritingMemoryPrompt()` 호출
- 결과를 시스템 프롬프트에 주입

### 프로젝트 페이지 통합 (`app/projects/[id]/page.tsx`)

- **에피소드 채택 시 (`handleAdopt`)**:
  - 품질 추적 데이터 저장
  - 직접 편집이 있으면 패턴 분석
  - Writing Memory 업데이트

- **전체 피드백 시 (`handleFullFeedback`)**:
  - 피드백 분석 및 분류
  - 스타일 규칙 추출
  - Writing Memory 업데이트

### 품질 추적 UI (사이드 패널 원고 탭)

```
[품질 통계]
━━━━━━━━━━━━━━━━━━━━━
직접 채택률    ████████░░ 60%
평균 수정량    ██░░░░░░░░ 15%
학습된 규칙    5개 (3개 고신뢰도)
최근 추세      📈 개선 중
```

### Supabase 스키마 변경

```sql
ALTER TABLE projects ADD COLUMN writing_memory jsonb;
```

### 데이터 흐름

```
1. 에피소드 집필
   └─ writingMemory를 write-episode API에 전달
   └─ buildWritingMemoryPrompt() → 프롬프트에 주입

2. 환님 피드백/편집
   └─ processFeedback() → 스타일 규칙 추출
   └─ analyzeEdit() → 편집 패턴 추출
   └─ updateWritingMemory() → 스토어 + Supabase 저장

3. 에피소드 채택
   └─ updateQualityTracker() → 품질 데이터 기록
   └─ 직접 채택 / 수정 후 채택 구분

4. 다음 화 집필
   └─ 업데이트된 Writing Memory 자동 반영
   └─ 고신뢰도 규칙 우선 적용
```

### 수정된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `lib/types/index.ts` | WritingMemory 관련 타입 추가 |
| `lib/utils/writing-memory.ts` | 신규 - 핵심 유틸리티 |
| `lib/supabase/types.ts` | writing_memory 필드 추가 |
| `lib/supabase/db.ts` | writing_memory 저장/로드 |
| `lib/store/project-store.ts` | WritingMemory 액션 추가 |
| `app/api/write-episode/route.ts` | 프롬프트 주입 통합 |
| `app/projects/[id]/page.tsx` | handleAdopt, handleFullFeedback 수정 |

### 빌드 성공 확인 (2026-02-20)
