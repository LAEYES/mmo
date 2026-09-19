import { StrictMode, useEffect, useRef, useState } from 'react';
import { loadOrCreatePlayerRemote, syncPlayerRemote } from './lib/supabase';
import { joinZonePresence, updateZonePresence, type ZonePresence } from './lib/realtime';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { canEnterZone, canWalkTile,  findTilePath, getNearestPoi, interactWithPoi, interactWithNpc, getReachableZones, getZone, getZoneStatus, generateScenario, generateWorldEvent, getZoneDynamicModifiers, getZoneEnvironment, getZoneNpcs, getZoneFactionPressure, getFactionPressureLabel, getWorldEventProgress, getWorldEventPhase, getWorldEventPoint, getTile, moveTile, zones } from './world';
import { createEncounter, getCombatReward, getCombatSummary, playerAttack, type CombatState } from './combat';
import { equipCard, factions, fuseCards, getCardFusionCost, getEquippedCard, grantArenaReward, applyPoiReward, applyScenarioChoice, applyCombatOutcome, applyWorldEventState, applyNpcInteraction, explore, loadPlayer, savePlayer, upgradeCard, type Faction } from './game';

function isFreshRemotePresence(entry: ZonePresence) { return Date.now() - entry.updatedAt <= 15000; }

function WorldCanvas({ zoneId, waypoint, worldTile, worldThreat, worldResources, explorationCount, factionInfluence, worldEvent, worldEventAge, remotePlayers, onTileMove, onSignalSelect }: { zoneId: string; waypoint: {x:number;y:number}|null; worldTile: {x:number;y:number}; worldThreat: number; worldResources: number; explorationCount: number; factionInfluence: number; worldEvent: import('./world').WorldEvent; worldEventAge: number; remotePlayers: ZonePresence[]; onTileMove: (tileX: number, tileY: number) => void; onSignalSelect: (signal: {type:'poi'|'npc'|'event'; name:string; x:number; y:number}) => void }) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const dynamicRef = useRef<HTMLCanvasElement>(null);
  const position = useRef({ x: 0, y: 0 });
  const remoteVisuals = useRef<Record<string, { x: number; y: number }>>({});
  const remotePlayersRef = useRef(remotePlayers);
  const pathCache = useRef<{ key: string; path: { x: number; y: number }[] }>({ key: '', path: [] });
  const fxTime = useRef(0);
  const worldEventAgeRef = useRef(worldEventAge);
  const ambientWeatherRef = useRef<ReturnType<typeof getZoneEnvironment>['weather']>(getZoneEnvironment(getZone(zoneId), worldThreat, worldResources, explorationCount).weather);
  useEffect(() => { remotePlayersRef.current = remotePlayers; }, [remotePlayers]);
  useEffect(() => { worldEventAgeRef.current = worldEventAge; }, [worldEventAge]);
  useEffect(() => {
    ambientWeatherRef.current = getZoneEnvironment(getZone(zoneId), worldThreat, worldResources, explorationCount).weather;
  }, [zoneId, worldThreat, worldResources, explorationCount]);
  useEffect(() => {
    position.current = { x: 0, y: 0 };
  }, [zoneId]);
  useEffect(() => {
    position.current = { x: worldTile.x, y: worldTile.y };
  }, [worldTile.x, worldTile.y]);
  useEffect(() => {
    const canvas = baseRef.current;
    if (!canvas) return;
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const tile = 32;
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      const cols = Math.ceil(rect.width / tile);
      const rows = Math.ceil(rect.height / tile);
      const cameraX = Math.max(0, Math.min(59 - cols, position.current.x - Math.floor(cols / 2)));
      const cameraY = Math.max(0, Math.min(39 - rows, position.current.y - Math.floor(rows / 2)));
      const zone = getZone(zoneId);
      const npcs = getZoneNpcs(zone, worldThreat, worldResources, explorationCount);
      const eventPoint = getWorldEventPoint(worldEvent);
      const eventDistance = Math.abs(position.current.x - eventPoint.x) + Math.abs(position.current.y - eventPoint.y);
      const signals: Array<{type:'poi'|'npc'|'event';name:string;x:number;y:number;sx:number;sy:number}> = [];
      zone.pointsOfInterest.forEach((name,index) => {
        const x = Math.floor((index + 1) * 60 / (zone.pointsOfInterest.length + 1));
        const y = 5 + index * 8;
        signals.push({type:'poi',name,x,y,sx:(x-cameraX)*tile+tile/2,sy:(y-cameraY)*tile+tile/2});
      });
      npcs.forEach(npc => signals.push({type:'npc',name:npc.name,x:npc.x,y:npc.y,sx:(npc.x-cameraX)*tile+tile/2,sy:(npc.y-cameraY)*tile+tile/2}));
      if (eventDistance <= 8) signals.push({type:'event',name:worldEvent.title,x:eventPoint.x,y:eventPoint.y,sx:(eventPoint.x-cameraX)*tile+tile/2,sy:(eventPoint.y-cameraY)*tile+tile/2});
      const hit = signals.find(signal => Math.hypot(clickX-signal.sx, clickY-signal.sy) <= 14);
      if (hit) {
        onSignalSelect({type:hit.type,name:hit.name,x:hit.x,y:hit.y});
        return;
      }
      const tileX = Math.floor(clickX / tile) + cameraX;
      const tileY = Math.floor(clickY / tile) + cameraY;
      onTileMove(tileX, tileY);
    };
    canvas.addEventListener('pointerdown', onPointer);
    return () => canvas.removeEventListener('pointerdown', onPointer);
  }, [onTileMove, onSignalSelect, zoneId, worldThreat, worldResources, explorationCount, worldEvent]);
  useEffect(() => {
    const canvas = baseRef.current;
    const dynamicCanvas = dynamicRef.current;
    if (!canvas || !dynamicCanvas) return;
    const ctx = canvas.getContext('2d');
    const dynamicCtx = dynamicCanvas.getContext('2d');
    if (!ctx || !dynamicCtx) return;
    const staticCanvas = document.createElement('canvas');
    const staticCtx = staticCanvas.getContext('2d');
    const sceneCanvas = document.createElement('canvas');
    const sceneCtx = sceneCanvas.getContext('2d');
    if (!staticCtx || !sceneCtx) return;
    let staticKey = '';
    let sceneKey = '';
    const draw = (deltaMs = 16.67) => {
      fxTime.current += deltaMs;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.floor(rect.width * dpr));
      const pixelHeight = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        dynamicCanvas.width = pixelWidth;
        dynamicCanvas.height = pixelHeight;
        staticCanvas.width = pixelWidth;
        staticCanvas.height = pixelHeight;
        sceneCanvas.width = pixelWidth;
        sceneCanvas.height = pixelHeight;
        staticKey = '';
        sceneKey = '';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const tile = 32, cols = Math.ceil(rect.width / tile), rows = Math.ceil(rect.height / tile);
      const cameraX = Math.max(0, Math.min(59 - cols, position.current.x - Math.floor(cols / 2)));
      const cameraY = Math.max(0, Math.min(39 - rows, position.current.y - Math.floor(rows / 2)));
      const terrainKey = [rect.width, rect.height, cameraX, cameraY].join(':');
      if (staticKey !== terrainKey) {
        staticCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        staticCtx.clearRect(0, 0, rect.width, rect.height);
        for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) {
          const worldX = x + cameraX, worldY = y + cameraY;
          const terrain = getTile(worldX, worldY);
          const biome = Math.floor((worldX + worldY) / 12) % 4;
          staticCtx.fillStyle = terrain.kind === 'water' ? '#102f4a' : terrain.kind === 'rock' ? '#30364a' : terrain.kind === 'wall' ? '#070b13' : biome === 0 ? '#101b30' : biome === 1 ? '#172536' : biome === 2 ? '#182d28' : '#241f32';
          staticCtx.fillRect(x*tile,y*tile,tile,tile);
          if (terrain.kind !== 'ground') {
            staticCtx.strokeStyle = terrain.kind === 'wall' ? '#202b40' : '#53627b';
            staticCtx.lineWidth = 1;
            staticCtx.strokeRect(x*tile+1,y*tile+1,tile-2,tile-2);
          }
        }
        staticKey = terrainKey;
      }
      const zone=getZone(zoneId);
      const sceneCacheKey = [terrainKey, zoneId, worldThreat, worldResources, explorationCount, factionInfluence, worldEvent.title, worldEvent.effect, worldEvent.intensity, worldEvent.faction, waypoint?.x ?? '', waypoint?.y ?? ''].join(':');
      if (sceneKey !== sceneCacheKey) {
        sceneCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sceneCtx.clearRect(0, 0, rect.width, rect.height);
        sceneCtx.drawImage(staticCanvas, 0, 0, rect.width, rect.height);
        const environment=getZoneEnvironment(zone,worldThreat,worldResources,explorationCount);
        const npcs=getZoneNpcs(zone,worldThreat,worldResources,explorationCount);
        const cycleAlpha={dawn:.10,day:0,dusk:.13,night:.24}[environment.cycle];
        if(cycleAlpha){sceneCtx.fillStyle='rgba(12,20,48,'+cycleAlpha+')';sceneCtx.fillRect(0,0,rect.width,rect.height);}
        if(environment.weather==='mist'){sceneCtx.fillStyle='rgba(190,210,225,.07)';sceneCtx.fillRect(0,0,rect.width,rect.height);}
        if(environment.weather==='storm'){sceneCtx.fillStyle='rgba(80,90,130,'+Math.min(.16,.05+environment.atmosphere*.02)+')';sceneCtx.fillRect(0,0,rect.width,rect.height);}
        if(environment.weather==='frost'){sceneCtx.fillStyle='rgba(180,215,255,.08)';sceneCtx.fillRect(0,0,rect.width,rect.height);}
        if(worldThreat>=4){sceneCtx.fillStyle='rgba(150,30,40,'+Math.min(.18,(worldThreat-3)*.03)+')';sceneCtx.fillRect(0,0,rect.width,rect.height);}
        sceneCtx.strokeStyle='#3b5684';sceneCtx.lineWidth=2;sceneCtx.strokeRect(12,12,rect.width-24,rect.height-24);
        sceneCtx.fillStyle='#dce7ff';sceneCtx.font='600 14px Inter,sans-serif';sceneCtx.fillText(zone.name,24,38);
        const mapPoi=zone.pointsOfInterest.map((name,index)=>({name,x:Math.floor((index+1)*60/(zone.pointsOfInterest.length+1)),y:5+index*8}));
        mapPoi.forEach((poi)=>{const sx=(poi.x-cameraX)*tile+tile/2,sy=(poi.y-cameraY)*tile+tile/2;if(sx<0||sy<0||sx>rect.width||sy>rect.height)return;sceneCtx.fillStyle='#d8b56a';sceneCtx.beginPath();sceneCtx.arc(sx,sy,6,0,Math.PI*2);sceneCtx.fill();sceneCtx.fillStyle='#ead9ad';sceneCtx.font='10px Inter,sans-serif';sceneCtx.fillText(poi.name,sx+9,sy+3);});
        zone.pointsOfInterest.forEach((name,index)=>{const x=24+((index+1)*(rect.width-48))/(zone.pointsOfInterest.length+1),y=rect.height*(index%2===0?.42:.68);sceneCtx.fillStyle='#9db4e8';sceneCtx.beginPath();sceneCtx.arc(x,y,7,0,Math.PI*2);sceneCtx.fill();sceneCtx.fillStyle='#c9d7f5';sceneCtx.font='11px Inter,sans-serif';sceneCtx.fillText(name,x+10,y+4);});
        npcs.forEach((npc)=>{const sx=(npc.x-cameraX)*tile+tile/2,sy=(npc.y-cameraY)*tile+tile/2;if(sx<0||sy<0||sx>rect.width||sy>rect.height)return;sceneCtx.fillStyle=npc.faction==='Aegis'?'#8fa9e8':npc.faction==='Nomads'?'#d8b56a':'#ad8ee8';sceneCtx.beginPath();sceneCtx.arc(sx,sy,6,0,Math.PI*2);sceneCtx.fill();sceneCtx.fillStyle='#e5ebfa';sceneCtx.font='9px Inter,sans-serif';sceneCtx.fillText(npc.activity.toUpperCase(),sx+8,sy+3);});
        const pressure=getZoneFactionPressure(zone,factionInfluence);
        const pressureColor=pressure.status==='dominant'?'rgba(120,180,255,.75)':pressure.status==='contested'?'rgba(220,190,110,.75)':pressure.status==='weak'?'rgba(230,110,130,.8)':'rgba(160,180,210,.65)';
        sceneCtx.strokeStyle=pressureColor;sceneCtx.lineWidth=2;sceneCtx.setLineDash([6,4]);sceneCtx.strokeRect(8,8,rect.width-16,rect.height-16);sceneCtx.setLineDash([]);
        const eventPoint=getWorldEventPoint(worldEvent);
        if(waypoint){
          const pathKey=position.current.x+','+position.current.y+'>'+waypoint.x+','+waypoint.y;
          if(pathCache.current.key!==pathKey){pathCache.current={key:pathKey,path:findTilePath(position.current,waypoint)};}
          const path=pathCache.current.path;
          if(path.length>1){sceneCtx.strokeStyle='#d8b56a';sceneCtx.lineWidth=3;sceneCtx.setLineDash([4,4]);sceneCtx.beginPath();path.forEach((p,i)=>{const sx=(p.x-cameraX)*tile+tile/2,sy=(p.y-cameraY)*tile+tile/2;if(i===0)sceneCtx.moveTo(sx,sy);else sceneCtx.lineTo(sx,sy);});sceneCtx.stroke();sceneCtx.setLineDash([]);}
        }
        sceneKey=sceneCacheKey;
      }
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(sceneCanvas, 0, 0, rect.width, rect.height);
      dynamicCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dynamicCtx.clearRect(0, 0, rect.width, rect.height);
      const currentRemotePlayers = remotePlayersRef.current.filter(isFreshRemotePresence);
      const eventPhase=getWorldEventPhase(worldEvent,worldEventAgeRef.current).toUpperCase();
      const eventPoint=getWorldEventPoint(worldEvent);
      const ex=(eventPoint.x-cameraX)*tile+tile/2,ey=(eventPoint.y-cameraY)*tile+tile/2;
      if(ex>=-40&&ey>=-40&&ex<=rect.width+40&&ey<=rect.height+40){
        const sparkPhase = fxTime.current / 520;
        dynamicCtx.save();
        for(let i=0;i<6;i++){
          const angle = sparkPhase * (0.7 + i * 0.08) + i * Math.PI / 3;
          const radius = 14 + ((sparkPhase * 9 + i * 11) % 22);
          const sparkX = ex + Math.cos(angle) * radius;
          const sparkY = ey + Math.sin(angle) * radius;
          const sparkAlpha = 0.18 + 0.18 * (0.5 + 0.5 * Math.sin(sparkPhase * 2 + i));
          dynamicCtx.globalAlpha = sparkAlpha;
          dynamicCtx.fillStyle = worldEvent.effect === 'threat' ? '#ef7777' : '#d8b56a';
          dynamicCtx.fillRect(sparkX, sparkY, 2, 2);
        }
        dynamicCtx.restore();
        const pulse=0.5+0.5*Math.sin(fxTime.current/320);
        const eventColor=eventPhase==='EXPIRING'?'#ef7777':eventPhase==='URGENT'?'#e5b26d':'#8fbfda';
        dynamicCtx.save();dynamicCtx.globalAlpha=0.18+pulse*0.16;dynamicCtx.strokeStyle=eventColor;dynamicCtx.lineWidth=2;
        dynamicCtx.beginPath();dynamicCtx.arc(ex,ey,9+pulse*8,0,Math.PI*2);dynamicCtx.stroke();
        dynamicCtx.globalAlpha=0.9;dynamicCtx.fillStyle=eventColor;dynamicCtx.beginPath();dynamicCtx.arc(ex,ey,4+pulse*2,0,Math.PI*2);dynamicCtx.fill();
        dynamicCtx.globalAlpha=0.95;dynamicCtx.fillStyle='#f0d9d0';dynamicCtx.font='600 9px Inter,sans-serif';dynamicCtx.fillText(eventPhase+' · EVENT',ex-30,ey-14);dynamicCtx.restore();
      }
      if(waypoint){
        const wx=(waypoint.x-cameraX)*tile+tile/2,wy=(waypoint.y-cameraY)*tile+tile/2;
        if(wx>=-30&&wy>=-30&&wx<=rect.width+30&&wy<=rect.height+30){
          const pulse=0.5+0.5*Math.sin(fxTime.current/220);
          dynamicCtx.save();dynamicCtx.globalAlpha=0.28+pulse*0.18;dynamicCtx.strokeStyle='#d8b56a';dynamicCtx.lineWidth=2;
          dynamicCtx.beginPath();dynamicCtx.arc(wx,wy,10+pulse*5,0,Math.PI*2);dynamicCtx.stroke();
          dynamicCtx.globalAlpha=0.9;dynamicCtx.fillStyle='#ead9ad';dynamicCtx.font='600 10px Inter,sans-serif';dynamicCtx.fillText('WAYPOINT',wx-27,wy-15);dynamicCtx.restore();
        }
      }
      const activeIds = new Set(currentRemotePlayers.map(remote => remote.playerId));
      Object.keys(remoteVisuals.current).forEach(id => { if (!activeIds.has(id)) delete remoteVisuals.current[id]; });
      const smoothing = 1 - Math.exp(-10 * Math.min(50, Math.max(0, deltaMs)) / 1000);
      currentRemotePlayers.forEach(remote=>{
        const visual = remoteVisuals.current[remote.playerId] ?? (remoteVisuals.current[remote.playerId] = { x: remote.worldTile.x, y: remote.worldTile.y });
        visual.x += (remote.worldTile.x - visual.x) * smoothing;
        visual.y += (remote.worldTile.y - visual.y) * smoothing;
        const sx=(visual.x-cameraX)*tile+tile/2,sy=(visual.y-cameraY)*tile+tile/2;
        if(sx<-20||sy<-20||sx>rect.width+20||sy>rect.height+20)return;
        const remoteFactionColor = remote.faction === 'Aegis' ? '#8fa9e8' : remote.faction === 'Nomads' ? '#d8b56a' : remote.faction === 'Syndicate' ? '#ad8ee8' : '#8fbfda';
        const remotePulse = 0.5 + 0.5 * Math.sin(fxTime.current / 360 + remote.playerId.length);
        dynamicCtx.save();
        dynamicCtx.globalAlpha = 0.12 + remotePulse * 0.10;
        dynamicCtx.strokeStyle = remoteFactionColor;
        dynamicCtx.lineWidth = 1.5;
        dynamicCtx.beginPath();
        dynamicCtx.arc(sx, sy, 10 + remotePulse * 4, 0, Math.PI * 2);
        dynamicCtx.stroke();
        dynamicCtx.globalAlpha = 1;
        dynamicCtx.fillStyle=remoteFactionColor;dynamicCtx.beginPath();dynamicCtx.arc(sx,sy,7,0,Math.PI*2);dynamicCtx.fill();
        dynamicCtx.restore();
        dynamicCtx.strokeStyle='rgba(255,255,255,.5)';dynamicCtx.lineWidth=1;dynamicCtx.stroke();
        dynamicCtx.fillStyle='#dce7ff';dynamicCtx.font='600 9px Inter,sans-serif';dynamicCtx.fillText(remote.name+' · '+remote.faction,sx+9,sy+3);
      });
      const ambientPhase = fxTime.current / 1800;
      const ambientWeather = ambientWeatherRef.current;
      const ambientCount = ambientWeather === 'storm' ? 16 : ambientWeather === 'mist' ? 13 : ambientWeather === 'frost' ? 12 : 10;
      for(let i=0;i<ambientCount;i++){
        const ax=((i*83 + Math.floor(ambientPhase*12)*17)%(rect.width+80))-40;
        const ay=((i*47 + Math.floor(ambientPhase*8)*29)%(rect.height+80))-40;
        const shimmer=0.16+0.10*Math.sin(ambientPhase*2+i);
        dynamicCtx.globalAlpha=Math.max(0,shimmer);
        dynamicCtx.fillStyle='#b8c9e8';
        dynamicCtx.fillRect(ax,ay,1.5,1.5);
      }
      dynamicCtx.globalAlpha=1;
      const px=(position.current.x-cameraX)*tile+tile/2, py=(position.current.y-cameraY)*tile+tile/2;
      const pulse = 0.5 + 0.5 * Math.sin(fxTime.current / 260);
      dynamicCtx.save();
      dynamicCtx.globalAlpha = 0.22 + pulse * 0.12;
      dynamicCtx.strokeStyle = '#9db4e8'; dynamicCtx.lineWidth = 2;
      dynamicCtx.beginPath(); dynamicCtx.arc(px, py, 13 + pulse * 5, 0, Math.PI * 2); dynamicCtx.stroke();
      dynamicCtx.globalAlpha = 0.7;
      dynamicCtx.fillStyle = '#d8e5ff'; dynamicCtx.beginPath(); dynamicCtx.arc(px, py, 2 + pulse * 1.5, 0, Math.PI * 2); dynamicCtx.fill();
      dynamicCtx.restore();
      dynamicCtx.fillStyle='#fff'; dynamicCtx.beginPath(); dynamicCtx.arc(px,py,9,0,Math.PI*2); dynamicCtx.fill();
      dynamicCtx.strokeStyle='#9db4e8'; dynamicCtx.stroke(); dynamicCtx.fillStyle='#c9d7f5'; dynamicCtx.font='600 11px Inter,sans-serif'; dynamicCtx.fillText('PLAYER',px-22,py+24);
    };
    let frame = 0;
    let lastFrame = performance.now();
    const animate = (now: number) => {
      const deltaMs = Math.min(50, Math.max(0, now - lastFrame));
      lastFrame = now;
      draw(deltaMs);
      frame = window.requestAnimationFrame(animate);
    };
    animate(lastFrame);
    const onResize = () => draw(16.67);
    window.addEventListener('resize', onResize);
    return()=>{ window.cancelAnimationFrame(frame); window.removeEventListener('resize',onResize); };
  },[zoneId,waypoint,worldTile.x,worldTile.y,worldThreat,worldResources,explorationCount,factionInfluence,worldEvent]);
  return <div className="world-canvas-layer">
    <canvas ref={baseRef} className="tile-canvas tile-canvas-base" aria-label={`Tile map of ${getZone(zoneId).name}`} />
    <canvas ref={dynamicRef} className="tile-canvas tile-canvas-dynamic" aria-hidden="true" />
  </div>;
}

