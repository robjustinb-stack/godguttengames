// gameState.js — Game State & Group 1 Setup Functions
// Implements all setup functions from rules engine Group 1.

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const HAND_LIMIT          = { 1: 5, 2: 4, 3: 3, 4: 2 };
const QUEUE_LIMIT         = { 1: 4, 2: 3, 3: 3, 4: 2 };
const STARTING_LUUTEX     = 7;
const XP_PER_LEVEL        = 5;
const STARTER_POOL_CARDS  = ['luu_rasluu','luu_lagluu','luu_kjeluu','luu_gifluu','luu_bisluu'];
const WAVES_PER_SECTOR    = 3;

const TIER_COMPOSITION = {
  1: { 1: 0.7, 2: 0.3 },
  2: { 1: 0.3, 2: 0.5, 3: 0.2 },
  3: { 2: 0.3, 3: 0.5, 4: 0.2 },
  4: { 3: 0.4, 4: 0.6 },
  5: { 3: 0.2, 4: 0.8 }
};

const SECTOR_DICE = {
  1: [4],
  2: [6],
  3: [8],
  4: [4, 6],
  5: [4, 8]
};

const BASE_DECK_LUU = [
  { cardId: 'luu_rasluu',         copies: 3 },
  { cardId: 'luu_lagluu',         copies: 2 },
  { cardId: 'luu_kjeluu',         copies: 2 },
  { cardId: 'luu_gifluu',         copies: 2 },
  { cardId: 'luu_bisluu',         copies: 2 },
  { cardId: 'luu_rasluu_evolved', copies: 2 },
  { cardId: 'luu_kjeluu_evolved', copies: 2 },
  { cardId: 'luu_lagluu_evolved', copies: 1 },
  { cardId: 'luu_gifluu_evolved', copies: 1 },
  { cardId: 'luu_bisluu_evolved', copies: 1 }
];

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function nextLogId(state) {
  return state.turnLog.length + 1;
}

// ─────────────────────────────────────────────
// GROUP 1 — SETUP FUNCTIONS
// ─────────────────────────────────────────────

function createLuuQueueEntry(cardId, queuePosition) {
  const card = CardRegistry.getLuuCard(cardId);
  return {
    queuePosition,
    cardId,
    class:               card.class,
    level:               1,
    xp:                  0,
    evolved:             false,
    currentHp:           card.stats.health[0],
    maxHp:               card.stats.health[0],
    damageCounters:      0,
    defendStatus:        false,
    actedThisTurn:       false,
    bisluuBondTarget:    null,
    activeEffects:       [],
    traitUsedThisWave:   false,
    gatherTrack:         1,
    damageDealtThisRound: 0
  };
}

function initBossPool(state) {
  state.bosses = {
    activeBoss: {
      cardId: 'boss_tjeluu',
      currentHp: 40,
      maxHp: 40,
      sectorEncountered: 1,
      passiveActive: true,
      bossFirstHitThisRound: true
    },
    pendingBoss:       null,
    pendingBossChoice: null,
    currentChoice:     null,
    bossPool:          shuffle(['boss_lynluu','boss_forluu','boss_fesluu','boss_toxluu']),
    clearedBosses: []
  };
}

function initStarterPool(state) {
  state.starterPool = {
    cards: [...STARTER_POOL_CARDS],
    startingLuuDrawn: null,
    remainingDiscarded: []
  };
}

function loadStarterDeck(state) {
  // Build Luu portion
  const luuIds = [];
  for (const entry of BASE_DECK_LUU) {
    for (let i = 0; i < entry.copies; i++) luuIds.push(entry.cardId);
  }

  // Action portion — one of each unique action card
  const actionIds = CardRegistry.getAllActionCards()
    .filter(c => !c.starterDeckExcluded)
    .map(c => c.id);

  // Remove exactly one copy of each starter pool card from the draw pile
  const luuIdsWorking = [...luuIds];
  for (const starterId of STARTER_POOL_CARDS) {
    const idx = luuIdsWorking.indexOf(starterId);
    if (idx !== -1) luuIdsWorking.splice(idx, 1);
  }
  const all = shuffle([...luuIdsWorking, ...actionIds]);
  console.log(`[loadStarterDeck] ${luuIdsWorking.length} Luu + ${actionIds.length} action = ${all.length} total cards`);

  state.deck = {
    drawPile: all,
    discardPile: [],
    removedCards: [],
    reshuffleCount: 0
  };
  state.draftState = { phase: 'complete', note: 'useStarterDeck = true' };
}

