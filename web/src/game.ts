export type Faction = 'Aegis' | 'Nomads' | 'Eclipse';

export type Card = {
  id: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  power: number;
};

export type PlayerState = {
  name: string;
  level: number;
  xp: number;
  faction: Faction;
  victories: number;
  cards: Card[];
};

export const factions: Faction[] = ['Aegis', 'Nomads', 'Eclipse'];

export function createStarterPlayer(name = 'Arena Player'): PlayerState {
  return {
    name,
    level: 1,
    xp: 0,
    faction: 'Aegis',
    victories: 0,
    cards: [],
  };
}

export function grantVictory(state: PlayerState): PlayerState {
  const victories = state.victories + 1;
  const xp = state.xp + 25;
  const level = 1 + Math.floor(xp / 100);
  const card: Card = {
    id: `victory-${victories}`,
    name: `Arena Card #${victories}`,
    rarity: victories % 5 === 0 ? 'Rare' : 'Common',
    power: 10 + victories,
  };
  return { ...state, victories, xp, level, cards: [...state.cards, card] };
}

const STORAGE_KEY = 'freedomarena:rpgqg:player:v1';

export function loadPlayer(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlayerState) : createStarterPlayer();
  } catch {
    return createStarterPlayer();
  }
}

export function savePlayer(state: PlayerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
