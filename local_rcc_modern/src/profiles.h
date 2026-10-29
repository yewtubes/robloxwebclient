// Version profiles: where each supported Studio build keeps the code that
// local_rcc_modern changes, and the exact bytes expected there. A profile only
// applies when the PE timestamp, image size and every original byte sequence
// match; otherwise nothing is touched.
#pragma once
#include <cstdint>
#include <cstddef>

struct Site {
    const char* name;
    uint64_t va;                 // virtual address at the preferred image base
    const uint8_t* original;
    size_t size;
};

struct Profile {
    const char* name;
    uint32_t timestamp;          // IMAGE_FILE_HEADER.TimeDateStamp
    uint32_t size_of_image;      // IMAGE_OPTIONAL_HEADER.SizeOfImage
    uint64_t image_base;
    // LuaVM::compile(const std::string& source, int target, int options) -> std::string.
    // In Studio it is a stub that returns an empty string.
    Site compile;
    // NetworkSchema format selection for ProtectedString properties: a call to a
    // predicate that is a stub returning false in Studio, which makes the schema
    // declare ProtectedStringSource (6) instead of ProtectedStringBytecode (0x2f).
    Site schema_predicate_call;
};

namespace studio_0_745_0_7451137 {
// xor eax,eax; mov qword [rcx+18h],0Fh; mov [rcx],rax; mov [rcx+10h],rax; mov [rcx],al; mov rax,rcx; ret
inline constexpr uint8_t compile_stub[] = {
    0x33, 0xc0, 0x48, 0xc7, 0x41, 0x18, 0x0f, 0x00, 0x00, 0x00, 0x48, 0x89, 0x01,
    0x48, 0x89, 0x41, 0x10, 0x88, 0x01, 0x48, 0x8b, 0xc1, 0xc3};
// call 0x1407cced0; test al,al; mov byte [rsp+71h],2Fh; jne ...; mov byte [rsp+71h],6
inline constexpr uint8_t schema_call[] = {
    0xe8, 0xb4, 0x11, 0x6b, 0xfa, 0x84, 0xc0, 0xc6, 0x44, 0x24, 0x71, 0x2f,
    0x75, 0x1a, 0xc6, 0x44, 0x24, 0x71, 0x06};
}

inline constexpr Profile kProfiles[] = {
    {"RobloxStudioBeta 0.745.0.7451137", 0xa317344b, 0x0decc000, 0x140000000,
     {"LuaVM::compile", 0x142ae2d30, studio_0_745_0_7451137::compile_stub, sizeof(studio_0_745_0_7451137::compile_stub)},
     {"NetworkSchema ProtectedString format predicate", 0x14611bd17, studio_0_745_0_7451137::schema_call,
      sizeof(studio_0_745_0_7451137::schema_call)}},
};
