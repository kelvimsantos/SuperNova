# TODO - Chunking/culling do World (world.glb) por grade (render-only)

- [ ] Implementar chunking de visibilidade no `src/components/World.jsx`:
  - [ ] Traversar `scene` e listar `child.isMesh`
  - [ ] Calcular centro (AABB) de cada mesh (bounding box em world space)
  - [ ] Dividir em células 2D (cx, cz) por `gridSize=30`
  - [ ] Em `useFrame`, ler `playerPosition` e ativar visibilidade apenas das células próximas (`activeCellRadius`)
- [ ] Testar em dev
- [ ] Ajustar `gridSize` e `activeCellRadius` (se houver pop-in)
- [ ] Depois otimizar grama (instâncias) para renderizar só dentro do raio

