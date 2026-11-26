# Sound for "The Sun Sneeze": sunrise street (birds, door), synthesized sneezes ("ah... ah... CHOO!"), a Greek lyre theme,
# an English harpsichord-ish theme for Bacon, electric X-ray nerves (hum, zaps, sparks), a dead stop + the colossal peak
# ACHOO (boom + whoosh), a family sneeze chain, a 1978 conference (murmur, projector fan, drumroll, five "ding"s for the
# words, a sparkle for the initials, the final ACHOO + applause).
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase
from instruments import m2f, brass, glock, vibes, musicbox, triangle, pluck, pad, cymbal, timpani, snare
import sfx_gen as G
from sfx_gen import vox, vowel_track, _track

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1755
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(1978)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
mus = np.zeros((2, N)); sfx = np.zeros((2, N))
def M(x, t, g=1.0, p=0.0): place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)

def sneeze(r, base=180, size=0.6, scale=1.0):
    """ 'ah... ah... CHOO!': two rising inhaled 'ah's then a fricative burst + vowel """
    out = np.zeros(ns(1.4))
    for i, (t0, d, b) in enumerate([(0.0, 0.28, 1.0), (0.38, 0.22, 1.18)]):
        n = ns(d); t = np.arange(n) / SR
        f0 = base * b * _track(n, [(0, 0.95), (d, 1.15)], t)
        amp = np.clip(t / 0.05, 0, 1) * np.clip((d - t) / 0.05, 0, 1) * 0.5
        y = vox(f0, vowel_track(n, [(0, "a"), (d, "a")]), amp, r, scale, tilt=1.1, breath=0.6)
        i0 = ns(t0); out[i0:i0 + n] += y
    tb = 0.66; d = 0.45; n = ns(d); t = np.arange(n) / SR
    burst = (hp(r.standard_normal(n), 1800) * np.exp(-t / 0.06) * 1.6 + bp(r.standard_normal(n), 300, 3000, 1) * np.exp(-t / 0.12)) * (0.6 + size)
    f0 = base * 1.35 * _track(n, [(0, 1.2), (d, 0.8)], t)
    v = vox(f0, vowel_track(n, [(0, "u"), (d, "u")]), np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.15) * 0.7, r, scale, tilt=1.0, breath=0.5)
    i0 = ns(tb); out[i0:i0 + n] += burst + v
    return fades(out, 0.003, 0.05)
def boom(r): t = tt(1.2); return fades(np.sin(phase(70 * np.exp(-t / 0.3) + 30)) * np.exp(-t / 0.35) + lp(r.standard_normal(len(t)), 200) * np.exp(-t / 0.2) * 0.6, 0.002, 0.1)
def zap(r, d=0.25): t = tt(d); return fades(bp(r.standard_normal(len(t)), 2000, 8000, 1) * (np.sin(2 * np.pi * 60 * t) > 0.3) * np.exp(-t / 0.08) * 0.6, 0.002, 0.02)
def ding(f=1568, d=1.0): t = tt(d); return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.3) * 0.4 + np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.1) * 0.12
def creak(r): return G.creak(0.6, r, 120, 260)

