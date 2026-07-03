# Raio de renderização + Escuro fora do raio

## Situação atual (implementado)
- `OptimizedRenderer` continua controlando visibilidade por distância (grupo).
- Foi implementado um efeito visual de "dark outside radius" via shader:
  - `src/components/rendering/RadialDarkMaskController.jsx`
- `ARScene.jsx` agora renderiza `RadialDarkMaskController` sempre ligado.

## Próximo passo (ainda não implementado)
Converter objetos repetidos (itens/NPc/inimigos) para instanced mesh + culling por instância usando `@three.ez/instanced-mesh`.

> Observação: a integração instanced-mesh exige substituir componentes (ex. `ItemPickup`, `QuestNPC`, `SlimeEnemy`) por representações instanciadas sem lógica de clique/proximidade.

