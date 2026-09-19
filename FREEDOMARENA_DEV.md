# FreedomArena — Guide de développement

## Architecture actuelle

- Web React + TypeScript + Vite : `web/`
- Logique joueur/cartes/factions : `web/src/game.ts`
- Monde, tuiles, PNJ et événements : `web/src/world.ts`
- Combat : `web/src/combat.ts`
- Interface : `web/src/main.tsx` et `web/src/styles.css`
- Persistance : Supabase via `web/src/lib/supabase.ts`
- Lua/Unity : `Assets/`

## Boucle de jeu

1. Création du joueur
2. Choix de faction
3. Exploration du monde
4. Déplacement par tuiles
5. POI et PNJ
6. Événements territoriaux
7. Scénarios
8. Combat
9. Récompenses et progression
10. Synchronisation Supabase

## Règles de développement

- `world.ts` contient les règles spatiales et événements.
- `combat.ts` contient la résolution des combats.
- `game.ts` contient la progression et les données joueur.
- `main.tsx` orchestre l'interface.
- `styles.css` reste dédié à la présentation.
- `supabase.ts` assure l'adaptation entre état local et persistance.

## Validation CI

Le workflow Web build utilise Node 22 et :

```bash
npm install --no-package-lock
npm run build
```

Le run GitHub Actions #18 sur le commit `43bcbed4aab77b9f2cec54547fda887576b98d32` a été vérifié avec le résultat **success**.

## Prochaine tranche

Enrichir progressivement les interactions PNJ, les événements mondiaux, les combats et la progression des cartes sans casser le socle Web/Lua/Unity existant.
