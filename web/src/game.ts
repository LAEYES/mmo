export type Faction = 'Aegis' | 'Nomads' | 'Eclipse';
export type CardRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export type Card = {
  id: string; name: string; rarity: CardRarity;
  power: number; defense: number; vitality: number; xp: number; level: number;
};

export type Quest = { id: string; title: string; description: string; progress: number; target: number; completed: boolean; rewardClaimed: boolean; };

export type PlayerState = {
  name: string; level: number; xp: number; faction: Faction; victories: number; cards: Card[];
  zoneId: string; explorationCount: number; lastDiscovery: string; arenaWins: number; equippedCardId: string | null; fusionMaterials: number; quests: Quest[]; worldThreat: number; worldResources: number;
};

export const factions: Faction[] = ['Aegis', 'Nomads', 'Eclipse'];
export function createStarterPlayer(name = 'Arena Player'): PlayerState {
  return { name, level:1, xp:0, faction:'Aegis', victories:0, cards:[], zoneId:'outpost', explorationCount:0, lastDiscovery:'', arenaWins:0, equippedCardId:null,fusionMaterials:0,quests:[{id:'explore-1',title:'Frontier Survey',description:'Explore the frontier and discover 3 locations.',progress:0,target:3,completed:false,rewardClaimed:false}],worldThreat:1,worldResources:0 };
}
function cardStats(wins:number, rarity:CardRarity):Omit<Card,'id'|'name'> {
  const m=rarity==='Legendary'?4:rarity==='Epic'?3:rarity==='Rare'?2:1;
  return {rarity,power:12+wins*2*m,defense:6+wins*m,vitality:30+wins*4*m,xp:0,level:1};
}
export function grantVictory(state:PlayerState):PlayerState {
  const victories=state.victories+1,xp=state.xp+25,level=1+Math.floor(xp/100);
  const rarity:CardRarity=victories%10===0?'Epic':victories%5===0?'Rare':'Common';
  const card:Card={id:`victory-${victories}`,name:`Arena Card #${victories}`,...cardStats(victories,rarity)};
  return {...state,victories,xp,level,cards:[...state.cards,card]};
}
export function updatePoiQuests(state: PlayerState, action: 'explore' | 'loot' | 'encounter'): PlayerState {
  return {
    ...state,
    quests: state.quests.map(quest => {
      if (quest.completed || quest.id !== 'explore-1' || action !== 'explore') return quest;
      const progress = Math.min(quest.target, quest.progress + 1);
      return { ...quest, progress, completed: progress >= quest.target, rewardClaimed: quest.rewardClaimed };
    })
  };
}

export function applyPoiReward(state: PlayerState, action: 'explore' | 'loot' | 'encounter'): PlayerState {
  const xpGain = action === 'explore' ? 15 : action === 'loot' ? 10 : 20;
  const questState = updatePoiQuests(state, action);
  const completedNow = questState.quests.some(q => q.id === 'explore-1' && q.completed && !q.rewardClaimed);
  const materialsGain = action === 'loot' ? 1 : 0;
  const xp = state.xp + xpGain;
  return {
    ...state,
    xp,
    level: 1 + Math.floor(xp / 100),
    explorationCount: action === 'explore' ? state.explorationCount + 1 : state.explorationCount,
    fusionMaterials: state.fusionMaterials + materialsGain + (completedNow ? 3 : 0),
    quests: questState.quests.map(q => q.id === 'explore-1' && completedNow ? { ...q, rewardClaimed: true } : q)
  };
}

export function applyScenarioChoice(state: PlayerState, choiceIndex: number): PlayerState {
  const risk = choiceIndex === 0;
  const xpGain = risk ? 10 : 5;
  const xp = state.xp + xpGain;
  const questId = risk ? 'scenario-1' : 'survival-1';
  const quests = state.quests.map(q => {
    if (q.id !== questId || q.completed) return q;
    const progress = Math.min(q.target, q.progress + 1);
    return { ...q, progress, completed: progress >= q.target };
  });
  return {
    ...state,
    xp,
    level: 1 + Math.floor(xp / 100),
    worldThreat: Math.max(1, state.worldThreat + (risk ? 1 : -1)),
    worldResources: Math.max(0, state.worldResources + (risk ? 1 : 2)),
    quests
  };
}

