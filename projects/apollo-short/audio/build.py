# Sound for "The Rocket That Made Its Own Lightning": a tense, cinematic but calm score (low tuba pulses, vibes, music box,
# a held suspense drone under Mission Control, a warm brass resolution on "life", a wondering Moon coda) ducked under
# the voice; SFX: rain, rolling thunder, lightning cracks on every strike, Saturn V roar at liftoff, master-alarm tones,
# Mission Control murmur + radio static, the switch click, cheers, an electric zap for the diagram.
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase
from instruments import m2f, brass, glock, vibes, musicbox, triangle
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1865
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(23)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    hits = [w["s"] for w in words if w["w"].strip('.,?!:"').lower() == word]
    return hits[n]
STRUCK, TWICE, FLASH, BOLT = at("struck") + 0.25, at("twice.") if False else at("twice") - 0.05, at("flash") - 0.05, at("bolt") - 0.05
WIRE, ROD = at("wire") - 0.2, at("rod") - 0.15

# ---------------- music ----------------
mus = np.zeros((2, N))
def note(x, t, g=1.0, p=0.0): place(mus, pan(x, p), t, g)
BPM = 78.0; BEAT = 60 / BPM
CH = {"Dm": [38, 50, 57, 62, 65, 69], "Bb": [34, 46, 53, 58, 62, 65], "F": [41, 53, 57, 60, 65, 69], "C": [36, 48, 55, 60, 64, 67], "Gm": [43, 50, 55, 58, 62, 67], "A": [45, 52, 57, 61, 64, 69]}
def bar(t0, ch, vel=0.45, arp=True, pulse=True):
    c = CH[ch]
    if pulse:
        for k in range(4): note(brass(m2f(c[0]), BEAT * 0.6, vel * (0.6 if k else 0.8), r_(), kind="tuba"), t0 + k * BEAT, 0.6)
    if arp:
        for i, m in enumerate([c[2], c[3], c[4], c[3], c[5], c[4], c[3], c[2]]):
            note(vibes(m2f(m + 12), vel * 0.5, r_(), 1.5), t0 + i * BEAT / 2, 0.4, -0.3 + 0.6 * (i % 2))
def section(t0, t1, prog, vel=0.45, arp=True, pulse=True):
    nb = max(1, int((t1 - t0) / (4 * BEAT)))
    for b in range(nb): bar(t0 + b * 4 * BEAT, prog[b % len(prog)], vel, arp, pulse)
# hook: ominous low chord + glock ping, stingers on strikes
for m in [38, 50, 57, 62]: note(brass(m2f(m), 3.5, 0.5, r_(), kind="horn"), 0.1, 0.4)
section(7.6, 13.6, ["Dm", "Bb"], 0.4, True, False)                          # rainy Florida: soft vibes
for m in [38, 45, 50]: note(brass(m2f(m), 2.2, 0.8, r_(), kind="horn"), at("liftoff") - 0.1, 0.5)  # liftoff swell
section(17.2, 22.9, ["Dm", "Gm"], 0.42, False, True)                        # warning lights: tense pulse
for k in range(16): note(brass(m2f(38 + (k % 2)), 0.4, 0.38 + 0.015 * k, r_(), kind="tuba"), 22.9 + k * 0.42, 0.6)   # MCC heartbeat
for i, m in enumerate([74, 77, 81, 86]): note(musicbox(m2f(m), 0.55, r_()), at("try") + 0.05 + i * 0.16, 0.45)       # "Try SCE to AUX"
section(36.1, 40.6, ["Gm", "A"], 0.35, True, False)                         # memory of the test
for m in [50, 57, 62, 66, 69]: note(brass(m2f(m), 1.8, 0.8, r_(), kind="horn"), at("life") - 0.15, 0.5)   # resolution on "life"
note(triangle(0.5, r_()), at("life") - 0.15, 0.35)
section(46.4, 57.4, ["Dm", "Bb", "F", "C"], 0.4, True, True)               # explanation
section(57.4, DUR - 1.5, ["F", "C", "Dm", "Bb"], 0.45, True, False)       # Moon coda
for m in [53, 57, 60, 65, 69]: note(vibes(m2f(m + 12), 0.5, r_(), 4.5), DUR - 3.2, 0.45)

# ---------------- sfx ----------------
sfx = np.zeros((2, N))
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
FR = lambda f: f / FPS
SHOT = [(0,157,"sky"),(157,233,"sky"),(233,308,"pad"),(308,360,"pad"),(360,415,"cabin"),(415,447,"pad"),(447,524,"sky"),(524,606,"cabin"),(606,689,"sky"),
        (689,1225,"mcc"),(1225,1339,"cabin"),(1339,1395,"mcc"),(1395,1471,"pad"),(1471,1658,"diagram"),(1658,1730,"sky"),(1730,TOTAL,"moon")]
