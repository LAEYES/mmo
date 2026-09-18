-- RPGQG Cards: noyau de données autonome pour l'intégration FreedomArena.
-- Aucune dépendance externe : le module peut être chargé par le runtime Lua de Unity.

local RPGQGCards = {}

local RARITY_ORDER = {
    Commun = 1,
    Rare = 2,
    Epique = 3,
    Legendaire = 4
}

local DEFAULT_FUSION_COST = {
    Commun = 10,
    Rare = 25,
    Epique = 60
}

local function assertCard(card)
    assert(type(card) == "table", "card doit être une table")
    assert(type(card.id) == "string" and card.id ~= "", "card.id requis")
    assert(type(card.name) == "string" and card.name ~= "", "card.name requis")
    assert(RARITY_ORDER[card.rarity], "rareté inconnue")
end

function RPGQGCards.newCard(id, name, rarity, stats)
    local card = {
        id = id,
        name = name,
        rarity = rarity or "Commun",
        level = 1,
        xp = 0,
        stats = {
            power = (stats and stats.power) or 1,
            defense = (stats and stats.defense) or 1,
            vitality = (stats and stats.vitality) or 1
        }
    }
    assertCard(card)
    return card
end

function RPGQGCards.fusionCost(rarity)
    return DEFAULT_FUSION_COST[rarity] or math.huge
end

function RPGQGCards.canFuse(a, b)
    if not a or not b then return false, "deux cartes sont requises" end
    if a.id == b.id then return false, "les deux cartes doivent être distinctes" end
    if a.rarity ~= b.rarity then return false, "les cartes doivent avoir la même rareté" end
    if not RARITY_ORDER[a.rarity] or RARITY_ORDER[a.rarity] >= RARITY_ORDER.Legendaire then
        return false, "cette rareté ne peut pas être fusionnée"
    end
    return true
end

function RPGQGCards.fuse(a, b, newId)
    local ok, reason = RPGQGCards.canFuse(a, b)
    assert(ok, reason)

    local nextRarity = nil
    for rarity, order in pairs(RARITY_ORDER) do
        if order == RARITY_ORDER[a.rarity] + 1 then
            nextRarity = rarity
            break
        end
    end
    assert(nextRarity, "rareté supérieure introuvable")

    return {
        id = newId,
        name = a.name .. " + " .. b.name,
        rarity = nextRarity,
        level = math.max(a.level or 1, b.level or 1),
        xp = 0,
        stats = {
            power = math.max(a.stats.power or 0, b.stats.power or 0) + 2,
            defense = math.max(a.stats.defense or 0, b.stats.defense or 0) + 2,
            vitality = math.max(a.stats.vitality or 0, b.stats.vitality or 0) + 2
        },
        fusedFrom = { a.id, b.id }
    }
end

function RPGQGCards.addXp(card, amount)
    assertCard(card)
    assert(type(amount) == "number" and amount >= 0, "amount XP invalide")

    card.xp = (card.xp or 0) + amount
    local threshold = 100 * (card.level or 1)
    while card.xp >= threshold do
        card.xp = card.xp - threshold
        card.level = (card.level or 1) + 1
        card.stats.power = card.stats.power + 1
        card.stats.defense = card.stats.defense + 1
        card.stats.vitality = card.stats.vitality + 1
        threshold = 100 * card.level
    end
    return card
end

function RPGQGCards.collectionValue(collection)
    assert(type(collection) == "table", "collection doit être une table")
    local value = 0
    for _, card in ipairs(collection) do
        assertCard(card)
        value = value + (RARITY_ORDER[card.rarity] * 100) + ((card.level or 1) * 10)
    end
    return value
end

return RPGQGCards
