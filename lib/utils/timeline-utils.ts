import { NarrativeEvent, WorldEvent } from '../types';

export function groupEventsByYear(events: NarrativeEvent[]): Record<number, NarrativeEvent[]> {
  return events.reduce((acc, event) => {
    if (!acc[event.year]) acc[event.year] = [];
    acc[event.year].push(event);
    return acc;
  }, {} as Record<number, NarrativeEvent[]>);
}

export function getEventsForCharacter(events: NarrativeEvent[], characterId: string): NarrativeEvent[] {
  return events.filter(e => e.characterId === characterId);
}

export function getWorldEventForYear(worldEvents: WorldEvent[], year: number): WorldEvent | undefined {
  return worldEvents.find(we => we.year === year);
}

export function getYearRange(startYear: number, endYear: number): number[] {
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }
  return years;
}

export function getSeasonLabel(season: string): string {
  const labels: Record<string, string> = {
    spring: '봄',
    summer: '여름',
    autumn: '가을',
    winter: '겨울',
  };
  return labels[season] || season;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    childhood: '유년기',
    training: '수련기',
    wandering: '방랑기',
    conflict: '갈등기',
    transformation: '변화기',
    convergence: '합류기',
  };
  return labels[status] || status;
}

export function getImportanceSize(importance: string): { width: number; height: number } {
  switch (importance) {
    case 'turning_point': return { width: 20, height: 20 };
    case 'major': return { width: 14, height: 14 };
    case 'minor': return { width: 10, height: 10 };
    default: return { width: 10, height: 10 };
  }
}
