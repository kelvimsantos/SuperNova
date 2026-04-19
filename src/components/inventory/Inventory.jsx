// components/inventory/Inventory.jsx
import { useState, useEffect } from 'react';
import useGameStore from '../../hooks/useGameStore';
import { ItemRarity } from './ItemTypes';
import './Inventory.css';

export const Inventory = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const inventory = useGameStore(state => state.inventory);
  const removeFromInventory = useGameStore(state => state.removeFromInventory);
  
  // Tecla E para abrir/fechar
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'e' || e.key === 'E') {
        setIsOpen(prev => !prev);
        if (!isOpen) setSelectedItem(null);
      }
      
      // Fecha com ESC
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSelectedItem(null);
      }
    };
    
    // Evento para abrir via tecla I ou outro sistema
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };
    
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('toggleInventory', handleToggle);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('toggleInventory', handleToggle);
    };
  }, [isOpen]);
  
  const handleItemClick = (item) => {
    setSelectedItem(selectedItem?.id === item.id ? null : item);
  };
  
  const handleUse = (item) => {
    console.log(`🔧 Usar item: ${item.name}`);
    
    // Remove se for consumível
    if (item.stackable && item.quantity > 1) {
      // Atualizar quantidade
    } else {
      removeFromInventory(item.id);
    }
    setSelectedItem(null);
  };
  
  const handleEquip = (item) => {
    console.log(`⚔️ Equipar item: ${item.name}`);
    // Lógica de equipar
  };
  
  const handleDiscard = (item) => {
    if (confirm(`Deseja descartar ${item.name}?`)) {
      removeFromInventory(item.id);
      setSelectedItem(null);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="inventory-overlay">
      <div className="inventory-container">
        <div className="inventory-header">
          <h2>🎒 Inventário</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>
        
        <div className="inventory-content">
          {/* Slots do inventário */}
          <div className="inventory-slots">
            {inventory.length === 0 ? (
              <div className="empty-inventory">
                <p>📦 Inventário vazio</p>
                <p className="hint">Aproxime-se de itens para coletá-los</p>
              </div>
            ) : (
              inventory.map((item, index) => (
                <div
                  key={item.id}
                  className={`inventory-slot ${selectedItem?.id === item.id ? 'selected' : ''}`}
                  onClick={() => handleItemClick(item)}
                  style={{ borderColor: item.rarity?.color || '#666' }}
                >
                  <div className="item-icon" style={{ backgroundColor: item.rarity?.color + '22' }}>
                    <span className="icon">{item.icon || '📦'}</span>
                    {item.stackable && item.quantity > 1 && (
                      <span className="quantity">{item.quantity}</span>
                    )}
                  </div>
                  <div className="item-name" style={{ color: item.rarity?.color || '#fff' }}>
                    {item.name}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Painel de informações do item selecionado */}
          {selectedItem && (
            <div className="item-details">
              <div className="item-details-header">
                <span className="item-details-icon">{selectedItem.icon || '📦'}</span>
                <h3 style={{ color: selectedItem.rarity?.color || '#fff' }}>
                  {selectedItem.name}
                </h3>
                <span className="item-rarity" style={{ color: selectedItem.rarity?.color || '#fff' }}>
                  {selectedItem.rarity?.name || 'Comum'}
                </span>
              </div>
              
              <p className="item-description">{selectedItem.description}</p>
              
              {selectedItem.value > 0 && (
                <p className="item-value">💰 Valor: {selectedItem.value} moedas</p>
              )}
              
              {selectedItem.damage && (
                <p className="item-stat">⚔️ Dano: {selectedItem.damage}</p>
              )}
              
              {selectedItem.hpRestore && (
                <p className="item-stat">❤️ Restaura: {selectedItem.hpRestore} HP</p>
              )}
              
              <div className="item-actions">
                {selectedItem.type !== 'weapon' && selectedItem.type !== 'armor' && (
                  <button className="btn-use" onClick={() => handleUse(selectedItem)}>
                    Usar
                  </button>
                )}
                {(selectedItem.type === 'weapon' || selectedItem.type === 'armor') && (
                  <button className="btn-equip" onClick={() => handleEquip(selectedItem)}>
                    Equipar
                  </button>
                )}
                <button className="btn-discard" onClick={() => handleDiscard(selectedItem)}>
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="inventory-footer">
          <p>📋 {inventory.length} / 20 itens</p>
          <p className="hint">Pressione <kbd>E</kbd> ou <kbd>I</kbd> para fechar</p>
        </div>
      </div>
    </div>
  );
};