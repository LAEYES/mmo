# RPGQG MMO Runtime

Cette couche transforme la scène SpaceOutpost en prototype jouable sans remplacer le moteur Lua existant.

## Boucle actuelle

1. Bootstrap du joueur et de la scène au chargement.
2. Déplacement 3D avec RPGQGPlayerController.
3. Détection des Spectres du Vide.
4. Combat automatique à courte portée.
5. Mort de l'ennemi -> loot + XP.
6. Progression de la quête reactivation-stellacristal.
7. Inventaire runtime.
8. Sauvegarde locale de position/carte par RPGQGMMOBridge.

## Contrôles

- WASD / axes Unity Horizontal + Vertical : déplacement.
- Le joueur tourne dans la direction du mouvement.
- Les ennemis attaquent automatiquement lorsqu'ils entrent dans leur portée.

## Architecture

RPGQG Card -> RPGQGMMOBridge -> Player / Combat / Inventory / Quest -> Unity

Le Lua MMO reste la source de règles/scénario. Cette couche ne recrée pas le générateur de régions existant dans main.lua.

## Prochaine intégration

Le bridge est volontairement découplé du fournisseur Lua. Un adaptateur Lua peut maintenant appeler :

- ApplyCard(cardId)
- OnEnemyDefeated(enemyId)
- OnPrismCollected()
- OnBeaconCrafted()
- OnRelayActivated()

Cela permet de brancher un runtime Lua concret sans modifier les systèmes de gameplay Unity.
