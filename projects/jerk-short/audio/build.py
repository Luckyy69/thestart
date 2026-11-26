# Sound for "The Falling Jolt Before Sleep": a dreamy music-box lullaby that gets SMASHED by comic JOLTs (bed creak +
# whoosh + thump), crickets + a ticking clock, a chorus of 7 neighbour jolts, an X-ray with alarm beeps, a megaphone
# siren and lightning zaps, a golden jungle (birds, insects, tribal drums), an ape snore, a falling whistle, a branch
# creak + the jolt, a sabre-tooth sigh, then back to bed: a jolt, a proud pat, a leaf flutter and a ding.
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase
from instruments import m2f, brass, glock, vibes, musicbox, triangle, pluck, pad, cymbal, timpani, snare
import sfx_gen as G
from sfx_gen import vox, vowel_track, _track

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1230
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(2347)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
mus = np.zeros((2, N)); sfx = np.zeros((2, N))
def M(x, t, g=1.0, p=0.0): place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)

def jolt(r, size=1.0):
    out = np.zeros(ns(0.8))
    w = G.whoosh(0.35, r, 0.15, 400, 3500); out[:len(w)] += w * 0.6 * size
    t = tt(0.4); th = (lp(r.standard_normal(len(t)), 250) * np.exp(-t / 0.06) * 1.3 + np.sin(phase(80 * np.exp(-t / 0.1) + 45)) * np.exp(-t / 0.12)) * size
    i = ns(0.18); out[i:i + len(th)] += th[:len(out) - i]
    cr = G.creak(0.35, r, 140, 240) * 0.4 * size; i = ns(0.22); out[i:i + len(cr)] += cr[:len(out) - i]
    return fades(out, 0.002, 0.05)
def snore(r, d=1.6, base=90):
    n = ns(d); t = np.arange(n) / SR; env = np.clip(np.sin(np.pi * t / d), 0, 1) ** 1.5
    y = (lp(r.standard_normal(n), 400) * (1 + 0.8 * np.sign(np.sin(2 * np.pi * 28 * t))) * 0.4 + np.sin(phase(np.full(n, float(base)))) * 0.2) * env
    return fades(y, 0.02, 0.1)
def beep(f=1800, d=0.12): t = tt(d); return fades(np.sin(2 * np.pi * f * t) * 0.3, 0.003, 0.01)
def zap(r, d=0.3): t = tt(d); return fades(bp(r.standard_normal(len(t)), 2000, 8000, 1) * (np.sin(2 * np.pi * 60 * t) > 0.3) * np.exp(-t / 0.09) * 0.7, 0.002, 0.02)
def whistle(d=1.0): t = tt(d); return fades(np.sin(phase(np.geomspace(1800, 600, len(t)))) * 0.2, 0.02, 0.05)