def envfor(places, g=1.0, fade=0.25):
    e = np.zeros(N)
    for a, b, p in SHOT:
        if p in places: e[ns(FR(a)):ns(FR(b))] = g
    return ndimage.uniform_filter1d(e, ns(fade))
rain = bp(colored(N, r_(), 0.2), 800, 9000, 1) * 0.35 + lp(colored(N, r_(), 1.0), 300) * 0.25
S(rain * envfor({"pad"}, 1.0) + rain * envfor({"cabin"}, 0.25), 0, 0.6)
wind = bp(colored(N, r_(), 0.8), 200, 2000, 1) * (0.6 + 0.4 * smooth_noise(N, r_(), 0.3))
S(wind * envfor({"sky"}, 1.0), 0, 0.5)
roar = lp(colored(N, r_(), 1.3), 260) * 1.2 + bp(colored(N, r_(), 0.6), 300, 1800, 1) * 0.35
renv = envfor({"sky"}, 0.8) + envfor({"cabin"}, 0.35) * (np.arange(N) / SR > 17)
ron = np.zeros(N); ron[ns(at("liftoff") - 0.3):ns(FR(447))] = 1; renv += ndimage.uniform_filter1d(ron, ns(0.4))
S(roar * renv, 0, 0.55)
def crack(big=1.0):
    t = tt(1.6); n = R.standard_normal(len(t))
    hit = hp(n, 1500) * np.exp(-t / 0.03) * 1.2 + bp(n, 200, 3000, 2) * np.exp(-t / 0.18) * 0.7
    rumble = lp(colored(len(t), r_(), 1.5), 150) * np.exp(-np.maximum(0, t - 0.05) / 0.8) * 1.6
    return fades((hit + rumble) * big, 0.001, 0.3)
for s in [STRUCK, TWICE, FLASH, BOLT, ROD]: S(crack(1.0), s - 0.02, 0.8, -0.1)
def thunder(d=3.5):
    t = tt(d); return fades(lp(colored(len(t), r_(), 1.6), 120) * (0.3 + smooth_noise(len(t), r_(), 2)) * np.exp(-t / 1.6), 0.4, 0.8)
for s in [8.4, 46.8]: S(thunder(), s, 0.6)
def zap(d=1.6):
    t = tt(d); y = np.sign(np.sin(phase(120 + 60 * np.sin(t * 40)))) * 0.15 + hp(R.standard_normal(len(t)), 2500) * 0.2 * (R.random(len(t)) < 0.3)
    return fades(y * np.exp(-t / 0.9), 0.01, 0.3)
S(zap(), WIRE, 0.5)
# master alarm: two-tone beeps during the warning beat and in the cabin in shot 14 until the flip
def alarm(): t = tt(0.32); return (np.sign(np.sin(phase(np.full(len(t), 750.0)))) * 0.08 + np.sin(phase(np.full(len(t), 1500.0))) * 0.12) * np.minimum(1, t / 0.01) * np.exp(-t / 0.4)
ta = at("warning") - 0.3
while ta < FR(606): S(alarm(), ta, 0.5, 0.2); ta += 0.42
ta = FR(1225)
while ta < at("flips"): S(alarm(), ta, 0.3, 0.2); ta += 0.42
S(G.clink(r_(), 1800, 0.06, 1.0), at("flips") - 0.02, 0.7, 0.3)   # switch click
# Mission Control: murmur + static bursts + cheer
mcc = envfor({"mcc"}, 1.0)
for k in range(10): S(G.babble(FR(1225) - FR(689), r_(), 110 + 20 * k, 1.0) * 0.5 * mcc[ns(FR(689)):ns(FR(1225))], FR(689), 0.13, -0.8 + 0.18 * k)
stat = bp(R.standard_normal(N), 1200, 5000, 2) * (smooth_noise(N, r_(), 6) > 0.6) * 0.25
gar = np.zeros(N); gar[ns(at("garbage") - 0.6):ns(FR(1225))] = 1; gar[ns(FR(1339)):ns(at("life") - 0.5)] = 1
S(stat * ndimage.uniform_filter1d(gar, ns(0.2)), 0, 0.35)
S(G.applause(3.0, r_(), 30), at("life") - 0.1, 0.35)
for k in range(5): S(G.hurrah(r_(), 120 + 25 * k, 1.0), at("life") + 0.1 + 0.1 * k, 0.12, -0.6 + 0.3 * k)
for f in [157, 233, 308, 360, 415, 447, 524, 606, 689, 773, 871, 1001, 1087, 1225, 1339, 1395, 1471, 1658, 1730]: S(G.whoosh(0.5, r_(), 0.32, 300, 2000), FR(f) - 0.32, 0.15)

# ---------------- mix ----------------
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
print("mix LUFS", round(integrated(mix), 2), "len", mix.shape[1] / SR, "peak", float(np.abs(mix).max()))
