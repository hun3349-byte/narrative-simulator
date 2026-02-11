import { NextRequest, NextResponse } from 'next/server';
import { exportToTxt } from '@/lib/utils/export-txt';
import { exportToHtml } from '@/lib/utils/export-html';
import { exportToDocx } from '@/lib/utils/export-docx';

export async function POST(req: NextRequest) {
  try {
    const { format, project, chapters, detailScenes, colorMap } = await req.json();

    switch (format) {
      case 'txt': {
        const text = exportToTxt(project, chapters, detailScenes);
        return new Response(text, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(project.title)}.txt"`,
          },
        });
      }
      case 'html': {
        const html = exportToHtml(project, chapters, detailScenes, colorMap);
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(project.title)}.html"`,
          },
        });
      }
      case 'docx': {
        const buffer = await exportToDocx(project, chapters, detailScenes);
        return new Response(buffer as unknown as BodyInit, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(project.title)}.docx"`,
          },
        });
      }
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
