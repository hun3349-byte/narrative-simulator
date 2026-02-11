'use client';

import { useMemo } from 'react';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { useEditorStore } from '@/lib/store/editor-store';
import { getCharacterName, getCharacterColor } from '@/lib/utils/character-display';
import { ARC_LABELS } from '@/lib/grammar/arc-templates';

export default function StatsOverview() {
  const { events, characters, seeds, characterArcs, masterArc, storyDirectorConfig, npcPool } = useSimulationStore();
  const { project, unassignedScenes, getTotalWordCount } = useEditorStore();

  const adoptedCount = unassignedScenes.length +
    (project?.chapters.reduce((sum, ch) => sum + ch.scenes.length, 0) ?? 0);
  const totalWords = getTotalWordCount();

  // 캐릭터별 이벤트 수
  const charEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      counts[e.characterId] = (counts[e.characterId] || 0) + 1;
    });
    return counts;
  }, [events]);

  const maxCharEvents = Math.max(...Object.values(charEventCounts), 1);

  // 년도별 이벤트 밀도
  const yearDensity = useMemo(() => {
    const density: Record<number, number> = {};
    events.forEach((e) => {
      density[e.year] = (density[e.year] || 0) + 1;
    });
    return density;
  }, [events]);

  const years = Object.keys(yearDensity).map(Number).sort((a, b) => a - b);
  const maxDensity = Math.max(...Object.values(yearDensity), 1);

  // 인기 태그
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      e.tags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [events]);

  // 감정 변화 추이
  const emotionTimelines = useMemo(() => {
    const timelines: Record<string, { year: number; emotion: string; intensity: number }[]> = {};
    const sorted = [...events].sort((a, b) => a.year - b.year || (a.season < b.season ? -1 : 1));
    sorted.forEach((e) => {
      if (e.emotionalShift) {
        if (!timelines[e.characterId]) timelines[e.characterId] = [];
        timelines[e.characterId].push({
          year: e.year,
          emotion: e.emotionalShift.primary,
          intensity: e.emotionalShift.intensity,
        });
      }
    });
    return timelines;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-text-muted">시뮬레이션 데이터가 없습니다</p>
          <a href="/" className="mt-2 inline-block text-xs text-seojin hover:underline">
            대시보드에서 시뮬레이션을 시작하세요
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 상단 카드 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="총 이벤트" value={`${events.length}개`} />
        <StatCard label="채택 장면" value={`${adoptedCount}개`} />
        <StatCard label="총 글자수" value={`${totalWords.toLocaleString()}자`} />
        <StatCard label="챕터 수" value={`${project?.chapters.length ?? 0}개`} />
      </div>

      {/* 스토리 디렉터 통계 */}
      {storyDirectorConfig?.enabled && events.length > 0 && (() => {
        const protId = storyDirectorConfig.protagonistId;
        const protEvents = events.filter(e => e.characterId === protId);
        const protRatio = events.length > 0 ? Math.round((protEvents.length / events.length) * 100) : 0;
        const protChar = characters.find(c => c.id === protId);
        const protName = protChar?.name || protId;

        // 변화시킨 사람들: 주인공과 relatedCharacters로 연결된 NPC 수
        const influencedNPCs = npcPool.npcs.filter(n =>
          n.relatedCharacters.some(r => r.characterId === protId && r.sentiment > 0)
        );

        // 주인공 turning_point 수 (각성 횟수)
        const awakenings = protEvents.filter(e => e.importance === 'turning_point').length;

        return (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="text-sm font-medium text-emerald-400 mb-3">스토리 디렉터 — {protName} 중심</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <div className="text-[10px] text-text-muted">A 비중</div>
                <div className="text-lg font-bold text-text-primary">{protRatio}%</div>
                <div className="text-[9px] text-text-muted">목표: {storyDirectorConfig.ratio.protagonist}%</div>
              </div>
              <div>
                <div className="text-[10px] text-text-muted">각성 횟수</div>
                <div className="text-lg font-bold text-text-primary">{awakenings}</div>
                <div className="text-[9px] text-text-muted">turning_point</div>
              </div>
              <div>
                <div className="text-[10px] text-text-muted">변화시킨 사람들</div>
                <div className="text-lg font-bold text-text-primary">{influencedNPCs.length}</div>
                <div className="text-[9px] text-text-muted">긍정 관계 NPC</div>
              </div>
              <div>
                <div className="text-[10px] text-text-muted">로그라인</div>
                <div className="text-xs font-medium text-text-primary truncate max-w-[120px]">{storyDirectorConfig.logline ? '설정됨' : '없음'}</div>
              </div>
            </div>
            {storyDirectorConfig.logline && (
              <p className="mt-3 text-[10px] text-text-muted italic border-t border-base-border pt-2">
                &ldquo;{storyDirectorConfig.logline}&rdquo;
              </p>
            )}
          </div>
        );
      })()}

      {/* 캐릭터별 이벤트 분포 */}
      <div className="rounded-lg border border-base-border bg-base-card p-5">
        <h3 className="text-sm font-medium text-text-primary mb-4">캐릭터별 이벤트 분포</h3>
        <div className="space-y-3">
          {Object.entries(charEventCounts).map(([charId, count]) => {
            const cColor = getCharacterColor(charId, characters, seeds);
            return (
              <div key={charId} className="flex items-center gap-3">
                <span className="w-16 text-xs font-medium shrink-0" style={{ color: cColor }}>
                  {getCharacterName(charId, characters)}
                </span>
                <div className="flex-1 h-6 bg-base-tertiary rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: `${(count / maxCharEvents) * 100}%`,
                      backgroundColor: cColor,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="text-xs text-text-muted w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 년도별 이벤트 밀도 */}
      {years.length > 0 && (
        <div className="rounded-lg border border-base-border bg-base-card p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4">년도별 이벤트 밀도</h3>
          <div className="h-32">
            <svg viewBox={`0 0 ${Math.max(years.length * 30, 200)} 100`} className="w-full h-full" preserveAspectRatio="none">
              {/* 배경 그리드 */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line key={y} x1="0" y1={100 - y} x2={years.length * 30} y2={100 - y} stroke="#2A2A3A" strokeWidth="0.5" />
              ))}
              {/* 라인 */}
              <polyline
                fill="none"
                stroke="#7B6BA8"
                strokeWidth="2"
                points={years.map((y, i) => `${i * 30 + 15},${100 - (yearDensity[y] / maxDensity) * 80}`).join(' ')}
              />
              {/* 포인트 */}
              {years.map((y, i) => (
                <circle
                  key={y}
                  cx={i * 30 + 15}
                  cy={100 - (yearDensity[y] / maxDensity) * 80}
                  r="3"
                  fill="#7B6BA8"
                />
              ))}
              {/* 년도 라벨 */}
              {years.map((y, i) => (
                <text key={y} x={i * 30 + 15} y="98" textAnchor="middle" fill="#6B6880" fontSize="6">
                  {y}
                </text>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* 인기 태그 */}
      {tagCounts.length > 0 && (
        <div className="rounded-lg border border-base-border bg-base-card p-5">
          <h3 className="text-sm font-medium text-text-primary mb-3">인기 태그 TOP 10</h3>
          <div className="flex flex-wrap gap-2">
            {tagCounts.map(([tag, count], idx) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs font-medium border"
                style={{
                  borderColor: `rgba(123, 107, 168, ${0.3 + (1 - idx / 10) * 0.5})`,
                  backgroundColor: `rgba(123, 107, 168, ${0.05 + (1 - idx / 10) * 0.1})`,
                  color: '#A8A4B8',
                }}
              >
                #{tag} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 감정 변화 추이 */}
      {Object.keys(emotionTimelines).length > 0 && (
        <div className="rounded-lg border border-base-border bg-base-card p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4">감정 변화 추이</h3>
          <div className="space-y-4">
            {Object.entries(emotionTimelines).map(([charId, timeline]) => {
              const eColor = getCharacterColor(charId, characters, seeds);
              return (
                <div key={charId}>
                  <span className="text-xs font-medium mb-1.5 block" style={{ color: eColor }}>
                    {getCharacterName(charId, characters)}
                  </span>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {timeline.map((entry, idx) => (
                      <div key={idx} className="flex items-center shrink-0">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px]"
                          style={{
                            backgroundColor: `${eColor}20`,
                            color: eColor,
                          }}
                        >
                          {entry.emotion}
                        </span>
                        {idx < timeline.length - 1 && (
                          <span className="mx-1 text-text-muted text-[10px]">&rarr;</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* 서사 아크 텐션 커브 */}
      {characterArcs.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-base-card p-5">
          <h3 className="text-sm font-medium text-amber-400 mb-4">서사 아크 텐션 커브</h3>

          {/* 마스터 아크 표시 */}
          {masterArc && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">전체 이야기 긴장도</span>
                <span className="text-[10px] text-amber-400">{masterArc.overallTension}/100</span>
              </div>
              {/* 막 구분선 */}
              <div className="flex gap-1 mb-2">
                {masterArc.acts.map((act, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 rounded-sm px-2 py-1 text-center text-[10px] ${
                      idx === masterArc.currentAct
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : idx < masterArc.currentAct
                        ? 'bg-amber-500/10 text-amber-500/50'
                        : 'bg-base-tertiary text-text-muted'
                    }`}
                  >
                    {act.name} ({act.yearRange[0]}~{act.yearRange[1]})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 캐릭터별 아크 상태 */}
          <div className="space-y-3">
            {characterArcs.map(arc => {
              const charName = getCharacterName(arc.characterId, characters);
              const charColor = getCharacterColor(arc.characterId, characters, seeds);

              return (
                <div key={arc.characterId} className="rounded-md border border-base-border bg-base-primary/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: charColor }}>
                      {charName}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {ARC_LABELS[arc.archetype]} · 완성도 {arc.fulfillment}%
                    </span>
                  </div>

                  {/* 텐션 바 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-text-muted w-10">긴장도</span>
                    <div className="h-2 flex-1 rounded-full bg-base-tertiary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${arc.tension}%`,
                          backgroundColor: arc.tension > 70 ? '#EF4444' : arc.tension > 40 ? '#FBBF24' : '#4ADE80',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted w-6 text-right">{arc.tension}</span>
                  </div>

                  {/* Phase 진행도 (시각적 타임라인) */}
                  <div className="flex gap-0.5">
                    {arc.phases.map((phase, idx) => {
                      const total = phase.requiredBeats.length;
                      const done = phase.requiredBeats.filter(b => b.fulfilled).length;
                      const isCurrent = idx === arc.currentPhase;
                      const isPast = idx < arc.currentPhase;

                      return (
                        <div
                          key={idx}
                          className="flex-1 group relative"
                          title={`${phase.name}: ${done}/${total} 비트 | 목표 긴장도: ${phase.tensionTarget}`}
                        >
                          <div
                            className={`h-1.5 rounded-full transition-colors ${
                              isPast ? 'bg-amber-500' : isCurrent ? 'bg-amber-500/50' : 'bg-base-tertiary'
                            }`}
                          />
                          {isCurrent && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-amber-400">
                              {phase.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 미이행 비트 */}
                  {arc.phases[arc.currentPhase] && (
                    <div className="mt-2">
                      {arc.phases[arc.currentPhase].requiredBeats
                        .filter(b => !b.fulfilled)
                        .map((beat, idx) => (
                          <span
                            key={idx}
                            className="inline-block mr-1 mb-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[10px] text-amber-500/70"
                          >
                            {beat.description}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-base-border bg-base-card p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-text-primary">{value}</p>
    </div>
  );
}