function drawStartingLuu(state) {
  const pool = [...STARTER_POOL_CARDS];
  const used = [];

  for (const player of state.players) {
    const available = pool.filter(id => !used.includes(id));
    const chosenId  = randomChoice(available);
    const card      = CardRegistry.getLuuCard(chosenId);

    player.luuQueue = [createLuuQueueEntry(chosenId, 1)];

    player.luutex.current = STARTING_LUUTEX;
    used.push(chosenId);

    state.turnLog.push({
      logId: nextLogId(state), action: 'startingLuuDrawn',
      detail: { playerId: player.playerId, cardId: chosenId, class: card.class }
    });
  }

  const remaining = pool.filter(id => !used.includes(id));
  state.starterPool.startingLuuDrawn   = used[0];
  state.starterPool.remainingDiscarded = remaining;
  // Remainders are removed from play entirely — not added to discard
  console.log(`[drawStartingLuu] Remainders removed from play: ${remaining.join(', ')}`);
}
function dealOpeningHand(state) {
  const limit = HAND_LIMIT[state.config.playerCount];

  for (const player of state.players) {
    let hand = drawFromDeck(state, limit);

    // Solo mulligan — offer button if no BASE Luu card in opening hand
    if (state.config.playerCount === 1 && state.config.difficultySettings.soloMulliganEnabled) {
      const hasBaseLuu = hand.some(id => {
        const card = CardRegistry.getCard(id);
        return card && card.cardType === 'Luu';
      });
      if (!hasBaseLuu) {
        state.mulliganAvailable = true;
        console.log('[dealOpeningHand] No base Luu in opening hand — mulligan available');
      }
    }

    player.hand = hand;
    state.turnLog.push({ logId: nextLogId(state), action: 'openingHandDealt', detail: { cards: hand } });
    console.log(`[dealOpeningHand] ${player.playerId} hand: ${hand.join(', ')}`);
  }
}
function executeMulligan(state) {
  if (!state.mulliganAvailable) return;
  const player = state.players[0];
  const limit  = HAND_LIMIT[state.config.playerCount];

  // Return hand to deck and reshuffle — never discard
  state.deck.drawPile = shuffle([...player.hand, ...state.deck.drawPile]);
  player.hand = [];
  player.hand = drawFromDeck(state, limit);

  state.turnLog.push({
    logId:  nextLogId(state),
    action: 'mulligan',
    detail: { newHand: player.hand }
  });
  console.log('[executeMulligan] Mulligan taken — new hand:', player.hand);

  const hasBaseLuu = player.hand.some(cardId => {
    const card = CardRegistry.getCard(cardId);
    return card && card.cardType === 'Luu';
  });

  if (!hasBaseLuu) {
    console.log('[executeMulligan] No base Luu — mulligan still available');
  } else {
    state.mulliganAvailable = false;
    console.log('[executeMulligan] Base Luu found — mulligan closed');
  }
}

function initEnemyDeck(state) {
  const sector = state.position.sectorNumber;
  const waveComposition = state.config.playerCount === 1
    ? [2, 2, 2]
    : [4, 4, 4];

  // Exact tier counts per sector — keyed by [sectorNumber][playerCount]
  const TIER_COUNTS = {
    1: {
      1: { t1:4, t2:2, t3:0, t4:0 },
      2: { t1:8, t2:4, t3:0, t4:0 }
    },
    2: {
      1: { t1:2, t2:2, t3:2, t4:0 },
      2: { t1:4, t2:4, t3:4, t4:0 }
    },
    3: {
      1: { t1:0, t2:2, t3:2, t4:2 },
      2: { t1:0, t2:4, t3:4, t4:4 }
    },
    4: {
      1: { t1:0, t2:0, t3:3, t4:3 },
      2: { t1:0, t2:0, t3:6, t4:6 }
    },
    5: {
      1: { t1:0, t2:0, t3:2, t4:4 },
      2: { t1:0, t2:0, t3:4, t4:8 }
    }
  };

  const counts = TIER_COUNTS[sector]?.[state.config.playerCount]
    || TIER_COUNTS[sector]?.[2];

  const sectorPool = [];
  const tierMap = { t1: 1, t2: 2, t3: 3, t4: 4 };

  for (const [tierKey, count] of Object.entries(counts)) {
    const tier = tierMap[tierKey];
    if (count === 0) continue;
    for (let i = 0; i < count; i++) {
      const classes = ['Rasluu', 'Lagluu', 'Kjeluu', 'Gifluu', 'Bisluu'];
      const selectedClass = classes[Math.floor(Math.random() * classes.length)];
      sectorPool.push('rogue_' + selectedClass.toLowerCase() + '_t' + tier);
    }
  }

  // Shuffle the full sector pool so tier distribution is random across waves
  const shuffledPool = shuffle(sectorPool);

  const preDealtWaves = [];
  let poolIndex = 0;
  for (let w = 0; w < WAVES_PER_SECTOR; w++) {
    const count = waveComposition[w];
    preDealtWaves.push(shuffledPool.slice(poolIndex, poolIndex + count));
    poolIndex += count;
  }

  state.enemyDeck = { sectorPool: { cards: shuffledPool }, preDealtWaves };
  console.log(`[initEnemyDeck] S${sector} waves:`, preDealtWaves);
}

