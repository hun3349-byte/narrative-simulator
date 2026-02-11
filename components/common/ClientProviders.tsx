'use client';

import { ToastProvider } from './Toast';
import OnboardingGuide from './OnboardingGuide';
import KeyboardShortcuts from './KeyboardShortcuts';
import SaveIndicator from './SaveIndicator';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <KeyboardShortcuts />
      <OnboardingGuide />
      <SaveIndicator />
      {children}
    </ToastProvider>
  );
}
