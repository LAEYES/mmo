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
  zoneId: string;
  explorationCount: number;
  lastDiscovery: string;
  arenaWins: number;
};

export const factions: Faction[] = ['Aegis', 'Nomads', 'Eclipse'];

export function createStarterPlayer(name = 'Arena Player'): PlayerState {
  return { name, level: 1, xp: 0, faction: 'Aegis', victories: 0, cards: [], zoneId: 'outpost', explorationCount: 0, lastDiscovery: '', arenaWins: 0 };
}

export function grantVictory(state: PlayerState): PlayerState {
  const victories = state.victories + 1;
  const xp = state.xp + 25;
  const level = 1 + Math.floor(xp / 100);
  const card: Card = { id: `victory-${victories}`, name: `Arena Card #${victories}`, rarity: victories % 5 === 0 ? 'Rare' : 'Common', power: 10 + victories };
  return { ...state, victories, xp, level, cards: [...state.cards, card] };
}

export function grantArenaReward(state: PlayerState): PlayerState {
  const arenaWins = state.arenaWins + 1;
  const xpGain = 40 + arenaWins * 5;
  const xp = state.xp + xpGain;
  const level = 1 + Math.floor(xp / 100);
  const rarity = arenaWins % 10 === 0 ? 'Epic' : arenaWins % 3 === 0 ? 'Rare' : 'Common';
  const card: Card = {
    id: `arena-${arenaWins}`,
    name: `Arena Reward #${arenaWins}`,
    rarity,
    power: 15 + arenaWins * 2,
  };
  return { ...state, arenaWins, victories: state.victories + 1, xp, level, cards: [...state.cards, card] };
}

const STORAGE_KEY = 'freedomarena:rpgqg:player:v1';

export function loadPlayer(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createStarterPlayer();
    const parsed = JSON.parse(raw) as Partial<PlayerState>;
    return {
      ...createStarterPlayer(),
      ...parsed,
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      arenaWins: typeof parsed.arenaWins === 'number' ? parsed.arenaWins : 0,
    };
  } catch {
    return createStarterPlayer();
  }
}

export function savePlayer(state: PlayerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