export function grantArenaReward(state:PlayerState):PlayerState {
  const arenaWins=state.arenaWins+1,xpGain=40+arenaWins*5,xp=state.xp+xpGain,level=1+Math.floor(xp/100);
  const rarity:CardRarity=arenaWins%10===0?'Epic':arenaWins%3===0?'Rare':'Common';
  const card:Card={id:`arena-${arenaWins}`,name:`Arena Reward #${arenaWins}`,...cardStats(arenaWins,rarity)};
  return {...state,arenaWins,victories:state.victories+1,xp,level,cards:[...state.cards,card],fusionMaterials:state.fusionMaterials+1};
}
const CARD_XP_PER_LEVEL = 100;
export function upgradeCard(card:Card,xpGain:number):Card {
  const gain=Math.max(0,Math.floor(xpGain));
  const previousLevel=card.level;
  const xp=Math.max(0,card.xp+gain);
  const level=Math.max(1,1+Math.floor(xp/CARD_XP_PER_LEVEL));
  const levelsGained=Math.max(0,level-previousLevel);
  return {...card,xp,level,
    power:card.power+levelsGained*3,
    defense:card.defense+levelsGained*2,
    vitality:card.vitality+levelsGained*5};
}
export function equipCard(state:PlayerState,cardId:string|null):PlayerState {
  if (cardId === null) return {...state,equippedCardId:null};
  return state.cards.some(card=>card.id===cardId)?{...state,equippedCardId:cardId}:state;
}
export function getEquippedCard(state:PlayerState):Card|null {
  return state.cards.find(card=>card.id===state.equippedCardId) ?? null;
}
const STORAGE_KEY='freedomarena:rpgqg:player:v1';
export function loadPlayer():PlayerState {
  try { const raw=localStorage.getItem(STORAGE_KEY); return raw?normalizePlayer(JSON.parse(raw) as Partial<PlayerState>):createStarterPlayer(); }
  catch { return createStarterPlayer(); }
}
function normalizeCard(input:unknown):Card|null {
  if(!input||typeof input!=='object') return null; const c=input as Partial<Card>;
  if(typeof c.id!=='string'||typeof c.name!=='string') return null;
  const rarity:CardRarity=['Common','Rare','Epic','Legendary'].includes(c.rarity as string)?c.rarity as CardRarity:'Common';
  const n=(v:unknown,d:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.floor(v)):d;
  return {id:c.id,name:c.name,rarity,power:n(c.power,0),defense:n(c.defense,0),vitality:Math.max(1,n(c.vitality,1)),xp:n(c.xp,0),level:Math.max(1,n(c.level,1))};
}
export function normalizePlayer(input:Partial<PlayerState>):PlayerState {
  const s=createStarterPlayer();
  const cards=Array.isArray(input.cards)?input.cards.map(normalizeCard).filter((c):c is Card=>c!==null):[];
  const equipped=typeof input.equippedCardId==='string'&&cards.some(c=>c.id===input.equippedCardId)?input.equippedCardId:null;
  const fusionMaterials=typeof input.fusionMaterials==='number'&&Number.isFinite(input.fusionMaterials)?Math.max(0,Math.floor(input.fusionMaterials)):s.fusionMaterials;
  const quests=Array.isArray(input.quests)?input.quests.filter(q=>q&&typeof q==='object').map(q=>{const quest=q as Quest;const progress=Math.max(0,Math.floor(typeof quest.progress==='number'?quest.progress:0));const target=Math.max(1,Math.floor(typeof quest.target==='number'?quest.target:1));return {id:String(quest.id||''),title:String(quest.title||''),description:String(quest.description||''),progress:Math.min(progress,target),target,completed:Boolean(quest.completed)||progress>=target,rewardClaimed:Boolean(quest.rewardClaimed)};}):s.quests;
  return {...s,...input,name:typeof input.name==='string'&&input.name.trim()?input.name.trim().slice(0,24):s.name,
    level:typeof input.level==='number'&&Number.isFinite(input.level)?Math.max(1,Math.floor(input.level)):s.level,
    xp:typeof input.xp==='number'&&Number.isFinite(input.xp)?Math.max(0,Math.floor(input.xp)):s.xp,
    faction:factions.includes(input.faction as Faction)?input.faction as Faction:s.faction,
    victories:typeof input.victories==='number'&&Number.isFinite(input.victories)?Math.max(0,Math.floor(input.victories)):s.victories,
    cards,zoneId:typeof input.zoneId==='string'?input.zoneId:s.zoneId,
    explorationCount:typeof input.explorationCount==='number'&&Number.isFinite(input.explorationCount)?Math.max(0,Math.floor(input.explorationCount)):s.explorationCount,
    lastDiscovery:typeof input.lastDiscovery==='string'?input.lastDiscovery.slice(0,200):s.lastDiscovery,
    arenaWins:typeof input.arenaWins==='number'&&Number.isFinite(input.arenaWins)?Math.max(0,Math.floor(input.arenaWins)):s.arenaWins,equippedCardId:equipped,fusionMaterials,quests};
}
export function validatePlayerState(state:PlayerState):string[] {
  const errors:string[]=[];
  if(!state.name.trim()) errors.push('player name is empty');
  if(!Number.isInteger(state.level)||state.level<1) errors.push('player level is invalid');
  if(!Number.isInteger(state.xp)||state.xp<0) errors.push('player XP is invalid');
  if(!Number.isInteger(state.fusionMaterials)||state.fusionMaterials<0) errors.push('fusion materials are invalid');
  if(!Number.isInteger(state.worldThreat)||state.worldThreat<1) errors.push('world threat is invalid');
  if(!Number.isInteger(state.worldResources)||state.worldResources<0) errors.push('world resources are invalid');
  const ids=new Set<string>();
  for(const card of state.cards){
    if(ids.has(card.id)) errors.push('duplicate card id: '+card.id);
    ids.add(card.id);
    if(!card.name.trim()) errors.push('card name is empty: '+card.id);
    if(!rarityOrder.includes(card.rarity)) errors.push('invalid card rarity: '+card.id);
    if(!Number.isInteger(card.level)||card.level<1) errors.push('invalid card level: '+card.id);
    if(!Number.isInteger(card.xp)||card.xp<0) errors.push('invalid card XP: '+card.id);
  }
  if(state.equippedCardId!==null&&!ids.has(state.equippedCardId)) errors.push('equipped card is missing');
  return errors;
}
export function isValidPlayerState(state:PlayerState):boolean { return validatePlayerState(state).length===0; }
export function savePlayer(state:PlayerState):void {
  const normalized=normalizePlayer(state);
  if(!isValidPlayerState(normalized)) return;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));
}
export function clearPlayerSave():void { localStorage.removeItem(STORAGE_KEY); }

