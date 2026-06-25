import { useEffect, useMemo, useState } from 'react';
import useGameStore from '../../hooks/useGameStore';
import { EQUIPMENT_SLOTS } from '../equipment/EquipmentSlot';
import { ItemTypes } from '../inventory/ItemTypes';
import './EquipmentTransformTester.css';

const degToRad = (deg) => (deg * Math.PI) / 180;
const radToDeg = (rad) => (rad * 180) / Math.PI;

const clampNum = (n, min, max) => Math.min(max, Math.max(min, n));

function normalizeVec3(v, fallback) {
  if (!Array.isArray(v) || v.length < 3) return [...fallback];
  return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
}

function formatVec(arr) {
  const a = normalizeVec3(arr, [0, 0, 0]);
  return `[{${a[0].toFixed(4)}}, {${a[1].toFixed(4)}}, {${a[2].toFixed(4)}}]`;
}

// Mapeia slot->tipo do item para filtrar na inventory
const slotToType = {
  weapon: [ItemTypes.WEAPON],
  shield: [ItemTypes.SHIELD],
  helmet: [ItemTypes.HELMET],
  chest: [ItemTypes.CHEST],
  legs: [ItemTypes.LEGS],
  boots: [ItemTypes.BOOTS],
  gloves: [ItemTypes.GLOVES],
  shoulders: [ItemTypes.SHOULDERS],
  belt: [ItemTypes.BELT],
  necklace: [ItemTypes.NECKLACE],
  ring: [ItemTypes.RING],
  cloak: [ItemTypes.CLOAK],
};

