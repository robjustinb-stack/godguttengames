# Mission LUU — Rules Document
_Version 3.0 — Updated to reflect all confirmed Stage 4/5 design decisions_

## Overview
Mission LUU is a solo (or cooperative multiplayer) card game. Players control a team of friendly Luu creatures defending against waves of Rogue Luu across 5 sectors. Win by defeating the boss in Sector 5. Lose if all friendly Luu are knocked out.

---

## Setup

### Starter Deck
The game uses a 50-card starter deck:
- 13 base Luu cards (Rasluu ×3, Lagluu ×2, Kjeluu ×2, Gifluu ×2, Bisluu ×2, plus evolved copies)
- 37 action cards (one of each)

### Starting Luu
Before the game begins, one base Luu card is randomly selected from the starter pool (one of each class) and placed in the queue at position 1. The remaining 4 starter Luu are removed from play entirely — they do not enter the deck or discard pile.

### Luu Reserve Pool
One copy of each base Luu class is set aside in the Luu Reserve Pool. These cards are only accessible via the Purification card.

### Opening Hand
- Solo: draw 5 cards
- 2 players: draw 4 cards each
- 3 players: draw 3 cards each
- 4 players: draw 2 cards each

### Solo Mulligan
If the opening hand contains no base Luu cards (evolved Luu cards do not count), the player may take one mulligan — return all cards to the deck, shuffle, and redraw. The player may also choose to keep the original hand. One mulligan available per game, opening hand only.

### Starting Luutex
Each player starts with 5 Luutex.

---

## Turn Structure

### Round Sequence
1. **Player Turns** — each friendly Luu takes one action in queue order (position 1 first), unless Override is active
2. **Enemy Attack Phase** — each Rogue Luu attacks the lead Luu (position 1)
3. **End of Round** — passive effects resolve (Pack Recovery, Forluu Resilient Core), then next round begins

### Player Actions
Each Luu takes exactly one action per round:
- **Attack** — attack a target Rogue Luu
- **Defend** — set defend status (+2 damage reduction this round)
- **Gather** — gain 1 Luutex (2 if Bisluu adjacent)
- **Move** — swap with adjacent Luu in queue (±1 position)

### Playing Cards
Cards are played from hand before or instead of a Luu action. Cards cost Luutex to play.
- Cards with `consumesAction: true` use the Luu's action for that turn
- Cards with `consumesAction: false` (Override, Formation Override, Passive Harvest, Tactical Shift) do not consume the action

### Luu Queue Limits
- Solo: max 5 Luu
- 2 players: max 4 Luu each
- 3 players: max 3 Luu each
- 4 players: max 2 Luu each

---

## Combat

### Attack Calculation
Total attack = base attack + dice roll + type modifier + passive bonuses + active effect bonuses

### Type Modifiers
- Attacker beats target class: +1 damage
- Attacker loses to target class: -1 damage (minimum 0)
- Bisluu: neutral (no modifier)

Counter loop: Rasluu beats Gifluu → Gifluu beats Kjeluu → Kjeluu beats Lagluu → Lagluu beats Rasluu

### Sector Dice
- S1: d4
- S2: d6
- S3: d8
- S4: d4 + d6
- S5: d4 + d8

### Damage to Enemies
All damage routes through `applyDamageToEnemy`:
- Impervious: attacks at or below threshold deal 0 damage

### Damage to Friendly Luu
All damage routes through `applyDamageToLuu` in this order:
1. Phase Shift evasion check (Gifluu trait) — roll d6, evade on 6
2. Defend status reduction (-2 damage, minimum 0)
3. Hardened Shell passive (Kjeluu) — reduce by 1
4. Impervious trait (Kjeluu) — block if at or below threshold
5. Apply final damage
6. Toxic Rebound check (Gifluu passive)

### Toxic Rebound
Fires whenever Gifluu takes damage from a direct attack, regardless of defend status. Does NOT fire on:
- Overflow damage
- Rebound damage received from a Rogue Gifluu
- Phase Shift evasion (no damage taken)

Rebound chain cap: rebound damage cannot trigger a second rebound. The chain always stops after one rebound.

