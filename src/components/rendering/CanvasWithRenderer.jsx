import { Canvas } from '@react-three/fiber';
import { getEffectiveRendererMode } from './RendererMode';
import * as THREE from 'three';

// Importação WebGPU do three (quando disponível).
// Observação: dependendo da versão/entrypoints do seu `three`, este import pode falhar.
// Nesse caso, o código faz fallback automático para WebGLRenderer.
let WebGPURenderer;
try {
  // eslint-disable-next-line import/no-unresolved
  // @ts-ignore
  WebGPURenderer = (await import('three/webgpu')).WebGPURenderer;
} catch {
  WebGPURenderer = null;
}

const createRenderer = async (mode) => {
  // Sempre tenta WebGPU quando solicitado e quando existe suporte (e módulo carregável)
  if (mode === 'webgpu' && WebGPURenderer) {
    try {
      const renderer = new WebGPURenderer({ antialias: true });
      // conforme sua exigência: init assíncrono
      if (typeof renderer.init === 'function') {
        await renderer.init();
      }
      return renderer;
    } catch (e) {
      console.warn('WebGPU falhou, fazendo fallback para WebGL:', e);
    }
  }

  const glRenderer = new THREE.WebGLRenderer({ antialias: true });
  return glRenderer;
};

export const CanvasWithRenderer = ({ children, ...canvasProps }) => {
  const effective = getEffectiveRendererMode();

  return (
    <Canvas
      {...canvasProps}
      // R3F: permite passar uma função async para criar o renderer.
      // Se o modo for webgpu e der tudo certo, renderiza em WebGPU.
      // Senão, volta para WebGL automaticamente.
      // @ts-ignore - suporte a renderers customizados depende da versão do @react-three/fiber.
      createRenderer={() => createRenderer(effective)}
    >
      {children}
    </Canvas>
  );
};


