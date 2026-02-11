'use client';

import { useState, useEffect } from 'react';

const STEPS = [
  {
    title: '시뮬레이션을 시작하세요',
    description: '대시보드에서 시뮬레이션을 실행하면 3명의 캐릭터가 각자의 이야기를 만들어갑니다.',
    icon: '🎬',
  },
  {
    title: '타임라인에서 탐색하세요',
    description: '생성된 이벤트 노드를 클릭하면 세밀한 장면이 자동으로 생성됩니다.',
    icon: '🔍',
  },
  {
    title: '채택하고 편집하세요',
    description: '마음에 드는 장면을 채택한 뒤, 편집기에서 드래그&드롭으로 웹소설을 구성하세요.',
    icon: '✍️',
  },
];

export default function OnboardingGuide() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('onboarding-done')) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    localStorage.setItem('onboarding-done', 'true');
    setVisible(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleDismiss} />
      <div className="relative w-full max-w-sm rounded-xl border border-base-border bg-base-secondary p-8 shadow-2xl text-center">
        <div className="text-4xl mb-4">{current.icon}</div>
        <h2 className="font-serif text-lg font-bold text-text-primary mb-2">
          {current.title}
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">
          {current.description}
        </p>

        {/* 스텝 인디케이터 */}
        <div className="flex justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-seojin' : 'w-1.5 bg-base-border'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-md border border-base-border px-4 py-2 text-sm text-text-muted hover:bg-base-tertiary transition-colors"
          >
            건너뛰기
          </button>
          <button
            onClick={handleNext}
            className="flex-1 rounded-md bg-seojin px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            {step < STEPS.length - 1 ? '다음' : '시작하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
