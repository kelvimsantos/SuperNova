# WEBGPU POC ChangeLog

Este arquivo registra o que seria feito para habilitar WebGPU e como testar.

## P0 (agora)
- Stack atual: `react-three-fiber@8.16` + `three@0.162` + `@react-three/drei@9.122`.
- Primeiro passo para WebGPU: precisa de suporte no renderer do three/R3F (não existe no código atual).

## O que falta
- Uma dependência/abordagem para usar renderer com backend WebGPU (por exemplo, renderer WebGPURenderer do três, ou wrapper compatível com R3F).
- Ajustar `Canvas` no R3F para usar esse renderer.

## Como testar
- Abrir navegador com WebGPU suportado (Chrome/Edge recentes).
- Ver no DevTools console se `navigator.gpu` existe.
- Rodar benchmark: mesma cena + mesmo número de itens.

## Resultado esperado
- FPS e 1% low melhorando.
- Sem quebras visuais (fog/clouds/water).

