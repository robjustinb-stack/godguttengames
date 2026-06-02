// engine.js — Rules Engine
// Stage 4 skeleton. Group 1 (setup) is handled in gameState.js.
// This file will contain Groups 2–8 as we build them out.

// Global game state — everything reads and writes through this.
let GS = null;

async function syncToSupabase() {
  if (typeof LuuSession !== 'undefined' && LuuSession.getIdentity()) {
    try {
      await LuuSession.pushGameState(GS);
    } catch(e) {
      console.warn('[LUU] Supabase sync failed:', e.message);
    }
  }
}

// Lagluu Damage Redistribution trait — max counters moveable per use, by sector
const LAGLUU_TRAIT_MAX_BY_SECTOR = { 1: 5, 2: 6, 3: 7, 4: 8, 5: 9 };

// ─────────────────────────────────────────────
// CHAOS CARDS
// ─────────────────────────────────────────────

const CHAOS_CARDS = {
  'chaos_colony_fracture': {
    id: 'chaos_colony_fracture', name: 'Colony Fracture', trigger: 'immediate',
    description: 'The lead Luu of the player who drew this card is immediately knocked out. If this is their only remaining Luu, it survives at 1 HP instead.'
  },
  'chaos_surge_protocol': {
    id: 'chaos_surge_protocol', name: 'Surge Protocol', trigger: 'immediate',
    description: 'In the next enemy attack phase, all enemies roll the highest possible dice value for the current sector (S1: 4, S2: 6, S3: 8, S4: 10, S5: 12).'
  },
  'chaos_rogue_resurgence': {
    id: 'chaos_rogue_resurgence', name: 'Rogue Resurgence', trigger: 'immediate',
    description: 'All active Rogue Luu are immediately restored to full HP.'
  },
  'chaos_corrupted_vanguard': {
    id: 'chaos_corrupted_vanguard', name: 'Corrupted Vanguard', trigger: 'delayed',
    description: 'When the boss wave begins this sector, one additional Rogue Luu of the same class as the boss joins the fight (T1 in S1, T2 in S2, T3 in S3, T4 in S4 and S5). If the boss wave is already in progress, fires immediately.'
  },
  'chaos_toxic_pulse': {
    id: 'chaos_toxic_pulse', name: 'Toxic Pulse', trigger: 'immediate',
    description: 'All active friendly Luu (all players) immediately take 3 damage.'
  },
  'chaos_luutex_drain': {
    id: 'chaos_luutex_drain', name: 'Luutex Drain', trigger: 'immediate',
    description: 'All players immediately lose half of their current Luutex, rounded down.'
  },
  'chaos_queue_collapse': {
    id: 'chaos_queue_collapse', name: 'Queue Collapse', trigger: 'immediate',
    description: 'All players immediately have their Luu queue order fully reversed. Queue positions shift accordingly.'
  },
  'chaos_blackout': {
    id: 'chaos_blackout', name: 'Blackout', trigger: 'immediate',
    description: 'For the next complete round, no Luu may use the Attack action.'
  },
  'chaos_signal_jam': {
    id: 'chaos_signal_jam', name: 'Signal Jam', trigger: 'immediate',
    description: 'No player may play action cards for the remainder of the current wave or boss wave.'
  },
  'chaos_memory_wipe': {
    id: 'chaos_memory_wipe', name: 'Memory Wipe', trigger: 'immediate',
    description: 'The XP of all active friendly Luu (all players) is immediately reset to 0.'
  }
};

const CHAOS_CARD_IDS = Object.keys(CHAOS_CARDS);

// Maximum dice values per sector for Surge Protocol
const SECTOR_MAX_DICE = { 1: 4, 2: 6, 3: 8, 4: 10, 5: 12 };

// Draft pool definitions
const CORE_ACTION_CARD_IDS = [
  'action_luutex_flare', 'action_combat_harvest', 'action_luutex_reclaim',
  'action_shell_reflex', 'action_pack_call', 'action_luutex_pulse',
  'action_pack_mending', 'action_override', 'action_evolution_drive',
  'action_emergency_mend', 'action_shell_bond', 'action_shared_hunt',
  'action_colony_triumph', 'action_reawakening', 'action_last_lesson',
  'action_shield_resonance', 'action_hardened_instinct', 'action_apex_focus',
  'action_shell_guard', 'action_shell_shift', 'action_luutex_cache',
  'action_luutex_flow', 'action_core_surge', 'action_hunters_edge',
  'action_luutex_tap', 'action_shell_regrowth', 'action_quick_mend',
  'action_formation_override', 'action_tactical_shift', 'action_core_cascade',
  'action_damage_response', 'action_luu_search', 'action_passive_harvest',
  'action_hunting_ground', 'action_hardened_core', 'action_double_phase',
  'action_colony_bond', 'action_dampening_wave', 'action_regenerative_pulse',
  'action_last_stand'
]; // 40 Core action cards

const POWER_ACTION_CARD_IDS = [
  'action_salvage_protocol', 'action_purification', 'action_shield_spread',
  'action_split_strike', 'action_rebirth', 'action_termination',
  'action_forced_evolution', 'action_full_restore', 'action_overdrive',
  'action_species_ward', 'action_tenacity', 'action_suppression_field',
  'action_vital_drain', 'action_colony_harvest', 'action_surge_protocol',
  'action_death_defiance', 'action_neural_cascade', 'action_rising_tide',
  'action_tactical_command', 'action_resonance_surge'
]; // 20 Power action cards

const LUU_DRAFT_POOL = [
  { cardId: 'luu_rasluu',         copies: 3 },
  { cardId: 'luu_lagluu',         copies: 3 },
  { cardId: 'luu_kjeluu',         copies: 3 },
  { cardId: 'luu_gifluu',         copies: 3 },
  { cardId: 'luu_bisluu',         copies: 3 },
  { cardId: 'luu_rasluu_evolved', copies: 2 },
  { cardId: 'luu_lagluu_evolved', copies: 2 },
  { cardId: 'luu_kjeluu_evolved', copies: 2 },
  { cardId: 'luu_gifluu_evolved', copies: 2 },
  { cardId: 'luu_bisluu_evolved', copies: 2 },
]; // 15 base + 10 evolved = 25 Luu cards in draft

async function startGame(forceNew = false) {
  await CardRegistry.load();

  // Check for existing save
  const hasSave = localStorage.getItem('missionLuu_save');
  if (hasSave && !forceNew) {
    const saveTime = localStorage.getItem('missionLuu_saveTime');
    const resume = confirm(`Resume saved game from ${new Date(saveTime).toLocaleString()}?\n\nClick Cancel to start a new game.`);
    if (resume) {
      loadGame();
      return;
    }
  }

  GS = await initGameState();
  // Multiplayer / resume — load GS from sessionStorage if present
  const pendingGs = sessionStorage.getItem('luu_pending_gs');
  if (pendingGs) {
    try {
      GS = JSON.parse(pendingGs);
      sessionStorage.removeItem('luu_pending_gs');
      console.log('[startGame] Loaded GS from session (multiplayer/resume)');
    } catch(e) {
      console.warn('[startGame] Failed to parse pending GS — using fresh state');
    }
  }
  UI.render(GS);
  initWave(GS);
  startRound(GS);
  startPlayerTurn(GS);
  UI.render(GS);

  // Subscribe to Realtime updates if in a multiplayer/resume session
  if (typeof LuuSession !== 'undefined') {
    const identity = LuuSession.getIdentity();
    if (identity && identity.joinCode) {
      LuuSession.subscribeToSession(identity.joinCode, (newGS) => {
        // Only apply remote GS if it's not our own turn
        if (!LuuSession.isMyTurn(newGS)) {
          GS = newGS;
          UI.render(GS);
          console.log('[LUU] Remote GS applied via Realtime');
        }
      });
      console.log('[LUU] Realtime subscription active for', identity.joinCode);
    }
  }
}

// ─────────────────────────────────────────────
// DRAFT SYSTEM
// ─────────────────────────────────────────────

function buildDraftPools(state) {
  const ds = state.draftState;

  // Core pool: 40 Core action cards + 25 Luu cards = 65 cards
  let coreCards = [...CORE_ACTION_CARD_IDS];
  for (const entry of LUU_DRAFT_POOL) {
    for (let i = 0; i < entry.copies; i++) coreCards.push(entry.cardId);
  }
  ds.corePool  = shuffle([...coreCards]);

  // Power pool: 20 Power action cards
  ds.powerPool = shuffle([...POWER_ACTION_CARD_IDS]);

  console.log(`[buildDraftPools] Core pool: ${ds.corePool.length} cards, Power pool: ${ds.powerPool.length} cards`);
}

function initDraftState(state) {
  // Initialize deck structure — completeDraft() will populate drawPile
  state.deck = { drawPile: [], discardPile: [], removedCards: [], reshuffleCount: 0 };
  buildDraftPools(state);
  state.draftState.phase            = 'concurrent';
  state.draftState.keptCore         = [];
  state.draftState.keptPower        = [];
  state.draftState.currentReveal    = [];
  state.draftState.cascadeSelection = 0;
  state.draftState.pendingMulligan  = false;

  console.log(`[initDraftState] Draft initialised — entering concurrent phase`);
  revealDraftCards(state);
  if (typeof UI !== 'undefined') UI.render(state);
}

function revealDraftCards(state) {
  const ds = state.draftState;
  ds.currentReveal    = [];
  ds.cascadeSelection = 0;

  if (ds.phase === 'concurrent') {
    const drawn = [];
    for (let i = 0; i < 4 && ds.corePool.length > 0; i++) {
      drawn.push({ cardId: ds.corePool.shift(), pool: 'core' });
    }
    if (ds.powerPool.length > 0) {
      drawn.push({ cardId: ds.powerPool.shift(), pool: 'power' });
    }
    shuffle(drawn);
    drawn.forEach((card, idx) => {
      ds.currentReveal.push({ ...card, position: idx + 1 });
    });

  } else if (ds.phase === 'coreOnly') {
    for (let i = 0; i < 4 && ds.corePool.length > 0; i++) {
      ds.currentReveal.push({ cardId: ds.corePool.shift(), pool: 'core', position: i + 1 });
    }

  } else if (ds.phase === 'powerOnly') {
    if (ds.powerPool.length > 0) {
      ds.currentReveal.push({ cardId: ds.powerPool.shift(), pool: 'power', position: 1 });
    }
  }

  if (ds.currentReveal.length === 0) {
    console.warn(`[revealDraftCards] Pool exhausted — completing draft early`);
    completeDraft(state);
    return;
  }

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'draftReveal',
    detail: {
      phase:     ds.phase,
      cards:     ds.currentReveal.map(c => ({ cardId: c.cardId, pool: c.pool, position: c.position })),
      keptCore:  ds.keptCore.length,
      keptPower: ds.keptPower.length
    }
  });
  console.log(`[revealDraftCards] Revealed ${ds.currentReveal.length} cards (${ds.phase}):`,
    ds.currentReveal.map(c => `pos${c.position}:${c.cardId}`).join(', '));
}

function handleDraftCascadeSelect(count) {
  const ds       = GS.draftState;
  const maxCount = ds.currentReveal.length;
  ds.cascadeSelection = Math.max(0, Math.min(count, maxCount));
  console.log(`[handleDraftCascadeSelect] Cascade selection: ${ds.cascadeSelection} of ${maxCount}`);
  UI.render(GS);
}

function handleDraftCascadeConfirm() {
  GS.draftState.inspectCard = null;
  const ds    = GS.draftState;
  const count = ds.cascadeSelection;
  const taken = ds.currentReveal.slice(0, count);

  for (const card of taken) {
    if (card.pool === 'core') {
      ds.keptCore.push(card.cardId);
    } else {
      ds.keptPower.push(card.cardId);
    }
  }

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'draftPick',
    detail: {
      taken:     taken.map(c => c.cardId),
      discarded: ds.currentReveal.slice(count).map(c => c.cardId),
      keptCore:  ds.keptCore.length,
      keptPower: ds.keptPower.length
    }
  });
  console.log(`[handleDraftCascadeConfirm] Took ${count} cards. Core: ${ds.keptCore.length}/30, Power: ${ds.keptPower.length}/10`);

  advanceDraftPhase(GS);
}

function handleDraftGauntletSelect(keep) {
  GS.draftState.inspectCard = null;
  const ds   = GS.draftState;
  const card = ds.currentReveal[0];
  if (!card) return;

  if (keep) {
    ds.keptPower.push(card.cardId);
    console.log(`[handleDraftGauntletSelect] Kept ${card.cardId}. Power: ${ds.keptPower.length}/10`);
  } else {
    console.log(`[handleDraftGauntletSelect] Discarded ${card.cardId}`);
  }

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'draftGauntlet',
    detail: { cardId: card.cardId, kept: keep, keptPower: ds.keptPower.length }
  });

  advanceDraftPhase(GS);
}

function handleDraftInspect(cardId) {
  GS.draftState.inspectCard = GS.draftState.inspectCard === cardId ? null : cardId;
  UI.render(GS);
}

function handleChaosDifficultySelect(level) {
  const cs = GS.chaosState;
  cs.difficulty = level;
  if (level === 0) {
    cs.selectedCards = [];
    cs.pendingChaosDifficultySelect = false;
    GS.turnLog.push({ logId: nextLogId(GS), action: 'chaosSetup', detail: { difficulty: 0, cards: [] } });
    console.log('[handleChaosDifficultySelect] No chaos cards — starting game');
    startRound(GS);
    UI.render(GS);
    return;
  }
  const pool = shuffle([...CHAOS_CARD_IDS]);
  cs.selectedCards = pool.slice(0, level);
  GS.deck.drawPile = shuffle([...GS.deck.drawPile, ...cs.selectedCards]);
  cs.pendingChaosDifficultySelect = false;
  GS.turnLog.push({
    logId: nextLogId(GS), action: 'chaosSetup',
    detail: {
      difficulty:    level,
      cards:         cs.selectedCards,
      drawPileAfter: GS.deck.drawPile.length,
      powerPileSize: GS.deck.powerPile ? GS.deck.powerPile.length : 0,
      note:          'Chaos cards in core draw pile only'
    }
  });
  console.log(`[handleChaosDifficultySelect] Difficulty ${level} — ${cs.selectedCards.length} chaos cards shuffled in:`, cs.selectedCards);
  startRound(GS);
  UI.render(GS);
}

function drawCard(state, playerId) {
  const drawn = drawFromDeck(state, 1);
  if (drawn.length === 0) return null;
  const cardId = drawn[0];
  if (CHAOS_CARD_IDS.includes(cardId)) {
    state.deck.removedCards.push(cardId);
    handleChaosCardDrawn(state, cardId, playerId);
    return null;
  }
  const player = state.players.find(p => p.playerId === playerId);
  if (player) player.hand.push(cardId);
  return cardId;
}

function spawnCorruptedVanguard(state) {
  const bossCard = CardRegistry.getBossCard(state.bosses.activeBoss.cardId);
  if (!bossCard) return;
  const bossClass  = bossCard.class.toLowerCase();
  const tierBySector = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 4 };
  const tier       = tierBySector[state.position.sectorNumber] || 1;
  const rogueCardId = `rogue_${bossClass}_t${tier}`;
  const rogueCard   = CardRegistry.getCard(rogueCardId);
  if (!rogueCard) {
    console.warn(`[spawnCorruptedVanguard] No card found for ${rogueCardId}`);
    return;
  }
  const instanceId = `enemy_vanguard_${Date.now()}`;
  state.activeEnemies.push({
    instanceId,
    cardId:            rogueCardId,
    class:             rogueCard.class,
    tier:              rogueCard.tier,
    wavePosition:      state.activeEnemies.length + 1,
    currentHp:         rogueCard.stats.health,
    maxHp:             rogueCard.stats.health,
    damageCounters:    0,
    sectorBonusActive: false,
    hitThisRound:      false,
    attackedThisRound: false,
    bondedBoostBonus:  0
  });
  state.turnLog.push({
    logId: nextLogId(state), action: 'chaosEffect',
    detail: { effectId: 'corrupted_vanguard_spawned', cardId: rogueCardId, instanceId }
  });
  console.log(`[spawnCorruptedVanguard] Spawned ${rogueCardId} (${instanceId})`);
}

function handleChaosCardDrawn(state, cardId, drawingPlayerId) {
  const card = CHAOS_CARDS[cardId];
  state.chaosState.resolvedCards.push(cardId);
  state.turnLog.push({
    logId: nextLogId(state), action: 'chaosCardDrawn',
    detail: { cardId, name: card.name, playerId: drawingPlayerId }
  });
  console.log(`[handleChaosCardDrawn] ${card.name} drawn by ${drawingPlayerId}`);

  switch (cardId) {
    case 'chaos_colony_fracture': {
      const player = state.players.find(p => p.playerId === drawingPlayerId);
      if (!player || player.luuQueue.length === 0) break;
      const leadLuu = player.luuQueue[0];
      if (player.luuQueue.length === 1) {
        leadLuu.currentHp      = 1;
        leadLuu.damageCounters = leadLuu.maxHp - 1;
        state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
          detail: { effectId: 'colony_fracture', luuId: leadLuu.cardId, survived: true } });
      } else {
        leadLuu.currentHp      = 0;
        leadLuu.damageCounters = leadLuu.maxHp;
        checkLuuKnockedOut(state, leadLuu, 0, null);
        state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
          detail: { effectId: 'colony_fracture', luuId: leadLuu.cardId, survived: false } });
      }
      break;
    }
    case 'chaos_surge_protocol': {
      state.chaosState.maxDiceNextAttack = true;
      state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
        detail: { effectId: 'surge_protocol' } });
      break;
    }
    case 'chaos_rogue_resurgence': {
      const rogues = state.activeEnemies.filter(e => !e.isBoss);
      for (const enemy of rogues) {
        enemy.currentHp      = enemy.maxHp;
        enemy.damageCounters = 0;
      }
      state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
        detail: { effectId: 'rogue_resurgence', count: rogues.length } });
      break;
    }
    case 'chaos_corrupted_vanguard': {
      const immediate = state.position.waveNumber === 4;
      if (immediate) {
        spawnCorruptedVanguard(state);
      } else {
        state.chaosState.pendingEffects.push({
          effectId: 'corrupted_vanguard',
          sector:   state.position.sectorNumber
        });
      }
      state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
        detail: { effectId: 'corrupted_vanguard', immediate } });
      break;
    }
    case 'chaos_toxic_pulse': {
      for (const player of state.players) {
        for (const luu of player.luuQueue) {
          luu.currentHp      = Math.max(0, luu.currentHp - 3);
          luu.damageCounters = luu.maxHp - luu.currentHp;
          if (luu.currentHp <= 0) checkLuuKnockedOut(state, luu, 0, null);
        }
      }
      state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
        detail: { effectId: 'toxic_pulse', damage: 3 } });
      break;
    }
    case 'chaos_luutex_drain': {
      for (const player of state.players) {
        const drain = Math.floor(player.luutex.current / 2);
        player.luutex.current = Math.max(0, player.luutex.current - drain);
      }
      state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
        detail: { effectId: 'luutex_drain' } });
      break;
    }
    case 'chaos_queue_collapse': {
      for (const player of state.players) {
        player.luuQueue.reverse();
        player.luuQueue.forEach((luu, idx) => { luu.queuePosition = idx + 1; });
      }
      state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
        detail: { effectId: 'queue_collapse' } });
      break;
    }
    case 'chaos_blackout': {
      state.chaosState.attackBannedRound = state.position.roundNumber + 1;
      state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
        detail: { effectId: 'blackout', bannedRound: state.chaosState.attackBannedRound } });
      break;
    }
    case 'chaos_signal_jam': {
      state.chaosState.cardPlayBannedThisWave = true;
      state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
        detail: { effectId: 'signal_jam' } });
      break;
    }
    case 'chaos_memory_wipe': {
      for (const player of state.players) {
        for (const luu of player.luuQueue) { luu.xp = 0; }
      }
      state.turnLog.push({ logId: nextLogId(state), action: 'chaosEffect',
        detail: { effectId: 'memory_wipe' } });
      break;
    }
  }
}

function advanceDraftPhase(state) {
  const ds = state.draftState;
  const coreComplete  = ds.keptCore.length  >= ds.coreTarget;
  const powerComplete = ds.keptPower.length >= ds.powerTarget;

  if (coreComplete && powerComplete) {
    ds.phase = 'complete';
    completeDraft(state);
    return;
  }

  if (coreComplete && ds.phase !== 'powerOnly') {
    ds.phase = 'powerOnly';
    console.log(`[advanceDraftPhase] Core target met — switching to powerOnly phase`);
  } else if (powerComplete && ds.phase !== 'coreOnly') {
    ds.phase = 'coreOnly';
    console.log(`[advanceDraftPhase] Power target met — switching to coreOnly phase`);
  }

  if (ds.phase === 'powerOnly' && ds.powerPool.length === 0 && ds.keptPower.length < ds.powerTarget) {
    console.warn('[advanceDraftPhase] Power pool exhausted before target — completing draft');
    ds.phase = 'complete';
    completeDraft(state);
    return;
  }
  if (ds.phase === 'coreOnly' && ds.corePool.length === 0 && ds.keptCore.length < ds.coreTarget) {
    console.warn('[advanceDraftPhase] Core pool exhausted before target — completing draft');
    ds.phase = 'complete';
    completeDraft(state);
    return;
  }

  revealDraftCards(state);
  if (typeof UI !== 'undefined') UI.render(state);
}

function completeDraft(state) {
  const ds = state.draftState;
  ds.phase = 'complete';

  const coreDrafted = shuffle([...ds.keptCore]);
  state.deck.drawPile     = coreDrafted;
  state.deck.powerPile    = [...ds.keptPower];
  state.deck.removedCards = [];

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'draftComplete',
    detail: {
      coreCards:   coreDrafted.length,
      powerCards:  state.deck.powerPile.length,
      powerHeld:   true,
      note:        'Power cards held in powerPile — enter draw pile at S3 start'
    }
  });
  console.log(`[completeDraft] Core deck: ${coreDrafted.length} cards. Power pile: ${state.deck.powerPile.length} cards held until S3.`);

  // Deal opening hand (5 cards per player)
  for (const player of state.players) {
    const drawn = drawFromDeck(state, 5);
    player.hand.push(...drawn);
  }

  // Solo mulligan check — if no Luu cards in hand, offer redraw
  if (state.config.playerCount === 1) {
    const player = state.players[0];
    const hasLuu = player.hand.some(cardId => {
      const card = CardRegistry.getCard(cardId);
      return card && (card.cardType === 'Luu' || card.cardType === 'LuuEvolved');
    });
    if (!hasLuu) {
      ds.pendingMulligan = true;
      console.log(`[completeDraft] No Luu in opening hand — mulligan available`);
      if (typeof UI !== 'undefined') UI.render(state);
      return;
    }
  }

  state.chaosState.pendingChaosDifficultySelect = true;
  if (typeof UI !== 'undefined') UI.render(state);
}

function handleMulliganAccept() {
  const player = GS.players[0];
  GS.deck.drawPile = shuffle([...player.hand, ...GS.deck.drawPile]);
  player.hand = [];
  const drawn = drawFromDeck(GS, 5);
  player.hand.push(...drawn);
  GS.draftState.pendingMulligan = false;
  console.log('[handleMulliganAccept] Mulligan taken — second hand dealt');
  GS.chaosState.pendingChaosDifficultySelect = true;
  UI.render(GS);
}

function handleMulliganDecline() {
  GS.draftState.pendingMulligan = false;
  console.log('[handleMulliganDecline] Mulligan declined — keeping opening hand');
  GS.chaosState.pendingChaosDifficultySelect = true;
  UI.render(GS);
}

// ─────────────────────────────────────────────
// GROUP 2a — WAVE INITIALISATION & ROUND START
// ─────────────────────────────────────────────

