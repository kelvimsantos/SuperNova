# Checklist de Otimizações — jogo (game-money)

Todas as otimizações abaixo **mantêm a qualidade visual igual ao editor**.
Teste cada item e marque. Se algo "vibra" (pop/sumindo de forma estranha),
me avise com o item marcado como falho.

## Como medir o desempenho

1. Rode o jogo (`npm run dev`) e abra o DevTools (F12) → aba **Performance**
   → clique em ⏺ gravar por 10s enquanto anda pelo cenário → leia o FPS médio.
2. Alternativa rápida: use o gráfico de FPS do Chrome (FPS meter: `Ctrl+Shift+P`
   → "Show frames per second").
3. Ande **de um lado a outro do mapa** e gire a câmera — é onde o custo aparece.
4. Teste também **de dia e de noite** (o ciclo dura 10 min de cada).

---

## ✅ 1. Grama em chunks com culling real

**O que mudou:** `src/components/fluffy/FluffyGrass.jsx` — as ~82k touceiras
viraram chunks de 16u, cada um com bounding sphere real. O three culla os
chunks fora do frustum (câmera E pass de sombra) em vez de processar o campo
inteiro a cada frame.

**Como testar:** olhe para o chão a partir do alto — a grama deve estar
idêntica ao editor. Gire a câmera rápido: nada de "quadrado desaparecendo"
perto da tela (culling errado apareceria como buracos).

**Resultado esperado:** GPU processa ~metade dos vértices (só o visível).

## ✅ 2. Shadow map sob demanda

**O que mudou:** `src/components/WeatherController.jsx` — `shadow.autoUpdate =
false`; o mapa de sombras só regenera quando a luz (sol/lua) ou o jogador
realmente se moveram (> 0.05u).

**Como testar:** fique PARADO. As sombras continuam perfeitas (a cena não muda).
Ande — a sombra acompanha normalmente. O custo cai para ~0 quando parado.

**Resultado esperado:** parado = zero passes de sombra; andando = ~30Hz.

## ✅ 3. Sombras só perto do jogador

**O que mudou:** novo `src/components/DistanceShadows.jsx` — a cada ~15 frames
liga/desliga `castShadow` por distância ao jogador:
- grama: 16u | árvores fluffy: 22u | pinheiros/objetos: 24u
- histerese 1.35× (liga no raio, desliga só bem depois) — sem pisca-pisca

**Como testar:** ande em linha reta longe de um pinheiro e olhe para trás —
a sombra dele desaparece devagar lá atrás (invisível na prática). Ande até
um grupo de árvores: as sombras aparecem ao se aproximar, sem flicker.

**Resultado esperado:** o pass de sombra só desenha um círculo de 16–24u.

## ✅ 4. LOD de densidade da grama (shader)

**O que mudou:** `src/components/fluffy/fluffyShaders.js` — no vertex shader da
grama:
- 0–20u da câmera: densidade cheia
- 20–34u: tufts encolhem até 8% (smoothstep) — o fade agora é **geométrico**
- 27–34u: metade das instâncias some (paridade `gl_InstanceID`)
- Como o pass é opaco (item 7), o "dissolve" é por encolhimento: a grama longe
  fica mais baixa e rala, como pasto visto de longe — sem wall de grama

**Como testar:** olhe o horizonte/grama distante — deve parecer grama curta
entrando na névoa, sem paredão e sem tufts gigantes no fundo. Gire a câmera
lentamente: nenhum tuft "pisca" ao mudar de anel.

**Resultado esperado:** fill rate da grama cai muito com a distância.

## ✅ 5. Sombra noturna em 512 (✅ superado pelo item 14 — agora 512 sempre)

**O que mudou:** `src/components/WeatherController.jsx` — à noite o shadow map
cai de 1024 para 512 (luz da lua é fraca; sombra quase invisível).

**Como testar:** espere a noite chegar (ou use o ciclo). A sombra noturna
continua suave e imperceptível, mas o pass de sombra fica 4× mais barato.
De dia volta a 1024 automaticamente.

**Resultado esperado:** noite = pass de sombra 4× mais leve.

## ✅ 6. Vento LOD na copa das árvores

