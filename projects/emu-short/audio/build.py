# Sound for "The War Australia Lost to Birds": a bouncy comic military march (tuba oom-pah, snare, glock melody, brass
# stabs) that stops dead for jokes; SFX: emu booming/drumming + clucks, a slide whistle and a sad-trombone "wah wah",
# phone ring, machine-gun bursts, the jam (clunk + spring boing), a 1930s truck engine with backfires, whooshes, the
# emu "cheer", a final fanfare + sad trombone.
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase
from instruments import m2f, brass, glock, vibes, triangle
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1800
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(1932)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').lower() == word][n]
FR = lambda f: f / FPS
mus = np.zeros((2, N))
def note(x, t, g=1.0, p=0.0): place(mus, pan(x, p), t, g)
BPM = 116.0; BEAT = 60 / BPM
CH = {"C": (48, 55), "G": (43, 50), "F": (41, 48), "D": (50, 57)}
MEL = [[72, 72, 74, 76], [79, 76, 72, None], [74, 74, 76, 77], [79, 77, 74, None], [72, 76, 79, 84], [81, 79, 76, 74], [72, 74, 76, 74], [72, None, None, None]]
def bar(t0, ch, mel=None, vel=0.55, snare=True):
    r, f = CH[ch]
    for k in range(4):
        tb = t0 + k * BEAT
        if k % 2 == 0: note(brass(m2f(r if k == 0 else f), BEAT * 0.7, vel, r_(), kind="tuba"), tb, 0.85)
        else: note(brass(m2f(r + 16), BEAT * 0.3, vel * 0.4, r_(), kind="horn"), tb, 0.45, 0.3)
        if snare and k in (1, 3):
            n = R.standard_normal(ns(0.15)); x = np.arange(len(n)) / SR; note(bp(n, 1500, 7000, 2) * np.exp(-x / 0.045) * 0.3 * vel, tb, 1.0, -0.2)
    if mel:
        for i, m in enumerate(mel):
            if m: note(glock(m2f(m), 0.55, r_(), 1.0), t0 + i * BEAT, 0.55, 0.15)
def march(t0, t1, prog=("C", "G", "C", "G", "F", "C", "G", "C"), vel=0.55):
    for b in range(int((t1 - t0) / (4 * BEAT))): bar(t0 + b * 4 * BEAT, prog[b % len(prog)], MEL[b % len(MEL)], vel)
def stab(t, ch="C", vel=0.9):
    r, f = CH[ch]
    for m in (r + 12, f + 12, r + 16 + 12): note(brass(m2f(m), 0.4, vel, r_(), kind="horn"), t, 0.5)
    note(brass(m2f(r), 0.5, vel, r_(), kind="tuba"), t, 0.8)
def wahwah(t):   # sad trombone: four falling notes, the last one wobbling down
    for i, m in enumerate([58, 57, 56, 55]): note(brass(m2f(m), 0.5 if i < 3 else 1.3, 0.8, r_(), kind="horn", fall=(-180 if i == 3 else 0)), t + i * 0.42, 0.55)
stab(0.05, "C"); stab(W_LOST := at("lost") - 0.05, "G", 0.7)
march(5.2, 13.5)                                    # farmers -> emus arrive
march(16.1, 21.3, ("C", "G", "C", "G"), 0.6)         # the line-up
stab(at("easy") - 0.05, "C", 0.8)
march(22.6, 26.6, ("D", "G", "D", "G"), 0.5)         # the ambush (tense-ish)
wahwah(at("jams") + 0.1)
march(28.2, 35.8, ("C", "G", "F", "G"), 0.6)         # truck chase, double time feel
wahwah(at("up") + 0.05)
march(35.8, 44.3, ("F", "C", "G", "C"), 0.5)
for i, m in enumerate([72, 67, 64, 60]): note(glock(m2f(m), 0.5, r_()), at("home") + 0.1 + i * 0.18, 0.5)
march(45.0, 51.3, ("C", "G", "C", "G"), 0.45)
stab(at("great") - 0.05, "C", 0.9)
for i, m in enumerate([60, 64, 67, 72]): note(brass(m2f(m), 0.35 if i < 3 else 1.0, 0.9, r_(), kind="horn"), at("final") + i * 0.16, 0.5)  # fanfare
wahwah(at("zero") - 0.05)
note(triangle(0.5, r_()), DUR - 1.2, 0.3)

sfx = np.zeros((2, N))
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def boom(d=0.9):  # emu drumming: low pulsing thrum
    t = tt(d); return fades(np.sin(phase(np.full(len(t), 85.0))) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) * np.exp(-t / 0.5) * 0.6, 0.02, 0.15)
def cluck():
    t = tt(0.12); return fades(bp(R.standard_normal(len(t)), 600, 2600, 2) * np.exp(-t / 0.03) + np.sin(phase(np.full(len(t), 320.0))) * np.exp(-t / 0.04) * 0.5, 0.002, 0.03)
