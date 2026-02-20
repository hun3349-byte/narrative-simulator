import { supabase, isSupabaseEnabled, getBrowserUserId } from './client';
import type { SharedProjectData } from './types';
import type { Project, WorldBible, EpisodeLog } from '../types';

// 프로젝트를 Supabase 형식으로 변환 (사용자 스키마에 맞춤)
function projectToSupabase(project: Project) {
  return {
    id: project.id,
    user_id: getBrowserUserId(),
    title: project.direction?.slice(0, 100) || `${project.genre} 프로젝트`,
    genre: project.genre,
    tone: project.tone,
    viewpoint: project.viewpoint,
    author_persona: {
      id: project.authorPersona.id,
      name: project.authorPersona.name,
      style: project.authorPersona.style,
    },
    // layers에 추가 정보 포함
    layers: {
      world: project.layers.world.data,
      coreRules: project.layers.coreRules.data,
      seeds: project.layers.seeds.data,
      heroArc: project.layers.heroArc.data,
      villainArc: project.layers.villainArc.data,
      ultimateMystery: project.layers.ultimateMystery.data,
      // 추가 메타 정보
      _meta: {
        direction: project.direction,
        currentLayer: project.currentLayer,
        currentPhase: project.currentPhase,
        worldHistory: project.worldHistory,
        messages: project.messages,
      },
    },
    layer_status: {
      world: project.layers.world.status,
      coreRules: project.layers.coreRules.status,
      seeds: project.layers.seeds.status,
      heroArc: project.layers.heroArc.status,
      villainArc: project.layers.villainArc.status,
      ultimateMystery: project.layers.ultimateMystery.status,
      novel: 'pending',
    },
    episodes: project.episodes.map(ep => ({
      id: ep.id,
      number: ep.number,
      title: ep.title,
      content: ep.content,
      editedContent: ep.editedContent,
      charCount: ep.charCount,
      status: ep.status,
      pov: ep.pov,
      sourceEventIds: ep.sourceEventIds,
      authorNote: ep.authorNote,
      endHook: ep.endHook,
      createdAt: ep.createdAt,
      updatedAt: ep.updatedAt,
    })),
    feedback_history: project.feedbackHistory?.map(fb => ({
      id: fb.id,
      episodeNumber: fb.episodeNumber,
      type: fb.type,
      content: fb.content,
      isRecurring: fb.isRecurring,
      timestamp: fb.timestamp,
    })) || [],
    // 일관성 엔진 데이터
    world_bible: project.worldBible || null,
    episode_logs: project.episodeLogs?.map(log => ({
      episodeNumber: log.episodeNumber,
      summary: log.summary,
      scenes: log.scenes,
      characterChanges: log.characterChanges,
      relationshipChanges: log.relationshipChanges,
      breadcrumbActivity: log.breadcrumbActivity,
      cliffhangerType: log.cliffhangerType,
      cliffhangerContent: log.cliffhangerContent,
      unresolvedTensions: log.unresolvedTensions,
      dominantMonologueTone: log.dominantMonologueTone,
      miniArcPosition: log.miniArcPosition,
      buildupPhase: log.buildupPhase,
      generatedAt: log.generatedAt,
    })) || [],
    created_at: project.createdAt,
    updated_at: new Date().toISOString(),
  };
}

