import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';

// Define the shape of the context data
interface SettingsContextType {
  isRmbControlEnabled: boolean;
  setIsRmbControlEnabled: (value: boolean) => void;
}

// Create the context with a default undefined value initially
// This will be overridden by the Provider, but helps with type safety for consumers
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// localStorage key
const RMB_SIDEBAR_CONTROL_LS_KEY = 'enableRmbSidebarControl';

// Helper to read from localStorage
const getInitialLocalStorageBool = (key: string, defaultValue: boolean): boolean => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  }
  return defaultValue;
};

// Create the Provider component
interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [isRmbControlEnabled, setIsRmbState] = useState<boolean>(() =>
    getInitialLocalStorageBool(RMB_SIDEBAR_CONTROL_LS_KEY, false)
  );

  // Update localStorage when the state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RMB_SIDEBAR_CONTROL_LS_KEY, JSON.stringify(isRmbControlEnabled));
    }
  }, [isRmbControlEnabled]);

  const contextSetIsRmbControlEnabled = (value: boolean) => {
    setIsRmbState(value);
  };

  return (
    <SettingsContext.Provider value={{ isRmbControlEnabled, setIsRmbControlEnabled: contextSetIsRmbControlEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use the SettingsContext easily
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
