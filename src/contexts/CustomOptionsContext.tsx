import React, { createContext, useContext } from 'react';
import { useCustomOptions, CustomOption, OptionType } from '@/hooks/useCustomOptions';

interface CustomOptionsContextType {
  customOptions: CustomOption[];
  loading: boolean;
  addOption: (optionType: OptionType, optionValue: string) => Promise<CustomOption | null>;
  deleteOption: (optionId: string) => Promise<boolean>;
  updateOption: (optionId: string, newValue: string) => Promise<boolean>;
  getOptionsForType: (optionType: OptionType, defaultOptions: readonly string[]) => string[];
  getCustomOptionsForType: (optionType: OptionType) => CustomOption[];
}

const CustomOptionsContext = createContext<CustomOptionsContextType | null>(null);

export function CustomOptionsProvider({ children }: { children: React.ReactNode }) {
  const customOptionsHook = useCustomOptions();

  return (
    <CustomOptionsContext.Provider value={customOptionsHook}>
      {children}
    </CustomOptionsContext.Provider>
  );
}

export function useCustomOptionsContext() {
  const context = useContext(CustomOptionsContext);
  if (!context) {
    throw new Error('useCustomOptionsContext must be used within a CustomOptionsProvider');
  }
  return context;
}
