import { createContext, useContext } from 'react';

type BottomAppBarVisibility = {
  setBottomAppBarHidden: (hidden: boolean) => void;
};

export const BottomAppBarVisibilityContext = createContext<BottomAppBarVisibility | null>(null);

export function useBottomAppBarVisibility() {
  const value = useContext(BottomAppBarVisibilityContext);
  if (!value) throw new Error('useBottomAppBarVisibility must be used inside the tab layout.');
  return value;
}
