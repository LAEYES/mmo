-- StripePurchaseFlow
-- Adaptateur client pour le cycle d'achat. Il ne contacte pas Stripe et ne
-- considère jamais une demande locale comme un paiement réussi.
-- La confirmation paid doit être fournie par un backend/webhook de confiance.

local StripePurchaseFlow = {}

local function ensureState(player)
    player.payment = player.payment or {
        pending = {},
        processed = {}
    }
    player.payment.pending = player.payment.pending or {}
    player.payment.processed = player.payment.processed or {}
    return player.payment
end

function StripePurchaseFlow.begin(player, productId, requestId)
    assert(type(player) == "table", "player requis")
    assert(type(productId) == "string" and productId ~= "", "productId requis")
    assert(type(requestId) == "string" and requestId ~= "", "requestId requis")

    local state = ensureState(player)
    if state.pending[requestId] or state.processed[requestId] then
        return false, "requete deja connue"
    end

    state.pending[requestId] = {
        productId = productId,
        status = "pending"
    }
    return true, "paiement en attente"
end

function StripePurchaseFlow.confirm(player, event, entitlements)
    assert(type(player) == "table", "player requis")
    assert(type(entitlements) == "table", "StripeEntitlements requis")

    local state = ensureState(player)
    assert(type(event) == "table", "evenement requis")
    assert(type(event.requestId) == "string" and event.requestId ~= "", "requestId requis")

    local pending = state.pending[event.requestId]
    if not pending then
        return false, "requete inconnue"
    end
    if pending.productId ~= event.productId then
        return false, "produit different de la requete"
    end
    if not entitlements.isPaid(event) then
        return false, "paiement non confirme"
    end

    local granted, reason = entitlements.grant(player, event, state.processed)
    if not granted then
        return false, reason
    end

    state.pending[event.requestId] = nil
    state.processed[event.requestId] = event.transactionId
    return true, "paiement confirme"
end

function StripePurchaseFlow.cancel(player, requestId)
    assert(type(player) == "table", "player requis")
    local state = ensureState(player)
    if not state.pending[requestId] then
        return false, "requete inconnue"
    end
    state.pending[requestId] = nil
    return true, "paiement annule"
end

return StripePurchaseFlow
