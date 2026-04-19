// hooks/useEnemySpawner.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useEnemySpawner = (initialEnemies, respawnTime = 20000) => {
  const [enemies, setEnemies] = useState(initialEnemies);
  const [deadEnemies, setDeadEnemies] = useState(new Map());
  const respawnTimers = useRef(new Map());

  // Marca um inimigo como morto e agenda respawn
  const killEnemy = useCallback((enemyId) => {
    setEnemies(prev => prev.filter(e => e.id !== enemyId));
    
    // Agenda respawn após o tempo
    const timer = setTimeout(() => {
      respawnEnemy(enemyId);
    }, respawnTime);
    
    respawnTimers.current.set(enemyId, timer);
  }, [respawnTime]);

  // Resspawn de um inimigo específico
  const respawnEnemy = useCallback((enemyId) => {
    const originalEnemy = initialEnemies.find(e => e.id === enemyId);
    if (originalEnemy) {
      setEnemies(prev => [...prev, { ...originalEnemy, id: `${enemyId}-${Date.now()}` }]);
      respawnTimers.current.delete(enemyId);
    }
  }, [initialEnemies]);

  // Resspawn de todos os inimigos (reset da cena)
  const respawnAll = useCallback(() => {
    // Limpa todos os timers
    respawnTimers.current.forEach(timer => clearTimeout(timer));
    respawnTimers.current.clear();
    
    // Recria todos os inimigos
    setEnemies(initialEnemies.map(e => ({ ...e, id: `${e.id}-${Date.now()}` })));
  }, [initialEnemies]);

  // Limpa timers ao desmontar
  useEffect(() => {
    return () => {
      respawnTimers.current.forEach(timer => clearTimeout(timer));
      respawnTimers.current.clear();
    };
  }, []);

  return { enemies, killEnemy, respawnAll };
};