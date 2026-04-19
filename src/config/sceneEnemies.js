// src/config/sceneEnemies.js

// 🔥 CONFIGURAÇÃO DE INIMIGOS POR CENA
export const sceneEnemies = {
  default: [
    { type: 'slime', position: [3, 13, 3], health: 30, damage: 8 },
    { type: 'slime', position: [6, 13, 2], health: 25, damage: 6 },
    { type: 'dummy', position: [8, 13, 5], dropItems: ['golden_coin', 'small_health_potion'] }
  ],
  deserto: [
    { type: 'slime', position: [5, 15, 5], health: 40, damage: 12 },
    { type: 'slime', position: [10, 15, 8], health: 35, damage: 10 }
  ],
  ilha: [
    { type: 'slime', position: [3, 15, 4], health: 45, damage: 14 },
    { type: 'slime', position: [8, 15, 7], health: 30, damage: 8 }
  ]
};

// 🔥 CONFIGURAÇÃO DE ITENS POR CENA
export const sceneItems = {
  default: [
    { id: 'small_health_potion', position: [2, 13, 2] },
    { id: 'golden_coin', position: [4, 13, 3] },
    { id: 'ancient_key', position: [6, 13, 1] }
  ],
  deserto: [
    { id: 'golden_coin', position: [3, 15, 3] },
    { id: 'golden_coin', position: [7, 15, 6] },
    { id: 'small_health_potion', position: [12, 15, 4] }
  ],
  ilha: [
    { id: 'pearl', position: [5, 15, 5] },
    { id: 'health_potion', position: [10, 15, 10] },
    { id: 'golden_coin', position: [8, 15, 8] }
  ]
};

// 🔥 PARA ADICIONAR UM NOVO TIPO DE INIMIGO, DEPOIS:
// 1. Crie o componente do inimigo em components/enemies/
// 2. Adicione o case no switch dentro do ARScene