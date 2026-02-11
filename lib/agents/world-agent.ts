import { WorldEvent } from '../types';
import worldSettings from '../../data/world-settings.json';

// 시대 정보 타입
interface MajorEra {
  name: string;
  years: [number, number];
  description: string;
}

// Phase 2에서 AI 기반 세계 이벤트 생성으로 확장
export class WorldAgent {
  private worldEvents: WorldEvent[];

  constructor() {
    this.worldEvents = worldSettings.timeline.worldEvents as WorldEvent[];
  }

  getWorldEventForYear(year: number): WorldEvent | undefined {
    return this.worldEvents.find(we => we.year === year);
  }

  getWorldContext(year: number): string {
    const majorEras = worldSettings.timeline.majorEras as MajorEra[];
    const era = majorEras.find(
      e => year >= e.years[0] && year <= e.years[1]
    );
    const event = this.getWorldEventForYear(year);

    let context = `시대: ${era?.name ?? '알 수 없음'} - ${era?.description ?? ''}`;
    if (event) {
      context += `\n대사건: ${event.event} (${event.impact})`;
    }
    return context;
  }
}
