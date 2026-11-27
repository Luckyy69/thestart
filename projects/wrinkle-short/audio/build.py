# Sound for "Rain Tires": a bouncy pizzicato/marimba bath groove, an electric X-ray, a dreamy micro world, a quiz-show
# race with a dead stop before the peak, a prehistoric rainstorm, and a playful reprise ending on a tire-screech grab.
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, pan, st, place, integrated, read_wav, write_wav, phase
from instruments import m2f, brass, glock, vibes, triangle, pluck, pad, cymbal, timpani, snare
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1170
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(4471)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
mus = np.zeros((2, N)); sfx = np.zeros((2, N))
def M(x, t, g=1.0, p=0.0): place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def env(d, a=0.005, tau=0.1): t = tt(d); return np.minimum(1, t / a) * np.exp(-t / tau)
def blip(f0, f1, d=0.15, g=0.3): t = tt(d); return fades(np.sin(phase(np.geomspace(f0, f1, len(t)))) * g, 0.003, 0.02)
def squeak(d=0.25, f=1400): t = tt(d); return fades(np.sin(phase(f + 500 * np.sin(2 * np.pi * 18 * t))) * np.sin(np.pi * t / d) * 0.2, 0.005, 0.02)
def wrench(r, d=0.5): t = tt(d); return fades(bp(r.standard_normal(len(t)), 600, 4000, 1) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 38 * t))) * 0.5 + np.sin(phase(np.full(len(t), 190.0))) * 0.15, 0.005, 0.04)
def screech(r, d=0.6, f=2300): t = tt(d); return fades((np.sin(phase(f + 120 * np.sin(2 * np.pi * 7 * t))) * 0.25 + bp(r.standard_normal(len(t)), 1800, 5000, 1) * 0.25) * np.minimum(1, t / 0.02) * np.exp(-t / (d * 0.6)), 0.003, 0.05)
def thunk(r, g=1.0): t = tt(0.4); return (lp(r.standard_normal(len(t)), 300) * np.exp(-t / 0.05) * 1.2 + np.sin(phase(np.geomspace(120, 55, len(t)))) * np.exp(-t / 0.12)) * g
def snip(r): out = np.zeros(ns(0.25)); c = bp(r.standard_normal(ns(0.04)), 2500, 9000, 1) * env(0.04, 0.001, 0.008) * 0.8; out[:len(c)] += c; out[ns(0.07):ns(0.07) + len(c)] += c * 1.2; return out
def plip(r, f=900): t = tt(0.12); return fades(np.sin(phase(np.geomspace(f, f * 2.6, len(t)))) * np.exp(-t / 0.035) * 0.35, 0.002, 0.01)
def heartbeat(t0, t1, bpm=72, g=0.4):
    k = 0; t = t0
    while t < t1:
        for o in (0, 0.18):
            x = tt(0.2); M(np.sin(phase(np.geomspace(70, 40, len(x)))) * np.exp(-x / 0.06) * (1 if o == 0 else 0.7), t + o, g)
        t += 60 / bpm
def tick(r): t = tt(0.03); return hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.005) * 0.35

