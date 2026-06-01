# LUU — Rules Engine Map
_Stage 3 — Data Architecture. Living document. Updated as functions are refined._
_For use with Claude Code in Stage 4. Each function description is a precise specification for implementation._

---

## Core Engine Principles

These principles apply everywhere in the rules engine. Read these before implementing any function.

**1. Always read game state fresh.**
No function caches or snapshots game state at round start. Every function reads the current game state at the moment it runs. This ensures mid-turn changes (new Luu played, effect triggered, Luu knocked out) are immediately reflected for all subsequent functions that round.

**2. Effects are checked dynamically, not pre-computed.**
Passive and trait effects (Bisluu adjacency, Kjeluu Impervious, Predatory Strike conditions) are evaluated at the exact moment each function needs them — not once at round start. This means:
- A Bisluu played from hand mid-turn immediately provides its adjacency bonus to the next Luu that acts
- A Kjeluu evolved mid-turn immediately uses Fortress Form values for any subsequent damage calculations
- hitThisRound on an enemy is checked at the moment Rasluu attacks, not pre-loaded

**3. Luu played from hand are live immediately and act this round.**
Traits, passives, and adjacency effects apply immediately when a Luu card is played from hand. A newly placed Luu acts in the same round it is played — it takes its turn after all previously queued Luu have acted. The action phase is not "act N times" but "act until all Luu with actedThisTurn = false have acted." Playing a Luu mid-turn simply extends the queue. Set actedThisTurn = false on entry so endLuuTurn picks it up naturally.

**4. consumesAction = false cards do not block further actions.**
Cards with consumesAction = false (Formation Override, Passive Harvest, Override, Tactical Shift) are resolved immediately when played but do not set actionTakenThisTurn = true. The active Luu can still choose an action after these cards are played.

**5. The queue position is the source of truth for adjacency.**
Adjacency is always calculated from current queuePosition values. Any function that moves Luu (resolveMove, Formation Override) must update queuePosition values before any subsequent adjacency checks run.

**6. Damage is always applied through applyDamageToEnemy or applyDamageToLuu.**
Never modify HP directly. Always route through the appropriate apply function so that Impervious, Hardened Shell, Defend, and other damage modifiers are consistently applied and logged.

**7. Dice rolls are triggered by the player via a dice button.**
When a dice roll is required, the app displays a clickable dice button showing the appropriate die type (d4, d6, d8). The player clicks to roll — the app generates a random integer using uniform distribution matching physical dice probability (d4: 1-4, d6: 1-6, d8: 1-8). For multi-dice rolls (d4+d6, d4+d8) two separate buttons are shown and results summed. The player initiates every roll — the app never rolls automatically. This preserves the physical game feel while removing manual input. config.playerRollsDice remains as a setting but now means "show dice button" vs "roll automatically in background" rather than "prompt for text input."

---

## How to read this document

Each function entry follows this format:

```
### functionName
Reads:    [game state fields this function looks at]
Writes:   [game state fields this function updates]
Logic:    [plain English description of what it does, step by step]
Triggers: [events or other functions fired when this function completes]
Depends:  [other functions that must exist before this one can run]
Notes:    [edge cases, design decisions, playtesting flags]
```

Functions are grouped by game phase. Build order follows the groups — Group 1 before Group 2 etc., and within each group, functions listed in dependency order.

---

## Group 1 — Game Setup

_Runs once at game start. Initialises all game state fields._

---

### initGameState
```
Reads:    config.playerCount, config.useStarterDeck, config.difficultySettings
Writes:   Full game state object — all fields initialised to starting values
Logic:
  1. Set position: sectorNumber=1, waveNumber=1, roundNumber=1,
     phase="setup", currentPlayerIndex=0
  2. Initialise empty arrays: turnLog, clearedBosses, history
  3. Set gameStatus: status="active"
  4. Call initBossPool
  5. Call initStarterPool
  6. IF config.useStarterDeck = true → call loadStarterDeck
     ELSE → call initDraftState (placeholder)
  7. Call drawStartingLuu
  8. Call dealOpeningHand
  9. Set position.phase = "playerTurns"
  10. Append to turnLog: { action: "gameStart", detail: config }
Triggers: initBossPool, initStarterPool, loadStarterDeck OR initDraftState,
          drawStartingLuu, dealOpeningHand
Depends:  None — this is the root function
Notes:    useStarterDeck boolean in config controls whether draft runs.
          All downstream functions assume game state is fully initialised
          before they are called.
```

---

### initBossPool
```
Reads:    Nothing (boss pool is hardcoded)
Writes:   bosses.activeBoss, bosses.bossPool, bosses.pendingBoss,
          bosses.currentChoice, bosses.clearedBosses
Logic:
  1. Set bosses.activeBoss = { cardId: "boss_tjeluu", currentHp: 40,
     maxHp: 40, sectorEncountered: 1, passiveActive: true }
     NOTE: Tjeluu always occupies S1 — hardcoded, never drawn from pool
  2. Create array of remaining 4 boss cardIds:
     ["boss_lynluu", "boss_forluu", "boss_fesluu", "boss_toxluu"]
  3. Shuffle that array randomly
  4. Set bosses.bossPool = shuffled array
  5. Set bosses.pendingBoss = null
  6. Set bosses.currentChoice = null
  7. Set bosses.clearedBosses = []
Triggers: None
Depends:  None
Notes:    Tjeluu is never added to bossPool. S1 always starts with Tjeluu.
          Pool contains exactly 4 bosses at game start.
```

---

### initStarterPool
```
Reads:    Nothing (starter pool cards are fixed)
Writes:   starterPool.cards, starterPool.startingLuuDrawn,
          starterPool.remainingDiscarded
Logic:
  1. Define fixed starter pool:
     ["luu_rasluu", "luu_lagluu", "luu_kjeluu", "luu_gifluu", "luu_bisluu"]
  2. Set starterPool.cards = above array
  3. startingLuuDrawn and remainingDiscarded set later by drawStartingLuu
Triggers: None
Depends:  None
Notes:    One of each base Luu class. Guarantees no duplicate starting classes
          in multiplayer. Set aside before deck building — not in draft pool.
```

---

### loadStarterDeck
```
Reads:    gameState.baseDeck definition
Writes:   deck.drawPile, deck.discardPile, deck.removedCards
Logic:
  1. Read baseDeck.luuCards and baseDeck.actionCards from game state
  2. Build flat array of cardIds respecting copy counts:
     e.g. { cardId: "luu_rasluu", copies: 3 } → add "luu_rasluu" three times
  3. Shuffle the resulting 50-card array
  4. Set deck.drawPile = shuffled array
  5. Set deck.discardPile = []
  6. Set deck.removedCards = []
Triggers: None
Depends:  None
Notes:    Only runs if config.useStarterDeck = true.
          Bypasses all draft logic entirely.
          Total cards in drawPile must equal 50 — validate this.
```

---

### initDraftState
```
Reads:    Nothing
Writes:   draftState (all fields)
Logic:    PLACEHOLDER — not implemented until playtesting phase 2.
          When implemented will handle:
          - Shuffle action card pool (70 cards)
          - Shuffle Luu card pool (20 base + 10 evo = 30 cards),
            excluding the 5 starter pool cards
          - Run 10 draft rounds:
              Each round: deal 7 action + 3 Luu = 10 cards
              Players pick 5 collectively
              Unpicked action cards → permanently removed
              Unpicked base Luu cards → undraftedLuuPool
              Unpicked evo cards → permanently removed
          - After all 10 rounds: shuffle picked 50 cards → deck.drawPile
Triggers: None
Depends:  initStarterPool (starter pool must be set aside first)
Notes:    Set draftState.phase = "complete" and skip when
          config.useStarterDeck = true.
```

---

### drawStartingLuu
```
Reads:    starterPool.cards, config.playerCount
Writes:   starterPool.startingLuuDrawn, starterPool.remainingDiscarded,
          players[n].luuQueue, players[n].luutex.cap, deck.discardPile
Logic:
  1. Randomly select one cardId from starterPool.cards
  2. Set starterPool.startingLuuDrawn = selected cardId
  3. Set starterPool.remainingDiscarded = all other starterPool cards
  4. For each player (solo = just player_1):
     a. Create a new Luu queue entry for their starting Luu:
        {
          queuePosition: 1,
          cardId: startingLuuDrawn,
          class: [look up from card definition],
          level: 1,
          xp: 0,
          evolved: false,
          currentHp: [stats.health[0] from card definition],
          maxHp: [stats.health[0] from card definition],
          damageCounters: 0,
          defendStatus: false,
          actedThisTurn: false,
          bisluuBondTarget: null,
          activeEffects: []
        }
     b. Set players[n].luuQueue = [above entry]
     c. Set players[n].luutex.current = 5 (starting Luutex)
     d. NOTE: No Luutex cap — accumulates freely
  5. Add remaining 4 starter cards to deck.discardPile
  6. Log to turnLog: { action: "startingLuuDrawn", detail: startingLuuDrawn }
Triggers: None
Depends:  initStarterPool
Notes:    Multiplayer: each player draws from the same pool without replacement.
          No two players can have the same starting class.
          Remaining 4 starters go to discard immediately — available from
          turn 1 for Reawakening / Salvage Protocol cards.
          Starting Luutex is always 5 regardless of player count.
```

---

### dealOpeningHand
```
Reads:    deck.drawPile, config.playerCount, config.difficultySettings.soloMulliganEnabled
Writes:   players[n].hand, deck.drawPile, turnLog
Logic:
  1. Determine hand limit based on playerCount:
     1 player = 5 cards, 2 = 4, 3 = 3, 4 = 2
  2. Draw [handLimit] cards from top of deck.drawPile
  3. Set players[0].hand = drawn cards
  4. IF config.playerCount = 1 AND soloMulliganEnabled = true:
     a. Check if hand contains any Luu card (cardType "Luu" or "LuuEvolved")
     b. IF no Luu cards in hand:
        - Return hand cards to deck.drawPile
        - Shuffle deck.drawPile
        - Draw [handLimit] cards again
        - Set players[0].hand = new drawn cards
        - Log: { action: "mulligan", detail: "no Luu in opening hand" }
     c. Keep second hand regardless of contents
  5. Log to turnLog: { action: "openingHandDealt", detail: { cards: hand } }
Triggers: None
Depends:  loadStarterDeck OR initDraftState (deck must exist),
          drawStartingLuu (discard pile must be initialised)
Notes:    This runs at game start AND at the start of each new sector.
          At sector start: draw ONLY if below hand limit. No discard.
          If already at or above hand limit: draw nothing.
          After wave defeats: draw 1 then discard down — handled in endWave.
          During wave: no hand limit enforced.
          Mulligan only available on the very first hand of the game.
          Solo only — multiplayer never mulligans.
          Hand limit table must be accessible to this function.
```

---

### initEnemyDeck
```
Reads:    position.sectorNumber, enemyDeck.tierComposition
Writes:   enemyDeck.sectorPool, enemyDeck.preDealtWaves
Logic:
  1. Look up tier composition for current sector:
     S1: 70% T1, 30% T2
     S2: 30% T1, 50% T2, 20% T3
     S3: 30% T2, 50% T3, 20% T4
     S4: 40% T3, 60% T4
     S5: 20% T3, 80% T4
  2. Calculate number of cards needed:
     wavesPerSector (3) × roguesPerWave (playerCount + 1)
     Solo: 3 waves × 2 Rogues = 6 Rogue cards total
  3. Apply tier percentages to card count:
     e.g. S1 solo: 6 cards → 4 T1 Rogues (70%) + 2 T2 Rogues (30%)
     Round to nearest whole number, adjust to hit exact total
  4. For each tier slot, randomly select a class from the 5 classes
  5. Build sectorPool array of cardIds
  6. Shuffle sectorPool
  7. Deal into preDealtWaves — split into arrays of roguesPerWave:
     e.g. solo S1: [[rogue_a, rogue_b], [rogue_c, rogue_d], [rogue_e, rogue_f]]
  8. Set enemyDeck.sectorPool and enemyDeck.preDealtWaves
Triggers: None
Depends:  initGameState (position must be set)
Notes:    Called once per sector at sector start, not once at game start.
          Boss wave (wave 4) does not use this deck — boss is handled separately.
          Sector bonus (+1 attack) for class-matching Rogues is applied
          in initWave, not here.
```

---

_Group 1 complete. 7 functions defined. Review before proceeding to Group 2 — Turn Structure._

---

## Group 2 — Turn Structure

_Runs every round within a wave. Manages the sequence of player turns followed by enemy attacks._

---

### startRound
```
Reads:    position.roundNumber, position.waveNumber, activeEnemies,
          players[n].luuQueue, globalActiveEffects
Writes:   position.roundNumber, roundTracking, activeEnemies[n].hitThisRound,
          activeEnemies[n].attackedThisRound, players[n].luuQueue[n].actedThisTurn,
          players[n].luuQueue[n].defendStatus, players[n].turnState
Logic:
  1. Increment position.roundNumber by 1
  2. Reset all per-round tracking fields:
     a. roundTracking.damageDealtToEnemiesThisRound = {} (empty object)
     b. roundTracking.luutexGainedThisRound = 0
     c. roundTracking.cardsDrawnThisRound = 0
     d. roundTracking.roguesDefeatedThisRound = []
  3. Reset all enemy flags:
     For each enemy in activeEnemies:
       enemy.hitThisRound = false
       enemy.attackedThisRound = false
  4. Reset all Luu flags:
     For each Luu in players[n].luuQueue:
       luu.actedThisTurn = false
       luu.defendStatus = false
  5. Reset player turn state:
     For each player:
       turnState.cardsPlayedThisTurn = []
       turnState.actionTakenThisTurn = false
       turnState.luutexSpentThisTurn = 0
  6. Fire roundStart triggers:
     Check globalActiveEffects for trigger = "roundStart"
     Call resolveEffect for each matching effect
  7. Log to turnLog: { action: "roundStart", round: roundNumber }
Triggers: resolveEffect (for roundStart effects e.g. Tjeluu Symbiotic Drain)
Depends:  initWave (wave must be active)
Notes:    defendStatus resets here not at end of round — ensures clean
          state at start of each Luu's turn.
          roundStart effects (boss passives) fire before any player acts.
```

