// components/inventory/ItemTypes.js
export const ItemTypes = {
  // Itens de cura
  HEALTH_POTION: 'health_potion',
  MANA_POTION: 'mana_potion',
  FOOD: 'food',
  
  // Itens de quest
  QUEST_ITEM: 'quest_item',
  KEY: 'key',
  
  // Equipamentos
  WEAPON: 'weapon',
  ARMOR: 'armor',
  SHIELD: 'shield',
  HELMET: 'helmet',
  CHEST: 'chest',
  LEGS: 'legs',
  BOOTS: 'boots',
  GLOVES: 'gloves',
  SHOULDERS: 'shoulders',
  BELT: 'belt',
  NECKLACE: 'necklace',
  RING: 'ring',
  CLOAK: 'cloak',
  
  // Itens de venda
  VALUABLE: 'valuable',
  JUNK: 'junk',
};

export const ItemRarity = {
  COMMON: { name: 'Comum', color: '#ffffff', textColor: '#ffffff' },
  UNCOMMON: { name: 'Incomum', color: '#1eff00', textColor: '#1eff00' },
  RARE: { name: 'Raro', color: '#0070dd', textColor: '#0070dd' },
  EPIC: { name: 'Épico', color: '#a335ee', textColor: '#a335ee' },
  LEGENDARY: { name: 'Lendário', color: '#ff8000', textColor: '#ff8000' },
};

// 🔥 CLASSES DO JOGADOR
export const PlayerClass = {
  WARRIOR: { id: 'warrior', name: '⚔️ Guerreiro', icon: '⚔️', description: 'Dano físico e resistência' },
  MAGE: { id: 'mage', name: '🔮 Mago', icon: '🔮', description: 'Dano mágico e controle' },
  ARCHER: { id: 'archer', name: '🏹 Arqueiro', icon: '🏹', description: 'Dano à distância e agilidade' },
  TANK: { id: 'tank', name: '🛡️ Tanque', icon: '🛡️', description: 'Defesa e sobrevivência' },
  HEALER: { id: 'healer', name: '💚 Curandeiro', icon: '💚', description: 'Suporte e cura' }
};

// 🔥 ARMAS POR CLASSE
export const WeaponClass = {
  warrior: ['sword', 'axe', 'mace', 'greatsword'],
  mage: ['staff', 'wand', 'dagger'],
  archer: ['bow', 'crossbow', 'dagger'],
  tank: ['sword', 'shield', 'mace', 'greatsword'],
  healer: ['staff', 'wand', 'mace']
};

// 🔥 FUNÇÃO PARA CONVERTER GRAUS PARA RADIANOS (usada internamente)
const degToRad = (deg) => deg * (Math.PI / 180);

// 🔥 FUNÇÃO HELPER PARA CRIAR ITENS COM ROTAÇÃO EM GRAUS
// Uso: createItemWithRotation(baseItem, [90, 0, 45], [0.3, 0, 0], [1, 1, 1])
export const createItemWithRotation = (baseItem, rotationDeg, position, scale) => {
  return {
    ...baseItem,
    customPosition: position || baseItem.customPosition || [0, 0, 0],
    customRotation: rotationDeg ? rotationDeg.map(deg => deg * (Math.PI / 180)) : baseItem.customRotation || [0, 0, 0],
    customScale: scale || baseItem.customScale || [1, 1, 1],
  };
};

