const fs = require('fs');
const path = require('path');

// ===== PLAYER.JSX =====
let c = fs.readFileSync(path.join(__dirname, 'src/components/Player.jsx'), 'utf8');

// Add mount + mountRotation subscriptions after isAdjusting
c = c.replace(
  '  const [isAdjusting, setIsAdjusting] = useState(false);\n  \n  // 🔥 EQUIPAMENTOS\n  const equippedItems',
  '  const [isAdjusting, setIsAdjusting] = useState(false);\n  \n  // 🔥 MONTARIA\n  const mount = useGameStore((state) => state.mount);\n  const mountRotation = useGameStore((state) => state.mountRotation);\n\n  // 🔥 EQUIPAMENTOS\n  const equippedItems'
);

// Add isMounted freeze logic in useFrame
c = c.replace(
  '    const isMoving = dx !== 0 || dz !== 0;\n    if (!isMoving) {\n      playAnimation(grounded ? \'Idle\' : \'Crouch\');\n    } else {\n      playAnimation(\'Run\');\n    }',
  '    const isMoving = dx !== 0 || dz !== 0;\n    const isMounted = mount?.isActive === true;\n\n    if (isMounted) {\n      playAnimation(\'Idle\');\n      if (visualRef.current) visualRef.current.rotation.y = mountRotation;\n      return;\n    }\n\n    if (!isMoving) {\n      playAnimation(grounded ? \'Idle\' : \'Crouch\');\n    } else {\n      playAnimation(\'Run\');\n    }'
);

fs.writeFileSync(path.join(__dirname, 'src/components/Player.jsx'), c, 'utf8');
console.log('Player.jsx OK - mount:', c.includes('isMounted'));

// ===== AVATARPLAYER.JSX =====
let a = fs.readFileSync(path.join(__dirname, 'src/components/AvatarPlayer.jsx'), 'utf8');

// Add mount + mountRotation subscriptions
a = a.replace(
  '  const [isAdjusting, setIsAdjusting] = useState(false);\n  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);\n  const playerHealth',
  '  const [isAdjusting, setIsAdjusting] = useState(false);\n  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);\n  const mount = useGameStore((state) => state.mount);\n  const mountRotation = useGameStore((state) => state.mountRotation);\n  const playerHealth'
);

// Add isMounted freeze logic
a = a.replace(
  '    const isMoving = dx !== 0 || dz !== 0;\n    \n    if (!isMoving) {\n      playAnimation(grounded ? \'idle2\' : \'Fall\');\n    } else {\n      playAnimation(\'Run\');\n    }',
  '    const isMoving = dx !== 0 || dz !== 0;\n    const isMounted = mount?.isActive === true;\n\n    if (isMounted) {\n      playAnimation(\'idle2\');\n      if (visualRef.current) visualRef.current.rotation.y = mountRotation;\n      return;\n    }\n\n    if (!isMoving) {\n      playAnimation(grounded ? \'idle2\' : \'Fall\');\n    } else {\n      playAnimation(\'Run\');\n    }'
);

fs.writeFileSync(path.join(__dirname, 'src/components/AvatarPlayer.jsx'), a, 'utf8');
console.log('AvatarPlayer.jsx OK - mount:', a.includes('isMounted'));
