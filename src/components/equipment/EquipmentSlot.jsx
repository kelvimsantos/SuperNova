// config/equipmentSlots.js
export const EQUIPMENT_SLOTS = [
  { id: 'weapon', name: '⚔️ Arma', icon: '⚔️', position: 'right_hand', bone: 'hand_r' },
  { id: 'shield', name: '🛡️ Escudo', icon: '🛡️', position: 'left_hand', bone: 'hand_l' },
  { id: 'helmet', name: '⛑️ Capacete', icon: '⛑️', position: 'head', bone: 'head' },
  { id: 'chest', name: '👕 Peitoral', icon: '👕', position: 'chest', bone: 'spine' },
  { id: 'legs', name: '👖 Calças', icon: '👖', position: 'legs', bone: 'hips' },
  { id: 'boots', name: '👢 Botas', icon: '👢', position: 'feet', bone: 'foot_l' },
  { id: 'gloves', name: '🧤 Luvas', icon: '🧤', position: 'hands', bone: 'hand_r' },
  { id: 'shoulders', name: '肩 Ombreiras', icon: '肩', position: 'shoulders', bone: 'shoulder_r' },
  { id: 'belt', name: '🔗 Cinto', icon: '🔗', position: 'waist', bone: 'hips' },
  { id: 'necklace', name: '📿 Colar', icon: '📿', position: 'neck', bone: 'neck' },
  { id: 'ring', name: '💍 Anel', icon: '💍', position: 'finger', bone: 'hand_r' },
  { id: 'cloak', name: '🧥 Capa', icon: '🧥', position: 'back', bone: 'spine' }
];

// Itens de exemplo para teste
export const SAMPLE_EQUIPMENT = {
  wooden_sword: {
    id: 'wooden_sword',
    name: 'Espada de Madeira',
    type: 'weapon',
    slot: 'weapon',
    weaponClass: 'warrior',
    icon: '⚔️',
    description: 'Uma espada básica de madeira',
    stats: { strength: 2, agility: 1 },
    damage: 10,
    modelId: 'weapon_001',
    boneAttachment: 'hand_r'
  },
  wooden_shield: {
    id: 'wooden_shield',
    name: 'Escudo de Madeira',
    type: 'shield',
    slot: 'shield',
    weaponClass: 'tank',
    icon: '🛡️',
    description: 'Um escudo leve de madeira',
    stats: { stamina: 3, strength: 1 },
    defense: 5,
    modelId: 'shield_001',
    boneAttachment: 'hand_l'
  },
  mage_staff: {
    id: 'mage_staff',
    name: 'Cajado do Aprendiz',
    type: 'weapon',
    slot: 'weapon',
    weaponClass: 'mage',
    icon: '🔮',
    description: 'Um cajado simples para aprendizes',
    stats: { intelligence: 3, spirit: 2 },
    damage: 8,
    modelId: 'staff_001',
    boneAttachment: 'hand_r'
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'Armadura de Couro',
    type: 'chest',
    slot: 'chest',
    icon: '👕',
    description: 'Armadura leve de couro',
    stats: { agility: 2, stamina: 1 },
    defense: 8,
    modelId: 'armor_001',
    boneAttachment: 'spine'
  }
};