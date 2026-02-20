import type { BreadcrumbWarning, BreadcrumbWarningType, WorldBible } from '@/lib/types';

interface BreadcrumbData {
  truth: string;
  status: 'hidden' | 'hinted' | 'suspected' | 'revealed';
  lastMentionedEp: number;
  plannedRevealEp?: number;
}

type NonRevealedStatus = 'hidden' | 'hinted' | 'suspected';

// 경고 기준
const FORGOTTEN_THRESHOLD = 10;      // 10화 이상 방치
const TOO_LONG_HIDDEN_THRESHOLD = 40; // 40화 넘도록 hidden
const DELAYED_THRESHOLD = 5;          // 예정 시점 5화 이상 지연

/**
 * 떡밥 상태를 추적하고 경고를 생성합니다.
 */
export function trackBreadcrumbs(
  breadcrumbs: Record<string, BreadcrumbData>,
  currentEpisode: number
): BreadcrumbWarning[] {
  const warnings: BreadcrumbWarning[] = [];

  for (const [name, bc] of Object.entries(breadcrumbs)) {
    // revealed된 떡밥은 추적하지 않음
    if (bc.status === 'revealed') continue;

    // 1. 잊힌 떡밥 체크 (10화 이상 방치)
    const episodesSinceLastMention = currentEpisode - bc.lastMentionedEp;
    if (episodesSinceLastMention >= FORGOTTEN_THRESHOLD) {
      warnings.push({
        breadcrumbName: name,
        warningType: 'forgotten',
        lastMentionedEp: bc.lastMentionedEp,
        currentEp: currentEpisode,
        message: `떡밥 "${name}"이(가) ${episodesSinceLastMention}화 동안 언급되지 않았습니다.`,
        suggestedAction: `이번 화에서 "${name}" 힌트를 줘야 합니다.`,
      });
    }

    // 2. 너무 오래 숨긴 떡밥 체크 (hidden 상태로 40화 초과)
    if (bc.status === 'hidden' && currentEpisode > TOO_LONG_HIDDEN_THRESHOLD) {
      warnings.push({
        breadcrumbName: name,
        warningType: 'too_long_hidden',
        lastMentionedEp: bc.lastMentionedEp,
        currentEp: currentEpisode,
        message: `떡밥 "${name}"이(가) ${currentEpisode}화까지 hidden 상태입니다.`,
        suggestedAction: `"${name}"을(를) hinted 상태로 전환할 시기입니다.`,
      });
    }

    // 3. 지연된 떡밥 체크 (예정 시점 5화 이상 초과)
    if (bc.plannedRevealEp) {
      const delayedBy = currentEpisode - bc.plannedRevealEp;
      if (delayedBy >= DELAYED_THRESHOLD) {
        warnings.push({
          breadcrumbName: name,
          warningType: 'delayed',
          lastMentionedEp: bc.lastMentionedEp,
          currentEp: currentEpisode,
          plannedRevealEp: bc.plannedRevealEp,
          message: `떡밥 "${name}"이(가) 예정 시점(${bc.plannedRevealEp}화)을 ${delayedBy}화 초과했습니다.`,
          suggestedAction: `"${name}"을(를) 이번 화에서 회수하거나 진전시켜야 합니다.`,
        });
      }

      // 회수 예정 시점 초과 (revealed가 아닌 경우만 - 이미 위에서 필터됨)
      if (currentEpisode > bc.plannedRevealEp) {
        // delayed와 중복되지 않게 delayedBy < DELAYED_THRESHOLD인 경우만
        if (delayedBy > 0 && delayedBy < DELAYED_THRESHOLD) {
          warnings.push({
            breadcrumbName: name,
            warningType: 'overdue',
            lastMentionedEp: bc.lastMentionedEp,
            currentEp: currentEpisode,
            plannedRevealEp: bc.plannedRevealEp,
            message: `떡밥 "${name}"이(가) 회수 예정 시점(${bc.plannedRevealEp}화)을 지났습니다.`,
            suggestedAction: `"${name}" 회수를 고려하세요.`,
          });
        }
      }
    }
  }

  // 우선순위 정렬: delayed > forgotten > too_long_hidden > overdue
  const priorityOrder: Record<BreadcrumbWarningType, number> = {
    delayed: 0,
    forgotten: 1,
    too_long_hidden: 2,
    overdue: 3,
  };

  warnings.sort((a, b) => priorityOrder[a.warningType] - priorityOrder[b.warningType]);

  return warnings;
}

