# Sound for "Wrong Address" (why ice cream gives you brain freeze), 35.5 s.
# Music (all own synthesis): a bouncy swung ice-cream-truck jingle (glockenspiel / music-box lead, plucky oom-pah bass,
# light swing kit) under shots 1-3; a mysterious tick-tock minor groove from "Now the weird part" that builds through the
# gym experiment (pizz 8ths, hats, kick, snare roll, reverse cymbal + riser); a big ICY freeze hit on "Twice" (crystal
# shatter, sub drop, icy cluster) followed by a hard stop; a warm cosy dusk reprise (vibes + music box) that hangs on a
# G7 fermata and is cut by "Nah." (cone gulp -> ice CRACK -> tiny sad ding), tail to 35.5 s.
# Every cue is keyed off words.json (at("word", n)), mirroring the W table in src/videos/freeze/story.ts.
import json, os
import numpy as np
from scipy import ndimage, signal
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, peq, reson, colored, smooth_noise, fades, pan, st, place, integrated,
                 read_wav, write_wav, phase, shape, make_ir, convolve_st, true_peak, momentary, modal, impulse_train)
from instruments import m2f, glock, vibes, musicbox, triangle, pluck, pad, cymbal, timpani, snare, brush
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1065
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(20261127)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
mus = np.zeros((2, N)); hit = np.zeros((2, N)); sfx = np.zeros((2, N)); EV = []
def M(x, t, g=1.0, p=0.0, buf=None): place(mus if buf is None else buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def H(x, t, g=1.0, p=0.0): M(x, t, g, p, hit)
def S(x, t, g=1.0, p=0.0, name=None):
    place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
    if name: EV.append((t, name))
def mask(spans, sm=0.3):
    m = np.zeros(N)
    for a, b in spans: m[ns(a):ns(b)] = 1
    return ndimage.uniform_filter1d(m, max(1, ns(sm)))

T_WEIRD, T_TWICE, T_FIX, T_NAH = at("now"), at("twice"), at("fix"), at("nah")

# ---------------- small instruments / sfx atoms ----------------
def tick(r, f=3000, tau=0.004, g=0.4): t = tt(0.03); return fades(bp(r.standard_normal(len(t)), f, min(f * 3, 20000), 1) * np.exp(-t / tau) * g, 0.0005, 0.005)
def woodblock(r, f=1100, g=0.5, d=0.15):
    y = modal(d, [(f, 1.0, 0.025), (f * 2.7, 0.35, 0.012), (f * 4.1, 0.15, 0.006)], r)
    t = tt(d); y += bp(r.standard_normal(len(t)), 1500, 6000, 1) * np.exp(-t / 0.0015) * 0.4
    return fades(y * g, 0.0003, 0.02)
def kick(r, g=1.0): t = tt(0.4); return fades(np.sin(phase(np.geomspace(130, 45, len(t)))) * np.exp(-t / 0.11) * g + lp(r.standard_normal(len(t)), 1200) * np.exp(-t / 0.005) * 0.12 * g, 0.0005, 0.05)
def hat(r, g=0.2, d=0.06, tau=0.012): t = tt(d); return fades(hp(r.standard_normal(len(t)), 7500) * np.exp(-t / tau) * g, 0.0005, 0.01)
def shaker(r, g=0.2): t = tt(0.09); e = (1 - np.exp(-t / 0.008)) * np.exp(-t / 0.025); return fades(bp(r.standard_normal(len(t)), 4500, 12000, 1) * e * g, 0.001, 0.01)
def snap(r, g=0.4):  # finger-snap / rim click
    t = tt(0.12); y = bp(r.standard_normal(len(t)), 1800, 5000, 2) * np.exp(-t / 0.018) + np.sin(TAU * 1650 * t) * np.exp(-t / 0.012) * 0.3
    return fades(y * g, 0.0005, 0.02)
def blip(f0, f1, d=0.15, g=0.3, vib=0.0, harm=0.0):
    t = tt(d); f = np.geomspace(f0, f1, len(t)) * (1 + vib * np.sin(TAU * 7 * t)); ph = phase(f)
    return fades((np.sin(ph) + harm * np.sin(2 * ph) + harm * 0.5 * np.sin(3 * ph)) * g * np.minimum(1, t / 0.008), 0.003, 0.04)
def boing(f=320, d=0.45, depth=0.35, rate=13):
    t = tt(d); fr = f * (1 + depth * np.exp(-t / 0.14) * np.sin(TAU * rate * t)) * (1 + 0.15 * np.exp(-t / 0.05))
    ph = phase(fr); return fades((np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.exp(-t / (d * 0.4)) * 0.35, 0.002, 0.05)
def thump(r, f0=140, f1=50, g=1.0, d=0.4, tau=0.1):
    t = tt(d); return fades((lp(r.standard_normal(len(t)), 350) * np.exp(-t / 0.035) + np.sin(phase(np.geomspace(f0, f1, len(t)))) * np.exp(-t / tau)) * g, 0.001, 0.05)
def plip(r, f=900, up=2.6, tau=0.035): t = tt(0.14); return fades(np.sin(phase(np.geomspace(f, f * up, len(t)))) * np.exp(-t / tau) * 0.35, 0.002, 0.01)
def crackle(r, d=0.8, rate=60, f=(2500, 9000), decay=0.5, g=0.5):
    """frost / ice crackle: random tiny bright ticks thinning out"""
    n = ns(d); y = np.zeros(n); tm = 0.0
    while tm < d - 0.03:
        k = ns(tm); c = tick(r, float(r.uniform(*f) / 1.5), float(r.uniform(0.0008, 0.0025)), float(r.uniform(0.3, 1.0)))
        L = min(len(c), n - k); y[k:k + L] += c[:L] * np.exp(-tm / decay)
        tm += r.exponential(1 / rate)
    return fades(y * g, 0.002, 0.05)
def glassbits(r, d=1.2, count=70, lo=1800, hi=9000, spread=0.5, g=0.5):
    """crystal shatter fragments: many small glassy modal rings with front-loaded random onsets; stereo"""
    out = np.zeros((2, ns(d)))
    for i in range(count):
        t0 = spread * r.uniform(0, 1) ** 2.2
        f = np.exp(r.uniform(np.log(lo), np.log(hi))); dd = min(0.6, d - t0 - 0.01)
        if dd < 0.05: continue
        tau = r.uniform(0.03, 0.22) * (3000 / f) ** 0.3
        y = modal(dd, [(f, 1.0, tau), (f * r.uniform(2.2, 2.9), 0.5, tau * 0.5), (f * r.uniform(4.0, 5.5), 0.25, tau * 0.3)], r)
        y *= r.uniform(0.3, 1.0) * (1 - 0.6 * t0 / spread)
        place(out, pan(fades(y, 0.0003, 0.02), float(r.uniform(-0.85, 0.85))), t0)
    return out * g / np.sqrt(count / 8)
def squelch(r, d=0.35, f0=900, f1=250, g=0.5):
    """wet squishy noise with a falling formant"""
    n = ns(d); t = np.arange(n) / SR; nz = colored(n, r, 0.8)
    fc = lambda T: np.interp(T, [0, d], [f0, f1])
    y = shape(nz, lambda T, F: 1 / (1 + ((F[:, None] - fc(T)[None, :]) / (0.35 * fc(T)[None, :])) ** 2), 1024, 128)
    env = (1 - np.exp(-t / 0.006)) * np.exp(-t / (d * 0.35)) * (0.7 + 0.3 * np.sin(TAU * 38 * t))
    return fades(y / (np.std(y) + 1e-9) * env * g, 0.001, 0.04)
def squeak(r, f0=900, f1=1500, d=0.22, g=0.3):
    """rubbery squeak: nasal stick-slip tone that glides up with a wobble"""
    t = tt(d); f = np.geomspace(f0, f1, len(t)) * (1 + 0.04 * np.sin(TAU * 31 * t)); ph = phase(f)
    y = sum(np.sin(k * ph + k) / k ** 0.8 for k in range(1, 7)); y = bp(y, 700, 6000, 1)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.6 * (0.75 + 0.25 * np.sin(TAU * 47 * t))
    return fades(y * env * g, 0.004, 0.03)
def bwomp(r, d=0.7):
    """balloon inflating BWOMP: low rubbery tone sweeping up, with a puff"""
    t = tt(d); f = 70 * (1 + 2.2 * (1 - np.exp(-t / 0.12))) * (1 + 0.04 * np.sin(TAU * 18 * t)); ph = phase(f)
    y = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph) + 0.12 * np.sin(4 * ph))
    env = np.minimum(1, t / 0.02) * np.exp(-t / 0.28)
    nz = lp(colored(len(t), r, 1.0), 900) * np.exp(-t / 0.08) * 0.3
    return fades((lp(y, 1800) * env + nz) * 0.5, 0.002, 0.06)
