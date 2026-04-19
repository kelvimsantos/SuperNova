// components/ui/RPGUI.jsx
import { useState, useEffect } from 'react';
import useGameStore from '../../hooks/useGameStore';
import './RPGUI.css';

export const RPGUI = () => {
  const playerHealth = useGameStore(state => state.playerHealth);
  const playerMaxHealth = useGameStore(state => state.playerMaxHealth);
  const playerMana = useGameStore(state => state.playerMana);
  const playerMaxMana = useGameStore(state => state.playerMaxMana);
  const playerLevel = useGameStore(state => state.playerLevel);
  const playerExp = useGameStore(state => state.playerExp);
  const expToNextLevel = useGameStore(state => state.expToNextLevel);
  const skillPoints = useGameStore(state => state.skillPoints);
  const [levelUpEffect, setLevelUpEffect] = useState(false);
  const [healthFlash, setHealthFlash] = useState(false);
  const [manaFlash, setManaFlash] = useState(false);
  const [lastHealth, setLastHealth] = useState(playerHealth);
  const [lastMana, setLastMana] = useState(playerMana);
  
  const healthPercent = (playerHealth / playerMaxHealth) * 100;
  const manaPercent = (playerMana / playerMaxMana) * 100;
  const expPercent = (playerExp / expToNextLevel) * 100;
  
  // Efeito de flash quando leva dano ou cura
  useEffect(() => {
    if (playerHealth < lastHealth) {
      setHealthFlash(true);
      setTimeout(() => setHealthFlash(false), 300);
    }
    setLastHealth(playerHealth);
  }, [playerHealth]);
  
  useEffect(() => {
    if (playerMana < lastMana) {
      setManaFlash(true);
      setTimeout(() => setManaFlash(false), 300);
    }
    setLastMana(playerMana);
  }, [playerMana]);
  
  // Level up effect
  useEffect(() => {
    const handleLevelUp = () => {
      setLevelUpEffect(true);
      setTimeout(() => setLevelUpEffect(false), 2000);
    };
    
    window.addEventListener('playerLevelUp', handleLevelUp);
    return () => window.removeEventListener('playerLevelUp', handleLevelUp);
  }, []);
  
  return (
    <div className="rpg-ui">
      {/* Level up notification */}
      {levelUpEffect && (
        <div className="level-up-notification">
          <div className="level-up-glow" />
          <span>🎉 LEVEL UP! 🎉</span>
          <span className="level-up-points">+1 Ponto de Habilidade</span>
        </div>
      )}
      
      {/* Player portrait and level */}
      <div className="player-portrait">
        <div className="portrait-frame">
          <div className="portrait-icon">⚔️</div>
          <div className="level-badge">{playerLevel}</div>
          {skillPoints > 0 && <div className="skill-points-badge">⭐ {skillPoints}</div>}
        </div>
      </div>
      
      {/* Health Bar */}
      <div className="stat-bar-container">
        <div className="stat-bar-header">
          <span className="stat-icon">❤️</span>
          <span className="stat-value">{Math.floor(playerHealth)}/{playerMaxHealth}</span>
        </div>
        <div className={`stat-bar health-bar ${healthFlash ? 'flash' : ''}`}>
          <div className="stat-bar-fill health-fill" style={{ width: `${healthPercent}%` }}>
            <div className="bar-glow" />
          </div>
        </div>
      </div>
      
      {/* Mana Bar */}
      <div className="stat-bar-container">
        <div className="stat-bar-header">
          <span className="stat-icon">💙</span>
          <span className="stat-value">{Math.floor(playerMana)}/{playerMaxMana}</span>
        </div>
        <div className={`stat-bar mana-bar ${manaFlash ? 'flash' : ''}`}>
          <div className="stat-bar-fill mana-fill" style={{ width: `${manaPercent}%` }}>
            <div className="bar-glow" />
          </div>
        </div>
      </div>
      
      {/* XP Bar */}
      <div className="xp-bar-container">
        <div className="xp-bar-header">
          <span className="xp-icon">⭐</span>
          <span className="xp-value">{playerExp}/{expToNextLevel} XP</span>
        </div>
        <div className="xp-bar">
          <div className="xp-bar-fill" style={{ width: `${expPercent}%` }}>
            <div className="xp-glow" />
          </div>
        </div>
      </div>
    </div>
  );
};