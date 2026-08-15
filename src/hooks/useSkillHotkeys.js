// hooks/useSkillHotkeys.js
import { useEffect, useCallback, useState, useRef } from 'react'; // 🔥 ADICIONEI useState
import useGameStore from './useGameStore';

// Configuração das teclas de atalho
const HOTKEY_CONFIG = {
  '1': { skillId: 'heavy_attack', name: 'Ataque Pesado' },
  '2': { skillId: 'double_strike', name: 'Golpe Duplo' },
  '3': { skillId: 'fireball', name: 'Bola de Fogo' },
  '4': { skillId: 'ice_bolt', name: 'Raio de Gelo' },
  '5': { skillId: 'heal', name: 'Cura' },
  '6': { skillId: 'shield', name: 'Escudo' },
  '7': { skillId: 'critical_strike', name: 'Golpe Crítico' },
  '8': { skillId: 'vampirism', name: 'Vampirismo' },
  't': { skillId: 'quick_attack', name: 'Ataque Rápido' },
  'T': { skillId: 'quick_attack', name: 'Ataque Rápido' },
  'e': { skillId: 'interact', name: 'Interagir' },
  'E': { skillId: 'interact', name: 'Interagir' },
  'r': { skillId: 'special', name: 'Habilidade Especial' },
  'R': { skillId: 'special', name: 'Habilidade Especial' },
  'y': { skillId: 'use_potion', name: 'Usar Poção' },
  'Y': { skillId: 'use_potion', name: 'Usar Poção' },
  'i': { skillId: 'inventory', name: 'Inventário' },
  'I': { skillId: 'inventory', name: 'Inventário' },
  'k': { skillId: 'skill_tree', name: 'Árvore de Habilidades' },
  'K': { skillId: 'skill_tree', name: 'Árvore de Habilidades' },
};

const SKILLS_REQUIRE_TARGET = [
  'heavy_attack', 'double_strike', 'fireball', 
  'ice_bolt', 'quick_attack', 'special'
];

const SKILLS_SELF_TARGET = ['heal', 'shield'];