function initWave(state) {
  const waveNumber = state.position.waveNumber;
  const waveCards  = state.enemyDeck.preDealtWaves[waveNumber - 1];

  // Clear in case of re-init
  state.activeEnemies = [];

  // Resolve boss class for sector bonus check
  const bossCard  = CardRegistry.getCard(state.bosses.activeBoss.cardId);
  const bossClass = bossCard ? bossCard.class : null;

  waveCards.forEach((id, i) => {
    const card  = CardRegistry.getCard(id);
    const enemy = {
      instanceId:        `enemy_${i + 1}`,
      cardId:            id,
      class:             card.class,
      tier:              card.tier,
      wavePosition:      i + 1,
      currentHp:         card.stats.health,
      maxHp:             card.stats.health,
      damageCounters:    0,
      sectorBonusActive:  false,
      hitThisRound:       false,
      attackedThisRound:  false,
      bondedBoostBonus:   0
    };

    if (bossClass && card.class === bossClass) {
      enemy.sectorBonusActive = true;
      // +1 attack is applied dynamically during combat — flag only
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'sectorBonusApplied',
        detail: { enemyId: enemy.instanceId, cardId: id, bossClass }
      });
    }

    state.activeEnemies.push(enemy);
  });

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'waveInitialised',
    detail: { wave: waveNumber, enemies: waveCards }
  });

  console.log(`[initWave] Wave ${waveNumber} initialised:`, state.activeEnemies);
}

function startRound(state) {
  state.position.roundNumber += 1;

  // Reset per-round tracking
  state.roundTracking.damageDealtToEnemiesThisRound = {};
  state.roundTracking.luutexGainedThisRound         = 0;
  state.roundTracking.cardsDrawnThisRound           = 0;
  state.roundTracking.roguesDefeatedThisRound       = [];
  state.roundTracking.leadLuuHitThisRound           = false;

  // Reset enemy per-round flags
  for (const enemy of state.activeEnemies) {
    enemy.hitThisRound      = false;
    enemy.attackedThisRound = false;
  }

  // Reset Luu per-round flags — sort queue by position first
  state.players[0].luuQueue.sort((a, b) => a.queuePosition - b.queuePosition);
  for (const luu of state.players[0].luuQueue) {
    luu.actedThisTurn = false;
    luu.defendStatus  = false;
  }
  // Reset per-round damage tracking for Vital Drain
  for (const player of state.players) {
    for (const luu of player.luuQueue) {
      luu.damageDealtThisRound = 0;
    }
  }
  // Reset active Luu tracking — startPlayerTurn will re-evaluate from pos 1
  state.position.activeLuuPos = null;
  state.position.activeLuuId  = null;

  // Clear any pending Call the Shot
  state.callTheShotActive = null;

  // Reset player turn state
  const ts = state.players[0].turnState;
  ts.cardsPlayedThisTurn  = [];
  ts.actionTakenThisTurn  = false;
  ts.luutexSpentThisTurn  = 0;
  ts.overrideActive       = false;

  // Reset boss round flag
  state.bosses.activeBoss.bossFirstHitThisRound = true;
  state.bosses.activeBoss.synapticDrainTarget = null;

  // Reset per-round tracking for persistent effects
  for (const effect of state.globalActiveEffects) {
    effect.usesThisRound = 0;
    // Only reset firedOnEnemies for per-round tracking
    // Per-wave effects (e.g. Luutex Tap) reset at wave end instead
    const card       = CardRegistry.getCard(effect.cardId);
    const cardEffect = card?.effects.find(e => e.trigger === effect.trigger);
    if (!cardEffect?.rules?.perUniqueRoguePerWave) {
      effect.firedOnEnemies = [];
    }
  }

  // Apply Symbiotic Drain at start of each round if boss wave active
  if (state.position.waveNumber === 4 && state.bosses.activeBoss.passiveActive) {
    const bossCard = CardRegistry.getBossCard(state.bosses.activeBoss.cardId);
    if (bossCard && bossCard.passive.name === 'Symbiotic Drain') {
      const player = state.players[state.position.currentPlayerIndex];
      resolveSymptoticDrain(state, player);
    }
  }

  // Reset per-wave trait uses on round 1 of any wave (including boss wave)
  // Rasluu Call the Shot resets once per sector (wave 1 only)
  // All other traits reset every wave
  if (state.position.roundNumber === 1) {
    const isSectorStart = state.position.waveNumber === 1;
    for (const player of state.players) {
      for (const luu of player.luuQueue) {
        if (luu.class === 'Rasluu') {
          // Call the Shot resets at sector start only
          if (isSectorStart) luu.traitUsedThisWave = false;
        } else {
          // All other traits reset every wave
          luu.traitUsedThisWave = false;
        }
      }
    }
  }

  state.position.phase              = 'playerTurns';
  state.position.currentPlayerIndex = 0;

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'roundStart',
    detail: { round: state.position.roundNumber }
  });

  console.log(`[startRound] Round ${state.position.roundNumber} started`);

  // Reset Bonded Boost from previous round
  for (const enemy of state.activeEnemies) {
    enemy.bondedBoostBonus = 0;
  }

  // Rogue Bisluu Bonded Boost — grant attack bonus to adjacent Rogues
  for (const bisluu of state.activeEnemies.filter(e => e.class === 'Bisluu')) {
    const bisluuCard = CardRegistry.getCard(bisluu.cardId);
    if (!bisluuCard?.trait || bisluuCard.trait.name !== 'Bonded Boost') continue;
    const bonus = bisluuCard.trait.effect.attackBonus || 0;
    if (bonus <= 0) continue;

    for (const neighbor of state.activeEnemies.filter(e =>
      e.instanceId !== bisluu.instanceId &&
      Math.abs(e.wavePosition - bisluu.wavePosition) === 1
    )) {
      neighbor.bondedBoostBonus = (neighbor.bondedBoostBonus || 0) + bonus;
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'bondedBoostApplied',
        detail: {
          bisluuId:    bisluu.instanceId,
          targetId:    neighbor.instanceId,
          targetClass: neighbor.class,
          bonus
        }
      });
      console.log(`[startRound] Bonded Boost — ${bisluu.cardId} gives +${bonus} attack to ${neighbor.cardId} (pos ${neighbor.wavePosition})`);
    }
  }

  // Tactical Command — show turn order selection modal before first Luu acts
  const tacticalCommand = state.globalActiveEffects.find(e => e.cardId === 'action_tactical_command');
  if (tacticalCommand) {
    state.pendingTurnOrderSelection = { selectedOrder: [] };
    state.turnOrderOverride         = null;
    state.position.phase            = 'playerTurns';

    // Set placeholder active Luu so the board renders correctly while modal is open
    const firstLuu = state.players[state.position.currentPlayerIndex].luuQueue
      .filter(l => !l.actedThisTurn && l.currentHp > 0)
      .sort((a, b) => a.queuePosition - b.queuePosition)[0];
    if (firstLuu) {
      state.position.activeLuuPos = firstLuu.queuePosition;
      state.position.activeLuuId  = firstLuu.cardId;
    }

    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'tacticalCommandPrompt',
      detail: { round: state.position.roundNumber }
    });
    console.log(`[startRound] Tactical Command active — awaiting turn order selection`);
    if (typeof UI !== 'undefined') UI.render(state);
    return;
  }
}

// ─────────────────────────────────────────────
// GROUP 2b — PLAYER TURN & ROUND END
// ─────────────────────────────────────────────

function startPlayerTurn(state) {
  const player  = state.players[state.position.currentPlayerIndex];
  player.luuQueue.sort((a, b) => a.queuePosition - b.queuePosition);

  // Tactical Command — if awaiting turn order selection, do not advance
  if (state.pendingTurnOrderSelection) return;

  // Check if all Luu have acted
  const unactedLuu = player.luuQueue.filter(l => !l.actedThisTurn);
  if (unactedLuu.length === 0) {
    endRound(state);
    return;
  }

  // Override active — let player choose which Luu acts next
  if (player.turnState.overrideActive && unactedLuu.length > 1) {
    state.position.activeLuuId  = null;
    state.position.activeLuuPos = null;
    state.position.phase        = 'choosingLuu';
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'chooseLuuTurn',
      detail: { options: unactedLuu.map(l => ({ queuePosition: l.queuePosition, class: l.class })) }
    });
    console.log(`[startPlayerTurn] Override active — player chooses which Luu acts`);
    return;
  }

  // Use turnOrderOverride if active (Tactical Command)
  let activeLuu = null;
  if (state.turnOrderOverride && state.turnOrderOverride.length > 0) {
    for (const cardId of state.turnOrderOverride) {
      const luu = unactedLuu.find(l => l.cardId === cardId);
      if (luu) { activeLuu = luu; break; }
    }
  }
  // Fall back to queue position order
  if (!activeLuu) {
    activeLuu = unactedLuu.sort((a, b) => a.queuePosition - b.queuePosition)[0];
  }
  state.position.activeLuuId  = activeLuu.cardId;
  state.position.activeLuuPos = activeLuu.queuePosition;
  state.position.phase        = 'playerTurns';

  state.turnLog.push({
    logId:    nextLogId(state),
    action:   'playerTurnStart',
    luuId:    activeLuu.cardId,
    position: activeLuu.queuePosition
  });

  console.log(`[startPlayerTurn] Active Luu: ${activeLuu.cardId} at position ${activeLuu.queuePosition}`);

  // Deep Bond XP — evolved Bisluu grants +1 XP to adjacent Luu at turn start
  for (const adjBisluu of player.luuQueue.filter(l => l.class === 'Bisluu' && l.evolved && l.currentHp > 0)) {
    const colonyBond = state.globalActiveEffects.some(e =>
      e.cardId === 'action_colony_bond' &&
      (e.attachedToCardId === adjBisluu.cardId || e.attachedTo === adjBisluu.queuePosition)
    );
    const isAdjacent = Math.abs(adjBisluu.queuePosition - activeLuu.queuePosition) === 1;
    if (!isAdjacent && !colonyBond) continue;
    const bisCard = CardRegistry.getCard(adjBisluu.cardId);
    if (!bisCard || !bisCard.passive || bisCard.passive.name !== 'Deep Bond') continue;
    const bisIndex = adjBisluu.level - 3;
    const xpBonus  = bisCard.passive.effect.xpBonus[bisIndex];
    if (!xpBonus) continue;
    activeLuu.xp += xpBonus;
    checkLevelUp(state, activeLuu);
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'deepBondXp',
      detail: { luuId: activeLuu.cardId, bisluuId: adjBisluu.cardId, xpBonus, totalXp: activeLuu.xp }
    });
    console.log(`[startPlayerTurn] Deep Bond XP — ${activeLuu.cardId} +${xpBonus} XP from adjacent ${adjBisluu.cardId}`);
  }
}

function endLuuTurn(state) {
  const player = state.players[state.position.currentPlayerIndex];
  const luu = player.luuQueue.find(l => l.queuePosition === state.position.activeLuuPos);
  if (!luu) {
    // Active Luu no longer in queue (knocked out) — advance turn
    console.warn('[endLuuTurn] Active Luu not found in queue — advancing turn');
    const nextLuu = player.luuQueue.find(l => !l.actedThisTurn);
    if (nextLuu) {
      startPlayerTurn(state);
    } else {
      endRound(state);
    }
    return;
  }
  const luuId = luu.cardId;

  luu.actedThisTurn = true;
  if (typeof UI !== 'undefined') UI.resetAction();
  expireEffects(state, 'endOfTurn');

  // Clear Call the Shot if player didn't use it this turn
  state.callTheShotActive = null;

  const ts = player.turnState;
  ts.actionTakenThisTurn  = false;
  ts.cardsPlayedThisTurn  = [];
  ts.luutexSpentThisTurn  = 0;

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'luuTurnEnd',
    luuId
  });

  const nextLuu = player.luuQueue.find(l => !l.actedThisTurn);
  if (nextLuu) {
    startPlayerTurn(state);
  } else {
    endRound(state);
  }
}

function endRound(state) {
  state.position.phase = 'enemyAttack';

  // Reset turn order override — re-selected each round by Tactical Command
  state.turnOrderOverride = null;

  if (state.chaosState?.attackBannedRound !== null &&
      state.position.roundNumber === state.chaosState?.attackBannedRound) {
    state.chaosState.attackBannedRound = null;
    console.log('[endRound] Blackout expired');
  }

  const player = state.players[state.position.currentPlayerIndex];

  // Pack Bond — Lagluu passive (heals all friendly Luu)
  // Each Lagluu in queue heals all friendly Luu — base Lagluu heals 1, evolved heals 2
  const activeLagluus = player.luuQueue.filter(l => l.class === 'Lagluu' && l.currentHp > 0);
  if (activeLagluus.length > 0) {
    const totalHeal = activeLagluus.reduce((sum, l) => sum + (l.evolved ? 2 : 1), 0);
    for (const luu of player.luuQueue) {
      if (luu.currentHp <= 0) continue;
      const hpBefore = luu.currentHp;
      luu.currentHp = Math.min(luu.currentHp + totalHeal, luu.maxHp);
      luu.damageCounters = luu.maxHp - luu.currentHp;
      const hpAfter = luu.currentHp;
      if (hpAfter > hpBefore) {
        state.turnLog.push({
          logId:      nextLogId(state),
          action:     'packBond',
          luuId:      luu.cardId,
          healAmount: hpAfter - hpBefore,
          hpAfter
        });
      }
    }
    console.log(`[endRound] Pack Bond — ${activeLagluus.length} Lagluu present, heal: ${totalHeal}`);
  }

  // Resillient Core — Forluu boss passive
  if (state.bosses.activeBoss.cardId === 'boss_forluu' && state.bosses.activeBoss.passiveActive) {
    const leadLuu   = player.luuQueue.find(l => l.queuePosition === 1);
    const healAmount = leadLuu ? Math.min(leadLuu.damageCounters, 3) : 0;
    if (healAmount > 0) {
      const boss      = state.bosses.activeBoss;
      boss.currentHp  = Math.min(boss.currentHp + healAmount, boss.maxHp);
      state.turnLog.push({
        logId:       nextLogId(state),
        action:      'forluuResillientCore',
        healAmount,
        bossHpAfter: boss.currentHp
      });
    }
  }

  // Fire roundEnd triggered effects (Pack Mending, Vital Drain) before expiring them
  fireTriggeredEffects(state, 'roundEnd', {});

  expireEffects(state, 'endOfRound');
  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'roundEnd',
    round:  state.position.roundNumber
  });

  console.log(`[endRound] Round ${state.position.roundNumber} ended — enemy attack phase`);
}

// ─────────────────────────────────────────────
// GROUP 3a — ATTACK ACTION
// ─────────────────────────────────────────────

function calculateAttack(state, attackingLuu, targetEnemy, diceResult) {
  const player = state.players[state.position.currentPlayerIndex];
  const card   = CardRegistry.getCard(attackingLuu.cardId);
  if (!attackingLuu || !card) {
    console.warn('[calculateAttack] Invalid attackingLuu or card — returning 0');
    return 0;
  }

  const attackStatIndex = attackingLuu.evolved
    ? attackingLuu.level - 3
    : attackingLuu.level - 1;
  let total = card.stats.baseAttack[attackStatIndex] + diceResult;
  total += getActiveStat(state, attackingLuu, 'attack');

  // Symbiotic Drain — Tjeluu boss passive
  if (state.bosses.activeBoss &&
      state.bosses.activeBoss.synapticDrainTarget === attackingLuu.queuePosition) {
    total = Math.max(0, total - 1);
  }

  // Type advantage
  let typeAdvantageApplied = false;
  if (card.typeAdvantage) {
    if (card.typeAdvantage.beats === targetEnemy.class) {
      total += 1;
      typeAdvantageApplied = true;
    } else if (card.typeAdvantage.losesTo === targetEnemy.class) {
      // Shell Shift — check if attacking Luu has type disadvantage negated
      const hasShellShift = state.globalActiveEffects.some(e => {
        const ec = CardRegistry.getCard(e.cardId);
        if (!ec || !ec.effects) return false;
        if (!ec.effects.some(eff => eff.stat === 'typeDisadvantage')) return false;
        return e.attachedToCardId === attackingLuu.cardId
          || e.attachedTo === attackingLuu.queuePosition;
      });
      if (!hasShellShift) {
        total = Math.max(0, total - 1);
      } else {
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'shellShiftNegated',
          detail: { luuId: attackingLuu.cardId, negated: 'typeDisadvantage' }
        });
        console.log(`[calculateAttack] Shell Shift — type disadvantage negated for ${attackingLuu.cardId}`);
      }
    }
  }

  // Apex Focus — increases type advantage bonus by +1 when attacking countered class
  if (typeAdvantageApplied) {
    for (const effect of state.globalActiveEffects) {
      const effectCard = CardRegistry.getCard(effect.cardId);
      if (!effectCard) continue;
      const apexEffect = effectCard.effects
        ? effectCard.effects.find(e => e.stat === 'typeAdvantageBonus')
        : null;
      if (!apexEffect) continue;
      const attachedToThis = effect.attachedToCardId === attackingLuu.cardId
        || effect.attachedTo === attackingLuu.queuePosition;
      if (attachedToThis) {
        total += apexEffect.value;
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'apexFocusBonus',
          detail: { luuId: attackingLuu.cardId, bonus: apexEffect.value }
        });
        console.log(`[calculateAttack] Apex Focus — +${apexEffect.value} type advantage bonus`);
      }
    }
  }

  // Predatory Strike passive
  if (card.passive && card.passive.name === 'Predatory Strike' && targetEnemy.hitThisRound) {
    const predatoryIndex = attackingLuu.evolved ? attackingLuu.level - 3 : attackingLuu.level - 1;
    let predBonus = card.passive.effect.bonusDamage[predatoryIndex];

    // Hunting Ground — permanent Predatory Strike bonus for attached Rasluu
    const huntingGround = state.globalActiveEffects.find(e =>
      e.cardId === 'action_hunting_ground' &&
      (e.attachedToCardId === attackingLuu.cardId || e.attachedTo === attackingLuu.queuePosition)
    );
    if (huntingGround) {
      const hgCard  = CardRegistry.getCard('action_hunting_ground');
      predBonus    += hgCard?.effects[0]?.value || 0;
      console.log(`[calculateAttack] Hunting Ground active — Predatory Strike bonus: ${predBonus}`);
    }

    total += predBonus;
  }

  // Bisluu adjacency bonus
  for (const potentialBisluu of player.luuQueue.filter(l => l.class === 'Bisluu' && l.currentHp > 0)) {
    const colonyBond = state.globalActiveEffects.some(e =>
      e.cardId === 'action_colony_bond' &&
      (e.attachedToCardId === potentialBisluu.cardId || e.attachedTo === potentialBisluu.queuePosition)
    );
    const isAdjacent = Math.abs(potentialBisluu.queuePosition - attackingLuu.queuePosition) === 1;
    if (!isAdjacent && !colonyBond) continue;
    const bisluu = potentialBisluu;
    const bisluuCard     = CardRegistry.getCard(bisluu.cardId);
    const bisluuAtkIndex = bisluu.evolved ? bisluu.level - 3 : bisluu.level - 1;
    const bonus          = bisluuCard.passive.effect.attackBonus[bisluuAtkIndex];
    total += bonus;
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'bisluuAttackBonus',
      detail: {
        bisluuPos:      bisluu.queuePosition,
        bisluuId:       bisluu.cardId,
        attackingClass: attackingLuu.class,
        bonus
      }
    });
  }

  return total;
}

function applyDamageToEnemy(state, targetEnemy, totalDamage, bypassImpervious = false) {
  const card            = CardRegistry.getCard(targetEnemy.cardId);
  const imperviousTrait = card && card.trait && card.trait.name === 'Impervious' ? card.trait : null;

  // Toxluu Toxic Aura — evade on 5 or 6 when attacked, deal rebound = ceil(attack/2)
  if (targetEnemy.isBoss) {
    const bossCard = CardRegistry.getBossCard(targetEnemy.cardId);
    if (bossCard && bossCard.passive && bossCard.passive.name === 'Toxic Aura') {
      const evadeRoll = Math.floor(Math.random() * 6) + 1;
      const evaded    = [5, 6].includes(evadeRoll);

      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'toxluuAura',
        detail: { roll: evadeRoll, evaded, totalDamage }
      });
      console.log(`[applyDamageToEnemy] Toxluu Toxic Aura roll: ${evadeRoll} — ${evaded ? 'EVADED' : 'no evasion'}`);

      if (evaded) {
        const reboundDamage = Math.ceil(totalDamage / 2);
        // Find the attacking Luu — the active Luu
        const player = state.players[state.position.currentPlayerIndex];
        const attackingLuu = player.luuQueue.find(l => l.queuePosition === state.position.activeLuuPos);
        if (attackingLuu) {
          applyDamageToLuu(state, attackingLuu, reboundDamage, null, false);
          checkLuuKnockedOut(state, attackingLuu, 0);
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'toxluuRebound',
            detail: { reboundDamage, targetLuu: attackingLuu.cardId }
          });
          console.log(`[applyDamageToEnemy] Toxluu rebound: ${reboundDamage} damage to ${attackingLuu.cardId}`);
        }
        return { damageDealt: 0, blocked: false, evaded: true };
      }
    }
  }

  if (imperviousTrait && totalDamage <= imperviousTrait.effect.damageThreshold && !bypassImpervious) {
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'damageBlocked',
      detail: { targetId: targetEnemy.instanceId, reason: 'Impervious', totalDamage }
    });
    return { damageDealt: 0, blocked: true };
  }

  // Fesluu Fortress Core — first hit above threshold reduced by 1
  if (targetEnemy.isBoss) {
    const bossCard = CardRegistry.getBossCard(targetEnemy.cardId);
    if (bossCard && bossCard.passive.name === 'Fortress Core') {
      // Threshold and reduction scale by sector
      const sector = state.position.sectorNumber;
      const blockThreshold = sector <= 2 ? 3 : sector === 3 ? 4 : 5;
      const firstHitReduction = sector <= 3 ? 1 : 2;

      if (totalDamage <= blockThreshold) {
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'damageBlocked',
          detail: { targetId: targetEnemy.instanceId, reason: 'FortressCore', totalDamage, blockThreshold }
        });
        console.log(`[applyDamageToEnemy] Fortress Core — blocked ${totalDamage} (threshold: ${blockThreshold})`);
        return { damageDealt: 0, blocked: true };
      }
      // First hit above threshold reduced by sector-scaled amount
      if (state.bosses.activeBoss.bossFirstHitThisRound) {
        totalDamage -= firstHitReduction;
        state.bosses.activeBoss.bossFirstHitThisRound = false;
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'fortressCoreReduction',
          detail: { targetId: targetEnemy.instanceId, reduction: firstHitReduction, damageAfter: totalDamage, sector }
        });
        console.log(`[applyDamageToEnemy] Fortress Core — first hit reduced by ${firstHitReduction} to ${totalDamage} (S${sector})`);
      }
    }
  }

  targetEnemy.currentHp     = Math.max(0, targetEnemy.currentHp - totalDamage);
  targetEnemy.damageCounters = targetEnemy.maxHp - targetEnemy.currentHp;
  targetEnemy.hitThisRound  = true;

  // Sync boss HP to activeBoss state
  if (targetEnemy.isBoss) {
    state.bosses.activeBoss.currentHp = targetEnemy.currentHp;
  }

  if (!state.roundTracking.damageDealtToEnemiesThisRound[targetEnemy.instanceId]) {
    state.roundTracking.damageDealtToEnemiesThisRound[targetEnemy.instanceId] = 0;
  }
  state.roundTracking.damageDealtToEnemiesThisRound[targetEnemy.instanceId] += totalDamage;
  state.history.totalDamageDealt += totalDamage;

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'damageToEnemy',
    detail: { targetId: targetEnemy.instanceId, rawDamage: totalDamage, hpAfter: targetEnemy.currentHp }
  });

  return { damageDealt: totalDamage, blocked: false };
}

