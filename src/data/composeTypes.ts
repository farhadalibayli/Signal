import type { SignalType } from '../types/signal';

export type ComposeTypeOption = SignalType & { icon: string };

/** Types available when composing a signal (excludes ALL). */
export const COMPOSE_TYPES: ComposeTypeOption[] = [
  { label: 'Film', value: 'FILM', color: '#6C47FF', icon: 'film-outline' },
  { label: 'Cafe', value: 'CAFE', color: '#D97706', icon: 'cafe-outline' },
  { label: 'Sport', value: 'RUN', color: '#16A34A', icon: 'bicycle-outline' },
  { label: 'Food', value: 'FOOD', color: '#DC2626', icon: 'restaurant-outline' },
  { label: 'Games', value: 'GAMES', color: '#2563EB', icon: 'game-controller-outline' },
  { label: 'Study', value: 'STUDY', color: '#F59E0B', icon: 'book-outline' },
  { label: 'Music', value: 'MUSIC', color: '#8B5CF6', icon: 'musical-notes-outline' },
  { label: 'Walk', value: 'WALK', color: '#06B6D4', icon: 'walk-outline' },
  { label: 'Custom', value: 'CUSTOM', color: '#9B7FFF', icon: 'add-circle-outline' },
];
