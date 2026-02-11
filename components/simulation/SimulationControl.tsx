'use client';

import { useState } from 'react';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { ProgressUpdate, SimulationConfig, Character, CharacterArc, MasterArc, NPCPool, Memory, EmergentProfile, StorylinePreview, IntegratedStoryline, SimulationRun, AuthorNarrativeArc } from '@/lib/types';
import { buildColorMap } from '@/lib/utils/character-display';
import SimulationConfigModal from './SimulationConfigModal';

export default function SimulationControl() {
  const {
    isRunning, currentYear, progress,
    setRunning, setCurrentYear, setProgress,
    addEvents, characters, events,
    reset, setCharacters, worldEvents: storeWorldEvents,
    seeds, memoryStacks,
    setMemoryStacks, setProfiles,
    grammarConfig, characterArcs, masterArc,
    setCharacterArcs, setMasterArc,
    npcPool, setNPCPool,
    storyDirectorConfig,
    narrativeArcs, setNarrativeArcs,
    simulationStatus, sessionId, monitorConfig,
    setSimulationStatus, setSessionId,
    setStorylinePreview, setIntegratedStoryline,
    setPendingWarning, addSimulationRun,
  } = useSimulationStore();

  const [showConfig, setShowConfig] = useState(false);
  const [logs, setLogs] = useState<ProgressUpdate[]>([]);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const startSimulation = async (config: SimulationConfig) => {
    setShowConfig(false);
    setRunning(true);
    setLogs([]);
    setApiKeyMissing(false);

    const continueFromExisting = config.continueFromExisting;

    if (!continueFromExisting) {
      // Keep custom characters if they exist (from /create)
      const prevChars = characters;
      const prevSeeds = seeds;
      const prevMemoryStacks = memoryStacks;
      reset();
      // Restore custom characters (from /create wizard) — default preset characters will be reloaded anyway
      if (prevChars.length > 0) {
        setCharacters(prevChars);
      }
      // Restore seeds if we had them
      if (prevSeeds.length > 0) {
        useSimulationStore.getState().setSeeds(prevSeeds);
        if (Object.keys(prevMemoryStacks).length > 0) {
          setMemoryStacks(prevMemoryStacks);
        }
      }
    }

    // Use store worldEvents if available (custom project), fallback to config
    const finalConfig = {
      ...config,
      worldEvents: storeWorldEvents.length > 0 ? storeWorldEvents : config.worldEvents,
    };

    // Determine if V2 (seeds present)
    const activeSeeds = useSimulationStore.getState().seeds;
    const activeMemoryStacks = useSimulationStore.getState().memoryStacks;
    const activeGrammarConfig = useSimulationStore.getState().grammarConfig;
    const activeCharacterArcs = useSimulationStore.getState().characterArcs;
    const activeMasterArc = useSimulationStore.getState().masterArc;

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: finalConfig,
          existingEvents: continueFromExisting ? events : undefined,
          existingCharacters: characters,
          ...(activeSeeds.length > 0 ? {
            seeds: activeSeeds,
            memoryStacks: continueFromExisting ? activeMemoryStacks : undefined,
          } : {}),
          ...(activeGrammarConfig?.enabled ? {
            grammarConfig: activeGrammarConfig,
            characterArcs: continueFromExisting ? activeCharacterArcs : undefined,
            masterArc: continueFromExisting ? activeMasterArc : undefined,
          } : {}),
          npcPool: continueFromExisting ? useSimulationStore.getState().npcPool : undefined,
          ...(useSimulationStore.getState().storyDirectorConfig?.enabled ? {
            storyDirectorConfig: useSimulationStore.getState().storyDirectorConfig,
            worldSettingsFull: (() => { try { const c = localStorage.getItem('narrative-project-config'); return c ? JSON.parse(c).worldSettings : undefined; } catch { return undefined; } })(),
          } : {}),
          monitorConfig: useSimulationStore.getState().monitorConfig,
          narrativeArcs: continueFromExisting ? useSimulationStore.getState().narrativeArcs : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.message?.includes('API_KEY')) {
          setApiKeyMissing(true);
        }
        setRunning(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { setRunning(false); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data: ProgressUpdate & {
              characters?: Character[];
              memoryStacks?: Record<string, Memory[]>;
              profiles?: Record<string, EmergentProfile>;
              characterArcs?: CharacterArc[];
              masterArc?: MasterArc;
              npcPool?: NPCPool;
              storylinePreviews?: Record<string, StorylinePreview>;
              integratedStoryline?: IntegratedStoryline;
              narrativeArcs?: Record<string, AuthorNarrativeArc>;
              type: string;
            } = JSON.parse(line.slice(6));

            setLogs(prev => [...prev, data as ProgressUpdate]);

            if (data.type === 'session_init' && data.sessionId) {
              setSessionId(data.sessionId);
              setSimulationStatus('running');
            }

            if (data.type === 'completed' && data.events) {
              addEvents(data.events);
            }

            if (data.type === 'year_start' && data.year !== undefined) {
              setCurrentYear(data.year);
            }

            if (data.progress !== undefined) {
              setProgress(data.progress);
            }

            if (data.type === 'storyline_preview' && data.storylinePreview) {
              setStorylinePreview(data.storylinePreview);
            }

            if (data.type === 'integrated_storyline' && data.integratedStoryline) {
              setIntegratedStoryline(data.integratedStoryline);
            }

            if (data.type === 'arc_designed' && data.narrativeArcs) {
              const arcsRecord: Record<string, AuthorNarrativeArc> = {};
              for (const arc of data.narrativeArcs) {
                arcsRecord[arc.characterId] = arc;
              }
              setNarrativeArcs(arcsRecord);
            }

            if (data.type === 'auto_paused') {
              setSimulationStatus('paused');
              if (data.integratedStoryline) {
                setPendingWarning(data.integratedStoryline);
              }
            }

            if (data.type === 'final_state') {
              if (data.characters) {
                setCharacters(data.characters);
              }
              if (data.memoryStacks) {
                setMemoryStacks(data.memoryStacks);
              }
              if (data.profiles) {
                setProfiles(data.profiles);
              }
              if (data.characterArcs) {
                setCharacterArcs(data.characterArcs);
              }
              if (data.masterArc) {
                setMasterArc(data.masterArc);
              }
              if (data.npcPool) {
                setNPCPool(data.npcPool);
              }
              if (data.narrativeArcs) {
                setNarrativeArcs(data.narrativeArcs);
              }
            }

            if (data.type === 'done') {
              setProgress(100);
              setRunning(false);
              // Record simulation run
              const store = useSimulationStore.getState();
              const run: SimulationRun = {
                runId: store.sessionId || `run-${Date.now()}`,
                startedAt: new Date(Date.now() - 60000).toISOString(),
                endedAt: new Date().toISOString(),
                status: data.message?.includes('중단') ? 'aborted' : 'completed',
                characterSnapshots: store.storylinePreviews,
                integratedStoryline: store.integratedStoryline || undefined,
                config: finalConfig,
                finalYear: store.currentYear,
              };
              addSimulationRun(run);
              setSimulationStatus(run.status);
              setSessionId(null);
            }

            if (data.type === 'error') {
              console.error('시뮬레이션 에러:', data.message);
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      setRunning(false);
    } catch (error) {
      console.error('시뮬레이션 실패:', error);
      setRunning(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 rounded-lg border border-base-border bg-base-card px-4 py-2">
        {/* 연도 표시 */}
        <div className="flex items-center gap-2">
          <span className="font-serif text-sm text-text-muted">시뮬레이션</span>
          <span className="font-serif text-xl font-bold text-text-primary">{currentYear}년</span>
        </div>

        <div className="h-6 w-px bg-base-border" />

        {/* 컨트롤 버튼 */}
        <div className="flex items-center gap-1">
          {/* 시뮬레이션 시작/일시정지/재개/중단 */}
          {!isRunning && simulationStatus !== 'paused' ? (
            <button
              onClick={() => setShowConfig(true)}
              className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors bg-seojin/20 text-seojin hover:bg-seojin/30"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                <path d="M2 1.5a.5.5 0 0 1 .75-.43l10 5.5a.5.5 0 0 1 0 .86l-10 5.5A.5.5 0 0 1 2 12.5v-11z" />
              </svg>
              시뮬레이션 시작
            </button>
          ) : simulationStatus === 'paused' ? (
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  if (sessionId) {
                    await fetch('/api/simulate/control', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sessionId, action: 'resume' }),
                    });
                    setSimulationStatus('running');
                  }
                }}
                className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M2 1.5a.5.5 0 0 1 .75-.43l10 5.5a.5.5 0 0 1 0 .86l-10 5.5A.5.5 0 0 1 2 12.5v-11z" />
                </svg>
                재개
              </button>
              <button
                onClick={async () => {
                  if (sessionId) {
                    await fetch('/api/simulate/control', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sessionId, action: 'abort' }),
                    });
                    setSimulationStatus('aborted');
                    setRunning(false);
                  }
                }}
                className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium bg-yeonhwa/20 text-yeonhwa hover:bg-yeonhwa/30"
              >
                중단
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  if (sessionId) {
                    await fetch('/api/simulate/control', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sessionId, action: 'pause' }),
                    });
                    setSimulationStatus('paused');
                  }
                }}
                className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="2" y="1" width="4" height="12" rx="1" />
                  <rect x="8" y="1" width="4" height="12" rx="1" />
                </svg>
                일시정지
              </button>
              <button
                onClick={async () => {
                  if (sessionId) {
                    await fetch('/api/simulate/control', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sessionId, action: 'abort' }),
                    });
                    setSimulationStatus('aborted');
                    setRunning(false);
                  }
                }}
                className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium bg-yeonhwa/20 text-yeonhwa hover:bg-yeonhwa/30"
              >
                중단
              </button>
            </div>
          )}

          {/* 리셋 */}
          <button
            onClick={() => { reset(); setLogs([]); }}
            disabled={isRunning}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-base-tertiary hover:text-text-primary disabled:opacity-30"
            title="리셋"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 7a6 6 0 1 1 1.5 3.9" strokeLinecap="round" />
              <path d="M1 11V7h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="h-6 w-px bg-base-border" />

        {/* 프로그레스 바 */}
        <div className="flex flex-1 items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-base-tertiary">
            <div
              className="h-full rounded-full bg-seojin transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-text-muted w-8 text-right">{Math.round(progress)}%</span>
        </div>

        {/* 상태 */}
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${
            simulationStatus === 'running' ? 'bg-green-500 animate-pulse' :
            simulationStatus === 'paused' ? 'bg-amber-500 animate-pulse' :
            simulationStatus === 'aborted' ? 'bg-yeonhwa' :
            progress === 100 ? 'bg-seojin' : 'bg-text-muted'
          }`} />
          <span className="text-xs text-text-secondary">
            {simulationStatus === 'running' ? '시뮬레이션 중' :
             simulationStatus === 'paused' ? '일시정지' :
             simulationStatus === 'aborted' ? '중단됨' :
             progress === 100 ? '완료' : '대기'}
          </span>
        </div>

        {/* V2 + Grammar 표시 */}
        {seeds.length > 0 && (
          <>
            <div className="h-6 w-px bg-base-border" />
            <span className="text-[10px] text-seojin/70 font-medium">경험 레이어</span>
          </>
        )}
        {grammarConfig?.enabled && (
          <>
            <div className="h-6 w-px bg-base-border" />
            <span className="text-[10px] text-amber-500/70 font-medium">서사 문법</span>
          </>
        )}
        {storyDirectorConfig?.enabled && (
          <>
            <div className="h-6 w-px bg-base-border" />
            <span className="text-[10px] text-emerald-500/70 font-medium">스토리 디렉터</span>
          </>
        )}
      </div>

      {/* API 키 미설정 경고 */}
      {apiKeyMissing && (
        <div className="mt-2 rounded-lg border border-yeonhwa/30 bg-yeonhwa/10 px-4 py-3 text-sm text-yeonhwa">
          ANTHROPIC_API_KEY가 설정되지 않았습니다. 프로젝트 루트의 <code className="rounded bg-yeonhwa/20 px-1">.env.local</code> 파일에 API 키를 설정하고 개발 서버를 재시작하세요.
        </div>
      )}

      {/* 실시간 로그 */}
      {logs.length > 0 && <SimulationLogInline logs={logs} />}

      {/* 설정 모달 */}
      {showConfig && (
        <SimulationConfigModal
          onStart={startSimulation}
          onClose={() => setShowConfig(false)}
          hasExistingData={events.length > 0}
        />
      )}
    </>
  );
}

function SimulationLogInline({ logs }: { logs: ProgressUpdate[] }) {
  return (
    <div className="mt-3 rounded-lg border border-base-border bg-[#0D0D14] p-4 max-h-[400px] overflow-y-auto terminal-log">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-green-500/50" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
          Generation Log
        </span>
      </div>

      <div className="space-y-1">
        {logs.map((log, idx) => (
          <LogEntry key={idx} log={log} />
        ))}
      </div>
    </div>
  );
}

function LogEntry({ log }: { log: ProgressUpdate }) {
  const { characters, seeds } = useSimulationStore();
  const colorMap = buildColorMap(characters, seeds);

  if (log.type === 'year_start') {
    return (
      <div className="text-[11px] py-1" style={{ color: '#FFD700' }}>
        {log.message}
      </div>
    );
  }

  if (log.type === 'generating') {
    const color = log.characterId ? colorMap[log.characterId] : '#888';
    return (
      <div className="text-[11px] flex items-center gap-1.5">
        <span className="animate-pulse" style={{ color }}>...</span>
        <span style={{ color }}>{log.characterName}</span>
        <span className="text-text-muted">{log.message?.replace(`${log.characterName}의 `, '')}</span>
      </div>
    );
  }

  if (log.type === 'completed') {
    const color = log.characterId ? colorMap[log.characterId] : '#888';
    return (
      <div className="text-[11px] flex items-center gap-1.5">
        <span style={{ color }}>&#10003;</span>
        <span style={{ color }}>{log.characterName}</span>
        <span className="text-text-secondary">{log.year}년 — {log.events?.length ?? 0}개 이벤트</span>
        {log.events?.map(e => (
          <span key={e.id} className="text-text-muted text-[10px]">[{e.title}]</span>
        ))}
      </div>
    );
  }

  if (log.type === 'cross_event') {
    return (
      <div className="text-[11px] flex items-center gap-1.5" style={{ color: '#FFD700' }}>
        <span>&#9889;</span>
        <span>{log.message}</span>
      </div>
    );
  }

  if (log.type === 'error') {
    return (
      <div className="text-[11px] text-yeonhwa flex items-center gap-1.5">
        <span>&#10007;</span>
        <span>{log.message}</span>
      </div>
    );
  }

  if (log.type === 'done') {
    return (
      <div className="text-[11px] py-1" style={{ color: '#4ADE80' }}>
        &#10003; {log.message}
      </div>
    );
  }

  if (log.type === 'storyline_preview') {
    return (
      <div className="text-[11px] flex items-center gap-1.5" style={{ color: '#A78BFA' }}>
        <span>&#9670;</span>
        <span>{log.message}</span>
      </div>
    );
  }

  if (log.type === 'integrated_storyline') {
    return (
      <div className="text-[11px] flex items-center gap-1.5" style={{ color: '#A78BFA' }}>
        <span>&#9733;</span>
        <span>{log.message}</span>
      </div>
    );
  }

  if (log.type === 'auto_paused') {
    return (
      <div className="text-[11px] py-1 text-amber-400">
        &#9888; {log.message}
      </div>
    );
  }

  if (log.type === 'session_init') {
    return (
      <div className="text-[11px] text-text-muted">
        &#9679; 세션 시작: {log.sessionId}
      </div>
    );
  }

  return null;
}
