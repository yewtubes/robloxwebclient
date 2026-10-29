// Starts a program suspended, loads local_rcc_modern.dll into it, then lets it run.
//   local_rcc_inject.exe <dll> <program.exe> [args...]
// The DLL patches during load, before Studio builds its NetworkSchema.
#include <windows.h>

#include <cstdio>
#include <string>

static std::wstring quote(const wchar_t* a) {
    std::wstring s(a);
    if (s.find_first_of(L" \t\"") == std::wstring::npos && !s.empty()) return s;
    std::wstring r = L"\"";
    for (wchar_t c : s) r += (c == L'"') ? L"\\\"" : std::wstring(1, c);
    return r + L"\"";
}

int wmain(int argc, wchar_t** argv) {
    if (argc < 3) {
        fwprintf(stderr, L"usage: %ls <dll> <program.exe> [args...]\n", argv[0]);
        return 2;
    }
    wchar_t dll[MAX_PATH];
    if (!GetFullPathNameW(argv[1], MAX_PATH, dll, nullptr)) return 2;
    std::wstring cmd;
    for (int i = 2; i < argc; i++) cmd += (i > 2 ? L" " : L"") + quote(argv[i]);

    STARTUPINFOW si{sizeof si};
    PROCESS_INFORMATION pi{};
    if (!CreateProcessW(argv[2], cmd.data(), nullptr, nullptr, FALSE, CREATE_SUSPENDED, nullptr, nullptr, &si, &pi)) {
        fwprintf(stderr, L"CreateProcess failed: %lu\n", GetLastError());
        return 1;
    }
    size_t bytes = (wcslen(dll) + 1) * sizeof(wchar_t);
    void* remote = VirtualAllocEx(pi.hProcess, nullptr, bytes, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    WriteProcessMemory(pi.hProcess, remote, dll, bytes, nullptr);
    auto load = reinterpret_cast<LPTHREAD_START_ROUTINE>(GetProcAddress(GetModuleHandleW(L"kernel32.dll"), "LoadLibraryW"));
    HANDLE t = CreateRemoteThread(pi.hProcess, nullptr, 0, load, remote, 0, nullptr);
    if (!t) {
        fwprintf(stderr, L"CreateRemoteThread failed: %lu\n", GetLastError());
        TerminateProcess(pi.hProcess, 1);
        return 1;
    }
    WaitForSingleObject(t, INFINITE);
    DWORD module = 0;
    GetExitCodeThread(t, &module);
    fwprintf(stderr, module ? L"injected %ls\n" : L"LoadLibrary failed in target for %ls\n", dll);
    ResumeThread(pi.hThread);
    WaitForSingleObject(pi.hProcess, INFINITE);
    DWORD code = 0;
    GetExitCodeProcess(pi.hProcess, &code);
    return int(code);
}
