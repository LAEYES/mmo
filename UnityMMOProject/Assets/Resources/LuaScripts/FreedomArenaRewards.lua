-- FreedomArenaRewards
-- Adaptateur minimal entre une victoire de gameplay et les récompenses RPGQG Cards.
-- Le module ne dépend d'aucun backend et ne déclenche aucun paiement.

local Cards = require("RPGQGCards")
local Bridge = require("RPGQGCardsBridge")

local Rewards = {}

local DEFAULT_VICTORY_REWARD = {
    id = "arena-victory",
    name = "Récompense d'arène",
    rarity = "Commun",
    stats = {
        power = 2,
        defense = 2,
        vitality = 2
    }
}

local function rewardDefinition(definition)
    definition = definition or DEFAULT_VICTORY_REWARD
    assert(type(definition.id) == "string" and definition.id ~= "", "reward.id requis")
    assert(type(definition.name) == "string" and definition.name ~= "", "reward.name requis")
    return definition
end

function Rewards.grantCard(player, definition)
    local reward = rewardDefinition(definition)
    local card = Cards.newCard(
        reward.id,
        reward.name,
        reward.rarity,
        reward.stats
    )
    return Bridge.addCard(player, card)
end

function Rewards.grantVictoryCard(player, victoryId, definition)
    assert(type(victoryId) == "string" and victoryId ~= "", "victoryId requis")
    local reward = rewardDefinition(definition)
    local cardId = reward.id .. ":" .. victoryId
    return Rewards.grantCard(player, {
        id = cardId,
        name = reward.name,
        rarity = reward.rarity,
        stats = reward.stats
    })
end

return Rewards
