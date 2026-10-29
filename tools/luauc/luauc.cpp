// Compiles Luau source to bytecode in the form the Roblox client stores in
// Script.Source (binary type 0x1D): opcodes multiplied by 227, prefixed with the
// 8-byte magic seen in the client's own patches.
//   luauc <in.lua> <out.bin>
#include "Luau/Compiler.h"
#include "Luau/BytecodeBuilder.h"
#include "Luau/BytecodeUtils.h"
#include "Luau/Common.h"

// Normally defined by the VM, which this tool does not link.
LUAU_FASTFLAGVARIABLE(LuauCostModel)
#include <cstdio>
#include <fstream>
#include <iostream>
#include <sstream>

struct RobloxEncoder : Luau::BytecodeEncoder
{
    void encode(uint32_t* data, size_t count) override
    {
        for (size_t i = 0; i < count;)
        {
            uint8_t op = uint8_t(data[i]);
            int len = Luau::getOpLength(LuauOpcode(op));
            data[i] = (data[i] & ~0xffu) | uint8_t(op * 227);
            i += len;
        }
    }
};

int main(int argc, char** argv)
{
    if (argc < 3)
    {
        fprintf(stderr, "usage: luauc <in.lua> <out.bin>\n");
        return 1;
    }
    std::ifstream in(argv[1], std::ios::binary);
    std::stringstream ss;
    ss << in.rdbuf();
    Luau::CompileOptions opts;
    opts.optimizationLevel = 1;
    opts.debugLevel = 1;
    RobloxEncoder enc;
    std::string bc = Luau::compile(ss.str(), opts, {}, &enc);
    if (bc.empty() || bc[0] == 0)
    {
        fprintf(stderr, "compile error: %s\n", bc.c_str() + 1);
        return 1;
    }
    static const unsigned char magic[8] = {0x52, 0x7a, 0x10, 0x4a, 0x5b, 0x32, 0x09, 0xe0};
    std::ofstream out(argv[2], std::ios::binary);
    out.write((const char*)magic, 8);
    out.write(bc.data(), bc.size());
    return 0;
}
