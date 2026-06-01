# Mission LUU — Console Test Helpers

## Set Luutex
```javascript
GS.players[0].luutex.current = 20;
UI.render(GS);
```

## Set Hand (replace with any card IDs)
```javascript
GS.players[0].hand = ['action_combat_harvest', 'action_colony_triumph', 'action_luu_search', 'action_pack_call', 'action_reawakening'];
UI.render(GS);
```

## Add Single Card to Hand
```javascript
GS.players[0].hand.push('action_core_surge');
UI.render(GS);
```

## Add Card to Discard Pile
```javascript
GS.deck.discardPile.push('luu_rasluu');
UI.render(GS);
```

## Set Active Enemies (replace with any rogue IDs)
```javascript
GS.activeEnemies = [
  { instanceId: 'enemy_1', cardId: 'rogue_kjeluu_t1', class: 'Kjeluu', tier: 1, wavePosition: 1, currentHp: 16, maxHp: 16, damageCounters: 0, sectorBonusActive: false, hitThisRound: false, attackedThisRound: false },
  { instanceId: 'enemy_2', cardId: 'rogue_rasluu_t2', class: 'Rasluu', tier: 2, wavePosition: 2, currentHp: 12, maxHp: 12, damageCounters: 0, sectorBonusActive: false, hitThisRound: false, attackedThisRound: false }
];
UI.render(GS);
```

## Set Single Enemy (low HP — easy to kill for testing)
```javascript
GS.activeEnemies = [
  { instanceId: 'enemy_1', cardId: 'rogue_rasluu_t1', class: 'Rasluu', tier: 1, wavePosition: 1, currentHp: 1, maxHp: 10, damageCounters: 9, sectorBonusActive: false, hitThisRound: false, attackedThisRound: false }
];
UI.render(GS);
```

## Add Luu to Queue
```javascript
GS.players[0].luuQueue.push({
  queuePosition: GS.players[0].luuQueue.length + 1,
  cardId: 'luu_kjeluu',
  class: 'Kjeluu',
  level: 1,
  xp: 0,
  evolved: false,
  currentHp: 20,
  maxHp: 20,
  damageCounters: 0,
  defendStatus: false,
  actedThisTurn: false,
  bisluuBondTarget: null,
  activeEffects: []
});
UI.render(GS);
```

## Set Luu XP (to test level up)
```javascript
GS.players[0].luuQueue[0].xp = 4;
UI.render(GS);
```

## Set Luu HP (to test healing)
```javascript
GS.players[0].luuQueue[0].currentHp = 5;
GS.players[0].luuQueue[0].damageCounters = GS.players[0].luuQueue[0].maxHp - 5;
UI.render(GS);
```

## Set Luu Level 3 (to test evolution)
```javascript
GS.players[0].luuQueue[0].level = 3;
UI.render(GS);
```

## Set Wave Number
```javascript
GS.position.waveNumber = 2;
UI.render(GS);
```

## Set Sector Number
```javascript
GS.position.sectorNumber = 2;
UI.render(GS);
```

## Check Active Effects
```javascript
GS.globalActiveEffects
```

## Check Full Game State
```javascript
GS
```

## Check Deck Size
```javascript
console.log('Draw:', GS.deck.drawPile.length, 'Discard:', GS.deck.discardPile.length);
```

## Check Player Turn State
```javascript
GS.players[0].turnState
```

## Force Next Wave (skip to wave 2)
```javascript
GS.activeEnemies = [];
checkWaveCleared(GS);
UI.render(GS);
```

## Reset All Luu Acted Flags (re-enable actions)
```javascript
GS.players[0].luuQueue.forEach(l => l.actedThisTurn = false);
GS.players[0].turnState.actionTakenThisTurn = false;
startPlayerTurn(GS);
UI.render(GS);
```

## Add Boss to Active Enemies (for boss wave testing)
```javascript
GS.activeEnemies = [
  { instanceId: 'boss_enemy', cardId: 'boss_tjeluu', class: 'Bisluu', tier: 'boss', wavePosition: 1, currentHp: 40, maxHp: 40, damageCounters: 0, sectorBonusActive: false, hitThisRound: false, attackedThisRound: false }
];
UI.render(GS);
```