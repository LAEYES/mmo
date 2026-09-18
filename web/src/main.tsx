import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { canEnterZone, explore, getReachableZones, getZone, zones } from './world';
import { createEncounter, getCombatReward, playerAttack, type CombatState } from './combat';
import { factions, grantVictory, loadPlayer, savePlayer, type Faction } from './game';

function App() {
  const [player, setPlayer] = useState(loadPlayer);
  const [name, setName] = useState(player.name === 'Arena Player' ? '' : player.name);
  const [creating, setCreating] = useState(player.name === 'Arena Player');
  const [combat, setCombat] = useState<CombatState | null>(null);

  const update = (next: typeof player) => { setPlayer(next); savePlayer(next); };
  const chooseFaction = (faction: Faction) => update({ ...player, faction });
  const victory = () => update(grantVictory(player));
  const currentZone = getZone(player.zoneId);
  const moveTo = (zoneId: string) => {
    const zone = getZone(zoneId);
    if (canEnterZone(player.level, zone)) update({ ...player, zoneId: zone.id, lastDiscovery: `Arrived at ${zone.name}` });
  };
  const doExplore = () => update(explore(player));
  const startCombat = () => setCombat(createEncounter(player.level, currentZone.level));
  const attack = () => {
    if (!combat) return;
    const next = playerAttack(combat);
    setCombat(next);
    if (next.status === 'victory') update(grantVictory(player));
  };

  if (creating) return (
    <main className="shell">
      <header className="header"><div><span className="eyebrow">FREEDOMARENA × RPGQG CARDS</span><h1>Web Arena</h1></div><span className="status">Playable foundation</span></header>
      <section className="hero"><div><span className="eyebrow">PLAYER CREATION</span><h2>Enter the Arena</h2><p>Create your player before choosing a faction and exploring the world.</p></div><form onSubmit={(event) => { event.preventDefault(); const trimmed = name.trim(); if (!trimmed) return; update({ ...player, name: trimmed }); setCreating(false); }}><label htmlFor="player-name">Player name</label><input id="player-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={24} autoFocus placeholder="Arena Player" /><button type="submit" disabled={!name.trim()}>Create player</button></form></section>
    </main>
  );

  return (
    <main className="shell">
      <header className="header"><div><span className="eyebrow">FREEDOMARENA × RPGQG CARDS</span><h1>Web Arena</h1></div><span className="status">Combat prototype</span></header>
      <section className="hero"><div><span className="eyebrow">PLAYER</span><h2>{player.name}</h2><p>Level {player.level} · {player.xp} XP · {player.victories} victories · {player.explorationCount} discoveries</p></div><button onClick={victory}>Legacy victory reward</button></section>

      <section className="panel">
        <div><span className="eyebrow">WORLD / EXPLORATION</span><h2>{currentZone.name}</h2><p>{currentZone.description}</p><p><strong>Faction:</strong> {currentZone.faction} · <strong>Required level:</strong> {currentZone.level}</p><p><strong>Points of interest:</strong> {currentZone.pointsOfInterest.join(' · ')}</p>
        <div className="actions"><button onClick={doExplore}>Explore this zone</button><button onClick={startCombat} disabled={combat?.status === 'active'}>Enter combat</button></div>
        {player.lastDiscovery && <p><strong>Latest discovery:</strong> {player.lastDiscovery}</p>}
        </div>
      </section>

      <section className="panel">
        <div><span className="eyebrow">COMBAT</span><h2>{combat ? combat.enemy.name : 'No active encounter'}</h2>
        {!combat && <p>Explore the current zone, then start an encounter.</p>}
        {combat && <><p><strong>You:</strong> {combat.player.hp}/{combat.player.maxHp} HP · ATK {combat.player.attack} · DEF {combat.player.defense}</p><p><strong>Enemy:</strong> {combat.enemy.hp}/{combat.enemy.maxHp} HP · ATK {combat.enemy.attack} · DEF {combat.enemy.defense}</p><div className="actions">{combat.status === 'active' && <button onClick={attack} disabled={combat.turn !== 'player'}>Attack</button>}{combat.status !== 'active' && <button onClick={() => setCombat(null)}>Leave encounter</button>}</div><p>{combat.log.slice(-3).join(' · ')}</p>{combat.status === 'victory' && <p><strong>RPGQG reward:</strong> +{getCombatReward(combat)} XP and 1 card.</p>}</>}
        </div>
      </section>

      <section className="panel"><div><span className="eyebrow">TRAVEL</span><h2>Reachable zones</h2></div><div className="actions">{getReachableZones(player.zoneId).map((zone) => <button key={zone.id} disabled={!canEnterZone(player.level, zone)} onClick={() => moveTo(zone.id)}>{zone.name} · Lv {zone.level}</button>)}</div><p>World zones: {zones.length}</p></section>
      <section className="panel"><div><span className="eyebrow">FACTION</span><h2>Choose your allegiance</h2></div><div className="actions">{factions.map((faction) => <button className={player.faction === faction ? 'selected' : ''} key={faction} onClick={() => chooseFaction(faction)}>{faction}</button>)}</div><p>Current faction: <strong>{player.faction}</strong></p></section>
      <section className="panel"><div><span className="eyebrow">RPGQG CARDS</span><h2>Collection</h2></div>{player.cards.length === 0 ? <p>No cards yet. Win your first arena fight.</p> : <div className="cards">{player.cards.map((card) => <article key={card.id}><strong>{card.name}</strong><span>{card.rarity} · Power {card.power}</span></article>)}</div>}</section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
