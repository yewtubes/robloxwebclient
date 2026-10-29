# Prints the SHA-256 (hex) of the certificate a local RbxTransport/WebTransport
# server presents, e.g. Studio's "Roblox RtcIo WebTransport" self-signed cert.
#   python3 wt_cert_hash.py <port> [host]
import asyncio, hashlib, ssl, sys
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.quic.configuration import QuicConfiguration
from aioquic.quic.connection import QuicConnection
from cryptography.hazmat.primitives.serialization import Encoding

async def main(port, host):
    cfg = QuicConfiguration(is_client=True, alpn_protocols=['h3'], verify_mode=ssl.CERT_NONE, server_name='localhost')
    conn = QuicConnection(configuration=cfg)
    loop = asyncio.get_running_loop()
    transport, proto = await loop.create_datagram_endpoint(lambda: QuicConnectionProtocol(conn), remote_addr=(host, port))
    proto.connect((host, port))
    await proto.wait_connected()
    print(hashlib.sha256(conn.tls._peer_certificate.public_bytes(Encoding.DER)).hexdigest())
    proto.close()
    transport.close()

asyncio.run(asyncio.wait_for(main(int(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else '127.0.0.1'), 5))
