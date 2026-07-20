# TODO - World Streaming Manager

- [x] Criar config padrão (updateHz, radius, hysteresis)
- [x] Criar chunkUtils (indexar Chunk_* e aplicar setChunkActive)
- [x] Criar WorldStreamingManager (atualiza 4x/s e liga/desliga chunks por raio)
- [x] Integrar no `src/components/World.jsx` após carregar `world.glb`
- [ ] Validar se o nome dos groups é exatamente `Chunk_X_Z` e se `userData.center` existe
- [ ] Testar desempenho e ajustar `activeRadiusMeters` / `deactivateRadiusMeters`
- [ ] Evoluir para pausar simulação/IA/animações via hooks por objeto

