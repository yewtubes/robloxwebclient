// local_rcc_modern: makes a Roblox Studio play-test server replicate client
// scripts the way an RCC game server does, so player clients (which have no
// Luau compiler) can run them.
//
//  1. LuaVM::compile, a stub returning "" in Studio, is replaced with a real
//     Luau compile into the client bytecode container (encoder.cpp).
//  2. The NetworkSchema declares ProtectedString properties with the format RCC
//     uses (ProtectedStringBytecode) instead of ProtectedStringSource.
//
// The DLL only patches a Studio build listed in profiles.h, and only after
// checking every original byte; anything else is left untouched and logged.
#include <windows.h>

#include <cstdarg>
#include <cstdio>
#include <cstring>
#include <string>

#include "encoder.h"
#include "profiles.h"

namespace {
FILE* g_log = nullptr;
CRITICAL_SECTION g_log_lock;

void log(const char* fmt, ...) {
    if (!g_log) return;
    EnterCriticalSection(&g_log_lock);
    SYSTEMTIME t;
    GetLocalTime(&t);
    fprintf(g_log, "%02d:%02d:%02d.%03d ", t.wHour, t.wMinute, t.wSecond, t.wMilliseconds);
    va_list ap;
    va_start(ap, fmt);
    vfprintf(g_log, fmt, ap);
    va_end(ap);
    fputc('\n', g_log);
    fflush(g_log);
    LeaveCriticalSection(&g_log_lock);
}

// MSVC x64 std::string, as Studio lays it out.
struct MsvcString {
    union {
        char buf[16];
        char* ptr;
    };
    size_t size;
    size_t cap;
    const char* data() const { return cap >= 16 ? ptr : buf; }
};
static_assert(sizeof(MsvcString) == 32, "MSVC std::string is 32 bytes");

using AllocFn = void* (*)(size_t);
AllocFn g_rbx_allocate = nullptr;

// Builds an MSVC std::string in place, allocating with Studio's allocator so
// Studio can free it.
MsvcString* make_string(MsvcString* out, const std::string& s) {
    out->size = s.size();
    if (s.size() < 16) {
        std::memset(out->buf, 0, 16);
        std::memcpy(out->buf, s.data(), s.size());
        out->cap = 15;
    } else {
        out->ptr = static_cast<char*>(g_rbx_allocate(s.size() + 1));
        std::memcpy(out->ptr, s.data(), s.size());
        out->ptr[s.size()] = 0;
        out->cap = s.size();
    }
    return out;
}

// Replacement for LuaVM::compile(const std::string& source, int target, int options).
// MSVC returns the std::string through a hidden pointer in rcx.
extern "C" MsvcString* lrm_compile(MsvcString* out, const MsvcString* source, int target, int options) {
    std::string src(source->data(), source->size);
    std::string bytecode = lrm::compile_client(src);
    if (bytecode.empty() || bytecode[0] == 0) {
        // Same convention as Luau: '\0' + message. Keep it so the client reports the error.
        log("compile error (target %d, options %d, %zu bytes source): %s", target, options, src.size(),
            bytecode.empty() ? "" : bytecode.c_str() + 1);
        return make_string(out, bytecode);
    }
    std::string encoded = lrm::rsb1_encode(bytecode);
    log("compiled target %d options %d: source %zu -> bytecode %zu -> rsb1 %zu", target, options, src.size(),
        bytecode.size(), encoded.size());
    return make_string(out, encoded);
}

bool bytes_match(const Site& s, uint64_t slide) {
    return std::memcmp(reinterpret_cast<void*>(s.va + slide), s.original, s.size) == 0;
}

bool write_code(uint64_t addr, const void* bytes, size_t n) {
    DWORD old;
    if (!VirtualProtect(reinterpret_cast<void*>(addr), n, PAGE_EXECUTE_READWRITE, &old)) return false;
    std::memcpy(reinterpret_cast<void*>(addr), bytes, n);
    VirtualProtect(reinterpret_cast<void*>(addr), n, old, &old);
    FlushInstructionCache(GetCurrentProcess(), reinterpret_cast<void*>(addr), n);
    return true;
}

void apply() {
    HMODULE exe = GetModuleHandleW(nullptr);
    auto* dos = reinterpret_cast<IMAGE_DOS_HEADER*>(exe);
    auto* nt = reinterpret_cast<IMAGE_NT_HEADERS64*>(reinterpret_cast<uint8_t*>(exe) + dos->e_lfanew);
    uint32_t ts = nt->FileHeader.TimeDateStamp, soi = nt->OptionalHeader.SizeOfImage;
    log("host image base %p timestamp %08x size %08x", exe, ts, soi);

    const Profile* profile = nullptr;
    for (const Profile& p : kProfiles)
        if (p.timestamp == ts && p.size_of_image == soi) profile = &p;
    if (!profile) {
        log("unsupported build: no profile matches; nothing patched");
        return;
    }
    uint64_t slide = reinterpret_cast<uint64_t>(exe) - profile->image_base;
    for (const Site* s : {&profile->compile, &profile->schema_predicate_call}) {
        if (!bytes_match(*s, slide)) {
            log("profile %s: bytes at %s (%llx) differ; nothing patched", profile->name, s->name,
                (unsigned long long)(s->va + slide));
            return;
        }
    }
    g_rbx_allocate = reinterpret_cast<AllocFn>(GetProcAddress(exe, "rbxAllocate"));
    if (!g_rbx_allocate) {
        log("rbxAllocate export missing; nothing patched");
        return;
    }
    log("profile %s matched", profile->name);

    // 1. jmp qword [rip+0]; dq lrm_compile  (14 bytes, fits in the 23-byte stub)
    uint8_t jmp[14] = {0xff, 0x25, 0, 0, 0, 0};
    uint64_t target = reinterpret_cast<uint64_t>(&lrm_compile);
    std::memcpy(jmp + 6, &target, 8);
    if (!write_code(profile->compile.va + slide, jmp, sizeof jmp)) return log("failed to patch %s", profile->compile.name);
    log("patched %s -> lrm_compile", profile->compile.name);

    // 2. call <predicate> -> mov al,1; nop x3: take RCC's ProtectedStringBytecode branch.
    const uint8_t mov_al_1[5] = {0xb0, 0x01, 0x90, 0x90, 0x90};
    if (!write_code(profile->schema_predicate_call.va + slide, mov_al_1, sizeof mov_al_1))
        return log("failed to patch %s", profile->schema_predicate_call.name);
    log("patched %s: ProtectedString replicates as ProtectedStringBytecode", profile->schema_predicate_call.name);
}
}  // namespace

BOOL WINAPI DllMain(HINSTANCE, DWORD reason, LPVOID) {
    if (reason == DLL_PROCESS_ATTACH) {
        InitializeCriticalSection(&g_log_lock);
        char path[MAX_PATH];
        DWORD n = GetEnvironmentVariableA("LOCAL_RCC_LOG", path, sizeof path);
        if (n == 0 || n >= sizeof path) std::strcpy(path, "local_rcc_modern.log");
        g_log = std::fopen(path, "a");
        log("local_rcc_modern loaded");
        apply();
    }
    return TRUE;
}
