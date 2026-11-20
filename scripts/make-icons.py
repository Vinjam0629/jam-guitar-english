#!/usr/bin/env python3
"""Draw a simple bench-guitar mark. System has no font dependency."""

import struct
import zlib
from pathlib import Path

WALNUT = (60, 36, 21, 255)
CREAM = (246, 240, 230, 255)
AMBER = (196, 123, 43, 255)
HOLE = (92, 58, 36, 255)


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def ellipse(cx: float, cy: float, rx: float, ry: float, x: float, y: float) -> bool:
    if rx <= 0 or ry <= 0:
        return False
    dx = (x - cx) / rx
    dy = (y - cy) / ry
    return dx * dx + dy * dy <= 1


def paint(size: int) -> bytes:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        cy = (y + 0.5) / size
        for x in range(size):
            cx = (x + 0.5) / size
            color = WALNUT
            neck = 0.43 <= cx <= 0.57 and 0.08 <= cy <= 0.62
            head = ellipse(0.5, 0.11, 0.16, 0.07, cx, cy)
            body = ellipse(0.5, 0.72, 0.30, 0.20, cx, cy)
            lower = ellipse(0.5, 0.80, 0.24, 0.13, cx, cy)
            if neck or head or body or lower:
                color = CREAM
            hole = ellipse(0.5, 0.74, 0.075, 0.075, cx, cy)
            if hole:
                color = HOLE
            ring = ellipse(0.5, 0.74, 0.095, 0.095, cx, cy) and not hole
            if ring and (body or lower):
                color = AMBER
            if neck and not head:
                fret_y = cy * size
                for fret in (0.22, 0.32, 0.42, 0.52):
                    if abs(cy - fret) < 1.2 / size:
                        color = WALNUT
            raw.extend(color)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")


def main() -> None:
    public = Path(__file__).resolve().parents[1] / "public"
    public.mkdir(parents=True, exist_ok=True)
    (public / "icon-192.png").write_bytes(paint(192))
    (public / "icon-512.png").write_bytes(paint(512))
    (public / "apple-touch-icon.png").write_bytes(paint(180))


if __name__ == "__main__":
    main()
