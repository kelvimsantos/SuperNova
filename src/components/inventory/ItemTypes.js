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
  
  // Armas (placeholder)
  wooden_sword: {
    id: 'wooden_sword',
    name: 'Espada de Madeira',
    type: ItemTypes.WEAPON,
    rarity: ItemRarity.COMMON,
    icon: '⚔️',
    description: 'Uma espada de madeira, boa para treinar',
    value: 50,
    damage: 10,
    durability: 100,
    stackable: false,
  },
};