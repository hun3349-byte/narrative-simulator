'use client';

import { getCharacterColor } from '@/lib/utils/character-display';
import { useSimulationStore } from '@/lib/store/simulation-store';

interface CharacterAvatarProps {
  characterId: string;
  name: string;
  alias: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function CharacterAvatar({ characterId, name, alias, size = 'md' }: CharacterAvatarProps) {
  const { characters, seeds } = useSimulationStore();
  const color = getCharacterColor(characterId, characters, seeds);
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-lg',
  };

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full font-serif font-bold`}
      style={{
        backgroundColor: `${color}20`,
        border: `2px solid ${color}`,
        color: color,
      }}
      title={`${name} (${alias})`}
    >
      {name[0]}
    </div>
  );
}
