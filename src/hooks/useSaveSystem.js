// hooks/useSaveSystem.js
import useGameStore from './useGameStore';
import useQuestStore, { QuestStatus } from './useQuestStore';

const SAVE_KEY = 'rpg_game_save';

export const useSaveSystem = () => {
  const gameState = useGameStore();
  const questState = useQuestStore();
  
  // 🔥 SALVAR JOGO (inclui quests)
  const saveGame = () => {
    try {
      const saveData = {
        version: '1.0',
        timestamp: Date.now(),
        player: {
          level: gameState.playerLevel,
          exp: gameState.playerExp,
          skillPoints: gameState.skillPoints,
          health: gameState.playerHealth,
          mana: gameState.playerMana,
          currentScene: gameState.currentScene,
          position: gameState.playerPosition,
          unlockedSkills: gameState.unlockedSkills || []
        },
        inventory: gameState.inventory || [],
        equipment: gameState.equippedItems || {},
        quests: questState.playerQuests || {}, // 🔥 SALVA TODAS AS QUESTS
        playerKills: gameState.playerKills || { slime: 0 },
        currentClass: gameState.currentClass || 'warrior',
        pet: gameState.pet || null,
        petUnlockedTypes: gameState.petUnlockedTypes || []
      };
      
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      console.log('💾 Jogo salvo!', new Date().toLocaleTimeString());
      console.log('📜 Quests salvas:', Object.keys(saveData.quests).length);
      return true;
    } catch (error) {
      console.error('Erro ao salvar:', error);
      return false;
    }
  };
  
  // 🔥 CARREGAR DADOS DO SAVE
  const loadGameData = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) {
      console.log('📭 Nenhum save encontrado');
      return null;
    }
    
    try {
      const saveData = JSON.parse(saved);
      console.log('📀 Dados do save carregados:', saveData);
      console.log('📜 Quests no save:', saveData.quests);
      return saveData;
    } catch (error) {
      console.error('Erro ao carregar save:', error);
      return null;
    }
  };
  
  // 🔥 APLICAR SAVE AO JOGO (inclui quests)
  const applySaveToGame = (saveData) => {
    if (!saveData) return false;
    
    try {
      // 🔥 RESTAURA AS QUESTS
      if (saveData.quests) {
        // Limpa quests existentes
        Object.keys(questState.playerQuests).forEach(questId => {
          localStorage.removeItem(`quest_${questId}`);
        });
        
        // Restaura cada quest do save
        Object.entries(saveData.quests).forEach(([questId, questData]) => {
          // Salva no localStorage
          localStorage.setItem(`quest_${questId}`, questData.status);
          // Atualiza o store
          questState.setQuestFromSave(questId, questData);
        });
        console.log('✅ Quests restauradas:', Object.keys(saveData.quests).length);
      }
      
      // Atualiza kills
      if (saveData.playerKills) {
        gameState.setPlayerKills(saveData.playerKills);
      }
      
      // Atualiza classe
      if (saveData.currentClass) {
        gameState.setCurrentClass(saveData.currentClass);
      }
      
      // Atualiza inventário
      gameState.clearInventory();
      if (saveData.inventory) {
        saveData.inventory.forEach(item => {
          gameState.addToInventory(item);
        });
      }
      
      // Atualiza equipamentos
      if (saveData.equipment) {
        Object.entries(saveData.equipment).forEach(([slot, item]) => {
          if (item) {
            gameState.setEquippedItem(slot, item);
          }
        });
      }
      
      // Atualiza player stats
      gameState.setPlayerLevel(saveData.player.level);
      gameState.setPlayerExp(saveData.player.exp);
      gameState.setSkillPoints(saveData.player.skillPoints);
      gameState.setPlayerHealth(saveData.player.health);
      gameState.setPlayerMana(saveData.player.mana);
      gameState.setCurrentScene(saveData.player.currentScene);
      gameState.setPlayerPosition(saveData.player.position);
      
      if (saveData.player.unlockedSkills) {
        gameState.setUnlockedSkills(saveData.player.unlockedSkills);
      }

      // 🔥 PET (persistência)
      if (saveData.pet) {
        if (saveData.petUnlockedTypes) gameState.setPetUnlockedTypes(saveData.petUnlockedTypes);
        if (saveData.pet.type) gameState.setPetType(saveData.pet.type);
        if (typeof saveData.pet.name === 'string') gameState.setPetName(saveData.pet.name);
        if (typeof saveData.pet.life === 'number') gameState.setPetLife(saveData.pet.life);
        if (typeof saveData.pet.isActive === 'boolean') gameState.setPetActive(saveData.pet.isActive);
      }

      console.log('✅ Save aplicado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao aplicar save:', error);
      return false;
    }
  };
  
  // 🔥 DELETAR SAVE (inclui quests)
  const deleteSave = () => {
    localStorage.removeItem(SAVE_KEY);
    // Remove quests do localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('quest_')) {
        localStorage.removeItem(key);
      }
    }
    console.log('🗑️ Save e quests deletados');
  };
  
  // 🔥 VERIFICAR SE EXISTE SAVE
  const hasSave = () => {
    return localStorage.getItem(SAVE_KEY) !== null;
  };
  
  // 🔥 OBTER INFO DO SAVE
  const getSaveInfo = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  };
  
  // 🔥 EXPORTAR SAVE
  const exportSave = () => {
    const saveData = localStorage.getItem(SAVE_KEY);
    if (saveData) {
      const blob = new Blob([saveData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rpg_save_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('📤 Save exportado!');
    }
  };
  
  // 🔥 IMPORTAR SAVE
  const importSave = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const saveData = JSON.parse(e.target.result);
          localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
          console.log('📥 Save importado!');
          resolve(true);
        } catch (error) {
          console.error('Erro ao importar save:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };
  
  return {
    saveGame,
    loadGameData,
    applySaveToGame,
    deleteSave,
    hasSave,
    getSaveInfo,
    exportSave,
    importSave
  };
};