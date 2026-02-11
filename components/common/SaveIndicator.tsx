'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/lib/store/project-store';

export default function SaveIndicator() {
  const [showSaved, setShowSaved] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const { projects, currentProjectId } = useProjectStore();

  // 현재 프로젝트의 updatedAt 추적
  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentUpdatedAt = currentProject?.updatedAt || null;

  useEffect(() => {
    // 첫 로드 시에는 표시하지 않음
    if (lastUpdate === null) {
      setLastUpdate(currentUpdatedAt);
      return;
    }

    // updatedAt이 변경되면 "저장됨" 표시
    if (currentUpdatedAt && currentUpdatedAt !== lastUpdate) {
      setLastUpdate(currentUpdatedAt);
      setShowSaved(true);

      // 2초 후 숨김
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentUpdatedAt, lastUpdate]);

  if (!showSaved) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-2 rounded-full bg-base-card border border-seojin/30 px-4 py-2 shadow-lg">
        <span className="text-seojin text-sm">✓</span>
        <span className="text-sm text-text-primary">저장됨</span>
      </div>
    </div>
  );
}
