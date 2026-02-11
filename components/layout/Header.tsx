'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSimulationStore } from '@/lib/store/simulation-store';

export default function Header() {
  const pathname = usePathname();
  const { episodes, simplifiedProject } = useSimulationStore();

  // 완료된 에피소드 수
  const completedEpisodes = episodes.filter(e => e.status === 'final').length;

  // 메인 네비게이션 (심플 UI)
  const navItems = [
    { href: '/project', label: '프로젝트', badge: 0 },
    { href: '/conversation', label: '작가 대화', badge: 0 },
    { href: '/result', label: '결과물', badge: completedEpisodes },
  ];

  // 현재 프로젝트 이름
  const projectName = simplifiedProject?.topic || '';

  // 경로가 기존 상세 뷰인지 확인
  const isDetailView = ['/characters', '/author', '/timeline', '/editor', '/stats', '/relationships'].some(
    path => pathname.startsWith(path)
  );

  return (
    <header className="sticky top-0 z-50 border-b border-base-border bg-base-primary/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/project" className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold text-text-primary">
              📖 Narrative Simulator
            </span>
          </Link>
          {projectName && (
            <span className="text-sm text-text-secondary">
              — {projectName}
            </span>
          )}
        </div>

        <nav className="flex items-center gap-1">
          {isDetailView ? (
            // 상세 뷰일 때: 돌아가기 버튼
            <Link
              href="/conversation"
              className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-base-tertiary/50"
            >
              ← 작가 대화로 돌아가기
            </Link>
          ) : (
            // 메인 뷰: 3개 탭
            navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-base-tertiary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-base-tertiary/50'
                }`}
              >
                {item.label}
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-seojin px-1 text-[10px] font-medium text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))
          )}
        </nav>
      </div>
    </header>
  );
}
