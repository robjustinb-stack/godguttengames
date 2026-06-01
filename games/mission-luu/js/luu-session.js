/**
 * luu-session.js
 * Supabase session manager for Mission: LUU
 * Uses official @supabase/supabase-js v2 via CDN
 */

(() => {
  const SUPABASE_URL  = 'https://ioocveznwsaxcraqsgnr.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvb2N2ZXpud3NheGNyYXFzZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTM1MjgsImV4cCI6MjA5NTg4OTUyOH0._mexp34z4bNHcfYfSZBlTFR6ZslJtLlw1-N4swtNJWo';
  const TABLE         = 'game_sessions';
  const SESSION_KEY   = 'luu_session';

  // Wait for supabase client to be available
  function getClient() {
    if (typeof window.supabase === 'undefined') {
      console.error('[LuuSession] Supabase client not loaded');
      return null;
    }
    if (!window._luuSupabaseClient) {
      window._luuSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    }
    return window._luuSupabaseClient;
  }

  // Password hashing via WebCrypto
  async function hashPassword(password) {
    const data    = new TextEncoder().encode(password.trim());
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Generate 6-char join code
  function generateJoinCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  // Local identity
  function saveLocalIdentity(obj) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
  }
  function loadLocalIdentity() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function clearLocalIdentity() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // Realtime channel reference
  let _channel = null;

  async function createGame(password, initialGS, playerCount = 1) {
    const sb = getClient();
    if (!sb) throw new Error('Supabase client not available');
    const passwordHash = await hashPassword(password);
    let joinCode;
    let attempts = 0;
    while (attempts < 5) {
      joinCode = generateJoinCode();
      const { error } = await sb.from(TABLE).insert({
        join_code:         joinCode,
        password_hash:     passwordHash,
        game_state:        initialGS,
        player_count:      playerCount,
        players_connected: 1,
      });
      if (!error) break;
      if (error.code === '23505') { attempts++; continue; }
      throw new Error(`Create failed: ${error.message}`);
    }
    saveLocalIdentity({ joinCode, playerIndex: 0, passwordHash });
    console.log('[LuuSession] Game created:', joinCode);
    return { joinCode };
  }

  async function joinGame(joinCode, password) {
    const sb   = getClient();
    if (!sb) throw new Error('Supabase client not available');
    const code = joinCode.trim().toUpperCase();
    const { data, error } = await sb.from(TABLE)
      .select('*').eq('join_code', code).single();
    if (error || !data) throw new Error('Game not found. Check the join code and try again.');
    const passwordHash = await hashPassword(password);
    if (passwordHash !== data.password_hash) throw new Error('Incorrect password.');
    if (data.players_connected >= 2) throw new Error('This game already has two players connected.');
    await sb.from(TABLE).update({ players_connected: data.players_connected + 1 })
      .eq('join_code', code);
    const playerIndex = data.players_connected;
    saveLocalIdentity({ joinCode: code, playerIndex, passwordHash });
    console.log('[LuuSession] Joined as player', playerIndex);
    return { gameState: data.game_state, playerIndex };
  }

  async function pushGameState(gameState) {
    const sb       = getClient();
    const identity = loadLocalIdentity();
    if (!sb || !identity) return;
    const { error } = await sb.from(TABLE)
      .update({ game_state: gameState, updated_at: new Date().toISOString() })
      .eq('join_code', identity.joinCode);
    if (error) console.warn('[LuuSession] Push failed:', error.message);
  }

  function subscribeToSession(joinCode, onGameStateUpdate) {
    const sb = getClient();
    if (!sb) return () => {};
    if (_channel) { sb.removeChannel(_channel); _channel = null; }

    _channel = sb
      .channel(`session_${joinCode}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  TABLE,
        filter: `join_code=eq.${joinCode}`
      }, (payload) => {
        console.log('[LuuSession] Realtime update received');
        if (payload.new?.game_state) {
          onGameStateUpdate(payload.new.game_state);
        }
      })
      .subscribe((status) => {
        console.log('[LuuSession] Realtime status:', status);
      });

    return () => {
      if (_channel) { sb.removeChannel(_channel); _channel = null; }
    };
  }

  function unsubscribe() {
    const sb = getClient();
    if (sb && _channel) { sb.removeChannel(_channel); _channel = null; }
  }

  async function saveGame(password, gameState) {
    const identity = loadLocalIdentity();
    if (identity) {
      const passwordHash = await hashPassword(password);
      if (passwordHash !== identity.passwordHash) throw new Error('Incorrect password for this save.');
      await pushGameState(gameState);
      return { joinCode: identity.joinCode };
    }
    return createGame(password, gameState, 1);
  }

  async function resumeGame(joinCode, password) {
    const { gameState } = await joinGame(joinCode, password);
    return { gameState };
  }

  function getIdentity() { return loadLocalIdentity(); }

  function isMyTurn(gameState) {
    const identity = loadLocalIdentity();
    if (!identity) return true;
    return gameState?.position?.currentPlayerIndex === identity.playerIndex;
  }

  function endSession() { clearLocalIdentity(); unsubscribe(); }

  window.LuuSession = {
    createGame, joinGame, pushGameState, saveGame, resumeGame,
    subscribeToSession, unsubscribe, getIdentity, isMyTurn, endSession,
  };

  console.log('[LuuSession] Loaded — Supabase JS client version');
})();
