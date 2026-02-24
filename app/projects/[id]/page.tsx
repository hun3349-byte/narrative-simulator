'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProjectStore } from '@/lib/store/project-store';
import { PERSONA_ICONS } from '@/lib/presets/author-personas';
import { WorldTimelinePanel } from '@/components/world-timeline';
import EpisodeViewer from '@/components/episode/EpisodeViewer';
import EpisodeDirectionModal from '@/components/episode/EpisodeDirectionModal';
import type { LayerName, Episode, Character, SimulationConfig, WorldEvent, CharacterSeed, FactCheckResult, BreadcrumbWarning, EpisodeLog, WritingMemory, NPCSeedInfo, SimulationNPC, SeedsLayer, EpisodeDirection, HeroArcLayer, VillainArcLayer, WorldHistoryEra, DetailedDecade } from '@/lib/types';
import { trackBreadcrumbs, generateBreadcrumbInstructions } from '@/lib/utils/breadcrumb-tracker';
import { buildActiveContext } from '@/lib/utils/active-context';
import { createEmptyWritingMemory, updateQualityTracker, processFeedback, analyzeEdit, integrateEditPatterns, getWritingMemoryStats } from '@/lib/utils/writing-memory';
import { parseCharacterFile, toNPCSeedInfo, generateExampleTxt, ParseResult, ParsedCharacter } from '@/lib/utils/character-txt-parser';
import WorldSettingsEditor from '@/components/world/WorldSettingsEditor';
import TimelineEditor from '@/components/world/TimelineEditor';

// SSE 스트리밍 헬퍼 함수
async function streamingFetch(
  url: string,
  body: unknown,
  onText?: (text: string) => void,
): Promise<{ type: string; [key: string]: unknown }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('스트림을 읽을 수 없습니다');

  const decoder = new TextDecoder();
  let finalResult: { type: string; [key: string]: unknown } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'text' && onText) {
            onText(data.content);
          } else if (data.type === 'done' || data.type === 'error') {
            finalResult = data;
          }
        } catch {
          // JSON 파싱 실패는 무시
        }
      }
    }
  }

  if (!finalResult) {
    throw new Error('응답을 받지 못했습니다');
  }

  return finalResult;
}

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

const LAYER_LABELS: Record<LayerName, string> = {
  world: '세계',
  coreRules: '규칙',
  seeds: '씨앗',
  heroArc: '주인공',
  villainArc: '빌런',
  ultimateMystery: '떡밥',
  novel: '소설',
};

const LAYER_ORDER: LayerName[] = [
  'world',
  'coreRules',
  'seeds',
  'heroArc',
  'villainArc',
  'ultimateMystery',
  'novel',
];

// 레이어 키워드 매핑 (사용자 메시지에서 레이어 감지)
const LAYER_KEYWORDS: Record<string, LayerName> = {
  '세계': 'world',
  '대륙': 'world',
  '지형': 'world',
  '도시': 'world',
  '규칙': 'coreRules',
  '힘의 체계': 'coreRules',
  '마법': 'coreRules',
  '무공': 'coreRules',
  '종족': 'coreRules',
  '씨앗': 'seeds',
  '세력': 'seeds',
  'npc': 'seeds',
  '주인공': 'heroArc',
  '히어로': 'heroArc',
  '빌런': 'villainArc',
  '악당': 'villainArc',
  '적': 'villainArc',
  '떡밥': 'ultimateMystery',
  '반전': 'ultimateMystery',
  '미스터리': 'ultimateMystery',
  '비밀': 'ultimateMystery',
};

// 사용자 메시지에서 레이어 감지
function detectLayerFromMessage(message: string): LayerName | null {
  const lowerMessage = message.toLowerCase();

  // "X 다시", "X 수정", "X 변경" 패턴 감지
  const modifyPatterns = ['다시', '수정', '변경', '바꿔', '고쳐'];
  const hasModifyIntent = modifyPatterns.some(p => lowerMessage.includes(p));

  if (!hasModifyIntent) return null;

  for (const [keyword, layer] of Object.entries(LAYER_KEYWORDS)) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      return layer;
    }
  }

  return null;
}