def zap(r, d=0.45):
    t = tt(d); f = np.geomspace(1600, 260, len(t)); sq = np.sign(np.sin(phase(f))) * 0.12 * np.exp(-t / 0.2)
    cr = bp(r.standard_normal(len(t)), 2000, 9000, 1) * (smooth_noise(len(t), r, 60) > 0.25) * 0.45 * np.exp(-t / 0.18)
    buzz = np.sin(phase(np.full(len(t), 100.0))) ** 3 * 0.15 * np.exp(-t / 0.15)
    return fades(lp(sq, 5000) + cr + buzz, 0.002, 0.05)
def alarm_bell(r, d=0.95, f=1180, rate=19.0):
    """electric alarm bell: a hammer striking a bell ~19x/s"""
    hits = np.arange(0, d - 0.05, 1 / rate)
    x = impulse_train(hits + r.normal(0, 0.002, len(hits)), d + 0.6, 0.8 + 0.2 * r.uniform(size=len(hits)))
    ir = modal(0.6, [(f, 1.0, 0.35), (f * 2.32, 0.6, 0.2), (f * 4.25, 0.35, 0.1), (f * 6.63, 0.2, 0.05), (f * 0.5, 0.25, 0.3)], r)
    y = signal.fftconvolve(x, ir)[: len(x)]
    y += bp(r.standard_normal(len(x)), 3000, 9000, 1) * np.convolve(x, np.exp(-tt(0.004) / 0.001), "same") * 0.5
    return fades(y * 0.12, 0.001, 0.1)
