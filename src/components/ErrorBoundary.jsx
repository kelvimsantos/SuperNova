import { Component } from 'react';

/**
 * ErrorBoundary — captura erros do Canvas (WebGL context lost, shader crash, etc.)
 * e mostra uma UI de recuperação em vez de derrubar a aplicação inteira.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error, info) {
    console.error('🔥 ErrorBoundary capturou erro:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
    // Força recriação do Canvas ao resetar o boundary
    if (this.props.onRetry) this.props.onRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.92)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            gap: 16,
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div style={{ fontSize: 42 }}>🛑</div>
          <h2 style={{ margin: 0 }}>Ocorreu um erro gráfico</h2>
          <p style={{ opacity: 0.8, maxWidth: 480, fontSize: 14, margin: 0 }}>
            A GPU pode ter sido sobrecarregada ou o contexto WebGL foi perdido.
            Isso costuma acontecer em placas de vídeo integradas com efeitos pesados.
          </p>
          <code
            style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12,
              maxWidth: 480,
              wordBreak: 'break-word',
            }}
          >
            {this.state.message}
          </code>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={this.handleReload}
              style={{
                background: '#4caf50',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🔄 Tentar novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#2196f3',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🚀 Reiniciar jogo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

