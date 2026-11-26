# Sound for "Your Voice on Recordings": a lo-fi bedroom groove, a squeaky phone playback "hello?", X-ray hum with blue
# AIR whooshes and an orange BONE thrum, a "deeper" bass drop, a mic thump + REC beep, a crowd of "yep"s, a 2013 lab
# (booth hum, slider clicks), BEAN's own voice played back smooth, a harp gliss + heart pops at the peak, warm outro.
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase
from instruments import m2f, brass, glock, vibes, musicbox, triangle, pluck, pad, cymbal, timpani, snare
import sfx_gen as G
from sfx_gen import vox, vowel_track, _track

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1200
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(2013)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
mus = np.zeros((2, N)); sfx = np.zeros((2, N))
def M(x, t, g=1.0, p=0.0): place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)

def hello(r, base=240, scale=1.25, d=0.55, nasal=True):
    n = ns(d); t = np.arange(n) / SR
    f0 = base * _track(n, [(0, 1.0), (d * 0.35, 1.15), (d, 1.35)], t)
    amp = np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.06, 0, 1)
    y = vox(f0, vowel_track(n, [(0, "e"), (d * 0.4, "e"), (d * 0.55, "o"), (d, "U")]), amp, r, scale, tilt=0.9 if nasal else 1.2, breath=0.15)
    if nasal: y = hp(y, 700) * 1.6   # tinny phone speaker
    return fades(y, 0.003, 0.03)
def yep(r, base, scale): d = 0.25; n = ns(d); t = np.arange(n) / SR; return fades(vox(base * _track(n, [(0, 1.1), (d, 0.85)], t), vowel_track(n, [(0, "e"), (d, "e")]), np.clip(t / 0.01, 0, 1) * np.clip((d - t) / 0.04, 0, 1), r, scale, tilt=1.0, breath=0.3), 0.002, 0.02)
def click(r, f=3000): t = tt(0.025); return hp(r.standard_normal(len(t)), f) * np.exp(-t / 0.004) * 0.5

