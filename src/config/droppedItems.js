// config/droppedItems.js
import { ItemDatabase } from '../components/inventory/ItemTypes';

// 🔥 ITENS QUE PODEM SER COLETADOS NO CHÃO
export const DROPPED_ITEMS = {
//  default: [
//    { id: 'wooden_sword', position: [1, 13, 1], autoEquip: false },
//    { id: 'fantasy_sword', position: [3, 14, 3], autoEquip: false },
//    { id: 'fantasy_axe', position: [3, 14, 4], autoEquip: false },
//    { id: 'shield_mecanic', position: [2, 13, 2], autoEquip: false },
//    { id: 'wooden_shield', position: [2, 13, 2.1], autoEquip: false },
//    { id: 'leather_chest', position: [3, 13, 1], autoEquip: false },
//    { id: 'iron_helmet', position: [4, 13, 2], autoEquip: false },
//    { id: 'strength_ring', position: [5, 13, 1], autoEquip: false },
//    { id: 'agility_necklace', position: [6, 13, 2], autoEquip: false },
//    { id: 'small_health_potion', position: [1, 13, 3], autoEquip: false },
//    { id: 'golden_coin', position: [3, 13, 3], autoEquip: false },

    // ==========================
    // DEBUG: SWORDS (lado a lado)
    // ==========================
//  { id: '2jade_sword', position: [10, 20, 0], autoEquip: false },
//  { id: 'angel_sword', position: [11.5, 20, 0], autoEquip: false },
//  { id: 'cloud_sword', position: [13, 20, 0], autoEquip: false },
//  { id: 'darknight_sword', position: [14.5, 20, 0], autoEquip: false },
//  { id: 'devil_sword', position: [16, 20, 0], autoEquip: false },
//  { id: 'earth_sword', position: [17.5, 20, 0], autoEquip: false },
//  { id: 'energy_sword', position: [19, 20, 0], autoEquip: false },
//  { id: 'fantasy_sword', position: [20.5, 20, 0], autoEquip: false },
//  { id: 'fantasy_sword2', position: [22, 20, 0], autoEquip: false },
//  { id: 'frozennight_sword', position: [23.5, 20, 0], autoEquip: false },
//  { id: 'honor_sword', position: [25, 20, 0], autoEquip: false },
//  { id: 'iron_sword', position: [26.5, 20, 0], autoEquip: false },
//  { id: 'jade_sword', position: [28, 20, 0], autoEquip: false },
//  { id: 'magic_sword', position: [29.5, 20, 0], autoEquip: false },
//  { id: 'mecanicice_sword', position: [31, 20, 0], autoEquip: false },
//  { id: 'night_sword', position: [32.5, 20, 0], autoEquip: false },
//  { id: 'orcs_sword', position: [34, 20, 0], autoEquip: false },
//  { id: 'polyarmgold_sword', position: [35.5, 20, 0], autoEquip: false },
//  { id: 'polyarm_sword', position: [37, 20, 0], autoEquip: false },
//  { id: 'purplecrystal_sword', position: [38.5, 20, 0], autoEquip: false },
//  { id: 'rock_sword', position: [40, 20, 0], autoEquip: false },
//  { id: 'stone_sword', position: [41.5, 20, 0], autoEquip: false },
//  { id: 'thunder_sword', position: [43, 20, 0], autoEquip: false },
//  { id: 'wolf_sword', position: [44.5, 20, 0], autoEquip: false },
//
//  // ==========================
//  // DEBUG: SHIELDS (lado a lado)
//  // ==========================
//  { id: 'medieval_shield', position: [10, 20, 3], autoEquip: false },
//  { id: 'shield_bird-wood', position: [11.5, 20, 3], autoEquip: false },
//  { id: 'shield_gladiator', position: [13, 20, 3], autoEquip: false },
//  { id: 'shield_iron', position: [14.5, 20, 3], autoEquip: false },
//  { id: 'shield_light', position: [16, 20, 3], autoEquip: false },
//  { id: 'shield_mecanic', position: [17.5, 20, 3], autoEquip: false },
//  { id: 'shield_rock', position: [19, 20, 3], autoEquip: false },
//  { id: 'shield_wood', position: [20.5, 20, 3], autoEquip: false },
//  { id: 'shield_wood2', position: [22, 20, 3], autoEquip: false },
//  { id: 'warrior_shield', position: [23.5, 20, 3], autoEquip: false },
//],

  deserto: [
    { id: 'iron_sword', position: [5, 15, 5], autoEquip: false },
    { id: 'mage_staff', position: [8, 15, 3], autoEquip: false },
    { id: 'strength_ring', position: [3, 15, 4], autoEquip: false },
    { id: 'fantasy_sword', position: [3, 14, 3], autoEquip: false },
  ],
  ilha: [
    { id: 'mage_staff', position: [4, 15, 4], autoEquip: false },
    { id: 'agility_necklace', position: [7, 15, 6], autoEquip: false },
  ],
};

