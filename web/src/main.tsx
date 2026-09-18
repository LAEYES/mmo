import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { canEnterZone, canWalkTile, explore, getReachableZones, getZone, getZoneStatus, getTile, moveTile, zones } from './world';
import { createEncounter, getCombatReward, getCombatSummary, playerAttack, type CombatState } from './combat';
import { equipCard, factions, fuseCards, getCardFusionCost, getEquippedCard, grantArenaReward, loadPlayer, savePlayer, upgradeCard, type Faction } from './game';

function WorldCanvas({ zoneId, onTileMove }: { zoneId: string; onTileMove: (tileX: number, tileY: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const position = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const tileX = Math.floor((event.clientX - rect.left) / 32);
      const tileY = Math.floor((event.clientY - rect.top) / 32);
      position.current = { x: tileX, y: tileY };
      onTileMove(tileX, tileY);
    };
    canvas.addEventListener('pointerdown', onPointer);
    return () => canvas.removeEventListener('pointerdown', onPointer);
  }, [onTileMove]);
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
      const cameraX = Math.max(0, position.current.x - Math.floor(cols / 2));
      const cameraY = Math.max(0, position.current.y - Math.floor(rows / 2));
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) {
        const worldX = x + cameraX, worldY = y + cameraY;
        const terrain = getTile(worldX, worldY);
        ctx.fillStyle = terrain.kind === 'water' ? '#132f4a' : terrain.kind === 'rock' ? '#30364a' : terrain.kind === 'wall' ? '#070b13' : ((x*17+y*31)%7<2 ? '#101b30' : '#0d1628');
        ctx.fillRect(x*tile,y*tile,tile,tile);
        if (terrain.kind !== 'ground') {
          ctx.strokeStyle = terrain.kind === 'wall' ? '#202b40' : '#53627b';
          ctx.lineWidth = 1;
          ctx.strokeRect(x*tile+1,y*tile+1,tile-2,tile-2);
        }
      }
      const zone=getZone(zoneId);
      ctx.strokeStyle='#3b5684'; ctx.lineWidth=2; ctx.strokeRect(12,12,rect.width-24,rect.height-24);
      ctx.fillStyle='#dce7ff'; ctx.font='600 14px Inter,sans-serif'; ctx.fillText(zone.name,24,38);
      zone.pointsOfInterest.forEach((name,index)=>{
        const x=24+((index+1)*(rect.width-48))/(zone.pointsOfInterest.length+1), y=rect.height*(index%2===0?.42:.68);
        ctx.fillStyle='#9db4e8'; ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#c9d7f5'; ctx.font='11px Inter,sans-serif'; ctx.fillText(name,x+10,y+4);
      });
      const px=(position.current.x-cameraX)*tile+tile/2, py=(position.current.y-cameraY)*tile+tile/2;
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(px,py,9,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#9db4e8'; ctx.stroke(); ctx.fillStyle='#c9d7f5'; ctx.font='600 11px Inter,sans-serif'; ctx.fillText('PLAYER',px-22,py+24);
    };
    draw();
    window.addEventListener('resize',draw);
    return()=>window.removeEventListener('resize',draw);
  },[zoneId]);
  return <canvas ref={ref} className="tile-canvas" aria-label={`Tile map of ${getZone(zoneId).name}`} />;
}
function App() {
  const [player, setPlayer] = useState(loadPlayer);
  const [name, setName] = useState(player.name === 'Arena Player' ? '' : player.name);
  const [creating, setCreating] = useState(player.name === 'Arena Player');
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [lastCardXp, setLastCardXp] = useState(0);
  const [fusionSourceId, setFusionSourceId] = useState<string | null>(null);
  const [worldTile, setWorldTile] = useState({ x: 0, y: 0 });
  const [worldMessage, setWorldMessage] = useState('Select a tile to move.');
  const update = (next: typeof player) => { setPlayer(next); savePlayer(next); };
  const chooseFaction = (faction: Faction) => update({ ...player, faction });
  const currentZone = getZone(player.zoneId);
  const equipped = getEquippedCard(player);
  const moveTo = (zoneId: string) => { const zone=getZone(zoneId); if(canEnterZone(player.level,zone)) update({...player,zoneId:zone.id,lastDiscovery:`Arrived at ${zone.name}`}); };
  const doExplore = () => update(explore(player));
  const startCombat = () => setCombat(createEncounter(player.level,currentZone.level,equipped??{}));
  const attack = () => {
    if(!combat)return;
    const next=playerAttack(combat); setCombat(next);
    if(next.status==='victory'){
      let reward=grantArenaReward(player);
      if(equipped){ reward={...reward,cards:reward.cards.map(c=>c.id===equipped.id?upgradeCard(c,getCombatReward(next)):c)}; }
      setLastCardXp(equipped?getCombatReward(next):0); update(reward);
    }
  };

  if(creating)return <main className="shell"><header className="header"><div><span className="eyebrow">FREEDOMARENA × RPGQG CARDS</span><h1>Web Arena</h1></div><span className="status">Playable foundation</span></header><section className="hero"><div><span className="eyebrow">PLAYER CREATION</span><h2>Enter the Arena</h2><p>Create your player before choosing a faction and exploring the world.</p></div><form onSubmit={e=>{e.preventDefault();const n=name.trim();if(!n)return;update({...player,name:n});setCreating(false);}}><label htmlFor="player-name">Player name</label><input id="player-name" value={name} onChange={e=>setName(e.target.value)} maxLength={24} autoFocus placeholder="Arena Player"/><button type="submit" disabled={!name.trim()}>Create player</button></form></section></main>;

  return <main className="shell"><header className="header"><div><span className="eyebrow">FREEDOMARENA × RPGQG CARDS</span><h1>Web Arena</h1></div><span className="status">RPGQG progression</span></header>
  <section className="hero"><div><span className="eyebrow">PLAYER</span><h2>{player.name}</h2><p>Level {player.level} · {player.xp} XP · {player.victories} victories · {player.arenaWins} arena wins · {player.fusionMaterials} fusion materials</p></div>{equipped&&<div className="equipped"><span className="eyebrow">EQUIPPED CARD</span><strong>{equipped.name}</strong><span>{equipped.rarity} · Lv {equipped.level}</span>{lastCardXp>0&&<small>+{lastCardXp} card XP on last victory</small>}</div>}</section>
  <section className="panel"><div><span className="eyebrow">WORLD / EXPLORATION</span><h2>{currentZone.name}</h2><p>{currentZone.description}</p><div className="world-layout"><div className="world-map"><WorldCanvas zoneId={player.zoneId} onTileMove={(x,y)=>{const next=moveTile(worldTile,{x,y});setWorldTile(next);setWorldMessage(next.x===x&&next.y===y?`Moved to tile ${x}, ${y}.`:`Blocked path: ${getTile(x,y).kind} tile.`)}} />{zones.map(zone=><button key={zone.id} className={zone.id===player.zoneId?'zone-node active':'zone-node'} disabled={getZoneStatus(player.level,zone,player.zoneId)==='locked'} onClick={()=>moveTo(zone.id)}><strong>{zone.name}</strong><span>Lv {zone.level} · {zone.faction}</span></button>)}</div><div className="zone-info"><p><strong>Tile:</strong> {worldTile.x}, {worldTile.y} · <strong>World:</strong> {worldMessage}</p><p><strong>Faction:</strong> {currentZone.faction} · <strong>Required level:</strong> {currentZone.level}</p><p><strong>Points of interest:</strong> {currentZone.pointsOfInterest.join(' · ')}</p><div className="actions"><button onClick={doExplore}>Explore this zone</button><button onClick={startCombat} disabled={combat?.status==='active'}>Enter combat</button></div>{player.lastDiscovery&&<p><strong>Latest discovery:</strong> {player.lastDiscovery}</p>}</div></div></div></section>
  <section className="panel"><div><span className="eyebrow">ARENA / COMBAT</span><h2>{combat?combat.enemy.name:'No active encounter'}</h2>{!combat&&<p>Start an arena encounter from the current zone.</p>}{combat&&<><p><strong>You:</strong> {combat.player.hp}/{combat.player.maxHp} HP · ATK {combat.player.attack} · DEF {combat.player.defense}</p><p><strong>Enemy:</strong> {combat.enemy.hp}/{combat.enemy.maxHp} HP · ATK {combat.enemy.attack} · DEF {combat.enemy.defense}</p><div className="actions">{combat.status==='active'&&<button onClick={attack} disabled={combat.turn!=='player'}>Attack</button>}{combat.status!=='active'&&<button onClick={()=>setCombat(null)}>Leave encounter</button>}</div><p>{combat.log.slice(-3).join(' · ')}</p>{combat.status==='victory'&&<><p><strong>RPGQG reward:</strong> +{getCombatReward(combat)} XP + 1 card.</p><p><strong>Combat summary:</strong> {getCombatSummary(combat).rounds} rounds · {getCombatSummary(combat).damageDealt} damage dealt · {getCombatSummary(combat).damageTaken} damage taken.</p></>}{combat.status==='defeat'&&<p><strong>Defeat.</strong> No card reward granted.</p>}</>}</div></section>
  <section className="panel"><div><span className="eyebrow">TRAVEL</span><h2>Reachable zones</h2></div><div className="actions">{getReachableZones(player.zoneId).map(zone=><button key={zone.id} disabled={!canEnterZone(player.level,zone)} onClick={()=>moveTo(zone.id)}>{zone.name} · Lv {zone.level}</button>)}</div><p>World zones: {zones.length}</p></section>
  <section className="panel"><div><span className="eyebrow">FACTION</span><h2>Choose your allegiance</h2></div><div className="actions">{factions.map(f=><button className={player.faction===f?'selected':''} key={f} onClick={()=>chooseFaction(f)}>{f}</button>)}</div><p>Current faction: <strong>{player.faction}</strong></p></section>
  <section className="panel"><div><span className="eyebrow">RPGQG CARDS · EQUIPMENT / FUSION</span><h2>Collection</h2></div>{player.cards.length===0?<p>No cards yet. Win an arena fight.</p>:<div className="cards">{player.cards.map(card=><article className={card.id===player.equippedCardId?'card-equipped':''} key={card.id}><strong>{card.name}</strong><span>{card.rarity} · Lv {card.level}</span><div className="card-stats"><span>⚔ Power <b>{card.power}</b></span><span>🛡 Defense <b>{card.defense}</b></span><span>❤ Vitality <b>{card.vitality}</b></span><span>★ XP <b>{card.xp}/100</b></span></div><div className="actions"><button onClick={()=>update(equipCard(player,card.id===player.equippedCardId?null:card.id))}>{card.id===player.equippedCardId?'Unequip':'Equip'}</button>{fusionSourceId===null?<button disabled={!player.cards.some(other=>other.id!==card.id&&other.rarity===card.rarity)} onClick={()=>setFusionSourceId(card.id)}>Fuse</button>:fusionSourceId===card.id?<button onClick={()=>setFusionSourceId(null)}>Cancel fusion</button>:<button disabled={card.rarity==='Legendary'||player.cards.find(other=>other.id===fusionSourceId)?.rarity!==card.rarity||player.fusionMaterials<getCardFusionCost(card.rarity)} onClick={()=>{const next=fuseCards(player,fusionSourceId,card.id);if(next!==player){update(next);setFusionSourceId(null);}}}>Fuse with this ({getCardFusionCost(card.rarity)} materials)</button>}</div></article>)}</div>}</section></main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