function queueXpDistribution(state, amount, isBoss) {
  const player = state.players[state.position.currentPlayerIndex];
  const entry = {
    amount:   amount,
    playerId: player.playerId,
    message:  `Distribute ${amount} XP among your Luu`,
    isBoss:   isBoss
  };
  state.pendingXpQueue = state.pendingXpQueue || [];
  if (!state.pendingXpDistribution) {
    // No active distribution — set immediately
    state.pendingXpDistribution = entry;
  } else {
    // Distribution in progress — queue it
    state.pendingXpQueue.push(entry);
  }
}

function checkEnemyDefeated(state, targetEnemy, attackingLuu) {
  if (targetEnemy.currentHp > 0) return false;
  // Mark attacking Luu as acted before wave/sector transitions fire
  if (attackingLuu) attackingLuu.actedThisTurn = true;

  // Boss defeat
  if (targetEnemy.isBoss) {
    const xpPerPlayer = 5;
    // Store pending XP for player to distribute freely
    queueXpDistribution(state, xpPerPlayer, true);
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'bossXpPending',
      detail: { xpAmount: xpPerPlayer }
    });
    console.log(`[checkEnemyDefeated] Boss XP pending — ${xpPerPlayer} to distribute`);
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'bossDefeated',
      detail: { bossId: targetEnemy.cardId, xpAvailable: xpPerPlayer }
    });
    // Sector clear triggered after player distributes XP via handleBossXpAward
    return true;
  }

  state.roundTracking.roguesDefeatedThisRound.push(targetEnemy);
  state.history.totalRoguesDefeated += 1;

  const enemyCard = CardRegistry.getCard(targetEnemy.cardId);
  const xpGained  = enemyCard.xpOnDefeat;

  // Player distributes XP freely among their Luu
  if (state.players[state.position.currentPlayerIndex].luuQueue.length === 1) {
    // Only one Luu — award directly, no choice needed
    attackingLuu.xp += xpGained;
    checkLevelUp(state, attackingLuu);
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'xpAwarded',
      detail: { luuId: attackingLuu.cardId, xpGained, totalXp: attackingLuu.xp }
    });
  } else {
    // Multiple Luu — let player distribute
    queueXpDistribution(state, xpGained, false);
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'xpPending',
      detail: { xpAmount: xpGained, source: targetEnemy.cardId }
    });
  }

  fireTriggeredEffects(state, 'onKill', { xpValue: xpGained, killingLuu: attackingLuu });

  state.activeEnemies = state.activeEnemies.filter(e => e.instanceId !== targetEnemy.instanceId);

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'enemyDefeated',
    detail: { enemyId: targetEnemy.instanceId, cardId: targetEnemy.cardId, xpAwarded: xpGained }
  });

  checkWaveCleared(state);
  return true;
}

function checkWaveCleared(state) {
  if (state.activeEnemies.length > 0) return false;

  state.chaosState.cardPlayBannedThisWave = false;

  const player = state.players[state.position.currentPlayerIndex];
  expireEffects(state, 'endOfWave');
  state.history.wavesCleared++;

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'waveCleared',
    detail: { wave: state.position.waveNumber, sector: state.position.sectorNumber }
  });
  console.log(`[checkWaveCleared] Wave ${state.position.waveNumber} cleared`);

  // Increment gatherTrack for all Luu currently in queue — capped at 5
  for (const player of state.players) {
    for (const luu of player.luuQueue) {
      if (luu.gatherTrack < 5) {
        luu.gatherTrack++;
      }
    }
  }
  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'gatherTrackIncreased',
    detail: {
      wave:   state.position.waveNumber,
      tracks: state.players[0].luuQueue.map(l => ({ class: l.class, pos: l.queuePosition, track: l.gatherTrack }))
    }
  });
  console.log(`[checkWaveCleared] Gather tracks incremented:`, state.players[0].luuQueue.map(l => `${l.class}:${l.gatherTrack}`).join(', '));

  // Reset per-wave effect tracking
  for (const effect of state.globalActiveEffects) {
    effect.usesThisWave    = 0;
    effect.firedOnEnemies  = [];  // resets per-wave unique enemy tracking (e.g. Luutex Tap)
  }

  // Fire waveEnd triggered effects (Regenerative Pulse) before advancing to next wave
  fireTriggeredEffects(state, 'waveEnd', {});

  // Check if this was the boss wave
  if (state.position.waveNumber === 4) {
    checkSectorCleared(state);
    return true;
  }

  // Check if all 3 waves are cleared — trigger boss wave
  if (state.position.waveNumber === 3) {
    state.position.waveNumber = 4;

    // Enforce hand limit before boss wave starts
    const handLimit    = HAND_LIMIT[state.config.playerCount];
    const handExcess   = player.hand.length - handLimit;
    if (handExcess > 0) {
      state.pendingDiscard = {
        count:      handExcess,
        source:     'bossWaveStart',
        restrictTo: null,
        message:    `Boss wave starting — discard ${handExcess} card(s) to reach hand limit of ${handLimit}`
      };
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'handLimitExceeded',
        detail: { handSize: player.hand.length, limit: handLimit, mustDiscard: handExcess, source: 'bossWaveStart' }
      });
      state.position.phase = 'pendingDiscard';
      console.log(`[checkWaveCleared] Hand limit exceeded before boss wave — must discard ${handExcess}`);
      return true;
    }

    startBossWave(state);
    return true;
  }

  // Advance to next wave
  state.position.waveNumber++;
  state.position.roundNumber = 0;

  // Draw one card
  const handLimit = HAND_LIMIT[state.config.playerCount];
  const drawnCardId = drawCard(state, player.playerId);

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'cardDrawn',
    detail: { source: 'waveEnd', count: 1, cardId: drawnCardId }
  });

  // Enforce hand limit — if over, player must discard down
  if (player.hand.length > handLimit) {
    const excess = player.hand.length - handLimit;
    state.pendingDiscard = {
      count:      excess,
      source:     'waveEnd',
      restrictTo: null,
      message:    `Wave ended — discard ${excess} card(s) to reach hand limit of ${handLimit}`
    };
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'handLimitExceeded',
      detail: { handSize: player.hand.length, limit: handLimit, mustDiscard: excess }
    });
    console.log(`[checkWaveCleared] Hand limit exceeded — must discard ${excess} card(s)`);
  }

  // Do not start next wave until pending discard is resolved
  if (!state.pendingDiscard) {
    if (typeof UI !== 'undefined') UI.resetAction();
    initWave(state);
    startRound(state);
    startPlayerTurn(state);
  } else {
    state.position.phase = 'pendingDiscard';
    console.log(`[checkWaveCleared] Waiting for player to discard before wave starts`);
  }

  return true;
}

function startBossWave(state) {
  const bossCard = CardRegistry.getBossCard(state.bosses.activeBoss.cardId);
  const sectorIdx = state.position.sectorNumber - 1;

  // Set boss HP and attack for this sector
  state.bosses.activeBoss.currentHp = bossCard.hpBySector[sectorIdx];
  state.bosses.activeBoss.maxHp     = bossCard.hpBySector[sectorIdx];

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'bossWaveStarted',
    detail: { boss: state.bosses.activeBoss.cardId, sector: state.position.sectorNumber,
              hp: state.bosses.activeBoss.maxHp }
  });
  console.log(`[startBossWave] ${state.bosses.activeBoss.cardId} — HP: ${state.bosses.activeBoss.maxHp}`);

  // Place boss as active enemy
  state.activeEnemies = [{
    instanceId:        'boss_enemy',
    cardId:            state.bosses.activeBoss.cardId,
    class:             bossCard.class,
    tier:              'boss',
    wavePosition:      1,
    currentHp:         state.bosses.activeBoss.currentHp,
    maxHp:             state.bosses.activeBoss.maxHp,
    damageCounters:    0,
    sectorBonusActive: false,
    hitThisRound:      false,
    attackedThisRound: false,
    bondedBoostBonus:  0,
    isBoss:            true
  }];

  // Corrupted Vanguard — spawn pending chaos enemy at boss wave start
  const vanguard = state.chaosState?.pendingEffects?.find(
    e => e.effectId === 'corrupted_vanguard' && e.sector === state.position.sectorNumber
  );
  if (vanguard) {
    spawnCorruptedVanguard(state);
    state.chaosState.pendingEffects = state.chaosState.pendingEffects.filter(
      e => !(e.effectId === 'corrupted_vanguard' && e.sector === state.position.sectorNumber)
    );
  }

  state.position.roundNumber = 0;
  startRound(state);
  startPlayerTurn(state);
}

function resolveBossAttack(state) {
  const player    = state.players[state.position.currentPlayerIndex];
  const leadLuu   = player.luuQueue.find(l => l.queuePosition === 1);
  if (!leadLuu) return;

  const bossCard  = CardRegistry.getBossCard(state.bosses.activeBoss.cardId);
  const sectorIdx = state.position.sectorNumber - 1;
  const baseAttack = bossCard.attackBySector[sectorIdx];

  // Roll sector dice
  const dice     = SECTOR_DICE[state.position.sectorNumber];
  const diceRoll = dice.reduce((sum, sides) => sum + Math.floor(Math.random() * sides) + 1, 0);
  let rawAttack = baseAttack + diceRoll;

  // Wounded Prey — Lynluu boss passive
  if (bossCard.passive.name === 'Wounded Prey') {
    rawAttack = resolveWoundedPrey(state, leadLuu, rawAttack);
  }

  // Apply Symbiotic Drain passive (Tjeluu) before attack
  if (bossCard.passive.name === 'Symbiotic Drain') {
    resolveSymptoticDrain(state, player);
  }

  const hpBefore = leadLuu.currentHp;
  applyDamageToLuu(state, leadLuu, rawAttack, { instanceId: 'boss_enemy', isBoss: true });
  const overflowDamage = rawAttack > hpBefore ? rawAttack - hpBefore : 0;
  checkLuuKnockedOut(state, leadLuu, overflowDamage);

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'bossAttack',
    detail: { bossId: state.bosses.activeBoss.cardId, targetLuu: leadLuu.cardId, diceRoll, baseAttack, rawAttack }
  });
  console.log(`[resolveBossAttack] ${state.bosses.activeBoss.cardId} attacks ${leadLuu.cardId} for ${rawAttack}`);
}

function resolveSymptoticDrain(state, player) {
  // Tjeluu — start of round: highest attack Luu loses 1 base attack this round
  // Tracked via a temporary effect — log only for now, applied in calculateAttack
  const highestAttackLuu = player.luuQueue.reduce((best, luu) => {
    const card = CardRegistry.getCard(luu.cardId);
    const atk  = card ? card.stats.baseAttack[luu.level - 1] : 0;
    const bestCard = CardRegistry.getCard(best.cardId);
    const bestAtk  = bestCard ? bestCard.stats.baseAttack[best.level - 1] : 0;
    return atk > bestAtk ? luu : best;
  });

  state.bosses.activeBoss.synapticDrainTarget = highestAttackLuu.queuePosition;

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'synapticDrain',
    detail: { targetLuu: highestAttackLuu.cardId, attackReduction: 1 }
  });
  console.log(`[resolveSymptoticDrain] ${highestAttackLuu.cardId} loses 1 attack this round`);
}

function resolveWoundedPrey(state, targetLuu, baseAttack) {
  // Lynluu — +2 damage if target has damage counters
  if (targetLuu.damageCounters > 0) {
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'woundedPrey',
      detail: { targetLuu: targetLuu.cardId, bonusDamage: 2 }
    });
    return baseAttack + 2;
  }
  return baseAttack;
}

function resolveResilientCore(state) {
  // Forluu — end of round: recover HP equal to lead Luu damage counters, max 3
  const player  = state.players[state.position.currentPlayerIndex];
  const leadLuu = player.luuQueue.find(l => l.queuePosition === 1);
  if (!leadLuu) return;

  const healAmount = Math.min(leadLuu.damageCounters, 3);
  if (healAmount > 0) {
    state.bosses.activeBoss.currentHp = Math.min(
      state.bosses.activeBoss.currentHp + healAmount,
      state.bosses.activeBoss.maxHp
    );
    // Sync to active enemy
    const bossEnemy = state.activeEnemies.find(e => e.isBoss);
    if (bossEnemy) bossEnemy.currentHp = state.bosses.activeBoss.currentHp;

    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'resilientCore',
      detail: { healAmount, bossHpAfter: state.bosses.activeBoss.currentHp }
    });
    console.log(`[resolveResilientCore] Forluu recovered ${healAmount} HP`);
  }
}

function triggerBossChoice(state) {
  const sector = state.position.sectorNumber;
  let option1, option2;

  if (sector === 2) {
    // Draw 2 from pool — pool will have 2 remaining
    option1 = state.bosses.bossPool.shift();
    option2 = state.bosses.bossPool.shift();
  } else {
    // S3 or S4: pending boss vs new draw from pool
    option1 = state.bosses.pendingBoss;
    option2 = state.bosses.bossPool.shift();
    state.bosses.pendingBoss = null;
  }

  state.bosses.pendingBossChoice = { option1, option2 };

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'bossChoicePresented',
    detail: { sector, option1, option2 }
  });

  console.log(`[triggerBossChoice] S${sector} choice: ${option1} vs ${option2}`);
}

function completeSectorStart(state) {
  const player = state.players[state.position.currentPlayerIndex];

  // Power cards enter the draw pile at the start of Sector 3
  if (state.position.sectorNumber === 3 && state.deck.powerPile && state.deck.powerPile.length > 0) {
    state.deck.drawPile  = shuffle([...state.deck.drawPile, ...state.deck.powerPile]);
    state.deck.powerPile = [];
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'powerCardsEntered',
      detail: { sector: 3, newDrawPileSize: state.deck.drawPile.length }
    });
    console.log(`[completeSectorStart] S3 — Power cards shuffled into draw pile. Draw pile now: ${state.deck.drawPile.length} cards.`);
  }

  // Refill hand up to hand limit
  const handLimit   = HAND_LIMIT[state.config.playerCount];
  const cardsNeeded = Math.max(0, handLimit - player.hand.length);
  if (cardsNeeded > 0) {
    let actualDrawn = 0;
    for (let i = 0; i < cardsNeeded; i++) {
      if (drawCard(state, player.playerId) !== null) actualDrawn++;
    }
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'cardDrawn',
      detail: { source: 'sectorStart', count: actualDrawn }
    });
  }

  // Enforce hand limit — player may already be over limit from previous sector
  const handExcess = player.hand.length - handLimit;
  if (handExcess > 0) {
    state.pendingDiscard = {
      count:      handExcess,
      source:     'sectorStart',
      restrictTo: null,
      message:    `New sector starting — discard ${handExcess} card(s) to reach hand limit of ${handLimit}`
    };
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'handLimitExceeded',
      detail: { handSize: player.hand.length, limit: handLimit, mustDiscard: handExcess, source: 'sectorStart' }
    });
    console.log(`[completeSectorStart] Hand limit exceeded — must discard ${handExcess}`);
  }

  // Build new enemy deck for this sector
  initEnemyDeck(state);

  // Reset all Luu acted flags so new sector starts fresh
  for (const p of state.players) {
    for (const luu of p.luuQueue) {
      luu.actedThisTurn = false;
      luu.defendStatus  = false;
    }
    p.turnState.actionTakenThisTurn = false;
    p.turnState.cardsPlayedThisTurn = [];
    p.turnState.luutexSpentThisTurn = 0;
    p.turnState.overrideActive      = false;
    if (typeof UI !== 'undefined') UI.resetAction();
  }

  // Start wave 1 — only if no pending discard
  if (!state.pendingDiscard) {
    initWave(state);
    startRound(state);
    startPlayerTurn(state);
  } else {
    state.position.phase = 'pendingDiscard';
  }

  console.log(`[completeSectorStart] Sector ${state.position.sectorNumber} started`);
}

function checkSectorCleared(state) {
  // Add cleared boss to history
  state.bosses.clearedBosses.push(state.bosses.activeBoss.cardId);
  expireEffects(state, 'endOfSector');
  state.history.sectorsCleared++;

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'sectorCleared',
    detail: { sector: state.position.sectorNumber }
  });
  console.log(`[checkSectorCleared] Sector ${state.position.sectorNumber} cleared`);

  // Check win condition — player just cleared S5
  if (state.position.sectorNumber === 5) {
    state.gameStatus.status = 'won';
    state.gameStatus.wonAt  = new Date().toISOString();
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'gameWon',
      detail: { sectorsCleared: state.history.sectorsCleared }
    });
    console.log(`[checkSectorCleared] GAME WON!`);
    return;
  }

  // Advance to next sector
  state.position.sectorNumber++;
  state.position.waveNumber  = 1;
  state.position.roundNumber = 0;

  // S5: pendingBoss already determined at S4 choice — auto-assign, no player choice
  if (state.position.sectorNumber === 5) {
    state.bosses.activeBoss = buildBossState(state, state.bosses.pendingBoss);
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'bossSelected',
      detail: { bossId: state.bosses.activeBoss.cardId, sector: 5, autoSelected: true }
    });
    state.bosses.pendingBoss = null;
    console.log(`[checkSectorCleared] S5 boss auto-assigned: ${state.bosses.activeBoss.cardId}`);
    completeSectorStart(state);
    return;
  }

  // S2-S4: present boss choice to player — flow blocked until handleBossChoice fires
  triggerBossChoice(state);
}

function selectNextBoss(state) {
  // S1 boss (Tjeluu) is always hardcoded — only called for S2+
  if (state.bosses.bossPool.length === 0) {
    // No bosses left — use pendingBoss if exists
    if (state.bosses.pendingBoss) {
      state.bosses.activeBoss = buildBossState(state, state.bosses.pendingBoss);
      state.bosses.pendingBoss = null;
    }
    return;
  }

  // Draw next boss from pool
  const nextBossId = state.bosses.bossPool.shift();

  // If a pending boss exists — player gets to choose between pending and new
  if (state.bosses.pendingBoss) {
    state.bosses.currentChoice = {
      option1: state.bosses.pendingBoss,
      option2: nextBossId
    };
    // For now auto-select option1 (pendingBoss)
    // Stage 7: replace with player choice UI
    state.bosses.activeBoss  = buildBossState(state, state.bosses.pendingBoss);
    state.bosses.pendingBoss = nextBossId;
  } else {
    // No pending boss — use next from pool, store one ahead as pending
    state.bosses.activeBoss = buildBossState(state, nextBossId);
    // Peek at next boss for future sector
    if (state.bosses.bossPool.length > 0) {
      state.bosses.pendingBoss = state.bosses.bossPool.shift();
    }
  }

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'bossSelected',
    detail: { bossId: state.bosses.activeBoss.cardId, sector: state.position.sectorNumber }
  });
  console.log(`[selectNextBoss] S${state.position.sectorNumber} boss: ${state.bosses.activeBoss.cardId}`);
}

function buildBossState(state, bossCardId) {
  const bossCard  = CardRegistry.getBossCard(bossCardId);
  const sectorIdx = state.position.sectorNumber - 1;
  return {
    cardId:                bossCardId,
    currentHp:             bossCard.hpBySector[sectorIdx],
    maxHp:                 bossCard.hpBySector[sectorIdx],
    sectorEncountered:     state.position.sectorNumber,
    passiveActive:         true,
    bossFirstHitThisRound: true,
    synapticDrainTarget:   null
  };
}

function isTurnFlowBlocked(state) {
  // Any of these conditions means turn flow must pause
  if (state.gameStatus.status !== 'active') return true;
  if (state.pendingXpDistribution != null) return true;
  if (state.pendingDiscard != null) return true;
  if (state.pendingCardChoice != null) return true;
  if (state.pendingTargetSelection != null) return true;
  if (state.pendingConversion != null) return true;
  if (state.pendingDamageRedistribution != null) return true;
  if (state.pendingShieldSpread != null) return true;
  if (state.pendingDamageReallocate != null) return true;
  if (state.bosses.pendingBossChoice != null) return true;
  if (state.pendingTurnOrderSelection) return true;
  if (state.pendingRebirth) return true;
  if (state.chaosState?.pendingChaosDifficultySelect) return true;
  if (state.draftState?.phase !== 'complete') return true;
  if (state.draftState?.pendingMulligan)       return true;
  if (state.activeEnemies.length === 0) return true;
  return false;
}

function resolveAttack(state, targetEnemyInstanceId, diceResult, diceLabel = null) {
  const player    = state.players[state.position.currentPlayerIndex];
  const activeLuu = player.luuQueue.find(l => l.queuePosition === state.position.activeLuuPos);

  const targetEnemy = state.activeEnemies.find(e => e.instanceId === targetEnemyInstanceId);
  if (!targetEnemy) {
    console.warn(`[resolveAttack] Target not found: ${targetEnemyInstanceId}`);
    return;
  }

  const totalDamage = calculateAttack(state, activeLuu, targetEnemy, diceResult);
  // Overdrive — double final damage after all calculations
  let finalDamage = totalDamage;
  const overdriveEffect = state.globalActiveEffects.find(e =>
    e.cardId === 'action_overdrive' &&
    (e.attachedToCardId === activeLuu.cardId || e.attachedTo === activeLuu.queuePosition)
  );
  if (overdriveEffect) {
    finalDamage = totalDamage * 2;
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'overdriveFired',
      detail: { luuId: activeLuu.cardId, baseDamage: totalDamage, finalDamage }
    });
    console.log(`[resolveAttack] Overdrive — ${totalDamage} → ${finalDamage}`);
  }

  // Phase Shift — Rogue Gifluu evasion on d6 roll of 6
  const enemyCard = CardRegistry.getCard(targetEnemy.cardId);
  if (targetEnemy.class === 'Gifluu' && enemyCard?.trait?.name === 'Phase Shift') {
    const roll = Math.floor(Math.random() * 6) + 1;
    if (roll === 6) {
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'phaseShiftEvade',
        detail: { rogueId: targetEnemy.instanceId, rogueClass: targetEnemy.class, roll }
      });
      // Phase Shift rebound — Rogue Gifluu deals rebound damage to attacker
      const reboundDamage = enemyCard.trait?.effect?.reboundOnEvade || 0;
      if (reboundDamage > 0) {
        if (activeLuu && activeLuu.currentHp > 0) {
          applyDamageToLuu(state, activeLuu, reboundDamage, targetEnemy, false);
          checkLuuKnockedOut(state, activeLuu, 0, targetEnemy);
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'phaseShiftRebound',
            detail: {
              rogueId:    targetEnemy.instanceId,
              rogueClass: targetEnemy.class,
              luuId:      activeLuu.cardId,
              damage:     reboundDamage
            }
          });
          console.log(`[resolveAttack] Phase Shift rebound — ${targetEnemy.cardId} deals ${reboundDamage} to ${activeLuu.cardId}`);
        }
      }
      player.turnState.actionTakenThisTurn = true;
      if (isTurnFlowBlocked(state)) return;
      endLuuTurn(state);
      return;
    }
  }

  const damageResult = applyDamageToEnemy(state, targetEnemy, finalDamage);
  const actualDamage = damageResult.damageDealt;
  // Track damage dealt for Vital Drain
  if (actualDamage > 0 && activeLuu) {
    activeLuu.damageDealtThisRound = (activeLuu.damageDealtThisRound || 0) + actualDamage;
  }
  const enemyDefeated = checkEnemyDefeated(state, targetEnemy, activeLuu);

  player.turnState.actionTakenThisTurn = true;

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'attack',
    detail: {
      attackerPos:   activeLuu.queuePosition,
      attackerClass: activeLuu.class,
      targetId:      targetEnemyInstanceId,
      targetClass:   targetEnemy.class,
      targetIsBoss:  targetEnemy.isBoss || false,
      diceResult,
      diceLabel,
      totalDamage,
      actualDamage,
      blocked: damageResult.blocked
    }
  });

  console.log(`[resolveAttack] ${activeLuu.cardId} attacks ${targetEnemy.cardId} — calculated: ${totalDamage}, actual: ${actualDamage}${damageResult.blocked ? ' (blocked)' : ''}`);
  // Fire onAttack triggered effects (e.g. Luutex Tap)
  if (actualDamage > 0) fireTriggeredEffects(state, 'onAttack', { luu: activeLuu, targetEnemy });

  if (isTurnFlowBlocked(state)) {
    console.log('[resolveAttack] Turn flow blocked — pending state or wave transition');
    return;
  }

  endLuuTurn(state);
}

