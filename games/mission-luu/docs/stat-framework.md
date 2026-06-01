# Mission LUU — Stat Framework
_Version 2.0 — Updated to reflect all confirmed Stage 4/5 design decisions_

---

## Friendly Luu — Rasluu

**Class:** Apex — Aggressive Predator
**Counter loop:** Beats Gifluu · Loses to Lagluu
**Class Trait:** None

### Stats by Level

| Level | Form | Health | Base Attack | Passive |
|-------|------|--------|-------------|---------|
| 1 | Base | 15 | 1 | Predatory Strike: +1 dmg when attacking a target already hit by another friendly Luu this round |
| 2 | Base | 20 | 3 | Predatory Strike |
| 3 | Base | 25 | 5 | Predatory Strike |
| 3 | Evolved | 27 | 6 | Apex Predator: +2 dmg when attacking a target already hit by another friendly Luu this round |
| 4 | Evolved | 30 | 7 | Apex Predator |
| 5 | Evolved | 35 | 9 | Apex Predator |

---

## Friendly Luu — Lagluu

**Class:** Pack — Colony Organism
**Counter loop:** Beats Rasluu · Loses to Kjeluu
**Class Trait:** Pack Recovery — at end of each round, recovers 1 HP per other Lagluu in play. Cannot recover from 0 HP. Cannot exceed base HP for current level.

### Stats by Level

| Level | Form | Health | Base Attack | Passive |
|-------|------|--------|-------------|---------|
| 1 | Base | 12 | 0 | Colony Strength: +1 defence per other Lagluu in play |
| 2 | Base | 16 | 2 | Colony Strength |
| 3 | Base | 20 | 4 | Colony Strength |
| 3 | Evolved | 22 | 5 | Swarm Mind: +2 defence and +1 attack per other Lagluu in play |
| 4 | Evolved | 26 | 6 | Swarm Mind |
| 5 | Evolved | 30 | 7 | Swarm Mind |

---

## Friendly Luu — Kjeluu

**Class:** Colossus — Armoured Defender
**Counter loop:** Beats Lagluu · Loses to Gifluu
**Class Trait:** Impervious — any attack dealing 2 or less damage to Kjeluu deals 0 instead.

### Stats by Level

| Level | Form | Health | Base Attack | Passive |
|-------|------|--------|-------------|---------|
| 1 | Base | 20 | 0 | Hardened Shell: reduce all incoming damage to Kjeluu by 1 |
| 2 | Base | 27 | 2 | Hardened Shell |
| 3 | Base | 34 | 4 | Hardened Shell |
| 3 | Evolved | 36 | 5 | Fortress Form: reduce incoming damage to Kjeluu by 2, and to adjacent friendly Luu by 1 |
| 4 | Evolved | 40 | 6 | Fortress Form |
| 5 | Evolved | 46 | 8 | Fortress Form |

> **Note:** Impervious + Hardened Shell stack. A L1 Kjeluu ignores hits of 2 or less, then reduces remaining hits by 1.

---

## Friendly Luu — Gifluu

**Class:** Phantom — Toxic Evader
**Counter loop:** Beats Kjeluu · Loses to Rasluu
**Class Trait:** Phase Shift — when attacked, roll a d6. On a 6, evade all damage. If evasion succeeds, Toxic Rebound does not trigger.

### Stats by Level

| Level | Form | Health | Base Attack | Passive |
|-------|------|--------|-------------|---------|
| 1 | Base | 15 | 0 | Toxic Rebound: when Gifluu takes damage from a direct attack, attacker takes 1 damage |
| 2 | Base | 20 | 2 | Toxic Rebound |
| 3 | Base | 25 | 3 | Toxic Rebound |
| 3 | Evolved | 27 | 4 | Venom Surge: when Gifluu takes damage from a direct attack, attacker takes 2 damage |
| 4 | Evolved | 30 | 5 | Venom Surge |
| 5 | Evolved | 35 | 6 | Venom Surge |