export const EquipmentTransformTester = () => {
  const inventory = useGameStore((s) => s.inventory);
  const equippedItems = useGameStore((s) => s.equippedItems);

  // A ideia: vamos editar os customPosition/customRotation/customScale
  // diretamente no item que está equipado no slot (em memória).
  // Se o item não tiver tais campos, criaremos ao editar.

  const defaultSlotId = useMemo(() => {
    const first = Object.values(equippedItems).find((it) => it && it.slot);
    return first?.slot || 'weapon';
  }, [equippedItems]);

  const [selectedSlot, setSelectedSlot] = useState(defaultSlotId);

  useEffect(() => {
    // Se o slot default mudar (por exemplo, carregou outro save), respeita o primeiro equipado
    setSelectedSlot((cur) => cur || defaultSlotId);
  }, [defaultSlotId]);

  const slotConfig = EQUIPMENT_SLOTS.find((s) => s.id === selectedSlot);

  const equipped = equippedItems?.[selectedSlot] || null;

  const equippedCustomPosition = useMemo(
    () => normalizeVec3(equipped?.customPosition, [0.3, -0.1, 0.1]),
    [equipped]
  );
  const equippedCustomRotation = useMemo(
    () => normalizeVec3(equipped?.customRotation, [0.5, 0, 0.5]),
    [equipped]
  );
  const equippedCustomScale = useMemo(
    () => normalizeVec3(equipped?.customScale, [1, 1, 1]),
    [equipped]
  );

  const [pos, setPos] = useState(equippedCustomPosition);
  const [rotDeg, setRotDeg] = useState(equippedCustomRotation.map(radToDeg));
  const [scale, setScale] = useState(equippedCustomScale);

  useEffect(() => {
    setPos(equippedCustomPosition);
    setRotDeg(equippedCustomRotation.map(radToDeg));
    setScale(equippedCustomScale);
  }, [equippedCustomPosition, equippedCustomRotation, equippedCustomScale]);

  const eligibleItems = useMemo(() => {
    const types = slotToType[selectedSlot] || [];
    return inventory.filter((it) => {
      if (!it || !it.type) return false;
      if (types.length && !types.includes(it.type)) return false;
      return it.slot === selectedSlot || it.type === (types[0] || it.type);
    });
  }, [inventory, selectedSlot]);

  // Drag no scene (para simplificar sem depender de raycast global):
  // Vou implementar como modo "override" por mousemove apenas na UI,
  // mas sem integrar com o mundo aqui, já que seria necessário um ref do Avatar/Camera.
  // Mesmo assim, você ganha o principal: valores em tempo real + copy.

  const copyJson = async () => {
    const payload = {
      customPosition: [pos[0], pos[1], pos[2]],
      customRotation: [degToRad(rotDeg[0]), degToRad(rotDeg[1]), degToRad(rotDeg[2])],
      customScale: [scale[0], scale[1], scale[2]],
    };
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      alert('✅ JSON copiado para a área de transferência');
    } catch {
      // fallback
      console.log(text);
      alert('⚠️ Não foi possível copiar automaticamente. Verifique o console.');
    }
  };

  const applyToEquippedItemInMemory = () => {
    if (!equipped) {
      alert('Equipe um item no slot antes de aplicar/ajustar.');
      return;
    }

    // Importante: Zustand não re-renderiza se mutarmos objeto sem set.
    // Então vamos criar uma cópia do item e sobrescrever no store via setEquippedItem.
    // Se não existir setter, mostramos erro.
    const setEquippedItem = useGameStore.getState?.().setEquippedItem;
    if (!setEquippedItem) {
      alert('setEquippedItem indisponível no store.');
      return;
    }

    const updated = {
      ...equipped,
      customPosition: [pos[0], pos[1], pos[2]],
      customRotation: [degToRad(rotDeg[0]), degToRad(rotDeg[1]), degToRad(rotDeg[2])],
      customScale: [scale[0], scale[1], scale[2]],
    };

    setEquippedItem(selectedSlot, updated);
  };

  const resetToItem = () => {
    setPos(equippedCustomPosition);
    setRotDeg(equippedCustomRotation.map(radToDeg));
    setScale(equippedCustomScale);
  };

  return (
    <div className="eq-transform-tester">
      <div className="eq-transform-title">🛠️ Teste de Transformação (Avatar)</div>

      <div className="eq-row">
        <div className="eq-label">Slot</div>
        <select
          className="eq-select"
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
        >
          {EQUIPMENT_SLOTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="eq-row">
        <div className="eq-label">Item equipado</div>
        <div className="eq-value">
          {equipped ? (
            <div>
              <div className="eq-item-name">{equipped.icon} {equipped.name}</div>
              <div className="eq-item-sub">{equipped.id}</div>
            </div>
          ) : (
            <div className="eq-muted">Nenhum item equipado</div>
          )}
        </div>
      </div>

      <div className="eq-grid">
        <div className="eq-card">
          <div className="eq-card-title">Posição (x,y,z)</div>
          {['X', 'Y', 'Z'].map((k, idx) => (
            <div className="eq-field" key={k}>
              <label className="eq-field-label">{k}</label>
              <input
                className="eq-input"
                type="number"
                step={0.01}
                value={pos[idx]}
                onChange={(e) => setPos((p) => {
                  const next = [...p];
                  next[idx] = clampNum(Number(e.target.value), -10, 10);
                  return next;
                })}
              />
            </div>
          ))}
        </div>

        <div className="eq-card">
          <div className="eq-card-title">Rotação (graus)</div>
          {['X', 'Y', 'Z'].map((k, idx) => (
            <div className="eq-field" key={k}>
              <label className="eq-field-label">{k}</label>
              <input
                className="eq-input"
                type="number"
                step={1}
                value={rotDeg[idx]}
                onChange={(e) => setRotDeg((r) => {
                  const next = [...r];
                  next[idx] = clampNum(Number(e.target.value), -360, 360);
                  return next;
                })}
              />
            </div>
          ))}
        </div>

        <div className="eq-card">
          <div className="eq-card-title">Escala (x,y,z)</div>
          {['X', 'Y', 'Z'].map((k, idx) => (
            <div className="eq-field" key={k}>
              <label className="eq-field-label">{k}</label>
              <input
                className="eq-input"
                type="number"
                step={0.01}
                value={scale[idx]}
                onChange={(e) => setScale((sc) => {
                  const next = [...sc];
                  next[idx] = clampNum(Number(e.target.value), 0.01, 50);
                  return next;
                })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="eq-actions">
        <button className="eq-btn" onClick={applyToEquippedItemInMemory}>
          Aplicar no Avatar
        </button>
        <button className="eq-btn secondary" onClick={resetToItem}>
          Reset
        </button>
        <button className="eq-btn" onClick={copyJson}>
          Copy JSON
        </button>
      </div>

      <div className="eq-preview">
        <div className="eq-preview-title">JSON (para colar em ItemDatabase)</div>
        <pre className="eq-pre">
{JSON.stringify(
  {
    customPosition: [pos[0], pos[1], pos[2]],
    customRotation: [degToRad(rotDeg[0]), degToRad(rotDeg[1]), degToRad(rotDeg[2])],
    customScale: [scale[0], scale[1], scale[2]],
  },
  null,
  2
)}
        </pre>
      </div>

      {/* Ajuda */}
      <div className="eq-help">
        Dica: abra o menu de Equipamento (botão <b>P</b>), equipe arma/escudo no slot e use este painel para copiar os valores.
      </div>
    </div>
  );
};

