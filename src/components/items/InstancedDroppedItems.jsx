// components/items/InstancedDroppedItems.jsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';
import { ItemDatabase, ItemTypes } from '../inventory/ItemTypes';

const EQUIP_SLOTS = ['weapon', 'shield', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'ring', 'necklace'];

// Geometrias compartilhadas (criadas UMA única vez — não por item)
const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.3);
const sphereGeo = new THREE.SphereGeometry(0.3, 12, 12);
const ringGeo = new THREE.RingGeometry(0.4, 0.7, 16);
const floatRingGeo = new THREE.RingGeometry(0.45, 0.55, 24);

const getItemColor = (info) => {
  if (info.type === ItemTypes.WEAPON) return '#ff6666';
  if (info.type === ItemTypes.SHIELD) return '#6666ff';
  if (info.type === ItemTypes.HELMET) return '#ffaa44';
  if (info.type === ItemTypes.CHEST) return '#44ffaa';
  if (info.type === ItemTypes.LEGS) return '#aa44ff';
  if (info.type === ItemTypes.BOOTS) return '#ffaa88';
  if (info.type === ItemTypes.RING) return '#ffdd44';
  if (info.type === ItemTypes.NECKLACE) return '#ff44dd';
  if (info.type === ItemTypes.HEALTH_POTION) return '#ff4444';
  return info.rarity?.color || '#ffaa44';
};

/**
 * InstancedDroppedItems
 * Substitui dezenas de <ItemPickup> (cada um com useFrame + setState por frame)
 * por 4 InstancedMesh (box / sphere / anel-chão / anel-flutuante).
 *
 * Ganhos:
 * - Draw calls: ~4 (antes ~45+ × 4 meshes = 180+)
 * - useFrame: 1 único (antes 1 por item)
 * - Sem setState por frame (estado vivo em refs)
 */
