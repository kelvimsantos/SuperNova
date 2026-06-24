// components/equipment/EquipmentAttachment.jsx
import { useEffect, useRef, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// 🔥 CONFIGURAÇÃO DE CADA SLOT (valores padrão)
const EQUIPMENT_CONFIG = {
  weapon: {
    boneNames: ['mixamorigRightHand', 'RightHand', 'hand_r', 'Hand_R', 'mixamorigRightHand_15'],
    defaultPosition: [0.3, -0.1, 0.1],
    defaultRotation: [0.5, 0, 0.5],
    defaultScale: [1, 1, 1],
    shape: 'sword',
    color: '#ff4444'
  },
  shield: {
    boneNames: ['mixamorigLeftHand', 'LeftHand', 'hand_l', 'Hand_L', 'mixamorigLeftHand_7'],
    defaultPosition: [-0.3, -0.1, 0.1],
    defaultRotation: [0.5, 0, -0.5],
    defaultScale: [1, 1, 1],
    shape: 'shield',
    color: '#4444ff'
  },
  helmet: {
    boneNames: ['mixamorigHead', 'Head', 'head', 'mixamorigHead_1'],
    defaultPosition: [0, 0.25, 0],
    defaultRotation: [0, 0, 0],
    defaultScale: [0.8, 0.8, 0.8],
    shape: 'sphere',
    color: '#ffaa44'
  },
  chest: {
    boneNames: ['mixamorigSpine2', 'Spine2', 'spine_02', 'mixamorigSpine2_21'],
    defaultPosition: [0, 0.1, -0.1],
    defaultRotation: [0, 0, 0],
    defaultScale: [0.8, 0.8, 0.8],
    shape: 'box',
    color: '#44ffaa'
  },
  shoulders: {
    boneNames: ['mixamorigRightShoulder', 'RightShoulder', 'mixamorigLeftShoulder', 'LeftShoulder'],
    defaultPosition: [0.2, 0, 0],
    defaultRotation: [0, 0, 0.3],
    defaultScale: [0.6, 0.6, 0.6],
    shape: 'shoulder',
    color: '#aa44ff'
  }
};

// 🔥 CONVERTE GRAUS PARA RADIANOS
const degToRad = (deg) => deg * (Math.PI / 180);

// 🔥 PROCESSA ROTAÇÃO (suporta graus ou radianos)
const processRotation = (rotation) => {
  if (!rotation) return [0, 0, 0];
  return rotation.map(val => {
    // Se o valor absoluto for maior que 2*PI (6.28), assume que é graus
    if (Math.abs(val) > Math.PI * 2) {
      return degToRad(val);
    }
    return val;
  });
};

export const EquipmentAttachment = ({
  playerModel,
  equipmentSlot,
  itemData,
}) => {
  const [bone, setBone] = useState(null);
  const [modelScene, setModelScene] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const groupRef = useRef();
  const modelRef = useRef();
  const mountedRef = useRef(true);

  // 🔥 1. PEGA CONFIGURAÇÕES DO ITEM (com fallback)
  const config = EQUIPMENT_CONFIG[equipmentSlot] || EQUIPMENT_CONFIG.weapon;
  
  // Posição: item.customPosition ou config.defaultPosition
  const position = itemData?.customPosition || config.defaultPosition;
  
  // Rotação: processa item.customRotation ou config.defaultRotation
  const rawRotation = itemData?.customRotation || config.defaultRotation;
  const rotation = processRotation(rawRotation);
  
  // Escala: item.customScale ou config.defaultScale
  const scale = itemData?.customScale || config.defaultScale;

  // 🔥 2. CARREGA O MODELO GLB
  const modelPath = itemData?.modelPath;
  const { scene: gltfScene, animations } = useGLTF(modelPath || '');
  const { actions } = useAnimations(animations, modelRef);

  // 🔥 3. VERIFICA SE O MODELO CARREGOU CORRETAMENTE
  useEffect(() => {
    if (modelPath) {
      if (gltfScene && gltfScene.children && gltfScene.children.length > 0) {
        const cloned = gltfScene.clone();
        setModelScene(cloned);
        setLoadError(false);
        console.log(`✅ Modelo carregado: ${modelPath} (${animations?.length || 0} animações)`);
      } else if (gltfScene === undefined || gltfScene === null) {
        console.log(`⏳ Carregando modelo: ${modelPath}...`);
      } else {
        setLoadError(true);
        console.warn(`⚠️ Modelo vazio ou inválido: ${modelPath}`);
      }
    } else {
      setModelScene(null);
      setLoadError(false);
    }
  }, [gltfScene, modelPath, animations]);

  // 🔥 4. ENCONTRA O OSSO
  useEffect(() => {
    if (!playerModel || !mountedRef.current) return;

    const configSlot = EQUIPMENT_CONFIG[equipmentSlot];
    if (!configSlot) return;

    let foundBone = null;
    playerModel.traverse((child) => {
      if (child.isBone && !foundBone) {
        const boneName = child.name.toLowerCase();
        for (const pattern of configSlot.boneNames) {
          if (boneName.includes(pattern.toLowerCase())) {
            foundBone = child;
            break;
          }
        }
      }
    });

    if (foundBone) {
      console.log(`✅ ${equipmentSlot} encontrou osso: ${foundBone.name}`);
      setBone(foundBone);
    } else {
      console.warn(`⚠️ Osso não encontrado para ${equipmentSlot}. Nomes:`, configSlot.boneNames);
      setBone(null);
    }
  }, [playerModel, equipmentSlot]);

  // 🔥 5. ANEXA O MODELO AO OSSO (IGUAL AO CABELO!)
  useEffect(() => {
    if (!bone || !groupRef.current || !mountedRef.current) return;

    // Limpa filhos anteriores
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    // Decide o que renderizar
    if (modelScene && !loadError) {
      // Usa modelo GLB
      const modelClone = modelScene.clone();
      groupRef.current.add(modelClone);
      modelRef.current = modelClone;
      console.log(`🔗 Modelo GLB anexado ao osso ${bone.name}`);
    } else {
      // Fallback geométrico
      const fallbackGroup = createFallbackShape(equipmentSlot);
      if (fallbackGroup) {
        groupRef.current.add(fallbackGroup);
        console.log(`🔧 Fallback geométrico usado para ${equipmentSlot}`);
      }
      modelRef.current = null;
    }

    // 🔥 APLICA POSIÇÃO, ROTAÇÃO E ESCALA
    console.log(`📐 Aplicando transformações em ${equipmentSlot}:`, {
      position,
      rotation: rotation.map(r => r.toFixed(3)),
      scale
    });

    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    groupRef.current.scale.set(scale[0], scale[1], scale[2]);

    // 🔥 ADICIONA AO OSSO (MESMA LÓGICA DO CABELO!)
    bone.add(groupRef.current);

    // 🔥 6. TOCA A PRIMEIRA ANIMAÇÃO (se houver)
    if (actions && Object.keys(actions).length > 0) {
      const animNames = Object.keys(actions);
      const firstAnim = animNames[0];
      if (firstAnim) {
        actions[firstAnim].reset().play();
        console.log(`🎬 Tocando animação "${firstAnim}" em ${equipmentSlot}`);
      }
    }

    return () => {
      if (groupRef.current && bone) {
        bone.remove(groupRef.current);
      }
    };
  }, [bone, modelScene, loadError, equipmentSlot, position, rotation, scale, actions]);

  // 🔥 FUNÇÃO PARA CRIAR FORMAS GEOMÉTRICAS (FALLBACK)
  const createFallbackShape = (slot) => {
    const configSlot = EQUIPMENT_CONFIG[slot];
    if (!configSlot) return null;

    const group = new THREE.Group();
    const color = configSlot.color;

    switch (configSlot.shape) {
      case 'sword': {
        // Cabo
        const handle = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.2, 0.08),
          new THREE.MeshStandardMaterial({ color: '#8B4513', metalness: 0.8, roughness: 0.3 })
        );
        handle.position.set(0, -0.3, 0);
        group.add(handle);
        // Guarda
        const guard = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.05, 0.05),
          new THREE.MeshStandardMaterial({ color: '#DAA520', metalness: 0.9, roughness: 0.2 })
        );
        guard.position.set(0, -0.1, 0);
        group.add(guard);
        // Lâmina
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.6, 0.04),
          new THREE.MeshStandardMaterial({ color: '#CCCCCC', metalness: 0.9, roughness: 0.2 })
        );
        blade.position.set(0, 0.25, 0);
        group.add(blade);
        // Ponta
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

// Preload dos modelos (opcional, melhora performance)
useGLTF.preload('/models/weapons/fantasy_sword.glb');
useGLTF.preload('/models/weapons/fantasy_axe.glb');
useGLTF.preload('/models/weapons/shield_mecanic.glb');