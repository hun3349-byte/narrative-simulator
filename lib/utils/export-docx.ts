import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import { NovelProject, Chapter, DetailScene } from '../types';

export async function exportToDocx(
  project: NovelProject,
  chapters: Chapter[],
  detailScenes: Record<string, DetailScene>
): Promise<Uint8Array> {
  const children: Paragraph[] = [];

  // 표지
  children.push(
    new Paragraph({ spacing: { before: 3000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: project.title, bold: true, size: 48, font: 'Pretendard' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [new TextRun({ text: 'Narrative Simulator', size: 24, color: '888888', font: 'Pretendard' })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 챕터별 본문
  chapters.forEach((chapter) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
        children: [new TextRun({ text: `제${chapter.number}장. ${chapter.title}`, bold: true, size: 32, font: 'Pretendard' })],
      })
    );

    chapter.scenes.forEach((event, idx) => {
      const scene = event.detailScene || detailScenes[event.id];
      if (scene) {
        const paragraphs = scene.content.split('\n').filter((p) => p.trim());
        paragraphs.forEach((p) => {
          children.push(
            new Paragraph({
              spacing: { after: 200, line: 400 },
              indent: { firstLine: 400 },
              children: [new TextRun({ text: p.trim(), size: 22, font: 'Pretendard' })],
            })
          );
        });

        // 장면 구분자
        if (idx < chapter.scenes.length - 1) {
          const next = chapter.scenes[idx + 1];
          const yearDiff = next.year - event.year;
          let sepText = '※   ※   ※';
          if (yearDiff > 1) {
            sepText = `━━━ ${yearDiff}년 후 ━━━`;
          } else if (next.characterId === event.characterId) {
            sepText = '────────';
          }
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 400 },
              children: [new TextRun({ text: sepText, size: 20, color: '888888' })],
            })
          );
        }
      }
    });

    children.push(new Paragraph({ children: [new PageBreak()] }));
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Pretendard', size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