> **Toxic Rebound clarification:** Fires on any direct attack that deals damage, regardless of defend status. Does NOT fire on overflow damage, rebound damage received, or when Phase Shift evasion succeeds. Rebound chain cap: rebound damage cannot trigger a second rebound.
> Impervious bypass: Toxic Rebound damage bypasses Kjeluu Impervious. Rebound is treated as poison damage, not physical strike damage.

---

## Friendly Luu — Bisluu

**Class:** Symbiont — Cooperative Amplifier
**Counter loop:** Outside loop — pure support
**Class Trait:** None

### Stats by Level

| Level | Form | Health | Base Attack | Passive |
|-------|------|--------|-------------|---------|
| 1 | Base | 15 | 0 | Bonded Boost: all Luu immediately adjacent to Bisluu gain +1 attack, +1 defence, and +1 Luutex when they Gather this turn |
| 2 | Base | 20 | 2 | Bonded Boost |
| 3 | Base | 25 | 4 | Bonded Boost |
| 3 | Evolved | 27 | 5 | Deep Bond: all Luu immediately adjacent to Bisluu gain +2 attack, +2 defence, +1 XP, and +1 Luutex when they Gather this turn |
| 4 | Evolved | 30 | 6 | Deep Bond |
| 5 | Evolved | 35 | 8 | Deep Bond |

---

## Rogue Luu — Rasluu

| Tier | HP | Base Attack | XP on Defeat | Trait |
|------|----|----|---|---|
| 1 | 8 | 1 | 1 | Predatory Strike +1 |
| 2 | 10 | 2 | 2 | Predatory Strike +1 |
| 3 | 12 | 5 | 3 | Predatory Strike +2 |
| 4 | 20 | 7 | 4 | Predatory Strike +3 |

---

## Rogue Luu — Lagluu

| Tier | HP | Base Attack | XP on Defeat | Trait |
|------|----|----|---|---|
| 1 | 9 | 1 | 1 | Pack Recovery +1 HP per other Rogue Lagluu in wave |
| 2 | 12 | 1 | 2 | Pack Recovery +1 HP per other Rogue Lagluu in wave |
| 3 | 15 | 3 | 3 | Pack Recovery +2 HP per other Rogue Lagluu in wave |
| 4 | 20 | 5 | 4 | Pack Recovery +3 HP per other Rogue Lagluu in wave |

---

## Rogue Luu — Kjeluu

| Tier | HP | Base Attack | XP on Defeat | Trait |
|------|----|----|---|---|
| 1 | 12 | 1 | 1 | Impervious: attacks ≤2 deal 0 |
| 2 | 16 | 2 | 2 | Impervious: attacks ≤2 deal 0 |
| 3 | 20 | 4 | 3 | Impervious: attacks ≤3 deal 0 |
| 4 | 28 | 6 | 4 | Impervious: attacks ≤4 deal 0 |

---

## Rogue Luu — Gifluu

| Tier | HP | Base Attack | XP on Defeat | Trait |
|------|----|----|---|---|
| 1 | 9 | 1 | 1 | Phase Shift: evade on 6, +1 rebound on direct hit |
| 2 | 12 | 2 | 2 | Phase Shift: evade on 6, +1 rebound on direct hit |
| 3 | 15 | 3 | 3 | Phase Shift: evade on 6, +2 rebound on direct hit |
| 4 | 20 | 4 | 4 | Phase Shift: evade on 6, +3 rebound on direct hit |

> Rebound chain cap: rebound damage from a Rogue Gifluu hitting a friendly Gifluu does NOT trigger a second rebound.

---

## Rogue Luu — Bisluu

| Tier | HP | Base Attack | XP on Defeat | Trait |
|------|----|----|---|---|
| 1 | 8 | 1 | 1 | Bonded Boost: +1 attack to all adjacent Rogues |
| 2 | 10 | 2 | 2 | Bonded Boost: +1 attack to all adjacent Rogues |
| 3 | 12 | 3 | 3 | Bonded Boost: +2 attack to all adjacent Rogues |
| 4 | 18 | 5 | 4 | Bonded Boost: +3 attack to all adjacent Rogues |

