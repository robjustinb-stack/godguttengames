/**
 * luu-session.js
 * Supabase session manager for Mission: LUU
 * Handles: create game, join game, save/resume solo, realtime GS sync
 *
 * Usage: import or include before engine.js
 * Exposes: window.LuuSession
 */

(() => {
  // -- Config ---------------------------------------------------------------
  const SUPABASE_URL  = 'https://ioocveznwsaxcraqsgnr.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvb2N2ZXpud3NheGNyYXFzZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTM1MjgsImV4cCI6MjA5NTg4OTUyOH0._mexp34z4bNHcfYfSZBlTFR6ZslJtLlw1-N4swtNJWo';
  const TABLE         = 'game_sessions';
  const SESSION_KEY   = 'luu_session';   // sessionStorage key for local identity

  // -- Supabase REST helpers ------------------------------------------------
  const headers = {
    'Content-Type':  'application/json',
    'apikey':        SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
  };

  async function sbGet(joinCode) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?join_code=eq.${encodeURIComponent(joinCode)}&limit=1`,
      { headers }
    );
    if (!res.ok) throw new Error(`GET failed: ${res.status}`);
    const rows = await res.json();
    return rows[0] ?? null;
  }

  async function sbInsert(row) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method:  'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body:    JSON.stringify(row),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`INSERT failed: ${res.status} — ${err}`);
    }
    const rows = await res.json();
    return rows[0];
  }

  async function sbUpdate(joinCode, patch) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?join_code=eq.${encodeURIComponent(joinCode)}`,
      {
        method:  'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body:    JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`UPDATE failed: ${res.status} — ${err}`);
    }
    return res.json();
  }

  // -- Password hashing (SHA-256 via WebCrypto — no bcrypt needed client-side) --
  // The hash is stored server-side; we compare hash === hash on join.
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data     = encoder.encode(password.trim());
    const hashBuf  = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // -- Join code generator --------------------------------------------------
  function generateJoinCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // -- Local identity (sessionStorage) -------------------------------------
  // Stores { joinCode, playerIndex (0 or 1), passwordHash } for the duration
  // of the browser session. No personal data — just enough to resume.
  function saveLocalIdentity(obj) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
  }

  function loadLocalIdentity() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  }

  function clearLocalIdentity() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // -- Realtime subscription -----------------------------------------------
  // Uses Supabase Realtime over WebSocket. Calls onGameStateUpdate(newGS)
  // whenever another client PATCHes the row.
  let _realtimeWs = null;

  function subscribeToSession(joinCode, onGameStateUpdate) {
    if (_realtimeWs) {
      _realtimeWs.close();
      _realtimeWs = null;
    }

    const wsUrl = SUPABASE_URL
      .replace('https://', 'wss://')
      .replace('http://',  'ws://')
      + '/realtime/v1/websocket?apikey=' + SUPABASE_ANON + '&vsn=1.0.0';

    const ws = new WebSocket(wsUrl);
    _realtimeWs = ws;

    ws.onopen = () => {
      // Join the realtime channel for this specific row
      ws.send(JSON.stringify({
        topic:   'realtime:public:game_sessions:join_code=eq.' + joinCode,
        event:   'phx_join',
        payload: {},
        ref:     '1',
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Only care about UPDATE events on our row
        if (
          msg.event === 'UPDATE' &&
          msg.payload?.record?.game_state
        ) {
          onGameStateUpdate(msg.payload.record.game_state);
        }
      } catch { /* ignore malformed frames */ }
    };

    ws.onerror = (e) => console.warn('[LuuSession] Realtime WS error', e);

    ws.onclose = () => {
      // Auto-reconnect after 3 s unless intentionally closed
      if (_realtimeWs === ws) {
        setTimeout(() => subscribeToSession(joinCode, onGameStateUpdate), 3000);
      }
    };

    return () => {
      _realtimeWs = null;
      ws.close();
    };
  }

  function unsubscribe() {
    if (_realtimeWs) {
      const ws = _realtimeWs;
      _realtimeWs = null;
      ws.close();
    }
  }

  // -- Public API -----------------------------------------------------------

  /**
   * createGame(password, initialGS, playerCount)
   * Player 1 creates a new session. Returns { joinCode }.
   */
  async function createGame(password, initialGS, playerCount = 1) {
    const passwordHash = await hashPassword(password);
    let joinCode;
    let attempts = 0;

    // Retry on join_code collision (astronomically rare but handle it)
    while (attempts < 5) {
      joinCode = generateJoinCode();
      try {
        await sbInsert({
          join_code:         joinCode,
          password_hash:     passwordHash,
          game_state:        initialGS,
          player_count:      playerCount,
          players_connected: 1,
        });
        break;
      } catch (e) {
        if (e.message.includes('duplicate') || e.message.includes('unique')) {
          attempts++;
          continue;
        }
        throw e;
      }
    }

    saveLocalIdentity({ joinCode, playerIndex: 0, passwordHash });
    return { joinCode };
  }

  /**
   * joinGame(joinCode, password)
   * Player 2 joins an existing session.
   * Returns { gameState, playerIndex } on success.
   * Throws descriptive error strings on failure.
   */
  async function joinGame(joinCode, password) {
    const code = joinCode.trim().toUpperCase();
    const row  = await sbGet(code);

    if (!row) throw new Error('Game not found. Check the join code and try again.');

    const passwordHash = await hashPassword(password);
    if (passwordHash !== row.password_hash) {
      throw new Error('Incorrect password.');
    }

    if (row.players_connected >= 2) {
      throw new Error('This game already has two players connected.');
    }

    // Increment players_connected
    await sbUpdate(code, { players_connected: row.players_connected + 1 });

    const playerIndex = row.players_connected; // 0-indexed: was 1, now 2nd player = index 1
    saveLocalIdentity({ joinCode: code, playerIndex, passwordHash });

    return { gameState: row.game_state, playerIndex };
  }

  /**
   * pushGameState(gameState)
   * Called by the engine after every action taken by the local player.
   * Pushes the full GS to Supabase — all other clients get it via Realtime.
   */
  async function pushGameState(gameState) {
    const identity = loadLocalIdentity();
    if (!identity) throw new Error('No active session.');
    await sbUpdate(identity.joinCode, { game_state: gameState });
  }

  /**
   * saveGame(password, gameState)
   * Solo save — creates or updates a session for save/resume.
   * Returns { joinCode } (the "save code" the player uses to resume).
   */
  async function saveGame(password, gameState) {
    const identity = loadLocalIdentity();

    if (identity) {
      // Already have a session — just update the GS
      const passwordHash = await hashPassword(password);
      if (passwordHash !== identity.passwordHash) {
        throw new Error('Incorrect password for this save.');
      }
      await sbUpdate(identity.joinCode, { game_state: gameState });
      return { joinCode: identity.joinCode };
    } else {
      // No existing session — create a solo save
      return createGame(password, gameState, 1);
    }
  }

  /**
   * resumeGame(joinCode, password)
   * Resume a solo save. Returns { gameState }.
   */
  async function resumeGame(joinCode, password) {
    const { gameState } = await joinGame(joinCode, password);
    return { gameState };
  }

  /**
   * getIdentity()
   * Returns the local player's { joinCode, playerIndex } or null.
   */
  function getIdentity() {
    return loadLocalIdentity();
  }

  /**
   * isMyTurn(gameState)
   * Returns true if the local player is the active player.
   * Engine should call this before allowing any action.
   */
  function isMyTurn(gameState) {
    const identity = loadLocalIdentity();
    if (!identity) return true; // solo play with no session — always your turn
    return gameState.position.currentPlayerIndex === identity.playerIndex;
  }

  /**
   * endSession()
   * Clears local identity and closes realtime connection.
   */
  function endSession() {
    clearLocalIdentity();
    unsubscribe();
  }

  // -- Expose ---------------------------------------------------------------
  window.LuuSession = {
    createGame,
    joinGame,
    pushGameState,
    saveGame,
    resumeGame,
    subscribeToSession,
    unsubscribe,
    getIdentity,
    isMyTurn,
    endSession,
  };

  console.log('[LuuSession] Loaded. Supabase project: ioocveznwsaxcraqsgnr');
})();
