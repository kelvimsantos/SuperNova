// components/skills/SkillTree.jsx
import { useState, useEffect } from 'react';
import useGameStore from '../../hooks/useGameStore';
import './SkillTree.css';

// Habilidades disponíveis
const skillsList = {
  // Linha 1 - Combate
  heavy_attack: {
    id: 'heavy_attack',
    name: '💥 Ataque Pesado',
    description: 'Causa 200% de dano em um único golpe',
    manaCost: 20,
    cooldown: 3,
    damageMultiplier: 2.0,
    requiredLevel: 1,
    requiredSkill: null,
    icon: '⚔️',
    category: 'combat'
  },
  double_strike: {
    id: 'double_strike',
    name: '⚡ Golpe Duplo',
    description: 'Ataca duas vezes seguidas',
    manaCost: 15,
    cooldown: 4,
    damageMultiplier: 1.5,
    hits: 2,
    requiredLevel: 3,
    requiredSkill: 'heavy_attack',
    icon: '🗡️',
    category: 'combat'
  },
  
  // Linha 2 - Magia
  fireball: {
    id: 'fireball',
    name: '🔥 Bola de Fogo',
    description: 'Ataca inimigos à distância com fogo',
    manaCost: 25,
    cooldown: 4,
    damageMultiplier: 1.8,
    range: 15,
    requiredLevel: 2,
    requiredSkill: null,
    icon: '🔥',
    category: 'magic'
  },
  ice_bolt: {
    id: 'ice_bolt',
    name: '❄️ Raio de Gelo',
    description: 'Congela o inimigo por 2 segundos',
    manaCost: 30,
    cooldown: 6,
    damageMultiplier: 1.2,
    freezeDuration: 2,
    requiredLevel: 4,
    requiredSkill: 'fireball',
    icon: '❄️',
    category: 'magic'
  },
  
  // Linha 3 - Suporte
  heal: {
    id: 'heal',
    name: '💚 Cura',
    description: 'Restaura 50% da vida máxima',
    manaCost: 30,
    cooldown: 8,
    healPercent: 0.5,
    requiredLevel: 2,
    requiredSkill: null,
    icon: '💚',
    category: 'support'
  },
  shield: {
    id: 'shield',
    name: '🛡️ Escudo Divino',
    description: 'Reduz dano em 50% por 5 segundos',
    manaCost: 20,
    cooldown: 10,
    damageReduction: 0.5,
    duration: 5,
    requiredLevel: 5,
    requiredSkill: 'heal',
    icon: '🛡️',
    category: 'support'
  },
  
  // Linha 4 - Passivas
  critical_strike: {
    id: 'critical_strike',
    name: '⭐ Golpe Crítico',
    description: '+15% de chance de dano crítico',
    manaCost: 0,
    cooldown: 0,
    criticalChance: 0.15,
    requiredLevel: 3,
    requiredSkill: null,
    icon: '⭐',
    category: 'passive'
  },
  vampirism: {
    id: 'vampirism',
    name: '🩸 Vampirismo',
    description: 'Cura 20% do dano causado',
    manaCost: 0,
    cooldown: 0,
    lifeSteal: 0.2,
    requiredLevel: 6,
    requiredSkill: 'critical_strike',
    icon: '🩸',
    category: 'passive'
  }
};

