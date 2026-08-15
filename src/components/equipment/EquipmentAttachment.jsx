// components/equipment/EquipmentAttachment.jsx
import { useEffect, useRef, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// 🔥 CONFIGURAÇÃO DE CADA SLOT
const EQUIPMENT_CONFIG = {
  weapon: {
    boneNames: ['mixamorigRightHand', 'RightHand', 'hand_r', 'Hand_R'],
    positionOffset: [0.3, -0.1, 0.1],
    rotationOffset: [0.5, 0, 0.5],
    scale: [1, 1, 1],
    shape: 'sword',
    color: '#ff4444'
  },
  bow: {
    boneNames: ['mixamorigLeftHand', 'LeftHand', 'hand_l', 'Hand_L'],
    positionOffset: [-0.3, -0.1, 0.1],
    rotationOffset: [0, 0, 0],
    scale: [1, 1, 1],
    shape: 'bow',
    color: '#8B4513'
  },
  shield: {
    boneNames: ['mixamorigLeftHand', 'LeftHand', 'hand_l', 'Hand_L'],
    positionOffset: [-0.3, -0.1, 0.1],
    rotationOffset: [0.5, 0, -0.5],
    scale: [1, 1, 1],
    shape: 'shield',
    color: '#4444ff'
  },
  helmet: {
    boneNames: ['mixamorigHead', 'Head', 'head'],
    positionOffset: [0, 0.25, 0],
    rotationOffset: [0, 0, 0],
    scale: [0.8, 0.8, 0.8],
    shape: 'sphere',
    color: '#ffaa44'
  },
  chest: {
    boneNames: ['mixamorigSpine2', 'Spine2', 'spine_02'],
    positionOffset: [0, 0.1, -0.1],
    rotationOffset: [0, 0, 0],
    scale: [0.8, 0.8, 0.8],
    shape: 'box',
    color: '#44ffaa'
  },
  shoulders: {
    boneNames: ['mixamorigRightShoulder', 'RightShoulder', 'mixamorigLeftShoulder', 'LeftShoulder'],
    positionOffset: [0.2, 0, 0],
    rotationOffset: [0, 0, 0.3],
    scale: [0.6, 0.6, 0.6],
    shape: 'shoulder',
    color: '#aa44ff'
  }
};

export const EquipmentAttachment = ({
  playerModel,
  equipmentSlot,
  itemData,
  customPosition,
  customRotation,
  customScale,
  autoPlayAnim = true, // 🔥 Se deve tocar a primeira animação automaticamente
  animIndex = 0           // 🔥 Índice da animação a tocar (0 = primeira)
}) => {
  const [bone, setBone] = useState(null);
  const [modelScene, setModelScene] = useState(null);
  const groupRef = useRef();
  const modelRef = useRef(); // Referência para o modelo (para animações)
  const mountedRef = useRef(true);
  const actionsRef = useRef(null); // 🔥 Ref para evitar loop infinito

  // 🔥 1. CARREGA O MODELO GLB E SUAS ANIMAÇÕES
  const modelPath = itemData?.modelPath;
  const { scene: gltfScene, animations } = useGLTF(modelPath || '');
  const { actions } = useAnimations(animations, modelRef);

  // 🔥 Atualiza ref de actions sem disparar re-render
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  // 🔥 2. CLONA A CENA E GUARDA O MODELO
  useEffect(() => {
    if (gltfScene && modelPath) {
      const cloned = gltfScene.clone();
      setModelScene(cloned);
      console.log(`✅ Modelo carregado: ${modelPath} (${animations?.length || 0} animações)`);
    } else {
      setModelScene(null);
    }
  }, [gltfScene, modelPath, animations]);

  // 🔥 3. ENCONTRA O OSSO
  useEffect(() => {
    if (!playerModel || !mountedRef.current) return;

    const config = EQUIPMENT_CONFIG[equipmentSlot];
    if (!config) return;

    // 🔥 Arcos usam osso da MÃO ESQUERDA (igual escudo)
    const isBow = equipmentSlot === 'weapon' && itemData?.weaponClass === 'archer';
    const boneNames = isBow 
      ? ['mixamorigLeftHand', 'LeftHand', 'hand_l', 'Hand_L']
      : config.boneNames;

    let foundBone = null;
    playerModel.traverse((child) => {
      if (child.isBone && !foundBone) {
        const boneName = child.name.toLowerCase();
        for (const pattern of boneNames) {
          if (boneName.includes(pattern.toLowerCase())) {
            foundBone = child;
            break;
          }
        }
      }
    });

    if (foundBone) {
      console.log(`✅ ${equipmentSlot}${isBow ? ' (bow->left hand)' : ''} encontrou osso: ${foundBone.name}`);
      setBone(foundBone);
    } else {
      console.warn(`⚠️ Osso não encontrado para ${equipmentSlot}${isBow ? ' (bow)' : ''}. Nomes:`, boneNames);
      setBone(null);
    }
  }, [playerModel, equipmentSlot, itemData]);

  // 🔥 4. ANEXA O MODELO (OU FORMA GEOMÉTRICA) AO OSSO
  useEffect(() => {
    if (!bone || !groupRef.current || !mountedRef.current) return;

    // 🔥 Arcos usam config de posição/rotação específica (fallback usa sword)
    const isBow = equipmentSlot === 'weapon' && itemData?.weaponClass === 'archer';
    const configKey = isBow ? 'bow' : equipmentSlot;
    const config = EQUIPMENT_CONFIG[configKey] || EQUIPMENT_CONFIG[equipmentSlot];

    // Limpa filhos anteriores
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    if (modelScene) {
      // Usa modelo GLB
      const modelClone = modelScene.clone();
      groupRef.current.add(modelClone);
      modelRef.current = modelClone;
      console.log(`🔗 Modelo GLB anexado ao osso ${bone.name}`);
    } else {
      // Fallback geométrico
      const fallbackGroup = createFallbackShape(configKey);
      if (fallbackGroup) {
        groupRef.current.add(fallbackGroup);
        console.log(`🔧 Fallback geométrico usado para ${configKey}`);
      }
      modelRef.current = null;
    }

    // Aplica posição/rotação/escala (custom tem prioridade, senão usa config)
    const pos = customPosition || config.positionOffset;
    const rot = customRotation || config.rotationOffset;
    const sca = customScale || config.scale;

    groupRef.current.position.set(pos[0], pos[1], pos[2]);
    groupRef.current.rotation.set(rot[0], rot[1], rot[2]);
    groupRef.current.scale.set(sca[0], sca[1], sca[2]);

    // Adiciona ao osso
    bone.add(groupRef.current);

    // 🔥 5. TOCA A PRIMEIRA ANIMAÇÃO (se houver)
    const currentActions = actionsRef.current;
    if (autoPlayAnim && currentActions && Object.keys(currentActions).length > 0) {
      const animNames = Object.keys(currentActions);
      const targetAnim = animNames[Math.min(animIndex, animNames.length - 1)];
      if (targetAnim) {
        currentActions[targetAnim].reset().play();
        console.log(`🎬 Tocando animação "${targetAnim}" em ${configKey}`);
      }
    }

    return () => {
      if (groupRef.current && bone) {
        bone.remove(groupRef.current);
      }
    };
  }, [bone, modelScene, equipmentSlot, itemData, customPosition, customRotation, customScale, autoPlayAnim, animIndex]);

  // 🔥 FUNÇÃO PARA CRIAR FORMAS GEOMÉTRICAS (FALLBACK)
  const createFallbackShape = (slot) => {
    const config = EQUIPMENT_CONFIG[slot];
    if (!config) return null;

    const group = new THREE.Group();
    const color = config.color;

    switch (config.shape) {
      case 'bow': {
        // Arco simples - forma curva
        const bowCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.3, -0.4, 0),
          new THREE.Vector3(-0.4, -0.1, 0),
          new THREE.Vector3(-0.4, 0.2, 0),
          new THREE.Vector3(-0.3, 0.4, 0),
        ]);
        const tubeGeometry = new THREE.TubeGeometry(bowCurve, 20, 0.03, 8, false);
        const bowMesh = new THREE.Mesh(
          tubeGeometry,
          new THREE.MeshStandardMaterial({ color: '#8B4513', metalness: 0.3, roughness: 0.7 })
        );
        group.add(bowMesh);
        // Corda do arco
        const stringGeometry = new THREE.BufferGeometry();
        const stringPositions = new Float32Array([
          -0.3, -0.4, 0,
          -0.3, 0.4, 0,
        ]);
        stringGeometry.setAttribute('position', new THREE.BufferAttribute(stringPositions, 3));
        const stringMaterial = new THREE.LineBasicMaterial({ color: '#FFFFFF', linewidth: 2 });
        const string = new THREE.Line(stringGeometry, stringMaterial);
        group.add(string);
        break;
      }
      case 'sword': {
        const handle = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.2, 0.08),
          new THREE.MeshStandardMaterial({ color: '#8B4513', metalness: 0.8, roughness: 0.3 })
        );
        handle.position.set(0, -0.3, 0);
        group.add(handle);
        const guard = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.05, 0.05),
          new THREE.MeshStandardMaterial({ color: '#DAA520', metalness: 0.9, roughness: 0.2 })
        );
        guard.position.set(0, -0.1, 0);
        group.add(guard);
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.6, 0.04),
          new THREE.MeshStandardMaterial({ color: '#CCCCCC', metalness: 0.9, roughness: 0.2 })
        );
        blade.position.set(0, 0.25, 0);
        group.add(blade);
        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(0.06, 0.15, 8),
          new THREE.MeshStandardMaterial({ color: '#CCCCCC', metalness: 0.9, roughness: 0.2 })
        );
        tip.position.set(0, 0.6, 0);
        group.add(tip);
        break;
      }
      case 'shield': {
        const shieldMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.38, 0.06, 16),
          new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 })
        );
        group.add(shieldMesh);
        break;
      }
      case 'sphere': {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 16, 16),
          new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4 })
        );
        group.add(sphere);
        break;
      }
      case 'box': {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.5, 0.15),
          new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.5 })
        );
        group.add(box);
        break;
      }
      case 'shoulder': {
        const shoulder = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.12, 0.3),
          new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4 })
        );
        group.add(shoulder);
        break;
      }
      default: {
        const defaultMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.2, 0.2),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 })
        );
        group.add(defaultMesh);
      }
    }
    return group;
  };

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Debug: se não encontrou osso, mostra ponto vermelho
  if (!bone) {
    return (
      <mesh position={[0, 2, 0]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
      </mesh>
    );
  }

  return <group ref={groupRef} />;
};

// Preload (opcional)
useGLTF.preload('/models/weapons/sword.glb');
useGLTF.preload('/models/weapons/shield.glb');