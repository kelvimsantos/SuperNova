// components/ui/SkillBar.jsx
import { useState, useEffect } from 'react';
import useGameStore from '../../hooks/useGameStore';
import './SkillBar.css';

const SKILLS = [
  { id: 'heavy_attack', name: 'Ataque Pesado', icon: '⚔️', manaCost: 20, cooldown: 3, key: '1' },
  { id: 'double_strike', name: 'Golpe Duplo', icon: '🗡️', manaCost: 15, cooldown: 4, key: '2' },
  { id: 'fireball', name: 'Bola de Fogo', icon: '🔥', manaCost: 25, cooldown: 4, key: '3' },
  { id: 'ice_bolt', name: 'Raio de Gelo', icon: '❄️', manaCost: 30, cooldown: 6, key: '4' },
  { id: 'heal', name: 'Cura', icon: '💚', manaCost: 30, cooldown: 8, key: '5' },
  { id: 'shield', name: 'Escudo', icon: '🛡️', manaCost: 20, cooldown: 10, key: '6' },
];

export const SkillBar = () => {
  const [cooldowns, setCooldowns] = useState({});
  const [activeBuffs, setActiveBuffs] = useState([]);
  const unlockedSkills = useGameStore(state => state.unlockedSkills || []);
  const playerMana = useGameStore(state => state.playerMana);
  const playerHealth = useGameStore(state => state.playerHealth);
  const healPlayer = useGameStore(state => state.healPlayer);
  const setPlayerMana = useGameStore(state => state.setPlayerMana);
  
  // Atualiza cooldowns
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const newCooldowns = {};
        Object.keys(prev).forEach(key => {
          if (prev[key] > 0) {
            newCooldowns[key] = Math.max(0, prev[key] - 0.1);
          }
        });
        return newCooldowns;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  const useSkill = (skill) => {
    if (!unlockedSkills.includes(skill.id)) {
      console.log(`❌ ${skill.name} não desbloqueada!`);
      return;
    }
    
    if (cooldowns[skill.id] > 0) {
      console.log(`⏱️ ${skill.name} em cooldown: ${cooldowns[skill.id].toFixed(1)}s`);
      return;
    }
    
    if (playerMana < skill.manaCost) {
      console.log(`❌ Mana insuficiente! (${playerMana}/${skill.manaCost})`);
      return;
    }
    
    // Usa a skill
    setPlayerMana(playerMana - skill.manaCost);
    setCooldowns(prev => ({ ...prev, [skill.id]: skill.cooldown }));
    
    if (skill.id === 'heal') {
      healPlayer(50);
      console.log(`💚 Curou 50 HP!`);
      
      // Adiciona buff visual
      setActiveBuffs(prev => [...prev, { id: Date.now(), name: 'Cura', icon: '💚', duration: 2 }]);
      setTimeout(() => {
        setActiveBuffs(prev => prev.filter(b => b.id !== Date.now()));
      }, 2000);
    }
    
    console.log(`✨ Usou: ${skill.name}`);
  };
  
  return (
    <div className="skill-bar">
      {SKILLS.map(skill => {
        const isUnlocked = unlockedSkills.includes(skill.id);
        const isOnCooldown = cooldowns[skill.id] > 0;
        const hasMana = playerMana >= skill.manaCost;
        const canUse = isUnlocked && !isOnCooldown && hasMana;
        
        let cooldownPercent = 0;
        if (isOnCooldown) {
          cooldownPercent = (cooldowns[skill.id] / skill.cooldown) * 100;
        }
        
        return (
          <div
            key={skill.id}
            className={`skill-slot ${!isUnlocked ? 'locked' : ''} ${isOnCooldown ? 'cooldown' : ''}`}
            onClick={() => useSkill(skill)}
          >
            <div className="skill-icon">{skill.icon}</div>
            <div className="skill-key">{skill.key}</div>
            <div className="skill-name">{skill.name}</div>
            <div className="skill-mana">🧪 {skill.manaCost}</div>
            
            {!isUnlocked && <div className="skill-locked-overlay">🔒</div>}
            
            {isOnCooldown && (
              <div className="skill-cooldown-overlay">
                <div className="skill-cooldown-fill" style={{ height: `${cooldownPercent}%` }} />
                <div className="skill-cooldown-text">{Math.ceil(cooldowns[skill.id])}</div>
              </div>
            )}
            
            {isUnlocked && !isOnCooldown && !hasMana && (
              <div className="skill-no-mana">💙</div>
            )}
          </div>
        );
      })}
      
      {/* Buffs ativos */}
      <div className="active-buffs">
        {activeBuffs.map(buff => (
          <div key={buff.id} className="buff-icon">
            <span>{buff.icon}</span>
            <div className="buff-duration">
              <div className="buff-duration-fill" style={{ animation: `shrink ${buff.duration}s linear` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};