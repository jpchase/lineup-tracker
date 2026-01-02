/** @format */

import { Context, Plugin } from '@web/dev-server-core';
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

export function hermeticFontsPlugin(dataDir: string): Plugin {
  return {
    name: 'hermetic-fonts',
    transform(context: Context) {
      const body = context.body as string;
      if (context.response.is('html')) {
        // Using `appIndex` in the WDS config causes it to intercept *all* non-file
        // requests, including the CSS requests. In addition to replacing the host
        // name, add a file extension so the request is handled by the serve() below.
        return {
          body: body.replace(
            `https://${FONT_APIS_HOSTNAME}/css?`,
            `${FONT_APIS_PLACEHOLDER}css.css?`,
          ),
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
  };
}
