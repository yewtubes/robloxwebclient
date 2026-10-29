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
      getFlagOverrides: () => ({}),
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
})();
