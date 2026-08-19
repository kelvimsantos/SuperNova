import { useState, useEffect } from 'react';
import useGameStore from '../../hooks/useGameStore';

const GRAPHICS_DEFAULTS = {
  waterMode: 'light',
  volumetricClouds: false,
  grass: false,
  dynamicFog: false,
  radialFarFade: false,
  starField: false,
  weatherEffects: true,
  combatEffects: true,
  particles: true,
  shadows: true,
  dayNightCycle: true,
  antialias: false,
  dpr: 1,
};

export function GraphicsSettings({ onClose, onApply }) {
  const waterMode = useGameStore((s) => s.waterMode);
  const setWaterMode = useGameStore((s) => s.setWaterMode);
  const graphicsSettings = useGameStore((s) => s.graphicsSettings);
  const updateGraphicsSetting = useGameStore((s) => s.updateGraphicsSetting);

  const [settings, setSettings] = useState(() => ({ ...GRAPHICS_DEFAULTS, ...graphicsSettings }));

  useEffect(() => {
    setSettings((prev) => ({ ...prev, ...graphicsSettings }));
  }, [graphicsSettings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      updateGraphicsSetting(key, value);
      if (key === 'waterMode') setWaterMode(value);
      return next;
    });
  };

  const handleApply = () => {
    localStorage.setItem('graphicsSettings', JSON.stringify(settings));
    onApply?.(settings);
    onClose?.();
  };

  const handleDefaults = () => {
    setSettings(GRAPHICS_DEFAULTS);
    setWaterMode('light');
    localStorage.setItem('graphicsSettings', JSON.stringify(GRAPHICS_DEFAULTS));
  };

  const sections = [
    {
      title: '🎨 Qualidade Geral',
      options: [
        { key: 'dpr', label: 'Resolução (DPR)', type: 'select', options: [
          { value: 1, label: '1x (Performance)' },
          { value: 1.5, label: '1.5x (Equilibrado)' },
          { value: 2, label: '2x (Qualidade)' },
        ]},
        { key: 'antialias', label: 'Antialiasing', type: 'toggle' },
        { key: 'shadows', label: 'Sombras', type: 'toggle' },
      ],
    },
    {
      title: '💧 Água',
      options: [
        { key: 'waterMode', label: 'Modo de Água', type: 'select', options: [
          { value: 'light', label: 'Leve (Recomendado)' },
          { value: 'full', label: 'Completa' },
          { value: 'ocean', label: 'Realista (Pesado)' },
        ]},
      ],
    },
    {
      title: '☁️ Atmosfera e Céu',
      options: [
        { key: 'dayNightCycle', label: 'Ciclo Dia/Noite', type: 'toggle', desc: 'Sol anda pelo céu, luz muda de cor; desligue em PCs fracos' },
        { key: 'shadows', label: 'Sombras (só perto)', type: 'toggle', desc: 'Sombras só no que está próximo do jogador' },
        { key: 'volumetricClouds', label: 'Nuvens Volumétricas', type: 'toggle', desc: 'Muito pesado em GPUs integradas' },
        { key: 'dynamicFog', label: 'Névoa Dinâmica', type: 'toggle' },
        { key: 'radialFarFade', label: 'Fade Circular (Far)', type: 'toggle' },
        { key: 'starField', label: 'Campo de Estrelas', type: 'toggle' },
        { key: 'weatherEffects', label: 'Efeitos de Clima', type: 'toggle' },
      ],
    },
    {
      title: '🌿 Mundo',
      options: [
        { key: 'grass', label: 'Grama Instanciada', type: 'toggle', desc: 'Pode reduzir FPS em áreas abertas' },
        { key: 'grassDistance', label: 'Distância da Grama', type: 'select', options: [
          { value: 'short', label: 'Curta (40u - Leve)' },
          { value: 'medium', label: 'Média (70u)' },
          { value: 'long', label: 'Longa (120u - Pesada)' },
        ]},
      ],
    },
    {
      title: '⚔️ Combate e Partículas',
      options: [
        { key: 'combatEffects', label: 'Efeitos de Combate', type: 'toggle' },
        { key: 'particles', label: 'Partículas Gerais', type: 'toggle' },
      ],
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: '#fff',
        padding: 24,
        overflow: 'auto',
      }}
    >
      <div style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid #333', paddingBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>⚙️ Configurações Gráficas</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #555',
              color: '#aaa',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 14,
            }}
            onMouseEnter={(e) => e.target.style.borderColor = '#fff'}
            onMouseLeave={(e) => e.target.style.borderColor = '#555'}
          >
            ✕ Fechar
          </button>
        </div>

        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#88ff88', textTransform: 'uppercase', letterSpacing: 1 }}>
              {section.title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {section.options.map((opt) => (
                <div key={opt.key} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: 15, fontWeight: 'bold' }}>{opt.label}</label>
                      {opt.desc && <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{opt.desc}</span>}
                    </div>
                    {opt.type === 'toggle' && (
                      <button
                        onClick={() => updateSetting(opt.key, !settings[opt.key])}
                        style={{
                          width: 52,
                          height: 28,
                          borderRadius: 14,
                          border: 'none',
                          background: settings[opt.key] ? '#4caf50' : '#444',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background 0.2s',
                        }}
                        aria-pressed={settings[opt.key]}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: settings[opt.key] ? 26 : 2,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            transition: 'left 0.2s',
                          }}
                        />
                      </button>
                    )}
                    {opt.type === 'select' && (
                      <select
                        value={settings[opt.key]}
                        onChange={(e) => updateSetting(opt.key, e.target.type === 'checkbox' ? e.target.checked : (isNaN(e.target.value) ? e.target.value : Number(e.target.value)))}
                        style={{
                          background: '#1a1a1a',
                          border: '1px solid #333',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontFamily: 'monospace',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        {opt.options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, marginTop: 8, borderTop: '1px solid #333', paddingTop: 16 }}>
          <button
            onClick={handleDefaults}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid #666',
              color: '#aaa',
              padding: '12px',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 14,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.target.style.borderColor = '#fff'; e.target.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.target.style.borderColor = '#666'; e.target.style.color = '#aaa'; }}
          >
            🔄 Padrão
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 1,
              background: '#4caf50',
              border: 'none',
              color: '#fff',
              padding: '12px',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 14,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ✅ Aplicar
          </button>
        </div>

        <p style={{ marginTop: 20, fontSize: 11, color: '#666', textAlign: 'center', lineHeight: 1.6 }}>
          💡 <b>Leve</b> = melhor performance (recomendado para placas integradas)<br />
          ⚠️ Mudanças surtem efeito ao iniciar novo jogo ou recarregar a página
        </p>
      </div>
    </div>
  );
}

export function useGraphicsSettings() {
  const [settings, setSettings] = useState(GRAPHICS_DEFAULTS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('graphicsSettings');
      if (saved) setSettings({ ...GRAPHICS_DEFAULTS, ...JSON.parse(saved) });
    } catch (e) {}
  }, []);

  return settings;
}