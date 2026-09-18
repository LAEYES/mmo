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

export function getZoneProgress(playerLevel: number, zone: Zone): number {
  if (zone.level <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((playerLevel / zone.level) * 100)));
}

export function getZoneConnections(id: string): Array<{ from: string; to: string }> {
  const zone = getZone(id);
  return zone.neighbors.map(to => ({ from: zone.id, to }));
}

export function getZoneStatus(playerLevel: number, zone: Zone, currentZoneId?: string): 'current' | 'available' | 'locked' {
  if (zone.id === currentZoneId) return 'current';
  return playerLevel >= zone.level ? 'available' : 'locked';
}

export type TileKind = 'ground' | 'water' | 'rock' | 'wall';
export type Tile = { x: number; y: number; kind: TileKind; walkable: boolean };

export function getTile(x: number, y: number, width = 60, height = 40): Tile {
  if (x < 0 || y < 0 || x >= width || y >= height) return { x, y, kind: 'wall', walkable: false };
  const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
  const biome = Math.floor((x + y) / 12) % 4;
  const pattern = (x * 13 + y * 7 + biome * 5) % 23;
  if (edge) return { x, y, kind: 'wall', walkable: false };
  if (biome === 2 && pattern < 4) return { x, y, kind: 'water', walkable: false };
  if ((biome === 1 || biome === 3) && pattern < 3) return { x, y, kind: 'rock', walkable: false };
  return { x, y, kind: 'ground', walkable: true };
}

export function canWalkTile(x: number, y: number): boolean {
  return getTile(x, y).walkable;
}

export type TilePosition = { x: number; y: number };

export function moveTile(position: TilePosition, target: TilePosition): TilePosition {
  const dx = Math.sign(target.x - position.x);
  const dy = Math.sign(target.y - position.y);
  const candidates = Math.abs(target.x - position.x) >= Math.abs(target.y - position.y)
    ? [{ x: position.x + dx, y: position.y }, { x: position.x, y: position.y + dy }]
    : [{ x: position.x, y: position.y + dy }, { x: position.x + dx, y: position.y }];
  for (const next of candidates) if (canWalkTile(next.x, next.y)) return next;
  return position;
}

export function getPoiPosition(zone: Zone, index: number): TilePosition {
  const count = Math.max(1, zone.pointsOfInterest.length);
  return { x: Math.max(1, Math.floor(((index + 1) * 60) / (count + 1))), y: 5 + index * 8 };
}

export function getNearestPoi(zone: Zone, position: TilePosition): { name: string; index: number; distance: number } | null {
  if (!zone.pointsOfInterest.length) return null;
  return zone.pointsOfInterest.reduce((nearest, name, index) => {
    const poi = getPoiPosition(zone, index);
    const distance = Math.abs(poi.x - position.x) + Math.abs(poi.y - position.y);
    return distance < nearest.distance ? { name, index, distance } : nearest;
  }, { name: zone.pointsOfInterest[0], index: 0, distance: Number.POSITIVE_INFINITY });
}
