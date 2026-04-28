// config/quests.js

export const QuestStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REWARDED: 'rewarded'
};

export const QUESTS = {
  // Quests da cena default
  default: [
    {
      id: 'slime_killer',
      name: '⚔️ Caçador de Slimes',
      description: 'Derrote 3 slimes para limpar a área',
      longDescription: 'Os slimes estão se multiplicando e atrapalhando os viajantes. Derrote 3 slimes e volte para receber sua recompensa!',
      type: 'kill',
      requirements: { enemyType: 'slime', amount: 3 },
      reward: {
        exp: 100,
        items: ['golden_coin', 'small_health_potion'],
        gold: 50
      },
      npcPosition: [2, 13, 2],
      npcName: '🧙‍♂️ Velho Sábio',
      npcDialog: {
        start: 'Olá aventureiro! Os slimes estão causando problemas. Você pode derrotar 3 slimes para mim?',
        in_progress: 'Você já derrotou {current}/{required} slimes. Continue assim!',
        completed: 'Excelente! Você derrotou todos os slimes! Aqui está sua recompensa.',
        already_completed: 'Obrigado novamente pela ajuda!'
      }
    },
    {
      id: 'ancient_key',
      name: '🔑 A Chave Antiga',
      description: 'Encontre a Chave Antiga perdida',
      longDescription: 'Uma chave misteriosa foi perdida nas proximidades. Encontre-a e traga para mim.',
      type: 'collect',
      requirements: { itemId: 'ancient_key', amount: 1 },
      reward: {
        exp: 150,
        items: ['iron_sword', 'strength_ring'],
        gold: 100
      },
      npcPosition: [5, 13, 4],
      npcName: '🔮 Mestre dos Portais',
      npcDialog: {
        start: 'Perdi uma chave muito importante por perto. Você pode encontrá-la para mim?',
        in_progress: 'A chave está por aí, continue procurando!',
        completed: 'Você encontrou! Muito obrigado! Aceite esta recompensa.',
        already_completed: 'Que bom que você está por aqui!'
      }
    }
  ],
  // Quests da cena deserto
  deserto: [
    {
      id: 'desert_scorpion',
      name: '🦂 Caçador de Escorpiões',
      description: 'Derrote 2 escorpiões do deserto',
      longDescription: 'Os escorpiões estão atacando os viajantes no deserto. Derrote 2 deles!',
      type: 'kill',
      requirements: { enemyType: 'scorpion', amount: 2 },
      reward: {
        exp: 200,
        items: ['scorpion_tail', 'golden_coin'],
        gold: 80
      },
      npcPosition: [5, 15, 5],
      npcName: '🏜️ Nômade do Deserto',
      npcDialog: {
        start: 'Aventureiro, os escorpiões estão perigosos! Derrote 2 para nós!',
        in_progress: 'Continue caçando os escorpiões!',
        completed: 'Você é muito corajoso! Tome esta recompensa!',
        already_completed: 'Você é um herói para nosso povo!'
      }
    }
  ]
};

// 🔥 FUNÇÃO PARA VERIFICAR PROGRESSO
export const checkQuestProgress = (quest, playerStats, inventory) => {
  if (quest.type === 'kill') {
    const kills = playerStats.kills?.[quest.requirements.enemyType] || 0;
    return kills >= quest.requirements.amount;
  }
  if (quest.type === 'collect') {
    const item = inventory.find(i => i.id === quest.requirements.itemId);
    return item && item.quantity >= quest.requirements.amount;
  }
  return false;
};

export const getQuestProgress = (quest, playerStats, inventory) => {
  if (quest.type === 'kill') {
    const current = playerStats.kills?.[quest.requirements.enemyType] || 0;
    return { current, required: quest.requirements.amount };
  }
  if (quest.type === 'collect') {
    const item = inventory.find(i => i.id === quest.requirements.itemId);
    const current = item?.quantity || 0;
    return { current, required: quest.requirements.amount };
  }
  return { current: 0, required: 0 };
};