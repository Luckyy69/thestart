# Sound for "Live Wire" (why hitting your funny bone zaps your pinky), 35.733 s (1072 frames @ 30 fps).
# All own synthesis (numpy/scipy, no samples); kit copied from growl-short/audio (dsp.py, instruments.py, sfx_gen.py).
# Cues keyed off the brief's cue FRAMES (F(frame)) and ../voice/words.json (at("word", n)).
# Music: bouncy cartoon 2/4 MARCH in C (oom-pah tuba, offbeat horn stabs, field snare, glock + fife lead) from the BONK;
# inside the arm the lead turns into a buzzy "electric" kazoo -> STOP on the door-frame shadow (timp roll + rumble) ->
# SLAM -> spark riser -> hard cut: music OUT, giant ZAP + buzz -> a fast GALOP as the line lights up (lamp dings) ->
# scream stop-time hits -> deflating chromatic walk-down to "fine" -> THE TURN on "Now": a sneaky dusty pizzicato
# tiptoe in D minor (bassoon, woodblock, vibes) -> HUSH on "Humerus..." (lone pedal + snare roll) -> label flip ->
# ba-dum-tss -> old-timey vaudeville tack-piano rag under the laugh track + portrait laughs -> portal -> deadpan
# silence, flat "BOMP" sting, offscreen BONK + zzt.
import json, os
import numpy as np
from scipy import ndimage, signal
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, peq, reson, colored, smooth_noise, fades, pan, st, place, integrated,
                 read_wav, write_wav, phase, shape, make_ir, convolve_st, true_peak, momentary, modal, impulse_train, widen)
