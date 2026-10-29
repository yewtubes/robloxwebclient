// Stand-in for Roblox's WasmLoader.js: provides the context WasmPlayer.js reads,
// local dev settings, then loads WasmPlayer.js.
(() => {
  const params = new URLSearchParams(location.search);
  const engineBase = params.get('engineBase') || `${location.origin}/engine`;
  window.__wasmLoaderContext = {
    engineBase,
    server: params.get('server') || 'prod',
    channel: params.get('channel'),
    workerStubUrl: `${engineBase}/stub.js`,
  };

  // Flag overrides for local play, e.g. ?flags=FFlagX=True,DFIntY=5
  const flagOverrides = {
    // The OTA Lua App patch is the Studio package's copy, not the web build's,
    // so its signature does not verify.
    FFlagDebugSkipPostTtiSignatureVerification: 'True',
    DFFlagDebugSkipPostTtiSignatureVerification: 'True',
  };
  for (const kv of (params.get('flags') || '').split(',').filter(Boolean)) {
    const [k, v] = kv.split('=');
    flagOverrides[k] = v ?? 'True';
  }
  let authCookie = params.get('cookie') || 'local-dev';
  window.__wasmDevSettings = {
    baseUrl: params.get('baseUrl') || undefined,
    // The engine's roblox.com requests go to the local backend (/proxy/<url>).
    apiProxy: {
      url: (u) => `${location.origin}/proxy/${u}`,
      authHeaders: () => ({}),
    },
    skipDeviceProbe: true,
    disableRbxTransport: params.get('rbxTransport') === '0',
    get authCookie() { return authCookie; },
    setAuthCookie(c) { authCookie = c; },
    isCookieFromPool: () => false,
    allocateCookieFromPool: async () => null,
    getFlagOverrides: () => flagOverrides,
  };

  // Every roblox.com / rbxcdn.com request from the page (flags, locales, ...)
  // goes to the local backend instead (tools/backend.js).
  const toBackend = (u) => {
    try {
      const x = new URL(u, location.href);
      if (x.origin !== location.origin && /(^|\.)(roblox\.com|rbxcdn\.com)$/.test(x.hostname)) return `${location.origin}/proxy/${x.href}`;
    } catch (e) {}
    return u;
  };
  const nativeFetch = window.fetch;
  window.fetch = (i, init) => nativeFetch(typeof i === 'string' || i instanceof URL ? toBackend(String(i)) : i, init);
  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u, ...rest) { return nativeOpen.call(this, m, toBackend(u), ...rest); };

  // WasmPlayer.js hardcodes wss://localhost/local-relay for local RCC mode;
  // use this server's relay instead.
  const NativeWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    if (String(url) === 'wss://localhost/local-relay') {
      url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/local-relay`;
    }
    return new NativeWebSocket(url, protocols);
  };
  window.WebSocket.prototype = NativeWebSocket.prototype;
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });

  const s = document.createElement('script');
  s.src = `${location.origin}/WasmPlayer.js`;
  document.head.appendChild(s);
})();