---

## Boss Cards

### Tjeluu — Corrupted Symbiont (S1 always)

| Sector | HP | Base Attack | Boss Passive |
|--------|-----|-------------|-------|
| S1 | 40 | 6 | Symbiotic Drain: start of each round, the friendly Luu with the highest current base attack loses 1 base attack this round |
| S2 | 55 | 11 | Symbiotic Drain |
| S3 | 72 | 14 | Symbiotic Drain |
| S4 | 90 | 17 | Symbiotic Drain |
| S5 | 110 | 20 | Symbiotic Drain |

### Lynluu — Apex Predator (Rasluu class)

| Sector | HP | Base Attack | Boss Passive |
|--------|-----|-------------|-------|
| S2 | 45 | 13 | Wounded Prey: deals +2 damage when the attacked Luu has any existing damage counters |
| S3 | 60 | 17 | Wounded Prey |
| S4 | 76 | 21 | Wounded Prey |
| S5 | 93 | 25 | Wounded Prey |

### Forluu — Colony Patriarch (Lagluu class)

| Sector | HP | Base Attack | Boss Passive |
|--------|-----|-------------|-------|
| S2 | 42 | 9 | Resilient Core: end of each round, recover 1 HP per damage counter on the leading friendly Luu. Maximum 3 HP per round |
| S3 | 56 | 12 | Resilient Core |
| S4 | 70 | 15 | Resilient Core |
| S5 | 86 | 18 | Resilient Core |

### Fesluu — Fortress Prime (Kjeluu class)

| Sector | HP | Base Attack | Boss Passive |
|--------|-----|-------------|-------|
| S2 | 60 | 7 | Fortress Core: attacks ≤3 deal 0. First hit each round above threshold reduced by 1 |
| S3 | 80 | 9 | Fortress Core |
| S4 | 100 | 12 | Fortress Core |
| S5 | 122 | 14 | Fortress Core |

### Toxluu — Phantom Sovereign (Gifluu class)

| Sector | HP | Base Attack | Boss Passive |
|--------|-----|-------------|-------|
| S2 | 48 | 9 | Toxic Aura: evades on 5 or 6. On evasion, deals rebound damage equal to half the evaded attack (round up) |
| S3 | 63 | 12 | Toxic Aura |
| S4 | 79 | 15 | Toxic Aura |
| S5 | 97 | 18 | Toxic Aura |

---

## Sector Dice Reference

| Sector | Dice | Min | Avg | Max |
|--------|------|-----|-----|-----|
| S1 | d4 | 1 | 2.5 | 4 |
| S2 | d6 | 1 | 3.5 | 6 |
| S3 | d8 | 1 | 4.5 | 8 |
| S4 | d4+d6 | 2 | 6.0 | 10 |
| S5 | d4+d8 | 2 | 7.0 | 12 |

---

## Confirmed Design Decisions

- Health resets to full on evolution
- Rogue Luu tiers 1–4 are wave enemies; 5 boss cards total
- S1 boss is always Tjeluu
- Boss card stats scale by sector — printed as range on card
- Rogue Luu of same class as sector boss gain +1 base attack in that sector
- Boss XP reward: 5 XP per player on defeat, distributed freely
- Rogue Luu XP reward: granted only to the Luu that lands the killing blow
- Type modifier: counter advantage = +1 damage, counter disadvantage = -1 (minimum 0). Bisluu neutral.
- Resource name: Luutex. Gather yields 1 Luutex. Bisluu passive boosts adjacent Luu gather to 2.
- XP threshold: 5 XP = level up at every level
- Toxic Rebound fires on any direct hit regardless of defend status
- Overflow damage is neutral — type modifiers not recalculated
- Rebound damage cannot chain — one rebound maximum per attack sequence
- Starter pool remainders removed from play entirely after starting Luu is chosen
- Luu Reserve Pool contains one of each base class for Purification card use only