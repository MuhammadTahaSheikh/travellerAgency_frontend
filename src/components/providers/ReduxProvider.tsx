'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { initAuth } from '@/store/slices/authSlice';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    store.dispatch(initAuth());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