export const InstancedDroppedItems = ({
  items = [],
  interactRadius = 4.5,
  collectRadius = 1.2,
}) => {
  const player = useGameStore((s) => s.playerRigidBody);
  const addToInventory = useGameStore((s) => s.addToInventory);
  const setEquippedItem = useGameStore((s) => s.setEquippedItem);
  const currentClass = useGameStore((s) => s.currentClass);

  const boxInstRef = useRef();
  const sphereInstRef = useRef();
  const groundRingRef = useRef();
  const floatRingRef = useRef();

  // Dados planos com índices de instância + cor por item
  const data = useMemo(() => {
    const valid = [];
    let boxIdx = 0;
    let sphereIdx = 0;
    items.forEach((it, idx) => {
      const info = ItemDatabase[it.itemId || it.id];
      if (!info) return;
      const isEquip = info.slot && EQUIP_SLOTS.includes(info.slot);
      valid.push({
        key: idx,
        info,
        isEquip,
        color: getItemColor(info),
        position: it.position,
        globalIndex: valid.length, // índice no anel (glow) = ordem global
        boxIndex: isEquip ? boxIdx++ : -1,
        sphereIndex: isEquip ? -1 : sphereIdx++,
        autoEquip: !!it.autoEquip,
      });
    });
    return valid;
  }, [items]);

  const boxItems = useMemo(() => data.filter((d) => d.isEquip), [data]);
  const sphereItems = useMemo(() => data.filter((d) => !d.isEquip), [data]);

  // Estado vivo em ref (sem re-render por frame)
  const stateRef = useRef([]);
  useEffect(() => {
    stateRef.current = data.map((d) => ({ ...d, hidden: false }));
  }, [data]);

  // Configura matrizes + cores das instâncias
  useEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const c = new THREE.Color();

    if (boxInstRef.current) {
      boxItems.forEach((d, i) => {
        m.compose(new THREE.Vector3(d.position[0], d.position[1], d.position[2]), q, s);
        boxInstRef.current.setMatrixAt(i, m);
        boxInstRef.current.setColorAt(i, c.set(d.color));
      });
      boxInstRef.current.instanceMatrix.needsUpdate = true;
      if (boxInstRef.current.instanceColor) boxInstRef.current.instanceColor.needsUpdate = true;
    }

    if (sphereInstRef.current) {
      sphereItems.forEach((d, i) => {
        m.compose(new THREE.Vector3(d.position[0], d.position[1], d.position[2]), q, s);
        sphereInstRef.current.setMatrixAt(i, m);
        sphereInstRef.current.setColorAt(i, c.set(d.color));
      });
      sphereInstRef.current.instanceMatrix.needsUpdate = true;
      if (sphereInstRef.current.instanceColor) sphereInstRef.current.instanceColor.needsUpdate = true;
    }

    if (groundRingRef.current) {
      data.forEach((d, i) => {
        m.compose(new THREE.Vector3(d.position[0], d.position[1] - 0.3, d.position[2]), q, s);
        groundRingRef.current.setMatrixAt(i, m);
        groundRingRef.current.setColorAt(i, c.set(d.color));
      });
      groundRingRef.current.instanceMatrix.needsUpdate = true;
      if (groundRingRef.current.instanceColor) groundRingRef.current.instanceColor.needsUpdate = true;
    }

    if (floatRingRef.current) {
      data.forEach((d, i) => {
        m.compose(new THREE.Vector3(d.position[0], d.position[1] + 0.05, d.position[2]), q, s);
        floatRingRef.current.setMatrixAt(i, m);
        floatRingRef.current.setColorAt(i, c.set(d.color));
      });
      floatRingRef.current.instanceMatrix.needsUpdate = true;
      if (floatRingRef.current.instanceColor) floatRingRef.current.instanceColor.needsUpdate = true;
    }
  }, [boxItems, sphereItems, data]);

  // Esconde uma instância (escala 0) quando coletada
  const hideInstance = (it) => {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    if (it.isEquip && boxInstRef.current && it.boxIndex >= 0) {
      boxInstRef.current.setMatrixAt(it.boxIndex, zero);
      boxInstRef.current.instanceMatrix.needsUpdate = true;
    }
    if (!it.isEquip && sphereInstRef.current && it.sphereIndex >= 0) {
      sphereInstRef.current.setMatrixAt(it.sphereIndex, zero);
      sphereInstRef.current.instanceMatrix.needsUpdate = true;
    }
    if (groundRingRef.current && it.globalIndex >= 0) {
      groundRingRef.current.setMatrixAt(it.globalIndex, zero);
      groundRingRef.current.instanceMatrix.needsUpdate = true;
    }
    if (floatRingRef.current && it.globalIndex >= 0) {
      floatRingRef.current.setMatrixAt(it.globalIndex, zero);
      floatRingRef.current.instanceMatrix.needsUpdate = true;
    }
  };

  const collectItem = (it) => {
    const { info, autoEquip } = it;
    addToInventory({ ...info, quantity: 1 });
    if (autoEquip && info.slot) {
      const canEquip = !info.weaponClass || info.weaponClass === currentClass;
      if (canEquip) setEquippedItem(info.slot, { ...info, quantity: 1 });
    }
  };

  // UM useFrame para TODOS os itens (antes era 1 por item = ~45 por frame)
  useFrame(() => {
    if (!player) return;
    const p = player.translation();
    const px = p.x;
    const py = p.y;
    const pz = p.z;
    const coll2 = collectRadius * collectRadius;

    for (let i = 0; i < stateRef.current.length; i++) {
      const it = stateRef.current[i];
      if (it.hidden) continue;
      const pos = it.position;
      const dx = px - pos[0];
      const dy = py - pos[1];
      const dz = pz - pos[2];
      if (dx * dx + dy * dy + dz * dz < coll2) {
        it.hidden = true;
        hideInstance(it);
        collectItem(it);
      }
    }
  });

  if (data.length === 0) return null;

  return (
    <group>
      {/* Equipamentos → caixas instanciadas */}
      {boxItems.length > 0 && (
        <instancedMesh ref={boxInstRef} args={[boxGeo, undefined, boxItems.length]} frustumCulled={false}>
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}

      {/* Consumíveis/valiosos → esferas instanciadas */}
      {sphereItems.length > 0 && (
        <instancedMesh ref={sphereInstRef} args={[sphereGeo, undefined, sphereItems.length]} frustumCulled={false}>
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}

      {/* Anéis de brilho no chão + anel flutuante (todos os itens) */}
      <instancedMesh
        ref={groundRingRef}
        args={[ringGeo, undefined, data.length]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.3, 0]}
        frustumCulled={false}
      >
        <meshBasicMaterial transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={floatRingRef}
        args={[floatRingGeo, undefined, data.length]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        frustumCulled={false}
      >
        <meshBasicMaterial transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
};