// ─────────────────────────────────────────────
// GROUP 3b — DEFEND, GATHER, MOVE ACTIONS
// ─────────────────────────────────────────────

function resolveDefend(state) {
  const player    = state.players[state.position.currentPlayerIndex];
  const activeLuu = player.luuQueue.find(l => l.queuePosition === state.position.activeLuuPos);

  activeLuu.defendStatus = true;

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'defend',
    detail: { luuId: activeLuu.cardId, position: activeLuu.queuePosition }
  });

  console.log(`[resolveDefend] ${activeLuu.cardId} is defending`);
  if (isTurnFlowBlocked(state)) return;
  endLuuTurn(state);
}

function resolveGather(state) {
  const player    = state.players[state.position.currentPlayerIndex];
  const activeLuu = player.luuQueue.find(l => l.queuePosition === state.position.activeLuuPos);

  const trackGain  = activeLuu.gatherTrack || 1;
  let totalGain    = trackGain;
  let bonusAmount  = 0;

  for (const bisluu of player.luuQueue.filter(l => l.class === 'Bisluu' && l.currentHp > 0)) {
    const colonyBond = state.globalActiveEffects.some(e =>
      e.cardId === 'action_colony_bond' &&
      (e.attachedToCardId === bisluu.cardId || e.attachedTo === bisluu.queuePosition)
    );
    const isAdjacent = Math.abs(bisluu.queuePosition - activeLuu.queuePosition) === 1;
    if (!isAdjacent && !colonyBond) continue;
    const bisluuCard = CardRegistry.getCard(bisluu.cardId);
    const bisluuGatherIndex = bisluu.evolved ? bisluu.level - 3 : bisluu.level - 1;
    const bonus      = bisluuCard.passive.effect.gatherBonus[bisluuGatherIndex];
    bonusAmount += bonus;
    totalGain   += bonus;
  }

  player.luutex.current                     += totalGain;
  state.roundTracking.luutexGainedThisRound += totalGain;

  // Reset gather track — stays at 1 if already at 1
  const trackBefore = activeLuu.gatherTrack;
  if (activeLuu.gatherTrack > 1) {
    activeLuu.gatherTrack = 1;
  }

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'gather',
    detail: {
      luuId:        activeLuu.cardId,
      luutexGained: totalGain,
      bisluuBonus:  bonusAmount,
      totalLuutex:  player.luutex.current,
      trackBefore,
      trackAfter:   activeLuu.gatherTrack
    }
  });

  console.log(`[resolveGather] ${activeLuu.cardId} gathered ${totalGain} Luutex (track ${trackBefore}→${activeLuu.gatherTrack})`);
  fireTriggeredEffects(state, 'onGather', { luu: activeLuu });
  if (isTurnFlowBlocked(state)) return;
  endLuuTurn(state);
}

function resolveMove(state, targetPosition) {
  const player      = state.players[state.position.currentPlayerIndex];
  const activeLuu   = player.luuQueue.find(l => l.queuePosition === state.position.activeLuuPos);
  const oldPosition = activeLuu.queuePosition;

  const isAdjacent = targetPosition === oldPosition - 1 || targetPosition === oldPosition + 1;
  const inBounds   = targetPosition >= 1 && targetPosition <= player.luuQueue.length;

  if (!isAdjacent || !inBounds) {
    console.warn(`[resolveMove] Invalid target position: ${targetPosition}`);
    return;
  }

  const swappedLuu = player.luuQueue.find(l => l.queuePosition === targetPosition);

  activeLuu.queuePosition  = targetPosition;
  swappedLuu.queuePosition = oldPosition;
  state.position.activeLuuPos = targetPosition;
  syncEffectPositions(state);
  player.luuQueue.sort((a, b) => a.queuePosition - b.queuePosition);

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'move',
    detail: { luuId: activeLuu.cardId, fromPosition: oldPosition, toPosition: targetPosition, swappedWith: swappedLuu.cardId }
  });

  console.log(`[resolveMove] ${activeLuu.cardId} moved from ${oldPosition} to ${targetPosition}`);
  if (isTurnFlowBlocked(state)) return;
  endLuuTurn(state);
}

// ─────────────────────────────────────────────
// GROUP 3c — ENEMY ATTACK PHASE
// ─────────────────────────────────────────────

function applyDamageToLuu(state, targetLuu, rawDamage, attackingEnemy, isOverflow = false) {
  const card = CardRegistry.getCard(targetLuu.cardId);

  // Phase Shift — Gifluu trait: evasion on d6 roll of 6
  if (card.trait && card.trait.name === 'Phase Shift') {
    // Double Phase — roll twice if active on this Gifluu
    const doublePhase = state.globalActiveEffects.find(e =>
      e.cardId === 'action_double_phase' &&
      (e.attachedToCardId === targetLuu.cardId || e.attachedTo === targetLuu.queuePosition)
    );
    const numRolls = doublePhase ? 2 : 1;
    const rolls    = Array.from({ length: numRolls }, () => Math.floor(Math.random() * 6) + 1);
    const evaded   = rolls.some(r => r === 6);

    console.log(`[applyDamageToLuu] Phase Shift rolls (${numRolls}x): [${rolls.join(', ')}] — ${evaded ? 'EVADED' : 'not evaded'}`);

    if (evaded) {
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'phaseShiftEvade',
        detail: { luuId: targetLuu.cardId, rolls, doublePhase: !!doublePhase }
      });
      return { damageDealt: 0, evaded: true };
    }
  }

  // Shell Reflex — damagePrevention active effects check
  // For each damagePrevention effect attached to this Luu, roll dice check
  if (!isOverflow) {
    const preventionEffects = state.globalActiveEffects.filter(e => {
      if (e.attachedToCardId !== targetLuu.cardId && e.attachedTo !== null) return false;
      const c = CardRegistry.getCard(e.cardId);
      return c && c.effects && c.effects.some(eff => eff.type === 'damagePrevention');
    });

    for (const effect of preventionEffects) {
      const effectCard = CardRegistry.getCard(effect.cardId);
      const prevention = effectCard.effects.find(e => e.type === 'damagePrevention');
      if (!prevention || !prevention.diceCheck) continue;

      const sides = prevention.diceCheck.diceType === 'd6' ? 6 : 4;
      const roll  = Math.floor(Math.random() * sides) + 1;
      const pass  = prevention.diceCheck.passOn.includes(roll);

      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'damagePrevention',
        detail: { luuId: targetLuu.cardId, cardId: effect.cardId, roll, prevented: pass }
      });
      console.log(`[applyDamageToLuu] Shell Reflex roll: ${roll} — ${pass ? 'PREVENTED' : 'no effect'}`);

      if (pass) {
        return { damageDealt: 0, evaded: true };
      }
    }
  }

  // Defend status — reduce by 2, minimum 0
  if (targetLuu.defendStatus) {
    rawDamage = Math.max(0, rawDamage - 2);
  }
  rawDamage = Math.max(0, rawDamage - getActiveStat(state, targetLuu, 'defence'));

  // Hardened Shell passive — base Kjeluu
  if (card.passive && card.passive.name === 'Hardened Shell') {
    const shellIndex = targetLuu.evolved ? targetLuu.level - 3 : targetLuu.level - 1;
    let reduction    = card.passive.effect.damageReduction[shellIndex];

    // Hardened Core — permanent reduction bonus for attached Kjeluu
    const hardenedCore = state.globalActiveEffects.find(e =>
      e.cardId === 'action_hardened_core' &&
      (e.attachedToCardId === targetLuu.cardId || e.attachedTo === targetLuu.queuePosition)
    );
    if (hardenedCore) {
      const hcCard  = CardRegistry.getCard('action_hardened_core');
      reduction    += hcCard?.effects[0]?.value || 0;
    }

    rawDamage = Math.max(0, rawDamage - reduction);
  }

  // Fortress Form passive — evolved Kjeluu self-damage reduction
  if (card.passive && card.passive.name === 'Fortress Form') {
    const shellIndex = targetLuu.level - 3;
    let selfReduction = card.passive.effect.selfDamageReduction[shellIndex];

    // Hardened Core — permanent reduction bonus for attached Kjeluu
    const hardenedCore = state.globalActiveEffects.find(e =>
      e.cardId === 'action_hardened_core' &&
      (e.attachedToCardId === targetLuu.cardId || e.attachedTo === targetLuu.queuePosition)
    );
    if (hardenedCore) {
      const hcCard   = CardRegistry.getCard('action_hardened_core');
      selfReduction += hcCard?.effects[0]?.value || 0;
    }

    rawDamage = Math.max(0, rawDamage - selfReduction);
    if (selfReduction > 0) {
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'fortressFormSelf',
        detail: { luuId: targetLuu.cardId, reduction: selfReduction }
      });
      console.log(`[applyDamageToLuu] Fortress Form self-reduction: -${selfReduction}`);
    }
  }

  // Impervious trait — Kjeluu
  if (card.trait && card.trait.name === 'Impervious') {
    if (rawDamage <= card.trait.effect.damageThreshold) rawDamage = 0;
  }

  // Fortress Form adjacent reduction — also checks Hardened Core bonus on the protecting Kjeluu
  {
    const player = state.players[state.position.currentPlayerIndex];
    for (const adjPos of [targetLuu.queuePosition - 1, targetLuu.queuePosition + 1]) {
      const adjKjeluu = player.luuQueue.find(l =>
        l.queuePosition === adjPos && l.class === 'Kjeluu' && l.evolved && l.currentHp > 0
      );
      if (!adjKjeluu) continue;
      const adjCard = CardRegistry.getCard(adjKjeluu.cardId);
      if (!adjCard || !adjCard.passive || adjCard.passive.name !== 'Fortress Form') continue;
      const adjIndex      = adjKjeluu.level - 3;
      let adjReduction    = adjCard.passive.effect.adjacentDamageReduction[adjIndex];

      // Hardened Core on the protecting Kjeluu — increases adjacent reduction too
      const adjHardenedCore = state.globalActiveEffects.find(e =>
        e.cardId === 'action_hardened_core' &&
        (e.attachedToCardId === adjKjeluu.cardId || e.attachedTo === adjKjeluu.queuePosition)
      );
      if (adjHardenedCore) {
        const hcCard   = CardRegistry.getCard('action_hardened_core');
        adjReduction  += hcCard?.effects[0]?.value || 0;
      }

      if (adjReduction <= 0) continue;
      rawDamage = Math.max(0, rawDamage - adjReduction);
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'fortressFormAdjacent',
        detail: { protectedLuu: targetLuu.cardId, kjeluuId: adjKjeluu.cardId, reduction: adjReduction }
      });
      console.log(`[applyDamageToLuu] Fortress Form adjacent reduction: ${adjKjeluu.cardId} protects ${targetLuu.cardId} by -${adjReduction}`);
    }
  }

  // Dampening Wave — halve all remaining damage (rounded down) after all other reductions
  if (rawDamage > 0) {
    const isDampened = state.globalActiveEffects.some(e => e.cardId === 'action_dampening_wave');
    if (isDampened) {
      const before = rawDamage;
      rawDamage    = Math.floor(rawDamage / 2);
      console.log(`[applyDamageToLuu] Dampening Wave — ${before} → ${rawDamage}`);
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'dampeningWave',
        detail: { luuId: targetLuu.cardId, before, after: rawDamage }
      });
    }
  }

  targetLuu.currentHp     = Math.max(0, targetLuu.currentHp - rawDamage);
  targetLuu.damageCounters = targetLuu.maxHp - targetLuu.currentHp;

  state.history.totalDamageTaken += rawDamage;
  // Track if lead Luu was hit this round for Predatory Strike
  const player = state.players[state.position.currentPlayerIndex];
  const leadLuu = player.luuQueue.find(l => l.queuePosition === 1);
  if (leadLuu && targetLuu.queuePosition === 1 && rawDamage > 0) {
    state.roundTracking.leadLuuHitThisRound = true;
  }
  if (rawDamage > 0) fireTriggeredEffects(state, 'onDamaged', { luu: targetLuu });

  // Toxic Rebound — fires on any direct hit, not only when defending
  // Does NOT fire on overflow damage (attackingEnemy === null) or rebound damage
  if (card.passive && card.passive.name === 'Toxic Rebound' && rawDamage > 0 && attackingEnemy !== null && attackingEnemy !== undefined && !isOverflow) {
    const reboundFraction = targetLuu.evolved ? 0.5 : 0.25;
    const reboundDamage   = Math.ceil(rawDamage * reboundFraction);
    applyDamageToEnemy(state, attackingEnemy, reboundDamage, true);
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'toxicRebound',
      detail: { luuId: targetLuu.cardId, reboundDamage, enemyId: attackingEnemy.instanceId }
    });
  }

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'damageToLuu',
    detail: { luuId: targetLuu.cardId, rawDamage, finalDamage: rawDamage, hpAfter: targetLuu.currentHp }
  });

  return { damageDealt: rawDamage, evaded: false };
}

function checkLuuKnockedOut(state, targetLuu, overflowDamage, attackingEnemy = null) {
  if (targetLuu.currentHp > 0) return false;

  // Tenacity — revive at 1 HP, block overflow, discard effect
  const tenacityEffect = state.globalActiveEffects.find(e =>
    e.cardId === 'action_tenacity' &&
    (e.attachedToCardId === targetLuu.cardId || e.attachedTo === targetLuu.queuePosition)
  );
  if (tenacityEffect) {
    // Revive at 1 HP — knockout does not proceed
    targetLuu.currentHp      = 1;
    targetLuu.damageCounters = targetLuu.maxHp - 1;

    // Remove Tenacity effect and discard card
    const idx = state.globalActiveEffects.findIndex(e => e.instanceId === tenacityEffect.instanceId);
    if (idx !== -1) state.globalActiveEffects.splice(idx, 1);
    state.deck.discardPile.push('action_tenacity');

    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'tenacityTriggered',
      detail: { luuId: targetLuu.cardId, overflowBlocked: overflowDamage }
    });
    console.log(`[checkLuuKnockedOut] Tenacity — ${targetLuu.cardId} revived at 1 HP, overflow ${overflowDamage} absorbed`);
    return false; // KO prevented — return false so no further KO processing
  }

  // Death Defiance — retaliate against attacking enemy when KO'd
  const deathDefianceEffect = state.globalActiveEffects.find(e =>
    e.cardId === 'action_death_defiance' &&
    (e.attachedToCardId === targetLuu.cardId || e.attachedTo === targetLuu.queuePosition)
  );
  if (deathDefianceEffect && attackingEnemy !== null) {
    const ddCard = CardRegistry.getCard('action_death_defiance');
    const bossDamage = ddCard?.effects[0]?.value || 10;

    if (attackingEnemy.isBoss) {
      // Boss — deal fixed damage instead of instant KO
      attackingEnemy.currentHp      = Math.max(0, attackingEnemy.currentHp - bossDamage);
      attackingEnemy.damageCounters  = attackingEnemy.maxHp - attackingEnemy.currentHp;
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'deathDefianceBoss',
        detail: { luuId: targetLuu.cardId, bossId: attackingEnemy.cardId, damage: bossDamage, bossHpAfter: attackingEnemy.currentHp }
      });
      console.log(`[checkLuuKnockedOut] Death Defiance — boss ${attackingEnemy.cardId} takes ${bossDamage} damage (${attackingEnemy.currentHp} HP remaining)`);
      // Check if boss defeated
      if (attackingEnemy.currentHp <= 0) {
        checkEnemyDefeated(state, attackingEnemy, targetLuu);
      }
    } else {
      // Rogue — instant KO regardless of HP
      const hpBefore            = attackingEnemy.currentHp;
      attackingEnemy.currentHp   = 0;
      attackingEnemy.damageCounters = attackingEnemy.maxHp;
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'deathDefianceKill',
        detail: { luuId: targetLuu.cardId, enemyId: attackingEnemy.instanceId, enemyClass: attackingEnemy.class, hpBefore }
      });
      console.log(`[checkLuuKnockedOut] Death Defiance — ${attackingEnemy.class} instantly knocked out`);
      checkEnemyDefeated(state, attackingEnemy, targetLuu);
    }

    // Remove Death Defiance effect and discard card
    const idx = state.globalActiveEffects.findIndex(e => e.instanceId === deathDefianceEffect.instanceId);
    if (idx !== -1) state.globalActiveEffects.splice(idx, 1);
    state.deck.discardPile.push('action_death_defiance');

    // Luu still dies — proceed with normal KO sequence below
  }

  const player = state.players[state.position.currentPlayerIndex];
  const luuId  = targetLuu.cardId;

  // Effects cleanup handled by syncEffectPositions after queue reorder

  const knockedOutPosition = targetLuu.queuePosition;
  player.luuQueue = player.luuQueue.filter(l => l.queuePosition !== knockedOutPosition);
  player.luuQueue.sort((a, b) => a.queuePosition - b.queuePosition);
  player.luuQueue.forEach((l, i) => { l.queuePosition = i + 1; });
  syncEffectPositions(state, knockedOutPosition);

  state.history.luuLost.push(targetLuu.cardId);
  // Track knocked-out Luu metadata for Rebirth and Last Stand cards
  const baseCardId = `luu_${targetLuu.class.toLowerCase()}`;
  state.knockedOutLuuPool.push({
    cardId:     targetLuu.cardId,
    class:      targetLuu.class,
    level:      targetLuu.level,
    evolved:    targetLuu.evolved,
    baseCardId: baseCardId
  });
  console.log(`[checkLuuKnockedOut] ${targetLuu.cardId} added to knockedOutLuuPool at level ${targetLuu.level}`);
  // Add knocked out Luu card to discard pile
  state.deck.discardPile.push(targetLuu.cardId);
  // Fire onLuuKnockedOut trigger — Last Lesson and Last Stand card respond here
  fireTriggeredEffects(state, 'onLuuKnockedOut', {
    knockedOutCardId:  targetLuu.cardId,
    knockedOutClass:   targetLuu.class,
    knockedOutLevel:   targetLuu.level,
    knockedOutEvolved: targetLuu.evolved
  });

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'luuKnockedOut',
    detail: { luuId, overflowDamage }
  });

  if (player.luuQueue.length === 0) {
    state.gameStatus.status     = 'lost';
    state.gameStatus.lostAt     = new Date().toISOString();
    state.gameStatus.loseReason = 'allLuuDefeated';
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'gameLost',
      detail: { reason: 'allLuuDefeated' }
    });
    console.log(`[checkLuuKnockedOut] GAME OVER — all Luu defeated`);
    return true;
  }

  if (overflowDamage > 0) {
    const nextLuu = player.luuQueue.find(l => l.queuePosition === 1);
    if (nextLuu) {
      applyDamageToLuu(state, nextLuu, overflowDamage, null, true);
      checkLuuKnockedOut(state, nextLuu, 0);
    }
  }

  console.log(`[checkLuuKnockedOut] ${luuId} knocked out`);
  return true;
}

function resolveEnemyAttacks(state) {
  if (state.position.phase !== 'enemyAttack') return;

  const player = state.players[state.position.currentPlayerIndex];
  if (!player.luuQueue.find(l => l.queuePosition === 1)) return;

  let totalRogueAttack = 0;
  const attackingEnemiesThisRound = []; // tracks per-enemy damage + reference for Toxic Rebound
  for (const enemy of state.activeEnemies) {
    if (enemy.attackedThisRound) continue;

    const leadLuu = player.luuQueue.find(l => l.queuePosition === 1);
    if (!leadLuu) break;

    if (enemy.isBoss) {
      // Boss attack — handled by resolveBossAttack
      resolveBossAttack(state);
      enemy.attackedThisRound = true;

      // Resolve end-of-round boss passives
      const bossCard = CardRegistry.getBossCard(state.bosses.activeBoss.cardId);
      if (bossCard.passive.name === 'Resilient Core') {
        resolveResilientCore(state);
      }
    } else {
      const card      = CardRegistry.getCard(enemy.cardId);
      const dice      = SECTOR_DICE[state.position.sectorNumber];
      const isSuppressed = state.globalActiveEffects.some(e => e.cardId === 'action_suppression_field');
      let diceRoll;
      if (state.chaosState?.maxDiceNextAttack) {
        diceRoll = SECTOR_MAX_DICE[state.position.sectorNumber] || 4;
        console.log(`[resolveEnemyAttacks] Surge Protocol — max dice: ${diceRoll}`);
      } else if (isSuppressed) {
        diceRoll = dice.length === 1 ? 1 : 2;
        console.log(`[resolveEnemyAttacks] Suppression Field active — minimum dice: ${diceRoll}`);
      } else {
        diceRoll = Math.floor(Math.random() * dice[0]) + 1;
      }
      let rawAttack   = card.stats.baseAttack + diceRoll;
      if (enemy.sectorBonusActive) rawAttack += 1;

      // Bonded Boost — Rogue Bisluu adjacency attack bonus for this round
      if (enemy.bondedBoostBonus > 0) {
        rawAttack += enemy.bondedBoostBonus;
        console.log(`[resolveEnemyAttacks] Bonded Boost — ${enemy.cardId} +${enemy.bondedBoostBonus} attack (total: ${rawAttack})`);
      }

      // Type advantage vs lead Luu
      const currentLeadLuu = player.luuQueue.find(l => l.queuePosition === 1);
      if (currentLeadLuu && card.typeAdvantage) {
        if (card.typeAdvantage.beats === currentLeadLuu.class) {
          // Shell Shift on lead Luu negates enemy type advantage
          const leadHasShellShift = state.globalActiveEffects.some(e => {
            const ec = CardRegistry.getCard(e.cardId);
            if (!ec || !ec.effects) return false;
            if (!ec.effects.some(eff => eff.stat === 'typeDisadvantage')) return false;
            return e.attachedToCardId === currentLeadLuu.cardId
              || e.attachedTo === currentLeadLuu.queuePosition;
          });
          if (!leadHasShellShift) {
            rawAttack += 1;
            state.turnLog.push({
              logId:  nextLogId(state),
              action: 'typeAdvantage',
              detail: { enemyId: enemy.instanceId, bonus: 1, reason: `${enemy.class} beats ${currentLeadLuu.class}` }
            });
            console.log(`[resolveEnemyAttacks] Type advantage — ${enemy.class} beats ${currentLeadLuu.class}: +1`);
          } else {
            state.turnLog.push({
              logId:  nextLogId(state),
              action: 'shellShiftNegated',
              detail: { luuId: currentLeadLuu.cardId, negated: 'enemyTypeAdvantage', enemyClass: enemy.class }
            });
            console.log(`[resolveEnemyAttacks] Shell Shift — ${currentLeadLuu.cardId} negated ${enemy.class} type advantage`);
          }
        } else if (card.typeAdvantage.losesTo === currentLeadLuu.class) {
          rawAttack = Math.max(0, rawAttack - 1);
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'typeDisadvantage',
            detail: { enemyId: enemy.instanceId, penalty: 1, reason: `${enemy.class} loses to ${currentLeadLuu.class}` }
          });
          console.log(`[resolveEnemyAttacks] Type disadvantage — ${enemy.class} loses to ${currentLeadLuu.class}: -1`);
        }
      }

      // Predatory Strike — Rogue Rasluu trait
      // +1 damage if lead Luu was already hit this round by another enemy
      if (card.trait && card.trait.name === 'Predatory Strike') {
        if (state.roundTracking.leadLuuHitThisRound) {
          rawAttack += 1;
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'predatoryStrike',
            detail: { enemyId: enemy.instanceId, bonus: 1 }
          });
          console.log(`[resolveEnemyAttacks] Predatory Strike — +1 damage`);
        }
      }

      enemy.attackedThisRound = true;
      // Species Ward — halve damage from warded class
      const speciesWard = state.globalActiveEffects.find(e =>
        e.cardId === 'action_species_ward' && e.wardedClass === enemy.class
      );
      if (speciesWard) {
        const before = rawAttack;
        rawAttack    = Math.floor(rawAttack / 2);
        console.log(`[resolveEnemyAttacks] Species Ward — ${enemy.class} halved: ${before} → ${rawAttack}`);
      }
      totalRogueAttack += rawAttack;
      attackingEnemiesThisRound.push({ enemyRef: enemy, rawAttack });

      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'enemyAttack',
        detail: {
          enemyId:        enemy.instanceId,
          enemyClass:     enemy.class,
          enemyTier:      enemy.tier,
          targetLuu:      leadLuu.cardId,
          targetLuuClass: leadLuu.class,
          diceRoll,
          rawAttack
        }
      });
      console.log(`[resolveEnemyAttacks] ${enemy.cardId} attacks ${leadLuu.cardId} for ${rawAttack}`);
    }

    if (state.gameStatus.status === 'lost') break;
  }

  // Apply accumulated rogue damage — check for Shield Spread first
  if (totalRogueAttack > 0 && state.gameStatus.status !== 'lost') {
    const shieldSpreadEffect = state.globalActiveEffects.find(e => e.cardId === 'action_shield_spread');
    const leadLuu = player.luuQueue.find(l => l.queuePosition === 1);

    if (shieldSpreadEffect && leadLuu && player.luuQueue.length > 1) {
      // Shield Spread active — present redistribution modal with total damage
      state.pendingShieldSpread = {
        totalDamage:   totalRogueAttack,
        allocation:    {},
        minLeadDamage: 1
      };
      state.pendingShieldSpread.allocation[1] = totalRogueAttack;
      console.log(`[resolveEnemyAttacks] Shield Spread active — ${totalRogueAttack} total damage, awaiting redistribution`);
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'shieldSpreadPending',
        detail: { totalDamage: totalRogueAttack }
      });
      return;
    } else if (leadLuu) {
      // No Shield Spread — apply damage per enemy to preserve enemy reference
      // This ensures Toxic Rebound and other per-hit passives fire correctly
      for (const enemy of attackingEnemiesThisRound) {
        const currentLeadLuu = player.luuQueue.find(l => l.queuePosition === 1);
        if (!currentLeadLuu) break;
        if (state.gameStatus.status === 'lost') break;

        const hpBefore = currentLeadLuu.currentHp;
        applyDamageToLuu(state, currentLeadLuu, enemy.rawAttack, enemy.enemyRef, false);
        const overflowDamage = enemy.rawAttack > hpBefore ? enemy.rawAttack - hpBefore : 0;
        checkLuuKnockedOut(state, currentLeadLuu, overflowDamage, enemy.enemyRef);
      }
    }
  }

  if (state.gameStatus.status !== 'lost' && !state.pendingShieldSpread) {
    resolvePostEnemyAttack(state);
  }

  if (state.chaosState?.maxDiceNextAttack) {
    state.chaosState.maxDiceNextAttack = false;
    console.log('[resolveEnemyAttacks] Surge Protocol expired');
  }

  console.log(`[resolveEnemyAttacks] Enemy attack phase complete`);
}

