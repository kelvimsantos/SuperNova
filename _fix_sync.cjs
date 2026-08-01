const fs = require('fs');
const path = require('path');

const dir = __dirname;

// 1. STORE - add mountRotationRef
let store = fs.readFileSync(path.join(dir, 'src/hooks/useGameStore.js'), 'utf8');

// Check if already updated
if (!store.includes('mountRotationRef')) {
  store = store.replace(
    'mountRotation: 0,',
    'mountRotationRef: { current: 0 },\n  mountRotation: 0,'
  );
  
  // setMountRotation also updates the ref
  store = store.replace(
    'setMountRotation: (rotation) => set({',
    'setMountRotation: (rotation) => { get().mountRotationRef.current = rotation; set({'
  );
  store = store.replace(
    'mountRotation: rotation,',
    'mountRotation: rotation, });'
  );
  // Fix double closing
  store = store.replace('}); })', '})');
  
  fs.writeFileSync(path.join(dir, 'src/hooks/useGameStore.js'), store, 'utf8');
  console.log('STORE: OK');
} else {
  console.log('STORE: already has mountRotationRef');
}

// 2. PLAYER.JSX - read mountRotationRef directly in useFrame
let player = fs.readFileSync(path.join(dir, 'src/components/Player.jsx'), 'utf8');

if (!player.includes('mountRotationRef')) {
  // Replace: if (isMounted) { playAnimation('Idle'); if (visualRef.current) visualRef.current.rotation.y = mountRotation; return; }
  player = player.replace(
    "if (isMounted) {\n      playAnimation('Idle');\n      if (visualRef.current) visualRef.current.rotation.y = mountRotation;\n      return;\n    }",
    "if (isMounted) {\n      playAnimation('Idle');\n      if (visualRef.current) visualRef.current.rotation.y = useGameStore.getState().mountRotationRef.current;\n      return;\n    }"
  );
  fs.writeFileSync(path.join(dir, 'src/components/Player.jsx'), player, 'utf8');
  console.log('PLAYER: OK');
} else {
  console.log('PLAYER: already updated');
}

// 3. AVATARPLAYER.JSX
let avatar = fs.readFileSync(path.join(dir, 'src/components/AvatarPlayer.jsx'), 'utf8');

if (!avatar.includes('mountRotationRef')) {
  avatar = avatar.replace(
    "if (isMounted) {\n      playAnimation('idle2');\n      if (visualRef.current) visualRef.current.rotation.y = mountRotation;\n      return;\n    }",
    "if (isMounted) {\n      playAnimation('idle2');\n      if (visualRef.current) visualRef.current.rotation.y = useGameStore.getState().mountRotationRef.current;\n      return;\n    }"
  );
  fs.writeFileSync(path.join(dir, 'src/components/AvatarPlayer.jsx'), avatar, 'utf8');
  console.log('AVATAR: OK');
} else {
  console.log('AVATAR: already updated');
}

// 4. MOUNT.JSX - also write to ref directly
let mount = fs.readFileSync(path.join(dir, 'src/components/mounts/Mount.jsx'), 'utf8');

if (!mount.includes('mountRotationRef')) {
  mount = mount.replace(
    'setMountRotation(currentRotation.current);',
    'setMountRotation(currentRotation.current);\n      useGameStore.getState().mountRotationRef.current = currentRotation.current;'
  );
  fs.writeFileSync(path.join(dir, 'src/components/mounts/Mount.jsx'), mount, 'utf8');
  console.log('MOUNT: OK');
} else {
  console.log('MOUNT: already updated');
}

console.log('\nALL DONE');
