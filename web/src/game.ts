export type Faction = 'Aegis' | 'Nomads' | 'Eclipse';
export type CardRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export type Card = { id:string; name:string; rarity:CardRarity; power:number; defense:number; vitality:number; xp:number; level:number; };
export type Quest = { id:string; title:string; description:string; progress:number; target:number; completed:boolean; rewardClaimed:boolean; };
export type WorldFactionState = { faction: Faction; influence: number; reputation: number; };
export type WorldTilePosition = { x: number; y: number };
export type PlayerState = { name:string; level:number; xp:number; faction:Faction; victories:number; cards:Card[]; zoneId:string; explorationCount:number; lastDiscovery:string; arenaWins:number; equippedCardId:string|null; fusionMaterials:number; quests:Quest[]; worldThreat:number; worldResources:number; factionStates:WorldFactionState[]; worldTile: WorldTilePosition; visitedPoiIds:string[]; };
export const factions:Faction[]=['Aegis','Nomads','Eclipse'];
export function createStarterPlayer(name='Arena Player'):PlayerState{return{name,level:1,xp:0,faction:'Aegis',victories:0,cards:[],zoneId:'outpost',explorationCount:0,lastDiscovery:'',arenaWins:0,equippedCardId:null,fusionMaterials:0,quests:[{id:'explore-1',title:'Frontier Survey',description:'Explore the frontier and discover 3 locations.',progress:0,target:3,completed:false,rewardClaimed:false},{id:'scenario-1',title:'Signal Hunter',description:'Choose the risky scenario path 3 times.',progress:0,target:3,completed:false,rewardClaimed:false},{id:'survival-1',title:'Safe Passage',description:'Choose the cautious scenario path 3 times.',progress:0,target:3,completed:false,rewardClaimed:false},{id:'combat-1',title:'Frontier Defender',description:'Win 3 encounters to stabilize the frontier.',progress:0,target:3,completed:false,rewardClaimed:false},{id:'faction-1',title:'Faction Liaison',description:'Interact with 3 local faction NPCs.',progress:0,target:3,completed:false,rewardClaimed:false}],worldThreat:1,worldResources:0,factionStates:factions.map(f=>({faction:f,influence:100,reputation:f==='Aegis'?10:0})),worldTile:{x:0,y:0},visitedPoiIds:[]};}
function cardStats(wins:number,rarity:CardRarity):Omit<Card,'id'|'name'>{const m=rarity==='Legendary'?4:rarity==='Epic'?3:rarity==='Rare'?2:1;return{rarity,power:12+wins*2*m,defense:6+wins*m,vitality:30+wins*4*m,xp:0,level:1};}
export function grantVictory(state:PlayerState):PlayerState{const victories=state.victories+1,xp=state.xp+25,level=1+Math.floor(xp/100),rarity:CardRarity=victories%10===0?'Epic':victories%5===0?'Rare':'Common',card:Card={id:`victory-${victories}`,name:`Arena Card #${victories}`,...cardStats(victories,rarity)};return{...state,victories,xp,level,cards:[...state.cards,card]};}
export function explore(state:PlayerState):PlayerState{const index=state.explorationCount;const zoneId=state.zoneId;const discovery=`${zoneId}:explore:${index}`;if(state.visitedPoiIds.includes(discovery))return state;const xp=state.xp+20;const explorationCount=index+1;const quests=state.quests.map(q=>q.id==='explore-1'&&!q.completed?{...q,progress:Math.min(q.target,q.progress+1),completed:Math.min(q.target,q.progress+1)>=q.target}:q);return{...state,xp,level:1+Math.floor(xp/100),explorationCount,lastDiscovery:`Explored ${zoneId}`,visitedPoiIds:[...state.visitedPoiIds,discovery],quests};}
export function updatePoiQuests(state:PlayerState,action:'explore'|'loot'|'encounter'):PlayerState{return{...state,quests:state.quests.map(q=>{if(q.completed||q.id!=='explore-1'||action!=='explore')return q;const progress=Math.min(q.target,q.progress+1);return{...q,progress,completed:progress>=q.target};})};}
export function applyPoiReward(state:PlayerState,action:'explore'|'loot'|'encounter',modifiers:{resourceYield?:number;encounterChance?:number}={},poiId?:string):PlayerState{if(poiId&&state.visitedPoiIds.includes(poiId))return state;const yieldScale=Math.max(1,Math.floor(modifiers.resourceYield??1)),encounterPressure=Math.max(0,Math.floor((modifiers.encounterChance??15)/20));const xp=state.xp+(action==='explore'?15:action==='loot'?10+yieldScale:20+encounterPressure),questState=updatePoiQuests(state,action),completedNow=questState.quests.some(q=>q.id==='explore-1'&&q.completed&&!q.rewardClaimed);return{...state,xp,level:1+Math.floor(xp/100),explorationCount:action==='explore'?state.explorationCount+1:state.explorationCount,fusionMaterials:state.fusionMaterials+(action==='loot'?yieldScale:0)+(completedNow?3:0),worldThreat:action==='encounter'?state.worldThreat+Math.max(0,encounterPressure-1):state.worldThreat,worldResources:action==='loot'?state.worldResources+yieldScale:state.worldResources,visitedPoiIds:poiId?[...state.visitedPoiIds,poiId]:state.visitedPoiIds,quests:questState.quests.map(q=>q.id==='explore-1'&&completedNow?{...q,rewardClaimed:true}:q)};}
export function applyNpcInteraction(state: PlayerState, faction: Faction, action: 'dialogue' | 'trade' | 'patrol'): PlayerState {
  const xpGain = action === 'dialogue' ? 8 : action === 'trade' ? 12 : 15;
  const resourceGain = action === 'trade' ? 2 : action === 'dialogue' ? 1 : 0;
  const threatDelta = action === 'patrol' ? -1 : action === 'trade' ? 0 : 1;
  const liaisonQuest = state.quests.find(q => q.id === 'faction-1');
  const quests = state.quests.map(q => {
    if (q.id !== 'faction-1' || q.completed) return q;
    const progress = Math.min(q.target, q.progress + 1);
    return { ...q, progress, completed: progress >= q.target };
  });
  const completedLiaison = Boolean(liaisonQuest && !liaisonQuest.completed && quests.some(q => q.id === 'faction-1' && q.completed));
  const questXp = completedLiaison ? 15 : 0;
  const questResources = completedLiaison ? 3 : 0;
  const totalXp = state.xp + xpGain + questXp;
  const factionStates = state.factionStates.map(f => f.faction === faction
    ? { ...f, influence: Math.max(0, Math.min(200, f.influence + (action === 'patrol' ? 3 : 2))), reputation: f.reputation + (action === 'dialogue' ? 2 : 1) }
    : f);
  const eventQuest = action === 'patrol' && !state.quests.some(q => q.id === 'patrol-1')
    ? { id:'patrol-1', title:'Patrol Alert', description:'Respond to a faction patrol escalation.', progress:0, target:1, completed:false, rewardClaimed:false }
    : null;
  const withQuest = eventQuest ? [...quests, eventQuest] : quests;
  return {
    ...state,
    xp: totalXp,
    level: 1 + Math.floor(totalXp / 100),
    worldResources: state.worldResources + resourceGain + questResources,
    worldThreat: Math.max(1, state.worldThreat + threatDelta),
    factionStates,
    quests: withQuest.map(q => q.id === 'faction-1' && completedLiaison ? { ...q, rewardClaimed: true } : q)
  };
}
export function applyWorldEventState(state: PlayerState, effect: 'threat' | 'resources' | 'encounter', intensity: number, eventFaction?: Faction | 'Neutral'): PlayerState {
  const power = Math.max(1, Math.floor(intensity));
  const worldThreat = effect === 'threat' ? state.worldThreat + power : effect === 'resources' ? Math.max(1, state.worldThreat - Math.max(1, Math.floor(power / 2))) : state.worldThreat + 1;
  const worldResources = effect === 'resources' ? state.worldResources + power : effect === 'encounter' ? Math.max(0, state.worldResources + Math.max(0, power - 2)) : state.worldResources;
  const factionStates = eventFaction && eventFaction !== 'Neutral'
    ? state.factionStates.map(f => f.faction === eventFaction
      ? { ...f, influence: Math.max(0, Math.min(200, f.influence + (effect === 'resources' ? power : -power))), reputation: f.reputation + (effect === 'encounter' ? 1 : 0) }
      : f)
    : state.factionStates;
  return { ...state, worldThreat, worldResources, factionStates };
}

