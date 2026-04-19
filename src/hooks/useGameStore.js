import { create } from 'zustand';
import * as THREE from 'three';

const useGameStore = create((set) => ({
  // 🔥 SISTEMA DE NÍVEL E EXP
  playerLevel: 1,
  playerExp: 0,
  expToNextLevel: 100,
  skillPoints: 0,
  
  addExp: (amount) => set((state) => {
    let newExp = state.playerExp + amount;
    let newLevel = state.playerLevel;
    let newSkillPoints = state.skillPoints;
    let newExpToNext = state.expToNextLevel;
    let leveledUp = false;
    
    while (newExp >= newExpToNext) {
      newExp -= newExpToNext;
      newLevel++;
      newSkillPoints++;
      newExpToNext = Math.floor(newExpToNext * 1.2);
      leveledUp = true;
      console.log(`🎉 Subiu para nível ${newLevel}! +1 ponto de habilidade`);
    }
    
    if (leveledUp) {
      window.dispatchEvent(new CustomEvent('playerLevelUp', { 
        detail: { level: newLevel, skillPoints: newSkillPoints }
      }));
    }
    
    return {
      playerExp: newExp,
      playerLevel: newLevel,
      expToNextLevel: newExpToNext,
      skillPoints: newSkillPoints
    };
  }),
  
  // 🔥 SKILLS DESBLOQUEADAS
  unlockedSkills: [],
  unlockSkill: (skillId) => set((state) => {
    if (state.skillPoints <= 0) {
      console.log('❌ Sem pontos de habilidade!');
      return state;
    }
    if (state.unlockedSkills.includes(skillId)) {
      console.log('❌ Habilidade já desbloqueada!');
      return state;
    }
    console.log(`🔓 Habilidade desbloqueada: ${skillId}`);
    return {
      unlockedSkills: [...state.unlockedSkills, skillId],
      skillPoints: state.skillPoints - 1
    };
  }),

  // 🔥 PLAYER
  playerRigidBody: null,
  setPlayerRigidBody: (rb) => set({ playerRigidBody: rb }),

  playerPosition: { x: 0, y: 0, z: 0 },
  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  movementDirection: null,
  setMovementDirection: (dir) => set({ movementDirection: dir }),

  worldPlaced: false,
  setWorldPlaced: (placed) => set({ worldPlaced: placed }),

  worldGroupRef: null,
  setWorldGroupRef: (ref) => set({ worldGroupRef: ref }),

  followMode: false,
  toggleFollowMode: () => set((state) => ({ followMode: !state.followMode })),

  isNight: false,
  setIsNight: (val) => set({ isNight: val }),

  currentScene: 'default',
  setCurrentScene: (scene) => set({ currentScene: scene }),

  // 🔥 SISTEMA DE INVENTÁRIO
  inventory: [],
  addToInventory: (item) => set((state) => ({ 
    inventory: [...state.inventory, { ...item, id: Date.now() + Math.random() }]
  })),
  removeFromInventory: (itemId) => set((state) => ({ 
    inventory: state.inventory.filter(item => item.id !== itemId)
  })),
  clearInventory: () => set({ inventory: [] }),

  // 🔥 SISTEMA DE COMBATE
  playerHealth: 100,
  playerMaxHealth: 100,
  playerMana: 50,
  playerMaxMana: 50,
  playerDamage: 15,
  
  setPlayerHealth: (health) => set({ playerHealth: Math.max(0, Math.min(health, 100)) }),
  setPlayerMana: (mana) => set({ playerMana: Math.max(0, Math.min(mana, 50)) }),
  
  takeDamage: (damage) => set((state) => ({ 
    playerHealth: Math.max(0, state.playerHealth - damage)
  })),
  
  healPlayer: (amount) => set((state) => ({ 
    playerHealth: Math.min(state.playerMaxHealth, state.playerHealth + amount)
  })),

  // 🔥 LUZ
  lightDir: new THREE.Vector3(0.5, 0.8, 0.3),
  lightIntensity: 1.0,
  setLight: (dir, intensity) => set({ lightDir: dir.clone(), lightIntensity: intensity }),
}));

export default useGameStore;