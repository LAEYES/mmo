-- Tests autonomes des récompenses FreedomArena -> RPGQG Cards.

local Rewards = require("FreedomArenaRewards")

local player = { inventory = { cards = {} } }

local card = Rewards.grantVictoryCard(player, "match-001")
assert(card.id == "arena-victory:match-001", "l'identifiant de victoire doit être intégré à la carte")
assert(card.rarity == "Commun", "la récompense par défaut doit être Commune")
assert(#player.inventory.cards == 1, "une victoire doit ajouter une carte")

local custom = Rewards.grantVictoryCard(player, "match-002", {
    id = "boss-victory",
    name = "Gardien du secteur",
    rarity = "Rare",
    stats = { power = 6, defense = 5, vitality = 7 }
})
assert(custom.id == "boss-victory:match-002", "la carte personnalisée doit conserver la référence de victoire")
assert(custom.rarity == "Rare", "la rareté personnalisée doit être conservée")
assert(custom.stats.power == 6, "les statistiques personnalisées doivent être conservées")
assert(#player.inventory.cards == 2, "chaque victoire doit produire une récompense distincte")

print("FreedomArenaRewardsSpec: OK")
return true