# ---------------- music ----------------
C = {"Fmaj7": [41, 53, 57, 60, 64], "Em7": [40, 52, 55, 59, 62], "Dm7": [38, 50, 53, 57, 60], "Cmaj7": [36, 48, 52, 55, 59], "Am7": [45, 52, 55, 60, 64], "G": [43, 50, 55, 59, 62]}
def padc(ch, t, d, vel=0.22, warm=1000): M(pad([m2f(m) for m in C[ch][1:]], d, vel, r_(), att=0.3, rel=0.8, warm=warm), t, 0.5)
def plk(m, t, v=0.4, p=0.0, bright=0.5, dur=0.6): M(pluck(m2f(m), v, r_(), dur, bright), t, 0.5, p)
BPM = 84; B = 60 / BPM
def lofi(t0, t1, prog, vel=0.38):
    k = 0; t = t0
    while t < t1 - 0.1:
        ch = prog[(k // 4) % len(prog)]
        if k % 4 == 0: padc(ch, t, 4 * B, 0.2, 900); plk(C[ch][0] + 12, t, vel * 0.9, -0.2, 0.3, 1.2)
        plk(C[ch][2 + (k % 3)] + 12, t + 0.03, vel * 0.6, 0.3, 0.45, 0.4)
        if k % 2 == 1: n = R.standard_normal(ns(0.1)); M(bp(n, 1500, 6000, 1) * np.exp(-np.arange(len(n)) / SR / 0.03) * 0.15, t, 0.4, -0.1)   # snare-ish
        k += 1; t += B
lofi(0.0, 4.2, ["Fmaj7", "Em7"])
for b, ch in enumerate(["Am7", "Fmaj7", "Dm7", "Em7", "Am7", "Fmaj7", "G"]): padc(ch, 4.2 + b * 1.9, 1.9, 0.22, 650)
for k in range(10): M(glock(m2f([76, 79, 83, 88][k % 4]), 0.2, r_(), 0.8), 4.3 + k * 0.12, 0.25, 0.4 * np.sin(k))
lofi(17.3, 24.8, ["Fmaj7", "Em7", "Dm7", "Cmaj7"])
for i, m in enumerate([67, 64, 60]): plk(m, at("life") + i * 0.18, 0.45)
# lab: curious, sparse
for b, ch in enumerate(["Am7", "Dm7", "Em7", "Am7"]): padc(ch, 24.9 + b * 1.7, 1.7, 0.2, 800)
for k in range(12): M(musicbox(m2f([72, 76, 79, 83][k % 4]), 0.3, r_()), 25.0 + k * 0.55, 0.3, 0.2)
# peak: harp gliss up + warm chord
for i in range(16): M(vibes(m2f(60 + [0, 4, 7, 11, 12, 16, 19, 23, 24, 28, 31, 35, 36, 40, 43, 47][i]), 0.35, r_()), at("higher") - 0.4 + i * 0.04, 0.3, 0.6 * np.sin(i))
padc("Fmaj7", at("higher"), 2.0, 0.32, 1500)
lofi(35.3, 40.0, ["Fmaj7", "Cmaj7"], 0.34)
M(triangle(0.35, r_()), 38.6, 0.25)

# ---------------- sfx ----------------
S(G.bird_chirps(4.2, r_(), 0.3) * 0.3, 0.0, 0.15); S(G.bird_chirps(4.6, r_(), 0.3) * 0.3, 35.4, 0.15)
S(click(r_(), 2500), 0.05, 0.4)   # tap play
S(hello(r_(), 250, 1.3), 0.15, 0.7, 0.2); S(hello(r_(), 270, 1.3, 0.4), 0.85, 0.55, 0.2)   # squeaky playback
S(G.whoosh(0.6, r_(), 0.4, 300, 2500), 4.0, 0.35)   # into the x-ray
hum = np.sin(phase(np.full(N, 120.0))) * 0.04 + lp(colored(N, r_(), 1.0), 400) * 0.12
xr = np.zeros(N); xr[ns(4.3):ns(17.2)] = 1; xr = ndimage.uniform_filter1d(xr, ns(0.3)); S(hum * xr, 0, 0.4)
for k in range(3): S(G.whoosh(0.5, r_(), 0.3, 800, 4000), at("air") - 0.1 + k * 0.28, 0.25, 0.5)   # air rings
t = tt(2.2); S(np.sin(phase(np.full(len(t), 70.0))) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) * fades(np.ones(len(t)), 0.1, 0.4) * 0.5, at("skull") - 0.1, 0.45)   # bone thrum
t = tt(1.2); S(np.sin(phase(np.geomspace(110, 45, len(t)))) * np.exp(-t / 0.5) * 0.7, at("deeper") - 0.05, 0.6)   # bass drop
S(G.push_thump(r_()), at("microphone") - 0.1, 0.5)
t = tt(0.25); S(np.sin(2 * np.pi * 1000 * t) * 0.25 * fades(np.ones(len(t)), 0.005, 0.01), at("part") + 0.1, 0.3)   # REC beep
for k, (base, sc, p) in enumerate([(120, 0.95, -0.6), (210, 1.1, 0.6), (160, 1.0, -0.3), (130, 0.9, 0.3), (230, 1.15, 0.0)]): S(yep(r_(), base, sc), at("heard") + 0.1 + k * 0.17, 0.4, p)
t = tt(0.4); S(np.sin(phase(np.geomspace(600, 900, len(t)))) * np.exp(-t / 0.15) * 0.15, at("heard") + 1.0, 0.3, 0.6)   # cat mrrp
S(G.whoosh(0.5, r_(), 0.4, 300, 2500), 24.6, 0.35)   # whip to the lab
booth = lp(colored(N, r_(), 1.0), 250) * 0.1; lb = np.zeros(N); lb[ns(24.9):ns(35.3)] = 1; lb = ndimage.uniform_filter1d(lb, ns(0.3)); S(booth * lb, 0, 0.3)
for k in range(6): S(click(r_(), 2000), at("rated") + 0.25 * k, 0.3, 0.3)
S(hello(r_(), 140, 0.98, 0.6, False), at("voice", 2) + 0.2, 0.45, -0.2)   # BEAN's own voice, smooth
for k in range(6): t = tt(0.12); S(np.sin(2 * np.pi * (1200 + 200 * k) * t) * np.exp(-t / 0.04) * 0.2, at("higher") + 0.2 + k * 0.12, 0.35, 0.5 * np.sin(k))   # heart pops
S(click(r_(), 2500), at("hate") - 0.2, 0.35)
for f in [125, 520, 745, 1060]: S(G.whoosh(0.45, r_(), 0.3, 300, 2400), f / FPS - 0.3, 0.15)

# ---------------- mix ----------------
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12)); gain_m = 10 ** ((-6.0 * duck) / 20)
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
v = to_lufs(v, V_T); m = to_lufs(mus, V_T - 9.0 + 3.0) * gain_m; s = to_lufs(sfx, V_T - 7.0 - 4.0)
mix = to_lufs(v + m + s, -15.0)
ceil = 10 ** (-1.5 / 20)
mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
mix = fades(mix, 0.002, 0.4)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print("mix LUFS", round(integrated(mix), 2), "len", mix.shape[1] / SR)