---

### startPlayerTurn
```
Reads:    position.currentPlayerIndex, players[n].luuQueue,
          players[n].turnState
Writes:   position.phase, players[n].luuQueue[n].actedThisTurn
Logic:
  1. Set position.phase = "playerTurns"
  2. Find next Luu to act:
     IF turnState.overrideActive = true:
       Player chooses which unacted Luu acts next
     ELSE:
       Find first Luu in queue where actedThisTurn = false
       (queue ordered by position — position 1 first)
  3. Set that Luu as the active Luu for this turn
  4. Call resolveBisluuAdjacencyBonus(activeLuu)
     Apply any Bisluu adjacency bonuses for this turn
  5. Log to turnLog: { action: "luuTurnStart", luu: activeLuu.cardId,
     position: activeLuu.queuePosition }
Triggers: None
Depends:  startRound
Notes:    Luu act in queue order (position 1, then 2, then 3 etc.).
          A player cannot skip a Luu's turn or act out of order
          unless Override card is active.
          If all Luu have actedThisTurn = true, call startEnemyPhase.
```

---

### playCard
```
Reads:    players[n].hand, players[n].luutex.current,
          card definition from luu-cards.json or luu-action-cards.json
Writes:   players[n].hand, players[n].luutex.current,
          players[n].turnState.cardsPlayedThisTurn,
          players[n].turnState.luutexSpentThisTurn,
          players[n].luuQueue (if Luu card),
          globalActiveEffects OR luu.activeEffects (if persistent action card)
Logic:
  1. Validate card can be played:
     a. Card must be in player's hand
     b. player.luutex.current >= card.cost
     c. IF cardType = "Luu" or "LuuEvolved":
        Check queue limit: getLuuQueueLimit(config.playerCount)
        IF players[n].luuQueue.length >= limit: cannot play, return error
     d. IF cardType = "LuuEvolved": call validateEvolution
     e. IF card has condition field: call checkCondition
  2. Deduct cost: player.luutex.current -= card.cost
  3. Remove card from player.hand
  4. Add cardId to turnState.cardsPlayedThisTurn
  5. Add cost to turnState.luutexSpentThisTurn
  6. Resolve card by type:
     a. IF cardType = "Luu": call placeLuu
        NOTE: placeLuu sets actedThisTurn = false on the new Luu entry.
        endLuuTurn will find it and give it a turn this round after
        all previously queued Luu have acted.
     b. IF cardType = "LuuEvolved": call triggerEvolution
     c. IF cardType = "ActionCard":
        - IF timing = "immediate": call resolveEffect for each effect
        - IF timing = "persistent" or "untilTriggered":
            add to luu.activeEffects (if attachedTo = specific Luu)
            OR add to globalActiveEffects (if attachedTo = null)
        - Move card to deck.discardPile (immediate cards only —
          persistent cards stay active until discardCondition met)
  7. Log to turnLog: { action: "cardPlayed", cardId, cost, attachedTo }
Triggers: placeLuu, triggerEvolution, resolveEffect, checkCondition
Depends:  startPlayerTurn
Notes:    Multiple cards can be played before choosing an action.
          Cost 0 cards (evolved Luu, Passive Harvest) still go through
          this function — cost deduction of 0 is valid.
          If deck is empty when a card draw effect fires, call reshuffleDeck.
```

---

### chooseAction
```
Reads:    players[n].turnState.actionTakenThisTurn,
          active Luu (current queue position)
Writes:   players[n].turnState.actionTakenThisTurn
Logic:
  1. Validate: actionTakenThisTurn must be false
  2. Player selects one of four actions: Attack, Defend, Gather, Move
  3. Route to appropriate function:
     Attack → call resolveAttack
     Defend → call resolveDefend
     Gather → call resolveGather
     Move   → call resolveMove
  4. Set turnState.actionTakenThisTurn = true
  5. Log to turnLog: { action: "actionChosen", actionType: chosen }
Triggers: resolveAttack OR resolveDefend OR resolveGather OR resolveMove
Depends:  startPlayerTurn
Notes:    Each Luu gets exactly one action per turn.
          Cards are played before choosing the action — cannot play
          cards after action is taken.
          Exception: cards with consumesAction = false (Formation Override,
          Passive Harvest, Override, Tactical Shift) can be played
          without consuming the action slot. These are resolved in
          playCard and do not route through chooseAction.
```

---

### endLuuTurn
```
Reads:    players[n].luuQueue, turnState
Writes:   active Luu actedThisTurn = true, position.currentPlayerIndex
Logic:
  1. Clean up endOfTurn effects on active Luu:
     Remove from active Luu activeEffects where discardCondition = "endOfTurn"
     (Bisluu adjacency bonuses, any other per-turn effects)
     Move removed cards to deck.discardPile if applicable
  2. Set active Luu actedThisTurn = true
  3. Check if more Luu remain to act this round:
     IF any Luu in queue has actedThisTurn = false:
       call startPlayerTurn (next Luu in queue)
     ELSE:
       all Luu have acted — call startEnemyPhase
  4. Log to turnLog: { action: "luuTurnEnd", luu: activeLuu.cardId }
Triggers: startPlayerTurn OR startEnemyPhase
Depends:  chooseAction (action must be taken before turn ends)
Notes:    Override card allows Luu to act out of queue order this round.
          Even with Override, all Luu must still act before enemy phase.
```

---

### startEnemyPhase
```
Reads:    activeEnemies, position.sectorNumber
Writes:   position.phase
Logic:
  1. Set position.phase = "enemyAttack"
  2. For each enemy in activeEnemies (in wave position order, left to right):
     a. IF enemy.attackedThisRound = false: call resolveEnemyAttack
  3. After all enemies have attacked: call endRound
  4. Log to turnLog: { action: "enemyPhaseStart" }
Triggers: resolveEnemyAttack, endRound
Depends:  endLuuTurn (all player Luu must have acted)
Notes:    Enemies attack in wave position order (position 1 first).
          Dead enemies (currentHp = 0) are skipped.
          Boss uses same phase but calls resolveBossAttack instead.
```

---

### endRound
```
Reads:    activeEnemies, players[n].luuQueue, globalActiveEffects,
          position.roundNumber
Writes:   various (via triggered effects)
Logic:
  1. Fire roundEnd triggers:
     a. Check all luu.activeEffects for trigger = "roundEnd"
        Call resolveEffect for each (e.g. Pack Mending healing)
     b. Check globalActiveEffects for trigger = "roundEnd"
        Call resolveEffect for each
     c. Check all activeEnemies traits for trigger = "roundEnd"
        Call resolveEnemyTrait for each (e.g. Rogue Lagluu Pack Recovery)
     d. Check boss passive for trigger = "roundEnd"
        Call resolveBossPassive if applicable
  2. Clean up round-scoped effects:
     Remove from all luu.activeEffects where discardCondition = "endOfRound"
     Remove from globalActiveEffects where discardCondition = "endOfRound"
     Move removed cards to deck.discardPile
     Reset bossFirstHitThisRound = true (Fesluu flag resets each round)
  3. Check if all enemies defeated:
     IF activeEnemies all have currentHp = 0:
       call endWave
     ELSE:
       call startRound (next round in this wave)
  4. Log to turnLog: { action: "roundEnd", round: roundNumber }
Triggers: resolveEffect, resolveEnemyTrait, resolveBossPassive,
          endWave OR startRound
Depends:  startEnemyPhase
Notes:    Order matters: player effects fire before enemy traits.
          Pack Mending (all Luu heal 1) fires here.
          Rogue Lagluu Pack Recovery fires here.
          Friendly Lagluu Pack Recovery fires here.
```

---

_Group 2 complete. 7 functions defined._
_Review before proceeding to Group 3 — Actions (Attack, Defend, Gather, Move)._

---

## Group 3 — Actions (Attack, Defend, Gather, Move)

_The four actions available to each Luu on their turn. Called by chooseAction._

---

### resolveAttack
```
Reads:    active Luu stats, target enemy stats, position.sectorNumber,
          active Luu activeEffects, globalActiveEffects,
          roundTracking.damageDealtToEnemiesThisRound,
          bosses.activeBoss (if wave 4)
Writes:   activeEnemies[n].currentHp, activeEnemies[n].damageCounters,
          activeEnemies[n].hitThisRound,
          roundTracking.damageDealtToEnemiesThisRound,
          turnLog
Logic:
  1. Player selects target enemy from activeEnemies
  2. Calculate base attack value:
     a. Look up attacking Luu's baseAttack[level-1] from card definition
     b. Add any active statModifier (attack) effects on this Luu
  3. Roll dice appropriate for sector (d4/d6/d8/d4+d6/d4+d8):
     IF config.playerRollsDice = true:
       App displays appropriate dice button — player clicks to roll
       App generates uniform random integer matching die type
     IF config.playerRollsDice = false:
       App generates random result automatically without button
     Store roll result
  4. Calculate total attack = baseAttack + diceRoll
  5. Apply type modifier:
     Call getTypeModifier(attackerClass, targetClass)
     Add result (+1, -1, or 0) to total attack
  6. Apply active attack enhancements:
     a. Check luu.activeEffects for type = "statModifier", stat = "attack"
        Add values to total attack (e.g. Luutex Flare, Hardened Instinct)
     b. Check Bisluu adjacency bonus:
        IF a Bisluu is at queuePosition ± 1 from this Luu:
          Add Bisluu passive attackBonus[level-1] to total attack
          (+1 base Bisluu, +2 evolved Bisluu)
  7. Check Predatory Strike / Apex Predator:
     IF luu passive = "Predatory Strike" or "Apex Predator"
     AND target.hitThisRound = true:
       Add passive bonusDamage[level-1] to total attack
  8. Apply Split Strike if active:
     IF Split Strike effect active: call resolveSplitStrike instead
  9. Apply Dispersal Strike if active:
     Player declares split across targets after dice roll
  10. Apply damage to target:
      Call applyDamageToEnemy(target, totalAttack)
  11. Set target.hitThisRound = true
  12. Update roundTracking.damageDealtToEnemiesThisRound[instanceId]
  13. Check if target defeated: call checkEnemyDefeated(target)
  14. Fire onAttack triggers on active effects
  15. Log to turnLog: { action: "attack", attacker, target,
      baseAttack, diceRoll, typeModifier, passiveBonus, totalDamage }
Triggers: applyDamageToEnemy, checkEnemyDefeated, getTypeModifier,
          resolveSplitStrike (if applicable)
Depends:  chooseAction
Notes:    Dice roll divided by playerCount and rounded up for multiplayer.
          Solo: full dice value applies.
          Attack enhancements stack — apply all active modifiers.
          Predatory Strike checks hitThisRound on the TARGET, not attacker.
```

---

### resolveDefend
```
Reads:    active Luu, players[n].luuQueue
Writes:   active Luu defendStatus = true, turnLog
Logic:
  1. Set active Luu defendStatus = true
  2. Check Bisluu adjacency defence bonus:
     IF a Bisluu is at queuePosition ± 1 from this Luu:
       Store Bisluu defenceBonus[level-1] on this Luu's activeEffects
       for use in resolveEnemyAttack this round
       (+1 base Bisluu, +2 evolved Bisluu)
  3. Log to turnLog: { action: "defend", luu: activeLuu.cardId }
Triggers: None — defend effect resolves in resolveEnemyAttack
Depends:  chooseAction
Notes:    defendStatus = true reduces damage by 2 from the FIRST
          Rogue attack that lands this turn only.
          Bisluu defence bonus applies on top of the -2 Defend reduction.
          Subsequent Rogue attacks in the same round are unaffected by Defend
          but Bisluu bonus persists for the full round.
          Reset defendStatus to false at startRound.
          Toxic Rebound fires when defend is taken AND attacker hits —
          handled in resolveEnemyAttack, not here.
```

---

