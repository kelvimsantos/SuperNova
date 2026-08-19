import { useEffect, useRef, useState } from 'react';

// Contador de FPS MÍNIMO e SEGURO: DOM puro (rAF + setInterval), NÃO toca
// no WebGL, no canvas, no useFrame, no store e NÃO escreve document.title.
// Versão anterior do DebugHud quebrava o render no WebKit justamente por
// mexer no GL/título a cada 500ms — esta aqui é à prova.
//
// Visível por padrão como um badge pequeno. Ativa/desativa com a tecla F8
// ou com ?fps=0 na URL.
export const FpsHud = () => {
  const [visible, setVisible] = useState(
    () => new URLSearchParams(window.location.search).get('fps') !== '0'
  );
  const [fps, setFps] = useState(0);
  const framesRef = useRef(0);

  useEffect(() => {
    let rafId;
    const count = () => {
      framesRef.current++;
      rafId = requestAnimationFrame(count);
    };
    rafId = requestAnimationFrame(count);

    const id = setInterval(() => {
      const nowFps = Math.round(framesRef.current * 2);
      framesRef.current = 0;
      setFps(nowFps);
    }, 500);

    const onKey = (e) => {
      if (e.key === 'F8') setVisible((v) => !v);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(id);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!visible) return null;

  const color = fps >= 45 ? '#4caf50' : fps >= 25 ? '#ffa726' : '#f44336';

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.7)',
        color,
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
        padding: '4px 8px',
        borderRadius: 6,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {fps} FPS
    </div>
  );
};