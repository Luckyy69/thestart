# Sound for "The Jet That Ran Out of Fuel": a calm, warm score (vibes + music box + soft tuba + light brushes) that
# thins out to nearly nothing when the engines stop, a tense pulse for the glide, a bright resolution when everyone
# walks away. SFX: airport bustle, jet whine, kitchen clinks, warning chimes, engine spool-downs, wind-only cockpit,
# racetrack karts + crowd, slip wind rush, touchdown screech, scrape + sparks, extinguisher bursts, cheers.
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase
from instruments import m2f, brass, glock, vibes, musicbox, triangle
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 2090
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(11)
r_ = lambda: rng(int(R.integers(1 << 30)))
W = {w["w"].strip(".,?!:").lower() + f"@{i}": w["s"] for i, w in enumerate(words)}
def at(word, n=0):
    hits = [w["s"] for w in words if w["w"].strip(".,?!:").lower() == word]
    return hits[n]

# ---------------- music ----------------
mus = np.zeros((2, N))
def note(x, t, g=1.0, p=0.0): place(mus, pan(x, p), t, g)
BPM = 84.0; BEAT = 60 / BPM
CH = {"D": [50, 57, 62, 66, 69], "Bm": [47, 54, 59, 62, 66], "G": [43, 50, 55, 59, 62], "A": [45, 52, 57, 61, 64], "Em": [40, 47, 52, 55, 59]}
def bar(t0, ch, vel=0.5, arp=True, bass=True, box=None):
    c = CH[ch]
    if bass: note(brass(m2f(c[0]), BEAT * 1.8, vel * 0.55, r_(), kind="tuba"), t0, 0.7); note(brass(m2f(c[1] - 12), BEAT * 1.5, vel * 0.4, r_(), kind="tuba"), t0 + 2 * BEAT, 0.6)
    if arp:
        for i, m in enumerate([c[2], c[3], c[4], c[3], c[2] + 12, c[4], c[3], c[4]]):
            note(vibes(m2f(m + 12), vel * 0.5, r_(), 1.6), t0 + i * BEAT / 2, 0.45, -0.3 + 0.6 * (i % 2))
    if box:
        for i, m in enumerate(box):
            if m: note(musicbox(m2f(m), vel * 0.6, r_(), 1.4), t0 + i * BEAT, 0.5, 0.2)
PROG = ["D", "Bm", "G", "A"]
MEL = [[74, None, 78, 76], [74, None, 71, None], [71, 74, 79, 78], [76, None, None, None]]
def section(t0, t1, vel=0.5, mel=True, prog=PROG, arp=True, bass=True):
    nb = int((t1 - t0) / (4 * BEAT))
    for b in range(nb): bar(t0 + b * 4 * BEAT, prog[b % len(prog)], vel, arp, bass, MEL[b % 4] if mel else None)
# hook: a single held vibes chord over silence (engines dead), then theme
for m in [62, 66, 69, 74]: note(vibes(m2f(m + 12), 0.4, r_(), 4.5), 0.2, 0.5)
note(glock(m2f(86), 0.5, r_()), at("units"), 0.5)
section(5.3, 27.0, 0.5, True)                                   # 1983 .. takeoff
section(27.0, at("left") - 0.1, 0.42, False, ["D", "D"], True, True)
note(glock(m2f(69), 0.4, r_()), at("left"), 0.4); note(glock(m2f(66), 0.4, r_()), at("right", 1), 0.4)
for k in range(10): note(brass(m2f(38), 0.6, 0.35, r_(), kind="tuba"), 32.4 + k * 1.2, 0.6)   # low heartbeat under the dark cockpit
for i, m in enumerate([74, 78, 81, 86]): note(musicbox(m2f(m), 0.6, r_()), at("gliders") + i * 0.18, 0.55)   # "flies gliders"
note(brass(m2f(46), 1.2, 0.6, r_(), kind="horn", fall=-120), at("unluckily"), 0.5)
section(41.0, 44.5, 0.45, False, ["G", "A"], True, False)       # racetrack: light bounce
for k in range(14): note(brass(m2f(38 + (k % 2) * 7), 0.35, 0.45 + 0.02 * k, r_(), kind="tuba"), 44.6 + k * 0.55, 0.65)  # tense pulse, slip
for m in [50, 57, 62, 65]: note(brass(m2f(m), 1.6, 0.8, r_(), kind="horn"), at("collapses"), 0.45)      # impact chord
section(at("walk") - 0.2, DUR - 1.0, 0.55, True, ["D", "G", "A", "D"])   # resolution + finale
for m in [62, 66, 69, 74, 78]: note(vibes(m2f(m + 12), 0.5, r_(), 4.0), DUR - 3.0, 0.45)
note(triangle(0.5, r_()), DUR - 3.0, 0.3)

# ---------------- sfx ----------------
sfx = np.zeros((2, N))
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def env_span(segs, fade=0.4):
    e = np.zeros(N)
    for a, b, g in segs: e[ns(a):ns(b)] = np.maximum(e[ns(a):ns(b)], g)
    return ndimage.uniform_filter1d(e, ns(fade))
