# Sound for "Hiccups Come From Tadpoles": kitchen morning (fizz can, birds), synthesized HICs (glottal click + squeak),
# an X-ray hum with a diaphragm "boing" and a slamming throat door, a bubbly underwater pond (harp + bubbles + gulp),
# a whoosh-morph back to the kitchen, a 1922 ragtime piano for the farm, calendar-flip time-lapse, an odometer roll and
# a final giant HIC.
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase
from instruments import m2f, brass, glock, vibes, musicbox, triangle, pluck, pad, cymbal, timpani, snare
import sfx_gen as G
from sfx_gen import vox, vowel_track, _track

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1230
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(1922)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
mus = np.zeros((2, N)); sfx = np.zeros((2, N))
def M(x, t, g=1.0, p=0.0): place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)

def hic(r, base=260, size=0.7, scale=1.0):
    d = 0.13 + 0.05 * size; n = ns(d); t = np.arange(n) / SR
    f0 = base * _track(n, [(0, 1.35), (d * 0.3, 1.1), (d, 0.85)], t)
    amp = np.clip(t / 0.004, 0, 1) * np.exp(-t / (0.05 + 0.03 * size))
    v = vox(f0, vowel_track(n, [(0, "i"), (d, "U")]), amp, r, scale, tilt=0.9, breath=0.5)
    click = hp(r.standard_normal(ns(0.012)), 1500) * np.exp(-np.arange(ns(0.012)) / SR / 0.002) * 1.5
    out = np.zeros(n + ns(0.02)); out[:len(click)] += click; out[ns(0.008):ns(0.008) + n] += v * (0.8 + 0.5 * size)
    return fades(out, 0.001, 0.02)
def boing(r, f0=180, d=0.6):
    t = tt(d); return fades(np.sin(phase(f0 + 120 * np.sin(2 * np.pi * 12 * t) * np.exp(-t / 0.2))) * np.exp(-t / 0.3) * 0.5, 0.002, 0.05)
def slam(r): t = tt(0.25); return fades(lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.03) * 1.2 + np.sin(phase(np.full(len(t), 140.0))) * np.exp(-t / 0.05) * 0.6, 0.001, 0.03)
def gulp(r): t = tt(0.3); return fades(np.sin(phase(np.geomspace(500, 150, len(t)))) * np.exp(-t / 0.12) * 0.5 + G.bubbles(0.3, r, 30, 200, 800, (0.01, 0.03)) * 0.5, 0.002, 0.03)
def click(r, f=3000): t = tt(0.025); return hp(r.standard_normal(len(t)), f) * np.exp(-t / 0.004) * 0.5

