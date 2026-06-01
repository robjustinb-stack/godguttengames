# LUU — Stat Framework
_Stage 2 design document. Updated as decisions are confirmed._

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

> **Note:** On evolution, the Luu stays at L3 with the evolved card's L3 stats. XP carries over — if 5 XP banked at evolution, the Luu immediately levels up to L4 evolved.

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

> **Note:** Impervious + Hardened Shell stack. A L1 Kjeluu ignores hits of 2 or less, then reduces remaining hits by 1. Effective HP is significantly higher than raw values suggest. On evolution, Kjeluu stays at L3 with improved stats.

---

## Friendly Luu — Gifluu

**Class:** Phantom — Toxic Evader  
**Counter loop:** Beats Kjeluu · Loses to Rasluu  
**Class Trait:** Phase Shift — when a Rogue Luu attacks, roll a d6 for each active Gifluu. On a 6, that Gifluu evades all damage from that attack. Rolled per attacker, per active Gifluu. If evasion succeeds, Toxic Rebound does not trigger.

### Stats by Level

| Level | Form | Health | Base Attack | Passive |
|-------|------|--------|-------------|---------|
| 1 | Base | 15 | 0 | Toxic Rebound: when Gifluu defends, attacker takes 1 damage |
| 2 | Base | 20 | 2 | Toxic Rebound |
| 3 | Base | 25 | 3 | Toxic Rebound |
| 3 | Evolved | 27 | 4 | Venom Surge: when Gifluu defends, attacker takes 2 damage |
| 4 | Evolved | 30 | 5 | Venom Surge |
| 5 | Evolved | 35 | 6 | Venom Surge |

> **Note:** Low base attack is intentional. Gifluu's effective damage output includes Toxic Rebound / Venom Surge on defence turns.

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
| 1 | 10 | 1 | 1 | Predatory Strike +1 |
| 2 | 12 | 2 | 2 | Predatory Strike +1 |
| 3 | 20 | 5 | 3 | Predatory Strike +2 |
| 4 | 30 | 7 | 4 | Predatory Strike +3 |

> Tiers 1–4 are wave enemies. Each class also has a separate Boss card per sector (sectors 1–5), above Tier 4 in power.

---

## Rogue Luu — Lagluu

| Tier | HP | Base Attack | XP on Defeat | Trait |
|------|----|----|---|---|
| 1 | 12 | 1 | 1 | Pack Recovery +1 HP per other Rogue Lagluu in wave |
| 2 | 15 | 1 | 2 | Pack Recovery +1 HP per other Rogue Lagluu in wave |
| 3 | 20 | 3 | 3 | Pack Recovery +2 HP per other Rogue Lagluu in wave |
| 4 | 26 | 5 | 4 | Pack Recovery +3 HP per other Rogue Lagluu in wave |

> Pack Recovery triggers at end of each round. Cannot exceed base HP for that tier. HP buffed from original 8/10/14/18 to 12/15/20/26 to ensure Phase Shift and Pack Recovery traits have time to matter in combat.

---

## Rogue Luu — Kjeluu

| Tier | HP | Base Attack | XP on Defeat | Trait |
|------|----|----|---|---|
| 1 | 16 | 1 | 1 | Impervious: attacks ≤2 deal 0 |
| 2 | 20 | 2 | 2 | Impervious: attacks ≤2 deal 0 |
| 3 | 28 | 4 | 3 | Impervious: attacks ≤3 deal 0 |
| 4 | 38 | 6 | 4 | Impervious: attacks ≤4 deal 0 |

> Rogue Kjeluu HP is set just below friendly Kjeluu HP at equivalent tiers — Impervious makes effective HP significantly higher than raw values suggest. T4 Rogue Kjeluu (38 HP) vs friendly L5 Kjeluu (40 HP) is intentional: friendly edges it out, but Rogue's Impervious threshold is higher (≤4 vs friendly ≤2).

---

## Rogue Luu — Gifluu

| Tier | HP | Base Attack | XP on Defeat | Trait |
|------|----|----|---|---|
| 1 | 12 | 1 | 1 | Phase Shift: evade on 6, +1 rebound |
| 2 | 15 | 2 | 2 | Phase Shift: evade on 6, +1 rebound |
| 3 | 20 | 3 | 3 | Phase Shift: evade on 6, +2 rebound |
| 4 | 26 | 4 | 4 | Phase Shift: evade on 6, +3 rebound |

> HP buffed from original 8/10/14/18 to 12/15/20/26 — same profile as Rogue Lagluu. Both are fragile classes but need enough HP for their traits to trigger meaningfully. No healing mechanic — Phase Shift evasion is the sole source of durability.

---

## Rogue Luu — Bisluu

| Tier | HP | Base Attack | XP on Defeat | Trait |
|------|----|----|---|---|
| 1 | 10 | 1 | 1 | Bonded Boost: +1 attack to all adjacent Rogues |
| 2 | 12 | 2 | 2 | Bonded Boost: +1 attack to all adjacent Rogues |
| 3 | 18 | 3 | 3 | Bonded Boost: +2 attack to all adjacent Rogues |
| 4 | 24 | 5 | 4 | Bonded Boost: +3 attack to all adjacent Rogues |

> Two Rogue Bisluu in same wave is possible — both traits fire independently. Each buffs its own neighbours. Priority target in most waves.

---

## Boss Cards

Boss cards scale by sector (1–5) — stats printed as a range on the card, keyed to which sector the boss is encountered in. All Rogue Luu of the same class as the active sector boss gain **+1 base attack** in that sector.

---

### Tjeluu — Corrupted Symbiont (Bisluu class boss)

