#!/usr/bin/env python3
# Reconstructed EM_ASM bodies for WebClient.wasm, keyed by the code address the
# wasm passes to emscripten_asm_const_*. The originals were stripped; behaviour
# is inferred from the call sites (log strings, argument signatures and the
# length of the stripped string). Writes em_asm.json next to this file.
import json, os

U = 'UTF8ToString'
snippets = {
  # f29: unknown, result unused
  9460223: "console.log('[rbx-asm] 9460223');",
  # [LIFECYCLE] joinGameSucceeded
  9460267: "if (window.__onExperienceJoined) window.__onExperienceJoined($0);",
  # [LIFECYCLE] joinGameFailed state=%d
  9460337: "console.warn('[rbx] joinGameFailed state', $0); if (window.__resolveGameExit) window.__resolveGameExit({reason: 'join_failed', statusCode: $0});",
  # f246 (teleport), second call, no args
  9460410: "console.log('[rbx-asm] teleport done');",
  # [LIFECYCLE] gameLoaded placeId=%lli
  9460461: "if (window.__onExperienceLoaded) window.__onExperienceLoaded($0);",
  # [LIFECYCLE] teleportFailed state=%d
  9460531: "console.warn('[rbx] teleportFailed state', $0);",
  # app notification handler
  9460608: "console.log('[rbx-asm] app notification (leave)');",
  # timing helpers in main
  9460665: "return performance.now();",
  9460695: "if (window.__onExperienceJoined) window.__onExperienceJoined($0);",
  9460761: "return window.__wasmPreInitTime || performance.now();",
  # loading status update: (flag, code, message, i64 lo, hi), e.g. "Loading experience..."
  9460803: "console.log('[rbx] status', $0, $1, " + U + "($2));",
  # main() entry
  9461089: "console.log('[rbx] main() entered'); return 0;",
  # WebView (mutate/close webview and tabs): not supported here
  9461254: "console.log('[rbx] webview tab', " + U + "($0), " + U + "($1)); return 0;",
  9461872: "return 0;",
  9462302: "console.log('[rbx] webview', " + U + "($0), " + U + "($1)); return 0;",
  9463493: "return 0;",
  9467882: "return 0;",
  9473359: "return 0;",
  # f239: toggles a fullscreen flag
  9473473: "try { if (document.fullscreenElement) document.exitFullscreen(); else Module.canvas.requestFullscreen(); } catch (e) {} return 0;",
  # crash: (type, message)
  9473799: "console.error('[rbx] crash', " + U + "($0), " + U + "($1)); if (window.__resolveGameExit) window.__resolveGameExit({reason: 'crash', errorType: " + U + "($0), errorMessage: " + U + "($1)}); return 0;",
  9473915: "console.log('[rbx-asm] 9473915', $0, $1); return 0;",
  # FMOD web output, run as a silent device (JS never pulls samples)
  9474377: "return 1;",
  9474666: "return 0;",
  9475049: "return 0;",
  9475469: "return 0;",
  9475884: "return 0;",
  9477174: "return 0;",
  9477216: "return 0;",
  9477609: "return 0;",
  9477671: "return 48000;",
  9477872: "return 0;",
  9478083: "return 0;",
  9478501: "return 0;",
  9478719: "return 0;",
  9478991: "return 0;",
  9479515: "return 0;",
  9479790: "return 0;",
  9479877: "return 0;",
  9480137: "return 48000;",
  9480338: "return 0;",
  9480544: "return 0;",
  9480597: "console.log('[rbx-asm] 9480597', " + U + "($0)); return 0;",
  9480694: "console.log('[rbx-asm] 9480694', " + U + "($0), " + U + "($1), $2, $3); return 0;",
  9481103: "return 0;",
  9481139: "return 0;",
  9481915: "return 0;",
}
here = os.path.dirname(os.path.abspath(__file__))
json.dump({str(k): '{ ' + v + ' }' for k, v in snippets.items()}, open(os.path.join(here, 'em_asm.json'), 'w'), indent=1)
