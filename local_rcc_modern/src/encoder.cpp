#include "encoder.h"

#include <cstdint>
#include <cstring>
#include <vector>

#include "Luau/BytecodeBuilder.h"
#include "Luau/BytecodeUtils.h"
#include "Luau/Compiler.h"
#include "xxhash.h"
#include "zstd.h"

namespace lrm {
namespace {
struct ClientEncoder : Luau::BytecodeEncoder {
    void encode(uint32_t* data, size_t count) override {
        for (size_t i = 0; i < count;) {
            uint8_t op = LUAU_INSN_OP(data[i]);
            int len = Luau::getOpLength(LuauOpcode(op));
            data[i] = uint8_t(op * 227) | (data[i] & ~0xffu);
            i += len;
        }
    }
};

void xor_key(uint8_t* p, size_t n, uint32_t hash) {
    uint8_t key[4];
    std::memcpy(key, &hash, 4);
    for (size_t i = 0; i < n; i++) p[i] ^= uint8_t(key[i % 4] + i * 41);
}
}  // namespace

std::string compile_client(const std::string& source) {
    static const char* mutable_globals[] = {"game", "Game", "workspace", "Workspace", "script", "shared", "plugin", nullptr};
    Luau::CompileOptions opts;
    opts.optimizationLevel = 1;
    opts.debugLevel = 1;
    opts.vectorLib = "Vector3";
    opts.vectorCtor = "new";
    opts.vectorType = "Vector3";
    opts.mutableGlobals = mutable_globals;
    ClientEncoder enc;
    return Luau::compile(source, opts, {}, &enc);
}

std::string rsb1_encode(const std::string& bytecode) {
    size_t cap = ZSTD_compressBound(bytecode.size());
    std::vector<uint8_t> out(8 + cap);
    uint32_t size = uint32_t(bytecode.size());
    std::memcpy(&out[0], "RSB1", 4);
    std::memcpy(&out[4], &size, 4);
    size_t n = ZSTD_compress(&out[8], cap, bytecode.data(), bytecode.size(), ZSTD_maxCLevel());
    if (ZSTD_isError(n)) return {};
    n += 8;
    xor_key(out.data(), n, XXH32(out.data(), n, 42));
    return std::string(reinterpret_cast<char*>(out.data()), n);
}

bool rsb1_decode(const std::string& encoded, std::string& bytecode) {
    if (encoded.size() < 8) return false;
    // The key is derived from the plaintext, so recover it from the known "RSB1" magic.
    std::vector<uint8_t> b(encoded.begin(), encoded.end());
    uint8_t key[4];
    for (int i = 0; i < 4; i++) key[i] = uint8_t((b[i] ^ "RSB1"[i]) - i * 41);
    for (size_t i = 0; i < b.size(); i++) b[i] ^= uint8_t(key[i % 4] + i * 41);
    uint32_t size;
    std::memcpy(&size, &b[4], 4);
    bytecode.resize(size);
    size_t n = ZSTD_decompress(bytecode.data(), size, &b[8], b.size() - 8);
    if (ZSTD_isError(n) || n != size) return false;
    uint32_t hash;
    std::memcpy(&hash, key, 4);
    return XXH32(b.data(), b.size(), 42) == hash;
}
}  // namespace lrm
