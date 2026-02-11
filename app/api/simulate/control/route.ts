import { NextRequest } from 'next/server';
import { activeSessions } from '@/lib/utils/simulation-sessions';

export async function POST(req: NextRequest) {
  const { sessionId, action } = await req.json();

  if (!sessionId || !action) {
    return new Response(
      JSON.stringify({ error: 'sessionId와 action이 필요합니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    return new Response(
      JSON.stringify({ error: '세션을 찾을 수 없습니다.', sessionId }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  switch (action) {
    case 'pause':
      session.pauseFlag.paused = true;
      return Response.json({ ok: true, status: 'paused' });

    case 'resume':
      session.pauseFlag.paused = false;
      return Response.json({ ok: true, status: 'resumed' });

    case 'abort':
      session.abortController.abort();
      activeSessions.delete(sessionId);
      return Response.json({ ok: true, status: 'aborted' });

    default:
      return new Response(
        JSON.stringify({ error: `알 수 없는 action: ${action}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
  }
}
