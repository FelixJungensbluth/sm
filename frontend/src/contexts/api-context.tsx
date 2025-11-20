import { Api } from '@/services/api/api';
import React, { createContext, useMemo } from 'react';

const ApiContext = createContext<Api<unknown> | null>(null);

const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const api = useMemo(() => {
    return new Api({
      baseUrl: import.meta.env.VITE_API_BASE_URL,
      baseApiParams: {
        secure: true,
        credentials: 'include'
      },
    });
  }, []);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export { ApiProvider, ApiContext };
