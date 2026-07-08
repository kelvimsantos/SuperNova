import React from 'react';

export const OverlayRoot = ({ children }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10030,
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  );
};

