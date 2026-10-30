(function () {
  if (typeof self === 'undefined' || self.__rbxProxyInstalled) return;
  self.__rbxProxyInstalled = true;
  var origin = self.location.origin;
  var rewrite = function (u) {
    try {
      var x = new URL(u, self.location.href);
      if (x.origin !== origin && /(^|\.)(roblox\.com|rbxcdn\.com)$/.test(x.hostname)) return origin + '/proxy/' + x.href;
    } catch (e) {}
    return u;
  };
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) {
    arguments[1] = rewrite(u);
    return open.apply(this, arguments);
  };
  if (self.fetch) {
    var f = self.fetch;
    self.fetch = function (i, init) { return f.call(this, typeof i === 'string' || i instanceof URL ? rewrite(String(i)) : i, init); };
  }
})();
// This code implements the `-sMODULARIZE` settings by taking the generated
// JS program code (INNER_JS_CODE) and wrapping it in a factory function.

// Single threaded MINIMAL_RUNTIME programs do not need access to
// document.currentScript, so a simple export declaration is enough.
var createWebClient = (() => {
  // When MODULARIZE this JS may be executed later,
  // after document.currentScript is gone, so we save it.
  // In EXPORT_ES6 mode we can just use 'import.meta.url'.
  var _scriptName = globalThis.document?.currentScript?.src;
  return async function(moduleArg = {}) {
    var Module = moduleArg;
// include: shell.js
// include: minimum_runtime_check.js
(function() {
  // "30.0.0" -> 300000
  function humanReadableVersionToPacked(str) {
    str = str.split('-')[0]; // Remove any trailing part from e.g. "12.53.3-alpha"
    let vers = str.split('.').slice(0, 3);
    while(vers.length < 3) vers.push('00');
    vers = vers.map((n, i, arr) => n.padStart(2, '0'));
    return vers.join('');
  }
  // 300000 -> "30.0.0"
  const packedVersionToHumanReadable = n => [n / 10_000 | 0, (n / 100 | 0) % 100, n % 100].join('.');

  const TARGET_NOT_SUPPORTED = 2147483647;

  // Note: We use a typeof check here instead of optional chaining using
  // globalThis because older browsers might not have globalThis defined.

  // We skip the node version checking when running on Bun/Deno since the node
  // version they report doesn't seem to be useful.
  if (typeof process !== 'undefined' && !process.versions?.bun && typeof Deno === "undefined") {
    const currentNodeVersion = process.versions?.node ? humanReadableVersionToPacked(process.versions.node) : TARGET_NOT_SUPPORTED;
    if (currentNodeVersion < TARGET_NOT_SUPPORTED) {
      throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');
    }
    if (currentNodeVersion < 2147483647) {
      throw new Error(`This emscripten-generated code requires node v${ packedVersionToHumanReadable(2147483647) } (detected v${packedVersionToHumanReadable(currentNodeVersion)})`);
    }
  }

  const userAgent = typeof navigator !== 'undefined' && navigator.userAgent;
  if (!userAgent) {
    return;
  }

  const currentSafariVersion = userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/) ? humanReadableVersionToPacked(userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentSafariVersion < 150000) {
    throw new Error(`This emscripten-generated code requires Safari v${ packedVersionToHumanReadable(150000) } (detected v${currentSafariVersion})`);
  }

  const currentFirefoxVersion = userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentFirefoxVersion < 79) {
    throw new Error(`This emscripten-generated code requires Firefox v79 (detected v${currentFirefoxVersion})`);
  }

  const currentChromeVersion = userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentChromeVersion < 85) {
    throw new Error(`This emscripten-generated code requires Chrome v85 (detected v${currentChromeVersion})`);
  }
})();

// end include: minimum_runtime_check.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = !!globalThis.window;
var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() running directly in a worker. (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)

// The way we signal to a worker that it is hosting a pthread is to construct
// it with a specific name.
var ENVIRONMENT_IS_PTHREAD = ENVIRONMENT_IS_WORKER && globalThis.name?.startsWith('em-pthread')

if (ENVIRONMENT_IS_PTHREAD) {
  assert(!globalThis.moduleLoaded, 'module should only be loaded once on each pthread worker');
  globalThis.moduleLoaded = true;
}

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


var programArgs = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

if (ENVIRONMENT_IS_WORKER) {
  _scriptName = self.location.href;
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_SHELL) {

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  try {
    scriptDirectory = new URL('.', _scriptName).href; // includes trailing slash
  } catch {
    // Must be a `blob:` or `data:` URL (e.g. `blob:http://site.com/etc/etc`), we cannot
    // infer anything from them.
  }

  if (!(globalThis.window || globalThis.WorkerGlobalScope)) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  {
// include: web_or_worker_shell_read.js
if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = async (url) => {
    assert(!isFileURI(url), "readAsync does not work with file:// URLs");
    var response = await fetch(url, { credentials: 'same-origin' });
    if (response.ok) {
      return response.arrayBuffer();
    }
    throw new Error(response.status + ' : ' + response.url);
  };
// end include: web_or_worker_shell_read.js
  }
} else
{
  throw new Error('environment detection error');
}

var out = console.log.bind(console);
var err = console.error.bind(console);

var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
var ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
var JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
var OPFS = 'OPFS is no longer included by default; build with -lopfs.js';

var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

// perform assertions in shell.js after we set up out() and err(), as otherwise
// if an assertion fails it cannot print the message
assert(
  ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER || ENVIRONMENT_IS_NODE, 'pthreads do not work in this environment yet (need Web Workers, or an alternative to them)');

assert(!ENVIRONMENT_IS_NODE, 'node environment detected but not enabled at build time (add `node` to `-sENVIRONMENT` to enable)');

assert(!ENVIRONMENT_IS_SHELL, 'shell environment detected but not enabled at build time (add `shell` to `-sENVIRONMENT` to enable)');

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;

if (!globalThis.WebAssembly) {
  err('no native wasm support detected');
}

// Wasm globals

// For sending to workers.
var wasmModule;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');

// include: runtime_common.js
// include: runtime_exceptions.js
// Base Emscripten EH error class
class EmscriptenEH {}

class EmscriptenSjLj extends EmscriptenEH {}

// end include: runtime_exceptions.js
// include: runtime_debug.js
var runtimeDebug = true; // Switch to false at runtime to disable logging at the right times

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(...args) {
  if (!runtimeDebug && typeof runtimeDebug !== 'undefined') return;
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn(...args);
}

// Endianness check
(() => {
  const h16 = new Int16Array(1);
  const h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) abort('Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)');
})();

function consumedModuleProp(prop) {
  let value = Module[prop];
  const msg = `Attempt to modify \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`;
  if (Array.isArray(value)) {
    value = new Proxy(value, {
      set(target, key, val) {
        abort(msg);
        return false;
      },
      defineProperty(target, key, descriptor) {
        abort(msg);
        return false;
      },
      deleteProperty(target, key) {
        abort(msg);
        return false;
      }
    });
  }
  Object.defineProperty(Module, prop, {
    configurable: true,
    get() { return value; },
    set() {
      abort(msg);
    }
  });
}

function makeInvalidEarlyAccess(name) {
  return () => assert(false, `call to '${name}' via reference taken before Wasm module initialization`);

}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    console.warn(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_preloadFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

function missingLibrarySymbol(sym) {

  // Any symbol that is not included from the JS library is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (ENVIRONMENT_IS_PTHREAD) {
    return;
  }
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        let msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      },
    });
  }
}

/**
 * Override `err`/`out`/`dbg` to report thread / worker information
 */
function initWorkerLogging() {
  function getLogPrefix() {
    let t = 0;
    if (runtimeInitialized && typeof _pthread_self !== 'undefined'
    ) {
      t = _pthread_self();
    }
    return `w:${workerID},t:${ptrToString(t)}:`;
  }

  // Prefix all dbg() messages with the calling thread info.
  const origDbg = dbg;
  dbg = (...args) => origDbg(getLogPrefix(), ...args);
}

initWorkerLogging();

// end include: runtime_debug.js
// include: runtime_pthread.js
// Pthread Web Worker handling code.
// This code runs only on pthread web workers and handles pthread setup
// and communication with the main thread via postMessage.

// Unique ID of the current pthread worker (zero on non-pthread-workers
// including the main thread).
var workerID = 0;

var startWorker;

if (ENVIRONMENT_IS_PTHREAD) {
  // Thread-local guard variable for one-time init of the JS state
  var initializedJS = false;

  // Turn unhandled rejected promises into errors so that the main thread will be
  // notified about them.
  self.onunhandledrejection = (e) => { throw e.reason || e; };

  async function handleMessage(e) {
    try {
      var msgData = e.data;
      //dbg('msgData: ' + Object.keys(msgData));
      var cmd = msgData.cmd;
      if (cmd == 1) { // Preload command that is called once per worker to parse and load the Emscripten code.
        workerID = msgData.workerID;

        // Until we initialize the runtime, queue up any further incoming messages.
        let messageQueue = [];
        self.onmessage = (e) => messageQueue.push(e);

        // And add a callback for when the runtime is initialized.
        startWorker = () => {
          // Notify the main thread that this thread has loaded.
          postMessage({ cmd: 3 });
          // Process any messages that were queued before the thread was ready.
          for (let msg of messageQueue) {
            handleMessage(msg);
          }
          // Restore the real message handler.
          self.onmessage = handleMessage;
        };

        // Use `const` here to ensure that the variable is scoped only to
        // that iteration, allowing safe reference from a closure.
        for (const handler of msgData.handlers) {
          // If the main module has a handler for a certain event, but no
          // handler exists on the pthread worker, then proxy that handler
          // back to the main thread.
          if (!Module[handler] || Module[handler].proxy) {
            Module[handler] = (...args) => {
              postMessage({ cmd: 9, handler, args: args });
            }
            // Rebind the out / err handlers if needed
            if (handler == 'print') out = Module[handler];
            if (handler == 'printErr') err = Module[handler];
          }
        }

        wasmMemory = msgData.wasmMemory;
        updateMemoryViews();

        wasmModule = msgData.wasmModule;
        createWasm();
        run();
        startWorker();
      } else if (cmd == 2) {
        assert(msgData.pthread_ptr);
        assert(wasmMemory, "CMD_RUN received before CMD_LOAD");
        // Call inside JS module to set up the stack frame for this pthread in JS module scope.
        // This needs to be the first thing that we do, as we cannot call to any C/C++ functions
        // until the thread stack is initialized.
        establishStackSpace(msgData.pthread_ptr);

        // Pass the thread address to wasm to store it for fast access.
        __emscripten_thread_init(msgData.pthread_ptr, /*is_main=*/0, /*is_runtime=*/0, /*can_block=*/1, 0, 0);

        PThread.threadInitTLS();

        // Await mailbox notifications with `Atomics.waitAsync` so we can start
        // using the fast `Atomics.notify` notification path.
        __emscripten_thread_mailbox_await(msgData.pthread_ptr);

        if (!initializedJS) {
          // Embind must initialize itself on all threads, as it generates support JS.
          // We only do this once per worker since they get reused
          __embind_initialize_bindings();
          initializedJS = true;
        }

        try {
          await invokeEntryPoint(msgData.start_routine, msgData.arg);
        } catch(ex) {
          if (ex != 'unwind') {
            // The pthread "crashed".  Do not call `_emscripten_thread_exit` (which
            // would make this thread joinable).  Instead, re-throw the exception
            // and let the top level handler propagate it back to the main thread.
            throw ex;
          }
        }
      } else if (cmd == 4) {
        if (initializedJS) {
          checkMailbox();
        }
      } else if (cmd) {
        // The received message looks like something that should be handled by this message
        // handler, (since there is a cmd field present), but is not one of the
        // recognized commands:
        err(`worker: received unknown command ${cmd}`);
        err(msgData);
      }
    } catch(ex) {
      err(`worker: onmessage() captured an uncaught exception: ${ex}`);
      if (ex?.stack) err(ex.stack);
      if (runtimeInitialized) __emscripten_thread_crashed();
      throw ex;
    }
  };

  self.onmessage = handleMessage;

} // ENVIRONMENT_IS_PTHREAD
// end include: runtime_pthread.js
// Memory management

var runtimeInitialized = false;



function updateMemoryViews() {
  // When memory growth is disabled this function should be called exactly once.
  assert(!HEAP8, 'updateMemoryViews should only be called once when ALLOW_MEMORY_GROWTH=0');
  var b = wasmMemory.buffer;
  HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  Module['HEAP32'] = HEAP32 = new Int32Array(b);
  HEAPU32 = new Uint32Array(b);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(b);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(b);
  HEAP64 = new BigInt64Array(b);
  HEAPU64 = new BigUint64Array(b);
}

// In non-standalone/normal mode, we create the memory here.
// include: runtime_init_memory.js
// Create the wasm memory. (Note: this only applies if IMPORTED_MEMORY is defined)

function initMemory() {

  if ((ENVIRONMENT_IS_PTHREAD)) { return }

  if (Module['wasmMemory']) {
    wasmMemory = Module['wasmMemory'];
  } else
  {
    var INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 2147483648;

    assert(INITIAL_MEMORY >= 65536, `INITIAL_MEMORY should be larger than STACK_SIZE, was ${INITIAL_MEMORY}! (STACK_SIZE=65536)`);
    /** @suppress {checkTypes} */
    wasmMemory = new WebAssembly.Memory({
      'initial': INITIAL_MEMORY / 65536,
      'maximum': INITIAL_MEMORY / 65536,
      'shared': true,
    });
  }

  updateMemoryViews();
}

// end include: runtime_init_memory.js

// include: memoryprofiler.js
// end include: memoryprofiler.js
// end include: runtime_common.js
assert(globalThis.Int32Array && globalThis.Float64Array && Int32Array.prototype.subarray && Int32Array.prototype.set,
       'JS engine does not provide full typed array support');

function preRun() {
  assert(!ENVIRONMENT_IS_PTHREAD); // PThreads reuse the runtime from the main thread.
  var preRun = Module['preRun'];
  if (preRun) {
    if (typeof preRun === 'function') preRun = [preRun];
    onPreRuns.push(...preRun);
  }
  consumedModuleProp('preRun');
  // Begin ATPRERUNS hooks
  callRuntimeCallbacks(onPreRuns);
  // End ATPRERUNS hooks
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  if (ENVIRONMENT_IS_PTHREAD) return;

  // No ATINITS hooks

  wasmExports['__wasm_call_ctors']();

  // No ATPOSTCTORS hooks

}

function postRun() {

  var postRun = Module['postRun'];
  if (postRun) {
    if (typeof postRun === 'function') postRun = [postRun];
    onPostRuns.push(...postRun);
  }
  consumedModuleProp('postRun');

  // Begin ATPOSTRUNS hooks
  callRuntimeCallbacks(onPostRuns);
  // End ATPOSTRUNS hooks
}

/**
 * @param {string|number=} what
 */
function abort(what) {
  Module['onAbort']?.(what);

  what = `Aborted(${what})`;
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.
  throw new WebAssembly.RuntimeError(what);
}

// show errors on likely calls to FS when it was not included
function fsMissing() {
  abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM');
}
var FS = {
  init: fsMissing,
  createDataFile: fsMissing,
  createPreloadedFile: fsMissing,
  createLazyFile: fsMissing,
  open: fsMissing,
  mkdev: fsMissing,
  registerDevice:  fsMissing,
  analyzePath: fsMissing,
  ErrnoError: fsMissing,
};


function createExportWrapper(name, func, nargs) {
  assert(func);
  return (...args) => {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
    // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
    assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
    return func(...args);
  };
}

var wasmBinaryFile;

function findWasmBinary() {
  return locateFile('WebClient.wasm');
}

