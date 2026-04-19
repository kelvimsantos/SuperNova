import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import useGameStore from '../hooks/useGameStore';

export const Portal = ({ data }) => {
  const boxRef = useRef();
  const [canTeleport, setCanTeleport] = useState(true);
  const player = useGameStore(state => state.playerRigidBody);
  const setCurrentScene = useGameStore(state => state.setCurrentScene);

  useFrame(() => {
    if (!player || !boxRef.current || !canTeleport) return;

    const playerPos = player.translation();
    const portalPos = boxRef.current.position;

    const dx = playerPos.x - portalPos.x;
    const dz = playerPos.z - portalPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 1.5) {
      console.log(`🚪 Teleportando para: ${data.targetScene}`);
      setCanTeleport(false);
      setCurrentScene(data.targetScene);
      setTimeout(() => setCanTeleport(true), 1000);
    }
  });

  return (
    <Box ref={boxRef} position={data.position} args={[1, 2, 1]}>
      <meshStandardMaterial color="purple" emissive="blue" emissiveIntensity={0.5} />
    </Box>
  );
};