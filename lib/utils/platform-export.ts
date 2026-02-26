/**
 * Platform-specific Export (Task 3.4)
 * 플랫폼별 맞춤 포맷팅 및 내보내기
 */

import type {
  Episode,
  ExportPlatform,
  PlatformFormatSpec,
  PlatformExportResult,
} from '@/lib/types';
import { getEpisodeFinalContent } from '@/lib/types';

// 플랫폼별 포맷 스펙
export const PLATFORM_SPECS: Record<ExportPlatform, PlatformFormatSpec> = {
  munpia: {
    platform: 'munpia',
    name: '문피아',
    charCountRange: {
      min: 4000,
      max: 15000,
      recommended: 6000,
    },
    formatting: {
      lineBreakStyle: 'double',
      dialogueStyle: 'quotation',
      emphasisAllowed: false,
      imageAllowed: false,
    },
    requirements: {
      episodePrefix: undefined, // 없음
      authorNotePosition: 'bottom',
      copyrightNotice: true,
    },
    restrictions: [
      '성인 표현은 성인 카테고리에서만',
      '타 플랫폼 언급 금지',
      '외부 링크 금지',
    ],
  },

  naver_series: {
    platform: 'naver_series',
    name: '네이버 시리즈',
    charCountRange: {
      min: 5000,
      max: 12000,
      recommended: 7000,
    },
    formatting: {
      lineBreakStyle: 'paragraph',
      dialogueStyle: 'quotation',
      emphasisAllowed: true,
      imageAllowed: true,
    },
    requirements: {
      episodePrefix: '제 ',
      authorNotePosition: 'bottom',
      copyrightNotice: true,
    },
    restrictions: [
      '특정 브랜드명 사용 주의',
      '정치/종교 민감 표현 주의',
      '과도한 폭력 표현 자제',
    ],
  },

  kakao_page: {
    platform: 'kakao_page',
    name: '카카오페이지',
    charCountRange: {
      min: 4500,
      max: 10000,
      recommended: 6500,
    },
    formatting: {
      lineBreakStyle: 'double',
      dialogueStyle: 'quotation',
      emphasisAllowed: false,
      imageAllowed: false,
    },
    requirements: {
      episodePrefix: undefined,
      authorNotePosition: 'none',
      copyrightNotice: true,
    },
    restrictions: [
      '회차 분량 일정하게 유지',
      '클리프행어 필수',
      '앞부분에 긴 설명 피하기',
    ],
  },

  ridibooks: {
    platform: 'ridibooks',
    name: '리디북스',
    charCountRange: {
      min: 5000,
      max: 15000,
      recommended: 8000,
    },
    formatting: {
      lineBreakStyle: 'paragraph',
      dialogueStyle: 'quotation',
      emphasisAllowed: true,
      imageAllowed: false,
    },
    requirements: {
      episodePrefix: undefined,
      authorNotePosition: 'bottom',
      copyrightNotice: true,
    },
    restrictions: [
      '성인물은 별도 등록',
      '시리즈 구분 명확히',
    ],
  },

  general: {
    platform: 'general',
    name: '일반 (범용)',
    charCountRange: {
      min: 3000,
      max: 20000,
      recommended: 6000,
    },
    formatting: {
      lineBreakStyle: 'double',
      dialogueStyle: 'quotation',
      emphasisAllowed: true,
      imageAllowed: true,
    },
    requirements: {
      episodePrefix: undefined,
      authorNotePosition: 'bottom',
      copyrightNotice: false,
    },
    restrictions: [],
  },
};

/**
 * 텍스트 줄바꿈 스타일 변환
 */
function formatLineBreaks(content: string, style: 'single' | 'double' | 'paragraph'): string {
  // 먼저 기존 줄바꿈 정규화
  let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 연속된 빈 줄을 하나로 통합
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  switch (style) {
    case 'single':
      // 문단 사이에 빈 줄 없음
      return normalized.replace(/\n\n+/g, '\n');

    case 'double':
      // 문단 사이에 빈 줄 하나
      return normalized.replace(/\n\n+/g, '\n\n');

    case 'paragraph':
      // 들여쓰기 + 빈 줄
      const paragraphs = normalized.split(/\n\n+/);
      return paragraphs.map(p => '  ' + p.trim()).join('\n\n');

    default:
      return normalized;
  }
}

/**
 * 대화 스타일 변환
 */
