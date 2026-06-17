// src/hooks/useAvatarLoader.js
import { useState, useEffect } from 'react';

const AVATAR_API = 'https://nodejs-passport-login-master.onrender.com';

export function useAvatarLoader(userId) {
  const [avatarConfig, setAvatarConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadAvatar = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${AVATAR_API}/api/avatar-config/${userId}`);
        
        if (!response.ok) {
          throw new Error('Erro ao buscar avatar');
        }
        
        const data = await response.json();
        setAvatarConfig(data.avatarConfig);
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar avatar:', err);
        setError(err.message);
        // Fallback para cores padrão
        setAvatarConfig({
          skinColor: '#f1c27d',
          hairColor: '#4a2c2c',
          hairIndex: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadAvatar();
  }, [userId]);

  return { avatarConfig, loading, error };
}