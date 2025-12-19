import { createContext } from 'react';

export const RefreshContext = createContext({
  refreshTrigger: 0,
  triggerRefresh: () => {},
});