### resolveGather
```
Reads:    active Luu, players[n].luutex.current,
          active Luu activeEffects (for Luutex Flow bonus)
Writes:   players[n].luutex.current, roundTracking.luutexGainedThisRound,
          turnLog
Logic:
  1. Base gather amount = 1 Luutex
  2. Check active Luu activeEffects for type = "resourceGain",
     trigger = "onGather":
     Add any bonus Luutex from Luutex Flow or similar cards
  3. Check if Bisluu is adjacent to this Luu:
     IF adjacent Bisluu is in play (check luuQueue for class = "Bisluu"
     at queuePosition ± 1 from active Luu):
       Add +1 Luutex (base Bisluu) or +1 Luutex (evolved Bisluu)
       to gather amount
       NOTE: Bisluu gather bonus is +1 regardless of base or evolved form.
       The evolved Deep Bond adds XP and attack/defence — gather bonus stays +1.
  4. Add total gather amount to players[n].luutex.current
  5. Add to roundTracking.luutexGainedThisRound
  6. Fire onGather triggers on active effects (e.g. Luutex Tap — but
     Luutex Tap triggers on damage not gather, so likely no matches)
  7. Log to turnLog: { action: "gather", amount: totalGathered,
     luutexAfter: players[n].luutex.current }
Triggers: None typically
Depends:  chooseAction
Notes:    No Luutex cap — accumulates freely.
          Luutex Flow persists for rest of sector — check activeEffects.
          Bisluu adjacency bonus (+1 Luutex) checked here each Gather action —
          not a persistent effect, recalculated per action.
          Passive Harvest card gives 1 Luutex WITHOUT using action slot —
          that resolves in resolveEffect, not here.
```

---

### resolveMove
```
Reads:    players[n].luuQueue, active Luu queuePosition
Writes:   players[n].luuQueue (reordered), turnLog
Logic:
  1. Player selects which Luu to move and direction (forward or back)
     OR if Formation Override card active: player rearranges full queue
  2. Standard move (no card): shift selected Luu one position
     a. Determine new position (current ± 1)
     b. Validate new position is within queue bounds
     c. Swap selected Luu with Luu currently at new position
     d. Update queuePosition for both Luu
  3. IF Formation Override effect active:
     Player specifies complete new queue order
     Reassign queuePosition values accordingly
     Formation Override resolves as immediate — no persistent state needed
  4. IF Tactical Shift effect active (once per wave):
     Player moves one Luu to any position (not just adjacent)
     Mark Tactical Shift as used this wave
  5. Update Kjeluu adjacency checks:
     Any effects that depend on Kjeluu adjacency (Shell Bond, Fortress Form
     adjacent reduction) — recalculate based on new queue positions
  6. Log to turnLog: { action: "move", movedLuu, fromPosition, toPosition }
Triggers: None
Depends:  chooseAction
Notes:    Standard Move shifts one position only — consumes action slot.
          Formation Override is played as a card (costs 3 Luutex) but
          does NOT consume the Luu action slot. Player can still
          Attack/Defend/Gather after playing Formation Override.
          consumesAction = false on the Formation Override card schema.
          New Luu cards always enter at back of queue — Move needed
          to reposition forward on subsequent turns.
          Queue position 1 = front (takes damage first).
          Bisluu adjacency bonus recalculates automatically after any move.
          Shell Bond ends if Kjeluu moves away from lead Luu — check here.
```

---

### getTypeModifier
```
Reads:    attackerClass, targetClass, meta.counterLoop
Writes:   Nothing — returns a value
Logic:
  1. Look up counterLoop[attackerClass]
  2. IF counterLoop[attackerClass].beats = targetClass: return +1
  3. IF counterLoop[attackerClass].losesTo = targetClass: return -1
  4. IF attackerClass = "Bisluu" OR targetClass = "Bisluu": return 0
  5. Otherwise (neutral): return 0
  6. Final modifier cannot reduce damage below 0 — enforced in caller
Triggers: None
Depends:  None — pure utility function
Notes:    Used by both resolveAttack (friendly attacking Rogue)
          and resolveEnemyAttack (Rogue attacking friendly Luu).
          Bisluu has no counter relationship — always returns 0.
          Minimum damage of 0 enforced in resolveAttack/resolveEnemyAttack,
          not in this function.
```

---

### applyDamageToEnemy
```
Reads:    target enemy stats, target enemy trait (Impervious),
          attack value passed in
Writes:   target.currentHp, target.damageCounters
Logic:
  1. Receive totalAttack value from resolveAttack
  2. Check Impervious trait if present:
     IF target has trait.name = "Impervious"
     AND totalAttack <= trait.effect.damageThreshold:
       damage = 0 (blocked entirely)
       Log: { action: "imperviousBlocked", enemy: target.instanceId }
       Return — no further damage applied
  3. Check Hardened Shell equivalent on Rogue (none currently — only
     friendly Kjeluu has this, but include hook for future)
  4. Apply damage: target.currentHp -= totalAttack
  5. target.damageCounters = target.maxHp - target.currentHp
  6. Clamp currentHp to minimum 0
  7. Log damage applied
Triggers: None — caller checks defeat
Depends:  None — utility function
Notes:    Does not check defeat — caller (resolveAttack) handles that.
          Boss has additional Fortress Core passive:
          first hit each round reduced by 1 after Impervious check —
          handled in resolveBossAttack not here.
```

---

### checkEnemyDefeated
```
Reads:    target enemy currentHp
Writes:   roundTracking.roguesDefeatedThisRound,
          players[n].luuQueue (XP on killing Luu),
          globalActiveEffects (Combat Harvest, Shared Hunt etc.)
          activeEnemies (remove defeated enemy)
Logic:
  1. IF target.currentHp > 0: return (not defeated)
  2. Enemy is defeated:
     a. Add target.instanceId to roundTracking.roguesDefeatedThisRound
     b. Award XP to killing Luu:
        Find attacking Luu (passed from resolveAttack)
        Add xpOnDefeat to that Luu's XP
        Call checkLevelUp on that Luu
     c. Check Shared Hunt effect:
        IF any Luu has activeEffect type = "xpShare",
        rules.doesNotRequireKillingBlow = true:
          Award xpOnDefeat to that Luu too
     d. Check Colony Triumph effect:
        IF globalActiveEffects contains Colony Triumph:
          Award 1 XP to ALL friendly Luu
          Discard Colony Triumph (discardCondition = "onTrigger")
     e. Check Evolutionary Pressure:
        IF killing Luu has activeEffect type = "xpModifier",
        value = 2 (double XP):
          Award additional xpOnDefeat (total = 2x)
          Discard Evolutionary Pressure
     f. Check Predatory Learning:
        IF killing Luu has activeEffect type = "xpModifier",
        trigger = "onKill":
          Award +1 bonus XP to killing Luu
     g. Fire onKill triggers:
        Check globalActiveEffects for trigger = "onKill"
        (e.g. Combat Harvest → draw 1 card)
        Call resolveEffect for each
     h. Remove enemy from activeEnemies
  3. Log: { action: "enemyDefeated", enemy: target.cardId,
     tier: target.tier, xpAwarded, killingLuu }
Triggers: checkLevelUp, resolveEffect (onKill effects)
Depends:  applyDamageToEnemy
Notes:    XP stacks — Evolutionary Pressure doubles base XP, then
          Predatory Learning adds +1 on top. Order matters.
          Boss defeat handled separately in checkBossDefeated —
          boss XP is distributed differently (5 XP per player, free distribution).
```

---

_Group 3 complete. 6 functions defined._
_Review before proceeding to Group 4 — Enemy Phase._

---

## Group 4 — Enemy Phase

_Runs after all friendly Luu have acted. Rogues attack in wave position order, then round-end effects fire._

---

### resolveEnemyAttack
```
Reads:    activeEnemies, players[n].luuQueue, position.sectorNumber,
          bosses.activeBoss (wave 4), position.waveNumber
Writes:   players[n].luuQueue (HP, damage counters),
          activeEnemies[n].attackedThisRound, turnLog
Logic:
  1. For each enemy in activeEnemies where attackedThisRound = false
     and currentHp > 0, in wave position order:
     a. Call resolveEnemySingleAttack(enemy)
     b. Set enemy.attackedThisRound = true
  2. IF position.waveNumber = 4 (boss wave):
     Call resolveBossAttack instead of looping activeEnemies
Triggers: resolveEnemySingleAttack, resolveBossAttack
Depends:  endLuuTurn (all friendly Luu must have acted)
Notes:    Enemies attack in wave position order (position 1 first).
          Dead enemies (currentHp = 0) are skipped automatically.
          Each enemy attack is fully resolved before the next begins —
          damage cascade from a KO is handled before next enemy attacks.
```

---

### resolveEnemySingleAttack
```
Reads:    attacking enemy stats and trait, position.sectorNumber,
          players[n].luuQueue (lead Luu), lead Luu activeEffects,
          lead Luu defendStatus, config.playerCount,
          config.playerRollsDice
Writes:   lead Luu currentHp, damageCounters,
          players[n].luuQueue (if cascade KO),
          turnLog
Logic:
  1. Identify target: lead Luu (queuePosition = 1) of each player
  2. Calculate base enemy attack:
     a. enemy.stats.baseAttack
     b. IF enemy.sectorBonusActive = true: add +1
     c. IF enemy has Bonded Boost active (adjacent Rogue Bisluu):
        add Bisluu tier's attackBonus value
  3. Roll sector dice:
     S1: d4, S2: d6, S3: d8, S4: d4+d6, S5: d4+d8
     IF config.playerRollsDice = true:
       App displays dice button(s) for player to click:
       S1: d4 button, S2: d6, S3: d8, S4: d4+d6 (two buttons), S5: d4+d8
       Player clicks each button — app generates uniform random integer
       For two-dice rolls: both buttons shown, results summed automatically
     IF config.playerRollsDice = false:
       App generates random result internally
     Divide by config.playerCount, round up (solo = full value)
  4. totalAttack = baseAttack + diceResult
  5. Apply type modifier:
     Call getTypeModifier(enemyClass, leadLuuClass)
     Add result to totalAttack (minimum 0)
  6. Check Phase Shift (Gifluu trait):
     IF lead Luu class = "Gifluu":
       App displays d6 button — player clicks to roll
       IF result in evadeOn array: call handleEvasion(leadLuu, enemy)
       RETURN — no damage applied on evasion
  7. Check Shell Reflex (action card):
     IF lead Luu has Shell Reflex activeEffect AND Phase Shift did not evade:
       App displays separate d6 button — player clicks to roll
       IF result = 1: prevent all damage, return
  8. Apply Defend reduction (first hit only):
     IF lead Luu defendStatus = true AND this is first hit on this Luu
     this round:
       totalAttack -= 2 (minimum 0)
       Mark defend as used (set defendStatus = false after applying)
  9. Apply Bisluu defence bonus:
     IF a Bisluu is adjacent to lead Luu:
       totalAttack -= Bisluu defenceBonus[level-1]
  10. Call applyDamageToLuu(leadLuu, totalAttack)
  11. Check Shield Spread:
      IF globalActiveEffects contains Shield Spread:
        Player distributes damage among all Luu
        Lead Luu must take at least 1
        Kjeluu Impervious applies to allocated amounts
  12. Log: { action: "enemyAttack", enemy, target, baseAttack,
      diceRoll, typeModifier, totalDamage, evaded: false }
Triggers: applyDamageToLuu, handleEvasion
Depends:  resolveEnemyAttack
Notes:    Phase Shift and Shell Reflex both roll d6 separately.
          Both can trigger on the same attack independently.
          If Phase Shift evades, Shell Reflex does not roll (attack is
          already negated — no need to roll).
          Defend reduction applies to first hit that LANDS — if Phase Shift
          evades the first attack, Defend is preserved for the next hit.
          Toxic Rebound fires after damage is applied — see applyDamageToLuu.
```

---

### applyDamageToLuu
```
Reads:    target Luu stats, target Luu trait (Kjeluu Impervious,
          Hardened Shell, Fortress Form), damage value passed in,
          target Luu activeEffects (Shell Bond, Armour Resonance)
Writes:   target Luu currentHp, damageCounters, turnLog
Logic:
  1. Receive damage value from caller
  2. Check Kjeluu Impervious:
     IF target class = "Kjeluu" AND damage <= trait.damageThreshold:
       damage = 0 — blocked entirely
       Log: { action: "imperviousBlocked" }
       Proceed to step 6 (still check Toxic Rebound etc.)
  3. Check Hardened Shell / Fortress Form:
     IF target class = "Kjeluu":
       damage -= passive.damageReduction[level-1] (1 or 2)
       damage = max(0, damage)
  4. Check Shell Bond / Armour Resonance:
     IF target has passiveCopy activeEffect referencing Kjeluu:
       Find adjacent Kjeluu, read its current passive damageReduction
       damage -= that value
       damage = max(0, damage)
  5. Check Fortress Form adjacent reduction:
     IF an evolved Kjeluu is adjacent to target:
       damage -= 1 (adjacent Fortress Form reduction)
       damage = max(0, damage)
  6. Apply damage:
     target.currentHp -= damage
     target.damageCounters = target.maxHp - target.currentHp
     target.currentHp = max(0, target.currentHp)
  7. Check Toxic Rebound:
     IF target class = "Gifluu" AND target.defendStatus = true
     AND damage > 0 (hit landed, not blocked):
       Deal rebound damage to attacking enemy:
       Call applyDamageToEnemy(attacker, rebound value)
  8. Log: { action: "damageApplied", target, rawDamage,
     reductions, finalDamage, hpAfter }
  9. Check if target KO'd: call checkLuuKnockedOut(target)
Triggers: applyDamageToEnemy (Toxic Rebound), checkLuuKnockedOut
Depends:  None — utility function
Notes:    Always route damage through this function — never modify
          HP directly (Core Engine Principle 6).
          Reductions are applied in order: Impervious → Hardened Shell
          → Shell Bond → Fortress Form adjacent.
          Toxic Rebound only fires if damage > 0 AND defend action taken.
          Evasion (Phase Shift) is handled before this function is called —
          if evaded, this function is never called for that attack.
```

---