Toxic Rebound damage bypasses Kjeluu's Impervious trait. Rebound is poison damage — Kjeluu's shell cannot block it.

### Overflow Damage
When an attack kills the lead Luu and has remaining damage:
- Overflow = actual damage dealt minus lead Luu's HP before the attack
- Carries to the next Luu in queue (new position 1)
- Type modifiers are NOT recalculated — overflow is neutral
- Hardened Shell applies to overflow
- Impervious applies to overflow
- Phase Shift applies to overflow
- Toxic Rebound does NOT apply to overflow

---

## Luu Classes

### Rasluu — Apex Predator
- **Passive:** Predatory Strike — +1 damage when attacking a target already hit by another friendly Luu this round
- **No class trait**
- Beats Gifluu, loses to Lagluu

### Lagluu — Colony Organism
- **Passive:** Colony Strength — +1 defence per other Lagluu in play
- **Trait:** Pack Recovery — at end of each round, recovers 1 HP per other Lagluu in play. Cannot recover from 0 HP. Cannot exceed max HP.
- Beats Rasluu, loses to Kjeluu

### Kjeluu — Armoured Defender
- **Passive:** Hardened Shell — reduce all incoming damage by 1
- **Trait:** Impervious — attacks of 2 or less deal 0 damage (base). Threshold increases on level up.
- Beats Lagluu, loses to Gifluu

### Gifluu — Toxic Evader
- **Passive:** Toxic Rebound — when Gifluu takes damage from a direct attack, attacker takes 1 damage (base) or 2 damage (evolved). Does not trigger on overflow or rebound damage.
- **Trait:** Phase Shift — when attacked, roll d6. On a 6, evade all damage. If evasion succeeds, Toxic Rebound does not trigger.
- Beats Kjeluu, loses to Rasluu

### Bisluu — Cooperative Amplifier
- **Passive:** Bonded Boost — all adjacent Luu gain +1 attack, +1 defence, +1 Luutex on Gather
- **No class trait**
- Neutral (no counter loop position)

---

## Levelling and Evolution

### XP and Level Up
- 5 XP = level up at every level
- XP awarded to the Luu that lands the killing blow on a Rogue
- Boss defeat: 5 XP per player, distributed freely
- Level cap: L3 base, L5 evolved
- Cannot level past L3 without evolving first

### Evolution
- Play an evolved card from hand onto a L3 base Luu of matching class
- Costs 0 Luutex
- Does not consume action
- HP scales up additively (new maxHp - old maxHp added to current HP)
- Damage counters preserved
- XP carries over — if 5+ XP banked, immediately levels up to L4

---

## Wave and Sector Structure

### Waves
- 3 Rogue waves per sector, then 1 boss wave
- Solo: 2 Rogues per wave
- Rogues per wave = player count + 1

### Wave End
- Draw 1 card after each wave
- Discard down to hand limit at end of wave
- Hand limit = same as opening hand limit by player count

### Boss Wave
- Wave 4 in each sector
- Boss is placed as the sole enemy
- All Rogue Luu of the same class as the sector boss gain +1 base attack in that sector

### Sector Progression
- S1 boss is always Tjeluu
- S2–S5 bosses are drawn randomly from the remaining pool
- Clearing all 5 sectors wins the game

---

## Deck Management

### Drawing Cards
- Draw from top of draw pile
- If draw pile is empty: remove one random card from discard pile permanently, shuffle discard into new draw pile

### Discard Pile
- Action cards go to discard after use (unless permanent)
- Evolved Luu cards go to discard after evolution
- Starter Luu remainders are removed from play entirely (not discarded)

### Luu Reserve Pool
- Contains one of each base Luu class
- Only accessible via Purification card
- Not part of the deck or discard pile

---

## Win and Lose Conditions

### Win
Defeat the boss in Sector 5.

### Lose
All friendly Luu are knocked out simultaneously (queue reaches 0).

---

## Multiplayer Notes
_(Stage 14 — not yet implemented)_
- Players share one deck and one discard pile
- Each player has their own Luu queue and hand
- Enemy damage divided by player count (round up)
- Draft replaces starter deck for full game