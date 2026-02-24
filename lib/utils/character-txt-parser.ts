/**
 * 캐릭터 TXT 파일 파서
 *
 * TXT 형식 예시:
 *
 * === 캐릭터: 김철수 ===
 * 역할: 검객
 * 위치: 왕도
 * 성격: 과묵하고 냉정하지만 내면은 따뜻하다
 * 숨겨진 동기: 아버지의 복수
 * 외모: 검은 머리, 날카로운 눈매, 180cm
 * 말투: 짧고 단호한 말투, 존댓말
 * 배경: 몰락한 검파의 후손. 어린 시절 가문이 멸문당하고 홀로 살아남았다.
 * 소속: 무소속
 * 비중: major
 * 관계: 주인공의 스승이자 조언자
 * 서사: 처음엔 냉정하지만 점차 제자에게 마음을 열어간다
 *
 * === 캐릭터: 이영희 ===
 * ...
 */

import { NPCSeedInfo } from '@/lib/types';

export interface ParsedCharacter {
  name: string;
  role: string;
  location: string;
  personality: string;
  hiddenMotivation?: string;
  appearance?: string;
  speechPattern?: string;
  backstory?: string;
  faction?: string;
  importance?: 'major' | 'supporting' | 'minor';
  relationships?: string;
  arc?: string;
}

export interface ParseResult {
  success: boolean;
  characters: ParsedCharacter[];
  errors: string[];
}

/**
 * TXT 파일 내용을 파싱하여 캐릭터 배열로 변환
 */
