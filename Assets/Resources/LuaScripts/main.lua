--[[-
    Simulation MMO spatiale (Lua)
    ---------------------------------------------------------------
    Ce script met en scène un court scénario narratif mettant en
    valeur plusieurs systèmes typiques d'un MMORPG galactique :
      * création de personnage et progression
      * récolte de ressources et artisanat
      * combat contre un ennemi gardien
      * activation d'un relais stellaire pour conclure une quête

    Le script peut être exécuté directement par l'intégration Lua de
    Unity afin de présenter un flux de jeu spatial cohérent dans la console.
--]]

math.randomseed(42)

local function printHeader(title)
    print("\n=== " .. title .. " ===")
end

-- -----------------------------------------------------------------------------
--  Gestion du joueur
-- -----------------------------------------------------------------------------
local Player = {}
Player.__index = Player

local ARCHETYPE_PRESETS = {
    Gardien = { health = 160, mana = 40, power = 14, description = "Officier défensif polyvalent" },
    Mage = { health = 120, mana = 80, power = 18, description = "Technomancien à haut rendement" },
    Rodeur = { health = 140, mana = 55, power = 16, description = "Opérateur de drones longue portée" }
}

function Player.new(name, archetype)
    local preset = ARCHETYPE_PRESETS[archetype] or ARCHETYPE_PRESETS["Gardien"]

    local self = setmetatable({
        name = name,
        archetype = archetype,
        description = preset.description,
        level = 1,
        experience = 0,
        stats = {
            maxHealth = preset.health,
            health = preset.health,
            maxMana = preset.mana,
            mana = preset.mana,
            power = preset.power
        },
        location = "Nébuleuse des Voiles",
        inventory = {
            resources = {},
            items = {},
            questItems = {}
        },
        log = {}
    }, Player)

    return self
end

local function formatNumber(number)
    local formatted = tostring(number)
    local k
    while true do
        formatted, k = formatted:gsub("^(%-?%d+)(%d%d%d)", "%1 %2")
        if k == 0 then break end
    end
    return formatted
end

function Player:addLog(message)
    local entry = string.format("[Niveau %d] %s", self.level, message)
    table.insert(self.log, entry)
    print(entry)
end

function Player:experienceThreshold()
    return 100 + (self.level - 1) * 50
end

function Player:gainExperience(amount)
    if amount <= 0 then return end
    self.experience = self.experience + amount
    self:addLog(string.format("Gagne %s XP", formatNumber(amount)))

    while self.experience >= self:experienceThreshold() do
        self.experience = self.experience - self:experienceThreshold()
        self.level = self.level + 1
        self.stats.maxHealth = math.floor(self.stats.maxHealth * 1.12)
        self.stats.health = self.stats.maxHealth
        self.stats.power = self.stats.power + 2
        self.stats.maxMana = math.floor(self.stats.maxMana * 1.1)
        self.stats.mana = self.stats.maxMana
        self:addLog("Monte de niveau ! Santé et mana restaurées.")
    end
end

function Player:addResource(resourceName, amount)
    local current = self.inventory.resources[resourceName] or 0
    self.inventory.resources[resourceName] = current + amount
    self:addLog(string.format("Obtient %d × %s", amount, resourceName))
end

function Player:addItem(itemName)
    local current = self.inventory.items[itemName] or 0
    self.inventory.items[itemName] = current + 1
    self:addLog("Reçoit l'objet : " .. itemName)
end

function Player:addQuestItem(itemName)
    local current = self.inventory.questItems[itemName] or 0
    self.inventory.questItems[itemName] = current + 1
    self:addLog("Objet de quête obtenu : " .. itemName)
end

function Player:restore(restRatio)
    local healthRestored = math.max(1, math.floor(self.stats.maxHealth * restRatio))
    local manaRestored = math.max(1, math.floor(self.stats.maxMana * restRatio))
    self.stats.health = math.min(self.stats.maxHealth, self.stats.health + healthRestored)
    self.stats.mana = math.min(self.stats.maxMana, self.stats.mana + manaRestored)
    self:addLog(string.format("Se repose et récupère %d PV / %d PM", healthRestored, manaRestored))
end

-- -----------------------------------------------------------------------------
--  Monde et activités
-- -----------------------------------------------------------------------------
local World = {}
World.__index = World

local UniverseGenerator = {}
UniverseGenerator.__index = UniverseGenerator

local Starship = {}
Starship.__index = Starship

local MODULE_SLOT_LABELS = {
    propulsion = "Propulsion",
    hull = "Coque",
    utility = "Soute"
}

local function estimateRegionDistance(origin, destination)
    if not origin or not destination or origin == destination then
        return 0
    end

    local hash = 0
    for i = 1, #origin do
        hash = hash + string.byte(origin, i)
    end
    for i = 1, #destination do
        hash = hash + string.byte(destination, i)
    end

    return math.max(2, (hash % 7) + 2)
end

function Starship.new(id, blueprint, spawnRegion)
    local self = setmetatable({
        id = id,
        callSign = blueprint.callSign,
        codename = blueprint.codename,
        class = blueprint.class,
        role = blueprint.role,
        summary = blueprint.summary,
        baseStats = blueprint.baseStats or { speed = 0, cargo = 0, defense = 0 },
        modules = {},
        history = {},
        location = spawnRegion or "Nébuleuse des Voiles"
    }, Starship)

    for slot, module in pairs(blueprint.modules or {}) do
        if module then
            self.modules[slot] = module
        end
    end

    self:updateDerivedStats()
    return self
end

