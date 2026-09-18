local Entitlements = require("StripeEntitlements")
local Flow = require("StripePurchaseFlow")

local function assertEqual(actual, expected, message)
    assert(actual == expected, message or ("expected " .. tostring(expected) .. ", got " .. tostring(actual)))
end

local player = {}
local ok = Flow.begin(player, "freedomarena_starter", "req-1")
assertEqual(ok, true, "begin should create a pending purchase")

local pendingOk = Flow.confirm(player, {
    requestId = "req-1",
    productId = "freedomarena_starter",
    status = "pending",
    transactionId = "tx-1"
}, Entitlements)
assertEqual(pendingOk, false, "pending payment must not grant entitlements")
assert(player.payment.pending["req-1"] ~= nil, "pending request must remain pending")

local paidOk = Flow.confirm(player, {
    requestId = "req-1",
    productId = "freedomarena_starter",
    status = "paid",
    transactionId = "tx-1"
}, Entitlements)
assertEqual(paidOk, true, "verified paid event should grant entitlements")
assertEqual(player.entitlements.credits, 500, "starter credits should be granted")
assert(player.payment.pending["req-1"] == nil, "confirmed request must leave pending state")
assertEqual(player.payment.processed["req-1"], "tx-1", "request should be marked processed")

local duplicateOk = Flow.confirm(player, {
    requestId = "req-1",
    productId = "freedomarena_starter",
    status = "paid",
    transactionId = "tx-1"
}, Entitlements)
assertEqual(duplicateOk, false, "duplicate confirmation must not grant twice")
assertEqual(player.entitlements.credits, 500, "duplicate must not change entitlements")

local mismatchPlayer = {}
Flow.begin(mismatchPlayer, "freedomarena_starter", "req-2")
local mismatchOk = Flow.confirm(mismatchPlayer, {
    requestId = "req-2",
    productId = "rpgqg_card_pack_basic",
    status = "paid",
    transactionId = "tx-2"
}, Entitlements)
assertEqual(mismatchOk, false, "product mismatch must be rejected")

print("StripePurchaseFlowSpec: OK")
return true