from instruments import m2f, glock, vibes, triangle, pluck, pad, cymbal, timpani, snare, brush, brass, fife
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1072
DUR = TOTAL / FPS; N = 1715200
assert N == ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(20261128 + 17)
r_ = lambda: rng(int(R.integers(1 << 30)))
def F(fr): return fr / FPS
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
def bus(): return np.zeros((2, N))
mus, hit, sfx = bus(), bus(), bus(); EV = []
def P(buf, x, t, g=1.0, p=0.0): place(buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def M(x, t, g=1.0, p=0.0, buf=None): P(mus if buf is None else buf, x, t, g, p)
def S(x, t, g=1.0, p=0.0, name=None, buf=None):
    P(sfx if buf is None else buf, x, t, g, p)
    if name: EV.append((t, name))
def H(x, t, g=1.0, p=0.0, name=None): S(x, t, g, p, name, hit)
def mask(spans, sm=0.3):
    m = np.zeros(N)
    for a, b in spans: m[max(0, ns(a)):min(N, ns(b))] = 1
    return ndimage.uniform_filter1d(m, max(1, ns(sm)))
def panc(x, pc):
    th = (np.clip(pc, -1, 1) + 1) * np.pi / 4; return np.stack([x * np.cos(th), x * np.sin(th)]) * np.sqrt(2)

# ---------------- key times ----------------
T_WHACK, T_SOCK, T_XRAY, T_DIVE0, T_DIVE1 = F(12), F(40), F(102), F(116), F(136)
T_HUM, T_SQZ0, T_SQZ1, T_SIGN, T_SHADOW, T_SLAM = F(157), F(250), F(284), F(296), F(367), F(378)
T_SPK0, T_ZAP, T_ZAPEND = F(405), F(433), F(458)
T_LIT0, T_LIT1, T_RIDE0, T_RIDE1 = F(458), F(490), F(490), F(516)
T_SCR, T_SCR2, T_SCREND, T_BAND = F(526), F(529), F(550), F(587)
T_RISE0, T_RISE1, T_MUSEUM = F(596), F(620), F(612)
T_NOW = at("now"); T_HUSH = at("humerus", 1); T_TOK = F(777)
T_FLIP, T_RIM = F(878), F(886)
T_LAUGH = [F(947), F(960), F(968), F(974)]
T_PORT0, T_PORT1, T_STING, T_BONK, T_ZZT = F(984), F(998), F(1030), F(1056), F(1059)

# ---------------- atoms ----------------
def tick(r, f=3000, tau=0.004, g=0.4): t = tt(0.03); return fades(bp(r.standard_normal(len(t)), f, min(f * 3, 20000), 1) * np.exp(-t / tau) * g, 0.0005, 0.005)
def woodblock(r, f=1100, g=0.5, d=0.15):
    y = modal(d, [(f, 1.0, 0.025), (f * 2.7, 0.35, 0.012), (f * 4.1, 0.15, 0.006)], r)
    t = tt(d); y += bp(r.standard_normal(len(t)), 1500, 6000, 1) * np.exp(-t / 0.0015) * 0.4
    return fades(y * g, 0.0003, 0.02)
def kick(r, g=1.0): t = tt(0.4); return fades(np.sin(phase(np.geomspace(120, 45, len(t)))) * np.exp(-t / 0.12) * g + lp(r.standard_normal(len(t)), 1200) * np.exp(-t / 0.004) * 0.15 * g, 0.0005, 0.05)
def bassdrum(r, g=1.0):  # marching bass drum: low boomy head
    t = tt(0.6); y = modal(0.6, [(62, 1.0, 0.16), (98, 0.4, 0.08), (141, 0.2, 0.05)], r, glide=0.04, glide_tau=0.03)
    return fades((y + lp(r.standard_normal(len(t)), 600) * np.exp(-t / 0.01) * 0.4) * g, 0.0005, 0.06)
def hat(r, g=0.2, d=0.06, tau=0.012): t = tt(d); return fades(hp(r.standard_normal(len(t)), 7500) * np.exp(-t / tau) * g, 0.0005, 0.01)
def snap(r, g=0.4):
    t = tt(0.12); y = bp(r.standard_normal(len(t)), 1800, 5000, 2) * np.exp(-t / 0.018) + np.sin(TAU * 1650 * t) * np.exp(-t / 0.012) * 0.3
    return fades(y * g, 0.0005, 0.02)
def blip(f0, f1, d=0.15, g=0.3, vib=0.0, harm=0.0):
    t = tt(d); f = np.geomspace(f0, f1, len(t)) * (1 + vib * np.sin(TAU * 7 * t)); ph = phase(f)
    return fades((np.sin(ph) + harm * np.sin(2 * ph) + harm * 0.5 * np.sin(3 * ph)) * g * np.minimum(1, t / 0.008), 0.003, 0.04)
def thump(r, f0=140, f1=50, g=1.0, d=0.4, tau=0.1):
    t = tt(d); return fades((lp(r.standard_normal(len(t)), 350) * np.exp(-t / 0.035) + np.sin(phase(np.geomspace(f0, f1, len(t)))) * np.exp(-t / tau)) * g, 0.001, 0.05)
def squeak(r, f0=900, f1=1500, d=0.22, g=0.3):
    t = tt(d); f = np.geomspace(f0, f1, len(t)) * (1 + 0.04 * np.sin(TAU * 31 * t)); ph = phase(f)
    y = sum(np.sin(k * ph + k) / k ** 0.8 for k in range(1, 7)); y = bp(y, 700, 6000, 1)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.6 * (0.75 + 0.25 * np.sin(TAU * 47 * t))
    return fades(y * env * g, 0.004, 0.03)
def ringmod_rumble(r, d, f0=48, rough=24, g=1.0):
    n = ns(d); t = np.arange(n) / SR
    f = f0 * (1 + 0.12 * smooth_noise(n, r, 2.0)); ph = phase(f)
    y = np.sin(ph) + 0.5 * np.sin(2 * ph + 1) + 0.25 * np.sin(3 * ph + 2)
    y *= 0.6 + 0.4 * np.abs(np.sin(np.pi * rough * t + 2 * smooth_noise(n, r, 4)))
    y += 0.8 * lp(colored(n, r, 2.0), 220)
    return y * g
def zing(r, f=2600, d=0.35, g=0.3):  # cartoon "zing" (bright ringing wobble)
    t = tt(d); fr = f * (1 + 0.03 * np.sin(TAU * 23 * t)) * (1 + 0.08 * np.exp(-t / 0.02))
    ph = phase(fr); y = (np.sin(ph) + 0.3 * np.sin(2.01 * ph)) * np.exp(-t / 0.12)
    return fades(y * g, 0.001, 0.05)
def crackle(r, d=0.8, rate=60, f=(2500, 9000), env=None, g=0.5):
    n = ns(d); y = np.zeros(n + ns(0.03)); tm = 0.0
    while tm < d:
        u = tm / d; e = 1.0 if env is None else float(np.interp(u, [p[0] for p in env], [p[1] for p in env]))
        c = tick(r, float(r.uniform(*f)), float(r.uniform(0.0006, 0.0025)), float(r.uniform(0.4, 1.0)) * e)
        k = ns(tm); y[k:k + len(c)] += c
        tm += r.exponential(1 / (rate * max(e, 0.15)))
    return fades(y[:n] * g, 0.001, 0.02)
def mains(d, r, f=60.0, bright=4000, rough=0.0):  # electrical hum/buzz: odd-heavy harmonics of f
    n = ns(d); t = np.arange(n) / SR; ph = phase(f * (1 + 0.002 * smooth_noise(n, r, 1)))
    y = sum((1.0 if k % 2 else 0.55) / k ** 0.9 * np.sin(k * ph + 0.7 * k) for k in range(1, int(bright / f)))
    if rough: y *= 1 + rough * ndimage.uniform_filter1d((smooth_noise(n, r, 30) > 0.3).astype(float), ns(0.003))
    return y
def zap(r, d=0.45):
    t = tt(d); f = np.geomspace(1600, 260, len(t)); sq = np.sign(np.sin(phase(f))) * 0.12 * np.exp(-t / 0.2)
    cr = bp(r.standard_normal(len(t)), 2000, 9000, 1) * ndimage.uniform_filter1d((smooth_noise(len(t), r, 60) > 0.25).astype(float), ns(0.002)) * 0.45 * np.exp(-t / 0.18)
    bz = np.sin(phase(np.full(len(t), 100.0))) ** 3 * 0.15 * np.exp(-t / 0.15)
    return fades(lp(sq, 5000) + cr + bz, 0.002, 0.05)
def big_zap(r, d=1.0):
    """THE peak ZAP: crack + falling electric square sweep + arc crackle + sub drop"""
    n = ns(d); t = np.arange(n) / SR
    crack = hp(r.standard_normal(n), 900) * np.exp(-t / 0.02) * 0.45
    f = np.geomspace(3200, 140, n) * (1 + 0.08 * np.sign(np.sin(TAU * 41 * t)))
    sq = np.tanh(3 * np.sin(phase(f))) * np.exp(-t / 0.35) * 0.35
    sq = lp(sq, 6000)
    gate = ndimage.uniform_filter1d((smooth_noise(n, r, 80) > 0.0).astype(float), ns(0.002))
    arc = bp(r.standard_normal(n), 1500, 11000, 1) * gate * np.exp(-t / 0.4) * 0.6
    bzz = mains(d, r, 100, 5000) / 6 * np.exp(-t / 0.5) * (0.6 + 0.4 * np.sin(TAU * 25 * t))
    sub = np.sin(phase(np.geomspace(110, 32, n))) * np.exp(-t / 0.35) * 0.9
    y = crack + sq + arc + bzz * 0.5 + sub
    return fades(np.tanh(1.5 * y) / 1.5 * 1.3, 0.0005, 0.08)
def meme_buzz(r, d):
    """the electrocuted hold: BZZZT alternating between two pitches (matches the 2-drawing jitter), crackle on top"""
    n = ns(d); t = np.arange(n) / SR
    alt = np.sign(np.sin(TAU * 7.5 * t)); alt = ndimage.uniform_filter1d(alt, ns(0.006))
    f = 118 * (1 + 0.06 * alt) * (1 + 0.01 * smooth_noise(n, r, 9))
    ph = phase(f); y = sum(np.sin(k * ph + k) / k ** 0.7 for k in range(1, 40))
    y = np.tanh(1.6 * y / np.abs(y).max()); y = bp(y, 120, 7000, 1)
    y *= 0.75 + 0.25 * np.sin(TAU * 31 * t)
    cr = crackle(r, d, 70, (2500, 10000), None, 0.6)
    return y * 0.4 + cr
def lamp_on(r, f, g=0.5):  # lamp pops on: switch click + glock ding + short mains fizz
    out = np.zeros(ns(0.9)); c = tick(r, 2800, 0.0015, 1.0); out[:len(c)] += c
    d_ = glock(f, 0.7, r, 0.8); out[ns(0.004):ns(0.004) + len(d_)] += d_ * 0.6
    fz = mains(0.18, r, 120, 4000) / 8 * np.exp(-tt(0.18) / 0.05); out[:len(fz)] += fz * 0.4
    return fades(out * g, 0.0005, 0.05)
def flap(r, d=0.12, g=0.5):  # card / paper flap
    t = tt(d); y = bp(r.standard_normal(len(t)), 700, 5000, 1) * np.exp(-t / 0.02) * (1 - np.exp(-t / 0.002))
    y += lp(r.standard_normal(len(t)), 500) * np.exp(-t / 0.01) * 0.5
    return fades(y * g, 0.0005, 0.02)
def rubbery(r, d=1.1):
    """cable squeezing into the gap: stretchy rubber squeak glide with friction stutter"""
    n = ns(d); t = np.arange(n) / SR; u = t / d
    f = np.interp(u, [0, 0.3, 0.6, 0.85, 1], [260, 420, 380, 560, 700]) * (1 + 0.03 * np.sin(TAU * 9 * t))
    ph = phase(f); y = sum(np.sin(k * ph + 0.5 * k) / k for k in range(1, 14))
    y = peq(bp(y, 200, 5000, 1), 1400, 6, 1.2)
    stut = 0.5 + 0.5 * ndimage.uniform_filter1d((np.sin(phase(np.interp(u, [0, 1], [28, 45]))) > -0.3).astype(float), ns(0.004))
    env = np.sin(np.pi * np.clip(u, 0, 1)) ** 0.5 * stut
    return fades(y / (np.abs(y).max() + 1e-9) * env * 0.4, 0.01, 0.06)
def wood_whack(r, g=1.0):  # elbow on a painted wood jamb: hollow thunk + knock
    y = modal(0.35, [(180, 1.0, 0.06), (410, 0.6, 0.035), (760, 0.35, 0.02), (1350, 0.2, 0.01)], r)
    t = tt(0.35); y += lp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.006) * 0.35
    y += np.sin(phase(np.geomspace(150, 70, len(t)))) * np.exp(-t / 0.07) * 0.7
    return fades(y * g, 0.0005, 0.04)
