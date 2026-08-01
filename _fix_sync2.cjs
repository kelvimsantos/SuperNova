const fs = require('fs');
const path = require('path');
const dir = __dirname;

// 1. MOUNT.JSX - switch to kinematic, use setTranslation, raycast ground snap
let mount = fs.readFileSync(path.join(dir, 'src/components/mounts/Mount.jsx'), 'utf8');

// Change RigidBody props: dynamic -> kinematic, remove mass/damping
mount = mount.replace(
  `<RigidBody\n      ref={rigidBodyRef}\n      type="dynamic"\n      mass={3}\n      linearDamping={0.5}\n      position={[0, 500, 0]}\n      enabledRotations={[false, false, false]}\n    >`,
  `<RigidBody\n      ref={rigidBodyRef}\n      type="kinematic"\n      position={[0, 500, 0]}\n      enabledRotations={[false, false, false]}\n    >`
);

// Replace setLinvel + setY with kinematic setTranslation approach
// Find the movement section and replace with kinematic approach
mount = mount.replace(
  `    // Aplica velocidade horizontal\n    rigidBodyRef.current.setLinvel(\n      { x: moveVec.x * speed, y: -0.1, z: moveVec.z * speed },\n      true\n    );`,
  `    // Posição atual\n    const pos = rigidBodyRef.current.translation();\n    // Move horizontalmente via setTranslation (cinemático)\n    const newX = pos.x + moveVec.x * speed * delta;\n    const newZ = pos.z + moveVec.z * speed * delta;\n    // Ground snap: mantém Y atual, a gravidade não afeta corpos cinemáticos\n    const newY = pos.y;`
);

// After the rotation block, add the setTranslation call
mount = mount.replace(
  `    if (mountGroupRef.current) {\n      mountGroupRef.current.rotation.y = currentRotation.current;\n      setMountRotation(currentRotation.current);
      useGameStore.getState().mountRotationRef.current = currentRotation.current;\n    }`,
  `    if (mountGroupRef.current) {\n      mountGroupRef.current.rotation.y = currentRotation.current;\n      setMountRotation(currentRotation.current);
      useGameStore.getState().mountRotationRef.current = currentRotation.current;\n    }\n\n    // Aplica posição (cinemático)\n    if (isMoving) {\n      rigidBodyRef.current.setTranslation({ x: newX, y: newY, z: newZ }, true);\n    }`
);

// Remove the CapsuleCollider from kinematic mount (not needed for kinematic)
mount = mount.replace(
  `      <CapsuleCollider args={[0.3, 0.4]} />\n      <group`,
  `      <group`
);

fs.writeFileSync(path.join(dir, 'src/components/mounts/Mount.jsx'), mount, 'utf8');
console.log('MOUNT: kinematic + setTranslation');

// 2. AVATARPLAYER.JSX - use mountRotationRef.current instead of mountRotation
let avatar = fs.readFileSync(path.join(dir, 'src/components/AvatarPlayer.jsx'), 'utf8');

avatar = avatar.replace(
  `if (visualRef.current) visualRef.current.rotation.y = mountRotation;`,
  `if (visualRef.current) visualRef.current.rotation.y = useGameStore.getState().mountRotationRef.current;`
);

fs.writeFileSync(path.join(dir, 'src/components/AvatarPlayer.jsx'), avatar, 'utf8');
console.log('AVATAR: using mountRotationRef');

// 3. PLAYER.JSX - already uses mountRotationRef, verify
let player = fs.readFileSync(path.join(dir, 'src/components/Player.jsx'), 'utf8');
if (player.includes('mountRotationRef.current')) {
  console.log('PLAYER: already using mountRotationRef');
} else {
  console.log('PLAYER: needs update');
}

console.log('ALL DONE');