function Starship:updateDerivedStats()
    local stats = {
        speed = self.baseStats.speed or 0,
        cargo = self.baseStats.cargo or 0,
        defense = self.baseStats.defense or 0
    }

    for _, module in pairs(self.modules or {}) do
        stats.speed = stats.speed + (module.speedBonus or 0)
        stats.cargo = stats.cargo + (module.cargoBonus or 0)
        stats.defense = stats.defense + (module.defenseBonus or 0)
    end

    self.stats = stats
end

function Starship:installModule(slot, module)
    if not slot or not module then return end
    self.modules[slot] = module
    table.insert(self.history, { type = "module", slot = slot, name = module.name })
    self:updateDerivedStats()
end

function Starship:moduleSummaries()
    local order = { "propulsion", "hull", "utility" }
    local lines = {}

    for _, slot in ipairs(order) do
        local label = MODULE_SLOT_LABELS[slot] or slot
        local module = self.modules[slot]
        if module then
            local descriptors = {}
            if module.speedBonus and module.speedBonus ~= 0 then
                table.insert(descriptors, string.format("Vitesse +%d", module.speedBonus))
            end
            if module.cargoBonus and module.cargoBonus ~= 0 then
                table.insert(descriptors, string.format("Cargo +%d", module.cargoBonus))
            end
            if module.defenseBonus and module.defenseBonus ~= 0 then
                table.insert(descriptors, string.format("Défense +%d", module.defenseBonus))
            end

            local suffix = ""
            if #descriptors > 0 then
                suffix = " (" .. table.concat(descriptors, ", ") .. ")"
            end

            table.insert(lines, string.format("%s : %s%s", label, module.name, suffix))
            if module.summary and module.summary ~= "" then
                table.insert(lines, "    → " .. module.summary)
            end
        else
            table.insert(lines, string.format("%s : [Module non assigné]", label))
        end
    end

    return lines
end

function Starship:travelTime(distanceUnits)
    if distanceUnits <= 0 then return 0 end
    local speed = math.max(1, self.stats.speed or 1)
    return math.max(1, math.floor((distanceUnits * 10) / speed + 0.5))
end

local function createUniverseGenerator()
    return setmetatable({
        sectorPrefixes = { "Iris", "Zenith", "Helios", "Nyx", "Atlas", "Vesper" },
        sectorSuffixes = { "Spire", "Reach", "Expanse", "Cleft", "Drift", "Crown" },
        romanNumerals = { "I", "II", "III", "IV", "V", "VI", "VII", "VIII" },
        regionDescriptors = {
            "Un anneau orbital saturé de reliques et d'éclairs violets.",
            "Une ceinture d'épaves titanesques illuminée par des vents solaires.",
            "Un corridor d'astéroïdes fractals parcouru d'ondes gravitationnelles.",
            "Une sphère de brume irisée où chantent des balises fantômes.",
            "Un amas de cristaux géants alimentant un océan de données stellaires.",
            "Un désert magnétique balayé par des comètes artificielles."
        },
        resourceCatalog = {
            { name = "Cœur de Pulsar", summary = "Noyau vibrant qui amplifie les propulseurs stellaires.", min = 1, max = 2, xp = 22 },
            { name = "Amas de Flux Radial", summary = "Particules qui fluidifient les matrices énergétiques.", min = 1, max = 3, xp = 18 },
            { name = "Silice Photomorphe", summary = "Matériau adaptatif pour les coques holographiques.", min = 1, max = 2, xp = 20 },
            { name = "Carburant Chimérique", summary = "Essence rare pour les sauts d'urgence.", min = 1, max = 1, xp = 26 },
            { name = "Spore de Néon", summary = "Organisme symbiotique qui répare les drones.", min = 2, max = 3, xp = 16 }
        },
        enemyCatalog = {
            {
                name = "Sentinelle Cryostella",
                summary = "Drone antique qui gèle tout intrus.",
                health = 55,
                power = 13,
                xp = 55,
                drops = {
                    ["Carapace Suprafréquence"] = { chance = 0.45, amount = 1 }
                }
            },
            {
                name = "Avatar Plasma",
                summary = "Nuage énergétique prenant forme hostile.",
                health = 48,
                power = 15,
                xp = 60,
                drops = {
                    ["Condensat Solaire"] = { chance = 0.5, amount = 1 }
                }
            },
            {
                name = "Hydre Magnétrique",
                summary = "Essaim de câbles vivants animés par le champ magnétique.",
                health = 65,
                power = 16,
                xp = 70,
                drops = {
                    ["Bobine Entrelacée"] = { chance = 0.35, amount = 1 }
                }
            }
        },
        sanctuaryNames = {
            "Ancrage de Phase", "Chœur Luminique", "Tour de Concordance", "Prisme Harmonia"
        },
        shipPrefixes = { "VX", "OR", "LY", "AX", "HL", "CR" },
        shipCodenames = { "Aegis", "Solstice", "Vega", "Mirage", "Aurora", "Zenith" },
        shipRoles = {
            "Éclaireur de flux", "Corvette d'escorte", "Frégate de soutien", "Sloop de recherche"
        },
        shipClasses = {
            "Classe Cygnus", "Classe Helion", "Classe Atalante", "Classe Spectra"
        },
        shipSummaries = {
            "Châssis agile conçu pour les manoeuvres rapides dans les brouillards plasma.",
            "Plateforme modulable privilégiée par les cartographes stellaires.",
            "Structure robuste dotée de baies interchangeables.",
            "Prototype expérimental équilibrant défense et cargo." 
        },
        shipModulePools = {
            propulsion = {
                { name = "Moteur Ionique Polaris", speedBonus = 4, summary = "Concentre le flux pour accélérer les dérives." },
                { name = "Voile Solaire Prismique", speedBonus = 3, cargoBonus = 5, summary = "Déploie des voiles semi-rigides amplifiant la poussée." },
                { name = "Propulseur Gravimétrique", speedBonus = 5, summary = "Amplifie les puits gravitationnels pour des bonds rapides." }
            },
            hull = {
                { name = "Carlingue en Nacre Quantique", defenseBonus = 6, summary = "Diffuse les impacts via des facettes holographiques." },
                { name = "Coque Polyphase", defenseBonus = 4, cargoBonus = 8, summary = "Compartimente l'intérieur pour accueillir plus de modules." },
                { name = "Armature Lithoplasma", defenseBonus = 8, summary = "Renforce la structure contre les torsions subspatiales." }
            },
            utility = {
                { name = "Baie de Drones Auroraux", cargoBonus = 10, summary = "Déploie des drones pour récolter en autonomie." },
                { name = "Matrix d'Analyse Lumen", speedBonus = 1, summary = "Optimise les trajectoires grâce à des calculs prédictifs." },
                { name = "Node Médical Æther", defenseBonus = 3, summary = "Renforce les boucliers en recyclant l'énergie résiduelle." }
            }
        },
        moduleSlotLabels = {
            propulsion = "Propulsion",
            hull = "Coque",
            utility = "Soute"
        },
        usedNames = {}
    }, UniverseGenerator)
