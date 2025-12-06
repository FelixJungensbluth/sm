import { createContext, useContext, useState, ReactNode } from 'react';

interface CommandMenuContextType {
  isOpen: boolean;
  openCommandMenu: () => void;
  closeCommandMenu: () => void;
  toggleCommandMenu: () => void;
}

const CommandMenuContext = createContext<CommandMenuContextType | undefined>(undefined);

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCommandMenu = () => setIsOpen(true);
  const closeCommandMenu = () => setIsOpen(false);
  const toggleCommandMenu = () => setIsOpen((prev) => !prev);

  return (
    <CommandMenuContext.Provider
      value={{
        isOpen,
        openCommandMenu,
        closeCommandMenu,
        toggleCommandMenu,
      }}
    >
      {children}
    </CommandMenuContext.Provider>
  );
}

export function useCommandMenu() {
  const context = useContext(CommandMenuContext);
  if (context === undefined) {
    throw new Error('useCommandMenu must be used within a CommandMenuProvider');
  }
  return context;
}
