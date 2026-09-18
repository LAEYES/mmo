export type Zone = {
  id: string;
  name: string;
  description: string;
  level: number;
  faction: 'Aegis' | 'Nomads' | 'Eclipse' | 'Neutral';
  neighbors: string[];
  pointsOfInterest: string[];
};

export const zones: Zone[] = [
  {
    id: 'outpost',
    name: 'Frontier Outpost',
    description: 'A fortified gateway into the arena frontier.',
    level: 1,
    faction: 'Aegis',
    neighbors: ['dustlands', 'eclipse-ridge'],
    pointsOfInterest: ['Command Hub', 'Arena Gate'],
  },
  {
    id: 'dustlands',
    name: 'Dustlands',
    description: 'A hostile open region where nomad scouts patrol the old routes.',
    level: 2,
    faction: 'Nomads',
    neighbors: ['outpost', 'eclipse-ridge'],
    pointsOfInterest: ['Nomad Camp', 'Ruined Relay'],
  },
  {
    id: 'eclipse-ridge',
    name: 'Eclipse Ridge',
    description: 'A dangerous ridge touched by strange energy and rare encounters.',
    level: 3,
    faction: 'Eclipse',
    neighbors: ['outpost', 'dustlands'],
    pointsOfInterest: ['Eclipse Shrine', 'Signal Tower'],
  },
];

export function getZone(id: string): Zone {
  return zones.find((zone) => zone.id === id) ?? zones[0];
}

export function getReachableZones(id: string): Zone[] {
  return getZone(id).neighbors.map(getZone);
}

export function canEnterZone(playerLevel: number, zone: Zone): boolean {
  return playerLevel >= zone.level;
}
