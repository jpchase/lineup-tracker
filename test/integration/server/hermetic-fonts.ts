/** @format */

import * as fs from 'fs';
import { Context } from 'koa';
import * as path from 'path';
import { HTTPRequest, ResponseForRequest } from 'puppeteer';

const CONTENT_TYPE_CSS = 'text/css; charset=utf-8';
const CONTENT_TYPE_WOFF2 = 'font/woff2';

export const FONT_APIS_HOSTNAME = 'fonts.googleapis.com';
export const FONT_APIS_PLACEHOLDER = '/fonts-apis/';
export const FONT_STATIC_HOSTNAME = 'fonts.gstatic.com';
export const FONT_STATIC_PLACEHOLDER = '/fonts-static/';

const FONT_CSS_FILES: Record<string, string> = {
  'Material Icons': 'material-icons.css',
  'Roboto Mono:400,700|Roboto:400,300,300italic,400italic,500,500italic,700,700italic':
    'roboto-mono.css',
};

const FONT_WOFF_FILES: Record<string, string> = {
  '/s/materialicons/v53/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2': 'material-icons.woff2',
  '/s/roboto/v20/KFOlCnqEu92Fr1MmEU9fBBc4.woff2': 'roboto-medium.woff2',
  '/s/roboto/v20/KFOlCnqEu92Fr1MmWUlfBBc4.woff2': 'roboto-bold.woff2',
  '/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxK.woff2': 'roboto-regular.woff2',
};

interface RequestAdapter {
  url(): string;
}

type ServeResult =
  | void
  | string
  | { body: string; status?: number; type?: string; headers?: Record<string, string> };

export function serveHermeticFontPuppeteer(
  request: HTTPRequest,
  dataDir: string,
): ResponseForRequest | undefined {
  return serveHermeticFont(request, dataDir);
}

export function serveHermeticFontDevServer(context: Context, dataDir: string): ServeResult {
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

function serveHermeticFont(
  request: RequestAdapter,
  dataDir: string,
): ResponseForRequest | undefined {
  const requestUrl = new URL(request.url());
  const isFontApis =
    requestUrl.pathname.startsWith(FONT_APIS_PLACEHOLDER) ||
    requestUrl.hostname === FONT_APIS_HOSTNAME;
  const hasStaticPlaceholder = requestUrl.pathname.startsWith(FONT_STATIC_PLACEHOLDER);
  const isFontStatic = hasStaticPlaceholder || requestUrl.hostname === FONT_STATIC_HOSTNAME;

  if (!isFontApis && !isFontStatic) {
    return undefined;
  }
  if (isFontApis) {
    const fontFamily = requestUrl.searchParams.get('family');
    if (fontFamily) {
      const cssFileName = FONT_CSS_FILES[fontFamily];
      if (cssFileName) {
        return buildResponse(dataDir, cssFileName, CONTENT_TYPE_CSS);
      }
    }
  }
  if (isFontStatic) {
    // Placeholder includes a trailing slash, which needs to be included in
    // file name, to match the production path.
    const woffIndex = hasStaticPlaceholder ? FONT_STATIC_PLACEHOLDER.length - 1 : 0;
    const woffFileName = FONT_WOFF_FILES[requestUrl.pathname.substring(woffIndex)];
    if (woffFileName) {
      return buildResponse(dataDir, woffFileName, CONTENT_TYPE_WOFF2);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`Unexpected font request: ${request.url()}`);
  throw new Error(`Unexpected font request: ${request.url()}`);
}

function buildResponse(
  dataDir: string,
  bodyFileName: string,
  contentType: string,
): ResponseForRequest {
  const bodyData = fs.readFileSync(path.join(dataDir, bodyFileName));
  if (!bodyData) {
    throw new Error(`Problem reading file: ${bodyFileName}`);
  }
  return {
    status: 200,
    headers: {
      'access-control-allow-origin': '*',
    },
    contentType,
    body: bodyData,
  };
}
