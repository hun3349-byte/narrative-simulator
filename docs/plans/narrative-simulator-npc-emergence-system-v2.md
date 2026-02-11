# NPC Emergence System V2 - 구현 계획서

## 개요
현재 시뮬레이션은 **미리 정의된 캐릭터만** 서사에 참여한다. NPC Emergence System은 시뮬레이션 도중 세계관에서 **자연 발생하는 NPC**를 생성하고, 주인공과 상호작용하며, 일부는 중요 인물로 성장하는 시스템.

## 현재 상태 (시작 전)
- 경험 레이어 V2 완료: CharacterSeed → Memory → EmergentProfile 파이프라인 작동
- SimulationEngine V2: seeds, memoryStacks, profiles 관리
- 캐릭터 간 교차 이벤트(`relatedCharacters`)는 있지만, 사전 정의된 캐릭터 ID만 참조
- NPC 개념 자체가 없음

## 핵심 컨셉

### NPC 생명주기
```
Mention → Encounter → Recurring → Significant → Core (optional)

1. Mention (언급): AI가 서사에서 이름 없이 언급 ("수상한 노인", "여관 주인")
2. Encounter (조우): 직접 상호작용 발생, 임시 프로필 생성
3. Recurring (반복): 2회 이상 등장, 정식 NPC로 등록
4. Significant (중요): 주인공의 서사에 영향을 줌, 관계 형성
5. Core (핵심, 선택): 사용자가 승격 → 주인공과 동급 시뮬레이션
```

### NPC 타입
```
NPCArchetype =
  | 'mentor'       // 스승/안내자
  | 'rival'        // 경쟁자
  | 'ally'         // 동맹
  | 'antagonist'   // 적대자
  | 'trickster'    // 트릭스터
  | 'guardian'     // 관문 수호자
  | 'herald'       // 전령/촉발자
  | 'shadow'       // 그림자/어두운 면
  | 'shapeshifter' // 변신자/배신자 가능성
  | 'merchant'     // 상인/거래자
  | 'informant'    // 정보원
  | 'civilian'     // 일반인
```

## 타입 정의

### `lib/types/index.ts` 에 추가
```typescript
export type NPCLifecycle = 'mention' | 'encounter' | 'recurring' | 'significant' | 'core';

export type NPCArchetype =
  | 'mentor' | 'rival' | 'ally' | 'antagonist' | 'trickster'
  | 'guardian' | 'herald' | 'shadow' | 'shapeshifter'
  | 'merchant' | 'informant' | 'civilian';

export interface NPC {
  id: string;                        // 자동 생성 ID
  lifecycle: NPCLifecycle;
  archetype: NPCArchetype;

  // 기본 정보 (Encounter 이상에서 존재)
  name?: string;                     // 이름 (없을 수 있음)
  alias?: string;                    // 별명/묘사 ("수상한 노인")
  description: string;               // 외형/인상 설명
  faction?: string;                  // 소속 세력

  // 등장 이력
  appearances: NPCAppearance[];
  firstSeenYear: number;
  lastSeenYear: number;
  totalAppearances: number;

  // 관계
  relatedCharacters: {
    characterId: string;             // 주인공 ID
    relationship: string;            // 관계 설명
    sentiment: number;               // -100(적대) ~ +100(우호)
  }[];

  // Significant 이상에서 존재
  motivation?: string;
  secretGoal?: string;
  abilities?: string[];

  // Core로 승격 시 생성
  seed?: CharacterSeed;              // 기존 경험 레이어 연동
}

export interface NPCAppearance {
  year: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  eventId: string;                   // 관련 NarrativeEvent ID
  role: string;                      // 해당 이벤트에서의 역할
  interaction: string;               // 상호작용 요약
}

export interface NPCPool {
  npcs: NPC[];
  archetypeDistribution: Record<NPCArchetype, number>;  // 현재 분포
  maxActive: number;                 // 활성 NPC 제한 (메모리 관리)
}
```

## 구현 계획

### Phase 1: NPC 탐지 엔진
**`lib/agents/npc-detector.ts`** (신규):
- `NPCDetector` 클래스
  - `detectFromEvent(event: NarrativeEvent)` → 이벤트 텍스트에서 NPC 언급 탐지
    - 이름 패턴 감지 (한국식 이름: 3글자 한자/한글)
    - 역할 키워드 감지 ("노인", "상인", "도적", "스승" 등)
    - `relatedCharacters`에 없는 새로운 인물 감지
  - `matchExisting(description, npcPool)` → 기존 NPC와 매칭 (같은 인물인지)
  - `createNPC(description, event, archetype)` → NPC 생성
  - `updateLifecycle(npc)` → 등장 횟수/영향도에 따라 lifecycle 자동 전환

### Phase 2: NPC 프롬프트 통합
**`lib/prompts/simulation-prompt-v2.ts`** 수정:
- 프롬프트에 "[등장 NPC 풀]" 섹션 추가:
  ```
  [등장 가능 NPC]
  - 수상한 노인 (mentor): 3년전 금서고 근처에서 목격. 서진에게 의미심장한 말을 남김.
  - 흑의 검객 (rival): 작년 가을 서진과 검을 교차. 정체 불명.
  이 NPC들을 자연스럽게 재등장시키거나, 새로운 인물을 소개할 수 있음.
  새 NPC 등장 시 "npcInteractions" 필드에 기록.
  ```
