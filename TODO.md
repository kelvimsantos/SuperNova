# TODO

- [x] Identificar lógica atual de dropped items no ARScene (`renderDroppedItems`).
- [x] Garantir que dropped items são reposicionados na altura do terreno (altura via heightmap lookup + offset em Y).
- [ ] Implementar raycast vertical real (primeiros 10s) para reposicionar dropped items no Y do terreno usando Rapier/THREE.
- [ ] Encerrar raycast quando item estiver no local (tolerância) ou após 10s.
- [ ] Validar que a coleta por proximidade continua funcionando.