// ─────────────────────────────────────────────
// GROUP 4 — LEVEL UP AND EVOLUTION
// ─────────────────────────────────────────────

function checkLevelUp(state, targetLuu) {
  if (targetLuu.xp < 5) return false;
  if (targetLuu.level >= 3 && targetLuu.evolved === false) return false;
  if (targetLuu.level >= 5) return false;
  resolveLevelUp(state, targetLuu);
  return true;
}

function resolveLevelUp(state, targetLuu) {
  targetLuu.xp    -= 5;
  targetLuu.level += 1;

  const card = CardRegistry.getCard(targetLuu.cardId);
  // Evolved cards start at L3 — their stats array index 0 = L3, 1 = L4, 2 = L5
  // Base cards index 0 = L1, 1 = L2, 2 = L3
  const statIndex = targetLuu.evolved
    ? targetLuu.level - 3
    : targetLuu.level - 1;
  const newMaxHp = card.stats.health[statIndex];
  const hpIncrease = newMaxHp - targetLuu.maxHp;

  targetLuu.maxHp          = newMaxHp;
  targetLuu.currentHp      = Math.min(targetLuu.currentHp + hpIncrease, newMaxHp);
  targetLuu.damageCounters  = targetLuu.maxHp - targetLuu.currentHp;

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'levelUp',
    detail: { luuId: targetLuu.cardId, newLevel: targetLuu.level, newMaxHp, hpIncrease }
  });

  console.log(`[resolveLevelUp] ${targetLuu.cardId} levelled up to L${targetLuu.level}`);

  if (targetLuu.xp >= 5) checkLevelUp(state, targetLuu);
}

function validateEvolution(state, evolvedCardId, targetLuu) {
  const card = CardRegistry.getCard(evolvedCardId);
  if (card.cardType !== 'LuuEvolved') return { valid: false, reason: 'notAnEvolvedCard' };
  if (card.playCondition.targetClass !== targetLuu.class) return { valid: false, reason: 'classMismatch' };
  if (targetLuu.level < card.playCondition.targetMinLevel) return { valid: false, reason: 'levelTooLow' };
  if (targetLuu.evolved !== false) return { valid: false, reason: 'alreadyEvolved' };
  return { valid: true };
}

function resolveEvolution(state, evolvedCardId, targetLuuQueuePosition, calledFromPlayCard = false) {
  const player    = state.players[state.position.currentPlayerIndex];
  const targetLuu = player.luuQueue.find(l => l.queuePosition === targetLuuQueuePosition);
  const originalCardId = targetLuu.cardId;

  const validation = validateEvolution(state, evolvedCardId, targetLuu);
  if (!validation.valid) {
    console.warn(`[resolveEvolution] Invalid: ${validation.reason}`);
    return;
  }

  const evolvedCard = CardRegistry.getCard(evolvedCardId);
  // Evolved cards: index 0 = L3, 1 = L4, 2 = L5
  const newMaxHp = evolvedCard.stats.health[targetLuu.level - 3];
  const hpIncrease  = newMaxHp - targetLuu.maxHp;

  // Discard the base card when evolution occurs
  state.deck.discardPile.push(originalCardId);

  targetLuu.cardId          = evolvedCardId;
  targetLuu.evolved         = true;
  targetLuu.maxHp           = newMaxHp;
  targetLuu.currentHp       = Math.min(targetLuu.currentHp + hpIncrease, newMaxHp);
  targetLuu.damageCounters  = targetLuu.maxHp - targetLuu.currentHp;

  // Only remove from hand if not already removed by playCard
  if (!calledFromPlayCard) {
    const handIdx = player.hand.indexOf(evolvedCardId);
    if (handIdx !== -1) player.hand.splice(handIdx, 1);
  }
  state.deck.discardPile.push(evolvedCardId);

  if (targetLuu.xp >= 5) checkLevelUp(state, targetLuu);

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'evolution',
    detail: { evolvedCardId, previousCardId: originalCardId, targetPosition: targetLuuQueuePosition, newMaxHp, hpIncrease }
  });

  console.log(`[resolveEvolution] ${originalCardId} evolved into ${evolvedCardId}`);
}

// ─────────────────────────────────────────────
// GROUP 5a — CARD PLAYING LOGIC
// ─────────────────────────────────────────────

function validatePlayCard(state, cardId, targetLuuQueuePosition) {
  if (state.chaosState?.cardPlayBannedThisWave) {
    console.warn('[validatePlayCard] Signal Jam — card playing banned this wave');
    return { valid: false, reason: 'signalJam' };
  }

  const player = state.players[state.position.currentPlayerIndex];

  if (!player.hand.includes(cardId)) return { valid: false, reason: 'cardNotInHand' };

  const card = CardRegistry.getCard(cardId);
  if (player.luutex.current < card.cost) return { valid: false, reason: 'insufficientLuutex' };

  if (card.cardType === 'Luu') {
    if (player.luuQueue.length >= state.config.luuQueueLimit) return { valid: false, reason: 'queueFull' };
  }

  if (card.cardType === 'LuuEvolved') {
    if (targetLuuQueuePosition == null) return { valid: false, reason: 'noTargetSpecified' };
    const targetLuu = player.luuQueue.find(l => l.queuePosition === targetLuuQueuePosition);
    const result = validateEvolution(state, cardId, targetLuu);
    if (!result.valid) return result;
  }

  if (card.cardType === 'ActionCard') {
    if (card.playCondition) {
      // Condition evaluation implemented per-card in Group 5b
    }
  }

  return { valid: true };
}

function playCard(state, cardId, targetLuuQueuePosition) {
  const validation = validatePlayCard(state, cardId, targetLuuQueuePosition);
  if (!validation.valid) {
    console.warn(`[playCard] Invalid: ${validation.reason}`);
    return false;
  }

  const player = state.players[state.position.currentPlayerIndex];
  const card   = CardRegistry.getCard(cardId);

  player.luutex.current                        -= card.cost;
  player.turnState.luutexSpentThisTurn         += card.cost;

  const handIdx = player.hand.indexOf(cardId);
  player.hand.splice(handIdx, 1);
  player.turnState.cardsPlayedThisTurn.push(cardId);

  if (card.cardType === 'Luu')        resolveLuuCard(state, cardId);
  if (card.cardType === 'LuuEvolved') resolveEvolution(state, cardId, targetLuuQueuePosition, true);
  if (card.cardType === 'ActionCard') resolveActionCard(state, cardId);

  if (card.consumesAction !== false) {
    player.turnState.actionTakenThisTurn = true;
  }

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'cardPlayed',
    detail: { cardId, cardType: card.cardType, cost: card.cost, luutexRemaining: player.luutex.current }
  });

  console.log(`[playCard] ${cardId} played (cost: ${card.cost})`);
  return true;
}

function resolveLuuCard(state, cardId) {
  const player      = state.players[state.position.currentPlayerIndex];
  const card        = CardRegistry.getCard(cardId);
  const newPosition = player.luuQueue.length + 1;

  player.luuQueue.push(createLuuQueueEntry(cardId, newPosition));

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'luuPlayed',
    detail: { cardId, class: card.class, queuePosition: newPosition }
  });

  console.log(`[resolveLuuCard] ${cardId} added to queue at position ${newPosition}`);
}

// ─────────────────────────────────────────────
// GROUP 5b — ACTION CARD RESOLUTION
// ─────────────────────────────────────────────

function resolveActionCard(state, cardId) {
  const card   = CardRegistry.getCard(cardId);
  const player = state.players[state.position.currentPlayerIndex];

  // If card requires a target Luu — pause and ask player to choose
  if (requiresTargetSelection(card) && player.luuQueue.length > 1) {
    state.pendingTargetSelection = {
      cardId:  cardId,
      options: player.luuQueue.map(l => ({ queuePosition: l.queuePosition, cardId: l.cardId, class: l.class, level: l.level, hp: `${l.currentHp}/${l.maxHp}` }))
    };
    console.log(`[resolveActionCard] Target selection required for ${cardId}`);
    return;
  }

  // Single Luu in queue or no target required — resolve immediately
  for (const effect of card.effects) {
    // If a pending card choice exists from previous effect — stop and wait
    if (state.pendingCardChoice) {
      // Store remaining effects to resolve after choice
      const effectIndex = card.effects.indexOf(effect);
      state.pendingCardChoice.remainingEffects = card.effects.slice(effectIndex);
      state.pendingCardChoice.remainingCardId  = cardId;
      break;
    }
    resolveEffect(state, effect, cardId, player);
  }

  if (card.effects.some(e => e.timing !== 'immediate' && e.trigger !== 'onPlay')) {
    registerPersistentEffect(state, cardId, player);
  }

  if (card.effects.every(e => e.discardCondition === 'immediate')) {
    state.deck.discardPile.push(cardId);
  }
}

function resolveActionCardWithTarget(state, cardId, targetQueuePosition) {
  const card   = CardRegistry.getCard(cardId);
  const player = state.players[state.position.currentPlayerIndex];

  // Override activeLuuPos temporarily so resolveEffect targets correctly
  const originalPos = state.position.activeLuuPos;
  state.position.activeLuuPos = targetQueuePosition;

  for (const effect of card.effects) {
    resolveEffect(state, effect, cardId, player);
  }

  // Restore original activeLuuPos
  state.position.activeLuuPos = originalPos;

  // Register persistent effect with correct target
  if (card.effects.some(e => e.timing !== 'immediate' && e.trigger !== 'onPlay')) {
    const attachedLuu = player.luuQueue.find(l => l.queuePosition === targetQueuePosition);
    const entry = {
      instanceId:       `effect_${state.globalActiveEffects.length + 1}`,
      cardId:           cardId,
      playedByPlayer:   player.playerId,
      attachedTo:       targetQueuePosition,
      attachedToCardId: attachedLuu ? attachedLuu.cardId : null,
      trigger:          card.effects[0].trigger,
      discardCondition: card.effects[0].discardCondition,
      expiresAt:        card.effects[0].timing,
      activationCount:  0,
      usesPerRound:     card.effects[0].usesPerRound || null
    };
    state.globalActiveEffects.push(entry);
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'persistentEffectRegistered',
      detail: { cardId, attachedTo: targetQueuePosition, trigger: card.effects[0].trigger }
    });
  }

  if (card.effects.every(e => e.discardCondition === 'immediate')) {
    state.deck.discardPile.push(cardId);
  }

  state.pendingTargetSelection = null;

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'targetSelected',
    detail: { cardId, targetQueuePosition }
  });

  console.log(`[resolveActionCardWithTarget] ${cardId} resolved on position ${targetQueuePosition}`);
}

function requiresTargetSelection(card) {
  return card.attachedTo === 'playerChoosesAtPlay';
}

function resolveEffect(state, effect, cardId, player) {
  switch (effect.type) {

    case 'resourceGain': {
      // Colony Harvest — sum all gather tracks, add to each player's Luutex, reset tracks
      if (effect.stat === 'colonyGatherHarvest') {
        for (const p of state.players) {
          const playerGain = p.luuQueue.reduce((s, l) => s + (l.gatherTrack || 1), 0);
          p.luutex.current += playerGain;
          for (const luu of p.luuQueue) luu.gatherTrack = 1;
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'colonyHarvest',
            detail: { playerId: p.playerId, luutexGained: playerGain, totalLuutex: p.luutex.current }
          });
          console.log(`[resolveEffect] Colony Harvest — ${p.playerId} gained ${playerGain} Luutex, all tracks reset`);
        }
        break;
      }
      if (effect.trigger === 'onPlay') {
        player.luutex.current                     += effect.value;
        state.roundTracking.luutexGainedThisRound += effect.value;
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'luutexGained',
          detail: { source: cardId, amount: effect.value, total: player.luutex.current }
        });
        console.log(`[resolveEffect] resourceGain: +${effect.value} Luutex`);
      }
      break;
    }

    case 'healing': {
      if (effect.trigger === 'onPlay' && (effect.timing === 'immediate' || !effect.timing)) {
        // Full Restore — set HP to max
        if (effect.value === 'full') {
          const targetLuu = player.luuQueue.find(l =>
            l.queuePosition === (state.pendingTargetPos || state.position.activeLuuPos)
          );
          if (targetLuu && targetLuu.currentHp > 0) {
            const restored       = targetLuu.maxHp - targetLuu.currentHp;
            targetLuu.currentHp       = targetLuu.maxHp;
            targetLuu.damageCounters  = 0;
            state.turnLog.push({
              logId:  nextLogId(state),
              action: 'healing',
              detail: { luuId: targetLuu.cardId, amount: restored, source: cardId }
            });
            console.log(`[resolveEffect] Full Restore — ${targetLuu.cardId} restored to full HP (${restored} HP recovered)`);
          }
          break;
        }
        if (effect.target === 'oneLuu') {
          const targetLuu = player.luuQueue.find(l => l.queuePosition === state.position.activeLuuPos);
          if (targetLuu) {
            targetLuu.currentHp      = Math.min(targetLuu.currentHp + effect.value, targetLuu.maxHp);
            targetLuu.damageCounters = targetLuu.maxHp - targetLuu.currentHp;
            state.turnLog.push({
              logId:  nextLogId(state),
              action: 'healing',
              detail: { luuId: targetLuu.cardId, healAmount: effect.value, hpAfter: targetLuu.currentHp }
            });
          }
        } else if (effect.target === 'allLuu') {
          for (const luu of player.luuQueue) {
            if (luu.currentHp > 0) {
              luu.currentHp      = Math.min(luu.currentHp + effect.value, luu.maxHp);
              luu.damageCounters = luu.maxHp - luu.currentHp;
              state.turnLog.push({
                logId:  nextLogId(state),
                action: 'healing',
                detail: { luuId: luu.cardId, healAmount: effect.value, hpAfter: luu.currentHp }
              });
            }
          }
        }
        console.log(`[resolveEffect] healing: ${effect.value} HP`);
      }
      break;
    }

    case 'xpModifier': {
      if (effect.trigger === 'onPlay' || effect.timing === 'immediate') {
        // Immediate XP grant
        const targetLuu = player.luuQueue.find(l => l.queuePosition === state.position.activeLuuPos);
        if (targetLuu) {
          targetLuu.xp += effect.value;
          checkLevelUp(state, targetLuu);
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'xpGained',
            detail: { luuId: targetLuu.cardId, amount: effect.value, totalXp: targetLuu.xp }
          });
          console.log(`[resolveEffect] xpModifier immediate: +${effect.value} XP to ${targetLuu.cardId}`);
        }
      } else {
        // Trigger-based (onKill etc) — registered as persistent by resolveActionCard
        console.log(`[resolveEffect] xpModifier persistent: ${effect.trigger} — registered via persistentEffect`);
      }
      break;
    }

    case 'cardDraw': {
      if (effect.trigger === 'onPlay' && effect.timing === 'immediate') {
        if (effect.searchIn === 'discardPile') {
          let candidates = [...state.deck.discardPile];
          if (effect.searchFor && effect.searchFor.cardType !== 'any') {
            const types = Array.isArray(effect.searchFor.cardType)
              ? effect.searchFor.cardType
              : [effect.searchFor.cardType];
            candidates = candidates.filter(id => {
              const c = CardRegistry.getCard(id);
              return c && types.includes(c.cardType);
            });
          }
          if (candidates.length === 0) {
            console.warn(`[resolveEffect] cardDraw: no matching cards in discard pile`);
            break;
          }
          // Present player choice rather than auto-picking
          state.pendingCardChoice = {
            type: 'discardSearch',
            options: candidates,
            source: 'discardPile',
            shuffleAfter: false
          };
          console.log(`[resolveEffect] cardDraw from discard: ${candidates.length} options — awaiting player choice`);
        } else {
          const drawn = drawFromDeck(state, effect.value);
          player.hand.push(...drawn);
          if (effect.rules && effect.rules.drawThenDiscardOne === true) {
            state.pendingDiscard = { count: 1, source: cardId, restrictTo: drawn };
          }
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'cardDrawn',
            detail: { source: 'drawPile', count: effect.value }
          });
        }
        console.log(`[resolveEffect] cardDraw: ${effect.value} cards`);
      } else if (effect.trigger === 'onKill' || effect.trigger === 'onDamaged') {
        // Deferred triggered draw — register in globalActiveEffects
        const instanceId = `effect_${cardId}_${Date.now()}`;
        state.globalActiveEffects.push({
          instanceId,
          cardId,
          playedByPlayer:   player.playerId,
          attachedTo:       null,
          attachedToCardId: null,
          trigger:          effect.trigger,
          discardCondition: effect.discardCondition,
          expiresAt:        effect.timing,
          activationCount:  0,
          usesThisRound:    0
        });
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'effectRegistered',
          detail: { cardId, trigger: effect.trigger, timing: effect.timing }
        });
        console.log(`[resolveEffect] ${cardId} registered as deferred ${effect.trigger} card draw effect`);
      }
      break;
    }

    case 'discard': {
      if (effect.target === 'hand') {
        state.pendingDiscard = { count: effect.value, source: cardId };
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'discardPending',
          detail: { count: effect.value }
        });
        console.log(`[resolveEffect] discard: pending player choice`);
      }
      break;
    }

    case 'statModifier': {
      // Suppression Field — global round-long effect, register directly
      if (effect.stat === 'enemySuppressed') {
        const instanceId = `effect_${cardId}_${Date.now()}`;
        state.globalActiveEffects.push({
          instanceId,
          cardId,
          playedByPlayer:   player.playerId,
          attachedTo:       null,
          attachedToCardId: null,
          trigger:          effect.trigger,
          discardCondition: effect.discardCondition,
          expiresAt:        effect.timing,
          activationCount:  0,
          usesThisRound:    0,
          usesThisWave:     0
        });
        console.log(`[resolveEffect] Suppression Field registered as global round effect`);
        break;
      }
      if (effect.stat === 'damageHalved') {
        const instanceId = `effect_${cardId}_${Date.now()}`;
        state.globalActiveEffects.push({
          instanceId,
          cardId,
          playedByPlayer:   player.playerId,
          attachedTo:       null,
          attachedToCardId: null,
          trigger:          effect.trigger,
          discardCondition: effect.discardCondition,
          expiresAt:        effect.timing,
          activationCount:  0,
          usesThisRound:    0,
          usesThisWave:     0
        });
        console.log(`[resolveEffect] Dampening Wave registered as global round effect`);
        break;
      }
      // Tactical Command — permanent global effect, register directly
      if (effect.stat === 'tacticalCommand') {
        const instanceId = `effect_${cardId}_${Date.now()}`;
        state.globalActiveEffects.push({
          instanceId,
          cardId,
          playedByPlayer:   player.playerId,
          attachedTo:       null,
          attachedToCardId: null,
          trigger:          'roundStart',
          discardCondition: 'manual',
          expiresAt:        'permanent',
          activationCount:  0,
          usesThisRound:    0,
          usesThisWave:     0
        });
        console.log(`[resolveEffect] Tactical Command registered as permanent round-start effect`);
        break;
      }
      // Species Ward — requires class selection before registering
      if (effect.stat === 'speciesWard') {
        state.pendingSpeciesWard = { cardId };
        console.log(`[resolveEffect] Species Ward — awaiting class selection`);
        break;
      }
      if (effect.timing === 'immediate' && effect.trigger === 'onPlay') {
        // Surge Protocol — set all gather tracks to max value
        if (effect.stat === 'gatherTrackMax') {
          for (const p of state.players) {
            for (const luu of p.luuQueue) {
              luu.gatherTrack = effect.value;
            }
          }
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'surgeProtocol',
            detail: { newTrack: effect.value }
          });
          console.log(`[resolveEffect] Surge Protocol — all gather tracks set to ${effect.value}`);
          break;
        }
        // Special case: playCost override for pack_call free Lagluu
        if (effect.stat === 'playCost') {
          // Check condition — Pack Call free play only applies if required class is in queue
          if (effect.condition && effect.condition.type === 'luuInPlay' && effect.condition.class) {
            const requiredClass = effect.condition.class;
            const inQueue = player.luuQueue.some(l => l.class === requiredClass);
            if (!inQueue) {
              console.log(`[resolveEffect] playCost free play condition not met — no ${requiredClass} in queue`);
              break;
            }
          }
          state.pendingCardChoice = {
            type: 'deckSearch',
            options: player.hand.filter(id => {
              const c = CardRegistry.getCard(id);
              return c && c.class === 'Lagluu' && c.cardType === 'Luu';
            }),
            source: 'hand',
            freePlay: true
          };
          console.log(`[resolveEffect] statModifier: playCost override — free Lagluu play pending`);
          break;
        }
        const targetLuu = player.luuQueue.find(l => l.queuePosition === state.position.activeLuuPos);
        if (targetLuu) {
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'statModified',
            detail: { luuId: targetLuu.cardId, stat: effect.stat, value: effect.value }
          });
        }
        console.log(`[resolveEffect] statModifier immediate: ${effect.stat} ${effect.value}`);
      } else {
        // Persistent — already registered by resolveActionCard
        // Just log that it is active
        console.log(`[resolveEffect] statModifier persistent: ${effect.stat} registered via persistentEffect`);
      }
      break;
    }

    case 'queueManipulation': {
      if (effect.value === 'fullRearrange') {
        state.pendingQueueRearrange = true;
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'queueRearrangePending',
          detail: { source: cardId }
        });
        console.log(`[resolveEffect] queueManipulation: fullRearrange pending`);
      } else if (effect.value === 'moveOneAnyPosition') {
        state.pendingQueueMove = { source: cardId, usesPerWave: effect.usesPerWave || 1 };
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'queueMovePending',
          detail: { source: cardId }
        });
        console.log(`[resolveEffect] queueManipulation: moveOneAnyPosition pending`);
      }
      break;
    }

    case 'turnOrderOverride': {
      const player = state.players[state.position.currentPlayerIndex];
      player.turnState.overrideActive = true;
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'turnOrderOverride',
        detail: { source: cardId }
      });
      console.log(`[resolveEffect] turnOrderOverride: active this round`);
      // Immediately trigger Luu selection if more than one unacted Luu exists
      const unacted = player.luuQueue.filter(l => !l.actedThisTurn);
      if (unacted.length > 1) {
        state.position.activeLuuId  = null;
        state.position.activeLuuPos = null;
        state.position.phase        = 'choosingLuu';
      }
      break;
    }

    case 'deckSearch': {
      if (effect.trigger === 'onPlay') {
        const types = Array.isArray(effect.searchFor.cardType)
          ? effect.searchFor.cardType
          : [effect.searchFor.cardType];
        const classFilter = effect.searchFor.class || null;

        const matchIdx = state.deck.drawPile.findIndex(id => {
          const c = CardRegistry.getCard(id);
          if (!c) return false;
          if (!types.includes(c.cardType)) return false;
          if (classFilter && c.class !== classFilter) return false;
          return true;
        });

        if (matchIdx === -1) {
          console.warn(`[resolveEffect] deckSearch: no matching card found`);
          break;
        }

        // Collect ALL matching cards and present choice to player
        const allMatches = [];
        const matchIndices = [];
        state.deck.drawPile.forEach((id, idx) => {
          const c = CardRegistry.getCard(id);
          if (!c) return;
          if (!types.includes(c.cardType)) return;
          if (classFilter && c.class !== classFilter) return;
          allMatches.push(id);
          matchIndices.push(idx);
        });

        if (allMatches.length === 0) {
          console.warn(`[resolveEffect] deckSearch: no matching cards found`);
          break;
        }

        // Store pending choice — UI will present options
        state.pendingCardChoice = {
          type: 'deckSearch',
          options: allMatches,
          shuffleAfter: !!effect.shuffleAfter,
          source: 'drawPile'
        };
        console.log(`[resolveEffect] deckSearch: ${allMatches.length} options found — awaiting player choice`);
      }
      break;
    }

    case 'xpShare': {
      // Persistent effect — registered by resolveActionCard, not here
      // Do nothing in resolveEffect to avoid double registration
      break;
    }

    case 'luuRecovery': {
      if (effect.trigger === 'onPlay') {
        const types = Array.isArray(effect.searchFor.cardType)
          ? effect.searchFor.cardType
          : [effect.searchFor.cardType];

        const candidates = state.deck.discardPile.filter(id => {
          const c = CardRegistry.getCard(id);
          return c && types.includes(c.cardType);
        });

        if (candidates.length === 0) {
          console.warn(`[resolveEffect] luuRecovery: no Luu in discard pile`);
          break;
        }

        state.pendingCardChoice = {
          type: 'luuRecovery',
          options: candidates,
          source: 'discardPile'
        };
        console.log(`[resolveEffect] luuRecovery: ${candidates.length} options — awaiting player choice`);
      }
      break;
    }

    case 'damagePrevention': {
      // Persistent — registered by resolveActionCard
      // Actual prevention logic runs in applyDamageToLuu
      console.log(`[resolveEffect] damagePrevention registered for ${cardId}`);
      break;
    }

    case 'conversion': {
      if (effect.trigger === 'onPlay') {

        // Find a Rogue to convert — player must choose
        // For now present choice of active enemies
        if (state.activeEnemies.length === 0) {
          console.warn(`[resolveEffect] conversion: no active enemies to purify`);
          break;
        }

        // Store pending conversion choice
        state.pendingConversion = {
          enemies: state.activeEnemies.map(e => ({
            instanceId: e.instanceId,
            class: e.class,
            cardId: e.cardId,
            tier: e.tier
          }))
        };

        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'conversionPending',
          detail: { source: cardId }
        });
        console.log(`[resolveEffect] conversion: awaiting player choice of Rogue to purify`);
      }
      break;
    }

    case 'damageRedistribution': {
      if (effect.timing === 'immediate' && effect.trigger === 'onPlay') {
        // Emergency Mend — immediate reallocation of existing damage counters
        const totalDamage = player.luuQueue.reduce((sum, luu) => sum + luu.damageCounters, 0);
        if (totalDamage === 0) {
          console.warn('[resolveEffect] Emergency Mend: no damage counters to reallocate');
          break;
        }
        // Build starting allocation from current damage counters
        const allocation = {};
        for (const luu of player.luuQueue) {
          allocation[luu.queuePosition] = luu.damageCounters;
        }
        state.pendingDamageReallocate = {
          allocation,
          totalDamage,
          rules:        effect.rules || {},
          sourceCardId: cardId
        };
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'emergencyMendPending',
          detail: { totalDamage, sourceCardId: cardId }
        });
        console.log(`[resolveEffect] Emergency Mend — ${totalDamage} damage counters to reallocate`);
      } else {
        // Shield Spread — persistent wave-scoped effect, registered by resolveActionCard
        console.log(`[resolveEffect] damageRedistribution registered for ${cardId} — wave scope`);
      }
      break;
    }

    case 'forcedLevelUp': {
      if (effect.trigger === 'onPlay' && effect.timing === 'immediate') {
        const targetLuu = player.luuQueue.find(l =>
          l.queuePosition === (state.pendingTargetPos || state.position.activeLuuPos)
        );
        if (!targetLuu) break;

        const luuCard  = CardRegistry.getLuuCard(targetLuu.cardId);
        const maxLevel = luuCard?.levelTrack?.max || (targetLuu.evolved ? 5 : 3);

        if (targetLuu.level >= maxLevel) {
          console.log(`[resolveEffect] Forced Evolution — ${targetLuu.cardId} already at max level ${maxLevel}`);
          break;
        }

        const newLevel    = targetLuu.level + 1;
        const healthIndex = targetLuu.evolved ? newLevel - 3 : newLevel - 1;
        const newMaxHp    = luuCard?.stats.health[healthIndex];
        if (!newMaxHp) break;

        const newCurrentHp  = Math.max(1, newMaxHp - targetLuu.damageCounters);
        targetLuu.level     = newLevel;
        targetLuu.maxHp     = newMaxHp;
        targetLuu.currentHp = newCurrentHp;
        targetLuu.xp        = 0;

        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'forcedEvolution',
          detail: { luuId: targetLuu.cardId, newLevel, newMaxHp, newCurrentHp }
        });
        console.log(`[resolveEffect] Forced Evolution — ${targetLuu.cardId} leveled to ${newLevel} (maxHp: ${newMaxHp})`);
      }
      break;
    }

    case 'luuResurrection': {
      if (effect.trigger === 'onPlay' && effect.timing === 'immediate') {
        const queueLimit = state.config.luuQueueLimit;

        if (!state.knockedOutLuuPool || state.knockedOutLuuPool.length === 0) {
          console.warn('[resolveEffect] Rebirth — no knocked-out Luu available');
          break;
        }
        if (player.luuQueue.length >= queueLimit) {
          console.warn('[resolveEffect] Rebirth — queue is full');
          break;
        }

        state.pendingRebirth = {
          options: [...state.knockedOutLuuPool]
        };
        console.log(`[resolveEffect] Rebirth — ${state.knockedOutLuuPool.length} option(s) available`);
      }
      break;
    }

    default:
      console.warn(`[resolveEffect] Unhandled effect type: ${effect.type} — skipped`);
  }
}

