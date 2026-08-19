import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

// HUD de diagnóstico: FPS, draw calls, triângulos, passes de sombra e
// QUEBRA DE TEMPO DO FRAME:
//   frame  = intervalo entre rAFs (tudo que o navegador levou)
//   loop   = tempo dentro do loop 3D (useFrames + física rapier + render)
//   fora   = frame - loop → DOM/CSS/GC/compositor do navegador
// Ative com ?debug=1 na URL ou tecla F8.
export const DebugHud = () => {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const [data, setData] = useState({ fps: 0, calls: 0, tris: 0, shadowCalls: 0, gpu: '', camX: 0, camY: 0, camZ: 0, objects: 0, meshes: 0, lost: 0, loopAlive: true });
  const [profile, setProfile] = useState({ frameMs: 0, loopMs: 0, renderMs: 0 });
  const framesRef = useRef(0);
  const timeRef = useRef(performance.now());
  const [visible, setVisible] = useState(
    () => new URLSearchParams(window.location.search).get('debug') === '1'
  );

  // Instrumentação do tempo (mede no JS puro, não faz re-render por frame)
  const frameStartRef = useRef(0);
  const loopMsRef = useRef(0);
  // Batimento cardíaco do loop 3D: se parar de avançar, o loop morreu
  const lastLoopPulseRef = useRef(performance.now());
  // Contagem de perdas de contexto WebGL
  const lostRef = useRef(0);

  // Inicia a medição ANTES de todos os useFrame (prioridade negativa)
  useFrame(() => {
    frameStartRef.current = performance.now();
    lastLoopPulseRef.current = performance.now();
  }, -1000);

  // Fecha a medição DEPOIS do render (prioridade positiva)
  useFrame(() => {
    loopMsRef.current = performance.now() - frameStartRef.current;
  }, 1000);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F8') setVisible((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 🔥 Detecção de perda de contexto WebGL: causa clássica de "tela preta/
  //    travada com o jogo rodando" no WebKit. preventDefault() permite que o
  //    navegador tente restaurar o contexto.
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (e) => {
      e.preventDefault();
      lostRef.current++;
      console.error('⚠️ WEBGL: CONTEXTO PERDIDO! O canvas parou de desenhar.');
    };
    const onRestored = () => {
      lostRef.current = 0;
      console.log('✅ WebGL: contexto restaurado.');
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl]);

  useEffect(() => {
    let raf;
    let last = performance.now();
    let emaFrame = 16;
    let emaLoop = 4;
    const loop = () => {
      framesRef.current++;
      const now = performance.now();
      const frameMs = now - last;
      last = now;
      // Média exponencial suaviza sem alocar
      emaFrame = emaFrame * 0.9 + frameMs * 0.1;
      emaLoop = emaLoop * 0.9 + loopMsRef.current * 0.1;
      if (now - timeRef.current >= 500) {
        const fps = Math.round((framesRef.current * 1000) / (now - timeRef.current));
        const info = gl.info?.render;
        const shadow = gl.info?.shadowMap;
        let gpu = '';
        try {
          const glc = gl.getContext();
          gpu = glc.getParameter(glc.RENDERER) || '';
        } catch (e) {}
        const cam = camera?.position;
        let meshCount = 0;
        try {
          gl.scene.traverse((o) => { if (o.isMesh) meshCount++; });
        } catch (e) {}
        let ctxLost = lostRef.current > 0;
        try {
          if (gl.getContext().isContextLost()) ctxLost = true;
        } catch (e) {}
        const loopAlive = performance.now() - lastLoopPulseRef.current < 3000;
        setData({
          fps,
          calls: info?.calls ?? 0,
          tris: info?.triangles ?? 0,
          shadowCalls: shadow?.calls ?? 0,
          gpu,
          camX: cam ? cam.x : NaN,
          camY: cam ? cam.y : NaN,
          camZ: cam ? cam.z : NaN,
          objects: gl.scene.children.length,
          meshes: meshCount,
          lost: ctxLost ? lostRef.current + 1 : 0,
          loopAlive,
        });
        // 🔎 Diagnóstico NO TÍTULO DESATIVADO: escrever document.title a cada
        //    500ms força o Safari/WebKit a atualizar a barra do navegador a
        //    cada 500ms → travava o compositor → o mundo parava de renderizar.
        //    Só usar o painel (F8/?debug=1), que não mexe no título.
        setProfile({ frameMs: emaFrame, loopMs: emaLoop, renderMs: 0 });
        framesRef.current = 0;
        timeRef.current = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gl]);

  if (!visible) return null;

  const isSoftware = /swiftshader|llvmpipe|software/i.test(data.gpu);
  const shortGpu = data.gpu.length > 42 ? data.gpu.slice(0, 42) + '…' : data.gpu;
  const otherMs = Math.max(0, profile.frameMs - profile.loopMs);
  const camStr = (v) => (Number.isFinite(v) ? v.toFixed(1) : 'NaN!');

  return (
    <Html transform={false}>
      <div
        style={{
          position: 'fixed',
          top: 8,
          right: 8,
          zIndex: 99999,
          background: 'rgba(0,0,0,0.8)',
          color: '#0f0',
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '6px 10px',
          borderRadius: 6,
          pointerEvents: 'none',
          lineHeight: 1.6,
          whiteSpace: 'pre',
        }}
      >
{`FPS: ${data.fps}   (frame ${profile.frameMs.toFixed(1)}ms)
Loop 3D: ${profile.loopMs.toFixed(1)}ms
Fora do loop: ${otherMs.toFixed(1)}ms
Draw calls: ${data.calls}
Triângulos: ${(data.tris / 1000).toFixed(0)}k
Passes sombra: ${data.shadowCalls}
GPU: ${shortGpu}${isSoftware ? ' ⚠️ SOFTWARE' : ''}
GL: ${data.lost ? `⚠️ CONTEXTO PERDIDO (${data.lost})` : 'OK'}
Loop 3D: ${data.loopAlive ? 'VIVO' : '☠️ MORTO'}
Câmera: ${camStr(data.camX)}, ${camStr(data.camY)}, ${camStr(data.camZ)}
Cena: ${data.objects} objs / ${data.meshes} meshes`}
      </div>
    </Html>
  );
};