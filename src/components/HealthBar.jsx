// components/HealthBar.jsx
import useGameStore from '../hooks/useGameStore';

export const HealthBar = () => {
  const playerHealth = useGameStore(state => state.playerHealth);
  const playerMaxHealth = useGameStore(state => state.playerMaxHealth);
  const playerMana = useGameStore(state => state.playerMana);
  const playerMaxMana = useGameStore(state => state.playerMaxMana);
  const playerAir = useGameStore(state => state.playerAir);
  const playerUnderwater = useGameStore(state => state.playerUnderwater);
  const inventory = useGameStore(state => state.inventory);
  
  const healthPercent = (playerHealth / playerMaxHealth) * 100;
  const manaPercent = (playerMana / playerMaxMana) * 100;
  const airPercent = playerAir * 100;
  
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: 20,
      zIndex: 10001,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      padding: '12px 20px',
      borderRadius: '12px',
      color: 'white',
      fontFamily: 'monospace',
      minWidth: '220px',
    }}>
      <div style={{ marginBottom: '8px' }}>
        <span>❤️ {Math.floor(playerHealth)} / {playerMaxHealth}</span>
        <span style={{ marginLeft: '20px' }}>💙 {Math.floor(playerMana)} / {playerMaxMana}</span>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ marginLeft: '20px' }}>🎒 {inventory.length} itens</span>
      </div>
      <div style={{
        width: '100%',
        height: '8px',
        background: '#333',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${healthPercent}%`,
          height: '100%',
          background: '#ff3333',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{
        width: '100%',
        height: '6px',
        background: '#333',
        borderRadius: '4px',
        overflow: 'hidden',
        marginTop: '6px',
      }}>
        <div style={{
          width: `${manaPercent}%`,
          height: '100%',
          background: '#3366ff',
          transition: 'width 0.3s ease',
        }} />
      </div>
      {(playerUnderwater || playerAir < 1) && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '11px', color: playerAir > 0.3 ? '#33ccff' : '#ff4444' }}>
            🫧 Oxigênio {Math.ceil(airPercent)}%
          </div>
          <div style={{
            width: '100%',
            height: '5px',
            background: '#333',
            borderRadius: '3px',
            overflow: 'hidden',
            marginTop: '3px',
          }}>
            <div style={{
              width: `${airPercent}%`,
              height: '100%',
              background: playerAir > 0.3 ? '#33ccff' : '#ff4444',
              transition: 'width 0.2s ease',
            }} />
          </div>
        </div>
      )}
      <div style={{ fontSize: '11px', color: '#aaa', marginTop: '8px' }}>
        💡 Clique nos inimigos para atacar!
      </div>
    </div>
  );
};