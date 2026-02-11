'use client';

import { useState } from 'react';
import { NarrativeEvent, Character, DetailScene } from '@/lib/types';
import { getSeasonLabel } from '@/lib/utils/timeline-utils';
import { getCharacterName, getCharacterColor } from '@/lib/utils/character-display';
import { useTimelineStore } from '@/lib/store/timeline-store';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { useEditorStore } from '@/lib/store/editor-store';
import worldSettings from '@/data/world-settings.json';
import Link from 'next/link';

interface DetailPanelProps {
  event: NarrativeEvent;
  onClose: () => void;
}

export default function DetailPanel({ event, onClose }: DetailPanelProps) {
  const { generatingDetailFor, setGeneratingDetailFor, detailScenes, setDetailScene, deleteDetailScene } = useTimelineStore();
  const { characters, seeds, storyDirectorConfig } = useSimulationStore();
  const { addToUnassigned, removeFromUnassigned, isEventAdopted } = useEditorStore();
  const [error, setError] = useState<string | null>(null);

  const color = getCharacterColor(event.characterId, characters, seeds);
  const charName = getCharacterName(event.characterId, characters);
  const character = characters.find(c => c.id === event.characterId);
  const detailScene = detailScenes[event.id];
  const isGenerating = generatingDetailFor === event.id;
  const adopted = isEventAdopted(event.id);

  const generateDetail = async () => {
    if (!character) return;
    setGeneratingDetailFor(event.id);
    setError(null);

    try {
      const era = (worldSettings.timeline.majorEras as { name: string; years: number[]; description: string }[]).find(
        e => event.year >= e.years[0] && event.year <= e.years[1]
      );
      const worldContext = era ? `${era.name}: ${era.description}` : '';

      const response = await fetch('/api/generate-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character,
          event,
          worldContext,
          authorPersona: storyDirectorConfig?.authorPersona,
          worldSettings: (() => { try { const c = localStorage.getItem('narrative-project-config'); return c ? JSON.parse(c).worldSettings : undefined; } catch { return undefined; } })(),
          allCharacters: characters,
        }),
      });

      const data = await response.json();
      if (data.success && data.detailScene) {
        setDetailScene(event.id, data.detailScene as DetailScene);
      } else {
        setError(data.error || '장면 생성에 실패했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '네트워크 오류');
    } finally {
      setGeneratingDetailFor(null);
    }
  };

  const handleAdopt = () => {
    if (adopted) {
      removeFromUnassigned(event.id);
    } else {
      const eventWithDetail = detailScene
        ? { ...event, detailScene, adopted: true }
        : { ...event, adopted: true };
      addToUnassigned(eventWithDetail);
    }
  };

  return (
    <div className="w-[480px] shrink-0 border-l border-base-border bg-[#0F0F18] overflow-y-auto flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-[#0F0F18] border-b border-base-border px-5 py-3 flex items-center justify-between">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {charName}
        </span>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <path d="M5.146 5.146a.5.5 0 0 1 .708 0L9 8.293l3.146-3.147a.5.5 0 0 1 .708.708L9.707 9l3.147 3.146a.5.5 0 0 1-.708.708L9 9.707l-3.146 3.147a.5.5 0 0 1-.708-.708L8.293 9 5.146 5.854a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 px-5 py-4 space-y-4">
        {/* 이벤트 정보 */}
        <div>
          <h3 className="font-serif text-lg font-bold text-text-primary">{event.title}</h3>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-text-muted">{event.year}년 {getSeasonLabel(event.season)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              event.importance === 'turning_point' ? 'bg-yeonhwa/20 text-yeonhwa' :
              event.importance === 'major' ? 'bg-seojin/20 text-seojin' : 'bg-base-tertiary text-text-muted'
            }`}>
              {event.importance === 'turning_point' ? '전환점' : event.importance === 'major' ? '주요' : '일반'}
            </span>
            {adopted && (
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] text-green-400 font-medium">
                채택됨
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">{event.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {event.tags.map(tag => (
              <span key={tag} className="rounded-md border border-base-border px-2 py-0.5 text-xs text-text-muted">#{tag}</span>
            ))}
          </div>
        </div>

        {/* 감정 변화 */}
        {event.emotionalShift && (
          <div className="rounded-lg border border-base-border bg-base-card/50 p-3">
            <h4 className="text-xs font-medium text-text-muted mb-1.5">감정 변화</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color }}>{event.emotionalShift.primary}</span>
              <span className="text-xs text-text-muted">강도 {event.emotionalShift.intensity}/100</span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">{event.emotionalShift.trigger}</p>
          </div>
        )}

        {/* 관련 캐릭터 */}
        {event.relatedCharacters && event.relatedCharacters.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-text-muted">관련:</span>
            {event.relatedCharacters.map(id => {
              const relColor = getCharacterColor(id, characters, seeds);
              return (
                <span key={id} className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: `${relColor}20`, color: relColor }}>
                  {getCharacterName(id, characters)}
                </span>
              );
            })}
          </div>
        )}

        {/* 구분선 */}
        <div className="border-t border-base-border" />

        {/* 세밀 장면 영역 */}
        {isGenerating ? (
          <div className="rounded-lg border border-base-border bg-base-primary/50 p-6 text-center">
            <div className="scene-loading inline-block">
              <div className="h-8 w-8 rounded-full border-2 border-text-muted/30 border-t-seojin animate-spin mx-auto" />
            </div>
            <p className="mt-3 text-sm text-text-muted loading-dots">서사를 직조하는 중</p>
          </div>
        ) : detailScene ? (
          <div className="space-y-4">
            {/* 분위기 */}
            {detailScene.atmosphere && (
              <div className="rounded-md bg-base-tertiary/30 px-3 py-2 text-xs italic text-text-secondary">
                {detailScene.atmosphere}
              </div>
            )}

            {/* 본문 */}
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-base-border bg-base-primary/30 p-4">
              <div className="text-[15px] leading-[1.8] text-text-primary/90 whitespace-pre-wrap font-sans">
                {detailScene.content}
              </div>
            </div>

            {/* 내면 독백 */}
            {detailScene.innerThought && (
              <div className="rounded-lg border-l-2 bg-base-tertiary/20 pl-4 pr-3 py-3" style={{ borderLeftColor: `${color}60` }}>
                <h4 className="text-xs font-medium text-text-muted mb-1.5">내면 독백</h4>
                <p className="text-sm leading-relaxed text-text-secondary italic">
                  {detailScene.innerThought}
                </p>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={generateDetail}
            className="w-full rounded-lg border border-dashed border-base-border py-6 text-sm text-text-secondary hover:border-seojin/50 hover:text-seojin transition-colors"
          >
            세밀 장면 생성
          </button>
        )}

        {error && (
          <div className="rounded-lg border border-yeonhwa/30 bg-yeonhwa/10 px-3 py-2 text-xs text-yeonhwa">
            {error}
          </div>
        )}
      </div>

      {/* 하단 액션 버튼 */}
      <div className="sticky bottom-0 bg-[#0F0F18] border-t border-base-border px-5 py-3 space-y-2">
        {adopted && (
          <Link
            href="/editor"
            className="block w-full rounded-lg border border-seojin/30 px-4 py-2 text-center text-xs text-seojin hover:bg-seojin/10 transition-colors"
          >
            편집기에서 보기
          </Link>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleAdopt}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              adopted
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                : 'bg-base-tertiary text-text-secondary border border-base-border hover:bg-seojin/20 hover:text-seojin hover:border-seojin/30'
            }`}
          >
            {adopted ? '채택됨 (취소)' : '채택'}
          </button>
          {detailScene && (
            <button
              onClick={generateDetail}
              disabled={isGenerating}
              className="rounded-lg border border-base-border px-4 py-2.5 text-sm text-text-secondary hover:bg-base-tertiary transition-colors disabled:opacity-30"
            >
              재생성
            </button>
          )}
        </div>
        {detailScene && (
          <button
            onClick={() => deleteDetailScene(event.id)}
            className="w-full rounded-lg border border-base-border px-4 py-2 text-xs text-text-muted hover:text-yeonhwa hover:border-yeonhwa/30 transition-colors"
          >
            장면 삭제
          </button>
        )}
      </div>
    </div>
  );
}
