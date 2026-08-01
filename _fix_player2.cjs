const fs = require('fs');
let c = fs.readFileSync('src/components/Player.jsx', 'utf8');

// Remove the corrupted lines and replace with proper useEffect
c = c.replace(
  '\n\n\n      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);\n    }\n  }, [isMounted]);',
  '\n  // 🔥 NÃO desativa o RigidBody - manter ATIVO é ESSENCIAL para colisão com o terreno.\n  // Apenas zera velocidade para não andar sozinho quando montado.\n  useEffect(() => {\n    if (!rigidBodyRef.current) return;\n    rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);\n  }, [isMounted]);'
);

fs.writeFileSync('src/components/Player.jsx', c);
console.log('✅ Player.jsx fixed');
