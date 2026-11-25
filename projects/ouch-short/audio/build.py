# Sound for "Why We Say Ow": morning hallway ambience, the toe-stub thud + BEAN's dramatic "OW!", a coffee splash, an X-ray
# freeze (whoosh + zap pulse up the nerve + brain ding), four country "ow"s on a tiny planet + an "AHHH" chorus ring, the lab
# (ice clinks, shiver chatter, stopwatch ticks, score-bar risers), a drama sting for the turn, censor BEEPs for the swearing
# peak, a fizzle for "FOUCH", and the callback stub + BEEP. Score: sneaky pizzicato/pluck that freezes for the X-ray, a
# bouncy world tour, a curious lab groove, a dead-stop + sting at the turn.
import json, os, sys
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase, peq
from instruments import m2f, brass, glock, vibes, musicbox, triangle, pluck, pad, cymbal, timpani, snare, snare_roll
import sfx_gen as G
from sfx_gen import vox, vowel_track, _track

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)
FPS, TOTAL = 30, 1995
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(2015)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
mus = np.zeros((2, N)); sfx = np.zeros((2, N))
def M(x, t, g=1.0, p=0.0): place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
STUB1, STUB8 = 0.55, 63.3

def yell(r, segs, fpts, d, base, scale=1.0, breath=0.3):
    n = ns(d); t = np.arange(n) / SR
    f0 = base * _track(n, fpts, t)
    amp = np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.1, 0, 1)
    return fades(vox(f0, vowel_track(n, segs), amp, r, scale, tilt=1.0, breath=breath), 0.003, 0.05)
def ow(r, base=150, scale=1.0, d=0.55): return yell(r, [(0, "a"), (d * 0.5, "a"), (d, "u")], [(0, 1.3), (d * 0.25, 1.6), (d, 0.9)], d, base, scale)
def aie(r, base=170, scale=1.05, d=0.5): return yell(r, [(0, "a"), (d * 0.5, "e"), (d, "i")], [(0, 1.4), (d * 0.3, 1.55), (d, 1.0)], d, base, scale)
def ay(r, base=160, scale=1.0, d=0.45): return yell(r, [(0, "a"), (d * 0.55, "e"), (d, "i")], [(0, 1.3), (d * 0.3, 1.5), (d, 1.05)], d, base, scale)
def av(r, base=140, scale=0.98, d=0.45): return yell(r, [(0, "a"), (d * 0.6, "U"), (d, "u")], [(0, 1.25), (d * 0.3, 1.5), (d, 0.95)], d, base, scale)
def thud(r):
    t = tt(0.35); return fades(lp(r.standard_normal(len(t)), 260) * np.exp(-t / 0.05) * 1.4 + np.sin(phase(90 * np.exp(-t / 0.08) + 50)) * np.exp(-t / 0.09) * 0.8, 0.001, 0.05)
def beep(d=0.55):
    t = tt(d); return fades(np.sin(2 * np.pi * 1000 * t) * 0.5, 0.004, 0.01)
def zap(d=1.6):
    t = tt(d); f = 300 * np.exp(t * 1.6); return fades(np.sin(phase(f)) * 0.15 * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 30 * t))) + hp(R.standard_normal(len(t)), 3000) * 0.05, 0.02, 0.1)
def fizzle(r):
    t = tt(0.9); return fades(G.bubbles(0.9, r, 60, 2000, 7000, (0.002, 0.008)) * np.exp(-t / 0.4) + np.sin(phase(600 * np.exp(-t * 1.5))) * 0.15 * np.exp(-t / 0.3), 0.005, 0.1)

