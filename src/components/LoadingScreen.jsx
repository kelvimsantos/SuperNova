// components/LoadingScreen.jsx
import { useState, useEffect } from 'react';
import './LoadingScreen.css';

export const LoadingScreen = ({ progress, loadingMessage, tip }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-container">
        <div className="loading-animation">
          <div className="loading-spinner"></div>
          <div className="loading-orb"></div>
        </div>
        
        <p className="loading-message">{loadingMessage}{dots}</p>
        
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-percent">{Math.floor(progress)}%</span>
        </div>
        
        <div className="loading-tip">
          <span className="tip-icon">✨</span>
          <p>{tip}</p>
        </div>
      </div>
    </div>
  );
};