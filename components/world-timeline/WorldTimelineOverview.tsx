'use client';

import { WorldHistoryEra } from '@/lib/types';

interface WorldTimelineOverviewProps {
  eras: WorldHistoryEra[];
  selectedEraId?: string;
  onSelectEra: (era: WorldHistoryEra) => void;
}

// 시대별 색상
const ERA_COLORS = [
  'bg-amber-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-red-500',
  'bg-green-500',
  'bg-indigo-500',
];

export function WorldTimelineOverview({
  eras,
  selectedEraId,
  onSelectEra,
}: WorldTimelineOverviewProps) {
  if (!eras || eras.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        세계 역사가 아직 생성되지 않았습니다.
      </div>
    );
  }

  // 전체 기간 계산
  const minYear = Math.min(...eras.map(e => e.yearRange[0]));
  const maxYear = Math.max(...eras.map(e => e.yearRange[1]));
  const totalSpan = maxYear - minYear;

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">세계 역사 타임라인</h3>

      {/* 축소 뷰 - 가로 타임라인 */}
      <div className="relative">
        {/* 타임라인 바 */}
        <div className="h-16 bg-gray-100 rounded-lg overflow-hidden flex">
          {eras.map((era, index) => {
            const startPercent = ((era.yearRange[0] - minYear) / totalSpan) * 100;
            const widthPercent = ((era.yearRange[1] - era.yearRange[0]) / totalSpan) * 100;
            const color = ERA_COLORS[index % ERA_COLORS.length];
            const isSelected = era.id === selectedEraId;

            return (
              <button
                key={era.id}
                onClick={() => onSelectEra(era)}
                className={`
                  relative h-full transition-all duration-200
                  ${color} ${isSelected ? 'ring-2 ring-black ring-offset-1 z-10' : 'hover:brightness-110'}
                `}
                style={{
                  width: `${widthPercent}%`,
                  marginLeft: index === 0 ? `${startPercent}%` : 0,
                }}
                title={`${era.name} (${era.yearRange[0]}~${era.yearRange[1]}년)`}
              >
                <div className="absolute inset-0 flex items-center justify-center px-1">
                  <span className="text-white text-xs font-medium truncate">
                    {era.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 연도 표시 */}
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{minYear}년</span>
          <span>{maxYear}년</span>
        </div>
      </div>

      {/* 시대 목록 (클릭 가능) */}
      <div className="mt-6 space-y-2">
        {eras.map((era, index) => {
          const isSelected = era.id === selectedEraId;
          const color = ERA_COLORS[index % ERA_COLORS.length];

          return (
            <button
              key={era.id}
              onClick={() => onSelectEra(era)}
              className={`
                w-full text-left p-3 rounded-lg border transition-all
                ${isSelected
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{era.name}</div>
                  <div className="text-sm text-gray-500">
                    {era.yearRange[0]}년 ~ {era.yearRange[1]}년 ({era.yearRange[1] - era.yearRange[0]}년간)
                  </div>
                </div>
                <div className="text-sm text-gray-400">{era.mood}</div>
              </div>

              {isSelected && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">{era.description}</p>

                  {era.keyEvents.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs font-medium text-gray-500 mb-1">핵심 사건</div>
                      <ul className="text-sm space-y-1">
                        {era.keyEvents.slice(0, 3).map((event, i) => (
                          <li key={i} className="text-gray-600">• {event}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {era.mysteryHints.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">떡밥 흔적</div>
                      <ul className="text-sm space-y-1">
                        {era.mysteryHints.map((hint, i) => (
                          <li key={i} className="text-purple-600">🔮 {hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
