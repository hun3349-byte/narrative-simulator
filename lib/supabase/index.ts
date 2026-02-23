// Supabase exports
export { supabase, isSupabaseEnabled, getBrowserUserId } from './client';
export {
  saveProjectToSupabase,
  loadProjectsFromSupabase,
  deleteProjectFromSupabase,
  getSharedProject,
  loadPublicProjects,
  updateProjectVisibility,
  testSupabaseConnection,
} from './db';
export type {
  Database,
  ProjectRow,
  ProjectInsert,
  ProjectUpdate,
  SharedProjectData,
  PublicProjectSummary,
} from './types';
