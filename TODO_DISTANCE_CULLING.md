# TODO - Distance Culling (prioridade alta)

## Passo 1 — Integrar wrapper de culling no ARScene
- [x] Atualizar `src/components/ARScene.jsx` (integração do wrapper de culling) 

- [x] Envolver `EnemySpawner`, itens de cena (`sceneItems` -> `ItemPickup`), itens dropados (`DROPPED_ITEMS` -> `ItemPickup`) e `QuestNPC` com `OptimizedRenderer`.

- [x] Definir raios iniciais (atual):
  - enemies: 40
  - items de cena: 35
  - items dropados: 30
  - quest NPCs: 40


## Passo 2 — Otimizar ItemPickup (quando estiver longe)
- [ ] Atualizar `src/components/items/ItemPickup.jsx`
- [ ] Condicionar render de partes caras (Text, pointLight) baseado em `isNear`.
- [ ] (opcional) retornar `null` quando muito longe (placeholder / menor custo).

## Passo 3 — Otimizar Enemy (quando estiver longe)
- [ ] Atualizar `src/components/enemies/Enemy.jsx`
- [ ] Implementar distance culling: se longe, não rodar lógica pesada e/ou ocultar.

## Passo 4 — Teste de performance
- [ ] Rodar `npm run dev` e comparar FPS antes/depois.
- [ ] Ajustar raios conforme resultado.

