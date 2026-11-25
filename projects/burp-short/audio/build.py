# Sound for "Astronauts Can't Burp": station hum + fans, Earth backyard birds, synthesized burps (fail / clean / wet /
# tiny), soda pssht + fizz, wet bubbly gloops, a push-off whoosh, curious pluck/musicbox score that turns golden and
# triumphant at the twist, a dead stop before the PEAK, a hero hit on "One perfect burp."
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase, peq
from instruments import m2f, brass, glock, vibes, musicbox, triangle, pluck, pad, cymbal, timpani, snare_roll, snare
import sfx_gen as G
from sfx_gen import vox, vowel_track, _track

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1725
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(1985)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
mus = np.zeros((2, N)); sfx = np.zeros((2, N))
def M(x, t, g=1.0, p=0.0): place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)

# ---------------- burps ----------------
def burp(kind, r, base=None):
    if kind == "tiny":
        d, base = 0.22, base or 150
    elif kind == "fail":
        d, base = 0.45, base or 95
    else:
        d, base = (0.75 if kind == "clean" else 0.9), base or 82
    n = ns(d); t = np.arange(n) / SR
    f0 = base * _track(n, [(0, 1.15), (d * 0.25, 1.0), (d, 0.78)], t)
    fry = 1 + 0.45 * np.sign(np.sin(phase(np.full(n, 38.0) + 12 * smooth_noise(n, r, 30.0))))   # glottal rattle
    segs = [(0, "U"), (d * 0.4, "er"), (d, "u")] if kind != "fail" else [(0, "u"), (d, "u")]
    amp = np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.12, 0, 1) * (0.75 + 0.25 * fry)
    y = vox(f0, vowel_track(n, segs), amp, r, 1.0, tilt=0.95, breath=0.3, jitter=0.04)
    if kind == "fail":   # closed mouth: muffled "mmph" + cheek puff
        y = lp(y, 500) * 1.6 + bp(r.standard_normal(n), 800, 3000, 1) * np.exp(-(t - d + 0.08).clip(0) / 0.05) * (t > d - 0.08) * 0.3
    if kind == "wet":    # gloopy: low-passed, bubbles, a wobble
        y = lp(y, 1400) * (1 + 0.4 * np.sin(2 * np.pi * 11 * t))
        g = G.bubbles(d + 0.4, r, 26, 120, 900, (0.01, 0.05), rise=(2, 6))
        out = np.zeros(ns(d + 0.4)); out[:n] += y; out += g * 1.4
        return fades(out, 0.003, 0.08)
    return fades(y, 0.003, 0.05)

# ---------------- music ----------------
C = {"C": [48, 55, 64, 67], "Am": [45, 52, 60, 64], "F": [41, 48, 57, 64], "G": [43, 50, 59, 62], "Em": [40, 47, 55, 59], "D": [50, 57, 62, 66]}
def padc(ch, t, d, vel=0.35, warm=900): M(pad([m2f(m) for m in C[ch]], d, vel, r_(), att=0.5, rel=0.8, warm=warm), t, 0.5)
def plk(m, t, v=0.6, p=0.0): M(pluck(m2f(m), v, r_(), 0.7, 0.5), t, 0.5, p)
def mbox(m, t, v=0.5): M(musicbox(m2f(m), v, r_()), t, 0.45, 0.2)
BEAT = 60 / 100
# hook: a sneaky pluck figure + hum
for i, m in enumerate([60, 63, 67, 66]): plk(m, 0.05 + i * BEAT * 0.5, 0.5)
mbox(67, at("cant", 1) - 0.02, 0.6)
# Earth: warm acoustic plucks, F-C-G-C
t0 = 3.3
for b, ch in enumerate(["F", "C", "G", "C"]):
    padc(ch, t0 + b * 4 * BEAT * 0.6, 4 * BEAT * 0.6, 0.25, 1400)
    for k, m in enumerate([C[ch][0] + 12, C[ch][2], C[ch][3], C[ch][2]] * 2): plk(m, t0 + b * 4 * BEAT * 0.6 + k * BEAT * 0.3, 0.45, -0.2 + 0.4 * (k % 2))