export default function ProjectConversationPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const {
    selectProject,
    getCurrentProject,
    addMessage,
    updateLayer,
    confirmLayer,
    reopenLayer,
    setCurrentLayer,
    setWorldHistory,
    setCurrentPhase,
    updateEpisode,
    addEpisode,
    addFeedback,
    getRecurringFeedback,
    setCharacters,
    setSeeds,
    setProfiles,
    setWorldBible,
    addEpisodeLog,
    getWritingMemory,
    updateWritingMemory,
  } = useProjectStore();

  // Hydration 상태 - 클라이언트에서 localStorage 로드 완료 전까지 로딩 표시
  const [isHydrated, setIsHydrated] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('작가가 생각하고 있어');
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);
  const [sideTab, setSideTab] = useState<'world' | 'timeline' | 'character' | 'manuscript'>('world');
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [isRevising, setIsRevising] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [factCheckResult, setFactCheckResult] = useState<FactCheckResult | null>(null);
  const [breadcrumbWarnings, setBreadcrumbWarnings] = useState<BreadcrumbWarning[]>([]);
  const [showFactCheckModal, setShowFactCheckModal] = useState(false);
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showAddCharacterModal, setShowAddCharacterModal] = useState(false);
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [currentEpisodeDirection, setCurrentEpisodeDirection] = useState<EpisodeDirection | null>(null);
  const [newCharacter, setNewCharacter] = useState<Partial<NPCSeedInfo>>({
    name: '',
    role: '',
    location: '',
    personality: '',
    hiddenMotivation: '',
    faction: '',
    appearance: '',
    speechPattern: '',
    backstory: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const characterFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const layerBarRef = useRef<HTMLDivElement>(null);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 캐릭터 파일 업로드 관련 상태
  const [showCharacterUploadResult, setShowCharacterUploadResult] = useState(false);
  const [parsedCharacters, setParsedCharacters] = useState<ParsedCharacter[]>([]);
  const [characterUploadErrors, setCharacterUploadErrors] = useState<string[]>([]);
  const [selectedParsedCharacters, setSelectedParsedCharacters] = useState<Set<number>>(new Set());

  // 세계관 편집 상태
  const [showWorldEditor, setShowWorldEditor] = useState(false);

  // 타임라인 편집 상태
  const [showTimelineEditor, setShowTimelineEditor] = useState(false);

  // 모바일 감지
  const isMobile = useIsMobile();

  // Hydration 완료 체크 - 클라이언트 마운트 후에만 프로젝트 데이터 접근
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // hydration 전에는 null 반환
  const project = isHydrated ? getCurrentProject() : null;

  // 프로젝트 선택
  useEffect(() => {
    if (projectId) {
      selectProject(projectId);
    }
  }, [projectId, selectProject]);

  // 첫 진입 시 레이어 제안 생성
  useEffect(() => {
    if (project && project.messages.length === 0 && project.currentLayer === 'world') {
      generateLayerProposal('world');
    }
  }, [project?.id]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [project?.messages.length]);

  // 모바일 레이어바 자동 스크롤
  useEffect(() => {
    if (isMobile && layerBarRef.current && project) {
      const currentIndex = LAYER_ORDER.indexOf(project.currentLayer);
      const buttons = layerBarRef.current.querySelectorAll('button');
      if (buttons[currentIndex]) {
        buttons[currentIndex].scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [project?.currentLayer, isMobile]);

  // 로딩 타이머 관리
  useEffect(() => {
    if (isLoading) {
      setLoadingStartTime(Date.now());
      setShowTimeoutMessage(false);

      // 점 애니메이션
      let dots = 0;
      loadingIntervalRef.current = setInterval(() => {
        dots = (dots + 1) % 4;
        const dotsStr = '.'.repeat(dots);
        setLoadingMessage(`작가가 생각하고 있어${dotsStr}`);

        // 30초 경과 체크
        if (loadingStartTime && Date.now() - loadingStartTime > 30000) {
          setShowTimeoutMessage(true);
        }
      }, 500);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
      setLoadingStartTime(null);
      setShowTimeoutMessage(false);
    }

    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, [isLoading]);

  // 에피소드 작성 후 처리: Episode Log 생성 + Fact Check + 떡밥 경고
  const handlePostEpisodeCreation = useCallback(async (episode: Episode) => {
    if (!project) return;

    // 1. Episode Log 자동 생성
    try {
      const logResponse = await fetch('/api/generate-episode-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode,
          worldBible: project.worldBible,
          previousLogs: project.episodeLogs?.slice(-3) || [],
        }),
      });

      if (logResponse.ok) {
        const logData = await logResponse.json();
        if (logData.log) {
          addEpisodeLog(logData.log);
          console.log(`Episode ${episode.number} log generated`);
        }
      }
    } catch (error) {
      console.error('Episode log generation failed:', error);
    }

    // 2. Fact Check 실행
    if (project.worldBible) {
      try {
        const factCheckResponse = await fetch('/api/fact-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            worldBible: project.worldBible,
            episode,
          }),
        });

        if (factCheckResponse.ok) {
          const factCheckData = await factCheckResponse.json();
          if (factCheckData.result) {
            setFactCheckResult(factCheckData.result);
            // critical 또는 major 모순이 있으면 모달 표시
            if (factCheckData.result.hasContradictions &&
                (factCheckData.result.overallSeverity === 'critical' ||
                 factCheckData.result.overallSeverity === 'major')) {
              setShowFactCheckModal(true);
            }
          }
        }
      } catch (error) {
        console.error('Fact check failed:', error);
      }
    }

    // 3. 떡밥 경고 업데이트
    if (project.worldBible?.breadcrumbs) {
      const warnings = trackBreadcrumbs(project.worldBible.breadcrumbs, episode.number);
      setBreadcrumbWarnings(warnings);
    }
  }, [project, addEpisodeLog]);

  // 레이어 제안 생성 (스트리밍)
  const generateLayerProposal = useCallback(async (layer: LayerName) => {
    if (!project || layer === 'novel') return;

    setIsLoading(true);
    setLastError(null);

    const doGenerate = async () => {
      try {
        const data = await streamingFetch('/api/author-chat', {
          projectId: project.id,
          action: 'generate_layer',
          layer,
          genre: project.genre,
          tone: project.tone,
          viewpoint: project.viewpoint,
          authorPersonaId: project.authorPersona.id,
          direction: project.direction,
          previousLayers: {
            world: project.layers.world.data,
            coreRules: project.layers.coreRules.data,
            seeds: project.layers.seeds.data,
            heroArc: project.layers.heroArc.data,
            villainArc: project.layers.villainArc.data,
            ultimateMystery: project.layers.ultimateMystery.data,
          },
        });

        if (data.type === 'error') {
          throw new Error(data.message as string);
        }

        if (data.message) {
          // 환님 먼저 입력 방식: waitingForUserInput 플래그 확인
          const isWaitingForUser = data.waitingForUserInput === true;

          addMessage({
            role: 'author',
            content: data.message as string,
            layerData: data.layer as unknown,
            choices: isWaitingForUser ? undefined : [
              { label: '확정', action: 'confirm_layer' },
              { label: '다시 제안해줘', action: 'regenerate' },
            ],
          });

          if (data.layer) {
            updateLayer(layer, data.layer as Record<string, unknown>);
          }
        }
      } catch (error) {
        console.error('Layer proposal error:', error);
        const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        setLastError(errorMsg);
        setRetryAction(() => () => generateLayerProposal(layer));
        addMessage({
          role: 'author',
          content: `문제가 생겼어. (${errorMsg})`,
          choices: [{ label: '다시 시도', action: 'retry' }],
        });
      } finally {
        setIsLoading(false);
      }
    };

    await doGenerate();
  }, [project, addMessage, updateLayer]);

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setUploadedFileContent(content);
      setUploadedFileName(file.name);

      // 파일 내용 미리보기 메시지
      const isJson = file.name.endsWith('.json');
      const preview = content.length > 500 ? content.slice(0, 500) + '...' : content;

      addMessage({
        role: 'user',
        content: `📎 파일 업로드: ${file.name}\n\n${isJson ? '(JSON 데이터)' : preview}`,
      });

      // JSON 파일이면 바로 적용 여부 묻기
      if (isJson) {
        try {
          const jsonData = JSON.parse(content);
          addMessage({
            role: 'author',
            content: `파일을 확인했어. 이 데이터를 어떻게 할까?`,
            choices: [
              { label: '현재 레이어에 적용', action: 'apply_file_to_layer' },
              { label: '참고만 하고 새로 제안받기', action: 'reference_file' },
              { label: '취소', action: 'cancel_file' },
            ],
          });
        } catch {
          addMessage({
            role: 'author',
            content: `JSON 파싱에 실패했어. 파일 형식을 확인해줘.`,
          });
          setUploadedFileContent(null);
          setUploadedFileName(null);
        }
      } else {
        // TXT 파일이면 참고 자료로 사용
        addMessage({
          role: 'author',
          content: `텍스트 파일을 확인했어. 이 내용을 바탕으로 현재 레이어를 만들어볼까?`,
          choices: [
            { label: '이 내용으로 레이어 생성', action: 'generate_from_file' },
            { label: '참고만 할게', action: 'reference_file' },
            { label: '취소', action: 'cancel_file' },
          ],
        });
      }
    };
    reader.readAsText(file);

    // input 초기화 (같은 파일 다시 선택 가능하도록)
    event.target.value = '';
  }, [addMessage]);

  // 파일 업로드 버튼 클릭
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !project || isLoading) return;

    // 파일 내용이 있으면 메시지에 포함
    let userMessage = inputValue.trim();
    if (uploadedFileContent) {
      userMessage += `\n\n[참고 파일 내용]\n${uploadedFileContent}`;
      setUploadedFileContent(null);
      setUploadedFileName(null);
    }

    setInputValue('');
    setLastError(null);

    addMessage({
      role: 'user',
      content: inputValue.trim(), // 화면에는 원본만 표시
    });

    // 레이어 수정 요청 감지
    const targetLayer = detectLayerFromMessage(userMessage);

    if (targetLayer && targetLayer !== 'novel') {
      // 특정 레이어 수정 요청
      const layerStatus = project.layers[targetLayer as keyof typeof project.layers]?.status;

      if (layerStatus === 'confirmed' || layerStatus === 'drafting') {
        // 확정된 레이어 재수정
        reopenLayer(targetLayer as Exclude<LayerName, 'novel'>);
        addMessage({
          role: 'author',
          content: `알겠어, ${LAYER_LABELS[targetLayer]}를 다시 만들어볼게.`,
        });
        setTimeout(() => generateLayerProposal(targetLayer), 300);
        return;
      }
    }

    // 일반 메시지 처리
    setIsLoading(true);

    // novel 단계면 일반 대화, 아니면 레이어 수정
    const isNovelPhase = project.currentLayer === 'novel';

    const doSend = async () => {
      try {
        // 대화 기록 준비 (최근 25개)
        const conversationHistory = project.messages.slice(-25).map(m => ({
          role: m.role,
          content: m.content,
        }));

        // 세계 역사 요약 (생성되었으면)
        const worldHistory = project.worldHistory?.eras?.length
          ? {
              eras: project.worldHistory.eras.map(era => ({
                name: era.name,
                yearRange: era.yearRange,
                description: era.description,
              })),
            }
          : undefined;

        // 현재 에피소드 정보 (집필 중이면)
        const currentEpisode = project.episodes.length > 0
          ? {
              number: project.episodes[project.episodes.length - 1].number,
              title: project.episodes[project.episodes.length - 1].title,
              status: project.episodes[project.episodes.length - 1].status,
            }
          : undefined;

        // 누적 피드백 가져오기
        const recurringFeedback = getRecurringFeedback();

        // 스트리밍 호출
        const data = await streamingFetch('/api/author-chat', {
          projectId: project.id,
          action: isNovelPhase ? 'conversation' : 'revise_layer',
          layer: project.currentLayer,
          userMessage,
          genre: project.genre,
          tone: project.tone,
          viewpoint: project.viewpoint,
          authorPersonaId: project.authorPersona.id,
          direction: project.direction,
          currentPhase: project.currentPhase,
          conversationHistory: isNovelPhase ? conversationHistory : undefined,
          previousLayers: {
            world: project.layers.world.data,
            coreRules: project.layers.coreRules.data,
            seeds: project.layers.seeds.data,
            heroArc: project.layers.heroArc.data,
            villainArc: project.layers.villainArc.data,
            ultimateMystery: project.layers.ultimateMystery.data,
          },
          currentDraft: isNovelPhase ? undefined : project.layers[project.currentLayer as keyof typeof project.layers]?.data,
          worldHistory: isNovelPhase ? worldHistory : undefined,
          currentEpisode: isNovelPhase ? currentEpisode : undefined,
          episodesCount: isNovelPhase ? project.episodes.length : undefined,
          episodes: isNovelPhase ? project.episodes.slice(-3) : undefined,
          recurringFeedback: isNovelPhase ? recurringFeedback : undefined,
        });

        if (data.type === 'error') {
          throw new Error(data.message as string);
        }

        // 에피소드 응답 처리
        if (data.isEpisode && data.episode) {
          const episode = data.episode as Episode;
          addEpisode(episode);
          handlePostEpisodeCreation(episode);
          setEditingEpisodeId(episode.id);
          addMessage({
            role: 'author',
            content: (data.message as string) || `${episode.number}화 초안이야. 읽어봐.`,
            episode: episode,
            choices: [
              { label: '채택', action: 'adopt_episode' },
              { label: '수정 요청', action: 'request_revision' },
              { label: '직접 편집', action: 'direct_edit' },
            ],
          });
        } else if (data.message) {
          const layer = data.layer as Record<string, unknown> | null;
          const hasValidLayer = layer &&
            typeof layer === 'object' &&
            Object.keys(layer).length > 0;

          const showLayerButtons = project.currentLayer !== 'novel' &&
            project.currentPhase !== 'writing' &&
            (hasValidLayer || project.layers[project.currentLayer as keyof typeof project.layers]?.status === 'drafting');

          addMessage({
            role: 'author',
            content: data.message as string,
            layerData: hasValidLayer ? layer : undefined,
            choices: showLayerButtons ? [
              { label: '확정', action: 'confirm_layer' },
              { label: '다시 제안해줘', action: 'regenerate' },
            ] : undefined,
          });

          if (hasValidLayer && project.currentLayer !== 'novel') {
            updateLayer(project.currentLayer as Exclude<LayerName, 'novel'>, layer);
          }

          // 피드백이 감지되었으면 저장
          const feedback = data.feedback as { episodeNumber: number; type: string; content: string; isRecurring: boolean } | undefined;
          if (feedback) {
            addFeedback({
              episodeNumber: feedback.episodeNumber,
              type: feedback.type as 'style' | 'character' | 'plot' | 'pacing' | 'general',
              content: feedback.content,
              isRecurring: feedback.isRecurring,
            });
            console.log('Feedback saved:', feedback);
          }
        }
      } catch (error) {
        console.error('Send message error:', error);
        const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        setLastError(errorMsg);
        setRetryAction(() => handleSendMessage);
        addMessage({
          role: 'author',
          content: `문제가 생겼어. (${errorMsg})`,
          choices: [{ label: '다시 시도', action: 'retry' }],
        });
      } finally {
        setIsLoading(false);
      }
    };

    await doSend();
  };

  // 레이어 클릭 (진행 바에서)
  const handleLayerClick = (layer: LayerName) => {
    if (!project || layer === 'novel' || isLoading) return;

    const layerStatus = project.layers[layer as keyof typeof project.layers]?.status;

    if (layerStatus === 'confirmed') {
      // 확정된 레이어 재수정
      reopenLayer(layer as Exclude<LayerName, 'novel'>);
      addMessage({
        role: 'author',
        content: `${LAYER_LABELS[layer]}를 다시 수정할게. 어떤 부분을 바꾸고 싶어?`,
        choices: [
          { label: '전체 다시 제안해줘', action: `regenerate_${layer}` },
        ],
      });
    } else if (layerStatus === 'drafting' || layerStatus === 'pending') {
      // 현재 레이어로 이동 (아직 확정 안 된 경우)
      if (project.currentLayer !== layer) {
        setCurrentLayer(layer);
        if (layerStatus === 'pending') {
          generateLayerProposal(layer);
        }
      }
    }
  };

  // 선택지 클릭
  const handleChoiceClick = async (action: string) => {
    if (!project || isLoading) return;

    // 파일 관련 액션
    if (action === 'apply_file_to_layer' && uploadedFileContent) {
      if (project.currentLayer === 'novel') {
        addMessage({
          role: 'author',
          content: '소설 단계에서는 파일 적용이 안 돼. 세계관 레이어에서 사용해줘.',
        });
        return;
      }
      try {
        const jsonData = JSON.parse(uploadedFileContent);
        updateLayer(project.currentLayer as Exclude<LayerName, 'novel'>, jsonData);
        addMessage({
          role: 'author',
          content: `파일 데이터를 ${LAYER_LABELS[project.currentLayer]}에 적용했어. 내용을 확인하고 수정할 부분이 있으면 말해줘.`,
          choices: [
            { label: '이대로 확정', action: 'confirm_layer' },
            { label: '수정이 필요해', action: 'regenerate' },
          ],
        });
        setUploadedFileContent(null);
        setUploadedFileName(null);
      } catch {
        addMessage({
          role: 'author',
          content: '파일 적용에 실패했어. 다시 시도해줘.',
        });
      }
      return;
    }

    if (action === 'generate_from_file' && uploadedFileContent) {
      // TXT 파일 내용을 AI에게 전달하여 레이어 생성
      addMessage({
        role: 'user',
        content: `이 내용을 바탕으로 ${LAYER_LABELS[project.currentLayer]}를 만들어줘:\n\n${uploadedFileContent}`,
      });
      setUploadedFileContent(null);
      setUploadedFileName(null);
      // 일반 메시지 처리로 넘어감
      return;
    }

    if (action === 'reference_file') {
      addMessage({
        role: 'author',
        content: '알겠어, 참고만 할게. 계속 진행하자.',
      });
      // 파일 내용은 유지 (다음 요청에서 참고 가능)
      return;
    }

    if (action === 'cancel_file') {
      setUploadedFileContent(null);
      setUploadedFileName(null);
      addMessage({
        role: 'author',
        content: '취소했어. 다른 파일을 올리거나 직접 말해줘.',
      });
      return;
    }

    // 재시도
    if (action === 'retry' && retryAction) {
      retryAction();
      return;
    }

    // 특정 레이어 재생성 (regenerate_world, regenerate_coreRules 등)
    if (action.startsWith('regenerate_')) {
      const layer = action.replace('regenerate_', '') as LayerName;
      if (layer !== 'novel') {
        generateLayerProposal(layer);
      }
      return;
    }

    if (action === 'confirm_layer') {
      confirmLayer(project.currentLayer);

      // 다음 레이어로 이동
      const currentIndex = LAYER_ORDER.indexOf(project.currentLayer);
      if (currentIndex < LAYER_ORDER.length - 2) {
        const nextLayer = LAYER_ORDER[currentIndex + 1];
        addMessage({
          role: 'author',
          content: `좋아, ${LAYER_LABELS[project.currentLayer]}는 이렇게 가자. 이제 ${LAYER_LABELS[nextLayer]}을 만들어볼게.`,
        });
        setTimeout(() => generateLayerProposal(nextLayer), 500);
      } else if (currentIndex === LAYER_ORDER.length - 2) {
        // 마지막 레이어 (ultimateMystery) 확정 후
        addMessage({
          role: 'author',
          content: '좋아, 세계 구축이 끝났어. 이제 세계 역사를 생성하고 시뮬레이션을 시작할 준비가 됐어. 준비되면 말해줘.\n\n위에서 확정한 레이어를 수정하고 싶으면 상단 진행 바에서 클릭하거나, "떡밥 다시 수정해줘" 같이 말해줘.',
          choices: [
            { label: '시작하자', action: 'start_simulation' },
          ],
        });
      }
    } else if (action === 'regenerate') {
      addMessage({
        role: 'user',
        content: '다시 제안해줘',
      });
      generateLayerProposal(project.currentLayer);
    } else if (action === 'start_simulation') {
      // 세계 역사 + World Bible 생성 시작
      setIsLoading(true);
      setLastError(null);

      addMessage({
        role: 'author',
        content: 'World Bible을 생성하고 세계 역사를 준비하고 있어...',
      });

      const generateWorldBibleAndHistory = async () => {
        try {
          // 1. World Bible 생성 (스트리밍)
          try {
            const worldBibleData = await streamingFetch('/api/generate-world-bible', {
              layers: {
                world: project.layers.world.data,
                coreRules: project.layers.coreRules.data,
                seeds: project.layers.seeds.data,
                heroArc: project.layers.heroArc.data,
                villainArc: project.layers.villainArc.data,
                ultimateMystery: project.layers.ultimateMystery.data,
              },
            });

            if (worldBibleData.type === 'done' && worldBibleData.worldBible) {
              setWorldBible(worldBibleData.worldBible as import('@/lib/types').WorldBible);
              console.log('World Bible 생성 완료:', (worldBibleData.worldBible as { tokenCount?: number }).tokenCount, '토큰');
            } else if (worldBibleData.type === 'error') {
              console.warn('World Bible 생성 실패, 계속 진행:', worldBibleData.message);
            }
          } catch (error) {
            console.warn('World Bible 생성 실패, 계속 진행:', error);
          }

          // 2. 세계 역사 생성
          addMessage({
            role: 'author',
            content: '세계 역사를 생성하고 있어...',
          });

          const response = await fetch('/api/generate-world-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              genre: project.genre,
              tone: project.tone,
              authorPersonaId: project.authorPersona.id,
              world: project.layers.world.data,
              coreRules: project.layers.coreRules.data,
              seeds: project.layers.seeds.data,
              heroArc: project.layers.heroArc.data,
              ultimateMystery: project.layers.ultimateMystery.data,
              totalYears: 1000,
            }),
          });

          if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
          }

          const data = await response.json();

          if (data.error) {
            throw new Error(data.error);
          }

          // 세계 역사 저장
          if (data.eras && data.eras.length > 0) {
            setWorldHistory(data.eras, []);
            setCurrentPhase('simulation');

            addMessage({
              role: 'author',
              content: data.message || `${data.eras.length}개 시대의 역사가 완성됐어. 시뮬레이션을 하거나 바로 집필을 시작할 수 있어.`,
              choices: [
                { label: '바로 1화 쓰기', action: 'skip_to_writing' },
                { label: '시뮬레이션 시작', action: 'run_simulation' },
                { label: '역사 탭에서 확인', action: 'view_history' },
              ],
            });
          } else {
            throw new Error('역사 데이터가 비어 있어');
          }
        } catch (error) {
          console.error('World history generation error:', error);

          const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';

          setLastError(errorMsg);
          setRetryAction(() => () => handleChoiceClick('start_simulation'));

          addMessage({
            role: 'author',
            content: `문제가 생겼어. (${errorMsg})`,
            choices: [{ label: '다시 시도', action: 'retry' }],
          });
        } finally {
          setIsLoading(false);
        }
      };

      generateWorldBibleAndHistory();
    } else if (action === 'run_simulation') {
      // 캐릭터 시뮬레이션 시작
      setIsLoading(true);
      addMessage({
        role: 'author',
        content: '캐릭터 시뮬레이션을 시작할게. 캐릭터들의 인생을 시뮬레이션해서 입체적인 캐릭터를 만들어볼게.',
      });

      try {
        // 1. 레이어 데이터에서 캐릭터 생성
        const heroArcData = project.layers.heroArc.data as { name?: string; origin?: string; coreNarrative?: string; initialState?: string; ultimateGoal?: string } | null;
        const seedsData = project.layers.seeds.data as { npcs?: Array<{ name: string; role: string; personality?: string; hiddenMotivation?: string }> } | null;

        const characters: Character[] = [];
        const seeds: CharacterSeed[] = [];

        // 주인공 캐릭터 생성
        if (heroArcData?.name) {
          const heroId = 'hero-' + Date.now();
          characters.push({
            id: heroId,
            name: heroArcData.name,
            alias: '',
            age: 0,
            birthYear: 0,
            status: 'childhood',
            stats: { combat: 50, intellect: 50, willpower: 50, social: 50, specialStat: { name: '잠재력', value: 80 } },
            emotionalState: { primary: '평온', intensity: 50, trigger: '출생' },
            profile: {
              background: heroArcData.origin || '',
              personality: heroArcData.coreNarrative || '',
              motivation: heroArcData.ultimateGoal || '',
              abilities: [],
              weakness: '',
              secretGoal: heroArcData.ultimateGoal || '',
            },
          });

          // 주인공 씨앗 생성
          seeds.push({
            id: heroId,
            codename: '주인공',
            name: heroArcData.name,
            birthYear: 0,
            birthCondition: heroArcData.origin || '알 수 없는 출생',
            initialCondition: heroArcData.initialState || '평범한 시작',
            initialEnvironment: heroArcData.initialState || '',
            temperament: '성장형',
            innateTraits: ['주인공'],
            latentAbility: '무한한 잠재력',
            latentPotentials: ['성장 잠재력'],
            physicalTrait: '평범한 외모',
            wound: '아직 드러나지 않은 상처',
            roleTendency: 'protagonist',
            color: '#7B6BA8',
          });
        }

        // NPC 캐릭터 생성
        if (seedsData?.npcs) {
          seedsData.npcs.forEach((npc, idx) => {
            const npcId = `npc-${idx}-${Date.now()}`;
            characters.push({
              id: npcId,
              name: npc.name,
              alias: '',
              age: 20 + idx * 5,
              birthYear: -(20 + idx * 5),
              status: 'training',
              stats: { combat: 40, intellect: 40, willpower: 40, social: 40, specialStat: { name: '영향력', value: 50 } },
              emotionalState: { primary: '평온', intensity: 50, trigger: '출생' },
              profile: {
                background: npc.role,
                personality: npc.personality || '',
                motivation: npc.hiddenMotivation || '',
                abilities: [],
                weakness: '',
                secretGoal: npc.hiddenMotivation || '',
              },
            });

            seeds.push({
              id: npcId,
              codename: npc.role,
              name: npc.name,
              birthYear: -(20 + idx * 5),
              birthCondition: npc.role,
              initialCondition: npc.role,
              initialEnvironment: '',
              temperament: npc.personality || '중립적',
              innateTraits: [npc.role],
              latentAbility: '미지의 능력',
              latentPotentials: [],
              physicalTrait: '일반적인 외모',
              wound: '숨겨진 과거',
              roleTendency: 'neutral',
              color: '#808080',
            });
          });
        }

        // 2. 시뮬레이션 설정 생성
        const worldEvents: WorldEvent[] = (project.worldHistory.eras || []).flatMap(era =>
          (era.keyEvents || []).map((event) => ({
            year: era.yearRange?.[0] || 0,
            event: event,
            impact: era.factionChanges || '세계에 변화가 생겼다',
          }))
        );

        const simulationConfig: SimulationConfig = {
          startYear: 0,
          endYear: 20,  // 주인공 0세부터 20세까지
          eventsPerYear: 3,
          detailLevel: 'detailed',
          worldEvents,
          batchMode: true,
        };

        // 3. SSE로 시뮬레이션 실행
        const response = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: simulationConfig,
            existingCharacters: characters,
            seeds,
            memoryStacks: {},
            worldSettingsFull: {
              name: (project.layers.world.data as { continentName?: string })?.continentName || '세계',
              description: (project.layers.world.data as { geography?: string })?.geography || '',
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`시뮬레이션 API 오류: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('스트림을 읽을 수 없습니다');

        const decoder = new TextDecoder();
        let simulationComplete = false;
        let eventCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'progress') {
                  // 진행 상황 업데이트
                  addMessage({
                    role: 'author',
                    content: `${data.year}년 시뮬레이션 중... (${data.message || ''})`,
                  });
                } else if (data.type === 'completed') {
                  eventCount++;
                } else if (data.type === 'final_state') {
                  simulationComplete = true;
                  // 시뮬레이션 결과를 프로젝트에 저장
                  if (data.characters) {
                    setCharacters(data.characters);
                  }
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (parseErr) {
                // JSON 파싱 실패는 무시
              }
            }
          }
        }

        if (simulationComplete) {
          setCurrentPhase('writing');
          setCurrentLayer('novel');
          addMessage({
            role: 'author',
            content: `시뮬레이션 완료! ${eventCount}개의 이벤트가 발생했어. 캐릭터들이 살아있는 인생을 경험했어. 이제 집필을 시작할 수 있어.`,
            choices: [
              { label: '1화 쓰기', action: 'write_next_episode' },
              { label: '🎬 디렉팅 설정', action: 'open_direction_modal' },
            ],
          });
        } else {
          throw new Error('시뮬레이션이 완료되지 않았습니다');
        }

      } catch (error) {
        console.error('Simulation error:', error);
        const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        addMessage({
          role: 'author',
          content: `시뮬레이션 중 문제가 생겼어. (${errorMsg})`,
          choices: [
            { label: '다시 시도', action: 'run_simulation' },
            { label: '시뮬레이션 건너뛰기', action: 'skip_to_writing' },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    } else if (action === 'skip_to_writing') {
      // 시뮬레이션 건너뛰고 바로 집필
      setCurrentLayer('novel');
      setCurrentPhase('writing');
      addMessage({
        role: 'author',
        content: '좋아, 바로 집필 시작하자. 1화를 써볼게.',
      });

      // 자동으로 1화 작성 시작
      setTimeout(() => handleChoiceClick('write_next_episode'), 500);
    } else if (action === 'open_direction_modal') {
      // 에피소드 디렉팅 모달 열기
      setShowDirectionModal(true);
    } else if (action === 'write_next_episode') {
      // 다음 화 작성 요청 (스트리밍)
      const nextNumber = project.episodes.length + 1;
      setIsLoading(true);

      addMessage({
        role: 'author',
        content: `${nextNumber}화 작성 시작할게.`,
      });

      // 누적 피드백 가져오기
      const recurringFeedback = getRecurringFeedback();

      try {
        // 캐릭터 프로필 문자열 생성 (seeds에서)
        const seedsData = project.layers.seeds.data;
        let characterProfiles = '';
        let characterMemories = '';

        if (seedsData && typeof seedsData === 'object') {
          const seeds = (seedsData as { npcs?: Array<{ name: string; role: string; description?: string }> }).npcs || [];
          characterProfiles = seeds.map((s: { name: string; role: string; description?: string }) =>
            `- ${s.name}: ${s.role}${s.description ? ` - ${s.description}` : ''}`
          ).join('\n');
        }

        // 확정된 레이어들을 문자열로 변환
        const layerToString = (data: unknown): string => {
          if (!data) return '';
          if (typeof data === 'string') return data;
          return JSON.stringify(data, null, 2);
        };

        // Active Context 조립 (World Bible이 있을 때만)
        const activeContext = project.worldBible ? buildActiveContext({
          worldBible: project.worldBible,
          episodeLogs: project.episodeLogs || [],
          episodes: project.episodes,
          feedbackHistory: project.feedbackHistory || [],
          currentEpisodeNumber: nextNumber,
        }) : undefined;

        // 에피소드 디렉션 기반 추가 지시 생성
        let directionText = `${nextNumber}화`;
        if (currentEpisodeDirection && currentEpisodeDirection.episodeNumber === nextNumber) {
          directionText += ` [톤: ${currentEpisodeDirection.primaryTone}]`;
          if (currentEpisodeDirection.emotionArc) {
            directionText += ` [감정흐름: ${currentEpisodeDirection.emotionArc}]`;
          }
          if (currentEpisodeDirection.pacing) {
            directionText += ` [속도: ${currentEpisodeDirection.pacing}]`;
          }
          if (currentEpisodeDirection.forcedScenes && currentEpisodeDirection.forcedScenes.length > 0) {
            directionText += ` [필수장면: ${currentEpisodeDirection.forcedScenes.map(s => s.description).join(', ')}]`;
          }
          if (currentEpisodeDirection.characterDirectives && currentEpisodeDirection.characterDirectives.length > 0) {
            const mustAppear = currentEpisodeDirection.characterDirectives
              .filter(d => d.directive === 'must_appear' || d.directive === 'spotlight')
              .map(d => d.characterName);
            const mustNotAppear = currentEpisodeDirection.characterDirectives
              .filter(d => d.directive === 'must_not_appear')
              .map(d => d.characterName);
            if (mustAppear.length > 0) {
              directionText += ` [필수등장: ${mustAppear.join(', ')}]`;
            }
            if (mustNotAppear.length > 0) {
              directionText += ` [등장금지: ${mustNotAppear.join(', ')}]`;
            }
          }
          if (currentEpisodeDirection.freeDirectives && currentEpisodeDirection.freeDirectives.length > 0) {
            directionText += ` [추가지시: ${currentEpisodeDirection.freeDirectives.join('; ')}]`;
          }
          if (currentEpisodeDirection.avoid && currentEpisodeDirection.avoid.length > 0) {
            directionText += ` [금지: ${currentEpisodeDirection.avoid.join(', ')}]`;
          }
        } else {
          directionText += ` - ${project.direction || '자유롭게 전개'}`;
        }

        // 스트리밍 호출
        const data = await streamingFetch('/api/write-episode', {
          episodeNumber: nextNumber,
          projectConfig: {
            genre: project.genre,
            tone: project.tone,
            viewpoint: project.viewpoint,
            authorPersonaId: project.authorPersona?.id,
          },
          confirmedLayers: {
            world: layerToString(project.layers.world.data),
            coreRules: layerToString(project.layers.coreRules.data),
            seeds: layerToString(project.layers.seeds.data),
            heroArc: layerToString(project.layers.heroArc.data),
            villainArc: layerToString(project.layers.villainArc.data),
            ultimateMystery: layerToString(project.layers.ultimateMystery.data),
          },
          // 세계관/캐릭터 세부 정보 (PD 디렉팅)
          worldLayer: project.layers.world.data,
          seedsLayer: project.layers.seeds.data,
          // 에피소드 디렉션 (PD 디렉팅)
          episodeDirection: currentEpisodeDirection?.episodeNumber === nextNumber ? currentEpisodeDirection : undefined,
          characterProfiles,
          characterMemories,
          authorDirection: directionText,
          previousEpisodes: project.episodes.slice(-3),
          recurringFeedback,
          activeContext,
          writingMemory: getWritingMemory(),
        });

        if (data.type === 'error') {
          throw new Error(data.message as string);
        }

        if (data.episode) {
          const episode = data.episode as Episode;
          addEpisode(episode);
          handlePostEpisodeCreation(episode);
          setEditingEpisodeId(episode.id);
          addMessage({
            role: 'author',
            content: (data.authorComment as string) || `${nextNumber}화 초안이야. 읽어봐.`,
          });
        } else {
          addMessage({
            role: 'author',
            content: (data.authorComment as string) || '문제가 생겼어.',
            choices: [{ label: '다시 시도', action: 'write_next_episode' }],
          });
        }
      } catch (error) {
        console.error('Write episode error:', error);
        addMessage({
          role: 'author',
          content: '에피소드 작성 중 문제가 생겼어.',
          choices: [{ label: '다시 시도', action: 'write_next_episode' }],
        });
      } finally {
        setIsLoading(false);
      }
    } else if (action === 'adopt_episode') {
      // 에피소드 채택
      const episode = project.episodes.find(ep => ep.id === editingEpisodeId);
      if (episode) {
        updateEpisode(episode.id, { status: 'final' });
        addMessage({
          role: 'author',
          content: `좋아, ${episode.number}화 채택! 다음 화 쓸까?`,
          choices: [
            { label: '다음 화 써줘', action: 'write_next_from_chat' },
            { label: '🎬 디렉팅 설정', action: 'open_direction_modal' },
            { label: '잠깐, 다시 볼게', action: 'revert_adopt' },
          ],
        });
        setEditingEpisodeId(null);
      }
    } else if (action === 'write_next_from_chat') {
      // 다음 화 작성 (채팅에서)
      const nextNumber = project.episodes.length + 1;
      addMessage({
        role: 'user',
        content: `${nextNumber}화 써줘`,
      });
      // handleSendMessage를 직접 호출하는 대신 메시지를 보냄
      setInputValue('');
      setIsLoading(true);

      // 누적 피드백 가져오기
      const recurringFeedback = getRecurringFeedback();

      try {
        const response = await fetch('/api/author-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            action: 'conversation',
            layer: 'novel',
            userMessage: `${nextNumber}화 써줘`,
            genre: project.genre,
            tone: project.tone,
            viewpoint: project.viewpoint,
            authorPersonaId: project.authorPersona.id,
            direction: project.direction,
            currentPhase: project.currentPhase,
            previousLayers: {
              world: project.layers.world.data,
              coreRules: project.layers.coreRules.data,
              seeds: project.layers.seeds.data,
              heroArc: project.layers.heroArc.data,
              villainArc: project.layers.villainArc.data,
              ultimateMystery: project.layers.ultimateMystery.data,
            },
            episodesCount: project.episodes.length,
            episodes: project.episodes.slice(-3),
            // 누적 피드백
            recurringFeedback,
          }),
        });

        const data = await response.json();

        if (data.isEpisode && data.episode) {
          addEpisode(data.episode);
          handlePostEpisodeCreation(data.episode); // Episode Log + Fact Check
          setEditingEpisodeId(data.episode.id);
          addMessage({
            role: 'author',
            content: data.message || `${data.episode.number}화 초안이야. 읽어봐.`,
            episode: data.episode,
            choices: [
              { label: '채택', action: 'adopt_episode' },
              { label: '수정 요청', action: 'request_revision' },
              { label: '직접 편집', action: 'direct_edit' },
            ],
          });
        } else {
          addMessage({
            role: 'author',
            content: data.message || '문제가 생겼어.',
          });
        }
      } catch (error) {
        console.error('Write next episode error:', error);
        addMessage({
          role: 'author',
          content: '에피소드 작성 중 문제가 생겼어.',
        });
      } finally {
        setIsLoading(false);
      }
    } else if (action === 'request_revision') {
      // 수정 요청 - 입력창에 포커스
      addMessage({
        role: 'author',
        content: '어떻게 수정할까? 수정 방향을 알려줘.',
      });
      // 다음 메시지를 수정 요청으로 처리하도록 표시
      setInputValue('');
    } else if (action === 'direct_edit') {
      // 직접 편집 모드
      const episode = project.episodes.find(ep => ep.id === editingEpisodeId);
      if (episode) {
        addMessage({
          role: 'author',
          content: '본문을 직접 수정해. 수정 완료하면 알려줘.',
        });
        // EpisodeViewer에서 편집 모드 활성화 (별도 상태로 관리)
      }
    } else if (action === 'revert_adopt') {
      // 채택 취소
      const lastEpisode = project.episodes[project.episodes.length - 1];
      if (lastEpisode) {
        updateEpisode(lastEpisode.id, { status: 'drafted' });
        setEditingEpisodeId(lastEpisode.id);
        addMessage({
          role: 'author',
          content: '알겠어, 다시 수정해보자.',
        });
      }
    } else if (action === 'view_history') {
      setSideTab('timeline');
    }
  };

  // 에피소드 부분 수정
  const handlePartialEdit = async (selectedText: string, feedback: string) => {
    if (!project || isRevising) return;

    const episode = project.episodes.find(ep => ep.id === editingEpisodeId);
    if (!episode) return;

    setIsRevising(true);
    addMessage({
      role: 'author',
      content: `"${selectedText.slice(0, 50)}${selectedText.length > 50 ? '...' : ''}" 부분을 수정할게.`,
    });

    try {
      const response = await fetch('/api/revise-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode,
          feedback,
          mode: 'partial',
          selectedText,
          genre: project.genre,
          tone: project.tone,
          viewpoint: project.viewpoint,
          authorPersonaId: project.authorPersona.id,
        }),
      });

      const data = await response.json();

      if (data.episode) {
        updateEpisode(episode.id, {
          content: data.episode.content,
          charCount: data.episode.charCount,
          updatedAt: data.episode.updatedAt,
        });
        addMessage({
          role: 'author',
          content: data.authorComment || '수정했어. 어때?',
        });
      } else {
        addMessage({
          role: 'author',
          content: data.authorComment || '문제가 생겼어.',
        });
      }
    } catch (error) {
      console.error('Partial edit error:', error);
      addMessage({
        role: 'author',
        content: '수정하는 중에 문제가 생겼어.',
      });
    } finally {
      setIsRevising(false);
    }
  };

  // 에피소드 전체 피드백
  const handleFullFeedback = async (feedback: string) => {
    if (!project || isRevising) return;

    const episode = project.episodes.find(ep => ep.id === editingEpisodeId);
    if (!episode) return;

    setIsRevising(true);
    addMessage({
      role: 'user',
      content: feedback,
    });
    addMessage({
      role: 'author',
      content: '피드백 반영해서 전체적으로 수정할게.',
    });

    // 피드백 분류 및 저장 (간단한 로컬 분류)
    const isStyleFeedback = ['문체', '톤', '스타일', '말투', '표현', '묘사', '대사', '서술', '짧', '길'].some(kw => feedback.includes(kw));
    if (isStyleFeedback) {
      addFeedback({
        episodeNumber: episode.number,
        type: 'style',
        content: feedback,
        isRecurring: true,  // 문체 피드백은 대부분 누적형
      });
      console.log('Style feedback saved as recurring:', feedback);
    }

    // Writing Memory에 피드백 저장 (자가진화 시스템)
    const currentMemory = getWritingMemory() || createEmptyWritingMemory();
    const updatedMemory = processFeedback(currentMemory, feedback, episode.number);
    updateWritingMemory(updatedMemory);

    try {
      const response = await fetch('/api/revise-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode,
          feedback,
          mode: 'full',
          genre: project.genre,
          tone: project.tone,
          viewpoint: project.viewpoint,
          authorPersonaId: project.authorPersona.id,
        }),
      });

      const data = await response.json();

      if (data.episode) {
        updateEpisode(episode.id, {
          title: data.episode.title,
          content: data.episode.content,
          charCount: data.episode.charCount,
          endHook: data.episode.endHook,
          updatedAt: data.episode.updatedAt,
        });
        addMessage({
          role: 'author',
          content: data.authorComment || '수정했어. 다시 읽어봐.',
        });
      } else {
        addMessage({
          role: 'author',
          content: data.authorComment || '문제가 생겼어.',
        });
      }
    } catch (error) {
      console.error('Full feedback error:', error);
      addMessage({
        role: 'author',
        content: '수정하는 중에 문제가 생겼어.',
      });
    } finally {
      setIsRevising(false);
    }
  };

  // 에피소드 채택 → 다음 화 + 품질 추적
  const handleAdopt = async () => {
    if (!project || isRevising) return;

    const episode = project.episodes.find(ep => ep.id === editingEpisodeId);
    if (!episode) return;

    // 에피소드 상태를 'final'로 변경
    updateEpisode(episode.id, { status: 'final' });

    // 품질 추적 업데이트 (Writing Memory)
    const currentMemory = getWritingMemory() || createEmptyWritingMemory();
    const originalCharCount = episode.content.length;
    const finalCharCount = episode.editedContent?.length || originalCharCount;
    const editAmount = episode.editedContent
      ? Math.round(Math.abs(finalCharCount - originalCharCount) / originalCharCount * 100)
      : 0;

    const updatedMemory = updateQualityTracker(currentMemory, {
      episodeNumber: episode.number,
      originalCharCount,
      finalCharCount,
      editAmount,
      adoptedDirectly: !episode.editedContent, // 편집 없이 직접 채택
      feedbackCount: 0, // 피드백 수는 별도 추적 필요
      revisionCount: 0, // 수정 횟수도 별도 추적 필요
      status: 'final',
    });

    // 편집이 있었다면 편집 패턴 분석
    if (episode.editedContent && episode.editedContent !== episode.content) {
      const { patterns } = analyzeEdit(episode.content, episode.editedContent, episode.number);
      if (patterns.length > 0) {
        const memoryWithPatterns = integrateEditPatterns(updatedMemory, patterns);
        updateWritingMemory(memoryWithPatterns);
      } else {
        updateWritingMemory(updatedMemory);
      }
    } else {
      updateWritingMemory(updatedMemory);
    }

    addMessage({
      role: 'author',
      content: `좋아, ${episode.number}화 채택! 다음 화 쓸까?`,
      choices: [
        { label: '다음 화 작성', action: 'write_next_episode' },
        { label: '🎬 디렉팅 설정', action: 'open_direction_modal' },
        { label: '잠깐, 수정 다시', action: 'revert_adopt' },
      ],
    });

    setEditingEpisodeId(null);
  };

  // 환님이 본문 직접 편집
  const handleDirectEdit = (newContent: string) => {
    if (!project) return;

    const episode = project.episodes.find(ep => ep.id === editingEpisodeId);
    if (!episode) return;

    // editedContent에 환님 수정본 저장
    updateEpisode(episode.id, {
      editedContent: newContent,
      charCount: newContent.length,
      updatedAt: new Date().toISOString(),
    });

    addMessage({
      role: 'author',
      content: `알겠어, 수정본 저장했어. 다음 화 쓸 때 참고할게.`,
    });
  };

  // 새 캐릭터 추가 핸들러
  const handleAddCharacter = () => {
    if (!project || !newCharacter.name || !newCharacter.role) {
      return;
    }

    const seedsData = project.layers.seeds.data as SeedsLayer | null;
    const currentNpcs = seedsData?.npcs || [];

    const newNpc: NPCSeedInfo = {
      id: `npc_${Date.now()}`,
      name: newCharacter.name,
      role: newCharacter.role,
      location: newCharacter.location || '',
      personality: newCharacter.personality || '',
      hiddenMotivation: newCharacter.hiddenMotivation,
      faction: newCharacter.faction,
      appearance: newCharacter.appearance,
      speechPattern: newCharacter.speechPattern,
      backstory: newCharacter.backstory,
      source: 'manual',
      importance: 'supporting',
      promoted: false,
    };

    const updatedSeeds: SeedsLayer = {
      ...seedsData,
      factions: seedsData?.factions || [],
      races: seedsData?.races || [],
      threats: seedsData?.threats || [],
      npcs: [...currentNpcs, newNpc],
    };

    updateLayer('seeds', updatedSeeds as unknown as Record<string, unknown>);

    setNewCharacter({
      name: '',
      role: '',
      location: '',
      personality: '',
      hiddenMotivation: '',
      faction: '',
      appearance: '',
      speechPattern: '',
      backstory: '',
    });
    setShowAddCharacterModal(false);

    addMessage({
      role: 'author',
      content: `새 캐릭터 "${newNpc.name}" 추가했어. ${newNpc.role}로 등록했고, 시뮬레이션에서 활용할게.`,
    });
  };

  // 캐릭터 TXT 파일 업로드 핸들러
  const handleCharacterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseCharacterFile(file);
      setParsedCharacters(result.characters);
      setCharacterUploadErrors(result.errors);
      // 기본적으로 모든 캐릭터 선택
      setSelectedParsedCharacters(new Set(result.characters.map((_, i) => i)));
      setShowCharacterUploadResult(true);
    } catch (error) {
      setCharacterUploadErrors([error instanceof Error ? error.message : '파일 파싱 오류']);
      setParsedCharacters([]);
      setShowCharacterUploadResult(true);
    }

    // 파일 인풋 초기화 (같은 파일 재선택 가능하도록)
    e.target.value = '';
  };

  // 선택한 캐릭터들 추가
  const handleAddParsedCharacters = () => {
    if (!project || selectedParsedCharacters.size === 0) return;

    const seedsData = project.layers.seeds.data as SeedsLayer | null;
    const currentNpcs = seedsData?.npcs || [];

    // 선택된 캐릭터들만 추가
    const newNpcs: NPCSeedInfo[] = [];
    parsedCharacters.forEach((char, index) => {
      if (selectedParsedCharacters.has(index)) {
        newNpcs.push(toNPCSeedInfo(char));
      }
    });

    const updatedSeeds: SeedsLayer = {
      ...seedsData,
      factions: seedsData?.factions || [],
      races: seedsData?.races || [],
      threats: seedsData?.threats || [],
      npcs: [...currentNpcs, ...newNpcs],
    };

    updateLayer('seeds', updatedSeeds as unknown as Record<string, unknown>);

    // 상태 초기화
    setShowCharacterUploadResult(false);
    setParsedCharacters([]);
    setSelectedParsedCharacters(new Set());

    addMessage({
      role: 'author',
      content: `${newNpcs.length}명의 캐릭터를 추가했어. (${newNpcs.map(n => n.name).join(', ')}) 시뮬레이션과 집필에 활용할게.`,
    });
  };

  // 캐릭터 선택 토글
  const toggleParsedCharacter = (index: number) => {
    setSelectedParsedCharacters(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // 예시 TXT 파일 다운로드
  const handleDownloadExampleTxt = () => {
    const content = generateExampleTxt();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'character-template.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 세계관 편집 저장 핸들러
  const handleSaveWorldSettings = (data: {
    heroArc?: Partial<HeroArcLayer>;
    villainArc?: Partial<VillainArcLayer>;
    seedsLayer?: Partial<SeedsLayer>;
  }) => {
    if (!project) return;

    const changes: string[] = [];

    // 주인공 업데이트
    if (data.heroArc) {
      const currentHero = project.layers.heroArc.data as HeroArcLayer | null;
      const updatedHero = { ...currentHero, ...data.heroArc } as HeroArcLayer;
      updateLayer('heroArc', updatedHero as unknown as Record<string, unknown>);
      changes.push('주인공');
    }

    // 빌런 업데이트
    if (data.villainArc) {
      const currentVillain = project.layers.villainArc.data as VillainArcLayer | null;
      const updatedVillain = { ...currentVillain, ...data.villainArc } as VillainArcLayer;
      updateLayer('villainArc', updatedVillain as unknown as Record<string, unknown>);
      changes.push('빌런');
    }

    // NPC 업데이트
    if (data.seedsLayer) {
      const currentSeeds = project.layers.seeds.data as SeedsLayer | null;
      const updatedSeeds = { ...currentSeeds, ...data.seedsLayer } as SeedsLayer;
      updateLayer('seeds', updatedSeeds as unknown as Record<string, unknown>);
      changes.push('NPC');
    }

    setShowWorldEditor(false);

    if (changes.length > 0) {
      addMessage({
        role: 'author',
        content: `세계관 수정 완료! (${changes.join(', ')}) 변경된 설정은 다음 화 집필부터 자동으로 반영할게.`,
      });
    }
  };

  // 타임라인 편집 저장 핸들러
  const handleSaveTimeline = (data: {
    eras: WorldHistoryEra[];
    detailedDecades: DetailedDecade[];
  }) => {
    if (!project) return;

    setWorldHistory(data.eras, data.detailedDecades);
    setShowTimelineEditor(false);

    addMessage({
      role: 'author',
      content: `세계 역사 타임라인 수정 완료! 시대 ${data.eras.length}개, 10년 단위 ${data.detailedDecades.length}개가 업데이트됐어. 변경된 역사는 다음 화 집필부터 자동으로 반영할게.`,
    });
  };

  // 시뮬레이션 NPC 승격 핸들러
  const handlePromoteSimulationNPC = (npc: SimulationNPC) => {
    if (!project) return;

    const seedsData = project.layers.seeds.data as SeedsLayer | null;
    const currentNpcs = seedsData?.npcs || [];
    const currentSimNpcs = seedsData?.simulationNPCs || [];

    // 이미 승격된 NPC인지 확인
    const alreadyPromoted = currentNpcs.some(n => n.id === npc.id);
    if (alreadyPromoted) {
      addMessage({
        role: 'author',
        content: `${npc.name}은(는) 이미 주요 캐릭터로 등록되어 있어.`,
      });
      return;
    }

    // SimulationNPC → NPCSeedInfo 변환
    const promotedNpc: NPCSeedInfo = {
      id: npc.id,
      name: npc.name,
      role: npc.role,
      location: '',
      personality: npc.personality || '',
      hiddenMotivation: '',
      source: 'simulation',
      appearanceCount: npc.appearances.length,
      firstAppearanceYear: npc.firstAppearance.year,
      importance: npc.suggestedImportance,
      promoted: true,
      relationships: npc.relationshipToHero,
    };

    // simulationNPCs에서 제거하고 npcs에 추가
    const updatedSimNpcs = currentSimNpcs.filter(n => n.id !== npc.id);
    const updatedNpcs = [...currentNpcs, promotedNpc];

    const updatedSeeds: SeedsLayer = {
      ...seedsData,
      factions: seedsData?.factions || [],
      races: seedsData?.races || [],
      threats: seedsData?.threats || [],
      npcs: updatedNpcs,
      simulationNPCs: updatedSimNpcs,
    };

    updateLayer('seeds', updatedSeeds as unknown as Record<string, unknown>);

    addMessage({
      role: 'author',
      content: `${npc.name}을(를) 주요 캐릭터로 승격했어! 중요도: ${npc.suggestedImportance === 'major' ? '주연급' : npc.suggestedImportance === 'supporting' ? '조연급' : '단역'}. 앞으로 더 비중 있게 다룰게.`,
    });
  };

  // Hydration 중 또는 프로젝트가 없으면
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-primary">
        <div className="text-center">
          <div className="text-text-muted">프로젝트를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-primary">
        <div className="text-center">
          <div className="mb-4 text-text-muted">프로젝트를 찾을 수 없습니다</div>
          <button
            onClick={() => router.push('/projects')}
            className="text-seojin hover:underline"
          >
            프로젝트 목록으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-base-primary">
      {/* 헤더 - 모바일 최적화 */}
      <header className="flex items-center justify-between border-b border-base-border bg-base-secondary px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <button
            onClick={() => router.push('/projects')}
            className="text-text-muted hover:text-text-primary min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg md:text-xl flex-shrink-0">{PERSONA_ICONS[project.authorPersona.id]}</span>
            <span className="font-medium text-text-primary text-sm md:text-base truncate">
              {isMobile ? `${project.genre}` : project.authorPersona.name}
            </span>
            {!isMobile && (
              <span className="rounded-full bg-base-tertiary px-3 py-1 text-sm text-text-muted flex-shrink-0">
                {project.genre} / {project.tone}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => router.push(`/projects/${projectId}/result`)}
          className="rounded-lg bg-base-tertiary min-w-[44px] min-h-[44px] px-3 md:px-4 py-2 text-sm text-text-secondary hover:bg-base-border flex items-center justify-center flex-shrink-0"
        >
          {isMobile ? '📄' : '결과물 →'}
        </button>
      </header>

      {/* 레이어 진행 바 - 모바일: 아이콘만, 현재 단계만 텍스트 */}
      <div
        ref={layerBarRef}
        className="flex items-center justify-start md:justify-center gap-1 md:gap-2 border-b border-base-border bg-base-secondary px-2 md:px-6 py-2 md:py-3 layer-bar-scroll"
      >
        {LAYER_ORDER.slice(0, -1).map((layer, index) => {
          const status = project.layers[layer as keyof typeof project.layers]?.status || 'pending';
          const isCurrent = project.currentLayer === layer;
          const isClickable = status === 'confirmed' || status === 'drafting';

          return (
            <div key={layer} className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => handleLayerClick(layer)}
                disabled={isLoading || (!isClickable && !isCurrent)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 md:py-1 min-h-[36px] md:min-h-0 transition-all ${
                  isClickable
                    ? 'cursor-pointer hover:bg-base-tertiary'
                    : isCurrent
                    ? 'cursor-default'
                    : 'cursor-not-allowed opacity-50'
                }`}
                title={status === 'confirmed' ? '클릭하여 수정' : undefined}
              >
                <span
                  className={`text-base md:text-lg ${
                    status === 'confirmed'
                      ? 'text-seojin'
                      : isCurrent
                      ? 'text-yellow-400'
                      : 'text-text-muted'
                  }`}
                >
                  {status === 'confirmed' ? '●' : isCurrent ? '◐' : '○'}
                </span>
                {/* 모바일: 현재 단계만 텍스트, 데스크톱: 모두 텍스트 */}
                <span
                  className={`text-sm ${
                    isCurrent ? 'font-medium text-text-primary' : 'text-text-muted'
                  } ${isMobile && !isCurrent ? 'hidden' : ''}`}
                >
                  {LAYER_LABELS[layer]}
                </span>
              </button>
              {index < LAYER_ORDER.length - 2 && (
                <span className="text-text-muted text-xs md:text-base">→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 대화 영역 - 모바일에서 하단 여백 추가 (고정 입력창 + 탭바) */}
        <div className={`flex flex-1 flex-col ${isMobile ? 'pb-[140px]' : ''}`}>
          {/* 메시지 목록 - 모바일 패딩 최적화 */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            <div className="mx-auto max-w-2xl space-y-3 md:space-y-4">
              {project.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[80%] rounded-lg px-3 md:px-4 py-2.5 md:py-3 ${
                      message.role === 'user'
                        ? 'bg-seojin text-white'
                        : 'bg-base-secondary text-text-primary'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-[15px] md:text-base">{message.content}</div>

                    {/* 선택지 - 모바일 터치 영역 확대 */}
                    {message.choices && message.choices.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.choices.map((choice, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleChoiceClick(choice.action)}
                            disabled={isLoading}
                            className="rounded-lg bg-base-tertiary px-4 py-2.5 md:px-3 md:py-1.5 text-sm text-text-secondary transition-colors hover:bg-base-border disabled:opacity-50 min-h-[44px] md:min-h-0"
                          >
                            {choice.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* 에피소드 뷰어 */}
              {editingEpisodeId && project.currentLayer === 'novel' && (() => {
                const episode = project.episodes.find(ep => ep.id === editingEpisodeId);
                if (!episode || episode.status === 'final') return null;
                return (
                  <EpisodeViewer
                    episodeNumber={episode.number}
                    title={episode.title}
                    content={episode.content}
                    editedContent={episode.editedContent}
                    charCount={episode.charCount}
                    status={episode.status}
                    onPartialEdit={handlePartialEdit}
                    onFullFeedback={handleFullFeedback}
                    onDirectEdit={handleDirectEdit}
                    onAdopt={handleAdopt}
                    isLoading={isRevising}
                  />
                );
              })()}

              {/* 로딩 인디케이터 */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-base-secondary px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✍️</span>
                      <span className="text-text-muted">{loadingMessage}</span>
                    </div>
                    {showTimeoutMessage && (
                      <div className="mt-2 text-sm text-yellow-600">
                        시간이 좀 걸리고 있어. 조금만 기다려줘.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 입력 영역 - 하단 고정, 모바일 최적화 */}
          <div className={`border-t border-base-border bg-base-secondary p-3 md:p-4 ${isMobile ? 'fixed bottom-[60px] left-0 right-0 z-20' : ''}`} style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}>
            {/* 업로드된 파일 표시 */}
            {uploadedFileName && (
              <div className="mx-auto max-w-2xl mb-2 flex items-center gap-2 text-sm text-text-muted">
                <span>📎 {uploadedFileName}</span>
                <button
                  onClick={() => {
                    setUploadedFileContent(null);
                    setUploadedFileName(null);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="mx-auto flex max-w-2xl gap-2">
              {/* 파일 업로드 버튼 */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={handleFileButtonClick}
                disabled={isLoading}
                className="rounded-lg border border-base-border bg-base-primary px-3 py-3 text-text-muted transition-colors hover:bg-base-tertiary hover:text-text-primary disabled:opacity-50 min-h-[48px]"
                title="JSON/TXT 파일 업로드"
              >
                📎
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyUp={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    handleSendMessage();
                  }
                }}
                placeholder={isLoading ? '응답 중...' : (isMobile ? '메시지 입력...' : '메시지를 입력하세요... (예: 떡밥 다시 수정해줘)')}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-base-border bg-base-primary px-3 md:px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-seojin focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="rounded-lg bg-seojin px-4 md:px-6 py-3 font-medium text-white transition-colors hover:bg-seojin/90 disabled:opacity-50 min-w-[56px] md:min-w-[80px] min-h-[48px]"
              >
                {isLoading ? '...' : (isMobile ? '↑' : '전송')}
              </button>
            </div>
          </div>
        </div>

        {/* 사이드 패널 - 데스크톱 */}
        {!isMobile && (
          <div className="w-80 lg:w-96 border-l border-base-border bg-base-secondary">
            {/* 탭 */}
            <div className="flex border-b border-base-border">
              {(['world', 'timeline', 'character', 'manuscript'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSideTab(tab)}
                  className={`flex-1 py-3 text-sm transition-colors ${
                    sideTab === tab
                      ? 'border-b-2 border-seojin text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {tab === 'world' ? '세계' : tab === 'timeline' ? '역사' : tab === 'character' ? '캐릭터' : '원고'}
                </button>
              ))}
            </div>

            {/* 탭 내용 */}
            <div className="overflow-y-auto p-4" style={{ height: 'calc(100% - 45px)' }}>
              {/* 세계관 편집 버튼 - 세계/캐릭터 탭에서 표시 */}
              {(sideTab === 'world' || sideTab === 'character') && (
                <button
                  onClick={() => setShowWorldEditor(true)}
                  className="w-full mb-4 py-2 px-3 rounded-lg border border-dashed border-yellow-500/50 text-yellow-400 text-sm hover:bg-yellow-500/10 transition-colors flex items-center justify-center gap-2"
                >
                  <span>🛠️</span>
                  <span>세계관/캐릭터 편집</span>
                </button>
              )}

              {sideTab === 'world' && (
                <div className="space-y-4">
                  {project.layers.world.data ? (
                    <>
                      <div>
                        <h3 className="mb-1 text-sm font-medium text-text-primary">대륙</h3>
                        <p className="text-sm text-text-muted">{project.layers.world.data.continentName}</p>
                      </div>
                      <div>
                        <h3 className="mb-1 text-sm font-medium text-text-primary">지형</h3>
                        <p className="text-sm text-text-muted">{project.layers.world.data.geography}</p>
                      </div>
                      {project.layers.world.data.cities?.length > 0 && (
                        <div>
                          <h3 className="mb-1 text-sm font-medium text-text-primary">도시</h3>
                          <ul className="space-y-1">
                            {project.layers.world.data.cities.map((city, idx) => (
                              <li key={idx} className="text-sm text-text-muted">
                                • {city.name}: {city.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 지역별 상세 정보 (PD 디렉팅) */}
                      {project.layers.world.data.regions && project.layers.world.data.regions.length > 0 && (
                        <>
                          <hr className="border-base-border" />
                          <div>
                            <h3 className="mb-2 text-sm font-medium text-text-primary flex items-center gap-1">
                              <span className="text-green-400">🗺️</span> 지역 상세
                            </h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {project.layers.world.data.regions.map((region, idx) => (
                                <details key={idx} className="rounded-lg bg-base-tertiary p-2 group">
                                  <summary className="cursor-pointer text-sm font-medium text-text-primary flex items-center gap-2">
                                    <span className="text-xs text-green-400">{region.type}</span>
                                    {region.name}
                                  </summary>
                                  <div className="mt-2 space-y-1 text-xs text-text-muted">
                                    {region.atmosphere && <p><span className="text-text-secondary">분위기:</span> {region.atmosphere}</p>}
                                    {region.terrain && <p><span className="text-text-secondary">지형:</span> {region.terrain}</p>}
                                    {region.flora && <p><span className="text-text-secondary">식물:</span> {region.flora}</p>}
                                    {region.fauna && <p><span className="text-text-secondary">동물:</span> {region.fauna}</p>}
                                    {region.hazards && <p><span className="text-red-400">위험:</span> {region.hazards}</p>}
                                    {region.sensoryDescription && (
                                      <div className="mt-2 p-2 bg-base-secondary rounded text-xs">
                                        <div className="font-medium text-text-secondary mb-1">감각 묘사</div>
                                        {region.sensoryDescription.sight && <p>👁️ {region.sensoryDescription.sight}</p>}
                                        {region.sensoryDescription.sound && <p>👂 {region.sensoryDescription.sound}</p>}
                                        {region.sensoryDescription.smell && <p>👃 {region.sensoryDescription.smell}</p>}
                                        {region.sensoryDescription.temperature && <p>🌡️ {region.sensoryDescription.temperature}</p>}
                                      </div>
                                    )}
                                  </div>
                                </details>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* 기후 정보 */}
                      {project.layers.world.data.climate && (
                        <>
                          <hr className="border-base-border" />
                          <div>
                            <h3 className="mb-1 text-sm font-medium text-text-primary flex items-center gap-1">
                              <span className="text-blue-400">🌤️</span> 기후
                            </h3>
                            <div className="text-sm text-text-muted space-y-1">
                              <p>{project.layers.world.data.climate.general}</p>
                              {project.layers.world.data.climate.seasons && (
                                <p className="text-xs"><span className="text-text-secondary">계절:</span> {project.layers.world.data.climate.seasons}</p>
                              )}
                              {project.layers.world.data.climate.extremes && (
                                <p className="text-xs text-orange-400">{project.layers.world.data.climate.extremes}</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* 환경 특성 */}
                      {project.layers.world.data.environment && (
                        <>
                          <hr className="border-base-border" />
                          <div>
                            <h3 className="mb-1 text-sm font-medium text-text-primary flex items-center gap-1">
                              <span className="text-purple-400">✨</span> 환경
                            </h3>
                            <div className="text-xs text-text-muted space-y-1">
                              {project.layers.world.data.environment.dayNightCycle && (
                                <p><span className="text-text-secondary">낮/밤:</span> {project.layers.world.data.environment.dayNightCycle}</p>
                              )}
                              {project.layers.world.data.environment.celestialBodies && (
                                <p><span className="text-text-secondary">천체:</span> {project.layers.world.data.environment.celestialBodies}</p>
                              )}
                              {project.layers.world.data.environment.magicalInfluence && (
                                <p className="text-purple-300">{project.layers.world.data.environment.magicalInfluence}</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* 감각 팔레트 */}
                      {project.layers.world.data.sensoryPalette && (
                        <>
                          <hr className="border-base-border" />
                          <div>
                            <h3 className="mb-2 text-sm font-medium text-text-primary flex items-center gap-1">
                              <span className="text-pink-400">🎨</span> 감각 팔레트
                            </h3>
                            <div className="text-xs text-text-muted space-y-2">
                              {project.layers.world.data.sensoryPalette.colors && project.layers.world.data.sensoryPalette.colors.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-text-secondary">색:</span>
                                  {project.layers.world.data.sensoryPalette.colors.map((c, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-pink-500/10 rounded text-pink-300">{c}</span>
                                  ))}
                                </div>
                              )}
                              {project.layers.world.data.sensoryPalette.sounds && project.layers.world.data.sensoryPalette.sounds.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-text-secondary">소리:</span>
                                  {project.layers.world.data.sensoryPalette.sounds.map((s, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-blue-500/10 rounded text-blue-300">{s}</span>
                                  ))}
                                </div>
                              )}
                              {project.layers.world.data.sensoryPalette.smells && project.layers.world.data.sensoryPalette.smells.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-text-secondary">냄새:</span>
                                  {project.layers.world.data.sensoryPalette.smells.map((s, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-green-500/10 rounded text-green-300">{s}</span>
                                  ))}
                                </div>
                              )}
                              {project.layers.world.data.sensoryPalette.atmosphericKeywords && project.layers.world.data.sensoryPalette.atmosphericKeywords.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-text-secondary">분위기:</span>
                                  {project.layers.world.data.sensoryPalette.atmosphericKeywords.map((k, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-purple-500/10 rounded text-purple-300">{k}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-text-muted">아직 세계가 구축되지 않았습니다</div>
                  )}

                  {project.layers.coreRules.data && (
                    <>
                      <hr className="border-base-border" />
                      <div>
                        <h3 className="mb-1 text-sm font-medium text-text-primary">힘의 체계</h3>
                        <p className="text-sm text-text-muted">{project.layers.coreRules.data.powerSystem}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {sideTab === 'timeline' && (
                <div className="space-y-4">
                  {/* 타임라인 편집 버튼 */}
                  <button
                    onClick={() => setShowTimelineEditor(true)}
                    className="w-full py-2 px-3 rounded-lg border border-dashed border-amber-500/50 text-amber-400 text-sm hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>📅</span>
                    <span>역사 타임라인 편집</span>
                  </button>
                  <WorldTimelinePanel
                    eras={project.worldHistory.eras}
                    decades={project.worldHistory.detailedDecades}
                    heroSeed={project.seeds?.[0]}
                  />
                </div>
              )}

              {sideTab === 'character' && (
                <div className="space-y-4">
                  {project.layers.heroArc.data ? (
                    <div className="rounded-lg bg-base-primary p-3">
                      <div className="mb-1 text-xs text-seojin">주인공</div>
                      <div className="font-medium text-text-primary">{project.layers.heroArc.data.name}</div>
                      <p className="mt-1 text-sm text-text-muted">{project.layers.heroArc.data.coreNarrative}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-text-muted">아직 주인공이 설정되지 않았습니다</div>
                  )}

                  {project.layers.villainArc.data && (
                    <div className="rounded-lg bg-base-primary p-3">
                      <div className="mb-1 text-xs text-red-400">빌런</div>
                      <div className="font-medium text-text-primary">{project.layers.villainArc.data.name}</div>
                      <p className="mt-1 text-sm text-text-muted">{project.layers.villainArc.data.motivation}</p>
                    </div>
                  )}

                  {/* NPC 목록 */}
                  {(() => {
                    const seedsData = project.layers.seeds.data as SeedsLayer | null;
                    const npcs = seedsData?.npcs || [];
                    if (npcs.length > 0) {
                      return (
                        <>
                          <hr className="border-base-border" />
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-medium text-text-primary">등록된 캐릭터</h3>
                              <span className="text-xs text-text-muted">{npcs.length}명</span>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {npcs.map((npc, idx) => (
                                <div key={npc.id || idx} className="rounded-lg bg-base-tertiary p-2">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium text-sm text-text-primary">{npc.name}</div>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      npc.importance === 'major' ? 'bg-seojin/20 text-seojin' :
                                      npc.importance === 'supporting' ? 'bg-blue-500/20 text-blue-400' :
                                      'bg-gray-500/20 text-gray-400'
                                    }`}>
                                      {npc.importance === 'major' ? '주연' : npc.importance === 'supporting' ? '조연' : '단역'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-text-muted mt-1">{npc.role}</div>
                                  {npc.source === 'simulation' && (
                                    <div className="text-xs text-purple-400 mt-1">시뮬레이션 출신</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}

                  {/* 시뮬레이션 NPC (승격 전) */}
                  {(() => {
                    const seedsData = project.layers.seeds.data as SeedsLayer | null;
                    const simNpcs = seedsData?.simulationNPCs || [];
                    const highImportanceNpcs = simNpcs.filter(n => n.significance >= 50).sort((a, b) => b.significance - a.significance);

                    if (highImportanceNpcs.length > 0) {
                      return (
                        <>
                          <hr className="border-base-border" />
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-medium text-text-primary">시뮬레이션 발생 NPC</h3>
                              <span className="text-xs text-purple-400">{highImportanceNpcs.length}명</span>
                            </div>
                            <p className="text-xs text-text-muted mb-2">비중 높은 인물을 주요 캐릭터로 승격할 수 있어</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {highImportanceNpcs.map((npc) => (
                                <div key={npc.id} className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-2">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium text-sm text-text-primary">{npc.name}</div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-purple-400">{npc.significance}점</span>
                                      <button
                                        onClick={() => handlePromoteSimulationNPC(npc)}
                                        className="text-xs px-2 py-0.5 bg-seojin/20 text-seojin rounded hover:bg-seojin/30 transition-colors"
                                      >
                                        승격
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-xs text-text-muted mt-1">{npc.role}</div>
                                  <div className="text-xs text-purple-300 mt-1">
                                    첫 등장: {npc.firstAppearance.year}년 • 등장 {npc.appearances.length}회
                                  </div>
                                  {npc.relationshipToHero && (
                                    <div className="text-xs text-blue-400 mt-1">주인공과: {npc.relationshipToHero}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}

                  {/* 캐릭터 추가 버튼들 */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddCharacterModal(true)}
                        className="flex-1 py-2 border border-dashed border-seojin/50 rounded-lg text-seojin text-sm hover:bg-seojin/10 transition-colors"
                      >
                        + 캐릭터 추가
                      </button>
                      <button
                        onClick={() => characterFileInputRef.current?.click()}
                        className="flex-1 py-2 border border-dashed border-purple-500/50 rounded-lg text-purple-400 text-sm hover:bg-purple-500/10 transition-colors"
                      >
                        📄 TXT 업로드
                      </button>
                    </div>
                    <button
                      onClick={handleDownloadExampleTxt}
                      className="w-full py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
                    >
                      예시 템플릿 다운로드 ↓
                    </button>
                  </div>
                  {/* 숨겨진 파일 인풋 */}
                  <input
                    ref={characterFileInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleCharacterFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {sideTab === 'manuscript' && (
                <div className="space-y-4">
                  {/* 품질 추적 통계 */}
                  {(() => {
                    const writingMemory = getWritingMemory();
                    if (writingMemory && writingMemory.totalEpisodes > 0) {
                      const stats = getWritingMemoryStats(writingMemory);
                      return (
                        <div className="rounded-lg bg-base-primary p-3 border border-base-border">
                          <div className="text-xs text-text-muted mb-2">품질 추적</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-text-muted">직접 채택률:</span>
                              <span className={`ml-1 font-medium ${stats.directAdoptionRate >= 70 ? 'text-seojin' : 'text-text-primary'}`}>
                                {stats.directAdoptionRate}%
                              </span>
                            </div>
                            <div>
                              <span className="text-text-muted">평균 편집량:</span>
                              <span className={`ml-1 font-medium ${stats.averageEditAmount <= 20 ? 'text-seojin' : 'text-text-primary'}`}>
                                {stats.averageEditAmount}%
                              </span>
                            </div>
                            <div>
                              <span className="text-text-muted">학습된 규칙:</span>
                              <span className="ml-1 font-medium text-text-primary">{stats.highConfidenceRules}개</span>
                            </div>
                            <div>
                              <span className="text-text-muted">추세:</span>
                              <span className={`ml-1 font-medium ${
                                stats.recentTrend === 'improving' ? 'text-seojin' :
                                stats.recentTrend === 'declining' ? 'text-red-400' : 'text-text-primary'
                              }`}>
                                {stats.recentTrend === 'improving' ? '↑ 개선 중' :
                                 stats.recentTrend === 'declining' ? '↓ 주의' : '→ 안정'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* 에피소드 목록 */}
                  <div className="space-y-2">
                    {project.episodes.length > 0 ? (
                      project.episodes.map((ep) => (
                        <button
                          key={ep.id}
                          onClick={() => {
                            if (ep.status !== 'final') {
                              setEditingEpisodeId(ep.id);
                            }
                          }}
                          className={`w-full rounded-lg p-3 text-left transition-colors ${
                            editingEpisodeId === ep.id
                              ? 'bg-seojin/20 border border-seojin'
                              : 'bg-base-primary hover:bg-base-tertiary'
                          } ${ep.status === 'final' ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-text-primary">
                                {ep.number}화: {ep.title}
                              </span>
                              {ep.status === 'final' && (
                                <span className="text-xs text-seojin">✓</span>
                              )}
                            </div>
                            <span className="text-xs text-text-muted">{ep.charCount}자</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-sm text-text-muted">아직 작성된 원고가 없습니다</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 모바일 바텀 탭 바 */}
      {isMobile && (
        <div className="bottom-tab-bar flex justify-around py-2">
          {(['world', 'timeline', 'character', 'manuscript'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setSideTab(tab);
                setShowMobilePanel(true);
              }}
              className={`flex flex-col items-center gap-1 px-4 py-2 min-h-[44px] ${
                sideTab === tab && showMobilePanel ? 'text-seojin' : 'text-text-muted'
              }`}
            >
              <span className="text-lg">
                {tab === 'world' ? '🌍' : tab === 'timeline' ? '📅' : tab === 'character' ? '👤' : '📝'}
              </span>
              <span className="text-xs">
                {tab === 'world' ? '세계' : tab === 'timeline' ? '역사' : tab === 'character' ? '캐릭터' : '원고'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 모바일 바텀 시트 오버레이 */}
      {isMobile && (
        <div
          className={`bottom-sheet-overlay ${showMobilePanel ? 'open' : ''}`}
          onClick={() => setShowMobilePanel(false)}
        />
      )}

      {/* 모바일 바텀 시트 */}
      {isMobile && (
        <div className={`bottom-sheet ${showMobilePanel ? 'open' : ''}`} style={{ height: '75vh' }}>
          {/* 드래그 핸들 */}
          <div className="flex justify-center py-3" onClick={() => setShowMobilePanel(false)}>
            <div className="w-10 h-1 bg-base-border rounded-full" />
          </div>

          {/* 탭 헤더 */}
          <div className="flex border-b border-base-border px-4">
            {(['world', 'timeline', 'character', 'manuscript'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSideTab(tab)}
                className={`flex-1 py-3 text-sm transition-colors ${
                  sideTab === tab
                    ? 'border-b-2 border-seojin text-text-primary'
                    : 'text-text-muted'
                }`}
              >
                {tab === 'world' ? '세계' : tab === 'timeline' ? '역사' : tab === 'character' ? '캐릭터' : '원고'}
              </button>
            ))}
          </div>

          {/* 바텀 시트 내용 */}
          <div className="overflow-y-auto p-4" style={{ height: 'calc(100% - 100px)' }}>
            {sideTab === 'world' && (
              <div className="space-y-4">
                {project.layers.world.data ? (
                  <>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-text-primary">대륙</h3>
                      <p className="text-sm text-text-muted">{project.layers.world.data.continentName}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-text-primary">지형</h3>
                      <p className="text-sm text-text-muted">{project.layers.world.data.geography}</p>
                    </div>
                    {project.layers.world.data.cities?.length > 0 && (
                      <div>
                        <h3 className="mb-1 text-sm font-medium text-text-primary">도시</h3>
                        <ul className="space-y-1">
                          {project.layers.world.data.cities.map((city, idx) => (
                            <li key={idx} className="text-sm text-text-muted">
                              • {city.name}: {city.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-text-muted">아직 세계가 구축되지 않았습니다</div>
                )}

                {project.layers.coreRules.data && (
                  <>
                    <hr className="border-base-border" />
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-text-primary">힘의 체계</h3>
                      <p className="text-sm text-text-muted">{project.layers.coreRules.data.powerSystem}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {sideTab === 'timeline' && (
              <div className="space-y-4">
                {/* 타임라인 편집 버튼 */}
                <button
                  onClick={() => setShowTimelineEditor(true)}
                  className="w-full py-2 px-3 rounded-lg border border-dashed border-amber-500/50 text-amber-400 text-sm hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📅</span>
                  <span>역사 타임라인 편집</span>
                </button>
                <WorldTimelinePanel
                  eras={project.worldHistory.eras}
                  decades={project.worldHistory.detailedDecades}
                  heroSeed={project.seeds?.[0]}
                />
              </div>
            )}

            {sideTab === 'character' && (
              <div className="space-y-4">
                {project.layers.heroArc.data ? (
                  <div className="rounded-lg bg-base-primary p-3">
                    <div className="mb-1 text-xs text-seojin">주인공</div>
                    <div className="font-medium text-text-primary">{project.layers.heroArc.data.name}</div>
                    <p className="mt-1 text-sm text-text-muted">{project.layers.heroArc.data.coreNarrative}</p>
                  </div>
                ) : (
                  <div className="text-sm text-text-muted">아직 주인공이 설정되지 않았습니다</div>
                )}

                {project.layers.villainArc.data && (
                  <div className="rounded-lg bg-base-primary p-3">
                    <div className="mb-1 text-xs text-red-400">빌런</div>
                    <div className="font-medium text-text-primary">{project.layers.villainArc.data.name}</div>
                    <p className="mt-1 text-sm text-text-muted">{project.layers.villainArc.data.motivation}</p>
                  </div>
                )}
              </div>
            )}

            {sideTab === 'manuscript' && (
              <div className="space-y-4">
                {/* 품질 추적 통계 (모바일) */}
                {(() => {
                  const writingMemory = getWritingMemory();
                  if (writingMemory && writingMemory.totalEpisodes > 0) {
                    const stats = getWritingMemoryStats(writingMemory);
                    return (
                      <div className="rounded-lg bg-base-primary p-3 border border-base-border">
                        <div className="text-xs text-text-muted mb-2">품질 추적</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-text-muted">채택률:</span>
                            <span className={`ml-1 font-medium ${stats.directAdoptionRate >= 70 ? 'text-seojin' : 'text-text-primary'}`}>
                              {stats.directAdoptionRate}%
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted">편집량:</span>
                            <span className={`ml-1 font-medium ${stats.averageEditAmount <= 20 ? 'text-seojin' : 'text-text-primary'}`}>
                              {stats.averageEditAmount}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 에피소드 목록 (모바일) */}
                <div className="space-y-2">
                  {project.episodes.length > 0 ? (
                    project.episodes.map((ep) => (
                      <button
                        key={ep.id}
                        onClick={() => {
                          if (ep.status !== 'final') {
                            setEditingEpisodeId(ep.id);
                            setShowMobilePanel(false);
                          }
                        }}
                        className={`w-full rounded-lg p-3 text-left transition-colors ${
                          editingEpisodeId === ep.id
                            ? 'bg-seojin/20 border border-seojin'
                            : 'bg-base-primary hover:bg-base-tertiary'
                        } ${ep.status === 'final' ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">
                              {ep.number}화: {ep.title}
                            </span>
                            {ep.status === 'final' && (
                              <span className="text-xs text-seojin">✓</span>
                            )}
                          </div>
                          <span className="text-xs text-text-muted">{ep.charCount}자</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-text-muted">아직 작성된 원고가 없습니다</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 캐릭터 추가 모달 */}
      {showAddCharacterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full bg-base-secondary rounded-xl shadow-xl border border-base-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-base-border px-4 py-3 sticky top-0 bg-base-secondary">
              <h3 className="font-medium text-text-primary">새 캐릭터 추가</h3>
              <button
                onClick={() => setShowAddCharacterModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* 필수 필드 */}
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  이름 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newCharacter.name || ''}
                  onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                  placeholder="캐릭터 이름"
                  className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-seojin"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  역할 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newCharacter.role || ''}
                  onChange={(e) => setNewCharacter({ ...newCharacter, role: e.target.value })}
                  placeholder="예: 상인, 기사단장, 현자"
                  className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-seojin"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">위치/지역</label>
                <input
                  type="text"
                  value={newCharacter.location || ''}
                  onChange={(e) => setNewCharacter({ ...newCharacter, location: e.target.value })}
                  placeholder="예: 왕도, 변방 마을"
                  className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-seojin"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">성격</label>
                <textarea
                  value={newCharacter.personality || ''}
                  onChange={(e) => setNewCharacter({ ...newCharacter, personality: e.target.value })}
                  placeholder="성격 특성 묘사"
                  rows={2}
                  className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-seojin resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">숨겨진 동기</label>
                <textarea
                  value={newCharacter.hiddenMotivation || ''}
                  onChange={(e) => setNewCharacter({ ...newCharacter, hiddenMotivation: e.target.value })}
                  placeholder="이 캐릭터의 진짜 목적"
                  rows={2}
                  className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-seojin resize-none"
                />
              </div>

              {/* 선택 필드 (접기 가능) */}
              <details className="group">
                <summary className="text-sm text-seojin cursor-pointer hover:underline">
                  + 상세 설정
                </summary>
                <div className="mt-3 space-y-3 pl-2 border-l-2 border-seojin/30">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">소속 세력</label>
                    <input
                      type="text"
                      value={newCharacter.faction || ''}
                      onChange={(e) => setNewCharacter({ ...newCharacter, faction: e.target.value })}
                      placeholder="예: 왕실, 상인 길드"
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-seojin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">외모</label>
                    <textarea
                      value={newCharacter.appearance || ''}
                      onChange={(e) => setNewCharacter({ ...newCharacter, appearance: e.target.value })}
                      placeholder="외모 묘사"
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">말투/화법</label>
                    <input
                      type="text"
                      value={newCharacter.speechPattern || ''}
                      onChange={(e) => setNewCharacter({ ...newCharacter, speechPattern: e.target.value })}
                      placeholder="예: 존댓말, 사투리, 고풍스러운 어투"
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-seojin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">배경 스토리</label>
                    <textarea
                      value={newCharacter.backstory || ''}
                      onChange={(e) => setNewCharacter({ ...newCharacter, backstory: e.target.value })}
                      placeholder="이 캐릭터의 과거"
                      rows={3}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>
                </div>
              </details>
            </div>
            <div className="flex gap-2 border-t border-base-border px-4 py-3 sticky bottom-0 bg-base-secondary">
              <button
                onClick={handleAddCharacter}
                disabled={!newCharacter.name || !newCharacter.role}
                className="flex-1 rounded-lg bg-seojin px-4 py-2 text-sm text-white hover:bg-seojin/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                추가
              </button>
              <button
                onClick={() => setShowAddCharacterModal(false)}
                className="flex-1 rounded-lg bg-base-tertiary px-4 py-2 text-sm text-text-secondary hover:bg-base-border"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 캐릭터 업로드 결과 모달 */}
      {showCharacterUploadResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-2xl w-full bg-base-secondary rounded-xl shadow-xl border border-base-border max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-base-border px-4 py-3 shrink-0">
              <h3 className="font-medium text-text-primary">📄 캐릭터 파일 분석 결과</h3>
              <button
                onClick={() => setShowCharacterUploadResult(false)}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* 에러 메시지 */}
              {characterUploadErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="text-sm text-red-400 font-medium mb-1">파싱 경고</div>
                  {characterUploadErrors.map((err, i) => (
                    <div key={i} className="text-xs text-red-300">{err}</div>
                  ))}
                </div>
              )}

              {/* 파싱된 캐릭터 목록 */}
              {parsedCharacters.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">
                      {parsedCharacters.length}명의 캐릭터 발견 ({selectedParsedCharacters.size}명 선택됨)
                    </span>
                    <button
                      onClick={() => {
                        if (selectedParsedCharacters.size === parsedCharacters.length) {
                          setSelectedParsedCharacters(new Set());
                        } else {
                          setSelectedParsedCharacters(new Set(parsedCharacters.map((_, i) => i)));
                        }
                      }}
                      className="text-xs text-seojin hover:underline"
                    >
                      {selectedParsedCharacters.size === parsedCharacters.length ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>

                  {parsedCharacters.map((char, index) => (
                    <div
                      key={index}
                      onClick={() => toggleParsedCharacter(index)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedParsedCharacters.has(index)
                          ? 'bg-seojin/10 border-seojin/50'
                          : 'bg-base-tertiary border-base-border hover:border-base-border/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          selectedParsedCharacters.has(index)
                            ? 'bg-seojin border-seojin text-white'
                            : 'border-base-border'
                        }`}>
                          {selectedParsedCharacters.has(index) && '✓'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-text-primary">{char.name}</span>
                            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                              {char.role}
                            </span>
                            {char.importance && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                char.importance === 'major'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : char.importance === 'minor'
                                  ? 'bg-gray-500/20 text-gray-400'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}>
                                {char.importance === 'major' ? '주연' : char.importance === 'minor' ? '단역' : '조연'}
                              </span>
                            )}
                          </div>
                          {char.personality && (
                            <div className="text-xs text-text-muted line-clamp-2">{char.personality}</div>
                          )}
                          {char.backstory && (
                            <div className="text-xs text-text-muted mt-1 line-clamp-2">
                              <span className="text-purple-400">배경:</span> {char.backstory}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {char.location && (
                              <span className="text-xs px-2 py-0.5 bg-base-primary rounded text-text-muted">
                                📍 {char.location}
                              </span>
                            )}
                            {char.faction && (
                              <span className="text-xs px-2 py-0.5 bg-base-primary rounded text-text-muted">
                                🏛️ {char.faction}
                              </span>
                            )}
                            {char.speechPattern && (
                              <span className="text-xs px-2 py-0.5 bg-base-primary rounded text-text-muted">
                                💬 {char.speechPattern}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-text-muted py-8">
                  <div className="text-4xl mb-2">😕</div>
                  <div>캐릭터를 찾지 못했어요.</div>
                  <div className="text-xs mt-2">TXT 형식을 확인해주세요.</div>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-base-border px-4 py-3 shrink-0">
              <button
                onClick={handleAddParsedCharacters}
                disabled={selectedParsedCharacters.size === 0}
                className="flex-1 rounded-lg bg-seojin px-4 py-2 text-sm text-white hover:bg-seojin/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedParsedCharacters.size}명 추가
              </button>
              <button
                onClick={() => setShowCharacterUploadResult(false)}
                className="flex-1 rounded-lg bg-base-tertiary px-4 py-2 text-sm text-text-secondary hover:bg-base-border"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 팩트 체크 모달 */}
      {showFactCheckModal && factCheckResult && factCheckResult.hasContradictions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-lg w-full bg-base-secondary rounded-xl shadow-xl border border-base-border">
            <div className="flex items-center justify-between border-b border-base-border px-4 py-3">
              <h3 className="font-medium text-text-primary flex items-center gap-2">
                {factCheckResult.overallSeverity === 'critical' ? '🚨' : '⚠️'}
                설정 모순 발견
              </h3>
              <button
                onClick={() => setShowFactCheckModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {factCheckResult.contradictions.map((c, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg ${
                      c.severity === 'critical'
                        ? 'bg-red-500/10 border border-red-500/30'
                        : c.severity === 'major'
                        ? 'bg-yellow-500/10 border border-yellow-500/30'
                        : 'bg-blue-500/10 border border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        c.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : c.severity === 'major'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {c.severity}
                      </span>
                      <span className="text-sm font-medium text-text-primary">{c.field}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="text-text-muted">
                        <span className="text-text-secondary">세계관:</span> {c.worldBibleValue}
                      </div>
                      <div className="text-text-muted">
                        <span className="text-text-secondary">에피소드:</span> {c.episodeValue}
                      </div>
                      <div className="text-accent-primary mt-2">
                        💡 {c.suggestion}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 border-t border-base-border px-4 py-3">
              <button
                onClick={() => {
                  setShowFactCheckModal(false);
                  // TODO: 수정 요청 로직
                }}
                className="flex-1 rounded-lg bg-accent-primary px-4 py-2 text-sm text-white hover:bg-accent-primary/90"
              >
                수정 요청
              </button>
              <button
                onClick={() => setShowFactCheckModal(false)}
                className="flex-1 rounded-lg bg-base-tertiary px-4 py-2 text-sm text-text-secondary hover:bg-base-border"
              >
                무시하고 진행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 떡밥 경고 토스트 */}
      {breadcrumbWarnings.length > 0 && !showFactCheckModal && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full">
          <div className="bg-base-secondary rounded-lg shadow-xl border border-yellow-500/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                📌 떡밥 경고 ({breadcrumbWarnings.length}개)
              </span>
              <button
                onClick={() => setBreadcrumbWarnings([])}
                className="text-text-muted hover:text-text-primary text-sm"
              >
                닫기
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {breadcrumbWarnings.slice(0, 3).map((w, i) => (
                <div key={i} className="text-sm text-text-muted">
                  <span className="text-text-secondary">{w.breadcrumbName}:</span> {w.message}
                </div>
              ))}
              {breadcrumbWarnings.length > 3 && (
                <div className="text-xs text-text-muted">
                  +{breadcrumbWarnings.length - 3}개 더...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 에피소드 디렉팅 모달 */}
      <EpisodeDirectionModal
        isOpen={showDirectionModal}
        onClose={() => setShowDirectionModal(false)}
        onConfirm={(direction) => setCurrentEpisodeDirection(direction)}
        episodeNumber={project ? project.episodes.length + 1 : 1}
        heroArc={project?.layers.heroArc.data as HeroArcLayer | null}
        villainArc={project?.layers.villainArc.data as VillainArcLayer | null}
        seedsLayer={project?.layers.seeds.data as SeedsLayer | null}
        existingDirection={currentEpisodeDirection}
      />

      {/* 세계관 편집 모달 */}
      {showWorldEditor && (
        <WorldSettingsEditor
          heroArc={project?.layers.heroArc.data as HeroArcLayer | null}
          villainArc={project?.layers.villainArc.data as VillainArcLayer | null}
          seedsLayer={project?.layers.seeds.data as SeedsLayer | null}
          onSave={handleSaveWorldSettings}
          onClose={() => setShowWorldEditor(false)}
        />
      )}

      {/* 타임라인 편집 모달 */}
      {showTimelineEditor && project && (
        <TimelineEditor
          eras={project.worldHistory.eras || []}
          detailedDecades={project.worldHistory.detailedDecades || []}
          onSave={handleSaveTimeline}
          onClose={() => setShowTimelineEditor(false)}
        />
      )}
    </div>
  );
}