**O que mudou:** `src/components/fluffy/fluffyShaders.js` — o Perlin noise
(cnoise) por vértice da copa agora só roda para árvores a até ~14u da câmera
(soma gradual até ~24u, onde o balanço é subpixel). Árvore longe fica parada
e o GPU pula o cálculo do noise inteiro (branch por árvore).

**Como testar:** pare perto de uma árvore → ela balança igual ao editor.
Afaste-se 20+u e olhe para a árvore → o balanço some suavemente (imperceptível
na prática, mas se você procurar bem, é esse o comportamento esperado).

**Resultado esperado:** zero custo de cnoise para árvores distantes.

## ✅ 7. Grama no pass opaco

**O que mudou:** `src/components/fluffy/fluffyShaders.js` — `transparent: true`
→ `transparent: false`. A grama usa `alphaTest: 0.5` (pixel cortado na
tesoura), então o alpha é binário e o blending era desperdício. Agora ela
desenha no pass opaco: sem blending, sem ordenação de transparência.

**Como testar:** a grama deve estar **idêntica** ao editor (bordas já eram
cortadas pelo alphaTest). Olhe a grama contra o céu e contra água: sem halo
esbranquiçado nas bordas (halo era o blending desperdiçando).

**Resultado esperado:** menos fill rate e sem custo de ordenação.

## ✅ 8. Vidro d'água sem transmission (o GRANDE)

**O que mudou:** `src/components/water/WaterGlass.jsx` — o vidro do oceano
(104×104) usava `transmission={1}`: o three **renderizava a cena inteira num
FBO extra a cada frame** (grama 82k + árvores + pinheiros + zumbis + avatar,
tudo de novo) só para refratar através de um vidro com opacidade 8% (quase
invisível). Eficazmente DOBRAVA o custo de renderização.

Agora `transmission` só liga no modo água 'full' (opt-in no menu de
configurações). O padrão (light) usa vidro transparente comum — visual
praticamente idêntico (o tinte de 8% continuava igual), custo zero.

**Como testar:** olhe a água — o tinte azulado segue lá, o fundo segue visível
através dela. A diferença é só no FPS: deve subir bastante. No menu de
configurações, modo 'full' restaura o transmission (para comparar).

**Resultado esperado:** um pass de render inteiro eliminado.

## ✅ 9. Fog volumétrico só quando aparece

**O que mudou:** `src/components/WeatherController.jsx` — o `VolumetricFog`
(4 octaves de noise por pixel, tela inteira) rodava SEMPRE, até no tempo claro
onde a densidade 0.10 é invisível. Agora só monta com densidade >= 0.15:
tempo claro = zero custo. Nublado/vento/chuva/neve/neblina continuam iguais.

**Como testar:** tempo ☀️ claro → sem fog (já era praticamente invisível, o
céu e o far fade do horizonte seguem cobrindo). Mude para 🌧️/🌫️ → fog normal.

**Resultado esperado:** custo do fog = 0 no tempo claro.

## ✅ 10. Zumbis sem projetar sombra

**O que mudou:** `src/components/enemies/ZombiePool.js` — os 8 zumbis são
clones GLB esqueletados com MUITAS malhas animadas. Cada uma entrava no pass
de sombra a cada frame (esqueleto muda o tempo todo — nada cacheável).
Agora `castShadow = false` neles. Eles continuam **recebendo** sombra do
terreno/árvores.

**Como testar:** olhe o chão perto dos zumbis — a sombra dos zumbis some
(era muito pequena/ruidosa, difícil de notar), mas a do terreno/árvores
permanece. FPS sobe principalmente com 8 zumbis vivos na tela.

## ✅ 11. Distância da grama reduzida

**O que mudou:** `src/components/fluffy/fluffyShaders.js` — o LOD da grama
agora é **10→16u**: densidade cheia só até 10u (bem perto do jogador), metade
das instâncias some a partir de ~13u, e a grama praticamente some em 16u —
depois disso o chão usa a textura de grama do terreno (já tem cor). O que
sobra de distante é o chão texturizado + árvores + fog — o "tapete" 3D fica
só ao redor do jogador.