def scream(r, d, f0s, vowels, scale=1.75, vib=0.06, g=1.0, choke=False):
    """comic squeaky cartoon scream (tiny chipmunk formants, warbly), not a real voice"""
    n = ns(d); t = np.arange(n) / SR
    f0 = np.interp(t, [p[0] for p in f0s], [p[1] for p in f0s]) * (1 + vib * np.sin(TAU * 11 * t + 2 * smooth_noise(n, r, 3)))
    amp = np.minimum(1, t / 0.03) * np.clip((d - t) / (0.02 if choke else 0.08), 0, 1) * (0.85 + 0.15 * np.sin(TAU * 6 * t))
    y = G.vox(f0, G.vowel_track(n, vowels), amp, r, scale, tilt=0.85, breath=0.18, fmax=9000, jitter=0.02)
    y = np.tanh(1.3 * y / (np.abs(y).max() + 1e-9))
    return fades(y * g, 0.004, 0.02)
def laugh(r, base, scale=1.0, n_ha=6, rate=5.2, vowel="a", fall=0.72, breath=0.35, slow=0.06, d_tail=0.25):
    """one synthetic 'ha-ha-ha' laugh: aspirated h + voiced vowel per syllable, pitch falling, slowing down"""
    ts = [0.0]
    for i in range(1, n_ha): ts.append(ts[-1] + (1 / rate) * (1 + slow * i) * r.uniform(0.92, 1.08))
    d = ts[-1] + 1 / rate + d_tail; n = ns(d); t = np.arange(n) / SR
    fpts, apts, hpts = [], [(0, 0.0)], [(0, 0.0)]
    for i, t0 in enumerate(ts):
        L = (1 / rate) * (1 + slow * i); fi = base * np.interp(i, [0, n_ha - 1], [1.35, fall]) * r.uniform(0.95, 1.05)
        fpts += [(t0 + 0.03, fi * 1.04), (t0 + L * 0.7, fi * 0.93)]
        a = 1.0 if i < n_ha - 1 else 0.8
        apts += [(t0 + 0.025, 0.0), (t0 + 0.045, a), (t0 + L * 0.55, a * 0.75), (t0 + L * 0.8, 0.0)]
        hpts += [(t0, 0.0), (t0 + 0.012, 1.0), (t0 + 0.04, 0.3), (t0 + 0.06, 0.0)]
    apts += [(d, 0.0)]; hpts += [(d, 0.0)]
    f0 = np.interp(t, [p[0] for p in fpts], [p[1] for p in fpts])
    amp = np.interp(t, [p[0] for p in apts], [p[1] for p in apts]) * np.interp(t, [0, d], [1, 0.7])
    hh = np.interp(t, [p[0] for p in hpts], [p[1] for p in hpts])
    y = G.vox(f0, G.vowel_track(n, [(0, vowel), (d, vowel)]), amp, r, scale, tilt=1.05, breath=breath, fmax=6000, jitter=0.03)
    y += bp(r.standard_normal(n), 700, 4500, 1) * hh * 0.7
    return fades(y, 0.003, 0.05)
def gramophone(x, r, crack=0.03, lo=320, hi=3200):
    """old-timey: band-limited, slight wow, a few dust crackles"""
    n = x.shape[-1]; y = bp(x, lo, hi, 2); y = peq(y, 1200, 3, 0.8)
    dust = crackle(r, n / SR, 18, (1500, 6000), None, crack)[:n]
    return y + (dust if y.ndim == 1 else dust[None, :])
def kazoo(f, d, r, vel=0.8, vowel="u"):
    """buzzy kazoo lead (inside the arm: the 'electric' march voice)"""
    n = ns(d + 0.04); t = np.arange(n) / SR
    f0 = f * 2 ** ((-40 * np.exp(-t / 0.025) + 14 * np.clip((t - 0.12) / 0.15, 0, 1) * np.sin(TAU * 6 * t)) / 1200)
    amp = np.minimum(1, t / 0.012) * np.clip((d + 0.03 - t) / 0.03, 0, 1)
    y = G.vox(f0, G.vowel_track(n, [(0, vowel), (d, vowel)]), amp, r, 1.1, tilt=0.6, breath=0.08, fmax=8000, jitter=0.01)
    y = np.tanh(2.2 * y / (np.abs(y).max() + 1e-9)) * amp
    return fades(bp(y, 250, 7000, 1) * vel, 0.002, 0.02)
def tack(f, vel=0.6, r=None, dur=0.6):
    """old-timey tack piano: two slightly mistuned bright strings + hammer tack"""
    y = pluck(f * 2 ** (6 / 1200), vel, r, dur, 0.9, 0.12) + pluck(f * 2 ** (-6 / 1200), vel, r, dur, 0.85, 0.13)
    t = tt(dur); y += hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.0015) * 0.35 * vel
    return fades(y * 0.5, 0.0005, 0.05)
def tom(r, f=120, g=0.8):
    y = modal(0.5, [(f, 1.0, 0.18), (f * 1.5, 0.4, 0.09), (f * 2.1, 0.2, 0.05)], r, glide=0.06, glide_tau=0.04)
    t = tt(0.5); y += lp(r.standard_normal(len(t)), 1500) * np.exp(-t / 0.006) * 0.4
    return fades(y * g, 0.0005, 0.05)
def rev_cymbal(r, d=1.2):
    c = cymbal(0.9, r, d + 0.3, 1.2)[: ns(d)]; c = c[::-1].copy(); u = np.linspace(0, 1, len(c)); c *= u ** 1.5
    return fades(c, 0.02, 0.004)