- AI 응답 포맷에 `npcInteractions[]` 추가:
  ```json
  {
    "events": [...],
    "yearEndStatus": "...",
    "memories": [...],
    "npcInteractions": [
      {
        "eventIndex": 0,
        "npcAlias": "수상한 노인",
        "npcName": null,
        "role": "mentor",
        "interaction": "서진에게 묵서검법의 비밀을 암시",
        "isNew": false
      }
    ]
  }
  ```

### Phase 3: NPC Store
**`lib/store/simulation-store.ts`** 수정:
- 상태 추가: `npcPool: NPCPool`
- 액션 추가: `addNPC()`, `updateNPC()`, `promoteNPC()`, `removeNPC()`
- `partialize`에 npcPool 추가

### Phase 4: SimulationEngine NPC 연동
**`lib/agents/simulation-engine.ts`** 수정:
- V2 메서드들에서 이벤트 생성 후 `NPCDetector.detectFromEvent()` 호출
- 기존 NPC 풀을 프롬프트에 주입
- AI 응답의 `npcInteractions` 파싱 → NPC 업데이트
- NPC lifecycle 자동 전환 로직

### Phase 5: NPC UI
**`components/characters/NPCPanel.tsx`** (신규):
- NPC 카드 (lifecycle별 시각적 구분)
  - mention: 흐릿한 실루엣
  - encounter: 희미한 아웃라인
  - recurring: 일반 카드
  - significant: 강조 카드
  - core: 주인공급 카드
- "Core로 승격" 버튼 (significant NPC에만)

**`components/characters/NPCList.tsx`** (신규):
- NPC 목록 사이드패널
- 필터: lifecycle 단계별, archetype별
- 정렬: 최근 등장순, 등장 횟수순, 관계 깊이순

**`components/timeline/TimelineView.tsx`** 수정:
- NPC 등장 이벤트에 NPC 아이콘 표시
- NPC 관련 이벤트 클릭 시 NPC 정보 표시

**`app/page.tsx`** 수정:
- 대시보드에 "활성 NPC" 위젯 추가
- NPC 수 표시 (lifecycle별)

### Phase 6: NPC → Core 승격 파이프라인
- significant NPC를 Core로 승격 시:
  1. NPC 데이터에서 `CharacterSeed` 자동 생성
  2. `seeds[]`에 추가, `memoryStacks`에 초기 기억 생성 (기존 등장 이력에서)
  3. 이후 시뮬레이션에서 주인공과 동급으로 처리
  4. 경험 레이어 V2 파이프라인 완전 적용

### Phase 7: 관계도 통합
**`components/relationships/RelationshipGraph.tsx`** 수정:
- NPC 노드 추가 (lifecycle에 따라 크기/투명도 조절)
- 주인공 ↔ NPC 관계선 표시
- NPC ↔ NPC 관계도 표시 (같은 이벤트 등장 → 관계 추정)

## API 변경

### `app/api/simulate/route.ts`
- 요청 body에 `npcPool` 추가
- 응답 `final_state`에 `npcPool` 포함

### `SimulationResponseV2` 확장
```typescript
export interface SimulationResponseV3 extends SimulationResponseV2 {
  npcInteractions?: {
    eventIndex: number;
    npcAlias: string;
    npcName?: string;
    role: NPCArchetype;
    interaction: string;
    isNew: boolean;
  }[];
}
```

## 변경하지 않는 파일들
- `lib/store/editor-store.ts`, `lib/store/timeline-store.ts`
- `lib/utils/export-*.ts`
- `components/editor/*`
- `components/export/ExportModal.tsx`
- `app/api/export/route.ts`

## 의존성
- 경험 레이어 (V2) 완료 필수 ✅
- Narrative Grammar Engine 선택 (있으면 NPC의 서사적 역할이 더 정교해짐)

## 핵심 원칙
1. NPC는 **자연 발생**. 사용자가 미리 정의하지 않음.
2. AI가 생성한 서사에서 **탐지**하고, 재등장 시 **풀에서 제공**.
3. 메모리 관리: `maxActive` 제한으로 NPC 풀 크기 제어 (기본 20).
4. lifecycle 전환은 **자동** (등장 횟수/영향도 기반). Core 승격만 **수동** (사용자 결정).
5. NPC도 경험 레이어 파이프라인에 탑승 가능 (Core 승격 시).

## 예상 NPC 생성 시나리오 (서문대륙)
```
Year 0: 서진이 금서고에서 발견됨 → "금서고 노인" (mentor, mention)
Year 2: 서진이 노인을 다시 만남 → "금서고 노인" (mentor, encounter)
Year 5: 노인이 서진에게 묵서검법 비밀 전수 → "금서고 노인" (mentor, recurring)
         이름 밝혀짐: "천묵선인" → name 업데이트
Year 8: 천묵선인이 묵혈맹에 납치 → "천묵선인" (mentor, significant)
Year 12: 사용자가 Core로 승격 → CharacterSeed 생성 → 독립 시뮬레이션 시작
```
