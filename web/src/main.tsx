import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { canEnterZone, explore, getReachableZones, getZone, zones } from './world';
import { createEncounter, getCombatReward, getCombatSummary, playerAttack, type CombatState } from './combat';
import { equipCard, factions, fuseCards, getCardFusionCost, getEquippedCard, grantArenaReward, loadPlayer, savePlayer, upgradeCard, type Faction } from './game';

function App() {
  const [player, setPlayer] = useState(loadPlayer);
  const [name, setName] = useState(player.name === 'Arena Player' ? '' : player.name);
  const [creating, setCreating] = useState(player.name === 'Arena Player');
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [lastCardXp, setLastCardXp] = useState(0);
  const [fusionSourceId, setFusionSourceId] = useState<string | null>(null);
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
  <section className="panel"><div><span className="eyebrow">WORLD / EXPLORATION</span><h2>{currentZone.name}</h2><p>{currentZone.description}</p><p><strong>Faction:</strong> {currentZone.faction} · <strong>Required level:</strong> {currentZone.level}</p><p><strong>Points of interest:</strong> {currentZone.pointsOfInterest.join(' · ')}</p><div className="actions"><button onClick={doExplore}>Explore this zone</button><button onClick={startCombat} disabled={combat?.status==='active'}>Enter combat</button></div>{player.lastDiscovery&&<p><strong>Latest discovery:</strong> {player.lastDiscovery}</p>}</div></section>
  <section className="panel"><div><span className="eyebrow">ARENA / COMBAT</span><h2>{combat?combat.enemy.name:'No active encounter'}</h2>{!combat&&<p>Start an arena encounter from the current zone.</p>}{combat&&<><p><strong>You:</strong> {combat.player.hp}/{combat.player.maxHp} HP · ATK {combat.player.attack} · DEF {combat.player.defense}</p><p><strong>Enemy:</strong> {combat.enemy.hp}/{combat.enemy.maxHp} HP · ATK {combat.enemy.attack} · DEF {combat.enemy.defense}</p><div className="actions">{combat.status==='active'&&<button onClick={attack} disabled={combat.turn!=='player'}>Attack</button>}{combat.status!=='active'&&<button onClick={()=>setCombat(null)}>Leave encounter</button>}</div><p>{combat.log.slice(-3).join(' · ')}</p>{combat.status==='victory'&&<><p><strong>RPGQG reward:</strong> +{getCombatReward(combat)} XP + 1 card.</p><p><strong>Combat summary:</strong> {getCombatSummary(combat).rounds} rounds · {getCombatSummary(combat).damageDealt} damage dealt · {getCombatSummary(combat).damageTaken} damage taken.</p></>}{combat.status==='defeat'&&<p><strong>Defeat.</strong> No card reward granted.</p>}</>}</div></section>
  <section className="panel"><div><span className="eyebrow">TRAVEL</span><h2>Reachable zones</h2></div><div className="actions">{getReachableZones(player.zoneId).map(zone=><button key={zone.id} disabled={!canEnterZone(player.level,zone)} onClick={()=>moveTo(zone.id)}>{zone.name} · Lv {zone.level}</button>)}</div><p>World zones: {zones.length}</p></section>
  <section className="panel"><div><span className="eyebrow">FACTION</span><h2>Choose your allegiance</h2></div><div className="actions">{factions.map(f=><button className={player.faction===f?'selected':''} key={f} onClick={()=>chooseFaction(f)}>{f}</button>)}</div><p>Current faction: <strong>{player.faction}</strong></p></section>
  <section className="panel"><div><span className="eyebrow">RPGQG CARDS · EQUIPMENT / FUSION</span><h2>Collection</h2></div>{player.cards.length===0?<p>No cards yet. Win an arena fight.</p>:<div className="cards">{player.cards.map(card=><article className={card.id===player.equippedCardId?'card-equipped':''} key={card.id}><strong>{card.name}</strong><span>{card.rarity} · Lv {card.level}</span><div className="card-stats"><span>⚔ Power <b>{card.power}</b></span><span>🛡 Defense <b>{card.defense}</b></span><span>❤ Vitality <b>{card.vitality}</b></span><span>★ XP <b>{card.xp}/100</b></span></div><div className="actions"><button onClick={()=>update(equipCard(player,card.id===player.equippedCardId?null:card.id))}>{card.id===player.equippedCardId?'Unequip':'Equip'}</button>{fusionSourceId===null?<button disabled={!player.cards.some(other=>other.id!==card.id&&other.rarity===card.rarity)} onClick={()=>setFusionSourceId(card.id)}>Fuse</button>:fusionSourceId===card.id?<button onClick={()=>setFusionSourceId(null)}>Cancel fusion</button>:<button disabled={card.rarity==='Legendary'||player.cards.find(other=>other.id===fusionSourceId)?.rarity!==card.rarity||player.fusionMaterials<getCardFusionCost(card.rarity)} onClick={()=>{const next=fuseCards(player,fusionSourceId,card.id);if(next!==player){update(next);setFusionSourceId(null);}}}>Fuse with this ({getCardFusionCost(card.rarity)} materials)</button>}</div></article>)}</div>}</section></main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