### handleEvasion
```
Reads:    evading Luu, attacking enemy, evading Luu trait/activeEffect
Writes:   turnLog
Logic:
  1. Evasion confirmed — no damage applied to Luu
  2. Check rebound on evasion:
     IF evading Luu is Gifluu (Phase Shift trait):
       rebound = trait.effect.reboundOnEvade (Rogue) or 0 (friendly)
       IF rebound > 0: call applyDamageToEnemy(attacker, rebound)
     IF evading Luu has Shell Reflex activeEffect:
       No rebound — Shell Reflex only prevents damage, no counter
  3. Toxic Rebound does NOT fire on evasion (confirmed rule)
  4. Log: { action: "evasion", luu, attacker, reboundDealt }
Triggers: applyDamageToEnemy (if rebound)
Depends:  resolveEnemySingleAttack
Notes:    Phase Shift dice roll (d6) is performed by the player with
          the defending Gifluu, not generated by the app when
          config.playerRollsDice = true.
          App displays d6 dice button labelled "Phase Shift Roll".
          Player clicks — app generates 1-6 with uniform probability.
          App evaluates: is result in evadeOn array?
          Shell Reflex follows same pattern — separate d6, player inputs.
          If Phase Shift evades, Shell Reflex check is skipped.
          Rogue Gifluu evasion also routes through here during resolveAttack
          when a friendly Luu attacks a Rogue Gifluu.
```

---

### checkLuuKnockedOut
```
Reads:    target Luu currentHp, players[n].luuQueue,
          target Luu activeEffects, globalActiveEffects
Writes:   players[n].luuQueue, deck.discardPile,
          globalActiveEffects, players[n].luutex (no cap but log)
Logic:
  1. IF target.currentHp > 0: return (not KO'd)
  2. Luu is knocked out:
     a. Calculate overflow damage:
        overflow = abs(target.currentHp) (damage beyond 0)
     b. Discard all persistent and untilTriggered activeEffects
        on this Luu without triggering them
        Add their cardIds to deck.discardPile
     c. Remove any globalActiveEffects that reference this Luu
        (e.g. Shell Bond checking this Luu's adjacency)
     d. Fire onLuuKnockedOut triggers:
        Check globalActiveEffects for trigger = "onLuuKnockedOut"
        (e.g. Last Lesson → player selects card from discard)
        Call resolveEffect for each
     e. Remove Luu from luuQueue
        Shift remaining Luu forward (update queuePosition values)
     f. Add KO'd Luu cardId to deck.discardPile
     g. Add KO'd Luu cardId to history.luuLost
     h. IF overflow > 0 AND luuQueue not empty:
        Apply overflow to new lead Luu (queuePosition 1)
        Call applyDamageToLuu(newLeadLuu, overflow)
     i. IF luuQueue is empty: call checkLoseCondition
  3. Log: { action: "luuKnockedOut", luu, overflow,
     effectsDiscarded, newLeadLuu }
Triggers: resolveEffect (onLuuKnockedOut), applyDamageToLuu (overflow),
          checkLoseCondition
Depends:  applyDamageToLuu
Notes:    Overflow damage cascades through the queue until absorbed
          or all Luu are KO'd.
          Effects discarded without triggering — Evolution Drive on a
          KO'd Luu does not fire.
          Last Lesson fires here — player gets to salvage one card
          from the discard as compensation for the loss.
          Purification's converted Luu enters queue normally —
          if KO'd later, same rules apply.
```

---

### resolveBossAttack
```
Reads:    bosses.activeBoss, players[n].luuQueue (lead Luu),
          position.sectorNumber, config.playerCount
Writes:   lead Luu currentHp, damageCounters, turnLog
Logic:
  1. Get boss stats for current sector:
     health = activeBoss.stats.health[sectorNumber - 1]
     baseAttack = activeBoss.stats.baseAttack[sectorNumber - 1]
  2. Roll sector dice (same as Rogue dice scaling)
     Divide by playerCount, round up
  3. totalAttack = baseAttack + diceResult
  4. Apply type modifier:
     IF boss.class != "Bisluu": call getTypeModifier(bossClass, leadLuuClass)
     IF boss.class = "Bisluu" (Tjeluu): no modifier (outside loop)
  5. Apply Symbiotic Drain (Tjeluu passive):
     IF activeBoss.cardId = "boss_tjeluu":
       Already fired at roundStart — attack value unaffected here
  6. Apply Wounded Prey (Lynluu passive):
     IF activeBoss.cardId = "boss_lynluu"
     AND lead Luu damageCounters > 0:
       totalAttack += 2
  7. Check Phase Shift, Shell Reflex, Defend, Bisluu defence:
     Same as resolveEnemySingleAttack steps 6-9
  8. Call applyDamageToLuu(leadLuu, totalAttack)
  9. Log: { action: "bossAttack", boss: activeBoss.cardId,
     target, totalDamage, passiveTriggered }
Triggers: applyDamageToLuu
Depends:  resolveEnemyAttack
Notes:    Boss attacks once per round — no wave position mechanic.
          Fesluu Fortress Core: first hit each round reduced by 1
          after Impervious check — handled in applyDamageToLuu with
          a bossFirstHitThisRound flag on activeBoss.
          Toxluu Toxic Aura: evasion on 5-6 with scaled rebound —
          handled same as Phase Shift but with evadeOn: [5, 6].
          Forluu Resilient Core: fires at roundEnd not here.
```

---

### resolveBossPassive
```
Reads:    bosses.activeBoss, players[n].luuQueue,
          position.roundNumber
Writes:   bosses.activeBoss.currentHp (Forluu),
          players[n].luuQueue (Tjeluu drain), turnLog
Logic:
  1. Read activeBoss.passive.trigger
  2. Route by boss:

     TJELUU (trigger: roundStart):
       Find friendly Luu with highest current baseAttack
       IF tie: player chooses
       Reduce that Luu's effective baseAttack by 1 this round only
       Store as temporary modifier — resets at startRound

     LYNLUU (trigger: onAttack — handled in resolveBossAttack):
       No action here — Wounded Prey checked during attack resolution

     FORLUU (trigger: roundEnd):
       Count damage counters on current lead friendly Luu
       healAmount = min(damageCounters, 3) (cap at 3)
       IF healAmount > 0:
         activeBoss.currentHp += healAmount
         activeBoss.currentHp = min(activeBoss.currentHp, activeBoss.maxHp)
         Log: { action: "forluu_healed", amount: healAmount }

     FESLUU (trigger: onDamaged — handled in applyDamageToEnemy):
       No action here — Fortress Core checked during damage resolution

     TOXLUU (trigger: onDamaged — handled in resolveAttack):
       No action here — Toxic Aura evasion checked during attack

  3. Log: { action: "bossPassive", boss, effect }
Triggers: None — called by startRound (roundStart) or endRound (roundEnd)
Depends:  startRound OR endRound
Notes:    Tjeluu drain is temporary — only affects this round.
          Forluu healing is capped at 3 per round regardless of
          lead Luu damage counters.
          Forluu cannot heal above its maxHp for the current sector.
```

---

_Group 4 complete. 6 functions defined._
_Review before proceeding to Group 5 — Wave and Sector Management._

---

## Group 5 — Wave and Sector Management

_Handles transitions between waves, between sectors, and end-of-game conditions._

---

### initWave
```
Reads:    position.waveNumber, enemyDeck.preDealtWaves,
          bosses.activeBoss, position.sectorNumber
Writes:   activeEnemies, position.phase, turnLog
Logic:
  1. IF position.waveNumber <= 3 (regular wave):
     a. Load wave from enemyDeck.preDealtWaves[waveNumber - 1]
     b. For each cardId in wave array:
        Create activeEnemy entry:
        {
          instanceId: "enemy_" + unique counter,
          cardId: cardId,
          class: [look up from card definition],
          tier: [look up from card definition],
          wavePosition: index + 1,
          currentHp: stats.health [from card definition],
          maxHp: stats.health,
          damageCounters: 0,
          sectorBonusActive: [class matches activeBoss.class],
          hitThisRound: false,
          attackedThisRound: false
        }
     c. Set activeEnemies = array of above entries
  2. IF position.waveNumber = 4 (boss wave):
     a. Set activeEnemies = [] (no regular Rogues)
     b. Boss is already in bosses.activeBoss
     c. Reset bosses.activeBoss.currentHp to full for this sector:
        maxHp = activeBoss.stats.health[sectorNumber - 1]
        currentHp = maxHp
     d. Set activeBoss.bossFirstHitThisRound = true (Fesluu)
  3. Set position.phase = "playerTurns"
  4. Log: { action: "waveStart", wave: waveNumber,
     enemies: activeEnemies.map(e => e.cardId) }
Triggers: startRound
Depends:  initEnemyDeck (preDealtWaves must exist)
Notes:    sectorBonusActive is precomputed here — class match check
          against activeBoss.class. Gives +1 base attack in resolveEnemySingleAttack.
          Boss wave resets boss HP — boss always starts each encounter at full health
          for the sector it is encountered in.
```

---

### endWave
```
Reads:    position.waveNumber, position.sectorNumber,
          players[n].hand, config.playerCount
Writes:   position.waveNumber, position.phase,
          players[n].hand, deck.drawPile, history.wavesCleared,
          turnLog
Logic:
  1. All enemies in activeEnemies confirmed currentHp = 0
  2. Increment history.wavesCleared
  3. Clean up wave-scoped effects:
     Remove from all luu.activeEffects where discardCondition = "endOfWave"
     Remove from globalActiveEffects where discardCondition = "endOfWave"
     Move removed cards to deck.discardPile
     (e.g. Luutex Tap, Shell Reflex, Shell Bond, Shield Spread,
      Shared Hunt, Damage Response all expire here)
  4. Set position.phase = "betweenWaves"
  4. IF position.waveNumber < 3 (more regular waves remain):
     a. Each player draws 1 card from deck.drawPile
        Call drawCard for each player
     b. Enforce hand limit — discard down:
        handLimit = getHandLimit(config.playerCount)
        IF player.hand.length > handLimit:
          Prompt player to discard down to handLimit
          Player chooses which cards to discard
          Move discarded cards to deck.discardPile
     c. Increment position.waveNumber
     d. Call initWave
  5. IF position.waveNumber = 3 (all regular waves cleared):
     a. Each player draws 1 card from deck.drawPile
     b. Enforce hand limit — discard down (same as step 4b)
     c. Increment position.waveNumber to 4 (boss wave)
     d. Call initWave (boss wave)
  6. IF position.waveNumber = 4 (boss just defeated):
     a. Call checkBossDefeated
  7. Log: { action: "waveEnd", wave: waveNumber,
     cardsDrawn: playerCount }
Triggers: drawCard, initWave, checkBossDefeated
Depends:  endRound (all enemies must be defeated)
Notes:    1 card drawn per player after each of the 3 regular waves,
          then player discards down to hand limit (player's choice).
          During a wave there is no hand limit — cards may accumulate freely.
          Hand limit enforced only at: wave end (discard down) and
          sector start (draw up to limit if below it).
          No card draw after boss defeat — sector end handles that.
          Deck reshuffle triggered automatically if drawPile empty
          during any drawCard call.
```

---

### drawCard
```
Reads:    deck.drawPile, deck.discardPile, deck.removedCards,
          deck.reshuffleCount
Writes:   players[n].hand, deck.drawPile, deck.discardPile,
          deck.removedCards, deck.reshuffleCount, turnLog
Logic:
  1. IF deck.drawPile is not empty:
     a. Take top card from deck.drawPile
     b. Add to players[n].hand
     c. Log: { action: "cardDrawn", cardId }
     d. Return
  2. IF deck.drawPile is empty:
     a. Call reshuffleDeck
     b. After reshuffle, take top card from new deck.drawPile
     c. Add to players[n].hand
     d. Log: { action: "cardDrawn", cardId, afterReshuffle: true }
Triggers: reshuffleDeck (if draw pile empty)
Depends:  None — utility function
Notes:    Called by endWave, dealOpeningHand, card effects (Combat Harvest etc.)
          Always check empty before drawing — never draw from empty pile
          without reshuffling first.
          Additional draws from cards (Combat Harvest, Neural Cascade)
          also route through this function.
```

---

### reshuffleDeck
```
Reads:    deck.discardPile, deck.reshuffleCount
Writes:   deck.drawPile, deck.discardPile, deck.removedCards,
          deck.reshuffleCount, turnLog
Logic:
  1. IF deck.discardPile is empty:
     Log warning — no cards available to reshuffle
     Return (game may be in unwinnable state)
  2. Randomly select 1 card from deck.discardPile
  3. Add selected card to deck.removedCards permanently
  4. Remove selected card from deck.discardPile
  5. Shuffle remaining discardPile cards
  6. Set deck.drawPile = shuffled cards
  7. Set deck.discardPile = []
  8. Increment deck.reshuffleCount
  9. Log: { action: "deckReshuffled", removedCard,
     reshuffleCount, newDeckSize }
Triggers: None
Depends:  None — utility function
Notes:    1 random card permanently removed each reshuffle.
          Creates late-game scarcity — deck shrinks over time.
          Removed card is visible to player (shown briefly before removal).
          If discardPile has only 1 card, that card is removed and
          draw pile remains empty — edge case worth handling gracefully.
          reshuffleCount tracked for logging and potential UI display.
```

---

