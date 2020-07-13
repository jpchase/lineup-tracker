import { Request, RespondOptions } from "puppeteer";

const path = require('path');
const fs = require('fs');
const CONTENT_TYPE_CSS = 'text/css; charset=utf-8';
const CONTENT_TYPE_WOFF2 = 'font/woff2';

const FONT_CSS_FILES: Record<string, string> = {
    'Material Icons': 'material-icons.css',
    'Roboto Mono:400,700|Roboto:400,300,300italic,400italic,500,500italic,700,700italic': 'roboto-mono.css',
}

const FONT_WOFF_FILES: Record<string, string> = {
    '/s/materialicons/v53/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2': 'material-icons.woff2',
}

const serveHermeticFont = (request: Request, dataDir: string): RespondOptions | undefined => {
    const requestUrl = new URL(request.url());
    const isFontApis = requestUrl.hostname === 'fonts.googleapis.com';
    const isFontStatic = requestUrl.hostname === 'fonts.gstatic.com';
    if (!isFontApis && !isFontStatic) {
        return;
    }
    console.log(`Font request to be replaced: ${requestUrl.hostname}, ${requestUrl.pathname}, ${requestUrl.search}`);
    if (isFontApis) {
        const fontFamily = requestUrl.searchParams.get('family');
        if (fontFamily) {
            const cssFileName = FONT_CSS_FILES[fontFamily];
            if (cssFileName) {
                console.log(`Replaced font request: ${request.url()}`);
                return buildResponse(dataDir, cssFileName, CONTENT_TYPE_CSS);
            }
        }
    }
    if (isFontStatic) {
        const woffFileName = FONT_WOFF_FILES[requestUrl.pathname];
        if (woffFileName) {
            console.log(`Replaced font request: ${request.url()}`);
            return buildResponse(dataDir, woffFileName, CONTENT_TYPE_WOFF2);
        }
    }
    console.log(`Unexpected font request: ${request.url()}`);
    return;
};

function buildResponse(dataDir: string, bodyFileName: string, contentType: string): RespondOptions {
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

exports.serveHermeticFont = serveHermeticFont;