def bed(x): x = np.asarray(x); x = x[0] if x.ndim == 2 else x; return np.pad(x, (0, max(0, N - len(x))))[:N]
FR = lambda f: f / FPS
# jet cabin/cruise roar (engines on), wind-only glide
roar = lp(colored(N, r_(), 1.0), 900) * 0.5 + bp(colored(N, r_(), 0.3), 2500, 6000, 1) * 0.08
whine = np.sin(phase(np.full(N, 3100.0) + 40 * smooth_noise(N, r_(), 0.5))) * 0.02
eng = env_span([(FR(161), FR(478), 0.35), (FR(701), FR(810), 1.0), (FR(810), at("left") + 0.3, 0.7), (at("left") + 0.3, at("right", 1) + 0.4, 0.4), (FR(1865), DUR, 0.6)], 0.8)
S((roar + whine) * eng, 0, 0.6)
wind = bp(colored(N, r_(), 0.8), 300, 2600, 1) * (0.6 + 0.4 * smooth_noise(N, r_(), 0.4))
wenv = env_span([(0, FR(161), 0.8), (at("right", 1) + 0.5, FR(1132), 0.9), (FR(1337), FR(1573), 1.0)], 0.6)
S(wind * wenv, 0, 0.35)
# spool-downs (falling whine) + RAT clunk
for tw, p in [(at("left"), -0.6), (at("right", 1), 0.6)]:
    t = tt(2.6); f = 3100 * np.exp(-t / 0.9) + 120
    S(np.sin(phase(f)) * np.exp(-t / 1.4) * 0.2 + lp(colored(len(t), r_(), 1), 400) * np.exp(-t / 0.8) * 0.3, tw - 0.05, 0.6, p)
S(G.push_thump(r_()), at("right", 1) + 0.7, 0.4)
# warning chimes (cockpit triple chime) from "warning" until "dark"
def chime(): t = tt(0.5); return (np.sin(phase(np.full(len(t), 1318.5))) + 0.6 * np.sin(phase(np.full(len(t), 1046.5)))) * np.exp(-t / 0.18) * 0.25
tc = at("warning")
while tc < at("dark"): S(chime(), tc, 0.6, -0.2); tc += 0.75
t = tt(0.25); S(lp(colored(len(t), r_(), 0.5), 3000) * np.exp(-t / 0.04) * 0.5, at("dark"), 0.4)   # screens click off
# airport bustle + fuel pump
S(bed(G.babble(FR(478) - FR(161), r_(), 140, 1.0)) * 0.0, 0)
for k in range(6): S(G.babble(2.6, r_(), 120 + 30 * k, 1.0) * 0.4, FR(161) + 0.5 * k, 0.12, -0.6 + 0.24 * k)
pump = lp(colored(ns(FR(478) - FR(270)), r_(), 1.2), 220) * 0.5; S(fades(pump, 0.3, 0.4), FR(270), 0.3, -0.3)
# kitchen: cup scoop, spoon clink, puff
S(G.clink(r_(), 2200, 0.1, 0.6), at("cups") - 0.05, 0.4); S(G.clink(r_(), 3400, 0.06, 0.9) * 0.6, at("spoons"), 0.45)
# takeoff roar swell
t = tt(3.8); S(lp(colored(len(t), r_(), 1.0), 1400) * np.minimum(1, t / 1.2) * np.exp(-np.maximum(0, t - 2.6) / 0.8), FR(701), 0.7)
# racetrack: kart buzz + crowd
kenv = env_span([(FR(1132), FR(1337), 1.0)], 0.5)
kart = np.zeros(N)
for k in range(4):
    f0 = 95 + 18 * k; fm = f0 * (1 + 0.15 * np.sin(np.arange(N) / SR * (0.7 + 0.2 * k) * 2 * np.pi))
    kart += np.sign(np.sin(phase(fm))) * 0.05
S(lp(kart, 1800) * kenv, 0, 0.35)
for k in range(10): S(G.babble(3.0, r_(), 120 + 22 * k, 1.0) * 0.5, FR(1236) + 0.15 * k, 0.16, -0.8 + 0.18 * k)
S(G.whoa(r_()), at("go-karts") + 0.4, 0.3, 0.3)
# slip rush + touchdown screech, collapse thud, scrape + sparks
t = tt(3.0); S(bp(colored(len(t), r_(), 0.5), 400, 3000, 1) * np.minimum(1, t / 0.8) * np.exp(-np.maximum(0, t - 2.0) / 0.6), at("drops") - 0.4, 0.5)
t = tt(0.8); S(bp(R.standard_normal(len(t)), 1800, 4200, 2) * np.exp(-t / 0.3) * 0.6, FR(1573) + 0.1, 0.5, -0.2)
S(G.wood_crack(r_()) * 0.5, at("collapses") - 0.02, 0.6)
scr = (bp(R.standard_normal(ns(3.4)), 900, 5000, 2) * 0.5 + hp(R.standard_normal(ns(3.4)) * (R.random(ns(3.4)) < 0.004) * 6, 3000))
S(fades(scr * (0.7 + 0.3 * smooth_noise(ns(3.4), r_(), 8)), 0.05, 0.8), at("collapses") + 0.2, 0.5)
# racers + extinguishers, then cheers
for k in range(6): S(G.stroll_step(r_(), 0.7), at("racers") + 0.2 + k * 0.22, 0.25)
for k in range(5):
    t = tt(0.7); S(hp(R.standard_normal(len(t)), 1500) * np.exp(-t / 0.35) * 0.35, at("extinguishers") + k * 0.35, 0.45, -0.4 + 0.2 * k)
S(bed(G.applause(3.5, r_(), 40)), at("walk") - 0.4, 0.3)
# cut whooshes + finale flyby
for f in [161, 270, 405, 478, 701, 810, 971, 1048, 1132, 1236, 1337, 1573, 1716, 1792]: S(G.whoosh(0.5, r_(), 0.32, 300, 2000), FR(f) - 0.32, 0.18)
S(G.whoosh(2.4, r_(), 1.2, 250, 1800, tail=0.8), FR(1865) - 0.2, 0.35)

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