# ======================= MUSIC =======================
# A+B) the MARCH: 2/4, 13 bars (26 beats) from the BONK to the door-frame shadow (~132 bpm)
BM = (T_SHADOW - T_WHACK) / 26; E8 = BM / 2
CHM = {"C": (36, [60, 64, 67]), "F": (41, [60, 65, 69]), "G7": (43, [59, 62, 65]), "G": (43, [59, 62, 67])}
PROG_M = ["C", "C", "G7", "C", "C", "F", "G7", "C", "F", "C", "G7", "C", "G7"]
MEL_M = [  # (bar, eighth, midi, len8)
    (0, 0, 67, 1), (0, 1, 72, 1), (0, 2, 76, 1), (0, 3, 79, 1), (1, 0, 76, 2), (1, 2, 72, 2),
    (2, 0, 74, 1), (2, 1, 77, 1), (2, 2, 71, 1), (2, 3, 74, 1), (3, 0, 72, 2), (3, 3, 67, 1),
    (4, 0, 72, 1), (4, 1, 76, 1), (4, 2, 79, 1), (4, 3, 81, 1), (5, 0, 81, 2), (5, 2, 77, 2),
    (6, 0, 79, 1), (6, 1, 77, 1), (6, 2, 74, 1), (6, 3, 71, 1), (7, 0, 72, 1), (7, 1, 76, 1), (7, 2, 72, 2),
    (8, 0, 81, 1), (8, 1, 81, 1), (8, 2, 79, 1), (8, 3, 77, 1), (9, 0, 76, 2), (9, 2, 79, 2),
    (10, 0, 77, 1), (10, 1, 76, 1), (10, 2, 74, 1), (10, 3, 71, 1), (11, 0, 72, 2), (11, 2, 67, 1), (11, 3, 72, 1),
    (12, 0, 67, 1), (12, 1, 71, 1), (12, 2, 74, 1), (12, 3, 77, 1)]
T_ARM = T_DIVE1 - 0.1  # lead swaps to kazoo once we are inside the arm
mA = bus()
for bar, cn in enumerate(PROG_M):
    rt, ch = CHM[cn]; tb = T_WHACK + bar * 2 * BM
    for b in range(2):
        tq = tb + b * BM
        M(brass(m2f(rt + (0 if b == 0 else 7) - (0 if b == 0 else 12)), BM * 0.45, 0.85, r_(), "tuba", scoop=-18, rel=0.06), tq, 0.5, 0, mA)
        for i, m in enumerate(ch): M(brass(m2f(m), E8 * 0.4, 0.6, r_(), "stab", scoop=-10, rel=0.04), tq + E8 + 0.003 * i, 0.09, -0.35 + 0.35 * i, mA)
        M(bassdrum(r_(), 0.8 if b == 0 else 0.55), tq, 0.45, 0, mA)
        for j in range(2): M(snare(0.55 if j == 0 and b == 1 else 0.3, r_(), 0.2), tq + j * E8, 0.22, 0.15, mA)
        if b == 1 and bar % 2 == 1: M(snare(0.25, r_(), 0.12), tq + 1.5 * E8, 0.18, 0.15, mA)
    if bar % 4 == 0: M(cymbal(0.45, r_(), 1.0, 0.9), tb, 0.12, -0.3, mA)
for bar, k, m, ln in MEL_M:
    tn = T_WHACK + bar * 2 * BM + k * E8; dn = ln * E8
    if tn < T_ARM:
        M(glock(m2f(m + 12), 0.6, r_(), 0.9), tn, 0.16, 0.2); M(fife(m2f(m + 12), dn * 0.7, 0.6, r_()), tn, 0.1, -0.15, mA)
    else:
        M(kazoo(m2f(m), dn * 0.8, r_(), 0.8, "u" if (bar + k) % 2 else "er"), tn, 0.2, -0.1, mA)
        if k == 0: M(glock(m2f(m + 12), 0.4, r_(), 0.6), tn, 0.06, 0.25, mA)
# dive flourish: glock gliss down into the window
for i, m in enumerate([96, 93, 91, 88, 84, 81, 79, 76]): M(glock(m2f(m), 0.45, r_(), 0.5), T_DIVE0 + i * 0.045, 0.09, 0.4 - 0.1 * i, mA)
# squeeze: the band squeezes too (tuba chromatic squeeze-up)
for i, m in enumerate([31, 32, 33, 34, 35]): M(brass(m2f(m + 12), 0.12, 0.6, r_(), "tuba", scoop=-30), T_SQZ0 + 0.05 + i * 0.2, 0.18, 0, mA)
mus += mA * mask([(0, T_SHADOW - 0.01)], 0.01)[None, :]
# shadow: music stops, "uh-oh" timpani roll + low brass swell into the SLAM
for tr, vr in [(T_SHADOW + i / 22, 0.15 + 0.45 * (i / 8) ** 1.3) for i in range(int((T_SLAM - T_SHADOW) * 22) - 1)]: M(timpani(m2f(31), vr, r_(), 0.5), tr, 0.3)
M(brass(m2f(31), T_SLAM - T_SHADOW - 0.02, 0.6, r_(), "soft", scoop=-40, rel=0.02), T_SHADOW, 0.25)
# after the SLAM: dazed wobble + spark riser to the cut (chromatic tuba climb + snare roll + reverse cymbal)
M(pad([m2f(m) for m in (43, 49, 55)], 1.0, 0.25, r_(), att=0.05, rel=0.3, warm=900, detune=25), T_SLAM + 0.05, 0.6)
for i, m in enumerate(range(31, 31 + 12)):
    tq = T_SLAM + 0.7 + i * (T_ZAP - T_SLAM - 0.75) / 12
    M(brass(m2f(m + 12), 0.1, 0.5 + 0.04 * i, r_(), "tuba", scoop=-15), tq, 0.2 + 0.015 * i)
for i, tr in enumerate(np.arange(T_ZAP - 1.2, T_ZAP - 0.03, 1 / 24)): M(snare(0.15 + 0.5 * (i / 28) ** 1.4, r_(), 0.12), tr, 0.22, 0.1)
M(rev_cymbal(r_(), 1.3), T_ZAP - 1.3, 0.22, 0.2)
d = T_ZAP - T_SPK0; t = tt(d); u = t / d
M(fades(np.sin(phase(np.geomspace(200, 1800, len(t)))) * u ** 2 * 0.08, 0.05, 0.003), T_SPK0, 1.0)

# D) the SURGE galop: 2/4 ~160 bpm, 6 bars (12 beats) from the dissolve to "fine"
T_G0 = T_LIT0; BG = (at("fine") - T_G0) / 12; EG = BG / 2
gG = bus()
PROG_G = ["C", "G7", "C", "G7", "F", "G7"]
MEL_G = [(0, 0, 72, 1), (0, 1, 76, 1), (0, 2, 79, 1), (0, 3, 84, 1), (1, 0, 83, 1), (1, 1, 79, 1), (1, 2, 77, 1), (1, 3, 74, 1),
         (2, 0, 76, 1), (2, 1, 79, 1), (2, 2, 84, 1), (2, 3, 88, 1), (3, 0, 86, 2), (3, 2, 83, 2)]
