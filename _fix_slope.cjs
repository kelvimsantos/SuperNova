const fs = require('fs');
const path = require('path');

let c = fs.readFileSync(path.join(__dirname, 'src/components/mounts/Mount.jsx'), 'utf8');

// 1. Add getGroundNormal function after getGroundHeight
c = c.replace(
`  // Raycast para altura do terreno
  const getGroundHeight = (x, z) => {`,
`  // Quaternion de inclinação suavizada (slope)
  const slopeQuat = useRef(new THREE.Quaternion());
  const targetSlopeQuat = useRef(new THREE.Quaternion());

  // Raycast para altura + normal do terreno (3 pontos)
  const getGroundData = (x, z) => {
    if (!worldGroupRef?.current) return { height: null, normal: new THREE.Vector3(0, 1, 0) };
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    raycaster.far = 200;

    const meshes = [];
    worldGroupRef.current.traverse((child) => {
      if (child.isMesh && child.visible) meshes.push(child);
    });

    const castRay = (ox, oz) => {
      raycaster.set(new THREE.Vector3(ox, 100, oz), down);
      let closest = Infinity;
      let hit = null;
      let normal = new THREE.Vector3(0, 1, 0);
      for (const mesh of meshes) {
        const intersects = raycaster.intersectObject(mesh, true);
        if (intersects.length > 0 && intersects[0].distance < closest) {
          closest = intersects[0].distance;
          hit = intersects[0].point.y;
          if (intersects[0].face) normal.copy(intersects[0].face.normal);
        }
      }
      return { height: hit, normal };
    };

    // 3 pontos: centro, frente, direita
    const spacing = 0.3;
    const center = castRay(x, z);
    const front = castRay(x + moveVecRef.current.x * spacing, z + moveVecRef.current.z * spacing);
    const rightPt = castRay(x + moveVecRightRef.current.x * spacing, z + moveVecRightRef.current.z * spacing);

    // Calcular normal a partir dos 3 pontos
    const p1 = new THREE.Vector3(x, center.height !== null ? center.height : 0, z);
    const p2 = new THREE.Vector3(x + moveVecRef.current.x * spacing, front.height !== null ? front.height : p1.y, z + moveVecRef.current.z * spacing);
    const p3 = new THREE.Vector3(x + moveVecRightRef.current.x * spacing, rightPt.height !== null ? rightPt.height : p1.y, z + moveVecRightRef.current.z * spacing);

    const v1 = new THREE.Vector3().subVectors(p2, p1);
    const v2 = new THREE.Vector3().subVectors(p3, p1);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
    if (normal.y < 0) normal.negate();

    return { height: center.height, normal };
  };

  // Raycast para altura do terreno (original, mantido)
  const getGroundHeight = (x, z) => {`
);

// 2. Add moveVecRefs for normal calculation
c = c.replace(
`  // Referência para suavização de rotação
  const targetRotation = useRef(0);`,
`  // Refs para direções (usados no getGroundData)
  const moveVecRef = useRef(new THREE.Vector3(0, 0, 1));
  const moveVecRightRef = useRef(new THREE.Vector3(1, 0, 0));

  // Referência para suavização de rotação
  const targetRotation = useRef(0);`
);

// 3. Update moveVec refs after computing moveVec
c = c.replace(
`    if (moveVec.length() > 0) moveVec.normalize();

    // Posição atual`,
`    if (moveVec.length() > 0) moveVec.normalize();

    // Guarda direções para o cálculo da normal do terreno
    if (isMoving) {
      moveVecRef.current.copy(moveVec);
      moveVecRightRef.current.copy(right);
    }

    // Posição atual`
);

// 4. Replace getGroundHeight call with getGroundData
c = c.replace(
`    // Altura do terreno
    const groundY = getGroundHeight(newX, newZ);
    let newY = groundY !== null ? groundY + MOUNT_BASE_HEIGHT : pos.y;`,
`    // Dados do terreno (altura + normal)
    const groundData = getGroundData(newX, newZ);
    const groundY2 = groundData.height;
    let newY = groundY2 !== null ? groundY2 + MOUNT_BASE_HEIGHT : pos.y;`
);

// 5. Add slope rotation after ground data
c = c.replace(
`    // Pulo simulado`,
`    // Inclinação (slope) baseada na normal do terreno
    if (!isJumping.current && groundData.normal) {
      const up = new THREE.Vector3(0, 1, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, groundData.normal);
      targetSlopeQuat.current.copy(q);
    } else {
      targetSlopeQuat.current.identity();
    }

    // Suaviza inclinação
    slopeQuat.current.slerp(targetSlopeQuat.current, Math.min(1, 8 * delta));

    // Pulo simulado`
);

// 6. Add slope rotation to mountGroupRef
c = c.replace(
`    if (mountGroupRef.current) {
      mountGroupRef.current.rotation.y = currentRotation.current;`,
`    if (mountGroupRef.current) {
      // Aplica rotação Y + inclinação do terreno
      const euler = new THREE.Euler().setFromQuaternion(slopeQuat.current);
      mountGroupRef.current.rotation.x = euler.x;
      mountGroupRef.current.rotation.z = euler.z;
      mountGroupRef.current.rotation.y = currentRotation.current;`
);

fs.writeFileSync(path.join(__dirname, 'src/components/mounts/Mount.jsx'), c, 'utf8');
console.log('Slope fix applied');
