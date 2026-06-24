// config/droppedItems.js
import { ItemDatabase } from '../components/inventory/ItemTypes';

// 🔥 ITENS QUE PODEM SER COLETADOS NO CHÃO
export const DROPPED_ITEMS = {
  default: [
    { id: 'wooden_sword', position: [1, 13, 1], autoEquip: false },
    { id: 'fantasy_sword', position: [3, 14, 3], rotation:[0,90,0], autoEquip: false },
    { id: 'fantasy_axe', position: [3, 14, 4], autoEquip: false },
    { id: 'shield_mecanic', position: [2, 13, 2], autoEquip: false },
    { id: 'wooden_shield', position: [2, 13, 2], autoEquip: false },
    { id: 'leather_chest', position: [3, 13, 1], autoEquip: false },
    { id: 'iron_helmet', position: [4, 13, 2], autoEquip: false },
    { id: 'strength_ring', position: [5, 13, 1], autoEquip: false },
    { id: 'agility_necklace', position: [6, 13, 2], autoEquip: false },
    { id: 'small_health_potion', position: [1, 13, 3], autoEquip: false },
    { id: 'golden_coin', position: [3, 13, 3], autoEquip: false },
  ],
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