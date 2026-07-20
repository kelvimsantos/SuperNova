# TODO_FRUSTUM_CENTER

- [x] Ajustar `CameraGlobo.jsx` para aumentar concentração no centro via frustum:
  - [x] reduzir FOV conforme jogador se aproxima (ou inversão correta)
  - [x] fixar `camera.aspect = 1` (quadrado) para aproximar do “zoom central”
  - [x] evitar múltiplos `updateProjectionMatrix()` no mesmo frame (chamar 1x)
  - [x] garantir consistência `far > near` com clamps.
- [x] Atualizar `CameraController.jsx` para usar a mesma estratégia (delegar lógica ou aplicar mudanças equivalentes).
- [x] Rodar `npm run dev`/validar no navegador (mantém chunks grandes como warning, sem erro de build).
- [ ] Confirmar visualmente: algo fora do centro deve ser menos visível/ocluído (agora o culling por raio usa RadiusContext).




