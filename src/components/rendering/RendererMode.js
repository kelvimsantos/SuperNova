// src/components/rendering/RendererMode.js

// Modo de render (constante para chavear WebGL/WebGPU sem depender de URL)
// Ajuste por env build-time (Vite):
//  - VITE_RENDERER_MODE=webgpu|webgl
// Se não existir, default é webgl.

export const RENDERER_MODE = (import.meta.env?.VITE_RENDERER_MODE || 'webgl').toLowerCase();

export const isWebGPUSupported = () => {
  try {
    return typeof navigator !== 'undefined' && !!navigator.gpu;
  } catch {
    return false;
  }
};

export const getEffectiveRendererMode = () => {
  if (RENDERER_MODE === 'webgpu') {
    return isWebGPUSupported() ? 'webgpu' : 'webgl';
  }
  return 'webgl';
};

