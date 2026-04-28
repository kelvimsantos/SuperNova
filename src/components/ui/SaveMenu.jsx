// components/ui/SaveMenu.jsx
import { useState, useEffect } from 'react';
import { useSaveSystem } from '../../hooks/useSaveSystem';
import './SaveMenu.css';

export const SaveMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    saveGame, 
    loadGameData, 
    applySaveToGame, 
    deleteSave, 
    hasSave, 
    getSaveInfo, 
    exportSave, 
    importSave 
  } = useSaveSystem();
  
  const [saveInfo, setSaveInfo] = useState(null);

  useEffect(() => {
    if (hasSave()) {
      const info = getSaveInfo();
      setSaveInfo(info);
    }
  }, [isOpen, hasSave, getSaveInfo]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Nunca';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // 🔥 FUNÇÃO PARA CARREGAR O SAVE
  const handleLoadGame = () => {
    const saveData = loadGameData();
    if (saveData) {
      const success = applySaveToGame(saveData);
      if (success) {
        alert('✅ Jogo carregado com sucesso! A página será recarregada.');
        setTimeout(() => window.location.reload(), 500);
      } else {
        alert('❌ Erro ao carregar o save.');
      }
    } else {
      alert('❌ Nenhum save encontrado!');
    }
    setIsOpen(false);
  };

  // 🔥 FUNÇÃO PARA SALVAR
  const handleSaveGame = () => {
    const success = saveGame();
    if (success) {
      alert('💾 Jogo salvo com sucesso!');
      const info = getSaveInfo();
      setSaveInfo(info);
    } else {
      alert('❌ Erro ao salvar o jogo.');
    }
    setIsOpen(false);
  };

  // 🔥 FUNÇÃO PARA DELETAR SAVE
  const handleDeleteSave = () => {
    if (confirm('Tem certeza? Isso irá deletar todo o progresso!')) {
      deleteSave();
      setSaveInfo(null);
      alert('🗑️ Save deletado!');
      setIsOpen(false);
    }
  };

  // 🔥 FUNÇÃO PARA EXPORTAR
  const handleExportSave = () => {
    exportSave();
    alert('📤 Save exportado!');
    setIsOpen(false);
  };

  // 🔥 FUNÇÃO PARA IMPORTAR
  const handleImportSave = (e) => {
    if (e.target.files[0]) {
      importSave(e.target.files[0])
        .then(() => {
          alert('📥 Save importado! Recarregue a página para aplicar.');
          setTimeout(() => window.location.reload(), 500);
        })
        .catch(() => alert('❌ Erro ao importar save!'));
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="save-menu-overlay">
      <div className="save-menu-container">
        <div className="save-menu-header">
          <h2>💾 Sistema de Save</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>
        
        <div className="save-menu-content">
          <div className="save-info">
            <h3>📊 Informações do Save</h3>
            <p>📅 Último save: {formatDate(saveInfo?.timestamp)}</p>
            <p>⭐ Nível: {saveInfo?.player?.level || 1}</p>
            <p>🗺️ Cena: {saveInfo?.player?.currentScene || 'default'}</p>
            <p>🎒 Itens: {saveInfo?.inventory?.length || 0}</p>
          </div>
          
          <div className="save-buttons">
            <button className="btn-save" onClick={handleSaveGame}>
              💾 Salvar Jogo
            </button>
            
            <button className="btn-load" onClick={handleLoadGame}>
              📀 Carregar Jogo
            </button>
            
            <button className="btn-export" onClick={handleExportSave}>
              📤 Exportar Save
            </button>
            
            <label className="btn-import">
              📥 Importar Save
              <input
                type="file"
                accept=".json"
                onChange={handleImportSave}
                style={{ display: 'none' }}
              />
            </label>
            
            <button className="btn-delete" onClick={handleDeleteSave}>
              🗑️ Deletar Save
            </button>
          </div>
        </div>
        
        <div className="save-menu-footer">
          <p>💡 Pressione <kbd>F5</kbd> para abrir/fechar</p>
          <p>⚠️ Carregar um save irá recarregar a página</p>
        </div>
      </div>
    </div>
  );
};