# ---------------- music ----------------
C = {"C": [48, 55, 64, 67], "Am": [45, 52, 60, 64], "F": [41, 48, 57, 64], "G": [43, 50, 59, 62], "D": [50, 57, 62, 66], "Em": [40, 47, 55, 59]}
def padc(ch, t, d, vel=0.24, warm=1100): M(pad([m2f(m) for m in C[ch]], d, vel, r_(), att=0.4, rel=0.8, warm=warm), t, 0.5)
def plk(m, t, v=0.42, p=0.0, bright=0.55, dur=0.6): M(pluck(m2f(m), v, r_(), dur, bright), t, 0.5, p)
B = 60 / 116
# kitchen: perky pizzicato with hiccup-shaped rests
for k, m in enumerate([60, 64, 67, 0, 72, 67, 64, 0]): (m and plk(m, 0.4 + k * B * 0.5, 0.4, 0.3 * ((k % 2) * 2 - 1)))
for b, ch in enumerate(["C", "G"]): padc(ch, 0.3 + b * 1.8, 1.8, 0.2, 1400)
# x-ray: blue shimmering pad
for b, ch in enumerate(["Am", "F", "Em", "Am"]): padc(ch, 3.8 + b * 1.85, 1.85, 0.22, 650)
for k in range(8): M(glock(m2f([76, 79, 83, 88][k % 4]), 0.2, r_(), 0.8), 4.0 + k * 0.12, 0.25, 0.4 * np.sin(k))
# pond: underwater harp arpeggios (D major-ish, dreamy)
for b, ch in enumerate(["D", "G", "D", "Em", "D"]): padc(ch, 11.2 + b * 2.2, 2.2, 0.22, 800)
for k in range(44): M(vibes(m2f(C[["D", "G", "D", "Em", "D"][(k // 9) % 5]][k % 4] + 12 + (12 if k % 8 > 3 else 0)), 0.28, r_(), 1.2, None, 4.0, 0.3), 11.3 + k * 0.24, 0.3, 0.5 * np.sin(k * 0.7))
# back in the kitchen: the pizzicato returns, gets anxious on "doesn't stop"
for k, m in enumerate([60, 64, 67, 72, 71, 67, 64, 62] * 2): plk(m, 22.1 + k * B * 0.5, 0.38, 0.3 * ((k % 2) * 2 - 1))
for k, m in enumerate([67, 66, 65, 64]): plk(m, at("sometimes") + k * 0.3, 0.45)
# farm 1922: ragtime piano (bright plucks: oom-pah left hand + syncopated right hand)
t0 = 30.2
for b in range(8):
    ch = ["C", "G", "C", "F", "C", "G", "C", "C"][b]; tb = t0 + b * 4 * B * 0.5
    for k in range(4):
        plk(C[ch][0] - 12 + (0 if k % 2 == 0 else 7), tb + k * B * 0.5, 0.35, -0.3, 0.7, 0.25)
        plk(C[ch][2] + 12 + [0, 4, 7, 4][k], tb + k * B * 0.5 + (0.12 if k % 2 else 0), 0.3, 0.3, 0.9, 0.2)
for m in (60, 64, 67, 72, 76): M(brass(m2f(m), 1.4, 0.85, r_(), kind="horn"), at("hics") + 0.25, 0.32)
M(cymbal(0.5, r_(), 2.4), at("hics") + 0.25, 0.3); M(triangle(0.4, r_()), 40.0, 0.25)

# ---------------- sfx ----------------
S(G.bird_chirps(3.6, r_(), 0.5) * 0.4, 0.0, 0.18); S(G.bird_chirps(8.0, r_(), 0.5) * 0.4, 22.0, 0.18)
S(G.bubbles(0.8, r_(), 50, 1500, 5000, (0.003, 0.01)) * 0.4, 0.0, 0.35)   # fizz in the can
S(G.bubbles(1.2, r_(), 40, 2000, 6000, (0.003, 0.008)) * 0.5, 0.25, 0.4)   # fizz spray on hic 1
S(G.whoosh(0.8, r_(), 0.3, 200, 1500), at("ancestors") - 0.2, 0.25)        # the fish shadow glides
HICS = [(0.25, "bean", 0.8), (at("hic") - 0.05, "bean", 1.0), (at("it", 0) - 0.05, "bean", 0.7), (at("sometimes") + 0.2, "bean", 0.5),
        (at("stop") - 0.35, "bean", 0.6), (at("stop") + 0.35, "bean", 0.7), (at("hiccuping") - 0.05, "osb", 0.7),
        (at("sixty-eight") + 0.3, "osb", 0.5), (at("years") + 0.25, "osb", 0.5), (at("million") - 0.1, "osb", 0.6), (at("hics") + 0.2, "osb", 1.3)]
for tt_, who, size in HICS: S(hic(r_(), 280 if who == "bean" else 200, size, 1.0 if who == "bean" else 0.9), tt_, 0.9 if size >= 1 else 0.7)
S(G.whoosh(0.7, r_(), 0.4, 300, 2500), 3.6, 0.35)   # x-ray scan
hum = np.sin(phase(np.full(N, 110.0))) * 0.05 + lp(colored(N, r_(), 1.0), 400) * 0.15
xr = np.zeros(N); xr[ns(3.9):ns(11.1)] = 1; xr = ndimage.uniform_filter1d(xr, ns(0.3)); S(hum * xr, 0, 0.45)
S(boing(r_()), at("spasming") - 0.15, 0.5); S(G.whoosh(0.6, r_(), 0.2, 300, 2500), at("gasp") - 0.1, 0.4); S(slam(r_()), at("shut") - 0.08, 0.7)
S(G.splash_big(r_()) * 0.5, 11.05, 0.4)   # dive into the water
S(G.water_bed(10.8, r_(), 0.4) * 0.3, 11.2, 0.3)
S(G.bubbles(10.5, r_(), 6, 200, 1200, (0.01, 0.04)) * 0.35, 11.3, 0.3)
S(gulp(r_()), at("gulp") - 0.1, 0.7); S(slam(r_()) * 0.6, at("shut", 1) - 0.08, 0.5)
t = tt(1.0); S(bp(R.standard_normal(len(t)), 300, 1500, 1) * np.sin(np.pi * t) * 0.3, at("water", 1) - 0.2, 0.35)   # gill flow swoosh
t = tt(0.5); S(np.sin(2 * np.pi * 1568 * t) * np.exp(-t / 0.15) * 0.3, at("lungs") + 0.1, 0.4)   # "dry" ding
S(G.whoosh(1.0, r_(), 0.5, 200, 3000), 21.6, 0.45)   # morph
S(G.whoosh(0.6, r_(), 0.4, 300, 2500), 30.1, 0.4)    # whip to 1922
pig = lambda r: fades(np.sin(phase(np.geomspace(500, 900, ns(0.3)))) * (1 + 0.6 * np.sign(np.sin(2 * np.pi * 40 * tt(0.3)))) * 0.15, 0.01, 0.05)
S(pig(r_()), 31.0, 0.35, 0.4)                         # oink-ish squeal
for k in range(int((37.2 - 34.5) / 0.09)): S(click(r_(), 2000) * 0.6, 34.5 + k * 0.09, 0.3, 0.3 * np.sin(k))   # calendar flips
for k in range(int((38.6 - 36.6) / 0.05)): S(click(r_(), 4000) * 0.5, 36.6 + k * 0.05, 0.3, -0.3)              # odometer roll
t = tt(0.4); S(np.sin(2 * np.pi * 1200 * t) * np.exp(-t / 0.1) * 0.35, 38.65, 0.4)                               # odometer ding
for f in [115, 335, 660, 910]: S(G.whoosh(0.45, r_(), 0.3, 300, 2400), f / FPS - 0.3, 0.15)

# ---------------- mix ----------------
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12)); gain_m = 10 ** ((-6.0 * duck) / 20)
stop = np.ones(N); stop[ns(at("sometimes") - 0.2):ns(at("stop") + 0.7)] = 0.25; stop = ndimage.uniform_filter1d(stop, ns(0.1))
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
v = to_lufs(v, V_T); m = to_lufs(mus, V_T - 9.0 + 3.0) * gain_m * stop; s = to_lufs(sfx, V_T - 7.0 - 4.0)
mix = to_lufs(v + m + s, -15.0)
ceil = 10 ** (-1.5 / 20)
mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
mix = fades(mix, 0.002, 0.4)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print("mix LUFS", round(integrated(mix), 2), "len", mix.shape[1] / SR)
