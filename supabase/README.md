# FreedomArena — backend Supabase

## Objectif

Le backend Supabase fournit la persistance du `PlayerState` tout en conservant un fallback localStorage.

## Configuration

Dans `web/.env.local` :

```env
VITE_SUPABASE_URL=<project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Ne jamais mettre une service-role key dans Vite.

## Base de données

Appliquer :

`supabase/migrations/20260918180000_freedomarena_players.sql`

La table `public.players` est protégée par RLS et chaque utilisateur ne peut accéder qu'à sa propre ligne.

## Auth

Activer **Anonymous Sign-Ins** dans l'authentification Supabase du projet.

L'application utilise un utilisateur anonyme pour identifier une sauvegarde sans imposer immédiatement une inscription.

## Flux

```
React game state
   ├── localStorage (fallback immédiat)
   └── Supabase players (sync distante)
```

Si Supabase n'est pas configuré ou indisponible, le jeu continue avec localStorage.

## Mise en production

Avant publication :

1. appliquer la migration ;
2. activer Anonymous Auth ;
3. renseigner les deux variables Vite ;
4. tester création/rechargement d'un joueur ;
5. tester les règles RLS avec deux sessions ;
6. seulement ensuite ajouter les tables MMO temps réel et l'économie.

Le projet Supabase doit rester séparé des secrets Stripe et des clés Web3.