### checkBossDefeated
```
Reads:    bosses.activeBoss.currentHp, bosses.clearedBosses,
          bosses.bossPool, bosses.pendingBoss,
          players[n].luuQueue
Writes:   bosses.clearedBosses, bosses.activeBoss,
          players[n].luuQueue (XP distribution),
          history.sectorsCleared, turnLog
Logic:
  1. IF activeBoss.currentHp > 0: return (not defeated)
  2. Boss defeated:
     a. Add activeBoss.cardId to bosses.clearedBosses
     b. Award boss XP:
        Each player receives 5 XP to distribute freely
        Prompt player to allocate 5 XP among their Luu
        (UI: show each Luu with +/- buttons, total must equal 5)
        Apply XP to chosen Luu
        Call checkLevelUp for each Luu that received XP
     c. Increment history.sectorsCleared
     d. Log: { action: "bossDefeated", boss: activeBoss.cardId,
        sector: sectorNumber }
  3. Check win condition: call checkWinCondition
  4. IF not won: call endSector
Triggers: checkLevelUp, checkWinCondition, endSector
Depends:  endWave (wave 4 must be complete)
Notes:    Boss XP distribution is player-driven — UI must support
          free allocation across all living Luu.
          Evolution note: if a Luu is at L3 and receives enough XP
          to level up, XP carries over. Remind player to evolve
          before distributing if they have evolution card in hand —
          evolution resets XP to 0.
          checkWinCondition runs before endSector — if all 5 bosses
          cleared, game ends without starting a new sector.
```

---

### endSector
```
Reads:    bosses.bossPool, bosses.pendingBoss,
          position.sectorNumber, players[n].hand,
          config.playerCount
Writes:   position.sectorNumber, position.waveNumber,
          position.roundNumber, position.phase,
          bosses.pendingBoss, bosses.currentChoice,
          bosses.bossPool, players[n].hand,
          globalActiveEffects, turnLog
Logic:
  1. Set position.phase = "betweenSectors"
  2. Clean up sector-scoped persistent effects:
     Remove from globalActiveEffects any effect where
     discardCondition = "endOfSector"
     Remove from all luu.activeEffects similarly
     Move removed cards to deck.discardPile
     (e.g. Shell Shift, Hardened Instinct, Apex Focus, Luutex Flow)
  3. Draw up to hand limit for next sector:
     Call dealOpeningHand (draws up to limit, not just 1 card)
  4. Increment position.sectorNumber
  5. Reset position.waveNumber = 1
  6. Reset position.roundNumber = 1
  7. Reveal next boss choice:
     a. IF bossPool is not empty:
        Draw one boss from bossPool (random)
        Remove from bossPool
        Set bosses.currentChoice = [pendingBoss, newly drawn boss]
        IF pendingBoss = null (after S1):
          currentChoice = [newly drawn boss, second drawn boss]
          Draw two from pool for S2 only
     b. IF bossPool has exactly 1 card left:
        currentChoice = [pendingBoss, last pool card]
        Remove last pool card from bossPool
     c. IF bossPool is empty AND pendingBoss exists:
        No choice — set activeBoss = pendingBoss directly
        Set pendingBoss = null
        Skip player choice step
  8. IF currentChoice has 2 options:
     Present choice to player (UI shows two boss cards)
     Player selects one
     Set bosses.activeBoss = chosen boss (with sector stats)
     Set bosses.pendingBoss = unchosen boss
  9. Call initEnemyDeck (build new sector enemy pool)
  10. Call initWave (start wave 1 of new sector)
  11. Log: { action: "sectorEnd", sector: sectorNumber - 1,
      nextBoss: activeBoss.cardId }
Triggers: dealOpeningHand, initEnemyDeck, initWave
Depends:  checkBossDefeated
Notes:    Sector-scoped effects (Shell Shift, Hardened Instinct,
          Apex Focus, Apex Conditioning, Shell Bond) all expire here.
          Wave-scoped effects (Luutex Tap, Shell Reflex, Shield Spread)
          expired at wave end — should already be cleared.
          Game-scoped effects (Combat Harvest, Last Lesson, Luutex Pulse,
          Spore Signal) persist — do NOT clear these.
          Boss pool logic handles all sector counts:
          S1→S2: draw two from pool (no pending boss yet)
          S2→S3: pendingBoss + one drawn
          S3→S4: pendingBoss + one drawn
          S4→S5: pendingBoss + last pool card (pool now empty)
          S5: no choice, pendingBoss is final boss
```

---

### checkWinCondition
```
Reads:    bosses.clearedBosses
Writes:   gameStatus, turnLog
Logic:
  1. IF bosses.clearedBosses.length = 5:
     All five bosses defeated — players win
     Set gameStatus.status = "won"
     Set gameStatus.wonAt = { sector: sectorNumber, wave: waveNumber }
     Log: { action: "gameWon" }
     Trigger win screen
  2. ELSE: return (game continues)
Triggers: None — terminal state
Depends:  checkBossDefeated
Notes:    Win condition is purely boss count — all 5 must be cleared.
          Called after every boss defeat.
          Checked before endSector so game ends cleanly
          without initialising a 6th sector.
```

---

### checkLoseCondition
```
Reads:    players[n].luuQueue
Writes:   gameStatus, turnLog
Logic:
  1. Check all players' luuQueue:
     IF all luuQueues are empty (all Luu KO'd):
       Set gameStatus.status = "lost"
       Set gameStatus.lostAt = { sector, wave, round }
       Set gameStatus.loseReason = "allLuuDefeated"
       Log: { action: "gameLost", reason: "allLuuDefeated" }
       Trigger lose screen
  2. ELSE: return (game continues)
Triggers: None — terminal state
Depends:  checkLuuKnockedOut
Notes:    Called after every Luu knockout and overflow cascade.
          Solo: only one player's queue — if empty, game over.
          Multiplayer: ALL players must have empty queues to lose —
          as long as one player has a living Luu, game continues.
          Loss is checked after overflow cascade completes —
          a single hit that wipes the queue triggers this immediately.
```

---

### checkLevelUp
```
Reads:    target Luu xp, target Luu level, target Luu levelTrack
Writes:   target Luu level, target Luu xp, target Luu currentHp,
          target Luu maxHp, turnLog
Logic:
  1. IF target Luu xp < levelTrack.xpPerLevel (5): return
  2. Level up triggered:
     a. Carry over XP: remainder = xp - 5
     b. Increment level by 1
     c. IF new level > levelTrack.max:
        IF card is base form: level capped — cannot exceed L3
        (evolution needed to progress further)
        Revert level increment, log warning
        Return
     d. Update maxHp to new level's value:
        newMaxHp = stats.health[level - levelTrack.min]
     e. currentHp = newMaxHp - damageCounters
        (damage counters persist — HP scales up but damage stays)
     f. Set xp = remainder (spillover)
     g. IF remainder >= 5: call checkLevelUp again (chain level-ups)
  3. Log: { action: "levelUp", luu, newLevel, xpRemainder,
     newMaxHp, newBaseAttack }
Triggers: checkLevelUp (recursive if xp spillover triggers another level up)
Depends:  None — utility function
Notes:    XP spillover is handled recursively — rare but possible
          if boss XP (5) is given to a Luu already at 4 XP.
          Base form caps at L3 — cannot level beyond without evolution.
          Evolved form caps at L5.
          Damage counters persist across level up — only maxHp increases.
          baseAttack updates automatically — always read from
          stats.baseAttack[level - levelTrack.min] dynamically.
          No need to store baseAttack in game state — derived from
          card definition + current level.
```

---

_Group 5 complete. 7 functions defined._
_Review before proceeding to Group 6 — Card Effect Resolution._

---

## Group 6 — Card Effect Resolution

_Handles resolution of all action card effect types. Called by playCard for each effect in a card's effects array. Each effect type has its own handler function._

---

### resolveEffect
```
Reads:    effect object from card definition, game state (various)
Writes:   game state (various — depends on effect type)
Logic:
  1. Read effect.type
  2. Route to appropriate handler:
     "statModifier"         → resolveStatModifier
     "resourceGain"         → resolveResourceGain
     "healing"              → resolveHealing
     "damageRedistribution" → resolveDamageRedistribution
     "cardDraw"             → resolveCardDraw
     "deckSearch"           → resolveDeckSearch
     "queueManipulation"    → resolveQueueManipulation
     "turnOrderOverride"    → resolveTurnOrderOverride
     "attackDistribution"   → resolveAttackDistribution
     "xpModifier"           → resolveXpModifier
     "damagePrevention"     → resolveDamagePrevention
     "passiveCopy"          → resolvePassiveCopy
     "discard"              → resolveDiscard
     "xpShare"              → resolveXpShare
     "luuRecovery"          → resolveLuuRecovery
     "conversion"           → resolveConversion
     "resourceGain"         → resolveResourceGain
  3. After handler resolves:
     IF effect.timing = "immediate": move card to discardPile
     IF effect.timing = "persistent" or "untilTriggered":
       card stays in activeEffects until discardCondition met
  4. Log: { action: "effectResolved", effectType, cardId }
Triggers: appropriate handler function
Depends:  playCard
Notes:    Multiple effects on one card resolved in array order.
          Luutex Reclaim: discard effect resolves first, then resourceGain.
          Pack Call: deckSearch resolves first, then conditional statModifier.
          If a condition check fails, that effect is skipped entirely —
          other effects on the same card still resolve.
```

---

### resolveStatModifier
```
Reads:    effect.stat, effect.value, effect.target, effect.timing,
          effect.attachedTo, players[n].luuQueue
Writes:   target Luu activeEffects OR turnState (if thisRound),
          turnLog
Logic:
  1. Identify target Luu from effect.target and effect.attachedTo
  2. Route by effect.stat:
     "attack":
       Add { type: "attackBonus", value: effect.value,
             timing: effect.timing, source: cardId }
       to target Luu activeEffects
       Applied dynamically in resolveAttack step 6
     "defence":
       Add { type: "defenceBonus", value: effect.value,
             timing: effect.timing, source: cardId }
       to target Luu activeEffects
       Applied dynamically in resolveEnemySingleAttack
     "playCost":
       Override play cost for specified card this turn only
       (Pack Call free Lagluu — cost set to 0 for one play)
  3. Assign discardCondition based on timing:
     IF effect.timing = "endOfTurn":    discardCondition = "endOfTurn"
     IF effect.timing = "thisRound":    discardCondition = "endOfRound"
     IF effect.timing = "thisWave":     discardCondition = "endOfWave"
     IF effect.timing = "thisSector":   discardCondition = "endOfSector"
     IF effect.timing = "permanent":    discardCondition = "manual"
     IF effect.timing = "untilTriggered": discardCondition = effect.discardCondition
  4. Add modifier to target Luu activeEffects with timing and discardCondition
  6. Log: { action: "statModifier", stat, value, target, timing }
Triggers: None
Depends:  resolveEffect
Notes:    Attack and defence bonuses stored in activeEffects and
          read dynamically — never stored as flat values on the Luu.
          This ensures stacking works correctly — multiple modifiers
          all read and summed at resolution time.
          Shell Shift (removes type disadvantage) handled here as
          stat = "typeDisadvantage", value = 0 override.
```

---

### resolveResourceGain
```
Reads:    effect.value, effect.target, players[n].luutex
Writes:   players[n].luutex.current, roundTracking.luutexGainedThisRound,
          turnLog
Logic:
  1. Determine gain amount = effect.value
  2. Add to players[n].luutex.current
  3. Add to roundTracking.luutexGainedThisRound
  4. Log: { action: "luutexGained", amount, luutexAfter }
Triggers: None
Depends:  resolveEffect
Notes:    No cap — Luutex accumulates freely.
          Luutex Flow persistent effect: stored in activeEffects with
          trigger = "onGather". Fires in resolveGather, not here.
          Luutex Tap: stored in activeEffects with trigger = "onAttack"
          tracking enemies damaged this round. Fires in resolveAttack.
          Passive Harvest (cost 0, no action): resolves here immediately.
          Biomass Reclaim: resourceGain is second effect — fires after
          discard effect completes.
```

---

### resolveHealing
```
Reads:    effect.value, effect.target, effect.condition,
          players[n].luuQueue
Writes:   target Luu currentHp, damageCounters, turnLog
Logic:
  1. Identify target(s) from effect.target:
     "oneLuu" → player-chosen Luu
     "allLuu" → all Luu in queue
  2. For each target:
     a. Check condition if present:
        IF condition.type = "targetHpAbove":
          Skip if target.currentHp <= condition.value
     b. Calculate heal amount:
        IF effect.value is integer: heal that many counters
        IF effect.value = "full": restore to maxHp
     c. Remove damage counters:
        target.damageCounters -= healAmount
        target.damageCounters = max(0, target.damageCounters)
        target.currentHp = target.maxHp - target.damageCounters
  3. Log: { action: "healing", targets, amountHealed }
Triggers: None
Depends:  resolveEffect
Notes:    Cannot heal above maxHp for current level.
          Cannot heal a Luu at 0 HP (Pack Mending condition).
          Shell Regrowth (up to 5): player chooses how many counters
          to remove up to the maximum.
          Quick Mend (1 counter): no player choice needed.
          Pack Mending fires at roundEnd via trigger in endRound —
          not immediately on play.
```

---

