// Host-side checks of the encoder: compiles sample scripts, round-trips the
// RSB1 container, and verifies the opcode encoding can be undone.
//   encoder_test [file.lua ...]
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <sstream>
#include <string>

#include "../src/encoder.h"
#include "Luau/Bytecode.h"

static int failures = 0;
static void check(bool ok, const char* what, const std::string& name) {
    std::printf("%s %s: %s\n", ok ? "ok  " : "FAIL", name.c_str(), what);
    if (!ok) failures++;
}

static void test(const std::string& name, const std::string& src) {
    std::string bc = lrm::compile_client(src);
    check(!bc.empty() && bc[0] != 0, "compiles", name);
    if (bc.empty() || bc[0] == 0) return;
    check(uint8_t(bc[0]) >= LBC_VERSION_MIN && uint8_t(bc[0]) <= LBC_VERSION_MAX, "bytecode version within Luau LBC_VERSION_MIN..MAX", name);
    std::string enc = lrm::rsb1_encode(bc), dec;
    check(!enc.empty() && enc.compare(0, 4, "RSB1") != 0, "container is obfuscated", name);
    check(lrm::rsb1_decode(enc, dec) && dec == bc, "RSB1 round trip", name);
}

int main(int argc, char** argv) {
    test("inline", "local x = workspace:FindFirstChild('Baseplate')\nprint(x, Vector3.new(1,2,3))\n");
    std::string err = lrm::compile_client("local = ");
    check(!err.empty() && err[0] == 0, "syntax error reported as '\\0'+message", "error");
    for (int i = 1; i < argc; i++) {
        std::ifstream f(argv[i], std::ios::binary);
        std::stringstream ss;
        ss << f.rdbuf();
        test(argv[i], ss.str());
    }
    std::printf("%d failure(s)\n", failures);
    return failures ? 1 : 0;
}