def zip_(r, d=0.55, f0=300, f1=2600):
    n = ns(d); t = np.arange(n) / SR; f = np.geomspace(f0, f1, n)
    teeth = (np.sin(phase(f * 0.08)) > 0.6).astype(float)  # ratchet "zzzip"
    y = np.sin(phase(f)) * 0.2 + bp(r.standard_normal(n), 1500, 8000, 1) * teeth * 0.35
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    return fades(y * env, 0.003, 0.03)
def lamp(r, d=0.45, g=0.5):
    """lamp switch-on: hard click + mains buzz that settles"""
    n = ns(d); t = np.arange(n) / SR
    ph = phase(np.full(n, 120.0)); bz = sum(np.sin(k * ph + k) / k for k in range(1, 14)) * 0.12
    bz = bp(bz, 200, 4000, 1) * (np.exp(-t / 0.15) * 0.8 + 0.2) * np.clip((d - t) / 0.1, 0, 1) * (t > 0.01)
    c = np.zeros(n); k = tick(r, 2600, 0.002, 1.0); c[:len(k)] += k
    k2 = woodblock(r, 1800, 0.25, 0.08); c[:len(k2)] += k2
    return fades((bz + c) * g, 0.0005, 0.04)
def hmm(r, d=0.6):
    """confused 'hmm?' hum: nasal tone, dip then rise"""
    n = ns(d); t = np.arange(n) / SR
    f0 = np.interp(t, [0, 0.2, 0.32, d], [175, 160, 165, 235]) * (1 + 0.01 * np.sin(TAU * 5 * t))
    amp = np.minimum(1, t / 0.05) * np.clip((d - t) / 0.12, 0, 1) * (1 - 0.6 * np.exp(-((t - 0.28) / 0.04) ** 2))
    y = G.vox(f0, G.vowel_track(n, [(0, "u"), (d, "u")]), amp, r, 1.0, tilt=1.5, breath=0.06, fmax=3000)
    return fades(lp(y, 2500), 0.01, 0.05)
def klaxon(r, d=0.75):
    """'aa-OO-gah' klaxon horn"""
    n = ns(d); t = np.arange(n) / SR
    f = np.interp(t, [0, 0.18, 0.5, d], [190, 330, 330, 280])
    ph = phase(f); y = sum(np.sin(k * ph) / k for k in range(1, 30) if k * 330 < 9000)
    fc = np.interp(t, [0, 0.2, d], [500, 1800, 900])
    y = shape(y, lambda T, F: 1 / (1 + (F[:, None] / np.interp(T, t, fc)[None, :]) ** 3), 1024, 256)
    env = np.minimum(1, t / 0.03) * np.clip((d - t) / 0.15, 0, 1)
    return fades(np.tanh(y * 1.5) * env * 0.35, 0.003, 0.05)
def clock(r, d, rate=1.0, g=0.5):
    """big clock tick-tock: alternating high/low wood clicks"""
    y = np.zeros(ns(d) + ns(0.2)); i = 0; tm = 0.0
    while tm < d:
        c = woodblock(r, 2100 if i % 2 == 0 else 1500, 0.6, 0.1)
        k = ns(tm); y[k:k + len(c)] += c; tm += 1 / rate / 2; i += 1
    return y * g
def stopwatch(r):
    out = np.zeros(ns(0.5)); c = tick(r, 3200, 0.0015, 1.0); out[:len(c)] += c
    m = modal(0.4, [(3950, 0.35, 0.12), (3950 * 2.7, 0.12, 0.05)], r); out[ns(0.012):ns(0.012) + len(m)] += m
    c2 = woodblock(r, 2400, 0.4, 0.06); out[ns(0.03):ns(0.03) + len(c2)] += c2
    return fades(out, 0.0005, 0.05)
def gulp(r):
    """whole-cone gulp: mouth-stuffing squish + big throaty 'glk'"""
    out = np.zeros(ns(0.7))
    s = squelch(r, 0.25, 1400, 400, 0.35); out[:len(s)] += s
    t = tt(0.22); f = np.geomspace(420, 110, len(t)); ph = phase(f)
    g = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.minimum(1, t / 0.006) * np.exp(-t / 0.06)
    k = ns(0.16); out[k:k + len(g)] += g * 0.6
    c = bp(r.standard_normal(ns(0.03)), 600, 3000, 1) * np.exp(-tt(0.03) / 0.004); out[k:k + len(c)] += c * 0.4
    return fades(out, 0.002, 0.05)
def warm_hum(r, d=1.4):
    n = ns(d); t = np.arange(n) / SR
    f0 = 110 * (1 + 0.003 * np.sin(TAU * 4 * t)); ph = phase(f0)
    y = sum(np.sin(k * ph + 0.3 * k) / k ** 1.6 for k in range(1, 8))
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2
    air = lp(colored(n, r, 1.0), 1200) * 0.15
    return fades(lp(y + air, 1500) * env * 0.4, 0.02, 0.1)
