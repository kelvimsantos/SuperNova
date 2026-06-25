// components/ui/GameInfo.jsx
import { useState, useEffect } from 'react';
import useGameStore from '../../hooks/useGameStore';
import './GameInfo.css';
import { ConfigWaterMenu } from './ConfigWaterMenu';

const WaterSettingsInline = () => {
  // evita usar portal aqui; o menu abre em overlay se precisar
  const [show, setShow] = useState(true);
  if (!show) return null;
  return <ConfigWaterMenu onClose={() => setShow(false)} />;
};


export const GameInfo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('controls');
  
  const playerLevel = useGameStore(state => state.playerLevel);
  const playerExp = useGameStore(state => state.playerExp);
  const expToNextLevel = useGameStore(state => state.expToNextLevel);
  const skillPoints = useGameStore(state => state.skillPoints);
  const unlockedSkills = useGameStore(state => state.unlockedSkills || []);
  const inventory = useGameStore(state => state.inventory);
  
  // Fecha com ESC
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);
  
  // Calcula progresso
  const expPercent = (playerExp / expToNextLevel) * 100;
  
  return (
    <>
      {/* Botão para abrir/fechar */}
      <button 
        className={`game-info-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="toggle-icon">{isOpen ? '✕' : '📖'}</span>
        <span className="toggle-text">Informações</span>
      </button>
      
      {/* Painel de informações */}
      {isOpen && (
        <div className="game-info-panel">
          <div className="panel-header">
            <h3>📖 Informações do Jogo</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          {/* Tabs */}
          <div className="panel-tabs">
            <button 
              className={activeTab === 'controls' ? 'active' : ''}
              onClick={() => setActiveTab('controls')}
            >
              🎮 Controles
            </button>
            <button 
              className={activeTab === 'player' ? 'active' : ''}
              onClick={() => setActiveTab('player')}
            >
              🧙‍♂️ Jogador
            </button>
            <button 
              className={activeTab === 'skills' ? 'active' : ''}
              onClick={() => setActiveTab('skills')}
            >
              🌳 Habilidades
            </button>
            <button 
              className={activeTab === 'items' ? 'active' : ''}
              onClick={() => setActiveTab('items')}
            >
              🎒 Itens
            </button>
            <button 
              className={activeTab === 'water' ? 'active' : ''}
              onClick={() => setActiveTab('water')}
            >
              💧 Água
            </button>
            
            <button 
              className={activeTab === 'tips' ? 'active' : ''}
              onClick={() => setActiveTab('tips')}
            >
              💡 Dicas
            </button>
          </div>
          
          <div className="panel-content">
            {/* Aba: Controles */}
            {activeTab === 'controls' && (
              <div className="tab-content">
                <h4>🎮 Teclas de Atalho</h4>
                <table className="info-table">
                  <tr><td><kbd>W/A/S/D</kbd></td><td>Movimentar personagem</td></tr>
                  <tr><td><kbd>Mouse</kbd></td><td>Olhar ao redor</td></tr>
                  <tr><td><kbd>Clique</kbd></td><td>Atacar inimigo</td></tr>
                  <tr><td><kbd>1</kbd> a <kbd>6</kbd></td><td>Usar habilidades</td></tr>
                  <tr><td><kbd>R</kbd></td><td>Ataque Rápido</td></tr>
                  <tr><td><kbd>Q</kbd></td><td>Menu Camera</td></tr>
                  <tr><td><kbd>T</kbd></td><td>Trovão</td></tr>
                  <tr><td><kbd>Y</kbd></td><td>Bênção de Yggdrasil</td></tr>
                  <tr><td><kbd>E</kbd> ou <kbd>I</kbd></td><td>Abrir inventário</td></tr>
                  <tr><td><kbd>K</kbd></td><td>Abrir árvore de habilidades</td></tr>
                  <tr><td><kbd>ESC</kbd></td><td>Fechar janelas</td></tr>
                </table>
                
                <h4>🖱️ Controles Mobile</h4>
                <table className="info-table">
                  <tr><td>Joystick Esquerdo</td><td>Movimentar</td></tr>
                  <tr><td>Joystick Direito</td><td>Olhar</td></tr>
                  <tr><td>Botão de Ataque</td><td>Atacar inimigos</td></tr>
                </table>
              </div>
            )}
            
            {/* Aba: Jogador */}
            {activeTab === 'player' && (
              <div className="tab-content">
                <h4>🧙‍♂️ Status do Jogador</h4>
                <div className="player-stats">
                  <div className="stat-row">
                    <span>⭐ Nível:</span>
                    <span className="stat-value">{playerLevel}</span>
                  </div>
                  <div className="stat-row">
                    <span>📊 XP:</span>
                    <span className="stat-value">{playerExp} / {expToNextLevel}</span>
                  </div>
                  <div className="exp-bar-mini">
                    <div className="exp-fill-mini" style={{ width: `${expPercent}%` }} />
                  </div>
                  <div className="stat-row">
                    <span>🔰 Pontos de Habilidade:</span>
                    <span className="stat-value">{skillPoints}</span>
                  </div>
                  <div className="stat-row">
                    <span>🔓 Habilidades desbloqueadas:</span>
                    <span className="stat-value">{unlockedSkills.length} / 8</span>
                  </div>
                  <div className="stat-row">
                    <span>🎒 Itens no inventário:</span>
                    <span className="stat-value">{inventory.length}</span>
                  </div>
                </div>
                
                <h4>⚔️ Atributos</h4>
                <table className="info-table">
                  <tr><td>❤️ Vida</td><td>100 / 100</td></tr>
                  <tr><td>💙 Mana</td><td>50 / 50</td></tr>
                  <tr><td>⚔️ Dano base</td><td>15</td></tr>
                </table>
              </div>
            )}
            
            {/* Aba: Habilidades */}
            {activeTab === 'skills' && (
              <div className="tab-content">
                <h4>🌳 Habilidades Disponíveis</h4>
                <table className="info-table">
                  <tr><th>Tecla</th><th>Habilidade</th><th>Mana</th><th>Cooldown</th><th>Status</th></tr>
                  <tr className={unlockedSkills.includes('heavy_attack') ? 'unlocked' : 'locked'}>
                    <td><kbd>1</kbd></td><td>⚔️ Ataque Pesado</td><td>20</td><td>3s</td>
                    <td>{unlockedSkills.includes('heavy_attack') ? '✅' : '🔒'}</td>
                  </tr>
                  <tr className={unlockedSkills.includes('double_strike') ? 'unlocked' : 'locked'}>
                    <td><kbd>2</kbd></td><td>🗡️ Golpe Duplo</td><td>15</td><td>4s</td>
                    <td>{unlockedSkills.includes('double_strike') ? '✅' : '🔒'}</td>
                  </tr>
                  <tr className={unlockedSkills.includes('fireball') ? 'unlocked' : 'locked'}>
                    <td><kbd>3</kbd></td><td>🔥 Bola de Fogo</td><td>25</td><td>4s</td>
                    <td>{unlockedSkills.includes('fireball') ? '✅' : '🔒'}</td>
                  </tr>
                  <tr className={unlockedSkills.includes('ice_bolt') ? 'unlocked' : 'locked'}>
                    <td><kbd>4</kbd></td><td>❄️ Raio de Gelo</td><td>30</td><td>6s</td>
                    <td>{unlockedSkills.includes('ice_bolt') ? '✅' : '🔒'}</td>
                  </tr>
                  <tr className={unlockedSkills.includes('heal') ? 'unlocked' : 'locked'}>
                    <td><kbd>5</kbd></td><td>💚 Cura</td><td>30</td><td>8s</td>
                    <td>{unlockedSkills.includes('heal') ? '✅' : '🔒'}</td>
                  </tr>
                  <tr className={unlockedSkills.includes('shield') ? 'unlocked' : 'locked'}>
                    <td><kbd>6</kbd></td><td>🛡️ Escudo</td><td>20</td><td>10s</td>
                    <td>{unlockedSkills.includes('shield') ? '✅' : '🔒'}</td>
                  </tr>
                </table>
                <p className="skill-note">💡 Desbloqueie habilidades na Árvore de Habilidades (Tecla <kbd>K</kbd>)</p>
              </div>
            )}
            
            {/* Aba: Itens */}
            {activeTab === 'items' && (
              <div className="tab-content">
                <h4>🎒 Tipos de Itens</h4>
                <table className="info-table">
                  <tr><td>💊 Poção de Vida</td><td>Restaura 50 de HP</td><td>Comum</td></tr>
                  <tr><td>🪙 Moeda de Ouro</td><td>Vale 100 moedas</td><td>Comum</td></tr>
                  <tr><td>🔑 Chave Antiga</td><td>Item de quest</td><td>Raro</td></tr>
                  <tr><td>🦂 Cauda de Escorpião</td><td>Item de venda</td><td>Incomum</td></tr>
                  <tr><td>🪸 Pérola</td><td>Item valioso</td><td>Raro</td></tr>
                </table>
                
                <h4>📦 Como obter itens:</h4>
                <ul>
                  <li>🐉 Derrote inimigos - eles dropam itens</li>
                  <li>📦 Colete itens brilhantes no chão</li>
                  <li>🗺️ Explore diferentes cenas para encontrar itens únicos</li>
                </ul>
              </div>
            )}
            
            {/* Aba: Água */}
            {activeTab === 'water' && (
              <div className="tab-content">
                <h4>💧 Configurações de Água</h4>
                <div style={{ marginBottom: 12, opacity: 0.9, fontSize: 12 }}>
                  Ajuste para performance no celular.
                </div>
                <WaterSettingsInline />

                {/* debug avatar equipment transform */}
                <div style={{ height: 14 }} />
                <h4>🛠️ Debug Equip (Avatar)</h4>
                <div style={{ fontSize: 12, opacity: .9, marginBottom: 8 }}>
                  Ajuste posição/rotação/escala e copie o JSON.
                </div>
                {/* Import local */}
                <EquipmentTransformTester />
              </div>
            )}

            {/* Aba: Dicas */}
            {activeTab === 'tips' && (
              <div className="tab-content">
                <h4>💡 Dicas e Estratégias</h4>

                <ul className="tips-list">
                  <li>🔍 <strong>Aproxime-se dos inimigos</strong> para poder atacar (anel verde)</li>
                  <li>💚 <strong>Use a habilidade Cura (Tecla 5)</strong> quando estiver com pouca vida</li>
                  <li>⭐ <strong>Ganhe XP derrotando inimigos</strong> para subir de nível</li>
                  <li>🔓 <strong>Use pontos de habilidade</strong> na árvore de habilidades (Tecla K)</li>
                  <li>🎒 <strong>Colete itens</strong> para usar poções e vender por moedas</li>
                  <li>🗺️ <strong>Use portais roxos</strong> para viajar entre mapas</li>
                  <li>⚔️ <strong>Ative habilidades</strong> durante o combate para mais dano</li>
                  <li>🌙 <strong>O clima e a hora do dia</strong> podem mudar automaticamente</li>
                </ul>
                
                <h4>🎯 Próximos Passos</h4>
                <ul>
                  <li>⚔️ Derrote slimes para ganhar XP</li>
                  <li>⭐ Suba de nível e desbloqueie habilidades</li>
                  <li>🗺️ Explore novas cenas através dos portais</li>
                  <li>🎒 Colete itens raros e complete sua coleção</li>
                </ul>
              </div>
            )}
          </div>
          
          <div className="panel-footer">
            <span>📖 RPG Game v1.0</span>
            <span>🎮 Pressione <kbd>ESC</kbd> para fechar</span>
          </div>
        </div>
      )}
    </>
  );
};