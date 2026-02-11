'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            router.push('/');
            break;
          case '2':
            e.preventDefault();
            router.push('/timeline');
            break;
          case '3':
            e.preventDefault();
            router.push('/editor');
            break;
          case 's':
            e.preventDefault();
            // Force persist by triggering a no-op setState on each store
            // Zustand persist auto-saves on state change
            break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, pathname]);

  return null;
}