// 🔥 DROPS DE INIMIGOS (quando morrerem)
export const ENEMY_DROPS = {
  slime: {
    common: [
      { id: 'small_health_potion', chance: 0.3, quantity: 1 },
      { id: 'golden_coin', chance: 0.5, quantity: 1 },
    ],
    uncommon: [
      { id: 'wooden_sword', chance: 0.1, quantity: 1 },
      { id: 'leather_chest', chance: 0.1, quantity: 1 },
    ],
    rare: [
      { id: 'strength_ring', chance: 0.05, quantity: 1 },
      { id: 'iron_sword', chance: 0.03, quantity: 1 },
    ]
  },
  scorpion: {
    common: [
      { id: 'golden_coin', chance: 0.6, quantity: 2 },
      { id: 'scorpion_tail', chance: 0.4, quantity: 1 },
    ],
    uncommon: [
      { id: 'iron_helmet', chance: 0.15, quantity: 1 },
      { id: 'iron_sword', chance: 0.1, quantity: 1 },
    ],
    rare: [
      { id: 'strength_ring', chance: 0.08, quantity: 1 },
    ]
  },
  zombie: {
    common: [
      { id: 'golden_coin', chance: 0.7, quantity: 2 },
      { id: 'small_health_potion', chance: 0.4, quantity: 1 },
      { id: 'bow_wood', chance: 0.12, quantity: 1 },
      { id: 'shield_wood', chance: 0.1, quantity: 1 },
    ],
    uncommon: [
      { id: 'iron_helmet', chance: 0.15, quantity: 1 },
      { id: 'iron_sword', chance: 0.1, quantity: 1 },
      { id: 'leather_chest', chance: 0.12, quantity: 1 },
      { id: 'bow_hunter', chance: 0.08, quantity: 1 },
      { id: 'shield_iron', chance: 0.08, quantity: 1 },
      { id: 'medieval_shield', chance: 0.08, quantity: 1 },
    ],
    rare: [
      { id: 'strength_ring', chance: 0.07, quantity: 1 },
      { id: 'magic_sword', chance: 0.03, quantity: 1 },
      { id: 'bow_elf', chance: 0.05, quantity: 1 },
      { id: 'bow_magic', chance: 0.03, quantity: 1 },
      { id: 'shield_gladiator', chance: 0.03, quantity: 1 },
      { id: 'warrior_shield', chance: 0.03, quantity: 1 },
    ]
  }
};

// 🔥 FUNÇÃO PARA GERAR DROPS ALEATÓRIOS
export const generateDrops = (enemyType) => {
  const drops = [];
  const enemyDrop = ENEMY_DROPS[enemyType];
  
  if (!enemyDrop) return drops;
  
  // Verifica drops comuns
  enemyDrop.common.forEach(drop => {
    if (Math.random() < drop.chance) {
      drops.push({ ...drop, dropped: true });
    }
  });
  
  // Verifica drops incomuns
  enemyDrop.uncommon.forEach(drop => {
    if (Math.random() < drop.chance) {
      drops.push({ ...drop, dropped: true });
    }
  });
  
  // Verifica drops raros
  enemyDrop.rare.forEach(drop => {
    if (Math.random() < drop.chance) {
      drops.push({ ...drop, dropped: true });
    }
  });
  
  return drops;
};