export const useSkillHotkeys = () => {
  const [currentTarget, setCurrentTarget] = useState(null); // 🔥 AGORA FUNCIONA
  const cooldownsRef = useRef({}); // 🔥 timestamps de cooldown por skill
  
  const unlockedSkills = useGameStore(state => state.unlockedSkills || []);
  const playerMana = useGameStore(state => state.playerMana || 0);
  const setPlayerMana = useGameStore(state => state.setPlayerMana);
  const healPlayer = useGameStore(state => state.healPlayer);
  const inventory = useGameStore(state => state.inventory || []);
  const removeFromInventory = useGameStore(state => state.removeFromInventory);
  
  // 🔥 PEGA O ALVO SELECIONADO (setado ao clicar no inimigo — requestAttack)
  const findNearestEnemy = useCallback(() => {
    const target = useGameStore.getState().selectedTarget || useGameStore.getState().pendingTarget;
    return target || null;
  }, []);
  
  // 🔥 APLICA DANO REAL NO ALVO (suporta ZombieEnemy e ZombiePool)
  const applyDamageToTarget = useCallback((target, amount) => {
    if (!target) return;
    if (target.applyDamage) {
      target.applyDamage(amount);
    } else if (window.zombieHorde && window.zombieHorde.damage && target.id !== undefined) {
      window.zombieHorde.damage(target.id, amount);
    }
  }, []);
  
  const useSkill = useCallback((skillId) => {
    const skillConfig = {
      heavy_attack: { manaCost: 20, damage: 30, cooldown: 2 },
      double_strike: { manaCost: 15, damage: 20, hits: 2, cooldown: 3 },
      fireball: { manaCost: 25, damage: 40, range: 15, cooldown: 4 },
      ice_bolt: { manaCost: 30, damage: 25, freeze: true, cooldown: 5 },
      heal: { manaCost: 30, healAmount: 50, cooldown: 8 },
      shield: { manaCost: 20, damageReduction: 0.5, duration: 5, cooldown: 10 },
      critical_strike: { passive: true, criticalChance: 0.15 },
      vampirism: { passive: true, lifeSteal: 0.2 },
      quick_attack: { manaCost: 10, damage: 15, cooldown: 1 },
      special: { manaCost: 40, damage: 60, cooldown: 15 },
      use_potion: { consumeItem: 'small_health_potion', healAmount: 50 },
      interact: { action: 'interact' },
      inventory: { action: 'toggle_inventory' },
      skill_tree: { action: 'toggle_skill_tree' }
    };
    
    const config = skillConfig[skillId];
    
    if (!config) {
      console.log(`❌ Skill ${skillId} não configurada`);
      return;
    }

    // 🔥 COOLDOWN
    if (config.cooldown) {
      const now = Date.now();
      const last = cooldownsRef.current[skillId] || 0;
      if (now - last < config.cooldown * 1000) {
        console.log(`⏳ ${skillId} em cooldown!`);
        return;
      }
      cooldownsRef.current[skillId] = now;
    }
    
    // Ações especiais (não precisam de verificação de desbloqueio)
    if (skillId === 'inventory') {
      window.dispatchEvent(new CustomEvent('toggleInventory'));
      return;
    }
    
    if (skillId === 'skill_tree') {
      window.dispatchEvent(new CustomEvent('toggleSkillTree'));
      return;
    }
    
    if (skillId === 'interact') {
      console.log(`🤝 Interagindo com o ambiente`);
      return;
    }
    
    // Verifica se a skill está desbloqueada
    if (!unlockedSkills.includes(skillId)) {
      console.log(`❌ Skill ${skillId} não desbloqueada!`);
      return;
    }
    
    // Verifica mana
    if (config.manaCost && playerMana < config.manaCost) {
      console.log(`❌ Mana insuficiente! (${playerMana}/${config.manaCost})`);
      return;
    }
    
    // Verifica se precisa de alvo
    if (SKILLS_REQUIRE_TARGET.includes(skillId)) {
      const target = currentTarget || findNearestEnemy();
      if (!target) {
        console.log(`❌ Nenhum inimigo alvo!`);
        return;
      }
      console.log(`🎯 Atacando alvo com ${skillId}`);

      // 🔥 APLICA DANO REAL NO ALVO SELECIONADO
      const dmg = config.damage || 15;
      if (config.hits > 1) {
        for (let i = 0; i < config.hits; i++) {
          applyDamageToTarget(target, dmg);
        }
      } else {
        applyDamageToTarget(target, dmg);
      }

      // Sangue no inimigo
      const targetPos = target.position || target.pos;
      if (targetPos) {
        window.dispatchEvent(new CustomEvent('combatBlood', {
          detail: { position: { x: targetPos.x, y: targetPos.y, z: targetPos.z } },
        }));
      }
      window.dispatchEvent(new CustomEvent('combatDamage', {
        detail: {
          damage: dmg * (config.hits || 1),
          position: { x: window.innerWidth / 2, y: window.innerHeight / 3 },
          isPlayer: false,
        },
      }));
    }
    
    // Skills de auto-cura
    if (SKILLS_SELF_TARGET.includes(skillId)) {
      console.log(`💚 Usando ${skillId} em si mesmo`);
    }
    
    // Consome mana
    if (config.manaCost) {
      setPlayerMana(playerMana - config.manaCost);
    }
    
    // Efeitos específicos
    if (skillId === 'heal' && config.healAmount) {
      healPlayer(config.healAmount);
      console.log(`💚 Curou ${config.healAmount} HP!`);
      // 🔥 Feedback visual de cura
      window.dispatchEvent(new CustomEvent('playerHeal', {
        detail: { amount: config.healAmount, position: { x: window.innerWidth / 2, y: window.innerHeight / 2 } },
      }));
    }
    
    if (skillId === 'use_potion') {
      const potion = inventory.find(item => item.id === 'small_health_potion');
      if (potion) {
        removeFromInventory(potion.id);
        healPlayer(50);
        console.log(`💊 Usou poção! Curou 50 HP`);
      } else {
        console.log(`❌ Sem poções no inventário!`);
      }
    }
    
    console.log(`✨ Usou: ${HOTKEY_CONFIG[Object.keys(HOTKEY_CONFIG).find(k => HOTKEY_CONFIG[k]?.skillId === skillId)]?.name || skillId}`);
  }, [unlockedSkills, playerMana, setPlayerMana, healPlayer, currentTarget, findNearestEnemy, inventory, removeFromInventory, applyDamageToTarget]);
  
  useEffect(() => {
    const handleKeyPress = (e) => {
      const key = e.key;
      const config = HOTKEY_CONFIG[key];
      
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (config) {
        e.preventDefault();
        useSkill(config.skillId);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [useSkill]);
  
  useEffect(() => {
    console.log('🎮 Sistema de teclas de atalho ativo:');
    console.log('   📌 [1-8] - Habilidades de combate');
    console.log('   📌 [Q] - Ataque rápido');
    console.log('   📌 [E] - Interagir');
    console.log('   📌 [R] - Habilidade especial');
    console.log('   📌 [F] - Usar poção');
    console.log('   📌 [I] - Inventário');
    console.log('   📌 [K] - Árvore de habilidades');
  }, []);
  
  return { useSkill };
};  