function registerPersistentEffect(state, cardId, player) {
  const card = CardRegistry.getCard(cardId);
  // Global effects: allLuu target OR no attachedTo field OR attachedTo is null
  const isGlobal = card.effects[0].target === 'allLuu'
    || card.attachedTo === null
    || card.attachedTo === undefined;
  const targetPos = isGlobal ? null : state.position.activeLuuPos;
  const targetLuu = targetPos !== null
    ? player.luuQueue.find(l => l.queuePosition === targetPos)
    : null;

  const entry = {
    instanceId:       `effect_${state.globalActiveEffects.length + 1}`,
    cardId:           cardId,
    playedByPlayer:   player.playerId,
    attachedTo:       targetPos,
    attachedToCardId: targetLuu ? targetLuu.cardId : null,
    trigger:          card.effects[0].trigger,
    discardCondition: card.effects[0].discardCondition,
    expiresAt:        card.effects[0].timing,
    activationCount:  0,
    usesThisRound:    0,
    usesThisWave:     0,
    usesPerRound:     card.effects[0].usesPerRound || null
  };
  state.globalActiveEffects.push(entry);
  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'persistentEffectRegistered',
    detail: { cardId, trigger: card.effects[0].trigger, discardCondition: card.effects[0].discardCondition }
  });
  console.log(`[registerPersistentEffect] ${cardId} registered`);
}

function syncEffectPositions(state, knockedOutPosition = null) {
  const player = state.players[state.position.currentPlayerIndex];

  // Step 1 — remove effects attached to the knocked-out position BEFORE cardId search
  // This prevents duplicate-cardId Luu from inheriting effects of the knocked-out Luu
  if (knockedOutPosition !== null) {
    const toRemove = state.globalActiveEffects.filter(e =>
      e.attachedToCardId !== null && e.attachedTo === knockedOutPosition
    );
    for (const effect of toRemove) {
      state.deck.discardPile.push(effect.cardId);
      state.turnLog.push({
        logId:  nextLogId(state),
        action: 'effectExpired',
        detail: { cardId: effect.cardId, reason: 'luuKnockedOut' }
      });
      console.log(`[syncEffectPositions] ${effect.cardId} removed — attached Luu knocked out at pos ${knockedOutPosition}`);
    }
    state.globalActiveEffects = state.globalActiveEffects.filter(e =>
      !(e.attachedToCardId !== null && e.attachedTo === knockedOutPosition)
    );
  }

  // Step 2 — update positions for surviving effects
  for (const effect of state.globalActiveEffects) {
    if (effect.attachedToCardId === null) continue;
    const luu = player.luuQueue.find(l => l.cardId === effect.attachedToCardId);
    if (luu) {
      effect.attachedTo = luu.queuePosition;
    } else {
      effect.attachedTo       = null;
      effect.attachedToCardId = null;
    }
  }

  // Step 3 — remove any remaining orphaned effects
  state.globalActiveEffects = state.globalActiveEffects.filter(
    e => e.attachedToCardId !== null || e.attachedTo === null
  );
}

function expireEffects(state, condition) {
  const expiring = state.globalActiveEffects.filter(e => e.discardCondition === condition);

  for (const effect of expiring) {
    state.deck.discardPile.push(effect.cardId);
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'effectExpired',
      detail: { cardId: effect.cardId, reason: condition }
    });
    console.log(`[expireEffects] ${effect.cardId} expired (${condition})`);
  }

  state.globalActiveEffects = state.globalActiveEffects.filter(
    e => e.discardCondition !== condition
  );
}

function getActiveStat(state, luu, stat) {
  let bonus = 0;
  for (const effect of state.globalActiveEffects) {
    const card = CardRegistry.getCard(effect.cardId);
    if (!card || !card.effects) continue;

    const matchingEffect = card.effects.find(e => e.stat === stat);
    if (!matchingEffect) continue;

    // Check if this effect applies to this Luu
    const appliesToAll  = matchingEffect.target === 'allLuu';
    const appliesToThis = effect.attachedToCardId !== null
      ? effect.attachedToCardId === luu.cardId
      : effect.attachedTo === luu.queuePosition;

    if (appliesToAll || appliesToThis) {
      bonus += matchingEffect.value;
    }
  }
  return bonus;
}

function fireTriggeredEffects(state, trigger, context) {
  const player = state.players[state.position.currentPlayerIndex];
  const toRemove = [];

  for (const effect of state.globalActiveEffects) {
    if (effect.trigger !== trigger) continue;

    const card = CardRegistry.getCard(effect.cardId);
    if (!card) continue;

    const cardEffect = card.effects.find(e => e.trigger === trigger);
    if (!cardEffect) continue;

    // Check usesPerRound limit for triggered effects
    if (cardEffect.usesPerRound && (effect.usesThisRound || 0) >= cardEffect.usesPerRound) {
      console.log(`[fireTriggeredEffects] ${effect.cardId} — usesPerRound limit reached (${cardEffect.usesPerRound})`);
      continue;
    }

    // For onDamaged effects attached to a specific Luu — only fire if the damaged Luu matches
    if (trigger === 'onDamaged' && effect.attachedToCardId !== null && context && context.luu) {
      const matchesCardId   = effect.attachedToCardId === context.luu.cardId;
      const matchesPosition = effect.attachedTo === context.luu.queuePosition;
      if (!matchesCardId && !matchesPosition) {
        console.log(`[fireTriggeredEffects] ${effect.cardId} — onDamaged skipped, damaged Luu does not match attached Luu`);
        continue;
      }
    }

    switch (cardEffect.type) {

      case 'cardDraw': {
          // onLuuKnockedOut — Last Lesson: search discard pile, pick any card except knocked-out Luu
          if (trigger === 'onLuuKnockedOut') {
            const excludeId = context && context.knockedOutCardId;
            const options   = state.deck.discardPile.filter(id => id !== excludeId);
            if (options.length === 0) {
              console.log(`[fireTriggeredEffects] Last Lesson — discard pile empty, no card to draw`);
              break;
            }
            state.pendingCardChoice = {
              type:    'discardSearch',
              options,
              source:  'discardPile',
              target:  'hand',
              cardId:  effect.cardId,
              message: 'Last Lesson — choose any card from the discard pile'
            };
            console.log(`[fireTriggeredEffects] Last Lesson triggered — ${options.length} options in discard pile`);
            break;
          }
          const drawn = drawFromDeck(state, cardEffect.value);
          player.hand.push(...drawn);
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'cardDrawn',
            detail: { source: 'triggeredEffect', cardId: effect.cardId, count: cardEffect.value }
          });
          console.log(`[fireTriggeredEffects] ${effect.cardId} triggered: drew ${cardEffect.value} card(s)`);
          break;
        }

      case 'xpShare': {
        const xpAmount = cardEffect.value === 'rogueXpValue'
          ? (context.xpValue || 0)
          : cardEffect.value;

        // Determine targets — allLuu or specific attached Luu
        const targets = cardEffect.target === 'allLuu'
          ? player.luuQueue
          : player.luuQueue.filter(l => l.queuePosition === effect.attachedTo);

        for (const targetLuu of targets) {
          targetLuu.xp += xpAmount;
          checkLevelUp(state, targetLuu);
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'xpShared',
            detail: { cardId: effect.cardId, luuId: targetLuu.cardId, xpAmount, totalXp: targetLuu.xp }
          });
          console.log(`[fireTriggeredEffects] ${effect.cardId}: shared ${xpAmount} XP to ${targetLuu.cardId}`);
        }
        break;
      }

      case 'xpModifier': {
        const bonus = cardEffect.stat === 'xpMultiplier'
          ? (context.xpValue || 0) * (cardEffect.value - 1)
          : cardEffect.value;

        if (bonus <= 0) break;

        // Rising Tide — find weakest Luu (lowest level, then xp, then queue position)
        if (cardEffect.target === 'weakestLuu') {
          const candidates = [...player.luuQueue].sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            if (a.xp    !== b.xp)    return a.xp - b.xp;
            return a.queuePosition - b.queuePosition;
          });
          const weakest = candidates[0];
          if (weakest) {
            weakest.xp += cardEffect.value;
            checkLevelUp(state, weakest);
            state.turnLog.push({
              logId:  nextLogId(state),
              action: 'risingTideXp',
              detail: { luuId: weakest.cardId, class: weakest.class, xpAdded: cardEffect.value, totalXp: weakest.xp }
            });
            console.log(`[fireTriggeredEffects] Rising Tide — +${cardEffect.value} XP to ${weakest.cardId} (weakest in queue)`);
          }
          break;
        }

        // Global effect (e.g. Evolution Drive) — route through XP distribution queue
        if (effect.attachedTo === null && effect.attachedToCardId === null) {
          queueXpDistribution(state, bonus, false);
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'xpBonusTriggered',
            detail: { cardId: effect.cardId, bonus, source: 'global', distributed: true }
          });
          console.log(`[fireTriggeredEffects] ${effect.cardId}: +${bonus} XP bonus queued for distribution`);
          break;
        }

        // Luu-specific effect — add directly to attached Luu
        const targetLuu = effect.attachedToCardId
          ? player.luuQueue.find(l => l.cardId === effect.attachedToCardId)
          : player.luuQueue.find(l => l.queuePosition === effect.attachedTo);
        if (!targetLuu) break;
        targetLuu.xp += bonus;
        checkLevelUp(state, targetLuu);
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'xpBonusTriggered',
          detail: { cardId: effect.cardId, luuId: targetLuu.cardId, bonus, totalXp: targetLuu.xp }
        });
        console.log(`[fireTriggeredEffects] ${effect.cardId}: +${bonus} XP bonus to ${targetLuu.cardId}`);
        break;
      }

      case 'resourceGain': {
        if (cardEffect.rules?.perUniqueRoguePerRound || cardEffect.rules?.perUniqueRoguePerWave) {
          if ((effect.firedOnEnemies || []).includes(context.targetEnemy?.instanceId)) break;
          effect.firedOnEnemies = effect.firedOnEnemies || [];
          effect.firedOnEnemies.push(context.targetEnemy?.instanceId);
        }
        player.luutex.current += cardEffect.value;
        state.roundTracking.luutexGainedThisRound += cardEffect.value;
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'luutexGained',
          detail: { source: effect.cardId, amount: cardEffect.value, total: player.luutex.current }
        });
        console.log(`[fireTriggeredEffects] ${effect.cardId}: +${cardEffect.value} Luutex`);
        break;
      }

      case 'healing': {
        // Vital Drain — heal based on damage dealt this round
        if (cardEffect.healFromDamageDealt) {
          const targetLuu = player.luuQueue.find(l =>
            l.cardId === effect.attachedToCardId || l.queuePosition === effect.attachedTo
          );
          if (!targetLuu || targetLuu.currentHp <= 0) break;
          const damageDealt = targetLuu.damageDealtThisRound || 0;
          const healAmount  = Math.floor(damageDealt * (cardEffect.healFraction || 0.5));
          if (healAmount <= 0) break;
          const actualHeal  = Math.min(healAmount, targetLuu.maxHp - targetLuu.currentHp);
          if (actualHeal <= 0) break;
          targetLuu.currentHp      += actualHeal;
          targetLuu.damageCounters  = Math.max(0, targetLuu.maxHp - targetLuu.currentHp);
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'vitalDrainHeal',
            detail: { luuId: targetLuu.cardId, healAmount: actualHeal, damageDealt }
          });
          console.log(`[fireTriggeredEffects] Vital Drain — ${targetLuu.cardId} healed ${actualHeal} HP (dealt ${damageDealt} this round)`);
          break;
        }
        // Handles Pack Mending (roundEnd) and Regenerative Pulse (waveEnd)
        const healValue = cardEffect.healScalesBySector
          ? state.position.sectorNumber
          : cardEffect.value;

        for (const targetLuu of player.luuQueue) {
          if (targetLuu.currentHp <= 0) continue;
          if (cardEffect.condition && cardEffect.condition.type === 'targetHpAbove' && targetLuu.currentHp <= cardEffect.condition.value) continue;
          const healAmount = Math.min(healValue, targetLuu.maxHp - targetLuu.currentHp);
          if (healAmount <= 0) continue;
          targetLuu.currentHp      += healAmount;
          targetLuu.damageCounters  = Math.max(0, targetLuu.maxHp - targetLuu.currentHp);
          state.turnLog.push({
            logId:  nextLogId(state),
            action: 'triggeredHeal',
            detail: { luuId: targetLuu.cardId, amount: healAmount, source: effect.cardId, trigger }
          });
          console.log(`[fireTriggeredEffects] ${effect.cardId} healed ${targetLuu.cardId} for ${healAmount} HP (trigger: ${trigger})`);
        }
        break;
      }
    }

    effect.usesThisRound = (effect.usesThisRound || 0) + 1;
    effect.activationCount++;
    if (cardEffect.discardCondition === 'onTrigger' || cardEffect.discardCondition === 'onKill') {
      toRemove.push(effect.instanceId);
    }
  }

  for (const instanceId of toRemove) {
    const spent = state.globalActiveEffects.find(e => e.instanceId === instanceId);
    if (spent) state.deck.discardPile.push(spent.cardId);
    state.globalActiveEffects = state.globalActiveEffects.filter(e => e.instanceId !== instanceId);
  }
}

function handleAttack(enemyInstanceId) {
  if (typeof LuuSession !== 'undefined' && !LuuSession.isMyTurn(GS)) {
    console.warn('[LUU] Action blocked — not your turn');
    return;
  }
  if (GS.chaosState.attackBannedRound !== null &&
      GS.position.roundNumber === GS.chaosState.attackBannedRound) {
    console.warn('[handleAttack] Blackout — attacks banned this round');
    GS.turnLog.push({ logId: nextLogId(GS), action: 'blackoutBlocked', detail: { round: GS.position.roundNumber } });
    UI.render(GS);
    return;
  }
  const dice    = SECTOR_DICE[GS.position.sectorNumber];
  const rolls   = dice.map(sides => Math.floor(Math.random() * sides) + 1);
  let diceResult = rolls.reduce((s, r) => s + r, 0);
  let diceLabel  = dice.length === 1
    ? `d${dice[0]}: ${diceResult}`
    : `d${dice[0]}+d${dice[1]}: ${diceResult} (${rolls.join('+')})`;

  // Call the Shot — use chosen value if active for this Luu
  const activeLuuPos = GS.position.activeLuuPos;
  const player       = GS.players[GS.position.currentPlayerIndex];
  const activeLuu    = player.luuQueue.find(l => l.queuePosition === activeLuuPos);

  // Check if Split Strike is attached to this Luu
  const splitStrikeEffect = GS.globalActiveEffects.find(e =>
    e.cardId === 'action_split_strike' &&
    (e.attachedTo === activeLuuPos || e.attachedToCardId === activeLuu?.cardId)
  );

  if (splitStrikeEffect) {
    const baseAttack = activeLuu
      ? (CardRegistry.getLuuCard(activeLuu.cardId)?.stats.baseAttack[activeLuu.level - 1] || 0)
      : 0;

    let finalDice = diceResult;
    if (GS.callTheShotActive &&
        GS.callTheShotActive.luuQueuePosition === activeLuuPos &&
        GS.callTheShotActive.chosenValue !== null) {
      finalDice = GS.callTheShotActive.chosenValue;
      if (activeLuu) activeLuu.traitUsedThisWave = true;
      GS.callTheShotActive = null;
    }

    const totalPool = baseAttack + finalDice;

    GS.pendingSplitStrike = {
      effectInstanceId: splitStrikeEffect.instanceId,
      attackerPos:      activeLuuPos,
      attackerCardId:   activeLuu?.cardId,
      totalPool,
      diceLabel,
      baseAttack,
      allocation:       {}
    };

    for (const enemy of GS.activeEnemies) {
      GS.pendingSplitStrike.allocation[enemy.instanceId] = 0;
    }

    console.log(`[handleAttack] Split Strike active — pool: ${totalPool} (${baseAttack} base + ${finalDice} dice). Awaiting allocation.`);
    UI.render(GS);
    return;
  }

  if (GS.callTheShotActive &&
      GS.callTheShotActive.luuQueuePosition === activeLuuPos &&
      GS.callTheShotActive.chosenValue !== null) {
    diceResult = GS.callTheShotActive.chosenValue;
    diceLabel  = `🎯 Called: ${diceResult}`;
    if (activeLuu) activeLuu.traitUsedThisWave = true;
    GS.turnLog.push({
      logId:  nextLogId(GS),
      action: 'callTheShotUsed',
      detail: { luuClass: activeLuu?.class, chosenValue: diceResult, sector: GS.position.sectorNumber }
    });
    GS.callTheShotActive = null;
  }

  console.log(`[handleAttack] Rolling ${diceLabel}`);
  resolveAttack(GS, enemyInstanceId, diceResult, diceLabel);
  syncToSupabase();
  UI.render(GS);
}

