import React, { useEffect, useMemo, useState } from 'react';
import useGameStore from '../../hooks/useGameStore';
import './PetMenuFixed.css';

const PET_TYPES = [
  { key: 'sphere', label: '🐾 Esfera (voador)' },
  { key: 'cube', label: '🧊 Cubo (terrestre)' },
];

export function PetMenuFixed() {
  const [open, setOpen] = useState(false);

  const pet = useGameStore((s) => s.pet);
  const unlockedPetTypes = useGameStore((s) => s.petUnlockedTypes);

  const setPetType = useGameStore((s) => s.setPetType);
  const setPetName = useGameStore((s) => s.setPetName);
  const setPetActive = useGameStore((s) => s.setPetActive);
  const setPetUnlockedType = useGameStore((s) => s.setPetUnlockedType);
  const callPet = useGameStore((s) => s.callPet);
  const storePet = useGameStore((s) => s.storePet);

  const isUnlocked = useMemo(() => {
    if (!pet?.type) return false;
    return unlockedPetTypes?.includes(pet.type);
  }, [pet?.type, unlockedPetTypes]);

  const [draftName, setDraftName] = useState(pet?.name || '');

  useEffect(() => {
    setDraftName(pet?.name || '');
  }, [pet?.name]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'p' || e.key === 'P') setOpen((v) => !v);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // overlay fixo: sempre renderiza
  return (
    <div className="pet-fixed-root">
      {open ? (
        <div className="pet-menu pet-menu-fixed">
          <div className="pet-menu-header">
            <div className="pet-menu-title">🐶 Pet Menu</div>
            <button className="pet-menu-close" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="pet-menu-body">
            <div className="pet-section">
              <div className="pet-label">Tipo</div>
              <div className="pet-type-grid">
                {PET_TYPES.map((pt) => {
                  const unlocked = unlockedPetTypes?.includes(pt.key);
                  const selected = pet?.type === pt.key;
                  return (
                    <button
                      key={pt.key}
                      className={`pet-type-btn ${selected ? 'selected' : ''}`}
                      disabled={!unlocked}
                      onClick={() => {
                        setPetType(pt.key);
                      }}
                      title={!unlocked ? 'Desbloqueie no futuro' : ''}
                    >
                      {pt.label}
                      {!unlocked && <span className="pet-lock">🔒</span>}
                    </button>
                  );
                })}
              </div>

              <div className="pet-unlock-row">
                <div className="pet-unlock-row" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="pet-unlock-btn" onClick={() => setPetUnlockedType('sphere')}>
                    🔓 Desbloquear Esfera
                  </button>
                  <button className="pet-unlock-btn" onClick={() => setPetUnlockedType('cube')}>
                    🔓 Desbloquear Cubo
                  </button>
                </div>
              </div>
            </div>

            <div className="pet-section">
              <div className="pet-label">Nome</div>
              <input
                className="pet-name-input"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Ex: Lua, Rex, Neko..."
              />
              <div className="pet-name-actions">
                <button className="pet-action-btn" onClick={() => setPetName(draftName)}>
                  🏷️ Aplicar nome
                </button>
              </div>
            </div>

            <div className="pet-section">
              <div className="pet-label">Controle</div>
              <div className="pet-action-row">
                <button className="pet-action-btn primary" onClick={() => callPet()} disabled={!isUnlocked}>
                  📣 Chamar
                </button>
                <button className="pet-action-btn" onClick={() => storePet()} disabled={!isUnlocked}>
                  🧳 Guardar
                </button>
              </div>
            </div>

            <div className="pet-section">
              <div className="pet-muted">Atalho: pressione <b>P</b> para abrir/fechar.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="pet-menu-minibar" onClick={() => setOpen(true)}>
          <span>🐾 Pet</span>
          <span className="pet-menu-minibar-dot">{pet?.isActive ? '🟢' : '⚪'}</span>
        </div>
      )}
    </div>
  );
}

