-- StripeEntitlements
-- Couche domaine indépendante du fournisseur pour les achats numériques.
-- IMPORTANT : ce module ne contient aucune clé Stripe et ne doit pas décider
-- lui-même qu'un paiement est réussi. Le statut "paid" doit provenir d'une
-- source de confiance (backend/webhook Stripe) avant d'appeler grant().

local StripeEntitlements = {}

local PRODUCTS = {
    ["freedomarena_starter"] = {
        grants = { credits = 500 }
    },
    ["rpgqg_card_pack_basic"] = {
        grants = { card_packs = 1 }
    }
}

local function copyGrants(grants)
    local result = {}
    for key, value in pairs(grants or {}) do
        result[key] = value
    end
    return result
end

function StripeEntitlements.product(productId)
    local product = PRODUCTS[productId]
    if not product then
        return nil
    end
    return {
        id = productId,
        grants = copyGrants(product.grants)
    }
end

function StripeEntitlements.isPaid(event)
    return type(event) == "table"
        and event.status == "paid"
        and type(event.transactionId) == "string"
        and event.transactionId ~= ""
        and type(event.productId) == "string"
        and PRODUCTS[event.productId] ~= nil
end

function StripeEntitlements.grant(player, event, processedTransactions)
    assert(type(player) == "table", "player requis")
    assert(type(processedTransactions) == "table", "registre des transactions requis")
    assert(StripeEntitlements.isPaid(event), "evenement Stripe non verifie")

    local transactionId = event.transactionId
    if processedTransactions[transactionId] then
        return false, "transaction deja appliquee"
    end

    local product = PRODUCTS[event.productId]
    player.entitlements = player.entitlements or {}

    for key, amount in pairs(product.grants) do
        player.entitlements[key] = (player.entitlements[key] or 0) + amount
    end

    processedTransactions[transactionId] = true
    if player.addLog then
        player:addLog("Achat confirme : " .. event.productId)
    end

    return true, "achat applique"
end

return StripeEntitlements
