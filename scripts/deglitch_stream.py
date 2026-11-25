# Streaming version: pass 1 computes small grids, pass 2 re-encodes, replacing isolated dark dips with the previous frame.
import subprocess, sys, numpy as np
src, dst, W, H = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
FS = W * H * 3; step = max(1, W // 27)
def frames():
    rd = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, bufsize=FS)
    while True:
        b = rd.stdout.read(FS)
        if len(b) < FS: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
G = [f[::step, ::step].astype(np.float32).mean(axis=2) for f in frames()]
n = len(G); bad = set()
for i in range(1, n - 1):
    for k in (1, 2):
        j = i + k
        if j >= n: continue
        a, c = G[i - 1], G[j]
        if np.mean(np.abs(a - c)) >= 12: continue
        if all(np.mean(np.clip((a + c) / 2 - G[m], 0, None) > 20) > 0.12 for m in range(i, j)):
            bad.update(range(i, j)); break
print("replaced frames:", sorted(bad))
wr = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "30", "-i", "-", "-i", src,
                       "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", dst], stdin=subprocess.PIPE)
prev = None
for i, f in enumerate(frames()):
    out = prev if (i in bad and prev is not None) else f
    wr.stdin.write(out.tobytes())
    if i not in bad: prev = f
wr.stdin.close(); wr.wait()
