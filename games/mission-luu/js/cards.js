// cards.js — Card Registry
// Loads card definitions from JSON and provides lookup functions.
// All other files get card data through here — never fetch directly.

const CardRegistry = (() => {
  let luuCards = [];
  let actionCards = [];
  let loaded = false;

  // Boss cards defined inline — no separate JSON file yet
  const BOSS_DEFINITIONS = [
    {
      id: 'boss_tjeluu', cardType: 'Boss', name: 'Tjeluu', class: 'Bisluu',
      hpBySector:     [40, 55, 72, 90, 110],
      attackBySector: [6, 11, 14, 17, 20],
      passive: { name: 'Symbiotic Drain', trigger: 'roundStart',
        effect: { type: 'statDrain', stat: 'attack', value: 1, target: 'highestAttackLuu' } }
    },
    {
      id: 'boss_lynluu', cardType: 'Boss', name: 'Lynluu', class: 'Rasluu',
      hpBySector:     [null, 45, 60, 76, 93],
      attackBySector: [null, 13, 17, 21, 25],
      passive: { name: 'Wounded Prey', trigger: 'onAttack',
        effect: { type: 'conditionalDamageBonus', condition: 'targetHasDamageCounters', bonus: 2 } }
    },
    {
      id: 'boss_forluu', cardType: 'Boss', name: 'Forluu', class: 'Lagluu',
      hpBySector:     [null, 42, 56, 70, 86],
      attackBySector: [null, 9, 12, 15, 18],
      passive: { name: 'Resilient Core', trigger: 'roundEnd',
        effect: { type: 'selfHeal', source: 'leadLuuDamageCounters', maxPerRound: 3 } }
    },
    {
      id: 'boss_fesluu', cardType: 'Boss', name: 'Fesluu', class: 'Kjeluu',
      hpBySector:     [null, 60, 80, 100, 122],
      attackBySector: [null, 7, 9, 12, 14],
      passive: { name: 'Fortress Core', trigger: 'onDamaged',
        effect: { type: 'impervious', threshold: 3, firstHitReduction: 1 } }
    },
    {
      id: 'boss_toxluu', cardType: 'Boss', name: 'Toxluu', class: 'Gifluu',
      hpBySector:     [null, 48, 63, 79, 97],
      attackBySector: [null, 9, 12, 15, 18],
      passive: { name: 'Toxic Aura', trigger: 'onDamaged',
        effect: { type: 'phaseShift', evadeOn: [5, 6], reboundFraction: 0.5 } }
    }
  ];

  async function load() {
    if (loaded) return;
    const [luuRes, actionRes] = await Promise.all([
      fetch('data/luu-cards.json'),
      fetch('data/luu-action-cards.json')
    ]);
    const luuData = await luuRes.json();
    const actionData = await actionRes.json();
    luuCards = luuData.cards;
    actionCards = actionData.cards;
    loaded = true;
    console.log(`[CardRegistry] Loaded: ${luuCards.length} Luu cards, ${actionCards.length} action cards`);
  }

  function getCard(id) {
    return luuCards.find(c => c.id === id)
        || actionCards.find(c => c.id === id)
        || BOSS_DEFINITIONS.find(c => c.id === id)
        || null;
  }

  function getLuuCard(id)    { return luuCards.find(c => c.id === id) || null; }
  function getActionCard(id) { return actionCards.find(c => c.id === id) || null; }
  function getBossCard(id)   { return BOSS_DEFINITIONS.find(c => c.id === id) || null; }
  function getAllActionCards() { return [...actionCards]; }
  function isLoaded() { return loaded; }

  return { load, getCard, getLuuCard, getActionCard, getBossCard, getAllActionCards, isLoaded };
})();