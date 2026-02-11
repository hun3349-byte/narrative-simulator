// 서버 사이드 활성 시뮬레이션 세션 관리 싱글턴
// SSE route와 control route가 동일 인스턴스를 참조

export interface ActiveSession {
  pauseFlag: { paused: boolean };
  abortController: AbortController;
}

export const activeSessions = new Map<string, ActiveSession>();
