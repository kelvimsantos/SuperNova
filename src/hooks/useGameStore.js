import { create } from 'zustand';
import * as THREE from 'three';

const useGameStore = create((set, get) => ({
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
  
  setPlayerLevel: (level) => set({ playerLevel: level }),
  setPlayerExp: (exp) => set({ playerExp: exp }),
  setSkillPoints: (points) => set({ skillPoints: points }),
  
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
  
  setUnlockedSkills: (skills) => set({ unlockedSkills: skills }),

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

  currentWeather: 'clear',
  setCurrentWeather: (val) => set({ currentWeather: String(val || 'clear') }),

  timeOfDay01: 0,
  setTimeOfDay01: (val) => set({ timeOfDay01: Math.max(0, Math.min(1, Number(val) || 0)) }),

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

  // 🔥 SISTEMA DE EQUIPAMENTO
  equippedItems: {
    weapon: null,
    shield: null,
    helmet: null,
    chest: null,
    legs: null,
    boots: null,
    gloves: null,
    shoulders: null,
    belt: null,
    necklace: null,
    ring: null,
    cloak: null,
    bracers: null,
    greaves: null,
  },
  
  currentClass: 'warrior',
  
  setEquippedItem: (slot, item) => set((state) => ({
    equippedItems: { ...state.equippedItems, [slot]: item }
  })),
  
  unequipItem: (slot) => set((state) => ({
    equippedItems: { ...state.equippedItems, [slot]: null }
  })),
  
  setCurrentClass: (classType) => set({ currentClass: classType }),
  
  // 🔥 CÁLCULO DE ATRIBUTOS DO JOGADOR
  getPlayerStats: () => {
    const state = get();
    let stats = {
      strength: 10,
      agility: 10,
      intelligence: 10,
      stamina: 10,
      spirit: 10,
      criticalChance: 0.05,
      attackSpeed: 1.0,
      moveSpeed: 1.0,
      magicFind: 0,
      bonusDamage: 0,
      bonusDefense: 0,
    };
    
    Object.values(state.equippedItems).forEach(item => {
      if (item && item.stats) {
        Object.keys(stats).forEach(stat => {
          if (item.stats[stat]) {
            stats[stat] += item.stats[stat];
          }
        });
      }
      if (item && item.damage) stats.bonusDamage += item.damage;
      if (item && item.defense) stats.bonusDefense += item.defense;
    });
    
    switch(state.currentClass) {
      case 'warrior':
        stats.strength += 5; stats.stamina += 3; stats.bonusDamage += 5;
        break;
      case 'mage':
        stats.intelligence += 5; stats.spirit += 3;
        break;
      case 'archer':
        stats.agility += 5; stats.criticalChance += 0.1; stats.moveSpeed += 0.2;
        break;
      case 'tank':
        stats.stamina += 8; stats.strength += 2; stats.bonusDefense += 10;
        break;
      case 'healer':
        stats.spirit += 5; stats.intelligence += 3;
        break;
    }
    return stats;
  },
  
  getPlayerMaxHealth: () => 100 + (get().getPlayerStats().stamina * 5),
  
  getPlayerDamage: () => {
    const stats = get().getPlayerStats();
    return Math.floor(15 + (stats.strength * 1.5) + stats.bonusDamage);
  },

  // 🔥 SISTEMA DE COMBATE
  playerHealth: 100,
  playerMaxHealth: 100,
  playerMana: 50,
  playerMaxMana: 50,
  playerDamage: 15,
  
  setPlayerHealth: (health) => set((state) => ({ 
    playerHealth: Math.max(0, Math.min(health, state.playerMaxHealth))
  })),
  
  setPlayerMana: (mana) => set((state) => ({ 
    playerMana: Math.max(0, Math.min(mana, state.playerMaxMana))
  })),
  
  takeDamage: (damage) => set((state) => {
    const stats = get().getPlayerStats();
    const reducedDamage = Math.max(1, damage - stats.bonusDefense);
    return { playerHealth: Math.max(0, state.playerHealth - reducedDamage) };
  }),
  
  healPlayer: (amount) => set((state) => ({ 
    playerHealth: Math.min(state.playerMaxHealth, state.playerHealth + amount)
  })),

  // 🔥 SISTEMA DE QUESTS - KILLS
  playerKills: { slime: 0, scorpion: 0, cactus_monster: 0 },
  
  setPlayerKills: (kills) => set({ playerKills: kills }),
  
  addKill: (enemyType) => set((state) => ({
    playerKills: { ...state.playerKills, [enemyType]: (state.playerKills[enemyType] || 0) + 1 }
  })),
  
  getKills: (enemyType) => get().playerKills[enemyType] || 0,
  
  resetKills: () => set({ playerKills: { slime: 0, scorpion: 0, cactus_monster: 0 } }),

  // 🔥 PET (um pet por vez)
  pet: {
    type: 'sphere',
    name: 'Petzinho',
    isActive: false,
    life: 1, // 0..1 (placeholder)
    size: 0.45,
    isUnlocked: true,
  },
  petUnlockedTypes: ['sphere'],
  setPetUnlockedTypes: (types) => set({ petUnlockedTypes: Array.isArray(types) ? types : ['sphere'] }),

  setPetType: (type) => set((state) => {
    const unlocked = (state.petUnlockedTypes || []).includes(type);
    return {
      pet: {
        ...state.pet,
        type,
        isUnlocked: unlocked,
        // mantém ativo apenas se desbloqueado
        isActive: unlocked ? state.pet.isActive : false,
      },
    };
  }),
  setPetName: (name) => set((state) => ({

    pet: { ...state.pet, name: String(name || '') },
  })),

  setPetLife: (life) => set((state) => ({
    pet: { ...state.pet, life: Math.max(0, Math.min(1, life)) },
  })),


  setPetActive: (val) => set((state) => ({
    pet: {
      ...state.pet,
      isActive: Boolean(val) && Boolean(state.pet?.isUnlocked),
    },
  })),
  setPetUnlockedType: (type) => set((state) => {
    const current = state.petUnlockedTypes || [];
    if (current.includes(type)) return state;
    return {
      petUnlockedTypes: [...current, type],
      pet: {
        ...state.pet,
        type: state.pet.type === type ? state.pet.type : state.pet.type,
        isUnlocked: state.pet.type === type ? true : state.pet.isUnlocked,
      },
    };
  }),
  callPet: () => set((state) => ({
    pet: {
      ...state.pet,
      isActive: Boolean(state.pet?.isUnlocked),
    },
  })),
  storePet: () => set((state) => ({
    pet: {
      ...state.pet,
      isActive: false,
    },
  })),
  savePet: () => {},

  // 🔥 CONFIGURAÇÕES (sessão)
  waterMode: (() => {

    try {
      const saved = sessionStorage.getItem('waterMode');
      if (saved === 'light' || saved === 'full') return saved;
    } catch (e) {}

    // mobile default = light
    try {
      const isMobile = window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768;
      return isMobile ? 'light' : 'full';
    } catch (e) {
      return 'full';
    }
  })(),
  setWaterMode: (mode) => set(() => {
    try {
      if (mode === 'light' || mode === 'full') sessionStorage.setItem('waterMode', mode)
    } catch (e) {}
    return { waterMode: mode };
  }),

  // 🔥 LUZ
  lightDir: new THREE.Vector3(0.5, 0.8, 0.3),
  lightIntensity: 1.0,
  setLight: (dir, intensity) => set({ lightDir: dir.clone(), lightIntensity: intensity }),
}));


export default useGameStore;