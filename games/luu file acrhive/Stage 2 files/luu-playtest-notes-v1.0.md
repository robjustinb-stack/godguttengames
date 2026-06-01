# LUU — Playtesting Notes
_Stage 2 verbal simulation. Sector 1 solo run. Updated as further testing occurs._

---

## Session 1 — Sector 1 Solo Run

**Date:** Stage 2 verbal simulation
**Format:** Solo, 1 player
**Sector:** S1 only
**Starting Luu:** Rasluu (random draw)
**Opening hand:** Gifluu, Rasluu Evo, Kjeluu, Adaptive Camouflage, Bisluu Evo
**Outcome:** ✅ Victory — Symbiluu defeated, narrowly

### Wave Results
| Wave | Enemies | Outcome |
|------|---------|---------|
| W1 | T2 Gifluu · T1 Lagluu | Cleared — 5 rounds |
| W2 | T2 Kjeluu · T1 Kjeluu | Cleared — 7 rounds |
| W3 | T1 Kjeluu · T1 Rasluu | Cleared — 3 rounds |
| Boss | Symbiluu (HP 40, Atk 8) | Defeated — 4 rounds, final hit 50/50 dice roll |

### Luu Status at End of Sector
| Luu | Fate | Final Level | Final HP |
|-----|------|-------------|----------|
| Rasluu | Survived | L3 | 4/25 |
| Gifluu | Survived | L2 (boss XP) | 11/20 |
| Kjeluu | KO'd — Boss Round 1 | L1 | — |

---

## Balance Observations

### Symbiluu (S1 Boss)
- Base attack of 8 feels too high for S1 — boss fight came down to a single 50/50 dice roll
- Estimated solo win rate for this encounter: ~20-30%, below target of 40-50%
- **Recommended fix:** ✅ S1 Symbiluu base attack reduced from 8 to 6

### Kjeluu
- Extremely powerful in mid-waves due to Impervious + Hardened Shell + Defend stacking
- Wave 2 felt almost trivial with Kjeluu at front absorbing everything
- Collapsed instantly against Symbiluu — steep power cliff when facing high-damage enemies
- Mirror matchup (Kjeluu vs Rogue Kjeluu) was incorrectly penalised with -1 modifier during sim — no type modifier should apply

### Gifluu
- Contributes almost nothing at L1 — 0 base attack makes it entirely dice-dependent
- d4 average of 2.5, minus Hardened Shell = 1.5 effective damage on armoured enemies
- Felt like a passenger until Apex Conditioning was played
- Phase Shift never triggered at a critical offensive moment
- **Observation:** Gifluu needs either a slightly higher base attack at L1 (1 instead of 0) or an early-game card that amplifies its contribution

### Rasluu
- Clear MVP — Predatory Strike, good base attack scaling, strong dice rolls
- Carrying the damage output for most of the sector
- Predatory Strike clarification needed mid-sim — trigger is same-round hit by another friendly Luu, not existing damage counters

### Resource Economy
- Gather rate of 1 per action too slow relative to card costs of 3-5 Luutex
- Entered boss fight with 1 Luutex despite needing 3 for Rasluu Evo
- Every turn felt like binary choice — attack or gather — no way to do both
- Predatory Adaptation (4 Luutex) never played despite being in hand most of the game — cost slightly too high
- **Root cause:** no engine-builder cards that generate resources as a side effect of other actions

### Card Draw
- Roughly a quarter of the deck never surfaced in a full sector
- Drew Apex Conditioning twice — second copy was redundant (persistent effect already active)
- No card draw mechanics meant heavy variance in which tools were available
- **Recommended fix:** Add card draw cards to the deck; consider limiting persistent effect cards to 1 copy

---

## Rules Gaps Identified and Resolved