### resolveDamageRedistribution
```
Reads:    effect.rules, players[n].luuQueue,
          current damage state of all Luu
Writes:   all Luu currentHp, damageCounters, turnLog
Logic:
  1. Calculate total damage pool to redistribute:
     Emergency Mend: sum of all damage counters dealt THIS turn
     Shield Spread: incoming damage from current Rogue attack
  2. Present player with redistribution UI:
     Show all friendly Luu with current damage counters
     Player allocates total damage pool across Luu freely
  3. Validate allocation:
     a. Total allocated must equal total damage pool
     b. IF effect.rules.leadLuuMinimumDamage = 1:
        Lead Luu must receive at least 1
     c. Kjeluu Impervious applies per allocation:
        If allocated amount to Kjeluu <= threshold: that portion = 0
        Adjust total — remaining damage is lost (absorbed by Impervious)
  4. Apply final allocations:
     For each Luu: call applyDamageToLuu with allocated amount
     NOTE: applyDamageToLuu will apply further reductions (Hardened Shell etc.)
  5. Log: { action: "damageRedistributed", allocations }
Triggers: applyDamageToLuu
Depends:  resolveEffect
Notes:    Emergency Mend: reallocates damage already dealt this turn.
          Current damage counters are source — player redistributes
          the total across all Luu in any combination including
          fully removing from one Luu.
          Shield Spread: intercepts incoming damage before it applies —
          player splits the incoming value, then each portion goes
          through applyDamageToLuu separately.
          Both effects respect Kjeluu Impervious on each portion.
```

---

### resolveCardDraw
```
Reads:    effect.value, effect.target, effect.searchIn,
          effect.searchFor, effect.condition,
          deck.drawPile, deck.discardPile, players[n].hand
Writes:   players[n].hand, deck.drawPile OR deck.discardPile,
          turnLog
Logic:
  1. Check condition if present:
     IF condition.type = "discardPileNotEmpty":
       IF deck.discardPile is empty: skip effect, log warning
  2. Route by effect.searchIn:
     "drawPile":
       Draw effect.value cards from top of drawPile
       Call drawCard for each
     "discardPile" (Salvage Protocol, Reawakening, Last Lesson):
       Present player with browsable discard pile UI
       Player selects card(s) matching searchFor criteria
       Remove selected card(s) from discardPile
       Add to player hand
  3. For Core Cascade (draw 3, discard 1):
     Draw 3 cards via drawCard
     Prompt player to select 1 card to discard
     Move selected card to discardPile
  4. Log: { action: "cardDraw", source, cardsDrawn }
Triggers: drawCard (for drawPile draws)
Depends:  resolveEffect
Notes:    Last Lesson fires on onLuuKnockedOut trigger — routed
          through resolveEffect from checkLuuKnockedOut.
          Reawakening: searchFor cardType = ["Luu", "LuuEvolved"] —
          filter discard pile to show only Luu cards.
          Salvage Protocol: no filter — full discard pile shown.
          Hand limit NOT enforced during wave — cards accumulate freely.
          Discard down to limit happens at endWave.
          Combat Harvest (onKill trigger): fires from checkEnemyDefeated,
          routes through resolveEffect → resolveCardDraw.
```

---

### resolveDeckSearch
```
Reads:    effect.searchFor, effect.shuffleAfter,
          deck.drawPile, players[n].hand
Writes:   players[n].hand, deck.drawPile, turnLog
Logic:
  1. Search deck.drawPile for cards matching searchFor criteria:
     cardType match AND/OR class match
  2. IF no matching card found:
     Log: { action: "deckSearchEmpty", searchFor }
     Return — effect has no result
  3. IF matching card(s) found:
     Present player with matching cards (may be multiple)
     Player selects one
     Remove from drawPile
     Add to player hand
  4. IF effect.shuffleAfter = true:
     Shuffle deck.drawPile
  5. Log: { action: "deckSearch", searchFor, cardFound }
Triggers: None
Depends:  resolveEffect
Notes:    Luu Search: searchFor = { cardType: "Luu" } — any Luu card.
          Pack Call: searchFor = { cardType: "Luu", class: "Lagluu" }.
          Always shuffle after searching — player cannot know
          remaining deck order.
          Pack Call conditional free play: second effect in array,
          checks if Lagluu already in play before reducing cost.
          IF drawPile has no matching card: effect simply fails silently.
```

---

### resolveQueueManipulation
```
Reads:    effect.value, players[n].luuQueue,
          globalActiveEffects (Tactical Shift usage)
Writes:   players[n].luuQueue (queuePosition values), turnLog
Logic:
  1. Route by effect subtype:
     Formation Override (value = "fullRearrange"):
       Player specifies complete new queue order
       Reassign queuePosition 1 through N to player's chosen order
       consumesAction = false — action slot preserved
     Tactical Shift (once per wave, any position):
       Check Tactical Shift has not been used this wave
       Player selects Luu and target position
       Remove Luu from current position
       Insert at target position
       Renumber all queuePositions sequentially
       Mark Tactical Shift as used this wave
  2. Recalculate adjacency effects:
     Check Shell Bond validity (Kjeluu still adjacent?)
     Check Bisluu adjacency bonuses
     Check Fortress Form adjacent reduction
  3. Log: { action: "queueManipulated", type, newOrder }
Triggers: None
Depends:  resolveEffect
Notes:    Formation Override: consumesAction = false.
          Tactical Shift: consumesAction = false, shared effect,
          once per wave limit stored in globalActiveEffects.
          Both effects update queuePosition immediately —
          subsequent functions read fresh positions.
          Shell Bond ends if Kjeluu moves away from lead Luu.
```

---

### resolveTurnOrderOverride
```
Reads:    effect, players[n].luuQueue, players[n].turnState
Writes:   players[n].turnState.overrideActive, turnLog
Logic:
  1. Set players[n].turnState.overrideActive = true
  2. Log: { action: "overrideActivated" }
  3. This round, startPlayerTurn skips queue order enforcement:
     Player may choose which unacted Luu acts next
     rather than defaulting to lowest queuePosition
  4. overrideActive reset to false at startRound next round
Triggers: None — startPlayerTurn reads flag
Depends:  resolveEffect
Notes:    Override card: consumesAction = false.
          overrideActive is a game state flag (confirmed design decision).
          Effect lasts for current round only — resets at startRound.
          Does not change queuePosition values — only action order.
          After Override, all Luu still act before enemy phase.
```

---

### resolveXpModifier
```
Reads:    effect.stat, effect.value, effect.target,
          effect.attachedTo, effect.condition
Writes:   target Luu activeEffects, turnLog
Logic:
  1. Identify target Luu from effect.attachedTo
  2. Route by effect.stat:
     "xpMultiplier" (Evolution Drive):
       Store { type: "xpMultiplier", value: 2,
               trigger: "onKill", discardCondition: "onKill",
               condition: "killedByAttachedLuu" }
       in target Luu activeEffects
       checkEnemyDefeated reads this and doubles XP on next kill
     "xpBonus" (Hunter's Edge, Predatory Learning):
       Store { type: "xpBonus", value: effect.value,
               trigger: "onKill", timing: effect.timing }
       in target Luu activeEffects
       checkEnemyDefeated reads and adds bonus XP on each kill
  3. Log: { action: "xpModifierApplied", target, modifier }
Triggers: None — checkEnemyDefeated reads activeEffects
Depends:  resolveEffect
Notes:    Evolution Drive discards on first kill (onKill discardCondition).
          Hunter's Edge persists for rest of wave.
          Both stack with base kill XP — modifier is additive/multiplicative
          on top of xpOnDefeat value from Rogue card.
          XP multiplier applies before XP bonus:
          (baseXp × multiplier) + bonus = total XP awarded.
```

---

### resolveDamagePrevention
```
Reads:    effect, effect.diceCheck, target Luu,
          config.playerRollsDice
Writes:   target Luu activeEffects, turnLog
Logic:
  1. Shell Reflex persistent setup:
     Store { type: "damagePrevention", trigger: "onDamaged",
             diceCheck: { diceType: "d6", passOn: [1] },
             timing: "thisWave", discardCondition: "endOfWave" }
     in target Luu activeEffects
  2. When triggered (in resolveEnemySingleAttack):
     IF config.playerRollsDice = true:
       Display d6 dice button labelled "Shell Reflex Roll"
       Player clicks — app generates 1-6 uniform random
     IF config.playerRollsDice = false:
       App generates random 1-6
     IF result in passOn [1]: prevent all damage, return
     ELSE: damage applies normally
  3. Log: { action: "damagePrevention", result, prevented }
Triggers: None — resolveEnemySingleAttack reads activeEffects
Depends:  resolveEffect
Notes:    Shell Reflex rolls independently of Phase Shift.
          If Phase Shift evades first, Shell Reflex does not roll.
          Multiple Shell Reflex copies stack — each triggers separately,
          each with its own d6 roll. Both must fail to let damage through.
          stackable = true on Shell Reflex card.
```

---

### resolvePassiveCopy
```
Reads:    effect.copyFrom, effect.condition,
          players[n].luuQueue (Kjeluu position),
          playerChoosesAtPlay target
Writes:   target Luu activeEffects, turnLog
Logic:
  1. Shell Bond / Armour Resonance setup:
     Player chooses a target Luu at play time (not forced to lead Luu)
     Store { type: "passiveCopy", source: "Kjeluu",
             passive: "Hardened Shell or Fortress Form",
             requirement: "adjacentKjeluu",
             attachedToLuuId: chosen Luu instanceId,
             timing: "thisWave", discardCondition: "endOfWave",
             rules: {
               attachedToSpecificLuu: true,
               doesNotFollowQueuePosition: false,
               endsIfKjeluuNotAdjacentToAttachedLuu: true,
               endsIfKjeluuKnockedOut: true
             } }
     in TARGET LUU's activeEffects (not lead Luu's)
  2. When damage is applied to the attached Luu (in applyDamageToLuu):
     Check if Kjeluu is adjacent to THIS specific Luu
     (read current queuePositions — Luu may have moved)
     IF adjacent Kjeluu found:
       Read Kjeluu's current passive (base or evolved)
       Apply same damage reduction to attached Luu
     IF Kjeluu no longer adjacent to attached Luu:
       Remove this activeEffect — effect has ended
  3. Log: { action: "passiveCopy", source, attachedTo, passive }
Triggers: None — applyDamageToLuu reads activeEffects
Depends:  resolveEffect
Notes:    Effect attaches to a SPECIFIC chosen Luu, not always lead Luu.
          If that Luu moves back in queue, effect stays with it.
          Adjacency check is always between Kjeluu and the attached Luu —
          not between Kjeluu and whoever is currently at Position 1.
          Effect ends if Kjeluu moves away from the ATTACHED Luu,
          not from Position 1.
          Kjeluu KO also ends the effect.
          Uses Kjeluu's CURRENT passive level — if Kjeluu evolves while
          Shell Bond is active, attached Luu immediately benefits
          from Fortress Form values.
```

---

### resolveDiscard
```
Reads:    effect.value, effect.target, players[n].hand,
          effect.condition
Writes:   players[n].hand, deck.discardPile, turnLog
Logic:
  1. Check condition:
     IF condition.type = "playerMustHaveCardInHand":
       IF players[n].hand is empty: effect fails, log warning
       IF Luutex Reclaim played with empty hand: cannot play
  2. Prompt player to select card(s) to discard:
     Player selects effect.value cards from hand
  3. Remove selected cards from hand
  4. Add to deck.discardPile
  5. Log: { action: "discard", cardsDiscarded }
Triggers: None
Depends:  resolveEffect
Notes:    Luutex Reclaim: discard is first effect, resourceGain second.
          If discard fails (empty hand), resourceGain also skipped.
          This is the player's deliberate discard — different from
          the enforced discard-down-to-limit at wave end.
          Cannot play Luutex Reclaim without a card in hand to discard.
```

---

### resolveXpShare
```
Reads:    effect.rules, effect.target, effect.value,
          players[n].luuQueue, roundTracking.roguesDefeatedThisRound
Writes:   target Luu XP, turnLog
Logic:
  1. Route by effect.rules.xpSource:
     "rogueXpValue" (Shared Hunt):
       Store in target Luu activeEffects:
       { type: "xpShare", trigger: "onKill",
         rules: { doesNotRequireKillingBlow: true,
                  xpSource: "rogueXpValue",
                  killingLuuAlsoReceivesXp: true },
         timing: "thisWave", discardCondition: "endOfWave" }
       When any Rogue is defeated this wave:
         Award xpOnDefeat to attached Luu (as well as killing Luu)
     "flat" (Colony Triumph):
       Store in globalActiveEffects:
       { type: "xpShare", trigger: "onKill", value: 1,
         target: "allLuu", discardCondition: "onTrigger" }
       On next Rogue kill: award 1 XP to ALL friendly Luu
       Then discard immediately
  2. Call checkLevelUp for any Luu that received XP
  3. Log: { action: "xpShared", target, amount, source }
Triggers: checkLevelUp
Depends:  resolveEffect, checkEnemyDefeated (triggers fire from there)
Notes:    Shared Hunt and normal kill XP stack — killing Luu gets
          full xpOnDefeat, Shared Hunt Luu also gets xpOnDefeat.
          Colony Triumph fires once then self-discards (onTrigger).
          Multiple Shared Hunt copies would stack — each attached Luu
          receives xpOnDefeat independently on every kill.
```

---