**Como testar:** ande pelo campo — o mato 3D fica num anel de ~16u ao redor
do jogador; além disso o chão continua com aparência de grama (textura), só
sem tufts. Se o limite ficar visível como "borda", dá para voltar para 12→20.

## ✅ 12. GPU dedicada em vez de integrada

**O que mudou:** `src/App.jsx` — `powerPreference: 'low-power'` →
`'high-performance'`. Em notebook com 2 GPUs (integrada + dedicada), o
`low-power` faz o navegador escolher a integrada (fraca). Com
`high-performance` ele usa a dedicada. Custa mais bateria.

**Como testar:** rode e veja o FPS — se o navegador já estava usando a GPU
dedicada, não muda nada; se usava a integrada, é um salto grande.

## ✅ 13. DPR 1x (resolução) + menu de verdade

**O que mudou:** `src/App.jsx` — o DPR era fixo `[1, 1.5]` e o menu
Configurações Gráficas era **decorativo** (ninguém lia as opções). Agora o
Canvas lê `graphicsSettings.dpr` do store (default 1 = performance) e o menu
de DPR (1x/1.5x/2x) funciona de verdade.

**Como testar:** rode o jogo — 3D renderiza em 1x (2.25× menos pixels que
1.5x, nitidez um pouco menor — UI continua nítida). No menu
Configurações → DPR 1.5x → a nitidez volta (para comparar).

## ✅ 14. Sombra 512 em tempo integral

**O que mudou:** `src/components/WeatherController.jsx` — o shadow map era
1024 de dia / 512 à noite. Agora é **512 sempre** (4× mais barato que antes).
Sombras ficam mais macias/borradas — aceitável em campo aberto.

**Como testar:** olhe a sombra das árvores/pinheiros — continua presente,
só menos nítida. Se ficar feia demais, voltar para 1024 é 2 linhas.

## ✅ 15. Toggle de nuvens funcionando

**O que mudou:** `src/hooks/useGameStore.js` + `src/components/ARScene.jsx` —
o toggle "Nuvens Volumétricas" do menu agora controla de verdade o
`VolumetricClouds` (default ON = nuvens continuam como parte da atmosfera).
Também deu vida ao resto do menu (dpr/água/grama/etc. passam a ser lidos).

**Como testar:** com céu nublado/vento (nuvens ativas), abra Configurações
Gráficas → desligue "Nuvens Volumétricas" → veja o FPS subir na hora.
Religue para comparar. Como o JOGO usa `graphicsSettings` do store, o
toggle aplica **instantaneamente** (sem reiniciar).

## ✅ 16. Nuvens volumétricas ~3× mais baratas (o GRANDE)

**O que mudou:** `src/components/VolumetricClouds.jsx` + `ARScene.jsx` — as
nuvens eram um **ray-marching volumétrico**: até 96 iterações por pixel,
cada uma com amostra de textura 3D, numa caixa que segue o jogador e cobre
boa parte da tela (frustumCulled=false, depthTest=false). Esse era O
gargalo principal do jogo.

Agora: passos por pixel 16→**8** (perto), LOD 8/6/5/4 por distância, e a
caixa das nuvens menor (scale 0.25→0.18 = cobre menos tela). Visual: nuvens
um pouco mais finas/translúcidas, mas presentes.

**Como testar:** céu nublado → nuvens lá, FPS deve subir bastante. Se ficar
feio demais, o toggle do menu (Configurações → Nuvens Volumétricas) liga e
desliga para comparar.

## ✅ 17. Fim do re-render por frame (CPU — o GRANDE no seu aparelho)

**O que mudou:** `src/App.jsx`, `src/components/SmoothTarget.jsx`,
`src/components/SmartFollowCamera.jsx` — o `<SmoothTarget>` chamava
`setSmoothTarget` (estado do React no App) **a cada frame** → o App
re-renderizava a UI inteira + a árvore 3D do Canvas a cada frame. Com
29 draw calls e 140k triângulos (GPU ociosa) e FPS 12, o tempo todo ia
para o React/CPU. Agora o alvo da câmera é atualizado **imperativamente**
(mutação no `OrbitControls.target`) e o `SmartFollowCamera` lê o store via
`getState()` — zero re-render por frame.

**Como testar:** FPS deve subir bastante principalmente com a UI aberta
(inventário/HUD) e ao andar (era o pior caso).

