// Luau compilation and the network bytecode container used by local_rcc
// (github.com/abcsnoob/local_rcc): opcodes multiplied by 227, then
// "RSB1" | u32 size | zstd(bytecode), XORed with a key from XXH32(seed 42).
#pragma once
#include <string>

namespace lrm {
// Compiles source to client bytecode (opcode-encoded). On a compile error the
// result starts with '\0' followed by the message, like Luau::compile.
std::string compile_client(const std::string& source);
// Wraps bytecode in the RSB1 container.
std::string rsb1_encode(const std::string& bytecode);
// Inverse of rsb1_encode; returns false if the container is malformed.
bool rsb1_decode(const std::string& encoded, std::string& bytecode);
}
