import { createStarterPlayer, fuseCards, getCardFusionCost, getNextRarity, isValidPlayerState, normalizePlayer, upgradeCard, type Card } from './game';

const assert=(condition:boolean,message:string)=>{if(!condition)throw new Error(message)};
const base=createStarterPlayer('Test');
assert(isValidPlayerState(base),'starter state should be valid');
assert(getNextRarity('Common')==='Rare','common should fuse to rare');
assert(getNextRarity('Legendary')===null,'legendary should be terminal');
assert(getCardFusionCost('Common')===2,'common fusion cost');
const a:Card={id:'a',name:'A',rarity:'Common',power:10,defense:5,vitality:20,xp:50,level:1};
const b:Card={id:'b',name:'B',rarity:'Common',power:14,defense:7,vitality:30,xp:100,level:2};
const state={...base,cards:[a,b],fusionMaterials:2,equippedCardId:'a'};
const fused=fuseCards(state,'a','b');
assert(fused.cards.length===1,'fusion should consume two cards');
assert(fused.cards[0].rarity==='Rare','fusion should upgrade rarity');
assert(fused.fusionMaterials===0,'fusion should consume materials');
assert(fused.equippedCardId===fused.cards[0].id,'equipped card should transfer');
assert(fuseCards(state,'a','b').fusionMaterials===0,'funded fusion should be deterministic');
const blocked=fuseCards({...state,fusionMaterials:1},'a','b');
assert(blocked.cards.length===2,'underfunded fusion should be blocked');
const upgraded=upgradeCard(a,100);
assert(upgraded.level===2&&upgraded.power===13&&upgraded.defense===7&&upgraded.vitality===25,'level-up stats should apply once');
const legacy=normalizePlayer({...base,cards:[{...a,id:'x'},{...a,id:'x'}]});
assert(!isValidPlayerState(legacy),'duplicate card ids should be rejected');
console.log('RPGQG core tests passed');


  it('keeps territorial event point deterministic for the same event id', () => {
    const event = generateWorldEvent(zones[0], 4, 10, 2, 100);
    expect(getWorldEventPoint(event)).toEqual(getWorldEventPoint(event));
  });
  it('clamps territorial event progress to its lifetime', () => {
    const event = generateWorldEvent(zones[0], 4, 10, 2, 100);
    expect(getWorldEventProgress(event, 0)).toBe(0);
    expect(getWorldEventProgress(event, event.duration)).toBe(100);
    expect(getWorldEventProgress(event, event.duration + 99)).toBe(100);
  });
  it('transitions territorial event phases from active to urgent to expiring', () => {
    const event = { ...generateWorldEvent(zones[0], 4, 10, 2, 100), duration: 10 };
    expect(getWorldEventPhase(event, 1)).toBe('active');
    expect(getWorldEventPhase(event, 5)).toBe('urgent');
    expect(getWorldEventPhase(event, 8)).toBe('expiring');
  });