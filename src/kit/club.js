import { createContext, useContext } from 'react';

export const PLAYERS = { A: 'Tushar', B: 'Riya' };

export const ClubContext = createContext({
  me: 'A', setMe: () => {}, players: PLAYERS,
  theme: 'light', toggleTheme: () => {}, navigate: () => {},
});

export function useClub() {
  const club = useContext(ClubContext);
  const other = club.me === 'B' ? 'A' : 'B';
  const nameOf = role => (role && club.players?.[role]) || (role ? `Player ${role}` : 'You');
  return { ...club, other, nameOf, myName: nameOf(club.me), otherName: nameOf(other) };
}

// Shallow-merged game state with a patch helper; patch takes an object or (old) => object.
export function usePatch(data, update, initial) {
  const state = { ...initial, ...(data || {}) };
  const patch = patcher => update(previous => {
    const old = { ...initial, ...(previous || {}) };
    return typeof patcher === 'function' ? patcher(old) : patcher;
  });
  return [state, patch];
}

export const normalize = value => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
