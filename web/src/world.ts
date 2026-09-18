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

export function findTilePath(start: TilePosition, target: TilePosition, maxSteps = 120): TilePosition[] {
  if (start.x === target.x && start.y === target.y) return [start];
  const key = (p: TilePosition) => p.x + ':' + p.y;
  const queue: TilePosition[] = [start];
  const previous = new Map<string, TilePosition | null>([[key(start), null]]);
  const directions = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
  while (queue.length) {
    const current = queue.shift()!;
    if (Math.abs(current.x-start.x)+Math.abs(current.y-start.y) > maxSteps) continue;
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = key(next);
      if (previous.has(nextKey) || !canWalkTile(next.x, next.y)) continue;
      previous.set(nextKey, current);
      if (next.x === target.x && next.y === target.y) {
        const path: TilePosition[] = [next];
        let cursor: TilePosition | null = current;
        while (cursor) { path.unshift(cursor); cursor = previous.get(key(cursor)) ?? null; }
        return path;
      }
      queue.push(next);
    }
  }
  return [];
}

export type PoiAction = 'explore' | 'loot' | 'encounter';
export type PoiInteraction = { name: string; action: PoiAction; message: string };

export function interactWithPoi(zone: Zone, poiIndex: number): PoiInteraction | null {
  const name = zone.pointsOfInterest[poiIndex];
  if (!name) return null;
  const action: PoiAction = poiIndex % 3 === 0 ? 'explore' : poiIndex % 3 === 1 ? 'loot' : 'encounter';
  const message = action === 'explore' ? 'Zone explored.' : action === 'loot' ? 'A resource cache was discovered.' : 'An encounter is nearby.';
  return { name, action, message };
}

export type Scenario = {
  id: string;
  title: string;
  description: string;
  threat: number;
  choices: string[];
};

export function generateScenario(zone: Zone, playerLevel: number, explorationCount: number, seed = 0): Scenario {
  const phase = Math.floor((explorationCount + playerLevel + seed) / 3) % 4;
  const threat = Math.max(1, zone.level + phase + Math.floor(explorationCount / 5));
  const templates = [
    ['Frontier Signal', 'A changing signal pattern suggests that another faction is moving through the area.', ['Investigate the signal', 'Keep moving']],
    ['Resource Conflict', 'A resource cache has become the center of a dispute between local groups.', ['Secure the cache', 'Observe the conflict']],
    ['Eclipse Anomaly', 'An unstable energy anomaly changes the conditions around a nearby point of interest.', ['Study the anomaly', 'Avoid the anomaly']],
    ['Patrol Shift', 'Patrol routes have changed since your last visit, altering the safest path through the zone.', ['Scout the new route', 'Take the longer route']]
  ] as const;
  const [title, description, choices] = templates[phase];
  return {
    id: zone.id + ':' + phase + ':' + Math.floor(explorationCount / 3),
    title,
    description,
    threat,
    choices: [...choices]
  };
}

export type ZoneEnvironment = {
  cycle: 'dawn' | 'day' | 'dusk' | 'night';
  weather: 'clear' | 'mist' | 'storm' | 'frost';
  atmosphere: number;
};

export function getZoneEnvironment(zone: Zone, worldThreat: number, worldResources: number, explorationCount: number): ZoneEnvironment {
  const cycleIndex = Math.abs(explorationCount + zone.level + worldThreat) % 4;
  const cycle = (['dawn', 'day', 'dusk', 'night'] as const)[cycleIndex];
  const weather = zone.level >= 3 && worldThreat >= 4 ? 'storm'
    : zone.level >= 3 ? 'frost'
    : worldThreat >= 4 ? 'mist'
    : worldResources >= 6 ? 'clear'
    : 'mist';
  return { cycle, weather, atmosphere: Math.min(5, Math.floor(worldThreat / 2) + Math.floor(zone.level / 2)) };
}

export function getZoneDynamicModifiers(zone: Zone, worldThreat: number, worldResources: number, factionInfluence: number): { threat: number; resourceYield: number; encounterChance: number } {
  const factionPressure = Math.max(0, Math.floor((100 - factionInfluence) / 25));
  return {
    threat: Math.max(1, zone.level + Math.floor(worldThreat / 3) + factionPressure),
    resourceYield: Math.max(1, 1 + Math.floor(worldResources / 5) - factionPressure),
    encounterChance: Math.min(90, 15 + worldThreat * 5 + factionPressure * 10)
  };
}

export type WorldEvent = { id: string; title: string; description: string; zoneId: string; faction: Zone['faction']; intensity: number; effect: 'threat' | 'resources' | 'encounter'; };

export function generateWorldEvent(zone: Zone, worldThreat: number, worldResources: number, explorationCount: number): WorldEvent {
  const intensity = Math.max(1, Math.min(5, Math.floor((worldThreat + explorationCount) / 4) + 1));
  const effect = worldResources < 3 ? 'resources' : worldThreat >= 4 ? 'threat' : 'encounter';
  const titles = effect === 'resources' ? ['Supply Rush', 'Hidden Cache'] : effect === 'threat' ? ['Rising Patrols', 'Frontier Alert'] : ['Wandering Hunters', 'Unstable Encounter'];
  const index = (explorationCount + worldThreat + worldResources) % titles.length;
  return {
    id: zone.id + ':event:' + explorationCount + ':' + worldThreat,
    title: titles[index],
    description: effect === 'resources' ? 'Resource activity is changing the local frontier.' : effect === 'threat' ? 'Local pressure is increasing and patrols are becoming more active.' : 'A mobile encounter has appeared near the current zone.',
    zoneId: zone.id,
    faction: zone.faction,
    intensity,
    effect
  };
}

export function applyWorldEvent(effect: WorldEvent['effect'], intensity: number, state: { worldThreat: number; worldResources: number }): { worldThreat: number; worldResources: number } {
  const power = Math.max(1, Math.floor(intensity));
  if (effect === 'threat') return { worldThreat: state.worldThreat + power, worldResources: state.worldResources };
  if (effect === 'resources') return { worldThreat: Math.max(1, state.worldThreat - Math.max(1, Math.floor(power / 2))), worldResources: state.worldResources + power };
  return { worldThreat: state.worldThreat + 1, worldResources: Math.max(0, state.worldResources + Math.max(0, power - 2)) };
}