// 프로젝트 저장 (upsert)
export async function saveProjectToSupabase(project: Project): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const data = projectToSupabase(project);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from('projects')
      .upsert(data as any, { onConflict: 'id' });

    if (error) {
      console.error('Supabase save error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Supabase save exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// 사용자의 모든 프로젝트 불러오기
export async function loadProjectsFromSupabase(): Promise<{ projects: Project[]; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { projects: [], error: 'Supabase not configured' };
  }

  try {
    const userId = getBrowserUserId();

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase load error:', error);
      return { projects: [], error: error.message };
    }

    if (!data) {
      return { projects: [] };
    }

    // Supabase 데이터를 Project 형식으로 변환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projects: Project[] = data.map((row: any) => {
      const meta = row.layers?._meta || {};

      return {
        id: row.id,
        genre: row.genre || '',
        tone: row.tone || '',
        viewpoint: row.viewpoint || '',
        direction: meta.direction || '',
        authorPersona: row.author_persona as Project['authorPersona'],
        currentLayer: (meta.currentLayer || 'world') as Project['currentLayer'],
        currentPhase: (meta.currentPhase || 'setup') as Project['currentPhase'],
        layers: {
          world: { status: row.layer_status?.world as 'pending' | 'drafting' | 'confirmed' || 'pending', data: row.layers?.world || null },
          coreRules: { status: row.layer_status?.coreRules as 'pending' | 'drafting' | 'confirmed' || 'pending', data: row.layers?.coreRules || null },
          seeds: { status: row.layer_status?.seeds as 'pending' | 'drafting' | 'confirmed' || 'pending', data: row.layers?.seeds || null },
          heroArc: { status: row.layer_status?.heroArc as 'pending' | 'drafting' | 'confirmed' || 'pending', data: row.layers?.heroArc || null },
          villainArc: { status: row.layer_status?.villainArc as 'pending' | 'drafting' | 'confirmed' || 'pending', data: row.layers?.villainArc || null },
          ultimateMystery: { status: row.layer_status?.ultimateMystery as 'pending' | 'drafting' | 'confirmed' || 'pending', data: row.layers?.ultimateMystery || null },
        },
        worldHistory: meta.worldHistory || { eras: [], detailedDecades: [] },
        episodes: (row.episodes || []) as Project['episodes'],
        messages: (meta.messages || []) as Project['messages'],
        feedbackHistory: (row.feedback_history || []) as Project['feedbackHistory'],
        // 로컬 전용 필드 - 기본값
        characters: [],
        seeds: [],
        memoryStacks: {},
        profiles: {},
        npcPool: { npcs: [], maxActive: 30 },
        simulationStatus: 'idle' as const,
        // 일관성 엔진 데이터
        worldBible: row.world_bible as WorldBible | undefined,
        episodeLogs: (row.episode_logs || []) as EpisodeLog[],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return { projects };
  } catch (err) {
    console.error('Supabase load exception:', err);
    return { projects: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// 프로젝트 삭제
export async function deleteProjectFromSupabase(projectId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Supabase delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Supabase delete exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// 공유용 프로젝트 조회 (스포일러 제외)
export async function getSharedProject(projectId: string): Promise<{ data: SharedProjectData | null; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, genre, tone, viewpoint, author_persona, layers, episodes')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Supabase shared fetch error:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Project not found' };
    }

    // 스포일러 제외한 공개 데이터만 반환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layers = data.layers as any;
    const sharedData: SharedProjectData = {
      id: data.id,
      title: data.title,
      genre: data.genre,
      tone: data.tone,
      viewpoint: data.viewpoint,
      authorPersona: {
        name: (data.author_persona as { name: string })?.name || '작가',
      },
      world: layers?.world ? {
        continentName: layers.world.continentName,
        geography: layers.world.geography,
        cities: layers.world.cities,
      } : null,
      hero: layers?.heroArc ? {
        name: layers.heroArc.name,
        origin: layers.heroArc.origin,
        coreNarrative: layers.heroArc.coreNarrative,
      } : null,
      // final 상태 에피소드만
      episodes: ((data.episodes || []) as Array<{ number: number; title: string; content: string; charCount: number; status: string }>)
        .filter(ep => ep.status === 'final')
        .map(ep => ({
          number: ep.number,
          title: ep.title,
          content: ep.content,
          charCount: ep.charCount,
        })),
    };

    return { data: sharedData };
  } catch (err) {
    console.error('Supabase shared fetch exception:', err);
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Supabase 연결 테스트
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase.from('projects').select('id').limit(1);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
