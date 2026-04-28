// components/equipment/EquipmentPanel.jsx
import { useState, useEffect } from 'react';
import useGameStore from '../../hooks/useGameStore';
import { EQUIPMENT_SLOTS } from '../equipment/EquipmentSlot';
import { PlayerClass } from '../inventory/ItemTypes';
import './EquipmentPanel.css'

export const EquipmentPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const equippedItems = useGameStore(state => state.equippedItems);
  const setEquippedItem = useGameStore(state => state.setEquippedItem);
  const unequipItem = useGameStore(state => state.unequipItem);
  const currentClass = useGameStore(state => state.currentClass);
  const setCurrentClass = useGameStore(state => state.setCurrentClass);
  const inventory = useGameStore(state => state.inventory);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // Tecla P para abrir equipamento
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'p' || e.key === 'P') {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  const handleEquip = (item, slot) => {
    // Verifica se pode equipar baseado na classe
    if (item.weaponClass && item.weaponClass !== currentClass) {
      alert(`⚠️ Apenas ${PlayerClass[currentClass.toUpperCase()]?.name} pode usar este item!`);
      return;
    }
    
    setEquippedItem(slot, item);
    // Remove do inventário
    // removeFromInventory(item.id);
    setSelectedSlot(null);
  };
  
  const handleUnequip = (slot) => {
    unequipItem(slot);
  };
  
  const getItemsForSlot = (slot) => {
    return inventory.filter(item => item.slot === slot);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="equipment-overlay">
      <div className="equipment-container">
        <div className="equipment-header">
          <h2>⚔️ Equipamento</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>
        
        {/* Seletor de Classe */}
        <div className="class-selector">
          <h4>🎭 Estilo de Jogo</h4>
          <div className="class-buttons">
            {Object.values(PlayerClass).map(cls => (
              <button
                key={cls.id}
                className={`class-btn ${currentClass === cls.id ? 'active' : ''}`}
                onClick={() => setCurrentClass(cls.id)}
              >
                <span className="class-icon">{cls.icon}</span>
                <span className="class-name">{cls.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Slots de Equipamento */}
        <div className="equipment-slots">
          {EQUIPMENT_SLOTS.map(slot => {
            const equipped = equippedItems[slot.id];
            return (
              <div 
                key={slot.id}
                className={`equipment-slot ${selectedSlot === slot.id ? 'selected' : ''}`}
                onClick={() => setSelectedSlot(slot.id)}
              >
                <div className="slot-icon">{slot.icon}</div>
                <div className="slot-name">{slot.name}</div>
                {equipped ? (
                  <div className="slot-equipped">
                    <span className="equipped-icon">{equipped.icon}</span>
                    <span className="equipped-name">{equipped.name}</span>
                    <button 
                      className="unequip-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnequip(slot.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="slot-empty">Vazio</div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Painel de itens disponíveis para o slot selecionado */}
        {selectedSlot && (
          <div className="available-items">
            <h4>📦 Itens disponíveis para {EQUIPMENT_SLOTS.find(s => s.id === selectedSlot)?.name}</h4>
            <div className="items-grid">
              {getItemsForSlot(selectedSlot).map(item => (
                <div 
                  key={item.id}
                  className={`item-card ${item.weaponClass === currentClass ? '' : 'incompatible'}`}
                  onClick={() => handleEquip(item, selectedSlot)}
                >
                  <div className="item-icon">{item.icon}</div>
                  <div className="item-name">{item.name}</div>
                  {item.stats && (
                    <div className="item-stats">
                      {Object.entries(item.stats).map(([stat, value]) => (
                        <span key={stat}>+{value} {stat}</span>
                      ))}
                    </div>
                  )}
                  {item.weaponClass && item.weaponClass !== currentClass && (
                    <div className="item-warning">⚠️ Classe diferente</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="equipment-footer">
          <p>💡 Pressione <kbd>P</kbd> para abrir/fechar</p>
          <p>⚔️ Seu estilo define quais armas você pode usar</p>
        </div>
      </div>
    </div>
  );
};