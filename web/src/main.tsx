import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { factions, grantVictory, loadPlayer, savePlayer, type Faction } from './game';

function App() {
  const [player, setPlayer] = useState(loadPlayer);

  const update = (next: typeof player) => {
    setPlayer(next);
    savePlayer(next);
  };

  const chooseFaction = (faction: Faction) => update({ ...player, faction });
  const victory = () => update(grantVictory(player));

  return (
    <main className="shell">
      <header className="header">
        <div><span className="eyebrow">FREEDOMARENA × RPGQG CARDS</span><h1>Web Arena</h1></div>
        <span className="status">Playable foundation</span>
      </header>

      <section className="hero">
        <div><span className="eyebrow">PLAYER</span><h2>{player.name}</h2><p>Level {player.level} · {player.xp} XP · {player.victories} victories</p></div>
        <button onClick={victory}>Simulate victory</button>
      </section>

      <section className="panel">
        <div><span className="eyebrow">FACTION</span><h2>Choose your allegiance</h2></div>
        <div className="actions">{factions.map((faction) => <button className={player.faction === faction ? 'selected' : ''} key={faction} onClick={() => chooseFaction(faction)}>{faction}</button>)}</div>
        <p>Current faction: <strong>{player.faction}</strong></p>
      </section>

      <section className="panel">
        <div><span className="eyebrow">RPGQG CARDS</span><h2>Collection</h2></div>
        {player.cards.length === 0 ? <p>No cards yet. Win your first arena fight.</p> : <div className="cards">{player.cards.map((card) => <article key={card.id}><strong>{card.name}</strong><span>{card.rarity} · Power {card.power}</span></article>)}</div>}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
