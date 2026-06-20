import { useEffect, useState } from 'react'
import useGameStore from '../../hooks/useGameStore'

export function ConfigWaterMenu({ onClose }) {
  const waterMode = useGameStore(s => s.waterMode)
  const setWaterMode = useGameStore(s => s.setWaterMode)

  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768
  })

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 10020,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
    >
      <div
        style={{
          width: 380,
          maxWidth: '100%',
          background: 'linear-gradient(135deg, rgba(30, 20, 50, 0.98), rgba(20, 10, 40, 0.98))',
          border: '1px solid rgba(200, 100, 200, 0.4)',
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
          padding: 16
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#d48eff', fontFamily: 'monospace', fontWeight: 'bold' }}>
            ⚙️ Configurações (Água)
          </div>
          <button
            onClick={() => onClose?.()}
            style={{
              background: 'rgba(200, 100, 200, 0.12)',
              border: '1px solid rgba(200, 100, 200, 0.35)',
              color: '#d48eff',
              borderRadius: 10,
              padding: '6px 10px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 12, color: '#e0cce8', fontSize: 13, fontFamily: 'monospace' }}>
          <div style={{ marginBottom: 10 }}>
            Modo atual: <b style={{ color: '#ffb8ff' }}>{waterMode === 'light' ? 'Água Leve' : 'Água Completa'}</b>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <button
              onClick={() => setWaterMode('light')}
              style={{
                background: waterMode === 'light' ? 'rgba(200, 100, 200, 0.35)' : 'rgba(200, 100, 200, 0.12)',
                border: `1px solid ${waterMode === 'light' ? 'rgba(200, 100, 200, 0.7)' : 'rgba(200, 100, 200, 0.35)'}`,
                color: '#fff',
                borderRadius: 12,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🟦 Água Leve (recomendada para celular)
              <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>
                Oculta superfície pesada e usa render simples.
              </div>
            </button>

            <button
              onClick={() => setWaterMode('full')}
              style={{
                background: waterMode === 'full' ? 'rgba(200, 100, 200, 0.35)' : 'rgba(200, 100, 200, 0.12)',
                border: `1px solid ${waterMode === 'full' ? 'rgba(200, 100, 200, 0.7)' : 'rgba(200, 100, 200, 0.35)'}`,
                color: '#fff',
                borderRadius: 12,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🌊 Água Completa (visual)
              <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>
                Mantém seu WaterSurfacePRO e efeitos.
              </div>
            </button>

            {waterMode === 'light' && (
              <button
                onClick={() => {
                  const next = !(window.__waterPlayerReflectionEnabled ?? false);
                  window.__waterPlayerReflectionEnabled = next;
                  window.dispatchEvent(new CustomEvent('toggleWaterPlayerReflection', { detail: { enabled: next } }));
                }}
                style={{
                  background: (window.__waterPlayerReflectionEnabled ?? false) ? 'rgba(200, 100, 200, 0.35)' : 'rgba(200, 100, 200, 0.12)',
                  border: `1px solid ${(window.__waterPlayerReflectionEnabled ?? false) ? 'rgba(200, 100, 200, 0.7)' : 'rgba(200, 100, 200, 0.35)'}`,
                  color: '#fff',
                  borderRadius: 12,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🪞 Reflexo do Player (fake)
                <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>
                  Ative/desative o reflexo aproximado no modo leve.
                </div>
              </button>
            )}
          </div>

          {isMobile && (
            <div style={{ marginTop: 12, opacity: 0.9, fontSize: 12, lineHeight: 1.35 }}>
              Detecção: mobile. Para performance melhor, comece por <b>Água Leve</b>.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

