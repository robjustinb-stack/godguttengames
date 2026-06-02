// ui.js — User Interface

const UI = (() => {

  // Inject Google Fonts
  (() => {
    if (document.querySelector('#luu-fonts')) return;
    const link = document.createElement('link');
    link.id = 'luu-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap';
    document.head.appendChild(link);
  })();

  // Inject global styles
  (() => {
    if (document.querySelector('#luu-styles')) return;
    const style = document.createElement('style');
    style.id = 'luu-styles';
    style.textContent = `
      :root {
        --bg: #0a0d0f;
        --surface: #111518;
        --surface2: #161c20;
        --border: #1e2830;
        --border-light: #2a3840;
        --accent: #4fc4cf;
        --accent2: #2a7a82;
        --accent-glow: rgba(79,196,207,0.12);
        --text: #d8e8ec;
        --text-muted: #5a7a82;
        --text-dim: #8aaab2;
        --gold: #c8a96e;
        --gold-dim: #6b5530;
        --danger: #cf4f6a;
        --win: #4fcf8a;
        --class-rasluu: #cf4f4f;
        --class-lagluu: #4fcf8a;
        --class-kjeluu: #4f8bcf;
        --class-gifluu: #9b4fcf;
        --class-bisluu: #c8a96e;
      }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: var(--bg);
        color: var(--text);
        font-family: 'Crimson Pro', Georgia, serif;
        font-size: 14px;
        height: 100vh;
        overflow: hidden;
      }
      #board {
        display: flex;
        height: 100vh;
        width: 100vw;
      }
      #left-panel {
        width: 72%;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--border);
        position: relative;
        overflow: hidden;
      }
      #right-panel {
        width: 28%;
        display: flex;
        flex-direction: column;
        background: var(--surface);
        overflow: hidden;
      }
      .zone {
        padding: 8px 12px;
        border-bottom: 1px solid var(--border);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      #enemy-zone  { height: 30%; }
      #luu-queue   { height: 35%; overflow-y: auto; }
      #hand-zone   { height: 35%; }
      .zone-label {
        font-family: 'Cinzel', serif;
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-bottom: 6px;
        flex-shrink: 0;
      }
      .card-row {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        overflow-x: auto;
        overflow-y: hidden;
        flex: 1;
        padding-bottom: 4px;
      }
      .enemy-card {
        background: var(--surface);
        border: 1px solid var(--border-light);
        border-radius: 4px;
        padding: 8px;
        min-width: 110px;
        max-width: 130px;
        flex-shrink: 0;
        font-size: 12px;
      }
      .enemy-card.is-boss {
        border-color: var(--gold);
        box-shadow: 0 0 8px rgba(200,169,110,0.25);
      }
      .enemy-card.hit-this-round { border-color: var(--danger); }
      .luu-card {
        background: var(--surface);
        border: 1px solid var(--border-light);
        border-radius: 4px;
        padding: 8px;
        min-width: 130px;
        max-width: 160px;
        flex-shrink: 0;
        font-size: 12px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .luu-card.is-active {
        border-color: var(--accent);
        box-shadow: 0 0 10px var(--accent-glow);
      }
      .luu-card.has-acted { opacity: 0.45; }
      .hand-card {
        background: var(--surface);
        border: 1px solid var(--border-light);
        border-radius: 4px;
        padding: 8px 10px;
        width: 100px;
        min-height: 130px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 11px;
        overflow: hidden;
        transition: transform 0.1s, border-color 0.15s;
      }
      .hand-card:hover { transform: translateY(-3px); }
      .hand-card.is-selected {
        border-color: var(--accent);
        box-shadow: 0 0 10px var(--accent-glow);
      }
      .badge {
        display: inline-block;
        font-family: 'Cinzel', serif;
        font-size: 9px;
        letter-spacing: 0.06em;
        padding: 1px 4px;
        border-radius: 2px;
        background: var(--surface2);
        border: 1px solid var(--border-light);
        color: var(--text-dim);
      }
      .badge.boss-badge   { border-color: var(--gold); color: var(--gold); }
      .badge.evolved-badge{ border-color: var(--gold); color: var(--gold); }
      .badge.luu-badge    { border-color: var(--accent2); color: var(--accent); }
      .hp-bar-wrap {
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: 2px;
        height: 5px;
        width: 100%;
        margin: 3px 0;
      }
      .hp-bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.2s;
      }
      .xp-dots { display: flex; gap: 3px; margin: 3px 0; }
      .xp-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        border: 1px solid var(--gold-dim);
        background: var(--surface2);
      }
      .xp-dot.filled { background: var(--gold); border-color: var(--gold); }
      button {
        font-family: 'Cinzel', serif;
        font-size: 10px;
        letter-spacing: 0.05em;
        background: var(--surface2);
        color: var(--text);
        border: 1px solid var(--border-light);
        border-radius: 3px;
        padding: 3px 7px;
        cursor: pointer;
        transition: background 0.1s, color 0.1s, border-color 0.1s;
        white-space: nowrap;
      }
      button:hover { background: var(--accent2); border-color: var(--accent); color: var(--accent); }
      button.btn-danger  { border-color: var(--danger); color: var(--danger); }
      button.btn-danger:hover { background: var(--danger); color: var(--bg); border-color: var(--danger); }
      button.btn-gold    { border-color: var(--gold); color: var(--gold); }
      button.btn-gold:hover { background: var(--gold-dim); color: var(--gold); }
      button.btn-large   { font-size: 12px; padding: 8px 18px; }
      .action-btns { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 5px; }
      #header-section {
        height: 220px;
        flex-shrink: 0;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
        overflow: hidden;
      }
      #combat-log {
        flex: 1;
        overflow-y: auto;
        padding: 8px 12px;
      }
      .h-title {
        font-family: 'Cinzel', serif;
        font-size: 13px;
        letter-spacing: 0.12em;
        color: var(--accent);
        margin-bottom: 4px;
      }
      .h-sub  { font-size: 12px; color: var(--text-dim); margin-bottom: 2px; }
      .h-phase {
        font-family: 'Cinzel', serif;
        font-size: 9px;
        color: var(--text-muted);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      .boss-hp-label { font-size: 11px; color: var(--gold); margin-bottom: 3px; }
      .boss-hp-bar-wrap {
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: 2px;
        height: 8px; width: 100%;
      }
      .boss-hp-bar-fill {
        height: 100%; border-radius: 2px;
        background: var(--gold);
        transition: width 0.2s;
      }
      .log-title {
        font-family: 'Cinzel', serif;
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-bottom: 6px;
        position: sticky;
        top: 0;
        background: var(--surface);
        padding-bottom: 4px;
        z-index: 1;
      }
      .log-entry { font-size: 12px; color: var(--text-dim); line-height: 1.5; padding: 1px 0; }
      .log-entry.marker { color: var(--accent); font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 0.06em; padding: 4px 0; }
      .log-entry.wave-marker { color: var(--gold); font-family: 'Cinzel', serif; font-size: 10px; padding: 3px 0; }
      .pending-panel {
        border-radius: 4px;
        padding: 7px 10px;
        margin-bottom: 6px;
        font-size: 12px;
        flex-shrink: 0;
      }
      .pending-panel.p-discard   { border: 2px solid var(--danger); }
      .pending-panel.p-choice    { border: 2px solid #9b4fcf; }
      .pending-panel.p-target    { border: 2px solid var(--win); }
      .pending-panel.p-boss-xp   { border: 2px solid var(--gold); }
      .pending-panel.p-choose-luu{ border: 2px solid var(--accent); }
      .pending-panel.p-rearrange { border: 2px solid var(--accent2); }
      .pending-panel.p-mulligan  { border: 2px solid var(--accent); }
      .pending-title {
        font-family: 'Cinzel', serif;
        font-size: 10px;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        margin-bottom: 5px;
      }
      #end-overlay {
        position: absolute;
        inset: 0;
        background: rgba(10,13,15,0.93);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }
      .end-content { text-align: center; padding: 32px; max-width: 440px; }
      .end-emoji   { font-size: 46px; display: block; margin-bottom: 10px; }
      .end-title   { font-family: 'Cinzel', serif; font-size: 26px; letter-spacing: 0.12em; margin-bottom: 6px; }
      .end-sub     { font-size: 13px; color: var(--text-dim); margin-bottom: 14px; }
      .end-stats {
        text-align: left;
        background: var(--surface);
        border: 1px solid var(--border-light);
        border-radius: 4px;
        padding: 10px 14px;
        margin-bottom: 12px;
        font-size: 13px;
        line-height: 1.8;
      }
      .end-stats strong { color: var(--accent); }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: var(--bg); }
      ::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 3px; }
      .card-name {
        font-family: 'Cinzel', serif;
        font-size: 10px;
        letter-spacing: 0.04em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .card-desc {
        font-size: 10px;
        color: var(--text-dim);
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.3;
        flex: 1;
      }
      .tooltip {
        position: fixed;
        z-index: 1000;
        background: var(--surface2);
        border: 1px solid var(--border-light);
        border-radius: 6px;
        padding: 12px 14px;
        min-width: 220px;
        max-width: 300px;
        font-family: 'Crimson Pro', Georgia, serif;
        font-size: 13px;
        color: var(--text-dim);
        pointer-events: none;
        box-shadow: 0 4px 24px rgba(0,0,0,0.6);
        display: none;
      }
      .tooltip.visible { display: block; }
      .tooltip-name {
        font-family: 'Cinzel', serif;
        font-size: 12px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text);
        margin-bottom: 6px;
      }
      .tooltip-section {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--border);
      }
      .tooltip-label {
        font-family: 'Cinzel', serif;
        font-size: 9px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-bottom: 3px;
      }
      .tooltip-stat-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        padding: 2px 0;
      }
      .tooltip-stat-row.current-level { color: var(--accent); }
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        z-index: 500;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal-box {
        background: var(--surface);
        border: 1px solid var(--border-light);
        border-radius: 8px;
        padding: 24px 28px;
        min-width: 320px;
        max-width: 520px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 40px rgba(0,0,0,0.8);
      }
      .modal-title {
        font-family: 'Cinzel', serif;
        font-size: 13px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 16px;
      }
      .modal-option {
        display: block;
        width: 100%;
        text-align: left;
        padding: 10px 14px;
        margin: 6px 0;
        background: var(--surface2);
        border: 1px solid var(--border-light);
        border-radius: 4px;
        color: var(--text);
        font-family: 'Crimson Pro', serif;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.12s;
        white-space: normal;
        letter-spacing: 0;
      }
      .modal-option:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
      .modal-option.danger:hover { border-color: var(--danger); color: var(--danger); background: transparent; }
      .modal-option.gold { border-color: var(--gold-dim); color: var(--gold); }
      .modal-option.gold:hover { border-color: var(--gold); background: rgba(200,169,110,0.08); }
    `;
    document.head.appendChild(style);
  })();

  // ─── module-level state ─────────────────────

  let activeAction      = null;
  let selectedCardIndex = null;

  // ─── helpers ───────────────────────────────

  function clsColor(name) {
    const map = {
      rasluu: 'var(--class-rasluu)',
      lagluu: 'var(--class-lagluu)',
      kjeluu: 'var(--class-kjeluu)',
      gifluu: 'var(--class-gifluu)',
      bisluu: 'var(--class-bisluu)',
    };
    return map[(name || '').toLowerCase()] || 'var(--text)';
  }

  function hpBar(current, max, color) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    return `<div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
  }

  function xpDots(xp, perLevel = 5) {
    const filled = xp % perLevel;
    let html = '<div class="xp-dots">';
    for (let i = 0; i < perLevel; i++) {
      html += `<div class="xp-dot${i < filled ? ' filled' : ''}"></div>`;
    }
    return html + '</div>';
  }

  function gatherDots(track, max = 5) {
    let html = '<div class="xp-dots">';
    for (let i = 1; i <= max; i++) {
      const filled = i <= track;
      html += `<div class="xp-dot${filled ? ' filled' : ''}" style="${filled ? 'background:var(--accent);border-color:var(--accent)' : ''}"></div>`;
    }
    return html + '</div>';
  }

  // ─── tooltip helpers ───────────────────────

  function showTooltip(html, e) {
    const tip = document.getElementById('luu-tooltip');
    if (!tip) return;
    tip.innerHTML = html;
    tip.classList.add('visible');
    positionTooltip(e);
  }

  function hideTooltip() {
    const tip = document.getElementById('luu-tooltip');
    if (tip) tip.classList.remove('visible');
  }

  function positionTooltip(e) {
    const tip = document.getElementById('luu-tooltip');
    if (!tip) return;
    const x = e.clientX + 16;
    const y = e.clientY - 10;
    const maxX = window.innerWidth - tip.offsetWidth - 10;
    const maxY = window.innerHeight - tip.offsetHeight - 10;
    tip.style.left = Math.min(x, maxX) + 'px';
    tip.style.top  = Math.max(10, Math.min(y, maxY)) + 'px';
  }

  function getClassColour(className) {
    const map = {
      Rasluu: 'var(--class-rasluu)',
      Lagluu: 'var(--class-lagluu)',
      Kjeluu: 'var(--class-kjeluu)',
      Gifluu: 'var(--class-gifluu)',
      Bisluu: 'var(--class-bisluu)'
    };
    return map[className] || 'var(--text)';
  }

  function buildLuuTooltip(luuQueueEntry, state) {
    const card = CardRegistry.getCard(luuQueueEntry.cardId);
    if (!card) return '';
    const classColour = getClassColour(luuQueueEntry.class);
    const statsRows = card.stats.health.map((hp, i) => {
      const isCurrent = (i + 1) === luuQueueEntry.level;
      return `<div class="tooltip-stat-row ${isCurrent ? 'current-level' : ''}">
        <span>L${i + 1}</span>
        <span>${hp} HP</span>
        <span>${card.stats.baseAttack[i]} ATK</span>
        ${isCurrent ? '<span>← current</span>' : ''}
      </div>`;
    }).join('');

    const traitHtml = card.trait && card.trait.name ? `
      <div class="tooltip-section">
        <div class="tooltip-label">Trait</div>
        <strong style="color:var(--text)">${card.trait.name}</strong>
        <div>${card.trait.description}</div>
      </div>` : '';

    const passiveHtml = card.passive && card.passive.name ? `
      <div class="tooltip-section">
        <div class="tooltip-label">Passive</div>
        <strong style="color:var(--text)">${card.passive.name}</strong>
        <div>${card.passive.description}</div>
      </div>` : '';

    return `
      <div class="tooltip-name" style="color:${classColour}">${card.name} — ${luuQueueEntry.class}</div>
      <div>Level ${luuQueueEntry.level} · XP ${luuQueueEntry.xp}/5 · ${luuQueueEntry.evolved ? 'Evolved' : 'Base'}</div>
      <div class="tooltip-section">
        <div class="tooltip-label">Stats by Level</div>
        ${statsRows}
      </div>
      ${traitHtml}
      ${passiveHtml}
      <div class="tooltip-section">
        <div class="tooltip-label">Type</div>
        <div>Beats: ${card.typeAdvantage.beats || '—'} · Loses to: ${card.typeAdvantage.losesTo || '—'}</div>
      </div>
    `;
  }

  function buildEnemyTooltip(enemy) {
    const card = CardRegistry.getCard(enemy.cardId);
    if (!card) {
      const bossCard = CardRegistry.getBossCard ? CardRegistry.getBossCard(enemy.cardId) : null;
      if (!bossCard) return '';
      const sectorIdx = GS.position.sectorNumber - 1;
      return `
        <div class="tooltip-name" style="color:var(--gold)">${bossCard.name} — BOSS</div>
        <div>${enemy.currentHp}/${enemy.maxHp} HP · ${bossCard.attackBySector[sectorIdx]} ATK</div>
        <div class="tooltip-section">
          <div class="tooltip-label">Passive</div>
          <strong style="color:var(--text)">${bossCard.passive.name}</strong>
          <div>${bossCard.passive.description || bossCard.passive.trigger}</div>
        </div>
      `;
    }
    const classColour = getClassColour(enemy.class);
    const traitHtml = card.trait && card.trait.name ? `
      <div class="tooltip-section">
        <div class="tooltip-label">Trait</div>
        <strong style="color:var(--text)">${card.trait.name}</strong>
        <div>${card.trait.description}</div>
      </div>` : '';

    const atkDisplay = card.stats ? card.stats.baseAttack : '—';
    const xpDisplay  = card.xpOnDefeat !== undefined ? card.xpOnDefeat : '—';
    const typeDisplay = card.typeAdvantage
      ? `Beats: ${card.typeAdvantage.beats || '—'} · Loses to: ${card.typeAdvantage.losesTo || '—'}`
      : '';

    return `
      <div class="tooltip-name" style="color:${classColour}">${enemy.class} — Tier ${enemy.tier}</div>
      <div>${enemy.currentHp}/${enemy.maxHp} HP · ${atkDisplay} ATK · ${xpDisplay} XP on defeat</div>
      ${typeDisplay ? `<div>${typeDisplay}</div>` : ''}
      ${traitHtml}
    `;
  }

  function buildHandCardTooltip(cardId) {
    const card = CardRegistry.getCard(cardId);
    if (!card) return '';

    if (card.cardType === 'Luu' || card.cardType === 'LuuEvolved') {
      const classColour = getClassColour(card.class);
      const statsRows = card.stats.health.map((hp, i) => `
        <div class="tooltip-stat-row">
          <span>L${i + 1}</span>
          <span>${hp} HP</span>
          <span>${card.stats.baseAttack[i]} ATK</span>
        </div>`).join('');
      const traitHtml = card.trait && card.trait.name ? `
        <div class="tooltip-section">
          <div class="tooltip-label">Trait</div>
          <strong style="color:var(--text)">${card.trait.name}</strong>
          <div>${card.trait.description}</div>
        </div>` : '';
      const passiveHtml = card.passive && card.passive.name ? `
        <div class="tooltip-section">
          <div class="tooltip-label">Passive</div>
          <strong style="color:var(--text)">${card.passive.name}</strong>
          <div>${card.passive.description}</div>
        </div>` : '';
      return `
        <div class="tooltip-name" style="color:${classColour}">${card.name} — ${card.class}</div>
        <div>${card.cardType === 'LuuEvolved' ? '✨ Evolved form' : 'Base form'} · Cost: ${card.cost} Luutex</div>
        <div class="tooltip-section">
          <div class="tooltip-label">Stats</div>
          ${statsRows}
        </div>
        ${traitHtml}
        ${passiveHtml}
      `;
    }

    const timing = card.effects && card.effects[0] ? card.effects[0].timing : 'immediate';
    const trigger = card.effects && card.effects[0] ? card.effects[0].trigger : 'onPlay';
    return `
      <div class="tooltip-name">${card.name}</div>
      <div>Cost: ${card.cost} Luutex · ${card.consumesAction === false ? 'Free action' : 'Consumes action'}</div>
      <div style="margin-top:6px;color:var(--text)">${card.description}</div>
      <div class="tooltip-section">
        <div class="tooltip-label">Timing</div>
        <div>${timing} · Trigger: ${trigger}</div>
      </div>
      ${card.tags ? `<div style="margin-top:6px;color:var(--text-muted);font-size:11px">${card.tags.join(' · ')}</div>` : ''}
    `;
  }

  // ─── modal ─────────────────────────────────

  function createModal(title, bodyHtml) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-title">${title}</div>
        ${bodyHtml}
      </div>
    `;
    return overlay;
  }

  window._openDraftViewer = function() {
    const ds = (typeof GS !== 'undefined' && GS && GS.draftState) ? GS.draftState : null;
    if (!ds) return;

    let modal = document.getElementById('draftViewerModal');
    if (modal) {
      modal.style.display = 'flex';
      window._draftViewerOpen = true;
      // Refresh card list in case more cards were drafted since last open
      const listEl = document.getElementById('dvCardList');
      if (listEl) listEl.innerHTML = window._buildDvCardRows(ds);
      return;
    }

    window._buildDvCardRows = function(ds) {
      const allCards = [
        ...(ds.keptCore  || []).map(id => ({ id, pool: 'core'  })),
        ...(ds.keptPower || []).map(id => ({ id, pool: 'power' }))
      ];
      let rows = '';
      for (const { id, pool } of allCards) {
        const cardDef = (typeof CardRegistry !== 'undefined') ? CardRegistry.getCard(id) : null;
        const name    = cardDef ? cardDef.name : id.replace(/action_|luu_/g, '').replace(/_/g, ' ');
        const type    = cardDef ? (cardDef.cardType || '') : '';
        const cost    = (cardDef && cardDef.cost !== undefined) ? cardDef.cost + ' LTX' : '';
        let typeLabel = pool === 'power' ? 'Power' : 'Action';
        let typeColor = pool === 'power' ? 'var(--gold)' : 'var(--accent2)';
        let filterKey = pool === 'power' ? 'action' : 'action';
        if (type === 'Luu')        { typeLabel = 'Base Luu';    typeColor = '#4caf7d'; filterKey = 'luu';     }
        if (type === 'LuuEvolved') { typeLabel = 'Evolved Luu'; typeColor = '#4caf7d'; filterKey = 'evolved'; }
        rows += '<div class="dv-card" data-filter="' + filterKey + '" style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-bottom:1px solid var(--border)">';
        rows += '<span style="flex:1;font-size:12px;color:var(--text)">' + name + '</span>';
        rows += '<span style="font-size:10px;color:' + typeColor + ';letter-spacing:0.06em;text-transform:uppercase;min-width:70px;text-align:right">' + typeLabel + '</span>';
        if (cost) rows += '<span style="font-size:11px;color:var(--gold);min-width:52px;text-align:right">' + cost + '</span>';
        rows += '</div>';
      }
      if (!rows) rows = '<div style="padding:16px;color:var(--text-muted);font-size:12px;text-align:center">No cards drafted yet.</div>';
      return rows;
    };

    window._dvFilter = function(key) {
      const modal = document.getElementById('draftViewerModal');
      if (!modal) return;
      modal.querySelectorAll('.dv-card').forEach(c => {
        c.style.display = (key === 'all' || c.dataset.filter === key) ? 'flex' : 'none';
      });
      modal.querySelectorAll('#dvFilters button').forEach(b => {
        const active = b.dataset.fkey === key;
        b.style.background   = active ? 'var(--accent)' : 'transparent';
        b.style.borderColor  = active ? 'var(--accent)' : 'var(--border)';
        b.style.color        = active ? 'var(--bg)'     : 'var(--text-muted)';
      });
    };

    modal = document.createElement('div');
    modal.id = 'draftViewerModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML =
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;width:400px;max-height:80vh;display:flex;flex-direction:column;position:relative">' +
        '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
          '<span style="font-family:\'Cinzel\',serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold)">Drafted Cards</span>' +
          '<button onclick="document.getElementById(\'draftViewerModal\').style.display=\'none\';window._draftViewerOpen=false;" style="background:transparent;border:none;color:var(--text-muted);font-size:16px;cursor:pointer;padding:2px 6px;line-height:1">✕</button>' +
        '</div>' +
        '<div id="dvFilters" style="padding:8px 10px;border-bottom:1px solid var(--border);display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap">' +
          '<button data-fkey="all"     onclick="window._dvFilter(\'all\')"     style="padding:4px 10px;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;background:var(--accent);border:1px solid var(--accent);color:var(--bg);border-radius:3px;cursor:pointer;">All</button>' +
          '<button data-fkey="action"  onclick="window._dvFilter(\'action\')"  style="padding:4px 10px;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:3px;cursor:pointer;">Action Cards</button>' +
          '<button data-fkey="luu"     onclick="window._dvFilter(\'luu\')"     style="padding:4px 10px;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:3px;cursor:pointer;">Base Luu</button>' +
          '<button data-fkey="evolved" onclick="window._dvFilter(\'evolved\')" style="padding:4px 10px;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:3px;cursor:pointer;">Evolved Luu</button>' +
        '</div>' +
        '<div id="dvCardList" style="overflow-y:auto;flex:1">' + window._buildDvCardRows(ds) + '</div>' +
      '</div>';
    document.body.appendChild(modal);
    window._draftViewerOpen = true;
  };

  function renderModal(state) {
    const player = state.players[0];

    // Draft screen — shown during all draft phases and mulligan
    if (state.draftState && state.draftState.phase !== 'complete') {
      const ds      = state.draftState;
      const player  = state.players[state.position.currentPlayerIndex];

      // --- MULLIGAN PROMPT ---
      if (ds.pendingMulligan) {
        let html = '<div style="padding:20px;min-width:300px;text-align:center">';
        html += '<div style="font-family:\'Cinzel\',serif;font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);margin-bottom:8px">Opening Hand</div>';
        html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">No Luu cards in your opening hand. Take a mulligan?</div>';
        html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:20px">You must keep the second hand regardless of its contents.</div>';
        html += '<div style="display:flex;gap:10px;justify-content:center">';
        html += '<button onclick="handleMulliganAccept()" style="padding:10px 20px;font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;background:var(--accent);border:1px solid var(--accent);color:var(--bg);border-radius:4px;cursor:pointer;">Mulligan</button>';
        html += '<button onclick="handleMulliganDecline()" style="padding:10px 20px;font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;background:var(--surface);border:1px solid var(--border);color:var(--text-muted);border-radius:4px;cursor:pointer;">Keep Hand</button>';
        html += '</div>';
        html += '</div>';
        const mulliganEl = document.createElement('div');
        mulliganEl.className = 'modal-overlay';
        mulliganEl.innerHTML = '<div class="modal-box">' + html + '</div>';
        return mulliganEl;
      }

      // --- DRAFT SCREEN ---
      const coreKept   = ds.keptCore.length;
      const powerKept  = ds.keptPower.length;
      const coreLeft   = ds.coreTarget  - coreKept;
      const powerLeft  = ds.powerTarget - powerKept;
      const reveal     = ds.currentReveal || [];
      const selected   = ds.cascadeSelection || 0;
      const maxSelect  = reveal.length;

      // Phase label
      let phaseLabel = 'Concurrent Draft';
      if (ds.phase === 'coreOnly')  phaseLabel = 'Core Draft — Power Complete';
      if (ds.phase === 'powerOnly') phaseLabel = 'Power Draft — Core Complete';

      let html = '<div style="padding:20px;min-width:340px;max-width:480px">';

      // Header
      html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">';
      html += '<div>';
      html += '<div style="font-family:\'Cinzel\',serif;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);margin-bottom:2px">Mission LUU — Deck Draft</div>';
      html += '<div style="font-size:10px;color:var(--text-muted);letter-spacing:0.08em;text-transform:uppercase">' + phaseLabel + '</div>';
      html += '</div>';
      html += '<button onclick="window._openDraftViewer && window._openDraftViewer()" style="padding:5px 10px;font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:0.06em;background:var(--surface2);border:1px solid var(--border);color:var(--text-dim);border-radius:4px;cursor:pointer;white-space:nowrap">🃏 Drafted Cards</button>';
      html += '</div>';

      // Progress bars
      html += '<div style="display:flex;gap:12px;margin-bottom:16px">';

      // Core progress
      const corePct = Math.round((coreKept / ds.coreTarget) * 100);
      html += '<div style="flex:1">';
      html += '<div style="font-family:\'Cinzel\',serif;font-size:10px;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:3px">CORE ' + coreKept + '/' + ds.coreTarget + '</div>';
      html += '<div style="height:4px;background:var(--surface2);border-radius:2px">';
      html += '<div style="height:4px;background:var(--accent2);border-radius:2px;width:' + corePct + '%"></div>';
      html += '</div></div>';

      // Power progress
      const powerPct = Math.round((powerKept / ds.powerTarget) * 100);
      html += '<div style="flex:1">';
      html += '<div style="font-family:\'Cinzel\',serif;font-size:10px;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:3px">POWER ' + powerKept + '/' + ds.powerTarget + '</div>';
      html += '<div style="height:4px;background:var(--surface2);border-radius:2px">';
      html += '<div style="height:4px;background:var(--gold);border-radius:2px;width:' + powerPct + '%"></div>';
      html += '</div></div>';

      html += '</div>';

      // Cascade instruction
      if (ds.phase !== 'powerOnly') {
        html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">';
        html += 'Click a card to take it and all cards to its left. Click again to deselect.';
        html += '</div>';
      }

      // Card row
      html += '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';

      for (let i = 0; i < reveal.length; i++) {
        const card      = reveal[i];
        const pos       = card.position;
        const isSelected = pos <= selected;
        const isPower    = card.pool === 'power';

        // Look up card name
        const cardDef   = (typeof CardRegistry !== 'undefined') ? CardRegistry.getCard(card.cardId) : null;
        const cardName  = cardDef ? cardDef.name : card.cardId.replace('action_', '').replace('luu_', '').replace(/_/g, ' ');
        const cardType  = cardDef ? cardDef.cardType : '';
        const isLuu     = cardType === 'Luu' || cardType === 'LuuEvolved';

        // Color coding
        let borderColor = isSelected ? 'var(--accent)' : 'var(--border)';
        if (isSelected && isPower) borderColor = 'var(--gold)';
        if (isSelected && isLuu)   borderColor = '#4caf7d';

        let bgColor = isSelected ? 'var(--surface2)' : 'var(--surface)';
        let opacity = (!isSelected && selected > 0) ? '0.45' : '1';

        // Pool tag
        let poolTag = '';
        if (isPower) poolTag = '<span style="font-size:9px;color:var(--gold);letter-spacing:0.06em">POWER</span>';
        else if (isLuu) poolTag = '<span style="font-size:9px;color:#4caf7d;letter-spacing:0.06em">' + (cardType === 'LuuEvolved' ? 'EVOLVED' : 'LUU') + '</span>';
        else poolTag = '<span style="font-size:9px;color:var(--accent);letter-spacing:0.06em">CORE</span>';

        // Position number
        const posLabel = '<span style="font-size:9px;color:var(--text-muted)">' + pos + '</span>';

        // Click handler — toggle cascade at this position
        const clickHandler = 'handleDraftCascadeSelect(' + (selected === pos ? '0' : pos) + ')';

        html += '<div onclick="' + clickHandler + '" style="';
        html += 'flex:1;min-width:70px;max-width:90px;';
        html += 'padding:8px 6px;border:1px solid ' + borderColor + ';';
        html += 'background:' + bgColor + ';border-radius:4px;cursor:pointer;';
        html += 'opacity:' + opacity + ';text-align:center;';
        html += 'transition:opacity 0.1s;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' + posLabel + poolTag + '</div>';
        html += '<div style="font-family:\'Cinzel\',serif;font-size:10px;color:var(--text);letter-spacing:0.04em;line-height:1.3;min-height:32px">' + cardName + '</div>';
        html += '<div style="text-align:right;margin-top:4px">';
        html += '<button onclick="event.stopPropagation();handleDraftInspect(\'' + card.cardId + '\')" ';
        html += 'style="padding:1px 5px;font-size:9px;background:transparent;border:1px solid var(--border);';
        html += 'color:var(--text-muted);border-radius:2px;cursor:pointer;line-height:1.4">i</button>';
        html += '</div>';
        html += '</div>';
      }

      html += '</div>';

      // Inspect panel — shown when a card's info button is clicked
      if (ds.inspectCard) {
        const inspected = (typeof CardRegistry !== 'undefined') ? CardRegistry.getCard(ds.inspectCard) : null;
        if (inspected) {
          const iName  = inspected.name || ds.inspectCard;
          const iCost  = inspected.cost !== undefined ? inspected.cost + ' LTX' : '—';
          const iDesc  = inspected.description || 'No description available.';
          const iTags  = (inspected.tags || []).join(' · ') || '';
          const iType  = inspected.cardType || '';

          let typeColor = 'var(--accent2)';
          if (iType === 'LuuEvolved') typeColor = '#4caf7d';
          else if (iType === 'Luu')   typeColor = '#4caf7d';
          else if (typeof POWER_ACTION_CARD_IDS !== 'undefined' && POWER_ACTION_CARD_IDS.includes(ds.inspectCard)) typeColor = 'var(--gold)';

          html += '<div style="margin-bottom:10px;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:4px">';
          html += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">';
          html += '<span style="font-family:\'Cinzel\',serif;font-size:12px;color:var(--text);letter-spacing:0.06em">' + iName + '</span>';
          html += '<span style="font-size:11px;color:' + typeColor + ';font-weight:bold">' + iCost + '</span>';
          html += '</div>';
          if (iTags) {
            html += '<div style="font-size:9px;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:6px;text-transform:uppercase">' + iTags + '</div>';
          }
          html += '<div style="font-size:11px;color:var(--text);line-height:1.5">' + iDesc + '</div>';
          html += '</div>';
        }
      }

      // powerOnly — keep/discard buttons
      if (ds.phase === 'powerOnly' && reveal.length === 1) {
        html += '<div style="display:flex;gap:8px">';
        html += '<button onclick="handleDraftGauntletSelect(true)" style="flex:1;padding:8px;font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;background:var(--accent);border:1px solid var(--accent);color:var(--bg);border-radius:4px;cursor:pointer;">Keep</button>';
        html += '<button onclick="handleDraftGauntletSelect(false)" style="flex:1;padding:8px;font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;background:var(--surface);border:1px solid var(--border);color:var(--text-muted);border-radius:4px;cursor:pointer;">Discard</button>';
        html += '</div>';

      } else {
        // Cascade confirm + pass buttons
        html += '<div style="display:flex;gap:8px;align-items:center">';

        // Confirm button — only active when selection > 0
        if (selected > 0) {
          html += '<button onclick="handleDraftCascadeConfirm()" style="flex:1;padding:8px;font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;background:var(--accent);border:1px solid var(--accent);color:var(--bg);border-radius:4px;cursor:pointer;">Take ' + selected + ' card' + (selected > 1 ? 's' : '') + '</button>';
        } else {
          html += '<div style="flex:1;padding:8px;font-size:11px;color:var(--text-muted);text-align:center">Select a card to take</div>';
        }

        // Pass button — always available
        html += '<button onclick="handleDraftCascadeSelect(0);handleDraftCascadeConfirm()" style="padding:8px 14px;font-family:\'Cinzel\',serif;font-size:11px;background:var(--surface);border:1px solid var(--border);color:var(--text-muted);border-radius:4px;cursor:pointer;">Pass</button>';

        html += '</div>';
      }

      // Remaining needed
      html += '<div style="font-size:10px;color:var(--text-muted);margin-top:10px;text-align:center">';
      if (ds.phase === 'concurrent') {
        html += 'Need ' + coreLeft + ' more core · ' + powerLeft + ' more power';
      } else if (ds.phase === 'coreOnly') {
        html += 'Need ' + coreLeft + ' more core cards';
      } else {
        html += 'Need ' + powerLeft + ' more power cards';
      }
      html += '</div>';

      html += '</div>';
      const draftEl = document.createElement('div');
      draftEl.className = 'modal-overlay';
      draftEl.innerHTML = '<div class="modal-box">' + html + '</div>';
      return draftEl;
    }

    if (state.chaosState && state.chaosState.pendingChaosDifficultySelect) {
      const levels = [
        { level: 0, label: 'No Chaos',    color: '#6b7280', desc: 'Standard game — no chaos cards' },
        { level: 1, label: 'Disrupted',   color: '#10b981', desc: '1 chaos card shuffled in' },
        { level: 2, label: 'Unstable',    color: '#3b82f6', desc: '2 chaos cards shuffled in' },
        { level: 3, label: 'Volatile',    color: '#8b5cf6', desc: '3 chaos cards shuffled in' },
        { level: 4, label: 'Critical',    color: '#f59e0b', desc: '4 chaos cards shuffled in' },
        { level: 5, label: 'Annihilation',color: '#ef4444', desc: '5 chaos cards shuffled in' }
      ];
      let html = '<div style="padding:20px;min-width:320px;text-align:center">';
      html += '<div style="font-family:\'Cinzel\',serif;font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);margin-bottom:8px">Chaos Difficulty</div>';
      html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:20px">Shuffle chaos cards into your deck to increase the challenge. Each chaos card triggers a powerful negative effect when drawn.</div>';
      for (const { level, label, color, desc } of levels) {
        html += '<button onclick="handleChaosDifficultySelect(' + level + ')" ';
        html += 'style="display:block;width:100%;margin-bottom:8px;padding:8px 12px;background:transparent;';
        html += 'border:1px solid ' + color + ';color:' + color + ';border-radius:4px;cursor:pointer;';
        html += 'font-size:12px;text-align:left">';
        html += '<span style="font-weight:600">' + label + '</span>';
        html += '<span style="color:var(--text-muted);margin-left:8px;font-size:11px">' + desc + '</span>';
        html += '</button>';
      }
      html += '</div>';
      const chaosEl = document.createElement('div');
      chaosEl.className = 'modal-overlay';
      chaosEl.innerHTML = '<div class="modal-box">' + html + '</div>';
      return chaosEl;
    }

    if (state.mulliganAvailable) {
      return createModal('No Base Luu in Hand', `
        <p style="margin-bottom:12px;color:var(--text-dim)">Your opening hand contains no base Luu cards.</p>
        <p style="margin-bottom:16px;color:var(--text-muted);font-size:12px">Current hand: ${player.hand.join(', ')}</p>
        <button class="modal-option" onclick="handleMulligan()">🔄 Take Mulligan — redraw ${player.hand.length} cards</button>
        <button class="modal-option" onclick="handleKeepHand()">Keep this hand</button>
      `);
    }

    if (state.pendingDiscard) {
      const options = (state.pendingDiscard.restrictTo || player.hand).map(id => {
        const card = CardRegistry.getCard(id);
        return `<button class="modal-option danger" onclick="handleDiscardCard('${id}')">Discard — ${card ? card.name : id}</button>`;
      }).join('');
      return createModal(state.pendingDiscard.message || `Discard ${state.pendingDiscard.count} card(s)`, options);
    }

    if (state.pendingCardChoice) {
      const options = state.pendingCardChoice.options.map(id => {
        const card = CardRegistry.getCard(id);
        const isEvolved = card && card.cardType === 'LuuEvolved';
        const isBase    = card && card.cardType === 'Luu';
        const typeLabel = isEvolved
          ? `<span style="color:var(--gold);font-size:10px;margin-left:6px">[EVOLVED]</span>`
          : isBase
          ? `<span style="color:var(--accent);font-size:10px;margin-left:6px">[BASE]</span>`
          : '';
        return `<button class="modal-option" onclick="handleCardChoice('${id}')">
          ${card ? card.name : id}${typeLabel}
          ${card && card.cost !== undefined ? `<span style="color:var(--gold);margin-left:8px">${card.cost} LTX</span>` : ''}
        </button>`;
      }).join('');
      return createModal('Choose a Card', options);
    }

    if (state.pendingTargetSelection) {
      const options = state.pendingTargetSelection.options.map(opt =>
        `<button class="modal-option" onclick="handleTargetSelection('${state.pendingTargetSelection.cardId}', ${opt.queuePosition})">[${opt.queuePosition}] ${opt.class} — L${opt.level} · ${opt.hp} HP</button>`
      ).join('');
      const actionCard = CardRegistry.getCard(state.pendingTargetSelection.cardId);
      return createModal(
        `Choose Target for ${actionCard ? actionCard.name : state.pendingTargetSelection.cardId}`,
        options + `<button class="modal-option" style="margin-top:12px;color:var(--text-muted)" onclick="handleCancelTargetSelection()">Cancel</button>`
      );
    }

    if (state.pendingXpDistribution) {
      const options = player.luuQueue.map(luu =>
        `<button class="modal-option gold" onclick="handleBossXpAward(${luu.queuePosition})">+1 XP → [${luu.queuePosition}] ${luu.class} (currently ${luu.xp} XP)</button>`
      ).join('');
      return createModal(
        state.pendingXpDistribution.isBoss
          ? `Boss Defeated — Distribute ${state.pendingXpDistribution.amount} XP`
          : `Enemy Defeated — Distribute ${state.pendingXpDistribution.amount} XP`,
        `<p style="color:var(--text-muted);margin-bottom:12px;font-size:13px">Click a Luu to award 1 XP. ${state.pendingXpDistribution.amount} remaining.</p>${options}`
      );
    }

    if (state.pendingQueueRearrange) {
      const options = [...player.luuQueue]
        .sort((a, b) => a.queuePosition - b.queuePosition)
        .map(luu => `
          <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
            <span style="color:var(--text);min-width:140px">[${luu.queuePosition}] ${luu.class}</span>
            ${luu.queuePosition > 1 ? `<button class="modal-option" style="padding:4px 10px;margin:0;width:auto" onclick="handleQueueMove(${luu.queuePosition}, ${luu.queuePosition - 1})">↑</button>` : '<span style="width:44px"></span>'}
            ${luu.queuePosition < player.luuQueue.length ? `<button class="modal-option" style="padding:4px 10px;margin:0;width:auto" onclick="handleQueueMove(${luu.queuePosition}, ${luu.queuePosition + 1})">↓</button>` : '<span style="width:44px"></span>'}
          </div>`).join('');
      return createModal(
        'Formation Override — Rearrange Queue',
        options + `<button class="modal-option gold" style="margin-top:16px" onclick="handleConfirmRearrange()">✅ Confirm Formation</button>`
      );
    }

    if (state.position.phase === 'choosingLuu') {
      const options = player.luuQueue
        .filter(l => !l.actedThisTurn)
        .map(luu =>
          `<button class="modal-option" onclick="handleChooseLuu(${luu.queuePosition})">[${luu.queuePosition}] ${luu.class} — L${luu.level} · ${luu.currentHp}/${luu.maxHp} HP</button>`
        ).join('');
      return createModal('Override Active — Choose Which Luu Acts Next', options);
    }

    // Pending conversion (Purification)
    if (state.pendingConversion) {
      const options = state.pendingConversion.enemies.map(e => {
        const hasInPool = state.undraftedLuuPool.cards.some(id => {
          const card = CardRegistry.getLuuCard(id);
          return card && card.class === e.class;
        });
        return `<button class="modal-option ${hasInPool ? '' : 'danger'}"
          onclick="${hasInPool ? `handlePurification('${e.instanceId}')` : ''}"
          ${hasInPool ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"'}>
          ${e.class} T${e.tier}
          ${hasInPool ? '✅ Reserve available' : '❌ No reserve available'}
        </button>`;
      }).join('');
      return createModal(
        'Purification — Choose a Rogue to Convert',
        `<p style="color:var(--text-muted);margin-bottom:12px;font-size:13px">
          Select a Rogue to remove. A base Luu of the same class will join your queue from the reserve pool.
        </p>${options}
        <button class="modal-option" style="margin-top:12px;color:var(--text-muted)"
          onclick="GS.pendingConversion=null;UI.render(GS)">Cancel</button>`
      );
    }

    // Pending damage redistribution (Lagluu trait)
    if (state.pendingDamageRedistribution) {
      const pending = state.pendingDamageRedistribution;
      const leadLuu = player.luuQueue.find(l => l.queuePosition === pending.leadLuuPosition);
      const lagluu  = player.luuQueue.find(l => l.queuePosition === pending.sourceLagluuPosition);
      const totalDistributed = Object.values(pending.distribution).reduce((s, v) => s + v, 0);
      const remaining = pending.availableCounters - totalDistributed;

      const targetRows = player.luuQueue
        .filter(l => l.queuePosition !== pending.leadLuuPosition)
        .map(l => {
          const allocated = pending.distribution[l.queuePosition] || 0;
          const newCurrentHp = l.currentHp - allocated;
          const newDamageCounters = l.damageCounters + allocated;
          const wouldDie = newCurrentHp <= 0;
          return `
            <div style="display:flex;align-items:center;gap:8px;margin:6px 0;padding:6px;background:var(--surface2);border-radius:4px">
              <span style="color:var(--text);min-width:130px;font-size:13px">[${l.queuePosition}] ${l.class}</span>
              <span style="color:var(--text-dim);font-size:12px;min-width:90px">${l.currentHp}/${l.maxHp} HP</span>
              <button onclick="handleAdjustDamageRedistribution(${l.queuePosition}, -1)" ${allocated <= 0 ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''} style="padding:2px 8px;width:auto">−</button>
              <span style="color:var(--gold);min-width:24px;text-align:center;font-family:'Cinzel',serif">+${allocated}</span>
              <button onclick="handleAdjustDamageRedistribution(${l.queuePosition}, 1)" ${remaining <= 0 || wouldDie ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''} style="padding:2px 8px;width:auto">+</button>
              <span style="color:${wouldDie ? 'var(--danger)' : 'var(--text-muted)'};font-size:11px;margin-left:auto">→ ${newCurrentHp}/${l.maxHp}</span>
            </div>`;
        }).join('');

      const leadNewHp = leadLuu.currentHp + totalDistributed;
      return createModal(
        `Damage Redistribution — ${lagluu.class} L${lagluu.level}`,
        `<p style="color:var(--text-muted);margin-bottom:8px;font-size:13px">
          Move damage counters from lead Luu to others. Sector ${state.position.sectorNumber} max: ${pending.maxPerSector}.
        </p>
        <div style="padding:8px;background:var(--surface2);border-radius:4px;margin-bottom:12px;border-left:3px solid var(--accent)">
          <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--accent);margin-bottom:4px">LEAD: [${leadLuu.queuePosition}] ${leadLuu.class}</div>
          <div style="font-size:12px;color:var(--text-dim)">${leadLuu.currentHp}/${leadLuu.maxHp} HP → <span style="color:var(--win)">${leadNewHp}/${leadLuu.maxHp} HP</span> (removing ${totalDistributed})</div>
        </div>
        <div style="font-family:'Cinzel',serif;font-size:10px;color:var(--text-muted);margin-bottom:6px;letter-spacing:0.1em">DISTRIBUTE TO:</div>
        ${targetRows}
        <div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)">
          Distributed: ${totalDistributed} / ${pending.availableCounters}
        </div>
        <button class="modal-option gold" style="margin-top:10px" onclick="handleConfirmDamageRedistribution()">
          ✅ Confirm Redistribution${totalDistributed === 0 ? ' (no change)' : ''}
        </button>
        <button class="modal-option" style="color:var(--text-muted)" onclick="handleCancelDamageRedistribution()">
          Cancel
        </button>`
      );
    }

    // Pending Shield Spread — redistribute incoming rogue damage
    if (state.pendingShieldSpread) {
      const pending = state.pendingShieldSpread;

      const rows = player.luuQueue.map(luu => {
        const allocated = pending.allocation[luu.queuePosition] || 0;
        const isLead = luu.queuePosition === 1;

        // Check Impervious
        const card = CardRegistry.getCard(luu.cardId);
        const imperviousThreshold = card && card.trait && card.trait.name === 'Impervious'
          ? card.trait.effect.damageThreshold : null;
        const blocked = imperviousThreshold !== null && allocated <= imperviousThreshold && allocated > 0;
        const effectiveDamage = blocked ? 0 : allocated;
        const newHp = Math.max(0, luu.currentHp - effectiveDamage);
        const wouldDie = newHp <= 0;

        const currentTotal = Object.values(pending.allocation).reduce((s,v) => s+v, 0);
        const unallocated = pending.totalDamage - currentTotal;

        const canDecrease = isLead
          ? allocated > pending.minLeadDamage
          : allocated > 0;

        const canIncrease = unallocated > 0 && (isLead || !wouldDie);

        return `
          <div style="display:flex;align-items:center;gap:8px;margin:6px 0;padding:8px;
            background:var(--surface2);border-radius:4px;
            border-left:3px solid ${isLead ? 'var(--accent)' : 'var(--border-light)'}">
            <span style="color:var(--text);min-width:130px;font-size:13px">
              ${isLead ? '⚔️ ' : ''}[${luu.queuePosition}] ${luu.class} L${luu.level}
              ${isLead ? '<span style="font-size:10px;color:var(--text-muted)">(min 1)</span>' : ''}
            </span>
            <span style="color:var(--text-dim);font-size:12px;min-width:80px">${luu.currentHp}/${luu.maxHp} HP</span>
            <button onclick="handleAdjustShieldSpread(${luu.queuePosition}, -1)"
              ${canDecrease ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"'}
              style="padding:2px 8px;width:auto">−</button>
            <span style="color:var(--danger);min-width:28px;text-align:center;font-family:'Cinzel',serif;font-weight:600">
              ${allocated > 0 ? '-' + allocated : '0'}
            </span>
            <button onclick="handleAdjustShieldSpread(${luu.queuePosition}, 1)"
              ${canIncrease ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"'}
              style="padding:2px 8px;width:auto">+</button>
            <span style="color:${wouldDie ? 'var(--danger)' : blocked ? 'var(--win)' : 'var(--text-muted)'};
              font-size:11px;margin-left:auto;min-width:100px;text-align:right">
              ${blocked
                ? `🛡 Blocked (≤${imperviousThreshold})`
                : wouldDie && !isLead
                  ? '⚠️ Would die'
                  : `→ ${newHp}/${luu.maxHp} HP`}
            </span>
          </div>`;
      }).join('');

      const totalAllocated = Object.values(pending.allocation).reduce((s,v) => s+v, 0);
      const blockedDamage = player.luuQueue.reduce((sum, luu) => {
        const allocated = pending.allocation[luu.queuePosition] || 0;
        const card = CardRegistry.getCard(luu.cardId);
        const threshold = card && card.trait && card.trait.name === 'Impervious'
          ? card.trait.effect.damageThreshold : null;
        return sum + (threshold !== null && allocated <= threshold && allocated > 0 ? allocated : 0);
      }, 0);

      return createModal(
        `Shield Spread — ${pending.totalDamage} Incoming Damage`,
        `<p style="color:var(--text-muted);margin-bottom:12px;font-size:13px">
          Redistribute incoming rogue damage. Lead Luu must take at least 1.
          Kjeluu Impervious absorbs allocated damage at or below its threshold.
        </p>
        ${rows}
        <div style="margin-top:12px;padding:8px;background:var(--surface2);border-radius:4px;font-size:12px;color:var(--text-muted)">
          Total: ${pending.totalDamage} incoming
          ${totalAllocated < pending.totalDamage
            ? `· <span style="color:var(--gold)">⚠️ ${pending.totalDamage - totalAllocated} unallocated — must distribute all damage</span>`
            : ''}
          ${blockedDamage > 0 ? `· <span style="color:var(--win)">🛡 ${blockedDamage} absorbed by Impervious</span>` : ''}
          · <span style="color:var(--danger)">${pending.totalDamage - blockedDamage} effective damage</span>
        </div>
        <button class="modal-option gold" style="margin-top:12px"
          onclick="handleConfirmShieldSpread()"
          ${totalAllocated < pending.totalDamage ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>
          ✅ Confirm Distribution
          ${totalAllocated < pending.totalDamage ? `(${pending.totalDamage - totalAllocated} unallocated)` : ''}
        </button>
        <button class="modal-option" style="color:var(--text-muted)" onclick="handleSkipShieldSpread()">
          Skip — all damage hits lead Luu
        </button>`
      );
    }

    // Emergency Mend — immediate damage reallocation
    if (state.pendingDamageReallocate) {
      const pending        = state.pendingDamageReallocate;
      const totalAllocated = Object.values(pending.allocation).reduce((s, v) => s + v, 0);
      const unallocated    = pending.totalDamage - totalAllocated;

      const rows = player.luuQueue.map(luu => {
        const allocated  = pending.allocation[luu.queuePosition] || 0;
        const imperviousThreshold = (() => {
          const c = CardRegistry.getCard(luu.cardId);
          return c && c.trait && c.trait.name === 'Impervious' ? c.trait.effect.damageThreshold : null;
        })();
        const blocked        = imperviousThreshold !== null && allocated <= imperviousThreshold && allocated > 0;
        const effectiveCounters = blocked ? 0 : allocated;
        const newHp          = Math.max(0, luu.maxHp - effectiveCounters);
        const currentTotal   = Object.values(pending.allocation).reduce((s, v) => s + v, 0);
        const canIncrease    = (pending.totalDamage - currentTotal) > 0;
        const canDecrease    = allocated > 0;

        return `
          <div style="display:flex;align-items:center;gap:8px;margin:6px 0;padding:8px;
            background:var(--surface2);border-radius:4px;">
            <span style="color:var(--text);min-width:130px;font-size:13px">
              [${luu.queuePosition}] ${luu.class} L${luu.level}
            </span>
            <span style="color:var(--text-dim);font-size:12px;min-width:80px">
              ${luu.currentHp}/${luu.maxHp} HP
            </span>
            <button onclick="handleAdjustDamageReallocate(${luu.queuePosition}, -1)"
              ${canDecrease ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"'}
              style="padding:2px 8px;width:auto">−</button>
            <span style="color:var(--danger);min-width:28px;text-align:center;
              font-family:'Cinzel',serif;font-weight:600">
              ${allocated > 0 ? allocated : '0'}
            </span>
            <button onclick="handleAdjustDamageReallocate(${luu.queuePosition}, 1)"
              ${canIncrease ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"'}
              style="padding:2px 8px;width:auto">+</button>
            <span style="color:${blocked ? 'var(--win)' : 'var(--text-muted)'};
              font-size:11px;margin-left:auto;min-width:100px;text-align:right">
              ${blocked
                ? `🛡 Blocked (≤${imperviousThreshold})`
                : `→ ${newHp}/${luu.maxHp} HP`}
            </span>
          </div>`;
      }).join('');

      return createModal(
        `Emergency Mend — Reallocate ${pending.totalDamage} Damage`,
        `<p style="color:var(--text-muted);margin-bottom:12px;font-size:13px">
          Redistribute existing damage counters freely among all Luu.
          Total must remain ${pending.totalDamage}. Kjeluu Impervious absorbs allocated damage at or below its threshold.
        </p>
        ${rows}
        <div style="margin-top:12px;padding:8px;background:var(--surface2);
          border-radius:4px;font-size:12px;color:var(--text-muted)">
          Allocated: ${totalAllocated} / ${pending.totalDamage}
          ${unallocated !== 0
            ? `· <span style="color:var(--gold)">⚠️ ${Math.abs(unallocated)} ${unallocated > 0 ? 'unallocated' : 'over-allocated'} — must distribute all damage</span>`
            : ''}
        </div>
        <button class="modal-option gold" style="margin-top:12px"
          onclick="handleConfirmDamageReallocate()"
          ${unallocated !== 0 ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>
          ✅ Confirm Reallocation
        </button>
        <button class="modal-option" style="color:var(--text-muted)"
          onclick="handleCancelDamageReallocate()">
          Cancel
        </button>`
      );
    }

    // Boss choice — player picks next sector boss
    if (state.bosses.pendingBossChoice) {
      const choice     = state.bosses.pendingBossChoice;
      const sector     = state.position.sectorNumber;
      const sectorIdx  = sector - 1;
      const isS4Choice = sector === 4;

      const bossOption = (bossCardId) => {
        const boss = CardRegistry.getBossCard(bossCardId);
        if (!boss) return '';
        const hp  = boss.hpBySector[sectorIdx];
        const atk = boss.attackBySector[sectorIdx];
        return `
          <div style="flex:1;background:var(--surface2);border:1px solid var(--gold-dim);
            border-radius:6px;padding:16px;display:flex;flex-direction:column;gap:8px">
            <div style="font-family:'Cinzel',serif;font-size:14px;font-weight:600;
              color:var(--gold);letter-spacing:0.1em">${boss.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${boss.class} class</div>
            <div style="display:flex;gap:12px;font-size:12px;color:var(--text-dim);margin-top:4px">
              <span>❤️ ${hp} HP</span>
              <span>⚔️ ${atk} ATK</span>
            </div>
            <div style="margin-top:6px;padding-top:8px;border-top:1px solid var(--border)">
              <div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:0.15em;
                text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Passive</div>
              <div style="font-size:12px;color:var(--text);font-weight:600">${boss.passive.name}</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:3px;line-height:1.4">
                ${boss.passive.description || boss.passive.trigger || ''}
              </div>
            </div>
            <button class="modal-option gold" style="margin-top:8px"
              onclick="handleBossChoice('${bossCardId}')">
              ⚔️ Face this boss
            </button>
          </div>`;
      };

      return createModal(
        `Sector ${sector} — Choose Your Next Boss`,
        `<p style="color:var(--text-muted);margin-bottom:16px;font-size:13px">
          Choose which boss you will face in Sector ${sector}.
          ${isS4Choice
            ? `<span style="color:var(--gold)">The unchosen boss will automatically become your Sector 5 opponent.</span>`
            : `The unchosen boss will appear as an option next sector.`}
        </p>
        <div style="display:flex;gap:12px;align-items:stretch">
          ${bossOption(choice.option1)}
          <div style="display:flex;align-items:center;font-family:'Cinzel',serif;
            font-size:11px;color:var(--text-muted);flex-shrink:0">VS</div>
          ${bossOption(choice.option2)}
        </div>
        ${isS4Choice ? `
          <div style="margin-top:14px;padding:10px;background:var(--surface2);
            border-radius:4px;border-left:3px solid var(--gold);font-size:12px;
            color:var(--text-muted)">
            ⚠️ Your choice here also determines your final Sector 5 boss.
          </div>` : ''}`
      );
    }

    if (state.pendingSplitStrike) {
      const ps         = state.pendingSplitStrike;
      const allocation = ps.allocation;
      const allocated  = Object.values(allocation).reduce((s, v) => s + v, 0);
      const remaining  = ps.totalPool - allocated;
      const isValid    = remaining === 0;

      const enemyRows = state.activeEnemies.map(enemy => {
        const currentAlloc = allocation[enemy.instanceId] || 0;
        return `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;
            border-bottom:1px solid var(--border);">
            <span style="font-family:'Cinzel',serif;font-size:11px;color:var(--text);
              flex:1;letter-spacing:0.06em;">
              ${enemy.class} T${enemy.tier} — ${enemy.currentHp}/${enemy.maxHp} HP
            </span>
            <button onclick="handleSplitStrikeAllocate('${enemy.instanceId}', ${Math.max(0, currentAlloc - 1)})"
              style="padding:2px 8px;font-size:14px;background:var(--surface2);
              border:1px solid var(--border);color:var(--text);border-radius:3px;cursor:pointer;">−</button>
            <span style="font-family:'Cinzel',serif;font-size:13px;color:var(--accent);
              min-width:24px;text-align:center;">${currentAlloc}</span>
            <button onclick="handleSplitStrikeAllocate('${enemy.instanceId}', ${currentAlloc + 1})"
              style="padding:2px 8px;font-size:14px;background:var(--surface2);
              border:1px solid var(--border);color:var(--text);border-radius:3px;cursor:pointer;">+</button>
          </div>`;
      }).join('');

      return createModal('Split Strike', `
        <div style="padding:0 0 8px 0">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">
            Rolled: ${ps.diceLabel} · Base: ${ps.baseAttack} · Pool: ${ps.totalPool}
          </div>
          <div style="font-size:12px;color:${remaining === 0 ? 'var(--accent)' : remaining < 0 ? 'var(--danger)' : 'var(--gold)'};
            margin-bottom:12px;font-family:'Cinzel',serif;">
            ${remaining > 0 ? `${remaining} remaining` : remaining < 0 ? `${Math.abs(remaining)} over limit` : '✓ Fully allocated'}
          </div>
          ${enemyRows}
          <div style="display:flex;gap:8px;margin-top:12px">
            <button onclick="handleSplitStrikeConfirm()"
              ${!isValid ? 'disabled' : ''}
              style="flex:1;padding:8px;font-family:'Cinzel',serif;font-size:11px;
              letter-spacing:0.08em;text-transform:uppercase;
              background:${isValid ? 'var(--accent)' : 'var(--surface2)'};
              border:1px solid ${isValid ? 'var(--accent)' : 'var(--border)'};
              color:${isValid ? 'var(--bg)' : 'var(--text-muted)'};
              border-radius:4px;cursor:${isValid ? 'pointer' : 'not-allowed'};">
              Confirm
            </button>
            <button onclick="handleSplitStrikeCancel()"
              style="padding:8px 16px;font-family:'Cinzel',serif;font-size:11px;
              background:var(--surface);border:1px solid var(--border);
              color:var(--text-muted);border-radius:4px;cursor:pointer;">
              Cancel
            </button>
          </div>
        </div>`);
    }

    if (state.pendingTurnOrderSelection) {
      const player   = state.players[state.position.currentPlayerIndex];
      const selected = state.pendingTurnOrderSelection.selectedOrder;
      const alive    = player.luuQueue.filter(l => l.currentHp > 0);
      const allDone  = selected.length === alive.length;

      let html = '<div style="padding:16px;min-width:260px">';
      html += '<div style="font-family:\'Cinzel\',serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:4px">Tactical Command</div>';
      html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Click Luu in the order they should act this round</div>';

      for (const luu of alive) {
        const selPos     = selected.indexOf(luu.cardId);
        const isSelected = selPos !== -1;
        const label      = (isSelected ? '[' + (selPos + 1) + '] ' : '') + luu.class + (luu.evolved ? ' Evo' : '') + ' L' + luu.level + ' (' + luu.currentHp + '/' + luu.maxHp + ' HP)';

        if (!isSelected) {
          html += '<button onclick="handleTurnOrderSelect(\'' + luu.cardId + '\')" style="display:block;width:100%;margin:3px 0;padding:7px 10px;font-family:\'Cinzel\',serif;font-size:11px;background:var(--surface2);border:1px solid var(--accent2);color:var(--text);border-radius:3px;cursor:pointer;text-align:left;">' + label + '</button>';
        } else {
          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;margin:3px 0;background:var(--surface);border:1px solid var(--accent);border-radius:3px;">';
          html += '<span style="font-family:\'Cinzel\',serif;font-size:11px;color:var(--accent);">' + label + '</span>';
          html += '<button onclick="handleTurnOrderDeselect(\'' + luu.cardId + '\')" style="padding:2px 6px;font-size:11px;background:transparent;border:none;color:var(--text-muted);cursor:pointer;">x</button>';
          html += '</div>';
        }
      }

      html += '<div style="display:flex;gap:8px;margin-top:10px;">';
      if (allDone) {
        html += '<button onclick="handleTurnOrderConfirm()" style="flex:1;padding:7px;font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;background:var(--accent);border:1px solid var(--accent);color:var(--bg);border-radius:4px;cursor:pointer;">Confirm Order</button>';
      } else {
        html += '<div style="flex:1;padding:7px;font-size:11px;color:var(--text-muted);text-align:center;">' + selected.length + '/' + alive.length + ' selected</div>';
      }
      html += '<button onclick="handleTurnOrderReset()" style="padding:7px 12px;font-family:\'Cinzel\',serif;font-size:11px;background:var(--surface);border:1px solid var(--border);color:var(--text-muted);border-radius:4px;cursor:pointer;">Reset</button>';
      html += '</div>';
      html += '</div>';

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = '<div class="modal-box">' + html + '</div>';
      return overlay;
    }

    if (state.pendingRebirth) {
      const options = state.pendingRebirth.options;

      if (options.length === 0) {
        return createModal('Rebirth', `
          <div style="font-size:12px;color:var(--text-muted)">
            No knocked-out Luu available.
          </div>
          <button class="modal-option" onclick="GS.pendingRebirth=null;UI.render(GS)"
            style="margin-top:12px;color:var(--text-muted)">
            Cancel
          </button>`);
      }

      const buttons = options.map(entry => {
        const evolvedLabel = entry.evolved ? ' — Evolved' : '';
        const luuCard      = typeof CardRegistry !== 'undefined'
          ? CardRegistry.getLuuCard(entry.cardId) : null;
        const healthIndex  = entry.evolved ? entry.level - 3 : entry.level - 1;
        const fullHp       = luuCard?.stats.health[healthIndex] || '?';
        return `
          <button class="modal-option" onclick="handleRebirthSelect('${entry.cardId}')">
            ${entry.class}${evolvedLabel} — Level ${entry.level}
            <span style="color:var(--accent);margin-left:8px">↩ ${fullHp} HP</span>
          </button>`;
      }).join('');

      return createModal('Rebirth', `
        <p style="color:var(--text-muted);margin-bottom:12px;font-size:13px">
          Choose a Luu to resurrect. Rejoins queue at back at saved level — full HP, XP reset to 0.
        </p>
        ${buttons}
        <button class="modal-option" style="margin-top:8px;color:var(--text-muted)"
          onclick="GS.pendingRebirth=null;UI.render(GS)">
          Cancel
        </button>`);
    }

    if (state.pendingSpeciesWard) {
      const classes = ['Rasluu', 'Lagluu', 'Kjeluu', 'Gifluu', 'Bisluu'];
      const buttons = classes.map(c => `
        <button onclick="handleSpeciesWardSelect('${c}')"
          style="display:block;width:100%;margin:4px 0;padding:8px 12px;
          font-family:'Cinzel',serif;font-size:12px;letter-spacing:0.08em;
          background:var(--surface2);border:1px solid var(--accent2);
          color:var(--text);border-radius:4px;cursor:pointer;text-align:left;">
          ${c}
        </button>`).join('');
      return createModal('Species Ward', `
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">
          Choose a Rogue class — all damage from that class halved for the rest of this sector
        </div>
        ${buttons}`);
    }

    if (state.pendingQueueMove) {
      const player = state.players[state.position.currentPlayerIndex];

      if (state.pendingQueueMove.phase === 'selectLuu') {
        const buttons = player.luuQueue.map(luu => `
          <button onclick="handleQueueMoveSelectLuu('${luu.cardId}', ${luu.queuePosition})"
            style="display:block;width:100%;margin:4px 0;padding:8px 12px;
            font-family:'Cinzel',serif;font-size:12px;letter-spacing:0.08em;
            background:var(--surface2);border:1px solid var(--accent2);
            color:var(--text);border-radius:4px;cursor:pointer;text-align:left;">
            [${luu.queuePosition}] ${luu.class} L${luu.level}${luu.evolved ? ' Evo' : ''}
            — ${luu.currentHp}/${luu.maxHp} HP
          </button>`).join('');

        return createModal('Tactical Shift — Choose Luu to Move', `
          <div style="padding:4px 0">
            ${buttons}
            <button onclick="GS.pendingQueueMove=null;UI.render(GS)"
              style="margin-top:8px;width:100%;padding:6px;font-family:'Cinzel',serif;
              font-size:11px;background:var(--surface);border:1px solid var(--border);
              color:var(--text-muted);border-radius:4px;cursor:pointer;">
              Cancel
            </button>
          </div>`);
      }

      if (state.pendingQueueMove.phase === 'selectTarget') {
        const queueSize = player.luuQueue.length;
        const fromPos   = state.pendingQueueMove.luuPos;
        const posButtons = [];
        for (let pos = 1; pos <= queueSize; pos++) {
          if (pos === fromPos) continue;
          const luuAtPos = player.luuQueue.find(l => l.queuePosition === pos);
          posButtons.push(`
            <button onclick="handleQueueMoveSelectTarget(${pos})"
              style="display:block;width:100%;margin:4px 0;padding:8px 12px;
              font-family:'Cinzel',serif;font-size:12px;letter-spacing:0.08em;
              background:var(--surface2);border:1px solid var(--accent2);
              color:var(--text);border-radius:4px;cursor:pointer;text-align:left;">
              Position ${pos}${luuAtPos ? ` — swap with ${luuAtPos.class} L${luuAtPos.level}` : ''}
            </button>`);
        }

        return createModal('Tactical Shift — Choose Target Position', `
          <div style="padding:4px 0">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">
              Moving: ${state.pendingQueueMove.luuCardId} from position ${fromPos}
            </div>
            ${posButtons.join('')}
            <button onclick="GS.pendingQueueMove=null;UI.render(GS)"
              style="margin-top:8px;width:100%;padding:6px;font-family:'Cinzel',serif;
              font-size:11px;background:var(--surface);border:1px solid var(--border);
              color:var(--text-muted);border-radius:4px;cursor:pointer;">
              Cancel
            </button>
          </div>`);
      }
    }

    return null;
  }

  // ─── core render ───────────────────────────

  function render(state) {
    selectedCardIndex = null;
    activeAction = null;
    _buildDOM(state);

    // Turn indicator for multiplayer
    const indicator = document.getElementById('turnIndicator');
    if (indicator && typeof LuuSession !== 'undefined') {
      const identity = LuuSession.getIdentity();
      if (identity && identity.playerIndex !== undefined && state.config.playerCount > 1) {
        const myTurn = LuuSession.isMyTurn(state);
        indicator.style.display      = 'block';
        indicator.style.background   = myTurn ? 'rgba(79,196,207,0.15)' : 'rgba(207,79,106,0.15)';
        indicator.style.borderBottom = myTurn ? '1px solid rgba(79,196,207,0.4)' : '1px solid rgba(207,79,106,0.4)';
        indicator.style.color        = myTurn ? '#4fc4cf' : '#cf4f6a';
        indicator.textContent        = myTurn ? '✦ Your Turn' : '⏳ Waiting for opponent...';
      } else {
        indicator.style.display = 'none';
      }
    }
  }

  function _buildDOM(state) {
    document.body.innerHTML = '';

    const board      = document.createElement('div');
    board.id         = 'board';
    const leftPanel  = document.createElement('div');
    leftPanel.id     = 'left-panel';
    const rightPanel = document.createElement('div');
    rightPanel.id    = 'right-panel';

    leftPanel.appendChild(_renderEnemyZone(state));
    leftPanel.appendChild(_renderLuuQueue(state));
    leftPanel.appendChild(_renderHand(state));
    const persistentPanel = renderPersistentActions(state);
    if (persistentPanel) leftPanel.appendChild(persistentPanel);
    rightPanel.appendChild(_renderHeaderSection(state));
    rightPanel.appendChild(_renderCombatLog(state));

    if (state.gameStatus.status === 'won') {
      leftPanel.appendChild(_renderWinOverlay(state));
    } else if (state.gameStatus.status === 'lost') {
      leftPanel.appendChild(_renderLoseOverlay(state));
    }

    board.appendChild(leftPanel);
    board.appendChild(rightPanel);
    document.body.appendChild(board);

    const modal = renderModal(state);
    if (modal) document.body.appendChild(modal);

    if (!document.getElementById('luu-tooltip')) {
      const tip = document.createElement('div');
      tip.id = 'luu-tooltip';
      tip.className = 'tooltip';
      document.body.appendChild(tip);
    }

    // Recreate turn indicator (body was wiped above)
    const indicator = document.createElement('div');
    indicator.id = 'turnIndicator';
    indicator.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; z-index:999; padding:8px 16px; text-align:center; font-family:Cinzel,serif; font-size:12px; letter-spacing:0.2em; text-transform:uppercase;';
    document.body.appendChild(indicator);
  }

  // ─── Enemy Zone ────────────────────────────

  function _renderEnemyZone(state) {
    const zone = document.createElement('div');
    zone.className = 'zone';
    zone.id = 'enemy-zone';

    let inner = `<div class="zone-label">ENEMY ZONE — Wave ${state.position.waveNumber}</div><div class="card-row">`;

    if (state.activeEnemies.length === 0) {
      inner += `<span style="font-size:13px;color:var(--text-muted);align-self:center">No enemies this wave</span>`;
    } else {
      for (const e of state.activeEnemies) {
        const color     = clsColor(e.class);
        const tierLabel = e.isBoss ? 'BOSS' : `T${e.tier}`;
        inner += `
          <div class="enemy-card ${e.isBoss ? 'is-boss' : ''} ${e.hitThisRound ? 'hit-this-round' : ''}"
            onmouseenter="UI.showTooltipForEnemy('${e.instanceId}')"
            onmousemove="UI.moveTooltip(event)"
            onmouseleave="UI.hideTooltip()">
            <div style="margin-bottom:4px">
              <span style="font-family:'Cinzel',serif;font-size:11px;font-weight:600;color:${color}">${e.class}</span>
              <span class="badge ${e.isBoss ? 'boss-badge' : ''}" style="margin-left:3px">${tierLabel}</span>
              ${e.sectorBonusActive ? '<span style="color:var(--gold);font-size:10px"> ⚡</span>' : ''}
            </div>
            ${hpBar(e.currentHp, e.maxHp, color)}
            <span style="font-size:10px;color:var(--text-dim)">${e.currentHp}/${e.maxHp} HP</span>
          </div>`;
      }
    }

    inner += '</div>';
    zone.innerHTML = inner;
    return zone;
  }

  // ─── Luu Queue ─────────────────────────────

  function _renderLuuQueue(state) {
    const zone = document.createElement('div');
    zone.className = 'zone';
    zone.id = 'luu-queue';

    const player     = state.players[0];
    const activeLuuPos = state.position.activeLuuPos;
    let inner = '<div class="zone-label">YOUR LUU</div>';

    inner += '<div class="card-row">';

    for (const luu of player.luuQueue) {
      const isActive = luu.queuePosition === activeLuuPos;
      const hasActed = luu.actedThisTurn;
      const color    = clsColor(luu.class);
      const drained  = state.bosses.activeBoss && state.bosses.activeBoss.synapticDrainTarget === luu.queuePosition;

      let actionHTML = '';
      if (isActive && !hasActed) {
        if (activeAction === 'attack') {
          const enemyBtns = state.activeEnemies.map(e =>
            `<button onclick="handleAttack('${e.instanceId}')">→ ${e.class} T${e.tier}</button>`
          ).join('');
          actionHTML = `<div class="action-btns">${enemyBtns}</div>`;
        } else if (activeAction === 'move') {
          const moveBtns = [];
          if (luu.queuePosition > 1)
            moveBtns.push(`<button onclick="handleMove(${luu.queuePosition - 1})">← pos ${luu.queuePosition - 1}</button>`);
          if (luu.queuePosition < player.luuQueue.length)
            moveBtns.push(`<button onclick="handleMove(${luu.queuePosition + 1})">→ pos ${luu.queuePosition + 1}</button>`);
          actionHTML = `<div class="action-btns">${moveBtns.join('')}</div>`;
        } else {
          actionHTML = `
            <div class="action-btns">
              <button onclick="UI.selectAction('attack')">Attack</button>
              <button onclick="handleDefend()">Defend</button>
              <button onclick="handleGather()">Gather</button>
              <button onclick="UI.selectAction('move')">Move</button>
            </div>`;
        }
      } else if (isActive && hasActed) {
        actionHTML = `<div style="font-size:9px;color:var(--text-muted);margin-top:4px;font-family:'Cinzel',serif;letter-spacing:0.06em">TURN COMPLETE</div>`;
      }

      inner += `
        <div class="luu-card ${isActive ? 'is-active' : ''} ${hasActed ? 'has-acted' : ''}"
          onmouseenter="UI.showTooltipForLuu(${luu.queuePosition})"
          onmousemove="UI.moveTooltip(event)"
          onmouseleave="UI.hideTooltip()">
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
            <span style="font-family:'Cinzel',serif;font-size:11px;font-weight:600;color:${color}">${luu.class}</span>
            <span class="badge">L${luu.level}</span>
            ${luu.evolved ? '<span class="badge evolved-badge">Evo</span>' : ''}
            ${isActive ? '<span style="color:var(--accent);font-size:9px;margin-left:auto;font-family:\'Cinzel\',serif">●</span>' : ''}
          </div>
          ${hpBar(luu.currentHp, luu.maxHp, color)}
          <span style="font-size:10px;color:var(--text-dim)">${luu.currentHp}/${luu.maxHp} HP</span>
          ${xpDots(luu.xp)}
          <span style="font-size:10px;color:var(--text-muted)">${luu.xp} XP</span>
          ${gatherDots(luu.gatherTrack || 1)}
          <span style="font-size:10px;color:var(--accent)">🌀 ${luu.gatherTrack || 1}</span>
          ${luu.defendStatus ? '<div style="font-size:10px;color:var(--win);margin-top:2px">🛡 DEFENDING</div>' : ''}
          ${drained ? '<div style="font-size:10px;color:var(--accent);margin-top:2px">🌀 -1 ATK (Drain)</div>' : ''}
          ${actionHTML}
        </div>`;
    }

    inner += '</div>';
    zone.innerHTML = inner;
    return zone;
  }

  // ─── Hand ──────────────────────────────────

  function _renderHand(state) {
    const zone = document.createElement('div');
    zone.className = 'zone';
    zone.id = 'hand-zone';

    const player = state.players[0];

    let inner = `
      <div class="zone-label" style="display:flex;justify-content:space-between;align-items:center">
        <span>HAND — ${player.hand.length} cards</span>
        <span style="font-family:'Cinzel',serif;font-size:12px;color:var(--accent);font-weight:600">🌀 ${player.luutex.current} Luutex</span>
      </div>
      <div class="card-row" id="hand-section">`;

    for (let i = 0; i < player.hand.length; i++) {
      const id         = player.hand[i];
      const card       = CardRegistry.getCard(id);
      const cardType   = card ? card.cardType : 'unknown';
      const cardTypeLabel = cardType === 'Luu' ? 'LUU BASE'
        : cardType === 'LuuEvolved' ? 'LUU EVOLVED'
        : cardType === 'ActionCard' ? 'ACTION'
        : cardType;
      const cost       = card ? card.cost : '?';
      const isSelected = i === selectedCardIndex;
      const color      = card && card.class ? clsColor(card.class) : 'var(--text)';
      const desc       = card && card.description ? card.description : '';

      let typeLabel = 'ACTION';
      let typeCls   = '';
      if (cardType === 'Luu')         { typeLabel = 'LUU';     typeCls = 'luu-badge'; }
      else if (cardType === 'LuuEvolved') { typeLabel = 'EVOLVED'; typeCls = 'evolved-badge'; }

      let playSection = '';
      if (isSelected) {
        if (cardType === 'Luu') {
          playSection = `
            <button onclick="handlePlayCard('${id}', null)" style="width:100%;margin-top:2px">✅ Confirm</button>
            <button onclick="UI.cancelCard()" style="width:100%;margin-top:2px">Cancel</button>`;
        } else if (cardType === 'LuuEvolved') {
          playSection = player.luuQueue.map(l =>
            `<button onclick="handlePlayCard('${id}', ${l.queuePosition})" style="width:100%;margin-top:2px">→ ${l.class} p${l.queuePosition}</button>`
          ).join('') + `<button onclick="UI.cancelCard()" style="width:100%;margin-top:2px">Cancel</button>`;
        } else {
          playSection = `
            <button onclick="handlePlayCard('${id}', null)" style="width:100%;margin-top:2px">✅ Play</button>
            <button onclick="UI.cancelCard()" style="width:100%;margin-top:2px">Cancel</button>`;
        }
      } else {
        playSection = `<button onclick="UI.selectCard(${i})" style="width:100%;margin-top:auto">${cost} LTX</button>`;
      }

      inner += `
        <div class="hand-card ${isSelected ? 'is-selected' : ''}"
          onmouseenter="UI.showTooltipForCard('${id}')"
          onmousemove="UI.moveTooltip(event)"
          onmouseleave="UI.hideTooltip()">
          <span class="badge ${typeCls}">${cardTypeLabel}</span>
          <span class="card-name" style="color:${color}">${id.replace(/_/g, ' ')}</span>
          <span class="card-desc">${desc}</span>
          ${playSection}
        </div>`;
    }

    inner += '</div>';
    zone.innerHTML = inner;
    return zone;
  }

  // ─── Right panel: header ───────────────────

  function _renderHeaderSection(state) {
    const el = document.createElement('div');
    el.id = 'header-section';

    const boss    = state.bosses.activeBoss;
    const bossHpPct = boss.maxHp > 0 ? Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100)) : 0;

    let html = `
      <div class="h-title">MISSION LUU</div>
      <div class="h-sub">Sector ${state.position.sectorNumber} · Wave ${state.position.waveNumber} · Round ${state.position.roundNumber}</div>
      <div class="h-phase">${state.position.phase}</div>
      <div class="boss-hp-label">${boss.cardId} — ${boss.currentHp}/${boss.maxHp} HP</div>
      <div class="boss-hp-bar-wrap"><div class="boss-hp-bar-fill" style="width:${bossHpPct}%"></div></div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:5px">Boss pool: ${state.bosses.bossPool.length} remaining</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:3px">Draw: ${state.deck.drawPile.length} · Discard: ${state.deck.discardPile.length} · Removed: ${state.deck.removedCards.length}</div>`;

    if (state.position.phase === 'enemyAttack') {
      html += `<div style="margin-top:10px"><button class="btn-danger" onclick="handleEnemyAttacks()" style="width:100%">⚔ Resolve Enemy Attacks</button></div>`;
    }

    html += `
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:8px;">
        <button onclick="handleSaveGame()" style="
          font-family:'Cinzel',serif;font-size:9px;letter-spacing:0.12em;
          text-transform:uppercase;padding:6px 12px;
          background:var(--surface2);border:1px solid var(--border-light);
          color:var(--text-muted);border-radius:3px;cursor:pointer;
          transition:all 0.12s;flex:1;
        " onmouseover="this.style.borderColor='var(--win)';this.style.color='var(--win)'"
           onmouseout="this.style.borderColor='var(--border-light)';this.style.color='var(--text-muted)'">
          💾 Save
        </button>
        <button onclick="handleLoadGame()" style="
          font-family:'Cinzel',serif;font-size:9px;letter-spacing:0.12em;
          text-transform:uppercase;padding:6px 12px;
          background:var(--surface2);border:1px solid var(--border-light);
          color:var(--text-muted);border-radius:3px;cursor:pointer;
          transition:all 0.12s;flex:1;
        " onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'"
           onmouseout="this.style.borderColor='var(--border-light)';this.style.color='var(--text-muted)'">
          📂 Load
        </button>
      </div>`;

    el.innerHTML = html;
    return el;
  }

  // ─── Combat Log ────────────────────────────

  function _renderCombatLog(state) {
    const el = document.createElement('div');
    el.id = 'combat-log';

    const SHOWN_ACTIONS = new Set([
      'attack','damageToEnemy','damageBlocked','damageToLuu',
      'phaseShiftEvade','toxicRebound','defend','gather','move',
      'enemyAttack','enemyDefeated','xpAwarded','luuKnockedOut',
      'packRecovery','roundStart','roundEnd','waveInitialised','gameLost',
      'levelUp','evolution','cardPlayed','luuPlayed',
      'luutexGained','healing','xpGained','cardDrawn',
      'discardPending','statModified','persistentEffectRegistered',
      'queueRearrangePending','queueMovePending','turnOrderOverride','queueRearranged','cardDiscarded',
      'mulligan',
      'deckSearched','luuRecovered','xpShared','xpBonusTriggered','cardChosen',
      'waveCleared','bossWaveStarted','sectorCleared','gameWon','bossSelected',
      'targetSelected',
      'bossAttack','bossDefeated','synapticDrain','woundedPrey','resilientCore',
      'toxluuAura','toxluuRebound','fortressCoreReduction',
      'effectExpired','damagePrevention',
      'handLimitExceeded','deckReshuffled',
      'bossXpPending','bossXpAwarded',
      'predatoryStrike',
      'typeAdvantage','typeDisadvantage',
      'conversionPending','purificationComplete',
      'persistentEffectActivated',
      'roguePackRecovery',
      'packBond','damageRedistributionStarted','damageRedistributed',
      'xpPending',
      'apexFocusBonus',
      'bisluuAttackBonus',
      'shieldSpreadPending', 'shieldSpreadApplied', 'shieldSpreadSkipped',
      'bossChoicePresented', 'bossChosen', 'bossAutoAssigned',
      'emergencyMendPending', 'emergencyMendApplied',
      'shellShiftNegated',
      'callTheShotUsed',
      'fortressFormSelf', 'fortressFormAdjacent', 'deepBondXp',
      'gatherTrackIncreased',
      'triggeredHeal',
      'tacticalShift',
      'splitStrikeHit',
      'colonyHarvest', 'surgeProtocol', 'neuralCascadeDraw', 'risingTideXp',
      'dampeningWave',
      'overdriveFired', 'speciesWardActive', 'forcedEvolution', 'vitalDrainHeal',
      'tenacityTriggered', 'deathDefianceBoss', 'deathDefianceKill',
      'rebirthComplete',
      'tacticalCommandPrompt', 'tacticalCommandOrder',
      'phaseShiftRebound', 'bondedBoostApplied',
      'draftReveal', 'draftPick', 'draftGauntlet', 'draftComplete',
      'chaosCardDrawn', 'chaosEffect', 'chaosSetup', 'blackoutBlocked'
    ]);

    const ROUND_MARKERS = new Set(['roundStart', 'roundEnd', 'waveInitialised']);
    const WAVE_MARKERS  = new Set(['waveCleared', 'bossWaveStarted', 'sectorCleared', 'gameWon']);

    function formatEntry(entry) {
      const d = entry.detail || {};
      switch (entry.action) {
        case 'attack': {
          const attacker    = d.attackerClass || `pos ${d.attackerPos}`;
          const target      = d.targetClass
            ? `${d.targetClass}${d.targetIsBoss ? ' (Boss)' : ''}`
            : d.targetId;
          const rollDisplay = d.diceLabel || `${d.diceResult}`;
          return d.blocked
            ? `⚔️ ${attacker} → ${target} — ${rollDisplay}, calculated ${d.totalDamage} — BLOCKED`
            : `⚔️ ${attacker} → ${target} — ${rollDisplay}, dealt ${d.actualDamage}`;
        }
        case 'damageToEnemy':  return `💥 ${d.targetId} took ${d.rawDamage} — ${d.hpAfter} HP left`;
        case 'damageBlocked':  return `🛡 ${d.targetId} blocked ${d.totalDamage} damage — ${d.reason || 'Impervious'}${d.blockThreshold ? ` (threshold ≤${d.blockThreshold})` : ''}`;
        case 'damageToLuu':    return `💢 ${d.luuId} took ${d.finalDamage} — ${d.hpAfter} HP left`;
        case 'phaseShiftEvade':return `👻 ${d.luuId} evaded — Phase Shift (rolled ${d.roll})`;
        case 'toxicRebound':   return `☠️ Toxic Rebound — ${d.enemyId} took ${d.reboundDamage}`;
        case 'defend':         return `🛡 ${d.luuId} defending`;
        case 'gather':         return `🌀 ${d.luuId} gathered ${d.luutexGained} LTX${d.bisluuBonus > 0 ? ` (incl. +${d.bisluuBonus} Bonded Boost)` : ''} [track ${d.trackBefore}→${d.trackAfter}] (total: ${d.totalLuutex})`;
        case 'move':           return `↕️ ${d.luuId} moved pos ${d.fromPosition} → ${d.toPosition}`;
        case 'enemyAttack': {
          const enemy  = d.enemyClass ? `${d.enemyClass} T${d.enemyTier}` : d.enemyId;
          const target = d.targetLuuClass || d.targetLuu;
          return `👾 ${enemy} → ${target} — rolled ${d.diceRoll}, dealt ${d.rawAttack}`;
        }
        case 'enemyDefeated':  return `💀 ${d.enemyId} defeated — ${d.xpAwarded} XP`;
        case 'xpAwarded':      return `⭐ ${d.luuId} +${d.xpGained} XP (${d.totalXp} total)`;
        case 'luuKnockedOut':  return `💔 ${d.luuId} knocked out`;
        case 'packRecovery':   return `💚 Pack Recovery — HP restored`;
        case 'roundStart':     return `── Round ${d.round} ──`;
        case 'roundEnd':       return `── Enemy attack phase ──`;
        case 'waveInitialised':return `── Wave ${d.wave} started ──`;
        case 'gameLost':       return `💀 GAME OVER — all Luu defeated`;
        case 'levelUp':        return `⬆️ ${d.luuId} → L${d.newLevel} (+${d.hpIncrease} HP)`;
        case 'evolution':      return `✨ ${d.previousCardId} → ${d.evolvedCardId}`;
        case 'cardPlayed':     return `🃏 Played: ${d.cardId} (${d.cost} LTX)`;
        case 'luuPlayed':      return `🐾 ${d.cardId} joined queue pos ${d.queuePosition}`;
        case 'luutexGained':   return `🌀 +${d.amount} LTX from ${d.source} (${d.total} total)`;
        case 'healing':        return `💚 ${d.luuId} +${d.healAmount} HP (${d.hpAfter})`;
        case 'xpGained':       return `⭐ ${d.luuId} +${d.amount} XP (${d.totalXp})`;
        case 'cardDrawn':      return `🃏 Drew ${d.count ?? 1} card(s)`;
        case 'discardPending': return `🗑 Discard ${d.count} — awaiting choice`;
        case 'statModified':   return `📊 ${d.luuId} ${d.stat} ${d.value > 0 ? '+' : ''}${d.value}`;
        case 'persistentEffectRegistered': return `🔮 Persistent: ${d.cardId}`;
        case 'cardDiscarded':  return `🗑 Discarded: ${d.cardId}`;
        case 'queueRearrangePending': return `↕️ Formation Override — rearrange queue`;
        case 'queueMovePending': return `↕️ Tactical Shift ready`;
        case 'turnOrderOverride': return `🔄 Override active — act in any order`;
        case 'queueRearranged': return `↕️ Queue rearranged`;
        case 'mulligan':       return `🔄 Mulligan — hand redrawn`;
        case 'deckSearched':   return `🔍 Deck searched — found ${d.cardId}`;
        case 'luuRecovered':   return `💚 ${d.cardId} recovered from discard`;
        case 'xpShared':       return `⭐ XP shared: ${d.luuId} +${d.xpAmount} from ${d.cardId}`;
        case 'xpBonusTriggered': return `⭐ XP bonus: ${d.luuId} +${d.bonus} from ${d.cardId}`;
        case 'cardChosen':     return `🔍 Chose ${d.cardId} from ${d.source}`;
        case 'waveCleared':    return `✅ Wave ${d.wave} cleared!`;
        case 'bossWaveStarted':return `💀 Boss wave — ${d.boss}`;
        case 'sectorCleared':  return `🏆 Sector ${d.sector} cleared!`;
        case 'gameWon':        return `🎉 GAME WON!`;
        case 'targetSelected': return `🎯 ${d.cardId} → pos ${d.targetQueuePosition}`;
        case 'bossAttack':     return `👹 ${d.bossId} → ${d.targetLuu} — rolled ${d.diceRoll}, ${d.rawAttack} dmg`;
        case 'bossDefeated':   return `🏆 BOSS DEFEATED — ${d.bossId}!`;
        case 'bossSelected':   return `👹 Sector ${d.sector} boss: ${d.bossId}`;
        case 'synapticDrain':  return `🌀 Symbiotic Drain — ${d.targetLuu} -1 ATK`;
        case 'toxluuAura':     return `👻 Toxic Aura — rolled ${d.roll} ${d.evaded ? '(EVADED)' : ''}`;
        case 'toxluuRebound':  return `☠️ Toxluu rebound — ${d.targetLuu} took ${d.reboundDamage}`;
        case 'fortressCoreReduction': return `🏰 Fortress Core (S${d.sector}) — first hit reduced by ${d.reduction} to ${d.damageAfter} damage`;
        case 'woundedPrey':    return `🩸 Wounded Prey +${d.bonusDamage} damage`;
        case 'resilientCore':  return `💚 Resilient Core — boss +${d.healAmount} HP`;
        case 'effectExpired':  return `🔚 ${d.cardId} expired`;
        case 'damagePrevention': return `🛡 Shell Reflex: ${d.luuId} rolled ${d.roll} — ${d.prevented ? 'PREVENTED' : 'no effect'}`;
        case 'handLimitExceeded': return `⚠️ Hand limit — discard ${d.mustDiscard}`;
        case 'deckReshuffled': return `🔀 Reshuffled — ${d.removedCard} removed`;
        case 'bossXpPending':  return `⭐ Boss XP — ${d.xpAmount} to distribute`;
        case 'bossXpAwarded':    return `⭐ +1 XP awarded — ${d.remaining} remaining`;
        case 'predatoryStrike':   return `🦅 Predatory Strike — +1 damage`;
        case 'typeAdvantage':     return `⚡ Type advantage — ${d.reason}: +1 damage`;
        case 'typeDisadvantage':  return `🔽 Type disadvantage — ${d.reason}: -1 damage`;
        case 'conversionPending':    return `🔮 Purification played — choose a Rogue to convert`;
        case 'purificationComplete': return d.addedToHand
          ? `✨ ${d.enemyClass} Rogue purified — ${d.newLuu} added to hand (queue full)`
          : `✨ ${d.enemyClass} Rogue purified — ${d.newLuu} joined queue at position ${d.queuePosition}`;
        case 'persistentEffectActivated': return `🎲 ${d.cardId} activated — rolled ${d.roll}: ${d.passed ? '✅ Success' : '❌ Failed'}`;
        case 'callTheShotUsed': return `🎯 Call the Shot — ${d.luuClass} called ${d.chosenValue} (S${d.sector} range)`;
        case 'roguePackRecovery': return `💚 Rogue Pack Recovery — ${d.enemyId} healed ${d.healAmount} HP (${d.hpAfter} HP remaining)`;
        case 'packBond':                    return `💚 Pack Bond — ${entry.luuId} +${entry.healAmount} HP (${entry.hpAfter})`;
        case 'damageRedistributionStarted': return `↔️ ${d.lagluuId} starting damage redistribution — ${d.availableCounters} available`;
        case 'damageRedistributed':         return `↔️ ${d.lagluuId} redistributed ${d.totalMoved} damage from lead Luu`;
        case 'xpPending': return `⭐ ${d.xpAmount} XP to distribute from defeated ${d.source}`;
        case 'apexFocusBonus': return `🎯 Apex Focus — +${d.bonus} type advantage bonus`;
        case 'bisluuAttackBonus': return `✨ Bonded Boost — ${d.attackingClass} +${d.bonus} ATK from adjacent Bisluu`;
        case 'shieldSpreadPending':  return `🛡 Shield Spread — ${d.totalDamage} damage incoming, awaiting redistribution`;
        case 'shieldSpreadApplied':  return `🛡 Shield Spread — damage redistributed (total: ${d.totalDamage})`;
        case 'shieldSpreadSkipped':  return `🛡 Shield Spread — skipped, ${d.totalDamage} damage hits lead Luu`;
        case 'bossChoicePresented': return `👹 Choose S${d.sector} boss — ${CardRegistry.getBossCard(d.option1)?.name || d.option1} vs ${CardRegistry.getBossCard(d.option2)?.name || d.option2}`;
        case 'bossChosen':          return `👹 S${d.sector} boss chosen — ${CardRegistry.getBossCard(d.bossId)?.name || d.bossId}`;
        case 'bossAutoAssigned':    return `👹 S${d.sector} boss revealed — ${CardRegistry.getBossCard(d.bossId)?.name || d.bossId} (auto-assigned)`;
        case 'emergencyMendPending':  return `🩹 Emergency Mend — ${d.totalDamage} damage to reallocate`;
        case 'emergencyMendApplied':  return `🩹 Emergency Mend applied — damage reallocated across queue`;
        case 'shellShiftNegated':     return `🔰 Shell Shift — type disadvantage negated for ${d.luuId}`;
        case 'fortressFormSelf':     return `🏰 Fortress Form — ${d.luuId} self-reduction -${d.reduction}`;
        case 'fortressFormAdjacent': return `🏰 Fortress Form — ${d.kjeluuId} protects ${d.protectedLuu} -${d.reduction}`;
        case 'deepBondXp':           return `✨ Deep Bond — ${d.luuId} +${d.xpBonus} XP from adjacent ${d.bisluuId} (${d.totalXp} total)`;
        case 'gatherTrackIncreased': return `🌀 Gather tracks charged — ${d.tracks.map(t => `${t.class}:${t.track}`).join(', ')}`;
        case 'triggeredHeal':        return `💚 ${d.source} — ${d.luuId} recovered ${d.amount} HP (${d.trigger})`;
        case 'tacticalShift':        return `↕️ Tactical Shift — ${d.luuId} moved from position ${d.fromPos} to position ${d.toPos}`;
        case 'splitStrikeHit':       return `⚔️ Split Strike — ${d.attackerClass} → ${d.targetClass}: ${d.allocated} allocated → ${d.afterModifiers} after modifiers`;
        case 'colonyHarvest':     return `🌀 Colony Harvest — ${d.playerId} gained ${d.luutexGained} Luutex, all tracks reset to 1`;
        case 'surgeProtocol':     return `🌀 Surge Protocol — all gather tracks set to ${d.newTrack}`;
        case 'neuralCascadeDraw': return `🃏 Neural Cascade — drew ${d.cardDrawn || 'a card'} after discard`;
        case 'risingTideXp':      return `✨ Rising Tide — ${d.class} +${d.xpAdded} XP (${d.totalXp} total)`;
        case 'dampeningWave':     return `🛡️ Dampening Wave — ${d.luuId}: ${d.before} → ${d.after} damage`;
        case 'overdriveFired':    return `⚡ Overdrive — ${d.luuId}: ${d.baseDamage} → ${d.finalDamage} damage`;
        case 'speciesWardActive': return `🛡️ Species Ward active — ${d.wardedClass} damage halved this sector`;
        case 'forcedEvolution':   return `⬆️ Forced Evolution — ${d.luuId} leveled to ${d.newLevel} (max HP: ${d.newMaxHp})`;
        case 'vitalDrainHeal':    return `💚 Vital Drain — ${d.luuId} healed ${d.healAmount} HP (dealt ${d.damageDealt} this round)`;
        case 'tenacityTriggered': return `💪 Tenacity — ${d.luuId} survived at 1 HP (overflow ${d.overflowBlocked} absorbed)`;
        case 'deathDefianceBoss': return `💀 Death Defiance — ${d.luuId} KO'd, boss takes ${d.damage} damage (${d.bossHpAfter} HP remaining)`;
        case 'deathDefianceKill': return `💀 Death Defiance — ${d.luuId} KO'd, ${d.enemyClass} instantly destroyed`;
        case 'rebirthComplete':       return `✨ Rebirth — ${d.class}${d.evolved ? ' (Evolved)' : ''} L${d.level} resurrected at position ${d.queuePos} (${d.maxHp} HP)`;
        case 'tacticalCommandPrompt': return `⚙️ Tactical Command — choose turn order for round ${d.round}`;
        case 'tacticalCommandOrder':  return `⚙️ Tactical Command — order set: ${d.order.map((id, i) => `${i+1}. ${id}`).join(', ')}`;
        case 'phaseShiftRebound':  return `⚡ Phase Shift Rebound — ${d.rogueClass} deals ${d.damage} damage to ${d.luuId}`;
        case 'bondedBoostApplied': return `🔴 Bonded Boost — Rogue Bisluu gives +${d.bonus} attack to ${d.targetClass} (pos adjacent)`;
        case 'draftReveal':   return '🃏 Draft reveal — ' + d.cards.length + ' cards shown (' + d.phase + ') Core: ' + d.keptCore + '/30 · Power: ' + d.keptPower + '/10';
        case 'draftPick':     return '✅ Draft pick — kept: ' + d.taken.join(', ') + (d.discarded.length ? ' · discarded: ' + d.discarded.join(', ') : '');
        case 'draftGauntlet': return (d.kept ? '✅' : '❌') + ' Gauntlet — ' + d.cardId + (d.kept ? ' kept' : ' discarded') + ' · Power: ' + d.keptPower + '/10';
        case 'draftComplete': return '🎴 Draft complete — ' + d.totalCards + ' cards (' + d.core + ' core + ' + d.power + ' power)';
        case 'chaosSetup':     return '🌀 Chaos difficulty ' + d.difficulty + ' — ' + (d.cards.length ? d.cards.length + ' chaos card(s) shuffled in' : 'no chaos cards');
        case 'chaosCardDrawn': return '🌀 CHAOS: ' + d.name + ' drawn and resolved';
        case 'blackoutBlocked': return '⚫ Blackout — attack blocked (round ' + d.round + ')';
        case 'chaosEffect': {
          const chaosEffectLabels = {
            colony_fracture:          'Colony Fracture — lead Luu ' + (d.survived ? 'survived at 1 HP' : 'knocked out'),
            surge_protocol:           'Surge Protocol — next enemy attack uses max dice',
            rogue_resurgence:         'Rogue Resurgence — ' + d.count + ' rogue(s) restored to full HP',
            corrupted_vanguard:       'Corrupted Vanguard — ' + (d.immediate ? 'vanguard spawned immediately' : 'vanguard queued for boss wave'),
            corrupted_vanguard_spawned: 'Corrupted Vanguard — ' + d.cardId + ' spawned',
            toxic_pulse:              'Toxic Pulse — all Luu take ' + d.damage + ' damage',
            luutex_drain:             'Luutex Drain — all players lose half Luutex',
            queue_collapse:           'Queue Collapse — all queues reversed',
            blackout:                 'Blackout — attacks banned round ' + d.bannedRound,
            signal_jam:               'Signal Jam — card playing banned this wave',
            memory_wipe:              'Memory Wipe — all Luu XP reset to 0'
          };
          return '🌀 ' + (chaosEffectLabels[d.effectId] || d.effectId);
        }
        default:                      return null;
      }
    }

    const entries = state.turnLog
      .filter(e => SHOWN_ACTIONS.has(e.action))
      .slice(-50)
      .reverse();

    let logHTML = '<div class="log-title">COMBAT LOG</div>';
    for (const entry of entries) {
      const text = formatEntry(entry);
      if (!text) continue;
      const cls = ROUND_MARKERS.has(entry.action)
        ? 'log-entry marker'
        : WAVE_MARKERS.has(entry.action)
          ? 'log-entry wave-marker'
          : 'log-entry';
      logHTML += `<div class="${cls}">${text}</div>`;
    }
    if (entries.length === 0) {
      logHTML += '<div class="log-entry" style="color:var(--text-muted)">No combat yet.</div>';
    }

    el.innerHTML = logHTML;
    return el;
  }

  // ─── Persistent Actions ────────────────────

  function renderPersistentActions(state) {
    const player = state.players[0];
    const entries = [];

    // Source 1 — manual triggered persistent effects (e.g. Luutex Pulse)
    for (const effect of state.globalActiveEffects) {
      if (effect.trigger !== 'manual') continue;
      const card = CardRegistry.getCard(effect.cardId);
      const cardEffect = card ? card.effects.find(e => e.trigger === 'manual') : null;
      if (!card || !cardEffect) continue;

      const usesThisRound = effect.usesThisRound || 0;
      const cost          = cardEffect.activationCost ? cardEffect.activationCost.value : 0;
      const canAfford     = player.luutex.current >= cost;
      // Check usesPerWave limit
      const usesPerWave   = cardEffect.usesPerWave || null;
      const waveUsed      = usesPerWave && (effect.usesThisWave || 0) >= usesPerWave;
      const roundUsed     = cardEffect.usesPerRound && usesThisRound >= cardEffect.usesPerRound;
      const isDisabled    = waveUsed || roundUsed;
      const disabledLabel = waveUsed ? 'Used this wave' : roundUsed ? 'Used this round' : null;
      const canUse        = !isDisabled && canAfford;

      const infoStr = usesPerWave
        ? `${(effect.usesThisWave || 0)}/${usesPerWave} this wave${cost > 0 ? ` · ${cost} LTX` : ''}`
        : cardEffect.usesPerRound
          ? `${cardEffect.usesPerRound - usesThisRound}/${cardEffect.usesPerRound} this round${cost > 0 ? ` · ${cost} LTX` : ''}`
          : `${cost > 0 ? `${cost} LTX` : ''}`;

      entries.push({
        label:    card.name,
        info:     infoStr,
        button:   canUse ? '▶ Activate' : (disabledLabel || 'No LTX'),
        onclick:  canUse ? `handleActivatePersistentEffect('${effect.instanceId}')` : null,
        disabled: !canUse
      });
    }

    // Source 2 — Lagluu Damage Redistribution trait (one entry per Lagluu)
    const leadLuu = player.luuQueue.find(l => l.queuePosition === 1);
    const leadHasDamage = leadLuu && leadLuu.damageCounters > 0;
    for (const luu of player.luuQueue) {
      if (luu.class !== 'Lagluu') continue;
      const used = luu.traitUsedThisWave;
      const canUse = !used && leadHasDamage;
      const reason = used ? 'Used this wave' : (!leadHasDamage ? 'No damage to move' : '');
      entries.push({
        label:    `[${luu.queuePosition}] ${luu.class} L${luu.level}${luu.evolved ? ' Evo' : ''} — Damage Redistribution`,
        info:     `Once per wave · S${state.position.sectorNumber} max: ${LAGLUU_TRAIT_MAX_BY_SECTOR[state.position.sectorNumber] || 5}`,
        button:   used ? 'Used' : (canUse ? '▶ Activate' : reason),
        onclick:  canUse ? `handleStartDamageRedistribution(${luu.queuePosition})` : null,
        disabled: !canUse
      });
    }

    // Source 2b — Rasluu Call the Shot trait (one entry per Rasluu)
    const dice       = SECTOR_DICE[state.position.sectorNumber];
    const minVal     = dice.length === 1 ? 1 : 2;
    const maxVal     = dice.reduce((s, d) => s + d, 0);
    const diceRangeLabel = dice.length === 1
      ? `d${dice[0]} (${minVal}–${maxVal})`
      : `d${dice[0]}+d${dice[1]} (${minVal}–${maxVal})`;

    for (const luu of player.luuQueue) {
      if (luu.class !== 'Rasluu') continue;
      const isActiveLuu = luu.queuePosition === state.position.activeLuuPos;
      const used        = luu.traitUsedThisWave;
      const isActive    = state.callTheShotActive?.luuQueuePosition === luu.queuePosition;
      const chosenValue = isActive ? state.callTheShotActive?.chosenValue : null;

      if (used) {
        entries.push({
          label:    `[${luu.queuePosition}] Rasluu L${luu.level}${luu.evolved ? ' Evo' : ''} — Call the Shot`,
          info:     'Used this wave',
          button:   'Used',
          onclick:  null,
          disabled: true
        });
      } else if (isActive && chosenValue !== null) {
        entries.push({
          label:    `[${luu.queuePosition}] Rasluu — 🎯 Called: ${chosenValue}`,
          info:     'Now select attack target',
          button:   '✕ Cancel',
          onclick:  'handleCancelCallTheShot()',
          disabled: false,
          customButton: true
        });
      } else if (isActive && chosenValue === null) {
        const diceButtons = [];
        for (let v = minVal; v <= maxVal; v++) {
          diceButtons.push(`<button onclick="handleSetCallTheShotValue(${v})" style="
            font-family:'Cinzel',serif;font-size:10px;padding:3px 7px;
            background:var(--surface);border:1px solid var(--accent2);
            color:var(--accent);border-radius:3px;cursor:pointer;margin:1px;
          ">${v}</button>`);
        }
        entries.push({
          label:      `[${luu.queuePosition}] Rasluu — Choose roll (${diceRangeLabel}):`,
          info:       '',
          customHTML: `
            <div style="display:flex;align-items:center;gap:8px;padding:5px 0;
              border-bottom:1px solid var(--border);font-size:12px;">
              <span style="font-family:'Cinzel',serif;font-size:10px;letter-spacing:0.08em;
                text-transform:uppercase;color:var(--gold);min-width:200px">
                [${luu.queuePosition}] Rasluu — Choose roll (${diceRangeLabel})
              </span>
              <div style="display:flex;flex-wrap:wrap;gap:2px;flex:1">
                ${diceButtons.join('')}
              </div>
              <button onclick="handleCancelCallTheShot()" style="
                font-family:'Cinzel',serif;font-size:9px;padding:4px 8px;
                background:var(--surface2);border:1px solid var(--border);
                color:var(--text-muted);border-radius:3px;cursor:pointer;
              ">✕</button>
            </div>`
        });
      } else {
        entries.push({
          label:    `[${luu.queuePosition}] Rasluu L${luu.level}${luu.evolved ? ' Evo' : ''} — Call the Shot`,
          info:     `Once per wave · ${diceRangeLabel}`,
          button:   isActiveLuu ? '▶ Activate' : 'Not your turn',
          onclick:  isActiveLuu ? `handleActivateCallTheShot(${luu.queuePosition})` : null,
          disabled: !isActiveLuu
        });
      }
    }

    // Source 3 — passive persistent effects (always-on, no activation needed)
    for (const effect of state.globalActiveEffects) {
      if (effect.trigger === 'manual') continue;
      const card = CardRegistry.getCard(effect.cardId);
      if (!card) continue;
      const attachedLabel = effect.attachedToCardId
        ? ` → ${effect.attachedToCardId.replace('luu_', '').replace('_evolved', '')}`
        : '';
      entries.push({
        label:    `${card.name}${attachedLabel}`,
        info:     `Active · ${effect.discardCondition || 'persistent'}`,
        button:   'ACTIVE',
        onclick:  null,
        disabled: true,
        passive:  true
      });
    }

    if (entries.length === 0) return null;

    const el = document.createElement('div');
    el.style.cssText = `
      padding: 8px 12px;
      border-top: 1px solid var(--border);
      background: var(--surface2);
      max-height: 140px;
      overflow-y: auto;
      flex-shrink: 0;
    `;

    const rowsHTML = entries.map(e => {
      if (e.customHTML) return e.customHTML;
      const buttonColour = e.passive
        ? 'var(--win)'
        : (e.disabled ? 'var(--text-muted)' : 'var(--accent)');
      const borderColour = e.passive
        ? 'var(--win)'
        : (e.disabled ? 'var(--border)' : 'var(--accent2)');
      const bgColour = e.disabled ? 'var(--surface2)' : 'var(--surface)';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;${e.disabled && !e.passive ? 'opacity:0.5;' : ''}">
          <span style="font-family:'Cinzel',serif;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);min-width:200px">${e.label}</span>
          <span style="color:var(--text-muted);font-size:11px;flex:1">${e.info}</span>
          <button ${e.onclick ? `onclick="${e.onclick}"` : 'disabled'}
            style="
              font-family:'Cinzel',serif;font-size:9px;letter-spacing:0.1em;
              text-transform:uppercase;padding:4px 10px;
              background:${bgColour};
              border:1px solid ${borderColour};
              color:${buttonColour};
              border-radius:3px;
              cursor:${e.onclick ? 'pointer' : 'not-allowed'};
            ">${e.button}</button>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:0.15em;
        text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">
        Persistent Actions
      </div>
      ${rowsHTML}
    `;
    return el;
  }

  // ─── Win / Lose overlays ───────────────────

  function _renderWinOverlay(state) {
    const el = document.createElement('div');
    el.id = 'end-overlay';
    el.innerHTML = `
      <div class="end-content">
        <span class="end-emoji">🎉</span>
        <div class="end-title" style="color:var(--win)">VICTORY</div>
        <div class="end-sub">All 5 sectors cleared</div>
        <div class="end-stats">
          Sectors cleared: <strong>${state.history.sectorsCleared}</strong><br>
          Waves cleared: <strong>${state.history.wavesCleared}</strong><br>
          Rogues defeated: <strong>${state.history.totalRoguesDefeated}</strong><br>
          Damage dealt: <strong>${state.history.totalDamageDealt}</strong><br>
          Damage taken: <strong>${state.history.totalDamageTaken}</strong><br>
          Luu lost: <strong>${state.history.luuLost.length > 0 ? state.history.luuLost.join(', ') : 'None'}</strong><br>
          Reshuffles: <strong>${state.deck.reshuffleCount}</strong>
        </div>
        <div class="end-stats">
          ${state.players[0].luuQueue.map(luu =>
            `${luu.class} — L${luu.level} · ${luu.currentHp}/${luu.maxHp} HP · ${luu.xp} XP${luu.evolved ? ' · Evolved' : ''}`
          ).join('<br>')}
        </div>
        <button class="btn-large" onclick="handleRestartGame()" style="margin-top:14px;border-color:var(--win);color:var(--win)">🔄 Play Again</button>
      </div>`;
    return el;
  }

  function _renderLoseOverlay(state) {
    const el = document.createElement('div');
    el.id = 'end-overlay';
    el.innerHTML = `
      <div class="end-content">
        <span class="end-emoji">💀</span>
        <div class="end-title" style="color:var(--danger)">DEFEAT</div>
        <div class="end-sub">Reached Sector ${state.position.sectorNumber}, Wave ${state.position.waveNumber}</div>
        <div class="end-stats">
          Sectors cleared: <strong>${state.history.sectorsCleared}</strong><br>
          Waves cleared: <strong>${state.history.wavesCleared}</strong><br>
          Rogues defeated: <strong>${state.history.totalRoguesDefeated}</strong><br>
          Damage dealt: <strong>${state.history.totalDamageDealt}</strong><br>
          Damage taken: <strong>${state.history.totalDamageTaken}</strong><br>
          Luu lost: <strong>${state.history.luuLost.join(', ')}</strong><br>
          Reshuffles: <strong>${state.deck.reshuffleCount}</strong>
        </div>
        <button class="btn-large" onclick="handleRestartGame()" style="margin-top:14px;border-color:var(--danger);color:var(--danger)">🔄 Try Again</button>
      </div>`;
    return el;
  }

  // ─── Public API ────────────────────────────

  return {
    render,
    selectAction(action) {
      const player = GS.players[0];
      const activeLuu = player.luuQueue.find(l => l.queuePosition === GS.position.activeLuuPos);
      if (!activeLuu || activeLuu.actedThisTurn) {
        activeAction = null;
      } else {
        activeAction = action;
      }
      _buildDOM(GS);
    },
    selectCard(index) {
      selectedCardIndex = index;
      _buildDOM(GS);
    },
    cancelCard() {
      selectedCardIndex = null;
      render(GS);
    },
    showTooltipForLuu(queuePosition) {
      const luu = GS.players[0].luuQueue.find(l => l.queuePosition === queuePosition);
      if (luu) showTooltip(buildLuuTooltip(luu, GS), event);
    },
    showTooltipForEnemy(instanceId) {
      const enemy = GS.activeEnemies.find(e => e.instanceId === instanceId);
      if (enemy) showTooltip(buildEnemyTooltip(enemy), event);
    },
    showTooltipForCard(cardId) {
      showTooltip(buildHandCardTooltip(cardId), event);
    },
    moveTooltip(e) {
      positionTooltip(e);
    },
    hideTooltip() {
      hideTooltip();
    },
    resetAction() {
      activeAction = null;
    }
  };

})();
