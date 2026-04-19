// components/ui/CombatText.jsx
import { useState, useEffect } from 'react';
import './CombatText.css';

export const CombatText = () => {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    const handleDamage = (e) => {
      const { damage, position, isPlayer } = e.detail;
      // Posição fixa na tela para o texto
      const screenX = position?.x || window.innerWidth / 2;
      const screenY = position?.y || window.innerHeight / 3;
      
      addMessage(`${damage}`, { x: screenX, y: screenY }, 'damage');
    };
    
    const handleExp = (e) => {
      const { amount, position } = e.detail;
      const screenX = position?.x || window.innerWidth / 2;
      const screenY = position?.y || window.innerHeight / 2;
      
      addMessage(`+${amount} XP`, { x: screenX, y: screenY }, 'exp');
    };
    
    window.addEventListener('combatDamage', handleDamage);
    window.addEventListener('combatExp', handleExp);
    
    return () => {
      window.removeEventListener('combatDamage', handleDamage);
      window.removeEventListener('combatExp', handleExp);
    };
  }, []);
  
  const addMessage = (text, position, type) => {
    const id = Date.now() + Math.random();
    setMessages(prev => [...prev, { id, text, position, type }]);
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== id));
    }, 1000);
  };
  
  return (
    <div className="combat-text-container">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`combat-text ${msg.type}`}
          style={{
            position: 'fixed',
            left: msg.position.x,
            top: msg.position.y,
            pointerEvents: 'none',
            zIndex: 20000,
          }}
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
};