for bar, cn in enumerate(PROG_G):
    rt, ch = CHM[cn]; tb = T_G0 + bar * 2 * BG; soft = bar >= 4
    for b in range(2):
        tq = tb + b * BG
        if not soft:
            M(brass(m2f(rt + (0 if b == 0 else -5)), BG * 0.4, 0.9, r_(), "tuba", scoop=-15, rel=0.05), tq, 0.5, 0, gG)
            for i, m in enumerate(ch): M(brass(m2f(m + 12), EG * 0.4, 0.7, r_(), "stab", scoop=-8, rel=0.03), tq + EG + 0.003 * i, 0.08, -0.35 + 0.35 * i, gG)
            M(bassdrum(r_(), 0.8), tq, 0.45, 0, gG)
            for j in range(4): M(snare(0.5 if j == 2 else 0.25, r_(), 0.15), tq + j * EG / 2, 0.18, 0.15, gG)
    if bar % 2 == 0 and not soft: M(cymbal(0.5, r_(), 1.0, 1.0), tb, 0.12, 0.3, gG)
for bar, k, m, ln in MEL_G:
    tn = T_G0 + bar * 2 * BG + k * EG
    M(fife(m2f(m), ln * EG * 0.7, 0.7, r_()), tn, 0.11, -0.15, gG); M(glock(m2f(m + 12), 0.5, r_(), 0.6), tn, 0.08, 0.2, gG)
# scream stop-time: band hits with the scream then holds a trill
T_ST1 = T_G0 + 8 * BG  # bars 4-5: deflation from here
for i, m in enumerate([72, 76, 79]): M(brass(m2f(m), 0.2, 0.9, r_(), "stab", scoop=-30, rel=0.05), T_SCR + 0.004 * i, 0.12, -0.3 + 0.3 * i, gG)
M(cymbal(0.6, r_(), 1.2, 1.1), T_SCR, 0.12, 0, gG)
# deflate: chromatic tuba walk-down "even though your pinky is totally fine", then a sheepish button on "fine"
for i, m in enumerate([43, 42, 41, 40, 39, 38, 37, 36]):
    M(brass(m2f(m), EG * 0.7, 0.55, r_(), "tuba", scoop=-25, rel=0.05), T_ST1 + i * EG * 1.0, 0.4, 0, gG)
    M(pluck(m2f(m + 24), 0.4, r_(), 0.3, 0.5), T_ST1 + i * EG, 0.25, 0.2, gG)
gG_m = mask([(T_G0 - 0.05, at("fine") + 0.02)], 0.02)
mus += gG * gG_m[None, :]
M(pluck(m2f(48), 0.6, r_(), 0.5, 0.4), at("fine") + 0.02, 0.4); M(glock(m2f(84), 0.4, r_(), 0.8), at("fine") + 0.02, 0.1)
M(pluck(m2f(43), 0.55, r_(), 0.5, 0.4), at("fine") + 0.02 + 0.22, 0.35); M(glock(m2f(79), 0.35, r_(), 0.8), at("fine") + 0.24, 0.08)
# rise into the glow: soft shimmering pad up to the museum
M(pad([m2f(m) for m in (60, 67, 72, 76)], 0.8, 0.25, r_(), att=0.6, rel=0.5, warm=2500, detune=9), T_RISE0, 0.5)

# E) THE TURN on "Now": dusty sneaky pizzicato tiptoe in D minor (4/4, 12 beats "Now" -> "Humerus...")
BE = (T_HUSH - T_NOW) / 12; EE = BE / 2; TE0 = T_NOW - 0.02
gE = bus()
PROG_E = [("Dm", 38, [62, 65, 69]), ("Dm", 38, [62, 65, 69]), ("Gm", 43, [62, 67, 70]), ("A7", 45, [61, 64, 67])]
TIP = [(0, 74), (1, 73), (2, 74), (3, 77), (4, 76), (5, 75), (6, 76), (7, 81)]  # tiptoe 8ths per bar (chromatic neighbours)
for bi in range(3):
    tb = TE0 + bi * 4 * BE
    for b in range(4):
        tq = tb + b * BE; cn, rt, ch = PROG_E[min(3, bi + (b >= 2) * (bi == 2))]
        M(pluck(m2f(rt - 12 + (0 if b % 2 == 0 else 7)), 0.75, r_(), 0.5, 0.3), tq, 0.55, 0, gE)
        M(woodblock(r_(), 1500 if b % 2 == 0 else 1100, 0.5, 0.1), tq, 0.25, 0.35 if b % 2 == 0 else -0.35, gE)
        if b % 2 == 1:
            for i, m in enumerate(ch): M(pluck(m2f(m), 0.35, r_(), 0.25, 0.6), tq + 0.004 * i, 0.15, -0.3 + 0.3 * i, gE)
    for k, m in TIP:
        if bi == 1 and k >= 6: continue
        M(pluck(m2f(m + (0 if bi != 2 else -2)), 0.5, r_(), 0.25, 0.7), tb + k * EE + (0.07 * EE if k % 2 else 0), 0.17, 0.25, gE)
    M(brass(m2f(50 if bi < 2 else 45), 4 * BE * 0.9, 0.35, r_(), "soft", scoop=-30, rel=0.3), tb, 0.18, -0.2, gE)  # bassoon-ish pedal
    M(vibes(m2f(74 + 12 * (bi == 2)), 0.35, r_(), 1.5, trem=4.5, trem_depth=0.35), tb, 0.12, 0.3, gE)
# "probably a pun": sly little bassoon smirk
for i, m in enumerate([57, 60, 62]): M(brass(m2f(m), 0.14, 0.5, r_(), "soft", scoop=-35, rel=0.05), at("pun") + 0.45 + i * 0.13, 0.25, -0.15, gE)
gE_m = mask([(TE0, T_HUSH + 0.05)], 0.04)
mus += gE * gE_m[None, :] * 1.7
# HUSH on "Humerus...": everything drops to a lone low pedal + soft snare roll swelling to the label flip
M(pad([m2f(38), m2f(45)], T_FLIP - T_HUSH, 0.25, r_(), att=0.4, rel=0.15, warm=500, detune=5), T_HUSH, 0.6)
for i, tr in enumerate(np.arange(T_HUSH + 0.5, T_FLIP - 0.03, 1 / 22)): M(snare(0.08 + 0.35 * (i / 16) ** 1.5, r_(), 0.12), tr, 0.18, 0.05)

