import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import useGameStore from '../hooks/useGameStore';

export const MovementController = () => {
  const playerRigidBody = useGameStore((s) => s.playerRigidBody);
  const movementDirection = useGameStore((s) => s.movementDirection);

  useFrame(({ camera }) => {
    if (!playerRigidBody || !movementDirection) return;

    const cameraDir = new Vector3(0, 0, 0);
    camera.getWorldDirection(cameraDir);
    cameraDir.y = 0;
    cameraDir.normalize();

    const moveDir = new Vector3(0, 0, 0);
    if (movementDirection === 'forward') moveDir.copy(cameraDir);
    else if (movementDirection === 'backward') moveDir.copy(cameraDir).negate();
    else if (movementDirection === 'left') {
      moveDir.copy(cameraDir).cross(new Vector3(0, 1, 0)).normalize();
    } else if (movementDirection === 'right') {
      moveDir.copy(cameraDir).cross(new Vector3(0, -1, 0)).normalize();
    }

    const speed = 2;
    const currentVel = playerRigidBody.linvel();
    playerRigidBody.setLinvel(
      {
        x: moveDir.x * speed,
        y: currentVel.y,
        z: moveDir.z * speed,
      },
      true
    );
  });

  return null;
};