| Rule | Issue | Resolution |
|------|-------|------------|
| Opening hand | 23% chance of zero Luu cards in opening hand | Solo mulligan rule added — reshuffle and redraw once if no Luu cards in hand; keep second hand regardless |
| New Luu placement | Unclear where new Luu enter the queue | New Luu always placed at back of queue — cannot be placed directly into any other position |
| Action order | Unclear whether Luu act simultaneously or sequentially | Luu act in queue order — Position 1 first, then 2, 3 etc. Cannot reorder before committing |
| Defend value | Undefined damage reduction amount | Defend reduces damage by 2 from the first Rogue attack that lands this turn only |
| Predatory Strike trigger | "Already-damaged target" was ambiguous | Trigger is same-round only — another friendly Luu must have hit the target earlier in the same round |
| Level up HP | Unclear whether HP resets or scales on level up | Max HP increases to new level value; damage counters unchanged; new HP = new max minus existing damage |
| Boss XP distribution | Unclear timing relative to evolution | Note added: evolve before distributing boss XP where possible — XP given to L3 Luu pre-evolution is wasted |
| Type modifier mirror matchup | Mirror matchups incorrectly penalised | Confirmed: mirror matchups are neutral — no +1 or -1 applies |

---

## Deck Design Gaps

The following card categories are missing from the starter deck and are needed before the core loop feels sustainable:

### Healing
- No healing cards in current deck
- Attrition is brutal solo — Kjeluu entered the boss at HP 6 with no recovery option
- Need: at least 2 healing cards (single Luu targeted)

### Card Draw
- No card draw mechanics
- Heavy dependency on lucky draws — key cards (Metabolic Efficiency, Accelerated Mitosis) never surfaced
- Need: at least 2 card draw cards

### Resource Generation (additional)
- Nutrient Burst and Metabolic Efficiency exist but were drawn late or never
- Need: cards that generate resources as a side effect of attacks or other actions (engine-builders)

### XP Boost (additional)
- Accelerated Mitosis and Predatory Learning exist but Predatory Learning is wave-limited and situational
- Need: more reliable XP acceleration that doesn't require kill-blow conditions

### Formation
- No cards that allow acting out of queue order
- Gifluu stuck at Position 3 for most of the game contributing very little
- Need: consider a card that allows one Luu to act out of turn order

---

## Gameplay Feel Observations

**Decision quality:** Meaningful decisions existed but were often constrained by economy. The attack/gather binary dominated. More engine-builder cards would open up richer turn structures.

**Difficulty curve:** S1 waves felt appropriately calibrated. Boss felt too hard for S1 solo. Waves 2 and 3 were notably easier than Wave 1 due to Kjeluu's Impervious synergy with the wave composition.

**Action viability:** Attack was dominant. Gather was necessary but felt like a wasted turn. Defend was very effective when used but easy to forget. Move was used well — the queue positioning mechanic created genuine tactical interest.

**Variance:** Solo play is very swingy. Individual dice rolls determined survival in several rounds more than decisions did. The +1/-1 type modifier is small relative to d4 variance. Worth exploring variance-smoothing mechanics in future design (rerolls, minimum damage floors, dice selection).

**Pacing:** A full sector took approximately 20+ rounds. Boss fight was 4 rounds. Felt appropriate but waves could drag when an enemy had high HP and limited damage output (Wave 2 T1 Kjeluu grind).

---

## Rules Updates Made During Session

All of the following were added to the rules document during or after the simulation:

- Solo opening hand mulligan rule
- New Luu placement rule (back of queue only)
- Luu action order rule (queue order, no reordering)
- Defend clarified as -2 to first hit that lands only
- Predatory Strike trigger clarified as same-round cooperative hit
- Level up HP rule (damage counters persist, max HP increases)
- Boss XP distribution note (evolve before distributing)
- Type modifier clarification (mirror = neutral)
- Dice scaling by sector added to rules and stat framework

---

## Open Questions for Next Session

- [ ] Should Gifluu have base attack 1 at L1 instead of 0?
- [ ] Should Symbiluu S1 base attack be reduced to 6 or 7?
- [ ] Should persistent effect cards be limited to 1 copy in the starter deck?
- [ ] Should a formation card exist that allows acting out of queue order?
- [ ] Is the gather rate of 1 sufficient once engine-builder cards are added?
- [ ] Does the difficulty curve hold up in multiplayer or is it solo-specific?

---

## Next Steps

1. Design engine-layer cards: healing, card draw, resource generation, XP boost
2. Update card tracker and library with new cards
3. Conduct second verbal simulation with expanded deck
4. Sign off on core loop before moving to Stage 3