end

function UniverseGenerator:generateRegion(seed)
    local function pick(list)
        return list[math.random(#list)]
    end

    local attempts = 0
    local name
    repeat
        attempts = attempts + 1
        local prefix = self.sectorPrefixes[((seed + attempts) - 1) % #self.sectorPrefixes + 1]
        local suffix = pick(self.sectorSuffixes)
        local numeral = pick(self.romanNumerals)
        name = string.format("%s %s %s", prefix, suffix, numeral)
    until not self.usedNames[name]

    self.usedNames[name] = true

    local descriptor = pick(self.regionDescriptors)

    local resourceCount = math.random(1, 2)
    local resources = {}
    local selectedResourceNames = {}
    local selectedCount = 0
    while selectedCount < resourceCount do
        local candidate = pick(self.resourceCatalog)
        if not selectedResourceNames[candidate.name] then
            selectedResourceNames[candidate.name] = true
            selectedCount = selectedCount + 1
            resources[candidate.name] = {
                min = candidate.min,
                max = candidate.max,
                xp = candidate.xp,
                summary = candidate.summary
            }
        end
    end

    local enemyCount = math.random(0, 1)
    local enemies = {}
    if enemyCount > 0 then
        local enemy = pick(self.enemyCatalog)
        enemies[enemy.name] = {
            health = enemy.health,
            power = enemy.power,
            xp = enemy.xp,
            drops = enemy.drops,
            summary = enemy.summary
        }
    end

    local sanctuaries = {}
    if math.random() < 0.5 then
        table.insert(sanctuaries, pick(self.sanctuaryNames))
    end

    return name, {
        description = descriptor,
        resources = resources,
        enemies = enemies,
        sanctuaries = sanctuaries
    }
end

function UniverseGenerator:generateSectors(count)
    local sectors = {}
    for i = 1, count do
        local name, region = self:generateRegion(i)
        table.insert(sectors, { name = name, region = region })
    end
    return sectors
end

function UniverseGenerator:randomModule(slot, seedOffset)
    local pool = self.shipModulePools[slot]
    if not pool or #pool == 0 then return nil end

    local index
    if seedOffset then
        index = ((seedOffset - 1) % #pool) + 1
    else
        index = math.random(#pool)
    end

    local template = pool[index]
    local module = {
        slot = slot,
        slotLabel = self.moduleSlotLabels[slot] or slot,
        name = template.name,
        speedBonus = template.speedBonus or 0,
        defenseBonus = template.defenseBonus or 0,
        cargoBonus = template.cargoBonus or 0,
        summary = template.summary
    }

    return module
end

function UniverseGenerator:generateShipBlueprint(seed)
    local baseSeed = seed or math.random(1000)

    local function pick(list, offset)
        local index = baseSeed + (offset or 0)
        return list[((index - 1) % #list) + 1]
    end

    local prefix = pick(self.shipPrefixes, 0)
    local codename = pick(self.shipCodenames, 1)
    local designation = string.format("%s-%02d", prefix, ((baseSeed + 7) % 90) + 10)

    local baseStats = {
        speed = 5 + ((baseSeed + 2) % 4),
        cargo = 40 + ((baseSeed + 4) % 15),
        defense = 28 + ((baseSeed + 6) % 10)
    }

    local blueprint = {
        callSign = designation,
        codename = codename,
        class = pick(self.shipClasses, 2),
        role = pick(self.shipRoles, 3),
        summary = pick(self.shipSummaries, 4),
        baseStats = baseStats,
        modules = {}
    }

    blueprint.modules.propulsion = self:randomModule("propulsion", baseSeed + 5)
    blueprint.modules.hull = self:randomModule("hull", baseSeed + 6)
    blueprint.modules.utility = self:randomModule("utility", baseSeed + 7)

    return blueprint
end

local function createWorld()
    local generator = createUniverseGenerator()
    local world = setmetatable({
        regions = {
            ["Nébuleuse des Voiles"] = {
                description = "Un champ d'astéroïdes luminescents baigné d'échos cristallins.",
                resources = {
                    ["Prisme d'Astéroïde"] = { min = 1, max = 2, xp = 20, summary = "Fragments capables d'alimenter les relais stellaires." },
                    ["Poussière Ionique Lunaire"] = { min = 1, max = 1, xp = 12, summary = "Résidu ionisé utilisé pour l'entrelacement énergétique." }
                },
                enemies = {},
                sanctuaries = {"Relais Stellacristal"}
            },
            ["Station Reliquaire"] = {
                description = "Une station dérivante noyée dans la brume cosmique et les souvenirs numériques.",
                resources = {
                    ["Lichen Quantique"] = { min = 1, max = 2, xp = 16, summary = "Bioluminescence qui stabilise les circuits psioniques." }
                },
                enemies = {
                    ["Spectre du Vide"] = {
                        health = 60,
                        power = 14,
                        xp = 65,
                        drops = {
                            ["Essence Photonique"] = { chance = 1.0, amount = 1 },
                            ["Fragment de Mémoire Astrale"] = { chance = 0.4, amount = 1 }
                        },
                        summary = "Gardien spectral lié au relais oublié."
                    }
                },
                sanctuaries = {}
            }
        },
        generator = generator,
        generatedRegions = {},
        ships = {},
        shipCount = 0
    }, World)

    local generated = generator:generateSectors(3)
    for _, entry in ipairs(generated) do
        world.regions[entry.name] = entry.region
        table.insert(world.generatedRegions, entry.name)
    end

    return world
end

function World:travel(player, regionName)
    local region = self.regions[regionName]
    if not region then
        player:addLog("Tente de voyager vers une région inconnue : " .. regionName)
        return false
    end

    player.location = regionName
    player:addLog("Voyage vers " .. regionName .. " — " .. region.description)
    return true
end

function World:gatherResource(player, resourceName)
    local region = self.regions[player.location]
    if not region then
        player:addLog("Impossible de récolter : région inconnue.")
        return { success = false }
    end

    local resource = region.resources[resourceName]
    if not resource then
        player:addLog("Aucune ressource nommée " .. resourceName .. " ici.")
        return { success = false }
    end

    local amount = math.random(resource.min, resource.max)
    player:addResource(resourceName, amount)
    player:gainExperience(resource.xp)
    return { success = true, amount = amount }
end

function World:generatedRegionNames()
    local names = {}
    for _, regionName in ipairs(self.generatedRegions or {}) do
        table.insert(names, regionName)
    end
    return names
end

function World:autoHarvest(player, regionName, attempts)
    attempts = attempts or 1
    local region = self.regions[regionName]
    if not region then
        return { harvested = false, details = {} }
    end

    if player.location ~= regionName then
        self:travel(player, regionName)
    end

    local resourceNames = {}
    for name in pairs(region.resources or {}) do
        table.insert(resourceNames, name)
    end

    if #resourceNames == 0 then
        return { harvested = false, details = {} }
    end

    local totals = {}
    for i = 1, attempts do
        local resourceName = resourceNames[((i - 1) % #resourceNames) + 1]
        local result = self:gatherResource(player, resourceName)
        if result.success then
            totals[resourceName] = (totals[resourceName] or 0) + result.amount
        end
    end

    local details = {}
    for name, amount in pairs(totals) do
        table.insert(details, string.format("%s ×%d", name, amount))
    end
    table.sort(details)

    return { harvested = next(totals) ~= nil, details = details }
end

function World:resolveShip(shipOrId)
    if type(shipOrId) == "table" then
        if getmetatable(shipOrId) == Starship then
            return shipOrId
        end
        if shipOrId.id and self.ships[shipOrId.id] then
            return self.ships[shipOrId.id]
        end
    elseif type(shipOrId) == "string" then
        return self.ships[shipOrId]
    end
    return nil
end

function World:commissionShip(spawnRegion)
    spawnRegion = spawnRegion or "Nébuleuse des Voiles"
    self.shipCount = (self.shipCount or 0) + 1
    local blueprint = self.generator:generateShipBlueprint(self.shipCount)
    local identifier = string.format("%s-%03d", blueprint.callSign, self.shipCount)
    local ship = Starship.new(identifier, blueprint, spawnRegion)
    if ship.modules.propulsion then
        ship:installModule("propulsion", ship.modules.propulsion)
    end
    if ship.modules.hull then
        ship:installModule("hull", ship.modules.hull)
    end
    if ship.modules.utility then
        ship:installModule("utility", ship.modules.utility)
    end
    self.ships[identifier] = ship
    return ship
end

function World:refitShip(shipOrId, slot)
    local ship = self:resolveShip(shipOrId)
    if not ship then
        return { success = false, reason = "unknown_ship" }
    end

    local module = self.generator:randomModule(slot)
    if not module then
        return { success = false, reason = "unknown_slot" }
    end

    ship:installModule(slot, module)
    return { success = true, module = module, ship = ship }
end

function World:moveShip(shipOrId, destination)
    local ship = self:resolveShip(shipOrId)
    if not ship then
        return { success = false, reason = "unknown_ship" }
    end

    local targetRegion = self.regions[destination]
    if not targetRegion then
        return { success = false, reason = "unknown_region" }
    end

    local origin = ship.location
    local distance = estimateRegionDistance(origin, destination)
    local travelTime = ship:travelTime(distance)

    ship.location = destination

    return {
        success = true,
        origin = origin,
        destination = destination,
        distance = distance,
        travelTime = travelTime,
        shipId = ship.id,
        callSign = ship.callSign,
        speed = ship.stats.speed
    }
end

function World:activateSanctuary(player, sanctuaryName)
    local region = self.regions[player.location]
    if not region then
        player:addLog("Aucun relais stellaire dans une région inconnue.")
        return false
    end

    for _, name in ipairs(region.sanctuaries or {}) do
        if name == sanctuaryName then
            player:addLog("Canalise l'énergie du relais " .. sanctuaryName .. ".")
            return true
        end
    end

    player:addLog("Ce lieu ne contient pas le relais stellaire " .. sanctuaryName .. ".")
    return false
end

-- -----------------------------------------------------------------------------
--  Combat
-- -----------------------------------------------------------------------------
local CombatSystem = {}

function CombatSystem.fight(player, world, enemyName)
    local region = world.regions[player.location]
    if not region then
        player:addLog("Impossible de combattre : région inconnue.")
        return { victory = false, rounds = 0, drops = {} }
    end

    local enemyTemplate = region.enemies[enemyName]
    if not enemyTemplate then
        player:addLog("Aucun ennemi nommé " .. enemyName .. " dans cette zone.")
        return { victory = false, rounds = 0, drops = {} }
    end

    player:addLog("Affronte " .. enemyName .. " — " .. enemyTemplate.summary)

    local enemyHealth = enemyTemplate.health
    local rounds = 0

    while enemyHealth > 0 and player.stats.health > 0 do
        rounds = rounds + 1

        local minPlayerDamage = math.floor(player.stats.power * 0.7)
        local maxPlayerDamage = player.stats.power + player.level * 3
        local damageToEnemy = math.random(minPlayerDamage, maxPlayerDamage)
        enemyHealth = enemyHealth - damageToEnemy
        player:addLog(string.format("Inflige %d dégâts à %s (PV restants : %d)", damageToEnemy, enemyName, math.max(0, enemyHealth)))

        if enemyHealth <= 0 then break end

        local minEnemyDamage = math.floor(enemyTemplate.power * 0.6)
        local maxEnemyDamage = enemyTemplate.power
        local damageToPlayer = math.random(minEnemyDamage, maxEnemyDamage)
        player.stats.health = math.max(0, player.stats.health - damageToPlayer)
        player:addLog(string.format("Subit %d dégâts de %s (PV restants : %d)", damageToPlayer, enemyName, player.stats.health))
    end

    if player.stats.health <= 0 then
        player.stats.health = 1
        player:addLog("Le combat tourne mal, Elyra enclenche une retraite d'urgence !")
        return { victory = false, rounds = rounds, drops = {} }
    end

    player:addLog("Victoire contre " .. enemyName .. " en " .. rounds .. " tours !")
    player:gainExperience(enemyTemplate.xp)

    local drops = {}
    for resourceName, dropData in pairs(enemyTemplate.drops or {}) do
        if math.random() <= dropData.chance then
            local amount = dropData.amount or 1
            drops[resourceName] = amount
            player:addResource(resourceName, amount)
        end
    end

    return { victory = true, rounds = rounds, drops = drops }
end

-- -----------------------------------------------------------------------------
--  Artisanat
-- -----------------------------------------------------------------------------
local Crafting = {}
Crafting.__index = Crafting

local function createCraftingSystem()
    return setmetatable({
        recipes = {
            ["Balise Stellaris"] = {
                requires = {
                    ["Prisme d'Astéroïde"] = 2,
                    ["Essence Photonique"] = 1
                },
                xp = 45,
                description = "Une balise holographique capable d'activer les relais stellaires."
            }
        }
    }, Crafting)
end

function Crafting:craft(player, recipeName)
    local recipe = self.recipes[recipeName]
    if not recipe then
        player:addLog("Recette inconnue : " .. recipeName)
        return false
    end

    for resourceName, requiredAmount in pairs(recipe.requires) do
        local owned = player.inventory.resources[resourceName] or 0
        if owned < requiredAmount then
            player:addLog(string.format("Il manque %d × %s pour l'artisanat.", requiredAmount - owned, resourceName))
            return false
        end
    end

    for resourceName, requiredAmount in pairs(recipe.requires) do
        player.inventory.resources[resourceName] = player.inventory.resources[resourceName] - requiredAmount
    end

    player:addItem(recipeName)
    player:gainExperience(recipe.xp)
    player:addLog("Fabrique " .. recipeName .. ": " .. recipe.description)
    return true
end

-- -----------------------------------------------------------------------------
--  Générateur graphique SF
-- -----------------------------------------------------------------------------
local SpaceVisualGenerator = {}
SpaceVisualGenerator.__index = SpaceVisualGenerator

local function createSpaceVisualGenerator()
    return setmetatable({
        stars = {"*", ".", "+", "o"},
        nebulaNames = {"Orion", "Lyra", "Draco", "Arcturus", "Andromède"},
        vesselPrefixes = {"NX", "SSV", "Aegis", "Nova"}
    }, SpaceVisualGenerator)
end

function SpaceVisualGenerator:starfield(width)
    local buffer = {}
    for i = 1, width do
        buffer[i] = self.stars[math.random(#self.stars)]
    end
    return table.concat(buffer)
end

function SpaceVisualGenerator:frameLines(title, lines)
    local width = #title + 4
    for _, line in ipairs(lines) do
        if #line + 2 > width then
            width = #line + 2
        end
    end

    local border = "+" .. string.rep("-", width) .. "+"
    print(border)
    local titlePadding = width - (#title + 2)
    print("| " .. title .. string.rep(" ", titlePadding) .. "|")
    print(border)

    for _, line in ipairs(lines) do
        local padding = width - (#line + 2)
        print("| " .. line .. string.rep(" ", padding) .. "|")
    end
    print(border)
end

function SpaceVisualGenerator:renderHero(player)
    local callSign = string.format("%s-%03d", self.vesselPrefixes[math.random(#self.vesselPrefixes)], player.level)
    local lines = {
        "Appel : " .. callSign,
        string.format("Classe : %s", player.archetype),
        string.format("Bio : %s", player.description),
        string.format("PV : %d / %d", player.stats.health, player.stats.maxHealth),
        string.format("PM : %d / %d", player.stats.mana, player.stats.maxMana)
    }
    printHeader("Projection holo-personnage")
    print(self:starfield(36))
    self:frameLines("Profil du capitaine", lines)
    print(self:starfield(36))
end

function SpaceVisualGenerator:renderRegion(regionName, region)
    local nebula = self.nebulaNames[math.random(#self.nebulaNames)]
    local resourceLines = {}
    for name, data in pairs(region.resources or {}) do
        table.insert(resourceLines, string.format("%s : %s", name, data.summary))
    end
    table.sort(resourceLines)
    if #resourceLines == 0 then
        resourceLines = {"Aucune ressource détectée"}
    end

    local enemyLines = {}
    for name, data in pairs(region.enemies or {}) do
        table.insert(enemyLines, string.format("%s : %s", name, data.summary))
    end
    table.sort(enemyLines)
    if #enemyLines == 0 then
        enemyLines = {"Menace minimale"}
    end

    local lines = {
        "Secteur : " .. regionName,
        "Nébuleuse : " .. nebula,
        "Description : " .. region.description,
        "-- Ressources --"
    }

    for _, entry in ipairs(resourceLines) do
        table.insert(lines, entry)
    end

    table.insert(lines, "-- Signatures ennemies --")
    for _, entry in ipairs(enemyLines) do
        table.insert(lines, entry)
    end

    printHeader("Balayage du secteur")
    print(self:starfield(40))
    self:frameLines("Analyse sectorielle", lines)
end

function SpaceVisualGenerator:renderStarship(ship)
    local lines = {
        string.format("Indicatif : %s", ship.callSign),
        string.format("Nom de code : %s", ship.codename),
        string.format("Classe : %s", ship.class),
        string.format("Rôle : %s", ship.role),
        string.format("Localisation : %s", ship.location or "Inconnue"),
        string.format("Stats → Vitesse %d | Cargo %d | Défense %d", ship.stats.speed or 0, ship.stats.cargo or 0, ship.stats.defense or 0),
        "-- Modules --"
    }

    for _, entry in ipairs(ship:moduleSummaries()) do
        table.insert(lines, entry)
    end

    printHeader("Hangar orbital")
    self:frameLines("Fiche vaisseau", lines)
    print(self:starfield(36))
end

function SpaceVisualGenerator:renderShipMovement(ship, report)
    local lines = {
        string.format("Vaisseau : %s (%s)", ship.callSign, ship.codename),
        string.format("Origine : %s", report.origin or "Inconnue"),
        string.format("Destination : %s", report.destination or "-"),
        string.format("Distance : %d unités", report.distance or 0),
        string.format("Durée : %d cycles", report.travelTime or 0),
        string.format("Vitesse actuelle : %d", ship.stats.speed or 0),
        report.success and "Trajectoire confirmée" or "Trajectoire annulée"
    }

    printHeader("Relève de navigation")
    self:frameLines("Itinéraire stellaire", lines)
    print(self:starfield(28))
end

function SpaceVisualGenerator:renderEncounter(enemyName, combatResult)
    local status = combatResult.victory and "Statut : Neutralisé" or "Statut : Retraite"
    local lines = {
        "Cible : " .. enemyName,
        string.format("Tours : %d", combatResult.rounds or 0),
        status
    }

    if combatResult.victory then
        local dropLines = {}
        for name, amount in pairs(combatResult.drops or {}) do
            table.insert(dropLines, string.format("Butin : %s ×%d", name, amount))
        end
        table.sort(dropLines)
        if #dropLines == 0 then
            table.insert(dropLines, "Aucun butin relevé")
        end
        for _, entry in ipairs(dropLines) do
            table.insert(lines, entry)
        end
    end

    printHeader("Rapport de combat spatial")
    print(self:starfield(30))
    self:frameLines("Analyse de la menace", lines)
    print(self:starfield(30))
end

function SpaceVisualGenerator:renderCrafting(itemName, success, player)
    local status = success and "Fabrication réussie" or "Fabrication reportée"
    local lines = {
        string.format("Prototype : %s", itemName),
        status,
        string.format("Inventaire ressources : %d entrées", self:countEntries(player.inventory.resources))
    }
    printHeader("Synthèse orbitale")
    self:frameLines("Laboratoire astral", lines)
end

function SpaceVisualGenerator:renderSanctuary(sanctuaryName, activated)
    local lines = {
        "Balise : " .. sanctuaryName,
        activated and "État : Connectée" or "État : Hors ligne",
        activated and "Flux : Rayon quantique stabilisé" or "Flux : En attente d'alignement"
    }
    printHeader("Activation du relais stellaire")
    self:frameLines("Réseau de relais", lines)
    print(self:starfield(34))
end

function SpaceVisualGenerator:renderStarmap(player, quest)
    local lines = {
        string.format("Position : %s", player.location),
        string.format("Niveau : %d", player.level),
        quest.completed and "Mission : Complétée" or string.format("Mission : Étape %d/%d", quest.currentStep, #quest.steps),
        string.format("Log entries : %d", #player.log)
    }
    printHeader("Cartographie finale")
    self:frameLines("Synthèse cosmique", lines)
    print(self:starfield(36))
end

function SpaceVisualGenerator:countEntries(collection)
    local count = 0
    for _ in pairs(collection or {}) do
        count = count + 1
    end
    return count
end

-- -----------------------------------------------------------------------------
--  Quête scénarisée
-- -----------------------------------------------------------------------------
local QuestSystem = {}
QuestSystem.__index = QuestSystem

local function createQuest()
    return setmetatable({
        id = "reactivation_stellacore",
        name = "Réactivation Stellacristal",
        description = "Réallumer le réseau de relais stellaires pour dissiper la brume cosmique.",
        steps = {
            {
                type = "gather",
                resource = "Prisme d'Astéroïde",
                amount = 2,
                summary = "Récolter deux Prismes d'Astéroïde dans la Nébuleuse des Voiles.",
                successMessage = "Les prismes vibrent en phase avec vos gants quantiques."
            },
            {
                type = "defeat",
                enemy = "Spectre du Vide",
                summary = "Terrasser le Spectre du Vide qui garde la Station Reliquaire.",
                successMessage = "Le spectre se dissipe en laissant une Essence Photonique."
            },
            {
                type = "craft",
                item = "Balise Stellaris",
                summary = "Assembler la Balise Stellaris grâce aux ressources réunies.",
                successMessage = "La balise pulse d'une énergie pure."
            },
            {
                type = "activate",
                sanctuary = "Relais Stellacristal",
                summary = "Activer le Relais Stellacristal et rétablir sa lumière.",
                successMessage = "Le relais irradie, dissipant la brume qui enveloppait la nébuleuse."
            }
        },
        rewards = {
            xp = 120,
            items = { "Clé de Saut Stellaire" }
        },
        currentStep = 1,
        completed = false
    }, QuestSystem)
end

function QuestSystem:currentObjective()
    return self.steps[self.currentStep]
end

function QuestSystem:announce(player)
    player:addLog("Quête acceptée : " .. self.name)
    local objective = self:currentObjective()
    if objective then
        player:addLog("Objectif : " .. objective.summary)
    end
end

function QuestSystem:completeCurrentStep(player)
    local step = self:currentObjective()
    if not step then return end

    if step.successMessage then
        player:addLog(step.successMessage)
    end

    self.currentStep = self.currentStep + 1
    if self.currentStep > #self.steps then
        self.completed = true
        player:addLog("Quête terminée : " .. self.name)
        if self.rewards then
            if self.rewards.xp then
                player:gainExperience(self.rewards.xp)
            end
            if self.rewards.items then
                for _, item in ipairs(self.rewards.items) do
                    player:addItem(item)
                end
            end
        end
    else
        local nextStep = self:currentObjective()
        player:addLog("Nouvel objectif : " .. nextStep.summary)
    end
end

function QuestSystem:notify(player, context)
    if self.completed then return end
    local step = self:currentObjective()
    if not step then return end

    if step.type == "gather" and context.type == "gather" then
        if context.resource == step.resource and (context.totalAmount or 0) >= step.amount then
            self:completeCurrentStep(player)
        end
    elseif step.type == "defeat" and context.type == "defeat" then
        if context.enemy == step.enemy and context.victory then
            self:completeCurrentStep(player)
        end
    elseif step.type == "craft" and context.type == "craft" then
        if context.item == step.item and context.success then
            self:completeCurrentStep(player)
        end
    elseif step.type == "activate" and context.type == "activate" then
        if context.sanctuary == step.sanctuary and context.success then
            self:completeCurrentStep(player)
        end
    end
end

-- -----------------------------------------------------------------------------
--  Simulation de scénario
-- -----------------------------------------------------------------------------
local function summarizeInventory(player)
    local function summarizeCategory(category)
        local entries = {}
        for name, amount in pairs(category) do
            table.insert(entries, string.format("%s ×%d", name, amount))
        end
        table.sort(entries)
        return #entries > 0 and table.concat(entries, ", ") or "(vide)"
    end

    printHeader("Inventaire Final")
    print("Ressources : " .. summarizeCategory(player.inventory.resources))
    print("Objets : " .. summarizeCategory(player.inventory.items))
    print("Objets de quête : " .. summarizeCategory(player.inventory.questItems))
end

local function printJournal(player)
    printHeader("Journal du héros")
    for _, entry in ipairs(player.log) do
        print(entry)
    end
end

local function runScenario()
    printHeader("Initialisation du scénario")

    local player = Player.new("Elyra", "Mage")
    print(string.format("Création du personnage : %s (%s) — %s", player.name, player.archetype, player.description))

    local world = createWorld()
    local crafting = createCraftingSystem()
    local quest = createQuest()
    local visuals = createSpaceVisualGenerator()

    quest:announce(player)
    visuals:renderHero(player)

    local generatedSectors = world:generatedRegionNames()
    player:addLog("Le hangar orbital ouvre ses portes pour assembler une escadre modulable.")
    local flagship = world:commissionShip(player.location)
    local escort = world:commissionShip(player.location)
    visuals:renderStarship(flagship)
    visuals:renderStarship(escort)

    local flagshipRefit = world:refitShip(flagship, "utility")
    if flagshipRefit.success then
        player:addLog(string.format("%s reçoit %s pour le créneau %s.", flagship.callSign, flagshipRefit.module.name, flagshipRefit.module.slotLabel or flagshipRefit.module.slot))
        visuals:renderStarship(flagship)
    end

    local escortEngine = world:refitShip(escort, "propulsion")
    if escortEngine.success then
        player:addLog(string.format("%s remplace son propulseur par %s.", escort.callSign, escortEngine.module.name))
        visuals:renderStarship(escort)
    end

    if generatedSectors[1] then
        local reconReport = world:moveShip(escort, generatedSectors[1])
        if reconReport.success then
            player:addLog(string.format("%s part en reconnaissance vers %s (trajet %d cycles).", escort.callSign, reconReport.destination, reconReport.travelTime))
        else
            player:addLog(string.format("%s ne parvient pas à engager la navigation vers le secteur assigné.", escort.callSign))
        end
        visuals:renderShipMovement(escort, reconReport)
    end

    -- Étape 1 : extraire les prismes
    world:travel(player, "Nébuleuse des Voiles")
    visuals:renderRegion("Nébuleuse des Voiles", world.regions["Nébuleuse des Voiles"])
    local totalCrystals = player.inventory.resources["Prisme d'Astéroïde"] or 0
    while totalCrystals < 2 do
        local result = world:gatherResource(player, "Prisme d'Astéroïde")
        if not result.success then break end
        totalCrystals = player.inventory.resources["Prisme d'Astéroïde"] or 0
        quest:notify(player, {
            type = "gather",
            resource = "Prisme d'Astéroïde",
            totalAmount = totalCrystals
        })
    end

    if escort and escort.location ~= "Nébuleuse des Voiles" then
        local recall = world:moveShip(escort, "Nébuleuse des Voiles")
        if recall.success then
            player:addLog(string.format("%s revient se placer en escorte rapprochée.", escort.callSign))
        end
        visuals:renderShipMovement(escort, recall)
    end

    -- Étape 2 : neutraliser la sentinelle spectrale
    world:travel(player, "Station Reliquaire")
    visuals:renderRegion("Station Reliquaire", world.regions["Station Reliquaire"])
    local flagshipJump = world:moveShip(flagship, "Station Reliquaire")
    if flagshipJump.success then
        player:addLog(string.format("%s escorte Elyra jusqu'à la Station Reliquaire.", flagship.callSign))
    end
    visuals:renderShipMovement(flagship, flagshipJump)

    local escortJump = world:moveShip(escort, "Station Reliquaire")
    if escortJump.success then
        player:addLog(string.format("%s verrouille un couloir défensif autour de la station.", escort.callSign))
    end
    visuals:renderShipMovement(escort, escortJump)

    player:restore(0.35)
    local combat = CombatSystem.fight(player, world, "Spectre du Vide")
    quest:notify(player, {
        type = "defeat",
        enemy = "Spectre du Vide",
        victory = combat.victory
    })
    visuals:renderEncounter("Spectre du Vide", combat)

    if combat.drops["Essence Photonique"] then
        quest:notify(player, {
            type = "gather",
            resource = "Essence Photonique",
            totalAmount = player.inventory.resources["Essence Photonique"]
        })
    end

    if not combat.victory then
        player:addLog("Le spectre reste invaincu pour le moment. Le scénario s'arrête ici.")
        summarizeInventory(player)
        printJournal(player)
        return
    end

    -- Étape 3 : assembler la balise
    world:travel(player, "Nébuleuse des Voiles")
    visuals:renderRegion("Nébuleuse des Voiles", world.regions["Nébuleuse des Voiles"])
    local flagshipReturn = world:moveShip(flagship, "Nébuleuse des Voiles")
    visuals:renderShipMovement(flagship, flagshipReturn)
    if flagshipReturn.success and flagshipReturn.travelTime > 0 then
        player:addLog(string.format("%s se repositionne sur le chantier orbital de la nébuleuse.", flagship.callSign))
    end

    local escortSupport = world:moveShip(escort, "Nébuleuse des Voiles")
    visuals:renderShipMovement(escort, escortSupport)
    if escortSupport.success and escortSupport.travelTime > 0 then
        player:addLog(string.format("%s transfère ses relevés au labo d'artisanat.", escort.callSign))
    end

    player:restore(0.25)
    local crafted = crafting:craft(player, "Balise Stellaris")
    quest:notify(player, {
        type = "craft",
        item = "Balise Stellaris",
        success = crafted
    })
    visuals:renderCrafting("Balise Stellaris", crafted, player)

    -- Étape 4 : activer le relais stellaire
    local activated = world:activateSanctuary(player, "Relais Stellacristal")
    quest:notify(player, {
        type = "activate",
        sanctuary = "Relais Stellacristal",
        success = activated
    })
    visuals:renderSanctuary("Relais Stellacristal", activated)

    if quest.completed then
        player:addLog("La nébuleuse retrouve son éclat grâce à Elyra !")
    end

    local escortUtility = world:refitShip(escort, "utility")
    if escortUtility.success then
        player:addLog(string.format("%s installe %s pour soutenir les opérations de sondage.", escort.callSign, escortUtility.module.name))
        visuals:renderStarship(escort)
    end

    if #generatedSectors > 0 then
        printHeader("Protocoles d'auto-cartographie")
        player:addLog("L'IA de bord déploie des sondes pour cartographier les nouveaux secteurs auto-générés.")
        local surveys = math.min(2, #generatedSectors)
        for i = 1, surveys do
            local sectorName = generatedSectors[i]
            local fleetAdvance = world:moveShip(flagship, sectorName)
            if fleetAdvance.success then
                player:addLog(string.format("%s projette un corridor sécurisé vers %s.", flagship.callSign, fleetAdvance.destination))
            end
            visuals:renderShipMovement(flagship, fleetAdvance)

            world:travel(player, sectorName)
            visuals:renderRegion(sectorName, world.regions[sectorName])
            local harvestReport = world:autoHarvest(player, sectorName, 1)
            if harvestReport.harvested and #harvestReport.details > 0 then
                player:addLog("Collecte automatisée : " .. table.concat(harvestReport.details, ", "))
            else
                player:addLog("Collecte automatisée : rien de notable détecté.")
            end
        end
        world:travel(player, "Nébuleuse des Voiles")
        local flagshipDock = world:moveShip(flagship, "Nébuleuse des Voiles")
        visuals:renderShipMovement(flagship, flagshipDock)
        local escortDock = world:moveShip(escort, "Nébuleuse des Voiles")
        visuals:renderShipMovement(escort, escortDock)
    end

    summarizeInventory(player)
    printJournal(player)

    printHeader("Statistiques finales")
    print(string.format("Niveau : %d (XP actuelle : %d / %d)", player.level, player.experience, player:experienceThreshold()))
    print(string.format("Santé : %d / %d", player.stats.health, player.stats.maxHealth))
    print(string.format("Mana : %d / %d", player.stats.mana, player.stats.maxMana))
    visuals:renderStarmap(player, quest)
end

runScenario()
