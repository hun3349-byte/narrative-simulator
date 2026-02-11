'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/projects');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-primary">
      <div className="text-center">
        <div className="mb-4 text-2xl font-serif text-text-primary">
          Narrative Simulator
        </div>
        <div className="text-text-muted">
          프로젝트 목록으로 이동 중...
        </div>
      </div>
    </div>
  );
}