# F) after the rimshot: old-timey vaudeville tack-piano rag in C (8 beats) to the portal
TF0 = T_RIM + 0.62; BF = (T_PORT0 + 0.1 - TF0) / 7; EF = BF / 2
gF = bus()
PROG_F = ["C", "C", "A7", "A7", "D7", "G7", "C"]
CHF = {"C": (36, [64, 67, 72]), "A7": (33, [61, 64, 67]), "D7": (38, [62, 66, 72]), "G7": (31, [62, 65, 71])}
RAG = [(0, 76), (1, 75), (2, 76), (3, 79), (4, 76), (5, 75), (6, 76), (7, 81), (8, 79), (9, 78), (10, 79), (11, 82),
       (12, 81), (13, 79), (14, 78), (15, 74), (16, 79), (17, 77), (18, 74), (19, 71), (20, 72), (22, 79), (23, 72)]
for b, cn in enumerate(PROG_F):
    rt, ch = CHF[cn]; tq = TF0 + b * BF
    M(tack(m2f(rt), 0.7, r_(), 0.4), tq, 0.4, -0.2, gF)
    for i, m in enumerate(ch): M(tack(m2f(m - 12), 0.45, r_(), 0.25), tq + EF + 0.004 * i, 0.22, -0.1 + 0.1 * i, gF)
    M(brush(0.6, r_(), 0.25), tq + EF, 0.3, 0.25, gF); M(woodblock(r_(), 2200, 0.25, 0.06), tq, 0.15, 0.4, gF)
for k, m in RAG: M(tack(m2f(m), 0.55, r_(), 0.35), TF0 + k * (BF / 4) * 1.0 + (0.08 * BF / 4 if k % 2 else 0), 0.24, 0.2, gF)
gF = gramophone(gF, r_(), 0.02, 180, 5500)
gF_m = mask([(TF0 - 0.02, T_PORT1)], 0.02) * np.interp(np.arange(N) / SR, [0, T_PORT0, T_PORT1, DUR], [1, 1, 0, 0])
mus += gF * gF_m[None, :] * 1.9
# portal: dreamy glock gliss up + shimmer into the hallway
for i, m in enumerate([72, 76, 79, 84, 88, 91, 96, 100]): M(glock(m2f(m), 0.4, r_(), 0.7), T_PORT0 + i * 0.05, 0.08, -0.4 + 0.1 * i)
M(pad([m2f(m) for m in (72, 79, 84)], 0.35, 0.2, r_(), att=0.2, rel=0.3, warm=3000, detune=12), T_PORT0, 0.4)

# G) deadpan END: silence under "It's still not funny." then one flat BOMP sting + a tiny ting
H(brass(m2f(36), 0.22, 0.9, r_(), "tuba", scoop=-12, rel=0.05), T_STING, 0.5, 0, name="deadpan STING (flat BOMP)")
H(brass(m2f(48), 0.22, 0.8, r_(), "horn", scoop=-12, rel=0.05), T_STING + 0.003, 0.2, -0.2)
H(bassdrum(r_(), 0.8), T_STING, 0.4); H(triangle(0.3, r_(), 0.9), T_STING + 0.45, 0.25, 0.3)

ROOM = make_ir(0.9, 41, hf=1.4)
mus = mus + 0.12 * convolve_st(mus, ROOM)
# the ONE hard cut: music fully out from the cut through the zap hold (5 ms ramps; no clicks)
cutm = 1 - mask([(T_ZAP - 0.005, T_ZAPEND)], 0.005)
mus *= cutm[None, :]

# ======================= HIT BUS (the big physical gags) =======================
H(wood_whack(r_(), 1.0), T_WHACK, 2.0, -0.2, "WHACK 1: elbow BONK on jamb")
H(zing(r_(), 2700, 0.4), T_WHACK + 0.02, 0.4, -0.2)
sl = bus()
P(sl, thump(r_(), 160, 38, 1.0, 0.8, 0.2), 0, 1.0); P(sl, kick(r_(), 1.0), 0, 0.9); P(sl, wood_whack(r_(), 0.9), 0, 0.6)
P(sl, timpani(m2f(31), 1.0, r_(), 1.5), 0, 0.6); P(sl, cymbal(0.6, r_(), 1.2, 0.7), 0.005, 0.15)
SLAMIR = make_ir(1.4, 66, hf=0.9)
H(sl * 0.8 + 0.5 * convolve_st(sl, SLAMIR), T_SLAM, 1.0, 0, "WHACK 2: door-frame SLAM (thud + kick)")
z = big_zap(r_(), 1.0); zs = widen(z, r_(), 9, 0.7)
H(zs, T_ZAP, 1.0, 0, "ZAP SURGE (hard cut)")
for i, m in enumerate([36, 48, 55, 60, 64]): H(brass(m2f(m), 0.18, 1.0, r_(), "stab", scoop=-40, rel=0.08, fall=-2), T_ZAP + 0.002 * i, 0.12, -0.4 + 0.2 * i)
# rimshot: ba (rim + snare), dum (tom + kick), tss (crash) - the tss lands just after "humorous" ends
T_BA, T_DUM, T_TSS = T_RIM, T_RIM + 0.22, at("humorous") + 0.66
H(snare(0.8, r_(), 0.3) + 0, T_BA, 0.35, 0.1, "rimshot BA"); H(snap(r_(), 0.6), T_BA, 0.3, 0.1)
H(tom(r_(), 105, 0.9), T_DUM, 0.5, -0.1, "rimshot DUM"); H(kick(r_(), 0.7), T_DUM, 0.35)
H(cymbal(0.9, r_(), 1.6, 1.3), T_TSS, 0.3, 0.2, "rimshot TSS")
H(wood_whack(r_(), 0.9), T_BONK, 1.3, 0.6, "offscreen BONK")
zz = zap(r_(), 0.32); H(lp(zz, 7000), T_ZZT, 1.0, 0.6, "zzt")
HALLIR = make_ir(1.0, 53, hf=1.2, early=[(0.02, 0.3, -0.5), (0.04, 0.25, 0.5)])
hit = hit + 0.25 * convolve_st(hit, HALLIR)
hc = 0.3 * np.abs(hit).max(); hit = hc * np.tanh(hit / hc)  # soft-clip only the transient tips

