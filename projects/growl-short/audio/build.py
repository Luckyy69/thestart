# Sound for "The Cleaning Crew" (why your stomach growls), 36.5 s (1095 frames @ 30 fps).
# All own synthesis (numpy/scipy, no samples). Cues keyed off ../voice/words.json via at("word", n).
# Music: tense exam-hall bed (held strings + drone) -> funky "cleaning crew" groove from "crew" (slap bass, clavinet,
# whistle lead, brushes, 115 bpm) with a rising squeeze sweep -> cavernous reverb drop on "Squish" -> GROWL ->
# muffled cosy groove (full belly) -> tick-tock elevator cue in the staff room (cut by the whistle) -> DEAD SILENCE
# (hall clock only) -> MONSTER growl + orchestral sting -> sheepish "sorry" + soft button.
import json, os
import numpy as np
from scipy import ndimage, signal
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, peq, reson, colored, smooth_noise, fades, pan, st, place, integrated,
                 read_wav, write_wav, phase, shape, make_ir, convolve_st, true_peak, momentary, modal, impulse_train, widen)
from instruments import m2f, glock, vibes, triangle, pluck, pad, cymbal, timpani, snare, brush, brass, whistle
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1095
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(20261128)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
def bus(): return np.zeros((2, N))
mus, hit, sfx, pay = bus(), bus(), bus(), bus(); EV = []
def P(buf, x, t, g=1.0, p=0.0): place(buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def M(x, t, g=1.0, p=0.0, buf=None): P(mus if buf is None else buf, x, t, g, p)
def S(x, t, g=1.0, p=0.0, name=None, buf=None):
    P(sfx if buf is None else buf, x, t, g, p)
    if name: EV.append((t, name))
def mask(spans, sm=0.3):
    m = np.zeros(N)
    for a, b in spans: m[max(0, ns(a)):ns(b)] = 1
    return ndimage.uniform_filter1d(m, max(1, ns(sm)))
def panc(x, pc):  # time-varying constant-power pan, pc per sample in [-1, 1]
    th = (np.clip(pc, -1, 1) + 1) * np.pi / 4; return np.stack([x * np.cos(th), x * np.sin(th)]) * np.sqrt(2)

T_CREW, T_SQUISH, T_ECHO, T_GROWL = at("crew"), at("squish"), at("echoes"), at("growl")
T_FULL = at("your", 3); T_NOW = at("now"); T_TWEET = at("usually"); T_EAT = at("eat")
T_HUSH = at("which"); T_ALWAYS = at("always"); T_GROWLS = at("growls"); T_POSS = at("possible")
T_SILENT = 30.88  # cut to the silent hall (shot 5 xfade lands ~30.67-31.07)

# ---------------- atoms ----------------
def tick(r, f=3000, tau=0.004, g=0.4): t = tt(0.03); return fades(bp(r.standard_normal(len(t)), f, min(f * 3, 20000), 1) * np.exp(-t / tau) * g, 0.0005, 0.005)
def woodblock(r, f=1100, g=0.5, d=0.15):
    y = modal(d, [(f, 1.0, 0.025), (f * 2.7, 0.35, 0.012), (f * 4.1, 0.15, 0.006)], r)
    t = tt(d); y += bp(r.standard_normal(len(t)), 1500, 6000, 1) * np.exp(-t / 0.0015) * 0.4
    return fades(y * g, 0.0003, 0.02)
def kick(r, g=1.0): t = tt(0.4); return fades(np.sin(phase(np.geomspace(120, 45, len(t)))) * np.exp(-t / 0.12) * g + lp(r.standard_normal(len(t)), 1200) * np.exp(-t / 0.004) * 0.15 * g, 0.0005, 0.05)
def hat(r, g=0.2, d=0.06, tau=0.012): t = tt(d); return fades(hp(r.standard_normal(len(t)), 7500) * np.exp(-t / tau) * g, 0.0005, 0.01)
def blip(f0, f1, d=0.15, g=0.3, vib=0.0, harm=0.0):
    t = tt(d); f = np.geomspace(f0, f1, len(t)) * (1 + vib * np.sin(TAU * 7 * t)); ph = phase(f)
    return fades((np.sin(ph) + harm * np.sin(2 * ph) + harm * 0.5 * np.sin(3 * ph)) * g * np.minimum(1, t / 0.008), 0.003, 0.04)
def boing(f=320, d=0.45, depth=0.35, rate=13):
    t = tt(d); fr = f * (1 + depth * np.exp(-t / 0.14) * np.sin(TAU * rate * t)) * (1 + 0.15 * np.exp(-t / 0.05))
    ph = phase(fr); return fades((np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.exp(-t / (d * 0.4)) * 0.35, 0.002, 0.05)
def thump(r, f0=140, f1=50, g=1.0, d=0.4, tau=0.1):
    t = tt(d); return fades((lp(r.standard_normal(len(t)), 350) * np.exp(-t / 0.035) + np.sin(phase(np.geomspace(f0, f1, len(t)))) * np.exp(-t / tau)) * g, 0.001, 0.05)
def plip(r, f=900, up=2.6, tau=0.035, d=0.14): t = tt(d); return fades(np.sin(phase(np.geomspace(f, f * up, len(t)))) * np.exp(-t / tau) * 0.35, 0.002, 0.01)
def squelch(r, d=0.35, f0=900, f1=250, g=0.5, wob=38):
    n = ns(d); t = np.arange(n) / SR; nz = colored(n, r, 0.8)
    fc = lambda T: np.interp(T, [0, d], [f0, f1])
    y = shape(nz, lambda T, F: 1 / (1 + ((F[:, None] - fc(T)[None, :]) / (0.35 * fc(T)[None, :])) ** 2), 1024, 128)
    env = (1 - np.exp(-t / 0.006)) * np.exp(-t / (d * 0.35)) * (0.7 + 0.3 * np.sin(TAU * wob * t))
    return fades(y / (np.std(y) + 1e-9) * env * g, 0.001, 0.04)
def squeak(r, f0=900, f1=1500, d=0.22, g=0.3):
    t = tt(d); f = np.geomspace(f0, f1, len(t)) * (1 + 0.04 * np.sin(TAU * 31 * t)); ph = phase(f)
    y = sum(np.sin(k * ph + k) / k ** 0.8 for k in range(1, 7)); y = bp(y, 700, 6000, 1)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.6 * (0.75 + 0.25 * np.sin(TAU * 47 * t))
    return fades(y * env * g, 0.004, 0.03)
def alarm_bell(r, d=0.95, f=1180, rate=19.0):
    hits = np.arange(0, d - 0.05, 1 / rate)
    x = impulse_train(hits + r.normal(0, 0.002, len(hits)), d + 0.6, 0.8 + 0.2 * r.uniform(size=len(hits)))
    ir = modal(0.6, [(f, 1.0, 0.35), (f * 2.32, 0.6, 0.2), (f * 4.25, 0.35, 0.1), (f * 6.63, 0.2, 0.05), (f * 0.5, 0.25, 0.3)], r)
    y = signal.fftconvolve(x, ir)[: len(x)]
    y += bp(r.standard_normal(len(x)), 3000, 9000, 1) * np.convolve(x, np.exp(-tt(0.004) / 0.001), "same") * 0.5
    return fades(y * 0.12, 0.001, 0.1)
def clock_tick(r, hi=True, g=0.5):  # pendulum wall clock: dry escapement click + tiny wooden case ring
    y = woodblock(r, 2300 if hi else 1650, 0.55, 0.09); c = tick(r, 3800 if hi else 3000, 0.0012, 0.6)
    y[:len(c)] += c; return y * g
def ringmod_rumble(r, d, f0=48, rough=24, g=1.0):
    n = ns(d); t = np.arange(n) / SR
    f = f0 * (1 + 0.12 * smooth_noise(n, r, 2.0)); ph = phase(f)
    y = np.sin(ph) + 0.5 * np.sin(2 * ph + 1) + 0.25 * np.sin(3 * ph + 2)
    y *= 0.6 + 0.4 * np.abs(np.sin(np.pi * rough * t + 2 * smooth_noise(n, r, 4)))
    y += 0.8 * lp(colored(n, r, 2.0), 220)
    return y * g

def growl(r, d=1.0, f_pts=None, vow=None, flutter=26.0, big=1.0, bubbly=1.0, squeal=0.0):
    """comic stomach GROWL: rough sub rumble + a formant 'grrr-oo-owl' voice with rolled-r flutter + gurgles"""
    n = ns(d); t = np.arange(n) / SR; u = t / d
    f_pts = f_pts or [(0, 58), (0.25 * d, 72), (0.55 * d, 86), (0.8 * d, 70), (d, 46)]
    f0 = np.interp(t, [p[0] for p in f_pts], [p[1] for p in f_pts]) * (1 + 0.03 * smooth_noise(n, r, 6))
    vow = vow or [(0, "er"), (0.3 * d, "er"), (0.5 * d, "o"), (0.75 * d, "u"), (d, "u")]
    forms = G.vowel_track(n, vow) * np.array([0.62, 0.55, 0.6, 0.6])  # huge belly: everything scaled down
    amp = np.interp(u, [0, 0.08, 0.6, 0.85, 1], [0, 0.85, 1, 0.7, 0])
    fl = np.clip(1 - u / 0.55, 0.15, 1)  # rolled r strongest at the start ("grrr"), smoother "owl"
    amp_f = amp * (1 - 0.7 * fl * (0.5 + 0.5 * np.sin(phase(flutter * (1 + 0.1 * smooth_noise(n, r, 5))))))
    v = G.vox(f0, forms, amp_f, r, 1.0, tilt=1.0, breath=0.25, fmax=3200, jitter=0.05)
    v = np.tanh(1.8 * v / (np.abs(v).max() + 1e-9)) * 0.8
    sub = ringmod_rumble(r, d, 0.6 * np.mean(f0), flutter * 0.9) * amp
    sub = lp(sub / (np.abs(sub).max() + 1e-9), 260) * 0.9 * big
    gur = G.bubbles(d, r, 22 * bubbly, 120, 700, (0.01, 0.05), amp, (2, 7)); gur = lp(gur, 1500) / (np.abs(gur).max() + 1e-9) * 0.35 * bubbly
    y = v * 0.9 + sub + gur
    if squeal:  # comic squeaky tail at the very end: "...eeeep-blorp"
        k = ns(d * 0.82); L = n - k; tl = np.arange(L) / SR
        sq = np.sin(phase(np.geomspace(260, 900, L) * (1 + 0.06 * np.sin(TAU * 11 * tl)))) * np.sin(np.pi * tl / (L / SR)) ** 0.7
        y[k:] += lp(sq, 2500) * 0.3 * squeal
    return fades(y, 0.01, 0.06)

def rubber_wave(r, d=3.0, f_lo=95, f_hi=190, muffle=None):
    """the big squeeze: a wet stretchy rubbery moan sweeping across with sloshes; returns stereo, pans L -> R"""
    n = ns(d); t = np.arange(n) / SR; u = t / d
    f = np.interp(u, [0, 0.4, 0.75, 1], [f_lo, f_hi * 0.9, f_hi, f_lo * 1.3]) * (1 + 0.05 * np.sin(TAU * 5.5 * t) + 0.02 * smooth_noise(n, r, 8))
    ph = phase(f); y = sum(np.sin(k * ph + 0.7 * k) / k ** 0.9 for k in range(1, 22))
    fc = np.interp(u, [0, 0.5, 1], [450, 1400, 700])
    y = shape(y, lambda T, F: 0.25 + 1.6 / (1 + ((F[:, None] - np.interp(T, t, fc)[None, :]) / (0.4 * np.interp(T, t, fc)[None, :])) ** 2), 1024, 256)
    env = np.sin(np.pi * np.clip(u, 0, 1)) ** 0.8 * (0.8 + 0.2 * np.sin(TAU * 3.1 * t))
    y = y / (np.std(y) + 1e-9) * env * 0.35
    nz = colored(n, r, 1.0)
    wet = shape(nz, lambda T, F: 1 / (1 + ((F[:, None] - np.interp(T, t, fc * 0.8)[None, :]) / (0.3 * np.interp(T, t, fc * 0.8)[None, :])) ** 2), 1024, 128)
    wet = wet / (np.std(wet) + 1e-9) * env * (0.55 + 0.45 * np.sin(TAU * 8.5 * t) ** 2) * 0.3
    sub = lp(np.sin(phase(np.interp(u, [0, 1], [45, 60]))) * env, 150) * 0.5
    y = y + wet + sub
    if muffle: y = lp(y, muffle, 2)
    return fades(panc(y, np.interp(u, [0, 1], [-0.75, 0.75])), 0.02, 0.15)

def footsteps(r, d, rate=13.0, f=(800, 1400), g=0.5):
    y = np.zeros(ns(d) + ns(0.1)); tm = 0.0; i = 0
    while tm < d:
        c = woodblock(r, float(r.uniform(*f)) * (1.15 if i % 2 else 1.0), float(r.uniform(0.6, 1.0)), 0.06)
        sc = bp(r.standard_normal(ns(0.04)), 2000, 7000, 1) * np.exp(-tt(0.04) / 0.01) * 0.25
        k = ns(tm); y[k:k + len(c)] += c; y[k:k + len(sc)] += sc
        tm += (1 / rate) * r.uniform(0.85, 1.15); i += 1
    return fades(y * g, 0.001, 0.05)

# ---------------- funk instruments ----------------
def slap(f, d=0.25, pop=False, r=None, vel=0.8):
    """slap bass: thumb (bright transient, quick filter-like decay of upper partials) or popped octave"""
    t = tt(d + 0.05); K = int(min(36, 7000 / f)); y = np.zeros(len(t))
    for k in range(1, K + 1):
        a = (1 / k ** (0.7 if pop else 0.9)) * (1.0 + (0.8 if pop else 0.4) * (k in (3, 4, 5)))
        tau = (0.45 / (1 + (0.9 if pop else 0.55) * (k - 1)))
        y += a * np.exp(-t / tau) * np.sin(TAU * k * f * np.sqrt(1 + 1e-4 * k * k) * t + r.uniform(0, TAU))
    y = np.tanh(1.4 * y / (np.abs(y).max() + 1e-9))
    y += lp(r.standard_normal(len(t)), 300 if not pop else 2500) * np.exp(-t / (0.008 if not pop else 0.003)) * (0.5 if not pop else 0.35)
    env = np.clip((d + 0.03 - t) / 0.03, 0, 1) * (1 - np.exp(-t / 0.0008))
    return fades(y * env * vel, 0.0005, 0.01)
def clav(f, d=0.12, r=None, vel=0.7, wah=1300):
    """clavinet: struck string near the pickup (comb-ish spectrum), bright, damped with a little release thunk"""
    t = tt(d + 0.04); K = int(min(40, 9000 / f)); y = np.zeros(len(t))
    for k in range(1, K + 1):
        y += abs(np.sin(np.pi * k * 0.11)) / k ** 0.55 * np.exp(-t / (0.9 / (1 + 0.3 * (k - 1)))) * np.sin(TAU * k * f * t + r.uniform(0, TAU))
    env = np.clip((d + 0.015 - t) / 0.015, 0, 1)
    y = y * env; y = peq(y, wah, 7, 1.6); y = hp(y, 180)
    y += bp(r.standard_normal(len(t)), 800, 4000, 1) * np.exp(-np.maximum(t - d, 0) / 0.004) * (t > d) * 0.08
    return fades(y * vel / 4, 0.0004, 0.01)

# ======================= MUSIC =======================
# A) hook: tense, quiet exam-hall bed (held high string note + low drone), fades into the dive
M(pad([m2f(71)], 3.55, 0.22, r_(), att=0.9, rel=0.5, warm=2500, detune=5, trem=lambda t: 1 - 0.15 * (0.5 + 0.5 * np.sin(TAU * 5.5 * t))), 0.0, 1.0, 0.2)
M(pad([m2f(40), m2f(47)], 3.4, 0.3, r_(), att=1.2, rel=0.6, warm=500, detune=4), 0.05, 1.0, -0.1)
M(pad([m2f(72)], 1.6, 0.12, r_(), att=0.8, rel=0.5, warm=2500, detune=5), 1.95, 1.0, 0.25)  # creeping semitone rub
# arrival in the cavern: low warm swell
M(pad([m2f(m) for m in (40, 47, 55)], 1.2, 0.25, r_(), att=0.6, rel=0.25, warm=700), 4.2, 1.0)

# B) the cleaning-crew groove: 115 bpm, 5 bars from "crew" to "Squish" (downbeat = the drop)
B = (T_SQUISH - T_CREW) / 20; S16 = B / 4; SWG = 0.56
def s16(t0, k): return t0 + (k // 2) * 2 * S16 + (k % 2) * SWG * 2 * S16
CHD = {"Em7": [52, 55, 59, 62], "A7": [55, 57, 61, 64], "B7": [54, 57, 59, 63], "D": [54, 57, 62, 66]}
ROOT_ = {"Em7": 28, "A7": 33, "B7": 35, "D": 38}
BASS = [(0, 0, "T", 2), (3, 12, "P", 1), (4, 0, "T", 1), (6, 3, "T", 1), (7, 5, "T", 1), (8, 0, "T", 2), (10, 12, "P", 1),
        (11, 10, "T", 1), (12, 7, "T", 1), (14, 5, "T", 1), (15, 3, "T", 1)]
CLAV = [2, 3, 6, 10, 11, 14]
def groove(buf, t0, prog, part, lead=None, intro=False, lvl=1.0):
    for bi, cn in enumerate(prog):
        tb = t0 + bi * 16 * S16; rt = ROOT_[cn]
        for k, iv, kind, ln in BASS:
            if intro and bi == 0 and k > 8: continue
            M(slap(m2f(rt + iv), ln * S16 * 0.9, kind == "P", r_(), 0.9 if k == 0 else 0.7), s16(tb, k), 0.55 * lvl, 0, buf)
        for b in range(4):
            tq = tb + b * B
            if b in (0, 2): M(kick(r_(), 0.9), tq, 0.55 * lvl, 0, buf)
            if b == 1: M(kick(r_(), 0.7), s16(tb, 4 * b + 2) + 0 * SWG, 0.45 * lvl, 0, buf)
            if b in (1, 3): M(brush(0.85, r_(), 0.3), tq, 0.75 * lvl, 0.12, buf); M(snare(0.25, r_(), 0.2, 1.3, 0.6), tq, 0.25 * lvl, 0.12, buf)
            M(brush(0.4, r_(), B * 0.95, swish=True), tq, 0.35 * lvl, -0.35 if b % 2 else 0.35, buf)
            for j in range(4):
                if not (intro and bi == 0): M(hat(r_(), 0.13 if j % 2 == 0 else 0.07), s16(tb, b * 4 + j), 0.5 * lvl, 0.4, buf)
        if not (intro and bi == 0):
            for k in CLAV:
                for i, m in enumerate(CHD[cn]): M(clav(m2f(m), S16 * 0.55, r_(), 0.55 if k % 4 == 2 else 0.4, 1100 + 300 * (k % 3)), s16(tb, k) + 0.003 * i, 0.42 * lvl, -0.3 + 0.2 * i, buf)
    if lead:
        t1, w = whistle(lead, r_(), vib_depth=20, bright=0.05, breath=0.04)
        M(w, t1, 0.11 * lvl, 0.25, buf)

gA = bus()
PROG_A = ["Em7", "Em7", "A7", "Em7", "B7"]
tb = lambda i: T_CREW + i * 16 * S16
LEAD_A = [(s16(tb(1), k), ln * S16, m, 0.9) for k, m, ln in [(0, 88, 2), (2, 91, 2), (4, 93, 1), (5, 91, 1), (6, 88, 3), (10, 86, 1), (11, 88, 3), (14, 83, 2)]] + \
         [(s16(tb(2), k), ln * S16, m, 0.9) for k, m, ln in [(0, 85, 2), (2, 88, 2), (4, 90, 1), (5, 91, 1), (6, 93, 5), (12, 91, 1), (13, 88, 3)]] + \
         [(s16(tb(3), k), ln * S16, m, 0.9) for k, m, ln in [(0, 88, 2), (2, 91, 2), (4, 93, 1), (5, 95, 1), (6, 93, 2), (8, 91, 2), (10, 88, 2), (12, 86, 2), (14, 88, 2)]] + \
         [(s16(tb(4), k), ln * S16, m, 0.9) for k, m, ln in [(0, 87, 2), (2, 90, 2), (4, 93, 2), (6, 95, 3), (10, 93, 1), (11, 90, 1), (12, 87, 3)]]
groove(gA, T_CREW, PROG_A, "A", LEAD_A, intro=True)
M(slap(m2f(26), 0.25, False, r_()), T_CREW - 2 * S16, 0.4, 0, gA); M(slap(m2f(27), 0.12, False, r_()), T_CREW - S16, 0.45, 0, gA)  # pickup
# squeeze wave: rising sweep with the groove (8.7 -> 11.7)
T_SQ0, T_SQ1 = 8.7, 11.7; d = T_SQ1 - T_SQ0; t = tt(d); u = t / d
sw = sum(np.sin(k * phase(np.geomspace(110, 440, len(t)) * (1 + 0.003 * k))) / k for k in range(1, 12))
sw = shape(sw, lambda T, F: 1 / (1 + (F[:, None] / (300 + 3500 * (T[None, :] / d) ** 1.5)) ** 4), 1024, 256)
M(fades(sw * u ** 1.6 * 0.12, 0.05, 0.12), T_SQ0, 1.0, 0, gA)
M(G.whoosh(d, r_(), d * 0.92, 300, 6000, width=0.6, tail=0.15, air=0.3), T_SQ0, 0.16, 0, gA)
M(cymbal(0.6, r_(), 1.8, 1.0), T_SQ1 - 0.05, 0.18, 0.3, gA)
# bubble lead-in: the band pulls back a little before the squish (12.4 -> 16.0), then a snare fill
gmask = mask([(T_CREW - 0.3, T_SQUISH - 0.004)], 0.006) * (1 - 0.35 * mask([(12.6, 15.4)], 0.6))
mus += gA * gmask[None, :]
for i, tr in enumerate(np.arange(T_SQUISH - 4 * S16, T_SQUISH - 0.02, S16 / 2)): M(snare(0.3 + 0.08 * i, r_(), 0.15), tr, 0.18)

# C) the cavernous reverb DROP on "Squish": one last band hit, everything else gone, a huge cave tail
drop = bus()
M(slap(m2f(28), 0.5, False, r_(), 1.0), T_SQUISH, 0.6, 0, drop); M(kick(r_(), 1.0), T_SQUISH, 0.7, 0, drop)
for i, m in enumerate(CHD["Em7"]): M(clav(m2f(m), 0.18, r_(), 0.7), T_SQUISH + 0.003 * i, 0.5, -0.3 + 0.2 * i, drop)
M(cymbal(0.7, r_(), 2.0, 0.8), T_SQUISH, 0.2, 0, drop)
M(pad([m2f(m) for m in (40, 47, 52, 55)], 2.0, 0.25, r_(), att=0.02, rel=1.2, warm=600), T_SQUISH, 0.6, 0, drop)
CAVE = make_ir(4.2, 77, hf=0.9, early=[(0.11, 0.5, -0.6), (0.23, 0.45, 0.6), (0.37, 0.35, -0.4), (0.52, 0.25, 0.5)])
mus += drop * 0.4 + 0.75 * convolve_st(drop, CAVE)
# low held bass tone carrying under "That's the growl"
M(pad([m2f(28), m2f(35)], 1.7, 0.25, r_(), att=0.6, rel=0.4, warm=300), 17.9, 1.0)

# D) full belly: the SAME groove, cosy + muffled (low-passed, softer, no lead) 19.6 -> 25.9
gF = bus(); groove(gF, T_FULL, ["Em7", "A7", "Em7"], "F", None, lvl=1.0)
M(pad([m2f(m) for m in (52, 55, 59, 62)], 2 * 16 * S16, 0.25, r_(), att=0.8, rel=0.6, warm=700), T_FULL, 1.0, 0, gF)
M(pad([m2f(m) for m in (55, 57, 61, 64)], 16 * S16, 0.22, r_(), att=0.3, rel=0.6, warm=700), T_FULL + 16 * S16, 1.0, 0, gF)
gF = lp(gF, 520, 2); gF = peq(gF, 180, 3.0, 0.8)
fm = mask([(T_FULL - 0.1, T_FULL + 48 * S16 - 0.02)], 0.1)
mus += gF * 0.8 * fm[None, :]
M(slap(m2f(28), 0.6, False, r_(), 0.8), T_FULL + 48 * S16, 0.3)  # soft landing note ~25.87 (low)

# E) staff room: tick-tock elevator cue (vibes + soft chords + bossa bass + woodblock clock), cut by the whistle
gS = bus(); t0s = T_NOW - 0.02
EP = [("Cmaj7", [48, 55, 59, 64], 36), ("Am7", [45, 52, 55, 60], 33), ("Dm7", [50, 53, 57, 60], 38), ("G7", [43, 53, 59, 62], 31)]
for i, (nm, vo, rt) in enumerate(EP):
    tc = t0s + i * 2 * B
    for j, m in enumerate(vo): M(vibes(m2f(m + 12), 0.4, r_(), 1.3, damp=2 * B * 0.95, trem=5.0, trem_depth=0.3), tc + 0.01 * j, 0.14, -0.4 + 0.27 * j, gS)
    M(pluck(m2f(rt), 0.6, r_(), 0.6, 0.25), tc, 0.4, 0, gS); M(pluck(m2f(rt + 7), 0.5, r_(), 0.5, 0.25), tc + 1.5 * B, 0.33, 0, gS)
    M(pluck(m2f(rt + 12), 0.4, r_(), 0.4, 0.25), tc + B, 0.25, 0, gS)
EMEL = [(0, 76, 1.5), (1.5, 74, 0.5), (2, 72, 1), (3, 69, 1), (4, 72, 1.5), (5.5, 74, 0.5), (6, 77, 2)]
for bt, m, ln in EMEL: M(vibes(m2f(m + 12), 0.5, r_(), 1.6, damp=ln * B, trem=5.0, trem_depth=0.25), t0s + bt * B, 0.17, 0.15, gS)
for b in range(16):
    tq = t0s + b * B / 2
    M(woodblock(r_(), 1700 if b % 2 == 0 else 1250, 0.5, 0.1), tq, 0.2, 0.35 if b % 2 == 0 else -0.35, gS)
    if b % 2 == 1: M(brush(0.4, r_(), 0.25), tq, 0.25, 0.2, gS)
sm = mask([(t0s - 0.05, T_TWEET - 0.01)], 0.02)
gS = gS * sm[None, :] + 0.25 * convolve_st(gS * sm[None, :], make_ir(0.9, 91, hf=1.3))
mus += gS
# the crew dashes out: quick slap scramble up into the whoosh
for i, m in enumerate([28, 31, 33, 35, 38, 40, 43, 45, 47, 50]): M(slap(m2f(m), 0.07, i % 3 == 2, r_(), 0.6), T_EAT + 0.04 + i * 0.055, 0.35, -0.4 + 0.08 * i)
for i, m in enumerate([88, 91, 93, 95]): M(clav(m2f(m - 24), 0.06, r_(), 0.6), T_EAT + 0.25 + i * 0.07, 0.4, 0.3)

ROOM = make_ir(1.1, 41, hf=1.4)
mus = mus + 0.12 * convolve_st(mus, ROOM)
silence = 1 - mask([(T_SILENT, DUR + 1)], 0.03)

# F) payoff stinger (hit bus) on the stare: timpani roll-in + brass + strings tremolo + cymbal
T_ST = at("in", 1) - 0.16  # in the gap after "growls...", before "in the quietest"
for (tr, vr) in zip(np.arange(T_ST - 0.42, T_ST - 0.01, 1 / 24), np.linspace(0.15, 0.6, 12)): P(hit, timpani(m2f(38), vr, r_(), 0.5), tr, 0.35)
P(hit, timpani(m2f(38), 1.0, r_(), 2.4), T_ST, 0.9)
for i, (m, kind) in enumerate([(38, "tuba"), (50, "horn"), (53, "horn"), (56, "horn"), (62, "stab"), (65, "stab")]):
    P(hit, fades(brass(m2f(m), 0.75, 0.95, r_(), kind, scoop=-30, rel=0.35, fall=-1.0 if m < 60 else 0), 0.002, 0.2), T_ST + 0.004 * i, 0.16, -0.5 + 0.2 * i)
P(hit, pad([m2f(m) for m in (62, 65, 68, 74)], 1.1, 0.5, r_(), att=0.01, rel=0.7, warm=3000, detune=10, trem=lambda t: 0.55 + 0.45 * np.sin(TAU * 13 * t) ** 2), T_ST, 0.7)
P(hit, cymbal(0.9, r_(), 2.6, 1.1), T_ST, 0.28)
HALLIR = make_ir(2.4, 53, hf=1.0, early=[(0.03, 0.3, -0.5), (0.055, 0.25, 0.5)])
hit = (hit + 0.35 * convolve_st(hit, HALLIR)) * 0.5  # sting sits under the monster growl
# soft button ending
P(pay, pluck(m2f(40), 0.5, r_(), 1.2, 0.3), 35.62, 0.5)
P(pay, vibes(m2f(76), 0.35, r_(), 1.0, trem=4.0, trem_depth=0.3), 35.64, 0.12, 0.2)
P(pay, vibes(m2f(71), 0.3, r_(), 0.9, trem=4.0, trem_depth=0.3), 35.38, 0.08, -0.2)

# ======================= SFX =======================
cave = st(lp(colored(N, r_(), 1.6), 240) * 0.3); cave = cave * mask([(3.75, T_SQUISH + 0.1), (T_FULL, 25.95)], 0.4) * (1 - 0.55 * mask([(T_FULL, 26)], 0.4))
S(cave, 0, 0.22, name="stomach cavern bed")
S(fades(lp(G.bubbles(8.3, r_(), 1.6, 250, 1000, (0.01, 0.04)), 2500), 0.3, 0.5), 3.9, 0.12, -0.3, name="juice bubbles")
# HOOK: the hall clock (tick-tock every 0.5 s, phase-locked so a tick lands on "always" in the payoff)
TK0 = T_ALWAYS - 0.5 * np.floor(T_ALWAYS / 0.5)
for i, tq in enumerate(np.arange(TK0, 3.6, 0.5)): S(clock_tick(r_(), i % 2 == 0, 0.5), tq, 0.55 * (1 - 0.6 * (tq > 3.0)), 0.15, name="hall clock" if i == 0 else None)
# belly rumble 0.3 - 1.2 + pencil rattle
S(lp(growl(r_(), 0.95, [(0, 52), (0.3, 64), (0.6, 58), (0.95, 48)], [(0, "u"), (0.95, "U")], 18, 0.8, 1.5), 900), 0.28, 0.5, 0, "belly rumble")
rr = r_()
for tm in np.arange(0.4, 1.05, 0.045): S(woodblock(rr, float(rr.uniform(2600, 3400)), float(rr.uniform(0.2, 0.5)), 0.05), tm + rr.normal(0, 0.006), 0.18, 0.3)
EV.append((0.4, "pencil rattle"))
# wet-floor sign pop + squeak, then the wave boop
S(plip(r_(), 520, 2.6, 0.03), 2.1, 0.6, -0.05, "sign POP"); S(tick(r_(), 2400, 0.002, 1.0), 2.1, 0.3)
S(squeak(r_(), 1150, 1750, 0.16, 0.35), 2.16, 0.5, 0.05, "squeak")
S(blip(620, 860, 0.12, 0.3), at("cleaning") - 0.06, 0.4, 0.1, "wave boop"); S(blip(860, 720, 0.1, 0.25), at("cleaning") + 0.07, 0.3, 0.1)
# dive whoosh 3.3 - 3.8 + wet slurp into the cavern
S(G.whoosh(0.65, r_(), 0.38, 200, 3200, tail=0.12, air=0.3), 3.25, 0.6, 0, "dive whoosh")
S(blip(900, 220, 0.5, 0.12, harm=0.3), 3.3, 0.5)
S(squelch(r_(), 0.35, 1100, 300, 0.4), 3.78, 0.45, 0, "slurp in")
# alarm clock RING 5.4 - 6.3, crew boing jumps 5.9
S(alarm_bell(r_(), 0.9, 1250), 5.4, 0.55, -0.45, "ALARM RING")
for i, (dt, f) in enumerate([(0.0, 300), (0.07, 380), (0.13, 260), (0.21, 450), (0.28, 340)]): S(boing(f, 0.42, 0.3, 11 + i), 5.9 + dt, 0.45, -0.6 + 0.3 * i, "crew boing jumps" if i == 0 else None)
# clock spin 7.1
rr = r_(); tm = 0.0
for i in range(26):
    S(tick(rr, 4200, 0.0012, 0.5), 7.08 + tm, 0.5, -0.4); tm += 0.012 + 0.03 * abs(i - 13) / 13 * (0.6 if i < 13 else 1.4) ** 1
S(blip(600, 1600, 0.6, 0.12, vib=0.04), 7.1, 0.35, -0.4, "clock spin")
S(glock(m2f(96), 0.4, r_(), 0.8), 7.1 + tm, 0.12, -0.4)
# THE SQUEEZE 8.7 - 11.7 + broom swishes + crumbs 10.5 - 11.6
S(rubber_wave(r_(), T_SQ1 - T_SQ0), T_SQ0, 0.75, name="big squeeze wave")
for i, ts in enumerate([9.0, 9.95, 10.85]): S(squeak(r_(), 380 + 60 * i, 640 + 90 * i, 0.3, 0.3), ts, 0.4, -0.5 + 0.5 * i)
for i, tq in enumerate(np.arange(9.0, 11.65, B)): S(brush(0.9, r_(), 0.38, swish=True), tq, 0.55, -0.5 + 0.2 * i, "broom swishes" if i == 0 else None)
rr = r_(); tm = 10.5
while tm < 11.6:
    S(tick(rr, float(rr.uniform(1500, 4500)), float(rr.uniform(0.001, 0.003)), float(rr.uniform(0.3, 0.9))), tm, 0.45, float(np.interp(tm, [10.5, 11.6], [0, 0.85]))); tm += rr.exponential(1 / 45)
EV.append((10.5, "crumbs swept"))
S(G.whoosh(0.5, r_(), 0.15, 400, 3000, tail=0.15), 11.35, 0.25, 0.8)
# bubble wobble 14.4
t = tt(0.65); wb = np.sin(phase(170 * (1 + 0.18 * np.sin(TAU * 7 * t) * np.exp(-t / 0.4)))) * np.sin(np.pi * t / 0.65) ** 0.6
S(fades(lp(wb + 0.3 * np.sin(2 * phase(170 * (1 + 0.18 * np.sin(TAU * 7 * t))) + 1), 1500) * 0.4, 0.005, 0.05), 14.4, 0.45, 0.3, "bubble wobble")
# SQUISH 16.06 (sent into the cave) + echo rings 17.0
sq = bus(); P(sq, squelch(r_(), 0.55, 1300, 180, 0.8, 22), T_SQUISH, 1.0); P(sq, thump(r_(), 200, 45, 0.9, 0.5, 0.12), T_SQUISH, 0.7)
t = tt(0.4); P(sq, fades(np.sin(phase(np.geomspace(320, 90, len(t)))) * np.exp(-t / 0.15) * 0.4, 0.002, 0.05), T_SQUISH + 0.02, 1.0)
for i, dt in enumerate([0.0, 0.34, 0.68, 1.02]):
    t = tt(0.9); f = 520 * 0.97 ** i
    ring = (np.sin(phase(f * (1 - 0.06 * t))) + 0.4 * np.sin(phase(f * 1.5 * (1 - 0.06 * t)))) * np.exp(-t / 0.25) * np.minimum(1, t / 0.01)
    P(sq, fades(lp(ring, 3000 - 600 * i) * 0.25 * 0.65 ** i, 0.002, 0.1), T_ECHO + dt, 1.0, (-0.6, 0.6, -0.4, 0.4)[i])
EV += [(T_SQUISH, "SQUISH"), (T_ECHO, "echo rings")]
S(sq * 0.55 + 0.6 * convolve_st(sq, CAVE), 0, 1.0)
# THAT'S THE GROWL 18.5: deep comic growl with a huge cave echo tail
gr = np.pad(growl(r_(), 1.05, squeal=0.0), (0, ns(4.0))); grs = widen(gr, r_(), 9, 0.6)  # padded: room for the echo tail
dly = np.zeros_like(grs)
for k in range(1, 6): place(dly, lp(grs, 1800 - 250 * k) * 0.5 ** k, 0.31 * k)
grs = grs + dly; S(grs * 0.8 + 0.9 * convolve_st(grs, CAVE), T_GROWL, 0.85, 0, "THE GROWL")
# FULL: food plops 20.0 - 21.5, muffled squeeze 22.4 - 23.5, tiny "mmf" 24.35
rr = r_()
for i, tp in enumerate([20.0, 20.27, 20.55, 20.82, 21.12, 21.45]):
    f = float(rr.uniform(260, 520)); p = float(rr.uniform(-0.6, 0.6))
    S(fades(np.sin(phase(np.geomspace(f * 1.8, f * 0.6, ns(0.18)))) * np.exp(-tt(0.18) / 0.06) * 0.4, 0.002, 0.03), tp, 0.55, p, "food plops" if i == 0 else None)
    S(thump(rr, 150, 60, 0.6, 0.25, 0.06), tp + 0.01, 0.4, p); S(squelch(rr, 0.2, 800, 300, 0.4), tp + 0.01, 0.35, p)
S(rubber_wave(r_(), 1.15, 80, 150, muffle=420), 22.4, 0.9, name="muffled squeeze")
n = ns(0.28); t = np.arange(n) / SR
mmf = G.vox(np.interp(t, [0, 0.28], [210, 165]), G.vowel_track(n, [(0, "u"), (0.28, "u")]), np.sin(np.pi * t / 0.28) ** 0.8, r_(), 1.3, tilt=1.6, breath=0.05, fmax=2500)
mmf = lp(mmf, 650) + lp(bp(r_().standard_normal(n), 300, 2000, 1), 900) * np.exp(-np.maximum(t - 0.18, 0) / 0.03) * (t > 0.18) * 0.4
S(fades(mmf * 0.4, 0.005, 0.04), at("muffles") - 0.02, 0.6, 0.15, "mmf")
# STAFF: time-clock punch, whistle TWEET, running feet + whoosh to the hall
T_PUNCH = at("starts") - 0.06
S(thump(r_(), 260, 120, 0.6, 0.15, 0.03), T_PUNCH, 0.5, 0.3, "time-clock punch"); S(woodblock(r_(), 900, 0.8, 0.1), T_PUNCH, 0.5, 0.3)
S(tick(r_(), 2500, 0.003, 1.0), T_PUNCH + 0.07, 0.6, 0.3); S(glock(m2f(91), 0.5, r_(), 0.9), T_PUNCH + 0.09, 0.15, 0.3)
t = tt(0.42); fw = 2950 * (1 + 0.05 * np.sign(np.sin(TAU * 34 * t)) * 0.6 + 0.04 * np.sin(TAU * 34 * t)) * (1 + 0.04 * np.exp(-t / 0.03))
tw = (np.sin(phase(fw)) + 0.15 * np.sin(2 * phase(fw))) * np.minimum(1, t / 0.006) * np.clip((0.42 - t) / 0.06, 0, 1) * (0.8 + 0.2 * np.sin(TAU * 34 * t))
tw += hp(r_().standard_normal(len(t)), 3000) * 0.08 * np.minimum(1, t / 0.01)
S(fades(tw * 0.35, 0.002, 0.03), T_TWEET - 0.02, 0.55, -0.1, "whistle TWEET")
S(footsteps(r_(), 0.62, 15, (750, 1200), 0.5), T_EAT, 0.45, -0.3, "running feet"); S(footsteps(r_(), 0.6, 13, (950, 1500), 0.45), T_EAT + 0.04, 0.4, 0.35)
S(footsteps(r_(), 0.5, 17, (1300, 1900), 0.35), T_EAT + 0.08, 0.35, 0.05)
S(G.whoosh(0.42, r_(), 0.3, 300, 4500, tail=0.04, air=0.35), T_SILENT - 0.42, 0.5, 0.2, "whoosh to the hall")
ROOM2 = make_ir(0.8, 47, hf=1.3)
sfx = sfx + 0.12 * convolve_st(sfx, ROOM2)

# ======================= PAYOFF (pay bus: after the silence cut) =======================
HALL = make_ir(1.5, 59, hf=1.2, early=[(0.021, 0.4, -0.5), (0.043, 0.3, 0.6)])
ticks = bus()
for i, tq in enumerate(np.arange(TK0, DUR - 0.5, 0.5)):
    if tq < T_SILENT + 0.05: continue
    loud = abs(tq - T_ALWAYS) < 0.01
    g = 0.95 if loud else 0.45 * (1 - 0.5 * float(np.clip((tq - 33.8) / 2.0, 0, 1)))
    P(ticks, clock_tick(r_(), round((tq - TK0) / 0.5) % 2 == 0, 1.0), tq, g, 0.15)
    if loud:
        P(ticks, thump(r_(), 300, 140, 0.5, 0.2, 0.04), tq, 0.45, 0.15); P(ticks, woodblock(r_(), 700, 0.8, 0.15), tq + 0.003, 0.6, 0.15)
        t = tt(0.25); P(ticks, fades(np.sin(phase(np.full(len(t), 1900.0))) * np.exp(-t / 0.06) * 0.2, 0.001, 0.03), tq + 0.01, 0.6, 0.15)
EV.append((T_ALWAYS, "LOUD hall clock tick"))
P(pay, ticks + 0.3 * convolve_st(ticks, HALL), 0, 1.0)
# THE MONSTER GROWL on "growls": longest, loudest, funniest (rumble -> rolled "grrr" -> rising "OOO" -> owl -> squeal)
T_MG = T_GROWLS - 0.03; DMG = 1.4
mg = growl(r_(), DMG, [(0, 50), (0.2, 62), (0.4, 80), (0.6, 98), (0.75, 92), (1.0, 66), (DMG, 44)],
           [(0, "er"), (0.3, "er"), (0.45, "o"), (0.62, "A"), (0.8, "o"), (1.05, "u"), (DMG, "u")], 24, 1.4, 1.6, squeal=1.0)
mg2 = growl(r_(), DMG, [(0, 49), (0.25, 60), (0.45, 82), (0.65, 96), (0.9, 75), (DMG, 42)], None, 21, 0.8, 0.8) * 0.5  # thickening double
mgs = widen(mg + mg2, r_(), 13, 0.8)
tg = np.arange(mgs.shape[1]) / SR
mgs = np.pad(mgs * (np.minimum(1, tg / 0.25) ** 0.7 * np.interp(tg, [0, 0.72, 0.95, DMG], [1, 1, 0.55, 0.4]))[None, :], ((0, 0), (0, ns(2.5))))  # peak in the gap; padded for the hall tail
P(hit, mgs + 0.45 * convolve_st(mgs, HALLIR), T_MG, 1.0)
EV += [(T_MG, "MONSTER GROWL"), (T_ST, "orchestral sting")]
# papers flutter on the shockwave
P(pay, G.whoosh(0.5, r_(), 0.12, 1500, 7000, tail=0.2, air=0.6) * (0.7 + 0.3 * np.sin(TAU * 23 * tt(0.5))), T_GROWLS + 0.2, 0.18, -0.3)
# under "quietest room possible": pencil drop + slow chair creak
rr = r_(); tp = at("quietest") + 0.3
for k, (dt, g) in enumerate([(0, 1.0), (0.17, 0.55), (0.29, 0.32), (0.36, 0.2), (0.41, 0.12)]):
    P(pay, woodblock(rr, float(rr.uniform(2400, 3200)), 0.6, 0.08) + 0.0, tp + dt, 0.35 * g, -0.45)
P(pay, G.creak(0.2, rr, 300, 400, scale=2.5) * 0.15, tp + 0.45, 0.4, -0.45)  # little roll
EV.append((tp, "pencil drop"))
P(pay, G.creak(1.25, r_(), 38, 70, shape_pts=[(0, 0), (0.2, 0.8), (0.6, 1.0), (1.0, 0)], rough=0.2) * 0.6, T_POSS + 0.2, 0.55, 0.05)
EV.append((T_POSS + 0.2, "slow chair creak"))
# tiny sheepish "sorry" blip ~34.9
n = ns(0.42); t = np.arange(n) / SR
f0 = np.interp(t, [0, 0.16, 0.2, 0.42], [520, 470, 500, 380])
amp = np.interp(t, [0, 0.03, 0.15, 0.19, 0.22, 0.36, 0.42], [0, 1, 0.8, 0.25, 0.85, 0.6, 0])
sorry = G.vox(f0, G.vowel_track(n, [(0, "o"), (0.15, "o"), (0.2, "er"), (0.27, "i"), (0.42, "i")]), amp, r_(), 1.45, tilt=1.2, breath=0.1, fmax=6000)
ss = hp(r_().standard_normal(ns(0.07)), 5000) * np.sin(np.pi * tt(0.07) / 0.07) * 0.5
pre_ = np.concatenate([ss, np.zeros(n)]); pre_[ns(0.05):ns(0.05) + n] += sorry * 0.9
P(pay, fades(bp(pre_, 250, 7000, 1) * 0.28, 0.003, 0.05), 34.88, 0.6, 0.1)
EV.append((34.88, "sorry"))
pay = pay + 0.15 * convolve_st(pay, HALL)

# ======================= MIX =======================
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(ndimage.maximum_filter1d(duck, ns(0.25)), ns(0.12))  # bridge short gaps
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0; MUS_T = float(os.environ.get("MUS_T", -18.5)); SFX_T = float(os.environ.get("SFX_T", -22.5))
HIT_T = float(os.environ.get("HIT_T", -8.0)); PAY_T = float(os.environ.get("PAY_T", -22.0))
v = to_lufs(v, V_T)
m = to_lufs(mus * silence[None, :], MUS_T) * 10 ** ((-7.0 * duck) / 20)
s = to_lufs(sfx * silence[None, :], SFX_T) * 10 ** ((-2.5 * duck) / 20)
hduck = duck * (3.0 + 4.0 * mask([(T_ST + 0.1, DUR)], 0.1))  # the stare line stays on top of the sting tail
hm = hit * 10 ** ((HIT_T - float(momentary(hit, 0.05).max())) / 20) * 10 ** ((-hduck) / 20)
pm = pay * 10 ** ((PAY_T - float(momentary(pay, 0.05).max())) / 20) * 10 ** ((-1.5 * duck) / 20)
raw = hp(v + m + s + hm + pm, 25)
def limit(x, ceil_db=-1.5, look=0.004):
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = up[: x.shape[1] * 4].reshape(-1, 4).max(1)
    g = np.minimum(1, 10 ** (ceil_db / 20) / (pk + 1e-12)); L = ns(look)
    g = ndimage.minimum_filter1d(g, 2 * L + 1); g = ndimage.uniform_filter1d(g, 2 * L + 1)
    return x * g
gain = 0.0
for _ in range(10):
    mix = limit(raw * 10 ** (gain / 20)); l = integrated(mix); gain += -15.0 - l
    if abs(l + 15.0) < 0.02: break
mix = fades(mix, 0.002, 0.6)
assert mix.shape[1] == N
write_wav(os.path.join(HERE, "mix.wav"), mix)
for nm, x in [("voice", v), ("music", m), ("sfx", s), ("hit", hm), ("pay", pm)]: write_wav(os.path.join(HERE, f"stem_{nm}.wav"), x * 10 ** (gain / 20), 16)
print("mix LUFS", round(integrated(mix), 2), "TP", round(true_peak(mix), 2), "len", mix.shape[1] / SR, "gain", round(gain, 2))
pre = raw * 10 ** (gain / 20); e1 = ndimage.maximum_filter1d(np.abs(mix).max(0), ns(0.01)); e0 = ndimage.maximum_filter1d(np.abs(pre).max(0), ns(0.01))
gr_ = 20 * np.log10((e1 + 1e-9) / (e0 + 1e-9)); gr_[e0 < 0.05] = 0; gr_[-ns(0.7):] = 0; k = int(np.argmin(gr_)); print("max limiter GR dB", round(float(gr_[k]), 2), "at", round(k / SR, 2))
for t_, nm in sorted(EV): print(f"{t_:6.2f} {nm}")
