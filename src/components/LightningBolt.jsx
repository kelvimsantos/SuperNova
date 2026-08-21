// src/components/LightningBolt.jsx
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ⚡ Raio procedural agressivo: tubo branco grosso (bem visível) + linhas
//    de detalhe + luz forte no impacto. Leve: só existe por ~0.5s e são
//    geometrias pequenas (poucas centenas de vértices no total).
const LIFE = 0.5;
const SEGMENTS = 10;

const makeZigzag = (from, to, segments, jitterScale) => {
  const start = new THREE.Vector3().copy(from);
  const end = new THREE.Vector3().copy(to);
  const pts = [start.clone()];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const p = start.clone().lerp(end, t);
    const jitter = (1 - t) * jitterScale;
    p.x += (Math.random() - 0.5) * jitter;
    p.z += (Math.random() - 0.5) * jitter;
    pts.push(p);
  }
  return pts;
};

export const LightningBolt = ({ from, to, onDone }) => {
  const doneRef = useRef(false);
  const tRef = useRef(0);
  const matRef = useRef();
  const lineMatRef = useRef();
  const lightRef = useRef();
  const lastIntensity = useRef(0);

  const { mainPoints, branchLines } = useMemo(() => {
    const mainPoints = makeZigzag(from, to, SEGMENTS, 3.0);
    const branchLines = [];
    const mid = mainPoints[Math.floor(SEGMENTS * 0.45)];
    const end = new THREE.Vector3().copy(to);
    end.x += (Math.random() - 0.5) * 8;
    end.z += (Math.random() - 0.5) * 8;
    branchLines.push(makeZigzag(mid, end, 5, 1.5));
    const mid2 = mainPoints[Math.floor(SEGMENTS * 0.7)];
    const end2 = new THREE.Vector3().copy(to);
    end2.x += (Math.random() - 0.5) * 6;
    end2.z += (Math.random() - 0.5) * 6;
    branchLines.push(makeZigzag(mid2, end2, 4, 1.0));
    return { mainPoints, branchLines };
  }, [from, to]);

  const mainGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(mainPoints);
    return new THREE.TubeGeometry(curve, mainPoints.length * 2, 0.10, 5, false);
  }, [mainPoints]);

  const lineGeometry = useMemo(() => {
    const flat = [];
    for (let i = 0; i < mainPoints.length - 1; i++) {
      flat.push(mainPoints[i].x, mainPoints[i].y, mainPoints[i].z, mainPoints[i + 1].x, mainPoints[i + 1].y, mainPoints[i + 1].z);
    }
    for (const branch of branchLines) {
      for (let i = 0; i < branch.length - 1; i++) {
        flat.push(branch[i].x, branch[i].y, branch[i].z, branch[i + 1].x, branch[i + 1].y, branch[i + 1].z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
    return geo;
  }, [mainPoints, branchLines]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        if (onDone) onDone();
      }
    }, LIFE * 1000 + 50);
    return () => clearTimeout(timer);
  }, [onDone]);

  useFrame((_, dt) => {
    tRef.current += dt;
    const life = tRef.current / LIFE;
    if (life >= 1) {
      if (matRef.current) matRef.current.opacity = 0;
      if (lineMatRef.current) lineMatRef.current.opacity = 0;
      if (lightRef.current) lightRef.current.intensity = 0;
      if (!doneRef.current) {
        doneRef.current = true;
        if (onDone) onDone();
      }
      return;
    }
    const base = 1 - life;
    // 🔥 Flicker agressivo: pulsos rápidos e intensos
    const flicker = life < 0.45 ? (Math.sin(tRef.current * 110) > 0.15 ? 1 : 0.2) : 1;
    const coreOpacity = Math.min(1, base * flicker * 1.6);
    if (matRef.current) matRef.current.opacity = coreOpacity;
    if (lineMatRef.current) lineMatRef.current.opacity = Math.min(1, base * flicker);
    const targetIntensity = base * 5.0;
    if (lightRef.current) {
      lastIntensity.current += (targetIntensity - lastIntensity.current) * 0.4;
      lightRef.current.intensity = lastIntensity.current;
    }
  });

  return (
    <group>
      <mesh geometry={mainGeometry}>
        <meshBasicMaterial
          ref={matRef}
          color={0xffffff}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial
          ref={lineMatRef}
          color={0x9fc4ff}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      <pointLight
        ref={lightRef}
        position={[to.x, to.y + 0.5, to.z]}
        intensity={0}
        color={0xccddff}
        distance={18}
        decay={1.2}
      />
    </group>
  );
};