# ======================= SFX =======================
HALLROOM = make_ir(0.7, 47, hf=1.4)
# hallway room tone (shot 1, end) + birds-ish morning air
tone = st(lp(colored(N, r_(), 1.2), 1800) * 0.1)
S(tone * mask([(0, T_DIVE1), (T_ZAP, T_ZAPEND), (T_PORT0 + 0.2, DUR)], 0.15)[None, :], 0, 0.25, name="hall room tone")
S(flap(r_(), 0.18, 0.9), T_SOCK, 0.5, 0.15, "sock flop on head")
S(thump(r_(), 200, 120, 0.3, 0.15, 0.03), T_SOCK, 0.3, 0.15)
S(G.whoosh(0.35, r_(), 0.2, 600, 5000, tail=0.1, air=0.4), T_XRAY - 0.2, 0.4, -0.2, "x-ray window whoosh")
S(glock(m2f(88), 0.7, r_(), 1.2), T_XRAY, 0.25, -0.2); S(glock(m2f(95), 0.5, r_(), 1.0), T_XRAY + 0.06, 0.12, -0.2)
S(G.whoosh(T_DIVE1 - T_DIVE0 + 0.2, r_(), 0.55, 200, 3500, tail=0.15, air=0.3), T_DIVE0, 0.7, 0, "dive whoosh")
S(blip(1200, 200, 0.6, 0.1, harm=0.3), T_DIVE0 + 0.05, 0.4)
# inside the arm: fleshy cavern bed + the nerve cable hum (switches on at the neck substation)
cav = st(lp(colored(N, r_(), 1.6), 260) * 0.3) * mask([(T_DIVE1 - 0.1, T_ZAP), (T_ZAPEND, T_RISE1)], 0.3)[None, :]
S(cav * (cutm[None, :]), 0, 0.3, name="arm cavern bed")
humd = T_ZAP - T_HUM; hum = mains(humd, r_(), 60, 2500) / 8
hum = hum * np.interp(tt(humd), [0, 0.04, 0.5, humd - 2.5, humd], [0, 1.0, 0.55, 0.55, 1.2])
S(fades(lp(hum, 1800), 0.004, 0.005), T_HUM, 0.25, -0.1, "neck substation hums on")
S(lamp_on(r_(), m2f(76), 0.6), T_HUM, 0.5, -0.4)
S(rubbery(r_(), T_SQZ1 - T_SQZ0), T_SQZ0, 0.6, 0.0, "cable squeezing (rubber squeak)")
for i, ts in enumerate([T_SQZ0 + 0.25, T_SQZ0 + 0.65]): S(squeak(r_(), 700 + 150 * i, 1200 + 200 * i, 0.18, 0.3), ts, 0.35, 0.2)
S(flap(r_(), 0.12, 0.8), T_SIGN, 0.55, 0.3, "sign flip-up (card flap)"); S(flap(r_(), 0.08, 0.5), T_SIGN + 0.05, 0.35, 0.3)
S(ringmod_rumble(r_(), T_SLAM - T_SHADOW + 0.15, 40, 18) * np.interp(tt(T_SLAM - T_SHADOW + 0.15), [0, T_SLAM - T_SHADOW, T_SLAM - T_SHADOW + 0.15], [0.2, 1, 0]), T_SHADOW, 0.25, 0, "door-frame shadow rumble")
S(G.whoosh(0.4, r_(), 0.32, 150, 1500, tail=0.02, air=0.2), T_SLAM - 0.38, 0.5, 0)
S(crackle(r_(), T_ZAP - T_SPK0, 55, (2000, 9500), [(0, 0.15), (0.7, 0.6), (1, 1.0)], 0.7), T_SPK0, 0.55, 0.1, "sparks crackle building")
for i, tz in enumerate(np.linspace(T_SPK0 + 0.2, T_ZAP - 0.12, 5)): S(zap(r_(), 0.18 + 0.04 * i), tz, 0.15 + 0.06 * i, -0.4 + 0.2 * i)
# zap hold: the electrocuted buzz (meme face) through 458, fades through the dissolve
mb = meme_buzz(r_(), T_ZAPEND - T_ZAP + 0.3); mb *= np.interp(tt(T_ZAPEND - T_ZAP + 0.3), [0, 0.05, T_ZAPEND - T_ZAP - 0.1, T_ZAPEND - T_ZAP + 0.3], [0, 1, 0.8, 0])
S(widen(fades(mb, 0.003, 0.02), r_(), 7, 0.6), T_ZAP + 0.02, 0.5, 0, "electrocuted BZZZT hold")
# the whole line lights up: rising zing + lamp dings racing L -> R
d = T_LIT1 - T_LIT0 + 0.2; t = tt(d); u = t / d
zg = np.sin(phase(np.geomspace(300, 2600, len(t)) * (1 + 0.01 * np.sin(TAU * 30 * t)))) * u ** 0.8 + 0.3 * mains(d, r_(), 120, 3000) / 8 * u
S(panc(fades(zg * 0.15, 0.05, 0.08), np.interp(u, [0, 1], [-0.8, 0.8])), T_LIT0, 1.0, name="whole line lights up: rising zing")
for i, tl in enumerate(np.linspace(T_LIT0 + 0.08, T_LIT1, 9)):
    S(lamp_on(r_(), m2f([72, 74, 76, 77, 79, 81, 83, 84, 88][i]), 0.5), tl, 0.4, -0.8 + 0.2 * i, "lamp dings in sequence" if i == 0 else None)
S(mains(T_RISE1 - T_LIT1, r_(), 60, 2000) / 10 * fades(np.ones(ns(T_RISE1 - T_LIT1)), 0.3, 0.5), T_LIT1, 0.12, 0)
S(G.whoosh(T_RIDE1 - T_RIDE0 + 0.2, r_(), 0.6, 250, 4500, width=0.9, tail=0.15, air=0.35), T_RIDE0, 0.6, 0, "ride whoosh through the arch")
# SCREAMS (comic squeaky)
S(scream(r_(), T_SCREND - T_SCR, [(0, 640), (0.15, 900), (0.6, 980), (0.8, 1080)], [(0, "A"), (0.2, "a"), (0.8, "ae")], 1.8, 0.07, 1.0),
  T_SCR, 0.85, 0.25, "PINKY scream AAAA!")
S(scream(r_(), 0.36, [(0, 470), (0.12, 640), (0.36, 560)], [(0, "a"), (0.2, "A"), (0.36, "U")], 1.6, 0.05, 1.0, choke=True),
  T_SCR2, 0.6, -0.3, "RING half-scream")
