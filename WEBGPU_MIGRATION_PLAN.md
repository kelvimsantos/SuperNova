# WEBGPU Migração (ordens de prioridade + plano de projeto)

## Premissas (o que existe hoje)
- Projeto em **React Three Fiber (R3F)** + **three.js**.
- Gameplay/objetos 3D: mundo/scene carregada com GLB, itens (pickup) com muitos `<mesh>`/`useFrame`, efeitos (água/volumetric fog/clouds), inventário via Zustand.
- Renderer hoje: **WebGL** (não há WebGPU no código atual).

## Por que “mudar para WebGPU” nem sempre é o 1º passo
WebGPU pode melhorar algumas rotas de render e escalabilidade, mas **não elimina gargalos de JS/React/main-thread** (ex.: loops de proximidade, muitos componentes rodando `useFrame`, render pesado em UI).

O plano abaixo ordena prioridades para evitar reconstruir tudo sem antes medir o ganho.

---

## Ordem de Prioridade (alto → baixo)

### P0 — Preparar pipeline e medir baseline (obrigatório)
1. Definir **métricas**: FPS médio, 1% low FPS, tempo de frame (ms), uso de CPU/GPU.
2. Criar “cenários padrão” de benchmark:
   - Cena com muitos `ItemPickup` no chão
   - Cena com combate ativo
   - Cena com UI aberta (inventário/equipamento)
3. Anotar resultados antes da migração (baseline).

> Entregável: tabela `baseline.md` ou seção no mesmo documento com números.

---

### P1 — Otimizar gargalos CPU/React (antes de trocar renderer)
Mesmo se migrar para WebGPU, os gargalos de JS continuam.
Prioridades já evidentes no seu código:
1. **Itens no chão**: evitar `setState` por frame para todos itens.
   - Já fizemos uma otimização no `ItemPickup` (redução de setState/checagem).
2. **Evitar re-render grande** em listas do inventário.
   - `inventory.map(...)` pode ficar caro com lista grande.
3. **Evitar alerts/confirm em fluxo de gameplay** (não é o caso do pickup, mas checar).

> Entregável: relatório “top 3 gargalos de CPU” e como reduzir.

---

### P2 — Testar WebGPU sem mudar o resto (prova de conceito)
Objetivo: validar se seu navegador/dispositivo aceita WebGPU e se há ganho real.
1. Implementar/alternar renderer para WebGPU em modo “flag”.
2. Manter o resto idêntico (materiais/efeitos) o máximo possível.
3. Validar compatibilidade:
   - GLB/three materiais
   - sombras (se usadas)
   - fog/volumetrics/water effects

> Entregável: branch `webgpu-poc` e tabela de comparação.

---

### P3 — Converter efeitos e materiais críticos
Quando a base funcionar, adaptar os trechos que mais pesam:
1. **VolumetricFog/Clouds**: verificar se são shader-heavy e se o caminho em WebGPU mantém qualidade.
2. **Water**: seu “WaterSurface_Light/UnderwaterEffect” pode depender de shaders específicos.
3. **Pós-processamento** (se houver em outros arquivos): verificar compatibilidade.

> Entregável: checklist de compatibilidade e ajustes visuais.

---

### P4 — Arquitetura do projeto para facilitar manutenção
Se a migração for grande, separar:
1. Camada de render (WebGL vs WebGPU) com interface única:
   - `createRenderer()`
   - `SceneRoot`
2. Camada de gameplay/UI: não deve depender do backend.

> Entregável: abstrações simples para trocar backend.

---

### P5 — Melhorias finais e hardening (queda/compat fallback)
1. Fallback automático:
   - se WebGPU falhar, cair para WebGL sem quebrar.
2. Cache/recursos:
   - garantir que dispose/limpeza está correta (principalmente em itens no mundo).
3. Opções de qualidade (dynamic): ajustar densidade/contagem.

> Entregável: “quality presets” e robustez.

---

## Como será “criar um projeto em WebGPU” (o caminho prático)
Como seu projeto já é R3F, existem 2 abordagens.

### Abordagem A (recomendada): manter R3F/three e trocar backend
1. Adicionar uma configuração/flag `RENDERER_BACKEND=webgpu`.
2. Tentar habilitar WebGPU no renderer (dependendo do suporte disponível no ambiente/versão das libs).
3. Se o suporte for incompleto para algum efeito, ajustar shaders/materiais.

**Vantagem:** menos retrabalho.

### Abordagem B: criar “um projeto novo” (starter) com WebGPU
1. Criar um app novo (ex.: Vite + R3F) já configurado para WebGPU.
2. Copiar componentes e, por compatibilidade, refatorar shaders/efeitos.
3. Integrar gameplay/UI (Zustand) sem alterar.

**Vantagem:** evita acoplamento com WebGL.
**Desvantagem:** mais trabalho.

> Pelo seu objetivo (“melhorar performance e suporte a melhores gráficos”), a Abordagem A é a primeira a tentar.

---

## Plano de execução por tarefas (checklist)

### T1 — baseline e benchmarks
- [ ] Criar rotina/cheat para forçar cenário de teste (ex.: spawna N itens)
- [ ] Medir FPS e armazenar baseline

### T2 — POC WebGPU
- [ ] Criar flag de renderer
- [ ] Rodar WebGPU POC e medir novamente
- [ ] Registrar compatibilidade (shadows, fog, water)

### T3 — efeitos e materiais
- [ ] Ajustar/otimizar Volumetric fog/clouds
- [ ] Ajustar WaterSurface/UnderwaterEffect

### T4 — fallback e presets
- [ ] Implementar fallback automático para WebGL
- [ ] Implementar presets de qualidade

---

## Riscos (para você saber antes de começar)
- Nem todo efeito shader-based em three se comporta igual em WebGPU.
- O ganho de FPS pode ser menor se o gargalo for CPU (JS) em vez de GPU.
- Migrar “tudo de uma vez” aumenta chance de quebrar gameplay.

---

## Próximo passo sugerido (sem adivinhar)
1. Você roda o POC WebGPU (T2) no seu navegador.
2. Se falhar/ficar lento, ajustamos primeiro o que pesa mais (CPU/JS) e só depois aprofundamos WebGPU.

---

## Arquivos que devem ser avaliados no repo (pontos de entrada)
- `src/components/ARScene.jsx` (composição geral)
- componentes de efeitos:
  - `src/components/VolumetricClouds.jsx`
  - `src/components/VolumetricFog.jsx`
  - `src/components/water/*`
- UI/inventário:
  - `src/components/inventory/*`
  - `src/hooks/useGameStore.js`
  - `src/components/items/ItemPickup.jsx`

---

## Saída final esperada
- Um commit/branch `webgpu` com:
  - alternância de backend
  - fallback
  - documentação de benchmarks antes/depois
  - compatibilidade dos efeitos principais

