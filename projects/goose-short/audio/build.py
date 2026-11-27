# Sound for "Bald Fur" (why we get goosebumps): a tinkly winter glock groove at the snowy bus stop (shots 1-3), a
# blizzard wind-howl ice age (4), a soft lo-fi beat in BEAN's headphones that DROPS into a huge epic swell on "hits",
# tape-stops on "for a song" into a tiny music-box "Little Duckling Lullaby", and ends on a cute sad-trombone "wah-wah".
# Every SFX is keyed off words.json (at("word", n)). Adapted from ~/wrinkle-short/audio/build.py.
import json, os
import numpy as np
from scipy import ndimage, signal
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, peq, colored, smooth_noise, fades, pan, st, place, integrated,
                 read_wav, write_wav, phase, shape, make_ir, convolve_st, true_peak, momentary)
from instruments import m2f, brass, glock, vibes, musicbox, triangle, pluck, pad, cymbal, timpani, snare
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1170
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(9127)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
mus = np.zeros((2, N)); epic = np.zeros((2, N)); sfx = np.zeros((2, N)); EV = []
def M(x, t, g=1.0, p=0.0, buf=None): place(mus if buf is None else buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def E(x, t, g=1.0, p=0.0): M(x, t, g, p, epic)
def S(x, t, g=1.0, p=0.0, name=None):
    place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
    if name: EV.append((t, name))
def mask(spans, sm=0.3):
    m = np.zeros(N)
    for a, b in spans: m[ns(a):ns(b)] = 1
    return ndimage.uniform_filter1d(m, ns(sm))

# ---------------- sfx building blocks (all faded) ----------------
def tick(r, f=3000, tau=0.004, g=0.4): t = tt(0.03); return fades(bp(r.standard_normal(len(t)), f, min(f * 3, 20000), 1) * np.exp(-t / tau) * g, 0.0005, 0.005)
def plip(r, f=900, up=2.6, tau=0.035): t = tt(0.14); return fades(np.sin(phase(np.geomspace(f, f * up, len(t)))) * np.exp(-t / tau) * 0.35, 0.002, 0.01)
def blip(f0, f1, d=0.15, g=0.3, vib=0.0):
    t = tt(d); f = np.geomspace(f0, f1, len(t)) * (1 + vib * np.sin(TAU * 7 * t))
    return fades(np.sin(phase(f)) * g * np.minimum(1, t / 0.01), 0.003, 0.04)
def boing(f=320, d=0.45, depth=0.35):
    t = tt(d); fr = f * (1 + depth * np.exp(-t / 0.14) * np.sin(TAU * 13 * t)) * (1 + 0.15 * np.exp(-t / 0.05))
    ph = phase(fr); return fades((np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.exp(-t / (d * 0.4)) * 0.35, 0.002, 0.05)
def puff(r, d=0.6, lo=200, hi=1600, g=0.5, att=0.05):
    """soft fur 'floomp': low noise puff whose band opens up, plus a little rising body tone"""
    n = ns(d); t = np.arange(n) / SR; nz = colored(n, r, 1.0)
    fc = lambda T: lo + (hi - lo) * np.clip(np.interp(T, t, t / (d * 0.35)), 0, 1)
    y = shape(nz, lambda T, F: 1 / (1 + (F[:, None] / fc(T)[None, :]) ** 4), 1024, 256)
    env = np.minimum(1, t / att) ** 1.5 * np.exp(-np.maximum(t - att, 0) / (d * 0.3))
    body = np.sin(phase(np.geomspace(110, 260, n))) * env * 0.35
    return fades((y / (np.std(y) + 1e-9) * 0.25 + body) * env * g, 0.004, 0.06)
def fizzle(r, d=0.75):
    n = ns(d); t = np.arange(n) / SR
    hiss = bp(r.standard_normal(n), 2500, 9000, 1) * np.exp(-t / 0.25) * 0.25
    crack = np.zeros(n)
    for _ in range(40):
        k = int(r.uniform(0, 0.8) ** 1.5 * n); c = tick(r, float(r.uniform(2500, 6000)), 0.002, 0.6); L = min(len(c), n - k); crack[k:k + L] += c[:L] * (1 - k / n)
    tone = np.sin(phase(np.geomspace(1300, 280, n))) * np.exp(-t / 0.3) * 0.18
    return fades(hiss + crack * 0.5 + tone, 0.003, 0.08)
def chatter(r, d=1.0, rate=17.0):
    n = ns(d); y = np.zeros(n); tm = 0.0
    while tm < d - 0.03:
        k = ns(tm); c = tick(r, float(r.uniform(1800, 3200)), 0.003, float(r.uniform(0.5, 1.0)))
        c = c + np.sin(TAU * 1400 * tt(0.03)) * np.exp(-tt(0.03) / 0.004) * 0.15
        y[k:k + len(c)] += c[:n - k]; tm += 1 / rate * r.uniform(0.85, 1.15)
    return fades(y * np.sin(np.pi * np.arange(n) / n) ** 0.5, 0.005, 0.05)
def twang(r, f=110, d=0.7):
    t = tt(d); fr = f * (1 + 0.45 * (1 - np.exp(-t / 0.025))) * (1 + 0.03 * np.exp(-t / 0.2) * np.sin(TAU * 9 * t))
    ph = phase(fr); y = sum(np.sin(k * ph + k) / k ** 1.1 * np.exp(-t * (2.5 + 1.5 * k)) for k in range(1, 9))
    return fades(y * 0.4 * np.minimum(1, t / 0.002), 0.001, 0.05)
def zap(r, d=0.4):
    t = tt(d); f = np.geomspace(90, 240, len(t)); sq = np.sign(np.sin(phase(f))) * 0.12
    cr = bp(r.standard_normal(len(t)), 2000, 8000, 1) * (smooth_noise(len(t), r, 40) > 0.3) * 0.4
    return fades(lp(sq, 3000) + cr * np.sin(np.pi * t / d), 0.005, 0.05)
def hiss(r, d=0.6):
    n = ns(d); t = np.arange(n) / SR; y = peq(bp(r.standard_normal(n), 2200, 8000, 1), 3600, 8, 1.5)
    return fades(y * np.minimum(1, t / 0.03) * np.exp(-np.maximum(t - 0.2, 0) / 0.18) * 0.35, 0.005, 0.06)
def ruler(r, d=0.4):
    n = ns(d); t = np.arange(n) / SR
    fr = bp(r.standard_normal(n), 700, 3500, 1) * (0.6 + 0.4 * np.sin(TAU * 34 * t) ** 2) * np.sin(np.pi * np.minimum(t / d, 1)) * 0.3
    out = np.zeros(n + ns(0.1)); out[:n] = fr
    c = tick(r, 1800, 0.006, 1.0) + np.sin(TAU * 900 * tt(0.03)) * np.exp(-tt(0.03) / 0.01) * 0.3; out[n - ns(0.01):n - ns(0.01) + len(c)] += c
    return fades(out, 0.005, 0.03)
def thump(r, f0=140, g=1.0, d=0.4):
    t = tt(d); return fades((lp(r.standard_normal(len(t)), 350) * np.exp(-t / 0.04) * 1.0 + np.sin(phase(np.geomspace(f0, 50, len(t)))) * np.exp(-t / 0.1)) * g, 0.001, 0.05)
def crunch(r, d=0.25): t = tt(d); return fades(bp(r.standard_normal(len(t)), 1500, 7000, 1) * (smooth_noise(len(t), r, 60) > 0) * np.exp(-t / 0.06) * 0.5, 0.002, 0.03)
def click(r, g=0.5):
    out = np.zeros(ns(0.12)); c = tick(r, 2500, 0.002, 1.0) + np.sin(TAU * 2100 * tt(0.03)) * np.exp(-tt(0.03) / 0.003) * 0.3
    out[:len(c)] += c; out[ns(0.07):ns(0.07) + len(c)] += c * 0.6; return fades(out * g, 0.0005, 0.01)
def choir(notes, d, r, vow="a", g=1.0):
    out = np.zeros((2, ns(d)))
    for i, m in enumerate(notes):
        for v in range(2):
            n = ns(d); t = np.arange(n) / SR
            f0 = m2f(m) * (1 + 0.005 * np.sin(TAU * r.uniform(4.8, 5.6) * t + r.uniform(0, TAU))) * 2 ** (r.uniform(-8, 8) / 1200)
            amp = np.minimum(1, t / 0.25) * np.clip((d - t) / 0.4, 0, 1)
            y = G.vox(f0, G.vowel_track(n, [(0, vow), (d, vow)]), amp, r, 1.0 if m < 62 else 1.12, tilt=1.3, breath=0.08, fmax=4500)
            out += pan(y, (i - len(notes) / 2) * 0.25 + (v - 0.5) * 0.3)
    return fades(out * g / len(notes), 0.01, 0.1)
def roar(r, d=1.1, base=95, scale=0.8, growl=0.5, lpf=3500):
    n = ns(d); t = np.arange(n) / SR
    f0 = base * np.interp(t, [0, d * 0.25, d * 0.7, d], [0.85, 1.2, 1.05, 0.7]) * (1 + 0.04 * smooth_noise(n, r, 30))
    amp = np.minimum(1, t / 0.08) * np.clip((d - t) / 0.3, 0, 1) * (1 - growl * 0.5 * (1 + np.sin(TAU * 31 * t)))
    y = G.vox(f0, G.vowel_track(n, [(0, "o"), (d * 0.3, "a"), (d * 0.8, "o"), (d, "u")]), amp, r, scale, tilt=0.9, breath=0.35, fmax=lpf)
    return fades(lp(y, lpf), 0.01, 0.08)
def balloon(r, d=1.0):
    n = ns(d); t = np.arange(n) / SR
    f = np.geomspace(620, 170, n) * (1 + 0.08 * np.sin(TAU * 23 * t) + 0.05 * smooth_noise(n, r, 15))
    ph = phase(f); y = sum(np.sin(k * ph) / k for k in range(1, 12))
    y = bp(y, 300, 3500, 1) * np.minimum(1, t / 0.02) * np.clip((d - t) / 0.15, 0, 1) * 0.3
    y += bp(r.standard_normal(n), 1000, 6000, 1) * 0.04 * np.exp(-t / 0.5)
    return fades(y, 0.003, 0.05)
def trombone(m, d, r, wobble=0.0, fall=0.0, g=0.4):
    n = ns(d + 0.08); t = np.arange(n) / SR
    f = m2f(m) * 2 ** ((-25 * np.exp(-t / 0.03) + wobble * np.sin(TAU * 6 * t) * np.clip((t - 0.1) / 0.15, 0, 1) - fall * 100 * np.clip((t - d * 0.4) / (d * 0.6), 0, 1) ** 2) / 1200)
    ph = phase(f); y = sum(np.sin(k * ph + k) / k ** 0.9 for k in range(1, 20) if k * m2f(m) < 6000)
    env = np.minimum(1, t / 0.04) * np.clip((d + 0.08 - t) / 0.12, 0, 1)
    wah = 400 + 1800 * env * (0.5 + 0.5 * np.sin(np.pi * np.clip(t / d, 0, 1)))  # "wah": mute opens then closes
    y = shape(y, lambda T, F: 1 / (1 + (F[:, None] / np.interp(T, t, wah)[None, :]) ** 3), 1024, 256)
    return fades(y * env * g, 0.004, 0.05)
def kick(r, g=1.0): t = tt(0.45); return fades(np.sin(phase(np.geomspace(115, 42, len(t)))) * np.exp(-t / 0.13) * g + lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.006) * 0.15, 0.0005, 0.05)
def hat(r, g=0.2): t = tt(0.06); return fades(hp(r.standard_normal(len(t)), 7000) * np.exp(-t / 0.012) * g, 0.0005, 0.01)
def sleigh(r, g=0.3):
    t = tt(0.25); y = sum(np.sin(TAU * f * t + r.uniform(0, TAU)) * np.exp(-t / 0.05) for f in r.uniform(3500, 7500, 6)) / 6
    return fades((y + hp(r.standard_normal(len(t)), 6000) * np.exp(-t / 0.02) * 0.5) * g, 0.001, 0.02)
def tape_stop(x, t0, d):
    i0, n = ns(t0), ns(d); u = np.arange(n) / n; pos = i0 + np.cumsum((1 - u) ** 1.4)
    out = x.copy(); idx = np.arange(x.shape[1])
    for c in range(2): out[c, i0:i0 + n] = np.interp(pos, idx, x[c])
    out[:, i0:i0 + n] *= np.clip((n - np.arange(n)) / ns(0.05), 0, 1); out[:, i0 + n:] = 0
    return out

# ---------------- music ----------------
C = {"C": [36, 48, 55, 64], "Am": [45, 52, 60, 64], "F": [41, 48, 57, 65], "G": [43, 50, 59, 62], "Dm": [38, 50, 57, 65]}
B = 0.5  # 120 bpm
MEL = [(0, 67, .5), (.5, 72, .5), (1, 76, .5), (1.5, 74, .5), (2, 72, 1), (3, 67, .5), (3.5, 69, .5),
       (4, 72, .5), (4.5, 69, .5), (5, 64, 1), (6, 69, .5), (6.5, 71, .5), (7, 72, 1),
       (8, 77, .5), (8.5, 76, .5), (9, 74, .5), (9.5, 72, .5), (10, 69, 1), (11, 72, .5), (11.5, 74, .5),
       (12, 76, .5), (12.5, 74, .5), (13, 71, 1), (14, 67, .5), (14.5, 71, .5), (15, 74, 1)]
def winter(t0, t1, inst="glock", vel=0.55, mel_g=0.2):
    prog = ["C", "Am", "F", "G"]; k = 0
    while t0 + k * B / 2 < t1 - 0.05:
        t = t0 + k * B / 2; ch = C[prog[(k // 8) % 4]]
        if k % 2 == 0: M(pluck(m2f(ch[0] if k % 4 == 0 else ch[0] + 7), 0.6 * vel, r_(), 0.4, 0.35), t, 0.5)
        if k % 4 == 2: M(pluck(m2f(ch[2]), 0.35 * vel, r_(), 0.25, 0.6), t, 0.3, -0.3); M(pluck(m2f(ch[3]), 0.35 * vel, r_(), 0.25, 0.6), t + 0.01, 0.3, 0.3)
        M(sleigh(r_(), 0.25 if k % 2 else 0.12), t, 0.6 * vel, 0.5)
        k += 1
    for rep in range(int((t1 - t0) / (16 * B)) + 1):
        for b, m, d in MEL:
            tn = t0 + (rep * 16 + b) * B
            if tn > t1 - 0.1: break
            if inst == "glock": M(glock(m2f(m + 12), 0.55, r_(), 1.2), tn, mel_g, 0.2 * np.sin(b))
            else: M(vibes(m2f(m), 0.5, r_(), 0.9), tn, mel_g * 1.4, 0.2 * np.sin(b)); M(musicbox(m2f(m + 24), 0.35, r_(), 0.8), tn, mel_g * 0.4)
winter(0.0, 4.0, "glock")
winter(4.0, 12.6, "vibes", 0.5, 0.17)          # skin world: softer vibes + music box sparkle
winter(12.0, 19.45, "glock", 0.55, 0.2)        # bus stop again; cut before the sad "boop"
for m in (60, 64, 67): M(brass(m2f(m), 0.35, 0.6, r_(), kind="horn"), at("bumps") - 0.05, 0.25)          # "Skin bumps up" ta-da
for m in (65, 69, 72, 77): M(brass(m2f(m), 0.6, 0.7, r_(), kind="horn"), at("big") - 0.05, 0.25)        # "twice as big"
# ice age: dark pad + soft timpani, majestic brass/choir swell on "full coat", sneaky pizz after "button"
for b, ch in enumerate(["Am", "F", "Am", "F"]): M(pad([m2f(m) for m in C[ch][1:]], 0.9, 0.24, r_(), att=0.4, rel=0.6, warm=700), 20.2 + b * 0.8, 0.5)
for i in range(3): M(timpani(m2f(33), 0.45 + 0.1 * i, r_(), 1.2), 20.4 + i * 0.5, 0.3)
T_FULL = at("full") - 0.15
for m in (36, 48, 55, 60, 64, 67): M(brass(m2f(m), 1.3, 0.8, r_(), kind="tuba" if m < 50 else "horn"), T_FULL, 0.28)
M(pad([m2f(m) for m in (48, 55, 64, 67)], 1.4, 0.3, r_(), att=0.2, rel=0.6, warm=1400), T_FULL, 0.5)
M(cymbal(0.4, r_(), 2.0), T_FULL, 0.25); M(timpani(m2f(36), 0.8, r_()), T_FULL, 0.45)
for i in range(int((25.6 - 23.2) / 0.25)):
    M(pluck(m2f([45, 52, 48, 52][i % 4]), 0.5, r_(), 0.18, 0.3), 23.2 + i * 0.25, 0.4)
    if i % 2: M(pluck(m2f([69, 72, 76, 72][(i // 2) % 4]), 0.35, r_(), 0.15, 0.6), 23.2 + i * 0.25, 0.25, 0.3)
# shot 5: lo-fi beat in BEAN's headphones (82 bpm, downbeats landing on "weird" and on the drop at "hits")
T_HIT = at("hits"); LB = 60 / 82; T_LO = T_HIT - 6 * LB
lofi = np.zeros((2, N))
LC = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]
for j in range(-1, 6):
    tb = T_LO + j * LB
    if j >= 0:
        M(kick(r_(), 0.7), tb, 1.0, 0, lofi)
        if j % 2: M(lp(snare(0.4, r_(), 0.25, 0.9, 0.5), 3500), tb, 0.45, 0, lofi)
        else: M(kick(r_(), 0.45), tb + LB * 0.5 + 0.04, 1.0, 0, lofi)
        for h in range(2): M(hat(r_(), 0.18 if h == 0 else 0.11), tb + h * LB * 0.56, 1.0, 0.3, lofi)
    if (j + 1) % 1 == 0:
        ch = LC[(j + 1) % 4]
        for i, m in enumerate(ch): M(vibes(m2f(m), 0.45, r_(), LB * 1.6, trem=3.0, trem_depth=0.15), tb + 0.012 * i - 0.02, 0.22, -0.2 + 0.13 * i, lofi)
        M(pluck(m2f(ch[0] - 12), 0.6, r_(), LB * 0.9, 0.2), tb, 0.45, 0, lofi)
crk = np.zeros(N); k = ns(25.8)
while k < ns(T_HIT):
    c = tick(R, float(R.uniform(2000, 6000)), 0.0015, float(R.uniform(0.1, 0.6))); crk[k:k + len(c)] += c; k += int(R.exponential(0.09) * SR) + 1
lofi[:, :] = lp(lofi, 4200) + st(crk * 0.25 + lp(colored(N, r_(), 1.0), 3000) * 0.006)
lm = mask([(25.75, T_HIT - 0.14)], 0.12); lm[ns(T_HIT - 0.2):] = ndimage.uniform_filter1d((np.arange(N - ns(T_HIT - 0.2)) < ns(0.06)).astype(float), ns(0.04))
mus += lofi * lm * 0.85
# riser into the drop
t = tt(0.95); E(np.sin(phase(np.geomspace(180, 1400, len(t)))) * (t / 0.95) ** 2 * 0.12, T_HIT - 0.95, 1.0)
E(G.whoosh(1.0, r_(), 0.97, 300, 7000, tail=0.03, air=0.3), T_HIT - 1.0, 0.5)
for i in range(12): E(snare(0.15 + 0.05 * i, r_(), 0.12), T_HIT - 0.9 + i * 0.07, 0.25)
# THE PEAK: epic swell C -> Ab -> Bb -> Cm (scary), with timpani, cymbals, choir
T_BODY, T_SCARY, T_FOR, T_SONG2 = at("body", 1), at("scary"), at("for"), at("song", 1)
EP = [(T_HIT, [36, 48, 55, 60, 64, 67, 72]), (T_BODY - 0.05, [44, 56, 60, 63, 68, 72]), (at("puffing") + 0.3, [46, 58, 62, 65, 70, 74]),
      (T_SCARY - 0.05, [36, 48, 55, 60, 63, 67, 72])]
for i, (ts, ch) in enumerate(EP):
    te = EP[i + 1][0] if i + 1 < len(EP) else T_SONG2 + 0.6
    for m in ch: E(brass(m2f(m), te - ts + 0.05, 0.9 if i in (0, 3) else 0.75, r_(), kind="tuba" if m < 50 else "horn"), ts, 0.3)
    E(pad([m2f(m) for m in ch[1:]], te - ts, 0.35, r_(), att=0.05, rel=0.4, warm=2200), ts, 0.6)
    E(timpani(m2f(ch[0]), 1.0, r_()), ts, 0.55)
    E(choir([m for m in ch if 48 <= m <= 72][:4], te - ts + 0.3, r_(), "a" if i < 3 else "o"), ts, 0.5)
E(cymbal(1.0, r_(), 3.0), T_HIT, 0.5); E(cymbal(0.8, r_(), 2.5), T_SCARY - 0.05, 0.4)
for i in range(int((T_SONG2 - T_HIT) / 0.25)):   # driving taiko-ish 8ths
    E(timpani(m2f(36 if i % 4 == 0 else 43), 0.5 + 0.15 * (i % 2 == 0), r_(), 0.6), T_HIT + 0.5 + i * 0.25, 0.25)
t = tt(1.8); E(np.sin(phase(np.geomspace(80, 32, len(t)))) * np.exp(-t / 0.7) * 0.9, T_HIT, 1.0)   # bass drop
epic = tape_stop(epic, T_SONG2 - 0.05, 0.55)        # "for a song": the epic collapses (tape stop)
# "Little Duckling Lullaby" (alle meine Entchen): tiny music box on the phone
q = 0.17; tl = T_SONG2 + 0.2
LUL = [(0, 72, 1), (1, 74, 1), (2, 76, 1), (3, 77, 1), (4, 79, 2), (6, 79, 2), (8, 81, 1), (9, 81, 1), (10, 81, 1), (11, 81, 1), (12, 79, 3)]
for b, m, d in LUL:
    M(musicbox(m2f(m + 12), 0.55, r_(), 1.2), tl + b * q, 0.45, 0.15)
    if b % 4 == 0: M(musicbox(m2f(m - 12 if m < 76 else m - 17), 0.3, r_(), 1.0), tl + b * q, 0.18, -0.15)
# end button on "bald": sad trombone "wah-wahhh" (short) + tiny ding
T_BALD = at("bald")
M(trombone(56, 0.24, r_(), g=0.35), T_BALD, 0.8); M(trombone(55, 0.75, r_(), wobble=35, fall=1.0, g=0.35), T_BALD + 0.28, 0.8)
M(pluck(m2f(43), 0.5, r_(), 0.8, 0.3), T_BALD + 0.28, 0.4)
M(glock(m2f(84), 0.45, r_(), 1.5), T_BALD + 1.15, 0.22); M(triangle(0.3, r_(), 1.2), T_BALD + 1.15, 0.2)
# shared hall
ir = make_ir(1.4, 77, hf=1.3); mus = mus + 0.18 * convolve_st(mus, ir); epic = epic + 0.22 * convolve_st(epic, ir)

# ---------------- sfx ----------------
wind = G.breeze(DUR, r_(), 1.0, 0.25, 700); S(wind * mask([(0, 4.0), (12.6, 20.1), ], 0.4), 0, 0.12)   # snowy street air
mic = st(lp(colored(N, r_(), 1.5), 300) * 0.25 + np.sin(phase(np.full(N, 70.0))) * 0.03); S(mic * mask([(4.0, 12.6)], 0.4), 0, 0.35)  # skin world
S(chatter(r_(), 1.1), 0.05, 0.35, name="teeth chatter")
S(chatter(r_(), 0.6, 20), at("have") + 0.4, 0.3, name="chatter 2")
for i in range(12): S(plip(r_(), 500 * 2 ** (i / 6), 1.8, 0.02), 0.1 + i * 0.045, 0.3, float(R.uniform(-0.5, 0.5)))
EV.append((0.1, "goosebump prrrt ticks"))
S(puff(r_(), 0.7, 200, 1800, 0.6), at("puff") - 0.2, 0.5, name="ghost-fur floomp")
for i, m in enumerate((84, 88, 91)): S(glock(m2f(m), 0.3, r_(), 0.8), at("puff") + 0.05 + i * 0.06, 0.08)
S(fizzle(r_()), at("dont") - 0.1, 0.45, name="fizzle")
S(G.whoosh(0.8, r_(), 0.5, 200, 3000), 122 / FPS - 0.5, 0.45, name="skin dive whoosh")
S(blip(900, 1800, 0.2, 0.2), at("muscle") - 0.25, 0.3, name="muscle bling")
for i in range(5): S(glock(m2f(int(R.choice([91, 93, 96, 98]))), 0.25, r_(), 0.6), at("cold") - 0.15 + i * 0.09, 0.07, float(R.uniform(-0.7, 0.7)))
S(G.whoosh(0.6, r_(), 0.25, 150, 900), at("scared") - 0.2, 0.4, -0.3, name="scary shadow sweep")
S(zap(r_()), at("nerves") - 0.25, 0.35, name="nerve zap")
S(twang(r_(), 98), at("pull") - 0.02, 0.6, name="muscle twang"); S(G.creak(0.3, r_(), 140, 240) * 0.5, at("pull"), 0.3)
for i in range(5): S(boing(260 + 40 * i, 0.4), at("stand") - 0.3 + i * 0.1, 0.35, -0.8 + 0.4 * i)
EV.append((at("stand") - 0.3, "boing-boing wave"))
for i in range(6): S(plip(r_(), float(R.uniform(450, 1100)), 2.0, 0.03), at("bumps") - 0.25 + i * 0.07, 0.45, float(R.uniform(-0.6, 0.6)))
EV.append((at("bumps") - 0.25, "bubbly pops"))
S(G.whoosh(0.5, r_(), 0.3, 300, 2500), 380 / FPS - 0.35, 0.3, name="whoosh back to street")
S(blip(1800, 900, 0.35, 0.1), at("cat") - 0.5, 0.25)  # tiny falling whistle
S(thump(r_(), 160, 0.6), at("cat") - 0.07, 0.5, name="snow clump plop"); S(crunch(r_()), at("cat") - 0.06, 0.4)
S(puff(r_(), 0.8, 150, 2500, 0.9, 0.03), at("puffs") - 0.15, 0.7, name="cat FWOOMP")
S(hiss(r_()), at("puffs") + 0.12, 0.35, 0.3, name="cat hiss")
for w_ in ("traps", "warm", "air"): S(puff(r_(), 0.35, 300, 1200, 0.25, 0.04), at(w_) + 0.02, 0.25, float(R.uniform(-0.4, 0.4)))
S(ruler(r_()), at("twice") - 0.25, 0.5, 0.4, name="ruler slide")
t = tt(0.7); S(fades(np.sin(phase(np.geomspace(300, 650, len(t)) * (1 + 0.02 * np.sin(TAU * 11 * t)))) * np.sin(np.pi * t / 0.7) * 0.12, 0.01, 0.05), at("you", 2) - 0.2, 0.35, name="strain squeak")
S(blip(520, 380, 0.32, 0.3, 0.01), at("bumps", 1) - 0.05, 0.55, name="sad boop")
S(G.whoosh(0.6, r_(), 0.35, 200, 2500), 610 / FPS - 0.4, 0.35, name="into ice age")
n = N; howl = shape(colored(n, r_(), 0.5), lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / (550 + 300 * smooth_noise(len(T), rng(5), 0.6))[None, :]) / 0.18) ** 2), 2048, 512)
howl = howl / (np.std(howl[ns(20):ns(26)]) + 1e-9)
blz = G.breeze(DUR, r_(), 1.0, 0.4, 1600) + pan(howl * 0.35, 0.2)
S(blz * mask([(20.15, 25.75)], 0.5), 0, 0.3, name="blizzard wind 20.2-25.7")
S(puff(r_(), 1.0, 120, 2200, 1.0, 0.04), T_FULL, 0.7, name="majestic floof"); S(choir([60, 64, 67, 72], 1.5, r_()), T_FULL + 0.12, 0.5, name="choir aah")
S(blip(2200, 3300, 0.12, 0.15), at("kept") - 0.05, 0.25, name="button glint")
S(click(r_(), 0.7), at("lost") - 0.15, 0.6, name="button click"); S(boing(700, 0.35, 0.25), at("lost") + 0.05, 0.4, 0.2, name="tiny hair boing")
S(G.whoosh(0.55, r_(), 0.4, 250, 4000, tail=0.15, air=0.3), 772 / FPS - 0.4, 0.5, name="whip whoosh to bedroom")
for i, m in enumerate((79, 84, 88, 91)): S(glock(m2f(m), 0.3, r_(), 0.7), at("music") - 0.2 + i * 0.12, 0.1, -0.4 + 0.25 * i)
EV.append((at("music") - 0.2, "floating note tinkles"))
S(pluck(m2f(84), 0.5, r_(), 0.4, 0.8), at("press") - 0.05, 0.25); S(click(r_(), 0.6), at("press"), 0.5, name="note pluck + button click")
S(thump(r_(), 120, 1.0, 0.6), T_HIT - 0.02, 0.9, name="PEAK impact + bass drop + crash")
S(G.whoosh(0.9, r_(), 0.08, 300, 5000, tail=0.4, air=0.3), T_HIT - 0.04, 0.45)
S(puff(r_(), 1.0, 100, 3000, 1.0, 0.02), T_HIT, 0.5)   # ghost fur explodes
S(roar(r_()), T_SCARY - 0.3, 0.5, name="soft cartoon bear roar")
S(balloon(r_()), T_SONG2, 0.6, name="deflating balloon")
S(roar(r_(), 0.45, 420, 1.6, 0.2, 6000), at("very") + 0.05, 0.25, name="squeaky toy rawr")
S(blip(1500, 2200, 0.09, 0.2), at("very") + 0.02, 0.3); S(blip(2200, 1400, 0.12, 0.2), at("very") + 0.4, 0.3)
S(plip(r_(), 1200, 0.7, 0.02), T_BALD + 0.15, 0.25, name="cat pity blink")

# ---------------- mix ----------------
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12)); gain_m = 10 ** ((-7.0 * duck) / 20)
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
EPIC_T = float(os.environ.get('EPIC_T', -7.0)); MUS_T = float(os.environ.get('MUS_T', -22.0))
ep = epic * 10 ** ((EPIC_T - float(momentary(epic, 0.05).max())) / 20) * 10 ** ((-8.0 * duck) / 20)
v = to_lufs(v, V_T); m = to_lufs(mus, MUS_T) * gain_m + ep; s = to_lufs(sfx, V_T - 10.0) * 10 ** ((-3.0 * duck) / 20)
raw = hp(v + m + s, 25)
def limit(x, ceil_db=-1.3, look=0.004):
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = up[: x.shape[1] * 4].reshape(-1, 4).max(1)
    g = np.minimum(1, 10 ** (ceil_db / 20) / (pk + 1e-12)); L = ns(look)
    g = ndimage.minimum_filter1d(g, 2 * L + 1); g = ndimage.uniform_filter1d(g, 2 * L + 1)
    return x * g
gain = 0.0
for _ in range(6):
    mix = limit(raw * 10 ** (gain / 20)); l = integrated(mix); gain += -15.0 - l
    if abs(l + 15.0) < 0.03: break
mix = fades(mix, 0.002, 0.4)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print("mix LUFS", round(integrated(mix), 2), "TP", round(true_peak(mix), 2), "len", mix.shape[1] / SR, mix.shape[1] / SR * FPS)
mo = momentary(mix, 0.1)
for a, b, nm in [(0, 4, "s1"), (4, 12.6, "s2"), (12.6, 20.3, "s3"), (20.3, 25.7, "s4"), (25.7, 30.5, "lofi"), (30.5, 31.6, "PEAK"), (31.6, 34.2, "epic"), (34.3, 36.9, "lullaby"), (36.9, 39, "end")]:
    print(nm, round(float(mo[int(a * 10):int(b * 10) - 3].max()), 1))
for t_, nm in sorted(EV): print(f"{t_:6.2f} {nm}")
if os.environ.get("DIAG"):
    g0 = raw * 10 ** (gain / 20)
    from dsp import momentary as MO
    for nm, x in [("pre", g0), ("v", v), ("m", m), ("s", s), ("ep", ep)]:
        mo = MO(x, 0.1); print(nm, [round(float(mo[int(a * 10):int(b * 10) - 3].max()), 1) for a, b in [(4, 12.6), (25.7, 30.5), (30.5, 31.6), (31.6, 34.2), (34.3, 36.9)]])
    pk = np.abs(g0).max(0); print("pre-limit peak dB", 20 * np.log10(pk.max()), "at", pk.argmax() / SR)
if os.environ.get("DIAG"):
    gr = 20 * np.log10(np.abs(mix).max(0) + 1e-9) - 20 * np.log10(np.abs(g0).max(0) + 1e-9)
    for a, b in [(0, 30.5), (30.5, 34.3), (34.3, 39)]: print("max GR", a, b, round(float(gr[ns(a):ns(b)][np.abs(g0).max(0)[ns(a):ns(b)] > 0.05].min()), 1))
