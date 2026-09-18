-- Tests autonomes du bridge RPGQG Cards.
-- Le runner Unity/Lua peut exécuter ce fichier avec le chemin Resources/LuaScripts configuré.

local Cards = require("RPGQGCards")
local Bridge = require("RPGQGCardsBridge")

local function assertEqual(actual, expected, message)
    assert(actual == expected, string.format("%s (attendu=%s, obtenu=%s)", message, tostring(expected), tostring(actual)))
end

local player = { inventory = { cards = {} } }

local commonA = Bridge.createAndAddCard(player, "test-a", "Scout", "Commun", {
    power = 3,
    defense = 2,
    vitality = 4
})
local commonB = Bridge.createAndAddCard(player, "test-b", "Guardian", "Commun", {
    power = 2,
    defense = 4,
    vitality = 3
})

assertEqual(#player.inventory.cards, 2, "les cartes doivent être ajoutées à l'inventaire")
assertEqual(Bridge.collectionValue(player), 220, "la valeur initiale de collection doit être calculée")

local canFuse, reason = Bridge.canFuse(player, 1, 2)
assert(canFuse, reason)

local fused = Bridge.fuse(player, 1, 2, "test-fused")
assertEqual(#player.inventory.cards, 1, "la fusion doit consommer les deux cartes")
assertEqual(fused.rarity, "Rare", "la fusion Commun doit produire une Rare")
assertEqual(fused.stats.power, 5, "la puissance fusionnée doit conserver le meilleur score +2")
assertEqual(fused.stats.defense, 6, "la défense fusionnée doit conserver le meilleur score +2")
assertEqual(fused.stats.vitality, 6, "la vitalité fusionnée doit conserver le meilleur score +2")

local beforeLevel = fused.level
Bridge.addCardXp(player, 1, 100)
assertEqual(fused.level, beforeLevel + 1, "100 XP doivent faire progresser la carte d'un niveau")

local missing = Bridge.canFuse(player, 1, 2)
assertEqual(missing, false, "une seconde carte absente ne doit pas être fusionnable")

print("RPGQGCardsBridgeSpec: OK")
return true