| Sector | HP | Base Attack | Boss Passive |
|--------|-----|-------------|-------|
| S1 | 40 | 6 | Symbiotic Drain: start of each round, the friendly Luu with the highest current base attack loses 1 base attack this round |
| S2 | 55 | 11 | Symbiotic Drain |
| S3 | 72 | 14 | Symbiotic Drain |
| S4 | 90 | 17 | Symbiotic Drain |
| S5 | 110 | 20 | Symbiotic Drain |

> Tjeluu has no counter loop position — no type modifier applies. S1 boss is always Tjeluu. Boss XP: 5 XP per player on defeat, distributed freely.

---

### Lynluu — Apex Predator (Rasluu class boss)

| Sector | HP | Base Attack | Boss Passive |
|--------|-----|-------------|-------|
| S2 | 45 | 13 | Wounded Prey: deals +2 damage when the attacked Luu has any existing damage counters |
| S3 | 60 | 17 | Wounded Prey |
| S4 | 76 | 21 | Wounded Prey |
| S5 | 93 | 25 | Wounded Prey |

> Lynluu rewards players who rotate damaged Luu out of the front position. Heal before engaging or accept the +2 damage penalty. Counter loop: Lynluu beats Toxluu, loses to Forluu.

---

### Forluu — Colony Patriarch (Lagluu class boss)

| Sector | HP | Base Attack | Boss Passive |
|--------|-----|-------------|-------|
| S2 | 42 | 9 | Resilient Core: end of each round, recover 1 HP per damage counter on the leading friendly Luu. Maximum 3 HP per round |
| S3 | 56 | 12 | Resilient Core |
| S4 | 70 | 15 | Resilient Core |
| S5 | 86 | 18 | Resilient Core |

> Forluu feeds off your Luu's suffering. Healing your front Luu denies Forluu's recovery but costs actions. Race it down or keep your Luu healthy — you can't easily do both. Counter loop: Forluu beats Lynluu, loses to Fesluu.

---

### Fesluu — Fortress Prime (Kjeluu class boss)

| Sector | HP | Base Attack | Boss Passive |
|--------|-----|-------------|-------|
| S2 | 60 | 7 | Fortress Core: attacks ≤3 deal 0. The first hit each round that exceeds the threshold is reduced by 1 (resolved after Impervious check) |
| S3 | 80 | 9 | Fortress Core |
| S4 | 100 | 12 | Fortress Core |
| S5 | 122 | 14 | Fortress Core |

> Fesluu is the hardest boss to grind down. Players need attacks of 4+ to deal any damage, and the first hit each round is further reduced. Multiple attackers per round are essential. Counter loop: Fesluu beats Forluu, loses to Toxluu.

---

### Toxluu — Phantom Sovereign (Gifluu class boss)

| Sector | HP | Base Attack | Boss Passive |
|--------|-----|-------------|-------|
| S2 | 48 | 9 | Toxic Aura: evades on a 5 or 6 (33%). On evasion, deals rebound damage equal to half the evaded attack value (round up) |
| S3 | 63 | 12 | Toxic Aura |
| S4 | 79 | 15 | Toxic Aura |
| S5 | 97 | 18 | Toxic Aura |

> Toxluu punishes high-damage attacks — a powerful strike that gets evaded deals significant rebound. Measured, consistent attacks are more effective than all-in strikes. Counter loop: Toxluu beats Fesluu, loses to Lynluu.

---

## Open Questions
- [ ] Boss card stats for S2–S5 to be validated through playtesting

## Confirmed Decisions
- ✅ Health resets to full on evolution
- ✅ Rogue Luu tiers 1–4 are wave enemies; 5 boss cards total — Tjeluu (Bisluu), Lynluu (Rasluu), Forluu (Lagluu), Fesluu (Kjeluu), Toxluu (Gifluu)
- ✅ S1 boss is always Tjeluu
- ✅ Boss card stats scale by sector (1–5) — stats printed as range on card
- ✅ Rogue Luu of same class as sector boss gain +1 base attack in that sector
- ✅ Boss XP reward: 5 XP per player on defeat, distributed freely among that player's Luu
- ✅ Rogue Luu XP reward: granted only to the specific Luu that lands the killing blow
- ✅ Class Traits added for Lagluu/Forluu (Pack Recovery), Kjeluu/Fesluu (Impervious), Gifluu/Toxluu (Phase Shift)
- ✅ Rasluu/Lynluu and Bisluu/Tjeluu have no Class Trait — identity through passives only
- ✅ Type modifier: counter advantage = +1 damage, counter disadvantage = -1 (minimum 0). Bisluu/Tjeluu neutral.
- ✅ Resource name: Luutex. Gather yields 1 Luutex. Bisluu passive boosts adjacent Luu gather to 2.
- ✅ XP threshold: 5 XP = level up at every level
- ✅ Class names updated: Rasluu boss = Lynluu, Lagluu boss = Forluu, Kjeluu boss = Fesluu, Gifluu boss = Toxluu, Symbiluu = Tjeluu

## Dice Damage Reference

Dice rolled per Rogue Luu attack, added to base attack, then ÷ players (round up).

| Sector | Dice | Min | Avg | Max |
|--------|------|-----|-----|-----|
| S1 | d4 | 1 | 2.5 | 4 |
| S2 | d6 | 1 | 3.5 | 6 |
| S3 | d8 | 1 | 4.5 | 8 |
| S4 | d4+d6 | 2 | 6.0 | 10 |
| S5 | d4+d8 | 2 | 7.0 | 12 |

> Solo play: full dice value applies with no division. Balance to be validated through solo playtesting — dice scaling may be adjusted if S4/S5 proves unwinnable.