function formatDialogue(content: string, style: 'quotation' | 'dash' | 'mixed'): string {
  switch (style) {
    case 'quotation':
      // 이미 따옴표 스타일이면 유지
      // 큰따옴표 → "대사" 형식 정규화
      return content
        .replace(/「([^」]+)」/g, '"$1"')
        .replace(/『([^』]+)』/g, '"$1"')
        .replace(/'([^']+)'/g, '"$1"');

    case 'dash':
      // 대사 앞에 대시 추가
      return content
        .replace(/"([^"]+)"/g, '— $1')
        .replace(/「([^」]+)」/g, '— $1');

    case 'mixed':
      // 혼합 (변환 안 함)
      return content;

    default:
      return content;
  }
}

/**
 * 강조 표시 제거 (플랫폼에서 지원 안 하는 경우)
 */
function removeEmphasis(content: string): string {
  return content
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
    .replace(/\*([^*]+)\*/g, '$1')      // *italic*
    .replace(/__([^_]+)__/g, '$1')      // __underline__
    .replace(/_([^_]+)_/g, '$1');       // _italic_
}

/**
 * 에피소드 접두사 추가
 */
function addEpisodePrefix(content: string, prefix: string | undefined, episodeNumber: number): string {
  if (!prefix) return content;

  const header = `${prefix}${episodeNumber}화\n\n`;
  return header + content;
}

/**
 * 작가의 말 추가
 */
function addAuthorNote(content: string, note: string, position: 'top' | 'bottom' | 'none'): string {
  if (position === 'none' || !note.trim()) return content;

  const formattedNote = `\n\n---\n작가의 말:\n${note}\n---`;

  if (position === 'top') {
    return formattedNote + '\n\n' + content;
  } else {
    return content + formattedNote;
  }
}

/**
 * 저작권 고지 추가
 */
function addCopyrightNotice(content: string): string {
  return content + '\n\n© 본 작품의 무단 전재 및 복제를 금합니다.';
}

/**
 * 플랫폼별 포맷팅 적용
 */