# ---------------- music ----------------
C = {"C": [48, 55, 64, 67], "Am": [45, 52, 60, 64], "F": [41, 48, 57, 64], "G": [43, 50, 59, 62], "Dm": [50, 57, 62, 65], "Em": [40, 47, 55, 59], "E": [40, 47, 56, 59]}
def padc(ch, t, d, vel=0.22, warm=900): M(pad([m2f(m) for m in C[ch]], d, vel, r_(), att=0.4, rel=0.8, warm=warm), t, 0.5)
LULL = [76, 74, 72, 74, 76, 76, 76, 0, 74, 74, 74, 0, 76, 79, 79, 0]
def lullaby(t0, t1, vel=0.4):
    k = 0; t = t0
    while t < t1:
        m = LULL[k % len(LULL)]
        if m: M(musicbox(m2f(m), vel, r_()), t, 0.4, 0.2)
        if k % 4 == 0: padc(["C", "Am", "F", "G"][(k // 4) % 4], t, 1.6, 0.16, 700)
        k += 1; t += 0.4
lullaby(0.8, 4.9)
lullaby(10.1, 13.8, 0.35)
for b, ch in enumerate(["Am", "Dm", "E", "Am"]): padc(ch, 14.0 + b * 1.9, 1.9, 0.2 + 0.03 * b, 600)
# jungle: warm pad + tribal hand drums + a flute-ish vibes line
for b, ch in enumerate(["F", "C", "G", "Am", "F", "C"]): padc(ch, 22.4 + b * 1.95, 1.95, 0.22, 1200)
for k in range(int((31.6 - 22.6) / 0.29)):
    t0 = 22.6 + k * 0.29; n = R.standard_normal(ns(0.18)); x = np.arange(len(n)) / SR
    M((np.sin(phase(np.full(len(n), 110.0 if k % 2 == 0 else 160.0))) * np.exp(-x / 0.08) + bp(n, 300, 2000, 1) * np.exp(-x / 0.02) * 0.4) * (0.5 if k % 4 else 0.8), t0, 0.35, 0.3 * ((k % 2) * 2 - 1))
for i, m in enumerate([72, 74, 76, 79, 76, 74, 72, 69]): M(vibes(m2f(m), 0.35, r_()), 24.0 + i * 0.9, 0.3, -0.2)
for m in (60, 64, 67, 72): M(brass(m2f(m), 1.0, 0.85, r_(), kind="horn"), at("jolt", 1) - 0.05, 0.35)
M(cymbal(0.5, r_(), 2.2), at("jolt", 1) - 0.05, 0.3)
lullaby(34.6, 40.8, 0.38)
M(triangle(0.35, r_()), at("in") + 0.35, 0.3)

# ---------------- sfx ----------------
night = G.crickets(N / SR, r_(), 3) * 0.25
nm = np.zeros(N)
for a, b in [(0, 6.3), (6.3, 11.0), (34.4, DUR)]: nm[ns(a):ns(b)] = 1
nm = ndimage.uniform_filter1d(nm, ns(0.3)); S(night * nm, 0, 0.35)
for k in range(int(6.3 / 1.0)): t = tt(0.03); S(hp(R.standard_normal(len(t)), 3000) * np.exp(-t / 0.006) * 0.3, 0.2 + k, 0.2, 0.5)   # clock
S(snore(r_(), 0.3), 0.0, 0.3)
S(jolt(r_(), 1.1), 0.3 - 0.18, 1.0)
for (tw, p) in [(7.55, -0.6), (7.75, 0.5), (7.95, -0.4), (8.15, 0.6), (8.35, -0.5), (8.55, 0.4), (8.75, -0.2)]: S(jolt(r_(), 0.45), tw - 0.18, 0.45, p)
S(G.babble(1.2, r_(), 150, 1.0) * 0.1, 8.9, 0.15)   # grumbles
S(G.whoosh(0.7, r_(), 0.4, 300, 2500), 10.7, 0.35)   # back into the x-ray
hum = np.sin(phase(np.full(N, 110.0))) * 0.04 + lp(colored(N, r_(), 1.0), 400) * 0.12
xr = np.zeros(N); xr[ns(11.0):ns(22.3)] = 1; xr = ndimage.uniform_filter1d(xr, ns(0.3)); S(hum * xr, 0, 0.4)
t = tt(1.3); S(np.sin(phase(np.geomspace(500, 180, len(t)))) * np.exp(-t / 0.6) * 0.2, at("limp") - 0.3, 0.35)   # muscles deflate
for k in range(6): S(beep(1900 if k % 2 == 0 else 1500), at("drop") - 0.1 + k * 0.16, 0.4, 0.3)   # alarm
t = tt(1.3); S(np.sin(phase(700 + 300 * np.sin(2 * np.pi * 3 * t))) * 0.18 * fades(np.ones(len(t)), 0.05, 0.2), at("falling", 1) - 0.25, 0.35)   # megaphone siren
for k in range(8): S(zap(r_()), at("fires") + k * 0.11, 0.45, float(R.uniform(-0.7, 0.7)))
S(jolt(r_(), 0.9), at("once") - 0.23, 0.85)
S(G.whoosh(1.2, r_(), 0.5, 200, 3000), 22.1, 0.4)   # dream dissolve
S(G.bird_chirps(12.0, r_(), 0.8) * 0.4, 22.3, 0.25); S(G.breeze(12.0, r_(), 0.6) * 0.3, 22.3, 0.2)
S(snore(r_(), 1.4, 120) * 0.8, 27.0, 0.3); S(snore(r_(), 1.2, 125) * 0.8, 28.6, 0.25)
t = tt(0.8); S(lp(R.standard_normal(len(t)), 900) * np.exp(-t / 0.3) * 0.3, at("much") - 0.2, 0.35)   # slide scrape
S(whistle(1.3), at("fall") - 0.1, 0.5)
S(jolt(r_(), 1.2), at("jolt", 1) - 0.23, 1.0); S(G.creak(0.9, r_(), 90, 160) * 0.5, at("jolt", 1) + 0.1, 0.5)   # branch
t = tt(1.2); S(lp(R.standard_normal(len(t)), 500) * np.exp(-t / 0.5) * 0.35 + np.sin(phase(np.geomspace(160, 90, len(t)))) * np.exp(-t / 0.5) * 0.15, at("ground") + 0.2, 0.4, 0.3)   # cat sigh
S(G.whoosh(0.4, r_(), 0.2, 400, 3000), 34.45, 0.4)   # jolt cut
S(jolt(r_(), 0.6), at("next") + 0.1 - 0.18, 0.6)
t = tt(0.1); S(lp(R.standard_normal(len(t)), 900) * np.exp(-t / 0.02) * 0.5, at("you", 2) - 0.2, 0.35); S(lp(R.standard_normal(len(t)), 900) * np.exp(-t / 0.02) * 0.5, at("you", 2) + 0.05, 0.35)   # pat pat
t = tt(2.0); S(bp(R.standard_normal(len(t)), 1500, 5000, 1) * (0.5 + 0.5 * np.sin(2 * np.pi * 4 * t)) * np.sin(np.pi * t / 2.0) * 0.12, at("saved") - 0.1, 0.3, 0.3)   # leaf flutter
t = tt(1.0); S(np.sin(2 * np.pi * 1568 * t) * np.exp(-t / 0.3) * 0.3, at("in") + 0.05, 0.35)
for f in [190, 330, 670, 1035]: S(G.whoosh(0.45, r_(), 0.3, 300, 2400), f / FPS - 0.3, 0.15)

# ---------------- mix ----------------
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12)); gain_m = 10 ** ((-6.0 * duck) / 20)
stop = np.ones(N); stop[ns(0.1):ns(0.75)] = 0.0; stop[ns(31.0):ns(32.05)] = 0.15; stop = ndimage.uniform_filter1d(stop, ns(0.05))
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
v = to_lufs(v, V_T); m = to_lufs(mus, V_T - 9.0 + 3.0) * gain_m * stop; s = to_lufs(sfx, V_T - 7.0 - 4.0)
mix = to_lufs(v + m + s, -15.0)
ceil = 10 ** (-1.5 / 20)
mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
mix = fades(mix, 0.002, 0.4)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print("mix LUFS", round(integrated(mix), 2), "len", mix.shape[1] / SR)
