import { createContext, useContext, useState } from 'react';

const RadiusContext = createContext();
const UvRadiusContext = createContext();

export const RadiusProvider = ({ children }) => {
  const [radius, setRadius] = useState(25);
  const [uvRadius, setUvRadius] = useState(0.5);

  return (
    <RadiusContext.Provider value={{ radius, setRadius }}>
      <UvRadiusContext.Provider value={{ uvRadius, setUvRadius }}>
        {children}
      </UvRadiusContext.Provider>
    </RadiusContext.Provider>
  );
};

export const useRadius = () => useContext(RadiusContext);
export const useUvRadius = () => useContext(UvRadiusContext);