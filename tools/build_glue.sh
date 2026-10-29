#!/bin/bash
# Generates webclient/WebClient.js from WebClient.wasm with `emcc --post-link`,
# plus the Roblox-specific library (webclient/glue/rbxlib.js) and reconstructed
# EM_ASM bodies (webclient/glue/em_asm.py).
#
# Needs an Emscripten checkout (EMSCRIPTEN, default /home/user/emscripten) with
# two local patches (see docs/NOTES.md) and a config file (EM_CONFIG).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMSCRIPTEN="${EMSCRIPTEN:-/home/user/emscripten}"
W="$ROOT/webclient"
OUT="${OUT:-$(mktemp -d)}"
python3 "$W/glue/em_asm.py"
export RBX_EM_ASM_JSON="$W/glue/em_asm.json" EM_IGNORE_SANITY=1 EMCC_SKIP_SANITY_CHECK=1

python3 "$EMSCRIPTEN/emcc.py" --post-link "$W/WebClient.wasm" -o "$OUT/WebClient.js" \
  -O0 -pthread -sJSPI -lembind -sFETCH -lwebsocket.js -lGL -lfetch \
  -sMIN_WEBGL_VERSION=2 -sMAX_WEBGL_VERSION=2 \
  -sMODULARIZE -sEXPORT_NAME=createWebClient -sIMPORTED_MEMORY \
  -sINITIAL_MEMORY=2147483648 -sALLOW_MEMORY_GROWTH=0 \
  -sENVIRONMENT=web,worker -sERROR_ON_UNDEFINED_SYMBOLS=1 -sEXIT_RUNTIME=0 \
  -sASSERTIONS=1 -sSTACK_OVERFLOW_CHECK=0 \
  -sJSPI_EXPORTS=main,__main_argc_argv,main_loop_iteration,fiber_entry \
  -sEXPORTED_FUNCTIONS=_main,_malloc,_free,_main_loop_iteration,_fiber_entry,_get_stack_ptr,_set_stack_ptr,_get_stack_base,_get_stack_end,_set_stack_limits,_rbx_fs_add_file,_rbx_fs_register_asset,_rbx_fs_set_base_url,_rbx_fs_preload_asset,_init_ring_buffers,_on_virtual_text_changed,_on_return_pressed,_update_virtual_keyboard_bounds,_webview_on_message,_webview_on_close,_FMOD_JS_MixFunction \
  -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=\$rbxConvertShader -sEXPORTED_RUNTIME_METHODS=cwrap,ccall,HEAPU8,HEAP32,HEAPF32,HEAPF64,UTF8ToString,stringToUTF8,lengthBytesUTF8 \
  --js-library="$W/glue/rbxlib.js" 2>&1 | grep -v "experimental" || true

# Unknown EM_ASM addresses (reached through computed code pointers) log instead
# of asserting.
node "$ROOT/tools/patch_glue.js" "$OUT/WebClient.js" "$W/WebClient.js"
echo "wrote $W/WebClient.js"
