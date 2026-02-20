// Supabase exports
export { supabase, isSupabaseEnabled, getBrowserUserId } from './client';
export {
  saveProjectToSupabase,
  loadProjectsFromSupabase,
  deleteProjectFromSupabase,
  getSharedProject,
  testSupabaseConnection,
} from './db';
export type {
  Database,
  ProjectRow,
  ProjectInsert,
  ProjectUpdate,
  SharedProjectData,
} from './types';
