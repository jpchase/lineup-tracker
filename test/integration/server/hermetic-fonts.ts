import * as fs from 'fs';
import * as path from 'path';
import { HTTPRequest, ResponseForRequest } from 'puppeteer';

const CONTENT_TYPE_CSS = 'text/css; charset=utf-8';
const CONTENT_TYPE_WOFF2 = 'font/woff2';

const FONT_CSS_FILES: Record<string, string> = {
    'Material Icons': 'material-icons.css',
    'Roboto Mono:400,700|Roboto:400,300,300italic,400italic,500,500italic,700,700italic': 'roboto-mono.css',
}

const FONT_WOFF_FILES: Record<string, string> = {
    '/s/materialicons/v53/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2': 'material-icons.woff2',
    '/s/roboto/v20/KFOlCnqEu92Fr1MmEU9fBBc4.woff2': 'roboto-medium.woff2',
    '/s/roboto/v20/KFOlCnqEu92Fr1MmWUlfBBc4.woff2': 'roboto-bold.woff2',
    '/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxK.woff2': 'roboto-regular.woff2',
}

export function serveHermeticFont(request: HTTPRequest, dataDir: string): ResponseForRequest | undefined {
    const requestUrl = new URL(request.url());
    const isFontApis = requestUrl.hostname === 'fonts.googleapis.com';
    const isFontStatic = requestUrl.hostname === 'fonts.gstatic.com';
    if (!isFontApis && !isFontStatic) {
        return;
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
        const woffFileName = FONT_WOFF_FILES[requestUrl.pathname];
        if (woffFileName) {
            return buildResponse(dataDir, woffFileName, CONTENT_TYPE_WOFF2);
        }
    }
    console.log(`Unexpected font request: ${request.url()}`);
    throw new Error(`Unexpected font request: ${request.url()}`);
};

function buildResponse(dataDir: string, bodyFileName: string, contentType: string): ResponseForRequest {
    let bodyData = fs.readFileSync(path.join(dataDir, bodyFileName));
    if (!bodyData) {
        throw new Error(`Problem reading file: ${bodyFileName}`);
    }
    return {
        status: 200,
        headers: {
            'access-control-allow-origin': '*'
        },
        contentType: contentType,
        body: bodyData
    };
}
