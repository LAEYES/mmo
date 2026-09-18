export type Combatant={id:string;name:string;level:number;maxHp:number;hp:number;attack:number;defense:number};
export type CombatState={player:Combatant;enemy:Combatant;turn:'player'|'enemy';status:'active'|'victory'|'defeat';log:string[]};
export type CombatBonuses={power?:number;defense?:number;vitality?:number};
export function createEncounter(playerLevel:number,zoneLevel:number,bonuses:CombatBonuses={}):CombatState{
 const level=Math.max(1,zoneLevel),power=Math.max(0,bonuses.power??0),defense=Math.max(0,bonuses.defense??0),vitality=Math.max(0,bonuses.vitality??0);
 const player:Combatant={id:'player',name:'Player',level:playerLevel,maxHp:100+playerLevel*10+vitality,hp:100+playerLevel*10+vitality,attack:12+playerLevel*3+power,defense:5+playerLevel*2+defense};
 const enemy:Combatant={id:'enemy',name:level>=3?'Eclipse Warden':level===2?'Nomad Raider':'Frontier Scout',level,maxHp:70+level*15,hp:70+level*15,attack:9+level*3,defense:4+level};
 return {player,enemy,turn:'player',status:'active',log:[`Encounter: ${enemy.name}`]};
}
function damage(attack:number,defense:number):number{return Math.max(1,attack-Math.floor(defense*.6));}
export function playerAttack(state:CombatState):CombatState{
 if(state.status!=='active'||state.turn!=='player')return state;
 const dealt=damage(state.player.attack,state.enemy.defense),enemyHp=Math.max(0,state.enemy.hp-dealt);
 if(enemyHp===0)return {...state,enemy:{...state.enemy,hp:0},status:'victory',log:[...state.log,`You deal ${dealt} damage. Victory!`]};
 return enemyTurn({...state,enemy:{...state.enemy,hp:enemyHp},turn:'enemy',log:[...state.log,`You deal ${dealt} damage.`]});
}
function enemyTurn(state:CombatState):CombatState{
 const dealt=damage(state.enemy.attack,state.player.defense),playerHp=Math.max(0,state.player.hp-dealt);
 if(playerHp===0)return {...state,player:{...state.player,hp:0},status:'defeat',log:[...state.log,`${state.enemy.name} deals ${dealt} damage. Defeat.`]};
 return {...state,player:{...state.player,hp:playerHp},turn:'player',log:[...state.log,`${state.enemy.name} deals ${dealt} damage.`]};
}
export function getCombatReward(state:CombatState):number{return state.status==='victory'?25+state.enemy.level*10:0;}

export function getCombatPerformance(state:CombatState):number { const s=getCombatSummary(state); if(state.status!=='victory') return 0; return Math.max(1,Math.round(getCombatReward(state)+s.damageDealt-s.damageTaken-Math.max(0,s.rounds-3)*2)); }\n\nexport function getCombatSummary(state:CombatState):{rounds:number;damageTaken:number;damageDealt:number} {
 const damageDealt=Math.max(0,state.enemy.maxHp-state.enemy.hp);
 const damageTaken=Math.max(0,state.player.maxHp-state.player.hp);
 const rounds=state.log.filter(entry=>entry.startsWith('You deal ')).length;
 return {rounds,damageTaken,damageDealt};
}
