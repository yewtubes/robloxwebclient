# local_rcc_modern

A compatibility layer loaded into a Roblox Studio play-test server
(`RobloxStudioBeta.exe -task StartServer`) so it replicates client scripts the
way an RCC game server does. It is a version-aware rewrite of the two script
fixes in [local_rcc](https://github.com/abcsnoob/local_rcc) for Studio 0.745.

## What it changes

| Studio behaviour | Evidence | Change |
|---|---|---|
| `LuaVM::compile(source, target, options)` is a stub returning `""` (0x142ae2d30: `xor eax,eax … ret`) | disassembly; Studio's compile path, registration (`0x1460b5830`) and fetch (`0x1460b0480`) all go through it | the stub jumps to `lrm_compile`: Luau 0.744 compile, opcodes ×227, RSB1 container (zstd + XXH32-keyed XOR), as in local_rcc |
| the NetworkSchema declares `ProtectedString` as ProtectedStringSource (6) because the predicate at 0x1407cced0 is a stub returning false (`xor al,al; ret`) | disassembly of the format selection (0x14611bd0c–0x14611bd25); the server sent a 16-byte hash plus a source dictionary entry, never bytecode | the call at 0x14611bd17 becomes `mov al,1`, which takes RCC's ProtectedStringBytecode (0x2f) branch; the `[rbp+0x1b0]` case still selects source |

`ClientQoSItem` (local_rcc's third fix) is not hooked: the web client never
gets kicked for it, so there is no evidence it is needed with this build.

## Safety

- Patches apply only when the PE timestamp, `SizeOfImage` and the original
  bytes at every site match a profile in `src/profiles.h`. Otherwise the DLL
  logs "unsupported build" and changes nothing.
- No signature scanning: each supported build gets an explicit profile.
- Strings returned to Studio are allocated with Studio's exported `rbxAllocate`.

Supported builds:

| Build | Timestamp | SizeOfImage |
|---|---|---|
| RobloxStudioBeta 0.745.0.7451137 | `a317344b` | `0decc000` |

## Build

Linux (MinGW-w64 cross-compile; the result runs under Wine or on Windows):

```bash
apt-get install g++-mingw-w64-x86-64 cmake ninja-build
cmake -S local_rcc_modern -B local_rcc_modern/build-win -G Ninja \
  -DCMAKE_TOOLCHAIN_FILE=cmake/mingw-w64-x86_64.cmake -DCMAKE_BUILD_TYPE=Release
ninja -C local_rcc_modern/build-win      # local_rcc_modern.dll, local_rcc_inject.exe
```

Windows x64 (Visual Studio 2022 or MinGW): the same CMake project, without the
toolchain file.

Dependencies are fetched at pinned versions (Luau 0.744, zstd 1.5.6, xxHash
0.8.2), or taken from local checkouts with `-DLUAU_DIR= -DZSTD_DIR= -DXXHASH_DIR=`.

Host tests (native build): compile, Luau bytecode version range, RSB1 round trip.

```bash
cmake -S local_rcc_modern -B local_rcc_modern/build-host -G Ninja && ninja -C local_rcc_modern/build-host
(cd local_rcc_modern/build-host && ctest --output-on-failure)
```

## Use

```bash
LOCAL_RCC=1 tools/studio/run_server.sh /path/to/place.rbxl 53640
```

`run_server.sh` starts Studio through `local_rcc_inject.exe` (create suspended,
`LoadLibraryW` in a remote thread, resume), so the patches are in place before
Studio builds its NetworkSchema. The log goes to `LOCAL_RCC_LOG`
(default `Z:/home/user/studio/local_rcc_modern.log`): profile match, each patch,
and one line per compiled script (sizes, or the Luau compile error).

## Status with Roblox's web client 0.745.0.7451145

- Both changes work: Studio compiles every replicated script, and the client
  receives and unpacks the bytecode.
- The client then rejects it in `luau_load` with `bytecode corrupted`. The 2026
  client checks an integrity footer on all bytecode, and Luau's compiler doesn't
  produce one. This project doesn't forge or bypass that check, so client
  scripts don't run yet.
- Native Windows Player: not tested. No Player build is installed here, and
  the same bytecode check applies to it.

## Troubleshooting

- "unsupported build": Studio was updated. Add a profile after verifying the
  stub, predicate and call bytes for the new build.
- No log file: the injector couldn't load the DLL (the injector prints
  `LoadLibrary failed in target`). Check the Wine paths (`Z:/…`).
- A compile error in the log means the source didn't compile with Luau 0.744
  (for example newer syntax). The client gets the `'\0' + message` result.