# ---------------- music ----------------
C = {"C": [48, 55, 64, 67], "Am": [45, 52, 60, 64], "F": [41, 48, 57, 64], "G": [43, 50, 59, 62], "Dm": [50, 57, 62, 65], "E": [40, 47, 56, 59]}
def padc(ch, t, d, vel=0.3, warm=900): M(pad([m2f(m) for m in C[ch]], d, vel, r_(), att=0.4, rel=0.8, warm=warm), t, 0.5)
def plk(m, t, v=0.5, p=0.0): M(pluck(m2f(m), v, r_(), 0.6, 0.55), t, 0.5, p)
BEAT = 60 / 112
# hook: a sneaky tiptoe pizzicato, then a dramatic soap-opera chord on "dramatic"
for k, m in enumerate([60, 67, 63, 67, 60, 67, 63, 68]): plk(m, 0.0 + k * BEAT * 0.5, 0.45, -0.3 + 0.6 * (k % 2))
for k, m in enumerate([72, 71, 70, 69]): plk(m, 3.4 + k * BEAT * 0.5, 0.4)
for m in (45, 52, 57, 60, 64): M(brass(m2f(m), 1.4, 0.8, r_(), kind="horn"), at("dramatic") + 0.1, 0.35)
M(timpani(m2f(33), 0.7, r_()), at("dramatic") + 0.1, 0.5); M(cymbal(0.4, r_(), 2.0), at("dramatic") + 0.1, 0.25)
# x-ray: frozen shimmering pad + glock
for b, ch in enumerate(["Am", "F", "Dm", "E", "Am", "F"]): padc(ch, 8.3 + b * 1.85, 1.85, 0.28, 650)
for k in range(14): M(glock(m2f([76, 79, 83, 84][k % 4]), 0.25, r_(), 1.0), 9.2 + k * 0.13, 0.3, 0.4 * np.sin(k))
for i, m in enumerate([72, 76, 79]): M(vibes(m2f(m), 0.5, r_()), at("less") + i * 0.1, 0.45)
# world tour: bouncy major C-G-Am-F with plucks
t0 = 19.6
for b in range(13):
    ch = ["C", "G", "Am", "F"][b % 4]; padc(ch, t0 + b * 4 * BEAT * 0.5, 4 * BEAT * 0.5, 0.22, 1300)
    for k, m in enumerate([C[ch][0] + 12, C[ch][2], C[ch][3], C[ch][2]]): plk(m, t0 + b * 4 * BEAT * 0.5 + k * BEAT * 0.5, 0.42, -0.2 + 0.4 * (k % 2))
for m in (60, 64, 67, 72): M(brass(m2f(m), 0.9, 0.7, r_(), kind="horn"), at("ah") - 0.03, 0.3)
# lab: curious minor groove (Am-Dm-E-Am) with musicbox
for b in range(8):
    ch = ["Am", "Dm", "E", "Am"][b % 4]; padc(ch, 33.6 + b * 1.9, 1.9, 0.25, 800)
    for k in range(4): M(musicbox(m2f(C[ch][2] + 12 + [0, 3, 7, 3][k]), 0.35, r_()), 33.6 + b * 1.9 + k * 0.47, 0.35, 0.2)
for i, m in enumerate([72, 76, 79, 84]): M(glock(m2f(m), 0.5, r_()), at("longer") - 0.2 + i * 0.07, 0.4)
for i, m in enumerate([60, 58, 55]): plk(m, at("help") + i * 0.18, 0.5)
# the turn: dead stop, then a drama sting
M(timpani(m2f(31), 0.8, r_()), at("another") - 0.05, 0.55)
for m in (38, 45, 50, 53): M(brass(m2f(m), 1.8, 0.85, r_(), kind="tuba" if m < 45 else "horn"), at("stronger") - 0.05, 0.4)

# after the peak: a cheeky groove to the end
for b in range(6):
    ch = ["C", "G", "F", "G"][b % 4]; padc(ch, 52.8 + b * 1.6, 1.6, 0.22, 1100)
    for k, m in enumerate([C[ch][0] + 12, C[ch][2], C[ch][3], C[ch][2]]): plk(m, 52.8 + b * 1.6 + k * 0.4, 0.38)
for i, m in enumerate([67, 66, 65, 64]): plk(m, at("work") + i * 0.2, 0.45)
for b, ch in enumerate(["F", "G", "C"]): padc(ch, 62.2 + b * 0.8, 0.8, 0.3, 1400)
M(triangle(0.4, r_()), at("toes") + 0.7, 0.3)

# ---------------- sfx ----------------
S(G.bird_chirps(8.2, r_(), 0.5) * 0.5, 0.0, 0.2); S(G.bird_chirps(4.0, r_(), 0.5) * 0.5, 62.2, 0.2)
for k in range(16): t = tt(0.03); S(hp(R.standard_normal(len(t)), 3000) * np.exp(-t / 0.006) * 0.25, 0.0 + k * 0.5, 0.2, 0.5)   # hall clock
for k in range(3): S(G.stroll_step(r_(), 0.6) * 0.5, 0.05 + k * 0.17, 0.35)   # slipper shuffles
S(thud(r_()), STUB1, 1.0); S(G.wood_crack(r_()) * 0.3, STUB1, 0.4)
S(ow(r_(), 160, 1.05, 0.75), at("ow") - 0.02, 0.9)
S(G.splash_big(r_()) * 0.25, STUB1 + 0.15, 0.35)   # coffee slosh
for k in range(4): S(G.stroll_step(r_(), 0.2) * 0.6, 2.0 + k * 0.32, 0.35, 0.2 * (k % 2 * 2 - 1))   # hops
S(G.whoosh(0.9, r_(), 0.4, 200, 2500), 8.0, 0.5)   # freeze
S(zap(), at("races") - 0.05, 0.6)
t = tt(1.2); S(np.sin(2 * np.pi * 1760 * t) * np.exp(-t / 0.4) * 0.3, at("split") + 0.35, 0.5)   # brain ding
S(ow(r_(), 150, 1.0, 0.6), at("ow", 1) + 0.3, 0.4)   # the "ow" in the x-ray
# world tour
for name, fn, base, p in [("ow", ow, 140, -0.4), ("aïe", aie, 230, 0.4), ("ay", ay, 175, -0.3), ("av", av, 120, 0.3)]:
    tw = [w["s"] for w in words if w["w"].strip('.,?!:"').lower() == name][0] if name != "ow" else at("ow", 2)
    S(thud(r_()) * 0.6, tw - 0.35, 0.5, p); S(fn(r_(), base), tw - 0.18, 0.55, p)
