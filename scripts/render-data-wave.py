"""Render the approved data-wave still as a deterministic, silent eight-second loop.

Requires numpy, opencv-python-headless and imageio-ffmpeg.
Usage: python scripts/render-data-wave.py INPUT.jpg OUTPUT.mp4
The source image is displaced gently; no generative video service is involved.
"""

import subprocess
import sys
from pathlib import Path

import cv2
import imageio_ffmpeg
import numpy as np


def render(source: Path, output: Path) -> None:
    width, height, fps, seconds = 1920, 1080, 30, 8
    image = cv2.imread(str(source))
    if image is None:
        raise ValueError(f"Cannot read {source}")
    image = cv2.resize(image, (width, height), interpolation=cv2.INTER_CUBIC)
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    nx, ny = x / width, y / height
    # Anchor the quiet headline area and frame edges; animate the wave itself.
    edge = np.sin(np.pi * nx) * np.sin(np.pi * ny)
    area = np.clip((ny - 0.18) / 0.35, 0, 1) * edge
    phase = 2 * np.pi * (nx * 1.2 + ny * 0.25)
    light_phase = 2 * np.pi * (nx * 1.8 - ny * 0.4)
    luminance = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    highlights = np.clip((luminance - 0.16) / 0.55, 0, 1) * area
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'warning',
        '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{width}x{height}',
        '-r', str(fps), '-i', '-', '-an', '-c:v', 'libx264',
        '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', str(output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for frame in range(fps * seconds):
            # Integer harmonics return to the same position and velocity at 8s.
            t = 2 * np.pi * frame / (fps * seconds)
            dx = 4 * area * (np.sin(phase + t) - np.sin(phase))
            dy = 15 * area * (np.sin(phase - t) - np.sin(phase))
            warped = cv2.remap(image, x + dx, y + dy, cv2.INTER_LINEAR,
                               borderMode=cv2.BORDER_REFLECT_101)
            glow = 1 + 0.14 * highlights * (np.sin(light_phase - t) - np.sin(light_phase))
            pixels = np.clip(warped.astype(np.float32) * glow[..., None], 0, 255).astype(np.uint8)
            process.stdin.write(pixels.tobytes())
            if frame % fps == 0:
                print(f'Rendered {frame // fps}/{seconds}s', flush=True)
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError('Video encoding failed')
    print(f'Saved {output} ({output.stat().st_size / 1024 / 1024:.2f} MiB)')


if __name__ == '__main__':
    render(Path(sys.argv[1]), Path(sys.argv[2]))
