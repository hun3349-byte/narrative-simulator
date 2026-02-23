'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store/project-store';
import { PERSONA_ICONS } from '@/lib/presets/author-personas';
import type { Project } from '@/lib/types';
import {
  convertToWorldLayer,
  convertToCoreRulesLayer,
  convertToSeedsLayer,
  isWorldConfig,
  type WorldConfigData,
  type CharacterData,
  type LocationData,
  type FactionData,
} from '@/lib/utils/world-data-loader';
import { PERSONA_CLASSIC } from '@/lib/presets/author-personas';

// 모바일 감지 훅
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, selectProject, deleteProject } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const worldDataInputRef = useRef<HTMLInputElement>(null);

  // Hydration 상태 - localStorage 로드 완료 전까지 로딩 표시
  const [isHydrated, setIsHydrated] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 모바일 감지
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 프로젝트 내보내기 (JSON 다운로드)
  const handleExport = (project: Project) => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `narrative-${project.genre}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 전체 프로젝트 내보내기
  const handleExportAll = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      projects,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `narrative-all-projects-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 프로젝트 불러오기 (JSON 업로드)
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);

        // 단일 프로젝트 또는 프로젝트 배열 지원
        if (data.project) {
          // 단일 프로젝트 불러오기
          const imported = data.project as Project;
          // 새 ID 생성 (중복 방지)
          imported.id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          imported.createdAt = new Date().toISOString();
          imported.updatedAt = new Date().toISOString();

          useProjectStore.setState(state => ({
            projects: [...state.projects, imported],
          }));
          alert('프로젝트를 불러왔습니다.');
        } else if (data.projects && Array.isArray(data.projects)) {
          // 복수 프로젝트 불러오기
          const importedProjects = (data.projects as Project[]).map(p => ({
            ...p,
            id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          useProjectStore.setState(state => ({
            projects: [...state.projects, ...importedProjects],
          }));
          alert(`${importedProjects.length}개의 프로젝트를 불러왔습니다.`);
        } else {
          alert('올바른 프로젝트 파일이 아닙니다.');
        }
      } catch {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }

      // 입력 초기화 (같은 파일 재선택 가능)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // 세계관 데이터 불러오기 (JSON 파일들 → 새 프로젝트 생성)
  const handleWorldDataImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      // 1. 단일 파일인지 복수 파일인지 확인
      const fileArray = Array.from(files);

      // 파일들 파싱
      const parsedData: Record<string, unknown> = {};

      for (const file of fileArray) {
        const content = await file.text();
        const data = JSON.parse(content);
        const fileName = file.name.replace('.json', '');
        parsedData[fileName] = data;
      }

      // 2. 필요한 데이터 식별
      let worldConfig: WorldConfigData | null = null;
      let characters: CharacterData | null = null;
      let locations: LocationData | null = null;
      const factions: FactionData[] = [];

      // 파일명 또는 데이터 내용으로 타입 식별
      for (const [key, value] of Object.entries(parsedData)) {
        if (key === 'world-config' || key === 'worldConfig' || isWorldConfig(value)) {
          worldConfig = value as WorldConfigData;
        } else if (key === 'characters') {
          characters = value as CharacterData;
        } else if (key === 'locations') {
          locations = value as LocationData;
        } else if (key.startsWith('factions-') || key.startsWith('faction-')) {
          factions.push(value as FactionData);
        } else if (key.startsWith('antagonist-')) {
          // 배후세력도 faction으로 취급
          factions.push(value as FactionData);
        }
      }

      // 3. 필수 데이터 확인
      if (!worldConfig) {
        alert('world-config.json 파일이 필요합니다. 세계관 기본 설정 파일을 포함해주세요.');
        return;
      }

      // 4. 레이어 데이터로 변환
      const worldLayer = convertToWorldLayer(
        worldConfig,
        locations || { factionTerritories: {}, conflictZones: [] }
      );
      const coreRulesLayer = convertToCoreRulesLayer(worldConfig);
      const seedsLayer = convertToSeedsLayer(
        worldConfig,
        characters || { protagonists: [], legends: {}, currentPowers: {} },
        factions
      );

      // 5. 새 프로젝트 생성
      const newProjectId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newProject: Project = {
        id: newProjectId,
        genre: worldConfig.genre || '무협',
        tone: '진지한',
        viewpoint: '3인칭 작가',
        direction: `${worldConfig.worldName} 세계관 기반 프로젝트`,
        authorPersona: PERSONA_CLASSIC,
        layers: {
          world: { status: 'confirmed', data: worldLayer },
          coreRules: { status: 'confirmed', data: coreRulesLayer },
          seeds: { status: 'confirmed', data: seedsLayer },
          heroArc: { status: 'pending', data: null },
          villainArc: { status: 'pending', data: null },
          ultimateMystery: { status: 'pending', data: null },
        },
        currentLayer: 'heroArc', // 다음 단계부터 시작
        currentPhase: 'worldbuilding',
        worldHistory: {
          eras: [],
          detailedDecades: [],
        },
        messages: [{
          id: `msg-${Date.now()}`,
          role: 'author',
          content: `${worldConfig.worldName}(${worldConfig.worldNameChinese}) 세계관 데이터를 불러왔어.\n\n세계관의 기본 틀은 잡혔으니까, 이제 이 세계에서 활약할 주인공의 서사를 만들어볼까?\n\n주인공에 대해 어떤 아이디어가 있어? 아니면 내가 먼저 제안해볼까?`,
          timestamp: new Date().toISOString(),
        }],
        characters: [],
        seeds: [],
        memoryStacks: {},
        profiles: {},
        npcPool: { npcs: [], maxActive: 30 },
        episodes: [],
        feedbackHistory: [],
        simulationStatus: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 6. 스토어에 프로젝트 추가
      useProjectStore.setState(state => ({
        projects: [...state.projects, newProject],
      }));

      alert(`${worldConfig.worldName} 세계관을 불러왔습니다. (${factions.length}개 세력, ${characters?.protagonists?.length || 0}명 캐릭터)`);

      // 7. 새 프로젝트로 이동
      selectProject(newProjectId);
      router.push(`/projects/${newProjectId}`);

    } catch (error) {
      console.error('World data import error:', error);
      alert('세계관 데이터를 불러오는 중 오류가 발생했습니다. JSON 파일 형식을 확인해주세요.');
    }

    // 입력 초기화
    if (worldDataInputRef.current) {
      worldDataInputRef.current.value = '';
    }
  };

  const handleProjectClick = (id: string) => {
    selectProject(id);
    router.push(`/projects/${id}`);
  };

  const handleNewProject = () => {
    router.push('/projects/new');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('이 프로젝트를 삭제하시겠습니까?')) {
      deleteProject(id);
    }
  };

  const getProgressText = (project: typeof projects[0]) => {
    const layerNames = ['world', 'coreRules', 'seeds', 'heroArc', 'villainArc', 'ultimateMystery'] as const;
    const confirmedCount = layerNames.filter(
      name => project.layers[name].status === 'confirmed'
    ).length;

    if (confirmedCount === 0) {
      return '세계 구축 시작 전';
    } else if (confirmedCount < 6) {
      return `레이어 ${confirmedCount}/6 완료`;
    } else if (project.episodes.length === 0) {
      return '시뮬레이션 대기';
    } else {
      return `${project.episodes.length}화 집필 완료`;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  // Hydration 중에는 빈 UI 표시 (서버/클라이언트 불일치 방지)
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-base-primary p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="font-serif text-3xl text-text-primary">내 프로젝트</h1>
            <div className="h-10 w-32 animate-pulse rounded-lg bg-base-tertiary" />
          </div>
          <div className="text-center text-text-muted">불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-primary p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6 md:mb-8 flex items-center justify-between gap-3">
          <h1 className="font-serif text-xl md:text-3xl text-text-primary">내 프로젝트</h1>
          <div className="flex gap-2 md:gap-3 flex-shrink-0">
            {/* 숨겨진 파일 입력 - 프로젝트 */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            {/* 숨겨진 파일 입력 - 세계관 데이터 (복수 파일) */}
            <input
              ref={worldDataInputRef}
              type="file"
              accept=".json"
              multiple
              onChange={handleWorldDataImport}
              className="hidden"
            />

            {/* 데스크톱: 모든 버튼 표시 */}
            <div className="hidden md:flex gap-3">
              <button
                onClick={() => worldDataInputRef.current?.click()}
                className="rounded-lg border border-seojin/50 px-4 py-2.5 text-sm text-seojin transition-colors hover:bg-seojin/10"
                title="data/ 폴더의 JSON 파일들을 불러와 새 프로젝트 생성"
              >
                📚 세계관 불러오기
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-base-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-base-tertiary hover:text-text-primary"
              >
                불러오기
              </button>
              {projects.length > 0 && (
                <button
                  onClick={handleExportAll}
                  className="rounded-lg border border-base-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-base-tertiary hover:text-text-primary"
                >
                  전체 내보내기
                </button>
              )}
            </div>

            {/* 모바일: 메뉴 버튼 */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="rounded-lg border border-base-border p-2.5 text-text-secondary hover:bg-base-tertiary min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ⋯
              </button>
            </div>

            {/* 모바일 드롭다운 메뉴 - fixed 위치로 화면 중앙에 표시 */}
            {showMobileMenu && (
              <>
                {/* 오버레이 */}
                <div
                  className="fixed inset-0 z-40 md:hidden"
                  onClick={() => setShowMobileMenu(false)}
                />
                <div className="mobile-menu md:hidden" style={{ top: '120px' }}>
                  <button
                    onClick={() => {
                      worldDataInputRef.current?.click();
                      setShowMobileMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-base text-seojin hover:bg-seojin/10 rounded-lg min-h-[48px] flex items-center gap-2"
                  >
                    <span>📚</span> 세계관 불러오기
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowMobileMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-base text-text-secondary hover:bg-base-tertiary rounded-lg min-h-[48px] flex items-center gap-2"
                  >
                    <span>📁</span> 프로젝트 불러오기
                  </button>
                  {projects.length > 0 && (
                    <button
                      onClick={() => {
                        handleExportAll();
                        setShowMobileMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-base text-text-secondary hover:bg-base-tertiary rounded-lg min-h-[48px] flex items-center gap-2"
                    >
                      <span>💾</span> 전체 내보내기
                    </button>
                  )}
                </div>
              </>
            )}

            {/* 새 프로젝트 버튼 - 항상 표시 */}
            <button
              onClick={handleNewProject}
              className="rounded-lg bg-seojin px-4 md:px-6 py-2.5 font-medium text-white transition-colors hover:bg-seojin/90 min-h-[44px]"
            >
              + 새 프로젝트
            </button>
          </div>
        </div>

        {/* 프로젝트 목록 */}
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-border bg-base-secondary p-8 md:p-12 text-center">
            <div className="mb-4 text-4xl md:text-5xl">📖</div>
            <div className="mb-2 text-base md:text-lg text-text-primary">아직 프로젝트가 없습니다</div>
            <div className="mb-6 text-sm md:text-base text-text-muted">
              새 프로젝트를 만들어 웹소설을 시작해보세요
            </div>
            <button
              onClick={handleNewProject}
              className="rounded-lg bg-seojin px-6 py-3 font-medium text-white transition-colors hover:bg-seojin/90 active:scale-95 min-h-[48px]"
            >
              첫 프로젝트 만들기
            </button>
          </div>
        ) : (
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className="group cursor-pointer rounded-xl border border-base-border bg-base-secondary p-4 md:p-6 transition-all hover:border-seojin hover:shadow-lg active:scale-[0.98]"
              >
                {/* 헤더 */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-lg md:text-xl flex-shrink-0">
                      {PERSONA_ICONS[project.authorPersona.id] || '✍️'}
                    </span>
                    <span className="font-medium text-text-primary text-sm md:text-base truncate">
                      {project.authorPersona.name}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExport(project); }}
                      className="rounded p-2 text-text-muted hover:bg-base-tertiary hover:text-seojin min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center"
                      title="내보내기"
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, project.id)}
                      className="rounded p-2 text-text-muted hover:bg-base-tertiary hover:text-red-400 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center"
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* 제목/방향 */}
                {project.direction && (
                  <div className="mb-3 font-serif text-sm text-text-primary line-clamp-2">
                    {project.direction}
                  </div>
                )}

                {/* 장르/톤 */}
                <div className="mb-3 flex gap-2">
                  <span className="rounded-full bg-base-tertiary px-3 py-1 text-sm text-text-secondary">
                    {project.genre}
                  </span>
                  <span className="rounded-full bg-base-tertiary px-3 py-1 text-sm text-text-secondary">
                    {project.tone}
                  </span>
                </div>

                {/* 진행 상태 */}
                <div className="mb-2 text-sm text-text-primary">
                  {getProgressText(project)}
                </div>

                {/* 마지막 수정 */}
                <div className="text-xs text-text-muted">
                  마지막 수정: {formatDate(project.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
