
export function initApp() {
  // enableAllPlugins();
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