function handleActivateCallTheShot(luuQueuePosition) {
  const luu = GS.players[0].luuQueue.find(l => l.queuePosition === luuQueuePosition);
  if (!luu || luu.class !== 'Rasluu') return;
  if (luu.traitUsedThisWave) return;
  if (GS.position.activeLuuPos !== luuQueuePosition) return;

  GS.callTheShotActive = { luuQueuePosition, chosenValue: null };
  console.log(`[handleActivateCallTheShot] Rasluu at pos ${luuQueuePosition} activated Call the Shot`);
  UI.render(GS);
}

function handleSetCallTheShotValue(value) {
  if (!GS.callTheShotActive) return;
  GS.callTheShotActive.chosenValue = value;
  console.log(`[handleSetCallTheShotValue] Called: ${value}`);
  UI.render(GS);
}

function handleCancelCallTheShot() {
  GS.callTheShotActive = null;
  UI.render(GS);
}

function handleDefend() {
  if (typeof LuuSession !== 'undefined' && !LuuSession.isMyTurn(GS)) {
    console.warn('[LUU] Action blocked — not your turn');
    return;
  }
  resolveDefend(GS);
  syncToSupabase();
  UI.render(GS);
}

function handleGather() {
  if (typeof LuuSession !== 'undefined' && !LuuSession.isMyTurn(GS)) {
    console.warn('[LUU] Action blocked — not your turn');
    return;
  }
  resolveGather(GS);
  syncToSupabase();
  UI.render(GS);
}

function handleMove(targetPosition) {
  if (typeof LuuSession !== 'undefined' && !LuuSession.isMyTurn(GS)) {
    console.warn('[LUU] Action blocked — not your turn');
    return;
  }
  resolveMove(GS, targetPosition);
  syncToSupabase();
  UI.render(GS);
}

function handleEnemyAttacks() {
  if (typeof LuuSession !== 'undefined' && !LuuSession.isMyTurn(GS)) {
    console.warn('[LUU] Action blocked — not your turn');
    return;
  }
  resolveEnemyAttacks(GS);
  syncToSupabase();
  UI.render(GS);
}

function handleSpeciesWardSelect(className) {
  if (!GS.pendingSpeciesWard) return;
  const player     = GS.players[GS.position.currentPlayerIndex];
  const instanceId = `effect_species_ward_${Date.now()}`;
  GS.globalActiveEffects.push({
    instanceId,
    cardId:           GS.pendingSpeciesWard.cardId,
    playedByPlayer:   player.playerId,
    attachedTo:       null,
    attachedToCardId: null,
    trigger:          'passive',
    discardCondition: 'endOfSector',
    expiresAt:        'thisSector',
    wardedClass:      className,
    activationCount:  0,
    usesThisRound:    0,
    usesThisWave:     0
  });
  GS.pendingSpeciesWard = null;
  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'speciesWardActive',
    detail: { wardedClass: className }
  });
  console.log(`[handleSpeciesWardSelect] Species Ward active — ${className} damage halved this sector`);
  UI.render(GS);
}

function handlePlayCard(cardId, targetLuuQueuePosition) {
  if (typeof LuuSession !== 'undefined' && !LuuSession.isMyTurn(GS)) {
    console.warn('[LUU] Action blocked — not your turn');
    return;
  }
  // Check if this card has a free play pending
  if (GS.pendingFreePlay === cardId) {
    const card = CardRegistry.getCard(cardId);
    const originalCost = card.cost;
    card.cost = 0;
    playCard(GS, cardId, targetLuuQueuePosition);
    card.cost = originalCost;
    GS.pendingFreePlay = null;
  } else {
    playCard(GS, cardId, targetLuuQueuePosition);
  }
  syncToSupabase();
  UI.render(GS);
}

function handleQueueMove(fromPosition, toPosition) {
  const player = GS.players[0];
  const luuA   = player.luuQueue.find(l => l.queuePosition === fromPosition);
  const luuB   = player.luuQueue.find(l => l.queuePosition === toPosition);
  if (luuA && luuB) {
    luuA.queuePosition = toPosition;
    luuB.queuePosition = fromPosition;
  }
  UI.render(GS);
}

function handleConfirmRearrange() {
  GS.pendingQueueRearrange = false;
  GS.players[0].luuQueue.sort((a, b) => a.queuePosition - b.queuePosition);
  syncEffectPositions(GS);

  // Update activeLuuPos to follow the active Luu to its new position
  // activeLuuPos stores a position number — if the active Luu moved, update it
  if (GS.position.activeLuuPos !== null) {
    const activeLuu = GS.players[0].luuQueue.find(l => l.cardId === GS.position.activeLuuId);
    if (activeLuu) {
      GS.position.activeLuuPos = activeLuu.queuePosition;
    }
  }

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'queueRearranged',
    detail: { newOrder: GS.players[0].luuQueue.map(l => ({ pos: l.queuePosition, class: l.class })) }
  });
  syncToSupabase();
  UI.render(GS);
}

function handleDiscardCard(cardId) {
  const player = GS.players[0];
  const idx = player.hand.indexOf(cardId);
  if (idx !== -1) {
    player.hand.splice(idx, 1);
    GS.deck.discardPile.push(cardId);

    GS.turnLog.push({
      logId:  nextLogId(GS),
      action: 'cardDiscarded',
      detail: { cardId, source: 'playerChoice' }
    });

    // Check if more discards needed
    const discardSource = GS.pendingDiscard.source;
    GS.pendingDiscard.count--;
    if (GS.pendingDiscard.count <= 0) {
      // Capture thenDraw before clearing pendingDiscard
      const thenDraw = GS.pendingDiscard.thenDraw || 0;
      const source   = GS.pendingDiscard.source;
      GS.pendingDiscard = null;

      // Neural Cascade — draw after discard
      if (thenDraw > 0) {
        const drawn = drawFromDeck(GS, thenDraw);
        player.hand.push(...drawn);
        GS.turnLog.push({
          logId:  nextLogId(GS),
          action: 'neuralCascadeDraw',
          detail: { cardDrawn: drawn[0] || null, source: 'neuralCascade' }
        });
        console.log(`[handleDiscardCard] Neural Cascade — drew ${drawn.length} card(s) after discard`);
      }

      // Neural Cascade source — draw already handled above, no further flow needed
      if (source === 'neuralCascade') {
        UI.render(GS);
        return;
      }

      if (GS.position.phase === 'pendingDiscard') {
        if (discardSource === 'bossWaveStart') {
          startBossWave(GS);
        } else if (discardSource === 'sectorStart') {
          initWave(GS);
          startRound(GS);
          startPlayerTurn(GS);
        } else {
          initWave(GS);
          startRound(GS);
          startPlayerTurn(GS);
        }
      }
    }
  }
  syncToSupabase();
  UI.render(GS);
}

function handleMulligan() {
  executeMulligan(GS);
  UI.render(GS);
}

function handleKeepHand() {
  GS.mulliganAvailable = false;
  UI.render(GS);
}

function handleTargetSelection(cardId, targetQueuePosition) {
  resolveActionCardWithTarget(GS, cardId, targetQueuePosition);
  UI.render(GS);
}

function handleCancelTargetSelection() {
  // Return card to hand
  const cardId = GS.pendingTargetSelection.cardId;
  const player = GS.players[0];
  const card   = CardRegistry.getCard(cardId);
  player.hand.push(cardId);
  player.luutex.current += card.cost;
  GS.pendingTargetSelection = null;
  UI.render(GS);
}

function handleChooseLuu(queuePosition) {
  const player = GS.players[0];
  const chosen = player.luuQueue.find(l => l.queuePosition === queuePosition);
  if (!chosen) return;
  GS.position.activeLuuId  = chosen.cardId;
  GS.position.activeLuuPos = chosen.queuePosition;
  GS.position.phase        = 'playerTurns';
  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'luuChosen',
    detail: { queuePosition, class: chosen.class }
  });
  UI.render(GS);
}

function handleCardChoice(cardId) {
  const player = GS.players[0];
  const choice = GS.pendingCardChoice;
  if (!choice) return;

  if (choice.source === 'drawPile') {
    const idx = GS.deck.drawPile.indexOf(cardId);
    if (idx !== -1) GS.deck.drawPile.splice(idx, 1);
    if (choice.shuffleAfter) GS.deck.drawPile = shuffle(GS.deck.drawPile);
    player.hand.push(cardId);
  } else if (choice.source === 'discardPile') {
    const idx = GS.deck.discardPile.indexOf(cardId);
    if (idx !== -1) GS.deck.discardPile.splice(idx, 1);
    player.hand.push(cardId);
  } else if (choice.source === 'hand' && choice.freePlay) {
    // Free play — play the card at zero cost
    GS.pendingFreePlay = cardId;
  }

  GS.pendingCardChoice = null;

  // Resolve any remaining effects that were waiting for this choice
  if (choice.remainingEffects && choice.remainingEffects.length > 0) {
    for (const effect of choice.remainingEffects) {
      resolveEffect(GS, effect, choice.remainingCardId, player);
    }
  }

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'cardChosen',
    detail: { cardId, source: choice.source }
  });

  UI.render(GS);
}

async function handleRestartGame() {
  console.log('[handleRestartGame] Restarting game...');
  deleteSave();
  await startGame(true);
}

function handleBossXpAward(queuePosition) {
  const player = GS.players[0];
  const luu    = player.luuQueue.find(l => l.queuePosition === queuePosition);
  if (!luu || !GS.pendingXpDistribution) return;

  luu.xp += 1;
  checkLevelUp(GS, luu);
  GS.pendingXpDistribution.amount -= 1;

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'bossXpAwarded',
    detail: { luuId: luu.cardId, xpAwarded: 1, remaining: GS.pendingXpDistribution.amount }
  });

  if (GS.pendingXpDistribution.amount <= 0) {
    const wasBoss = GS.pendingXpDistribution.isBoss;
    // Load next from queue if any
    GS.pendingXpQueue = GS.pendingXpQueue || [];
    GS.pendingXpDistribution = GS.pendingXpQueue.length > 0
      ? GS.pendingXpQueue.shift()
      : null;

    // All XP distributed — resume turn flow
    if (!GS.pendingXpDistribution) {
      if (wasBoss) {
        // Boss XP done — trigger sector clear
        checkSectorCleared(GS);
      } else {
        // Rogue XP done — resume player turn flow
        // Only call startPlayerTurn if game is still active and in player phase
        if (GS.gameStatus.status === 'active' && GS.position.phase === 'playerTurns') {
          startPlayerTurn(GS);
        }
      }
    }
  }

  syncToSupabase();
  UI.render(GS);
}

function handleBossChoice(bossCardId) {
  const choice = GS.bosses.pendingBossChoice;
  if (!choice) return;

  const unchosen = choice.option1 === bossCardId ? choice.option2 : choice.option1;

  // Set chosen boss as active
  GS.bosses.activeBoss        = buildBossState(GS, bossCardId);
  GS.bosses.pendingBoss       = unchosen;
  GS.bosses.pendingBossChoice = null;

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'bossChosen',
    detail: {
      sector:   GS.position.sectorNumber,
      bossId:   bossCardId,
      unchosen
    }
  });
  console.log(`[handleBossChoice] S${GS.position.sectorNumber} boss: ${bossCardId} — pending: ${unchosen}`);

  // If entering S4, the unchosen is automatically the S5 boss — reveal it
  if (GS.position.sectorNumber === 4) {
    GS.turnLog.push({
      logId:  nextLogId(GS),
      action: 'bossAutoAssigned',
      detail: { sector: 5, bossId: unchosen }
    });
    console.log(`[handleBossChoice] S5 boss auto-assigned: ${unchosen}`);
  }

  completeSectorStart(GS);
  syncToSupabase();
  UI.render(GS);
}

function saveGame() {
  try {
    const saveData = JSON.stringify(GS);
    localStorage.setItem('missionLuu_save', saveData);
    localStorage.setItem('missionLuu_saveTime', new Date().toISOString());
    console.log('[saveGame] Game saved successfully');
    return true;
  } catch (err) {
    console.error('[saveGame] Failed to save:', err);
    return false;
  }
}

function loadGame() {
  try {
    const saveData = localStorage.getItem('missionLuu_save');
    if (!saveData) {
      console.warn('[loadGame] No save found');
      return false;
    }
    GS = JSON.parse(saveData);
    const saveTime = localStorage.getItem('missionLuu_saveTime');
    console.log(`[loadGame] Game loaded — saved at ${saveTime}`);
    // Migrate old saves
    if (GS.pendingXpDistribution === undefined) GS.pendingXpDistribution = null;
    if (GS.pendingXpQueue === undefined) GS.pendingXpQueue = [];
    // Migrate old saves that used pendingBossXp
    if (GS.pendingBossXp !== undefined) {
      GS.pendingXpDistribution = GS.pendingBossXp || null;
      delete GS.pendingBossXp;
    }
    if (GS.pendingDiscard === undefined) GS.pendingDiscard = null;
    if (GS.pendingCardChoice === undefined) GS.pendingCardChoice = null;
    if (GS.pendingTargetSelection === undefined) GS.pendingTargetSelection = null;
    if (GS.pendingQueueRearrange === undefined) GS.pendingQueueRearrange = null;
    if (GS.pendingConversion === undefined) GS.pendingConversion = null;
    if (GS.pendingDamageRedistribution === undefined) GS.pendingDamageRedistribution = null;
    if (GS.pendingDamageReallocate === undefined) GS.pendingDamageReallocate = null;
    if (GS.pendingShieldSpread === undefined) GS.pendingShieldSpread = null;
    if (GS.bosses.pendingBossChoice === undefined) GS.bosses.pendingBossChoice = null;
    // Migrate Luu queue entries to include traitUsedThisWave
    for (const player of GS.players) {
      for (const luu of player.luuQueue) {
        if (luu.traitUsedThisWave === undefined) luu.traitUsedThisWave = false;
      }
    }
    if (GS.mulliganAvailable === undefined) GS.mulliganAvailable = false;
    if (GS.pendingFreePlay === undefined) GS.pendingFreePlay = null;
    if (GS.callTheShotActive === undefined) GS.callTheShotActive = null;
    if (GS.pendingQueueMove === undefined) GS.pendingQueueMove = null;
    if (GS.pendingSplitStrike === undefined) GS.pendingSplitStrike = null;
    if (!GS.knockedOutLuuPool) GS.knockedOutLuuPool = [];
    for (const effect of GS.globalActiveEffects) {
      if (effect.usesThisWave === undefined) effect.usesThisWave = 0;
    }
    // Migrate Luu queue entries to include gatherTrack
    for (const player of GS.players) {
      for (const luu of player.luuQueue) {
        if (luu.gatherTrack === undefined) luu.gatherTrack = 1;
      }
    }
    if (GS.pendingSpeciesWard === undefined) GS.pendingSpeciesWard = null;
    if (GS.pendingRebirth === undefined) GS.pendingRebirth = null;
    if (GS.pendingTurnOrderSelection === undefined) GS.pendingTurnOrderSelection = null;
    if (GS.turnOrderOverride         === undefined) GS.turnOrderOverride         = null;
    for (const player of GS.players) {
      for (const luu of player.luuQueue) {
        if (luu.damageDealtThisRound === undefined) luu.damageDealtThisRound = 0;
      }
    }
    for (const enemy of GS.activeEnemies) {
      if (enemy.bondedBoostBonus === undefined) enemy.bondedBoostBonus = 0;
    }
    if (!GS.draftState) GS.draftState = {
      phase: 'complete', corePool: [], powerPool: [], currentReveal: [],
      keptCore: [], keptPower: [], coreTarget: 30, powerTarget: 10,
      pendingMulligan: false, cascadeSelection: 0
    };
    if (GS.draftState.inspectCard === undefined) GS.draftState.inspectCard = null;
    if (!GS.chaosState) GS.chaosState = {
      difficulty: 0, selectedCards: [], pendingEffects: [], resolvedCards: [],
      maxDiceNextAttack: false, attackBannedRound: null,
      cardPlayBannedThisWave: false, pendingChaosDifficultySelect: false
    };
    if (GS.chaosState.pendingChaosDifficultySelect === undefined) GS.chaosState.pendingChaosDifficultySelect = false;
    if (GS.config.useDraft        === undefined) GS.config.useDraft        = false;
    if (GS.config.chaosDifficulty === undefined) GS.config.chaosDifficulty = 0;
    if (GS.deck.powerPile === undefined) GS.deck.powerPile = [];
    UI.render(GS);
    return true;
  } catch (err) {
    console.error('[loadGame] Failed to load:', err);
    return false;
  }
}

function deleteSave() {
  localStorage.removeItem('missionLuu_save');
  localStorage.removeItem('missionLuu_saveTime');
  console.log('[deleteSave] Save deleted');
}

function handleSaveGame() {
  const success = saveGame();
  if (success) {
    const btn = document.querySelector('button[onclick="handleSaveGame()"]');
    if (btn) {
      const original = btn.innerHTML;
      btn.innerHTML = '✅ Saved';
      btn.style.color = 'var(--win)';
      btn.style.borderColor = 'var(--win)';
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 1500);
    }
  }
}

function handleLoadGame() {
  const hasSave = localStorage.getItem('missionLuu_save');
  if (!hasSave) {
    alert('No saved game found.');
    return;
  }
  const saveTime = localStorage.getItem('missionLuu_saveTime');
  const confirm2 = confirm(`Load saved game from ${new Date(saveTime).toLocaleString()}?\n\nUnsaved progress will be lost.`);
  if (confirm2) {
    loadGame();
  }
}

function handlePurification(enemyInstanceId) {
  const player  = GS.players[0];
  const enemy   = GS.activeEnemies.find(e => e.instanceId === enemyInstanceId);
  if (!enemy) return;

  // Check undrafted pool for matching class
  const poolIdx = GS.undraftedLuuPool.cards.findIndex(id => {
    const card = CardRegistry.getLuuCard(id);
    return card && card.class === enemy.class;
  });

  if (poolIdx === -1) {
    console.warn(`[handlePurification] No ${enemy.class} in undrafted pool`);
    alert(`No ${enemy.class} available in Luu Reserve — cannot purify.`);
    return;
  }

  // Remove Rogue from wave
  GS.activeEnemies = GS.activeEnemies.filter(e => e.instanceId !== enemyInstanceId);

  // Take Luu from reserve pool
  const luuCardId = GS.undraftedLuuPool.cards.splice(poolIdx, 1)[0];
  const luuCard   = CardRegistry.getLuuCard(luuCardId);

  const queueFull = player.luuQueue.length >= GS.config.luuQueueLimit;

  if (!queueFull) {
    // Queue has space — add directly
    const newPos = player.luuQueue.length + 1;
    player.luuQueue.push(createLuuQueueEntry(luuCardId, newPos));
    GS.turnLog.push({
      logId:  nextLogId(GS),
      action: 'purificationComplete',
      detail: { removedEnemy: enemyInstanceId, enemyClass: enemy.class, newLuu: luuCardId, queuePosition: newPos, addedToHand: false }
    });
    console.log(`[handlePurification] ${enemy.class} Rogue purified — ${luuCardId} added at position ${newPos}`);
  } else {
    // Queue full — add to hand instead
    player.hand.push(luuCardId);
    GS.turnLog.push({
      logId:  nextLogId(GS),
      action: 'purificationComplete',
      detail: { removedEnemy: enemyInstanceId, enemyClass: enemy.class, newLuu: luuCardId, queuePosition: null, addedToHand: true }
    });
    console.log(`[handlePurification] ${enemy.class} Rogue purified — ${luuCardId} added to hand (queue full)`);
  }

  GS.pendingConversion = null;

  // Check if this was the last enemy in the wave
  checkWaveCleared(GS);

  UI.render(GS);
}

function handleStartDamageRedistribution(lagluuQueuePosition) {
  const player = GS.players[0];
  const lagluu = player.luuQueue.find(l => l.queuePosition === lagluuQueuePosition);
  if (!lagluu || lagluu.class !== 'Lagluu') {
    console.warn('[handleStartDamageRedistribution] Invalid Lagluu position');
    return;
  }
  if (lagluu.traitUsedThisWave) {
    console.warn('[handleStartDamageRedistribution] Trait already used this wave');
    return;
  }

  const leadLuu = player.luuQueue.find(l => l.queuePosition === 1);
  if (!leadLuu) return;
  if (leadLuu.damageCounters === 0) {
    console.warn('[handleStartDamageRedistribution] Lead Luu has no damage to redistribute');
    return;
  }

  const maxCounters = LAGLUU_TRAIT_MAX_BY_SECTOR[GS.position.sectorNumber] || 5;
  const availableToMove = Math.min(leadLuu.damageCounters, maxCounters);

  GS.pendingDamageRedistribution = {
    sourceLagluuPosition: lagluuQueuePosition,
    leadLuuPosition:      1,
    availableCounters:    availableToMove,
    distribution:         {},
    maxPerSector:         maxCounters
  };

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'damageRedistributionStarted',
    detail: { lagluuId: lagluu.cardId, availableCounters: availableToMove, maxPerSector: maxCounters }
  });
  console.log(`[handleStartDamageRedistribution] ${lagluu.cardId} — up to ${availableToMove} counters available`);

  UI.render(GS);
}

function handleAdjustDamageRedistribution(targetQueuePosition, delta) {
  const pending = GS.pendingDamageRedistribution;
  if (!pending) return;

  const player = GS.players[0];
  const targetLuu = player.luuQueue.find(l => l.queuePosition === targetQueuePosition);
  if (!targetLuu) return;
  if (targetQueuePosition === pending.leadLuuPosition) return;

  pending.distribution[targetQueuePosition] = pending.distribution[targetQueuePosition] || 0;
  const current = pending.distribution[targetQueuePosition];
  const newValue = current + delta;

  const targetMaxAddable = (targetLuu.maxHp - 1) - targetLuu.damageCounters;

  if (newValue < 0) return;
  if (newValue > targetMaxAddable) return;

  const totalDistributed = Object.values(pending.distribution).reduce((s, v) => s + v, 0) - current + newValue;
  if (totalDistributed > pending.availableCounters) return;

  pending.distribution[targetQueuePosition] = newValue;
  UI.render(GS);
}

