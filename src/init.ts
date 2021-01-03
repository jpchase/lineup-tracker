
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

export function useTestData(): boolean {
  if ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.has('test_data')) {
      return true;
    }
  }
  return false;
}

(() => {
  if ((window as any).LineupApp) {
    return;
  }

  (window as any).LineupApp = {
    useTestData: useTestData()
  };
})()