### resolveLuuRecovery
```
Reads:    effect.searchFor, deck.discardPile, players[n].hand
Writes:   players[n].hand, deck.discardPile, turnLog
Logic:
  1. Reawakening:
     Filter deck.discardPile for cardType = "Luu" or "LuuEvolved"
     IF no Luu cards in discard: log warning, effect fails
     Present player with filtered list
     Player selects one Luu card
     Remove from discardPile
     Add to players[n].hand
  2. Log: { action: "luuRecovery", cardRecovered }
Triggers: None
Depends:  resolveEffect
Notes:    Recovered Luu goes to hand — player must still play it
          (costs Luutex, enters at back of queue).
          Different from Purification which places directly in queue.
          Salvage Protocol is more general — handled in resolveCardDraw.
          If discard pile has no Luu cards, Reawakening fails silently.
```

---

### resolveConversion
```
Reads:    effect.rules, activeEnemies, undraftedLuuPool,
          players[n].luuQueue
Writes:   activeEnemies, undraftedLuuPool, players[n].luuQueue,
          turnLog
Logic:
  1. Purification:
     a. Check condition: undraftedLuuPool must contain a base Luu
        of matching class to player's chosen target Rogue
        IF no matching undrafted Luu: card cannot be played
     b. Check queue limit:
        IF players[n].luuQueue.length >= getLuuQueueLimit(config.playerCount):
          card cannot be played — queue is full
        (both conditions validated in playCard before resolveEffect is called)
     c. Player selects target Rogue from activeEnemies
     c. Find matching base Luu in undraftedLuuPool
        (same class as target Rogue)
     d. Remove Rogue from activeEnemies
     e. Remove base Luu cardId from undraftedLuuPool
     f. Create new Luu queue entry:
        {
          queuePosition: last position + 1,
          cardId: converted Luu cardId,
          class: Rogue's class,
          level: 1,
          xp: 0,
          evolved: false,
          currentHp: stats.health[0] (full L1 HP),
          maxHp: stats.health[0],
          damageCounters: 0,
          defendStatus: false,
          actedThisTurn: false,
          bisluuBondTarget: null,
          activeEffects: []
        }
     g. Add to players[n].luuQueue at back
  2. Log: { action: "conversion", rogueConverted, luuAdded,
     undraftedPoolRemaining }
Triggers: None
Depends:  resolveEffect
Notes:    Converted Luu enters at L1 with full HP and 0 XP — confirmed.
          actedThisTurn = false — can act this round if Luu ahead
          in queue have not yet acted (Core Engine Principle 3).
          undraftedLuuPool shrinks by 1 each use — limited resource.
          If undraftedLuuPool for that class is empty, Purification
          cannot be played (condition checked in playCard validation).
          Rogue is removed from activeEnemies — no XP awarded for
          converted Rogue (it became a friendly, not defeated).
```

---

_Group 6 complete. 13 functions defined._
_Review before proceeding to Group 7 — Passive and Trait Triggers._

---

## Utility Functions (added as needed)

_Pure functions that return values or perform lookups. No side effects. Can be called from any group._

---

### getLuuQueueLimit
```
Reads:    config.playerCount OR config.luuQueueLimitTable
Writes:   Nothing — returns a value
Logic:
  1. Look up limit from config.luuQueueLimitTable:
     1 player → 5
     2 players → 4
     3 players → 3
     4 players → 2
  2. Return limit value
Triggers: None
Depends:  None
Notes:    Called by playCard (Luu and LuuEvolved validation) and
          resolveConversion (Purification validation).
          Returns integer. Caller compares against luuQueue.length.
```

---

### getHandLimit
```
Reads:    config.playerCount
Writes:   Nothing — returns a value
Logic:
  1. 1 player → 5, 2 → 4, 3 → 3, 4 → 2
  2. Return limit value
Triggers: None
Depends:  None
Notes:    Called by dealOpeningHand and endWave (discard down step).
          Same scaling as getLuuQueueLimit — intentional design symmetry.
```

---

## Group 7 — Passive and Trait Triggers

_Handles all class-specific passive abilities and traits for friendly Luu, evolved Luu, and Rogue Luu. These are not called directly by the player — they fire automatically at the correct moment based on trigger type._

---

### resolvePassiveTrigger
```
Reads:    triggering Luu passive/trait definition,
          trigger type passed in from calling function,
          game state (various)
Writes:   game state (various — depends on passive)
Logic:
  1. Read passive.trigger or trait.trigger
  2. Confirm trigger type matches what was passed in
  3. Route to appropriate passive handler:
     "onAttack"     → resolveOnAttackPassive
     "onDamaged"    → resolveOnDamagedPassive
     "onDefend"     → resolveOnDefendPassive
     "roundEnd"     → resolveRoundEndPassive
     "roundStart"   → resolveRoundStartPassive
     "passive"      → resolveAlwaysActivePassive
Triggers: appropriate passive handler
Depends:  calling function (resolveAttack, applyDamageToLuu etc.)
Notes:    Called from multiple points in the engine — each function
          calls this at the appropriate moment.
          resolveAttack calls this with "onAttack" after damage applied.
          applyDamageToLuu calls this with "onDamaged" after damage applied.
          resolveDefend calls this with "onDefend" when defend taken.
          endRound calls this with "roundEnd" for all Luu.
          startRound calls this with "roundStart" for boss passives.
          startPlayerTurn calls this with "turnStart" for Bisluu.
```

---

### resolveOnAttackPassive
```
Reads:    attacking Luu passive, target enemy hitThisRound,
          level-appropriate passive values
Writes:   attack value (via caller), turnLog
Logic:
  RASLUU — Predatory Strike / Apex Predator:
    Trigger: attacking Luu has this passive AND target.hitThisRound = true
    Base passive: bonusDamage[level-1] = 1 at all base levels
    Evolved passive: bonusDamage[level-1] = 2 at all evolved levels
    Add bonus to total attack in resolveAttack step 7
    NOTE: checked dynamically in resolveAttack — not stored as effect

  ROGUE RASLUU — Predatory Strike (scaled):
    Same trigger: target friendly Luu hitThisRound = true
    bonusDamage = trait.effect.bonusDamage (tier-dependent: 1/1/2/3)
    Add bonus to enemy totalAttack in resolveEnemySingleAttack

  LUUTEX TAP (action card effect, trigger = "onAttack"):
    Each time this Luu deals damage to a Rogue this round:
    Check if this Rogue instanceId already in this round's tap list
    IF new target: gain 1 Luutex, add to tap list
    IF already tapped this round: no additional Luutex
Triggers: None — modifies value in caller
Depends:  resolvePassiveTrigger
Notes:    Predatory Strike requires the TARGET to have been hit earlier
          in the same round by ANY friendly Luu — not just the attacker.
          hitThisRound flag set in resolveAttack after each hit.
          Luutex Tap tracks per-Rogue per-round — hitting same Rogue
          twice does not yield 2 Luutex.
```

---

### resolveOnDamagedPassive
```
Reads:    damaged Luu trait/passive, damage value,
          attacking enemy, game state
Writes:   damage value (modified before application),
          attacking enemy currentHp (Toxic Rebound),
          turnLog
Logic:
  KJELUU — Impervious (trait):
    Trigger: any damage incoming to Kjeluu
    IF damage <= trait.effect.damageThreshold[tier or level]:
      Set damage = 0
      Return modified damage to caller
    Handled in applyDamageToLuu step 2

  KJELUU — Hardened Shell / Fortress Form (passive):
    Trigger: any damage incoming to Kjeluu above Impervious threshold
    Reduce damage by damageReduction[level-1]
    Handled in applyDamageToLuu step 3

  GIFLUU — Phase Shift (trait):
    Trigger: any attack incoming to Gifluu
    Roll d6 (dice button, player clicks)
    IF result in evadeOn [6]: call handleEvasion — no damage applied
    IF evasion fails: damage proceeds normally
    IF evasion succeeds: Toxic Rebound does NOT fire
    Handled in resolveEnemySingleAttack step 6

  GIFLUU — Toxic Rebound / Venom Surge (passive):
    Trigger: Gifluu takes the Defend action AND damage lands (> 0)
    Deal reboundDamage[level-1] to attacking enemy
    Base: reboundDamage = [1,1,1], Evolved: [2,2,2]
    Call applyDamageToEnemy(attacker, reboundValue)
    Handled in applyDamageToLuu step 7

  ROGUE KJELUU — Impervious (trait, scaled by tier):
    Same as friendly Kjeluu but threshold scales: T1/T2=2, T3=3, T4=4
    Handled in applyDamageToEnemy step 2

  ROGUE GIFLUU — Phase Shift (trait, scaled rebound):
    Same evasion mechanic, evadeOn [6]
    Rebound scales by tier: T1/T2=1, T3=2, T4=3
    Handled in resolveAttack when friendly Luu attacks Rogue Gifluu

  FESLUU BOSS — Fortress Core:
    Impervious ≤3, first hit each round reduced by 1 after check
    bossFirstHitThisRound flag tracks whether first hit used
    Reset at startRound

  TOXLUU BOSS — Toxic Aura:
    Phase Shift on 5 or 6 (evadeOn [5,6])
    Rebound = ceil(evaded attack value / 2)
    Handled in resolveAttack when attacking Toxluu
Triggers: applyDamageToEnemy (Toxic Rebound), handleEvasion (Phase Shift)
Depends:  resolvePassiveTrigger
Notes:    Impervious checked BEFORE Hardened Shell — if blocked entirely
          by Impervious, Hardened Shell does not apply (already 0).
          Phase Shift checked BEFORE damage applied — if evaded,
          applyDamageToLuu is never called for that attack.
          Toxic Rebound requires BOTH: defend action taken AND damage > 0.
          Evasion prevents Toxic Rebound since damage = 0 (evaded).
```

---

### resolveOnDefendPassive
```
Reads:    defending Luu passive, defending Luu defendStatus
Writes:   turnLog (passive noted, actual effect fires in enemy phase)
Logic:
  GIFLUU — Toxic Rebound / Venom Surge:
    Trigger: Gifluu takes the Defend action
    Note: Toxic Rebound fires when the attacker hits, not when
    Defend action is taken. resolveDefend sets defendStatus = true.
    Toxic Rebound fires in applyDamageToLuu when damage > 0
    and defendStatus = true.
    Nothing fires here — this is handled via the onDamaged chain.
Triggers: None directly — sets up state for enemy phase
Depends:  resolvePassiveTrigger
Notes:    Only Gifluu has an onDefend passive currently.
          The defend action itself (-2 damage reduction) is not a passive —
          it is a base game rule applied in resolveEnemySingleAttack.
          Toxic Rebound is the passive that piggybacks on defend.
```

---

### resolveRoundEndPassive
```
Reads:    all Luu in play, their traits/passives,
          other Luu of same class in queue
Writes:   Luu currentHp, damageCounters, turnLog
Logic:
  LAGLUU — Pack Recovery (trait):
    Trigger: roundEnd, for each Lagluu in queue
    healAmount = count of OTHER Lagluu in same player's queue
    Heal that Lagluu by healAmount (1 HP per ally)
    Cannot exceed maxHp for current level
    Cannot revive from 0 HP
    Evolved Lagluu: same trait, same values

  ROGUE LAGLUU — Pack Recovery (trait, scaled):
    Trigger: roundEnd, for each Rogue Lagluu in activeEnemies
    healAmount = count of OTHER Rogue Lagluu still alive in wave
    Heal that Rogue Lagluu by trait.effect.healPerAlly (tier-scaled)
    T1/T2: heal 1 per ally, T3: heal 2, T4: heal 3
    Cannot exceed maxHp

  FORLUU BOSS — Resilient Core (passive):
    Trigger: roundEnd (called via resolveBossPassive)
    healAmount = lead friendly Luu damageCounters
    Cap at 3 HP per round
    activeBoss.currentHp += min(healAmount, 3)
    Cannot exceed activeBoss.maxHp for current sector
Triggers: None
Depends:  resolvePassiveTrigger, endRound
Notes:    All roundEnd passives fire after roundEnd effect cleanup —
          healing happens before the next round starts.
          Rogue Lagluu Pack Recovery means killing Lagluu first
          reduces healing for remaining ones.
          Forluu Resilient Core: keeping lead Luu healed denies Forluu
          healing — direct tactical interaction.
```

---

### resolveRoundStartPassive
```
Reads:    bosses.activeBoss, players[n].luuQueue,
          position.waveNumber
Writes:   temporary attack reduction on highest-attack Luu, turnLog
Logic:
  TJELUU BOSS — Symbiotic Drain (passive):
    Trigger: roundStart, wave 4 only (boss wave)
    Find friendly Luu with highest current baseAttack
    IF multiple Luu tied for highest: player chooses which is drained
    Apply temporary -1 to that Luu's effective baseAttack this round
    Store as { type: "tempAttackReduction", value: 1,
               source: "tjeluu", discardCondition: "endOfRound" }
    in affected Luu activeEffects
    Removed in endRound cleanup

  ROGUE BISLUU — Bonded Boost (trait):
    Trigger: roundStart (enemy phase start, before Rogues attack)
    Find adjacent Rogue Luu in wave positions ± 1
    Add attackBonus to each adjacent Rogue for this round
    T1/T2: +1, T3: +2, T4: +3
Triggers: None
Depends:  startRound
Notes:    Tjeluu drain fires before any player acts this round.
          Player choice on tied highest-attack Luu.
          Rogue Bisluu fires at enemy roundStart since wave positions
          do not change — static enough for pre-computation.
```

---

