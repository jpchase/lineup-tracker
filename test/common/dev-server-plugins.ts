/** @format */

import { Context, Plugin } from '@web/dev-server-core';
import { Middleware } from 'koa';
import * as path from 'path';
import {
  FONT_APIS_HOSTNAME,
  FONT_APIS_PLACEHOLDER,
  FONT_STATIC_HOSTNAME,
  FONT_STATIC_PLACEHOLDER,
  serveHermeticFont,
} from './hermetic-fonts.js';

type ServeResult = void | {
  body: string;
  status?: number;
  type?: string;
  headers?: Record<string, string>;
};

function serveHermeticFontDevServer(context: Context, dataDir: string): ServeResult {
  const adapter = {
    url() {
      if (context.req.url?.startsWith('/')) {
        return `http://${context.req.headers.host}${context.req.url}`;
      }
      return context.req.url!;
    },
  };
  const response = serveHermeticFont(adapter, dataDir);
  if (!response) {
    return undefined;
  }
  // Convert the response to the expected type.
  //  - The body may be a Buffer, for binary files. Pretend the body is always a string,
  //    rather than explicitly converting to string. The web-dev-server has logic to
  //    correctly convert a buffer for serving.
  //  - The headers values are converted to strings, but typed as Record<string, unknown>
  return {
    body: response.body as string,
    type: response.contentType,
    headers: response.headers as unknown as Record<string, string>,
    status: response.status,
  };
}

export function hermeticFontsPlugins(dataDir: string): {
  plugin: Plugin;
  middleware: Middleware;
} {
  return {
    plugin: {
      name: 'hermetic-fonts',
      transform(context: Context) {
        const body = context.body as string;
        if (context.response.is('html')) {
          return {
            body: body.replace(`https://${FONT_APIS_HOSTNAME}/`, FONT_APIS_PLACEHOLDER),
          };
        }
        if (context.response.is('css') && context.request.path.startsWith(FONT_APIS_PLACEHOLDER)) {
          return {
            body: body.replace(`https://${FONT_STATIC_HOSTNAME}/`, FONT_STATIC_PLACEHOLDER),
          };
        }
        return undefined;
      },
      serve(context: Context) {
        if (
          context.url.startsWith('/node_modules/') ||
          context.url.startsWith('/src/') ||
          context.url.startsWith('/out-tsc/src/')
        ) {
          return undefined;
        }
        // console.log(`\nhermetic-fonts[${serveCounter}]: attempt to serve for URL = ${context.url}`);
        return serveHermeticFontDevServer(context, dataDir);
      },
    },
    middleware: (context: Context, next) => {
      // Using `appIndex` in the WDS config causes it to intercept *all* non-file
      // requests, including the CSS requests. This middleware is needed to run
      // before that interception and serve the CSS correctly.
      if (context.method !== 'GET' || path.extname(context.path)) {
        // not a GET, or a direct file request
        return next();
      }

      if (!context.path.startsWith(FONT_APIS_PLACEHOLDER)) {
        return next();
      }

      const response = serveHermeticFontDevServer(context, dataDir);
      if (!response) {
        return next();
      }
      if (response.headers) {
        for (const [k, v] of Object.entries(response.headers)) {
          context.response.set(k, v);
        }
      }
      /* eslint-disable no-param-reassign */
      // The middleware API requires setting properties on the `context` param.
      context.response.body = response.body;
      context.response.status = response.status!;
      context.response.type = response.type!;
      /* eslint-enable no-param-reassign */
      return undefined;
    },
  };
}
