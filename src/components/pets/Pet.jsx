import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';

const PET_TYPES = {
  sphere: {
    label: 'Esfera',
    color: '#7aa7ff',
    kind: 'fly',
    size: 0.45,
  },
  cube: {
    label: 'Cubo',
    color: '#8cff9a',
    kind: 'land',
    size: 0.35,
  },
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function Pet({ className }) {
  const pet = useGameStore((s) => s.pet);
  const playerPosition = useGameStore((s) => s.playerPosition);

  const petGroupRef = useRef(null);
  const targetVec = useMemo(() => new THREE.Vector3(), []);
  const currentVec = useMemo(() => new THREE.Vector3(), []);

  const isActive = !!pet?.isActive;

  useFrame((_, delta) => {
    if (!isActive) return;
    if (!petGroupRef.current) return;
    if (!playerPosition) return;

    const group = petGroupRef.current;

    const typeKey = pet.type || 'sphere';
    const def = PET_TYPES[typeKey] || PET_TYPES.sphere;

    // distância mínima antes de começar a “seguir de verdade”
    const TELEPORT_DIST = 32;
    const FOLLOW_DIST = def.kind === 'land' ? 10.5 : 9.0;

    // offset “pra trás do player” baseado na direção em que o player está virado.
    // Como o store não guarda a rotação do avatar, usamos o vetor do pet para o player
    // e inferimos direção pelo movimento do player no eixo XZ via aproximação visual.
    // Para simplificar sem camera/rigidBody: usamos um offset fixo para "atrás".

    // Altura alvo
    const targetY = def.kind === 'land'
      ? playerPosition.y + 0.02
      : playerPosition.y + 0.20;

    // alvo base (sobre o player)
    targetVec.set(playerPosition.x, targetY, playerPosition.z);

    // offset fixo pra trás (z positivo/negativo pode inverter conforme o sistema,
    // então usamos um sinal que garante ficar atrás do player relativo ao ângulo do pet)
    const baseOffset = def.kind === 'land'
      ? new THREE.Vector3(0, 0.0, -1.65)
      : new THREE.Vector3(0, 0.25, -2.05);

    const targetWithOffset = targetVec.clone().add(baseOffset);


    currentVec.set(group.position.x, group.position.y, group.position.z);
    const dist = currentVec.distanceTo(targetWithOffset);

    // “velocidade” do pet (lerp por frame)
    // - maior => segue mais rápido
    // - menor => segue mais tarde/encaixa com calma
    const SPEED_BASE = def.kind === 'land' ? 0.0045 : 0.0055;
    const SPEED_FAR = def.kind === 'land' ? 0.009 : 0.010;

    if (dist > TELEPORT_DIST) {
      // teleporta pra não travar muito longe
      group.position.lerp(targetWithOffset, 1);
    } else {
      // começa a seguir de verdade após folga
      const followStart = FOLLOW_DIST;
      const over = clamp((dist - followStart) / (TELEPORT_DIST - followStart), 0, 1);

      // acelera conforme afasta da folga, mas com teto
      const lerpT = clamp((SPEED_BASE + (SPEED_FAR - SPEED_BASE) * over) * (delta * 60), 0, 1);
      group.position.lerp(targetWithOffset, lerpT);
    }



    // rotação: olhar para o player e “na direção” do movimento
    // (sem depender de animação — apenas face ao player)
    // rotação: só atualiza quando tiver deslocamento real (evita “travamento” do ângulo)
    const toPlayer = new THREE.Vector3(
      playerPosition.x - group.position.x,
      0,
      playerPosition.z - group.position.z
    );

    if (toPlayer.lengthSq() > 0.0001) {
      const desiredYaw = Math.atan2(toPlayer.x, toPlayer.z);
      // suaviza para acompanhar a virada do player
      // (lerpAngle não está disponível em algumas versões do three; usamos lerp simples com wrap)
      const a = group.rotation.y;
      const b = desiredYaw;
      let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
      const alpha = Math.min(1, delta * 6);
      group.rotation.y = a + diff * alpha;

    }

  });

  if (!pet?.isUnlocked) return null;
  const typeKey = pet.type || 'sphere';
  const def = PET_TYPES[typeKey] || PET_TYPES.sphere;

  return (
    <group ref={petGroupRef} visible={isActive} className={className}>
      {typeKey === 'cube' ? (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[pet.size || def.size, pet.size || def.size, pet.size || def.size]} />
          <meshStandardMaterial color={def.color} roughness={0.5} metalness={0.05} emissive={'#000000'} />
        </mesh>
      ) : (
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[pet.size || def.size, 20, 20]} />
          <meshStandardMaterial color={def.color} roughness={0.35} metalness={0.1} emissive={'#000000'} />
        </mesh>
      )}

      {/* “olhinhos” simples */}
      {typeKey === 'cube' ? (
        <>
          <mesh position={[-0.08, 0.08, 0.20]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color={'#111'} />
          </mesh>
          <mesh position={[0.08, 0.08, 0.20]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color={'#111'} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[-0.12, 0.12, 0.38]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color={'#111'} />
          </mesh>
          <mesh position={[0.12, 0.12, 0.38]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color={'#111'} />
          </mesh>
        </>
      )}

      {/* etiqueta de vida visual */}
      <mesh position={[0, -0.35, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.20, 0.24, 24]} />
        <meshStandardMaterial
          color={
            pet.life > 0.6
              ? '#38ff7a'
              : pet.life > 0.25
              ? '#ffd24a'
              : '#ff4a4a'
          }
          emissive={'#000000'}
        />
      </mesh>
    </group>
  );
}