# ---------------- music ----------------
C = {"C": [36, 48, 55, 64], "F": [41, 48, 57, 65], "G": [43, 50, 59, 62], "Am": [45, 52, 60, 64], "Dm": [38, 50, 57, 65], "E": [40, 47, 56, 59], "Bb": [46, 50, 58, 65]}
B = 0.5
def groove(t0, t1, prog, vel=0.55, mel=True):
    k = 0; t = t0
    while t < t1 - 0.05:
        ch = C[prog[(k // 8) % len(prog)]]
        if k % 2 == 0: M(pluck(m2f(ch[0] if k % 4 == 0 else ch[0] + 7), 0.6 * vel, r_(), 0.4, 0.4), t, 0.5)
        if mel and k % 2 == 1: M(pluck(m2f(ch[2 + (k // 2) % 2] + 12), 0.45 * vel, r_(), 0.35, 0.7), t, 0.35, 0.2 * ((k % 4) - 1.5))
        if k % 4 == 2: M(snare(0.25 * vel, r_(), 0.2, 1.2, 0.6), t, 0.25)
        k += 1; t += B / 2
groove(0.25, 6.85, ["C", "F", "G", "C"])
# x-ray: electric vibes arps over the same groove, cut by the stamp
groove(6.9, 12.75, ["Am", "F", "G", "E"], 0.5, mel=False)
for i in range(int((12.75 - 6.9) / 0.125)):
    ch = C[["Am", "F", "G", "E"][(i // 16) % 4]]; M(vibes(m2f(ch[1 + i % 3] + 24), 0.25, r_(), 0.4), 6.9 + i * 0.125, 0.18, 0.4 * np.sin(i))
for m in (48, 55, 60, 64): M(brass(m2f(m), 0.9, 0.9, r_(), kind="horn"), at("purpose") - 0.03, 0.4)
M(cymbal(0.6, r_(), 2.0), at("purpose") - 0.03, 0.35); M(timpani(m2f(36), 0.9, r_()), at("purpose") - 0.03, 0.5)
# micro: dreamy pad + glock arps + heartbeat
for b, ch in enumerate(["F", "C", "Dm", "Bb", "F"]): M(pad([m2f(m) for m in C[ch][1:]], 2.0, 0.22, r_(), att=0.5, rel=0.8, warm=1100), 13.6 + b * 1.95, 0.5)
for i in range(int((23.2 - 13.8) / 0.25)):
    ch = C[["F", "C", "Dm", "Bb", "F"][min(4, int(i * 0.25 / 1.95))]]; M(glock(m2f(ch[1 + i % 3] + 24), 0.3, r_(), 1.0), 13.8 + i * 0.25, 0.18, 0.3 * np.sin(i * 1.3))
heartbeat(13.8, 23.0, 76, 0.35)
for i, m in enumerate([60, 64, 67, 72]): M(brass(m2f(m), 0.35, 0.6, r_(), kind="horn"), at("tire") + i * 0.09, 0.3)
# lab: quiz-show staccato + stopwatch, DEAD STOP before "faster", fanfare on the win
for i in range(int((25.6 - 23.4) / 0.25)): M(pluck(m2f([45, 52, 45, 53][i % 4]), 0.55, r_(), 0.2, 0.3), 23.4 + i * 0.25, 0.5)
for i in range(int((25.6 - 24.7) / 0.125)): M(snare(0.2 + 0.04 * i, r_(), 0.12), 24.7 + i * 0.125, 0.2)
M(cymbal(0.8, r_(), 2.4), at("faster") - 0.05, 0.4); M(timpani(m2f(41), 1.0, r_()), at("faster") - 0.05, 0.5)
for i, m in enumerate([60, 64, 67]): M(brass(m2f(m), 0.18, 0.8, r_(), kind="horn"), at("wrinkly", 1) + i * 0.12, 0.38)
for m in (60, 64, 67, 72): M(brass(m2f(m), 1.1, 0.85, r_(), kind="horn"), at("wrinkly", 1) + 0.36, 0.38)
# rain: dramatic timpani + low brass + minor pad
for b, ch in enumerate(["Am", "F", "E"]): M(pad([m2f(m) for m in C[ch][1:]], 1.5, 0.25, r_(), att=0.3, rel=0.6, warm=800), 28.1 + b * 1.4, 0.5)
for i in range(8): M(timpani(m2f(33 if i % 2 == 0 else 40), 0.6 + 0.05 * i, r_(), 0.8), 28.1 + i * 0.5, 0.35)
for m in (45, 52, 57): M(brass(m2f(m), 0.6, 0.8, r_(), kind="tuba"), at("grip") - 0.05, 0.4)
# outro reprise, ends on a triangle + ding
groove(32.35, 36.2, ["C", "F", "G", "C"], 0.45)
for m in (48, 55, 64, 72): M(pluck(m2f(m), 0.6, r_(), 1.6, 0.6), at("mode") + 0.15, 0.4)
M(triangle(0.45, r_()), at("mode") + 0.2, 0.3); M(glock(m2f(84), 0.5, r_(), 2.0), at("mode") + 0.25, 0.25)

# ---------------- sfx ----------------
bath = G.water_bed(DUR, r_(), 0.6, 0.5) if True else None
bath = st(bath)[:, :N] if np.ndim(bath) == 1 else bath[:, :N]
bm = np.zeros(N)
for a, b in [(0, 7.2), (32.1, DUR)]: bm[ns(a):ns(b)] = 1
bm = ndimage.uniform_filter1d(bm, ns(0.3)); S(bath * bm, 0, 0.18)
fz = G.bubbles(DUR, r_(), 14, 1500, 6000); fz = fz if np.ndim(fz) == 1 else fz[0]; S(fz[:N] * bm[:len(fz[:N])], 0, 0.12)
for tdrip in (1.2, 4.1, 33.6, 37.4): S(plip(r_(), 700), tdrip, 0.2, -0.6)
S(squeak(0.3, 1600), at("fingers") - 0.1, 0.35)   # pruney finger squeak
S(plip(r_(), 1100), at("water") - 0.05, 0.5); S(blip(500, 1400, 0.2, 0.3), at("soaking") - 0.05, 0.35)   # drop bounces off
S(G.whoosh(0.4, r_(), 0.2, 500, 3000), at("brain") - 0.35, 0.3)
S(wrench(r_(), 0.45), at("putting") - 0.05, 0.45, 0.3); S(wrench(r_(), 0.35), at("rain") + 0.05, 0.45, 0.3)
t = tt(0.25); S(lp(R.standard_normal(len(t)), 600) * np.exp(-t / 0.06) * 0.5, at("tires") + 0.05, 0.4)   # tire thump on
S(G.whoosh(0.6, r_(), 0.35, 300, 2500), 6.65, 0.3)   # push into the hand
hum = np.sin(phase(np.full(N, 120.0))) * 0.04 + lp(colored(N, r_(), 1.0), 500) * 0.08
xm = np.zeros(N); xm[ns(6.9):ns(13.6)] = 1; xm = ndimage.uniform_filter1d(xm, ns(0.3)); S(hum * xm, 0, 0.4)
t = tt(0.8); S(np.sin(phase(np.geomspace(300, 1800, len(t)))) * np.sin(np.pi * t / 0.8) * 0.12, at("nerve") - 0.2, 0.35)   # nerves light up
S(snip(r_()), at("cut") - 0.06, 0.6); S(G.whoosh(0.2, r_(), 0.1, 2000, 8000), at("cut") - 0.02, 0.2)
t = tt(0.3); S(bp(R.standard_normal(len(t)), 2000, 9000, 1) * (np.sin(2 * np.pi * 60 * t) > 0.2) * np.exp(-t / 0.08) * 0.5, at("cut") + 0.05, 0.35)  # spark
for k in range(4): S(squeak(0.18, 1000 + 180 * k), at("never") + 0.15 * k, 0.25, -0.5 + 0.33 * k)   # 4 fingers scrunch
S(thunk(r_(), 1.1), at("purpose") - 0.03, 0.7)   # STAMP
S(G.whoosh(1.0, r_(), 0.5, 200, 2500), 13.2, 0.35)   # dive into the fingertip
mic = lp(colored(N, r_(), 1.5), 300) * 0.25; mm = np.zeros(N); mm[ns(13.5):ns(23.3)] = 1; mm = ndimage.uniform_filter1d(mm, ns(0.4)); S(mic * mm, 0, 0.35)
for k in range(5): S(plip(r_(), 500 + 90 * k), at("wet") - 0.2 + 0.17 * k, 0.4, float(R.uniform(-0.6, 0.6)))
for k in range(3): S(squeak(0.35, 600 + 100 * k), at("squeeze") + 0.3 * k, 0.35)
t = tt(1.0); S(np.sin(phase(np.geomspace(600, 120, len(t)))) * np.exp(-t / 0.5) * 0.25, at("shrink") - 0.2, 0.4)   # deflate
for k in range(4): S(G.creak(0.25, r_(), 200, 300) * 0.5, at("fold") + 0.12 * k, 0.35)
t = tt(1.6); S(lp(R.standard_normal(len(t)), 250) * np.sin(np.pi * t / 1.6) * 0.5, at("tread") - 1.0, 0.4)   # tire roll
S(blip(700, 520, 0.25, 0.3) + 0, at("tire") + 0.1, 0.35)   # honk
S(G.whoosh(0.5, r_(), 0.3, 400, 3000), 23.1, 0.3)
for i in range(int((25.6 - 24.75) / 0.5) + 1): S(tick(r_()), 24.75 + i * 0.5, 0.4, 0.4)
S(blip(1500, 1500, 0.15, 0.3), at("people") - 0.15, 0.4)   # start beep
for k in range(9): S(G.clink(r_(), 2500 + 200 * (k % 3), 0.1), 24.8 + k * 0.3, 0.3, 0.5)   # wrinkly: fast clinks
for k in range(2): S(G.clink(r_(), 2200, 0.1), 24.9 + k * 0.9, 0.25, -0.5)
for k in range(16): S(G.clink(r_(), float(R.uniform(1800, 3800)), 0.1), at("faster") + float(R.uniform(0, 0.9)), 0.3, float(R.uniform(-1, 0.2)))   # SMOOTH fumble: marbles everywhere
t = tt(0.9); S(np.sin(phase(np.geomspace(1600, 300, len(t)))) * 0.18, at("faster") + 0.05, 0.4, -0.4)   # slide whistle down
S(G.applause(1.6, r_(), 20) * 0.5, at("wrinkly", 1) + 0.3, 0.3)
rain = bp(colored(N, r_(), 0.5), 800, 9000, 1) * 0.35; rm = np.zeros(N); rm[ns(27.9):ns(32.4)] = 1; rm = ndimage.uniform_filter1d(rm, ns(0.4)); S(rain * rm, 0, 0.35)
t = tt(3.0); S(lp(R.standard_normal(len(t)), 120) * np.exp(-t / 1.0) * 0.9, 28.3, 0.4)   # thunder
S(G.whoosh(0.6, r_(), 0.3, 200, 2000), 27.85, 0.3)
t = tt(0.4); S(bp(R.standard_normal(len(t)), 300, 2500, 1) * np.exp(-t / 0.12) * 0.5, at("grip") - 0.45, 0.4)   # foot slips
S(screech(r_(), 0.7), at("grip") - 0.08, 0.6)   # GRIP screech
S(G.creak(0.6, r_(), 120, 200) * 0.6, at("branches") - 0.1, 0.4); S(G.whoosh(0.7, r_(), 0.3, 300, 2500), at("branches") - 0.4, 0.35)
S(G.whoosh(0.5, r_(), 0.3, 300, 2500), 32.0, 0.3)
wr = bp(colored(N, r_(), 0.3), 2000, 9000, 1) * 0.12; wm = np.zeros(N); wm[ns(32.3):N] = 1; wm = ndimage.uniform_filter1d(wm, ns(0.4)); S(wr * wm, 0, 0.2, 0.6)   # rain on the window
b2 = G.bubbles(1.0, r_(), 10, 200, 900); S(b2 if np.ndim(b2) == 1 else b2[0], at("stuck"), 0.35)   # chin in foam: blub
t = tt(0.9); S(lp(R.standard_normal(len(t)), 700) * np.sin(np.pi * t / 0.9) * 0.15, at("hands", 1) - 0.4, 0.3)   # sigh-ish
for k, tk in enumerate([33.2, 34.0, 34.9, 35.5]): S(squeak(0.15, 1800 + 150 * k), tk, 0.22, float(R.uniform(-0.6, 0.6)))   # soap squirts
S(screech(r_(), 0.45, 2600), at("rain", 2) - 0.08, 0.5)   # grab = tire screech
S(blip(1200, 1800, 0.2, 0.25), at("mode") - 0.1, 0.35)   # badge pop

# ---------------- mix ----------------
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12)); gain_m = 10 ** ((-6.0 * duck) / 20)
stop = np.ones(N); stop[ns(25.6):ns(at("faster") - 0.06)] = 0.05; stop = ndimage.uniform_filter1d(stop, ns(0.04))
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
v = to_lufs(v, V_T); m = to_lufs(mus, V_T - 6.0) * gain_m * stop; s = to_lufs(sfx, V_T - 11.0)
mix = to_lufs(v + m + s, -15.0)
ceil = 10 ** (-1.5 / 20)
mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
mix = fades(mix, 0.002, 0.4)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print("mix LUFS", round(integrated(mix), 2), "len", mix.shape[1] / SR)