export function applyScenarioChoice(state:PlayerState,choiceIndex:number):PlayerState{
  const risk=choiceIndex===0;
  const xpGain=risk?10:5;
  const questId=risk?'scenario-1':'survival-1';
  const quests=state.quests.map(q=>{
    if(q.id!==questId||q.completed)return q;
    const progress=Math.min(q.target,q.progress+1);
    return {...q,progress,completed:progress>=q.target,rewardClaimed:q.rewardClaimed};
  });
  const completedQuest=quests.find(q=>q.id===questId&&q.completed&&!q.rewardClaimed);
  const reward=completedQuest?3:0;
  const xp=state.xp+xpGain+reward*10;
  const factionStates=state.factionStates.map(f=>{
    const delta=f.faction===state.faction?(risk?5:2):risk?-1:0;
    return {...f,influence:Math.max(0,f.influence+delta),reputation:f.reputation+(f.faction===state.faction?(risk?2:1):0)};
  });
  return {...state,xp,level:1+Math.floor(xp/100),
    worldThreat:Math.max(1,state.worldThreat+(risk?1:-1)),
    worldResources:Math.max(0,state.worldResources+(risk?1:2))+reward,
    factionStates,
    quests:quests.map(q=>q.id===questId&&completedQuest?{...q,rewardClaimed:true}:q)};
}export function applyCombatOutcome(state: PlayerState, victory: boolean, enemyLevel: number): PlayerState {
  if (!victory) return state;
  const xpGain = 20 + Math.max(1, enemyLevel) * 10;
  const xp = state.xp + xpGain;
  const quests = state.quests.map(q => {
    if ((q.id !== 'combat-1' && q.id !== 'patrol-1') || q.completed) return q;
    const progress = Math.min(q.target, q.progress + 1);
    return { ...q, progress, completed: progress >= q.target, rewardClaimed: q.rewardClaimed };
  });
  const completedCombat = quests.find(q => q.id === 'combat-1' && q.completed && !q.rewardClaimed);
  const completedPatrol = quests.find(q => q.id === 'patrol-1' && q.completed && !q.rewardClaimed);
  const questReward = (completedCombat ? 3 : 0) + (completedPatrol ? 2 : 0);
  return {
    ...state,
    xp: xp + (completedPatrol ? 20 : 0),
    level: 1 + Math.floor((xp + (completedPatrol ? 20 : 0)) / 100),
    victories: state.victories + 1,
    worldThreat: Math.max(1, state.worldThreat - 1),
    worldResources: state.worldResources + 1 + questReward,
    quests: quests.map(q =>
      (q.id === 'combat-1' && completedCombat) || (q.id === 'patrol-1' && completedPatrol)
        ? { ...q, rewardClaimed: true }
        : q
    )
  };
}