for i, m in enumerate([72, 76, 79]): M(vibes(m2f(m), 0.5, r_()), at("burp", 1) + 0.35 + i * 0.12, 0.4)
# space: curious pad + musicbox (Am-F-Am-Em)
for b, ch in enumerate(["Am", "F", "Am", "Em", "Am", "F"]): padc(ch, 9.2 + b * 1.8, 1.8, 0.3, 700)
for i, m in enumerate([69, 72, 76, 74, 72, 69, 71, 72, 76, 79, 76, 74]): mbox(m, 9.4 + i * 0.85, 0.4)
# commercial: 80s jingle (bright brass stab + glock run)
for m in (60, 64, 67, 72): M(brass(m2f(m), 0.5, 0.75, r_(), kind="horn"), at("guess") - 0.05, 0.35)
for i, m in enumerate([72, 76, 79, 84, 88]): M(glock(m2f(m), 0.6, r_()), at("space", 1) - 0.4 + i * 0.08, 0.45)
# orbit: majestic C - G/B - Am - F
for b, ch in enumerate(["C", "G", "Am", "F"]): padc(ch, 23.3 + b * 1.45, 1.45, 0.35, 1100)
M(timpani(m2f(36), 0.6, r_()), at("challenger") - 0.03, 0.4); M(cymbal(0.35, r_(), 2.0), at("challenger") - 0.03, 0.25)
# middeck: bouncy plucks building to a snare roll, then a DEAD STOP before "Wet."
for k in range(int((33.55 - 29.0) / (BEAT * 0.5))):
    ch = ["C", "G"][(k // 4) % 2]; plk(C[ch][k % 4] + 12, 29.0 + k * BEAT * 0.5, 0.35 + 0.03 * k, 0.3 * ((k % 2) * 2 - 1))
for tr, vr in snare_roll(31.7, 33.5, 0.1, 0.6, r_()): M(snare(vr, r_(), 0.2, 1.1, 0.8), tr, 0.4, -0.1)
# after the peak: a sad descending boing
for i, m in enumerate([67, 64, 60, 55]): plk(m, at("neither") + i * 0.25, 0.5)
# TWIST: golden build (F-G-Am-F-C-G) + glock arpeggio, hero hit on "perfect burp"
for b, ch in enumerate(["F", "G", "Am", "F", "C", "G", "F", "G"]): padc(ch, 37.9 + b * 1.45, 1.45, 0.28 + 0.03 * b, 900 + 120 * b)
for i in range(int((49.4 - 41.9) / 0.3)): M(glock(m2f([72, 76, 79, 83][i % 4] - (5 if (i // 8) % 2 else 0)), 0.3 + 0.02 * i, r_(), 1.0), 41.95 + i * 0.3, 0.35, 0.3 * np.sin(i))
M(timpani(m2f(41), 0.7, r_()), at("hard") - 0.03, 0.5)
hit = at("burp", 3) + 0.35
for m in (60, 64, 67, 72, 76): M(brass(m2f(m), 1.0, 0.85, r_(), kind="horn"), hit, 0.35)
M(cymbal(0.6, r_(), 2.6), hit, 0.4); padc("C", hit, 2.2, 0.4, 1600)
# outro
for b, ch in enumerate(["F", "C", "G", "C"]): padc(ch, 51.0 + b * 1.1, 1.1, 0.3, 1200)
for i, m in enumerate([72, 79, 76, 84]): mbox(m, 51.2 + i * 0.55, 0.45)
M(triangle(0.45, r_()), at("burp", 4) + 0.3, 0.35)

# ---------------- sfx ----------------
hum = lp(colored(N, r_(), 1.0), 400) * 0.25 + np.sin(phase(np.full(N, 120.0))) * 0.03
amb = np.zeros(N)
for a, b, g in [(0, 3.2, 1), (9.0, 20.0, 1), (29.0, 37.8, 0.9), (37.8, 51.0, 0.8)]:
    i0, i1 = ns(a), ns(b); e = np.ones(i1 - i0); f = min(ns(0.25), len(e) // 2); e[:f] = np.linspace(0, 1, f); e[-f:] = np.linspace(1, 0, f); amb[i0:i1] += hum[i0:i1] * e * g
S(amb, 0, 0.5)
for k in range(10): S(np.sin(phase(np.full(ns(0.07), 1800.0))) * 0.15 * np.exp(-np.arange(ns(0.07)) / SR / 0.03), 9.5 + k * 3.7 + (k % 3) * 0.8, 0.25, 0.6)  # station beeps
S(G.bird_chirps(5.8, r_(), 0.7) * 0.6, 3.25, 0.3); S(G.breeze(5.8, r_(), 0.6) * 0.5, 3.25, 0.25)
S(G.bubbles(1.5, r_(), 30, 1500, 5000, (0.004, 0.012)) * 0.4, 4.4, 0.4)       # soda fizz on Earth
S(burp("fail", r_()), at("cant") - 0.02, 0.8)
S(burp("clean", r_(), 88), at("burp", 1) - 0.02, 1.0)
S(G.bubbles(3.0, r_(), 18, 200, 900, (0.01, 0.05), rise=(2, 6)) * 0.6, at("mix") - 0.3, 0.45)  # soup gurgle
S(burp("wet", r_(), 80), at("burp", 2) - 0.03, 1.0)
S(G.whoosh(0.7, r_(), 0.45, 300, 2500), at("now") - 0.1, 0.35)
def pssht(r):
    d = 0.55; t = tt(d); return fades(hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.18) * 0.6 + G.bubbles(d, r, 60, 2000, 6000, (0.003, 0.01)) * 0.3, 0.002, 0.05)
for k, p in enumerate([-0.5, 0.0, 0.5]): S(pssht(r_()), at("opened") - 0.05 + k * 0.09, 0.55, p)
for k, p in enumerate([-0.4, 0.4, 0.0]): S(G.bubbles(0.4, r_(), 25, 300, 1200, (0.01, 0.03)) * 0.5, at("sip") + k * 0.05, 0.4, p)   # gulps
S(G.bubbles(1.8, r_(), 40, 300, 1500, (0.008, 0.03)) * 0.5, at("bubbles") - 0.1, 0.45)
S(burp("wet", r_(), 92), at("wet", 1) - 0.03, 1.0, -0.3); S(burp("wet", r_(), 76), at("wet", 1) + 0.25, 0.9, 0.35)
S(burp("wet", r_(), 68), at("burps") - 0.03, 1.1, 0.0)
S(G.push_thump(r_()), at("menu") - 0.05, 0.5)
t = tt(0.25); S(hp(R.standard_normal(len(t)), 1500) * np.exp(-t / 0.1) * 0.4, at("menu") + 0.05, 0.4)   # marker scribble
S(G.push_thump(r_()), at("hard") - 0.04, 0.8); S(G.whoosh(1.4, r_(), 0.25, 200, 1800, tail=0.6), at("hard"), 0.55)
S(G.clink(r_(), 700, 0.2, 0.8), at("food", 2) + 0.4, 0.45)   # catches the rail
S(burp("clean", r_(), 96), at("burp", 3) - 0.02, 1.1)
S(G.whoosh(1.0, r_(), 0.4, 250, 2000), 50.75, 0.35)
S(burp("tiny", r_(), 160), at("burp", 4) - 0.02, 0.8)
for f in [96, 270, 600, 700, 870, 1135, 1525]: S(G.whoosh(0.45, r_(), 0.3, 300, 2000), f / FPS - 0.3, 0.12)

# ---------------- mix ----------------
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12)); gain_m = 10 ** ((-6.0 * duck) / 20)
stop = np.ones(N); i0, i1 = ns(33.55), ns(35.95); stop[i0:i1] = 0.0; stop = ndimage.uniform_filter1d(stop, ns(0.05))   # dead stop for the peak
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
v = to_lufs(v, V_T); m = to_lufs(mus, V_T - 9.0 + 3.0) * gain_m * stop; s = to_lufs(sfx, V_T - 7.0 - 4.0)
mix = to_lufs(v + m + s, -15.0)
ceil = 10 ** (-1.5 / 20)
mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
mix = fades(mix, 0.002, 0.4)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print("mix LUFS", round(integrated(mix), 2), "len", mix.shape[1] / SR)