// Banco de dados de itens
export const ItemDatabase = {
  // Poções
  small_health_potion: {
    id: 'small_health_potion',
    name: 'Poção de Vida Pequena',
    type: ItemTypes.HEALTH_POTION,
    rarity: ItemRarity.COMMON,
    icon: '💊',
    description: 'Restaura 50 de HP',
    value: 50,
    hpRestore: 50,
    stackable: true,
    maxStack: 99,
  },
  
  mana_potion: {
    id: 'mana_potion',
    name: 'Poção de Mana',
    type: ItemTypes.MANA_POTION,
    rarity: ItemRarity.COMMON,
    icon: '🔮',
    description: 'Restaura 30 de Mana',
    value: 40,
    manaRestore: 30,
    stackable: true,
    maxStack: 99,
  },
  
  // Itens de quest
  ancient_key: {
    id: 'ancient_key',
    name: 'Chave Antiga',
    type: ItemTypes.KEY,
    rarity: ItemRarity.RARE,
    icon: '🔑',
    description: 'Uma chave misteriosa que parece muito antiga',
    value: 0,
    stackable: false,
    questId: 'ancient_door',
  },
  
  // Itens valiosos
  golden_coin: {
    id: 'golden_coin',
    name: 'Moeda de Ouro',
    type: ItemTypes.VALUABLE,
    rarity: ItemRarity.COMMON,
    icon: '🪙',
    description: 'Uma moeda de ouro brilhante',
    value: 100,
    stackable: true,
    maxStack: 999,
  },
  
  // 🔥 EQUIPAMENTOS - ARMAS
  wooden_sword: {
    id: 'wooden_sword',
    name: 'Espada de Madeira',
    type: ItemTypes.WEAPON,
    slot: 'weapon',
    weaponClass: 'warrior',
    rarity: ItemRarity.COMMON,
    icon: '⚔️',
    description: 'Uma espada de madeira, boa para treinar',
    value: 50,
    damage: 10,
    stats: { strength: 2, agility: 1 },
    modelId: 'weapon_001',
    boneAttachment: 'hand_r',
    stackable: false,
  },

  fantasy_sword: {
    id: 'fantasy_sword',
    name: 'Espada de Fantasia',
    type: ItemTypes.WEAPON,
    slot: 'weapon',
    weaponClass: 'warrior',
    rarity: ItemRarity.COMMON,
    icon: '⚔️',
    description: 'Uma espada de fantasia, boa para matar',
    value: 100,
    damage: 100,
    stats: { strength: 5, agility: 5 },
    modelId: 'weapon_002',
    boneAttachment: 'hand_r',
    stackable: false,
    modelPath: '/models/weapons/fantasy_sword.glb',
    customPosition: [0.35, -0.15, 0.1],
    customRotation: [90.6, 90, 90.6], // Em graus!
    customScale: [2.2, 2.2, 2.2],
  },
  
  iron_sword: {
    id: 'iron_sword',
    name: 'Espada de Ferro',
    type: ItemTypes.WEAPON,
    slot: 'weapon',
    weaponClass: 'warrior',
    rarity: ItemRarity.COMMON,
    icon: '⚔️',
    description: 'Uma espada robusta de ferro',
    value: 150,
    damage: 20,
    stats: { strength: 4, agility: 2 },
    modelId: 'weapon_002',
    boneAttachment: 'hand_r',
    stackable: false,
  },

  fantasy_axe: {
    id: 'fantasy_axe',
    name: 'Machado de Fantasia',
    type: ItemTypes.WEAPON,
    slot: 'weapon',
    weaponClass: 'warrior',
    rarity: ItemRarity.COMMON,
    icon: '🪓',
    description: 'Um machado de fantasia, bom para cortar',
    value: 100,
    damage: 100,
    stats: { strength: 5, agility: 5 },
    modelId: 'weapon_003',
    boneAttachment: 'hand_r',
    stackable: false,
    modelPath: '/models/weapons/fantasy_axe.glb',
    customPosition: [0.35, -0.15, 0.1],
    customRotation: [0.6, 0, 0.6], // Em radianos
    customScale: [2.2, 2.2, 2.2],
  },

  wooden_shield: {
    id: 'wooden_shield',
    name: 'Escudo de Madeira',
    type: ItemTypes.SHIELD,
    slot: 'shield',
    weaponClass: 'tank',
    rarity: ItemRarity.COMMON,
    icon: '🛡️',
    description: 'Um escudo leve de madeira',
    value: 80,
    defense: 8,
    stats: { stamina: 3, strength: 1 },
    modelId: 'shield_001',
    boneAttachment: 'hand_l',
    stackable: false,
  },
  
  shield_mecanic: {
    id: 'shield_mecanic',
    name: 'Escudo Mecânico',
    type: ItemTypes.SHIELD,
    slot: 'shield',
    weaponClass: 'tank',
    rarity: ItemRarity.COMMON,
    icon: '🛡️',
    description: 'Um escudo leve de mecânico',
    value: 80,
    defense: 15,
    stats: { stamina: 5, strength: 5 },
    modelId: 'shield_002',
    boneAttachment: 'hand_l',
    stackable: false,
    modelPath: '/models/weapons/shield_mecanic.glb',
    customPosition: [0.35, -0.15, 0.1],
    customRotation: [0.6, 0, 180.6], // Em graus!
    customScale: [1.2, 1.2, 1.2],
  },

  mage_staff: {
    id: 'mage_staff',
    name: 'Cajado do Aprendiz',
    type: ItemTypes.WEAPON,
    slot: 'weapon',
    weaponClass: 'mage',
    rarity: ItemRarity.COMMON,
    icon: '🔮',
    description: 'Um cajado simples para aprendizes',
    value: 120,
    damage: 8,
    stats: { intelligence: 3, spirit: 2 },
    modelId: 'staff_001',
    boneAttachment: 'hand_r',
    stackable: false,
  },
  
  // 🔥 EQUIPAMENTOS - ARMADURAS
  leather_chest: {
    id: 'leather_chest',
    name: 'Peitoral de Couro',
    type: ItemTypes.CHEST,
    slot: 'chest',
    rarity: ItemRarity.COMMON,
    icon: '👕',
    description: 'Armadura leve de couro',
    value: 100,
    defense: 5,
    stats: { agility: 2, stamina: 1 },
    modelId: 'armor_001',
    boneAttachment: 'spine',
    stackable: false,
  },
  
  iron_helmet: {
    id: 'iron_helmet',
    name: 'Elmo de Ferro',
    type: ItemTypes.HELMET,
    slot: 'helmet',
    rarity: ItemRarity.COMMON,
    icon: '⛑️',
    description: 'Elmo resistente de ferro',
    value: 80,
    defense: 4,
    stats: { stamina: 2, strength: 1 },
    modelId: 'helmet_001',
    boneAttachment: 'head',
    stackable: false,
  },
  
  // 🔥 ACESSÓRIOS
  strength_ring: {
    id: 'strength_ring',
    name: 'Anel da Força',
    type: ItemTypes.RING,
    slot: 'ring',
    rarity: ItemRarity.UNCOMMON,
    icon: '💍',
    description: 'Um anel que aumenta sua força',
    value: 200,
    stats: { strength: 5 },
    modelId: 'ring_001',
    boneAttachment: 'hand_r',
    stackable: false,
  },
  
  agility_necklace: {
    id: 'agility_necklace',
    name: 'Colar da Agilidade',
    type: ItemTypes.NECKLACE,
    slot: 'necklace',
    rarity: ItemRarity.UNCOMMON,
    icon: '📿',
    description: 'Um colar que aumenta sua agilidade',
    value: 180,
    stats: { agility: 5 },
    modelId: 'necklace_001',
    boneAttachment: 'neck',
    stackable: false,
  },
};