export function grantArenaReward(state:PlayerState):PlayerState{const arenaWins=state.arenaWins+1,xp=state.xp+40+arenaWins*5,rarity:CardRarity=arenaWins%10===0?'Epic':arenaWins%3===0?'Rare':'Common',card:Card={id:`arena-${arenaWins}`,name:`Arena Reward #${arenaWins}`,...cardStats(arenaWins,rarity)};return{...state,arenaWins,victories:state.victories+1,xp,level:1+Math.floor(xp/100),cards:[...state.cards,card],fusionMaterials:state.fusionMaterials+1};}
const CARD_XP_PER_LEVEL=100;
export function upgradeCard(card:Card,xpGain:number):Card{const gain=Math.max(0,Math.floor(xpGain)),previousLevel=card.level,xp=Math.max(0,card.xp+gain),level=Math.max(1,1+Math.floor(xp/CARD_XP_PER_LEVEL)),levelsGained=Math.max(0,level-previousLevel);return{...card,xp,level,power:card.power+levelsGained*3,defense:card.defense+levelsGained*2,vitality:card.vitality+levelsGained*5};}
export function equipCard(state:PlayerState,cardId:string|null):PlayerState{if(cardId===null)return{...state,equippedCardId:null};return state.cards.some(c=>c.id===cardId)?{...state,equippedCardId:cardId}:state;}
export function getEquippedCard(state:PlayerState):Card|null{return state.cards.find(c=>c.id===state.equippedCardId)??null;}
const STORAGE_KEY='freedomarena:rpgqg:player:v1';
export function loadPlayer():PlayerState{try{const raw=localStorage.getItem(STORAGE_KEY);return raw?normalizePlayer(JSON.parse(raw) as Partial<PlayerState>):createStarterPlayer();}catch{return createStarterPlayer();}}
function normalizeCard(input:unknown):Card|null{if(!input||typeof input!=='object')return null;const c=input as Partial<Card>;if(typeof c.id!=='string'||typeof c.name!=='string')return null;const rarity:CardRarity=['Common','Rare','Epic','Legendary'].includes(c.rarity as string)?c.rarity as CardRarity:'Common';const n=(v:unknown,d:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.floor(v)):d;return{id:c.id,name:c.name,rarity,power:n(c.power,0),defense:n(c.defense,0),vitality:Math.max(1,n(c.vitality,1)),xp:n(c.xp,0),level:Math.max(1,n(c.level,1))};}
export function normalizePlayer(input:Partial<PlayerState>):PlayerState{const s=createStarterPlayer(),cards=Array.isArray(input.cards)?input.cards.map(normalizeCard).filter((c):c is Card=>c!==null):[],equipped=typeof input.equippedCardId==='string'&&cards.some(c=>c.id===input.equippedCardId)?input.equippedCardId:null,fusionMaterials=typeof input.fusionMaterials==='number'&&Number.isFinite(input.fusionMaterials)?Math.max(0,Math.floor(input.fusionMaterials)):s.fusionMaterials,questsInput=Array.isArray(input.quests)?input.quests.filter(q=>q&&typeof q==='object').map(q=>{const quest=q as Quest,progress=Math.max(0,Math.floor(typeof quest.progress==='number'?quest.progress:0)),target=Math.max(1,Math.floor(typeof quest.target==='number'?quest.target:1));return{id:String(quest.id||''),title:String(quest.title||''),description:String(quest.description||''),progress:Math.min(progress,target),target,completed:Boolean(quest.completed)||progress>=target,rewardClaimed:Boolean(quest.rewardClaimed)};}):null;const quests=questsInput?s.quests.map(defaultQuest=>questsInput.find(q=>q.id===defaultQuest.id)??defaultQuest).concat(questsInput.filter(q=>!s.quests.some(defaultQuest=>defaultQuest.id===q.id))):s.quests;return{...s,...input,name:typeof input.name==='string'&&input.name.trim()?input.name.trim().slice(0,24):s.name,level:typeof input.level==='number'&&Number.isFinite(input.level)?Math.max(1,Math.floor(input.level)):s.level,xp:typeof input.xp==='number'&&Number.isFinite(input.xp)?Math.max(0,Math.floor(input.xp)):s.xp,faction:factions.includes(input.faction as Faction)?input.faction as Faction:s.faction,victories:typeof input.victories==='number'&&Number.isFinite(input.victories)?Math.max(0,Math.floor(input.victories)):s.victories,cards,zoneId:typeof input.zoneId==='string'?input.zoneId:s.zoneId,explorationCount:typeof input.explorationCount==='number'&&Number.isFinite(input.explorationCount)?Math.max(0,Math.floor(input.explorationCount)):s.explorationCount,lastDiscovery:typeof input.lastDiscovery==='string'?input.lastDiscovery.slice(0,200):s.lastDiscovery,arenaWins:typeof input.arenaWins==='number'&&Number.isFinite(input.arenaWins)?Math.max(0,Math.floor(input.arenaWins)):s.arenaWins,equippedCardId:equipped,fusionMaterials,quests,worldThreat:typeof input.worldThreat==='number'&&Number.isFinite(input.worldThreat)?Math.max(1,Math.floor(input.worldThreat)):s.worldThreat,worldResources:typeof input.worldResources==='number'&&Number.isFinite(input.worldResources)?Math.max(0,Math.floor(input.worldResources)):s.worldResources,
    worldTile:input.worldTile&&typeof input.worldTile==='object'&&Number.isFinite(input.worldTile.x)&&Number.isFinite(input.worldTile.y)?{x:Math.max(0,Math.min(59,Math.floor(input.worldTile.x))),y:Math.max(0,Math.min(39,Math.floor(input.worldTile.y)))}:s.worldTile,
    visitedPoiIds:Array.isArray(input.visitedPoiIds)?input.visitedPoiIds.filter((id):id is string=>typeof id==='string').slice(-1000):s.visitedPoiIds,
    factionStates:Array.isArray(input.factionStates)?input.factionStates.filter(f=>f&&typeof f==='object').map(f=>{const x=f as WorldFactionState;return{faction:factions.includes(x.faction)?x.faction:'Aegis',influence:typeof x.influence==='number'?Math.max(0,Math.floor(x.influence)):100,reputation:typeof x.reputation==='number'?Math.floor(x.reputation):0};}):s.factionStates};}