const rarityOrder: CardRarity[] = ['Common','Rare','Epic','Legendary'];
export function getNextRarity(rarity: CardRarity): CardRarity | null {
  const index = rarityOrder.indexOf(rarity);
  return index >= 0 && index < rarityOrder.length - 1 ? rarityOrder[index + 1] : null;
}
export function fuseCards(state: PlayerState, firstId: string, secondId: string): PlayerState {
  if (firstId === secondId) return state;
  const first = state.cards.find(card => card.id === firstId);
  const second = state.cards.find(card => card.id === secondId);
  if (!first || !second || first.rarity !== second.rarity) return state;
  const rarity = getNextRarity(first.rarity);
  const cost = getCardFusionCost(first.rarity);
  if (!rarity || state.fusionMaterials < cost) return state;
  const fused: Card = {
    id: `fusion-${first.id}-${second.id}`,
    name: `${rarity} Fusion`,
    rarity,
    power: Math.round((first.power + second.power) / 2) + 2,
    defense: Math.round((first.defense + second.defense) / 2) + 1,
    vitality: Math.round((first.vitality + second.vitality) / 2) + 4,
    xp: Math.floor((first.xp + second.xp) / 2),
    level: Math.max(first.level, second.level)
  };
  const consumed = new Set([firstId, secondId]);
  const cards = [...state.cards.filter(card => !consumed.has(card.id)), fused];
  const equippedCardId = consumed.has(state.equippedCardId ?? '') ? fused.id : state.equippedCardId;
  return { ...state, cards, equippedCardId, fusionMaterials: state.fusionMaterials - cost };
}

export function getCardFusionCost(rarity:CardRarity):number {
  return rarity==='Common'?2:rarity==='Rare'?4:rarity==='Epic'?8:Infinity;
}