function handleConfirmDamageRedistribution() {
  const pending = GS.pendingDamageRedistribution;
  if (!pending) return;

  const player = GS.players[0];
  const leadLuu = player.luuQueue.find(l => l.queuePosition === pending.leadLuuPosition);
  const lagluu  = player.luuQueue.find(l => l.queuePosition === pending.sourceLagluuPosition);
  if (!leadLuu || !lagluu) {
    GS.pendingDamageRedistribution = null;
    UI.render(GS);
    return;
  }

  const totalMoved = Object.values(pending.distribution).reduce((s, v) => s + v, 0);
  if (totalMoved === 0) {
    GS.pendingDamageRedistribution = null;
    UI.render(GS);
    return;
  }

  leadLuu.damageCounters -= totalMoved;
  leadLuu.currentHp = leadLuu.maxHp - leadLuu.damageCounters;

  for (const [posStr, counters] of Object.entries(pending.distribution)) {
    if (counters <= 0) continue;
    const pos = parseInt(posStr);
    const target = player.luuQueue.find(l => l.queuePosition === pos);
    if (!target) continue;
    target.damageCounters += counters;
    target.currentHp = target.maxHp - target.damageCounters;
  }

  lagluu.traitUsedThisWave = true;

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'damageRedistributed',
    detail: {
      lagluuId:      lagluu.cardId,
      fromLeadLuuId: leadLuu.cardId,
      totalMoved,
      distribution:  { ...pending.distribution }
    }
  });
  console.log(`[handleConfirmDamageRedistribution] ${lagluu.cardId} redistributed ${totalMoved} counters from ${leadLuu.cardId}`);

  GS.pendingDamageRedistribution = null;
  syncToSupabase();
  UI.render(GS);
}

function handleCancelDamageRedistribution() {
  GS.pendingDamageRedistribution = null;
  UI.render(GS);
}

function handleAdjustDamageReallocate(targetQueuePosition, delta) {
  const pending = GS.pendingDamageReallocate;
  if (!pending) return;

  const player    = GS.players[0];
  const targetLuu = player.luuQueue.find(l => l.queuePosition === targetQueuePosition);
  if (!targetLuu) return;

  const current  = pending.allocation[targetQueuePosition] || 0;
  const newValue = current + delta;

  // Never go below 0
  if (newValue < 0) return;

  // Total can never exceed totalDamage
  const currentTotal = Object.values(pending.allocation).reduce((s, v) => s + v, 0);
  const newTotal     = currentTotal - current + newValue;
  if (newTotal > pending.totalDamage) return;

  // Impervious check — if Kjeluu and newValue <= threshold, effective damage is 0 (allowed)
  // No minimum on any Luu — canFullyRemoveFromOneLuu: true

  pending.allocation[targetQueuePosition] = newValue;
  UI.render(GS);
}

function handleConfirmDamageReallocate() {
  const pending = GS.pendingDamageReallocate;
  if (!pending) return;

  const totalAllocated = Object.values(pending.allocation).reduce((s, v) => s + v, 0);
  if (totalAllocated !== pending.totalDamage) {
    console.warn('[handleConfirmDamageReallocate] Total does not match — cannot confirm');
    return;
  }

  const player = GS.players[0];

  // Apply new damage counter distribution to all Luu
  for (const luu of player.luuQueue) {
    const newCounters = pending.allocation[luu.queuePosition] || 0;

    // Impervious check — if allocated ≤ threshold, counters absorbed (removed)
    const imperviousThreshold = getImperiousThreshold(luu);
    const effectiveCounters = imperviousThreshold !== null && newCounters <= imperviousThreshold
      ? 0 : newCounters;

    luu.damageCounters = effectiveCounters;
    luu.currentHp      = luu.maxHp - effectiveCounters;
  }

  // Discard card immediately
  GS.deck.discardPile.push(pending.sourceCardId);

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'emergencyMendApplied',
    detail: {
      totalDamage:  pending.totalDamage,
      distribution: { ...pending.allocation },
      sourceCardId: pending.sourceCardId
    }
  });
  console.log(`[handleConfirmDamageReallocate] Emergency Mend applied`);

  GS.pendingDamageReallocate = null;
  UI.render(GS);
}

function handleCancelDamageReallocate() {
  // Return card to hand and refund cost
  if (!GS.pendingDamageReallocate) return;
  const player = GS.players[0];
  const card   = CardRegistry.getCard(GS.pendingDamageReallocate.sourceCardId);
  player.hand.push(GS.pendingDamageReallocate.sourceCardId);
  player.luutex.current += card ? card.cost : 0;
  GS.pendingDamageReallocate = null;
  UI.render(GS);
}

function handleAdjustShieldSpread(targetQueuePosition, delta) {
  const pending = GS.pendingShieldSpread;
  if (!pending) return;

  const player = GS.players[0];
  const targetLuu = player.luuQueue.find(l => l.queuePosition === targetQueuePosition);
  if (!targetLuu) return;

  const current = pending.allocation[targetQueuePosition] || 0;
  const newValue = current + delta;

  // Never go below 0 on any Luu
  if (newValue < 0) return;

  // Lead Luu minimum 1
  if (targetQueuePosition === 1 && newValue < pending.minLeadDamage) return;

  // Total across all Luu can never exceed totalDamage
  const currentTotal = Object.values(pending.allocation)
    .reduce((s, v) => s + v, 0);
  const newTotal = currentTotal - current + newValue;
  if (newTotal > pending.totalDamage) return;

  // For non-lead Luu: don't allocate enough effective damage to kill them
  // (Impervious absorption counts — blocked damage does not kill)
  if (targetQueuePosition !== 1) {
    const imperviousThreshold = getImperiousThreshold(targetLuu);
    const effectiveDamage = imperviousThreshold !== null && newValue <= imperviousThreshold
      ? 0
      : newValue;
    if (effectiveDamage > 0 && effectiveDamage >= targetLuu.currentHp) return;
  }

  pending.allocation[targetQueuePosition] = newValue;
  UI.render(GS);
}

function handleConfirmShieldSpread() {
  const pending = GS.pendingShieldSpread;
  if (!pending) return;

  const player = GS.players[0];

  // Apply damage to each Luu per allocation
  for (const [posStr, damage] of Object.entries(pending.allocation)) {
    if (damage <= 0) continue;
    const pos = parseInt(posStr);
    const targetLuu = player.luuQueue.find(l => l.queuePosition === pos);
    if (!targetLuu) continue;

    const hpBefore = targetLuu.currentHp;
    applyDamageToLuu(GS, targetLuu, damage, null, false);
    const overflowDamage = damage > hpBefore ? damage - hpBefore : 0;
    checkLuuKnockedOut(GS, targetLuu, overflowDamage);

    if (GS.gameStatus.status === 'lost') break;
  }

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'shieldSpreadApplied',
    detail: { totalDamage: pending.totalDamage, allocation: { ...pending.allocation } }
  });
  console.log(`[handleConfirmShieldSpread] Damage redistributed:`, pending.allocation);

  GS.pendingShieldSpread = null;

  if (GS.gameStatus.status !== 'lost') {
    // Resume post-enemy-attack flow
    resolvePostEnemyAttack(GS);
  }

  syncToSupabase();
  UI.render(GS);
}

function handleSkipShieldSpread() {
  const pending = GS.pendingShieldSpread;
  if (!pending) return;

  const player = GS.players[0];
  const leadLuu = player.luuQueue.find(l => l.queuePosition === 1);

  if (leadLuu) {
    const hpBefore = leadLuu.currentHp;
    applyDamageToLuu(GS, leadLuu, pending.totalDamage, null, false);
    const overflowDamage = pending.totalDamage > hpBefore ? pending.totalDamage - hpBefore : 0;
    checkLuuKnockedOut(GS, leadLuu, overflowDamage);
  }

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'shieldSpreadSkipped',
    detail: { totalDamage: pending.totalDamage }
  });

  GS.pendingShieldSpread = null;

  if (GS.gameStatus.status !== 'lost') {
    resolvePostEnemyAttack(GS);
  }

  UI.render(GS);
}

function getImperiousThreshold(luu) {
  const card = CardRegistry.getCard(luu.cardId);
  if (card && card.trait && card.trait.name === 'Impervious') {
    return card.trait.effect.damageThreshold;
  }
  return null;
}

function resolvePostEnemyAttack(state) {
  // Rogue Lagluu Pack Recovery
  const player = state.players[state.position.currentPlayerIndex];
  const rogueLagluus = state.activeEnemies.filter(e => e.class === 'Lagluu');
  if (rogueLagluus.length > 0) {
    const totalHeal = rogueLagluus.reduce((sum, l) => sum + (l.tier >= 3 ? 2 : 1), 0);
    for (const rogue of state.activeEnemies) {
      if (rogue.currentHp <= 0) continue;
      const healedHp = Math.min(rogue.currentHp + totalHeal, rogue.maxHp);
      if (healedHp > rogue.currentHp) {
        const actualHeal = healedHp - rogue.currentHp;
        rogue.currentHp      = healedHp;
        rogue.damageCounters = rogue.maxHp - rogue.currentHp;
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'roguePackRecovery',
          detail: { enemyId: rogue.instanceId, healAmount: actualHeal, hpAfter: rogue.currentHp }
        });
      }
    }
  }

  expireEffects(state, 'afterEnemyPhase');
  startRound(state);
  startPlayerTurn(state);
  console.log(`[resolvePostEnemyAttack] Post-attack flow complete`);
}

function handleActivatePersistentEffect(instanceId) {
  const player = GS.players[0];
  const effect  = GS.globalActiveEffects.find(e => e.instanceId === instanceId);
  if (!effect) return;

  const card       = CardRegistry.getCard(effect.cardId);
  const cardEffect = card.effects.find(e => e.trigger === 'manual');
  if (!cardEffect) return;

  // Check uses per round
  if (cardEffect.usesPerRound && (effect.usesThisRound || 0) >= cardEffect.usesPerRound) {
    console.warn(`[handleActivatePersistentEffect] ${effect.cardId} already used this round`);
    return;
  }

  // Check activation cost
  if (cardEffect.activationCost) {
    if (cardEffect.activationCost.type === 'luutex') {
      if (player.luutex.current < cardEffect.activationCost.value) {
        console.warn(`[handleActivatePersistentEffect] Insufficient Luutex`);
        return;
      }
      player.luutex.current -= cardEffect.activationCost.value;
    }
  }

  // Neural Cascade — discard first, then draw
  if (cardEffect.type === 'cardDraw' && cardEffect.rules?.discardFirst) {
    const player = GS.players[GS.position.currentPlayerIndex];
    if (player.hand.length === 0) {
      console.log(`[handleActivatePersistentEffect] Neural Cascade — no cards to discard`);
      return;
    }
    if (cardEffect.usesPerRound && (effect.usesThisRound || 0) >= cardEffect.usesPerRound) {
      console.log(`[handleActivatePersistentEffect] Neural Cascade — usesPerRound limit reached`);
      return;
    }
    GS.pendingDiscard = {
      count:      1,
      source:     'neuralCascade',
      thenDraw:   1,
      restrictTo: null,
      message:    'Neural Cascade — discard a card to draw a card'
    };
    GS.position.phase = 'pendingDiscard';
    effect.usesThisRound  = (effect.usesThisRound || 0) + 1;
    effect.activationCount++;
    console.log(`[handleActivatePersistentEffect] Neural Cascade activated — awaiting discard`);
    UI.render(GS);
    return;
  }

  if (cardEffect.type === 'queueManipulation' && cardEffect.value === 'moveOneAnyPosition') {
    // Check usesPerWave limit
    const usesPerWave = cardEffect.usesPerWave || 1;
    if ((effect.usesThisWave || 0) >= usesPerWave) {
      console.log(`[handleActivatePersistentEffect] ${effect.cardId} — usesPerWave limit reached`);
      return;
    }
    // Set pending queue move — phase 1: select which Luu to move
    GS.pendingQueueMove = {
      instanceId: instanceId,
      phase:      'selectLuu',
      luuCardId:  null,
      luuPos:     null
    };
    console.log(`[handleActivatePersistentEffect] Tactical Shift activated — awaiting Luu selection`);
    UI.render(GS);
    return;
  }

  // Roll dice check if required
  if (cardEffect.diceCheck) {
    const sides  = cardEffect.diceCheck.diceType === 'd4' ? 4 : 6;
    const roll   = Math.floor(Math.random() * sides) + 1;
    const passed = cardEffect.diceCheck.passOn.includes(roll);

    GS.turnLog.push({
      logId:  nextLogId(GS),
      action: 'persistentEffectActivated',
      detail: { cardId: effect.cardId, roll, passed, cost: cardEffect.activationCost }
    });
    console.log(`[handleActivatePersistentEffect] ${effect.cardId} — rolled ${roll}: ${passed ? 'SUCCESS' : 'FAIL'}`);

    if (passed) {
      if (cardEffect.type === 'cardDraw') {
        const drawn = drawFromDeck(GS, cardEffect.value);
        player.hand.push(...drawn);
        GS.turnLog.push({
          logId:  nextLogId(GS),
          action: 'cardDrawn',
          detail: { source: effect.cardId, count: cardEffect.value }
        });
      }
    }
  }

  // Increment uses this round
  effect.usesThisRound = (effect.usesThisRound || 0) + 1;
  effect.activationCount++;

  UI.render(GS);
}

function handleQueueMoveSelectLuu(luuCardId, luuPos) {
  if (!GS.pendingQueueMove || GS.pendingQueueMove.phase !== 'selectLuu') return;
  GS.pendingQueueMove.luuCardId = luuCardId;
  GS.pendingQueueMove.luuPos    = luuPos;
  GS.pendingQueueMove.phase     = 'selectTarget';
  console.log(`[handleQueueMoveSelectLuu] Selected ${luuCardId} at pos ${luuPos} — awaiting target position`);
  UI.render(GS);
}

function handleQueueMoveSelectTarget(targetPos) {
  if (!GS.pendingQueueMove || GS.pendingQueueMove.phase !== 'selectTarget') return;

  const player    = GS.players[GS.position.currentPlayerIndex];
  const movingLuu = player.luuQueue.find(l => l.cardId === GS.pendingQueueMove.luuCardId);
  if (!movingLuu) { GS.pendingQueueMove = null; UI.render(GS); return; }

  const fromPos = movingLuu.queuePosition;
  const toPos   = targetPos;

  if (fromPos === toPos) {
    GS.pendingQueueMove = null;
    UI.render(GS);
    return;
  }

  // Shift all Luu between fromPos and toPos
  if (fromPos < toPos) {
    for (const luu of player.luuQueue) {
      if (luu.queuePosition > fromPos && luu.queuePosition <= toPos) {
        luu.queuePosition--;
      }
    }
  } else {
    for (const luu of player.luuQueue) {
      if (luu.queuePosition >= toPos && luu.queuePosition < fromPos) {
        luu.queuePosition++;
      }
    }
  }
  movingLuu.queuePosition = toPos;
  player.luuQueue.sort((a, b) => a.queuePosition - b.queuePosition);

  // Mark Tactical Shift as used this wave
  const effect = GS.globalActiveEffects.find(e => e.instanceId === GS.pendingQueueMove.instanceId);
  if (effect) {
    effect.usesThisWave   = (effect.usesThisWave || 0) + 1;
    effect.activationCount++;
  }

  // Sync effect positions after move
  syncEffectPositions(GS);

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'tacticalShift',
    detail: { luuId: movingLuu.cardId, fromPos, toPos }
  });
  console.log(`[handleQueueMoveSelectTarget] ${movingLuu.cardId} moved from pos ${fromPos} to pos ${toPos}`);

  GS.pendingQueueMove = null;
  UI.render(GS);
}

function applyTypeModifiers(state, attackingLuu, targetEnemy, baseDamage) {
  const card = CardRegistry.getCard(attackingLuu.cardId);
  let total = baseDamage;
  let typeAdvantageApplied = false;

  if (card && card.typeAdvantage) {
    if (card.typeAdvantage.beats === targetEnemy.class) {
      total += 1;
      typeAdvantageApplied = true;
    } else if (card.typeAdvantage.losesTo === targetEnemy.class) {
      const hasShellShift = state.globalActiveEffects.some(e => {
        const ec = CardRegistry.getCard(e.cardId);
        if (!ec || !ec.effects) return false;
        if (!ec.effects.some(eff => eff.stat === 'typeDisadvantage')) return false;
        return e.attachedToCardId === attackingLuu.cardId
          || e.attachedTo === attackingLuu.queuePosition;
      });
      if (!hasShellShift) {
        total = Math.max(0, total - 1);
      } else {
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'shellShiftNegated',
          detail: { luuId: attackingLuu.cardId, negated: 'typeDisadvantage' }
        });
      }
    }
  }

  if (typeAdvantageApplied) {
    for (const effect of state.globalActiveEffects) {
      const effectCard = CardRegistry.getCard(effect.cardId);
      if (!effectCard) continue;
      const apexEffect = effectCard.effects
        ? effectCard.effects.find(e => e.stat === 'typeAdvantageBonus')
        : null;
      if (!apexEffect) continue;
      const attachedToThis = effect.attachedToCardId === attackingLuu.cardId
        || effect.attachedTo === attackingLuu.queuePosition;
      if (attachedToThis) {
        total += apexEffect.value;
        state.turnLog.push({
          logId:  nextLogId(state),
          action: 'apexFocusBonus',
          detail: { luuId: attackingLuu.cardId, bonus: apexEffect.value }
        });
      }
    }
  }

  return total;
}

function handleSplitStrikeAllocate(enemyInstanceId, value) {
  if (!GS.pendingSplitStrike) return;
  const numValue = parseInt(value, 10) || 0;
  GS.pendingSplitStrike.allocation[enemyInstanceId] = Math.max(0, numValue);
  UI.render(GS);
}

function handleSplitStrikeConfirm() {
  if (!GS.pendingSplitStrike) return;

  const allocation = GS.pendingSplitStrike.allocation;
  const totalPool  = GS.pendingSplitStrike.totalPool;
  const allocated  = Object.values(allocation).reduce((s, v) => s + v, 0);

  if (allocated !== totalPool) {
    console.warn(`[handleSplitStrikeConfirm] Allocation mismatch: ${allocated} allocated, ${totalPool} required`);
    return;
  }

  const player    = GS.players[GS.position.currentPlayerIndex];
  const activeLuu = player.luuQueue.find(l => l.queuePosition === GS.pendingSplitStrike.attackerPos);

  for (const [enemyInstanceId, damage] of Object.entries(allocation)) {
    if (damage <= 0) continue;
    const enemy = GS.activeEnemies.find(e => e.instanceId === enemyInstanceId);
    if (!enemy) continue;

    const modifiedDamage = applyTypeModifiers(GS, activeLuu, enemy, damage);

    applyDamageToEnemy(GS, enemy, modifiedDamage, false);
    enemy.hitThisRound = true;

    GS.turnLog.push({
      logId:  nextLogId(GS),
      action: 'splitStrikeHit',
      detail: {
        attackerClass:  activeLuu?.class,
        targetClass:    enemy.class,
        targetId:       enemyInstanceId,
        allocated:      damage,
        afterModifiers: modifiedDamage
      }
    });

    checkEnemyDefeated(GS, enemy, activeLuu);
    if (GS.gameStatus.status === 'lost') break;
  }

  const effectIdx = GS.globalActiveEffects.findIndex(e => e.instanceId === GS.pendingSplitStrike.effectInstanceId);
  if (effectIdx !== -1) GS.globalActiveEffects.splice(effectIdx, 1);
  GS.deck.discardPile.push('action_split_strike');

  if (activeLuu) activeLuu.actedThisTurn = true;

  GS.pendingSplitStrike = null;
  console.log(`[handleSplitStrikeConfirm] Split Strike resolved`);

  endLuuTurn(GS);
  UI.render(GS);
}

function handleSplitStrikeCancel() {
  GS.pendingSplitStrike = null;
  UI.render(GS);
}

function handleRebirthSelect(cardId) {
  if (!GS.pendingRebirth) return;

  const player  = GS.players[GS.position.currentPlayerIndex];
  const koEntry = GS.knockedOutLuuPool.find(e => e.cardId === cardId);
  if (!koEntry) {
    console.warn(`[handleRebirthSelect] ${cardId} not found in knockedOutLuuPool`);
    return;
  }

  if (player.luuQueue.length >= GS.config.luuQueueLimit) {
    console.warn('[handleRebirthSelect] Queue is full — cannot resurrect');
    return;
  }

  const newPos   = player.luuQueue.length + 1;
  const newEntry = createLuuQueueEntry(koEntry.cardId, newPos);

  const luuCard     = CardRegistry.getLuuCard(koEntry.cardId);
  const healthIndex = koEntry.evolved ? koEntry.level - 3 : koEntry.level - 1;
  const maxHp       = luuCard?.stats.health[healthIndex] || newEntry.maxHp;

  newEntry.level          = koEntry.level;
  newEntry.evolved        = koEntry.evolved;
  newEntry.maxHp          = maxHp;
  newEntry.currentHp      = maxHp;
  newEntry.damageCounters = 0;
  newEntry.xp             = 0;
  newEntry.gatherTrack    = 1;

  player.luuQueue.push(newEntry);

  GS.knockedOutLuuPool = GS.knockedOutLuuPool.filter(e => e.cardId !== cardId);

  // Remove the KO'd Luu card from discard so it doesn't cycle back through the deck
  const discardIdx = GS.deck.discardPile.lastIndexOf(cardId);
  if (discardIdx !== -1) GS.deck.discardPile.splice(discardIdx, 1);

  GS.pendingRebirth = null;

  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'rebirthComplete',
    detail: {
      cardId,
      class:    koEntry.class,
      level:    koEntry.level,
      evolved:  koEntry.evolved,
      maxHp,
      queuePos: newPos
    }
  });
  console.log(`[handleRebirthSelect] ${cardId} resurrected at L${koEntry.level}, pos ${newPos}, HP ${maxHp}`);

  UI.render(GS);
}

function handleTurnOrderReset() {
  if (!GS.pendingTurnOrderSelection) return;
  GS.pendingTurnOrderSelection.selectedOrder = [];
  UI.render(GS);
}

function handleTurnOrderSelect(cardId) {
  if (!GS.pendingTurnOrderSelection) return;
  if (GS.pendingTurnOrderSelection.selectedOrder.includes(cardId)) return;
  GS.pendingTurnOrderSelection.selectedOrder.push(cardId);
  console.log(`[handleTurnOrderSelect] Added ${cardId} — order so far:`, GS.pendingTurnOrderSelection.selectedOrder);
  UI.render(GS);
}

function handleTurnOrderDeselect(cardId) {
  if (!GS.pendingTurnOrderSelection) return;
  GS.pendingTurnOrderSelection.selectedOrder = GS.pendingTurnOrderSelection.selectedOrder.filter(id => id !== cardId);
  console.log(`[handleTurnOrderDeselect] Removed ${cardId}`);
  UI.render(GS);
}

function handleTurnOrderConfirm() {
  if (!GS.pendingTurnOrderSelection) return;
  const player = GS.players[GS.position.currentPlayerIndex];
  if (GS.pendingTurnOrderSelection.selectedOrder.length < player.luuQueue.filter(l => l.currentHp > 0).length) {
    console.warn('[handleTurnOrderConfirm] Not all Luu selected');
    return;
  }
  GS.turnOrderOverride         = [...GS.pendingTurnOrderSelection.selectedOrder];
  GS.pendingTurnOrderSelection = null;
  GS.turnLog.push({
    logId:  nextLogId(GS),
    action: 'tacticalCommandOrder',
    detail: { order: GS.turnOrderOverride }
  });
  console.log('[handleTurnOrderConfirm] Turn order confirmed:', GS.turnOrderOverride);
  startPlayerTurn(GS);
  UI.render(GS);
}