/**
 * 다음 화 메타 지시에 포함할 떡밥 지시를 생성합니다.
 */
export function generateBreadcrumbInstructions(
  warnings: BreadcrumbWarning[]
): string[] {
  return warnings.map(w => w.suggestedAction);
}

/**
 * 떡밥 진행 상태를 요약합니다.
 */
export function summarizeBreadcrumbStatus(
  breadcrumbs: Record<string, BreadcrumbData>
): {
  hidden: number;
  hinted: number;
  suspected: number;
  revealed: number;
  total: number;
} {
  const summary = {
    hidden: 0,
    hinted: 0,
    suspected: 0,
    revealed: 0,
    total: 0,
  };

  for (const bc of Object.values(breadcrumbs)) {
    summary.total++;
    summary[bc.status]++;
  }

  return summary;
}

/**
 * EpisodeLog의 breadcrumbActivity를 기반으로 WorldBible의 떡밥 상태를 업데이트합니다.
 */
export function updateBreadcrumbsFromLog(
  worldBible: WorldBible,
  breadcrumbActivity: {
    advanced: string[];
    newlyPlanted: string[];
    hintGiven: string[];
  },
  currentEpisode: number
): WorldBible {
  const updatedBreadcrumbs = { ...worldBible.breadcrumbs };

  // 진전된 떡밥: status 한 단계 올림
  for (const name of breadcrumbActivity.advanced) {
    if (updatedBreadcrumbs[name]) {
      const current = updatedBreadcrumbs[name].status;
      let newStatus: 'hidden' | 'hinted' | 'suspected' | 'revealed' = current;

      if (current === 'hidden') newStatus = 'hinted';
      else if (current === 'hinted') newStatus = 'suspected';
      else if (current === 'suspected') newStatus = 'revealed';

      updatedBreadcrumbs[name] = {
        ...updatedBreadcrumbs[name],
        status: newStatus,
        lastMentionedEp: currentEpisode,
      };
    }
  }

  // 힌트 준 떡밥: lastMentionedEp 업데이트
  for (const name of breadcrumbActivity.hintGiven) {
    if (updatedBreadcrumbs[name]) {
      updatedBreadcrumbs[name] = {
        ...updatedBreadcrumbs[name],
        lastMentionedEp: currentEpisode,
      };
    }
  }

  // 새로 심은 떡밥은 별도 처리 필요 (WorldBible에 없는 떡밥)
  // 여기서는 기존 떡밥만 처리

  return {
    ...worldBible,
    breadcrumbs: updatedBreadcrumbs,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * 떡밥 추적 대시보드용 데이터를 생성합니다.
 */
export function getBreadcrumbDashboardData(
  worldBible: WorldBible,
  currentEpisode: number
): {
  summary: ReturnType<typeof summarizeBreadcrumbStatus>;
  warnings: BreadcrumbWarning[];
  breadcrumbList: Array<{
    name: string;
    truth: string;
    status: string;
    lastMentioned: number;
    plannedReveal?: number;
    hasWarning: boolean;
    warningType?: BreadcrumbWarningType;
  }>;
} {
  const breadcrumbs = worldBible.breadcrumbs || {};
  const summary = summarizeBreadcrumbStatus(breadcrumbs);
  const warnings = trackBreadcrumbs(breadcrumbs, currentEpisode);

  const warningMap = new Map(warnings.map(w => [w.breadcrumbName, w]));

  const breadcrumbList = Object.entries(breadcrumbs).map(([name, bc]) => {
    const warning = warningMap.get(name);
    return {
      name,
      truth: bc.truth,
      status: bc.status,
      lastMentioned: bc.lastMentionedEp,
      plannedReveal: bc.plannedRevealEp,
      hasWarning: !!warning,
      warningType: warning?.warningType,
    };
  });

  // 경고 있는 것 먼저, 그 다음 lastMentioned 오래된 순
  breadcrumbList.sort((a, b) => {
    if (a.hasWarning && !b.hasWarning) return -1;
    if (!a.hasWarning && b.hasWarning) return 1;
    return a.lastMentioned - b.lastMentioned;
  });

  return {
    summary,
    warnings,
    breadcrumbList,
  };
}
