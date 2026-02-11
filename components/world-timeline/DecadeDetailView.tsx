'use client';

import { DetailedDecade } from '@/lib/types';

interface DecadeDetailViewProps {
  decades: DetailedDecade[];
  heroName?: string;
  heroBirthYear?: number;
}

// 긴장도에 따른 색상
function getTensionColor(tension: number): string {
  if (tension >= 80) return 'text-red-600 bg-red-50';
  if (tension >= 60) return 'text-orange-600 bg-orange-50';
  if (tension >= 40) return 'text-yellow-600 bg-yellow-50';
  if (tension >= 20) return 'text-blue-600 bg-blue-50';
  return 'text-green-600 bg-green-50';
}

function getTensionLabel(tension: number): string {
  if (tension >= 80) return '극도로 위험';
  if (tension >= 60) return '위험';
  if (tension >= 40) return '불안정';
  if (tension >= 20) return '평온';
  return '안정';
}

export function DecadeDetailView({
  decades,
  heroName,
  heroBirthYear,
}: DecadeDetailViewProps) {
  if (!decades || decades.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        시대 상세 정보가 없습니다.
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-2">
        {heroName ? `${heroName}의 시대` : '주인공 시대'} 상세
      </h3>
      {heroBirthYear && (
        <p className="text-sm text-gray-500 mb-4">
          주인공 탄생: {heroBirthYear}년
        </p>
      )}

      {/* 10년 단위 카드 */}
      <div className="space-y-4">
        {decades.map((decade) => {
          const tensionColor = getTensionColor(decade.worldTension);
          const isHeroBorn = heroBirthYear &&
            decade.yearRange[0] <= heroBirthYear &&
            heroBirthYear <= decade.yearRange[1];

          return (
            <div
              key={decade.id}
              className={`
                border rounded-lg overflow-hidden
                ${isHeroBorn ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'}
              `}
            >
              {/* 헤더 */}
              <div className="bg-gray-50 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {decade.yearRange[0]}년 ~ {decade.yearRange[1]}년
                  </span>
                  {isHeroBorn && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                      주인공 탄생
                    </span>
                  )}
                </div>
                <div className={`px-2 py-1 rounded text-sm font-medium ${tensionColor}`}>
                  긴장도 {decade.worldTension}% ({getTensionLabel(decade.worldTension)})
                </div>
              </div>

              <div className="p-3 space-y-3">
                {/* 세력 상태 */}
                {decade.factionStates.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-2">세력 상태</div>
                    <div className="grid grid-cols-2 gap-2">
                      {decade.factionStates.map((faction, i) => (
                        <div
                          key={i}
                          className="p-2 bg-gray-50 rounded text-sm"
                        >
                          <div className="font-medium">{faction.factionName}</div>
                          <div className="text-gray-600 text-xs">{faction.status}</div>
                          <div className="mt-1">
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${faction.influence}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              영향력 {faction.influence}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 도시 상태 */}
                {decade.cityStates.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-2">도시 상태</div>
                    <div className="flex flex-wrap gap-2">
                      {decade.cityStates.map((city, i) => {
                        const cityTensionColor = getTensionColor(city.tension);
                        return (
                          <div
                            key={i}
                            className={`px-2 py-1 rounded text-sm ${cityTensionColor}`}
                            title={city.condition}
                          >
                            {city.cityName}
                            <span className="ml-1 opacity-70">({city.tension}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 주요 사건 */}
                {decade.majorEvents.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-2">주요 사건</div>
                    <ul className="space-y-1">
                      {decade.majorEvents.map((event, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          {event}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 복선 */}
                {decade.hints.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-purple-500 mb-2">깔린 복선</div>
                    <ul className="space-y-1">
                      {decade.hints.map((hint, i) => (
                        <li key={i} className="text-sm text-purple-600 flex items-start gap-2">
                          <span>🔮</span>
                          {hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
