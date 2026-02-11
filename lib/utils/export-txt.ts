import { NovelProject, Chapter, DetailScene } from '../types';

export function exportToTxt(
  project: NovelProject,
  chapters: Chapter[],
  detailScenes: Record<string, DetailScene>
): string {
  let output = '';

  output += `${project.title}\n`;
  output += `${'═'.repeat(40)}\n\n`;

  chapters.forEach((chapter) => {
    output += `\n제${chapter.number}장. ${chapter.title}\n`;
    output += `${'─'.repeat(30)}\n\n`;

    chapter.scenes.forEach((event, sceneIdx) => {
      const scene = event.detailScene || detailScenes[event.id];
      if (scene) {
        output += scene.content;
        output += '\n\n';

        if (sceneIdx < chapter.scenes.length - 1) {
          const nextEvent = chapter.scenes[sceneIdx + 1];
          const yearDiff = nextEvent.year - event.year;
          if (yearDiff > 1) {
            output += `━━━ ${yearDiff}년 후 ━━━\n\n`;
          } else if (nextEvent.characterId !== event.characterId) {
            output += '※   ※   ※\n\n';
          } else {
            output += '────────\n\n';
          }
        }
      }
    });
  });

  return output;
}