export const SkillTree = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const playerLevel = useGameStore(state => state.playerLevel);
  const playerExp = useGameStore(state => state.playerExp);
  const expToNextLevel = useGameStore(state => state.expToNextLevel);
  const skillPoints = useGameStore(state => state.skillPoints);
  const unlockedSkills = useGameStore(state => state.unlockedSkills || []);
  const unlockSkill = useGameStore(state => state.unlockSkill);
  const playerMana = useGameStore(state => state.playerMana);
  const setPlayerMana = useGameStore(state => state.setPlayerMana);
  const healPlayer = useGameStore(state => state.healPlayer);
  
  // 🔥 CORRIGIDO: Apenas o evento toggle, SEM o handleKeyPress duplicado
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };
    
    window.addEventListener('toggleSkillTree', handleToggle);
    
    return () => {
      window.removeEventListener('toggleSkillTree', handleToggle);
    };
  }, []);
  
  const handleUnlock = (skillId) => {
    const skill = skillsList[skillId];
    
    if (skillPoints <= 0) {
      alert('❌ Sem pontos de habilidade!');
      return;
    }
    
    if (playerLevel < skill.requiredLevel) {
      alert(`❌ Nível ${skill.requiredLevel} necessário!`);
      return;
    }
    
    if (skill.requiredSkill && !unlockedSkills.includes(skill.requiredSkill)) {
      const required = skillsList[skill.requiredSkill];
      alert(`❌ Desbloqueie ${required.name} primeiro!`);
      return;
    }
    
    if (unlockedSkills.includes(skillId)) {
      alert('❌ Habilidade já desbloqueada!');
      return;
    }
    
    unlockSkill(skillId);
    console.log(`🔓 Habilidade desbloqueada: ${skill.name}`);
  };
  
  const useSkill = (skillId) => {
    const skill = skillsList[skillId];
    
    if (!unlockedSkills.includes(skillId)) {
      console.log(`❌ Habilidade ${skill.name} não desbloqueada!`);
      return;
    }
    
    if (skill.manaCost > 0 && playerMana < skill.manaCost) {
      console.log(`❌ Mana insuficiente! (${playerMana}/${skill.manaCost})`);
      return;
    }
    
    if (skill.manaCost > 0) {
      setPlayerMana(playerMana - skill.manaCost);
    }
    
    console.log(`✨ Usou: ${skill.name}`);
    
    if (skillId === 'heal') {
      healPlayer(Math.floor(100 * skill.healPercent));
    }
  };
  
  const filteredSkills = Object.values(skillsList).filter(skill => {
    if (selectedCategory === 'all') return true;
    return skill.category === selectedCategory;
  });
  
  const expPercent = (playerExp / expToNextLevel) * 100;
  
  if (!isOpen) return null;
  
  return (
    <div className="skill-tree-overlay">
      <div className="skill-tree-container">
        {/* Header */}
        <div className="skill-tree-header">
          <h2>🌳 Árvore de Habilidades</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>
        
        {/* Informações do jogador */}
        <div className="player-info">
          <div className="level-info">
            <span>📊 Nível: {playerLevel}</span>
            <span>⭐ Pontos: {skillPoints}</span>
          </div>
          <div className="exp-bar">
            <div className="exp-fill" style={{ width: `${expPercent}%` }} />
            <span>{playerExp} / {expToNextLevel} XP</span>
          </div>
        </div>
        
        {/* Categorias */}
        <div className="skill-categories">
          <button className={selectedCategory === 'all' ? 'active' : ''} onClick={() => setSelectedCategory('all')}>
            Todos
          </button>
          <button className={selectedCategory === 'combat' ? 'active' : ''} onClick={() => setSelectedCategory('combat')}>
            ⚔️ Combate
          </button>
          <button className={selectedCategory === 'magic' ? 'active' : ''} onClick={() => setSelectedCategory('magic')}>
            🔮 Magia
          </button>
          <button className={selectedCategory === 'support' ? 'active' : ''} onClick={() => setSelectedCategory('support')}>
            💚 Suporte
          </button>
          <button className={selectedCategory === 'passive' ? 'active' : ''} onClick={() => setSelectedCategory('passive')}>
            ⭐ Passivas
          </button>
        </div>
        
        {/* Grid de habilidades */}
        <div className="skills-grid">
          {filteredSkills.map(skill => {
            const isUnlocked = unlockedSkills.includes(skill.id);
            const canUnlock = !isUnlocked && 
                              skillPoints > 0 && 
                              playerLevel >= skill.requiredLevel &&
                              (!skill.requiredSkill || unlockedSkills.includes(skill.requiredSkill));
            
            return (
              <div key={skill.id} className={`skill-card ${isUnlocked ? 'unlocked' : 'locked'} ${skill.category}`}>
                <div className="skill-icon">{skill.icon}</div>
                <div className="skill-name">{skill.name}</div>
                <div className="skill-description">{skill.description}</div>
                
                <div className="skill-details">
                  {skill.manaCost > 0 && <span>🧪 {skill.manaCost} mana</span>}
                  {skill.cooldown > 0 && <span>⏱️ {skill.cooldown}s</span>}
                  {skill.requiredLevel > 1 && <span>📊 Nível {skill.requiredLevel}</span>}
                </div>
                
                {skill.requiredSkill && !unlockedSkills.includes(skill.requiredSkill) && (
                  <div className="skill-required">
                    ← Requer {skillsList[skill.requiredSkill]?.name}
                  </div>
                )}
                
                {isUnlocked ? (
                  <button className="btn-use" onClick={() => useSkill(skill.id)}>
                    Usar
                  </button>
                ) : (
                  <button 
                    className={`btn-unlock ${canUnlock ? '' : 'disabled'}`}
                    onClick={() => canUnlock && handleUnlock(skill.id)}
                    disabled={!canUnlock}
                  >
                    {canUnlock ? '🔓 Desbloquear' : '🔒 Bloqueado'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="skill-tree-footer">
          <p>💡 Pressione <kbd>K</kbd> para abrir/fechar</p>
          <p>⚡ Use as habilidades com os botões ou teclas de atalho (1,2,3...)</p>
        </div>
      </div>
    </div>
  );
};