## ✅ 18. Zero re-render por frame (subscrições sem selector)

**O que mudou:** `useSaveSystem.js`, `ARScene.jsx`, `KeyboardControls.jsx`,
`JoystickOverlay.jsx`, `MovementController.jsx`, `RepositionButton.jsx` —
todos usavam `useGameStore()` (store INTEIRO, sem selector) → re-renderizavam
a cada mudança do store. Como `AvatarPlayer` chama `setPlayerPosition` todo
frame, isso significava:
- **App inteiro** (toda UI: Inventário, SkillBar, RPGUI, HealthBar, QuestMenu,
  SaveMenu, MountMenu, joysticks...) re-renderizando **60x/s** — o pior caso.
- ARScene (árvore 3D inteira) re-renderizando por frame.
- Botão flutuante (Q) + seu DOM Html atualizado por frame.

Agora: `getState()` dentro de useFrame/eventos + selectors individuais
(funções e dados que mudam raramente). Só re-renderiza quem realmente mudou.

**Como testar:** FPS deve subir de novo, agora de forma estável (não só pico).

---

## Teste final (integração)

- ✅ Dia + parado → FPS alto
- ✅ Dia + andando → FPS estável, sombras acompanhando
- ✅ Noite + andando → FPS estável, lua/luz azul, sombra 512
- ✅ Grama perto = densidade cheia; longe = dissolve no fog
- ✅ Árvores longe não projetam sombra (some gradual, sem flicker)

---

## Próximos passos (se ainda quiser mais FPS)

### Fáceis (1 linha cada)
- **`App.jsx`**: `gl={{ powerPreference: 'low-power' }}` → troque para
  `'high-performance'`. Em notebook com 2 GPUs, `low-power` pode estar
  usando a integrada (fraca). Trocar pode dar boost grande (custa bateria).
- **Menu Configurações de Gráficos**: DPR 1.5→1 (nitidez um pouco menor),
  Névoa Dinâmica off, Nuvens off — são os 3 maiores custos fixos restantes.

### Médias (posso fazer no próximo ciclo)
- **Chunk size 12u** — mais chunks = culling mais fino (troca por draw calls).
- **Vento das folhas** — se as folhas (árvore pequena) também tiverem noise
  por vértice, aplicar o mesmo LOD do item 6.

### Estruturais (mudam arquitetura — só se necessário)
- **World.glb em chunks/LOD** — se o terreno crescer muito no futuro.
- **WebGPU** — o jogo já tenta `three/webgpu`; no modo WebGPU o custo de
  draw calls despenca, mas precisa validar os shaders customizados.

---

## Arquivos tocados

| Arquivo | O que faz |
|---|---|
| `src/components/fluffy/FluffyGrass.jsx` | Chunks + bounding sphere (item 1) |
| `src/components/fluffy/fluffyShaders.js` | LOD de densidade (4/11), vento LOD copa (6), pass opaco (7) |
| `src/components/water/WaterGlass.jsx` | sem transmission no modo light (8) |
| `src/components/WeatherController.jsx` | Sombra sob demanda (2) + 512 sempre (5/14) + fog por densidade (9) |
| `src/components/DistanceShadows.jsx` | Sombras por proximidade (3) |
| `src/components/fluffy/FluffyTree.jsx` | marca shadowRadius 22 (3) |
| `src/components/LoadedScene.jsx` | pinheiros: clone único + shadowRadius 24 (3) |
| `src/components/ARScene.jsx` | monta `<DistanceShadows />` (3) + toggle nuvens (15) + DebugHud + escala nuvens (16) |
| `src/components/VolumetricClouds.jsx` | ray march 3× mais barato (16) |
| `src/components/DebugHud.jsx` | HUD de diagnóstico — ?debug=1 ou F8 |
| `src/components/enemies/ZombiePool.js` | zumbis sem castShadow (10) |
| `src/App.jsx` | powerPreference high-performance (12) + DPR do store (13) |
| `src/hooks/useGameStore.js` | graphicsSettings real (13/15) |
| `src/components/ARScene.jsx` | monta `<DistanceShadows />` (3) + toggle nuvens (15) |
