import { useState } from 'react';
import useGameStore from '../../hooks/useGameStore';

const MOUNTS = [
  { id: 'horse', name: 'Cavalo', emoji: '🐴' },
  { id: 'wolf', name: 'Lobo', emoji: '🐺' },
  { id: 'tiger', name: 'Tigre', emoji: '🐯' },
];

export function MountMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const mount = useGameStore((s) => s.mount);
  const setMountType = useGameStore((s) => s.setMountType);
  const mountSummon = useGameStore((s) => s.mountSummon);
  const mountStore = useGameStore((s) => s.mountStore);

  const isActive = mount?.isActive || false;
  const currentType = mount?.type || 'horse';

  const handleSelectMount = (typeId) => {
    setMountType(typeId);
    if (!isActive) {
      mountSummon();
    }
    setIsOpen(false);
  };

  const toggleMount = () => {
    if (isActive) {
      mountStore();
    } else {
      mountSummon();
    }
  };

  return (
    <>
      {/* Botão da Montaria */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          zIndex: 1000,
          padding: '12px',
          borderRadius: '50%',
          background: isActive ? '#4CAF50' : '#555',
          color: 'white',
          border: '2px solid #888',
          fontSize: '24px',
          width: '60px',
          height: '60px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isActive ? '0 0 20px rgba(76, 175, 80, 0.5)' : '0 4px 10px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
        }}
      >
        {isActive ? '🐴' : '🚫'}
      </button>

      {/* Menu de Montarias */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '170px',
            right: '20px',
            zIndex: 1000,
            background: 'rgba(0,0,0,0.9)',
            borderRadius: '12px',
            padding: '15px',
            border: '2px solid #888',
            minWidth: '200px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '14px', textAlign: 'center' }}>
            🐎 Montarias
          </h3>
          
          {MOUNTS.map((mountOption) => (
            <button
              key={mountOption.id}
              onClick={() => handleSelectMount(mountOption.id)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                margin: '4px 0',
                background: currentType === mountOption.id ? '#4CAF50' : '#333',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                textAlign: 'left',
                transition: 'background 0.2s ease',
              }}
            >
              {mountOption.emoji} {mountOption.name}
              {currentType === mountOption.id && ' ✅'}
            </button>
          ))}
          
          <hr style={{ borderColor: '#555', margin: '10px 0' }} />
          
          <button
            onClick={toggleMount}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              background: isActive ? '#f44336' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background 0.2s ease',
            }}
          >
            {isActive ? '🔽 Desmontar' : '🔼 Montar'}
          </button>
        </div>
      )}
    </>
  );
}