export function formatForPlatform(
  episode: Episode,
  platform: ExportPlatform,
  authorNote?: string
): PlatformExportResult {
  const spec = PLATFORM_SPECS[platform];
  let content = getEpisodeFinalContent(episode);
  const warnings: string[] = [];

  // 1. 줄바꿈 스타일 적용
  content = formatLineBreaks(content, spec.formatting.lineBreakStyle);

  // 2. 대화 스타일 적용
  content = formatDialogue(content, spec.formatting.dialogueStyle);

  // 3. 강조 표시 처리
  if (!spec.formatting.emphasisAllowed) {
    content = removeEmphasis(content);
  }

  // 4. 에피소드 접두사 추가
  content = addEpisodePrefix(content, spec.requirements.episodePrefix, episode.number);

  // 5. 작가의 말 추가
  if (authorNote && spec.requirements.authorNotePosition !== 'none') {
    content = addAuthorNote(content, authorNote, spec.requirements.authorNotePosition || 'bottom');
  }

  // 6. 저작권 고지 추가
  if (spec.requirements.copyrightNotice) {
    content = addCopyrightNotice(content);
  }

  // 7. 글자 수 검증
  const charCount = content.length;
  let isValid = true;

  if (charCount < spec.charCountRange.min) {
    warnings.push(`글자 수가 너무 적습니다 (${charCount}자). 최소 ${spec.charCountRange.min}자 이상 권장.`);
    isValid = false;
  }

  if (charCount > spec.charCountRange.max) {
    warnings.push(`글자 수가 너무 많습니다 (${charCount}자). 최대 ${spec.charCountRange.max}자 이하 권장.`);
    // 너무 길어도 일단 유효로 처리 (분할 권장)
  }

  // 8. 플랫폼별 제한 사항 체크
  spec.restrictions.forEach(restriction => {
    warnings.push(`[주의] ${restriction}`);
  });

  return {
    platform,
    episodeNumber: episode.number,
    formattedContent: content,
    charCount,
    warnings,
    isValid,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * 여러 에피소드를 플랫폼 형식으로 내보내기
 */
export function exportEpisodesForPlatform(
  episodes: Episode[],
  platform: ExportPlatform,
  authorNote?: string
): {
  results: PlatformExportResult[];
  summary: {
    totalEpisodes: number;
    validEpisodes: number;
    totalCharCount: number;
    averageCharCount: number;
    warnings: string[];
  };
} {
  const results = episodes.map(ep => formatForPlatform(ep, platform, authorNote));

  const validCount = results.filter(r => r.isValid).length;
  const totalChars = results.reduce((sum, r) => sum + r.charCount, 0);

  const allWarnings: string[] = [];
  results.forEach((r, i) => {
    r.warnings.forEach(w => {
      if (!w.startsWith('[주의]')) {
        allWarnings.push(`${i + 1}화: ${w}`);
      }
    });
  });

  return {
    results,
    summary: {
      totalEpisodes: episodes.length,
      validEpisodes: validCount,
      totalCharCount: totalChars,
      averageCharCount: Math.round(totalChars / episodes.length),
      warnings: allWarnings,
    },
  };
}

/**
 * 플랫폼 추천 (분량 기반)
 */
export function recommendPlatform(averageCharCount: number): {
  recommended: ExportPlatform;
  alternatives: ExportPlatform[];
  reason: string;
} {
  const platforms: Array<{ platform: ExportPlatform; score: number }> = [];

  Object.entries(PLATFORM_SPECS).forEach(([key, spec]) => {
    const platform = key as ExportPlatform;
    if (platform === 'general') return;

    // 권장 분량과의 차이로 점수 계산
    const diff = Math.abs(averageCharCount - spec.charCountRange.recommended);
    const score = 100 - (diff / 100);
    platforms.push({ platform, score });
  });

  platforms.sort((a, b) => b.score - a.score);

  const recommended = platforms[0].platform;
  const alternatives = platforms.slice(1, 3).map(p => p.platform);

  let reason = '';
  const spec = PLATFORM_SPECS[recommended];
  if (averageCharCount < 5000) {
    reason = '짧은 분량에 적합한 플랫폼입니다.';
  } else if (averageCharCount > 8000) {
    reason = '긴 분량을 수용하는 플랫폼입니다.';
  } else {
    reason = `평균 ${averageCharCount}자에 가장 적합한 플랫폼입니다.`;
  }

  return { recommended, alternatives, reason };
}

/**
 * 플랫폼별 가이드라인 요약
 */
export function getPlatformGuidelines(platform: ExportPlatform): {
  name: string;
  charCount: string;
  style: string;
  tips: string[];
} {
  const spec = PLATFORM_SPECS[platform];

  return {
    name: spec.name,
    charCount: `${spec.charCountRange.min.toLocaleString()}~${spec.charCountRange.max.toLocaleString()}자 (권장: ${spec.charCountRange.recommended.toLocaleString()}자)`,
    style: `줄바꿈: ${spec.formatting.lineBreakStyle}, 대화: ${spec.formatting.dialogueStyle}`,
    tips: [
      `강조 표시 ${spec.formatting.emphasisAllowed ? '사용 가능' : '사용 불가'}`,
      `이미지 ${spec.formatting.imageAllowed ? '삽입 가능' : '삽입 불가'}`,
      ...spec.restrictions,
    ],
  };
}

/**
 * 분량 분석 및 분할 제안
 */
export function analyzeCharCountForPlatform(
  content: string,
  platform: ExportPlatform
): {
  charCount: number;
  status: 'too_short' | 'optimal' | 'too_long';
  suggestion: string;
  splitPoints?: number[];
} {
  const spec = PLATFORM_SPECS[platform];
  const charCount = content.length;

  if (charCount < spec.charCountRange.min) {
    return {
      charCount,
      status: 'too_short',
      suggestion: `${spec.charCountRange.min - charCount}자 이상 추가 필요`,
    };
  }

  if (charCount > spec.charCountRange.max) {
    // 분할 포인트 계산
    const targetSize = spec.charCountRange.recommended;
    const splitPoints: number[] = [];

    let currentPos = targetSize;
    while (currentPos < charCount) {
      // 가장 가까운 문단 끝 찾기
      const searchStart = Math.max(0, currentPos - 500);
      const searchEnd = Math.min(charCount, currentPos + 500);
      const section = content.substring(searchStart, searchEnd);
      const paragraphEnd = section.lastIndexOf('\n\n');

      if (paragraphEnd > 0) {
        splitPoints.push(searchStart + paragraphEnd);
      } else {
        splitPoints.push(currentPos);
      }

      currentPos += targetSize;
    }

    return {
      charCount,
      status: 'too_long',
      suggestion: `${Math.ceil(charCount / spec.charCountRange.recommended)}개 화로 분할 권장`,
      splitPoints,
    };
  }

  return {
    charCount,
    status: 'optimal',
    suggestion: '적절한 분량입니다.',
  };
}
