import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="shell">
      <header className="header">
        <div>
          <span className="eyebrow">FREEDOMARENA × RPGQG CARDS</span>
          <h1>Web foundation</h1>
        </div>
        <span className="status">Foundation ready</span>
      </header>

      <section className="grid" aria-label="Game modules">
        <article><h2>FreedomArena</h2><p>World, player, factions, exploration and combat will attach here.</p></article>
        <article><h2>RPGQG Cards</h2><p>Collection, stats, fusion and progression remain isolated as a game module.</p></article>
        <article><h2>Payments</h2><p>Stripe stays behind a server-validated boundary; no secret keys live in the client.</p></article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