export function validatePlayerState(state:PlayerState):string[]{const errors:string[]=[];if(!state.name.trim())errors.push('player name is empty');if(!Number.isInteger(state.level)||state.level<1)errors.push('player level is invalid');if(!Number.isInteger(state.xp)||state.xp<0)errors.push('player XP is invalid');if(!Number.isInteger(state.fusionMaterials)||state.fusionMaterials<0)errors.push('fusion materials are invalid');if(!Number.isInteger(state.worldThreat)||state.worldThreat<1)errors.push('world threat is invalid');if(!Number.isInteger(state.worldResources)||state.worldResources<0)errors.push('world resources are invalid');if(!Number.isInteger(state.worldTile.x)||state.worldTile.x<0||state.worldTile.x>59||!Number.isInteger(state.worldTile.y)||state.worldTile.y<0||state.worldTile.y>39)errors.push('world tile is invalid');if(!Array.isArray(state.visitedPoiIds)||state.visitedPoiIds.some(id=>typeof id!=='string'))errors.push('visited POI state is invalid');const ids=new Set<string>();for(const card of state.cards){if(ids.has(card.id))errors.push('duplicate card id: '+card.id);ids.add(card.id);if(!card.name.trim())errors.push('card name is empty: '+card.id);if(!['Common','Rare','Epic','Legendary'].includes(card.rarity))errors.push('invalid card rarity: '+card.id);if(!Number.isInteger(card.level)||card.level<1)errors.push('invalid card level: '+card.id);if(!Number.isInteger(card.xp)||card.xp<0)errors.push('invalid card XP: '+card.id);}if(state.equippedCardId!==null&&!ids.has(state.equippedCardId))errors.push('equipped card is missing');return errors;}
export function isValidPlayerState(state:PlayerState):boolean{return validatePlayerState(state).length===0;}
export function savePlayer(state:PlayerState):void{const normalized=normalizePlayer(state);if(!isValidPlayerState(normalized))return;localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));}
export function clearPlayerSave():void{localStorage.removeItem(STORAGE_KEY);}
const rarityOrder:CardRarity[]=['Common','Rare','Epic','Legendary'];
export function getNextRarity(rarity:CardRarity):CardRarity|null{const index=rarityOrder.indexOf(rarity);return index>=0&&index<rarityOrder.length-1?rarityOrder[index+1]:null;}
export function fuseCards(state:PlayerState,firstId:string,secondId:string):PlayerState{if(firstId===secondId)return state;const first=state.cards.find(c=>c.id===firstId),second=state.cards.find(c=>c.id===secondId);if(!first||!second||first.rarity!==second.rarity)return state;const rarity=getNextRarity(first.rarity),cost=getCardFusionCost(first.rarity);if(!rarity||state.fusionMaterials<cost)return state;const fused:Card={id:`fusion-${first.id}-${second.id}`,name:`${rarity} Fusion`,rarity,power:Math.round((first.power+second.power)/2)+2,defense:Math.round((first.defense+second.defense)/2)+1,vitality:Math.round((first.vitality+second.vitality)/2)+4,xp:Math.floor((first.xp+second.xp)/2),level:Math.max(first.level,second.level)},consumed=new Set([firstId,secondId]),cards=[...state.cards.filter(c=>!consumed.has(c.id)),fused];return{...state,cards,equippedCardId:consumed.has(state.equippedCardId??'')?fused.id:state.equippedCardId,fusionMaterials:state.fusionMaterials-cost};}
export function getCardFusionCost(rarity:CardRarity):number{return rarity==='Common'?2:rarity==='Rare'?4:rarity==='Epic'?8:Infinity;}
