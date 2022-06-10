
export function initApp() {
  // enableAllPlugins();
}

let globalErrorHandler = false;

if (!globalErrorHandler) {
  window.addEventListener('error', (e) => {
    console.error(`Unhandled error: ${e.message}\nat ${e.filename}:${e.lineno}`);
  });
  globalErrorHandler = true;
}
