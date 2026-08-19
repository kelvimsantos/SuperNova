// components/MenuScreen.jsx
import { useState, useEffect } from 'react';
import { useSaveSystem } from '../hooks/useSaveSystem';
import { GraphicsSettings } from './ui/GraphicsSettings';
import './MenuScreen.css';

export const MenuScreen = ({ onStartNewGame, onLoadGame }) => {
  const { hasSave, getSaveInfo } = useSaveSystem();
  const [saveInfo, setSaveInfo] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [showCredits, setShowCredits] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (hasSave()) {
      setSaveInfo(getSaveInfo());
    }
  }, [hasSave, getSaveInfo]);

  return (
    <div className="menu-screen">
      {/* BACKGROUND ANIMADO */}
      <div className="menu-background">
        <div className="stars"></div>
        <div className="floating-particles"></div>
      </div>

      {/* TELA PRINCIPAL */}
      {!showStory && !showCredits && !showSettings && (
        <div className="menu-container">
          <div className="game-logo">
            <h1 className="game-title">✨ O Encantador de Flechas</h1>
            <p className="game-subtitle">Supernova - Capítulo I</p>
            <div className="title-decoration"></div>
          </div>
          
          <div className="menu-buttons">
            <button 
              className={`menu-btn ${hoveredBtn === 'new' ? 'hover' : ''}`}
              onClick={onStartNewGame}
              onMouseEnter={() => setHoveredBtn('new')}
              onMouseLeave={() => setHoveredBtn(null)}
            >
              <span className="btn-icon">🎮</span>
              Novo Jogo
            </button>
            
            {hasSave() && (
              <button 
                className={`menu-btn ${hoveredBtn === 'load' ? 'hover' : ''}`}
                onClick={onLoadGame}
                onMouseEnter={() => setHoveredBtn('load')}
                onMouseLeave={() => setHoveredBtn(null)}
              >
                <span className="btn-icon">💾</span>
                Carregar Save
                {saveInfo && (
                  <span className="save-info">
                    Nv.{saveInfo.player?.level || 1} • {saveInfo.timestamp ? new Date(saveInfo.timestamp).toLocaleDateString() : 'data desconhecida'}
                  </span>
                )}
              </button>
            )}
            
            <button 
              className={`menu-btn ${hoveredBtn === 'story' ? 'hover' : ''}`}
              onClick={() => setShowStory(true)}
              onMouseEnter={() => setHoveredBtn('story')}
              onMouseLeave={() => setHoveredBtn(null)}
            >
              <span className="btn-icon">📖</span>
              A História
            </button>

            <button 
              className={`menu-btn ${hoveredBtn === 'settings' ? 'hover' : ''}`}
              onClick={() => setShowSettings(true)}
              onMouseEnter={() => setHoveredBtn('settings')}
              onMouseLeave={() => setHoveredBtn(null)}
            >
              <span className="btn-icon">⚙️</span>
              Configurações
            </button>
            
            <button 
              className={`menu-btn ${hoveredBtn === 'credits' ? 'hover' : ''}`}
              onClick={() => setShowCredits(true)}
              onMouseEnter={() => setHoveredBtn('credits')}
              onMouseLeave={() => setHoveredBtn(null)}
            >
              <span className="btn-icon">⭐</span>
              Créditos & Dev
            </button>
          </div>
          
          <div className="menu-footer">
            <p>🎮 Pressione qualquer tecla para começar</p>
            <p className="version">v1.0 - Desenvolvido com ❤️</p>
          </div>
        </div>
      )}

      {/* TELA DA HISTÓRIA */}
      {showStory && (
        <div className="story-container">
          <button className="back-btn" onClick={() => setShowStory(false)}>← Voltar</button>
          
          <div className="story-content">
            <h2>📖 A História de Flexa</h2>
            
            <div className="story-chapter">
              <h3>🌄 O Despertar</h3>
              <p>Há muitos anos, o mundo de Flexa foi selado. O Rei Evandro Cardorcia ergueu muros gigantescos ao redor de Acigam, 
              isolando seu povo do resto do continente. A magia, chamada de "Ciência das Energias", foi proibida. 
              Os Silenciadores, soldados de elite do rei, caçam qualquer um que ouse manifestar poderes.</p>
            </div>

            <div className="story-chapter">
              <h3>🏹 O Encantador</h3>
              <p>Leran Yandel é um jovem aprendiz de arqueiro, o melhor de sua classe na escola de arco e flecha. 
              Guiado por seu avô, Bretor Yandel, ele descobre que pode canalizar energia através de objetos, 
              encantando suas flechas com poderes elementais. Esta habilidade proibida pode ser a chave para derrubar os muros.</p>
            </div>

            <div className="story-chapter">
              <h3>🔓 A Fuga</h3>
              <p>Ao lado de sua irmã Lua e da misteriosa Judra, Leran precisará escapar de Acigam, 
              enfrentar os Silenciadores e descobrir o que realmente existe além dos muros. 
              Uma profecia antiga fala sobre um "Encantador" que restaurará a magia no mundo...</p>
            </div>

            <div className="story-chapter">
              <h3>✨ Sua Jornada Começa Agora</h3>
              <p>Você é a esperança de Flexa. Equipe seu arco, encante suas flechas e liberte o mundo!</p>
            </div>
          </div>
        </div>
      )}

      {/* TELA DE CONFIGURAÇÕES */}
      {showSettings && (
        <GraphicsSettings onClose={() => setShowSettings(false)} />
      )}

      {/* TELA DE CRÉDITOS */}
      {showCredits && (
        <div className="credits-container">
          <button className="back-btn" onClick={() => setShowCredits(false)}>← Voltar</button>
          
          <div className="credits-content">
            <h2>⭐ Sobre o Desenvolvedor</h2>
            
            <div className="dev-card">
              <div className="dev-avatar">🎮</div>
              <h3>Wizzard Game Studio</h3>
              <p className="dev-title">Desenvolvedor Unity & React | C# | Game Dev</p>
              
              <div className="dev-bio">
                <p>Sou desenvolvedor com experiência em Unity e React, especializado em C# e desenvolvimento de jogos. 
                Atualmente estou desenvolvendo uma sequência de projetos React, incluindo jogos e aplicações interativas.</p>
                
                <p>Entrei nesta saga para compartilhar algo interessante com a comunidade e manter meus negócios, 
                unindo paixão por tecnologia e entretenimento. Tenho muitos planos para o futuro!</p>
                
                <p>Além dos games, já desenvolvi uma rede social e um robô que evolve lembranças e sentimentos 
                (inteligência artificial com memória emocional).</p>
              </div>
              
              <div className="social-links">
                <h4>📱 Siga nas redes:</h4>
                <div className="social-buttons">
                  <a href="https://www.youtube.com/@DesignShadown" target="_blank" rel="noopener noreferrer" className="social-btn youtube">
                    <span>▶️</span> YouTube
                  </a>
                  <a href="https://twitter.com/renancarvalho" target="_blank" rel="noopener noreferrer" className="social-btn twitter">
                    <span>🐦</span> Twitter/X
                  </a>
                  <a href="https://www.youtube.com/@DesignShadown" target="_blank" rel="noopener noreferrer" className="social-btn instagram">
                    <span>📸</span> Instagram
                  </a>
                  <a href="https://www.youtube.com/@DesignShadown" target="_blank" rel="noopener noreferrer" className="social-btn github">
                    <span>💻</span> GitHub
                  </a>
                </div>
              </div>
            </div>

            <div className="dev-work">
              <h3>🎮 Projetos em Destaque</h3>
              <ul>
                <li>✨ <strong>Supernova: O Encantador de Flechas</strong> - RPG 3D (React Three Fiber)</li>
                <li>🌟 <strong>Rede Social Interativa</strong> - Plataforma de conexão</li>
                <li>🤖 <strong>Robô com Memória Emocional</strong> - IA que evolve lembranças e sentimentos</li>
                <li>⚔️ <strong>Framework para Jogos Web</strong> - Sistema modular para RPGs</li>
                <li>📚 <strong>Série Supernova</strong> - Livros de fantasia</li>
              </ul>
            </div>

            <div className="tech-stack">
              <h3>🛠️ Tecnologias que domino</h3>
              <div className="tech-badges">
                <span className="badge">Unity</span>
                <span className="badge">C#</span>
                <span className="badge">React</span>
                <span className="badge">React Three Fiber</span>
                <span className="badge">Three.js</span>
                <span className="badge">Rapier Physics</span>
                <span className="badge">Zustand</span>
                <span className="badge">Node.js</span>
                <span className="badge">MongoDB</span>
                <span className="badge">IA/ML</span>
              </div>
            </div>

            <div className="future-plans">
              <h3>🚀 Planos para o Futuro</h3>
              <ul>
                <li>📱 Versão mobile do jogo</li>
                <li>🎮 Lançar na Steam e CrazyGames</li>
                <li>🤖 Expandir o robô com memória emocional</li>
                <li>📖 Continuar a saga Supernova</li>
                <li>🌐 Criar comunidade de devs React/Three.js</li>
              </ul>
            </div>

            <div className="special-thanks">
              <h3>🙏 Agradecimentos Especiais</h3>
              <p>A todos os jogadores que embarcam nesta jornada!</p>
              <p>À comunidade de desenvolvedores React Three Fiber.</p>
              <p>Aos leitores da série Supernova.</p>
              <p>E a você, que está jogando!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};