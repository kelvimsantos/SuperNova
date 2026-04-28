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
  const setEquippedItem = useGameStore(state => state.setEquippedItem);
  const equippedItems = useGameStore(state => state.equippedItems);
  const currentClass = useGameStore(state => state.currentClass);
  
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
    
    // Aplica efeito do item (ex: cura)
    if (item.hpRestore) {
      const healPlayer = useGameStore.getState().healPlayer;
      healPlayer(item.hpRestore);
      console.log(`💚 Recuperou ${item.hpRestore} HP!`);
    }
    
    if (item.manaRestore) {
      const setPlayerMana = useGameStore.getState().setPlayerMana;
      const playerMana = useGameStore.getState().playerMana;
      setPlayerMana(Math.min(playerMana + item.manaRestore, 50));
      console.log(`💙 Recuperou ${item.manaRestore} Mana!`);
    }
    
    // Remove após usar
    if (item.stackable && item.quantity > 1) {
      // TODO: Atualizar quantidade quando tiver stack
    } else {
      removeFromInventory(item.id);
    }
    setSelectedItem(null);
  };
  
  const handleEquip = (item) => {
    console.log(`⚔️ Equipar item: ${item.name}`);
    
    // Verifica se o item tem slot
    if (!item.slot) {
      alert(`❌ ${item.name} não pode ser equipado!`);
      return;
    }
    
    // Verifica se pode equipar baseado na classe (apenas para armas)
    if (item.weaponClass && item.weaponClass !== currentClass) {
      alert(`⚠️ Apenas ${currentClass} pode usar este item!`);
      return;
    }
    
    // Verifica se já tem um item equipado no slot
    const currentEquipped = equippedItems[item.slot];
    if (currentEquipped) {
      // Remove o item atual do equipamento e coloca no inventário
      const confirmed = confirm(`Já tem ${currentEquipped.name} equipado. Deseja substituir?`);
      if (confirmed) {
        // Adiciona o item antigo de volta ao inventário
        useGameStore.getState().addToInventory(currentEquipped);
        // Equipa o novo item
        setEquippedItem(item.slot, item);
        // Remove o novo item do inventário
        removeFromInventory(item.id);
        alert(`✅ ${item.name} equipado!`);
      }
    } else {
      // Equipa o item
      setEquippedItem(item.slot, item);
      // Remove do inventário
      removeFromInventory(item.id);
      alert(`✅ ${item.name} equipado!`);
    }
    
    setSelectedItem(null);
  };
  
  const handleUnequip = (slot, item) => {
    // Adiciona o item de volta ao inventário
    useGameStore.getState().addToInventory(item);
    // Remove do equipamento
    setEquippedItem(slot, null);
    alert(`📦 ${item.name} foi para o inventário!`);
  };
  
  const handleDiscard = (item) => {
    if (confirm(`Deseja descartar ${item.name}?`)) {
      removeFromInventory(item.id);
      setSelectedItem(null);
    }
  };
  
  // Verifica se o item está equipado atualmente
  const isItemEquipped = (item) => {
    return Object.values(equippedItems).some(equipped => equipped?.id === item.id);
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
              inventory.map((item, index) => {
                const isEquipped = isItemEquipped(item);
                return (
                  <div
                    key={item.id}
                    className={`inventory-slot ${selectedItem?.id === item.id ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`}
                    onClick={() => handleItemClick(item)}
                    style={{ borderColor: item.rarity?.color || '#666' }}
                  >
                    <div className="item-icon" style={{ backgroundColor: item.rarity?.color + '22' }}>
                      <span className="icon">{item.icon || '📦'}</span>
                      {item.stackable && item.quantity > 1 && (
                        <span className="quantity">{item.quantity}</span>
                      )}
                      {isEquipped && <span className="equipped-badge">E</span>}
                    </div>
                    <div className="item-name" style={{ color: item.rarity?.color || '#fff' }}>
                      {item.name}
                    </div>
                  </div>
                );
              })
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
                {isItemEquipped(selectedItem) && (
                  <span className="equipped-status">✅ Equipado</span>
                )}
              </div>
              
              <p className="item-description">{selectedItem.description}</p>
              
              {selectedItem.value > 0 && (
                <p className="item-value">💰 Valor: {selectedItem.value} moedas</p>
              )}
              
              {selectedItem.damage && (
                <p className="item-stat">⚔️ Dano: {selectedItem.damage}</p>
              )}
              
              {selectedItem.defense && (
                <p className="item-stat">🛡️ Defesa: {selectedItem.defense}</p>
              )}
              
              {selectedItem.hpRestore && (
                <p className="item-stat">❤️ Restaura: {selectedItem.hpRestore} HP</p>
              )}
              
              {selectedItem.manaRestore && (
                <p className="item-stat">💙 Restaura: {selectedItem.manaRestore} Mana</p>
              )}
              
              {selectedItem.stats && Object.keys(selectedItem.stats).length > 0 && (
                <div className="item-stats-list">
                  <p className="item-stat-title">✨ Atributos:</p>
                  {Object.entries(selectedItem.stats).map(([stat, value]) => (
                    <p key={stat} className="item-stat">+{value} {stat}</p>
                  ))}
                </div>
              )}
              
              <div className="item-actions">
                {selectedItem.hpRestore || selectedItem.manaRestore ? (
                  <button className="btn-use" onClick={() => handleUse(selectedItem)}>
                    Usar
                  </button>
                ) : selectedItem.slot ? (
                  isItemEquipped(selectedItem) ? (
                    <button className="btn-unequip" onClick={() => {
                      const slot = Object.keys(useGameStore.getState().equippedItems).find(
                        s => useGameStore.getState().equippedItems[s]?.id === selectedItem.id
                      );
                      if (slot) handleUnequip(slot, selectedItem);
                    }}>
                      Desequipar
                    </button>
                  ) : (
                    <button className="btn-equip" onClick={() => handleEquip(selectedItem)}>
                      Equipar
                    </button>
                  )
                ) : null}
                <button className="btn-discard" onClick={() => handleDiscard(selectedItem)}>
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Equipamentos atuais */}
        <div className="inventory-equipment-status">
          <h4>⚔️ Equipamentos Atuais</h4>
          <div className="current-equipment">
            {Object.entries(equippedItems).map(([slot, item]) => (
              item && (
                <div key={slot} className="equipment-status-item">
                  <span className="equipment-slot-icon">
                    {slot === 'weapon' && '⚔️'}
                    {slot === 'shield' && '🛡️'}
                    {slot === 'helmet' && '⛑️'}
                    {slot === 'chest' && '👕'}
                    {slot === 'shoulders' && '肩'}
                  </span>
                  <span className="equipment-slot-name">{slot}:</span>
                  <span className="equipment-item-name">{item.name}</span>
                  <button 
                    className="equipment-unequip-btn"
                    onClick={() => handleUnequip(slot, item)}
                  >
                    ✕
                  </button>
                </div>
              )
            ))}
          </div>
        </div>
        
        <div className="inventory-footer">
          <p>📋 {inventory.length} / 20 itens</p>
          <p className="hint">🎭 Estilo: {currentClass} | Pressione <kbd>E</kbd> ou <kbd>I</kbd> para fechar</p>
        </div>
      </div>
    </div>
  );
};