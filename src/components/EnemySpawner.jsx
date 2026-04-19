// components/enemies/EnemySpawner.jsx
import { useEnemySpawner } from '../../hooks/useEnemySpawner';
import { SlimeEnemy } from './SlimeEnemy';
import { TestDummy } from '../TestDummy';

// Configuração dos inimigos com IDs únicos
const ENEMIES_CONFIG = {
  default: [
    { id: 'slime_1', type: 'slime', position: [3, 13, 3], health: 30, damage: 8, expReward: 50, dropItems: ['small_health_potion', 'golden_coin'] },
    { id: 'slime_2', type: 'slime', position: [6, 13, 2], health: 25, damage: 6, expReward: 40, dropItems: ['golden_coin'] },
    { id: 'dummy_1', type: 'dummy', position: [8, 13, 5], dropItems: ['golden_coin', 'small_health_potion'] }
  ],
  deserto: [
    { id: 'desert_slime_1', type: 'slime', position: [5, 15, 5], health: 40, damage: 12, expReward: 80, dropItems: ['golden_coin', 'small_health_potion'] },
    { id: 'desert_slime_2', type: 'slime', position: [10, 15, 8], health: 35, damage: 10, expReward: 70, dropItems: ['golden_coin'] }
  ],
  ilha: [
    { id: 'island_slime_1', type: 'slime', position: [3, 15, 4], health: 45, damage: 14, expReward: 90, dropItems: ['pearl', 'health_potion'] },
    { id: 'island_slime_2', type: 'slime', position: [8, 15, 7], health: 30, damage: 8, expReward: 60, dropItems: ['golden_coin'] }
  ]
};

export const EnemySpawner = ({ currentScene }) => {
  const config = ENEMIES_CONFIG[currentScene] || ENEMIES_CONFIG.default;
  const { enemies, killEnemy } = useEnemySpawner(config, 20000); // 20 segundos de respawn
  
  const renderEnemy = (enemy) => {
    switch(enemy.type) {
      case 'slime':
        return (
          <SlimeEnemy
            key={enemy.id}
            id={enemy.id}
            position={enemy.position}
            health={enemy.health}
            damage={enemy.damage}
            expReward={enemy.expReward}
            dropItems={enemy.dropItems}
            onDeath={() => killEnemy(enemy.id)}
          />
        );
      case 'dummy':
        return (
          <TestDummy
            key={enemy.id}
            position={enemy.position}
            dropItems={enemy.dropItems}
          />
        );
      default:
        return null;
    }
  };
  
  return <>{enemies.map(renderEnemy)}</>;
};