export function parseCharacterTxt(content: string): ParseResult {
  const characters: ParsedCharacter[] = [];
  const errors: string[] = [];

  // 캐릭터 블록 분리 (=== 캐릭터: ... === 패턴)
  const blocks = content.split(/===\s*캐릭터\s*[:：]\s*/i);

  // 첫 번째 블록은 헤더이므로 건너뛰기
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    try {
      const character = parseCharacterBlock(block, i);
      if (character) {
        characters.push(character);
      }
    } catch (e) {
      errors.push(`캐릭터 ${i} 파싱 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    }
  }

  // 기본 형식이 아닐 경우 줄 단위 파싱 시도
  if (characters.length === 0 && !content.includes('===')) {
    const simpleResult = parseSimpleFormat(content);
    characters.push(...simpleResult.characters);
    errors.push(...simpleResult.errors);
  }

  return {
    success: characters.length > 0,
    characters,
    errors,
  };
}

/**
 * 단일 캐릭터 블록 파싱
 */
function parseCharacterBlock(block: string, index: number): ParsedCharacter | null {
  const lines = block.split('\n');

  // 첫 줄에서 이름 추출 (=== 이후 부분)
  const firstLine = lines[0].trim();
  const nameMatch = firstLine.match(/^([^=]+)/);
  const name = nameMatch ? nameMatch[1].replace(/===.*$/, '').trim() : '';

  if (!name) {
    throw new Error('이름이 없습니다');
  }

  const character: ParsedCharacter = {
    name,
    role: '',
    location: '',
    personality: '',
  };

  // 나머지 줄에서 필드 추출
  let currentField = '';
  let currentValue = '';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 다음 캐릭터 시작이면 중단
    if (line.startsWith('===')) break;

    // 필드:값 형식 체크
    const fieldMatch = line.match(/^([가-힣a-zA-Z]+)\s*[:：]\s*(.*)$/);

    if (fieldMatch) {
      // 이전 필드 저장
      if (currentField && currentValue) {
        setCharacterField(character, currentField, currentValue.trim());
      }

      currentField = fieldMatch[1].toLowerCase();
      currentValue = fieldMatch[2];
    } else if (currentField) {
      // 이전 필드의 여러 줄 값
      currentValue += '\n' + line;
    }
  }

  // 마지막 필드 저장
  if (currentField && currentValue) {
    setCharacterField(character, currentField, currentValue.trim());
  }

  // 필수 필드 체크
  if (!character.role) {
    character.role = '미지정';
  }

  return character;
}

/**
 * 필드명을 캐릭터 속성에 매핑
 */
function setCharacterField(character: ParsedCharacter, field: string, value: string): void {
  const fieldMap: Record<string, keyof ParsedCharacter> = {
    '역할': 'role',
    'role': 'role',
    '위치': 'location',
    '지역': 'location',
    'location': 'location',
    '성격': 'personality',
    'personality': 'personality',
    '숨겨진 동기': 'hiddenMotivation',
    '동기': 'hiddenMotivation',
    '목적': 'hiddenMotivation',
    'motivation': 'hiddenMotivation',
    '외모': 'appearance',
    '외형': 'appearance',
    'appearance': 'appearance',
    '말투': 'speechPattern',
    '화법': 'speechPattern',
    'speech': 'speechPattern',
    '배경': 'backstory',
    '과거': 'backstory',
    'backstory': 'backstory',
    '소속': 'faction',
    '세력': 'faction',
    'faction': 'faction',
    '비중': 'importance',
    'importance': 'importance',
    '관계': 'relationships',
    'relationships': 'relationships',
    '서사': 'arc',
    '아크': 'arc',
    'arc': 'arc',
  };

  const key = fieldMap[field];
  if (key) {
    if (key === 'importance') {
      // 비중 값 정규화
      const normalized = value.toLowerCase();
      if (normalized.includes('major') || normalized.includes('주연') || normalized.includes('주요')) {
        character.importance = 'major';
      } else if (normalized.includes('minor') || normalized.includes('단역') || normalized.includes('엑스트라')) {
        character.importance = 'minor';
      } else {
        character.importance = 'supporting';
      }
    } else {
      (character as unknown as Record<string, string | undefined>)[key] = value;
    }
  }
}

/**
 * 간단한 형식 파싱 (필드:값 형식이 아닌 경우)
 * 줄마다 "이름 - 설명" 또는 "이름: 설명" 형식
 */
function parseSimpleFormat(content: string): ParseResult {
  const characters: ParsedCharacter[] = [];
  const errors: string[] = [];

  const lines = content.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    // "이름 - 역할 - 설명" 또는 "이름: 역할, 설명" 형식
    const dashMatch = trimmed.match(/^([^-:]+)\s*[-–—]\s*([^-]+)(?:\s*[-–—]\s*(.+))?$/);
    const colonMatch = trimmed.match(/^([^:：]+)\s*[:：]\s*(.+)$/);

    if (dashMatch) {
      const [, name, role, desc] = dashMatch;
      characters.push({
        name: name.trim(),
        role: role.trim(),
        location: '',
        personality: desc?.trim() || '',
      });
    } else if (colonMatch) {
      const [, name, rest] = colonMatch;
      const parts = rest.split(/[,，]/).map(p => p.trim());
      characters.push({
        name: name.trim(),
        role: parts[0] || '미지정',
        location: '',
        personality: parts.slice(1).join(', '),
      });
    }
  }

  return {
    success: characters.length > 0,
    characters,
    errors,
  };
}

/**
 * ParsedCharacter를 NPCSeedInfo로 변환
 */
export function toNPCSeedInfo(parsed: ParsedCharacter): NPCSeedInfo {
  return {
    id: `npc_upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: parsed.name,
    role: parsed.role,
    location: parsed.location,
    personality: parsed.personality,
    hiddenMotivation: parsed.hiddenMotivation,
    appearance: parsed.appearance,
    speechPattern: parsed.speechPattern,
    backstory: parsed.backstory,
    faction: parsed.faction,
    relationships: parsed.relationships,
    arc: parsed.arc,
    importance: parsed.importance || 'supporting',
    source: 'manual',
    promoted: false,
  };
}

/**
 * TXT 파일 읽기 및 파싱
 */
export async function parseCharacterFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parseCharacterTxt(content);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('파일 읽기 실패'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * 예시 TXT 형식 생성 (다운로드용)
 */
export function generateExampleTxt(): string {
  return `# 캐릭터 프로필 템플릿
# 아래 형식에 맞춰 작성해주세요.
# '===' 라인으로 캐릭터를 구분합니다.

=== 캐릭터: 강현 ===
역할: 검객, 무림맹 소속 검사
위치: 중원 무림맹
성격: 과묵하고 냉정하지만 의리 있음. 불의를 참지 못하는 성격.
숨겨진 동기: 어린 시절 잃어버린 동생을 찾고 있다
외모: 검은 장발, 날카로운 눈매, 180cm 장신, 검은 도복
말투: 짧고 단호한 말투. 필요한 말만 한다. "...그래."
배경: 멸문당한 현천검파의 유일한 생존자. 10년간 복수를 위해 검술을 연마했다.
소속: 무림맹
비중: major
관계: 주인공의 검술 스승이자 조언자
서사: 복수에 집착하다가 제자를 만나며 점차 과거를 내려놓게 된다

=== 캐릭터: 서연 ===
역할: 약사, 의녀
위치: 왕도 외곽 약방
성격: 온화하고 다정하지만 필요할 때 단호함. 생명을 소중히 여긴다.
숨겨진 동기: 전쟁에서 죽은 부모의 유지를 이어 사람들을 치료하고 싶다
외모: 긴 흑발, 온화한 눈매, 항상 약초 주머니를 차고 다님
말투: 부드럽고 차분한 말투. 환자에게는 다정하게.
배경: 전쟁 고아. 떠돌다가 은인에게 의술을 배웠다.
소속: 무소속
비중: supporting
관계: 주인공에게 치료를 해주며 인연을 맺는다
서사: 주인공이 위기에 처할 때마다 도움을 주는 조력자

=== 캐릭터: 흑영 ===
역할: 암살자, 그림자 조직 소속
위치: 불명 (여러 도시를 떠돌음)
성격: 냉혹하고 감정이 없어 보이지만 약자에게는 의외로 친절하다
숨겨진 동기: 조직에서 탈출하고 싶지만 가족이 인질로 잡혀있다
외모: 얼굴을 가리는 두건, 검은 의복, 날렵한 체형
말투: 목소리를 낮추고 짧게 말함. 비유와 암시를 즐겨 사용.
배경: 어린 시절 납치되어 암살자로 훈련받았다.
소속: 그림자 조직
비중: supporting
관계: 주인공의 적이지만 후에 아군이 된다
서사: 적에서 아군으로, 구원받는 캐릭터

# 간단한 형식도 지원됩니다:
# 이름 - 역할 - 설명
# 예: 노상인 - 대장장이 - 무기를 만드는 장인
`;
}
