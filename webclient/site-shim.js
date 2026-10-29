// Points Roblox's web client at the local backend. It runs first on Roblox's
// own play page (tools/server.js injects it into webclient/site/games/start.html)
// and at the top of the engine's worker threads (tools/backend.js prepends it
// to WebClient.js). Roblox's page, WasmLoader.js, WasmPlayer.js, WebClient.js
// and WebClient.wasm themselves are served unmodified.
//
// - window.__wasmDevSettings is the developer hook Roblox's loader and player
//   read: apiProxy/cdnProxy turn https://<host>/<path> into
//   /proxy/https://<host>/<path>, which tools/backend.js answers.
// - The page and the engine otherwise call roblox.com directly (the engine
//   from its workers, with CORS), so fetch/XHR/sendBeacon are pointed at
//   /proxy/ as well.
(() => {
  if (self.__rbxLocalShim) return;
  self.__rbxLocalShim = true;
  const origin = self.location.origin;
  const toProxy = (u) => `${origin}/proxy/${u}`;
  const roblox = /(^|\.)(roblox\.com|rbxcdn\.com|rbxinfra\.com|robloxlabs\.com)$/;
  const rewrite = (u) => {
    try {
      const x = new URL(u, self.location.href);
      if (x.origin !== origin && roblox.test(x.hostname)) return toProxy(x.href);
    } catch (e) {}
    return u;
  };

  if (self.document) {
    let authCookie = 'local';
    const proxy = { url: toProxy, authHeaders: () => ({}) };
    self.__wasmDevSettings = {
      apiProxy: proxy,
      cdnProxy: proxy,
      get authCookie() { return authCookie; },
      setAuthCookie(c) { authCookie = c; },
      isCookieFromPool: () => false,
      allocateCookieFromPool: async () => null,
      // Operator-set flags (WEBCLIENT_FLAG_OVERRIDES, injected by tools/server.js),
      // applied by WasmPlayer.js over the fetched flags before the engine starts.
      getFlagOverrides: () => ({ ...(self.__rbxLocalFlagOverrides || {}) }),
    };
  }

  const nativeFetch = self.fetch;
  self.fetch = (input, init) => {
    if (typeof input === 'string' || input instanceof URL) return nativeFetch(rewrite(String(input)), init);
    if (input instanceof Request && rewrite(input.url) !== input.url) return nativeFetch(new Request(rewrite(input.url), input), init);
    return nativeFetch(input, init);
  };
  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) { return nativeOpen.call(this, method, rewrite(url), ...rest); };
  if (self.navigator?.sendBeacon) {
    const nativeBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => nativeBeacon(rewrite(url), data);
  }

  // What this browser offers against what the engine needs (Chromebooks, school
  // devices). Missing requirements are printed to the console and the report goes
  // to the server's <data>/logs/client-report.log; nothing here changes the engine.
  if (self.document) {
    const report = async () => {
      const r = { ua: navigator.userAgent, memoryGB: navigator.deviceMemory ?? null, cores: navigator.hardwareConcurrency,
        screen: `${screen.width}x${screen.height}@${devicePixelRatio}` };
      const need = {
        secureContext: self.isSecureContext,
        crossOriginIsolated: self.crossOriginIsolated, // SharedArrayBuffer, the engine's threads
        sharedArrayBuffer: typeof SharedArrayBuffer === 'function',
        jspi: typeof WebAssembly?.Suspending === 'function',
        webTransport: typeof WebTransport === 'function', // game server connection (UDP)
      };
      try {
        const h = await navigator.userAgentData?.getHighEntropyValues(['architecture', 'bitness', 'platform', 'platformVersion']);
        if (h) Object.assign(r, { arch: h.architecture, bitness: h.bitness, platform: h.platform, platformVersion: h.platformVersion });
      } catch (e) {}
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        need.webgl2 = !!gl;
        if (gl) {
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          r.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
          r.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
          r.extensions = gl.getSupportedExtensions();
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
      } catch (e) { need.webgl2 = false; }
      r.need = need;
      const missing = Object.keys(need).filter((k) => !need[k]);
      if (missing.length) console.warn(`[LocalPlatform] this browser lacks what the Roblox engine needs: ${missing.join(', ')}`);
      if (r.bitness === '32' || (r.memoryGB && r.memoryGB < 4)) console.warn(`[LocalPlatform] the engine reserves FIntWasmMemoryPages (default 2 GiB) of shared memory at start; this device (${r.bitness || '?'}-bit, ${r.memoryGB ?? '?'} GB) may not be able to`);
      r.missing = missing;
      try { fetch(`${origin}/api/local/client-report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r), keepalive: true }); } catch (e) {}
    };
    report();
  }
})();
