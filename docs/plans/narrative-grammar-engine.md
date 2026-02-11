# Narrative Grammar Engine - 구현 계획서

## 개요
AI 생성 서사에 **서사 문법(Narrative Grammar)** 을 적용하는 엔진. 현재 AI가 자유롭게 이벤트를 생성하지만, 이야기 구조(3막 구성, 영웅의 여정, 기승전결 등)를 강제/유도하여 더 완성도 높은 서사를 만든다.

## 현재 상태 (시작 전)
- 경험 레이어 V2까지 완료
- SimulationEngine이 연도별 이벤트 생성 (V1: Character 기반, V2: Seed→Memory 기반)
- 프롬프트에 "뻔한 전개 금지, 반전 필수" 같은 규칙만 존재
- 서사 구조를 제어하는 메커니즘 없음

## 핵심 컨셉

### 서사 문법 (Narrative Grammar)
```
Story = Setup → Confrontation → Resolution
Act   = Inciting_Incident → Rising_Action → Climax → Falling_Action → Denouement
Beat  = Desire → Obstacle → Decision → Consequence
```

### 서사 아크 (Narrative Arc)
각 캐릭터는 개별 아크를 가짐. 전체 이야기도 마스터 아크를 가짐.
```
CharacterArc = {
  archetype: '영웅의 여정' | '몰락' | '변신' | '여행과 귀환' | '비극' | ...
  currentPhase: number   // 현재 단계 (0~N)
  phases: Phase[]        // 단계 정의
  tension: number        // 현재 긴장도 (0~100)
  fulfillment: number    // 아크 완성도 (0~100)
}

Phase = {
  name: string           // "일상 세계", "모험의 소명", "시련" 등
  yearRange: [number, number]
  requiredBeats: Beat[]  // 이 단계에서 반드시 발생해야 할 비트
  optionalBeats: Beat[]
  tensionTarget: number  // 목표 긴장도
}
```

### 비트 (Beat)
서사의 최소 단위. 이벤트보다 상위 개념.
```
Beat = {
  type: 'inciting' | 'complication' | 'reversal' | 'crisis' | 'climax' | 'resolution'
  fulfilled: boolean
  fulfillmentEvent?: string  // 이벤트 ID
  description: string
}
```

## 구현 계획

### Phase 1: 타입 정의
**`lib/types/index.ts`** 에 추가:
- `NarrativeArcType` (영웅의여정, 몰락, 변신, 비극, ...)
- `NarrativePhase` { name, yearRange, requiredBeats, tensionTarget }
- `NarrativeBeat` { type, fulfilled, fulfillmentEvent, description }
- `CharacterArc` { archetype, currentPhase, phases, tension, fulfillment }
- `MasterArc` { acts[], currentAct, overallTension, keyBeats[] }
- `NarrativeGrammarConfig` { arcType, actCount, tensionCurve }

### Phase 2: 아크 템플릿 라이브러리
**`lib/grammar/arc-templates.ts`** (신규):
- `HEROES_JOURNEY_TEMPLATE`: 12단계 (일상→소명→거부→멘토→문턱→시련→동굴→시련극복→보상→귀환→부활→환수)
- `TRAGEDY_TEMPLATE`: 5막 비극 (소개→상승→절정→하강→파국)
- `TRANSFORMATION_TEMPLATE`: 변신 아크 (구체제→촉발→저항→수용→통합)
- `FALL_TEMPLATE`: 몰락 아크 (정상→유혹→타락→대가→파멸)

### Phase 3: Grammar Engine
**`lib/grammar/grammar-engine.ts`** (신규):
- `GrammarEngine` 클래스
  - `constructor(masterArc, characterArcs[])`
  - `getCurrentDirective(characterId, year)` → 현재 단계에서 프롬프트에 삽입할 서사 지시문
  - `evaluateEvent(event)` → 비트 이행 여부 판정
  - `advancePhase(characterId)` → 다음 단계로 전진
  - `getTensionGuidance(year)` → 목표 긴장도 대비 현재 상태 → "긴장 높여야 함" / "숨 돌릴 타이밍"
  - `getRequiredBeats(characterId, year)` → 아직 미이행 필수 비트 목록
  - `suggestCrossEvent(year)` → 캐릭터 간 교차 이벤트 추천

### Phase 4: 프롬프트 통합
**`lib/prompts/simulation-prompt-v2.ts`** 수정:
- `buildSimulationPromptV2()`에 `grammarDirective` 파라미터 추가
- 프롬프트에 "[서사 문법 지시]" 섹션 추가:
  ```
  [서사 문법 지시]
  현재 단계: {phase.name}
  목표 긴장도: {tensionTarget}/100 (현재: {currentTension}/100)
  필수 비트: {requiredBeats.map(b => b.description).join(', ')}
  이벤트 유형 가이드: {beatTypeGuidance}
  ```

### Phase 5: SimulationEngine 연동
**`lib/agents/simulation-engine.ts`** 수정:
- 생성자에 `grammarConfig?` 추가
- `GrammarEngine` 인스턴스 관리
- 매 연도 시뮬레이션 전 `getCurrentDirective()` 호출
- 매 이벤트 생성 후 `evaluateEvent()` 호출 → 비트 이행 추적
- `runFullSimulation()` 반환값에 `characterArcs` 추가

### Phase 6: Store + UI
- `simulation-store`에 `characterArcs`, `masterArc` 추가
- 대시보드에 "서사 아크 진행도" 위젯
- 타임라인에 아크 단계 구분선 표시
- `/create` 마법사에 "서사 구조 선택" 단계 추가 (Step 5/5)

### Phase 7: 텐션 커브 시각화
- `/stats` 페이지에 텐션 커브 그래프 추가
- X축: 연도, Y축: 긴장도
- 캐릭터별 개별 커브 + 마스터 커브 오버레이

## 변경하지 않는 파일들
- `lib/store/editor-store.ts`, `lib/store/timeline-store.ts`
- `lib/utils/export-*.ts`
- `components/editor/*`
- `components/export/ExportModal.tsx`
- `app/api/export/route.ts`

## 의존성
- 경험 레이어 (V2) 완료 필수 ✅
- 추가 npm 패키지: 없음 (자체 구현)

## 핵심 원칙
1. Grammar Engine은 **제안/유도**이지 **강제**가 아님. AI가 자연스럽게 따르도록 프롬프트에 반영.
2. 기존 V1/V2 파이프라인과 공존. grammarConfig 없으면 현재와 동일 동작.
3. 비트 이행 판정은 태그/키워드 기반 휴리스틱 (AI 호출 없이 로컬 판정).
