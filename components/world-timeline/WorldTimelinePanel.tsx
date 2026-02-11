'use client';

import { useState } from 'react';
import { WorldHistoryEra, DetailedDecade, CharacterSeed, NarrativeEvent } from '@/lib/types';
import { WorldTimelineOverview } from './WorldTimelineOverview';
import { DecadeDetailView } from './DecadeDetailView';

interface WorldTimelinePanelProps {
  eras: WorldHistoryEra[];
  decades: DetailedDecade[];
  heroSeed?: CharacterSeed;
  characterEvents?: Record<string, NarrativeEvent[]>;
}

type ViewMode = 'overview' | 'decades' | 'character';

export function WorldTimelinePanel({
  eras,
  decades,
  heroSeed,
  characterEvents,
}: WorldTimelinePanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedEra, setSelectedEra] = useState<WorldHistoryEra | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const characterIds = characterEvents ? Object.keys(characterEvents) : [];

  return (
    <div className="h-full flex flex-col">
      {/* 탭 헤더 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setViewMode('overview')}
          className={`
            px-4 py-2 text-sm font-medium transition-colors
            ${viewMode === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          전체 역사
        </button>
        <button
          onClick={() => setViewMode('decades')}
          className={`
            px-4 py-2 text-sm font-medium transition-colors
            ${viewMode === 'decades'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          10년 단위
        </button>
        {characterIds.length > 0 && (
          <button
            onClick={() => setViewMode('character')}
            className={`
              px-4 py-2 text-sm font-medium transition-colors
              ${viewMode === 'character'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            캐릭터별
          </button>
        )}
      </div>

      {/* 뷰 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'overview' && (
          <WorldTimelineOverview
            eras={eras}
            selectedEraId={selectedEra?.id}
            onSelectEra={setSelectedEra}
          />
        )}

        {viewMode === 'decades' && (
          <DecadeDetailView
            decades={decades}
            heroName={heroSeed?.codename}
            heroBirthYear={heroSeed?.birthYear}
          />
        )}

        {viewMode === 'character' && (
          <CharacterTimelineView
            characterIds={characterIds}
            characterEvents={characterEvents || {}}
            eras={eras}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={setSelectedCharacterId}
          />
        )}
      </div>
    </div>
  );
}

// 캐릭터별 타임라인 뷰
interface CharacterTimelineViewProps {
  characterIds: string[];
  characterEvents: Record<string, NarrativeEvent[]>;
  eras: WorldHistoryEra[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
}

function CharacterTimelineView({
  characterIds,
  characterEvents,
  eras,
  selectedCharacterId,
  onSelectCharacter,
}: CharacterTimelineViewProps) {
  if (characterIds.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        캐릭터 시뮬레이션이 아직 실행되지 않았습니다.
      </div>
    );
  }

  const selectedEvents = selectedCharacterId
    ? characterEvents[selectedCharacterId] || []
    : [];

  // 이벤트를 연도별로 그룹화
  const eventsByYear = selectedEvents.reduce((acc, event) => {
    const year = event.year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {} as Record<number, NarrativeEvent[]>);

  const years = Object.keys(eventsByYear).map(Number).sort((a, b) => a - b);

  // 해당 연도가 속한 시대 찾기
  function findEra(year: number): WorldHistoryEra | undefined {
    return eras.find(e => e.yearRange[0] <= year && year <= e.yearRange[1]);
  }

  return (
    <div className="p-4">
      {/* 캐릭터 선택 */}
      <div className="mb-4">
        <div className="text-xs font-medium text-gray-500 mb-2">캐릭터 선택</div>
        <div className="flex flex-wrap gap-2">
          {characterIds.map(id => (
            <button
              key={id}
              onClick={() => onSelectCharacter(selectedCharacterId === id ? null : id)}
              className={`
                px-3 py-1.5 rounded-full text-sm transition-colors
                ${selectedCharacterId === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      {/* 캐릭터 타임라인 */}
      {selectedCharacterId && (
        <div className="space-y-3">
          {years.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              이벤트가 없습니다.
            </div>
          ) : (
            years.map(year => {
              const era = findEra(year);
              const events = eventsByYear[year];

              return (
                <div key={year} className="border rounded-lg overflow-hidden">
                  {/* 연도 헤더 */}
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <span className="font-medium">{year}년</span>
                    {era && (
                      <span className="text-xs text-gray-500">
                        {era.name}
                      </span>
                    )}
                  </div>

                  {/* 이벤트 목록 */}
                  <div className="divide-y divide-gray-100">
                    {events.map(event => (
                      <div key={event.id} className="p-3">
                        <div className="flex items-start gap-2">
                          <span className={`
                            text-lg
                            ${event.importance === 'turning_point' ? 'text-amber-500' : ''}
                            ${event.importance === 'major' ? 'text-blue-500' : ''}
                            ${event.importance === 'minor' ? 'text-gray-400' : ''}
                          `}>
                            {event.importance === 'turning_point' ? '★' : '○'}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{event.title}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {event.summary}
                            </div>
                            {event.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {event.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {event.season}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {!selectedCharacterId && (
        <div className="text-center text-gray-500 py-8">
          캐릭터를 선택하면 타임라인을 볼 수 있습니다.
        </div>
      )}
    </div>
  );
}