### resolveBisluuAdjacencyBonus
```
Reads:    active Luu queuePosition, all Luu in queue,
          Bisluu level and passive values (base or evolved)
Writes:   active Luu activeEffects (temporary bonuses), turnLog
Logic:
  Called at the START OF EACH LUU'S TURN (from startPlayerTurn)
  1. Check queue for Bisluu at queuePosition ± 1 from active Luu
  2. IF no Bisluu adjacent: return (no bonus)
  3. IF Bisluu found adjacent:
     Read Bisluu's current form (base or evolved) and level
     BASE Bisluu — Bonded Boost:
       Add to active Luu's activeEffects for this turn only:
       { type: "attackBonus", value: 1, discardCondition: "endOfTurn" }
       { type: "defenceBonus", value: 1, discardCondition: "endOfTurn" }
       { type: "gatherBonus", value: 1, discardCondition: "endOfTurn" }
     EVOLVED Bisluu — Deep Bond:
       { type: "attackBonus", value: 2, discardCondition: "endOfTurn" }
       { type: "defenceBonus", value: 2, discardCondition: "endOfTurn" }
       { type: "gatherBonus", value: 1, discardCondition: "endOfTurn" }
       { type: "xpBonus", value: 1, trigger: "onKill",
         discardCondition: "endOfTurn" }
  4. Log: { action: "bisluuBonus", bisluuId, targetLuu, bonuses }
Triggers: None — bonuses stored in activeEffects, read dynamically
Depends:  startPlayerTurn
Notes:    Called for EVERY Luu at the start of their turn — not just
          Luu that were adjacent at round start.
          This means:
          - Bisluu played mid-round: next Luu to act gets the bonus
          - Bisluu moves mid-round: new adjacent Luu get bonus when
            their turn starts, old adjacent Luu keep bonus already applied
          - Luu that acted before Bisluu entered: no retroactive bonus
          discardCondition = "endOfTurn" — bonus expires after this
          Luu's action. Add "endOfTurn" to the timing vocabulary.
          Bisluu itself does not get its own bonus (not adjacent to itself).
          If two Bisluu are in play and both adjacent to the same Luu:
          bonuses stack — apply twice.
```

### resolveAlwaysActivePassive
```
Reads:    Luu passive, current queue state, level
Writes:   Nothing directly — returns computed value to caller
Logic:
  LAGLUU — Colony Strength (base passive):
    Trigger: passive (always active)
    Count other Lagluu in same player's queue
    defenceBonus = count × defencePerAlly[level-1]
    Base: 1 per ally, Evolved: 2 per ally
    Called from resolveEnemySingleAttack when calculating damage
    to a Lagluu — read fresh each time

  LAGLUU — Swarm Mind (evolved passive):
    Same structure but also grants attackBonus
    attackBonus = count × attackPerAlly[level-1] = 1 per ally
    defenceBonus = count × 2
    Called from resolveAttack (attack bonus) and
    resolveEnemySingleAttack (defence bonus)

  KJELUU — Fortress Form adjacent reduction (evolved passive):
    For Luu adjacent to an evolved Kjeluu:
    adjacentDamageReduction = 1
    Applied in applyDamageToLuu step 5
    Read dynamically — check if evolved Kjeluu is adjacent
Triggers: None — pure read function
Depends:  resolvePassiveTrigger
Notes:    "Always active" passives are never stored — always computed
          fresh from current queue state.
          Colony Strength value changes instantly if a Lagluu is
          played, KO'd, or repositioned — no stale values.
          This is the clearest example of Core Engine Principle 2
          (dynamic checks, not pre-computed snapshots).
          Swarm Mind: both attack and defence bonuses computed same way.
```

---

_Group 7 complete. 7 functions defined._
_Review before proceeding to Group 8 — Evolution and Level Up Handling._

---

## Group 8 — Luu Placement, Evolution, and Remaining Utilities

_Handles placing Luu from hand, triggering evolution, and remaining utility functions needed across the engine._

---

### placeLuu
```
Reads:    card definition (cardType = "Luu"),
          players[n].luuQueue, config.playerCount,
          config.luuQueueLimitTable
Writes:   players[n].luuQueue, players[n].luutex.current,
          players[n].hand, turnLog
Logic:
  1. Validate queue not at limit:
     limit = getLuuQueueLimit(config.playerCount)
     IF luuQueue.length >= limit: return error "queue full"
     (already checked in playCard — double check here for safety)
  2. Determine new queue position:
     newPosition = luuQueue.length + 1 (always back of queue)
  3. Look up starting stats from card definition:
     hp = card.stats.health[0] (level 1 HP)
  4. Create new Luu queue entry:
     {
       queuePosition: newPosition,
       cardId: card.id,
       class: card.class,
       level: 1,
       xp: 0,
       evolved: false,
       currentHp: hp,
       maxHp: hp,
       damageCounters: 0,
       defendStatus: false,
       actedThisTurn: false,
       bisluuBondTarget: null,
       activeEffects: []
     }
  5. Append to players[n].luuQueue
  6. Remove card from players[n].hand
  7. Log: { action: "luuPlaced", cardId, position: newPosition }
Triggers: None
Depends:  playCard
Notes:    actedThisTurn = false — Luu can act this round if
          turns remain (Core Engine Principle 3).
          New Luu always enters at back of queue — no exceptions.
          Use Move action or Formation Override to reposition.
          If Bisluu is placed adjacent to existing Luu,
          resolveBisluuAdjacencyBonus will fire at start of
          adjacent Luu's next turn automatically.
          Luutex cost already deducted in playCard — not here.
```

---

### triggerEvolution
```
Reads:    evolved Luu card definition (cardType = "LuuEvolved"),
          target Luu in luuQueue, target Luu current XP,
          evolved card playCondition
Writes:   target Luu in luuQueue (stats, passive, evolved flag),
          players[n].hand, turnLog
Logic:
  1. Validate evolution target:
     a. Player selects target Luu from luuQueue
     b. Check playCondition.targetClass matches target Luu class
     c. Check target Luu level >= playCondition.targetMinLevel (3)
     d. Check target Luu evolved = false (not already evolved)
     e. IF any check fails: return error
  2. Apply evolution:
     a. Set target Luu evolved = true
     b. Keep current level (stays at L3 — does NOT jump to L4)
     c. Update stats to evolved card values at L3:
        newMaxHp = evolved card stats.health[0] (index 0 = L3)
        IF newMaxHp > current maxHp:
          difference = newMaxHp - maxHp
          maxHp = newMaxHp
          currentHp = min(currentHp + difference, newMaxHp)
          damageCounters = maxHp - currentHp
        NOTE: if Luu is damaged, HP scales up but damage stays:
          e.g. Rasluu L3 had 25 maxHp, 5 damage counters (20 HP)
          Evolved L3 has 27 maxHp → currentHp becomes 22, counters = 5
     d. baseAttack now reads from evolved card stats.baseAttack[0]
        (derived dynamically from card definition — not stored)
     e. Replace passive with evolved passive:
        Update passive to evolved card passive (name, description,
        trigger, effect values)
     f. Keep trait unchanged (Impervious, Pack Recovery etc.
        trait does not change on evolution — only passive changes)
     g. Keep xp value unchanged
  3. Check XP spillover:
     IF target Luu xp >= levelTrack.xpPerLevel (5):
       Call checkLevelUp(target Luu)
       Luu immediately advances to L4 evolved
  4. Remove evolved card from players[n].hand
  5. Move evolved card to deck.discardPile
  6. Log: { action: "evolution", luu, newStats, xpSpillover }
Triggers: checkLevelUp (if xp spillover)
Depends:  playCard
Notes:    Evolution costs 0 Luutex — cost already validated in playCard.
          consumesAction = false — player can still act after evolving.
          Health adjustment on evolution is additive:
          new HP = old HP + (new maxHp - old maxHp), capped at new maxHp.
          Damage counters are preserved — evolution does NOT fully heal.
          Only exception: if evolved maxHp < current HP somehow
          (shouldn't happen by design) — clamp currentHp to new maxHp.
          Trait stays the same (Kjeluu Impervious threshold stays at 2
          through L3 base, L3 evolved — only changes on level up).
          baseAttack is always derived from card definition + level —
          never stored directly.
```

---

### validateEvolution
```
Reads:    evolved card playCondition, target Luu in luuQueue
Writes:   Nothing — returns boolean
Logic:
  1. Check playCondition.targetCardType = "Luu" — target must be base form
  2. Check playCondition.targetClass matches target Luu class
  3. Check target Luu level >= playCondition.targetMinLevel (3)
  4. Check target Luu evolved = false
  5. IF all pass: return true
  6. IF any fail: return false with reason
Triggers: None — pure validation
Depends:  None
Notes:    Called from playCard before deducting cost or removing card
          from hand. Fails gracefully — card stays in hand if invalid.
          Player cannot evolve an already-evolved Luu.
          Player cannot evolve a Luu below L3.
          Class mismatch (e.g. Rasluu Evolution on Kjeluu) blocked here.
```

---

### checkCondition
```
Reads:    effect.condition, game state (various)
Writes:   Nothing — returns boolean
Logic:
  1. Read condition.type and route:
     "playerMustHaveCardInHand":
       Return players[n].hand.length > 0
     "discardPileNotEmpty":
       Return deck.discardPile.length > 0
     "discardPileContainsLuu":
       Return deck.discardPile has any card with
       cardType = "Luu" or "LuuEvolved"
     "undraftedLuuExists":
       Return undraftedLuuPool has entry matching
       condition.matchClass = target Rogue class
     "luuInPlay":
       Return players[n].luuQueue has Luu matching
       condition.class with count >= condition.minCount
     "targetHpAbove":
       Return target Luu currentHp > condition.value
     "targetHasDamageCounters":
       Return target enemy damageCounters > 0
     "killedByAttachedLuu":
       Return killing Luu instanceId = effect.attachedTo
     "damageDealtThisTurn":
       Return sum of damage in roundTracking this turn > 0
     "diceCheckPass":
       Return dice roll result is in effect.diceCheck.passOn array
  2. Return true or false to caller
Triggers: None — pure validation
Depends:  None
Notes:    Called from playCard (card-level conditions) and
          resolveEffect (effect-level conditions).
          If condition returns false: that effect is skipped.
          For Pack Call conditional free play: condition checks
          if Lagluu in play AFTER deck search resolves —
          second effect in array fires only if condition passes.
```

---

### applyDamageToEnemy
```
Reads:    target enemy stats, target enemy trait (Impervious),
          attack value passed in, bosses.activeBoss (if boss wave),
          bosses.activeBoss.bossFirstHitThisRound (Fesluu)
Writes:   target enemy currentHp, target enemy damageCounters,
          roundTracking.damageDealtToEnemiesThisRound,
          bosses.activeBoss.bossFirstHitThisRound, turnLog
Logic:
  1. Receive totalAttack value from caller
  2. IF target is a Rogue Luu (not boss):
     a. Check Impervious trait if present:
        IF totalAttack <= trait.effect.damageThreshold:
          damage = 0, log blocked, return
     b. Apply damage:
        target.currentHp -= totalAttack
        target.damageCounters = target.maxHp - target.currentHp
        target.currentHp = max(0, target.currentHp)
     c. Update roundTracking:
        damageDealtToEnemiesThisRound[instanceId] += totalAttack
  3. IF target is boss:
     a. Check Fesluu Fortress Core:
        Impervious check: IF totalAttack <= 3: damage = 0, return
        IF bossFirstHitThisRound = true AND totalAttack > 3:
          totalAttack -= 1 (first hit reduction)
          Set bossFirstHitThisRound = false
     b. Apply damage to activeBoss.currentHp
        activeBoss.currentHp = max(0, activeBoss.currentHp - totalAttack)
  4. Log: { action: "damageToEnemy", target, rawDamage,
     finalDamage, hpAfter, imperviousBlocked }
Triggers: None — caller checks defeat
Depends:  None — utility function
Notes:    Always route enemy damage through this function —
          Core Engine Principle 6.
          Toxic Rebound damage to enemy also routes here.
          Boss damage goes to activeBoss.currentHp not activeEnemies.
          bossFirstHitThisRound resets to true at startRound.
```

---

### placeLuuFromStarterPool
```
Reads:    starterPool.startingLuuDrawn, starterPool.remainingDiscarded
Writes:   players[n].luuQueue, deck.discardPile, starterPool
Logic:
  1. Randomly select one cardId from starterPool.cards
  2. Set starterPool.startingLuuDrawn = selected cardId
  3. Look up stats from card definition
  4. Create Luu queue entry at position 1:
     {
       queuePosition: 1,
       cardId: selected,
       class: [from card definition],
       level: 1,
       xp: 0,
       evolved: false,
       currentHp: stats.health[0],
       maxHp: stats.health[0],
       damageCounters: 0,
       defendStatus: false,
       actedThisTurn: false,
       bisluuBondTarget: null,
       activeEffects: []
     }
  5. Set players[n].luuQueue = [above entry]
  6. Add remaining 4 starter cards to deck.discardPile
  7. Set starterPool.remainingDiscarded = remaining 4 cards
  8. Log: { action: "startingLuuPlaced", cardId: selected }
Triggers: None
Depends:  initStarterPool
Notes:    Only called once at game start from drawStartingLuu.
          Remaining starters go to discard immediately — available
          from turn 1 for Reawakening and Salvage Protocol.
          Multiplayer: called once per player, without replacement.
          No two players can have the same starting class.
```

---

_Group 8 complete. 6 functions defined._
_Rules engine map is now functionally complete for solo playtesting._
_Remaining work before Stage 4: final review pass, then sign off._
