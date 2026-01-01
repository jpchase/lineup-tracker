/** @format */

import * as fs from 'fs';
import * as path from 'path';

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

export interface RequestAdapter {
  url(): string;
}

// Wrapper for ResponseForRequest from puppeteer
export interface ResponseAdapter {
  status: number;
  /**
   * Optional response headers.
   *
   * The record values will be converted to string following:
   * Arrays' values will be mapped to String
   * (Used when you need multiple headers with the same name).
   * Non-arrays will be converted to String.
   */
  headers: Record<string, string | string[] | unknown>;
  contentType: string;
  type: string;
  body: string | Uint8Array;
}

export function serveHermeticFont(
  request: RequestAdapter,
  dataDir: string,
): ResponseAdapter | undefined {
  const requestUrl = new URL(request.url());
  const isFontApis =
    requestUrl.pathname.startsWith(FONT_APIS_PLACEHOLDER) ||
    requestUrl.hostname === FONT_APIS_HOSTNAME;
  const hasStaticPlaceholder = requestUrl.pathname.startsWith(FONT_STATIC_PLACEHOLDER);
  const isFontStatic = hasStaticPlaceholder || requestUrl.hostname === FONT_STATIC_HOSTNAME;

  // console.log(
  //   `\nserveHermeticFont: url = ${requestUrl}, isFontApis = ${isFontApis}, isFontStatic = ${isFontStatic}`,
  // );
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
): ResponseAdapter {
  const bodyData = fs.readFileSync(path.join(dataDir, bodyFileName));
  if (!bodyData) {
    throw new Error(`Problem reading file: ${bodyFileName}`);
  }
  // The content type for CSS includes a charset, split out just the mime
  // type if necessary.
  const typeParts = contentType.split(';');
  const type = typeParts.length > 1 ? typeParts[0] : contentType;
  return {
    status: 200,
    headers: {
      'access-control-allow-origin': '*',
    },
    contentType,
    type,
    body: bodyData,
  };
}