S(blip(700, 1400, 0.08, 0.3), T_SCR2 + 0.36, 0.25, -0.3)  # 'eep!' choke
# band-aid slap + pat pat
S(snap(r_(), 0.9), T_BAND, 0.55, 0.2, "band-aid slap"); S(flap(r_(), 0.08, 0.6), T_BAND + 0.005, 0.4, 0.2)
for i, tp in enumerate([T_BAND + 0.28, T_BAND + 0.46]): S(thump(r_(), 300, 180, 0.4, 0.1, 0.02) + 0, tp, 0.35, 0.2, "pat pat" if i == 0 else None)
S(G.whoosh(T_RISE1 - T_RISE0 + 0.2, r_(), 0.6, 300, 6000, width=0.9, tail=0.2, air=0.6), T_RISE0, 0.45, 0, "rise + dissolve whoosh")
sfx_main = sfx + 0.12 * convolve_st(sfx, HALLROOM)
sfx = bus()
# MUSEUM: dusty room tone + distant slow clock + creaks
MUSIR = make_ir(1.8, 71, hf=1.1, early=[(0.03, 0.3, -0.6), (0.06, 0.25, 0.6)])
mt = st(bp(colored(N, r_(), 1.0), 80, 2500) * 0.12) * mask([(T_MUSEUM, T_PORT1)], 0.4)[None, :]
S(mt, 0, 0.3, name="museum room tone")
for i, tq in enumerate(np.arange(T_MUSEUM + 0.3, T_PORT0, 1.0)): S(woodblock(r_(), 1900 if i % 2 == 0 else 1500, 0.4, 0.08), tq, 0.08, -0.6)
S(G.creak(0.5, r_(), 60, 90, rough=0.15) * 0.4, T_NOW + 1.6, 0.25, 0.5, "parquet creak")
for i in range(2): S(woodblock(r_(), 620, 0.9, 0.12) + 0, T_TOK + i * 0.16, 0.45, -0.1, "SKELLY humerus tok tok" if i == 0 else None)
# label flip: split-flap clatter -> CLACK
for i in range(9): S(tick(r_(), 2600 + 150 * i, 0.002, 0.8), T_FLIP - 0.14 + i * 0.016, 0.35, 0)
S(woodblock(r_(), 1800, 0.9, 0.1), T_FLIP, 0.6, 0, "LABEL FLIP clack"); S(flap(r_(), 0.06, 0.6), T_FLIP, 0.4)
S(G.whoosh(0.25, r_(), 0.05, 1500, 7000, tail=0.1, air=0.6) * 0.5, T_FLIP + 0.02, 0.3)  # spotlight 'thunk' air
S(thump(r_(), 120, 70, 0.5, 0.3, 0.06), T_FLIP + 0.05, 0.3, 0, "spotlight clunk")
# laugh track (synth crowd) after the rimshot, swelling again with the portraits
def crowd(r, d, people=12, env=None):
    out = np.zeros((2, ns(d) + ns(1.5)))
    for p in range(people):
        lg = laugh(r, float(r.uniform(110, 260)), float(r.uniform(0.95, 1.25)), int(r.integers(4, 8)), float(r.uniform(4.5, 6.5)),
                   ["a", "A", "ae", "E", "o"][int(r.integers(5))], float(r.uniform(0.65, 0.85)))
        k = ns(float(r.uniform(0, 0.35))); seg = pan(lg, float(r.uniform(-0.85, 0.85)))
        out[:, k:k + seg.shape[1]] += seg[:, : out.shape[1] - k] * float(r.uniform(0.5, 1.0))
    return out
lt = crowd(r_(), 1.2, 14); lt = gramophone(lt, r_(), 0.015, 250, 4000)
S(lt + 0.3 * convolve_st(lt, make_ir(1.2, 13, hf=1.3)), T_TSS + 0.05, 0.085, name="laugh track (old-timey crowd)")
lt2 = crowd(r_(), 1.2, 12); lt2 = gramophone(lt2, r_(), 0.015, 250, 4000)
S(lt2 + 0.3 * convolve_st(lt2, make_ir(1.2, 14, hf=1.3)), T_LAUGH[0] + 0.25, 0.04)
# portrait laughs: 1840 dusty guffaw, then 1900 / 1950 / 2026-row in turn
L1840 = gramophone(laugh(r_(), 105, 0.92, 7, 4.4, "o", 0.7, 0.4, 0.08), r_(), 0.06, 300, 2800)
S(L1840, T_LAUGH[0], 0.3, -0.45, "1840 portrait dusty GUFFAW")
S(gramophone(laugh(r_(), 230, 1.15, 6, 6.5, "E", 0.8, 0.3), r_(), 0.04, 350, 3400), T_LAUGH[1], 0.18, -0.25, "1900 portrait titter")
S(gramophone(laugh(r_(), 150, 1.0, 5, 5.0, "a", 0.75, 0.3), r_(), 0.02, 250, 4500), T_LAUGH[2], 0.18, -0.05, "1950 portrait ha-ha")
S(laugh(r_(), 175, 1.05, 4, 5.5, "ae", 0.8, 0.3), T_LAUGH[3], 0.16, 0.15, "next portrait chuckle")
S(G.whoosh(T_PORT1 - T_PORT0 + 0.25, r_(), 0.6, 200, 5000, width=0.9, tail=0.2, air=0.4), T_PORT0, 0.35, 0, "portal whoosh")
sfx_mus = sfx + 0.2 * convolve_st(sfx, MUSIR)
sfx = sfx_main + sfx_mus

# ======================= MIX =======================
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(ndimage.maximum_filter1d(duck, ns(0.25)), ns(0.12))
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0; MUS_T = float(os.environ.get("MUS_T", -19.0)); SFX_T = float(os.environ.get("SFX_T", -23.0)); HIT_T = float(os.environ.get("HIT_T", -9.0))
v = to_lufs(v, V_T)
m = to_lufs(mus, MUS_T) * 10 ** ((-7.0 * duck) / 20)
s = to_lufs(sfx, SFX_T) * 10 ** ((-2.5 * duck) / 20)
hm = hit * 10 ** ((HIT_T - float(momentary(hit, 0.05).max())) / 20) * 10 ** ((-3.0 * duck) / 20)
raw = hp(v + m + s + hm, 25)
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
mix = fades(mix, 0.002, 0.08)
assert mix.shape[1] == N
write_wav(os.path.join(HERE, "mix.wav"), mix)
for nm, x in [("voice", v), ("music", m), ("sfx", s), ("hit", hm)]: write_wav(os.path.join(HERE, f"stem_{nm}.wav"), x * 10 ** (gain / 20), 16)
print("mix LUFS", round(integrated(mix), 2), "TP", round(true_peak(mix), 2), "len", mix.shape[1], mix.shape[1] / SR, "gain", round(gain, 2))
pre = raw * 10 ** (gain / 20); e1 = ndimage.maximum_filter1d(np.abs(mix).max(0), ns(0.01)); e0 = ndimage.maximum_filter1d(np.abs(pre).max(0), ns(0.01))
gr_ = 20 * np.log10((e1 + 1e-9) / (e0 + 1e-9)); gr_[e0 < 0.05] = 0; gr_[-ns(0.1):] = 0; k = int(np.argmin(gr_)); print("max limiter GR dB", round(float(gr_[k]), 2), "at", round(k / SR, 2))
for nm, x in [("music", m), ("sfx", s), ("hit", hm)]:
    mm = momentary(x * 10 ** (gain / 20), 0.1); print(nm, "max momentary", round(float(np.max(mm)), 1))
for t_, nm in sorted(EV): print(f"{t_:6.2f}  f{t_ * FPS:6.1f}  {nm}")