def slide(t0, up=True, d=0.6):
    t = tt(d); f = np.geomspace(500, 1800, len(t)) if up else np.geomspace(1800, 400, len(t)); S(fades(np.sin(phase(f)) * 0.25, 0.01, 0.08), t0, 0.6)
def burst(d=1.2):
    out = np.zeros(ns(d))
    for k in range(int(d / 0.085)):
        L = ns(0.08); c = np.zeros(L); wc = G.wood_crack(r_())[:L]; c[:len(wc)] = wc
        x = c * 0.35 + hp(R.standard_normal(L), 800) * np.exp(-np.arange(L) / SR / 0.02) * 0.6
        i = ns(k * 0.085); out[i:i + len(x)] += x[:len(out) - i]
    return out
def ring(d=1.4):
    t = tt(d); y = (np.sin(phase(np.full(len(t), 1100.0))) + np.sin(phase(np.full(len(t), 1650.0)))) * (np.sin(2 * np.pi * 22 * t) > 0) * ((t % 0.7) < 0.45) * 0.12
    return fades(y, 0.01, 0.05)
def engine(d):
    t = tt(d); y = (np.sign(np.sin(phase(28 + 4 * np.sin(t * 3)))) * 0.15 + lp(colored(len(t), r_(), 1.2), 300) * 0.5)
    return fades(lp(y, 900), 0.2, 0.3)
for tb in [0.9, 2.0, 3.0]: S(boom(), tb, 0.45)
S(cluck(), at("birds") + 0.3, 0.6); slide(at("lost") + 0.25, False)
S(G.babble(2.0, r_(), 120, 1.0) * 0.3, 6.0, 0.15)
for k in range(40): S(cluck(), at("twenty") + float(R.uniform(0, 2.6)), 0.3, float(R.uniform(-0.8, 0.8)))
for k in range(6): S(boom(0.7), at("emus") + k * 0.4, 0.25, float(R.uniform(-0.6, 0.6)))
S(ring(), at("called") - 0.6, 0.6)
for w_ in ["major", "soldiers", "guns", "bullets"]: S(G.push_thump(r_()), at(w_) - 0.05, 0.45)
slide(at("right") + 0.1, True)
for k in range(30): S(cluck(), at("thousand") + float(R.uniform(-0.5, 1.8)), 0.25, float(R.uniform(-0.8, 0.8)))
S(burst(1.1), at("gun") - 1.2, 0.6)
S(G.clink(r_(), 900, 0.15, 1.0), at("jams") - 0.02, 0.7)
t = tt(0.7); S(np.sin(phase(380 + 260 * np.sin(2 * np.pi * 14 * t) * np.exp(-t / 0.25))) * np.exp(-t / 0.35) * 0.3, at("jams") + 0.12, 0.7)  # boing
for k in range(25): S(cluck(), at("twelve") + float(R.uniform(0, 1.2)), 0.3, float(R.uniform(-0.8, 0.8)))
S(engine(FR(1076) - FR(848)), FR(848), 0.55)
for tb in [30.6, 33.4, 35.1]: S(G.wood_crack(r_()) * 0.5, tb, 0.45)   # backfires
for k in range(16): S(G.stroll_step(r_(), 0.2) * 0.6, 31.6 + k * 0.12, 0.25, float(R.uniform(-0.5, 0.5)))  # running feet
slide(at("lookout") + 0.1, True, 0.5)
S(G.whoosh(0.6, r_(), 0.3, 300, 2200), at("guerrilla") - 0.2, 0.3)
for k in range(12): S(cluck(), at("score") + float(R.uniform(0.6, 3.0)), 0.35, float(R.uniform(-0.8, 0.8)))
S(G.applause(2.5, r_(), 25), at("one") + 0.1, 0.3)
wind = bp(colored(N, r_(), 0.8), 200, 2500, 1) * 0.2
S(wind, 0, 0.3)
for f in [119, 161, 320, 411, 487, 643, 683, 790, 848, 937, 1076, 1205, 1271, 1351, 1549, 1621]: S(G.whoosh(0.45, r_(), 0.3, 300, 2000), FR(f) - 0.3, 0.13)

vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12)); gain_m = 10 ** ((-6.0 * duck) / 20)
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
v = to_lufs(v, V_T); m = to_lufs(mus, V_T - 9.0 + 3.0) * gain_m; s = to_lufs(sfx, V_T - 7.0 - 6.0)
mix = to_lufs(v + m + s, -15.0)
ceil = 10 ** (-1.5 / 20)
mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
mix = fades(mix, 0.002, 0.4)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print("mix LUFS", round(integrated(mix), 2), "len", mix.shape[1] / SR)
