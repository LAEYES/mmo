import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { canEnterZone, canWalkTile, explore, findTilePath, getNearestPoi, interactWithPoi, getReachableZones, getZone, getZoneStatus, generateScenario, generateWorldEvent, getZoneDynamicModifiers, getZoneEnvironment, getZoneNpcs, getZoneFactionPressure, getFactionPressureLabel, getTile, moveTile, zones } from './world';
import { createEncounter, getCombatReward, getCombatSummary, playerAttack, type CombatState } from './combat';
import { equipCard, factions, fuseCards, getCardFusionCost, getEquippedCard, grantArenaReward, applyPoiReward, applyScenarioChoice, applyCombatOutcome, applyWorldEventState, applyNpcInteraction, loadPlayer, savePlayer, upgradeCard, type Faction } from './game';

function WorldCanvas({ zoneId, waypoint, worldThreat, worldResources, explorationCount, factionInfluence, onTileMove, onSignalSelect }: { zoneId: string; waypoint: {x:number;y:number}|null; worldThreat: number; worldResources: number; explorationCount: number; factionInfluence: number; onTileMove: (tileX: number, tileY: number) => void; onSignalSelect: (signal: {type:'poi'|'npc'; name:string; x:number; y:number}) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const position = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const canvas = ref.current;
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
      const signals: Array<{type:'poi'|'npc';name:string;x:number;y:number;sx:number;sy:number}> = [];
      zone.pointsOfInterest.forEach((name,index) => {
        const x = Math.floor((index + 1) * 60 / (zone.pointsOfInterest.length + 1));
        const y = 5 + index * 8;
        signals.push({type:'poi',name,x,y,sx:(x-cameraX)*tile+tile/2,sy:(y-cameraY)*tile+tile/2});
      });
      npcs.forEach(npc => signals.push({type:'npc',name:npc.name,x:npc.x,y:npc.y,sx:(npc.x-cameraX)*tile+tile/2,sy:(npc.y-cameraY)*tile+tile/2}));
      const hit = signals.find(signal => Math.hypot(clickX-signal.sx, clickY-signal.sy) <= 14);
      if (hit) {
        onSignalSelect({type:hit.type,name:hit.name,x:hit.x,y:hit.y});
        return;
      }
      const tileX = Math.floor(clickX / tile) + cameraX;
      const tileY = Math.floor(clickY / tile) + cameraY;
      position.current = { x: tileX, y: tileY };
      onTileMove(tileX, tileY);
    };
    canvas.addEventListener('pointerdown', onPointer);
    return () => canvas.removeEventListener('pointerdown', onPointer);
  }, [onTileMove, onSignalSelect, zoneId, worldThreat, worldResources, explorationCount]);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const tile = 32, cols = Math.ceil(rect.width / tile), rows = Math.ceil(rect.height / tile);
      const cameraX = Math.max(0, Math.min(59 - cols, position.current.x - Math.floor(cols / 2)));
      const cameraY = Math.max(0, Math.min(39 - rows, position.current.y - Math.floor(rows / 2)));
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) {
        const worldX = x + cameraX, worldY = y + cameraY;
        const terrain = getTile(worldX, worldY);
        const biome = Math.floor((worldX + worldY) / 12) % 4;
        ctx.fillStyle = terrain.kind === 'water' ? '#102f4a' : terrain.kind === 'rock' ? '#30364a' : terrain.kind === 'wall' ? '#070b13' : biome === 0 ? '#101b30' : biome === 1 ? '#172536' : biome === 2 ? '#182d28' : '#241f32';
        ctx.fillRect(x*tile,y*tile,tile,tile);
        if (terrain.kind !== 'ground') {
          ctx.strokeStyle = terrain.kind === 'wall' ? '#202b40' : '#53627b';
          ctx.lineWidth = 1;
          ctx.strokeRect(x*tile+1,y*tile+1,tile-2,tile-2);
        }
      }
      const zone=getZone(zoneId);
      const environment=getZoneEnvironment(zone,worldThreat,worldResources,explorationCount);
      const npcs=getZoneNpcs(zone,worldThreat,worldResources,explorationCount);
      const cycleAlpha={dawn:.10,day:0,dusk:.13,night:.24}[environment.cycle];
      if(cycleAlpha){ctx.fillStyle=`rgba(12,20,48,${cycleAlpha})`;ctx.fillRect(0,0,rect.width,rect.height);}
      if(environment.weather==='mist'){ctx.fillStyle='rgba(190,210,225,.07)';ctx.fillRect(0,0,rect.width,rect.height);}
      if(environment.weather==='storm'){ctx.fillStyle=`rgba(80,90,130,${Math.min(.16,.05+environment.atmosphere*.02)})`;ctx.fillRect(0,0,rect.width,rect.height);}
      if(environment.weather==='frost'){ctx.fillStyle='rgba(180,215,255,.08)';ctx.fillRect(0,0,rect.width,rect.height);}
      if(worldThreat>=4){ctx.fillStyle=`rgba(150,30,40,${Math.min(.18,(worldThreat-3)*.03)})`;ctx.fillRect(0,0,rect.width,rect.height);}
      const particles=Math.min(18,environment.atmosphere*3+(environment.weather==='storm'?6:0));
      ctx.fillStyle='rgba(220,235,255,.42)';
      for(let i=0;i<particles;i++){const x=((i*47+explorationCount*13)%Math.max(1,rect.width));const y=((i*83+worldThreat*17)%Math.max(1,rect.height));ctx.fillRect(x,y,2,2);}
      ctx.strokeStyle='#3b5684'; ctx.lineWidth=2; ctx.strokeRect(12,12,rect.width-24,rect.height-24);
      ctx.fillStyle='#dce7ff'; ctx.font='600 14px Inter,sans-serif'; ctx.fillText(zone.name,24,38);
      const mapPoi = zone.pointsOfInterest.map((name,index)=>({
        name,
        x: Math.floor((index + 1) * 60 / (zone.pointsOfInterest.length + 1)),
        y: 5 + index * 8
      }));
      mapPoi.forEach((poi)=>{
        const sx=(poi.x-cameraX)*tile+tile/2, sy=(poi.y-cameraY)*tile+tile/2;
        if(sx<0||sy<0||sx>rect.width||sy>rect.height)return;
        ctx.fillStyle='#d8b56a'; ctx.beginPath(); ctx.arc(sx,sy,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ead9ad'; ctx.font='10px Inter,sans-serif'; ctx.fillText(poi.name,sx+9,sy+3);
      });
      const eventPoint = { x: Math.min(58, Math.max(1, 10 + worldThreat * 2)), y: Math.min(38, Math.max(1, 8 + explorationCount * 2)) };
      const eventDistance = Math.abs(position.current.x - eventPoint.x) + Math.abs(position.current.y - eventPoint.y);
      if (eventDistance <= 8) {
        ctx.strokeStyle='rgba(230,120,110,.55)'; ctx.lineWidth=2; ctx.setLineDash([5,5]);
        const ex=(eventPoint.x-cameraX)*tile+tile/2, ey=(eventPoint.y-cameraY)*tile+tile/2;
        if(ex>=0&&ey>=0&&ex<=rect.width&&ey<=rect.height){ctx.beginPath();ctx.arc(ex,ey,24,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#f0b0a0';ctx.font='600 9px Inter,sans-serif';ctx.fillText('EVENT',ex-18,ey-30);}
        ctx.setLineDash([]);
      }
      ctx.fillStyle='#ef9f8f'; ctx.beginPath();
      const ex=(eventPoint.x-cameraX)*tile+tile/2, ey=(eventPoint.y-cameraY)*tile+tile/2;
      if(ex>=-10&&ey>=-10&&ex<=rect.width+10&&ey<=rect.height+10){ctx.arc(ex,ey,5+Math.min(4,worldThreat/3),0,Math.PI*2);ctx.fill();}
      const path = waypoint ? findTilePath(position.current, waypoint) : [];
      if (path.length > 1) {
        ctx.strokeStyle = '#d8b56a';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        path.forEach((p, i) => {
          const sx=(p.x-cameraX)*tile+tile/2, sy=(p.y-cameraY)*tile+tile/2;
          if (i===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (waypoint) {
        const wx=(waypoint.x-cameraX)*tile+tile/2, wy=(waypoint.y-cameraY)*tile+tile/2;
        if(wx>=0&&wy>=0&&wx<=rect.width&&wy<=rect.height){
          ctx.strokeStyle='#d8b56a'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.arc(wx,wy,11,0,Math.PI*2); ctx.stroke();
          ctx.fillStyle='#ead9ad'; ctx.font='600 10px Inter,sans-serif'; ctx.fillText('WAYPOINT',wx-27,wy-15);
        }
      }
      zone.pointsOfInterest.forEach((name,index)=>{
        const x=24+((index+1)*(rect.width-48))/(zone.pointsOfInterest.length+1), y=rect.height*(index%2===0?.42:.68);
        ctx.fillStyle='#9db4e8'; ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#c9d7f5'; ctx.font='11px Inter,sans-serif'; ctx.fillText(name,x+10,y+4);
      });
      npcs.forEach((npc)=>{const sx=(npc.x-cameraX)*tile+tile/2,sy=(npc.y-cameraY)*tile+tile/2;if(sx<0||sy<0||sx>rect.width||sy>rect.height)return;ctx.fillStyle=npc.faction==='Aegis'?'#8fa9e8':npc.faction==='Nomads'?'#d8b56a':'#ad8ee8';ctx.beginPath();ctx.arc(sx,sy,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e5ebfa';ctx.font='9px Inter,sans-serif';ctx.fillText(npc.activity.toUpperCase(),sx+8,sy+3);if(npc.activity==='patrol'){ctx.strokeStyle='rgba(235,120,120,.7)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(sx,sy,12+environment.atmosphere*2,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}});
      const pressure = getZoneFactionPressure(zone, factionInfluence);
      const pressureColor = pressure.status === 'dominant' ? 'rgba(120,180,255,.75)' : pressure.status === 'contested' ? 'rgba(220,190,110,.75)' : pressure.status === 'weak' ? 'rgba(230,110,130,.8)' : 'rgba(160,180,210,.65)';
      ctx.strokeStyle=pressureColor;ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.strokeRect(8,8,rect.width-16,rect.height-16);ctx.setLineDash([]);
      const px=(position.current.x-cameraX)*tile+tile/2, py=(position.current.y-cameraY)*tile+tile/2;
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(px,py,9,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#9db4e8'; ctx.stroke(); ctx.fillStyle='#c9d7f5'; ctx.font='600 11px Inter,sans-serif'; ctx.fillText('PLAYER',px-22,py+24);
    };
    draw();
    window.addEventListener('resize',draw);
    return()=>window.removeEventListener('resize',draw);
  },[zoneId,waypoint,worldThreat,worldResources,explorationCount,factionInfluence]);
  return <canvas ref={ref} className="tile-canvas" aria-label={`Tile map of ${getZone(zoneId).name}`} />;
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
  const [selectedSignal, setSelectedSignal] = useState<{type:'poi'|'npc'; name:string; x:number; y:number} | null>(null);
  const [worldEvent, setWorldEvent] = useState(generateWorldEvent(getZone(player.zoneId),player.worldThreat,player.worldResources,player.explorationCount,player.factionStates.find(f=>f.faction===getZone(player.zoneId).faction)?.influence??100));
  const [scenario, setScenario] = useState(generateScenario(getZone(player.zoneId), player.level, player.explorationCount));
  const [poiMessage, setPoiMessage] = useState('');
  const [poiAction, setPoiAction] = useState('');
  const [autoMove, setAutoMove] = useState(false);
  const nearestPoi = getNearestPoi(currentZone, worldTile);
  const nearestNpc = zoneNpcs.reduce((nearest,npc)=>{const distance=Math.abs(npc.x-worldTile.x)+Math.abs(npc.y-worldTile.y);return distance<nearest.distance?{npc,distance}:nearest;},{npc:zoneNpcs[0],distance:Number.POSITIVE_INFINITY});
  useEffect(() => {
    if (!autoMove || !waypoint) return;
    const path = findTilePath(worldTile, waypoint);
    if (path.length <= 1) {
      setAutoMove(false);
      setPathLength(0);
      const poi = getNearestPoi(currentZone, worldTile);
      const npc = zoneNpcs.find(candidate => candidate.x === worldTile.x && candidate.y === worldTile.y);
      if (poi && poi.distance === 0) {
        const interaction = interactWithPoi(currentZone, poi.index);
        if (interaction) {
          setPoiMessage('POI reached: ' + interaction.name);
          setPoiAction(interaction.action);
          const modifiers = getZoneDynamicModifiers(currentZone, player.worldThreat, player.worldResources, player.factionStates.find(f => f.faction === player.faction)?.influence ?? 100);
          const next = applyPoiReward(player, interaction.action, { resourceYield: modifiers.resourceYield, encounterChance: modifiers.encounterChance }, currentZone.id + ':' + poi.index);
          update(next);
          setScenario(generateScenario(currentZone, next.level, next.explorationCount));
          setWorldEvent(generateWorldEvent(currentZone, next.worldThreat, next.worldResources, next.explorationCount));
          setWorldMessage('POI interaction resolved: ' + interaction.action);
        }
      } else if (npc) {
        const interaction = interactWithNpc(npc, player.worldThreat, player.worldResources);
        const next = applyNpcInteraction(player, npc.faction as Faction, interaction.action);
        update(next);
        setWorldMessage('NPC interaction resolved: ' + interaction.message);
        setScenario(generateScenario(currentZone, next.level, next.explorationCount));
        setWorldEvent(generateWorldEvent(currentZone, next.worldThreat, next.worldResources, next.explorationCount));
      }
      setWaypoint(null);
      setSelectedSignal(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setWorldTile(path[1]);
      update({...player,worldTile:path[1]});
      setPathLength(path.length - 2);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [autoMove, waypoint, worldTile]);

  const update = (next: typeof player) => { setPlayer(next); savePlayer(next); };
  const chooseFaction = (faction: Faction) => update({ ...player, faction });
  const currentZone = getZone(player.zoneId);
  const environment = getZoneEnvironment(currentZone, player.worldThreat, player.worldResources, player.explorationCount);
  const zoneNpcs = getZoneNpcs(currentZone, player.worldThreat, player.worldResources, player.explorationCount);
  const localFaction = currentZone.faction === 'Neutral' ? null : player.factionStates.find(f => f.faction === currentZone.faction);
  const factionPressure = getZoneFactionPressure(currentZone, localFaction?.influence ?? 100);
  const activeFactionInfluence = currentZone.faction === 'Neutral' ? 100 : (localFaction?.influence ?? 100);
  const zoneModifiers = getZoneDynamicModifiers(currentZone, player.worldThreat, player.worldResources, player.factionStates.find(f=>f.faction===player.faction)?.influence??100);
  const environmentLabels = { dawn: 'Aube', day: 'Jour', dusk: 'Crépuscule', night: 'Nuit' } as const;
  const weatherLabels = { clear: 'Clair', mist: 'Brume', storm: 'Tempête', frost: 'Gel' } as const;
  const equipped = getEquippedCard(player);
  const moveTo = (zoneId: string) => { const zone=getZone(zoneId); if(canEnterZone(player.level,zone)) update({...player,zoneId:zone.id,lastDiscovery:`Arrived at ${zone.name}`,worldTile:{x:0,y:0}}); };
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
  <section className="panel"><div><span className="eyebrow">WORLD / EXPLORATION</span><h2>{currentZone.name}</h2><p>{currentZone.description}</p><div className="world-layout"><div className="world-map"><WorldCanvas zoneId={player.zoneId} waypoint={waypoint} worldThreat={player.worldThreat} worldResources={player.worldResources} explorationCount={player.explorationCount} factionInfluence={activeFactionInfluence} onSignalSelect={setSelectedSignal} onTileMove={(x,y)=>{const next=moveTile(worldTile,{x,y});setWorldTile(next);update({...player,worldTile:next});setWorldMessage(next.x===x&&next.y===y?`Moved to tile ${x}, ${y}.`:`Blocked path: ${getTile(x,y).kind} tile.`)}} />{zones.map(zone=><button key={zone.id} className={zone.id===player.zoneId?'zone-node active':'zone-node'} disabled={getZoneStatus(player.level,zone,player.zoneId)==='locked'} onClick={()=>moveTo(zone.id)}><strong>{zone.name}</strong><span>Lv {zone.level} · {zone.faction}</span></button>)}</div><div className="zone-info"><p><strong>Tile:</strong> {worldTile.x}, {worldTile.y} · <strong>World:</strong> {worldMessage}</p>{waypoint&&<p><strong>Waypoint:</strong> {waypoint.x}, {waypoint.y} · <strong>Path:</strong> {pathLength} steps</p>}{nearestPoi&&<p><strong>Nearest POI:</strong> {nearestPoi.name} · distance {nearestPoi.distance}</p>}{selectedSignal&&<p><strong>Signal:</strong> {selectedSignal.name} · {selectedSignal.type.toUpperCase()} · {selectedSignal.x}, {selectedSignal.y}</p>}{nearestNpc.npc&&<p><strong>Nearest faction NPC:</strong> {nearestNpc.npc.name} · {nearestNpc.npc.activity} · distance {nearestNpc.distance}</p>}{selectedSignal&&<div className="signal-actions"><button type="button" onClick={()=>{setWaypoint({x:selectedSignal.x,y:selectedSignal.y});setAutoMove(true);setWorldMessage('Waypoint set: '+selectedSignal.name);}}>Navigate to signal</button>{selectedSignal.type==='npc'&&<button type="button" disabled={Math.abs(selectedSignal.x-worldTile.x)+Math.abs(selectedSignal.y-worldTile.y)>2} onClick={()=>{const npc=zoneNpcs.find(n=>n.x===selectedSignal.x&&n.y===selectedSignal.y);if(!npc)return;const result=interactWithNpc(npc,player.worldThreat,player.worldResources);const next=applyNpcInteraction(player,npc.faction as Faction,result.action);update(next);setWorldMessage(result.message);setSelectedSignal(null);}}>{Math.abs(selectedSignal.x-worldTile.x)+Math.abs(selectedSignal.y-worldTile.y)<=2?'Resolve NPC action':'Move closer'}</button>}{selectedSignal.type==='poi'&&<button type="button" disabled={Math.abs(selectedSignal.x-worldTile.x)+Math.abs(selectedSignal.y-worldTile.y)>0} onClick={()=>{const poiIndex=currentZone.pointsOfInterest.findIndex(name=>name===selectedSignal.name);if(poiIndex<0)return;const interaction=interactWithPoi(currentZone,poiIndex);if(!interaction)return;const modifiers=getZoneDynamicModifiers(currentZone,player.worldThreat,player.worldResources,player.factionStates.find(f=>f.faction===player.faction)?.influence??100);const next=applyPoiReward(player,interaction.action,{resourceYield:modifiers.resourceYield,encounterChance:modifiers.encounterChance},currentZone.id+':'+poiIndex);update(next);setPoiMessage('POI resolved: '+interaction.name);setPoiAction(interaction.action);setSelectedSignal(null);setWorldMessage('POI action resolved: '+interaction.action);}}>{worldTile.x===selectedSignal.x&&worldTile.y===selectedSignal.y?'Resolve POI action':'Move to POI'}</button>}</div>}{nearestNpc.npc&&<button type="button" disabled={nearestNpc.distance>2} onClick={()=>{const result=interactWithNpc(nearestNpc.npc,player.worldThreat,player.worldResources);update(applyNpcInteraction(player,nearestNpc.npc.faction as Faction,result.action));setWorldMessage(result.message);}}>{nearestNpc.distance<=2?'Interact with NPC':'Move closer to interact'}</button>}{poiMessage&&<p><strong>Discovery:</strong> {poiMessage} · <strong>Action:</strong> {poiAction}</p>}<p><strong>Faction:</strong> {currentZone.faction} · <strong>Required level:</strong> {currentZone.level}</p><p><strong>Points of interest:</strong> {currentZone.pointsOfInterest.join(' · ')}</p><div className="actions"><button onClick={doExplore}>Explore this zone</button><button onClick={startCombat} disabled={combat?.status==='active'}>Enter combat</button></div>{player.lastDiscovery&&<p><strong>Latest discovery:</strong> {player.lastDiscovery}</p>}</div></div></div></section>
  <section className="panel"><div><span className="eyebrow">ARENA / COMBAT</span><h2>{combat?combat.enemy.name:'No active encounter'}</h2>{!combat&&<p>Start an arena encounter from the current zone.</p>}{combat&&<><p><strong>You:</strong> {combat.player.hp}/{combat.player.maxHp} HP · ATK {combat.player.attack} · DEF {combat.player.defense}</p><p><strong>Enemy:</strong> {combat.enemy.hp}/{combat.enemy.maxHp} HP · ATK {combat.enemy.attack} · DEF {combat.enemy.defense}</p><div className="actions">{combat.status==='active'&&<button onClick={attack} disabled={combat.turn!=='player'}>Attack</button>}{combat.status!=='active'&&<button onClick={()=>setCombat(null)}>Leave encounter</button>}</div><p>{combat.log.slice(-3).join(' · ')}</p>{combat.status==='victory'&&<><p><strong>RPGQG reward:</strong> +{getCombatReward(combat)} XP + 1 card.</p><p><strong>Combat summary:</strong> {getCombatSummary(combat).rounds} rounds · {getCombatSummary(combat).damageDealt} damage dealt · {getCombatSummary(combat).damageTaken} damage taken.</p></>}{combat.status==='defeat'&&<p><strong>Defeat.</strong> No card reward granted.</p>}</>}</div></section>
  <section className="panel"><div><span className="eyebrow">TRAVEL</span><h2>Reachable zones</h2></div><div className="actions">{getReachableZones(player.zoneId).map(zone=><button key={zone.id} disabled={!canEnterZone(player.level,zone)} onClick={()=>moveTo(zone.id)}>{zone.name} · Lv {zone.level}</button>)}</div><p>World zones: {zones.length}</p></section>
  <section className="panel"><div><span className="eyebrow">FACTION</span><h2>Choose your allegiance</h2></div><div className="actions">{factions.map(f=><button className={player.faction===f?'selected':''} key={f} onClick={()=>chooseFaction(f)}>{f}</button>)}</div><p>Current faction: <strong>{player.faction}</strong></p></section>
        <section className="panel hud-layer"><div><span className="eyebrow">TACTICAL HUD · LAYERED / 3D READY</span><h2>{environmentLabels[environment.cycle]} · {weatherLabels[environment.weather]}</h2><div className="hud-strip"><div className="hud-chip"><b>ZONE</b><span>{currentZone.name}</span></div><div className="hud-chip"><b>FACTION</b><span>{factionPressure.status}</span></div><div className="hud-chip"><b>THREAT</b><span>{player.worldThreat}</span></div><div className="hud-chip"><b>PRESSURE</b><span>{factionPressure.pressure}</span></div></div><div className="environment-grid"><article><strong>Cycle</strong><span>{environmentLabels[environment.cycle]}</span></article><article><strong>Météo</strong><span>{weatherLabels[environment.weather]}</span></article><article><strong>Contrôle</strong><span>{getFactionPressureLabel(factionPressure)}</span></article><article><strong>Rencontres</strong><span>{zoneModifiers.encounterChance}%</span></article></div><div className="hud-radar"><span className="radar-ring ring-a"/><span className="radar-ring ring-b"/><span className="radar-core"/><span className="radar-label">WORLD SYNC</span><i className="radar-sweep"/></div><p>HUD superposé : environnement, contrôle territorial, menace et pression alimentent la même couche de simulation pour les futurs VFX et scènes 3D.</p></div></section>
  <section className="panel"><div><span className="eyebrow">WORLD STATE · LAYERS</span><h2>Persistent simulation</h2><p>Threat {player.worldThreat} · Resources {player.worldResources}</p><div className="faction-grid">{player.factionStates.map(f=><article className="faction-state" key={f.faction}><strong>{f.faction}</strong><span>Influence {f.influence}</span><span>Reputation {f.reputation}</span></article>)}</div></div></section>
  <section className="panel"><div><span className="eyebrow">EMERGENT WORLD EVENT</span><h2>{worldEvent.title}</h2><p>{worldEvent.description}</p><small>{worldEvent.faction} · Intensity {worldEvent.intensity} · Effect {worldEvent.effect}</small><div className="actions"><button type="button" onClick={()=>{const eventPoint={x:Math.min(58,Math.max(1,10+worldEvent.intensity*8)),y:Math.min(38,Math.max(1,8+worldEvent.intensity*5))};setWaypoint(eventPoint);setAutoMove(true);setWorldMessage('Route to event: '+worldEvent.title);}}>Navigate to event</button><button type="button" onClick={()=>{const next=applyWorldEventState(player,worldEvent.effect,worldEvent.intensity,worldEvent.faction);update(next);setWorldEvent(generateWorldEvent(currentZone,next.worldThreat,next.worldResources,next.explorationCount,activeFactionInfluence));setWorldMessage('World event resolved: '+worldEvent.title);}}>Resolve now</button></div><p className="event-signal">◈ EVENT SIGNAL · intensity {worldEvent.intensity}</p></div></section>
<section className="panel"><div><span className="eyebrow">DYNAMIC SCENARIO</span><h2>{scenario.title}</h2><p>{scenario.description}</p><small>Threat {zoneModifiers.threat} · Yield {zoneModifiers.resourceYield} · Encounter {zoneModifiers.encounterChance}%</small><div className="scenario-choices">{scenario.choices.map((choice,index)=><button key={choice} type="button" onClick={()=>{update(applyScenarioChoice(player,index));setWorldMessage('Scenario choice: '+choice);setScenario(generateScenario(currentZone,player.level,player.explorationCount,index+1));}}>{choice}</button>)}</div></div></section>
<section className="panel"><div><span className="eyebrow">QUEST LOG</span><h2>Frontier objectives</h2></div><div className="quests">{player.quests.map(quest=><article className={quest.completed?'quest completed':'quest'} key={quest.id}><strong>{quest.title}</strong><span>{quest.description}</span><div className="quest-progress"><i style={{width:`${Math.min(100,Math.round((quest.progress/quest.target)*100))}%`}} /></div><small>{quest.progress}/{quest.target} · {quest.completed?'Completed':'In progress'}</small></article>)}</div></section>
<section className="panel"><div><span className="eyebrow">RPGQG CARDS · EQUIPMENT / FUSION</span><h2>Collection</h2></div>{player.cards.length===0?<p>No cards yet. Win an arena fight.</p>:<div className="cards">{player.cards.map(card=><article className={card.id===player.equippedCardId?'card-equipped':''} key={card.id}><strong>{card.name}</strong><span>{card.rarity} · Lv {card.level}</span><div className="card-stats"><span>⚔ Power <b>{card.power}</b></span><span>🛡 Defense <b>{card.defense}</b></span><span>❤ Vitality <b>{card.vitality}</b></span><span>★ XP <b>{card.xp}/100</b></span></div><div className="actions"><button onClick={()=>update(equipCard(player,card.id===player.equippedCardId?null:card.id))}>{card.id===player.equippedCardId?'Unequip':'Equip'}</button>{fusionSourceId===null?<button disabled={!player.cards.some(other=>other.id!==card.id&&other.rarity===card.rarity)} onClick={()=>setFusionSourceId(card.id)}>Fuse</button>:fusionSourceId===card.id?<button onClick={()=>setFusionSourceId(null)}>Cancel fusion</button>:<button disabled={card.rarity==='Legendary'||player.cards.find(other=>other.id===fusionSourceId)?.rarity!==card.rarity||player.fusionMaterials<getCardFusionCost(card.rarity)} onClick={()=>{const next=fuseCards(player,fusionSourceId,card.id);if(next!==player){update(next);setFusionSourceId(null);}}}>Fuse with this ({getCardFusionCost(card.rarity)} materials)</button>}</div></article>)}</div>}</section></main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