function App() {
  const [player, setPlayer] = useState(loadPlayer);
  const [name, setName] = useState(player.name === 'Arena Player' ? '' : player.name);
  const [creating, setCreating] = useState(player.name === 'Arena Player');
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [lastCardXp, setLastCardXp] = useState(0);
  const [fusionSourceId, setFusionSourceId] = useState<string | null>(null);
  const [worldTile, setWorldTile] = useState(player.worldTile);
  const [worldMessage, setWorldMessage] = useState('Select a tile to move.');
  const [waypoint, setWaypoint] = useState<{x:number;y:number}|null>(null);
  const [pathLength, setPathLength] = useState(0);
  const [selectedSignal, setSelectedSignal] = useState<{type:'poi'|'npc'|'event'; name:string; x:number; y:number} | null>(null);
  const [worldEvent, setWorldEvent] = useState(generateWorldEvent(getZone(player.zoneId),player.worldThreat,player.worldResources,player.explorationCount,player.factionStates.find(f=>f.faction===getZone(player.zoneId).faction)?.influence??100));
  const [worldEventAge, setWorldEventAge] = useState(0);
  const [scenario, setScenario] = useState(generateScenario(getZone(player.zoneId), player.level, player.explorationCount));
  const [poiMessage, setPoiMessage] = useState('');
  const [poiAction, setPoiAction] = useState('');
  const [autoMove, setAutoMove] = useState(false);
  const [remotePlayers, setRemotePlayers] = useState<ZonePresence[]>([]);
  const presenceChannelRef = useRef<import('@supabase/supabase-js').RealtimeChannel | null>(null);
  const presencePlayerIdRef = useRef<string>('');
  const currentZone = getZone(player.zoneId);
  const environment = getZoneEnvironment(currentZone, player.worldThreat, player.worldResources, player.explorationCount);
  const zoneNpcs = getZoneNpcs(currentZone, player.worldThreat, player.worldResources, player.explorationCount);
  const localFaction = currentZone.faction === 'Neutral' ? null : player.factionStates.find(f => f.faction === currentZone.faction);
  const factionPressure = getZoneFactionPressure(currentZone, localFaction?.influence ?? 100);
  const activeFactionInfluence = currentZone.faction === 'Neutral' ? 100 : (localFaction?.influence ?? 100);
  const zoneModifiers = getZoneDynamicModifiers(currentZone, player.worldThreat, player.worldResources, player.factionStates.find(f=>f.faction===player.faction)?.influence??100);
  const environmentLabels = { dawn: 'Aube', day: 'Jour', dusk: 'Crépuscule', night: 'Nuit' } as const;
  const weatherLabels = { clear: 'Clair', mist: 'Brume', storm: 'Tempête', frost: 'Gel' } as const;
  const equipped = getEquippedCard(player);  const nearestPoi = getNearestPoi(currentZone, worldTile);
  const getNpcMemory = (npcId:string) => player.npcMemories.find(memory => memory.npcId === npcId);
  const nearestNpc = zoneNpcs.reduce((nearest,npc)=>{const distance=Math.abs(npc.x-worldTile.x)+Math.abs(npc.y-worldTile.y);return distance<nearest.distance?{npc,distance}:nearest;},{npc:zoneNpcs[0],distance:Number.POSITIVE_INFINITY});
  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; }, [player]);
  const update = (next: typeof player) => { setPlayer(next); playerRef.current = next; savePlayer(next); void syncPlayerRemote(next); };
  const persistMovement = (tile: typeof worldTile) => {
    const next = { ...playerRef.current, worldTile: tile };
    playerRef.current = next;
    setPlayer(next);
    savePlayer(next);
  };
  const upsertRemotePlayer = (entry: ZonePresence) => {
    const id = presencePlayerIdRef.current;
    if (!id || entry.playerId === id || !isFreshRemotePresence(entry)) return;
    setRemotePlayers(current => {
      const index = current.findIndex(player => player.playerId === entry.playerId);
      if (index < 0) return [...current, entry];
      const next = current.slice();
      next[index] = entry;
      return next;
    });
  };

  useEffect(() => {
    const existing = window.localStorage.getItem('freedomarena:presence:id');
    const id = existing ?? crypto.randomUUID();
    if (!existing) window.localStorage.setItem('freedomarena:presence:id', id);
    presencePlayerIdRef.current = id;
    let stopped = false;
    let stopPresence: (() => Promise<void>) | null = null;
    const join = async () => {
      const result = await joinZonePresence(player.zoneId, { playerId: id, name: player.name, zoneId: player.zoneId, worldTile: player.worldTile, faction: player.faction, updatedAt: Date.now() }, { onSync: players => { if (!stopped) setRemotePlayers(players.filter(entry => entry.playerId !== id && isFreshRemotePresence(entry))); }, onJoin: entry => { if (!stopped) upsertRemotePlayer(entry); }, onLeave: playerId => setRemotePlayers(current => current.filter(entry => entry.playerId !== playerId)) });
      if (stopped) { await result.stop(); return; }
      presenceChannelRef.current = result.channel;
      stopPresence = result.stop;
    };
    void join();
    return () => { stopped = true; setRemotePlayers([]); presenceChannelRef.current = null; if (stopPresence) void stopPresence(); };
  }, [player.zoneId]);

  useEffect(() => {
    const id = presencePlayerIdRef.current;
    if (!id) return;
    void updateZonePresence(presenceChannelRef.current, { playerId: id, name: player.name, zoneId: player.zoneId, worldTile: player.worldTile, faction: player.faction, updatedAt: Date.now() });
  }, [player.name, player.zoneId, player.worldTile.x, player.worldTile.y, player.faction]);
  const worldEventFactionInfluence = player.factionStates.find(f => f.faction === currentZone.faction)?.influence ?? 100;
  useEffect(() => {
    const timer = window.setInterval(() => {
      setWorldEventAge(age => {
        if (age + 1 < worldEvent.duration) return age + 1;
        const zone = getZone(player.zoneId);
        const nextEvent = generateWorldEvent(zone, player.worldThreat, player.worldResources, player.explorationCount, worldEventFactionInfluence);
        setWorldEvent(nextEvent);
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [player.zoneId, player.worldThreat, player.worldResources, player.explorationCount, worldEventFactionInfluence, worldEvent.duration]);

  useEffect(() => {
    if (!autoMove || !waypoint) return;
    const path = findTilePath(worldTile, waypoint);
    if (path.length <= 1) {
      setAutoMove(false);
      setPathLength(0);
      const eventPoint = getWorldEventPoint(worldEvent);
      const currentPlayer = playerRef.current;
      if (worldTile.x === eventPoint.x && worldTile.y === eventPoint.y) {
        const next = applyWorldEventState(currentPlayer, worldEvent.effect, worldEvent.intensity, worldEvent.faction);
        update(next);
        setWorldMessage('Territorial event triggered: ' + worldEvent.title);
        setWorldEvent(generateWorldEvent(currentZone, next.worldThreat, next.worldResources, next.explorationCount, next.factionStates.find(f => f.faction === currentZone.faction)?.influence ?? 100));
        setWaypoint(null);
        setSelectedSignal(null);
        return;
      }
      const poi = getNearestPoi(currentZone, worldTile);
      const npc = zoneNpcs.find(candidate => candidate.x === worldTile.x && candidate.y === worldTile.y);
      if (poi && poi.distance === 0) {
        const interaction = interactWithPoi(currentZone, poi.index);
        if (interaction) {
          setPoiMessage('POI reached: ' + interaction.name);
          setPoiAction(interaction.action);
          const modifiers = getZoneDynamicModifiers(currentZone, currentPlayer.worldThreat, currentPlayer.worldResources, currentPlayer.factionStates.find(f => f.faction === player.faction)?.influence ?? 100);
          const next = applyPoiReward(currentPlayer, interaction.action, { resourceYield: modifiers.resourceYield, encounterChance: modifiers.encounterChance }, currentZone.id + ':' + poi.index);
          update(next);
          setScenario(generateScenario(currentZone, next.level, next.explorationCount));
          setWorldEvent(generateWorldEvent(currentZone, next.worldThreat, next.worldResources, next.explorationCount));
          setWorldMessage('POI interaction resolved: ' + interaction.action);
        }
      } else if (npc) {
        const interaction = interactWithNpc(npc, currentPlayer.worldThreat, currentPlayer.worldResources);
        const next = applyNpcInteraction(currentPlayer, npc.faction as Faction, interaction.action, npc.id);
        update(next);
        setWorldMessage('NPC interaction resolved: ' + interaction.message);
        setScenario(generateScenario(currentZone, next.level, next.explorationCount));
        setWorldEvent(generateWorldEvent(currentZone, next.worldThreat, next.worldResources, next.explorationCount));
      }
      setWaypoint(null);      setSelectedSignal(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setWorldTile(path[1]);
      persistMovement(path[1]);
      setPathLength(path.length - 2);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [autoMove, waypoint, worldTile, currentZone, zoneNpcs, worldEvent]);

  useEffect(() => {
    let cancelled = false;
    void loadOrCreatePlayerRemote(player).then(result => {
      if (!cancelled && result.player) {
        savePlayer(result.player);
        setPlayer(result.player);
        setWorldTile(result.player.worldTile);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const chooseFaction = (faction: Faction) => update({ ...player, faction });
  const moveTo = (zoneId: string) => { const zone=getZone(zoneId); if(canEnterZone(player.level,zone)) { const next={...player,zoneId:zone.id,lastDiscovery:`Arrived at ${zone.name}`,worldTile:{x:0,y:0}}; setWorldTile(next.worldTile); setWaypoint(null); setAutoMove(false); setPathLength(0); update(next); } };
  const doExplore = () => update(explore(player));
  const startCombat = () => { const faction=currentZone.faction==='Neutral'?player.faction:currentZone.faction; const modifiers=getZoneDynamicModifiers(currentZone,player.worldThreat,player.worldResources,player.factionStates.find(f=>f.faction===player.faction)?.influence??100); setCombat(createEncounter(player.level,currentZone.level,{...(equipped??{}),threat:player.worldThreat,faction,encounterChance:modifiers.encounterChance})); };
  const attack = () => {
    if(!combat)return;
    const next=playerAttack(combat); setCombat(next);
    if(next.status==='victory'){
      let reward=applyCombatOutcome(grantArenaReward(player),true,next.enemy.level);
      if(equipped){ reward={...reward,cards:reward.cards.map(c=>c.id===equipped.id?upgradeCard(c,getCombatReward(next)):c)}; }
      setLastCardXp(equipped?getCombatReward(next):0); update(reward);
    }
  };

  if(creating)return <main className="shell"><header className="header"><div><span className="eyebrow">FREEDOMARENA × RPGQG CARDS</span><h1>Web Arena</h1></div><span className="status">Playable foundation</span></header><section className="hero"><div><span className="eyebrow">PLAYER CREATION</span><h2>Enter the Arena</h2><p>Create your player before choosing a faction and exploring the world.</p></div><form onSubmit={e=>{e.preventDefault();const n=name.trim();if(!n)return;update({...player,name:n});setCreating(false);}}><label htmlFor="player-name">Player name</label><input id="player-name" value={name} onChange={e=>setName(e.target.value)} maxLength={24} autoFocus placeholder="Arena Player"/><button type="submit" disabled={!name.trim()}>Create player</button></form></section></main>;

  return <main className="shell"><header className="header"><div><span className="eyebrow">FREEDOMARENA × RPGQG CARDS</span><h1>Web Arena</h1></div><span className="status">RPGQG progression</span></header>
  <section className="hero"><div><span className="eyebrow">PLAYER</span><h2>{player.name}</h2><p>Level {player.level} · {player.xp} XP · {player.victories} victories · {player.arenaWins} arena wins · {player.fusionMaterials} fusion materials</p></div>{equipped&&<div className="equipped"><span className="eyebrow">EQUIPPED CARD</span><strong>{equipped.name}</strong><span>{equipped.rarity} · Lv {equipped.level}</span>{lastCardXp>0&&<small>+{lastCardXp} card XP on last victory</small>}</div>}</section>
  <section className="panel"><div><span className="eyebrow">WORLD / EXPLORATION</span><h2>{currentZone.name}</h2><p>{currentZone.description}</p><div className="world-layout"><div className="world-map"><WorldCanvas zoneId={player.zoneId} waypoint={waypoint} worldTile={worldTile} worldThreat={player.worldThreat} worldResources={player.worldResources} explorationCount={player.explorationCount} factionInfluence={activeFactionInfluence} worldEvent={worldEvent} worldEventAge={worldEventAge} remotePlayers={remotePlayers} onSignalSelect={setSelectedSignal} onTileMove={(x,y)=>{const next=moveTile(worldTile,{x,y});setWorldTile(next);update({...player,worldTile:next});setWorldMessage(next.x===x&&next.y===y?`Moved to tile ${x}, ${y}.`:`Blocked path: ${getTile(x,y).kind} tile.`)}} />{zones.map(zone=><button key={zone.id} className={zone.id===player.zoneId?'zone-node active':'zone-node'} disabled={getZoneStatus(player.level,zone,player.zoneId)==='locked'} onClick={()=>moveTo(zone.id)}><strong>{zone.name}</strong><span>Lv {zone.level} · {zone.faction}</span></button>)}</div><div className="zone-info"><p><strong>Tile:</strong> {worldTile.x}, {worldTile.y} · <strong>World:</strong> {worldMessage}</p>{waypoint&&<p><strong>Waypoint:</strong> {waypoint.x}, {waypoint.y} · <strong>Path:</strong> {pathLength} steps</p>}{nearestPoi&&<p><strong>Nearest POI:</strong> {nearestPoi.name} · distance {nearestPoi.distance}</p>}{selectedSignal&&<p><strong>Signal:</strong> {selectedSignal.name} · {selectedSignal.type.toUpperCase()} · {selectedSignal.x}, {selectedSignal.y}</p>}{nearestNpc.npc&&<p><strong>Nearest faction NPC:</strong> {nearestNpc.npc.name} · {nearestNpc.npc.activity} · distance {nearestNpc.distance}{getNpcMemory(nearestNpc.npc.id)&&<> · Trust {getNpcMemory(nearestNpc.npc.id)!.trust} · {getNpcMemory(nearestNpc.npc.id)!.affinity}</>}</p>}{selectedSignal&&<div className="signal-actions"><button type="button" onClick={()=>{setWaypoint({x:selectedSignal.x,y:selectedSignal.y});setAutoMove(true);setWorldMessage('Waypoint set: '+selectedSignal.name);}}>Navigate to signal</button>{selectedSignal.type==='npc'&&<button type="button" disabled={Math.abs(selectedSignal.x-worldTile.x)+Math.abs(selectedSignal.y-worldTile.y)>2} onClick={()=>{const npc=zoneNpcs.find(n=>n.x===selectedSignal.x&&n.y===selectedSignal.y);if(!npc)return;const result=interactWithNpc(npc,player.worldThreat,player.worldResources);const next=applyNpcInteraction(player,npc.faction as Faction,result.action,npc.id);update(next);setWorldMessage(result.message);setSelectedSignal(null);}}>{Math.abs(selectedSignal.x-worldTile.x)+Math.abs(selectedSignal.y-worldTile.y)<=2?'Resolve NPC action':'Move closer'}</button>}{selectedSignal.type==='event'&&<button type="button" disabled={Math.abs(selectedSignal.x-worldTile.x)+Math.abs(selectedSignal.y-worldTile.y)>0} onClick={()=>{const next=applyWorldEventState(player,worldEvent.effect,worldEvent.intensity,worldEvent.faction);update(next);setWorldEvent(generateWorldEvent(currentZone,next.worldThreat,next.worldResources,next.explorationCount,activeFactionInfluence));setWorldMessage('World event resolved: '+worldEvent.title);setWorldEventAge(0);setWaypoint(null);setAutoMove(false);setSelectedSignal(null);}}>Resolve event</button>}{selectedSignal.type==='poi'&&<button type="button" disabled={Math.abs(selectedSignal.x-worldTile.x)+Math.abs(selectedSignal.y-worldTile.y)>0} onClick={()=>{const poiIndex=currentZone.pointsOfInterest.findIndex(name=>name===selectedSignal.name);if(poiIndex<0)return;const interaction=interactWithPoi(currentZone,poiIndex);if(!interaction)return;const modifiers=getZoneDynamicModifiers(currentZone,player.worldThreat,player.worldResources,player.factionStates.find(f=>f.faction===player.faction)?.influence??100);const next=applyPoiReward(player,interaction.action,{resourceYield:modifiers.resourceYield,encounterChance:modifiers.encounterChance},currentZone.id+':'+poiIndex);update(next);setPoiMessage('POI resolved: '+interaction.name);setPoiAction(interaction.action);setSelectedSignal(null);setWorldMessage('POI action resolved: '+interaction.action);}}>{worldTile.x===selectedSignal.x&&worldTile.y===selectedSignal.y?'Resolve POI action':'Move to POI'}</button>}</div>}{nearestNpc.npc&&<button type="button" disabled={nearestNpc.distance>2} onClick={()=>{const result=interactWithNpc(nearestNpc.npc,player.worldThreat,player.worldResources);update(applyNpcInteraction(player,nearestNpc.npc.faction as Faction,result.action,nearestNpc.npc.id));setWorldMessage(result.message);}}>{nearestNpc.distance<=2?'Interact with NPC':'Move closer to interact'}</button>}{poiMessage&&<p><strong>Discovery:</strong> {poiMessage} · <strong>Action:</strong> {poiAction}</p>}<p><strong>Faction:</strong> {currentZone.faction} · <strong>Required level:</strong> {currentZone.level}</p><p><strong>Points of interest:</strong> {currentZone.pointsOfInterest.join(' · ')}</p><div className="actions"><button onClick={doExplore}>Explore this zone</button><button onClick={startCombat} disabled={combat?.status==='active'}>Enter combat</button></div>{player.lastDiscovery&&<p><strong>Latest discovery:</strong> {player.lastDiscovery}</p>}</div></div></div></section>
  <section className="panel"><div><span className="eyebrow">ARENA / COMBAT</span><h2>{combat?combat.enemy.name:'No active encounter'}</h2>{!combat&&<p>Start an arena encounter from the current zone.</p>}{combat&&<><p><strong>You:</strong> {combat.player.hp}/{combat.player.maxHp} HP · ATK {combat.player.attack} · DEF {combat.player.defense}</p><p><strong>Enemy:</strong> {combat.enemy.hp}/{combat.enemy.maxHp} HP · ATK {combat.enemy.attack} · DEF {combat.enemy.defense}</p><div className="actions">{combat.status==='active'&&<button onClick={attack} disabled={combat.turn!=='player'}>Attack</button>}{combat.status!=='active'&&<button onClick={()=>setCombat(null)}>Leave encounter</button>}</div><p>{combat.log.slice(-3).join(' · ')}</p>{combat.status==='victory'&&<><p><strong>RPGQG reward:</strong> +{getCombatReward(combat)} XP + 1 card.</p><p><strong>Combat summary:</strong> {getCombatSummary(combat).rounds} rounds · {getCombatSummary(combat).damageDealt} damage dealt · {getCombatSummary(combat).damageTaken} damage taken.</p></>}{combat.status==='defeat'&&<p><strong>Defeat.</strong> No card reward granted.</p>}</>}</div></section>
  <section className="panel"><div><span className="eyebrow">TRAVEL</span><h2>Reachable zones</h2></div><div className="actions">{getReachableZones(player.zoneId).map(zone=><button key={zone.id} disabled={!canEnterZone(player.level,zone)} onClick={()=>moveTo(zone.id)}>{zone.name} · Lv {zone.level}</button>)}</div><p>World zones: {zones.length}</p></section>
  <section className="panel"><div><span className="eyebrow">FACTION</span><h2>Choose your allegiance</h2></div><div className="actions">{factions.map(f=><button className={player.faction===f?'selected':''} key={f} onClick={()=>chooseFaction(f)}>{f}</button>)}</div><p>Current faction: <strong>{player.faction}</strong></p></section>
        <section className="panel hud-layer"><div><span className="eyebrow">TACTICAL HUD · LAYERED / 3D READY</span><h2>{environmentLabels[environment.cycle]} · {weatherLabels[environment.weather]}</h2><div className="hud-strip"><div className="hud-chip"><b>ZONE</b><span>{currentZone.name}</span></div><div className="hud-chip"><b>FACTION</b><span>{factionPressure.status}</span></div><div className="hud-chip"><b>THREAT</b><span>{player.worldThreat}</span></div><div className="hud-chip"><b>PRESSURE</b><span>{factionPressure.pressure}</span></div></div><div className="environment-grid"><article><strong>Cycle</strong><span>{environmentLabels[environment.cycle]}</span></article><article><strong>Météo</strong><span>{weatherLabels[environment.weather]}</span></article><article><strong>Contrôle</strong><span>{getFactionPressureLabel(factionPressure)}</span></article><article><strong>Rencontres</strong><span>{zoneModifiers.encounterChance}%</span></article></div><div className="hud-radar"><span className="radar-ring ring-a"/><span className="radar-ring ring-b"/><span className="radar-core"/><span className="radar-label">WORLD SYNC</span><i className="radar-sweep"/></div><p>HUD superposé : environnement, contrôle territorial, menace et pression alimentent la même couche de simulation pour les futurs VFX et scènes 3D.</p></div></section>
  <section className="panel"><div><span className="eyebrow">NPC RELATIONSHIPS</span><h2>Faction contacts</h2><p>Trust and affinity persist with the player save.</p></div><div className="faction-grid">{zoneNpcs.map(npc=>{const memory=getNpcMemory(npc.id);return <article className="faction-state" key={npc.id}><strong>{npc.name}</strong><span>{npc.role} · {npc.activity}</span><span>Trust {memory?.trust??0} · {memory?.affinity??'neutral'}</span><span>Encounters {memory?.encounters??0}</span></article>;})}</div></section>
<section className="panel"><div><span className="eyebrow">WORLD STATE · LAYERS</span><h2>Persistent simulation</h2><p>Threat {player.worldThreat} · Resources {player.worldResources}</p><div className="faction-grid">{player.factionStates.map(f=><article className="faction-state" key={f.faction}><strong>{f.faction}</strong><span>Influence {f.influence}</span><span>Reputation {f.reputation}</span></article>)}</div></div></section>
  <section className="panel"><div><span className="eyebrow">EMERGENT WORLD EVENT</span><h2>{worldEvent.title}</h2><p>{worldEvent.description}</p><small>{worldEvent.faction} · Intensity {worldEvent.intensity} · Effect {worldEvent.effect} · Phase {getWorldEventPhase(worldEvent,worldEventAge).toUpperCase()} · Lifetime {worldEventAge}/{worldEvent.duration}</small><div className="quest-progress"><i style={{width:""+getWorldEventProgress(worldEvent,worldEventAge)+"%"}} /></div><div className="actions"><button type="button" onClick={()=>{const eventPoint = getWorldEventPoint(worldEvent);setWaypoint(eventPoint);setAutoMove(true);setWorldMessage('Route to event: '+worldEvent.title);}}>Navigate to event</button><button type="button" onClick={()=>{const next=applyWorldEventState(player,worldEvent.effect,worldEvent.intensity,worldEvent.faction);update(next);setWorldEvent(generateWorldEvent(currentZone,next.worldThreat,next.worldResources,next.explorationCount,activeFactionInfluence));setWorldMessage('World event resolved: '+worldEvent.title);setWorldEventAge(0);}}>Resolve now</button></div><p className="event-signal">◈ EVENT SIGNAL · intensity {worldEvent.intensity}</p></div></section>
<section className="panel"><div><span className="eyebrow">DYNAMIC SCENARIO</span><h2>{scenario.title}</h2><p>{scenario.description}</p><small>Threat {zoneModifiers.threat} · Yield {zoneModifiers.resourceYield} · Encounter {zoneModifiers.encounterChance}%</small><div className="scenario-choices">{scenario.choices.map((choice,index)=><button key={choice} type="button" onClick={()=>{const next=applyScenarioChoice(player,index);update(next);setWorldMessage('Scenario choice: '+choice);setScenario(generateScenario(currentZone,next.level,next.explorationCount,index+1));}}>{choice}</button>)}</div></div></section>
<section className="panel"><div><span className="eyebrow">QUEST LOG</span><h2>Frontier objectives</h2></div><div className="quests">{player.quests.map(quest=><article className={quest.completed?'quest completed':'quest'} key={quest.id}><strong>{quest.title}</strong><span>{quest.description}</span><div className="quest-progress"><i style={{width:`${Math.min(100,Math.round((quest.progress/quest.target)*100))}%`}} /></div><small>{quest.progress}/{quest.target} · {quest.completed?'Completed':'In progress'}</small></article>)}</div></section>
<section className="panel"><div><span className="eyebrow">RPGQG CARDS · EQUIPMENT / FUSION</span><h2>Collection</h2></div>{player.cards.length===0?<p>No cards yet. Win an arena fight.</p>:<div className="cards">{player.cards.map(card=><article className={card.id===player.equippedCardId?'card-equipped':''} key={card.id}><strong>{card.name}</strong><span>{card.rarity} · Lv {card.level}</span><div className="card-stats"><span>⚔ Power <b>{card.power}</b></span><span>🛡 Defense <b>{card.defense}</b></span><span>❤ Vitality <b>{card.vitality}</b></span><span>★ XP <b>{card.xp}/100</b></span></div><div className="actions"><button onClick={()=>update(equipCard(player,card.id===player.equippedCardId?null:card.id))}>{card.id===player.equippedCardId?'Unequip':'Equip'}</button>{fusionSourceId===null?<button disabled={!player.cards.some(other=>other.id!==card.id&&other.rarity===card.rarity)} onClick={()=>setFusionSourceId(card.id)}>Fuse</button>:fusionSourceId===card.id?<button onClick={()=>setFusionSourceId(null)}>Cancel fusion</button>:<button disabled={card.rarity==='Legendary'||player.cards.find(other=>other.id===fusionSourceId)?.rarity!==card.rarity||player.fusionMaterials<getCardFusionCost(card.rarity)} onClick={()=>{const next=fuseCards(player,fusionSourceId,card.id);if(next!==player){update(next);setFusionSourceId(null);}}}>Fuse with this ({getCardFusionCost(card.rarity)} materials)</button>}</div></article>)}</div>}</section></main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);