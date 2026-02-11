import { NovelProject, Chapter, DetailScene } from '../types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportToHtml(
  project: NovelProject,
  chapters: Chapter[],
  detailScenes: Record<string, DetailScene>,
  colorMap?: Record<string, string>
): string {
  // Build TOC
  const tocLinks = chapters
    .map((ch) => `<a href="#ch-${ch.number}">${ch.title}</a>`)
    .join('\n    ');

  // Build chapters content
  const chaptersHtml = chapters
    .map((chapter) => {
      const scenesHtml = chapter.scenes
        .map((event, idx) => {
          const scene = event.detailScene || detailScenes[event.id];
          if (!scene) return '';

          const paragraphs = scene.content
            .split('\n')
            .filter((p) => p.trim())
            .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
            .join('\n        ');

          let separator = '';
          if (idx < chapter.scenes.length - 1) {
            const next = chapter.scenes[idx + 1];
            const yearDiff = next.year - event.year;
            if (yearDiff > 1) {
              separator = `<div class="separator time-jump">━━━ ${yearDiff}년 후 ━━━</div>`;
            } else if (next.characterId !== event.characterId) {
              separator = '<div class="separator">※ &nbsp; ※ &nbsp; ※</div>';
            } else {
              separator = '<div class="separator thin">────────</div>';
            }
          }

          return `
      <div class="scene" data-character="${event.characterId}">
        ${paragraphs}
      </div>
      ${separator}`;
        })
        .join('\n');

      return `
    <h2 class="chapter-title" id="ch-${chapter.number}">제${chapter.number}장. ${escapeHtml(chapter.title)}</h2>
    ${scenesHtml}`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title)}</title>
  <style>
    :root {
      --bg: #FAF8F5;
      --text: #2C2C2C;
      --accent: #4A3F6B;
      --chapter-bg: #F0EDF5;
    }
    [data-theme="dark"] {
      --bg: #0F0F18;
      --text: #E0DDE5;
      --accent: #7B6BA8;
      --chapter-bg: #1A1A2E;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Pretendard', -apple-system, 'Noto Sans KR', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 2.0;
      font-size: 17px;
    }
    .container { max-width: 720px; margin: 0 auto; padding: 40px 20px; }
    .novel-title {
      text-align: center;
      font-size: 2em;
      font-weight: 700;
      margin-bottom: 0.5em;
    }
    .novel-subtitle {
      text-align: center;
      color: var(--accent);
      font-size: 0.9em;
      margin-bottom: 2em;
      opacity: 0.7;
    }
    .chapter-title {
      text-align: center;
      font-size: 1.4em;
      font-weight: 600;
      color: var(--accent);
      margin: 2em 0 1em;
      padding: 0.5em 0;
      border-top: 1px solid var(--accent);
      border-bottom: 1px solid var(--accent);
    }
    .scene { margin-bottom: 2em; }
    .scene p { margin-bottom: 1.5em; text-indent: 1em; }
    ${colorMap ? Object.entries(colorMap).map(([id, color]) =>
      `.scene[data-character="${id}"] { border-left: 3px solid ${color}; padding-left: 16px; }`
    ).join('\n    ') : '.scene { padding-left: 16px; }'}
    .separator {
      text-align: center;
      margin: 2em 0;
      color: var(--accent);
      letter-spacing: 0.5em;
    }
    .separator.thin { color: #CCC; letter-spacing: 0.3em; }
    .separator.time-jump { font-weight: 600; letter-spacing: 0.2em; }
    .controls {
      position: fixed;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 8px;
      z-index: 100;
    }
    .controls button {
      padding: 6px 12px;
      border: 1px solid var(--accent);
      background: var(--bg);
      color: var(--text);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .controls button:hover { opacity: 0.8; }
    .toc {
      position: fixed;
      left: 0;
      top: 0;
      width: 240px;
      height: 100vh;
      background: var(--chapter-bg);
      padding: 20px;
      overflow-y: auto;
      transform: translateX(-100%);
      transition: transform 0.3s;
      z-index: 200;
    }
    .toc.open { transform: translateX(0); }
    .toc h3 { margin-bottom: 1em; font-size: 1.1em; }
    .toc a { display: block; padding: 8px 0; color: var(--text); text-decoration: none; font-size: 0.9em; }
    .toc a:hover { color: var(--accent); }
    .toc-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.3);
      z-index: 150;
    }
    .toc-overlay.open { display: block; }
  </style>
</head>
<body>
  <div class="controls">
    <button onclick="toggleToc()">&#9776; 목차</button>
    <button onclick="toggleTheme()">&#127763;</button>
    <button onclick="changeFontSize(1)">A+</button>
    <button onclick="changeFontSize(-1)">A-</button>
  </div>
  <div class="toc-overlay" id="tocOverlay" onclick="toggleToc()"></div>
  <nav class="toc" id="toc">
    <h3>목차</h3>
    ${tocLinks}
  </nav>
  <div class="container">
    <h1 class="novel-title">${escapeHtml(project.title)}</h1>
    <p class="novel-subtitle">Narrative Simulator</p>
    ${chaptersHtml}
  </div>
  <script>
    function toggleTheme() {
      const html = document.documentElement;
      if (html.getAttribute('data-theme') === 'dark') {
        html.removeAttribute('data-theme');
      } else {
        html.setAttribute('data-theme', 'dark');
      }
    }
    function toggleToc() {
      document.getElementById('toc').classList.toggle('open');
      document.getElementById('tocOverlay').classList.toggle('open');
    }
    let fontSize = 17;
    function changeFontSize(delta) {
      fontSize = Math.max(14, Math.min(24, fontSize + delta));
      document.body.style.fontSize = fontSize + 'px';
    }
  </script>
</body>
</html>`;
}
