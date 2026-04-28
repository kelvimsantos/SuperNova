// components/quests/QuestDialogGlobal.jsx
import useGameStore from '../../hooks/useGameStore';
import useQuestStore, { QuestStatus } from '../../hooks/useQuestStore';
import { getQuestProgress } from '../../config/quests';
import './QuestDialog.css';

export const QuestDialogGlobal = () => {
  const { 
    showQuestDialog, 
    currentQuest, 
    currentNpcName, 
    currentQuestStatus, 
    closeQuestDialog, 
    startQuest, 
    rewardQuest,
    getQuestStatus
  } = useQuestStore();
  
  const inventory = useGameStore(state => state.inventory);
  const playerKills = useGameStore(state => state.playerKills);
  const addToInventory = useGameStore(state => state.addToInventory);
  const addExp = useGameStore(state => state.addExp);
  
  if (!showQuestDialog || !currentQuest) return null;
  
  // 🔥 Verifica o status real da quest (do store)
  const realStatus = currentQuestStatus || getQuestStatus(currentQuest.id);
  
  const progress = getQuestProgress(currentQuest, { kills: playerKills }, inventory);
  const progressPercent = (progress.current / progress.required) * 100;
  const isComplete = progress.current >= progress.required;
  
  console.log('🔍 Dialog status:', { realStatus, currentQuestStatus, questId: currentQuest?.id });
  
  // PEGAR QUEST
  const handleAcceptQuest = () => {
    startQuest(currentQuest.id);
    closeQuestDialog();
    console.log(`📜 Quest aceita: ${currentQuest.name}`);
  };
  
  // RECEBER RECOMPENSA
  const handleClaimReward = () => {
    if (isComplete) {
      addExp(currentQuest.reward.exp);
      currentQuest.reward.items.forEach(itemId => {
        addToInventory({ id: itemId, quantity: 1 });
      });
      rewardQuest(currentQuest.id);
      closeQuestDialog();
      console.log(`🎁 Recompensa recebida: ${currentQuest.name}`);
    }
  };
  
  // FECHAR
  const handleClose = () => {
    closeQuestDialog();
  };
  
  // 🔥 DECIDE QUAL BOTÃO MOSTRAR
  const renderButtons = () => {
    // Caso 1: Quest NÃO foi pega ainda
    if (realStatus === QuestStatus.NOT_STARTED || realStatus === undefined) {
      return (
        <button className="btn-accept" onClick={handleAcceptQuest}>
          📜 Aceitar Quest
        </button>
      );
    }
    
    // Caso 2: Quest em andamento
    if (realStatus === QuestStatus.IN_PROGRESS) {
      return (
        <button className="btn-close" onClick={handleClose}>
          Fechar
        </button>
      );
    }
    
    // Caso 3: Quest concluída (aguardando recompensa)
    if (realStatus === QuestStatus.COMPLETED || (realStatus === QuestStatus.IN_PROGRESS && isComplete)) {
      return (
        <button className="btn-claim" onClick={handleClaimReward}>
          🎁 Receber Recompensa!
        </button>
      );
    }
    
    // Caso padrão
    return (
      <button className="btn-close" onClick={handleClose}>
        Fechar
      </button>
    );
  };
  
  return (
    <div className="quest-dialog-overlay" onClick={handleClose}>
      <div className="quest-dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="quest-dialog-header">
          <h2>📜 {currentNpcName}</h2>
          <button className="close-btn" onClick={handleClose}>✕</button>
        </div>
        
        <div className="quest-dialog-content">
          <div className="quest-icon">
            {currentQuest.type === 'kill' && '⚔️'}
            {currentQuest.type === 'collect' && '🎒'}
          </div>
          
          <h3 className="quest-name">{currentQuest.name}</h3>
          <p className="quest-description">{currentQuest.longDescription || currentQuest.description}</p>
          
          {/* Mostra progresso se a quest estiver em andamento ou concluída */}
          {(realStatus === QuestStatus.IN_PROGRESS || realStatus === QuestStatus.COMPLETED) && (
            <>
              <div className="quest-progress-section">
                <div className="quest-progress-header">
                  <span>📊 Progresso</span>
                  <span>{progress.current} / {progress.required}</span>
                </div>
                <div className="quest-progress-bar">
                  <div className="quest-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              
              <div className="quest-requirements">
                <h4>📋 Requisitos:</h4>
                {currentQuest.type === 'kill' && (
                  <p>⚔️ Derrote {currentQuest.requirements.amount} {currentQuest.requirements.enemyType}(s)</p>
                )}
                {currentQuest.type === 'collect' && (
                  <p>🎒 Encontre {currentQuest.requirements.amount}x {currentQuest.requirements.itemId}</p>
                )}
              </div>
            </>
          )}
          
          <div className="quest-rewards">
            <h4>🎁 Recompensas:</h4>
            <ul>
              <li>✨ +{currentQuest.reward.exp} XP</li>
              {currentQuest.reward.items.map((item, i) => (
                <li key={i}>🎒 {item}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="quest-dialog-footer">
          {renderButtons()}
        </div>
      </div>
    </div>
  );
};