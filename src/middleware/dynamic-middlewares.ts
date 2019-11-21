import { compose, AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux/es/redux.mjs.js';

const createDynamicMiddlewares = () => {
  let allDynamicMiddlewares: Middleware[] = [];

  const enhancer: Middleware = (api: MiddlewareAPI) => (next: Dispatch<AnyAction>) => (action: AnyAction) => {
    const chain = allDynamicMiddlewares.map(middleware => middleware(api));

    return compose<any>(...chain)(next)(action);
  }

  const addMiddleware = (...middlewares: Middleware[]) => {
    allDynamicMiddlewares = [...allDynamicMiddlewares, ...middlewares];
  };

  const removeMiddleware = (middleware: Middleware) => {
    const index = allDynamicMiddlewares.findIndex(d => d === middleware);

    if (index === -1) {
      // eslint-disable-next-line no-console
      console.error('Middleware does not exist!', middleware);
      return;
    }

    allDynamicMiddlewares = allDynamicMiddlewares.filter((_, mdwIndex) => mdwIndex !== index);
  };

  const resetMiddlewares = () => {
    allDynamicMiddlewares = [];
  };

  return {
    enhancer,
    addMiddleware,
    removeMiddleware,
    resetMiddlewares,
  };
}

const dynamicMiddlewaresInstance = createDynamicMiddlewares();

export default dynamicMiddlewaresInstance.enhancer;

export const {
  addMiddleware,
  removeMiddleware,
  resetMiddlewares,
} = dynamicMiddlewaresInstance;

export {
  createDynamicMiddlewares,
};