function getBinarySync(file) {
  if (readBinary) {
    return readBinary(file);
  }
  // Throwing a plain string here, even though it not normally advisable since
  // this gets turning into an `abort` in instantiateArrayBuffer.
  throw 'both async and sync fetching of the wasm failed';
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
      // Fall back to getBinarySync below;
    }
  }

  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    // Warn on some common problems.
    if (isFileURI(binaryFile)) {
      err(`warning: Loading from a file URI (${binaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
    }
    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary
     ) {
    try {
      var response = fetch(binaryFile, { credentials: 'same-origin' });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err('falling back to ArrayBuffer instantiation');
      // fall back of instantiateArrayBuffer below
    };
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  assignWasmImports();
  // instrumenting imports is used in asyncify in two ways: to add assertions
  // that check for proper import use, and for JSPI we use them to set up
  // the Promise API on the import side.
  // In pthreads builds getWasmImports is called more than once but we only
  // and the instrument the imports once.
  if (!wasmImports.__instrumented) {
    wasmImports.__instrumented = true;
    Asyncify.instrumentWasmImports(wasmImports);
  }
  // prepare imports
  var imports = {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  };
  return imports;
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;

    wasmExports = Asyncify.instrumentWasmExports(wasmExports);

    registerTLSInit(wasmExports['_emscripten_tls_init']);

    assignWasmExports(wasmExports);

    // We now have the Wasm module loaded up, keep a reference to the compiled module so we can post it to the workers.
    wasmModule = module;
    if (!ENVIRONMENT_IS_PTHREAD) for (var i = 0; i < 8; i++) PThread.loadWasmModuleToWorker(PThread.allocateUnusedWorker());
    return wasmExports;
  }

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    return receiveInstance(result['instance'], result['module']);
  }

  var info = getWasmImports();

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  var instantiateWasm = Module['instantiateWasm'];
  if (instantiateWasm) {
    return new Promise((resolve) => {
      try {
        instantiateWasm(info, (inst, mod) => resolve(receiveInstance(inst, mod)));
      } catch(e) {
        err(`Module.instantiateWasm callback failed with error: ${e}`);
        throw e;
      }
    });
  }

  if ((ENVIRONMENT_IS_PTHREAD)) {
    // Instantiate from the module that was received via postMessage from
    // the main thread. We can just use sync instantiation in the worker.
    assert(wasmModule, "wasmModule should have been received via postMessage");
    var instance = new WebAssembly.Instance(wasmModule, getWasmImports());
    return receiveInstance(instance, wasmModule);
  }

  wasmBinaryFile ??= findWasmBinary();
  var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
  var exports = receiveInstantiationResult(result);
  return exports;
}

// end include: preamble.js

// Begin JS library code


  class ExitStatus {
      name = 'ExitStatus';
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }

  /** @type {!Int8Array} */
  var HEAP8;

  
  var terminateWorker = (worker) => {
      worker.terminate();
      // terminate() can be asynchronous, so in theory the worker can continue
      // to run for some amount of time after termination.  However from our POV
      // the worker is now dead and we don't want to hear from it again, so we stub
      // out its message handler here.  This avoids having to check in each of
      // the onmessage handlers if the message was coming from a valid worker.
      worker.onmessage = (e) => {
        var cmd = e.data.cmd;
        err(`received "${cmd}" command from terminated worker: ${worker.workerID}`);
      };
    };
  
  var cleanupThread = (pthread_ptr) => {
      assert(!ENVIRONMENT_IS_PTHREAD, 'cleanupThread() should only be called from the main thread');
      assert(pthread_ptr, 'null pthread_ptr passed to cleanupThread');
      var worker = PThread.pthreads[pthread_ptr];
      assert(worker);
      PThread.returnWorkerToPool(worker);
    };
  
  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };
  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);
  
  var spawnThread = (threadParams) => {
      assert(!ENVIRONMENT_IS_PTHREAD, 'spawnThread() should only be called from the main thread');
      assert(threadParams.pthread_ptr, 'spawnThread called with null pthread ptr');
  
      var worker = PThread.getNewWorker();
      if (!worker) {
        // No available workers in the PThread pool.
        return 6;
      }
      assert(!worker.pthread_ptr);
  
      // Add to pthreads map
      PThread.pthreads[threadParams.pthread_ptr] = worker;
  
      worker.pthread_ptr = threadParams.pthread_ptr;
      var msg = {
          cmd: 2,
          start_routine: threadParams.startRoutine,
          arg: threadParams.arg,
          pthread_ptr: threadParams.pthread_ptr,
      };
      // Ask the worker to start executing its pthread entry point function.
      worker.postMessage(msg, threadParams.transferList);
      return 0;
    };
  
  
  
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  
  var stackSave = () => _emscripten_stack_get_current();
  
  var stackRestore = (val) => __emscripten_stack_restore(val);
  
  var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
  
  
  
  /** @type {!Float64Array} */
  var HEAPF64;
  
  /** not-@type {!BigInt64Array} */
  var HEAP64;
  /** @type{function(number, (number|boolean), ...number)} */
  var proxyToMainThread = (funcIndex, emAsmAddr, proxyMode, ...callArgs) => {
      // EM_ASM proxying is done by passing a pointer to the address of the EM_ASM
      // content as `emAsmAddr`.  JS library proxying is done by passing an index
      // into `proxiedJSCallArgs` as `funcIndex`. If `emAsmAddr` is non-zero then
      // `funcIndex` will be ignored.
      // Additional arguments are passed after the first three are the actual
      // function arguments.
      // The serialization buffer contains the number of call params, and then
      // all the args here.
      //
      // We also pass 'proxyMode' to C separately, since C needs to look at it.
      //
      // Allocate a buffer (on the stack), which will be copied if necessary by
      // the C code.
      //
      // First passed parameter specifies the number of arguments to the function.
      // When BigInt support is enabled, we must handle types in a more complex
      // way, detecting at runtime if a value is a BigInt or not (as we have no
      // type info here). To do that, add a "prefix" before each value that
      // indicates if it is a BigInt, which effectively doubles the number of
      // values we serialize for proxying. TODO: pack this?
      var bufSize = 8 * callArgs.length * 2;
      var sp = stackSave();
      var args = stackAlloc(bufSize);
      var b = ((args)>>3);
      for (var arg of callArgs) {
        if (typeof arg === 'bigint') {
          // The prefix is non-zero to indicate a bigint.
          HEAP64[b++] = 1n;
          HEAP64[b++] = arg;
        } else {
          // The prefix is zero to indicate a JS Number.
          HEAP64[b++] = 0n;
          HEAPF64[b++] = arg;
        }
      }
      var rtn = __emscripten_run_js_on_main_thread(funcIndex, emAsmAddr, bufSize, args, proxyMode);
      stackRestore(sp);
      return rtn;
    };
  
  function _proc_exit(code) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(0, 0, 1, code);
  
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        PThread.terminateAllThreads();
        Module['onExit']?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    
  }
  
  
  
  
  
  
  function exitOnMainThread(returnCode) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(1, 0, 0, returnCode);
  
      _exit(returnCode);
    
  }
  
  
  /** @param {boolean|number=} implicit */
  var exitJS = (status, implicit) => {
      EXITSTATUS = status;
  
      checkUnflushedContent();
  
      if (ENVIRONMENT_IS_PTHREAD) {
        // implicit exit can never happen on a pthread
        assert(!implicit);
        // When running in a pthread we propagate the exit back to the main thread
        // where it can decide if the whole process should be shut down or not.
        // The pthread may have decided not to exit its own runtime, for example
        // because it runs a main loop, but that doesn't affect the main thread.
        exitOnMainThread(status);
        throw 'unwind';
      }
  
      // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
      if (keepRuntimeAlive() && !implicit) {
        var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
        err(msg);
      }
  
      _proc_exit(status);
    };
  var _exit = exitJS;
  
  
  
  var waitAsyncPolyfilled = (!Atomics.waitAsync || (globalThis.navigator?.userAgent && Number((navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)||[])[2]) < 91));;
  
  function ptrToString(ptr) {
      assert(typeof ptr === 'number', `ptrToString expects a number, got ${typeof ptr}`);
      // Convert to 32-bit unsigned value
      ptr >>>= 0;
      return '0x' + ptr.toString(16).padStart(8, '0');
    }
  
  
  /** @type {!Int32Array} */
  var HEAP32;
  var PThread = {
  unusedWorkers:[],
  tlsInitFunctions:[],
  pthreads:{
  },
  nextWorkerID:1,
  init() {
        if ((!(ENVIRONMENT_IS_PTHREAD))) {
          PThread.initMainThread();
        }
      },
  initMainThread() {
      },
  terminateAllThreads:() => {
        assert(!ENVIRONMENT_IS_PTHREAD, 'terminateAllThreads() should only be called from the main thread');
        // Attempt to kill all workers.  Sadly (at least on the web) there is no
        // way to terminate a worker synchronously, or to be notified when a
        // worker is actually terminated.  This means there is some risk that
        // pthreads will continue to be executing after `worker.terminate` has
        // returned.  For this reason, we don't call `returnWorkerToPool` here or
        // free the underlying pthread data structures.
        for (var worker of Object.values(PThread.pthreads)) {
          terminateWorker(worker);
        }
        for (var worker of PThread.unusedWorkers) {
          terminateWorker(worker);
        }
        PThread.unusedWorkers = [];
        PThread.pthreads = {};
      },
  clearMailboxAwait:(pthread_ptr) => {
        if (!waitAsyncPolyfilled) {
          Atomics.notify(HEAP32, ((pthread_ptr)>>2));
        }
      },
  terminateRuntime:() => {
        assert(!ENVIRONMENT_IS_PTHREAD, 'terminateRuntime() should only be called from the main thread');
        PThread.terminateAllThreads();
        var pthread_ptr = _pthread_self();
        ___set_thread_state(0, 0, 0, 1);
        PThread.clearMailboxAwait(pthread_ptr);
      },
  returnWorkerToPool:(worker) => {
        // We don't want to run main thread queued calls here, since we are doing
        // some operations that leave the worker queue in an invalid state until
        // we are completely done (it would be bad if free() ends up calling a
        // queued pthread_create which looks at the global data structures we are
        // modifying). To achieve that, defer the free() until the very end, when
        // we are all done.
        var pthread_ptr = worker.pthread_ptr;
        delete PThread.pthreads[pthread_ptr];
        // Note: worker is intentionally not terminated so the pool can
        // dynamically grow.
        PThread.unusedWorkers.push(worker);
        // Not a running Worker anymore
        // Detach the worker from the pthread object, and return it to the
        // worker pool as an unused worker.
        worker.pthread_ptr = 0;
  
        // Clear any pending waitAsync waiter armed on this thread's struct
        // BEFORE freeing the memory so that memory recycled by malloc in another
        // thread will not have a window where a stale async waiter is still active.
        PThread.clearMailboxAwait(pthread_ptr);
  
        // Finally, free the underlying (and now-unused) pthread structure in
        // linear memory.
        __emscripten_thread_free_data(pthread_ptr);
      },
  threadInitTLS() {
        // Call thread init functions (these are the _emscripten_tls_init for each
        // module loaded.
        PThread.tlsInitFunctions.forEach((f) => f());
      },
  loadWasmModuleToWorker:(worker) => new Promise((onFinishedLoading) => {
        worker.onmessage = (e) => {
          var d = e.data;
          var cmd = d.cmd;
  
          // If this message is intended to a recipient that is not the main
          // thread, forward it to the target thread. This is currently only
          // used by `CMD_CHECK_MAILBOX`.
          if (d.targetThread && d.targetThread != _pthread_self()) {
            var targetWorker = PThread.pthreads[d.targetThread];
            if (!targetWorker) err(`worker sent message (${cmd}) to pthread (${d.targetThread}) that no longer exists`);
            targetWorker?.postMessage(d);
            return;
          }
  
          if (d === 'setimmediate' || d === '_si') {
            // Worker wants to postMessage() to itself to implement setImmediate()
            // emulation.
            worker.postMessage(d);
            return;
          }
  
          switch (cmd) {
            case 4:
              checkMailbox();
              break;
            case 5:
              spawnThread(d);
              break;
            case 6:
              // cleanupThread needs to be run via callUserCallback since it calls
              // back into user code to free thread data. Without this it's possible
              // the unwind or ExitStatus exception could escape here.
              callUserCallback(() => cleanupThread(d.thread));
              break;
            case 3:
              onFinishedLoading(worker);
              break;
            case 9:
              Module[d.handler](...d.args);
              break;
            default:
              // The received message looks like something that should be handled by this message
              // handler, (since there is a e.data.cmd field present), but is not one of the
              // recognized commands:
              if (cmd) err(`worker sent an unknown command ${cmd}`);
          }
        };
  
        worker.onerror = (e) => {
          var message = 'worker sent an error!';
          if (worker.pthread_ptr) {
            message = `Pthread ${ptrToString(worker.pthread_ptr)} sent an error!`;
          }
          err(`${message} ${e.filename}:${e.lineno}: ${e.message}`);
          throw e;
        };
  
        assert(wasmMemory instanceof WebAssembly.Memory, 'wasmMemory should have been loaded by now');
        assert(wasmModule instanceof WebAssembly.Module, 'wasmModule should have been loaded by now');
  
        // When running on a pthread, none of the incoming parameters on the module
        // object are present. Proxy known handlers back to the main thread if specified.
        var handlers = [];
        var knownHandlers = [
          'onExit',
          'onAbort',
          'print',
          'printErr',
        ];
        for (var handler of knownHandlers) {
          if (Module.propertyIsEnumerable(handler)) {
            handlers.push(handler);
          }
        }
  
        // Ask the new worker to load up the Emscripten-compiled page. This is a heavy operation.
        worker.postMessage({
          cmd: 1,
          handlers: handlers,
          wasmMemory,
          wasmModule,
          workerID: worker.workerID,
        });
      }),
  allocateUnusedWorker() {
        var worker;
        var pthreadMainJs = _scriptName;
        worker = new Worker(pthreadMainJs, {
          // This is the way that we signal to the Web Worker that it is hosting
          // a pthread.
          'name': 'em-pthread-' + PThread.nextWorkerID,
  });
        worker.workerID = PThread.nextWorkerID++;
        PThread.unusedWorkers.push(worker);
        return worker;
      },
  getNewWorker() {
        if (PThread.unusedWorkers.length == 0) {
  // PTHREAD_POOL_SIZE_STRICT should show a warning and, if set to level `2`, return from the function.
  // However, if we're in Node.js, then we can create new workers on the fly and PTHREAD_POOL_SIZE_STRICT
  // should be ignored altogether.
              err('Tried to spawn a new thread, but the thread pool is exhausted.\n' +
              'This might result in a deadlock unless some threads eventually exit or the code explicitly breaks out to the event loop.\n' +
              'If you want to increase the pool size, use setting `-sPTHREAD_POOL_SIZE=...`.'
                + '\nIf you want to throw an explicit error instead of the risk of deadlocking in those cases, use setting `-sPTHREAD_POOL_SIZE_STRICT=2`.'
              );
          var newWorker = PThread.allocateUnusedWorker();
          PThread.loadWasmModuleToWorker(newWorker);
        }
        return PThread.unusedWorkers.pop();
      },
  };

  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);



  
  
  
  /** @type {!Uint32Array} */
  var HEAPU32;
  function establishStackSpace(pthread_ptr) {
      var stackHigh = HEAPU32[(((pthread_ptr)+(48))>>2)];
      var stackSize = HEAPU32[(((pthread_ptr)+(52))>>2)];
      var stackLow = stackHigh - stackSize;
      assert(stackHigh != 0);
      assert(stackLow != 0);
      assert(stackHigh > stackLow, 'stackHigh must be higher then stackLow');
      // Set stack limits used by `emscripten/stack.h` function.  These limits are
      // cached in wasm-side globals to make checks as fast as possible.
      _emscripten_stack_set_limits(stackHigh, stackLow);
  
      // Call inside wasm module to set up the stack frame for this pthread in wasm module scope
      stackRestore(stackHigh);
  
    }

  
  
  
  
  var wasmTableMirror = [];
  
  
  var getWasmTableEntry = (funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        /** @suppress {checkTypes} */
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
        if (Asyncify.isAsyncExport(func)) {
          wasmTableMirror[funcPtr] = func = Asyncify.makeAsyncFunction(func);
        }
      }
      return func;
    };
  var invokeEntryPoint = async (ptr, arg) => {
      // An old thread on this worker may have been canceled without returning the
      // `runtimeKeepaliveCounter` to zero. Reset it now so the new thread won't
      // be affected.
      runtimeKeepaliveCounter = 0;
  
      // Same for noExitRuntime.  The default for pthreads should always be false
      // otherwise pthreads would never complete and attempts to pthread_join to
      // them would block forever.
      // pthreads can still choose to set `noExitRuntime` explicitly, or
      // call emscripten_unwind_to_js_event_loop to extend their lifetime beyond
      // their main function.  See comment in src/runtime_pthread.js for more.
      noExitRuntime = 0;
  
      // pthread entry points are always of signature 'void *ThreadMain(void *arg)'
      // Native codebases sometimes spawn threads with other thread entry point
      // signatures, such as void ThreadMain(void *arg), void *ThreadMain(), or
      // void ThreadMain().  That is not acceptable per C/C++ specification, but
      // x86 compiler ABI extensions enable that to work. If you find the
      // following line to crash, either change the signature to "proper" void
      // *ThreadMain(void *arg) form, or try linking with the Emscripten linker
      // flag -sEMULATE_FUNCTION_POINTER_CASTS to add in emulation for this x86
      // ABI extension.
  
      var result = WebAssembly.promising(getWasmTableEntry(ptr))(arg);
  
      function finish(result) {
        // In MINIMAL_RUNTIME the noExitRuntime concept does not apply to
        // pthreads. To exit a pthread with live runtime, use the function
        // emscripten_unwind_to_js_event_loop() in the pthread body.
        if (keepRuntimeAlive()) {
          EXITSTATUS = result;
          return;
        }
        __emscripten_thread_exit(result);
      }
      result = await result;
      finish(result);
    };

  var noExitRuntime = true;


  var rbxConvertShader = (src) => {
      if (!/^\s*#version 150/.test(src)) return src;
      var isFrag = /\bgl_FragCoord\b|\bout\s+(highp\s+|mediump\s+)?(vec4|float|ivec4|uvec4)\s+\w+\s*;/.test(src) && !/\bgl_Position\b/.test(src);
      var pre = ['#version 300 es'];
      if (/\bnoperspective\b/.test(src)) pre.push('#extension GL_NV_shader_noperspective_interpolation : enable');
      if (/\bgl_ClipDistance\b/.test(src)) pre.push('#extension GL_EXT_clip_cull_distance : enable');
      pre.push('precision highp float;', 'precision highp int;', 'precision highp sampler2D;',
        'precision highp sampler3D;', 'precision highp samplerCube;', 'precision highp sampler2DArray;',
        'precision highp sampler2DShadow;', 'precision highp samplerCubeShadow;', 'precision highp sampler2DArrayShadow;',
        'precision highp isampler2D;', 'precision highp usampler2D;', 'precision highp isampler3D;', 'precision highp usampler3D;');
      return src
        .replace(/^\s*#version 150[^\n]*/, pre.join('\n'))
        .replace(/^\s*#extension GL_ARB_[^\n]*$/mg, '');
    };

  var registerTLSInit = (tlsInitFunc) => PThread.tlsInitFunctions.push(tlsInitFunc);



  var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        err(text);
      }
    };

  var wasmMemory;

  var _HaveOffsetConverter = () => 0;

  var _RBX_restoreWasmStackTraceLimit = (v) => { Error.stackTraceLimit = v; };

  var _RBX_setFullWasmStackTrace = () => { var old = Error.stackTraceLimit; Error.stackTraceLimit = Infinity; return old ?? 10; };

  var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
  
  
    /**
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul
   * @return {number}
   */
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
      var maxIdx = idx + maxBytesToRead;
      if (ignoreNul) return maxIdx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.
      // As a tiny code save trick, compare idx against maxIdx using a negation,
      // so that maxBytesToRead=undefined/NaN means Infinity.
      while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
      return idx;
    };
  
  
    /**
   * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
   * array that contains uint8 values, returns a copy of that string as a
   * Javascript String object.
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number=} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
  
      var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
  
      // When using conditional TextDecoder, skip it for short strings as the overhead of the native call is not worth it.
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.buffer instanceof ArrayBuffer ? heapOrArray.subarray(idx, endPtr) : heapOrArray.slice(idx, endPtr));
      }
      var str = '';
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce(`Invalid UTF-8 leading byte ${ptrToString(u0)} encountered when deserializing a UTF-8 string in wasm memory to a JS string!`);
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
  /** @type {!Uint8Array} */
  var HEAPU8;
  
    /**
   * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
   * emscripten HEAP, returns a copy of that string as a Javascript String object.
   *
   * @param {number} ptr
   * @param {number=} maxBytesToRead - An optional length that specifies the
   *   maximum number of bytes to read. You can omit this parameter to scan the
   *   string until the first 0 byte. If maxBytesToRead is passed, and the string
   *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
   *   string will cut short at that byte index.
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
      assert(typeof ptr === 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : '';
    };
  var ___assert_fail = (condition, filename, line, func) =>
      abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']);

  var rbxFibers = {
  parked:new Map,
  created:0,
  destroyed:0,
  transfers:0,
  };
  
  var rbxFiberSave = () => ({ sp: _get_stack_ptr(), base: _get_stack_base(), end: _get_stack_end() });
  
  var rbxFiberRestore = (st) => { _set_stack_limits(st.base, st.end); _set_stack_ptr(st.sp); };
  var ___asyncjs__create_suspended_fiber_js = async (creator, stackTop, stackLow, fn, arg) => {
      var st = rbxFiberSave();
      var handle = new Promise((resolve) => { rbxFibers.pendingCreate = { creator, resolve }; });
      _set_stack_limits(stackTop, stackLow);
      _set_stack_ptr(stackTop);
      rbxFibers.created++;
      if (!rbxFibers.statsTimer) rbxFibers.statsTimer = setInterval(() => console.log(`[rbx] fibers created=${rbxFibers.created} destroyed=${rbxFibers.destroyed} parked=${rbxFibers.parked.size} transfers=${rbxFibers.transfers}`), 5000);
      var done = _fiber_entry(creator, fn, arg);
      Promise.resolve(done).catch((e) => console.error('[rbx] fiber died', e));
      var h = await handle;
      rbxFiberRestore(st);
      return h;
    };
  ___asyncjs__create_suspended_fiber_js.isAsync = true;

  
  
  var rbxFiberPark = (token) => {
      var st = rbxFiberSave();
      return new Promise((resolve) => rbxFibers.parked.set(token, resolve)).then((v) => {
        rbxFiberRestore(st);
        return v;
      });
    };
  
  var rbxFiberWake = (token, value) => {
      var r = rbxFibers.parked.get(token);
      if (!r) throw new Error('fiber_transfer to unknown context ' + token);
      rbxFibers.parked.delete(token);
      r(value);
    };
  
  var ___asyncjs__fiber_transfer_js = (from, to) => {
      rbxFibers.transfers++;
      var p = rbxFiberPark(from);
      var pending = rbxFibers.pendingCreate;
      if (pending && pending.creator === to) {
        // First transfer out of a freshly created fiber: hand its token back.
        rbxFibers.pendingCreate = null;
        pending.resolve(from);
      } else {
        rbxFiberWake(to, from || 1);
      }
      return p;
    };
  ___asyncjs__fiber_transfer_js.isAsync = true;

  var ___asyncjs__rbxFutexWaitMainJspi = (addr, val, timeoutMs) => {
      var i = addr >> 2;
      if (Atomics.load(HEAP32, i) !== val) return 1;
      if (!(timeoutMs > 0)) return 2;
      var map = (v) => (v === 'ok' ? 0 : v === 'not-equal' ? 1 : 2);
      var r = Atomics.waitAsync(HEAP32, i, val, timeoutMs === Infinity ? undefined : timeoutMs);
      if (!r.async) return map(r.value);
      // debug: report long waits on the main thread
      var t0 = performance.now();
      var watch = setTimeout(() => console.warn(`[rbx] main-thread futex wait on ${addr} (val ${val}, timeout ${timeoutMs}) pending >3s; now ${Atomics.load(HEAP32, i)}`), 3000);
      return r.value.then((v) => { clearTimeout(watch); var dt = performance.now() - t0; if (dt > 3000) console.warn(`[rbx] futex ${addr} woke after ${dt | 0}ms: ${v}`); return map(v); });
    };
  ___asyncjs__rbxFutexWaitMainJspi.isAsync = true;

  var ___asyncjs__rbx_opfs_clear = () => 0;
  ___asyncjs__rbx_opfs_clear.isAsync = true;

  var ___asyncjs__rbx_opfs_contains = (k) => 0;
  ___asyncjs__rbx_opfs_contains.isAsync = true;

  var ___asyncjs__rbx_opfs_file_size = (k) => 0;
  ___asyncjs__rbx_opfs_file_size.isAsync = true;

  var ___asyncjs__rbx_opfs_get = (a, b) => 0;
  ___asyncjs__rbx_opfs_get.isAsync = true;

  var ___asyncjs__rbx_opfs_get_buffer = (a, b, c) => 0;
  ___asyncjs__rbx_opfs_get_buffer.isAsync = true;

  var ___asyncjs__rbx_opfs_get_buffer_offset = (a, b, c, d, e) => 0;
  ___asyncjs__rbx_opfs_get_buffer_offset.isAsync = true;

  var ___asyncjs__rbx_opfs_get_offset = (a, b, c, d) => 0;
  ___asyncjs__rbx_opfs_get_offset.isAsync = true;

  var ___asyncjs__rbx_opfs_list = (a, b) => 0;
  ___asyncjs__rbx_opfs_list.isAsync = true;

  var ___asyncjs__rbx_opfs_list_sized = (a, b) => 0;
  ___asyncjs__rbx_opfs_list_sized.isAsync = true;

  var rbxLog = (...a) => console.log('[rbx]', ...a);
  var rbxOnce = (key, ...a) => {
      rbxOnce.seen ??= new Set();
      if (!rbxOnce.seen.has(key)) { rbxOnce.seen.add(key); rbxLog(key, ...a); }
    };
  
  
  var ___asyncjs__rbx_opfs_open = (name, tid) => { rbxOnce('opfs_open', UTF8ToString(name), tid); };
  ___asyncjs__rbx_opfs_open.isAsync = true;

  var ___asyncjs__rbx_opfs_remove = (k) => 0;
  ___asyncjs__rbx_opfs_remove.isAsync = true;

  var ___asyncjs__rbx_opfs_remove_batch = (a) => 0;
  ___asyncjs__rbx_opfs_remove_batch.isAsync = true;

  var ___asyncjs__rbx_opfs_set = (k, p, n) => 0;
  ___asyncjs__rbx_opfs_set.isAsync = true;

  var ___call_sighandler = (fp, sig) => getWasmTableEntry(fp)(sig);

  
  
  
  
  function pthreadCreateProxied(pthread_ptr, attr, startRoutine, arg) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(2, 0, 1, pthread_ptr, attr, startRoutine, arg);
  return ___pthread_create_js(pthread_ptr, attr, startRoutine, arg)
  }
  
  
  var _emscripten_has_threading_support = () => !!globalThis.SharedArrayBuffer;
  
  var ___pthread_create_js = (pthread_ptr, attr, startRoutine, arg) => {
      if (!_emscripten_has_threading_support()) {
        dbg('pthread_create: environment does not support SharedArrayBuffer, pthreads are not available');
        return 6;
      }
  
      // List of JS objects that will transfer ownership to the Worker hosting the thread
      var transferList = [];
      var error = 0;
  
      // Synchronously proxy the thread creation to main thread if possible. If we
      // need to transfer ownership of objects, then proxy asynchronously via
      // postMessage.
      if (ENVIRONMENT_IS_PTHREAD && (!transferList.length || error)) {
        return pthreadCreateProxied(pthread_ptr, attr, startRoutine, arg);
      }
  
      // If on the main thread, and accessing Canvas/OffscreenCanvas failed, abort
      // with the detected error.
      if (error) return error;
  
      var threadParams = {
        startRoutine,
        pthread_ptr,
        arg,
        transferList,
      };
  
      if (ENVIRONMENT_IS_PTHREAD) {
        // The prepopulated pool of web workers that can host pthreads is stored
        // in the main JS thread. Therefore if a pthread is attempting to spawn a
        // new thread, the thread creation must be deferred to the main JS thread.
        threadParams.cmd = 5;
        postMessage(threadParams, transferList);
        // When we defer thread creation this way, we have no way to detect thread
        // creation synchronously today, so we have to assume success and return 0.
        return 0;
      }
  
      // We are the main thread, so we have the pthread warmup pool in this
      // thread and can fire off JS thread creation directly ourselves.
      return spawnThread(threadParams);
    };

  var ___syscall_getegid32 = () => 0;

  var ___syscall_geteuid32 = () => 0;

  var ___syscall_getgid32 = () => 0;

  var ___syscall_getuid32 = () => 0;

  var __abort_js = () =>
      abort('native code called abort()');

  var AsciiToString = (ptr) => {
      var str = '';
      while (1) {
        var ch = HEAPU8[ptr++];
        if (!ch) return str;
        str += String.fromCharCode(ch);
      }
    };
  
  var awaitingDependencies = {
  };
  
  var registeredTypes = {
  };
  
  var typeDependencies = {
  };
  
  class BindingError extends Error {
      constructor(message) {
        super(message);
        this.name = 'BindingError';
      }
    }
  var throwBindingError = (message) => { throw new BindingError(message); };
  /** @param {Object=} options */
  function sharedRegisterType(rawType, registeredInstance, options = {}) {
      var name = registeredInstance.name;
      if (!rawType) {
        throwBindingError(`type "${name}" must have a positive integer typeid pointer`);
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
        if (options.ignoreDuplicateRegistrations) {
          return;
        } else {
          throwBindingError(`Cannot register type '${name}' twice`);
        }
      }
  
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
  
      if (awaitingDependencies.hasOwnProperty(rawType)) {
        var callbacks = awaitingDependencies[rawType];
        delete awaitingDependencies[rawType];
        callbacks.forEach((cb) => cb());
      }
    }
  /** @param {Object=} options */
  function registerType(rawType, registeredInstance, options = {}) {
      return sharedRegisterType(rawType, registeredInstance, options);
    }
  
  
  /** @type {!Int16Array} */
  var HEAP16;
  
  
  /** @type {!Uint16Array} */
  var HEAPU16;
  
  
  
  
  /** not-@type {!BigUint64Array} */
  var HEAPU64;
  var integerReadValueFromPointer = (name, width, signed) => {
      // integers are quite common, so generate very specialized functions
      switch (width) {
        case 1: return signed ?
          (pointer) => HEAP8[pointer] :
          (pointer) => HEAPU8[pointer];
        case 2: return signed ?
          (pointer) => HEAP16[((pointer)>>1)] :
          (pointer) => HEAPU16[((pointer)>>1)]
        case 4: return signed ?
          (pointer) => HEAP32[((pointer)>>2)] :
          (pointer) => HEAPU32[((pointer)>>2)]
        case 8: return signed ?
          (pointer) => HEAP64[((pointer)>>3)] :
          (pointer) => HEAPU64[((pointer)>>3)]
        default:
          throw new TypeError(`invalid integer width (${width}): ${name}`);
      }
    };
  
  var embindRepr = (v) => {
      if (v === null) {
          return 'null';
      }
      var t = typeof v;
      if (t === 'object' || t === 'array' || t === 'function') {
          return v.toString();
      } else {
          return '' + v;
      }
    };
  
  var assertIntegerRange = (typeName, value, minRange, maxRange) => {
      if (value < minRange || value > maxRange) {
        throw new TypeError(`Passing a number "${embindRepr(value)}" from JS side to C/C++ side to an argument of type "${typeName}", which is outside the valid range [${minRange}, ${maxRange}]!`);
      }
    };
  /** @suppress {globalThis} */
  var __embind_register_bigint = (primitiveType, name, size, minRange, maxRange) => {
      name = AsciiToString(name);
  
      const isUnsignedType = minRange === 0n;
  
      let fromWireType = (value) => value;
      if (isUnsignedType) {
        // uint64 get converted to int64 in ABI, fix them up like we do for 32-bit integers.
        const bitSize = size * 8;
        fromWireType = (value) => {
          return BigInt.asUintN(bitSize, value);
        }
        maxRange = fromWireType(maxRange);
      }
  
      registerType(primitiveType, {
        name,
        fromWireType: fromWireType,
        toWireType: (destructors, value) => {
          if (typeof value === 'number') {
            value = BigInt(value);
          }
          else if (typeof value !== 'bigint') {
            throw new TypeError(`Cannot convert "${embindRepr(value)}" to ${name}`);
          }
          assertIntegerRange(name, value, minRange, maxRange);
          return value;
        },
        readValueFromPointer: integerReadValueFromPointer(name, size, !isUnsignedType),
        destructorFunction: null, // This type does not need a destructor
      });
    };

  
  
  /** @suppress {globalThis} */
  var __embind_register_bool = (rawType, name, trueValue, falseValue) => {
      name = AsciiToString(name);
      registerType(rawType, {
        name,
        fromWireType: function(wt) {
          // ambiguous emscripten ABI: sometimes return values are
          // true or false, and sometimes integers (0 or 1)
          return !!wt;
        },
        toWireType: function(destructors, o) {
          return o ? trueValue : falseValue;
        },
        readValueFromPointer: function(pointer) {
          return this.fromWireType(HEAPU8[pointer]);
        },
        destructorFunction: null, // This type does not need a destructor
      });
    };

  
  var emval_freelist = [];
  
  var emval_handles = [0,1,,1,null,1,true,1,false,1];
  var __emval_decref = (handle) => {
      if (handle > 9 && 0 === --emval_handles[handle + 1]) {
        assert(emval_handles[handle] !== undefined, `decref for unallocated handle`);
        var value = emval_handles[handle];
        emval_handles[handle] = undefined;
        emval_freelist.push(handle);
      }
    };
  
  
  
  var Emval = {
  toValue:(handle) => {
        if (!handle) {
            throwBindingError(`Cannot use deleted val. handle = ${handle}`);
        }
        // handle 2 is supposed to be `undefined`.
        assert(handle === 2 || emval_handles[handle] !== undefined && handle % 2 === 0, `invalid handle: ${handle}`);
        return emval_handles[handle];
      },
  toHandle:(value) => {
        switch (value) {
          case undefined: return 2;
          case null: return 4;
          case true: return 6;
          case false: return 8;
          default:{
            const handle = emval_freelist.pop() || emval_handles.length;
            emval_handles[handle] = value;
            emval_handles[handle + 1] = 1;
            return handle;
          }
        }
      },
  };
  
  /** @suppress {globalThis} */
  function readPointer(pointer) {
      return this.fromWireType(HEAPU32[((pointer)>>2)]);
    }
  var EmValType = {
      name: 'emscripten::val',
      fromWireType: (handle) => {
        var rv = Emval.toValue(handle);
        __emval_decref(handle);
        return rv;
      },
      toWireType: (destructors, value) => Emval.toHandle(value),
      readValueFromPointer: readPointer,
      destructorFunction: null, // This type does not need a destructor
  
      // TODO: do we need a deleteObject here?  write a test where
      // emval is passed into JS via an interface
    };
  var __embind_register_emval = (rawType) => registerType(rawType, EmValType);

  /** @type {!Float32Array} */
  var HEAPF32;
  
  var floatReadValueFromPointer = (name, width) => {
      switch (width) {
        case 4: return function(pointer) {
          return this.fromWireType(HEAPF32[((pointer)>>2)]);
        };
        case 8: return function(pointer) {
          return this.fromWireType(HEAPF64[((pointer)>>3)]);
        };
        default:
          throw new TypeError(`invalid float width (${width}): ${name}`);
      }
    };
  
  
  
  var __embind_register_float = (rawType, name, size) => {
      name = AsciiToString(name);
      registerType(rawType, {
        name,
        fromWireType: (value) => value,
        toWireType: (destructors, value) => {
          if (typeof value !== 'number' && typeof value !== 'boolean') {
            throw new TypeError(`Cannot convert ${embindRepr(value)} to ${name}`);
          }
          // The VM will perform JS to Wasm value conversion, according to the spec:
          // https://www.w3.org/TR/wasm-js-api-1/#towebassemblyvalue
          return value;
        },
        readValueFromPointer: floatReadValueFromPointer(name, size),
        destructorFunction: null, // This type does not need a destructor
      });
    };

  var createNamedFunction = (name, func) => Object.defineProperty(func, 'name', { value: name });
  
  var runDestructors = (destructors) => {
      while (destructors.length) {
        var ptr = destructors.pop();
        var del = destructors.pop();
        del(ptr);
      }
    };
  
  
  function usesDestructorStack(argTypes) {
      // Skip return value at index 0 - it's not deleted here.
      for (var i = 1; i < argTypes.length; ++i) {
        // The type does not define a destructor function - must use dynamic stack
        if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
          return true;
        }
      }
      return false;
    }
  
  function argsUseStackAlloc(argTypes) {
      // Skip return value at index 0 - only arguments stack-allocate.
      for (var i = 1; i < argTypes.length; ++i) {
        if (argTypes[i] !== null && argTypes[i].argStackAlloc) {
          return true;
        }
      }
      return false;
    }
  
  
  
  
  
  function checkArgCount(numArgs, minArgs, maxArgs, humanName, throwBindingError) {
      if (numArgs < minArgs || numArgs > maxArgs) {
        var argCountMessage = minArgs == maxArgs ? minArgs : `${minArgs} to ${maxArgs}`;
        throwBindingError(`function ${humanName} called with ${numArgs} arguments, expected ${argCountMessage}`);
      }
    }
  function createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync) {
      var needsDestructorStack = usesDestructorStack(argTypes);
      var argsNeedStack = argsUseStackAlloc(argTypes);
      // JSPI-async invokers resume after the frame would be gone, so they
      // defer through the destructors array instead.
      var useStackFrame = argsNeedStack && !isAsync && !needsDestructorStack;
      if (argsNeedStack && !useStackFrame) {
        // A stack-allocating type must never see a null destructors argument
        // without a bracketing frame; route it through the destructors array
        // (it heap-allocates on that path).
        needsDestructorStack = true;
      }
      var argCount = argTypes.length - 2;
      var argsList = [];
      var argsListWired = ['fn'];
      if (isClassMethodFunc) {
        argsListWired.push('thisWired');
      }
      for (var i = 0; i < argCount; ++i) {
        argsList.push(`arg${i}`)
        argsListWired.push(`arg${i}Wired`)
      }
      argsList = argsList.join()
      argsListWired = argsListWired.join()
  
      var invokerFnBody = `return function (${argsList}) {\n`;
  
      invokerFnBody += 'checkArgCount(arguments.length, minArgs, maxArgs, humanName, throwBindingError);\n';
  
      if (needsDestructorStack) {
        invokerFnBody += 'var destructors = [];\n';
      }
      if (useStackFrame) {
        // The frame must be released on every completion, including a throwing
        // argument conversion or callee: a skipped stackRestore permanently
        // leaks wasm stack. `var` declarations hoist out of the try block.
        invokerFnBody += 'var sp = stackSave();\ntry {\n';
      }
  
      var dtorStack = needsDestructorStack ? 'destructors' : 'null';
      var args1 = ['humanName', 'throwBindingError', 'invoker', 'fn', 'runDestructors', 'fromRetWire', 'toClassParamWire'];
      if (useStackFrame) {
        args1.push('stackSave', 'stackRestore');
      }
  
      if (isClassMethodFunc) {
        invokerFnBody += `var thisWired = toClassParamWire(${dtorStack}, this);\n`;
      }
  
      for (var i = 0; i < argCount; ++i) {
        var argName = `toArg${i}Wire`;
        invokerFnBody += `var arg${i}Wired = ${argName}(${dtorStack}, arg${i});\n`;
        args1.push(argName);
      }
  
      invokerFnBody += (returns || isAsync ? 'var rv = ' : '') + `invoker(${argsListWired});\n`;
      if (useStackFrame) {
        // The callee has consumed the stack-allocated argument temporaries;
        // release the frame before any post-call work.
        invokerFnBody += '} finally {\nstackRestore(sp);\n}\n';
      }
  
      var returnVal = returns ? 'rv' : '';
      invokerFnBody += `function onDone(${returnVal}) {\n`;
  
      if (needsDestructorStack) {
        invokerFnBody += 'runDestructors(destructors);\n';
      } else {
        for (var i = isClassMethodFunc?1:2; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here. Also skip class type if not a method.
          var paramName = (i === 1 ? 'thisWired' : `arg${i - 2}Wired`);
          if (argTypes[i].destructorFunction !== null) {
            invokerFnBody += `${paramName}_dtor(${paramName});\n`;
            args1.push(`${paramName}_dtor`);
          }
        }
      }
  
      if (returns) {
        invokerFnBody += 'var ret = fromRetWire(rv);\n' +
                         'return ret;\n';
      } else {
      }
  
      invokerFnBody += '}\n';
      invokerFnBody += 'return ' + (isAsync ? 'rv.then(onDone)' : `onDone(${returnVal})`) + ';';
  
      invokerFnBody += '}\n';
  
      args1.push('checkArgCount', 'minArgs', 'maxArgs');
      invokerFnBody = `if (arguments.length !== ${args1.length}){ throw new Error(humanName + "Expected ${args1.length} closure arguments " + arguments.length + " given."); }\n${invokerFnBody}`;
      return new Function(args1, invokerFnBody);
    }
  
  function getRequiredArgCount(argTypes) {
      var requiredArgCount = argTypes.length - 2;
      for (var i = argTypes.length - 1; i >= 2; --i) {
        if (!argTypes[i].optional) {
          break;
        }
        requiredArgCount--;
      }
      return requiredArgCount;
    }
  
  function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc, /** boolean= */ isAsync) {
      // humanName: a human-readable string name for the function to be generated.
      // argTypes: An array that contains the embind type objects for all types in the function signature.
      //    argTypes[0] is the type object for the function return value.
      //    argTypes[1] is the type object for function this object/class type, or null if not crafting an invoker for a class method.
      //    argTypes[2...] are the actual function parameters.
      // classType: The embind type object for the class to be bound, or null if this is not a method of a class.
      // cppInvokerFunc: JS Function object to the C++-side function that interops into C++ code.
      // cppTargetFunc: Function pointer (an integer to FUNCTION_TABLE) to the target C++ function the cppInvokerFunc will end up calling.
      // isAsync: Optional. If true, returns an async function. Async bindings are only supported with JSPI.
      var argCount = argTypes.length;
  
      if (argCount < 2) {
        throwBindingError('argTypes array size mismatch! Must at least get return value and receiver (this) types!');
      }
  
      var isClassMethodFunc = (argTypes[1] !== null && classType !== null);
  
      // Free functions with signature "void function()" do not need an invoker that marshalls between wire types.
      // TODO: This omits argument count check - enable only at -O3 or similar.
      //    if (ENABLE_UNSAFE_OPTS && argCount == 2 && argTypes[0].name == 'void' && !isClassMethodFunc) {
      //       return FUNCTION_TABLE[fn];
      //    }
  
      // Determine if we need to use a dynamic stack to store the destructors for the function parameters.
      // TODO: Remove this completely once all function invokers are being dynamically generated.
      var needsDestructorStack = usesDestructorStack(argTypes);
  
      // Stack-allocating trivial value types get a stackSave/stackRestore
      // bracket around the call; see createJsInvoker for the async carve-outs.
      var argsNeedStack = argsUseStackAlloc(argTypes);
      var useStackFrame = argsNeedStack && !isAsync && !needsDestructorStack;
      if (argsNeedStack && !useStackFrame) {
        needsDestructorStack = true;
      }
  
      var returns = !argTypes[0].isVoid;
  
      var expectedArgCount = argCount - 2;
      var minArgs = getRequiredArgCount(argTypes);
      // Build the arguments that will be passed into the closure around the invoker
      // function.
      var retType = argTypes[0];
      var instType = argTypes[1];
      var closureArgs = [humanName, throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, retType.fromWireType.bind(retType), instType?.toWireType.bind(instType)];
      if (useStackFrame) {
        // Must mirror the `args1.push('stackSave', 'stackRestore')` in createJsInvoker.
        closureArgs.push(stackSave, stackRestore);
      }
      for (var i = 2; i < argCount; ++i) {
        var argType = argTypes[i];
        closureArgs.push(argType.toWireType.bind(argType));
      }
      if (!needsDestructorStack) {
        // Skip return value at index 0 - it's not deleted here. Also skip class type if not a method.
        for (var i = isClassMethodFunc?1:2; i < argTypes.length; ++i) {
          if (argTypes[i].destructorFunction !== null) {
            closureArgs.push(argTypes[i].destructorFunction);
          }
        }
      }
      closureArgs.push(checkArgCount, minArgs, expectedArgCount);
  
      let invokerFactory = createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync);
      var invokerFn = invokerFactory(...closureArgs);
      return createNamedFunction(humanName, invokerFn);
    }
  
  var ensureOverloadTable = (proto, methodName, humanName) => {
      if (undefined === proto[methodName].overloadTable) {
        var prevFunc = proto[methodName];
        // Inject an overload resolver function that routes to the appropriate overload based on the number of arguments.
        proto[methodName] = function(...args) {
          // TODO This check can be removed in -O3 level "unsafe" optimizations.
          if (!proto[methodName].overloadTable.hasOwnProperty(args.length)) {
            throwBindingError(`Function '${humanName}' called with an invalid number of arguments (${args.length}) - expects one of (${proto[methodName].overloadTable})!`);
          }
          return proto[methodName].overloadTable[args.length].apply(this, args);
        };
        // Move the previous function into the overload table.
        proto[methodName].overloadTable = [];
        proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    };
  
  /** @param {number=} numArguments */
  var exposePublicSymbol = (name, value, numArguments) => {
      if (Module.hasOwnProperty(name)) {
        if (undefined === numArguments || (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])) {
          throwBindingError(`Cannot register public name '${name}' twice`);
        }
  
        // We are exposing a function with the same name as an existing function. Create an overload table and a function selector
        // that routes between the two.
        ensureOverloadTable(Module, name, name);
        if (Module[name].overloadTable.hasOwnProperty(numArguments)) {
          throwBindingError(`Cannot register multiple overloads of a function with the same number of arguments (${numArguments})!`);
        }
        // Add the new function into the overload table.
        Module[name].overloadTable[numArguments] = value;
      } else {
        Module[name] = value;
        Module[name].argCount = numArguments;
      }
    };
  
  var heap32VectorToArray = (count, firstElement) => {
      var array = [];
      for (var i = 0; i < count; i++) {
        // TODO(https://github.com/emscripten-core/emscripten/issues/17310):
        // Find a way to hoist the `>> 2` or `>> 3` out of this loop.
        array.push(HEAPU32[(((firstElement)+(i * 4))>>2)]);
      }
      return array;
    };
  
  
  class InternalError extends Error {
      constructor(message) {
        super(message);
        this.name = 'InternalError';
      }
    }
  var throwInternalError = (message) => { throw new InternalError(message); };
  /** @param {number=} numArguments */
  var replacePublicSymbol = (name, value, numArguments) => {
      if (!Module.hasOwnProperty(name)) {
        throwInternalError('Replacing nonexistent public symbol');
      }
      // If there's an overload table for this symbol, replace the symbol in the overload table instead.
      if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
        Module[name].overloadTable[numArguments] = value;
      } else {
        Module[name] = value;
        Module[name].argCount = numArguments;
      }
    };
  
  
  
  var embind__requireFunction = (signature, rawFunction, isAsync = false) => {
  
      signature = AsciiToString(signature);
  
      function makeDynCaller() {
        var rtn = getWasmTableEntry(rawFunction);
        if (isAsync) {
          rtn = WebAssembly.promising(rtn);
        }
        return rtn;
      }
  
      var fp = makeDynCaller();
      if (typeof fp !== 'function') {
          throwBindingError(`unknown function pointer with signature ${signature}: ${rawFunction}`);
      }
      return fp;
    };
  
  
  
  class UnboundTypeError extends Error {}
  
  
  
  var getTypeName = (type) => {
      var ptr = ___getTypeName(type);
      var rv = AsciiToString(ptr);
      _free(ptr);
      return rv;
    };
  var throwUnboundTypeError = (message, types) => {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
        if (seen[type]) {
          return;
        }
        if (registeredTypes[type]) {
          return;
        }
        if (typeDependencies[type]) {
          typeDependencies[type].forEach(visit);
          return;
        }
        unboundTypes.push(type);
        seen[type] = true;
      }
      types.forEach(visit);
  
      throw new UnboundTypeError(`${message}: ` + unboundTypes.map(getTypeName).join([', ']));
    };
  
  
  
  
  var whenDependentTypesAreResolved = (myTypes, dependentTypes, getTypeConverters) => {
      myTypes.forEach((type) => typeDependencies[type] = dependentTypes);
  
      function onComplete(typeConverters) {
        var myTypeConverters = getTypeConverters(typeConverters);
        if (myTypeConverters.length !== myTypes.length) {
          throwInternalError('Mismatched type converter count');
        }
        for (var i = 0; i < myTypes.length; ++i) {
          registerType(myTypes[i], myTypeConverters[i]);
        }
      }
  
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      for (let [i, dt] of dependentTypes.entries()) {
        if (registeredTypes.hasOwnProperty(dt)) {
          typeConverters[i] = registeredTypes[dt];
        } else {
          unregisteredTypes.push(dt);
          if (!awaitingDependencies.hasOwnProperty(dt)) {
            awaitingDependencies[dt] = [];
          }
          awaitingDependencies[dt].push(() => {
            typeConverters[i] = registeredTypes[dt];
            ++registered;
            if (registered === unregisteredTypes.length) {
              onComplete(typeConverters);
            }
          });
        }
      }
      if (0 === unregisteredTypes.length) {
        onComplete(typeConverters);
      }
    };
  
  var getFunctionName = (signature) => {
      signature = signature.trim();
      const argsIndex = signature.indexOf('(');
      if (argsIndex === -1) return signature;
      assert(signature.endsWith(')'), 'Parentheses for argument names should match.');
      return signature.slice(0, argsIndex);
    };
  var __embind_register_function = (name, argCount, rawArgTypesAddr, signature, rawInvoker, fn, isAsync, isNonnullReturn) => {
      var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      name = AsciiToString(name);
      name = getFunctionName(name);
  
      rawInvoker = embind__requireFunction(signature, rawInvoker, isAsync);
  
      exposePublicSymbol(name, function() {
        throwUnboundTypeError(`Cannot call ${name} due to unbound types`, argTypes);
      }, argCount - 1);
  
      whenDependentTypesAreResolved([], argTypes, (argTypes) => {
        var invokerArgsArray = [argTypes[0] /* return value */, null /* no class 'this'*/].concat(argTypes.slice(1) /* actual params */);
        replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null /* no class 'this'*/, rawInvoker, fn, isAsync), argCount - 1);
        return [];
      });
    };

  
  
  
  
  /** @suppress {globalThis} */
  var __embind_register_integer = (primitiveType, name, size, minRange, maxRange) => {
      name = AsciiToString(name);
  
      const isUnsignedType = minRange === 0;
  
      let fromWireType = (value) => value;
      if (isUnsignedType) {
        var bitshift = 32 - 8*size;
        fromWireType = (value) => (value << bitshift) >>> bitshift;
        maxRange = fromWireType(maxRange);
      }
  
      registerType(primitiveType, {
        name,
        fromWireType: fromWireType,
        toWireType: (destructors, value) => {
          if (typeof value !== 'number' && typeof value !== 'boolean') {
            throw new TypeError(`Cannot convert "${embindRepr(value)}" to ${name}`);
          }
          assertIntegerRange(name, value, minRange, maxRange);
          // The VM will perform JS to Wasm value conversion, according to the spec:
          // https://www.w3.org/TR/wasm-js-api-1/#towebassemblyvalue
          return value;
        },
        readValueFromPointer: integerReadValueFromPointer(name, size, minRange !== 0),
        destructorFunction: null, // This type does not need a destructor
      });
    };

  
  
  
  var __embind_register_memory_view = (rawType, dataTypeIndex, name) => {
      var typeMapping = [
        Int8Array,
        Uint8Array,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array,
        BigInt64Array,
        BigUint64Array,
      ];
  
      var TA = typeMapping[dataTypeIndex];
  
      function decodeMemoryView(handle) {
        var size = HEAPU32[((handle)>>2)];
        var data = HEAPU32[(((handle)+(4))>>2)];
        return new TA(HEAP8.buffer, data, size);
      }
  
      name = AsciiToString(name);
      registerType(rawType, {
        name,
        fromWireType: decodeMemoryView,
        readValueFromPointer: decodeMemoryView,
      }, {
        ignoreDuplicateRegistrations: true,
      });
    };

  
  
  
  
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.codePointAt(i);
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 0x10FFFF) warnOnce(`Invalid Unicode code point ${ptrToString(u)} encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).`);
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
          // Gotcha: if codePoint is over 0xFFFF, it is represented as a surrogate pair in UTF-16.
          // We need to manually skip over the second code unit for correct iteration.
          i++;
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
  
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      assert(typeof maxBytesToWrite === 'number', 'stringToUTF8 requires a third parameter that specifies the length of the output buffer');
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  
  var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
  
  
  
  
  
  var __embind_register_std_string = (rawType, name) => {
      name = AsciiToString(name);
      const stdStringIsUTF8 = true;
  
      registerType(rawType, {
        name,
        // For some method names we use string keys here since they are part of
        // the public/external API and/or used by the runtime-generated code.
        fromWireType(value) {
          var length = HEAPU32[((value)>>2)];
          var payload = value + 4;
  
          var str;
          if (stdStringIsUTF8) {
            str = UTF8ToString(payload, length, true);
          } else {
            str = '';
            for (var i = 0; i < length; ++i) {
              str += String.fromCharCode(HEAPU8[payload + i]);
            }
          }
  
          _free(value);
  
          return str;
        },
        toWireType(destructors, value) {
          if (value instanceof ArrayBuffer) {
            value = new Uint8Array(value);
          }
  
          var length;
          var valueIsOfTypeString = (typeof value === 'string');
  
          // We accept `string` or array views with single byte elements
          if (!(valueIsOfTypeString || (ArrayBuffer.isView(value) && value.BYTES_PER_ELEMENT == 1))) {
            throwBindingError('Cannot pass non-string to std::string');
          }
          if (stdStringIsUTF8 && valueIsOfTypeString) {
            length = lengthBytesUTF8(value);
          } else {
            length = value.length;
          }
  
          // assumes POINTER_SIZE alignment
          var base = _malloc(4 + length + 1);
          var ptr = base + 4;
          HEAPU32[((base)>>2)] = length;
          if (valueIsOfTypeString) {
            if (stdStringIsUTF8) {
              stringToUTF8(value, ptr, length + 1);
            } else {
              for (var i = 0; i < length; ++i) {
                var charCode = value.charCodeAt(i);
                if (charCode > 255) {
                  _free(base);
                  throwBindingError('String has UTF-16 code units that do not fit in 8 bits');
                }
                HEAPU8[ptr + i] = charCode;
              }
            }
          } else {
            HEAPU8.set(value, ptr);
          }
  
          if (destructors !== null) {
            destructors.push(_free, base);
          }
          return base;
        },
        readValueFromPointer: readPointer,
        destructorFunction(ptr) {
          _free(ptr);
        },
      });
    };

  
  
  
  var UTF16Decoder = globalThis.TextDecoder ? new TextDecoder('utf-16le') : undefined;;
  
  
  var UTF16ToString = (ptr, maxBytesToRead, ignoreNul) => {
      assert(ptr % 2 == 0, 'pointer passed to UTF16ToString must be 2-byte aligned');
      var idx = ((ptr)>>1);
      var endIdx = findStringEnd(HEAPU16, idx, maxBytesToRead / 2, ignoreNul);
  
      // When using conditional TextDecoder, skip it for short strings as the overhead of the native call is not worth it.
      if (endIdx - idx > 16 && UTF16Decoder)
        return UTF16Decoder.decode(HEAPU16.slice(idx, endIdx));
  
      // Fallback: decode without UTF16Decoder
      var str = '';
  
      // If maxBytesToRead is not passed explicitly, it will be undefined, and the
      // for-loop's condition will always evaluate to true. The loop is then
      // terminated on the first null char.
      for (var i = idx; i < endIdx; ++i) {
        var codeUnit = HEAPU16[i];
        // fromCharCode constructs a character from a UTF-16 code unit, so we can
        // pass the UTF16 string right through.
        str += String.fromCharCode(codeUnit);
      }
  
      return str;
    };
  
  var stringToUTF16 = (str, outPtr, maxBytesToWrite = 0x7FFFFFFF) => {
      assert(outPtr % 2 == 0, 'pointer passed to stringToUTF16 must be 2-byte aligned');
      assert(typeof maxBytesToWrite === 'number', 'stringToUTF16 requires a third parameter that specifies the length of the output buffer');
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2; // Null terminator.
      var startPtr = outPtr;
      var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
      for (var i = 0; i < numCharsToWrite; ++i) {
        // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
        var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
        HEAP16[((outPtr)>>1)] = codeUnit;
        outPtr += 2;
      }
      // Null-terminate the pointer to the HEAP.
      HEAP16[((outPtr)>>1)] = 0;
      return outPtr - startPtr;
    };
  
  var lengthBytesUTF16 = (str) => str.length*2;
  
  var UTF32ToString = (ptr, maxBytesToRead, ignoreNul) => {
      assert(ptr % 4 == 0, 'pointer passed to UTF32ToString must be 2-byte aligned');
      var str = '';
      var startIdx = ((ptr)>>2);
      // If maxBytesToRead is not passed explicitly, it will be undefined, and this
      // will always evaluate to true. This saves on code size.
      for (var i = 0; !(i >= maxBytesToRead / 4); i++) {
        var utf32 = HEAPU32[startIdx + i];
        if (!utf32 && !ignoreNul) break;
        str += String.fromCodePoint(utf32);
      }
      return str;
    };
  
  var stringToUTF32 = (str, outPtr, maxBytesToWrite = 0x7FFFFFFF) => {
      assert(outPtr % 4 == 0, 'pointer passed to stringToUTF32 must be 4-byte aligned');
      assert(typeof maxBytesToWrite === 'number', 'stringToUTF32 requires a third parameter that specifies the length of the output buffer');
      if (maxBytesToWrite < 4) return 0;
      var startPtr = outPtr;
      var endPtr = startPtr + maxBytesToWrite - 4;
      for (var i = 0; i < str.length; ++i) {
        var codePoint = str.codePointAt(i);
        // Gotcha: if codePoint is over 0xFFFF, it is represented as a surrogate pair in UTF-16.
        // We need to manually skip over the second code unit for correct iteration.
        if (codePoint > 0xFFFF) {
          i++;
        }
        HEAP32[((outPtr)>>2)] = codePoint;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break;
      }
      // Null-terminate the pointer to the HEAP.
      HEAP32[((outPtr)>>2)] = 0;
      return outPtr - startPtr;
    };
  
  var lengthBytesUTF32 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var codePoint = str.codePointAt(i);
        // Gotcha: if codePoint is over 0xFFFF, it is represented as a surrogate pair in UTF-16.
        // We need to manually skip over the second code unit for correct iteration.
        if (codePoint > 0xFFFF) {
          i++;
        }
        len += 4;
      }
  
      return len;
    };
  
  var __embind_register_std_wstring = (rawType, charSize, name) => {
      name = AsciiToString(name);
      var decodeString, encodeString, lengthBytesUTF;
      if (charSize === 2) {
        decodeString = UTF16ToString;
        encodeString = stringToUTF16;
        lengthBytesUTF = lengthBytesUTF16;
      } else {
        assert(charSize === 4, 'only 2-byte and 4-byte strings are currently supported');
        decodeString = UTF32ToString;
        encodeString = stringToUTF32;
        lengthBytesUTF = lengthBytesUTF32;
      }
      registerType(rawType, {
        name,
        fromWireType: (value) => {
          // Code mostly taken from _embind_register_std_string fromWireType
          var length = HEAPU32[((value)>>2)];
          var str = decodeString(value + 4, length * charSize, true);
  
          _free(value);
  
          return str;
        },
        toWireType: (destructors, value) => {
          if (!(typeof value === 'string')) {
            throwBindingError(`Cannot pass non-string to C++ string type ${name}`);
          }
  
          // assumes POINTER_SIZE alignment
          var length = lengthBytesUTF(value);
          var ptr = _malloc(4 + length + charSize);
          HEAPU32[((ptr)>>2)] = length / charSize;
  
          encodeString(value, ptr + 4, length + charSize);
  
          if (destructors !== null) {
            destructors.push(_free, ptr);
          }
          return ptr;
        },
        readValueFromPointer: readPointer,
        destructorFunction(ptr) {
          _free(ptr);
        }
      });
    };

  
  var __embind_register_void = (rawType, name) => {
      name = AsciiToString(name);
      registerType(rawType, {
        isVoid: true, // void return values can be optimized out sometimes
        name,
        fromWireType: () => undefined,
        // TODO: assert if anything else is given?
        toWireType: (destructors, o) => undefined,
      });
    };

  
  function __emscripten_fetch_get_response_headers(id, dst, dstSizeBytes) {
    var responseHeaders = Fetch.xhrs.get(id).getAllResponseHeaders();
    return stringToUTF8(responseHeaders, dst, dstSizeBytes) + 1;
  }

  function __emscripten_fetch_get_response_headers_length(id) {
    return lengthBytesUTF8(Fetch.xhrs.get(id).getAllResponseHeaders());
  }

  
  var __emscripten_init_main_thread_js = (tb) => {
      var can_block = !ENVIRONMENT_IS_WEB;
      // Feature detect whether the main thread can block.
      try {
        Atomics.wait(HEAP32, 0, 0, 0)
        can_block = true;
      } catch (e) {}
      // Pass the thread address to the native code where they are stored in wasm
      // globals which act as a form of TLS. Global constructors trying
      // to access this value will read the wrong value, but that is UB anyway.
      __emscripten_thread_init(
        tb,
        /*is_main=*/!ENVIRONMENT_IS_WORKER,
        /*is_runtime=*/1,
        can_block,
        /*default_stacksize=*/65536,
        /*start_profiling=*/false,
      );
      PThread.threadInitTLS();
    };

  var jsStackTrace = () => new Error().stack.toString();
  
  /** @param {number=} flags */
  var getCallstack = (flags) => {
      var callstack = jsStackTrace();
  
      if (flags & 8) {
        warnOnce('emscripten_log with EM_LOG_C_STACK no longer has any effect');
      }
  
      // Process all lines:
      var lines = callstack.split('\n');
      callstack = '';
      // Extract components of form:
      // '       Object._main@http://server.com:4324:12'
      var firefoxRe = new RegExp('\\s*(.*?)@(.*?):([0-9]+):([0-9]+)');
      // Extract components of form:
      // '    at Object._main (http://server.com/file.html:4324:12)'
      var chromeRe = new RegExp('\\s*at (.*?) \\\((.*):(.*):(.*)\\\)');
  
      for (var line of lines) {
        var symbolName = '';
        var file = '';
        var lineno = 0;
        var column = 0;
  
        var parts = chromeRe.exec(line);
        if (parts?.length == 5) {
          symbolName = parts[1];
          file = parts[2];
          lineno = parts[3];
          column = parts[4];
        } else {
          parts = firefoxRe.exec(line);
          if (parts?.length >= 4) {
            symbolName = parts[1];
            file = parts[2];
            lineno = parts[3];
            // Old Firefox doesn't carry column information, but in new FF30, it
            // is present. See https://bugzil.la/762556
            column = parts[4]|0;
          } else {
            // Was not able to extract this line for demangling/sourcemapping
            // purposes. Output it as-is.
            callstack += line + '\n';
            continue;
          }
        }
  
        // Find the symbols in the callstack that corresponds to the functions that
        // report callstack information, and remove everything up to these from the
        // output.
        if (symbolName == '_emscripten_log' || symbolName == '_emscripten_get_callstack') {
          callstack = '';
          continue;
        }
  
        if ((flags & 24)) {
          if (flags & 64) {
            file = file.substring(file.replace(/\\/g, '/').lastIndexOf('/')+1);
          }
          callstack += `    at ${symbolName} (${file}:${lineno}:${column})\n`;
        }
      }
      // Trim extra whitespace at the end of the output.
      callstack = callstack.replace(/\s+$/, '');
      return callstack;
    };
  
  var __emscripten_log_formatted = (flags, str) => {
      str = UTF8ToString(str);
  
      if (flags & 24) {
        str = str.replace(/\s+$/, ''); // Ensure the message and the callstack are joined cleanly with exactly one newline.
        str += (str.length > 0 ? '\n' : '') + getCallstack(flags);
      }
  
      if (flags & 1) {
        if (flags & 4) {
          console.error(str);
        } else if (flags & 2) {
          console.warn(str);
        } else if (flags & 512) {
          console.info(str);
        } else if (flags & 256) {
          console.debug(str);
        } else {
          console.log(str);
        }
      } else if (flags & 6) {
        err(str);
      } else {
        out(str);
      }
    };

  var handleException = (e) => {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      quit_(1, e);
    };
  
  
  
  
  var maybeExit = () => {
      if (!keepRuntimeAlive()) {
        try {
          if (ENVIRONMENT_IS_PTHREAD) {
            // exit the current thread, but only if there is one active.
            // TODO(https://github.com/emscripten-core/emscripten/issues/25076):
            // Unify this check with the runtimeExited check above
            if (_pthread_self()) __emscripten_thread_exit(EXITSTATUS);
            return;
          }
          _exit(EXITSTATUS);
        } catch (e) {
          handleException(e);
        }
      }
    };
  var callUserCallback = (func, ...args) => {
      if (ABORT) {
        err('user callback triggered after runtime exited or application aborted.  Ignoring.');
        return;
      }
      try {
        return func(...args);
      } catch (e) {
        handleException(e);
      } finally {
        maybeExit();
      }
    };
  
  
  
  
  
  
  var __emscripten_thread_mailbox_await = (pthread_ptr) => {
      if (!waitAsyncPolyfilled) {
        // Wait on the pthread's initial self-pointer field because it is easy and
        // safe to access from sending threads that need to notify the waiting
        // thread.
        // Note: Under wasm64 only the low 32-bit of the pthread_ptr are
        // read/compared here, but we don't actually care about the exact values
        // here as long as they match.
        var wait = Atomics.waitAsync(HEAP32, ((pthread_ptr)>>2), pthread_ptr);
        assert(wait.async);
        wait.value.then(checkMailbox);
        var waitingAsync = pthread_ptr + 112;
        Atomics.store(HEAP32, ((waitingAsync)>>2), 1);
      }
      // If `Atomics.waitAsync` is not implemented, then we will always fall back
      // to postMessage and there is no need to do anything here.
    };
  
  var checkMailbox = () => {
      // checkMailbox can be called after the pthread has shut down. See
      // Pthread.terminateRuntime().
      // In this case we return silently without re-registering using waitAsync.
      // Perhaps there is a more universal way we can detect runtime has exited.
      // TODO(https://github.com/emscripten-core/emscripten/issues/25076)
      var pthread_ptr = _pthread_self();
      if (!pthread_ptr) return;
      callUserCallback(() => {
        // If we are using Atomics.waitAsync as our notification mechanism, wait
        // for a notification before processing the mailbox to avoid missing any
        // work that could otherwise arrive after we've finished processing the
        // mailbox and before we're ready for the next notification.
        __emscripten_thread_mailbox_await(pthread_ptr);
        __emscripten_check_mailbox();
      });
    };
  
  var __emscripten_notify_mailbox_postmessage = (targetThread, currThreadId) => {
      if (targetThread == currThreadId) {
        setTimeout(checkMailbox);
      } else if (ENVIRONMENT_IS_PTHREAD) {
        postMessage({targetThread, cmd: 4});
      } else {
        var worker = PThread.pthreads[targetThread];
        if (!worker) {
          err(`Cannot send message to thread with ID ${targetThread}, unknown thread ID!`);
          return;
        }
        worker.postMessage({cmd: 4});
      }
    };

  
  
  var proxiedJSCallArgs = [];
  
  
  
  var __emscripten_receive_on_main_thread_js = (funcIndex, emAsmAddr, callingThread, bufSize, args, ctx, ctxArgs) => {
      // Sometimes we need to backproxy events to the calling thread (e.g.
      // HTML5 DOM events handlers such as
      // emscripten_set_mousemove_callback()), so keep track in a globally
      // accessible variable about the thread that initiated the proxying.
      proxiedJSCallArgs.length = 0;
      var b = ((args)>>3);
      var end = ((args + bufSize)>>3);
      while (b < end) {
        var arg;
        if (HEAP64[b++]) {
          // It's a BigInt.
          arg = HEAP64[b++];
        } else {
          // It's a Number.
          arg = HEAPF64[b++];
        }
        proxiedJSCallArgs.push(arg);
      }
      // Proxied JS library funcs use funcIndex and EM_ASM functions use emAsmAddr
      var func = emAsmAddr ? rbxEmAsm(emAsmAddr) : proxiedFunctionTable[funcIndex];
      assert(!(funcIndex && emAsmAddr));
      assert(func.length == proxiedJSCallArgs.length, 'Call args mismatch in _emscripten_receive_on_main_thread_js');
      PThread.currentProxiedOperationCallerThread = callingThread;
      var rtn = func(...proxiedJSCallArgs);
      PThread.currentProxiedOperationCallerThread = 0;
      if (ctx) {
        // A PROXY_SYNC_ASYNC function may complete synchronously with a plain value.
        Promise.resolve(rtn).then((rtn) => __emscripten_run_js_on_main_thread_done(ctx, ctxArgs, rtn));
        return;
      }
  
      // Proxied functions can return any type except bigint.  All other types
      // coerce to f64/double (the return type of this function in C) but not
      // bigint.
      assert(typeof rtn !== 'bigint');
      return rtn;
    };

  var __emscripten_runtime_keepalive_clear = () => {
      noExitRuntime = false;
      runtimeKeepaliveCounter = 0;
    };

  var __emscripten_thread_cleanup = (thread) => {
      // Called when a thread needs to be cleaned up so it can be reused.
      // A thread is considered reusable when it either returns from its
      // entry point, calls pthread_exit, or acts upon a cancellation.
      // Detached threads are responsible for calling this themselves,
      // otherwise pthread_join is responsible for calling this.
      if (!ENVIRONMENT_IS_PTHREAD) cleanupThread(thread);
      else postMessage({ cmd: 6, thread });
    };


  var __emscripten_thread_set_strongref = (thread) => {
      // Called when a thread needs to be strongly referenced.
      // Currently only used for:
      // - keeping the "main" thread alive in PROXY_TO_PTHREAD mode;
      // - crashed threads that need to propagate the uncaught exception
      //   back to the main thread.
    };

  var INT53_MAX = 9007199254740992;
  
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);
  
  function __gmtime_js(time, tmPtr) {
    time = bigintToI53Checked(time);
  
  
      var date = new Date(time * 1000);
      if (isNaN(date.getTime())) {
        return 1;
      }
      HEAP32[((tmPtr)>>2)] = date.getUTCSeconds();
      HEAP32[(((tmPtr)+(4))>>2)] = date.getUTCMinutes();
      HEAP32[(((tmPtr)+(8))>>2)] = date.getUTCHours();
      HEAP32[(((tmPtr)+(12))>>2)] = date.getUTCDate();
      HEAP32[(((tmPtr)+(16))>>2)] = date.getUTCMonth();
      HEAP32[(((tmPtr)+(20))>>2)] = date.getUTCFullYear()-1900;
      HEAP32[(((tmPtr)+(24))>>2)] = date.getUTCDay();
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = ((date.getTime() - start) / (1000 * 60 * 60 * 24))|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
      return 0;
    ;
  }

  var isLeapYear = (year) => year%4 === 0 && (year%100 !== 0 || year%400 === 0);
  
  var MONTH_DAYS_LEAP_CUMULATIVE = [0,31,60,91,121,152,182,213,244,274,305,335];
  
  var MONTH_DAYS_REGULAR_CUMULATIVE = [0,31,59,90,120,151,181,212,243,273,304,334];
  var ydayFromDate = (date) => {
      var leap = isLeapYear(date.getFullYear());
      var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1; // -1 since it's days since Jan 1
  
      return yday;
    };
  
  
  function __localtime_js(time, tmPtr) {
    time = bigintToI53Checked(time);
  
  
      var date = new Date(time*1000);
      if (isNaN(date.getTime())) {
        return 1;
      }
      HEAP32[((tmPtr)>>2)] = date.getSeconds();
      HEAP32[(((tmPtr)+(4))>>2)] = date.getMinutes();
      HEAP32[(((tmPtr)+(8))>>2)] = date.getHours();
      HEAP32[(((tmPtr)+(12))>>2)] = date.getDate();
      HEAP32[(((tmPtr)+(16))>>2)] = date.getMonth();
      HEAP32[(((tmPtr)+(20))>>2)] = date.getFullYear()-1900;
      HEAP32[(((tmPtr)+(24))>>2)] = date.getDay();
  
      var yday = ydayFromDate(date)|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
      HEAP32[(((tmPtr)+(36))>>2)] = -(date.getTimezoneOffset() * 60);
  
      // Attention: DST is in December in South, and some regions don't have DST at all.
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset))|0;
      HEAP32[(((tmPtr)+(32))>>2)] = dst;
      return 0;
    ;
  }

  
  
  var __mktime_js = function(tmPtr) {
  
  var ret = (() => { 
      var date = new Date(HEAP32[(((tmPtr)+(20))>>2)] + 1900,
                          HEAP32[(((tmPtr)+(16))>>2)],
                          HEAP32[(((tmPtr)+(12))>>2)],
                          HEAP32[(((tmPtr)+(8))>>2)],
                          HEAP32[(((tmPtr)+(4))>>2)],
                          HEAP32[((tmPtr)>>2)],
                          0);
      if (isNaN(date.getTime())) {
        return -1;
      }
  
      // There's an ambiguous hour when the time goes back; the tm_isdst field is
      // used to disambiguate it.  Date() basically guesses, so we fix it up if it
      // guessed wrong, or fill in tm_isdst with the guess if it's -1.
      var dst = HEAP32[(((tmPtr)+(32))>>2)];
      var guessedOffset = date.getTimezoneOffset();
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dstOffset = Math.min(winterOffset, summerOffset); // DST is in December in South
      if (dst < 0) {
        // Attention: some regions don't have DST at all.
        dst = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
      } else if ((dst > 0) != (dstOffset == guessedOffset)) {
        var nonDstOffset = Math.max(winterOffset, summerOffset);
        var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
        // Don't try setMinutes(date.getMinutes() + ...) -- it's messed up.
        date.setTime(date.getTime() + (trueOffset - guessedOffset)*60_000);
        if (isNaN(date.getTime())) {
          return -1;
        }
      }
  
      HEAP32[(((tmPtr)+(32))>>2)] = dst;
      HEAP32[(((tmPtr)+(24))>>2)] = date.getDay();
      var yday = ydayFromDate(date)|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
      // To match expected behavior, update fields from date
      HEAP32[((tmPtr)>>2)] = date.getSeconds();
      HEAP32[(((tmPtr)+(4))>>2)] = date.getMinutes();
      HEAP32[(((tmPtr)+(8))>>2)] = date.getHours();
      HEAP32[(((tmPtr)+(12))>>2)] = date.getDate();
      HEAP32[(((tmPtr)+(16))>>2)] = date.getMonth();
      HEAP32[(((tmPtr)+(20))>>2)] = date.getYear();
  
      // Return time in seconds
      return date.getTime() / 1000;
     })();
  return BigInt(ret);
  };

  
  
  function __msync_js(addr, len, prot, flags, fd, offset) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(3, 0, 1, addr, len, prot, flags, fd, offset);
  
    offset = bigintToI53Checked(offset);
  
  return 0;
  
  }
  

  
  
  
  var __tzset_js = (timezone, daylight, std_name, dst_name) => {
      // TODO: Use (malleable) environment variables instead of system settings.
      var currentYear = new Date().getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
  
      // Local standard timezone offset. Local standard time is not adjusted for
      // daylight savings.  This code uses the fact that getTimezoneOffset returns
      // a greater value during Standard Time versus Daylight Saving Time (DST).
      // Thus it determines the expected output during Standard Time, and it
      // compares whether the output of the given date the same (Standard) or less
      // (DST).
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  
      // timezone is specified as seconds west of UTC ("The external variable
      // `timezone` shall be set to the difference, in seconds, between
      // Coordinated Universal Time (UTC) and local standard time."), the same
      // as returned by stdTimezoneOffset.
      // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
      HEAPU32[((timezone)>>2)] = stdTimezoneOffset * 60;
  
      HEAP32[((daylight)>>2)] = Number(winterOffset != summerOffset);
  
      var extractZone = (timezoneOffset) => {
        // Why inverse sign?
        // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
        var sign = timezoneOffset >= 0 ? '-' : '+';
  
        var absOffset = Math.abs(timezoneOffset)
        var hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
        var minutes = String(absOffset % 60).padStart(2, '0');
  
        return `UTC${sign}${hours}${minutes}`;
      }
  
      var winterName = extractZone(winterOffset);
      var summerName = extractZone(summerOffset);
      assert(winterName);
      assert(summerName);
      assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
      assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
      if (summerOffset < winterOffset) {
        // Northern hemisphere
        stringToUTF8(winterName, std_name, 17);
        stringToUTF8(summerName, dst_name, 17);
      } else {
        stringToUTF8(winterName, dst_name, 17);
        stringToUTF8(summerName, std_name, 17);
      }
    };

  var _applyPendingCanvasResize = (wPtr, hPtr) => {
      if (!Module.applyPendingResize || !Module.applyPendingResize()) return 0;
      HEAP32[wPtr >> 2] = Module.canvas.width;
      HEAP32[hPtr >> 2] = Module.canvas.height;
      return 1;
    };

  var _blur_text_input = () => {
    var c = Module.inputContainer, el = Module.currentInput;
    if (c && el) { c.style.zIndex = -100; el.blur(); }
  };

  var _choose_current_text_input = (typePtr, multiline, secure) => {
    var type = UTF8ToString(typePtr), el;
    if (type == 'text' || type == 'no-suggestions') {
      if (!multiline && !secure) { el = Module.inputElement; el.type = 'text'; } else el = Module.textAreaElement;
      for (var a of ['autocomplete', 'autocorrect', 'spellcheck']) {
        if (type == 'no-suggestions') el.setAttribute(a, a == 'spellcheck' ? 'false' : 'off'); else el.removeAttribute(a);
      }
    } else { el = Module.inputElement; el.type = type; }
    el.style.display = 'block';
    Module.currentInput = el;
  };

  var _emscripten_get_now = () => performance.timeOrigin + performance.now();
  
  var _emscripten_date_now = () => Date.now();
  
  var nowIsMonotonic = 1;
  
  var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
  
  
  function _clock_time_get(clk_id, ignored_precision, ptime) {
    ignored_precision = bigintToI53Checked(ignored_precision);
  
  
      if (!checkWasiClock(clk_id)) {
        return 28;
      }
      var now;
      // all wasi clocks but realtime are monotonic
      if (clk_id === 0) {
        now = _emscripten_date_now();
      } else if (nowIsMonotonic) {
        now = _emscripten_get_now();
      } else {
        return 52;
      }
      // "now" is in ms, and wasi times are in ns.
      var nsec = Math.round(now * 1_000_000);
      HEAP64[((ptime)>>3)] = BigInt(nsec);
      return 0;
    ;
  }

  var _copy_pending_text = (dst) => {
    if (Module.pendingBytes) HEAPU8.set(Module.pendingBytes, dst >>> 0);
  };

  var readEmAsmArgsArray = [];
  
  
  
  
  
  var readEmAsmArgs = (sigPtr, buf) => {
      // Nobody should have mutated _readEmAsmArgsArray underneath us to be something else than an array.
      assert(Array.isArray(readEmAsmArgsArray));
      // The input buffer is allocated on the stack, so it must be stack-aligned.
      assert(buf % 16 == 0);
      readEmAsmArgsArray.length = 0;
      var ch;
      // Most arguments are i32s, so shift the buffer pointer so it is a plain
      // index into HEAP32.
      while (ch = HEAPU8[sigPtr++]) {
        var chr = String.fromCharCode(ch);
        var validChars = ['d', 'f', 'i', 'p'];
        // In WASM_BIGINT mode we support passing i64 values as bigint.
        validChars.push('j');
        assert(validChars.includes(chr), `Invalid character ${ch}("${chr}") in readEmAsmArgs! Use only [${validChars}], and do not specify "v" for void return argument.`);
        // Floats are always passed as doubles, so all types except for 'i'
        // are 8 bytes and require alignment.
        var wide = (ch != 105);
        wide &= (ch != 112);
        buf += wide && (buf % 8) ? 4 : 0;
        readEmAsmArgsArray.push(
          // Special case for pointers under wasm64 or CAN_ADDRESS_2GB mode.
          ch == 112 ? HEAPU32[((buf)>>2)] :
          ch == 106 ? HEAP64[((buf)>>3)] :
          ch == 105 ?
            HEAP32[((buf)>>2)] :
            HEAPF64[((buf)>>3)]
        );
        buf += wide ? 8 : 4;
      }
      return readEmAsmArgsArray;
    };
  
  var runMainThreadEmAsm = (emAsmAddr, sigPtr, argbuf, sync) => {
      var args = readEmAsmArgs(sigPtr, argbuf);
      if (ENVIRONMENT_IS_PTHREAD) {
        // EM_ASM functions are variadic, receiving the actual arguments as a buffer
        // in memory. the last parameter (argBuf) points to that data. We need to
        // always un-variadify that, *before proxying*, as in the async case this
        // is a stack allocation that LLVM made, which may go away before the main
        // thread gets the message. For that reason we handle proxying *after* the
        // call to readEmAsmArgs, and therefore we do that manually here instead
        // of using __proxy. (And for simplicity, do the same in the sync
        // case as well, even though it's not strictly necessary, to keep the two
        // code paths as similar as possible on both sides.)
        return proxyToMainThread(0, emAsmAddr, sync, ...args);
      }
      
      return rbxEmAsm(emAsmAddr)(...args);
    };
  var _emscripten_asm_const_async_on_main_thread = (emAsmAddr, sigPtr, argbuf) => runMainThreadEmAsm(emAsmAddr, sigPtr, argbuf, 0);

  var runEmAsmFunction = (code, sigPtr, argbuf) => {
      var args = readEmAsmArgs(sigPtr, argbuf);
      
      return rbxEmAsm(code)(...args);
    };
  var _emscripten_asm_const_double = (code, sigPtr, argbuf) => {
      return runEmAsmFunction(code, sigPtr, argbuf);
    };

  var _emscripten_asm_const_int = (code, sigPtr, argbuf) => {
      return runEmAsmFunction(code, sigPtr, argbuf);
    };

  var _emscripten_asm_const_int_sync_on_main_thread = (emAsmAddr, sigPtr, argbuf) => runMainThreadEmAsm(emAsmAddr, sigPtr, argbuf, 1);

  
  var runtimeKeepalivePush = () => {
      runtimeKeepaliveCounter += 1;
    };
  
  var runtimeKeepalivePop = () => {
      assert(runtimeKeepaliveCounter > 0);
      runtimeKeepaliveCounter -= 1;
    };
  /** @param {number=} timeout */
  var safeSetTimeout = (func, timeout) => {
      runtimeKeepalivePush();
      var id = safeSetTimeout.nextId++;
      safeSetTimeout.pending.set(id, setTimeout(() => {
        safeSetTimeout.pending.delete(id);
        runtimeKeepalivePop();
        callUserCallback(func);
      }, timeout));
      return id;
    };
  
  
  
  var _emscripten_set_main_loop_timing = (mode, value) => {
      MainLoop.timingMode = mode;
      MainLoop.timingValue = value;
  
      if (!MainLoop.func) {
        err('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      // If there is no existing scheduler then we are transitioning from
      // inactive to active and we add to runtime keepalive counter.
      if (!MainLoop.scheduler) {
        runtimeKeepalivePush();
      }
      if (mode == 0) {
        MainLoop.scheduler = function MainLoop_scheduler_setTimeout() {
          var timeUntilNextTick = Math.max(0, MainLoop.tickStartTime + value - _emscripten_get_now())|0;
          setTimeout(MainLoop.runner, timeUntilNextTick); // doing this each time means that on exception, we stop
        };
      } else if (mode == 1) {
        MainLoop.scheduler = function MainLoop_scheduler_rAF() {
          MainLoop.requestAnimationFrame(MainLoop.runner);
        };
      } else {
        assert(mode == 2);
        if (!MainLoop.setImmediate) {
          if (globalThis.scheduler) {
            // Some modern browsers implement scheduler.postTask, but not all.
            MainLoop.setImmediate = scheduler.postTask.bind(scheduler);
          } else {
            // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
            var setImmediates = [];
            var emscriptenMainLoopMessageId = 'setimmediate';
            /** @param {Event} event */
            var MainLoop_setImmediate_messageHandler = (event) => {
              if (event.data === emscriptenMainLoopMessageId) {
                event.stopPropagation();
                setImmediates.shift()();
              }
            };
            addEventListener('message', MainLoop_setImmediate_messageHandler, true);
            MainLoop.setImmediate = /** @type{function(function(): ?, ...?): number} */((func) => {
              setImmediates.push(func);
              if (ENVIRONMENT_IS_WORKER) {
                // The postMessge API in a Worker, sends message to the main
                // thread and does not support the `targetOrigin` (*) argument.
                postMessage(emscriptenMainLoopMessageId);
              } else {
                postMessage(emscriptenMainLoopMessageId, '*');
              }
            });
          }
        }
        MainLoop.scheduler = function MainLoop_scheduler_setImmediate() {
          MainLoop.setImmediate(MainLoop.runner);
        };
      }
      return 0;
    };
  
  
  
    /**
   * @param {number=} arg
   * @param {boolean=} noSetTiming
   */
  var setMainLoop = (iterFunc, fps, simulateInfiniteLoop, arg, noSetTiming) => {
      assert(!MainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once')
      MainLoop.func = iterFunc;
      MainLoop.arg = arg;
  
      var thisMainLoopId = MainLoop.currentlyRunningMainloop;
      function checkIsRunning() {
        if (thisMainLoopId < MainLoop.currentlyRunningMainloop) {
          maybeExit();
          return false;
        }
        return true;
      }
  
      // We create the loop runner here but it is not actually running until
      // _emscripten_set_main_loop_timing is called (which might happen at a
      // later time).
      MainLoop.runner = function MainLoop_runner() {
        if (ABORT) return;
        if (MainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = MainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (MainLoop.remainingBlockers) {
            var remaining = MainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              MainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              MainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          MainLoop.updateStatus();
  
          // catches pause/resume main loop from blocker execution
          if (!checkIsRunning()) return;
  
          setTimeout(MainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (!checkIsRunning()) return;
  
        // Implement very basic swap interval control
        MainLoop.currentFrameNumber = MainLoop.currentFrameNumber + 1 | 0;
        if (MainLoop.timingMode == 1 && MainLoop.timingValue > 1 && MainLoop.currentFrameNumber % MainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          MainLoop.scheduler();
          return;
        } else if (MainLoop.timingMode == 0) {
          MainLoop.tickStartTime = _emscripten_get_now();
          if (Module['ctx']) {
            warnOnce('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          }
        }
  
        MainLoop.runIter(iterFunc);
  
        // catch pauses from the main loop itself
        if (!checkIsRunning()) return;
  
        MainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps > 0) {
          _emscripten_set_main_loop_timing(0, 1000.0 / fps);
        } else {
          // Do rAF by rendering each frame (no decimating)
          _emscripten_set_main_loop_timing(1, 1);
        }
  
        MainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'unwind';
      }
    };
  
  
  
  var MainLoop = {
  func:null,
  scheduler:null,
  currentlyRunningMainloop:0,
  arg:0,
  timingMode:0,
  timingValue:0,
  currentFrameNumber:0,
  queue:[],
  preMainLoop:[],
  postMainLoop:[],
  pause() {
        if (MainLoop.scheduler) {
          MainLoop.scheduler = null;
          // Incrementing this signals the previous main loop that it's now become old, and it must return.
          MainLoop.currentlyRunningMainloop++;
          runtimeKeepalivePop();
        }
      },
  resume() {
        MainLoop.currentlyRunningMainloop++;
        var timingMode = MainLoop.timingMode;
        var timingValue = MainLoop.timingValue;
        var func = MainLoop.func;
        MainLoop.func = null;
        // do not set timing and call scheduler, we will do it on the next lines
        setMainLoop(func, 0, false, MainLoop.arg, true);
        _emscripten_set_main_loop_timing(timingMode, timingValue);
        MainLoop.scheduler();
      },
  updateStatus() {
        if (Module['setStatus']) {
          var message = Module['statusMessage'] || 'Please wait...';
          var remaining = MainLoop.remainingBlockers ?? 0;
          var expected = MainLoop.expectedBlockers ?? 0;
          if (remaining) {
            if (remaining < expected) {
              Module['setStatus'](`{message} ({expected - remaining}/{expected})`);
            } else {
              Module['setStatus'](message);
            }
          } else {
            Module['setStatus']('');
          }
        }
      },
  init() {
      },
  runIter(func) {
        if (ABORT) return;
        for (var pre of MainLoop.preMainLoop) {
          if (pre() === false) {
            return; // |return false| skips a frame
          }
        }
        callUserCallback(func);
        for (var post of MainLoop.postMainLoop) {
          post();
        }
      },
  nextRAF:0,
  fakeRequestAnimationFrame(func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (!MainLoop.nextRAF) {
          MainLoop.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= MainLoop.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            MainLoop.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(MainLoop.nextRAF - now, 0);
        setTimeout(func, delay);
      },
  requestAnimationFrame(func) {
        if (globalThis.requestAnimationFrame) {
          requestAnimationFrame(func);
        } else {
          MainLoop.fakeRequestAnimationFrame(func);
        }
      },
  };
  
  
  var safeRequestAnimationFrame = (func) => {
      runtimeKeepalivePush();
      return MainLoop.requestAnimationFrame(() => {
        runtimeKeepalivePop();
        callUserCallback(func);
      });
    };
  
  var _emscripten_async_call = (func, arg, millis) => {
      var wrapper = () => getWasmTableEntry(func)(arg);
  
      if (millis >= 0
      ) {
        safeSetTimeout(wrapper, millis);
      } else {
        safeRequestAnimationFrame(wrapper);
      }
    };

  
  var _emscripten_check_blocking_allowed = () => {
  
      if (ENVIRONMENT_IS_WORKER) return; // Blocking in a worker/pthread is fine.
  
      warnOnce('Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread');
  
    };

  var _emscripten_console_error = (str) => { console.error(UTF8ToString(str)) };

  var _emscripten_console_log = (str) => { console.log(UTF8ToString(str)) };

  var _emscripten_console_warn = (str) => { console.warn(UTF8ToString(str)) };


  var _emscripten_errn = (str, len) => err(UTF8ToString(str, len));

  
  var onExits = [];
  var addOnExit = (cb) => onExits.push(cb);
  var JSEvents = {
  removeAllEventListeners() {
        while (JSEvents.eventHandlers.length) {
          JSEvents._removeHandler(JSEvents.eventHandlers.length - 1);
        }
        JSEvents.deferredCalls = [];
      },
  inEventHandler:0,
  deferredCalls:[],
  deferCall(targetFunction, precedence, argsList) {
        function arraysHaveEqualContent(arrA, arrB) {
          if (arrA.length != arrB.length) return false;
  
          for (var i = 0; i < arrA.length; i++) {
            if (arrA[i] != arrB[i]) return false;
          }
          return true;
        }
        // Test if the given call was already queued, and if so, don't add it again.
        for (var call of JSEvents.deferredCalls) {
          if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
            return;
          }
        }
        JSEvents.deferredCalls.push({
          targetFunction,
          precedence,
          argsList
        });
  
        JSEvents.deferredCalls.sort((x,y) => x.precedence - y.precedence);
      },
  removeDeferredCalls(targetFunction) {
        JSEvents.deferredCalls = JSEvents.deferredCalls.filter((call) => call.targetFunction != targetFunction);
      },
  canPerformEventHandlerRequests() {
        // Browsers that support navigator.userActivation.isActive: https://developer.mozilla.org/en-US/docs/Web/API/UserActivation/isActive
        if (navigator.userActivation) {
          // Verify against transient activation status from UserActivation API
          // whether it is possible to perform a request here without needing to defer. See
          // https://developer.mozilla.org/en-US/docs/Web/Security/User_activation#transient_activation
          // and https://caniuse.com/mdn-api_useractivation
          return navigator.userActivation.isActive;
        }
  
        return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls;
      },
  runDeferredCalls() {
        if (!JSEvents.canPerformEventHandlerRequests()) {
          return;
        }
        var deferredCalls = JSEvents.deferredCalls;
        JSEvents.deferredCalls = [];
        for (var call of deferredCalls) {
          call.targetFunction(...call.argsList);
        }
      },
  eventHandlers:[],
  removeAllHandlersOnTarget:(target, eventTypeString) => {
        for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
          if (JSEvents.eventHandlers[i].target == target &&
            (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
             JSEvents._removeHandler(i--);
           }
        }
      },
  _removeHandler(i) {
        var h = JSEvents.eventHandlers[i];
        h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
        JSEvents.eventHandlers.splice(i, 1);
      },
  registerOrRemoveHandler(eventHandler) {
        if (!eventHandler.target) {
          err('registerOrRemoveHandler: the target element for event handler registration does not exist, when processing the following event handler registration:');
          console.dir(eventHandler);
          return -4;
        }
        if (eventHandler.callbackfunc) {
          eventHandler.eventListenerFunc = function(event) {
            // Increment nesting count for the event handler.
            ++JSEvents.inEventHandler;
            JSEvents.currentEventHandler = eventHandler;
            // Process any old deferred calls the user has placed.
            JSEvents.runDeferredCalls();
            // Process the actual event, calls back to user C code handler.
            eventHandler.handlerFunc(event);
            // Process any new deferred calls that were placed right now from this event handler.
            JSEvents.runDeferredCalls();
            // Out of event handler - restore nesting count.
            --JSEvents.inEventHandler;
          };
  
          eventHandler.target.addEventListener(eventHandler.eventTypeString,
                                               eventHandler.eventListenerFunc,
                                               eventHandler.useCapture);
          JSEvents.eventHandlers.push(eventHandler);
        } else {
          for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
            if (JSEvents.eventHandlers[i].target == eventHandler.target
             && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
               JSEvents._removeHandler(i--);
             }
          }
        }
        return 0;
      },
  removeSingleHandler(eventHandler) {
        let success = false;
        for (let i = 0; i < JSEvents.eventHandlers.length; ++i) {
          const handler = JSEvents.eventHandlers[i];
          if (handler.target === eventHandler.target
            && handler.eventTypeId === eventHandler.eventTypeId
            && handler.callbackfunc === eventHandler.callbackfunc
            && handler.userData === eventHandler.userData) {
            // in some very rare cases (ex: Safari / fullscreen events), there is more than 1 handler (eventTypeString is different)
            JSEvents._removeHandler(i--);
            success = true;
          }
        }
        return success ? 0 : -5;
      },
  getTargetThreadForEventCallback(targetThread) {
        switch (targetThread) {
          case 1:
            // The event callback for the current event should be called on the
            // main browser thread. (0 == don't proxy)
            return 0;
          case 2:
            // The event callback for the current event should be backproxied to
            // the thread that is registering the event.
            // This can be 0 in the case that the caller uses
            // EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD but on the main thread
            // itself.
            return PThread.currentProxiedOperationCallerThread;
          default:
            // The event callback for the current event should be proxied to the
            // given specific thread.
            return targetThread;
        }
      },
  getNodeNameForTarget(target) {
        if (target == window) return '#window';
        if (target == screen) return '#screen';
        return target?.nodeName ?? '';
      },
  fullscreenEnabled() {
        return document.fullscreenEnabled
        // Safari 13.0.3 on macOS Catalina 10.15.1 still ships with prefixed webkitFullscreenEnabled.
        // TODO: If Safari at some point ships with unprefixed version, update the version check above.
        ?? document.webkitFullscreenEnabled
         ;
      },
  };
  
  var requestPointerLock = (target) => {
      if (target.requestPointerLock) {
        target.requestPointerLock();
      } else {
        // document.body is known to accept pointer lock, so use that to differentiate if the user passed a bad element,
        // or if the whole browser just doesn't support the feature.
        if (document.body.requestPointerLock) {
          return -3;
        }
        return -1;
      }
      return 0;
    };
  
  
  function _emscripten_exit_pointerlock() {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(4, 0, 1);
  
      // Make sure no queued up calls will fire after this.
      JSEvents.removeDeferredCalls(requestPointerLock);
      if (!document.exitPointerLock) return -1;
      document.exitPointerLock();
      return 0;
    
  }
  

  var _emscripten_exit_with_live_runtime = () => {
      runtimeKeepalivePush();
      throw 'unwind';
    };

  function _emscripten_fetch_free(id) {
    if (Fetch.xhrs.has(id)) {
      var xhr = Fetch.xhrs.get(id);
      Fetch.xhrs.free(id);
      // check if fetch is still in progress and should be aborted
      if (xhr.readyState > 0 && xhr.readyState < 4) {
        xhr.abort();
      }
    }
  }

  var maybeCStringToJsString = (cString) => {
      // 'cString > 2' checks if the input is a number, and isn't of the special
      // values we accept here, EMSCRIPTEN_EVENT_TARGET_* (which map to 0, 1, 2).
      // In other words, if cString > 2 then it's a pointer to a valid place in
      // memory, and points to a C string.
      return cString > 2 ? UTF8ToString(cString) : cString;
    };
  
  /** @type {Object} */
  var specialHTMLTargets = [0, globalThis.document ?? 0, globalThis.window ?? 0];
  var findEventTarget = (target) => {
      target = maybeCStringToJsString(target);
      var domElement = specialHTMLTargets[target] || globalThis.document?.querySelector(target);
      return domElement;
    };
  var findCanvasEventTarget = findEventTarget;
  
  var getCanvasSizeCallingThread = (target, width, height) => {
      var canvas = findCanvasEventTarget(target);
      if (!canvas) return -4;
  
      if (!canvas.controlTransferredOffscreen) {
        HEAP32[((width)>>2)] = canvas.width;
        HEAP32[((height)>>2)] = canvas.height;
      } else {
        return -4;
      }
      return 0;
    };
  
  
  
  function getCanvasSizeMainThread(target, width, height) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(5, 0, 1, target, width, height);
  return getCanvasSizeCallingThread(target, width, height)
  }
  
  
  var _emscripten_get_canvas_element_size = (target, width, height) => {
      var canvas = findCanvasEventTarget(target);
      if (canvas) {
        return getCanvasSizeCallingThread(target, width, height);
      }
      return getCanvasSizeMainThread(target, width, height);
    };

  
  function _emscripten_get_device_pixel_ratio() {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(6, 0, 1);
  
      return devicePixelRatio;
    
  }
  

  
  var getBoundingClientRect = (e) => specialHTMLTargets.indexOf(e) < 0 ? e.getBoundingClientRect() : {'left':0,'top':0};
  
  
  
  function _emscripten_get_element_css_size(target, width, height) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(7, 0, 1, target, width, height);
  
      target = findEventTarget(target);
      if (!target) return -4;
  
      var rect = getBoundingClientRect(target);
      HEAPF64[((width)>>3)] = rect.width;
      HEAPF64[((height)>>3)] = rect.height;
  
      return 0;
    
  }
  

  
  
  
  
  var fillGamepadEventData = (eventStruct, e) => {
      HEAPF64[((eventStruct)>>3)] = e.timestamp;
      for (var i = 0; i < e.axes.length; ++i) {
        HEAPF64[(((eventStruct+i*8)+(16))>>3)] = e.axes[i];
      }
      for (var i = 0; i < e.buttons.length; ++i) {
        HEAP8[(eventStruct+i)+(1040)] = e.buttons[i].pressed;
        HEAPF64[(((eventStruct+i*8)+(528))>>3)] = e.buttons[i].value;
      }
      HEAP8[(eventStruct)+(1104)] = e.connected;
      HEAP32[(((eventStruct)+(1108))>>2)] = e.index;
      HEAP32[(((eventStruct)+(8))>>2)] = e.axes.length;
      HEAP32[(((eventStruct)+(12))>>2)] = e.buttons.length;
      stringToUTF8(e.id, eventStruct + 1112, 64);
      stringToUTF8(e.mapping, eventStruct + 1176, 64);
    };
  
  
  function _emscripten_get_gamepad_status(index, gamepadState) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(8, 0, 1, index, gamepadState);
  
      assert(JSEvents.lastGamepadState, 'emscripten_get_gamepad_status() called before emscripten_sample_gamepad_data()');
      // INVALID_PARAM is returned on a Gamepad index that never was there.
      if (index < 0 || index >= JSEvents.lastGamepadState.length) return -5;
  
      // NO_DATA is returned on a Gamepad index that was removed.
      // For previously disconnected gamepads there should be an empty slot (null/undefined/false) at the index.
      // This is because gamepads must keep their original position in the array.
      // For example, removing the first of two gamepads produces [null/undefined/false, gamepad].
      if (!JSEvents.lastGamepadState[index]) return -7;
  
      fillGamepadEventData(gamepadState, JSEvents.lastGamepadState[index]);
      return 0;
    
  }
  

  var getHeapMax = () =>
      HEAPU8.length;
  var _emscripten_get_heap_max = () => getHeapMax();


  
  
  function _emscripten_get_num_gamepads() {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(9, 0, 1);
  
      assert(JSEvents.lastGamepadState, 'emscripten_get_num_gamepads() called before emscripten_sample_gamepad_data()');
      // N.B. Do not call emscripten_get_num_gamepads() unless having first called emscripten_sample_gamepad_data(), and that has returned EMSCRIPTEN_RESULT_SUCCESS.
      // Otherwise the following line will throw an exception.
      return JSEvents.lastGamepadState.length;
    
  }
  

  var _emscripten_num_logical_cores = () =>
      navigator['hardwareConcurrency'];

  var _emscripten_outn = (str, len) => out(UTF8ToString(str, len));

  var UNWIND_CACHE = {
  };
  
  
  
  
  var stringToNewUTF8 = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = _malloc(size);
      if (ret) stringToUTF8(str, ret, size);
      return ret;
    };
  
  /** @returns {number} */
  var convertFrameToPC = (frame) => {
      var match;
  
      if (match = /\bwasm-function\[\d+\]:(0x[0-9a-f]+)/.exec(frame)) {
        // Wasm engines give the binary offset directly, so we use that as return address
        return +match[1];
      } else if (match = /\bwasm-function\[(\d+)\]:(\d+)/.exec(frame)) {
        // Older versions of v8 (e.g node v10) give function index and offset in
        // the function.  That format is not supported since it does not provide
        // the information we need to map the frame to a global program counter.
        warnOnce('legacy backtrace format detected, this version of v8 is no longer supported by the emscripten backtrace mechanism')
      } else if (match = /:(\d+):\d+(?:\)|$)/.exec(frame)) {
        // If we are in js, we can use the js line number as the "return address".
        // This should work for wasm2js.  We tag the high bit to distinguish this
        // from wasm addresses.
        return 0x80000000 | +match[1];
      }
      // return 0 if we can't find any
      return 0;
    };
  
  
  
  var saveInUnwindCache = (callstack) => {
      for (var line of callstack) {
        var pc = convertFrameToPC(line);
        if (pc) {
          UNWIND_CACHE[pc] = line;
        }
      }
    };
  
  var _emscripten_stack_snapshot = () => {
      var callstack = jsStackTrace().split('\n');
      if (callstack[0] == 'Error') {
        callstack.shift();
      }
      saveInUnwindCache(callstack);
  
      // Caches the stack snapshot so that emscripten_stack_unwind_buffer() can
      // unwind from this spot.
      UNWIND_CACHE.last_addr = convertFrameToPC(callstack[3]);
      UNWIND_CACHE.last_stack = callstack;
      return UNWIND_CACHE.last_addr;
    };
  var _emscripten_pc_get_function = (pc) => {
      var frame = UNWIND_CACHE[pc];
      if (!frame) return 0;
  
      var name;
      var match;
      // First try to match foo.wasm.sym files explcitly. e.g.
      //
      //   at test_return_address.wasm.main (wasm://wasm/test_return_address.wasm-0012cc2a:wasm-function[26]:0x9f3
      //
      // Then match JS symbols which don't include that module name:
      //
      //   at invokeEntryPoint (.../test_return_address.js:1500:42)
      //
      // Finally match firefox format:
      //
      //   Object._main@http://server.com:4324:12'
      if (match = /^\s+at .*\.wasm\.(.*) \(.*\)$/.exec(frame)) {
        name = match[1];
      } else if (match = /^\s+at (.*) \(.*\)$/.exec(frame)) {
        name = match[1];
      } else if (match = /^(.+?)@/.exec(frame)) {
        name = match[1];
      } else {
        return 0;
      }
  
      _free(_emscripten_pc_get_function.ret ?? 0);
      _emscripten_pc_get_function.ret = stringToNewUTF8(name);
      return _emscripten_pc_get_function.ret;
    };

  
  
  
  
  function _emscripten_request_pointerlock(target, deferUntilInEventHandler) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(10, 0, 1, target, deferUntilInEventHandler);
  
      target = findEventTarget(target);
      if (!target) return -4;
      if (!target.requestPointerLock) {
        return -1;
      }
  
      // Queue this function call if we're not currently in an event handler and
      // the user saw it appropriate to do so.
      if (!JSEvents.canPerformEventHandlerRequests()) {
        if (deferUntilInEventHandler) {
          JSEvents.deferCall(requestPointerLock, 2 /* priority below fullscreen */, [target]);
          return 1;
        }
        return -2;
      }
  
      return requestPointerLock(target);
    
  }
  

  var abortOnCannotGrowMemory = (requestedSize) => {
      abort(`Cannot enlarge memory arrays to size ${requestedSize} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${HEAP8.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);
    };
  
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      abortOnCannotGrowMemory(requestedSize);
    };

  var _emscripten_runtime_keepalive_push = runtimeKeepalivePush;

  
  /** @suppress {checkTypes} */
  
  function _emscripten_sample_gamepad_data() {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(11, 0, 1);
  
      try {
        if (navigator.getGamepads) return (JSEvents.lastGamepadState = navigator.getGamepads())
          ? 0 : -1;
      } catch(e) {
        err(`navigator.getGamepads() exists, but failed to execute with exception ${e}. Disabling Gamepad access.`);
        navigator.getGamepads = null; // Disable getGamepads() so that it won't be attempted to be used again.
      }
      return -1;
    
  }
  

  
  
  
  
  var registerFocusEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
      const eventSize = 256;
      JSEvents.focusEvent ||= _malloc(eventSize);
  
      var focusEventHandlerFunc = (e) => {
        var nodeName = JSEvents.getNodeNameForTarget(e.target);
        var id = e.target.id ?? '';
  
        var focusEvent = JSEvents.focusEvent;
        stringToUTF8(nodeName, focusEvent + 0, 128);
        stringToUTF8(id, focusEvent + 128, 128);
  
        if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, focusEvent, eventSize, userData);
        else
        if (getWasmTableEntry(callbackfunc)(eventTypeId, focusEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target: findEventTarget(target),
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: focusEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  
  
  function _emscripten_set_blur_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(12, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerFocusEventCallback(target, userData, useCapture, callbackfunc, 12, 'blur', targetThread)
  }
  

  var setCanvasElementSizeCallingThread = (target, width, height) => {
      var canvas = findCanvasEventTarget(target);
      if (!canvas) return -4;
  
      if (!canvas.controlTransferredOffscreen) {
        var autoResizeViewport = false;
        if (canvas.GLctxObject?.GLctx) {
          var prevViewport = canvas.GLctxObject.GLctx.getParameter(0xBA2 /* GL_VIEWPORT */);
          // TODO: Perhaps autoResizeViewport should only be true if FBO 0 is currently active?
          autoResizeViewport = (!prevViewport[0] && !prevViewport[1] && prevViewport[2] === canvas.width && prevViewport[3] === canvas.height);
        }
        canvas.width = width;
        canvas.height = height;
        if (autoResizeViewport) {
          // TODO: Add -sCANVAS_RESIZE_SETS_GL_VIEWPORT=0/1 option (default=1). This is commonly done and several graphics engines depend on this,
          // but this can be quite disruptive.
          canvas.GLctxObject.GLctx.viewport(0, 0, width, height);
        }
      } else {
        return -4;
      }
      return 0;
    };
  
  
  
  function setCanvasElementSizeMainThread(target, width, height) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(13, 0, 1, target, width, height);
  return setCanvasElementSizeCallingThread(target, width, height)
  }
  
  
  var _emscripten_set_canvas_element_size = (target, width, height) => {
      var canvas = findCanvasEventTarget(target);
      if (canvas) {
        return setCanvasElementSizeCallingThread(target, width, height);
      }
      return setCanvasElementSizeMainThread(target, width, height);
    };

  
  
  function _emscripten_set_focus_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(14, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerFocusEventCallback(target, userData, useCapture, callbackfunc, 13, 'focus', targetThread)
  }
  

  
  
  
  
  var registerGamepadEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
      const eventSize = 1240;
      JSEvents.gamepadEvent ||= _malloc(eventSize);
  
      var gamepadEventHandlerFunc = (e) => {
        var gamepadEvent = JSEvents.gamepadEvent;
        fillGamepadEventData(gamepadEvent, e['gamepad']);
  
        if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, gamepadEvent, eventSize, userData);
        else
        if (getWasmTableEntry(callbackfunc)(eventTypeId, gamepadEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target: findEventTarget(target),
        allowsDeferredCalls: true,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: gamepadEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  
  
  
  function _emscripten_set_gamepadconnected_callback_on_thread(userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(15, 0, 1, userData, useCapture, callbackfunc, targetThread);
  
      if (_emscripten_sample_gamepad_data()) return -1;
      return registerGamepadEventCallback(2, userData, useCapture, callbackfunc, 26, 'gamepadconnected', targetThread);
    
  }
  

  
  
  
  function _emscripten_set_gamepaddisconnected_callback_on_thread(userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(16, 0, 1, userData, useCapture, callbackfunc, targetThread);
  
      if (_emscripten_sample_gamepad_data()) return -1;
      return registerGamepadEventCallback(2, userData, useCapture, callbackfunc, 27, 'gamepaddisconnected', targetThread);
    
  }
  

  
  
  
  
  
  
  
  var registerKeyEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
      const eventSize = 160;
      JSEvents.keyEvent ||= _malloc(eventSize);
  
      var keyEventHandlerFunc = (e) => {
        assert(e);
  
        var keyEventData = JSEvents.keyEvent;
        HEAPF64[((keyEventData)>>3)] = e.timeStamp;
  
        var idx = ((keyEventData)>>2);
  
        HEAP32[idx + 2] = e.location;
        HEAP8[keyEventData + 12] = e.ctrlKey;
        HEAP8[keyEventData + 13] = e.shiftKey;
        HEAP8[keyEventData + 14] = e.altKey;
        HEAP8[keyEventData + 15] = e.metaKey;
        HEAP8[keyEventData + 16] = e.repeat;
        HEAP32[idx + 5] = e.charCode;
        HEAP32[idx + 6] = e.keyCode;
        HEAP32[idx + 7] = e.which;
        stringToUTF8(e.key ?? '', keyEventData + 32, 32);
        stringToUTF8(e.code ?? '', keyEventData + 64, 32);
        stringToUTF8(e.char ?? '', keyEventData + 96, 32);
        stringToUTF8(e.locale ?? '', keyEventData + 128, 32);
  
        if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, keyEventData, eventSize, userData);
        else
        if (getWasmTableEntry(callbackfunc)(eventTypeId, keyEventData, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target: findEventTarget(target),
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: keyEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  
  
  function _emscripten_set_keydown_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(17, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerKeyEventCallback(target, userData, useCapture, callbackfunc, 2, 'keydown', targetThread)
  }
  

  
  
  function _emscripten_set_keyup_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(18, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerKeyEventCallback(target, userData, useCapture, callbackfunc, 3, 'keyup', targetThread)
  }
  

  
  
  
  
  
  var fillMouseEventData = (eventStruct, e, target) => {
      assert(eventStruct % 4 == 0);
      HEAPF64[((eventStruct)>>3)] = e.timeStamp;
      var idx = ((eventStruct)>>2);
      HEAP32[idx + 2] = e.screenX;
      HEAP32[idx + 3] = e.screenY;
      HEAP32[idx + 4] = e.clientX;
      HEAP32[idx + 5] = e.clientY;
      HEAP8[eventStruct + 24] = e.ctrlKey;
      HEAP8[eventStruct + 25] = e.shiftKey;
      HEAP8[eventStruct + 26] = e.altKey;
      HEAP8[eventStruct + 27] = e.metaKey;
      HEAP16[idx*2 + 14] = e.button;
      HEAP16[idx*2 + 15] = e.buttons;
      HEAP32[idx + 8] = e.movementX;
      HEAP32[idx + 9] = e.movementY;
  
      // Note: rect contains doubles (truncated to placate SAFE_HEAP, which is the same behaviour when writing to HEAP32 anyway)
      var rect = getBoundingClientRect(target);
      HEAP32[idx + 10] = e.clientX - (rect.left | 0);
      HEAP32[idx + 11] = e.clientY - (rect.top  | 0);
    };
  
  
  
  var registerMouseEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
      const eventSize = 64;
      JSEvents.mouseEvent ||= _malloc(eventSize);
      target = findEventTarget(target);
  
      var mouseEventHandlerFunc = (e) => {
        // TODO: Make this access thread safe, or this could update live while app is reading it.
        fillMouseEventData(JSEvents.mouseEvent, e, target);
  
        if (targetThread) {
          __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, JSEvents.mouseEvent, eventSize, userData);
        } else
        if (getWasmTableEntry(callbackfunc)(eventTypeId, JSEvents.mouseEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target,
        allowsDeferredCalls: eventTypeString != 'mousemove' && eventTypeString != 'mouseenter' && eventTypeString != 'mouseleave', // Mouse move events do not allow fullscreen/pointer lock requests to be handled in them!
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: mouseEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  
  
  function _emscripten_set_mousedown_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(19, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerMouseEventCallback(target, userData, useCapture, callbackfunc, 5, 'mousedown', targetThread)
  }
  

  
  
  function _emscripten_set_mouseenter_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(20, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerMouseEventCallback(target, userData, useCapture, callbackfunc, 33, 'mouseenter', targetThread)
  }
  

  
  
  function _emscripten_set_mouseleave_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(21, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerMouseEventCallback(target, userData, useCapture, callbackfunc, 34, 'mouseleave', targetThread)
  }
  

  
  
  function _emscripten_set_mousemove_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(22, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerMouseEventCallback(target, userData, useCapture, callbackfunc, 8, 'mousemove', targetThread)
  }
  

  
  
  function _emscripten_set_mouseup_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(23, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerMouseEventCallback(target, userData, useCapture, callbackfunc, 6, 'mouseup', targetThread)
  }
  

  
  var registerPointerlockErrorEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  
      var pointerlockErrorEventHandlerFunc = (e) => {
        if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, 0, 0, userData);
        else
        if (getWasmTableEntry(callbackfunc)(eventTypeId, 0, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: pointerlockErrorEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  
  
  
  function _emscripten_set_pointerlockerror_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(24, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  
      if (!document.body?.requestPointerLock) {
        return -1;
      }
  
      target = findEventTarget(target);
  
      if (!target) return -4;
      return registerPointerlockErrorEventCallback(target, userData, useCapture, callbackfunc, 38, 'pointerlockerror', targetThread);
    
  }
  

  
  
  
  
  
  
  
  var registerTouchEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
      const eventSize = 1552;
      JSEvents.touchEvent ||= _malloc(eventSize);
  
      target = findEventTarget(target);
  
      var touchEventHandlerFunc = (e) => {
        assert(e);
        var t, touches = {}, et = e.touches;
        // To ease marshalling different kinds of touches that browser reports (all touches are listed in e.touches,
        // only changed touches in e.changedTouches, and touches on target at a.targetTouches), mark a boolean in
        // each Touch object so that we can later loop only once over all touches we see to marshall over to Wasm.
  
        for (let t of et) {
          // Browser might recycle the generated Touch objects between each frame (Firefox on Android), so reset any
          // changed/target states we may have set from previous frame.
          t.isChanged = t.onTarget = 0;
          touches[t.identifier] = t;
        }
        // Mark which touches are part of the changedTouches list.
        for (let t of e.changedTouches) {
          t.isChanged = 1;
          touches[t.identifier] = t;
        }
        // Mark which touches are part of the targetTouches list.
        for (let t of e.targetTouches) {
          touches[t.identifier].onTarget = 1;
        }
  
        var touchEvent = JSEvents.touchEvent;
        HEAPF64[((touchEvent)>>3)] = e.timeStamp;
        HEAP8[touchEvent + 12] = e.ctrlKey;
        HEAP8[touchEvent + 13] = e.shiftKey;
        HEAP8[touchEvent + 14] = e.altKey;
        HEAP8[touchEvent + 15] = e.metaKey;
        var idx = touchEvent + 16;
        var targetRect = getBoundingClientRect(target);
        var numTouches = 0;
        for (let t of Object.values(touches)) {
          var idx32 = ((idx)>>2); // Pre-shift the ptr to index to HEAP32 to save code size
          HEAP32[idx32 + 0] = t.identifier;
          HEAP32[idx32 + 1] = t.screenX;
          HEAP32[idx32 + 2] = t.screenY;
          HEAP32[idx32 + 3] = t.clientX;
          HEAP32[idx32 + 4] = t.clientY;
          HEAP32[idx32 + 5] = t.pageX;
          HEAP32[idx32 + 6] = t.pageY;
          HEAP8[idx + 28] = t.isChanged;
          HEAP8[idx + 29] = t.onTarget;
          HEAP32[idx32 + 8] = t.clientX - (targetRect.left | 0);
          HEAP32[idx32 + 9] = t.clientY - (targetRect.top  | 0);
  
          idx += 48;
  
          if (++numTouches > 31) {
            break;
          }
        }
        HEAP32[(((touchEvent)+(8))>>2)] = numTouches;
  
        if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, touchEvent, eventSize, userData);
        else
        if (getWasmTableEntry(callbackfunc)(eventTypeId, touchEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target,
        allowsDeferredCalls: eventTypeString == 'touchstart' || eventTypeString == 'touchend',
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: touchEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  
  
  function _emscripten_set_touchcancel_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(25, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerTouchEventCallback(target, userData, useCapture, callbackfunc, 25, 'touchcancel', targetThread)
  }
  

  
  
  function _emscripten_set_touchend_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(26, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerTouchEventCallback(target, userData, useCapture, callbackfunc, 23, 'touchend', targetThread)
  }
  

  
  
  function _emscripten_set_touchmove_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(27, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerTouchEventCallback(target, userData, useCapture, callbackfunc, 24, 'touchmove', targetThread)
  }
  

  
  
  function _emscripten_set_touchstart_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(28, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerTouchEventCallback(target, userData, useCapture, callbackfunc, 22, 'touchstart', targetThread)
  }
  

  
  
  
  
  
  var registerWheelEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
      const eventSize = 96;
      JSEvents.wheelEvent ||= _malloc(eventSize)
  
      // The DOM Level 3 events spec event 'wheel'
      var wheelHandlerFunc = (e) => {
        var wheelEvent = JSEvents.wheelEvent;
        fillMouseEventData(wheelEvent, e, target);
        HEAPF64[(((wheelEvent)+(64))>>3)] = e["deltaX"];
        HEAPF64[(((wheelEvent)+(72))>>3)] = e["deltaY"];
        HEAPF64[(((wheelEvent)+(80))>>3)] = e["deltaZ"];
        HEAP32[(((wheelEvent)+(88))>>2)] = e["deltaMode"];
        if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, wheelEvent, eventSize, userData);
        else
        if (getWasmTableEntry(callbackfunc)(eventTypeId, wheelEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target,
        allowsDeferredCalls: true,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: wheelHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  
  
  
  function _emscripten_set_wheel_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(29, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  
      target = findEventTarget(target);
      if (!target) return -4;
      if (typeof target.onwheel !== 'undefined') {
        return registerWheelEventCallback(target, userData, useCapture, callbackfunc, 9, 'wheel', targetThread);
      } else {
        return -1;
      }
    
  }
  


  
  
  
  
  var _emscripten_stack_unwind_buffer = (addr, buffer, count) => {
      var stack;
      if (UNWIND_CACHE.last_addr == addr) {
        stack = UNWIND_CACHE.last_stack;
      } else {
        stack = jsStackTrace().split('\n');
        if (stack[0] == 'Error') {
          stack.shift();
        }
        saveInUnwindCache(stack);
      }
  
      var offset = 3;
      while (stack[offset] && convertFrameToPC(stack[offset]) != addr) {
        ++offset;
      }
  
      for (var i = 0; i < count && stack[i+offset]; ++i) {
        HEAPU32[(((buffer)+(i*4))>>2)] = convertFrameToPC(stack[i + offset]);
      }
      return i;
    };

  
  
  class HandleAllocator {
      allocated = [undefined];
      freelist = [];
      get(id) {
        assert(this.allocated[id] !== undefined, `invalid handle: ${id}`);
        return this.allocated[id];
      }
      has(id) {
        return this.allocated[id] !== undefined;
      }
      allocate(handle) {
        var id = this.freelist.pop() ?? this.allocated.length;
        this.allocated[id] = handle;
        return id;
      }
      free(id) {
        assert(this.allocated[id] !== undefined);
        // Set the slot to `undefined` rather than using `delete` here since
        // apparently arrays with holes in them can be less efficient.
        this.allocated[id] = undefined;
        this.freelist.push(id);
      }
    }
  
  var dependenciesPromise = null;
  var resolveRunDependencies = async () => dependenciesPromise;
  var runDependencies = 0;
  
  
  var dependenciesPromiseResolve = null;
  
  var runDependencyTracking = {
  };
  
  var runDependencyWatcher = null;
  var removeRunDependency = (id) => {
      runDependencies--;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'removeRunDependency requires an ID');
      assert(runDependencyTracking[id]);
      delete runDependencyTracking[id];
      if (!runDependencies) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        dependenciesPromiseResolve();
      }
    };
  
  
  
  
  var addRunDependency = (id) => {
      if (!runDependencies) {
        dependenciesPromise = new Promise((resolve) => dependenciesPromiseResolve = resolve);
      }
      runDependencies++;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'addRunDependency requires an ID')
      assert(!runDependencyTracking[id]);
      runDependencyTracking[id] = 1;
      if (!runDependencyWatcher && globalThis.setInterval) {
        // Check for missing dependencies every few seconds
        runDependencyWatcher = setInterval(() => {
          if (ABORT) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
            return;
          }
          var shown = false;
          for (var dep in runDependencyTracking) {
            if (!shown) {
              shown = true;
              err('still waiting on run dependencies:');
            }
            err(`dependency: ${dep}`);
          }
          if (shown) {
            err('(end of list)');
          }
        }, 10_000);
      }
    };
  
  var Fetch = {
  async openDatabase(dbname, dbversion) {
      return new Promise((resolve, reject) => {
        try {
          var openRequest = indexedDB.open(dbname, dbversion);
        } catch (e) {
          return reject(e);
        }
  
        openRequest.onupgradeneeded = (event) => {
          var db = /** @type {IDBDatabase} */ (event.target.result);
          if (db.objectStoreNames.contains('FILES')) {
            db.deleteObjectStore('FILES');
          }
          db.createObjectStore('FILES');
        };
        openRequest.onsuccess = (event) => resolve(event.target.result);
        openRequest.onerror = reject;
      });
    },
  async init() {
      Fetch.xhrs = new HandleAllocator();
      if (ENVIRONMENT_IS_PTHREAD) return;
  
      addRunDependency('library_fetch_init');
      try {
        var db = await Fetch.openDatabase('emscripten_filesystem', 1);
        Fetch.dbInstance = db;
      } catch (e) {
        Fetch.dbInstance = false;
      } finally {
        removeRunDependency('library_fetch_init');
      }
    },
  };
  
  
  
  
  
  function fetchXHR(fetch, onsuccess, onerror, onprogress, onreadystatechange) {
    var url = HEAPU32[(((fetch)+(8))>>2)];
    if (!url) {
      onerror(fetch, 'no url specified!');
      return;
    }
    var url_ = UTF8ToString(url);
  
    var fetch_attr = fetch + 108;
    var requestMethod = UTF8ToString(fetch_attr + 0);
    requestMethod ||= 'GET';
    var timeoutMsecs = HEAPU32[(((fetch_attr)+(56))>>2)];
    var userName = HEAPU32[(((fetch_attr)+(68))>>2)];
    var password = HEAPU32[(((fetch_attr)+(72))>>2)];
    var requestHeaders = HEAPU32[(((fetch_attr)+(76))>>2)];
    var overriddenMimeType = HEAPU32[(((fetch_attr)+(80))>>2)];
    var dataPtr = HEAPU32[(((fetch_attr)+(84))>>2)];
    var dataLength = HEAPU32[(((fetch_attr)+(88))>>2)];
  
    var fetchAttributes = HEAPU32[(((fetch_attr)+(52))>>2)];
    var fetchAttrLoadToMemory = !!(fetchAttributes & 1);
    var fetchAttrStreamData = !!(fetchAttributes & 2);
    var fetchAttrSynchronous = !!(fetchAttributes & 64);
  
    var userNameStr = userName ? UTF8ToString(userName) : undefined;
    var passwordStr = password ? UTF8ToString(password) : undefined;
  
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = !!HEAPU8[(fetch_attr)+(60)];;
    xhr._streamData = fetchAttrStreamData;
    xhr.open(requestMethod, url_, !fetchAttrSynchronous, userNameStr, passwordStr);
    if (!fetchAttrSynchronous) xhr.timeout = timeoutMsecs; // XHR timeout field is only accessible in async XHRs, and must be set after .open() but before .send().
    xhr.url_ = url_; // Save the url for debugging purposes (and for comparing to the responseURL that server side advertised)
    assert(!fetchAttrStreamData, 'streaming is only supported when FETCH_STREAMING is enabled');
    xhr.responseType = 'arraybuffer';
  
    if (overriddenMimeType) {
      var overriddenMimeTypeStr = UTF8ToString(overriddenMimeType);
      xhr.overrideMimeType(overriddenMimeTypeStr);
    }
    if (requestHeaders) {
      for (;;) {
        var key = HEAPU32[((requestHeaders)>>2)];
        if (!key) break;
        var value = HEAPU32[(((requestHeaders)+(4))>>2)];
        if (!value) break;
        requestHeaders += 8;
        var keyStr = UTF8ToString(key);
        var valueStr = UTF8ToString(value);
        xhr.setRequestHeader(keyStr, valueStr);
      }
    }
  
    var id = Fetch.xhrs.allocate(xhr);
    HEAPU32[((fetch)>>2)] = id;
    var data = (dataPtr && dataLength) ? HEAPU8.slice(dataPtr, dataPtr + dataLength) : null;
    // TODO: Support specifying custom headers to the request.
  
    // Share the code to save the response, as we need to do so both on success
    // and on error (despite an error, there may be a response, like a 404 page).
    // This receives a condition, which determines whether to save the xhr's
    // response, or just 0.
    function saveResponseAndStatus() {
      var ptr = 0;
      var ptrLen = 0;
      if (xhr.response && fetchAttrLoadToMemory && HEAPU32[(((fetch)+(12))>>2)] === 0) {
        ptrLen = xhr.response.byteLength;
      }
      if (ptrLen > 0) {
        // The data pointer malloc()ed here has the same lifetime as the emscripten_fetch_t structure itself has, and is
        // freed when emscripten_fetch_close() is called.
        ptr = _realloc(HEAPU32[(((fetch)+(12))>>2)], ptrLen);
        HEAPU8.set(new Uint8Array(/** @type{Array<number>} */(xhr.response)), ptr);
      }
      HEAPU32[(((fetch)+(12))>>2)] = ptr
      writeI53ToI64(fetch + 16, ptrLen);
      writeI53ToI64(fetch + 24, 0);
      var len = xhr.response?.byteLength ?? 0;
      if (len) {
        // If the final XHR.onload handler receives the bytedata to compute total length, report that,
        // otherwise don't write anything out here, which will retain the latest byte size reported in
        // the most recent XHR.onprogress handler.
        writeI53ToI64(fetch + 32, len);
      }
      HEAP16[(((fetch)+(40))>>1)] = xhr.readyState
      HEAP16[(((fetch)+(42))>>1)] = xhr.status
      if (xhr.statusText) stringToUTF8(xhr.statusText, fetch + 44, 64);
      if (fetchAttrSynchronous) {
        // The response url pointer malloc()ed here has the same lifetime as the emscripten_fetch_t structure itself has, and is
        // freed when emscripten_fetch_close() is called.
        var ruPtr = stringToNewUTF8(xhr.responseURL);
        HEAPU32[(((fetch)+(200))>>2)] = ruPtr
      }
    }
  
    xhr.onload = (e) => {
      // check if xhr was aborted by user and don't try to call back
      if (!Fetch.xhrs.has(id)) {
        return;
      }
      saveResponseAndStatus();
      if (xhr.status >= 200 && xhr.status < 300) {
        if (fetchAttrStreamData) {
          assert(xhr.response === null);
        }
        onsuccess(fetch, xhr, e);
      } else {
        onerror(fetch, e);
      }
    };
    xhr.onerror = (e) => {
      // check if xhr was aborted by user and don't try to call back
      if (!Fetch.xhrs.has(id)) {
        return;
      }
      saveResponseAndStatus();
      onerror(fetch, e);
    };
    xhr.ontimeout = (e) => {
      // check if xhr was aborted by user and don't try to call back
      if (!Fetch.xhrs.has(id)) {
        return;
      }
      onerror(fetch, e);
    };
    xhr.onprogress = (e) => {
      // check if xhr was aborted by user and don't try to call back
      if (!Fetch.xhrs.has(id)) {
        return;
      }
      var ptrLen = (fetchAttrLoadToMemory && fetchAttrStreamData) ? xhr.response?.byteLength ?? 0 : 0;
  
      // Specifies the maximum chunk size that a streaming fetch will transfer from
      // JS over to WebAssembly side. Used to cap a streaming fetch to avoid
      // overallocating WebAssembly memory needlessly.
      const FETCH_STREAMING_MAX_CHUNK_SIZE = 8*1024*1024;
  
      for (var bytePos = 0; bytePos < ptrLen || !ptrLen;) {
        var sz = Math.min(ptrLen - bytePos, FETCH_STREAMING_MAX_CHUNK_SIZE);
  
        var ptr = 0;
        if (sz > 0 && fetchAttrLoadToMemory && fetchAttrStreamData) {
          // Even though we are doing a streaming fetch (i.e. in small chunks), Safari may call onprogress with a huge
          // chunk size. This will be a problem for Wasm applications that intend to use streaming fetch to process
          // an input file in small chunks (to avoid blowing up the WebAssembly heap size). Therefore apply a max
          // chunk size ceiling to the received chunks, and transfer the data over to WebAssembly using max sized chunks.
  
          assert(onprogress, 'streaming fetch requires an onprogress handler');
          // The data pointer malloc()ed here has the same lifetime as the emscripten_fetch_t structure itself has, and is
          // freed when emscripten_fetch_close() is called.
          ptr = _realloc(HEAPU32[(((fetch)+(12))>>2)], sz);
          HEAPU8.set(new Uint8Array(/** @type{Array<number>} */(xhr.response), bytePos, sz), ptr);
        }
        HEAPU32[(((fetch)+(12))>>2)] = ptr
        writeI53ToI64(fetch + 16, sz);
        writeI53ToI64(fetch + 24, e.loaded - ptrLen + bytePos);
        writeI53ToI64(fetch + 32, e.total);
        HEAP16[(((fetch)+(40))>>1)] = xhr.readyState
        var status = xhr.status;
        // If loading files from a source that does not give HTTP status code, assume success if we get data bytes
        if (xhr.readyState >= 3 && xhr.status === 0 && e.loaded > 0) status = 200;
        HEAP16[(((fetch)+(42))>>1)] = status
        if (xhr.statusText) stringToUTF8(xhr.statusText, fetch + 44, 64);
        onprogress(fetch, e);
        bytePos += sz;
        if (!ptrLen) break;
      }
    };
    xhr.onreadystatechange = (e) => {
      // check if xhr was aborted by user and don't try to call back
      if (!Fetch.xhrs.has(id)) {
        runtimeKeepalivePop();
        return;
      }
      HEAP16[(((fetch)+(40))>>1)] = xhr.readyState
      if (xhr.readyState >= 2) {
        HEAP16[(((fetch)+(42))>>1)] = xhr.status
      }
      if (!fetchAttrSynchronous && (xhr.readyState === 2 && xhr.responseURL.length > 0)) {
        // The response url pointer malloc()ed here has the same lifetime as the emscripten_fetch_t structure itself has, and is
        // freed when emscripten_fetch_close() is called.
        var ruPtr = stringToNewUTF8(xhr.responseURL);
        HEAPU32[(((fetch)+(200))>>2)] = ruPtr
      }
      onreadystatechange(fetch, e);
    };
    try {
      xhr.send(data);
    } catch(e) {
      onerror(fetch, e);
    }
  }
  
  
  
  var readI53FromI64 = (ptr) => {
      return HEAPU32[((ptr)>>2)] + HEAP32[(((ptr)+(4))>>2)] * 4294967296;
    };
  
  var readI53FromU64 = (ptr) => {
      return HEAPU32[((ptr)>>2)] + HEAPU32[(((ptr)+(4))>>2)] * 4294967296;
    };
  
  var writeI53ToI64 = (ptr, num) => {
      HEAPU32[((ptr)>>2)] = num;
      var lower = HEAPU32[((ptr)>>2)];
      HEAPU32[(((ptr)+(4))>>2)] = (num - lower)/4294967296;
      var deserialized = (num >= 0) ? readI53FromU64(ptr) : readI53FromI64(ptr);
      var offset = ((ptr)>>2);
      if (deserialized != num) warnOnce(`writeI53ToI64() out of range: serialized JS Number ${num} to Wasm heap as bytes lo=${ptrToString(HEAPU32[offset])}, hi=${ptrToString(HEAPU32[offset+1])}, which deserializes back to ${deserialized} instead!`);
    };
  
  
  
  
  
  function fetchCacheData(/** @type {IDBDatabase} */ db, fetch, data, onsuccess, onerror) {
    if (!db) {
      onerror(fetch, 0, 'IndexedDB not available!');
      return;
    }
  
    var fetch_attr = fetch + 108;
    var destinationPath = HEAPU32[(((fetch_attr)+(64))>>2)];
    destinationPath ||= HEAPU32[(((fetch)+(8))>>2)];
    var destinationPathStr = UTF8ToString(destinationPath);
  
    try {
      var transaction = db.transaction(['FILES'], 'readwrite');
      var packages = transaction.objectStore('FILES');
      var putRequest = packages.put(data, destinationPathStr);
      putRequest.onsuccess = (event) => {
        HEAP16[(((fetch)+(40))>>1)] = 4 // Mimic XHR readyState 4 === 'DONE: The operation is complete'
        HEAP16[(((fetch)+(42))>>1)] = 200 // Mimic XHR HTTP status code 200 "OK"
        stringToUTF8("OK", fetch + 44, 64);
        onsuccess(fetch, 0, destinationPathStr);
      };
      putRequest.onerror = (error) => {
        // Most likely we got an error if IndexedDB is unwilling to store any more data for this page.
        // TODO: Can we identify and break down different IndexedDB-provided errors and convert those
        // to more HTTP status codes for more information?
        HEAP16[(((fetch)+(40))>>1)] = 4 // Mimic XHR readyState 4 === 'DONE: The operation is complete'
        HEAP16[(((fetch)+(42))>>1)] = 413 // Mimic XHR HTTP status code 413 "Payload Too Large"
        stringToUTF8("Payload Too Large", fetch + 44, 64);
        onerror(fetch, 0, error);
      };
    } catch(e) {
      onerror(fetch, 0, e);
    }
  }
  
  
  
  
  function fetchLoadCachedData(db, fetch, onsuccess, onerror) {
    if (!db) {
      onerror(fetch, 0, 'IndexedDB not available!');
      return;
    }
  
    var fetch_attr = fetch + 108;
    var path = HEAPU32[(((fetch_attr)+(64))>>2)];
    path ||= HEAPU32[(((fetch)+(8))>>2)];
    var pathStr = UTF8ToString(path);
  
    try {
      var transaction = db.transaction(['FILES'], 'readonly');
      var packages = transaction.objectStore('FILES');
      var getRequest = packages.get(pathStr);
      getRequest.onsuccess = (event) => {
        if (event.target.result) {
          var value = event.target.result;
          var len = value.byteLength || value.length;
          // The data pointer malloc()ed here has the same lifetime as the emscripten_fetch_t structure itself has, and is
          // freed when emscripten_fetch_close() is called.
          var ptr = _malloc(len);
          HEAPU8.set(new Uint8Array(value), ptr);
          HEAPU32[(((fetch)+(12))>>2)] = ptr;
          writeI53ToI64(fetch + 16, len);
          writeI53ToI64(fetch + 24, 0);
          writeI53ToI64(fetch + 32, len);
          HEAP16[(((fetch)+(40))>>1)] = 4 // Mimic XHR readyState 4 === 'DONE: The operation is complete'
          HEAP16[(((fetch)+(42))>>1)] = 200 // Mimic XHR HTTP status code 200 "OK"
          stringToUTF8("OK", fetch + 44, 64);
          onsuccess(fetch, 0, value);
        } else {
          // Succeeded to load, but the load came back with the value of undefined, treat that as an error since we never store undefined in db.
          HEAP16[(((fetch)+(40))>>1)] = 4 // Mimic XHR readyState 4 === 'DONE: The operation is complete'
          HEAP16[(((fetch)+(42))>>1)] = 404 // Mimic XHR HTTP status code 404 "Not Found"
          stringToUTF8("Not Found", fetch + 44, 64);
          onerror(fetch, 0, 'no data');
        }
      };
      getRequest.onerror = (error) => {
        HEAP16[(((fetch)+(40))>>1)] = 4 // Mimic XHR readyState 4 === 'DONE: The operation is complete'
        HEAP16[(((fetch)+(42))>>1)] = 404 // Mimic XHR HTTP status code 404 "Not Found"
        stringToUTF8("Not Found", fetch + 44, 64);
        onerror(fetch, 0, error);
      };
    } catch(e) {
      onerror(fetch, 0, e);
    }
  }
  
  
  
  function fetchDeleteCachedData(db, fetch, onsuccess, onerror) {
    if (!db) {
      onerror(fetch, 0, 'IndexedDB not available!');
      return;
    }
  
    var fetch_attr = fetch + 108;
    var path = HEAPU32[(((fetch_attr)+(64))>>2)];
    path ||= HEAPU32[(((fetch)+(8))>>2)];
  
    var pathStr = UTF8ToString(path);
  
    try {
      var transaction = db.transaction(['FILES'], 'readwrite');
      var packages = transaction.objectStore('FILES');
      var request = packages.delete(pathStr);
      request.onsuccess = (event) => {
        var value = event.target.result;
        HEAPU32[(((fetch)+(12))>>2)] = 0;
        writeI53ToI64(fetch + 16, 0);
        writeI53ToI64(fetch + 24, 0);
        writeI53ToI64(fetch + 32, 0);
        // Mimic XHR readyState 4 === 'DONE: The operation is complete'
        HEAP16[(((fetch)+(40))>>1)] = 4;
        // Mimic XHR HTTP status code 200 "OK"
        HEAP16[(((fetch)+(42))>>1)] = 200;
        stringToUTF8("OK", fetch + 44, 64);
        onsuccess(fetch, 0, value);
      };
      request.onerror = (error) => {
        HEAP16[(((fetch)+(40))>>1)] = 4 // Mimic XHR readyState 4 === 'DONE: The operation is complete'
        HEAP16[(((fetch)+(42))>>1)] = 404 // Mimic XHR HTTP status code 404 "Not Found"
        stringToUTF8("Not Found", fetch + 44, 64);
        onerror(fetch, 0, error);
      };
    } catch(e) {
      onerror(fetch, 0, e);
    }
  }
  
  
  
  
  
  
  function _emscripten_start_fetch(fetch, successcb, errorcb, progresscb, readystatechangecb) {
    // Avoid shutting down the runtime since we want to wait for the async
    // response.
    runtimeKeepalivePush();
  
    var fetch_attr = fetch + 108;
    var onsuccess = HEAPU32[(((fetch_attr)+(36))>>2)];
    var onerror = HEAPU32[(((fetch_attr)+(40))>>2)];
    var onprogress = HEAPU32[(((fetch_attr)+(44))>>2)];
    var onreadystatechange = HEAPU32[(((fetch_attr)+(48))>>2)];
    var fetchAttributes = HEAPU32[(((fetch_attr)+(52))>>2)];
    var fetchAttrSynchronous = !!(fetchAttributes & 64);
  
    function doCallback(f) {
      if (fetchAttrSynchronous) {
        f();
      } else {
        callUserCallback(f);
      }
    }
  
    var reportSuccess = (fetch, xhr, e) => {
      runtimeKeepalivePop();
      doCallback(() => {
        if (onsuccess) getWasmTableEntry(onsuccess)(fetch);
        else successcb?.(fetch);
      });
    };
  
    var reportProgress = (fetch, e) => {
      doCallback(() => {
        if (onprogress) getWasmTableEntry(onprogress)(fetch);
        else progresscb?.(fetch);
      });
    };
  
    var reportError = (fetch, e) => {
      runtimeKeepalivePop();
      doCallback(() => {
        if (onerror) getWasmTableEntry(onerror)(fetch);
        else errorcb?.(fetch);
      });
    };
  
    var reportReadyStateChange = (fetch, e) => {
      doCallback(() => {
        if (onreadystatechange) getWasmTableEntry(onreadystatechange)(fetch);
        else readystatechangecb?.(fetch);
      });
    };
  
    var performUncachedXhr = (fetch, xhr, e) => {
      fetchXHR(fetch, reportSuccess, reportError, reportProgress, reportReadyStateChange);
    };
  
    var cacheResultAndReportSuccess = (fetch, xhr, e) => {
      var storeSuccess = (fetch, xhr, e) => {
        runtimeKeepalivePop();
        doCallback(() => {
          if (onsuccess) getWasmTableEntry(onsuccess)(fetch);
          else successcb?.(fetch);
        });
      };
      var storeError = (fetch, xhr, e) => {
        runtimeKeepalivePop();
        doCallback(() => {
          if (onsuccess) getWasmTableEntry(onsuccess)(fetch);
          else successcb?.(fetch);
        });
      };
      fetchCacheData(Fetch.dbInstance, fetch, xhr.response, storeSuccess, storeError);
    };
  
    var performCachedXhr = (fetch, xhr, e) => {
      fetchXHR(fetch, cacheResultAndReportSuccess, reportError, reportProgress, reportReadyStateChange);
    };
  
    var requestMethod = UTF8ToString(fetch_attr + 0);
    var fetchAttrReplace = !!(fetchAttributes & 16);
    var fetchAttrPersistFile = !!(fetchAttributes & 4);
    var fetchAttrNoDownload = !!(fetchAttributes & 32);
    if (requestMethod === 'EM_IDB_STORE') {
      var ptr = HEAPU32[(((fetch_attr)+(84))>>2)];
      var size = HEAPU32[(((fetch_attr)+(88))>>2)];
      // Storing shared or resizable typed arrays to IndexedDB is not allowed, so use getHeapViewOrCopy.
      fetchCacheData(Fetch.dbInstance, fetch, HEAPU8.slice(ptr, ptr + size), reportSuccess, reportError);
    } else if (requestMethod === 'EM_IDB_DELETE') {
      fetchDeleteCachedData(Fetch.dbInstance, fetch, reportSuccess, reportError);
    } else if (!fetchAttrReplace) {
      fetchLoadCachedData(Fetch.dbInstance, fetch, reportSuccess, fetchAttrNoDownload ? reportError : (fetchAttrPersistFile ? performCachedXhr : performUncachedXhr));
    } else if (!fetchAttrNoDownload) {
      fetchXHR(fetch, fetchAttrPersistFile ? cacheResultAndReportSuccess : reportSuccess, reportError, reportProgress, reportReadyStateChange);
    } else {
      return 0; // todo: free
    }
    return fetch;
  }

  var _emscripten_unwind_to_js_event_loop = () => {
      throw 'unwind';
    };

  var GLctx;
  
  
  
  var webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance = (ctx) =>
      // Closure is expected to be allowed to minify the '.dibvbi' property, so not accessing it quoted.
      !!(ctx.dibvbi = ctx.getExtension('WEBGL_draw_instanced_base_vertex_base_instance'));
  
  var webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance = (ctx) => {
      // Closure is expected to be allowed to minify the '.mdibvbi' property, so not accessing it quoted.
      return !!(ctx.mdibvbi = ctx.getExtension('WEBGL_multi_draw_instanced_base_vertex_base_instance'));
    };
  
  var webgl_enable_EXT_polygon_offset_clamp = (ctx) =>
      !!(ctx.extPolygonOffsetClamp = ctx.getExtension('EXT_polygon_offset_clamp'));
  
  var webgl_enable_EXT_clip_control = (ctx) =>
      !!(ctx.extClipControl = ctx.getExtension('EXT_clip_control'));
  
  var webgl_enable_WEBGL_polygon_mode = (ctx) =>
      !!(ctx.webglPolygonMode = ctx.getExtension('WEBGL_polygon_mode'));
  
  var webgl_enable_WEBGL_multi_draw = (ctx) =>
      // Closure is expected to be allowed to minify the '.multiDrawWebgl' property, so not accessing it quoted.
      !!(ctx.multiDrawWebgl = ctx.getExtension('WEBGL_multi_draw'));
  
  var getEmscriptenSupportedExtensions = (ctx) => {
      // Restrict the list of advertised extensions to those that we actually
      // support.
      var supportedExtensions = [
        // WebGL 2 extensions
        'EXT_color_buffer_float',
        'EXT_conservative_depth',
        'EXT_disjoint_timer_query_webgl2',
        'EXT_texture_norm16',
        'NV_shader_noperspective_interpolation',
        'WEBGL_clip_cull_distance',
        // WebGL 1 and WebGL 2 extensions
        'EXT_clip_control',
        'EXT_color_buffer_half_float',
        'EXT_depth_clamp',
        'EXT_float_blend',
        'EXT_polygon_offset_clamp',
        'EXT_texture_compression_bptc',
        'EXT_texture_compression_rgtc',
        'EXT_texture_filter_anisotropic',
        'KHR_parallel_shader_compile',
        'OES_texture_float_linear',
        'WEBGL_blend_func_extended',
        'WEBGL_compressed_texture_astc',
        'WEBGL_compressed_texture_etc',
        'WEBGL_compressed_texture_etc1',
        'WEBGL_compressed_texture_s3tc',
        'WEBGL_compressed_texture_s3tc_srgb',
        'WEBGL_debug_renderer_info',
        'WEBGL_debug_shaders',
        'WEBGL_lose_context',
        'WEBGL_multi_draw',
        'WEBGL_polygon_mode'
      ];
      // .getSupportedExtensions() can return null if context is lost, so coerce to empty array.
      return ctx.getSupportedExtensions()?.filter(ext => supportedExtensions.includes(ext)) ?? [];
    };
  
  
  
  
  var GL = {
  counter:1,
  buffers:[],
  programs:[],
  framebuffers:[],
  renderbuffers:[],
  textures:[],
  shaders:[],
  vaos:[],
  contexts:{
  },
  offscreenCanvases:{
  },
  queries:[],
  samplers:[],
  transformFeedbacks:[],
  syncs:[],
  stringCache:{
  },
  stringiCache:{
  },
  unpackAlignment:4,
  unpackRowLength:0,
  recordError:(errorCode) => {
        if (!GL.lastError) {
          GL.lastError = errorCode;
        }
      },
  getNewId:(table) => {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
          table[i] = null;
        }
        return ret;
      },
  genObject:(n, buffers, createFunction, objectTable
        ) => {
        for (var i = 0; i < n; i++) {
          var buffer = GLctx[createFunction]();
          var id = buffer && GL.getNewId(objectTable);
          if (buffer) {
            buffer.name = id;
            objectTable[id] = buffer;
          } else {
            GL.recordError(0x502 /* GL_INVALID_OPERATION */);
          }
          HEAP32[(((buffers)+(i*4))>>2)] = id;
        }
      },
  getSource:(shader, count, string, length) => {
        var source = '';
        for (var i = 0; i < count; ++i) {
          var len = length ? HEAPU32[(((length)+(i*4))>>2)] : undefined;
          source += UTF8ToString(HEAPU32[(((string)+(i*4))>>2)], len);
        }
        return source;
      },
  createContext:(/** @type {HTMLCanvasElement} */ canvas, webGLContextAttributes) => {
  
        // BUG: Workaround Safari WebGL issue: After successfully acquiring WebGL
        // context on a canvas, calling .getContext() will always return that
        // context independent of which 'webgl' or 'webgl2'
        // context version was passed. See:
        //   https://webkit.org/b/222758
        // and:
        //   https://github.com/emscripten-core/emscripten/issues/13295.
        // TODO: Once the bug is fixed and shipped in Safari, adjust the Safari
        // version field in above check.
        if (!canvas.getContextSafariWebGL2Fixed) {
          canvas.getContextSafariWebGL2Fixed = canvas.getContext;
          /** @type {function(this:HTMLCanvasElement, string, (Object|null)=): (RenderingContext|null)} */
          function fixedGetContext(ver, attrs) {
            var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
            return ((ver == 'webgl') == (gl instanceof WebGLRenderingContext)) ? gl : null;
          }
          canvas.getContext = fixedGetContext;
        }
  
        var ctx = canvas.getContext('webgl2', webGLContextAttributes);
  
        if (!ctx) return 0;
  
        var handle = GL.registerContext(ctx, webGLContextAttributes);
  
        return handle;
      },
  registerContext:(ctx, webGLContextAttributes) => {
        // with pthreads a context is a location in memory with some synchronized
        // data between threads
        var handle = _malloc(8);
        HEAPU32[(((handle)+(4))>>2)] = _pthread_self(); // the thread pointer of the thread that owns the control of the context
  
        var context = {
          handle,
          attributes: webGLContextAttributes,
          version: webGLContextAttributes.majorVersion,
          GLctx: ctx
        };
  
        // Store the created context object so that we can access the context
        // given a canvas without having to pass the parameters again.
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes.enableExtensionsByDefault === 'undefined' || webGLContextAttributes.enableExtensionsByDefault) {
          GL.initExtensions(context);
        }
  
        return handle;
      },
  makeContextCurrent:(contextHandle) => {
  
        // Active Emscripten GL layer context object.
        GL.currentContext = GL.contexts[contextHandle];
        // Active WebGL context object.
        Module['ctx'] = GLctx = GL.currentContext?.GLctx;
        return !(contextHandle && !GLctx);
      },
  getContext:(contextHandle) => {
        return GL.contexts[contextHandle];
      },
  deleteContext:(contextHandle) => {
        if (GL.currentContext === GL.contexts[contextHandle]) {
          GL.currentContext = null;
        }
        if (typeof JSEvents === 'object') {
          // Release all JS event handlers on the DOM element that the GL context is
          // associated with since the context is now deleted.
          JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
        }
        // Make sure the canvas object no longer refers to the context object so
        // there are no GC surprises.
        if (GL.contexts[contextHandle]?.GLctx.canvas) {
          GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
        }
        _free(GL.contexts[contextHandle].handle);
        GL.contexts[contextHandle] = null;
      },
  initExtensions:(context) => {
        // If this function is called without a specific context object, init the
        // extensions of the currently active context.
        context ||= GL.currentContext;
  
        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;
  
        var GLctx = context.GLctx;
  
        // Detect the presence of a few extensions manually, since the GL interop
        // layer itself will need to know if they exist.
  
        // Extensions that are available in both WebGL 1 and WebGL 2
        webgl_enable_WEBGL_multi_draw(GLctx);
        webgl_enable_EXT_polygon_offset_clamp(GLctx);
        webgl_enable_EXT_clip_control(GLctx);
        webgl_enable_WEBGL_polygon_mode(GLctx);
        // Extensions that are available from WebGL >= 2 (no-op if called on a WebGL 1 context active)
        webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
        webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);
  
        // On WebGL 2, EXT_disjoint_timer_query is replaced with an alternative
        // that's based on core APIs, and exposes only the queryCounterEXT()
        // entrypoint.
        if (context.version >= 2) {
          GLctx.disjointTimerQueryExt = GLctx.getExtension('EXT_disjoint_timer_query_webgl2');
        }
  
        // However, Firefox exposes the WebGL 1 version on WebGL 2 as well and
        // thus we look for the WebGL 1 version again if the WebGL 2 version
        // isn't present. https://bugzil.la/1328882
        if (context.version < 2 || !GLctx.disjointTimerQueryExt)
        {
          GLctx.disjointTimerQueryExt = GLctx.getExtension('EXT_disjoint_timer_query');
        }
  
        for (var ext of getEmscriptenSupportedExtensions(GLctx)) {
          // WEBGL_lose_context, WEBGL_debug_renderer_info and WEBGL_debug_shaders
          // are not enabled by default.
          if (!ext.includes('lose_context') && !ext.includes('debug')) {
            // Call .getExtension() to enable that extension permanently.
            GLctx.getExtension(ext);
          }
        }
      },
  };
  
  var webglPowerPreferences = ["default","low-power","high-performance"];
  
  
  
  
  var _emscripten_webgl_do_create_context = (target, attributes) => {
      assert(attributes);
      var attr32 = ((attributes)>>2);
      var powerPreference = HEAP32[attr32 + (8>>2)];
      var contextAttributes = {
        'alpha': !!HEAP8[attributes + 0],
        'depth': !!HEAP8[attributes + 1],
        'stencil': !!HEAP8[attributes + 2],
        'antialias': !!HEAP8[attributes + 3],
        'premultipliedAlpha': !!HEAP8[attributes + 4],
        'preserveDrawingBuffer': !!HEAP8[attributes + 5],
        'powerPreference': webglPowerPreferences[powerPreference],
        'failIfMajorPerformanceCaveat': !!HEAP8[attributes + 12],
        'desynchronized': !!HEAP8[attributes + 33],
        // The following are not predefined WebGL context attributes in the WebGL specification, so the property names can be minified by Closure.
        majorVersion: HEAP32[attr32 + (16>>2)],
        minorVersion: HEAP32[attr32 + (20>>2)],
        enableExtensionsByDefault: HEAP8[attributes + 24],
        explicitSwapControl: HEAP8[attributes + 25],
        proxyContextToMainThread: HEAP32[attr32 + (28>>2)],
        renderViaOffscreenBackBuffer: HEAP8[attributes + 32]
      };
  
      //  TODO: Make these into hard errors at some point in the future
      if (contextAttributes.majorVersion !== 1 && contextAttributes.majorVersion !== 2) {
        err(`Invalid WebGL version requested: ${contextAttributes.majorVersion}`);
      }
      if (contextAttributes.majorVersion !== 2) {
        err('WebGL 1 requested but only WebGL 2 is supported (MIN_WEBGL_VERSION is 2)');
      }
  
      var canvas = findCanvasEventTarget(target);
  
      if (!canvas) {
        return 0;
      }
  
      if (contextAttributes.explicitSwapControl) {
        return 0;
      }
  
      var contextHandle = GL.createContext(canvas, contextAttributes);
      return contextHandle;
    };
  var _emscripten_webgl_create_context = _emscripten_webgl_do_create_context;

  
  var _emscripten_webgl_do_destroy_context = (contextHandle) => {
      if (GL.currentContext == contextHandle) GL.currentContext = 0;
      GL.deleteContext(contextHandle);
    };
  var _emscripten_webgl_destroy_context = _emscripten_webgl_do_destroy_context;

  
  
  
  var _emscripten_webgl_get_context_attributes = (c, a) => {
      if (!a) return -5;
      c = GL.contexts[c];
      if (!c) return -3;
      var t = c.GLctx?.getContextAttributes();
      if (!t) return -3;
  
      HEAP8[a] = t.alpha;
      HEAP8[(a)+(1)] = t.depth;
      HEAP8[(a)+(2)] = t.stencil;
      HEAP8[(a)+(3)] = t.antialias;
      HEAP8[(a)+(4)] = t.premultipliedAlpha;
      HEAP8[(a)+(5)] = t.preserveDrawingBuffer;
      var power = t['powerPreference'] && webglPowerPreferences.indexOf(t['powerPreference']);
      HEAP32[(((a)+(8))>>2)] = power;
      HEAP8[(a)+(12)] = t.failIfMajorPerformanceCaveat;
      HEAP8[(a)+(33)] = t.desynchronized;
      HEAP32[(((a)+(16))>>2)] = c.version;
      HEAP32[(((a)+(20))>>2)] = 0;
      HEAP8[(a)+(24)] = c.attributes.enableExtensionsByDefault;
      return 0;
    };

  var _emscripten_webgl_make_context_current = (contextHandle) => {
      var success = GL.makeContextCurrent(contextHandle);
      return success ? 0 : -5;
    };

  var webSockets = new HandleAllocator();;
  
  
  var WS = {
  socketEvent:null,
  getSocket(socketId) {
        if (!webSockets.has(socketId)) {
          return 0;
        }
        return webSockets.get(socketId);
      },
  getSocketEvent(socketId) {
        // Singleton event pointer.  Use EmscriptenWebSocketCloseEvent, which is
        // the largest event struct
        WS.socketEvent ||= _malloc(520);
        HEAPU32[((WS.socketEvent)>>2)] = socketId;
        return WS.socketEvent;
      },
  };
  
  
  
  function _emscripten_websocket_close(socketId, code, reason) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(30, 0, 1, socketId, code, reason);
  
      var socket = WS.getSocket(socketId);
      if (!socket) {
        return -3;
      }
  
      var reasonStr = reason ? UTF8ToString(reason) : undefined;
      // According to WebSocket specification, only close codes that are recognized have integer values
      // 1000-4999, with 3000-3999 and 4000-4999 denoting user-specified close codes:
      // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes
      // Therefore be careful to call the .close() function with exact number and types of parameters.
      // Coerce code==0 to undefined, since Wasm->JS call can only marshal integers, and 0 is not allowed.
      if (reason) socket.close(code || undefined, UTF8ToString(reason));
      else if (code) socket.close(code);
      else socket.close();
      return 0;
    
  }
  

  
  
  function _emscripten_websocket_delete(socketId) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(31, 0, 1, socketId);
  
      var socket = WS.getSocket(socketId);
      if (!socket) {
        return -3;
      }
  
      socket.onopen = socket.onerror = socket.onclose = socket.onmessage = null;
      webSockets.free(socketId);
      return 0;
    
  }
  

  
  
  
  
  
  function _emscripten_websocket_new(createAttributes) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(32, 0, 1, createAttributes);
  
      if (!globalThis.WebSocket) {
        return -1;
      }
      if (!createAttributes) {
        return -5;
      }
  
      var url = UTF8ToString(HEAPU32[((createAttributes)>>2)]);
      var protocols = HEAPU32[(((createAttributes)+(4))>>2)]
      // TODO: Add support for createOnMainThread==false; currently all WebSocket connections are created on the main thread.
      // var createOnMainThread = HEAP8[createAttributes+2];
  
      var socket = protocols ? new WebSocket(url, UTF8ToString(protocols).split(',')) : new WebSocket(url);
      // We always marshal received WebSocket data back to Wasm, so enable receiving the data as arraybuffers for easy marshalling.
      socket.binaryType = 'arraybuffer';
      // TODO: While strictly not necessary, this ID would be good to be unique across all threads to avoid confusion.
      var socketId = webSockets.allocate(socket);
  
      return socketId;
    
  }
  

  
  
  
  function _emscripten_websocket_send_binary(socketId, binaryData, dataLength) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(33, 0, 1, socketId, binaryData, dataLength);
  
      var socket = WS.getSocket(socketId);
      if (!socket) {
        return -3;
      }
  
      // TODO: This is temporary to cast a shared Uint8Array to a non-shared Uint8Array. This could be removed if WebSocket API is improved
      // to allow passing in views to SharedArrayBuffers
      socket.send(HEAPU8.slice(binaryData, binaryData + dataLength));
      return 0;
    
  }
  

  
  
  
  function _emscripten_websocket_send_utf8_text(socketId, textData) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(34, 0, 1, socketId, textData);
  
      var socket = WS.getSocket(socketId);
      if (!socket) {
        return -3;
      }
  
      var str = UTF8ToString(textData);
      socket.send(str);
      return 0;
    
  }
  

  
  
  
  
  
  
  function _emscripten_websocket_set_onclose_callback_on_thread(socketId, userData, callbackFunc, thread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(35, 0, 1, socketId, userData, callbackFunc, thread);
  
      var socket = WS.getSocket(socketId);
      if (!socket) {
        return -3;
      }
  
      socket.onclose = (e) => {
        var eventPtr = WS.getSocketEvent(socketId);
        HEAP8[(eventPtr)+(4)] = e.wasClean,
        HEAP16[(((eventPtr)+(6))>>1)] = e.code,
        stringToUTF8(e.reason, eventPtr + 8, 512);
        getWasmTableEntry(callbackFunc)(0/*TODO*/, eventPtr, userData);
      }
      return 0;
    
  }
  

  
  
  
  function _emscripten_websocket_set_onerror_callback_on_thread(socketId, userData, callbackFunc, thread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(36, 0, 1, socketId, userData, callbackFunc, thread);
  
      var socket = WS.getSocket(socketId);
      if (!socket) {
        return -3;
      }
  
      socket.onerror = (e) => {
        var eventPtr = WS.getSocketEvent(socketId);
        getWasmTableEntry(callbackFunc)(0/*TODO*/, eventPtr, userData);
      }
      return 0;
    
  }
  

  
  
  
  
  
  
  
  
  
  function _emscripten_websocket_set_onmessage_callback_on_thread(socketId, userData, callbackFunc, thread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(37, 0, 1, socketId, userData, callbackFunc, thread);
  
      var socket = WS.getSocket(socketId);
      if (!socket) {
        return -3;
      }
  
      socket.onmessage = (e) => {
        var isText = typeof e.data === 'string';
        if (isText) {
          var buf = stringToNewUTF8(e.data);
          var len = lengthBytesUTF8(e.data)+1;
        } else {
          var len = e.data.byteLength;
          var buf = _malloc(len);
          HEAP8.set(new Uint8Array(e.data), buf);
        }
        var eventPtr = WS.getSocketEvent(socketId);
        HEAPU32[(((eventPtr)+(4))>>2)] = buf,
        HEAP32[(((eventPtr)+(8))>>2)] = len,
        HEAP8[(eventPtr)+(12)] = isText,
        getWasmTableEntry(callbackFunc)(0/*TODO*/, eventPtr, userData);
        _free(buf);
      }
      return 0;
    
  }
  

  
  
  
  function _emscripten_websocket_set_onopen_callback_on_thread(socketId, userData, callbackFunc, thread) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(38, 0, 1, socketId, userData, callbackFunc, thread);
  
  // TODO:
  //    if (thread == 2 ||
  //      (thread == _pthread_self()) return emscripten_websocket_set_onopen_callback_on_calling_thread(socketId, userData, callbackFunc);
      var socket = WS.getSocket(socketId);
      if (!socket) {
        return -3;
      }
  
      socket.onopen = (e) => {
        var eventPtr = WS.getSocketEvent(socketId);
        getWasmTableEntry(callbackFunc)(0/*TODO*/, eventPtr, userData);
      }
      return 0;
    
  }
  

  var ENV = {
  };
  
  var getExecutableName = () => thisProgram;
  var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        // Default values.
        var lang = (globalThis.navigator?.language ?? 'C').replace('-', '_') + '.UTF-8';
        var env = {
          'USER': 'web_user',
          'LOGNAME': 'web_user',
          'PATH': '/',
          'PWD': '/',
          'HOME': '/home/web_user',
          'LANG': lang,
          '_': getExecutableName()
        };
        // Apply the user-provided values, if any.
        for (var x in ENV) {
          // x is a key in ENV; if ENV[x] is undefined, that means it was
          // explicitly set to be so. We allow user code to do that to
          // force variables with default values to remain unset.
          if (ENV[x] === undefined) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
  
  
  
  
  function _environ_get(__environ, environ_buf) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(39, 0, 1, __environ, environ_buf);
  
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[(((__environ)+(envp))>>2)] = ptr;
        bufSize += stringToUTF8(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    
  }
  

  
  
  
  
  function _environ_sizes_get(penviron_count, penviron_buf_size) {
  if (ENVIRONMENT_IS_PTHREAD)
    return proxyToMainThread(40, 0, 1, penviron_count, penviron_buf_size);
  
      var strings = getEnvStrings();
      HEAPU32[((penviron_count)>>2)] = strings.length;
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF8(string) + 1;
      }
      HEAPU32[((penviron_buf_size)>>2)] = bufSize;
      return 0;
    
  }
  


  var _fiber_destroy_js = (token) => { rbxFibers.destroyed++; rbxFibers.parked.delete(token); };

  var _focus_text_input = () => { Module.currentInput?.focus(); };

  var _get_effective_device_pixel_ratio = () => Module.getEffectiveDevicePixelRatio ? Module.getEffectiveDevicePixelRatio() : (window.devicePixelRatio || 1);

  var _get_hardware_concurrency = () => navigator.hardwareConcurrency || 4;

  var _emscripten_glActiveTexture = (x0) => GLctx.activeTexture(x0);
  var _glActiveTexture = _emscripten_glActiveTexture;

  var _emscripten_glAttachShader = (program, shader) => {
      GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
    };
  var _glAttachShader = _emscripten_glAttachShader;

  
  var _emscripten_glBindAttribLocation = (program, index, name) => {
      GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
    };
  var _glBindAttribLocation = _emscripten_glBindAttribLocation;

  var _emscripten_glBindBuffer = (target, buffer) => {
  
      if (target == 0x88EB /*GL_PIXEL_PACK_BUFFER*/) {
        // In WebGL 2 glReadPixels entry point, we need to use a different WebGL 2
        // API function call when a buffer is bound to
        // GL_PIXEL_PACK_BUFFER_BINDING point, so must keep track whether that
        // binding point is non-null to know what is the proper API function to
        // call.
        GLctx.currentPixelPackBufferBinding = buffer;
      } else if (target == 0x88EC /*GL_PIXEL_UNPACK_BUFFER*/) {
        // In WebGL 2 gl(Compressed)Tex(Sub)Image[23]D entry points, we need to
        // use a different WebGL 2 API function call when a buffer is bound to
        // GL_PIXEL_UNPACK_BUFFER_BINDING point, so must keep track whether that
        // binding point is non-null to know what is the proper API function to
        // call.
        GLctx.currentPixelUnpackBufferBinding = buffer;
      }
      GLctx.bindBuffer(target, GL.buffers[buffer]);
    };
  var _glBindBuffer = _emscripten_glBindBuffer;

  var _emscripten_glBindBufferBase = (target, index, buffer) => {
      GLctx.bindBufferBase(target, index, GL.buffers[buffer]);
    };
  var _glBindBufferBase = _emscripten_glBindBufferBase;

  var _emscripten_glBindBufferRange = (target, index, buffer, offset, ptrsize) => {
      GLctx.bindBufferRange(target, index, GL.buffers[buffer], offset, ptrsize);
    };
  var _glBindBufferRange = _emscripten_glBindBufferRange;

  var _emscripten_glBindFramebuffer = (target, framebuffer) => {
  
      GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer]);
  
    };
  var _glBindFramebuffer = _emscripten_glBindFramebuffer;

  var _emscripten_glBindRenderbuffer = (target, renderbuffer) => {
      GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer]);
    };
  var _glBindRenderbuffer = _emscripten_glBindRenderbuffer;

  var _emscripten_glBindTexture = (target, texture) => {
      GLctx.bindTexture(target, GL.textures[texture]);
    };
  var _glBindTexture = _emscripten_glBindTexture;

  var _emscripten_glBindVertexArray = (vao) => {
      GLctx.bindVertexArray(GL.vaos[vao]);
    };
  var _glBindVertexArray = _emscripten_glBindVertexArray;

  var _emscripten_glBlendFunc = (x0, x1) => GLctx.blendFunc(x0, x1);
  var _glBlendFunc = _emscripten_glBlendFunc;

  var _emscripten_glBlendFuncSeparate = (x0, x1, x2, x3) => GLctx.blendFuncSeparate(x0, x1, x2, x3);
  var _glBlendFuncSeparate = _emscripten_glBlendFuncSeparate;

  var _emscripten_glBlitFramebuffer = (x0, x1, x2, x3, x4, x5, x6, x7, x8, x9) => GLctx.blitFramebuffer(x0, x1, x2, x3, x4, x5, x6, x7, x8, x9);
  var _glBlitFramebuffer = _emscripten_glBlitFramebuffer;

  
  var _emscripten_glBufferData = (target, size, data, usage) => {
  
      if (true) {
        // If size is zero, WebGL would interpret uploading the whole input
        // arraybuffer (starting from given offset), which would not make sense in
        // WebAssembly, so avoid uploading if size is zero. However we must still
        // call bufferData to establish a backing storage of zero bytes.
        if (data && size) {
          GLctx.bufferData(target, HEAPU8, usage, data, size);
        } else {
          GLctx.bufferData(target, size, usage);
        }
        return;
      }
    };
  var _glBufferData = _emscripten_glBufferData;

  
  var webglBufferSubData = (target, offset, size, data, src = HEAPU8) => {
      if (true) {
        size && GLctx.bufferSubData(target, offset, src, data, size);
        return;
      }
    };
  
  var _emscripten_glBufferSubData = (target, offset, size, data) => webglBufferSubData(target, offset, size, data);
  var _glBufferSubData = _emscripten_glBufferSubData;

  var _emscripten_glCheckFramebufferStatus = (x0) => GLctx.checkFramebufferStatus(x0);
  var _glCheckFramebufferStatus = _emscripten_glCheckFramebufferStatus;

  var _emscripten_glClear = (x0) => GLctx.clear(x0);
  var _glClear = _emscripten_glClear;

  var _emscripten_glClearBufferfi = (x0, x1, x2, x3) => GLctx.clearBufferfi(x0, x1, x2, x3);
  var _glClearBufferfi = _emscripten_glClearBufferfi;

  var _emscripten_glClearBufferfv = (buffer, drawbuffer, value) => {
  
      GLctx.clearBufferfv(buffer, drawbuffer, HEAPF32, ((value)>>2));
    };
  var _glClearBufferfv = _emscripten_glClearBufferfv;

  var _emscripten_glClearBufferiv = (buffer, drawbuffer, value) => {
  
      GLctx.clearBufferiv(buffer, drawbuffer, HEAP32, ((value)>>2));
    };
  var _glClearBufferiv = _emscripten_glClearBufferiv;

  var _emscripten_glClearColor = (x0, x1, x2, x3) => GLctx.clearColor(x0, x1, x2, x3);
  var _glClearColor = _emscripten_glClearColor;

  var _emscripten_glClearDepthf = (x0) => GLctx.clearDepth(x0);
  var _glClearDepthf = _emscripten_glClearDepthf;

  var _emscripten_glClearStencil = (x0) => GLctx.clearStencil(x0);
  var _glClearStencil = _emscripten_glClearStencil;

  var _emscripten_glClientWaitSync = (sync, flags, timeout) => {
      // WebGL2 vs GLES3 differences: in GLES3, the timeout parameter is a uint64, where 0xFFFFFFFFFFFFFFFFULL means GL_TIMEOUT_IGNORED.
      // In JS, there's no 64-bit value types, so instead timeout is taken to be signed, and GL_TIMEOUT_IGNORED is given value -1.
      // Inherently the value accepted in the timeout is lossy, and can't take in arbitrary u64 bit pattern (but most likely doesn't matter)
      // See https://www.khronos.org/registry/webgl/specs/latest/2.0/#5.15
      timeout = Number(timeout);
      return GLctx.clientWaitSync(GL.syncs[sync], flags, timeout);
    };
  var _glClientWaitSync = _emscripten_glClientWaitSync;

  var _emscripten_glClipControlEXT = (origin, depth) => {
      GLctx.extClipControl['clipControlEXT'](origin, depth);
    };
  var _glClipControlEXT = _emscripten_glClipControlEXT;

  var _emscripten_glColorMask = (red, green, blue, alpha) => {
      GLctx.colorMask(!!red, !!green, !!blue, !!alpha);
    };
  var _glColorMask = _emscripten_glColorMask;

  var _emscripten_glCompileShader = (shader) => {
      GLctx.compileShader(GL.shaders[shader]);
    };
  var _glCompileShader = _emscripten_glCompileShader;

  
  var _emscripten_glCompressedTexImage2D = (target, level, internalFormat, width, height, border, imageSize, data) => {
      // `data` may be null here, which means "allocate uninitialized space but
      // don't upload" in GLES parlance, but `compressedTexImage2D` requires the
      // final data parameter, so we simply pass a heap view starting at zero
      // effectively uploading whatever happens to be near address zero.  See
      // https://github.com/emscripten-core/emscripten/issues/19300.
      if (true) {
        if (GLctx.currentPixelUnpackBufferBinding || !imageSize) {
          GLctx.compressedTexImage2D(target, level, internalFormat, width, height, border, imageSize, data);
          return;
        }
        GLctx.compressedTexImage2D(target, level, internalFormat, width, height, border, HEAPU8, data, imageSize);
        return;
      }
    };
  var _glCompressedTexImage2D = _emscripten_glCompressedTexImage2D;

  var _emscripten_glCompressedTexImage3D = (target, level, internalFormat, width, height, depth, border, imageSize, data) => {
      if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx.compressedTexImage3D(target, level, internalFormat, width, height, depth, border, imageSize, data);
      } else {
        GLctx.compressedTexImage3D(target, level, internalFormat, width, height, depth, border, HEAPU8, data, imageSize);
      }
    };
  var _glCompressedTexImage3D = _emscripten_glCompressedTexImage3D;

  
  var _emscripten_glCompressedTexSubImage2D = (target, level, xoffset, yoffset, width, height, format, imageSize, data) => {
      if (true) {
        if (GLctx.currentPixelUnpackBufferBinding || !imageSize) {
          GLctx.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data);
          return;
        }
        GLctx.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, HEAPU8, data, imageSize);
        return;
      }
    };
  var _glCompressedTexSubImage2D = _emscripten_glCompressedTexSubImage2D;

  var _emscripten_glCompressedTexSubImage3D = (target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data) => {
      if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx.compressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data);
      } else {
        GLctx.compressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, HEAPU8, data, imageSize);
      }
    };
  var _glCompressedTexSubImage3D = _emscripten_glCompressedTexSubImage3D;

  var _emscripten_glCopyTexSubImage2D = (x0, x1, x2, x3, x4, x5, x6, x7) => GLctx.copyTexSubImage2D(x0, x1, x2, x3, x4, x5, x6, x7);
  var _glCopyTexSubImage2D = _emscripten_glCopyTexSubImage2D;

  var _emscripten_glCreateProgram = () => {
      var id = GL.getNewId(GL.programs);
      var program = GLctx.createProgram();
      // Store additional information needed for each shader program:
      program.name = id;
      // Lazy cache results of
      // glGetProgramiv(GL_ACTIVE_UNIFORM_MAX_LENGTH/GL_ACTIVE_ATTRIBUTE_MAX_LENGTH/GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH)
      program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
      program.uniformIdCounter = 1;
      GL.programs[id] = program;
      return id;
    };
  var _glCreateProgram = _emscripten_glCreateProgram;

  var _emscripten_glCreateShader = (shaderType) => {
      var id = GL.getNewId(GL.shaders);
      GL.shaders[id] = GLctx.createShader(shaderType);
  
      return id;
    };
  var _glCreateShader = _emscripten_glCreateShader;

  var _emscripten_glCullFace = (x0) => GLctx.cullFace(x0);
  var _glCullFace = _emscripten_glCullFace;

  
  var _emscripten_glDeleteBuffers = (n, buffers) => {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((buffers)+(i*4))>>2)];
        var buffer = GL.buffers[id];
  
        // From spec: "glDeleteBuffers silently ignores 0's and names that do not
        // correspond to existing buffer objects."
        if (!buffer) continue;
  
        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;
  
        if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
        if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0;
      }
    };
  var _glDeleteBuffers = _emscripten_glDeleteBuffers;

  
  var _emscripten_glDeleteFramebuffers = (n, framebuffers) => {
      for (var i = 0; i < n; ++i) {
        var id = HEAP32[(((framebuffers)+(i*4))>>2)];
        var framebuffer = GL.framebuffers[id];
        if (!framebuffer) continue; // GL spec: "glDeleteFramebuffers silently ignores 0s and names that do not correspond to existing framebuffer objects".
        GLctx.deleteFramebuffer(framebuffer);
        framebuffer.name = 0;
        GL.framebuffers[id] = null;
      }
    };
  var _glDeleteFramebuffers = _emscripten_glDeleteFramebuffers;

  var _emscripten_glDeleteProgram = (id) => {
      if (!id) return;
      var program = GL.programs[id];
      if (!program) {
        // glDeleteProgram actually signals an error when deleting a nonexisting
        // object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteProgram(program);
      program.name = 0;
      GL.programs[id] = null;
    };
  var _glDeleteProgram = _emscripten_glDeleteProgram;

  
  var _emscripten_glDeleteRenderbuffers = (n, renderbuffers) => {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((renderbuffers)+(i*4))>>2)];
        var renderbuffer = GL.renderbuffers[id];
        if (!renderbuffer) continue; // GL spec: "glDeleteRenderbuffers silently ignores 0s and names that do not correspond to existing renderbuffer objects".
        GLctx.deleteRenderbuffer(renderbuffer);
        renderbuffer.name = 0;
        GL.renderbuffers[id] = null;
      }
    };
  var _glDeleteRenderbuffers = _emscripten_glDeleteRenderbuffers;

  var _emscripten_glDeleteShader = (id) => {
      if (!id) return;
      var shader = GL.shaders[id];
      if (!shader) {
        // glDeleteShader actually signals an error when deleting a nonexisting
        // object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteShader(shader);
      GL.shaders[id] = null;
    };
  var _glDeleteShader = _emscripten_glDeleteShader;

  var _emscripten_glDeleteSync = (id) => {
      if (!id) return;
      var sync = GL.syncs[id];
      if (!sync) { // glDeleteSync signals an error when deleting a nonexisting object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteSync(sync);
      sync.name = 0;
      GL.syncs[id] = null;
    };
  var _glDeleteSync = _emscripten_glDeleteSync;

  
  var _emscripten_glDeleteTextures = (n, textures) => {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((textures)+(i*4))>>2)];
        var texture = GL.textures[id];
        // GL spec: "glDeleteTextures silently ignores 0s and names that do not
        // correspond to existing textures".
        if (!texture) continue;
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null;
      }
    };
  var _glDeleteTextures = _emscripten_glDeleteTextures;

  
  var _emscripten_glDeleteVertexArrays = (n, vaos) => {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((vaos)+(i*4))>>2)];
        GLctx.deleteVertexArray(GL.vaos[id]);
        GL.vaos[id] = null;
      }
    };
  var _glDeleteVertexArrays = _emscripten_glDeleteVertexArrays;

  var _emscripten_glDepthFunc = (x0) => GLctx.depthFunc(x0);
  var _glDepthFunc = _emscripten_glDepthFunc;

  var _emscripten_glDepthMask = (flag) => {
      GLctx.depthMask(!!flag);
    };
  var _glDepthMask = _emscripten_glDepthMask;

  var _emscripten_glDisable = (x0) => GLctx.disable(x0);
  var _glDisable = _emscripten_glDisable;

  var _emscripten_glDisableVertexAttribArray = (index) => {
      GLctx.disableVertexAttribArray(index);
    };
  var _glDisableVertexAttribArray = _emscripten_glDisableVertexAttribArray;

  var _emscripten_glDrawArrays = (mode, first, count) => {
  
      GLctx.drawArrays(mode, first, count);
  
    };
  var _glDrawArrays = _emscripten_glDrawArrays;

  var _emscripten_glDrawArraysInstanced = (mode, first, count, primcount) => {
      GLctx.drawArraysInstanced(mode, first, count, primcount);
    };
  var _glDrawArraysInstanced = _emscripten_glDrawArraysInstanced;

  var tempFixedLengthArray = [];
  
  
  var _emscripten_glDrawBuffers = (n, bufs) => {
  
      var bufArray = tempFixedLengthArray[n];
      for (var i = 0; i < n; i++) {
        bufArray[i] = HEAP32[(((bufs)+(i*4))>>2)];
      }
  
      GLctx.drawBuffers(bufArray);
    };
  var _glDrawBuffers = _emscripten_glDrawBuffers;

  
  var _emscripten_glDrawElements = (mode, count, type, indices) => {
  
      GLctx.drawElements(mode, count, type, indices);
  
    };
  var _glDrawElements = _emscripten_glDrawElements;

  var _emscripten_glDrawElementsInstanced = (mode, count, type, indices, primcount) => {
      GLctx.drawElementsInstanced(mode, count, type, indices, primcount);
    };
  var _glDrawElementsInstanced = _emscripten_glDrawElementsInstanced;

  var _emscripten_glEnable = (x0) => GLctx.enable(x0);
  var _glEnable = _emscripten_glEnable;

  var _emscripten_glEnableVertexAttribArray = (index) => {
      GLctx.enableVertexAttribArray(index);
    };
  var _glEnableVertexAttribArray = _emscripten_glEnableVertexAttribArray;

  var _emscripten_glFenceSync = (condition, flags) => {
      var sync = GLctx.fenceSync(condition, flags);
      if (sync) {
        var id = GL.getNewId(GL.syncs);
        sync.name = id;
        GL.syncs[id] = sync;
        return id;
      }
      return 0; // Failed to create a sync object
    };
  var _glFenceSync = _emscripten_glFenceSync;

  var _emscripten_glFramebufferRenderbuffer = (target, attachment, renderbuffertarget, renderbuffer) => {
      GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget,
                                         GL.renderbuffers[renderbuffer]);
    };
  var _glFramebufferRenderbuffer = _emscripten_glFramebufferRenderbuffer;

  var _emscripten_glFramebufferTexture2D = (target, attachment, textarget, texture, level) => {
      GLctx.framebufferTexture2D(target, attachment, textarget,
                                      GL.textures[texture], level);
    };
  var _glFramebufferTexture2D = _emscripten_glFramebufferTexture2D;

  var _emscripten_glFramebufferTextureLayer = (target, attachment, texture, level, layer) => {
      GLctx.framebufferTextureLayer(target, attachment, GL.textures[texture], level, layer);
    };
  var _glFramebufferTextureLayer = _emscripten_glFramebufferTextureLayer;

  var _emscripten_glGenBuffers = (n, buffers) => {
      GL.genObject(n, buffers, 'createBuffer', GL.buffers
        );
    };
  var _glGenBuffers = _emscripten_glGenBuffers;

  var _emscripten_glGenFramebuffers = (n, ids) => {
      GL.genObject(n, ids, 'createFramebuffer', GL.framebuffers
        );
    };
  var _glGenFramebuffers = _emscripten_glGenFramebuffers;

  var _emscripten_glGenRenderbuffers = (n, renderbuffers) => {
      GL.genObject(n, renderbuffers, 'createRenderbuffer', GL.renderbuffers
        );
    };
  var _glGenRenderbuffers = _emscripten_glGenRenderbuffers;

  var _emscripten_glGenTextures = (n, textures) => {
      GL.genObject(n, textures, 'createTexture', GL.textures
        );
    };
  var _glGenTextures = _emscripten_glGenTextures;

  var _emscripten_glGenVertexArrays = (n, arrays) => {
      GL.genObject(n, arrays, 'createVertexArray', GL.vaos
        );
    };
  var _glGenVertexArrays = _emscripten_glGenVertexArrays;

  var _emscripten_glGenerateMipmap = (x0) => GLctx.generateMipmap(x0);
  var _glGenerateMipmap = _emscripten_glGenerateMipmap;

  
  
  var __glGetActiveAttribOrUniform = (funcName, program, index, bufSize, length, size, type, name) => {
      program = GL.programs[program];
      var info = GLctx[funcName](program, index);
      if (info) {
        // If an error occurs, nothing will be written to length, size and type and name.
        var numBytesWrittenExclNull = name && stringToUTF8(info.name, name, bufSize);
        if (length) HEAP32[((length)>>2)] = numBytesWrittenExclNull;
        if (size) HEAP32[((size)>>2)] = info.size;
        if (type) HEAP32[((type)>>2)] = info.type;
      }
    };
  
  var _emscripten_glGetActiveUniform = (program, index, bufSize, length, size, type, name) =>
      __glGetActiveAttribOrUniform('getActiveUniform', program, index, bufSize, length, size, type, name);
  var _glGetActiveUniform = _emscripten_glGetActiveUniform;

  var _emscripten_glGetActiveUniformBlockiv = (program, uniformBlockIndex, pname, params) => {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if params == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      program = GL.programs[program];
  
      if (pname == 0x8A41 /* GL_UNIFORM_BLOCK_NAME_LENGTH */) {
        var name = GLctx.getActiveUniformBlockName(program, uniformBlockIndex);
        HEAP32[((params)>>2)] = name.length+1;
        return;
      }
  
      var result = GLctx.getActiveUniformBlockParameter(program, uniformBlockIndex, pname);
      if (result === null) return; // If an error occurs, nothing should be written to params.
      if (pname == 0x8A43 /*GL_UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES*/) {
        for (var i = 0; i < result.length; i++) {
          HEAP32[(((params)+(i*4))>>2)] = result[i];
        }
      } else {
        HEAP32[((params)>>2)] = result;
      }
    };
  var _glGetActiveUniformBlockiv = _emscripten_glGetActiveUniformBlockiv;

  var _emscripten_glGetError = () => {
      var error = GLctx.getError() || GL.lastError;
      GL.lastError = 0/*GL_NO_ERROR*/;
      return error;
    };
  var _glGetError = _emscripten_glGetError;

  
  
  var webglGetExtensions = () => {
      var exts = getEmscriptenSupportedExtensions(GLctx);
      exts = exts.concat(exts.map((e) => 'GL_' + e));
      return exts;
    };
  
  
  
  
  var emscriptenWebGLGet = (name_, p, type) => {
      // Guard against user passing a null pointer.
      // Note that GLES2 spec does not say anything about how passing a null
      // pointer should be treated.  Testing on desktop core GL 3, the application
      // crashes on glGetIntegerv to a null pointer, but better to report an error
      // instead of doing anything random.
      if (!p) {
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      var ret = undefined;
      switch (name_) { // Handle a few trivial GLES values
        case 0x8DFA: // GL_SHADER_COMPILER
          ret = 1;
          break;
        case 0x8DF8: // GL_SHADER_BINARY_FORMATS
          if (type != 0 && type != 1) {
            GL.recordError(0x500); // GL_INVALID_ENUM
          }
          // Do not write anything to the out pointer, since no binary formats are
          // supported.
          return;
        case 0x87FE: // GL_NUM_PROGRAM_BINARY_FORMATS
        case 0x8DF9: // GL_NUM_SHADER_BINARY_FORMATS
          ret = 0;
          break;
        case 0x86A2: // GL_NUM_COMPRESSED_TEXTURE_FORMATS
          // WebGL doesn't have GL_NUM_COMPRESSED_TEXTURE_FORMATS (it's obsolete
          // since GL_COMPRESSED_TEXTURE_FORMATS returns a JS array that can be
          // queried for length), so implement it ourselves to allow C++ GLES2
          // code to get the length.
          var formats = GLctx.getParameter(0x86A3 /*GL_COMPRESSED_TEXTURE_FORMATS*/);
          ret = formats ? formats.length : 0;
          break;
  
        case 0x821D: // GL_NUM_EXTENSIONS
          if (GL.currentContext.version < 2) {
            // Calling GLES3/WebGL2 function with a GLES2/WebGL1 context
            GL.recordError(0x502 /* GL_INVALID_OPERATION */);
            return;
          }
          ret = webglGetExtensions().length;
          break;
        case 0x821B: // GL_MAJOR_VERSION
        case 0x821C: // GL_MINOR_VERSION
          if (GL.currentContext.version < 2) {
            GL.recordError(0x500); // GL_INVALID_ENUM
            return;
          }
          ret = name_ == 0x821B ? 3 : 0; // return version 3.0
          break;
      }
  
      if (ret === undefined) {
        var result = GLctx.getParameter(name_);
        switch (typeof result) {
          case 'number':
            ret = result;
            break;
          case 'boolean':
            ret = result ? 1 : 0;
            break;
          case 'string':
            GL.recordError(0x500); // GL_INVALID_ENUM
            return;
          case 'object':
            if (result === null) {
              // null is a valid result for some (e.g., which buffer is bound -
              // perhaps nothing is bound), but otherwise can mean an invalid
              // name_, which we need to report as an error
              switch (name_) {
                case 0x8894: // ARRAY_BUFFER_BINDING
                case 0x8B8D: // CURRENT_PROGRAM
                case 0x8895: // ELEMENT_ARRAY_BUFFER_BINDING
                case 0x8CA6: // FRAMEBUFFER_BINDING or DRAW_FRAMEBUFFER_BINDING
                case 0x8CA7: // RENDERBUFFER_BINDING
                case 0x8069: // TEXTURE_BINDING_2D
                case 0x85B5: // WebGL 2 GL_VERTEX_ARRAY_BINDING, or WebGL 1 extension OES_vertex_array_object GL_VERTEX_ARRAY_BINDING_OES
                case 0x8F36: // COPY_READ_BUFFER_BINDING or COPY_READ_BUFFER
                case 0x8F37: // COPY_WRITE_BUFFER_BINDING or COPY_WRITE_BUFFER
                case 0x88ED: // PIXEL_PACK_BUFFER_BINDING
                case 0x88EF: // PIXEL_UNPACK_BUFFER_BINDING
                case 0x8CAA: // READ_FRAMEBUFFER_BINDING
                case 0x8919: // SAMPLER_BINDING
                case 0x8C1D: // TEXTURE_BINDING_2D_ARRAY
                case 0x806A: // TEXTURE_BINDING_3D
                case 0x8E25: // TRANSFORM_FEEDBACK_BINDING
                case 0x8C8F: // TRANSFORM_FEEDBACK_BUFFER_BINDING
                case 0x8A28: // UNIFORM_BUFFER_BINDING
                case 0x8514: { // TEXTURE_BINDING_CUBE_MAP
                  ret = 0;
                  break;
                }
                default: {
                  GL.recordError(0x500); // GL_INVALID_ENUM
                  return;
                }
              }
            } else if (result instanceof Float32Array ||
                       result instanceof Uint32Array ||
                       result instanceof Int32Array ||
                       result instanceof Array) {
              for (var i = 0; i < result.length; ++i) {
                switch (type) {
                  case 0: HEAP32[(((p)+(i*4))>>2)] = result[i]; break;
                  case 2: HEAPF32[(((p)+(i*4))>>2)] = result[i]; break;
                  case 4: HEAP8[(p)+(i)] = result[i] ? 1 : 0; break;
                }
              }
              return;
            } else {
              try {
                ret = result.name | 0;
              } catch(e) {
                GL.recordError(0x500); // GL_INVALID_ENUM
                err(`GL_INVALID_ENUM in glGet${type}v: Unknown object returned from WebGL getParameter(${name_})! (error: ${e})`);
                return;
              }
            }
            break;
          default:
            GL.recordError(0x500); // GL_INVALID_ENUM
            err(`GL_INVALID_ENUM in glGet${type}v: Native code calling glGet${type}v(${name_}) and it returns ${result} of type ${typeof(result)}!`);
            return;
        }
      }
  
      switch (type) {
        case 1: writeI53ToI64(p, ret); break;
        case 0: HEAP32[((p)>>2)] = ret; break;
        case 2:   HEAPF32[((p)>>2)] = ret; break;
        case 4: HEAP8[p] = ret ? 1 : 0; break;
      }
    };
  
  var _emscripten_glGetIntegerv = (name_, p) => emscriptenWebGLGet(name_, p, 0);
  var _glGetIntegerv = _emscripten_glGetIntegerv;

  
  var _emscripten_glGetProgramInfoLog = (program, maxLength, length, infoLog) => {
      var log = GLctx.getProgramInfoLog(GL.programs[program]);
      if (log === null) log = '(unknown error)';
      var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
      if (length) HEAP32[((length)>>2)] = numBytesWrittenExclNull;
    };
  var _glGetProgramInfoLog = _emscripten_glGetProgramInfoLog;

  
  var _emscripten_glGetProgramiv = (program, pname, p) => {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null
        // pointer. Since calling this function does not make sense if p == null,
        // issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
  
      if (program >= GL.counter) {
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
  
      program = GL.programs[program];
  
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getProgramInfoLog(program);
        if (log === null) log = '(unknown error)';
        HEAP32[((p)>>2)] = log.length + 1;
      } else if (pname == 0x8B87 /* GL_ACTIVE_UNIFORM_MAX_LENGTH */) {
        if (!program.maxUniformLength) {
          var numActiveUniforms = GLctx.getProgramParameter(program, 0x8B86/*GL_ACTIVE_UNIFORMS*/);
          for (var i = 0; i < numActiveUniforms; ++i) {
            program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length+1);
          }
        }
        HEAP32[((p)>>2)] = program.maxUniformLength;
      } else if (pname == 0x8B8A /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */) {
        if (!program.maxAttributeLength) {
          var numActiveAttributes = GLctx.getProgramParameter(program, 0x8B89/*GL_ACTIVE_ATTRIBUTES*/);
          for (var i = 0; i < numActiveAttributes; ++i) {
            program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length+1);
          }
        }
        HEAP32[((p)>>2)] = program.maxAttributeLength;
      } else if (pname == 0x8A35 /* GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH */) {
        if (!program.maxUniformBlockNameLength) {
          var numActiveUniformBlocks = GLctx.getProgramParameter(program, 0x8A36/*GL_ACTIVE_UNIFORM_BLOCKS*/);
          for (var i = 0; i < numActiveUniformBlocks; ++i) {
            program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length+1);
          }
        }
        HEAP32[((p)>>2)] = program.maxUniformBlockNameLength;
      } else {
        HEAP32[((p)>>2)] = GLctx.getProgramParameter(program, pname);
      }
    };
  var _glGetProgramiv = _emscripten_glGetProgramiv;

  
  
  var _emscripten_glGetShaderInfoLog = (shader, maxLength, length, infoLog) => {
      var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
      if (log === null) log = '(unknown error)';
      var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
      if (length) HEAP32[((length)>>2)] = numBytesWrittenExclNull;
    };
  var _glGetShaderInfoLog = _emscripten_glGetShaderInfoLog;

  
  var _emscripten_glGetShaderiv = (shader, pname, p) => {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null
        // pointer. Since calling this function does not make sense if p == null,
        // issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = '(unknown error)';
        // The GLES2 specification says that if the shader has an empty info log,
        // a value of 0 is returned. Otherwise the log has a null char appended.
        // (An empty string is falsey, so we can just check that instead of
        // looking at log.length.)
        var logLength = log ? log.length + 1 : 0;
        HEAP32[((p)>>2)] = logLength;
      } else if (pname == 0x8B88) { // GL_SHADER_SOURCE_LENGTH
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        // source may be a null, or the empty string, both of which are falsey
        // values that we report a 0 length for.
        var sourceLength = source ? source.length + 1 : 0;
        HEAP32[((p)>>2)] = sourceLength;
      } else {
        HEAP32[((p)>>2)] = GLctx.getShaderParameter(GL.shaders[shader], pname);
      }
    };
  var _glGetShaderiv = _emscripten_glGetShaderiv;

  
  
  var _emscripten_glGetString = (name_) => {
      var ret = GL.stringCache[name_];
      if (!ret) {
        switch (name_) {
          case 0x1F03 /* GL_EXTENSIONS */:
            ret = stringToNewUTF8(webglGetExtensions().join(' '));
            break;
          case 0x1F00 /* GL_VENDOR */:
          case 0x1F01 /* GL_RENDERER */:
          case 0x9245 /* UNMASKED_VENDOR_WEBGL */:
          case 0x9246 /* UNMASKED_RENDERER_WEBGL */:
            var s = GLctx.getParameter(name_);
            if (!s) {
              GL.recordError(0x500/*GL_INVALID_ENUM*/);
            }
            ret = s ? stringToNewUTF8(s) : 0;
            break;
  
          case 0x1F02 /* GL_VERSION */:
            var webGLVersion = GLctx.getParameter(0x1F02 /*GL_VERSION*/);
            // return GLES version string corresponding to the version of the WebGL context
            var glVersion = `OpenGL ES 2.0 (${webGLVersion})`;
            if (true) glVersion = `OpenGL ES 3.0 (${webGLVersion})`;
            ret = stringToNewUTF8(glVersion);
            break;
          case 0x8B8C /* GL_SHADING_LANGUAGE_VERSION */:
            var glslVersion = GLctx.getParameter(0x8B8C /*GL_SHADING_LANGUAGE_VERSION*/);
            // extract the version number 'N.M' from the string 'WebGL GLSL ES N.M ...'
            var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
            var ver_num = glslVersion.match(ver_re);
            if (ver_num !== null) {
              if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + '0'; // ensure minor version has 2 digits
              glslVersion = `OpenGL ES GLSL ES ${ver_num[1]} (${glslVersion})`;
            }
            ret = stringToNewUTF8(glslVersion);
            break;
          default:
            GL.recordError(0x500/*GL_INVALID_ENUM*/);
            // fall through
        }
        GL.stringCache[name_] = ret;
      }
      return ret;
    };
  var _glGetString = _emscripten_glGetString;

  var _emscripten_glGetUniformBlockIndex = (program, uniformBlockName) => {
      return GLctx.getUniformBlockIndex(GL.programs[program], UTF8ToString(uniformBlockName));
    };
  var _glGetUniformBlockIndex = _emscripten_glGetUniformBlockIndex;

  /** @suppress {checkTypes} */
  var jstoi_q = (str) => parseInt(str);
  
  /** @noinline */
  var webglGetLeftBracePos = (name) => name.slice(-1) == ']' && name.lastIndexOf('[');
  
  var webglPrepareUniformLocationsBeforeFirstUse = (program) => {
      var uniformLocsById = program.uniformLocsById, // Maps GLuint -> WebGLUniformLocation
        uniformSizeAndIdsByName = program.uniformSizeAndIdsByName, // Maps name -> [uniform array length, GLuint]
        i, j;
  
      // On the first time invocation of glGetUniformLocation on this shader program:
      // initialize cache data structures and discover which uniforms are arrays.
      if (!uniformLocsById) {
        // maps GLint integer locations to WebGLUniformLocations
        program.uniformLocsById = uniformLocsById = {};
        // maps integer locations back to uniform name strings, so that we can lazily fetch uniform array locations
        program.uniformArrayNamesById = {};
  
        var numActiveUniforms = GLctx.getProgramParameter(program, 0x8B86/*GL_ACTIVE_UNIFORMS*/);
        for (i = 0; i < numActiveUniforms; ++i) {
          var u = GLctx.getActiveUniform(program, i);
          var nm = u.name;
          var sz = u.size;
          var lb = webglGetLeftBracePos(nm);
          var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
  
          // Assign a new location.
          var id = program.uniformIdCounter;
          program.uniformIdCounter += sz;
          // Eagerly get the location of the uniformArray[0] base element.
          // The remaining indices >0 will be left for lazy evaluation to
          // improve performance. Those may never be needed to fetch, if the
          // application fills arrays always in full starting from the first
          // element of the array.
          uniformSizeAndIdsByName[arrayName] = [sz, id];
  
          // Store placeholder integers in place that highlight that these
          // >0 index locations are array indices pending population.
          for (j = 0; j < sz; ++j) {
            uniformLocsById[id] = j;
            program.uniformArrayNamesById[id++] = arrayName;
          }
        }
      }
    };
  
  
  
  var _emscripten_glGetUniformLocation = (program, name) => {
  
      name = UTF8ToString(name);
  
      if (program = GL.programs[program]) {
        webglPrepareUniformLocationsBeforeFirstUse(program);
        var uniformLocsById = program.uniformLocsById; // Maps GLuint -> WebGLUniformLocation
        var arrayIndex = 0;
        var uniformBaseName = name;
  
        // Invariant: when populating integer IDs for uniform locations, we must
        // maintain the precondition that arrays reside in contiguous addresses,
        // i.e. for a 'vec4 colors[10];', colors[4] must be at location
        // colors[0]+4.  However, user might call glGetUniformLocation(program,
        // "colors") for an array, so we cannot discover based on the user input
        // arguments whether the uniform we are dealing with is an array. The only
        // way to discover which uniforms are arrays is to enumerate over all the
        // active uniforms in the program.
        var leftBrace = webglGetLeftBracePos(name);
  
        // If user passed an array accessor "[index]", parse the array index off the accessor.
        if (leftBrace > 0) {
          arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0; // "index]", coerce parseInt(']') with >>>0 to treat "foo[]" as "foo[0]" and foo[-1] as unsigned out-of-bounds.
          uniformBaseName = name.slice(0, leftBrace);
        }
  
        // Have we cached the location of this uniform before?
        // A pair [array length, GLint of the uniform location]
        var sizeAndId = program.uniformSizeAndIdsByName[uniformBaseName];
  
        // If a uniform with this name exists, and if its index is within the
        // array limits (if it's even an array), query the WebGLlocation, or
        // return an existing cached location.
        if (sizeAndId && arrayIndex < sizeAndId[0]) {
          arrayIndex += sizeAndId[1]; // Add the base location of the uniform to the array index offset.
          if ((uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name))) {
            return arrayIndex;
          }
        }
      }
      else {
        // N.b. we are currently unable to distinguish between GL program IDs that
        // never existed vs GL program IDs that have been deleted, so report
        // GL_INVALID_VALUE in both cases.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
      }
      return -1;
    };
  var _glGetUniformLocation = _emscripten_glGetUniformLocation;

  
  var _emscripten_glInvalidateFramebuffer = (target, numAttachments, attachments) => {
      var list = tempFixedLengthArray[numAttachments];
      for (var i = 0; i < numAttachments; i++) {
        list[i] = HEAP32[(((attachments)+(i*4))>>2)];
      }
  
      GLctx.invalidateFramebuffer(target, list);
    };
  var _glInvalidateFramebuffer = _emscripten_glInvalidateFramebuffer;

  var _emscripten_glLinkProgram = (program) => {
      program = GL.programs[program];
      GLctx.linkProgram(program);
      // Invalidate earlier computed uniform->ID mappings, those have now become stale
      program.uniformLocsById = 0; // Mark as null-like so that glGetUniformLocation() knows to populate this again.
      program.uniformSizeAndIdsByName = {};
  
    };
  var _glLinkProgram = _emscripten_glLinkProgram;

  var rbxMapped = {
  };
  
  var _glMapBufferRange = (target, offset, length, access) => {
      var ptr = _malloc(length);
      if (!ptr) return 0;
      rbxMapped[target] = { ptr, offset, length, access };
      return ptr;
    };

  var _emscripten_glPixelStorei = (pname, param) => {
      if (pname == 3317) {
        GL.unpackAlignment = param;
      } else if (pname == 3314) {
        GL.unpackRowLength = param;
      }
      GLctx.pixelStorei(pname, param);
    };
  var _glPixelStorei = _emscripten_glPixelStorei;

  var _emscripten_glPolygonOffset = (x0, x1) => GLctx.polygonOffset(x0, x1);
  var _glPolygonOffset = _emscripten_glPolygonOffset;

  
  
  
  
  
  
  
  var heapObjectForWebGLType = (type) => {
      // Micro-optimization for size: Subtract lowest GL enum number (0x1400/* GL_BYTE */) from type to compare
      // smaller values for the heap, for shorter generated code size.
      // Also the type HEAPU16 is not tested for explicitly, but any unrecognized type will return out HEAPU16.
      // (since most types are HEAPU16)
      type -= 0x1400;
      if (type == 0) return HEAP8;
  
      if (type == 1) return HEAPU8;
  
      if (type == 2) return HEAP16;
  
      if (type == 4) return HEAP32;
  
      if (type == 6) return HEAPF32;
  
      if (type == 5
        || type == 28922
        || type == 28520
        || type == 30779
        || type == 30782
        )
        return HEAPU32;
  
      return HEAPU16;
    };
  
  var toTypedArrayIndex = (pointer, heap) =>
      pointer >>> (31 - Math.clz32(heap.BYTES_PER_ELEMENT));
  
  var _emscripten_glReadPixels = (x, y, width, height, format, type, pixels) => {
      if (true) {
        if (GLctx.currentPixelPackBufferBinding) {
          GLctx.readPixels(x, y, width, height, format, type, pixels);
          return;
        }
        var heap = heapObjectForWebGLType(type);
        var target = toTypedArrayIndex(pixels, heap);
        GLctx.readPixels(x, y, width, height, format, type, heap, target);
        return;
      }
    };
  var _glReadPixels = _emscripten_glReadPixels;

  var _emscripten_glRenderbufferStorage = (x0, x1, x2, x3) => GLctx.renderbufferStorage(x0, x1, x2, x3);
  var _glRenderbufferStorage = _emscripten_glRenderbufferStorage;

  var _emscripten_glRenderbufferStorageMultisample = (x0, x1, x2, x3, x4) => GLctx.renderbufferStorageMultisample(x0, x1, x2, x3, x4);
  var _glRenderbufferStorageMultisample = _emscripten_glRenderbufferStorageMultisample;

  var _emscripten_glScissor = (x0, x1, x2, x3) => GLctx.scissor(x0, x1, x2, x3);
  var _glScissor = _emscripten_glScissor;

  var _emscripten_glShaderSource = (shader, count, string, length) => {
      var source = GL.getSource(shader, count, string, length);
  
      GLctx.shaderSource(GL.shaders[shader], rbxConvertShader(source));
    };
  var _glShaderSource = _emscripten_glShaderSource;

  var _emscripten_glStencilFunc = (x0, x1, x2) => GLctx.stencilFunc(x0, x1, x2);
  var _glStencilFunc = _emscripten_glStencilFunc;

  var _emscripten_glStencilMask = (x0) => GLctx.stencilMask(x0);
  var _glStencilMask = _emscripten_glStencilMask;

  var _emscripten_glStencilOp = (x0, x1, x2) => GLctx.stencilOp(x0, x1, x2);
  var _glStencilOp = _emscripten_glStencilOp;

  var computeUnpackAlignedImageSize = (width, height, sizePerPixel) => {
      function roundedToNextMultipleOf(x, y) {
        return (x + y - 1) & -y;
      }
      var plainRowSize = (GL.unpackRowLength || width) * sizePerPixel;
      var alignedRowSize = roundedToNextMultipleOf(plainRowSize, GL.unpackAlignment);
      return height * alignedRowSize;
    };
  
  var colorChannelsInGlTextureFormat = (format) => {
      // Micro-optimizations for size: map format to size by subtracting smallest
      // enum value (0x1902) from all values first.  Also omit the most common
      // size value (1) from the list, which is assumed by formats not on the
      // list.
      var colorChannels = {
        // 0x1902 /* GL_DEPTH_COMPONENT */ - 0x1902: 1,
        // 0x1906 /* GL_ALPHA */ - 0x1902: 1,
        5: 3,
        6: 4,
        // 0x1909 /* GL_LUMINANCE */ - 0x1902: 1,
        8: 2,
        29502: 3,
        29504: 4,
        // 0x1903 /* GL_RED */ - 0x1902: 1,
        26917: 2,
        26918: 2,
        // 0x8D94 /* GL_RED_INTEGER */ - 0x1902: 1,
        29846: 3,
        29847: 4
      };
      return colorChannels[format - 0x1902]||1;
    };
  
  
  
  var emscriptenWebGLGetTexPixelData = (type, format, width, height, pixels) => {
      var heap = heapObjectForWebGLType(type);
      var sizePerPixel = colorChannelsInGlTextureFormat(format) * heap.BYTES_PER_ELEMENT;
      var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel);
      return heap.subarray(toTypedArrayIndex(pixels, heap), toTypedArrayIndex(pixels + bytes, heap));
    };
  
  
  
  var _emscripten_glTexImage2D = (target, level, internalFormat, width, height, border, format, type, pixels) => {
      if (true) {
        if (GLctx.currentPixelUnpackBufferBinding) {
          GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
          return;
        }
        if (pixels) {
          var heap = heapObjectForWebGLType(type);
          var index = toTypedArrayIndex(pixels, heap);
          GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, index);
          return;
        }
      }
      var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels) : null;
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixelData);
    };
  var _glTexImage2D = _emscripten_glTexImage2D;

  
  var _emscripten_glTexImage3D = (target, level, internalFormat, width, height, depth, border, format, type, pixels) => {
      if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, pixels);
      } else if (pixels) {
        var heap = heapObjectForWebGLType(type);
        GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, heap, toTypedArrayIndex(pixels, heap));
      } else {
        GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, null);
      }
    };
  var _glTexImage3D = _emscripten_glTexImage3D;

  var _emscripten_glTexParameterf = (x0, x1, x2) => GLctx.texParameterf(x0, x1, x2);
  var _glTexParameterf = _emscripten_glTexParameterf;

  
  var _emscripten_glTexParameterfv = (target, pname, params) => {
      var param = HEAPF32[((params)>>2)];
      GLctx.texParameterf(target, pname, param);
    };
  var _glTexParameterfv = _emscripten_glTexParameterfv;

  var _emscripten_glTexParameteri = (x0, x1, x2) => GLctx.texParameteri(x0, x1, x2);
  var _glTexParameteri = _emscripten_glTexParameteri;

  var _emscripten_glTexStorage2D = (x0, x1, x2, x3, x4) => GLctx.texStorage2D(x0, x1, x2, x3, x4);
  var _glTexStorage2D = _emscripten_glTexStorage2D;

  var _emscripten_glTexStorage3D = (x0, x1, x2, x3, x4, x5) => GLctx.texStorage3D(x0, x1, x2, x3, x4, x5);
  var _glTexStorage3D = _emscripten_glTexStorage3D;

  
  
  
  var _emscripten_glTexSubImage2D = (target, level, xoffset, yoffset, width, height, format, type, pixels) => {
      if (true) {
        if (GLctx.currentPixelUnpackBufferBinding) {
          GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels);
          return;
        }
        if (pixels) {
          var heap = heapObjectForWebGLType(type);
          GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, heap, toTypedArrayIndex(pixels, heap));
          return;
        }
      }
      var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels) : null;
      GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData);
    };
  var _glTexSubImage2D = _emscripten_glTexSubImage2D;

  
  var _emscripten_glTexSubImage3D = (target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels) => {
      if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels);
      } else if (pixels) {
        var heap = heapObjectForWebGLType(type);
        GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, heap, toTypedArrayIndex(pixels, heap));
      } else {
        GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, null);
      }
    };
  var _glTexSubImage3D = _emscripten_glTexSubImage3D;

  
  var webglGetProgramUniformLocation = (program, location) => {
  
      if (program) {
        var webglLoc = program.uniformLocsById[location];
        // program.uniformLocsById[location] stores either an integer, or a
        // WebGLUniformLocation.
        // If an integer, we have not yet bound the location, so do it now. The
        // integer value specifies the array index we should bind to.
        if (typeof webglLoc === 'number') {
          program.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(program, program.uniformArrayNamesById[location] + (webglLoc > 0 ? `[${webglLoc}]` : ''));
        }
        // Else an already cached WebGLUniformLocation, return it.
        return webglLoc;
      } else {
        GL.recordError(0x502/*GL_INVALID_OPERATION*/);
      }
    };
  
  var webglGetUniformLocation = (location) => {
  
      return webglGetProgramUniformLocation(GLctx.currentProgram, location);
    };
  
  var _emscripten_glUniform1i = (location, v0) => {
      GLctx.uniform1i(webglGetUniformLocation(location), v0);
    };
  var _glUniform1i = _emscripten_glUniform1i;

  var _emscripten_glUniformBlockBinding = (program, uniformBlockIndex, uniformBlockBinding) => {
      program = GL.programs[program];
  
      GLctx.uniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding);
    };
  var _glUniformBlockBinding = _emscripten_glUniformBlockBinding;

  
  
  
  var _glUnmapBuffer = (target) => {
      var m = rbxMapped[target];
      if (!m) return 0;
      delete rbxMapped[target];
      if (m.access & 0x2 /* GL_MAP_WRITE_BIT */) {
        GLctx.bufferSubData(target, m.offset, HEAPU8, m.ptr, m.length);
      }
      _free(m.ptr);
      return 1;
    };

  var _emscripten_glUseProgram = (program) => {
      program = GL.programs[program];
      GLctx.useProgram(program);
      // Record the currently active program so that we can access the uniform
      // mapping table of that program.
      GLctx.currentProgram = program;
    };
  var _glUseProgram = _emscripten_glUseProgram;

  var _emscripten_glVertexAttribPointer = (index, size, type, normalized, stride, ptr) => {
      GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
    };
  var _glVertexAttribPointer = _emscripten_glVertexAttribPointer;

  var _emscripten_glViewport = (x0, x1, x2, x3) => GLctx.viewport(x0, x1, x2, x3);
  var _glViewport = _emscripten_glViewport;

  var _has_keyboard = () => 1;

  var _has_mouse = () => (matchMedia('(pointer: fine)').matches || !(navigator.maxTouchPoints > 0)) ? 1 : 0;

  var _is_legacy_scroll = () => Module.isMouseLegacyScroll ? 1 : 0;

  var _is_touch_mobile = () => /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent) ? 1 : 0;

  var _is_touch_screen_device = () => (navigator.maxTouchPoints || 0) > 0 ? 1 : 0;

  
  
  var _js_fetch_file = (urlPtr, dst, size) => {
      var url = UTF8ToString(urlPtr);
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
        xhr.send(null);
        if (xhr.status !== 200 && xhr.status !== 0) {
          console.warn('[rbx] js_fetch_file HTTP', xhr.status, url);
          return 1;
        }
        var s = xhr.responseText, n = Math.min(s.length, size);
        if (s.length !== size) console.warn('[rbx] js_fetch_file size mismatch', url, s.length, size);
        for (var i = 0; i < n; i++) HEAPU8[dst + i] = s.charCodeAt(i) & 0xff;
        return 0;
      } catch (e) {
        console.warn('[rbx] js_fetch_file failed', url, e);
        return 1;
      }
    };

  var _js_init_ring_buffers = (header, channels) => {
      globalThis.__rbxHeap = () => HEAPU8; // for DevTools debugging (tools/debug_break.js)
      Module._ringHeaderAddr = header;
      Module._ringChannelsAddr = channels;
    };

  var _preallocate_emscripten_key_event_buffer = (n) => {};


  var initRandomFill = () => {
  
      // like with most Web APIs, we can't use Web Crypto API directly on shared memory,
      // so we need to create an intermediate buffer and copy it to the destination
      return (view) => (view.set(crypto.getRandomValues(new Uint8Array(view.byteLength))), 0);
    };
  var randomFill = (view) => (randomFill = initRandomFill())(view);
  
  var _random_get = (buffer, size) => randomFill(HEAPU8.subarray(buffer, buffer + size));

  var _rbx_opfs_close = (a) => {};

  var _rbx_opfs_free = (p) => {};

  var _rbx_opfs_install_helpers = (a, b) => rbxOnce('opfs_install_helpers', a, b);

  var _rbx_opfs_read_sync_if_cached = (a, b, c, d) => 0;

  var rbxRna = {
  conns:{
  },
  };
  
  var rbxRnaCall = (name, ...args) => {
      try { Module['rbx_wasm_rna_on_' + name](...args); } catch (e) { console.error('[rna] callback', name, e); }
    };
  var _rbx_wasm_rna_close_js = (h) => {
      var c = rbxRna.conns[h];
      if (!c) { setTimeout(() => rbxRnaCall('close_complete', h), 0); return; }
      c.closing = true;
      try { c.wt.close(); } catch (e) {}
    };

  
  
  
  var rbxRnaAddStream = (c, id, stream) => {
      var st = { id, paused: false, readable: stream.readable ?? stream, writable: stream.writable ?? null, writer: null, chain: Promise.resolve() };
      if (st.writable) st.writer = st.writable.getWriter();
      c.streams.set(id, st);
      return st;
    };
  
  var rbxRnaAccept = async (c, readable, bidi) => {
      var reader = readable.getReader();
      try {
        for (;;) {
          var { value, done } = await reader.read();
          if (done) break;
          var id = bidi ? c.nextServerBidi : c.nextServerUni;
          if (bidi) c.nextServerBidi += 4; else c.nextServerUni += 4;
          rbxRnaAddStream(c, id, value);
          rbxRnaCall('stream_accepted', c.h, id);
        }
      } catch (e) {}
    };
  
  
  
  var rbxRnaPump = (c) => {
      // Moves queued chunks into free ring slots.
      while (c.queue.length) {
        var head = Atomics.load(HEAP32, c.headPtr >> 2), tail = Atomics.load(HEAP32, c.tailPtr >> 2);
        if (((head - tail) | 0) >= c.slots) return;
        var [kind, id, bytes] = c.queue.shift();
        var slot = head & (c.slots - 1);
        HEAPU8.set(bytes, c.ring + slot * c.slotSize);
        Atomics.store(HEAP32, c.headPtr >> 2, (head + 1) | 0);
        rbxRnaCall('receive_ring_slot', c.h, kind, id, slot, bytes.length);
      }
    };
  var rbxRnaDeliver = (c, kind, id, bytes) => {
      for (var o = 0; o < bytes.length || (o === 0 && bytes.length === 0); o += c.slotSize) {
        c.queue.push([kind, id, bytes.subarray(o, o + c.slotSize)]);
        if (!bytes.length) break;
      }
      rbxRnaPump(c);
    };
  
  var rbxRnaClosed = (c, info) => {
      if (c.closed) return;
      c.closed = true;
      if (c.closing) rbxRnaCall('close_complete', c.h);
      else rbxRnaCall('connection_closed', c.h, info?.closeCode ?? 0, 0, 0);
      delete rbxRna.conns[c.h];
    };
  
  
  var _rbx_wasm_rna_connect_js = (h, urlPtr, certs, ncerts, ring, headPtr, tailPtr, slotSize, slots) => {
      var url = UTF8ToString(urlPtr);
      var hashes = [];
      for (var i = 0; i < ncerts; i++) {
        // NetStackConfig certHashes: base64 SHA-256 digests (hex also accepted).
        var str = UTF8ToString(HEAP32[(certs >> 2) + i]);
        var value = /^[0-9a-f]{64}$/i.test(str) ? str.match(/../g).map((x) => parseInt(x, 16))
          : Array.from(atob(str), (ch) => ch.charCodeAt(0));
        hashes.push({ algorithm: 'sha-256', value: new Uint8Array(value) });
      }
      console.log('[rna] connect', url, hashes.length ? 'pinned cert' : 'no cert hash');
      var c = rbxRna.conns[h] = { h, ring, headPtr, tailPtr, slotSize, slots, queue: [], streams: new Map(),
        nextServerBidi: 1, nextServerUni: 3, closed: false, closing: false, wt: null, dgWriter: null };
      try {
        c.wt = new WebTransport(url, hashes.length ? { serverCertificateHashes: hashes } : {});
      } catch (e) {
        console.warn('[rna] connect failed', e);
        setTimeout(() => rbxRnaCall('connect_error', h), 0);
        return;
      }
      c.wt.ready.then(() => {
        var dg = c.wt.datagrams;
        c.dgWriter = (dg.createWritable ? dg.createWritable() : dg.writable).getWriter();
        console.log('[rna] connected', url, 'maxDatagramSize', dg.maxDatagramSize);
        rbxRnaCall('connect_success', h, dg.maxDatagramSize | 0);
        rbxRnaAccept(c, c.wt.incomingBidirectionalStreams, true);
        rbxRnaAccept(c, c.wt.incomingUnidirectionalStreams, false);
        (async () => {
          var r = dg.readable.getReader();
          try { for (;;) { var { value, done } = await r.read(); if (done) break; rbxRnaDeliver(c, 1, 0, new Uint8Array(value)); } } catch (e) {}
        })();
      }, (e) => {
        console.warn('[rna] connect error', url, String(e));
        c.closed = true;
        delete rbxRna.conns[h];
        rbxRnaCall('connect_error', h);
      });
      c.wt.closed.then((info) => rbxRnaClosed(c, info), (e) => rbxRnaClosed(c, { closeCode: e?.streamErrorCode ?? 0 }));
    };

  var _rbx_wasm_rna_is_supported_js = () => (typeof WebTransport !== 'undefined' ? 1 : 0);

  
  
  var rbxRnaReadStream = async (c, st) => {
      if (st.readLoop || !st.readable) return;
      st.readLoop = true;
      var reader = st.reader = st.readable.getReader();
      try {
        for (;;) {
          while (st.paused) await new Promise((r) => (st.wake = r));
          var { value, done } = await reader.read();
          if (done) { rbxRnaCall('stream_fin', c.h, st.id); break; }
          rbxRnaDeliver(c, 0, st.id, new Uint8Array(value));
        }
      } catch (e) {
        if (!c.closed) rbxRnaCall('stream_error', c.h, st.id, e?.streamErrorCode ?? 0);
      }
    };
  
  var _rbx_wasm_rna_open_stream_js = (h, id) => {
      var c = rbxRna.conns[h];
      if (!c) return;
      // Writes and reads issued before the stream exists wait on `pending`.
      var st = { id, paused: false, readable: null, writable: null, writer: null, chain: null };
      st.chain = c.wt.createBidirectionalStream().then((s) => {
        st.readable = s.readable; st.writable = s.writable; st.writer = s.writable.getWriter();
        if (st.wantRead) rbxRnaReadStream(c, st);
      }, (e) => { console.warn('[rna] open stream failed', id, String(e)); rbxRnaCall('stream_error', h, id, 0); });
      c.streams.set(id, st);
    };

  var _rbx_wasm_rna_pause_stream_read_js = (h, id) => { var st = rbxRna.conns[h]?.streams.get(id); if (st) st.paused = true; };

  
  var _rbx_wasm_rna_receive_ring_consumed_js = (h, kind, id) => { var c = rbxRna.conns[h]; if (c) rbxRnaPump(c); };

  
  var _rbx_wasm_rna_resume_stream_read_js = (h, id) => {
      var c = rbxRna.conns[h], st = c?.streams.get(id);
      if (!st) return;
      st.paused = false; st.wantRead = true;
      if (st.wake) { st.wake(); st.wake = null; }
      if (st.readable) rbxRnaReadStream(c, st);
    };

  var _rbx_wasm_rna_send_connection_close_js = (h) => { var c = rbxRna.conns[h]; if (c) { c.closing = true; try { c.wt.close(); } catch (e) {} } };

  
  
  var _rbx_wasm_rna_send_datagram_js = (h, ptr, len, idHi, idLo) => {
      var c = rbxRna.conns[h];
      if (!c?.dgWriter) { if (c) setTimeout(() => rbxRnaCall('datagram_lost', h, idHi, idLo), 0); return; }
      c.dgWriter.write(HEAPU8.slice(ptr, ptr + len)).then(
        () => rbxRnaCall('datagram_acked', h, idHi, idLo),
        () => rbxRnaCall('datagram_lost', h, idHi, idLo));
    };

  var _rbx_wasm_rna_shutdown_stream_read_js = (h, id) => {
      var st = rbxRna.conns[h]?.streams.get(id);
      if (st) { st.paused = true; st.reader?.cancel().catch(() => {}); }
    };

  var _rbx_wasm_rna_shutdown_stream_write_js = (h, id) => {
      var st = rbxRna.conns[h]?.streams.get(id);
      if (st) st.chain = st.chain.then(() => st.writer?.close()).catch(() => {});
    };

  
  
  var _rbx_wasm_rna_write_stream_js = (h, id, ptr, len) => {
      var c = rbxRna.conns[h], st = c?.streams.get(id);
      if (!st) { if (c) setTimeout(() => rbxRnaCall('stream_write_error', h, id), 0); return; }
      var bytes = HEAPU8.slice(ptr, ptr + len);
      st.chain = st.chain.then(() => st.writer.write(bytes)).then(
        () => rbxRnaCall('stream_write_success', h, id, len),
        (e) => { console.warn('[rna] write failed', id, String(e)); rbxRnaCall('stream_write_error', h, id); });
    };

  
  var _read_host_info_int = (key) => {
      var v = Module.hostInfo?.[UTF8ToString(key)];
      return typeof v === 'boolean' ? (v ? 1 : 0) : (v | 0);
    };

  
  
  var _read_host_info_string = (key, buf, size) => {
      var v = Module.hostInfo?.[UTF8ToString(key)];
      stringToUTF8(v == null ? '' : String(v), buf, size);
    };

  
  var _report_crash = (a, b, c, d, e) => {
      var s = (p) => (p ? UTF8ToString(p) : '');
      console.error('[rbx] report_crash', s(a), s(b), s(c), s(d), e);
    };

  var _reset_current_text_input = () => {
    if (Module.currentInput) { Module.currentInput.style.display = 'none'; Module.currentInput = null; }
  };

  var _schedule_main_loop = () => {
      var running = false;
      var tick = async () => {
        if (!running) {
          running = true;
          try {
            await _main_loop_iteration();
            Module._drainTx?.();
          } catch (e) {
            console.error('[rbx] main_loop_iteration threw', e);
            throw e;
          } finally {
            running = false;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

  
  var _set_crash_attribute = (k, v) => console.log('[rbx] crash attribute', UTF8ToString(k), '=', UTF8ToString(v));

  var _set_text_box_horiz_alignment = (ptr) => { if (Module.currentInput) Module.currentInput.style.textAlign = UTF8ToString(ptr); };

  var _set_text_box_overlay = (on) => {
    var c = Module.inputContainer, el = Module.currentInput;
    if (!c || !el) return;
    el.style.background = on ? 'none' : 'white';
    c.style.zIndex = on ? 100 : -100;
  };

  var _set_text_box_vert_alignment = (ptr) => { if (Module.inputContainer) Module.inputContainer.style.alignItems = UTF8ToString(ptr); };

  var _set_text_color = (r, g, b, a) => {
    var el = Module.currentInput;
    if (el) el.style.color = `rgb(${Math.floor(r * 255)} ${Math.floor(g * 255)} ${Math.floor(b * 255)} / ${a})`;
  };

  var _setup_font = (namePtr, urlPtr, weight, size, italic) => {
    var el = Module.currentInput;
    if (!el) return;
    var name = UTF8ToString(namePtr), url = 'url(' + UTF8ToString(urlPtr) + ')';
    var apply = () => {
      el.style.fontFamily = name; el.style.fontWeight = weight;
      el.style.fontSize = `${size}px`; el.style.fontStyle = italic ? 'italic' : 'normal';
    };
    if (name in Module.fontMap) return apply();
    var face = new FontFace(name, url);
    document.fonts.add(face);
    face.load().then(() => { Module.fontMap[name] = face; apply(); }, (e) => console.error(e));
  };

  var _shift_canvas = (dy) => {
    var canvas = document.getElementById('canvas'), c = Module.inputContainer;
    if (canvas && c) { canvas.style.transform = `translateY(${dy}px)`; c.style.transform = `translateY(${dy}px)`; }
  };

  
  var _sync_text_and_pos = (textPtr, selStart, selEnd) => {
    var el = Module.currentInput;
    if (!el) return console.error('Could not find current text input to update.');
    var text = UTF8ToString(textPtr), bytes = Module.encoder.encode(text);
    var start = Module.decoder.decode(bytes.subarray(0, selStart)).length;
    var end = selEnd == selStart ? start : Module.decoder.decode(bytes.subarray(0, selEnd)).length;
    el.value = text; el.selectionStart = start; el.selectionEnd = end;
  };

  var rbxText = {
  horiz:0,
  vert:0,
  overlay:0,
  };
  var _update_text_box_rect = (x, y, w, h) => {
    var c = Module.inputContainer, el = Module.currentInput;
    if (!c || !el) return console.error('Could not find current text input to update.');
    c.style.left = `${x}px`; c.style.top = `${y}px`; c.style.width = `${w}px`; c.style.height = `${h}px`;
    el.style.width = `${w}px`; el.style.maxHeight = `${h}px`;
  };



  
  
  var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };


  var runAndAbortIfError = (func) => {
      try {
        return func();
      } catch (e) {
        abort(e);
      }
    };
  
  
  
  
  
  
  var Asyncify = {
  instrumentWasmImports(imports) {
        assert('Suspending' in WebAssembly, 'JSPI not supported by current environment. Perhaps it needs to be enabled via flags?');
        var importPattern = /^()$/;
  
        for (let [x, original] of Object.entries(imports)) {
          if (typeof original === 'function') {
            let isAsyncifyImport = original.isAsync || importPattern.test(x);
            // Wrap async imports with a suspending WebAssembly function.
            if (isAsyncifyImport) {
              imports[x] = original = new WebAssembly.Suspending(original);
            }
          }
        }
      },
  instrumentWasmExports(exports) {
        var exportPattern = /^(main|__main_argc_argv|main_loop_iteration|fiber_entry|main|__main_argc_argv)$/;
        Asyncify.asyncExports = new Set();
        var ret = {};
        for (let [x, original] of Object.entries(exports)) {
          if (typeof original === 'function') {
            // Wrap all exports with a promising WebAssembly function.
            let isAsyncifyExport = exportPattern.test(x);
            if (isAsyncifyExport) {
              Asyncify.asyncExports.add(original);
              original = Asyncify.makeAsyncFunction(original);
            }
            ret[x] = original;
          } else {
            ret[x] = original;
          }
        }
        return ret;
      },
  asyncExports:null,
  isAsyncExport(func) {
        return Asyncify.asyncExports?.has(func);
      },
  handleAsync:async (startAsync) => {
        runtimeKeepalivePush();
        try {
          return await startAsync();
        } finally {
          runtimeKeepalivePop();
        }
      },
  handleSleep:(startAsync) => Asyncify.handleAsync(() => new Promise(startAsync)),
  makeAsyncFunction(original) {
        return WebAssembly.promising(original);
      },
  };







  var getCFunc = (ident) => {
      var func = Module['_' + ident]; // closure exported function
      assert(func, `Cannot call unknown function ${ident}, make sure it is exported`);
      return func;
    };
  
  var writeArrayToMemory = (array, buffer) => {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    };
  
  
  
  
  
  
    /**
   * @param {string|null=} returnType
   * @param {Array=} argTypes
   * @param {Array=} args
   * @param {Object=} opts
   */
  var ccall = (ident, returnType, argTypes, args, opts) => {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== 'array', 'return type should not be "array"');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (!stack) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret) {
        if (stack) stackRestore(stack);
        return convertReturnValue(ret);
      }
    var asyncMode = opts?.async;
  
      if (asyncMode) return ret.then(onDone);
  
      ret = onDone(ret);
      return ret;
    };
  
    /**
   * @param {string=} returnType
   * @param {Array=} argTypes
   * @param {Object=} opts
   */
  var cwrap = (ident, returnType, argTypes, opts) => {
      return (...args) => ccall(ident, returnType, argTypes, args, opts);
    };








PThread.init();;
assert(emval_handles.length === 5 * 2);
safeSetTimeout.pending = new Map(); safeSetTimeout.nextId = 1;;

      Module['requestAnimationFrame'] = MainLoop.requestAnimationFrame;
      Module['pauseMainLoop'] = MainLoop.pause;
      Module['resumeMainLoop'] = MainLoop.resume;
      MainLoop.init();;
Fetch.init();;
for (let i = 0; i < 32; ++i) tempFixedLengthArray.push(new Array(i));;
// End JS library code

// include: postlibrary.js
// This file is included after the automatically-generated JS library code
// but before the wasm module is created.

{
  // With WASM_ESM_INTEGRATION this has to happen at the top level and not
  // delayed until processModuleArgs.
  initMemory();

  // Begin ATMODULES hooks
  if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];
if (Module['print']) out = Module['print'];
if (Module['printErr']) err = Module['printErr'];

Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;

  // End ATMODULES hooks

  checkIncomingModuleAPI();

  if (Module['arguments']) programArgs = Module['arguments'];
  if (Module['thisProgram']) thisProgram = Module['thisProgram'];

  // Assertions on removed incoming Module JS APIs.
  assert(typeof Module['memoryInitializerPrefixURL'] === 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['pthreadMainPrefixURL'] === 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['cdInitializerPrefixURL'] === 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['filePackagePrefixURL'] === 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['read'] === 'undefined', 'Module.read option was removed');
  assert(typeof Module['readAsync'] === 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
  assert(typeof Module['readBinary'] === 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
  assert(typeof Module['setWindowTitle'] === 'undefined', 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)');
  assert(typeof Module['TOTAL_MEMORY'] === 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
  assert(typeof Module['ENVIRONMENT'] === 'undefined', 'Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
  assert(typeof Module['STACK_SIZE'] === 'undefined', 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')

  var preInit = Module['preInit'];
  if (preInit) {
    if (typeof preInit === 'function') Module['preInit'] = preInit = [preInit];
    // Written as a loop so that preInit functions that themselves add more
    // preInit functions.  Is this actually needed?
    while (preInit.length > 0) {
      preInit.shift()();
    }
  }
  consumedModuleProp('preInit');
}

// Begin runtime exports
  Module['ccall'] = ccall;
  Module['cwrap'] = cwrap;
  Module['UTF8ToString'] = UTF8ToString;
  Module['stringToUTF8'] = stringToUTF8;
  Module['lengthBytesUTF8'] = lengthBytesUTF8;
  var missingLibrarySymbols = [
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'convertI32PairToI53',
  'convertI32PairToI53Checked',
  'convertU32PairToI53',
  'getTempRet0',
  'setTempRet0',
  'zeroMemory',
  'growMemory',
  'withStackSave',
  'strError',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'autoResumeAudioContext',
  'getDynCaller',
  'dynCall',
  'asyncLoad',
  'asmjsMangle',
  'alignMemory',
  'mmapAlloc',
  'getUniqueRunDependency',
  'addOnInit',
  'addOnPostCtor',
  'addOnPreMain',
  'STACK_SIZE',
  'STACK_ALIGN',
  'POINTER_SIZE',
  'ASSERTIONS',
  'convertJsFunctionToWasm',
  'getEmptyTableSlot',
  'updateTableMap',
  'getFunctionAddress',
  'addFunction',
  'removeFunction',
  'setValue',
  'getValue',
  'intArrayFromString',
  'intArrayToString',
  'stringToAscii',
  'registerUiEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'callCanvasResizedCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'currentFullscreenStrategy',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'convertPCtoSourceLocation',
  'doReadv',
  'doWritev',
  'wasiRightsToMuslOFlags',
  'wasiOFlagsToMuslOFlags',
  'safeClearTimeout',
  'setImmediateWrapped',
  'clearImmediateWrapped',
  'registerPostMainLoop',
  'registerPreMainLoop',
  'getPromise',
  'makePromise',
  'addPromise',
  'idsToPromises',
  'makePromiseCallback',
  'Browser_asyncPrepareDataCounter',
  'arraySum',
  'addDays',
  'getSocketFromFD',
  'getSocketAddress',
  'FS_createPreloadedFile',
  'FS_preloadFile',
  'FS_modeStringToFlags',
  'FS_getMode',
  'FS_fileDataToTypedArray',
  'FS_stdin_getChar',
  'FS_mkdirTree',
  '_setNetworkCallback',
  'emscriptenWebGLGetUniform',
  'emscriptenWebGLGetVertexAttrib',
  'writeGLArray',
  'registerWebGlEventCallback',
  'emscriptenWebGLGetIndexed',
  'writeStringToMemory',
  'writeAsciiToMemory',
  'allocateUTF8',
  'allocateUTF8OnStack',
  'stackTrace',
  'getNativeTypeSize',
  'getInheritedInstanceCount',
  'getLiveInheritedInstances',
  'getFunctionArgsName',
  'requireRegisteredType',
  'createJsInvokerSignature',
  'getEnumValueType',
  'PureVirtualError',
  'getBasestPointer',
  'registerInheritedInstance',
  'unregisterInheritedInstance',
  'getInheritedInstance',
  'enumReadValueFromPointer',
  'installIndexedIterator',
  'genericPointerToWireType',
  'constNoSmartPtrRawPointerToWireType',
  'nonConstNoSmartPtrRawPointerToWireType',
  'init_RegisteredPointer',
  'RegisteredPointer',
  'RegisteredPointer_fromWireType',
  'runDestructor',
  'releaseClassHandle',
  'detachFinalizer',
  'attachFinalizer',
  'makeClassHandle',
  'init_ClassHandle',
  'ClassHandle',
  'throwInstanceAlreadyDeleted',
  'flushPendingDeletes',
  'setDelayFunction',
  'RegisteredClass',
  'shallowCopyInternalPointer',
  'downcastPointer',
  'upcastPointer',
  'validateThis',
  'char_0',
  'char_9',
  'makeLegalFunctionName',
  'count_emval_handles',
  'getStringOrSymbol',
  'emval_returnValue',
  'emval_lookupTypes',
  'emval_addMethodCaller',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)

  var unexportedSymbols = [
  'run',
  'out',
  'err',
  'callMain',
  'abort',
  'wasmExports',
  'writeI53ToI64',
  'readI53FromI64',
  'readI53FromU64',
  'INT53_MAX',
  'INT53_MIN',
  'bigintToI53Checked',
  'HEAP8',
  'HEAP16',
  'HEAPU16',
  'HEAPU32',
  'HEAP64',
  'HEAPU64',
  'stackSave',
  'stackRestore',
  'stackAlloc',
  'createNamedFunction',
  'ptrToString',
  'exitJS',
  'getHeapMax',
  'abortOnCannotGrowMemory',
  'ENV',
  'ERRNO_CODES',
  'DNS',
  'Protocols',
  'timers',
  'warnOnce',
  'readEmAsmArgsArray',
  'readEmAsmArgs',
  'runEmAsmFunction',
  'runMainThreadEmAsm',
  'jstoi_q',
  'getExecutableName',
  'handleException',
  'keepRuntimeAlive',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'HandleAllocator',
  'wasmTable',
  'wasmMemory',
  'noExitRuntime',
  'addRunDependency',
  'removeRunDependency',
  'addOnPreRun',
  'addOnExit',
  'addOnPostRun',
  'freeTableIndexes',
  'functionsInTableMap',
  'PATH',
  'PATH_FS',
  'UTF8Decoder',
  'UTF8ArrayToString',
  'stringToUTF8Array',
  'AsciiToString',
  'UTF16Decoder',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'stringToNewUTF8',
  'stringToUTF8OnStack',
  'writeArrayToMemory',
  'JSEvents',
  'registerKeyEventCallback',
  'specialHTMLTargets',
  'maybeCStringToJsString',
  'findEventTarget',
  'findCanvasEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerFocusEventCallback',
  'restoreOldWindowedStyle',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'setCanvasElementSizeCallingThread',
  'setCanvasElementSizeMainThread',
  'getCanvasSizeCallingThread',
  'getCanvasSizeMainThread',
  'jsStackTrace',
  'getCallstack',
  'UNWIND_CACHE',
  'ExitStatus',
  'getEnvStrings',
  'checkWasiClock',
  'initRandomFill',
  'randomFill',
  'safeSetTimeout',
  'safeRequestAnimationFrame',
  'emSetImmediate',
  'emClearImmediate',
  'promiseMap',
  'Browser',
  'requestFullscreen',
  'setCanvasSize',
  'createContext',
  'wget',
  'MONTH_DAYS_REGULAR',
  'MONTH_DAYS_LEAP',
  'MONTH_DAYS_REGULAR_CUMULATIVE',
  'MONTH_DAYS_LEAP_CUMULATIVE',
  'isLeapYear',
  'ydayFromDate',
  'SYSCALLS',
  'preloadPlugins',
  'FS_stdin_getChar_buffer',
  'FS_unlink',
  'FS_createPath',
  'FS_createDevice',
  'FS_readFile',
  'FS',
  'FS_root',
  'FS_mounts',
  'FS_devices',
  'FS_streams',
  'FS_nextInode',
  'FS_nameTable',
  'FS_currentPath',
  'FS_initialized',
  'FS_ignorePermissions',
  'FS_syncFSRequests',
  'FS_lookupPath',
  'FS_getPath',
  'FS_hashName',
  'FS_hashAddNode',
  'FS_hashRemoveNode',
  'FS_lookupNode',
  'FS_createNode',
  'FS_destroyNode',
  'FS_isRoot',
  'FS_isMountpoint',
  'FS_isFile',
  'FS_isDir',
  'FS_isLink',
  'FS_isChrdev',
  'FS_isBlkdev',
  'FS_isFIFO',
  'FS_isSocket',
  'FS_flagsToPermissionString',
  'FS_nodePermissions',
  'FS_mayLookup',
  'FS_mayCreate',
  'FS_mayDelete',
  'FS_mayOpen',
  'FS_checkOpExists',
  'FS_nextfd',
  'FS_getStreamChecked',
  'FS_getStream',
  'FS_createStream',
  'FS_closeStream',
  'FS_dupStream',
  'FS_doSetAttr',
  'FS_chrdev_stream_ops',
  'FS_major',
  'FS_minor',
  'FS_makedev',
  'FS_registerDevice',
  'FS_getDevice',
  'FS_getMounts',
  'FS_syncfs',
  'FS_mount',
  'FS_unmount',
  'FS_lookup',
  'FS_mknod',
  'FS_statfs',
  'FS_statfsStream',
  'FS_statfsNode',
  'FS_create',
  'FS_mkdir',
  'FS_mkdev',
  'FS_symlink',
  'FS_link',
  'FS_rename',
  'FS_rmdir',
  'FS_readdir',
  'FS_readlink',
  'FS_stat',
  'FS_fstat',
  'FS_lstat',
  'FS_doChmod',
  'FS_chmod',
  'FS_lchmod',
  'FS_fchmod',
  'FS_doChown',
  'FS_chown',
  'FS_lchown',
  'FS_fchown',
  'FS_doTruncate',
  'FS_truncate',
  'FS_ftruncate',
  'FS_utime',
  'FS_open',
  'FS_close',
  'FS_isClosed',
  'FS_llseek',
  'FS_read',
  'FS_write',
  'FS_mmap',
  'FS_msync',
  'FS_ioctl',
  'FS_writeFile',
  'FS_cwd',
  'FS_chdir',
  'FS_createDefaultDirectories',
  'FS_createDefaultDevices',
  'FS_createSpecialDirectories',
  'FS_createStandardStreams',
  'FS_staticInit',
  'FS_init',
  'FS_quit',
  'FS_analyzePath',
  'FS_createFile',
  'FS_createDataFile',
  'FS_forceLoadFile',
  'FS_createLazyFile',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'miniTempWebGLIntBuffers',
  'heapObjectForWebGLType',
  'toTypedArrayIndex',
  'webgl_enable_WEBGL_multi_draw',
  'webgl_enable_EXT_polygon_offset_clamp',
  'webgl_enable_EXT_clip_control',
  'webgl_enable_WEBGL_polygon_mode',
  'GL',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'colorChannelsInGlTextureFormat',
  'emscriptenWebGLGetTexPixelData',
  'webglGetProgramUniformLocation',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  '__glGetActiveAttribOrUniform',
  'AL',
  'GLUT',
  'EGL',
  'GLEW',
  'IDBStore',
  'runAndAbortIfError',
  'Asyncify',
  'Fibers',
  'SDL',
  'SDL_gfx',
  'waitAsyncPolyfilled',
  'webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance',
  'webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance',
  'print',
  'printErr',
  'jstoi_s',
  'PThread',
  'terminateWorker',
  'cleanupThread',
  'registerTLSInit',
  'spawnThread',
  'exitOnMainThread',
  'proxyToMainThread',
  'proxiedJSCallArgs',
  'invokeEntryPoint',
  'checkMailbox',
  'InternalError',
  'BindingError',
  'throwInternalError',
  'throwBindingError',
  'registeredTypes',
  'awaitingDependencies',
  'typeDependencies',
  'tupleRegistrations',
  'structRegistrations',
  'sharedRegisterType',
  'whenDependentTypesAreResolved',
  'getTypeName',
  'getFunctionName',
  'heap32VectorToArray',
  'usesDestructorStack',
  'argsUseStackAlloc',
  'checkArgCount',
  'getRequiredArgCount',
  'createJsInvoker',
  'UnboundTypeError',
  'EmValType',
  'EmValOptionalType',
  'throwUnboundTypeError',
  'ensureOverloadTable',
  'exposePublicSymbol',
  'replacePublicSymbol',
  'embindRepr',
  'registeredInstances',
  'registeredPointers',
  'registerType',
  'integerReadValueFromPointer',
  'floatReadValueFromPointer',
  'assertIntegerRange',
  'readPointer',
  'runDestructors',
  'craftInvokerFunction',
  'embind__requireFunction',
  'finalizationRegistry',
  'deletionQueue',
  'delayFunction',
  'emval_freelist',
  'emval_handles',
  'emval_symbols',
  'Emval',
  'emval_methodCallers',
  'webSockets',
  'WS',
  'Fetch',
  'fetchDeleteCachedData',
  'fetchLoadCachedData',
  'fetchCacheData',
  'fetchXHR',
  'rbxLog',
  'rbxOnce',
  'rbxFibers',
  'rbxFiberSave',
  'rbxFiberRestore',
  'rbxFiberPark',
  'rbxFiberWake',
  'rbxText',
  'rbxConvertShader',
  'rbxMapped',
  'rbxRna',
  'rbxRnaCall',
  'rbxRnaPump',
  'rbxRnaDeliver',
  'rbxRnaReadStream',
  'rbxRnaAddStream',
  'rbxRnaAccept',
  'rbxRnaClosed',
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);

  // End runtime exports
  // Begin JS library exports
  // End JS library exports

// end include: postlibrary.js


// proxiedFunctionTable specifies the list of functions that can be called
// either synchronously or asynchronously from other threads in postMessage()d
// or internally queued events. This way a pthread in a Worker can synchronously
// access e.g. the DOM on the main thread.
var proxiedFunctionTable = [
  _proc_exit,
  exitOnMainThread,
  pthreadCreateProxied,
  __msync_js,
  _emscripten_exit_pointerlock,
  getCanvasSizeMainThread,
  _emscripten_get_device_pixel_ratio,
  _emscripten_get_element_css_size,
  _emscripten_get_gamepad_status,
  _emscripten_get_num_gamepads,
  _emscripten_request_pointerlock,
  _emscripten_sample_gamepad_data,
  _emscripten_set_blur_callback_on_thread,
  setCanvasElementSizeMainThread,
  _emscripten_set_focus_callback_on_thread,
  _emscripten_set_gamepadconnected_callback_on_thread,
  _emscripten_set_gamepaddisconnected_callback_on_thread,
  _emscripten_set_keydown_callback_on_thread,
  _emscripten_set_keyup_callback_on_thread,
  _emscripten_set_mousedown_callback_on_thread,
  _emscripten_set_mouseenter_callback_on_thread,
  _emscripten_set_mouseleave_callback_on_thread,
  _emscripten_set_mousemove_callback_on_thread,
  _emscripten_set_mouseup_callback_on_thread,
  _emscripten_set_pointerlockerror_callback_on_thread,
  _emscripten_set_touchcancel_callback_on_thread,
  _emscripten_set_touchend_callback_on_thread,
  _emscripten_set_touchmove_callback_on_thread,
  _emscripten_set_touchstart_callback_on_thread,
  _emscripten_set_wheel_callback_on_thread,
  _emscripten_websocket_close,
  _emscripten_websocket_delete,
  _emscripten_websocket_new,
  _emscripten_websocket_send_binary,
  _emscripten_websocket_send_utf8_text,
  _emscripten_websocket_set_onclose_callback_on_thread,
  _emscripten_websocket_set_onerror_callback_on_thread,
  _emscripten_websocket_set_onmessage_callback_on_thread,
  _emscripten_websocket_set_onopen_callback_on_thread,
  _environ_get,
  _environ_sizes_get
];

function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
  ignoredModuleProp('logReadFiles');
  ignoredModuleProp('loadSplitModule');
  ignoredModuleProp('onMalloc');
  ignoredModuleProp('onRealloc');
  ignoredModuleProp('onFree');
  ignoredModuleProp('onSbrkGrow');
  ignoredModuleProp('onCOSCacheHit');
  ignoredModuleProp('onCOSCacheMiss');
  ignoredModuleProp('onCOSStore');
  ignoredModuleProp('GL_MAX_TEXTURE_IMAGE_UNITS');
  ignoredModuleProp('SDL_canPlayWithWebAudio');
  ignoredModuleProp('SDL_numSimultaneouslyQueuedBuffers');
  ignoredModuleProp('freePreloadedMediaOnUse');
  ignoredModuleProp('preinitializedWebGLContext');
  ignoredModuleProp('keyboardListeningElement');
  ignoredModuleProp('doNotCaptureKeyboard');
  ignoredModuleProp('extraStackTrace');
  ignoredModuleProp('preloadPlugins');
  ignoredModuleProp('preMainLoop');
  ignoredModuleProp('postMainLoop');
  ignoredModuleProp('forcedAspectRatio');
  ignoredModuleProp('mainScriptUrlOrBlob');
  ignoredModuleProp('onFullScreen');
  ignoredModuleProp('wasmBinary');
}

var rbxUnknownEmAsmSeen = {};
function rbxEmAsm(addr) {
  var f = ASM_CONSTS[addr];
  if (f) return f;
  if (!rbxUnknownEmAsmSeen[addr]) { rbxUnknownEmAsmSeen[addr] = 1; console.warn('[rbx] unknown EM_ASM', addr); }
  return () => 0;
}
var ASM_CONSTS = {
  9460223: () => { console.log('[rbx-asm] 9460223'); },  
 9460267: ($0) => { if (window.__onExperienceJoined) window.__onExperienceJoined($0); },  
 9460337: ($0) => { console.warn('[rbx] joinGameFailed state', $0); if (window.__resolveGameExit) window.__resolveGameExit({reason: 'join_failed', statusCode: $0}); },  
 9460410: () => { console.log('[rbx-asm] teleport done'); },  
 9460461: ($0) => { if (window.__onExperienceLoaded) window.__onExperienceLoaded($0); },  
 9460531: ($0) => { console.warn('[rbx] teleportFailed state', $0); },  
 9460608: () => { console.log('[rbx-asm] app notification (leave)'); },  
 9460665: () => { return performance.now(); },  
 9460695: ($0) => { if (window.__onExperienceJoined) window.__onExperienceJoined($0); },  
 9460761: () => { return window.__wasmPreInitTime || performance.now(); },  
 9460803: ($0, $1, $2) => { console.log('[rbx] status', $0, $1, UTF8ToString($2)); },  
 9461089: () => { console.log('[rbx] main() entered'); return 0; },  
 9461254: ($0, $1) => { console.log('[rbx] webview tab', UTF8ToString($0), UTF8ToString($1)); return 0; },  
 9461872: () => { return 0; },  
 9462302: ($0, $1) => { console.log('[rbx] webview', UTF8ToString($0), UTF8ToString($1)); return 0; },  
 9463493: () => { return 0; },  
 9467882: () => { return 0; },  
 9473359: () => { return 0; },  
 9473473: () => { try { if (document.fullscreenElement) document.exitFullscreen(); else Module.canvas.requestFullscreen(); } catch (e) {} return 0; },  
 9473799: ($0, $1) => { console.error('[rbx] crash', UTF8ToString($0), UTF8ToString($1)); if (window.__resolveGameExit) window.__resolveGameExit({reason: 'crash', errorType: UTF8ToString($0), errorMessage: UTF8ToString($1)}); return 0; },  
 9473915: ($0, $1) => { console.log('[rbx-asm] 9473915', $0, $1); return 0; },  
 9474377: () => { return 1; },  
 9474666: () => { return 0; },  
 9475049: () => { return 0; },  
 9475469: () => { return 0; },  
 9475884: () => { return 0; },  
 9477174: () => { return 0; },  
 9477216: () => { return 0; },  
 9477609: () => { return 0; },  
 9477671: () => { return 48000; },  
 9477872: () => { return 0; },  
 9478083: () => { return 0; },  
 9478501: () => { return 0; },  
 9478719: () => { return 0; },  
 9478991: () => { return 0; },  
 9479515: () => { return 0; },  
 9479790: () => { return 0; },  
 9479877: () => { return 0; },  
 9480137: () => { return 48000; },  
 9480338: () => { return 0; },  
 9480544: () => { return 0; },  
 9480597: ($0) => { console.log('[rbx-asm] 9480597', UTF8ToString($0)); return 0; },  
 9480694: ($0, $1, $2, $3) => { console.log('[rbx-asm] 9480694', UTF8ToString($0), UTF8ToString($1), $2, $3); return 0; },  
 9481103: () => { return 0; },  
 9481139: () => { return 0; },  
 9481915: () => { return 0; }
};

// Imports from the Wasm binary.
var ___getTypeName = makeInvalidEarlyAccess('___getTypeName');
var __embind_initialize_bindings = makeInvalidEarlyAccess('__embind_initialize_bindings');
var _rbx_fs_register_asset = Module['_rbx_fs_register_asset'] = makeInvalidEarlyAccess('_rbx_fs_register_asset');
var _rbx_fs_add_file = Module['_rbx_fs_add_file'] = makeInvalidEarlyAccess('_rbx_fs_add_file');
var _malloc = Module['_malloc'] = makeInvalidEarlyAccess('_malloc');
var _free = Module['_free'] = makeInvalidEarlyAccess('_free');
var _rbx_fs_set_base_url = Module['_rbx_fs_set_base_url'] = makeInvalidEarlyAccess('_rbx_fs_set_base_url');
var _rbx_fs_preload_asset = Module['_rbx_fs_preload_asset'] = makeInvalidEarlyAccess('_rbx_fs_preload_asset');
var _realloc = Module['_realloc'] = makeInvalidEarlyAccess('_realloc');
var _rbxJspiJsAllocatorEnter = Module['_rbxJspiJsAllocatorEnter'] = makeInvalidEarlyAccess('_rbxJspiJsAllocatorEnter');
var _rbxJspiJsAllocatorLeave = Module['_rbxJspiJsAllocatorLeave'] = makeInvalidEarlyAccess('_rbxJspiJsAllocatorLeave');
var _init_ring_buffers = Module['_init_ring_buffers'] = makeInvalidEarlyAccess('_init_ring_buffers');
var _htons = Module['_htons'] = makeInvalidEarlyAccess('_htons');
var _main = Module['_main'] = makeInvalidEarlyAccess('_main');
var _main_loop_iteration = Module['_main_loop_iteration'] = makeInvalidEarlyAccess('_main_loop_iteration');
var _pthread_self = Module['_pthread_self'] = makeInvalidEarlyAccess('_pthread_self');
var _webview_on_message = Module['_webview_on_message'] = makeInvalidEarlyAccess('_webview_on_message');
var _webview_on_close = Module['_webview_on_close'] = makeInvalidEarlyAccess('_webview_on_close');
var _on_return_pressed = Module['_on_return_pressed'] = makeInvalidEarlyAccess('_on_return_pressed');
var _update_virtual_keyboard_bounds = Module['_update_virtual_keyboard_bounds'] = makeInvalidEarlyAccess('_update_virtual_keyboard_bounds');
var _on_virtual_text_changed = Module['_on_virtual_text_changed'] = makeInvalidEarlyAccess('_on_virtual_text_changed');
var _get_stack_ptr = Module['_get_stack_ptr'] = makeInvalidEarlyAccess('_get_stack_ptr');
var _set_stack_ptr = Module['_set_stack_ptr'] = makeInvalidEarlyAccess('_set_stack_ptr');
var _get_stack_base = Module['_get_stack_base'] = makeInvalidEarlyAccess('_get_stack_base');
var _get_stack_end = Module['_get_stack_end'] = makeInvalidEarlyAccess('_get_stack_end');
var _set_stack_limits = Module['_set_stack_limits'] = makeInvalidEarlyAccess('_set_stack_limits');
var _emscripten_stack_set_limits = Module['_emscripten_stack_set_limits'] = makeInvalidEarlyAccess('_emscripten_stack_set_limits');
var _fiber_entry = Module['_fiber_entry'] = makeInvalidEarlyAccess('_fiber_entry');
var _wasmCrashCallback = Module['_wasmCrashCallback'] = makeInvalidEarlyAccess('_wasmCrashCallback');
var _FMOD_JS_MixerSlowpathFunction = Module['_FMOD_JS_MixerSlowpathFunction'] = makeInvalidEarlyAccess('_FMOD_JS_MixerSlowpathFunction');
var _FMOD_JS_MixerFastpathFunction = Module['_FMOD_JS_MixerFastpathFunction'] = makeInvalidEarlyAccess('_FMOD_JS_MixerFastpathFunction');
var _FMOD_JS_MixFunction = Module['_FMOD_JS_MixFunction'] = makeInvalidEarlyAccess('_FMOD_JS_MixFunction');
var __emscripten_tls_init = makeInvalidEarlyAccess('__emscripten_tls_init');
var __emscripten_run_callback_on_thread = Module['__emscripten_run_callback_on_thread'] = makeInvalidEarlyAccess('__emscripten_run_callback_on_thread');
var __emscripten_thread_init = Module['__emscripten_thread_init'] = makeInvalidEarlyAccess('__emscripten_thread_init');
var ___set_thread_state = Module['___set_thread_state'] = makeInvalidEarlyAccess('___set_thread_state');
var __emscripten_thread_crashed = makeInvalidEarlyAccess('__emscripten_thread_crashed');
var __emscripten_run_js_on_main_thread_done = Module['__emscripten_run_js_on_main_thread_done'] = makeInvalidEarlyAccess('__emscripten_run_js_on_main_thread_done');
var __emscripten_run_js_on_main_thread = Module['__emscripten_run_js_on_main_thread'] = makeInvalidEarlyAccess('__emscripten_run_js_on_main_thread');
var __emscripten_thread_free_data = makeInvalidEarlyAccess('__emscripten_thread_free_data');
var __emscripten_thread_exit = Module['__emscripten_thread_exit'] = makeInvalidEarlyAccess('__emscripten_thread_exit');
var __emscripten_check_mailbox = Module['__emscripten_check_mailbox'] = makeInvalidEarlyAccess('__emscripten_check_mailbox');
var ___trap = Module['___trap'] = makeInvalidEarlyAccess('___trap');
var __emscripten_stack_restore = Module['__emscripten_stack_restore'] = makeInvalidEarlyAccess('__emscripten_stack_restore');
var __emscripten_stack_alloc = makeInvalidEarlyAccess('__emscripten_stack_alloc');
var _emscripten_stack_get_current = Module['_emscripten_stack_get_current'] = makeInvalidEarlyAccess('_emscripten_stack_get_current');
var __indirect_function_table = makeInvalidEarlyAccess('__indirect_function_table');
var wasmTable = makeInvalidEarlyAccess('wasmTable');

function assignWasmExports(wasmExports) {
  assert(typeof wasmExports['__getTypeName'] !== 'undefined', 'missing Wasm export: __getTypeName');
  assert(typeof wasmExports['_embind_initialize_bindings'] !== 'undefined', 'missing Wasm export: _embind_initialize_bindings');
  assert(typeof wasmExports['rbx_fs_register_asset'] !== 'undefined', 'missing Wasm export: rbx_fs_register_asset');
  assert(typeof wasmExports['rbx_fs_add_file'] !== 'undefined', 'missing Wasm export: rbx_fs_add_file');
  assert(typeof wasmExports['malloc'] !== 'undefined', 'missing Wasm export: malloc');
  assert(typeof wasmExports['free'] !== 'undefined', 'missing Wasm export: free');
  assert(typeof wasmExports['rbx_fs_set_base_url'] !== 'undefined', 'missing Wasm export: rbx_fs_set_base_url');
  assert(typeof wasmExports['rbx_fs_preload_asset'] !== 'undefined', 'missing Wasm export: rbx_fs_preload_asset');
  assert(typeof wasmExports['realloc'] !== 'undefined', 'missing Wasm export: realloc');
  assert(typeof wasmExports['rbxJspiJsAllocatorEnter'] !== 'undefined', 'missing Wasm export: rbxJspiJsAllocatorEnter');
  assert(typeof wasmExports['rbxJspiJsAllocatorLeave'] !== 'undefined', 'missing Wasm export: rbxJspiJsAllocatorLeave');
  assert(typeof wasmExports['init_ring_buffers'] !== 'undefined', 'missing Wasm export: init_ring_buffers');
  assert(typeof wasmExports['htons'] !== 'undefined', 'missing Wasm export: htons');
  assert(typeof wasmExports['__main_argc_argv'] !== 'undefined', 'missing Wasm export: __main_argc_argv');
  assert(typeof wasmExports['main_loop_iteration'] !== 'undefined', 'missing Wasm export: main_loop_iteration');
  assert(typeof wasmExports['pthread_self'] !== 'undefined', 'missing Wasm export: pthread_self');
  assert(typeof wasmExports['webview_on_message'] !== 'undefined', 'missing Wasm export: webview_on_message');
  assert(typeof wasmExports['webview_on_close'] !== 'undefined', 'missing Wasm export: webview_on_close');
  assert(typeof wasmExports['on_return_pressed'] !== 'undefined', 'missing Wasm export: on_return_pressed');
  assert(typeof wasmExports['update_virtual_keyboard_bounds'] !== 'undefined', 'missing Wasm export: update_virtual_keyboard_bounds');
  assert(typeof wasmExports['on_virtual_text_changed'] !== 'undefined', 'missing Wasm export: on_virtual_text_changed');
  assert(typeof wasmExports['get_stack_ptr'] !== 'undefined', 'missing Wasm export: get_stack_ptr');
  assert(typeof wasmExports['set_stack_ptr'] !== 'undefined', 'missing Wasm export: set_stack_ptr');
  assert(typeof wasmExports['get_stack_base'] !== 'undefined', 'missing Wasm export: get_stack_base');
  assert(typeof wasmExports['get_stack_end'] !== 'undefined', 'missing Wasm export: get_stack_end');
  assert(typeof wasmExports['set_stack_limits'] !== 'undefined', 'missing Wasm export: set_stack_limits');
  assert(typeof wasmExports['emscripten_stack_set_limits'] !== 'undefined', 'missing Wasm export: emscripten_stack_set_limits');
  assert(typeof wasmExports['fiber_entry'] !== 'undefined', 'missing Wasm export: fiber_entry');
  assert(typeof wasmExports['wasmCrashCallback'] !== 'undefined', 'missing Wasm export: wasmCrashCallback');
  assert(typeof wasmExports['FMOD_JS_MixerSlowpathFunction'] !== 'undefined', 'missing Wasm export: FMOD_JS_MixerSlowpathFunction');
  assert(typeof wasmExports['FMOD_JS_MixerFastpathFunction'] !== 'undefined', 'missing Wasm export: FMOD_JS_MixerFastpathFunction');
  assert(typeof wasmExports['FMOD_JS_MixFunction'] !== 'undefined', 'missing Wasm export: FMOD_JS_MixFunction');
  assert(typeof wasmExports['_emscripten_tls_init'] !== 'undefined', 'missing Wasm export: _emscripten_tls_init');
  assert(typeof wasmExports['_emscripten_run_callback_on_thread'] !== 'undefined', 'missing Wasm export: _emscripten_run_callback_on_thread');
  assert(typeof wasmExports['_emscripten_thread_init'] !== 'undefined', 'missing Wasm export: _emscripten_thread_init');
  assert(typeof wasmExports['__set_thread_state'] !== 'undefined', 'missing Wasm export: __set_thread_state');
  assert(typeof wasmExports['_emscripten_thread_crashed'] !== 'undefined', 'missing Wasm export: _emscripten_thread_crashed');
  assert(typeof wasmExports['_emscripten_run_js_on_main_thread_done'] !== 'undefined', 'missing Wasm export: _emscripten_run_js_on_main_thread_done');
  assert(typeof wasmExports['_emscripten_run_js_on_main_thread'] !== 'undefined', 'missing Wasm export: _emscripten_run_js_on_main_thread');
  assert(typeof wasmExports['_emscripten_thread_free_data'] !== 'undefined', 'missing Wasm export: _emscripten_thread_free_data');
  assert(typeof wasmExports['_emscripten_thread_exit'] !== 'undefined', 'missing Wasm export: _emscripten_thread_exit');
  assert(typeof wasmExports['_emscripten_check_mailbox'] !== 'undefined', 'missing Wasm export: _emscripten_check_mailbox');
  assert(typeof wasmExports['__trap'] !== 'undefined', 'missing Wasm export: __trap');
  assert(typeof wasmExports['_emscripten_stack_restore'] !== 'undefined', 'missing Wasm export: _emscripten_stack_restore');
  assert(typeof wasmExports['_emscripten_stack_alloc'] !== 'undefined', 'missing Wasm export: _emscripten_stack_alloc');
  assert(typeof wasmExports['emscripten_stack_get_current'] !== 'undefined', 'missing Wasm export: emscripten_stack_get_current');
  assert(typeof wasmExports['__indirect_function_table'] !== 'undefined', 'missing Wasm export: __indirect_function_table');
  ___getTypeName = createExportWrapper('__getTypeName', wasmExports['__getTypeName'], 1);
  __embind_initialize_bindings = createExportWrapper('_embind_initialize_bindings', wasmExports['_embind_initialize_bindings'], 0);
  _rbx_fs_register_asset = Module['_rbx_fs_register_asset'] = createExportWrapper('rbx_fs_register_asset', wasmExports['rbx_fs_register_asset'], 2);
  _rbx_fs_add_file = Module['_rbx_fs_add_file'] = createExportWrapper('rbx_fs_add_file', wasmExports['rbx_fs_add_file'], 3);
  _malloc = Module['_malloc'] = createExportWrapper('malloc', wasmExports['malloc'], 1);
  _free = Module['_free'] = createExportWrapper('free', wasmExports['free'], 1);
  _rbx_fs_set_base_url = Module['_rbx_fs_set_base_url'] = createExportWrapper('rbx_fs_set_base_url', wasmExports['rbx_fs_set_base_url'], 1);
  _rbx_fs_preload_asset = Module['_rbx_fs_preload_asset'] = createExportWrapper('rbx_fs_preload_asset', wasmExports['rbx_fs_preload_asset'], 3);
  _realloc = Module['_realloc'] = createExportWrapper('realloc', wasmExports['realloc'], 2);
  _rbxJspiJsAllocatorEnter = Module['_rbxJspiJsAllocatorEnter'] = createExportWrapper('rbxJspiJsAllocatorEnter', wasmExports['rbxJspiJsAllocatorEnter'], 0);
  _rbxJspiJsAllocatorLeave = Module['_rbxJspiJsAllocatorLeave'] = createExportWrapper('rbxJspiJsAllocatorLeave', wasmExports['rbxJspiJsAllocatorLeave'], 0);
  _init_ring_buffers = Module['_init_ring_buffers'] = createExportWrapper('init_ring_buffers', wasmExports['init_ring_buffers'], 0);
  _htons = Module['_htons'] = createExportWrapper('htons', wasmExports['htons'], 1);
  _main = Module['_main'] = createExportWrapper('__main_argc_argv', wasmExports['__main_argc_argv'], 2);
  _main_loop_iteration = Module['_main_loop_iteration'] = createExportWrapper('main_loop_iteration', wasmExports['main_loop_iteration'], 0);
  _pthread_self = Module['_pthread_self'] = wasmExports['pthread_self'];
  _webview_on_message = Module['_webview_on_message'] = createExportWrapper('webview_on_message', wasmExports['webview_on_message'], 0);
  _webview_on_close = Module['_webview_on_close'] = createExportWrapper('webview_on_close', wasmExports['webview_on_close'], 0);
  _on_return_pressed = Module['_on_return_pressed'] = createExportWrapper('on_return_pressed', wasmExports['on_return_pressed'], 0);
  _update_virtual_keyboard_bounds = Module['_update_virtual_keyboard_bounds'] = createExportWrapper('update_virtual_keyboard_bounds', wasmExports['update_virtual_keyboard_bounds'], 4);
  _on_virtual_text_changed = Module['_on_virtual_text_changed'] = createExportWrapper('on_virtual_text_changed', wasmExports['on_virtual_text_changed'], 3);
  _get_stack_ptr = Module['_get_stack_ptr'] = createExportWrapper('get_stack_ptr', wasmExports['get_stack_ptr'], 0);
  _set_stack_ptr = Module['_set_stack_ptr'] = createExportWrapper('set_stack_ptr', wasmExports['set_stack_ptr'], 1);
  _get_stack_base = Module['_get_stack_base'] = createExportWrapper('get_stack_base', wasmExports['get_stack_base'], 0);
  _get_stack_end = Module['_get_stack_end'] = createExportWrapper('get_stack_end', wasmExports['get_stack_end'], 0);
  _set_stack_limits = Module['_set_stack_limits'] = createExportWrapper('set_stack_limits', wasmExports['set_stack_limits'], 2);
  _emscripten_stack_set_limits = Module['_emscripten_stack_set_limits'] = wasmExports['emscripten_stack_set_limits'];
  _fiber_entry = Module['_fiber_entry'] = createExportWrapper('fiber_entry', wasmExports['fiber_entry'], 3);
  _wasmCrashCallback = Module['_wasmCrashCallback'] = createExportWrapper('wasmCrashCallback', wasmExports['wasmCrashCallback'], 3);
  _FMOD_JS_MixerSlowpathFunction = Module['_FMOD_JS_MixerSlowpathFunction'] = createExportWrapper('FMOD_JS_MixerSlowpathFunction', wasmExports['FMOD_JS_MixerSlowpathFunction'], 0);
  _FMOD_JS_MixerFastpathFunction = Module['_FMOD_JS_MixerFastpathFunction'] = createExportWrapper('FMOD_JS_MixerFastpathFunction', wasmExports['FMOD_JS_MixerFastpathFunction'], 1);
  _FMOD_JS_MixFunction = Module['_FMOD_JS_MixFunction'] = createExportWrapper('FMOD_JS_MixFunction', wasmExports['FMOD_JS_MixFunction'], 1);
  __emscripten_tls_init = createExportWrapper('_emscripten_tls_init', wasmExports['_emscripten_tls_init'], 0);
  __emscripten_run_callback_on_thread = Module['__emscripten_run_callback_on_thread'] = createExportWrapper('_emscripten_run_callback_on_thread', wasmExports['_emscripten_run_callback_on_thread'], 6);
  __emscripten_thread_init = Module['__emscripten_thread_init'] = createExportWrapper('_emscripten_thread_init', wasmExports['_emscripten_thread_init'], 6);
  ___set_thread_state = Module['___set_thread_state'] = createExportWrapper('__set_thread_state', wasmExports['__set_thread_state'], 4);
  __emscripten_thread_crashed = createExportWrapper('_emscripten_thread_crashed', wasmExports['_emscripten_thread_crashed'], 0);
  __emscripten_run_js_on_main_thread_done = Module['__emscripten_run_js_on_main_thread_done'] = createExportWrapper('_emscripten_run_js_on_main_thread_done', wasmExports['_emscripten_run_js_on_main_thread_done'], 3);
  __emscripten_run_js_on_main_thread = Module['__emscripten_run_js_on_main_thread'] = createExportWrapper('_emscripten_run_js_on_main_thread', wasmExports['_emscripten_run_js_on_main_thread'], 5);
  __emscripten_thread_free_data = createExportWrapper('_emscripten_thread_free_data', wasmExports['_emscripten_thread_free_data'], 1);
  __emscripten_thread_exit = Module['__emscripten_thread_exit'] = createExportWrapper('_emscripten_thread_exit', wasmExports['_emscripten_thread_exit'], 1);
  __emscripten_check_mailbox = Module['__emscripten_check_mailbox'] = createExportWrapper('_emscripten_check_mailbox', wasmExports['_emscripten_check_mailbox'], 0);
  ___trap = Module['___trap'] = wasmExports['__trap'];
  __emscripten_stack_restore = Module['__emscripten_stack_restore'] = wasmExports['_emscripten_stack_restore'];
  __emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc'];
  _emscripten_stack_get_current = Module['_emscripten_stack_get_current'] = wasmExports['emscripten_stack_get_current'];
  __indirect_function_table = wasmTable = wasmExports['__indirect_function_table'];
}

  var wasmImports;
  function assignWasmImports() {
    wasmImports = {
    /** @export */
    HaveOffsetConverter: _HaveOffsetConverter,
    /** @export */
    RBX_restoreWasmStackTraceLimit: _RBX_restoreWasmStackTraceLimit,
    /** @export */
    RBX_setFullWasmStackTrace: _RBX_setFullWasmStackTrace,
    /** @export */
    __assert_fail: ___assert_fail,
    /** @export */
    __asyncjs__create_suspended_fiber_js: ___asyncjs__create_suspended_fiber_js,
    /** @export */
    __asyncjs__fiber_transfer_js: ___asyncjs__fiber_transfer_js,
    /** @export */
    __asyncjs__rbxFutexWaitMainJspi: ___asyncjs__rbxFutexWaitMainJspi,
    /** @export */
    __asyncjs__rbx_opfs_clear: ___asyncjs__rbx_opfs_clear,
    /** @export */
    __asyncjs__rbx_opfs_contains: ___asyncjs__rbx_opfs_contains,
    /** @export */
    __asyncjs__rbx_opfs_file_size: ___asyncjs__rbx_opfs_file_size,
    /** @export */
    __asyncjs__rbx_opfs_get: ___asyncjs__rbx_opfs_get,
    /** @export */
    __asyncjs__rbx_opfs_get_buffer: ___asyncjs__rbx_opfs_get_buffer,
    /** @export */
    __asyncjs__rbx_opfs_get_buffer_offset: ___asyncjs__rbx_opfs_get_buffer_offset,
    /** @export */
    __asyncjs__rbx_opfs_get_offset: ___asyncjs__rbx_opfs_get_offset,
    /** @export */
    __asyncjs__rbx_opfs_list: ___asyncjs__rbx_opfs_list,
    /** @export */
    __asyncjs__rbx_opfs_list_sized: ___asyncjs__rbx_opfs_list_sized,
    /** @export */
    __asyncjs__rbx_opfs_open: ___asyncjs__rbx_opfs_open,
    /** @export */
    __asyncjs__rbx_opfs_remove: ___asyncjs__rbx_opfs_remove,
    /** @export */
    __asyncjs__rbx_opfs_remove_batch: ___asyncjs__rbx_opfs_remove_batch,
    /** @export */
    __asyncjs__rbx_opfs_set: ___asyncjs__rbx_opfs_set,
    /** @export */
    __call_sighandler: ___call_sighandler,
    /** @export */
    __pthread_create_js: ___pthread_create_js,
    /** @export */
    __syscall_getegid32: ___syscall_getegid32,
    /** @export */
    __syscall_geteuid32: ___syscall_geteuid32,
    /** @export */
    __syscall_getgid32: ___syscall_getgid32,
    /** @export */
    __syscall_getuid32: ___syscall_getuid32,
    /** @export */
    _abort_js: __abort_js,
    /** @export */
    _embind_register_bigint: __embind_register_bigint,
    /** @export */
    _embind_register_bool: __embind_register_bool,
    /** @export */
    _embind_register_emval: __embind_register_emval,
    /** @export */
    _embind_register_float: __embind_register_float,
    /** @export */
    _embind_register_function: __embind_register_function,
    /** @export */
    _embind_register_integer: __embind_register_integer,
    /** @export */
    _embind_register_memory_view: __embind_register_memory_view,
    /** @export */
    _embind_register_std_string: __embind_register_std_string,
    /** @export */
    _embind_register_std_wstring: __embind_register_std_wstring,
    /** @export */
    _embind_register_void: __embind_register_void,
    /** @export */
    _emscripten_fetch_get_response_headers: __emscripten_fetch_get_response_headers,
    /** @export */
    _emscripten_fetch_get_response_headers_length: __emscripten_fetch_get_response_headers_length,
    /** @export */
    _emscripten_init_main_thread_js: __emscripten_init_main_thread_js,
    /** @export */
    _emscripten_log_formatted: __emscripten_log_formatted,
    /** @export */
    _emscripten_notify_mailbox_postmessage: __emscripten_notify_mailbox_postmessage,
    /** @export */
    _emscripten_receive_on_main_thread_js: __emscripten_receive_on_main_thread_js,
    /** @export */
    _emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear,
    /** @export */
    _emscripten_thread_cleanup: __emscripten_thread_cleanup,
    /** @export */
    _emscripten_thread_mailbox_await: __emscripten_thread_mailbox_await,
    /** @export */
    _emscripten_thread_set_strongref: __emscripten_thread_set_strongref,
    /** @export */
    _gmtime_js: __gmtime_js,
    /** @export */
    _localtime_js: __localtime_js,
    /** @export */
    _mktime_js: __mktime_js,
    /** @export */
    _msync_js: __msync_js,
    /** @export */
    _tzset_js: __tzset_js,
    /** @export */
    applyPendingCanvasResize: _applyPendingCanvasResize,
    /** @export */
    blur_text_input: _blur_text_input,
    /** @export */
    choose_current_text_input: _choose_current_text_input,
    /** @export */
    clock_time_get: _clock_time_get,
    /** @export */
    copy_pending_text: _copy_pending_text,
    /** @export */
    emscripten_asm_const_async_on_main_thread: _emscripten_asm_const_async_on_main_thread,
    /** @export */
    emscripten_asm_const_double: _emscripten_asm_const_double,
    /** @export */
    emscripten_asm_const_int: _emscripten_asm_const_int,
    /** @export */
    emscripten_asm_const_int_sync_on_main_thread: _emscripten_asm_const_int_sync_on_main_thread,
    /** @export */
    emscripten_async_call: _emscripten_async_call,
    /** @export */
    emscripten_check_blocking_allowed: _emscripten_check_blocking_allowed,
    /** @export */
    emscripten_console_error: _emscripten_console_error,
    /** @export */
    emscripten_console_log: _emscripten_console_log,
    /** @export */
    emscripten_console_warn: _emscripten_console_warn,
    /** @export */
    emscripten_date_now: _emscripten_date_now,
    /** @export */
    emscripten_errn: _emscripten_errn,
    /** @export */
    emscripten_exit_pointerlock: _emscripten_exit_pointerlock,
    /** @export */
    emscripten_exit_with_live_runtime: _emscripten_exit_with_live_runtime,
    /** @export */
    emscripten_fetch_free: _emscripten_fetch_free,
    /** @export */
    emscripten_get_canvas_element_size: _emscripten_get_canvas_element_size,
    /** @export */
    emscripten_get_device_pixel_ratio: _emscripten_get_device_pixel_ratio,
    /** @export */
    emscripten_get_element_css_size: _emscripten_get_element_css_size,
    /** @export */
    emscripten_get_gamepad_status: _emscripten_get_gamepad_status,
    /** @export */
    emscripten_get_heap_max: _emscripten_get_heap_max,
    /** @export */
    emscripten_get_now: _emscripten_get_now,
    /** @export */
    emscripten_get_num_gamepads: _emscripten_get_num_gamepads,
    /** @export */
    emscripten_num_logical_cores: _emscripten_num_logical_cores,
    /** @export */
    emscripten_outn: _emscripten_outn,
    /** @export */
    emscripten_pc_get_function: _emscripten_pc_get_function,
    /** @export */
    emscripten_request_pointerlock: _emscripten_request_pointerlock,
    /** @export */
    emscripten_resize_heap: _emscripten_resize_heap,
    /** @export */
    emscripten_runtime_keepalive_push: _emscripten_runtime_keepalive_push,
    /** @export */
    emscripten_sample_gamepad_data: _emscripten_sample_gamepad_data,
    /** @export */
    emscripten_set_blur_callback_on_thread: _emscripten_set_blur_callback_on_thread,
    /** @export */
    emscripten_set_canvas_element_size: _emscripten_set_canvas_element_size,
    /** @export */
    emscripten_set_focus_callback_on_thread: _emscripten_set_focus_callback_on_thread,
    /** @export */
    emscripten_set_gamepadconnected_callback_on_thread: _emscripten_set_gamepadconnected_callback_on_thread,
    /** @export */
    emscripten_set_gamepaddisconnected_callback_on_thread: _emscripten_set_gamepaddisconnected_callback_on_thread,
    /** @export */
    emscripten_set_keydown_callback_on_thread: _emscripten_set_keydown_callback_on_thread,
    /** @export */
    emscripten_set_keyup_callback_on_thread: _emscripten_set_keyup_callback_on_thread,
    /** @export */
    emscripten_set_mousedown_callback_on_thread: _emscripten_set_mousedown_callback_on_thread,
    /** @export */
    emscripten_set_mouseenter_callback_on_thread: _emscripten_set_mouseenter_callback_on_thread,
    /** @export */
    emscripten_set_mouseleave_callback_on_thread: _emscripten_set_mouseleave_callback_on_thread,
    /** @export */
    emscripten_set_mousemove_callback_on_thread: _emscripten_set_mousemove_callback_on_thread,
    /** @export */
    emscripten_set_mouseup_callback_on_thread: _emscripten_set_mouseup_callback_on_thread,
    /** @export */
    emscripten_set_pointerlockerror_callback_on_thread: _emscripten_set_pointerlockerror_callback_on_thread,
    /** @export */
    emscripten_set_touchcancel_callback_on_thread: _emscripten_set_touchcancel_callback_on_thread,
    /** @export */
    emscripten_set_touchend_callback_on_thread: _emscripten_set_touchend_callback_on_thread,
    /** @export */
    emscripten_set_touchmove_callback_on_thread: _emscripten_set_touchmove_callback_on_thread,
    /** @export */
    emscripten_set_touchstart_callback_on_thread: _emscripten_set_touchstart_callback_on_thread,
    /** @export */
    emscripten_set_wheel_callback_on_thread: _emscripten_set_wheel_callback_on_thread,
    /** @export */
    emscripten_stack_snapshot: _emscripten_stack_snapshot,
    /** @export */
    emscripten_stack_unwind_buffer: _emscripten_stack_unwind_buffer,
    /** @export */
    emscripten_start_fetch: _emscripten_start_fetch,
    /** @export */
    emscripten_unwind_to_js_event_loop: _emscripten_unwind_to_js_event_loop,
    /** @export */
    emscripten_webgl_create_context: _emscripten_webgl_create_context,
    /** @export */
    emscripten_webgl_destroy_context: _emscripten_webgl_destroy_context,
    /** @export */
    emscripten_webgl_get_context_attributes: _emscripten_webgl_get_context_attributes,
    /** @export */
    emscripten_webgl_make_context_current: _emscripten_webgl_make_context_current,
    /** @export */
    emscripten_websocket_close: _emscripten_websocket_close,
    /** @export */
    emscripten_websocket_delete: _emscripten_websocket_delete,
    /** @export */
    emscripten_websocket_new: _emscripten_websocket_new,
    /** @export */
    emscripten_websocket_send_binary: _emscripten_websocket_send_binary,
    /** @export */
    emscripten_websocket_send_utf8_text: _emscripten_websocket_send_utf8_text,
    /** @export */
    emscripten_websocket_set_onclose_callback_on_thread: _emscripten_websocket_set_onclose_callback_on_thread,
    /** @export */
    emscripten_websocket_set_onerror_callback_on_thread: _emscripten_websocket_set_onerror_callback_on_thread,
    /** @export */
    emscripten_websocket_set_onmessage_callback_on_thread: _emscripten_websocket_set_onmessage_callback_on_thread,
    /** @export */
    emscripten_websocket_set_onopen_callback_on_thread: _emscripten_websocket_set_onopen_callback_on_thread,
    /** @export */
    environ_get: _environ_get,
    /** @export */
    environ_sizes_get: _environ_sizes_get,
    /** @export */
    exit: _exit,
    /** @export */
    fiber_destroy_js: _fiber_destroy_js,
    /** @export */
    focus_text_input: _focus_text_input,
    /** @export */
    get_effective_device_pixel_ratio: _get_effective_device_pixel_ratio,
    /** @export */
    get_hardware_concurrency: _get_hardware_concurrency,
    /** @export */
    glActiveTexture: _glActiveTexture,
    /** @export */
    glAttachShader: _glAttachShader,
    /** @export */
    glBindAttribLocation: _glBindAttribLocation,
    /** @export */
    glBindBuffer: _glBindBuffer,
    /** @export */
    glBindBufferBase: _glBindBufferBase,
    /** @export */
    glBindBufferRange: _glBindBufferRange,
    /** @export */
    glBindFramebuffer: _glBindFramebuffer,
    /** @export */
    glBindRenderbuffer: _glBindRenderbuffer,
    /** @export */
    glBindTexture: _glBindTexture,
    /** @export */
    glBindVertexArray: _glBindVertexArray,
    /** @export */
    glBlendFunc: _glBlendFunc,
    /** @export */
    glBlendFuncSeparate: _glBlendFuncSeparate,
    /** @export */
    glBlitFramebuffer: _glBlitFramebuffer,
    /** @export */
    glBufferData: _glBufferData,
    /** @export */
    glBufferSubData: _glBufferSubData,
    /** @export */
    glCheckFramebufferStatus: _glCheckFramebufferStatus,
    /** @export */
    glClear: _glClear,
    /** @export */
    glClearBufferfi: _glClearBufferfi,
    /** @export */
    glClearBufferfv: _glClearBufferfv,
    /** @export */
    glClearBufferiv: _glClearBufferiv,
    /** @export */
    glClearColor: _glClearColor,
    /** @export */
    glClearDepthf: _glClearDepthf,
    /** @export */
    glClearStencil: _glClearStencil,
    /** @export */
    glClientWaitSync: _glClientWaitSync,
    /** @export */
    glClipControlEXT: _glClipControlEXT,
    /** @export */
    glColorMask: _glColorMask,
    /** @export */
    glCompileShader: _glCompileShader,
    /** @export */
    glCompressedTexImage2D: _glCompressedTexImage2D,
    /** @export */
    glCompressedTexImage3D: _glCompressedTexImage3D,
    /** @export */
    glCompressedTexSubImage2D: _glCompressedTexSubImage2D,
    /** @export */
    glCompressedTexSubImage3D: _glCompressedTexSubImage3D,
    /** @export */
    glCopyTexSubImage2D: _glCopyTexSubImage2D,
    /** @export */
    glCreateProgram: _glCreateProgram,
    /** @export */
    glCreateShader: _glCreateShader,
    /** @export */
    glCullFace: _glCullFace,
    /** @export */
    glDeleteBuffers: _glDeleteBuffers,
    /** @export */
    glDeleteFramebuffers: _glDeleteFramebuffers,
    /** @export */
    glDeleteProgram: _glDeleteProgram,
    /** @export */
    glDeleteRenderbuffers: _glDeleteRenderbuffers,
    /** @export */
    glDeleteShader: _glDeleteShader,
    /** @export */
    glDeleteSync: _glDeleteSync,
    /** @export */
    glDeleteTextures: _glDeleteTextures,
    /** @export */
    glDeleteVertexArrays: _glDeleteVertexArrays,
    /** @export */
    glDepthFunc: _glDepthFunc,
    /** @export */
    glDepthMask: _glDepthMask,
    /** @export */
    glDisable: _glDisable,
    /** @export */
    glDisableVertexAttribArray: _glDisableVertexAttribArray,
    /** @export */
    glDrawArrays: _glDrawArrays,
    /** @export */
    glDrawArraysInstanced: _glDrawArraysInstanced,
    /** @export */
    glDrawBuffers: _glDrawBuffers,
    /** @export */
    glDrawElements: _glDrawElements,
    /** @export */
    glDrawElementsInstanced: _glDrawElementsInstanced,
    /** @export */
    glEnable: _glEnable,
    /** @export */
    glEnableVertexAttribArray: _glEnableVertexAttribArray,
    /** @export */
    glFenceSync: _glFenceSync,
    /** @export */
    glFramebufferRenderbuffer: _glFramebufferRenderbuffer,
    /** @export */
    glFramebufferTexture2D: _glFramebufferTexture2D,
    /** @export */
    glFramebufferTextureLayer: _glFramebufferTextureLayer,
    /** @export */
    glGenBuffers: _glGenBuffers,
    /** @export */
    glGenFramebuffers: _glGenFramebuffers,
    /** @export */
    glGenRenderbuffers: _glGenRenderbuffers,
    /** @export */
    glGenTextures: _glGenTextures,
    /** @export */
    glGenVertexArrays: _glGenVertexArrays,
    /** @export */
    glGenerateMipmap: _glGenerateMipmap,
    /** @export */
    glGetActiveUniform: _glGetActiveUniform,
    /** @export */
    glGetActiveUniformBlockiv: _glGetActiveUniformBlockiv,
    /** @export */
    glGetError: _glGetError,
    /** @export */
    glGetIntegerv: _glGetIntegerv,
    /** @export */
    glGetProgramInfoLog: _glGetProgramInfoLog,
    /** @export */
    glGetProgramiv: _glGetProgramiv,
    /** @export */
    glGetShaderInfoLog: _glGetShaderInfoLog,
    /** @export */
    glGetShaderiv: _glGetShaderiv,
    /** @export */
    glGetString: _glGetString,
    /** @export */
    glGetUniformBlockIndex: _glGetUniformBlockIndex,
    /** @export */
    glGetUniformLocation: _glGetUniformLocation,
    /** @export */
    glInvalidateFramebuffer: _glInvalidateFramebuffer,
    /** @export */
    glLinkProgram: _glLinkProgram,
    /** @export */
    glMapBufferRange: _glMapBufferRange,
    /** @export */
    glPixelStorei: _glPixelStorei,
    /** @export */
    glPolygonOffset: _glPolygonOffset,
    /** @export */
    glReadPixels: _glReadPixels,
    /** @export */
    glRenderbufferStorage: _glRenderbufferStorage,
    /** @export */
    glRenderbufferStorageMultisample: _glRenderbufferStorageMultisample,
    /** @export */
    glScissor: _glScissor,
    /** @export */
    glShaderSource: _glShaderSource,
    /** @export */
    glStencilFunc: _glStencilFunc,
    /** @export */
    glStencilMask: _glStencilMask,
    /** @export */
    glStencilOp: _glStencilOp,
    /** @export */
    glTexImage2D: _glTexImage2D,
    /** @export */
    glTexImage3D: _glTexImage3D,
    /** @export */
    glTexParameterf: _glTexParameterf,
    /** @export */
    glTexParameterfv: _glTexParameterfv,
    /** @export */
    glTexParameteri: _glTexParameteri,
    /** @export */
    glTexStorage2D: _glTexStorage2D,
    /** @export */
    glTexStorage3D: _glTexStorage3D,
    /** @export */
    glTexSubImage2D: _glTexSubImage2D,
    /** @export */
    glTexSubImage3D: _glTexSubImage3D,
    /** @export */
    glUniform1i: _glUniform1i,
    /** @export */
    glUniformBlockBinding: _glUniformBlockBinding,
    /** @export */
    glUnmapBuffer: _glUnmapBuffer,
    /** @export */
    glUseProgram: _glUseProgram,
    /** @export */
    glVertexAttribPointer: _glVertexAttribPointer,
    /** @export */
    glViewport: _glViewport,
    /** @export */
    has_keyboard: _has_keyboard,
    /** @export */
    has_mouse: _has_mouse,
    /** @export */
    is_legacy_scroll: _is_legacy_scroll,
    /** @export */
    is_touch_mobile: _is_touch_mobile,
    /** @export */
    is_touch_screen_device: _is_touch_screen_device,
    /** @export */
    js_fetch_file: _js_fetch_file,
    /** @export */
    js_init_ring_buffers: _js_init_ring_buffers,
    /** @export */
    memory: wasmMemory,
    /** @export */
    preallocate_emscripten_key_event_buffer: _preallocate_emscripten_key_event_buffer,
    /** @export */
    proc_exit: _proc_exit,
    /** @export */
    random_get: _random_get,
    /** @export */
    rbx_opfs_close: _rbx_opfs_close,
    /** @export */
    rbx_opfs_free: _rbx_opfs_free,
    /** @export */
    rbx_opfs_install_helpers: _rbx_opfs_install_helpers,
    /** @export */
    rbx_opfs_read_sync_if_cached: _rbx_opfs_read_sync_if_cached,
    /** @export */
    rbx_wasm_rna_close_js: _rbx_wasm_rna_close_js,
    /** @export */
    rbx_wasm_rna_connect_js: _rbx_wasm_rna_connect_js,
    /** @export */
    rbx_wasm_rna_is_supported_js: _rbx_wasm_rna_is_supported_js,
    /** @export */
    rbx_wasm_rna_open_stream_js: _rbx_wasm_rna_open_stream_js,
    /** @export */
    rbx_wasm_rna_pause_stream_read_js: _rbx_wasm_rna_pause_stream_read_js,
    /** @export */
    rbx_wasm_rna_receive_ring_consumed_js: _rbx_wasm_rna_receive_ring_consumed_js,
    /** @export */
    rbx_wasm_rna_resume_stream_read_js: _rbx_wasm_rna_resume_stream_read_js,
    /** @export */
    rbx_wasm_rna_send_connection_close_js: _rbx_wasm_rna_send_connection_close_js,
    /** @export */
    rbx_wasm_rna_send_datagram_js: _rbx_wasm_rna_send_datagram_js,
    /** @export */
    rbx_wasm_rna_shutdown_stream_read_js: _rbx_wasm_rna_shutdown_stream_read_js,
    /** @export */
    rbx_wasm_rna_shutdown_stream_write_js: _rbx_wasm_rna_shutdown_stream_write_js,
    /** @export */
    rbx_wasm_rna_write_stream_js: _rbx_wasm_rna_write_stream_js,
    /** @export */
    read_host_info_int: _read_host_info_int,
    /** @export */
    read_host_info_string: _read_host_info_string,
    /** @export */
    report_crash: _report_crash,
    /** @export */
    reset_current_text_input: _reset_current_text_input,
    /** @export */
    schedule_main_loop: _schedule_main_loop,
    /** @export */
    set_crash_attribute: _set_crash_attribute,
    /** @export */
    set_text_box_horiz_alignment: _set_text_box_horiz_alignment,
    /** @export */
    set_text_box_overlay: _set_text_box_overlay,
    /** @export */
    set_text_box_vert_alignment: _set_text_box_vert_alignment,
    /** @export */
    set_text_color: _set_text_color,
    /** @export */
    setup_font: _setup_font,
    /** @export */
    shift_canvas: _shift_canvas,
    /** @export */
    sync_text_and_pos: _sync_text_and_pos,
    /** @export */
    update_text_box_rect: _update_text_box_rect
  };
  }


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

var calledRun;

async function callMain(args = []) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(typeof onPreRuns === 'undefined' || onPreRuns.length == 0, 'cannot call main when preRun functions remain to be called');

  var entryFunction = _main;

  args.unshift(thisProgram);

  var argc = args.length;
  var argv = stackAlloc((argc + 1) * 4);
  var argv_ptr = argv;
  for (var arg of args) {
    HEAPU32[((argv_ptr)>>2)] = stringToUTF8OnStack(arg);
    argv_ptr += 4;
  }
  HEAPU32[((argv_ptr)>>2)] = 0;

  try {

    var ret = entryFunction(argc, argv);

    // The current spec of JSPI returns a promise only if the function suspends
    // and a plain value otherwise. This will likely change:
    // https://github.com/WebAssembly/js-promise-integration/issues/11
    ret = await ret;
    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  } catch (e) {
    return handleException(e);
  }
}

async function run(args = programArgs) {
  assert(!calledRun);
  calledRun = true;

  if ((ENVIRONMENT_IS_PTHREAD)) {
    initRuntime();
    return;
  }

  preRun();

  if (runDependencies) {
    await resolveRunDependencies();
  }

  var setStatus = Module['setStatus'];
  if (setStatus) {
    setStatus('Running...');
    // Yield to the event loop to allow the browser to paint "Running..."
    await new Promise((resolve) => setTimeout(resolve, 1));
    // Then we want to clear the status text, but only after the rest of this function runs.
    setTimeout(setStatus, 1, '');
  }

  if (ABORT) return;

  initRuntime();

  // No ATMAINS hooks

  Module['onRuntimeInitialized']?.();
  consumedModuleProp('onRuntimeInitialized');

  var noInitialRun = Module['noInitialRun'] || false;
  if (!noInitialRun) await callMain(args);

  postRun();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.');
  }
}

var wasmExports;

if ((!(ENVIRONMENT_IS_PTHREAD))) {
// Call createWasm on startup if we are the main thread.
// Worker threads call this once they receive the module via postMessage

// In modularize mode the generated code is within a factory function so we
// can use await here (since it's not top-level-await).
wasmExports = await createWasm();
await run();

}

// end include: postamble.js

// include: postamble_modularize.js
// In MODULARIZE mode we wrap the generated code in a factory function
// and return either the Module itself, or a promise of the module.

// Assertion for attempting to access module properties on the incoming
// moduleArg.  In the past we used this object as the prototype of the module
// and assigned properties to it, but now we return a distinct object.  This
// keeps the instance private until it is ready (i.e the promise has been
// resolved).
for (const prop of Object.keys(Module)) {
  if (!(prop in moduleArg)) {
    Object.defineProperty(moduleArg, prop, {
      configurable: true,
      get() {
        abort(`Access to module property ('${prop}') is no longer possible via the module constructor argument; Instead, use the result of the module constructor.`)
      }
    });
  }
}
// end include: postamble_modularize.js



    return Module;
  };
})();

// Export using a UMD style export, or ES6 exports if selected
if (typeof exports === 'object' && typeof module === 'object') {
  module.exports = createWebClient;
  // This default export looks redundant, but it allows TS to import this
  // commonjs style module.
  module.exports.default = createWebClient;
} else if (typeof define === 'function' && define['amd'])
  define([], () => createWebClient);

// Create code for detecting if we are running in a pthread.
// Normally this detection is done when the module is itself run but
// when running in MODULARIZE mode we need use this to know if we should
// run the module constructor on startup (true only for pthreads).
var isPthread = globalThis.name?.startsWith('em-pthread');

isPthread && createWebClient();

