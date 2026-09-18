-- RPGQG Cards Bridge
-- Intégration progressive du système de cartes avec l'inventaire joueur FreedomArena.
-- Le bridge ne modifie pas le modèle Player existant : il ajoute une couche explicite
-- pour éviter une réécriture risquée du gros script main.lua.

local Cards = require("RPGQGCards")

local Bridge = {}

local function ensureInventory(player)
    assert(type(player) == "table", "player requis")
    player.inventory = player.inventory or {}
    player.inventory.cards = player.inventory.cards or {}
    return player.inventory.cards
end

function Bridge.addCard(player, card)
    local cards = ensureInventory(player)
    assert(type(card) == "table", "card requise")
    table.insert(cards, card)
    if player.addLog then
        player:addLog(string.format("Carte obtenue : %s [%s]", card.name, card.rarity))
    end
    return card
end

function Bridge.createAndAddCard(player, id, name, rarity, stats)
    return Bridge.addCard(player, Cards.newCard(id, name, rarity, stats))
end

function Bridge.collectionValue(player)
    return Cards.collectionValue(ensureInventory(player))
end

function Bridge.canFuse(player, firstIndex, secondIndex)
    local cards = ensureInventory(player)
    return Cards.canFuse(cards[firstIndex], cards[secondIndex])
end

function Bridge.fuse(player, firstIndex, secondIndex, newId)
    local cards = ensureInventory(player)
    assert(firstIndex ~= secondIndex, "les indices doivent être distincts")

    local first = cards[firstIndex]
    local second = cards[secondIndex]
    local fused = Cards.fuse(first, second, newId)

    -- Retrait des composants par index décroissant pour éviter tout décalage.
    if firstIndex < secondIndex then
        table.remove(cards, secondIndex)
        table.remove(cards, firstIndex)
    else
        table.remove(cards, firstIndex)
        table.remove(cards, secondIndex)
    end

    table.insert(cards, fused)
    if player.addLog then
        player:addLog(string.format("Fusion réussie : %s [%s]", fused.name, fused.rarity))
    end
    return fused
end

function Bridge.addCardXp(player, cardIndex, amount)
    local cards = ensureInventory(player)
    local card = cards[cardIndex]
    assert(card, "carte introuvable")
    return Cards.addXp(card, amount)
end

return Bridge
