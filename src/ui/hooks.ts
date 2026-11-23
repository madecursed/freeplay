import { useSyncExternalStore } from 'react';
import { player } from '../player/player';
import { getHistory, getLiked, subscribeStore } from '../storage/store';

export const usePlayer = () => useSyncExternalStore(player.subscribe, player.get);
export const useLiked = () => useSyncExternalStore(subscribeStore, getLiked);
export const useHistory = () => useSyncExternalStore(subscribeStore, getHistory);

export const fmt = (s: number) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};
