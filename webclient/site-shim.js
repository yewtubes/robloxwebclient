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
// - ?build=local runs this repo's patched engine build on the same page (see
//   LOCAL_BUILD below) instead of the downloaded one.
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

  // ?build=local: Roblox's page and loader, with this repo's engine build (the
  // WasmPlayer.js/WebClient.js/patched wasm and content overlay served under
  // /engine/, which also carry the Lua App bootstrap from tools/build_playsolo.js).
  // The loader takes a pinned engineVersion from robloxWasmHostConfig; the backend
  // serves this upload id from /engine/. Without placeId in the URL the engine
  // starts the Lua App, so the bootstrap runs (Play Solo, or --join).
  const LOCAL_BUILD = 'version-0000000000000745';
  const localBuild = !!self.document && new URLSearchParams(self.location.search).get('build') === 'local';
  if (localBuild) {
    let host;
    Object.defineProperty(self, 'robloxWasmHostConfig', {
      configurable: true,
      get: () => host,
      set: (v) => { host = v && { ...v, engineVersion: LOCAL_BUILD }; },
    });
    // As in webclient/WasmLoader.js: the bundled Lua App patch is the Studio
    // package's copy, so its signature does not verify.
    self.__rbxLocalFlagOverrides = { FFlagDebugSkipPostTtiSignatureVerification: 'True',
      DFFlagDebugSkipPostTtiSignatureVerification: 'True', ...(self.__rbxLocalFlagOverrides || {}) };
    // ?quality=1..21 pins the graphics quality level. Automatic quality drops to
    // its lowest level (no shadows, flat lighting) when the frame rate is low.
    const quality = +new URLSearchParams(self.location.search).get('quality');
    if (quality >= 1 && quality <= 21) self.__rbxLocalFlagOverrides.DFIntDebugFRMQualityLevelOverride = String(quality);
    // WasmPlayer.js hardcodes wss://localhost/local-relay for local RCC mode.
    const NativeWebSocket = self.WebSocket;
    self.WebSocket = function (url, protocols) {
      if (String(url) === 'wss://localhost/local-relay') url = `${self.location.protocol === 'https:' ? 'wss' : 'ws'}://${self.location.host}/local-relay`;
      return new NativeWebSocket(url, protocols);
    };
    self.WebSocket.prototype = NativeWebSocket.prototype;
    Object.assign(self.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
    // With the join bootstrap (playsolo/Join.lua) there is no placeId in the URL,
    // so WasmPlayer.js takes its loading screen down as soon as the engine runs
    // (the Lua App), not when a game has loaded. Hold the screen through the join:
    // WasmPlayer's own dismissal (the loading-exiting class, then hidden) is
    // overridden until the engine reports its second load (the Lua App's DataModel,
    // then the joined game), and then takes effect with its usual fade.
    if (self.__rbxLocalBootstrap?.mode === 'join') {
      const root = document.documentElement;
      const style = document.createElement('style');
      style.textContent = 'html.local-join-hold #loading-overlay{display:grid!important;opacity:1!important;pointer-events:auto!important}'
        + 'html.local-join-fade #loading-overlay{display:grid!important}';
      document.head.appendChild(style);
      root.classList.add('local-join-hold');
      const release = (why) => {
        if (!root.classList.contains('local-join-hold')) return;
        console.log(`[LocalPlatform] loading screen released: ${why}`);
        root.classList.replace('local-join-hold', 'local-join-fade');
        setTimeout(() => root.classList.remove('local-join-fade'), 600);
      };
      // With placeId in the URL WasmPlayer shows the experience's name, creator and
      // icon, but it also hands the place to the engine (set_place_id), which then
      // joins by itself instead of starting the Lua App. Keep the URL's placeId for
      // the loading screen and leave the join to the bootstrap: wrap the engine's
      // module factory (webclient/WebClient.js) so set_place_id is not passed on.
      let factory;
      Object.defineProperty(self, 'createWebClient', {
        configurable: true,
        get: () => factory && ((m) => {
          const init = m.onRuntimeInitialized;
          m.onRuntimeInitialized = function (...a) {
            if (typeof m.set_place_id === 'function') m.set_place_id = (id) => console.log(`[LocalPlatform] place ${id} is for the loading screen; the bootstrap joins`);
            return init?.apply(this, a);
          };
          return factory(m);
        }),
        set: (f) => { factory = f; },
      });
      // A join that never completes would otherwise leave the screen up for good.
      setTimeout(() => release('no game loaded after 90 s'), 90e3);
      let onLoaded = null, loads = 0;
      Object.defineProperty(self, '__onExperienceLoaded', {
        configurable: true,
        get: () => onLoaded && ((...a) => {
          if (++loads === 2) release('joined game loaded');
          return onLoaded(...a);
        }),
        set: (fn) => { onLoaded = fn; },
      });
    }
  }

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
      // The local build's WasmPlayer.js benchmarks the CPU in a worker started
      // from <engine>/stub.js, which webclient/stub.js does not implement.
      ...(localBuild ? { skipDeviceProbe: true } : {}),
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
