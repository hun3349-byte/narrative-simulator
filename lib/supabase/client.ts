import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabase 클라이언트 (환경변수가 없으면 null)
// 타입 제네릭 없이 생성하여 유연한 쿼리 지원
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Supabase 사용 가능 여부
export const isSupabaseEnabled = !!supabase;

// 브라우저 고유 ID 생성/조회
export function getBrowserUserId(): string {
  if (typeof window === 'undefined') return 'server';

  let userId = localStorage.getItem('narrative_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('narrative_user_id', userId);
  }
  return userId;
}