def rev_cymbal(r, d=1.2):
    c = cymbal(0.9, r, d + 0.3, 1.2)[: ns(d)]
    c = c[::-1].copy(); u = np.linspace(0, 1, len(c)); c *= u ** 1.5
    return fades(c, 0.02, 0.004)

# ---------------- music ----------------
SW = 0.62  # swing: 2nd 8th lands at 62 % of the beat
def sw8(t0, B, k):  # time of 8th index k
    return t0 + (k // 2) * B + (k % 2) * SW * B
CH = {"C": [48, 55, 64, 67, 72], "G": [43, 50, 59, 62, 67], "F": [41, 48, 57, 60, 65], "Am": [45, 52, 60, 64, 69],
      "Dm": [38, 50, 57, 62, 65], "G7": [43, 50, 59, 65, 71], "E": [40, 52, 56, 59, 64]}
JPROG = ["C", "G", "F", "G", "C", "Am", "F", "C"]
JMEL = [  # (bar, 8th, midi, len8): the original jingle "Scoop Truck"
    (0, 0, 72, 1), (0, 1, 76, 1), (0, 2, 79, 2), (0, 4, 76, 1), (0, 5, 72, 1), (0, 6, 74, 2),
    (1, 0, 71, 1), (1, 1, 74, 1), (1, 2, 77, 2), (1, 4, 76, 1), (1, 5, 74, 1), (1, 6, 71, 2),
    (2, 0, 69, 1), (2, 1, 72, 1), (2, 2, 77, 1), (2, 3, 76, 1), (2, 4, 74, 1), (2, 5, 72, 1), (2, 6, 69, 2),
    (3, 0, 67, 1), (3, 1, 71, 1), (3, 2, 74, 2), (3, 4, 79, 3),
    (4, 0, 72, 1), (4, 1, 76, 1), (4, 2, 79, 2), (4, 4, 76, 1), (4, 5, 72, 1), (4, 6, 74, 2),
    (5, 0, 72, 1), (5, 1, 76, 1), (5, 2, 81, 2), (5, 4, 79, 1), (5, 5, 76, 1), (5, 6, 72, 2),
    (6, 0, 77, 1), (6, 1, 76, 1), (6, 2, 74, 1), (6, 3, 72, 1), (6, 4, 74, 1), (6, 5, 76, 1), (6, 6, 74, 1), (6, 7, 71, 1),
    (7, 0, 72, 2), (7, 2, 67, 1), (7, 3, 72, 1), (7, 4, 72, 2)]

# A) the jingle, 8 bars of 4 beats from 0 to "Now" (16.81)
BA = T_WEIRD / 32; TA0 = 0.0
def lead_inst(t):  # glock in the park, music box in the mouth, glock+vibes in HQ
    return "glock" if t < 4.0 else ("mbox" if t < 11.3 else "hq")
for bar, k, m, ln in JMEL:
    tn = sw8(TA0 + bar * 4 * BA, BA, k); inst = lead_inst(tn); p = 0.15 * np.sin(k + bar)
    if inst == "glock": M(glock(m2f(m + 12), 0.6, r_(), 1.2), tn, 0.22, p); M(musicbox(m2f(m + 24), 0.3, r_(), 0.6), tn, 0.05, -p)
    elif inst == "mbox": M(musicbox(m2f(m + 12), 0.6, r_(), 1.1), tn, 0.26, p); M(pluck(m2f(m), 0.4, r_(), 0.35, 0.8), tn, 0.08, -p)
    else: M(glock(m2f(m + 12), 0.5, r_(), 1.0), tn, 0.16, p); M(vibes(m2f(m), 0.5, r_(), 0.6, damp=ln * BA * 0.5), tn, 0.22, -p)
for bar, cn in enumerate(JPROG):
    ch = CH[cn]; tb = TA0 + bar * 4 * BA
    for b in range(4):
        tq = tb + b * BA
        if b % 2 == 0:  # oom: plucky bass root / fifth
            M(pluck(m2f(ch[0] - 12 + (0 if b == 0 else 7)), 0.75, r_(), 0.45, 0.4), tq, 0.55)
            M(kick(r_(), 0.5), tq, 0.5)
        else:           # pah: chord stab (short pluck triad) + snap
            for i, mm in enumerate(ch[2:5]): M(pluck(m2f(mm), 0.32, r_(), 0.2, 0.7), tq + 0.004 * i, 0.22, -0.4 + 0.4 * i)
            M(snap(r_(), 0.4), tq, 0.45, 0.25)
        M(shaker(r_(), 0.22), tq, 0.5, -0.35); M(shaker(r_(), 0.14), tq + SW * BA, 0.5, -0.35)
    if bar == 7: M(pluck(m2f(43 - 12), 0.7, r_(), 0.3, 0.4), tb + 3.5 * BA, 0.45)  # walk-up into the turn
M(triangle(0.35, r_(), 1.0), TA0 + 0.0, 0.25, 0.4)
# little tag at the slam / bell moments (sparkle up on the 4-bar turns)
for i, m in enumerate((84, 88, 91, 96)): M(glock(m2f(m), 0.35, r_(), 0.6), TA0 + 16 * BA - 0.25 + i * 0.06, 0.08, -0.4 + 0.25 * i)
amask = mask([(0, T_WEIRD - 0.08)], 0.05); mus *= amask[None, :]

# B) mysterious tick-tock that builds: 16 beats from "Now" to "Twice"
BB = (T_TWICE - T_WEIRD) / 16; TB0 = T_WEIRD
bgroove = np.zeros((2, N))
BPROG = ["Am", "F", "Dm", "E"]
ARP = {"Am": [69, 72, 76, 72], "F": [69, 72, 77, 72], "Dm": [69, 74, 77, 74], "E": [68, 71, 76, 71]}
for b in range(16):
    tq = TB0 + b * BB; cn = BPROG[b // 4]; ch = CH[cn]; u = b / 15
    M(woodblock(r_(), 1500 if b % 2 == 0 else 1050, 0.55), tq, 0.35 + 0.1 * u, 0.3 if b % 2 == 0 else -0.3, bgroove)
    M(pluck(m2f(ch[0] - 12 + (0 if b % 2 == 0 else 7)), 0.7, r_(), 0.4, 0.3), tq, 0.5, 0, bgroove)
    if b >= 8: M(pluck(m2f(ch[0] - 12 + 12), 0.45, r_(), 0.2, 0.4), tq + 0.5 * BB, 0.35, 0, bgroove)  # 8th pulse
    nar = 2 if b < 8 else 1  # arp rate: quarters then 8ths
    for j in range(2 // nar if b >= 8 else 1):
        m = ARP[cn][(b * 2 + j) % 4] if b >= 8 else ARP[cn][b % 4]
        M(musicbox(m2f(m + 12), 0.5, r_(), 0.9), tq + j * 0.5 * BB, 0.18 + 0.06 * u, 0.25 * np.sin(b + j), bgroove)
    if b >= 4:  # hats come in after the schoolkid line
        for j in range(2): M(hat(r_(), 0.14 if j == 0 else 0.09), tq + j * 0.5 * BB, 0.6 + 0.4 * u, 0.35, bgroove)
    if b >= 8: M(kick(r_(), 0.4 + 0.3 * u), tq, 0.6, 0, bgroove)
    if b >= 12: M(kick(r_(), 0.35), tq + 0.5 * BB, 0.5, 0, bgroove)
    if b in (2, 6, 10, 14): M(snap(r_(), 0.35), tq, 0.35, -0.2, bgroove)
for i, cn in enumerate(BPROG):
    M(pad([m2f(m) for m in CH[cn][1:4]], 4 * BB, 0.18 + 0.05 * i, r_(), att=0.5, rel=0.3, warm=600 + 200 * i), TB0 + i * 4 * BB, 0.5, 0, bgroove)
# build: snare roll + riser + reverse cymbal into the hit
for k_, (tr, vr) in enumerate(zip(np.arange(T_TWICE - 1.15, T_TWICE - 0.04, 1 / 22), np.linspace(0.12, 0.6, 26))):
    M(snare(vr, r_(), 0.15), tr, 0.2, 0, bgroove)
t = tt(1.3); M(np.sin(phase(np.geomspace(200, 1600, len(t)))) * (t / 1.3) ** 2.5 * 0.07, T_TWICE - 1.3, 1.0, 0, bgroove)
M(rev_cymbal(r_(), 1.25), T_TWICE - 1.25, 0.3, 0, bgroove)
M(G.whoosh(1.2, r_(), 1.17, 400, 9000, tail=0.02, air=0.4), T_TWICE - 1.2, 0.2, 0, bgroove)
bm = mask([(TB0 - 0.02, T_TWICE - 0.006)], 0.008); mus += bgroove * bm[None, :]

# C) THE FREEZE HIT on "Twice": icy cluster + crystal shatter + sub drop, then a hard stop
TH = T_TWICE - 0.01
for i, m in enumerate((88, 95, 100, 102, 107)): H(glock(m2f(m), 0.8, r_(), 2.2), TH + 0.008 * i, 0.22, -0.6 + 0.3 * i)
for i, m in enumerate((76, 83, 88, 90)): H(vibes(m2f(m), 0.7, r_(), 2.0, trem=7.0, trem_depth=0.35), TH, 0.25, -0.5 + 0.33 * i)
H(pad([m2f(m) for m in (52, 59, 66, 71, 76)], 0.35, 0.6, r_(), att=0.005, rel=0.9, warm=4500, detune=14), TH, 0.7)
H(glassbits(r_(), 2.0, 110, 1800, 11000, 0.7, 0.9), TH)
H(cymbal(1.0, r_(), 2.6, 1.3), TH, 0.35)
t = tt(1.6); H(np.sin(phase(np.geomspace(90, 30, len(t)))) * np.exp(-t / 0.5) * 0.9, TH, 1.0)
H(thump(r_(), 160, 45, 1.0, 0.6, 0.15), TH, 0.8)
crack0 = bp(r_().standard_normal(ns(0.08)), 1000, 16000, 1) * np.exp(-tt(0.08) / 0.006); H(fades(crack0, 0.0003, 0.01), TH, 1.0)
# stop feel: everything ducks hard 0.35 s after the hit, only the glass tinkle tail rings out
stopm = 1 - 0.85 * mask([(TH + 0.30, TH + 1.6)], 0.1)   # trimmed so the first hit is down before the face hit
hit *= stopm[None, :]
# second layer: BEAN's MEME freeze face explodes (hard cut 25.53, face at 25.60): ice CRACK / crystallize snap
TF = 25.60
rf = r_()
H(fades(hp(rf.standard_normal(ns(0.06)), 1200) * np.exp(-tt(0.06) / 0.003), 0.0002, 0.01), TF, 1.0)
H(thump(rf, 260, 70, 0.8, 0.3, 0.05), TF, 0.6)
t = tt(0.35); H(fades(np.sin(phase(np.geomspace(2500, 7000, len(t)))) * np.exp(-t / 0.08) * 0.25, 0.001, 0.05), TF + 0.01, 0.6, 0.2)
H(crackle(rf, 0.3, 160, (3000, 11000), 0.12, 0.8), TF + 0.005, 0.8)
H(glassbits(rf, 0.9, 50, 3500, 12000, 0.25, 0.7), TF + 0.01)
for i, m in enumerate((96, 100, 103, 108)): H(glock(m2f(m), 0.6, r_(), 0.9), TF + 0.03 + i * 0.035, 0.12, -0.5 + 0.33 * i)
# frozen shimmer bridging into the outro (quiet)
t = tt(1.6); sh = sum(np.sin(TAU * m2f(m) * t + i) for i, m in enumerate((88, 95, 100))) * (1 + 0.5 * np.sin(TAU * 9 * t)) / 3
M(fades(sh * np.sin(np.pi * t / 1.6) ** 2 * 0.03, 0.05, 0.2), TH + 1.0, 1.0, 0.2)

# D) warm cosy dusk reprise (vibes + music box), hangs on G7 and is cut by "Nah."
BD = 0.6; TD0 = T_FIX + 0.6
dprog = [("C", 0), ("F", 4)]
DMEL = [(0, 72, 1), (1, 76, 1), (2, 79, 2), (4, 76, 1), (5, 72, 1), (6, 74, 2),
        (8, 72, 1), (9, 69, 1), (10, 77, 2), (12, 76, 1), (13, 74, 1), (14, 72, 2)]
for k, m, ln in DMEL:
    tn = sw8(TD0, BD, k)
    M(vibes(m2f(m), 0.55, r_(), 1.4, trem=4.5, trem_depth=0.2), tn, 0.3, 0.15 * np.sin(k))
    M(musicbox(m2f(m + 12), 0.35, r_(), 0.9), tn, 0.07, -0.2)
for cn, b0 in dprog:
    ch = CH[cn]
    M(pad([m2f(m) for m in ch[1:5]], 4 * BD, 0.28, r_(), att=0.4, rel=0.4, warm=800), TD0 + b0 * BD, 0.55)
    for b in range(4):
        tq = TD0 + (b0 + b) * BD
        if b % 2 == 0: M(pluck(m2f(ch[0] - 12 + (0 if b == 0 else 7)), 0.6, r_(), 0.6, 0.25), tq, 0.45)
        else: M(brush(0.6, r_(), 0.3), tq, 0.4, 0.3)
        M(brush(0.3, r_(), 0.25, swish=True), tq + 0.1, 0.15, -0.3)
M(pad([m2f(m) for m in (55, 60, 64)], 1.6, 0.22, r_(), att=0.8, rel=0.3, warm=700), T_FIX - 0.2, 0.5)   # warm bed under "The fix?"
TG7 = TD0 + 8 * BD
for i, m in enumerate(CH["G7"]):  # fermata: "Or... eat slower." (considering)
    M(vibes(m2f(m + (12 if m < 50 else 0)), 0.45, r_(), T_NAH - TG7 + 0.5, trem=4.0, trem_depth=0.3), TG7 + 0.03 * i, 0.18, -0.4 + 0.2 * i)
M(pad([m2f(m) for m in CH["G7"][1:5]], T_NAH - TG7, 0.25, r_(), att=0.3, rel=0.05, warm=800), TG7, 0.5)
M(pluck(m2f(31), 0.6, r_(), 1.2, 0.25), TG7, 0.45)
dm = mask([(T_FIX - 0.25, T_NAH - 0.004)], 0.008); dm[: ns(T_FIX - 0.3)] = 1
mus *= np.where(np.arange(N) >= ns(T_FIX - 0.3), dm, 1.0)[None, :]
# button after the crack: tiny sad ding (falls a hair flat) + final ice settle
T_ICE = T_NAH + 0.27
t = tt(1.6)
f = m2f(76) * 2 ** (-0.6 * np.clip((t - 0.1) / 1.0, 0, 1) / 12); ding = np.sin(phase(f)) * np.exp(-t / 0.5) + 0.25 * np.sin(phase(f * 2.756)) * np.exp(-t / 0.1)
M(fades(ding * 0.25, 0.0005, 0.2), T_NAH + 0.95, 0.55, 0.1)

# shared room
ir = make_ir(1.2, 41, hf=1.4)
mus = mus + 0.16 * convolve_st(mus, ir)
ir2 = make_ir(2.2, 43, hf=0.8); hit = hit + 0.3 * convolve_st(hit, ir2)

# ---------------- sfx ----------------
S(G.breeze(DUR, r_(), 1.0, 0.25, 700) * mask([(0, 3.9), (26.8, DUR - 0.3)], 0.4), 0, 0.06, name="park air")
mouthbed = st(lp(colored(N, r_(), 1.5), 260) * 0.3); S(mouthbed * mask([(4.0, 11.4)], 0.4), 0, 0.25, name="mouth cave rumble")
# shot 1: chomp + frost crackle
S(thump(r_(), 220, 90, 0.6, 0.15, 0.04), 0.0, 0.5, name="chomp")
cr = np.zeros(ns(0.25)); rr = r_()
for i in range(9): c = bp(rr.standard_normal(ns(0.04)), 1200, 7000, 1) * np.exp(-tt(0.04) / 0.008) * rr.uniform(0.4, 1); k = int(rr.uniform(0, 0.2) * SR); cr[k:k + len(c)] += c
S(fades(cr * 0.6, 0.001, 0.02), 0.0, 0.6, name="wafer crunch")
S(crackle(r_(), 0.7, 70, (3000, 10000), 0.35, 0.45), 0.22, 0.6, 0.2, name="frost crackle")
S(glassbits(r_(), 0.8, 18, 3000, 9000, 0.45, 0.25), 0.25, 0.6)
S(G.creak(0.32, r_(), 90, 170) * 0.6, 1.84, 0.5, -0.1, name="lid creak"); S(plip(r_(), 500, 2.4, 0.03), 2.2, 0.6, name="lid pop")
S(boing(420, 0.4, 0.3, 9), at("pain") - 0.07, 0.5, 0.15, name="shrug boing"); S(blip(900, 1400, 0.09, 0.15), at("pain") + 0.25, 0.4); S(blip(1400, 800, 0.12, 0.15), at("pain") + 0.36, 0.4)
S(G.whoosh(0.75, r_(), 0.5, 200, 3500, tail=0.15, air=0.25), 3.32, 0.6, name="dive whoosh")
# shot 2: SLAM
T_SL = at("cold") + 0.005
S(thump(r_(), 150, 40, 1.0, 0.6, 0.16), T_SL, 0.9, name="slab SLAM"); S(squelch(r_(), 0.45, 1100, 220, 0.7), T_SL, 0.6)
S(crackle(r_(), 1.2, 90, (2500, 9000), 0.5, 0.5), T_SL + 0.05, 0.6, 0.3, name="icy crackle"); S(glassbits(r_(), 1.2, 25, 2500, 8000, 0.8, 0.3), T_SL + 0.08, 0.6)
S(G.whoosh(0.35, r_(), 0.3, 300, 2500, tail=0.03), T_SL - 0.33, 0.35)
T_SQ = at("shut") - 0.25
S(squeak(r_(), 850, 1500, 0.22, 0.35), T_SQ, 0.6, -0.2, name="vessel squeak pinch"); S(squeak(r_(), 1000, 1700, 0.18, 0.3), T_SQ + 0.24, 0.5, 0.2)
S(bwomp(r_()), at("blast") - 0.03, 0.8, name="balloon BWOMP"); S(boing(260, 0.5, 0.25, 8), at("blast") + 0.08, 0.3)
S(zap(r_()), at("nerve") - 0.05, 0.55, name="nerve zap")
S(alarm_bell(r_(), 0.95), at("rings") - 0.01, 0.55, 0.15, name="ALARM BELL")
S(zip_(r_(), 0.55), at("but") - 0.05, 0.5, name="zip along the cable")
# shot 3: lamps, hmm, button + klaxon
S(lamp(r_(), 0.45, 0.6), at("nerve", 1) - 0.05, 0.55, -0.4, name="MOUTH lamp buzz-click")
S(lamp(r_(), 0.5, 0.7), at("forehead") - 0.08, 0.6, 0.4, name="FOREHEAD lamp buzz-click")
for i in range(3): S(blip(1800, 1800, 0.05, 0.12), at("forehead") + 0.3 + i * 0.16, 0.35, 0.4)
EV.append((at("forehead") + 0.3, "lamp blinks"))
S(hmm(r_()), at("confused") - 0.05, 0.6, name="confused hmm"); S(blip(600, 900, 0.18, 0.15, 0.03), at("confused") + 0.45, 0.25)
T_BTN = at("blames") - 0.02
S(thump(r_(), 200, 80, 0.7, 0.2, 0.05), T_BTN, 0.6, name="big red button press"); S(tick(r_(), 2000, 0.003, 1.0), T_BTN, 0.5)
S(klaxon(r_()), T_BTN + 0.06, 0.6, name="klaxon")
# shot 4
S(clock(r_(), 1.25, 1 / (2 * BB), 0.5), T_WEIRD, 0.6, name="tick-tock clock")
S(stopwatch(r_()), at("schoolkid") + 0.02, 0.6, 0.1, name="stopwatch click")
S(G.whoosh(0.3, r_(), 0.15, 600, 3000, tail=0.08), at("dad") - 0.1, 0.2, 0.3)  # clipboard swish
rr = r_(); tm = at("fast") - 0.62
while tm < at("fast") + 0.4:
    S(G.clink(rr, float(rr.uniform(2200, 5200)), 0.12), tm, float(rr.uniform(0.25, 0.5)), float(rr.uniform(-0.7, -0.2))); tm += rr.uniform(0.05, 0.09)
EV.append((at("fast") - 0.62, "spoon clatter"))
for i, (dt, m) in enumerate([(-0.25, 96), (0.1, 100), (0.4, 98)]): S(glock(m2f(m), 0.25, r_(), 0.5), at("slow") + dt, 0.12, 0.5)
EV.append((at("slow") - 0.25, "dainty tink-tink"))
S(G.whoosh(0.5, r_(), 0.4, 250, 5000, tail=0.08), T_TWICE + 0.02, 0.45, 0.5, name="bar chart rising whoosh")
S(blip(300, 1400, 0.35, 0.2, harm=0.3), T_TWICE + 0.05, 0.35, 0.55); S(boing(1100, 0.35, 0.15, 14), T_TWICE + 0.4, 0.3, 0.55)
S(G.whoosh(0.5, r_(), 0.35, 200, 3000), 805 / FPS - 0.4, 0.3, name="whoosh to dusk park")
# shot 5
S(glock(m2f(91), 0.55, r_(), 1.2), T_FIX - 0.02, 0.2, 0.2, name="fix ding"); S(triangle(0.3, r_(), 1.2), T_FIX - 0.02, 0.15, 0.2)
S(warm_hum(r_(), 1.3), at("warm") - 0.05, 0.55, name="cosy warm hum")
S(G.crickets(DUR - 27.0, r_(), 3) * mask([(0, DUR - 27.3)], 0.5)[: ns(DUR - 27.0)], 27.0, 0.02, name="dusk crickets")
S(gulp(r_()), T_NAH - 0.02, 0.8, name="whole cone gulp")
T_CR = T_NAH + 0.25
crk = fades(hp(r_().standard_normal(ns(0.05)), 1500) * np.exp(-tt(0.05) / 0.004), 0.0002, 0.01)
S(crk, T_CR, 0.9, name="ice CRACK"); S(thump(r_(), 120, 45, 0.9, 0.5, 0.12), T_CR, 0.7)
S(glassbits(r_(), 1.2, 40, 1500, 7000, 0.25, 0.5), T_CR, 0.6); S(crackle(r_(), 0.9, 80, (2000, 8000), 0.3, 0.6), T_CR + 0.02, 0.6)
S(G.whoosh(0.4, r_(), 0.05, 2000, 9000, tail=0.15, air=0.5), T_CR, 0.4)
S(crackle(r_(), 0.5, 25, (1500, 5000), 0.3, 0.3), T_CR + 1.4, 0.4, -0.2, name="ice settle")
EV.append((T_NAH + 0.95, "sad ding"))
# room on sfx
sfx = sfx + 0.12 * convolve_st(sfx, ir)

# ---------------- mix ----------------
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.15))
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0; MUS_T = float(os.environ.get("MUS_T", -19.5)); SFX_T = float(os.environ.get("SFX_T", -25.0)); HIT_T = float(os.environ.get("HIT_T", -9.0))
v = to_lufs(v, V_T)
m = to_lufs(mus, MUS_T) * 10 ** ((-7.0 * duck) / 20)
hm = hit * 10 ** ((HIT_T - float(momentary(hit, 0.05).max())) / 20) * 10 ** ((-4.0 * duck) / 20)
s = to_lufs(sfx, SFX_T) * 10 ** ((-2.5 * duck) / 20)
raw = hp(v + m + hm + s, 25)
def limit(x, ceil_db=-1.4, look=0.004):
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = up[: x.shape[1] * 4].reshape(-1, 4).max(1)
    g = np.minimum(1, 10 ** (ceil_db / 20) / (pk + 1e-12)); L = ns(look)
    g = ndimage.minimum_filter1d(g, 2 * L + 1); g = ndimage.uniform_filter1d(g, 2 * L + 1)
    return x * g
gain = 0.0
for _ in range(8):
    mix = limit(raw * 10 ** (gain / 20)); l = integrated(mix); gain += -14.97 - l
    if abs(l + 14.97) < 0.02: break
mix = fades(mix, 0.002, 0.8)
assert mix.shape[1] == N
write_wav(os.path.join(HERE, "mix.wav"), mix)
for nm, x in [("voice", v), ("music", m), ("hit", hm), ("sfx", s)]: write_wav(os.path.join(HERE, f"stem_{nm}.wav"), x * 10 ** (gain / 20), 16)
print("mix LUFS", round(integrated(mix), 2), "TP", round(true_peak(mix), 2), "len", mix.shape[1] / SR, "gain", round(gain, 2))
pre = raw * 10 ** (gain / 20); gr = 20 * np.log10(np.abs(mix).max(0) + 1e-9) - 20 * np.log10(np.abs(pre).max(0) + 1e-9)
print("max limiter GR dB", round(float(gr[np.abs(pre).max(0) > 0.05].min()), 2))
for t_, nm in sorted(EV): print(f"{t_:6.2f} {nm}")