for k in range(24): S([ow, aie, ay, av][k % 4](r_(), float(R.uniform(110, 260)), float(R.uniform(0.9, 1.15))), at("checked") + float(R.uniform(0, 3.2)), 0.12, float(R.uniform(-0.9, 0.9)))
chorus = np.zeros(ns(1.8))
for k in range(10):
    y = yell(r_(), [(0, "a"), (1.6, "a")], [(0, 1.0), (1.6, 0.98)], 1.6, float(R.uniform(110, 260)), float(R.uniform(0.9, 1.1)), 0.2); chorus[:len(y)] += y * 0.25
S(chorus, at("ah") - 0.05, 0.5)
# lab
for k in range(6): S(G.clink(r_(), float(R.uniform(1800, 3200)), 0.2, 1.0), 33.9 + k * 0.6, 0.25, float(R.uniform(-0.6, 0.6)))
S(G.splash_big(r_()) * 0.4, at("ice") - 0.05, 0.4, -0.3); S(G.splash_big(r_()) * 0.4, at("ice") + 0.05, 0.4, 0.3)
chatter = np.zeros(ns(1.2))
for k in range(18): x = G.clink(r_(), float(R.uniform(2500, 4000)), 0.03, 1.0); i = ns(k * 0.065); chatter[i:i + len(x)] += x[:len(chatter) - i] * 0.5
S(chatter, at("could") - 0.2, 0.3)
for k in range(int((46.5 - 39.5) / 0.5)): t = tt(0.03); S(np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.008) * 0.2, 39.5 + k * 0.5, 0.2, 0.6)   # stopwatch
S(ow(r_(), 150, 1.0, 0.5), at("ow", 4) - 0.6, 0.35)   # the volunteer says "ow"
for w_ in ("longer",): t = tt(0.8); S(np.sin(phase(np.geomspace(300, 900, len(t)))) * 0.2 * fades(np.ones(len(t)), 0.02, 0.1), at(w_) - 0.7, 0.35)   # bar riser
S(G.push_thump(r_()) * 0.6, at("didnt") - 0.05, 0.4)
S(beep(0.6), at("swearing") + 0.05, 0.9); S(beep(0.35), at("swore") + 0.1, 0.6)
t = tt(1.0); S(np.sin(phase(np.geomspace(250, 1200, len(t)))) * 0.22, at("third") - 0.8, 0.4)   # big riser
S(yell(r_(), [(0, "o"), (0.3, "U"), (0.5, "u")], [(0, 1.3), (0.5, 1.1)], 0.5, 150), at("made-up") + 0.55, 0.45)   # "FOUCH!"
S(fizzle(r_()), at("didnt", 1) - 0.25, 0.5)
S(beep(0.25), at("all") + 0.45, 0.35)   # the sailor's mutter
S(thud(r_()), STUB8, 1.0); S(beep(0.7), STUB8 + 0.15, 1.0)
for f in [250, 590, 1000, 1460, 1545, 1660, 1865]: S(G.whoosh(0.5, r_(), 0.3, 300, 2400), f / FPS - 0.3, 0.2)

# ---------------- mix ----------------
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12)); gain_m = 10 ** ((-6.0 * duck) / 20)
stop = np.ones(N)
for a, b in [(48.9, 49.25), (51.5, 52.6)]: stop[ns(a):ns(b)] = 0.0
stop = ndimage.uniform_filter1d(stop, ns(0.05))
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
v = to_lufs(v, V_T); m = to_lufs(mus, V_T - 9.0 + 3.0) * gain_m * stop; s = to_lufs(sfx, V_T - 7.0 - 4.0)
mix = to_lufs(v + m + s, -15.0)
ceil = 10 ** (-1.5 / 20)
mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
mix = fades(mix, 0.002, 0.4)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print("mix LUFS", round(integrated(mix), 2), "len", mix.shape[1] / SR)
