import { createContext } from '@lit-labs/context';

export interface PageRouter {
  // TODO: Pass page name and params separately
  gotoPage(pathname: string): Promise<void>;
}

export const pageRouterContext = createContext<PageRouter>('page-router');
