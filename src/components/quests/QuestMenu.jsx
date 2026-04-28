// components/quests/QuestMenu.jsx
import { useState, useEffect } from 'react';
import useGameStore from '../../hooks/useGameStore';
import useQuestStore, { QuestStatus } from '../../hooks/useQuestStore';
import { QUESTS } from '../../config/quests';
import './QuestMenu.css';

export const QuestMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, completed
  
  const playerQuests = useQuestStore(state => state.playerQuests);
  const abandonQuest = useQuestStore(state => state.abandonQuest);
  const currentScene = useGameStore(state => state.currentScene);
  
  // Tecla J para abrir menu de quests
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'j' || e.key === 'J') {
        setIsOpen(prev => !prev);
        if (!isOpen) setSelectedQuest(null);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSelectedQuest(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);
  
  // Busca informações completas das quests
  const getFullQuestInfo = (questId, questData) => {
    let questInfo = null;
    
    // Procura em todas as cenas
    for (const sceneQuests of Object.values(QUESTS)) {
      const found = sceneQuests.find(q => q.id === questId);
      if (found) {
        questInfo = found;
        break;
      }
    }
    
    return {
      ...questInfo,
      status: questData.status,
      takenAt: questData.takenAt,
      progress: questData.progress
    };
  };
  
  const allQuests = Object.entries(playerQuests).map(([id, data]) => getFullQuestInfo(id, data)).filter(q => q);
  
  const filteredQuests = allQuests.filter(quest => {
    if (filter === 'active') return quest.status === QuestStatus.IN_PROGRESS;
    if (filter === 'completed') return quest.status === QuestStatus.COMPLETED || quest.status === QuestStatus.REWARDED;
    return true;
  });
  
  const handleAbandon = (questId) => {
    if (confirm('Tem certeza que deseja abandonar esta quest? Você perderá todo o progresso.')) {
      abandonQuest(questId);
      setSelectedQuest(null);
    }
  };
  
  const getStatusIcon = (status) => {
    switch(status) {
      case QuestStatus.IN_PROGRESS: return '📜';
      case QuestStatus.COMPLETED: return '✅';
      case QuestStatus.REWARDED: return '🎁';
      default: return '❓';
    }
  };
  
  const getStatusText = (status) => {
    switch(status) {
      case QuestStatus.IN_PROGRESS: return 'Em andamento';
      case QuestStatus.COMPLETED: return 'Concluída';
      case QuestStatus.REWARDED: return 'Recompensada';
      default: return 'Desconhecido';
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="quest-menu-overlay">
      <div className="quest-menu-container">
        <div className="quest-menu-header">
          <h2>📜 Diário de Quests</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>
        
        <div className="quest-menu-filters">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            Todas
          </button>
          <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>
            📜 Em andamento
          </button>
          <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>
            ✅ Concluídas
          </button>
        </div>
        
        <div className="quest-menu-content">
          <div className="quest-list">
            {filteredQuests.length === 0 ? (
              <div className="empty-quests">
                <p>📭 Nenhuma quest encontrada</p>
                <p className="hint">Fale com NPCs para pegar novas quests!</p>
              </div>
            ) : (
              filteredQuests.map(quest => (
                <div
                  key={quest.id}
                  className={`quest-item ${selectedQuest?.id === quest.id ? 'selected' : ''}`}
                  onClick={() => setSelectedQuest(quest)}
                >
                  <div className="quest-icon">{getStatusIcon(quest.status)}</div>
                  <div className="quest-info">
                    <div className="quest-name">{quest.name}</div>
                    <div className="quest-status" style={{ color: quest.status === QuestStatus.IN_PROGRESS ? '#ffaa44' : '#88ff88' }}>
                      {getStatusText(quest.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {selectedQuest && (
            <div className="quest-details-panel">
              <div className="quest-details-header">
                <h3>{selectedQuest.name}</h3>
                <span className="quest-status-badge" style={{ background: selectedQuest.status === QuestStatus.IN_PROGRESS ? '#ffaa44' : '#4caf50' }}>
                  {getStatusText(selectedQuest.status)}
                </span>
              </div>
              
              <p className="quest-details-description">{selectedQuest.longDescription || selectedQuest.description}</p>
              
              <div className="quest-details-requirements">
                <h4>📋 Requisitos:</h4>
                {selectedQuest.type === 'kill' && (
                  <p>⚔️ Derrote {selectedQuest.requirements.amount} {selectedQuest.requirements.enemyType}(s)</p>
                )}
                {selectedQuest.type === 'collect' && (
                  <p>🎒 Encontre {selectedQuest.requirements.amount}x {selectedQuest.requirements.itemId}</p>
                )}
              </div>
              
              <div className="quest-details-rewards">
                <h4>🎁 Recompensas:</h4>
                <ul>
                  <li>✨ +{selectedQuest.reward.exp} XP</li>
                  {selectedQuest.reward.items.map((item, i) => (
                    <li key={i}>🎒 {item}</li>
                  ))}
                </ul>
              </div>
              
              {selectedQuest.status === QuestStatus.IN_PROGRESS && (
                <div className="quest-details-actions">
                  <button className="btn-abandon" onClick={() => handleAbandon(selectedQuest.id)}>
                    🗑️ Abandonar Quest
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="quest-menu-footer">
          <p>💡 Pressione <kbd>J</kbd> para abrir/fechar</p>
          <p>📊 {filteredQuests.filter(q => q.status === QuestStatus.IN_PROGRESS).length} ativas | {filteredQuests.filter(q => q.status === QuestStatus.COMPLETED || q.status === QuestStatus.REWARDED).length} concluídas</p>
        </div>
      </div>
    </div>
  );
};