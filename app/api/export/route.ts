import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import type { Episode } from '@/lib/types';

export const maxDuration = 60; // Railway/Vercel 타임아웃 대응

interface ExportRequest {
  format: 'txt' | 'html' | 'docx';
  episodes: Episode[];
  projectInfo?: {
    genre?: string;
    tone?: string;
    authorName?: string;
    title?: string;
  };
}

export async function POST(req: NextRequest) {
  console.log('[Export API] Request received');

  try {
    let body: ExportRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('[Export API] JSON parse error:', parseError);
      return NextResponse.json(
        { error: '요청 데이터 파싱 실패' },
        { status: 400 }
      );
    }

    const { format, episodes, projectInfo } = body;

    console.log('[Export API] Format:', format);
    console.log('[Export API] Episodes:', JSON.stringify(episodes?.slice(0, 1)).slice(0, 200));
    console.log('[Export API] Episodes count:', episodes?.length);
    console.log('[Export API] ProjectInfo:', JSON.stringify(projectInfo));

    // 에피소드 검증
    if (!episodes || !Array.isArray(episodes)) {
      console.log('[Export API] Error: episodes is not an array');
      return NextResponse.json(
        { error: '에피소드 데이터가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    if (episodes.length === 0) {
      console.log('[Export API] Error: No episodes');
      return NextResponse.json(
        { error: '내보낼 에피소드가 없습니다. 먼저 에피소드를 작성해주세요.' },
        { status: 400 }
      );
    }

    // 각 에피소드 검증 및 정규화
    const validEpisodes = episodes.map((ep, idx) => ({
      id: ep.id || `ep-${idx}`,
      number: ep.number || idx + 1,
      title: ep.title || '',
      content: ep.content || ep.editedContent || '',
      editedContent: ep.editedContent,
      charCount: ep.charCount || (ep.content?.length || 0),
      status: ep.status || 'draft',
    }));

    // content가 있는 에피소드만 필터링
    const exportableEpisodes = validEpisodes.filter(ep => ep.content && ep.content.trim().length > 0);

    if (exportableEpisodes.length === 0) {
      console.log('[Export API] Error: No episodes with content');
      return NextResponse.json(
        { error: '내보낼 본문이 있는 에피소드가 없습니다.' },
        { status: 400 }
      );
    }

    console.log('[Export API] Valid episodes:', exportableEpisodes.length);

    // 형식 검증
    if (!format || !['txt', 'html', 'docx'].includes(format)) {
      console.log('[Export API] Error: Invalid format:', format);
      return NextResponse.json(
        { error: `지원하지 않는 형식입니다: ${format}` },
        { status: 400 }
      );
    }

    const title = projectInfo?.title || `웹소설_${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case 'txt': {
        console.log('[Export API] Generating TXT');
        const text = exportEpisodesToTxt(exportableEpisodes, projectInfo);
        console.log('[Export API] TXT length:', text.length);
        return new Response(text, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.txt"`,
          },
        });
      }

      case 'html': {
        console.log('[Export API] Generating HTML');
        const html = exportEpisodesToHtml(exportableEpisodes, projectInfo);
        console.log('[Export API] HTML length:', html.length);
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.html"`,
          },
        });
      }

      case 'docx': {
        console.log('[Export API] Generating DOCX');
        try {
          const buffer = await exportEpisodesToDocx(exportableEpisodes, projectInfo);
          console.log('[Export API] DOCX buffer size:', buffer.length);
          return new Response(buffer as unknown as BodyInit, {
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.docx"`,
            },
          });
        } catch (docxError) {
          console.error('[Export API] DOCX generation error:', docxError);
          return NextResponse.json(
            { error: 'DOCX 생성 중 오류가 발생했습니다.' },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json({ error: '지원하지 않는 형식입니다.' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Export API] Error:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json(
      { error: `내보내기 중 오류: ${message}` },
      { status: 500 }
    );
  }
}

// 정규화된 에피소드 타입
interface NormalizedEpisode {
  id: string;
  number: number;
  title: string;
  content: string;
  editedContent?: string;
  charCount: number;
  status: string;
}

/**
 * TXT 내보내기
 */
function exportEpisodesToTxt(
  episodes: NormalizedEpisode[],
  projectInfo?: ExportRequest['projectInfo']
): string {
  let output = '';

  // 제목
  const title = projectInfo?.title || '웹소설';
  output += `${title}\n`;
  output += `${'═'.repeat(40)}\n\n`;

  // 정보
  if (projectInfo?.genre || projectInfo?.tone || projectInfo?.authorName) {
    if (projectInfo.genre) output += `장르: ${projectInfo.genre}\n`;
    if (projectInfo.tone) output += `톤: ${projectInfo.tone}\n`;
    if (projectInfo.authorName) output += `작가: ${projectInfo.authorName}\n`;
    output += '\n';
  }

  // 에피소드별 본문
  episodes.forEach((episode) => {
    output += `\n${'─'.repeat(40)}\n`;
    output += `제${episode.number}화 ${episode.title || ''}\n`;
    output += `${'─'.repeat(40)}\n\n`;

    // editedContent가 있으면 사용, 없으면 content
    const content = episode.editedContent || episode.content;
    output += content;
    output += '\n\n';

    // 글자수
    output += `[${episode.charCount.toLocaleString()}자]\n`;
  });

  // 통계
  output += '\n\n';
  output += `${'═'.repeat(40)}\n`;
  output += `총 ${episodes.length}화\n`;
  const totalChars = episodes.reduce((sum, ep) => sum + ep.charCount, 0);
  output += `총 ${totalChars.toLocaleString()}자\n`;

  return output;
}

/**
 * HTML 내보내기
 */
function exportEpisodesToHtml(
  episodes: NormalizedEpisode[],
  projectInfo?: ExportRequest['projectInfo']
): string {
  const title = projectInfo?.title || '웹소설';
  const totalChars = episodes.reduce((sum, ep) => sum + ep.charCount, 0);

  const episodeHtml = episodes
    .map((episode) => {
      const content = (episode.editedContent || episode.content)
        .split('\n')
        .map((p) => (p.trim() ? `<p>${escapeHtml(p)}</p>` : ''))
        .join('');

      return `
        <article class="episode" id="ep-${episode.number}">
          <header class="episode-header">
            <span class="episode-number">제${episode.number}화</span>
            <h2>${escapeHtml(episode.title || '')}</h2>
          </header>
          <div class="episode-content">
            ${content}
          </div>
          <footer class="episode-footer">
            <span>${episode.charCount.toLocaleString()}자</span>
          </footer>
        </article>
      `;
    })
    .join('\n<hr class="episode-divider">\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Noto Serif KR', serif;
      background: #1a1a1a;
      color: #e0e0e0;
      line-height: 1.9;
      padding: 20px;
    }

    .container {
      max-width: 700px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      padding: 40px 0;
      border-bottom: 1px solid #333;
      margin-bottom: 40px;
    }

    .header h1 {
      font-size: 2em;
      margin-bottom: 20px;
    }

    .header .meta {
      color: #888;
      font-size: 0.9em;
    }

    .toc {
      background: #222;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 40px;
    }

    .toc h3 {
      margin-bottom: 15px;
      color: #aaa;
    }

    .toc ul {
      list-style: none;
    }

    .toc li {
      padding: 8px 0;
      border-bottom: 1px solid #333;
    }

    .toc li:last-child {
      border-bottom: none;
    }

    .toc a {
      color: #888;
      text-decoration: none;
    }

    .toc a:hover {
      color: #fff;
    }

    .episode {
      margin-bottom: 60px;
    }

    .episode-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .episode-number {
      display: block;
      color: #666;
      font-size: 0.9em;
      margin-bottom: 10px;
    }

    .episode-header h2 {
      font-size: 1.5em;
    }

    .episode-content p {
      text-indent: 1em;
      margin-bottom: 1em;
    }

    .episode-footer {
      margin-top: 30px;
      text-align: right;
      color: #666;
      font-size: 0.85em;
    }

    .episode-divider {
      border: none;
      border-top: 1px solid #333;
      margin: 60px 0;
    }

    .footer {
      text-align: center;
      padding: 40px 0;
      border-top: 1px solid #333;
      margin-top: 40px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        ${projectInfo?.genre ? `<span>${escapeHtml(projectInfo.genre)}</span>` : ''}
        ${projectInfo?.authorName ? `<span> · ${escapeHtml(projectInfo.authorName)}</span>` : ''}
        <br>
        <span>총 ${episodes.length}화 · ${totalChars.toLocaleString()}자</span>
      </div>
    </header>

    <nav class="toc">
      <h3>목차</h3>
      <ul>
        ${episodes.map((ep) => `<li><a href="#ep-${ep.number}">제${ep.number}화 ${escapeHtml(ep.title || '')}</a></li>`).join('\n')}
      </ul>
    </nav>

    <main>
      ${episodeHtml}
    </main>

    <footer class="footer">
      <p>Narrative Simulator로 생성됨</p>
      <p>${new Date().toLocaleDateString('ko-KR')}</p>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * DOCX 내보내기
 */
async function exportEpisodesToDocx(
  episodes: NormalizedEpisode[],
  projectInfo?: ExportRequest['projectInfo']
): Promise<Uint8Array> {
  const title = projectInfo?.title || '웹소설';
  const children: Paragraph[] = [];

  // 표지
  children.push(
    new Paragraph({ spacing: { before: 3000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true, size: 48 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [new TextRun({ text: 'Narrative Simulator', size: 24, color: '888888' })],
    })
  );

  // 정보
  if (projectInfo?.genre || projectInfo?.authorName) {
    children.push(
      new Paragraph({ spacing: { before: 600 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: [projectInfo.genre, projectInfo.authorName].filter(Boolean).join(' · '),
            size: 20,
            color: '888888',
          }),
        ],
      })
    );
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // 에피소드별 본문
  episodes.forEach((episode, idx) => {
    // 제목
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: `제${episode.number}화`, bold: true, size: 28 })],
      })
    );

    if (episode.title) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: episode.title, size: 24 })],
        })
      );
    }

    // 본문
    const content = episode.editedContent || episode.content;
    const paragraphs = content.split('\n').filter((p) => p.trim());
    paragraphs.forEach((p) => {
      children.push(
        new Paragraph({
          spacing: { after: 200, line: 400 },
          indent: { firstLine: 400 },
          children: [new TextRun({ text: p.trim(), size: 22 })],
        })
      );
    });

    // 글자수
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 400 },
        children: [new TextRun({ text: `[${episode.charCount.toLocaleString()}자]`, size: 18, color: '888888' })],
      })
    );

    // 페이지 나누기 (마지막 에피소드 제외)
    if (idx < episodes.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // A4
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