# ---------------- music ----------------
C = {"C": [48, 55, 64, 67], "Am": [45, 52, 60, 64], "F": [41, 48, 57, 64], "G": [43, 50, 59, 62], "Dm": [50, 57, 62, 65], "E": [40, 47, 56, 59], "D": [50, 57, 62, 66], "Bb": [46, 53, 58, 62]}
def padc(ch, t, d, vel=0.26, warm=1000): M(pad([m2f(m) for m in C[ch]], d, vel, r_(), att=0.4, rel=0.8, warm=warm), t, 0.5)
def plk(m, t, v=0.45, p=0.0, bright=0.55, dur=0.7): M(pluck(m2f(m), v, r_(), dur, bright), t, 0.5, p)
# hook: a bright sunrise shimmer + a cheeky pluck figure
for b, ch in enumerate(["C", "G"]): padc(ch, 0.0 + b * 2.3, 2.3, 0.22, 1500)
for k in range(10): M(glock(m2f([76, 79, 84, 88][k % 4]), 0.2, r_(), 0.8), 0.05 + k * 0.11, 0.25, 0.4 * np.sin(k))
for k, m in enumerate([67, 72, 71, 67]): plk(m, 2.8 + k * 0.25, 0.4)
# GREECE: lyre (plucks in D dorian) over a warm pad
for b, ch in enumerate(["Dm", "C", "Dm", "Am"]): padc(ch, 4.6 + b * 1.8, 1.8, 0.2, 900)
for k, m in enumerate([62, 65, 69, 74, 72, 69, 67, 65, 62, 65, 69, 72, 74, 69, 65, 62]): plk(m, 4.7 + k * 0.42, 0.42, 0.3 * np.sin(k), 0.35, 1.0)
# ENGLAND: harpsichord-ish (bright short plucks) baroque figure
for b, ch in enumerate(["G", "D", "Em" if False else "C", "D", "G", "C"]): padc(ch, 11.7 + b * 1.75, 1.75, 0.18, 1400)
for k in range(48):
    ch = ["G", "D", "C", "D", "G", "C"][(k // 8) % 6]; m = C[ch][[0, 2, 3, 2][k % 4]] + (24 if k % 8 < 4 else 12)
    plk(m, 11.75 + k * 0.218, 0.32, 0.3 * ((k % 2) * 2 - 1), 0.85, 0.35)
for i, m in enumerate([79, 83, 86]): M(vibes(m2f(m), 0.4, r_()), at("wasnt") + 0.25 + i * 0.1, 0.35)
# X-RAY: electric pad + pulses, builds to the dead stop
for b, ch in enumerate(["Am", "F", "Dm", "E", "Am", "F", "E"]): padc(ch, 23.2 + b * 2.15, 2.15, 0.24 + 0.02 * b, 700 + 80 * b)
for k in range(int((38.3 - 31.2) / 0.18)): M(glock(m2f(88 if k % 2 else 84), 0.18 + 0.02 * min(k, 20), r_(), 0.5), 31.2 + k * 0.18, 0.25, 0.5 * np.sin(k))
# FAMILY: bouncy plucks
for b in range(4):
    ch = ["C", "F", "G", "C"][b]; padc(ch, 39.9 + b * 1.55, 1.55, 0.24, 1300)
    for k in range(6): plk(C[ch][k % 4] + 12, 39.9 + b * 1.55 + k * 0.26, 0.38, 0.3 * ((k % 2) * 2 - 1))
# STAGE: 70s lounge -> drumroll -> fanfare on ACHOO
for b, ch in enumerate(["F", "Bb", "F", "C"]): padc(ch, 46.0 + b * 1.05, 1.05, 0.25, 1200)
for k in range(int((55.8 - 54.6) / 0.035)): M(snare(0.15 + 0.4 * k / 34, r_(), 0.15, 1.1, 0.8), 54.6 + k * 0.035, 0.35)
for m in (60, 64, 67, 72, 76): M(brass(m2f(m), 1.2, 0.9, r_(), kind="horn"), at("achoo", 1) + 0.1, 0.35)
M(cymbal(0.5, r_(), 2.4), at("achoo", 1) + 0.1, 0.35); padc("C", at("achoo", 1) + 0.1, 2.2, 0.35, 1600)

# ---------------- sfx ----------------
S(G.bird_chirps(4.4, r_(), 0.6) * 0.5, 0.0, 0.25); S(G.bird_chirps(6.0, r_(), 0.6) * 0.5, 40.1, 0.25)
S(creak(r_()) * 0.5, 0.0, 0.35); S(creak(r_()) * 0.5, 40.2, 0.35)
S(sneeze(r_(), 175, 0.6), at("sneeze") - 0.72, 0.85)               # BEAN, hook
S(G.bubbles(1.4, r_(), 15, 300, 900, (0.01, 0.03)) * 0.15, 3.3, 0.3)   # sniffle
S(G.breeze(6.8, r_(), 0.5) * 0.3, 4.6, 0.2); S(G.water_bed(6.8, r_(), 0.4) * 0.15, 4.6, 0.2)   # Aegean
t = tt(0.8); S(np.sin(phase(np.geomspace(300, 900, len(t)))) * 0.12, at("heats") - 0.1, 0.3)   # nose heating
for k in range(4): S(G.bubbles(0.12, r_(), 30, 1200, 2400, (0.004, 0.01)) * 0.4, at("sweats") + k * 0.18, 0.35)  # drips
S(sneeze(r_(), 140, 0.5, 0.95), at("sneeze", 1) - 0.72, 0.8)        # Aristotle
S(G.whoosh(0.5, r_(), 0.3, 400, 2500), at("sneeze", 1) + 0.05, 0.25)   # scroll flies
S(G.bird_chirps(10.0, r_(), 0.4, "sparrow") * 0.4, 11.8, 0.2)
t = tt(0.9); S(np.sin(phase(np.geomspace(250, 700, len(t)))) * 0.1, at("heat") - 0.1, 0.25)
t = tt(0.4); S(lp(R.standard_normal(len(t)), 600) * np.exp(-t / 0.08) * 0.3, at("wasnt") - 0.05, 0.3)   # "huh"
S(G.whoosh(0.9, r_(), 0.4, 200, 2500), 23.2, 0.45)   # into the x-ray
hum = np.sin(phase(np.full(N, 100.0))) * 0.05 + lp(colored(N, r_(), 1.0), 400) * 0.15
xr = np.zeros(N); xr[ns(23.3):ns(38.5)] = 1; xr = ndimage.uniform_filter1d(xr, ns(0.3)); S(hum * xr, 0, 0.5)
for w_, n_ in [("nerve", 0), ("nerve", 1)]: S(zap(r_(), 0.5) * 0.6, at(w_, n_) - 0.05, 0.35)
t = tt(1.2); S(np.sin(phase(np.geomspace(200, 1600, len(t)))) * 0.15, at("floods") - 0.2, 0.4)
for k in range(10): S(zap(r_()), at("signals") - 0.4 + k * 0.09, 0.4, float(R.uniform(-0.6, 0.6)))
S(ding(990, 0.8) * 0.5, at("light") + 0.05 if False else at("light", 2) - 0.05, 0.35)   # "Light?"
S(sneeze(r_(), 190, 1.0, 1.05), at("achoo") - 0.72, 1.2)            # THE PEAK
S(boom(r_()), at("achoo") - 0.02, 0.8); S(G.whoosh(1.2, r_(), 0.15, 200, 4000, tail=0.6), at("achoo"), 0.6)
for (tt_, base, sc, p) in [(at("families") - 0.3, 120, 0.9, -0.4), (at("families") + 0.25, 210, 1.1, 0.4), (at("fifty") - 0.05, 300, 1.25, -0.2), (at("chance") + 0.05, 320, 1.3, 0.2)]:
    S(sneeze(r_(), base, 0.45, sc), tt_ - 0.72, 0.6, p)
murmur = G.babble(9.0, r_(), 140, 1.0) * 0.3
S(murmur, 46.3, 0.15)
fan = bp(colored(ns(10.0), r_(), 0.5), 200, 1500, 1) * 0.15; S(fan, 46.3, 0.2, 0.4)
for w_ in ("autosomal", "dominant", "compelling", "helio-ophthalmic", "outburst"):
    S(ding(1568 + 120 * ["autosomal", "dominant", "compelling", "helio-ophthalmic", "outburst"].index(w_), 0.8), at(w_) - 0.05, 0.35)
for k in range(8): M(glock(m2f([84, 88, 91, 96][k % 4]), 0.3, r_(), 0.7), at("short") - 0.2 + k * 0.07, 0.3)
S(sneeze(r_(), 175, 0.7), at("achoo", 1) - 0.72, 0.9)
S(G.applause(3.0, r_(), 40), at("achoo", 1) + 0.4, 0.35)
for f in [140, 355, 700, 1155, 1205, 1390]: S(G.whoosh(0.5, r_(), 0.3, 300, 2400), f / FPS - 0.3, 0.2)

# ---------------- mix ----------------
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12)); gain_m = 10 ** ((-6.0 * duck) / 20)
stop = np.ones(N); stop[ns(38.2):ns(39.6)] = 0.0; stop[ns(55.2):ns(55.85)] = 0.0; stop = ndimage.uniform_filter1d(stop, ns(0.05))
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
v = to_lufs(v, V_T); m = to_lufs(mus, V_T - 9.0 + 3.0) * gain_m * stop; s = to_lufs(sfx, V_T - 7.0 - 4.0)
mix = to_lufs(v + m + s, -15.0)
ceil = 10 ** (-1.5 / 20)
mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
mix = fades(mix, 0.002, 0.4)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print("mix LUFS", round(integrated(mix), 2), "len", mix.shape[1] / SR)