// ─────────────────────────────────────────────
// UTILITY — DRAW FROM DECK
// ─────────────────────────────────────────────

function drawFromDeck(state, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (state.deck.drawPile.length > 0) {
      drawn.push(state.deck.drawPile.shift());
    }
  }
  // Trigger reshuffle immediately if draw pile is now empty
  if (state.deck.drawPile.length === 0 && state.deck.discardPile.length > 0) {
    reshuffleDeck(state);
  }
  return drawn;
}

function reshuffleDeck(state) {
  if (state.deck.discardPile.length === 0) {
    console.warn('[reshuffleDeck] Both piles empty — cannot reshuffle');
    return;
  }
  // Remove one random card permanently before reshuffling
  const removeIndex = Math.floor(Math.random() * state.deck.discardPile.length);
  const removed = state.deck.discardPile.splice(removeIndex, 1)[0];
  state.deck.removedCards.push(removed);
  state.deck.reshuffleCount++;
  state.deck.drawPile = shuffle(state.deck.discardPile);
  state.deck.discardPile = [];
  console.log(`[reshuffleDeck] Reshuffled. Permanently removed: ${removed}`);
  if (state.turnLog) {
    state.turnLog.push({
      logId:  nextLogId(state),
      action: 'deckReshuffled',
      detail: { removedCard: removed, reshuffleCount: state.deck.reshuffleCount }
    });
  }
}

// ─────────────────────────────────────────────
// ROOT — initGameState
// ─────────────────────────────────────────────

async function initGameState(config = {}) {
  const cfg = {
    playerCount:     1,
    useStarterDeck:  true,
    useDraft:        true,
    chaosDifficulty: 0,
    playerRollsDice: true,
    difficultySettings: { eventCardsEnabled: false, soloMulliganEnabled: true },
    ...config
  };

  const state = {
    config: { ...cfg, luuQueueLimit: QUEUE_LIMIT[cfg.playerCount], startTime: new Date().toISOString() },
    position: { sectorNumber: 1, waveNumber: 1, roundNumber: 0, phase: 'setup', currentPlayerIndex: 0 },
    turnLog: [],
    history: { sectorsCleared: 0, wavesCleared: 0, totalRoguesDefeated: 0, totalDamageDealt: 0, totalDamageTaken: 0, luuLost: [] },
    bosses: null,
    starterPool: null,
    deck: null,
    draftState: {
      phase:            'setup',
      corePool:         [],
      powerPool:        [],
      currentReveal:    [],
      keptCore:         [],
      keptPower:        [],
      coreTarget:       30,
      powerTarget:      10,
      pendingMulligan:  false,
      cascadeSelection: 0,
      inspectCard:      null,
    },
    players: [{ playerId: 'player_1', luutex: { current: 0 }, hand: [], luuQueue: [], turnState: { cardsPlayedThisTurn: [], actionTakenThisTurn: false, luutexSpentThisTurn: 0, overrideActive: false } }],
    activeEnemies: [],
    enemyDeck: { sectorPool: { cards: [] }, preDealtWaves: [] },
    globalActiveEffects: [],
    roundTracking: { damageDealtToEnemiesThisRound: {}, luutexGainedThisRound: 0, cardsDrawnThisRound: 0, roguesDefeatedThisRound: [] },
    gameStatus: { status: 'active', wonAt: null, lostAt: null, loseReason: null },
    pendingCardChoice: null,
    pendingTargetSelection: null,
    pendingXpDistribution: null,
    pendingXpQueue: [],
    pendingConversion: null,
    pendingDamageRedistribution: null,
    pendingDamageReallocate: null,
    pendingShieldSpread: null,
    callTheShotActive: null,
    pendingQueueMove: null,
    pendingSplitStrike: null,
    pendingSpeciesWard: null,
    knockedOutLuuPool: [],
    pendingRebirth: null,
    pendingTurnOrderSelection: null,
    turnOrderOverride:         null,
    chaosState: {
      difficulty:                   0,
      selectedCards:                [],
      pendingEffects:               [],
      resolvedCards:                [],
      maxDiceNextAttack:            false,
      attackBannedRound:            null,
      cardPlayBannedThisWave:       false,
      pendingChaosDifficultySelect: true,
    },
    undraftedLuuPool: {
      description: 'Reserve pool for Purification card. One of each base Luu class.',
      cards: [...STARTER_POOL_CARDS]
    }
  };

  initBossPool(state);

  if (state.config.useDraft) {
    initStarterPool(state);
    drawStartingLuu(state);
    initDraftState(state);
    // completeDraft() called automatically at end of draft
  } else {
    initStarterPool(state);
    drawStartingLuu(state);
    loadStarterDeck(state);
    dealOpeningHand(state);
  }

  initEnemyDeck(state);

  state.position.phase = 'playerTurns';
  state.turnLog.push({ logId: nextLogId(state), action: 'gameStart', detail: cfg });

  console.log('[initGameState] Complete:', state);
  return state;
}