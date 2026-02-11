'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { getCharacterColor } from '@/lib/utils/character-display';
import { Relationship } from '@/lib/types';
import Link from 'next/link';

// Generate circular positions for N characters
function computeNodePositions(charIds: string[]): Record<string, { x: number; y: number }> {
  const cx = 250, cy = 200, r = 150;
  const positions: Record<string, { x: number; y: number }> = {};
  charIds.forEach((id, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / charIds.length;
    positions[id] = {
      x: Math.round(cx + r * Math.cos(angle)),
      y: Math.round(cy + r * Math.sin(angle)),
    };
  });
  return positions;
}

// Generate all unique edges for N characters
function computeEdges(charIds: string[]): [string, string][] {
  const edges: [string, string][] = [];
  for (let i = 0; i < charIds.length; i++) {
    for (let j = i + 1; j < charIds.length; j++) {
      edges.push([charIds[i], charIds[j]]);
    }
  }
  return edges;
}

export default function RelationshipGraph() {
  const { events, characters, seeds } = useSimulationStore();
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  // Load relationships from project config
  useEffect(() => {
    try {
      const configStr = localStorage.getItem('narrative-project-config');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.relationships) setRelationships(config.relationships);
      }
    } catch { /* ignore */ }
  }, []);

  const charIds = useMemo(() => characters.map(c => c.id), [characters]);
  const nodePositions = useMemo(() => computeNodePositions(charIds), [charIds]);
  const edges = useMemo(() => computeEdges(charIds), [charIds]);

  // 교차 이벤트 계산
  const crossEvents = useMemo(() => {
    const pairs: Record<string, { count: number; events: { title: string; year: number }[] }> = {};
    events.forEach((e) => {
      if (e.relatedCharacters) {
        e.relatedCharacters.forEach((relId) => {
          const key = [e.characterId, relId].sort().join(':');
          if (!pairs[key]) pairs[key] = { count: 0, events: [] };
          pairs[key].count++;
          pairs[key].events.push({ title: e.title, year: e.year });
        });
      }
    });
    return pairs;
  }, [events]);

  // 캐릭터별 주요 이벤트
  const charEvents = useMemo(() => {
    const map: Record<string, { title: string; year: number }[]> = {};
    events.forEach((e) => {
      if (!map[e.characterId]) map[e.characterId] = [];
      if (e.importance !== 'minor') {
        map[e.characterId].push({ title: e.title, year: e.year });
      }
    });
    return map;
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
    <div className="relative">
      <svg viewBox="0 0 500 420" className="w-full max-w-2xl mx-auto">
        <defs>
          {edges.map(([a, b]) => {
            const key = [a, b].sort().join(':');
            const colorA = getCharacterColor(a, characters, seeds);
            const colorB = getCharacterColor(b, characters, seeds);
            return (
              <linearGradient key={`grad-${key}`} id={`grad-${key}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colorA} stopOpacity="0.6" />
                <stop offset="100%" stopColor={colorB} stopOpacity="0.6" />
              </linearGradient>
            );
          })}
        </defs>

        {/* 연결선 */}
        {edges.map(([a, b]) => {
          const key = [a, b].sort().join(':');
          const posA = nodePositions[a];
          const posB = nodePositions[b];
          const colorA = getCharacterColor(a, characters, seeds);
          const cross = crossEvents[key];
          const thickness = Math.max(1.5, Math.min(5, (cross?.count ?? 0) * 0.8));
          const midX = (posA.x + posB.x) / 2;
          const midY = (posA.y + posB.y) / 2;
          const isEdgeHovered = hoveredEdge === key;

          return (
            <g key={key}>
              <line
                x1={posA.x}
                y1={posA.y}
                x2={posB.x}
                y2={posB.y}
                stroke={`url(#grad-${key})`}
                strokeWidth={isEdgeHovered ? thickness + 2 : thickness}
                strokeLinecap="round"
                opacity={isEdgeHovered ? 1 : 0.5}
                className="transition-all duration-200"
              />
              <circle r="2" fill={colorA} opacity="0.6">
                <animateMotion
                  dur={`${4 + Math.random() * 2}s`}
                  repeatCount="indefinite"
                  path={`M${posA.x},${posA.y} L${posB.x},${posB.y}`}
                />
              </circle>
              <g
                onMouseEnter={() => setHoveredEdge(key)}
                onMouseLeave={() => setHoveredEdge(null)}
                className="cursor-pointer"
              >
                <rect
                  x={midX - 60}
                  y={midY - 12}
                  width="120"
                  height="24"
                  fill="transparent"
                />
                {(() => {
                  const rel = relationships.find(r =>
                    (r.characterIds[0] === a && r.characterIds[1] === b) ||
                    (r.characterIds[0] === b && r.characterIds[1] === a)
                  );
                  const label = rel?.dynamic || (cross && cross.count > 0 ? `${cross.count}회 교차` : '');
                  if (!label) return null;
                  return (
                    <text
                      x={midX}
                      y={midY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={rel?.dynamic ? '#7B6BA8' : '#A8A4B8'}
                      fontSize="9"
                      className="pointer-events-none"
                    >
                      {label}
                    </text>
                  );
                })()}
              </g>
              {isEdgeHovered && (() => {
                const rel = relationships.find(r =>
                  (r.characterIds[0] === a && r.characterIds[1] === b) ||
                  (r.characterIds[0] === b && r.characterIds[1] === a)
                );
                const hasDynamic = rel?.dynamic || rel?.frictionPoints?.length || rel?.resonancePoints?.length;
                const hasContent = (cross && cross.events.length > 0) || hasDynamic;
                if (!hasContent) return null;
                return (
                  <foreignObject x={midX - 100} y={midY + 14} width="200" height="200">
                    <div className="rounded-md bg-base-card border border-base-border p-2 text-[10px] text-text-secondary shadow-lg space-y-1.5">
                      {rel?.dynamic && (
                        <p className="font-medium text-seojin">{rel.dynamic}</p>
                      )}
                      {rel?.frictionPoints && rel.frictionPoints.length > 0 && (
                        <div>
                          <span className="text-yeonhwa font-medium">충돌:</span>
                          {rel.frictionPoints.map((f, i) => (
                            <p key={i} className="ml-1 text-text-muted">{f}</p>
                          ))}
                        </div>
                      )}
                      {rel?.resonancePoints && rel.resonancePoints.length > 0 && (
                        <div>
                          <span className="text-emerald-400 font-medium">공명:</span>
                          {rel.resonancePoints.map((r, i) => (
                            <p key={i} className="ml-1 text-text-muted">{r}</p>
                          ))}
                        </div>
                      )}
                      {cross && cross.events.length > 0 && (
                        <div>
                          <p className="font-medium text-text-primary">교차 이벤트 ({cross.count})</p>
                          {cross.events.slice(0, 5).map((ev, i) => (
                            <p key={i} className="truncate">{ev.year}년 - {ev.title}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </foreignObject>
                );
              })()}
            </g>
          );
        })}

        {/* 캐릭터 노드 */}
        {charIds.map((charId) => {
          const pos = nodePositions[charId];
          const color = getCharacterColor(charId, characters, seeds);
          const char = characters.find((c) => c.id === charId);
          const isHov = hovered === charId;

          return (
            <g
              key={charId}
              onMouseEnter={() => setHovered(charId)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isHov ? 48 : 42}
                fill={`${color}15`}
                stroke={color}
                strokeWidth={isHov ? 2.5 : 1.5}
                className="transition-all duration-200"
              />
              <circle cx={pos.x} cy={pos.y} r="28" fill={`${color}30`} />
              <text x={pos.x} y={pos.y - 6} textAnchor="middle" fill={color} fontSize="13" fontWeight="bold">
                {char?.name ?? charId}
              </text>
              <text x={pos.x} y={pos.y + 10} textAnchor="middle" fill="#A8A4B8" fontSize="9">
                {char?.alias ?? ''}
              </text>
              {char && (
                <text x={pos.x} y={pos.y + 56} textAnchor="middle" fill="#6B6880" fontSize="8">
                  {char.emotionalState.primary}
                </text>
              )}

              {isHov && charEvents[charId] && (
                <foreignObject x={pos.x - 80} y={pos.y + 62} width="160" height="120">
                  <div className="rounded-md bg-base-card border border-base-border p-2 text-[10px] text-text-secondary shadow-lg">
                    <p className="font-medium text-text-primary mb-1">주요 이벤트</p>
                    {charEvents[charId].slice(0, 5).map((ev, i) => (
                      <p key={i} className="truncate">{ev.year}년 - {ev.title}</p>
                    ))}
                    <Link href="/timeline" className="block mt-1 text-seojin hover:underline">
                      타임라인에서 보기
                    </Link>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
