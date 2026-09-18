-- Test autonome de la couche d'entitlements Stripe.

local Stripe = require("StripeEntitlements")

local function assertEqual(actual, expected, message)
    assert(actual == expected, string.format("%s (attendu=%s, obtenu=%s)", message, tostring(expected), tostring(actual)))
end

local player = { entitlements = {}, log = {} }
local processed = {}

local event = {
    status = "paid",
    transactionId = "test_tx_001",
    productId = "freedomarena_starter"
}

assert(Stripe.isPaid(event), "un evenement paye valide doit etre accepte")
local applied, reason = Stripe.grant(player, event, processed)
assert(applied, reason)
assertEqual(player.entitlements.credits, 500, "le pack starter doit accorder 500 credits")

local duplicate, duplicateReason = Stripe.grant(player, event, processed)
assertEqual(duplicate, false, "une transaction deja appliquee doit etre ignoree")
assertEqual(duplicateReason, "transaction deja appliquee", "la raison d'idempotence doit etre explicite")
assertEqual(player.entitlements.credits, 500, "une transaction dupliquee ne doit pas doubler la recompense")

local invalid = {
    status = "pending",
    transactionId = "test_tx_002",
    productId = "freedomarena_starter"
}
assertEqual(Stripe.isPaid(invalid), false, "un paiement non confirme ne doit pas etre applique")

local unknown = {
    status = "paid",
    transactionId = "test_tx_003",
    productId = "unknown_product"
}
assertEqual(Stripe.isPaid(unknown), false, "un produit inconnu doit etre refuse")

print("StripeEntitlementsSpec: OK")
return true
