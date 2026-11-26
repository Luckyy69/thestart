# Sound for "Why You Can't Tickle Yourself": a sneaky deadpan pizzicato for the self-tickle, an X-ray shimmer with
# knob clicks + a rubber "SEEN IT!" stamp, a 90s lab (computer hum, CRT whine), a sheet whoosh + ta-da for the robot,
# servo whirrs + foam swishes, dial clicks, a DEAD STOP on "And suddenly...", then an explosion of laughter (synth "ha"s),
# a panting brain + "loading" bleeps, and a wind-up tick-tick robot + a happy giggle to end.
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase
from instruments import m2f, brass, glock, vibes, musicbox, triangle, pluck, pad, cymbal, timpani, snare
import sfx_gen as G
from sfx_gen import vox, vowel_track, _track

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1530
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(1998)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    return [w["s"] for w in words if w["w"].strip('.,?!:"').replace("'", "").lower() == word][n]
mus = np.zeros((2, N)); sfx = np.zeros((2, N))
def M(x, t, g=1.0, p=0.0): place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def syl(r, base, d, v="a", scale=1.0, up=1.25):
    n = ns(d); t = np.arange(n) / SR
    f0 = base * _track(n, [(0, up), (d * 0.4, up * 1.05), (d, 0.92)], t)
    amp = np.clip(t / 0.012, 0, 1) * np.clip((d - t) / 0.05, 0, 1)
    y = vox(f0, vowel_track(n, [(0, v), (d, v)]), amp, r, scale, tilt=1.0, breath=0.45)
    h = bp(r.standard_normal(n), 600, 4000, 1) * np.exp(-t / 0.03) * 0.5   # the "h"
    return fades(y + h, 0.002, 0.02)
def laugh(dur, r, base=170, rate=6.5, scale=1.0, vowel="a"):
    out = np.zeros(ns(dur + 0.3)); tm = 0.0; k = 0
    while tm < dur:
        d = 0.11 + 0.03 * r.uniform(); b = base * (1.0 + 0.25 * np.sin(k * 0.7) - 0.15 * tm / max(dur, 0.1)) * r.uniform(0.95, 1.08)
        y = syl(r, b, d, vowel, scale); i = ns(tm); out[i:i + len(y)] += y[:len(out) - i]
        tm += 1.0 / rate * r.uniform(0.85, 1.15); k += 1
        if k % 7 == 6: tm += 0.18   # gasp
    return out
def click(r, f=3000): t = tt(0.03); return hp(r.standard_normal(len(t)), f) * np.exp(-t / 0.004) * 0.6
def servo(d, r, f0=180):
    t = tt(d); f = f0 + 60 * np.sin(2 * np.pi * 0.8 * t); return fades((np.sign(np.sin(phase(f))) * 0.12 + lp(colored(len(t), r, 1.0), 900) * 0.4) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t)), 0.05, 0.08)
def swish(r, d=0.25): t = tt(d); return fades(bp(r.standard_normal(len(t)), 1500, 6000, 1) * np.sin(np.pi * t / d) * 0.4, 0.005, 0.02)

# ---------------- music ----------------
C = {"C": [48, 55, 64, 67], "Am": [45, 52, 60, 64], "F": [41, 48, 57, 64], "G": [43, 50, 59, 62], "Dm": [50, 57, 62, 65], "E": [40, 47, 56, 59], "D": [50, 57, 62, 66]}
def padc(ch, t, d, vel=0.28, warm=900): M(pad([m2f(m) for m in C[ch]], d, vel, r_(), att=0.4, rel=0.8, warm=warm), t, 0.5)
def plk(m, t, v=0.45, p=0.0): M(pluck(m2f(m), v, r_(), 0.5, 0.55), t, 0.5, p)
B = 60 / 104
# hook: deadpan sneaky pizzicato (C minor-ish), waits on "I'll wait." (a clock tick motif)
for k, m in enumerate([60, 63, 67, 63, 60, 63, 67, 72, 71, 67, 63, 62]): plk(m, 0.05 + k * B * 0.5, 0.42, -0.3 + 0.6 * (k % 2))
for k in range(4): M(glock(m2f(84), 0.25, r_(), 0.6), at("wait") + 0.3 + k * 0.25, 0.25)
for i, m in enumerate([67, 66, 65, 60]): plk(m, at("nothing") - 0.05 + i * 0.16, 0.45)   # "nothing" sag
# x-ray: shimmering pad + glock, a little descending "volume down" scale, a rubber stamp hit
for b, ch in enumerate(["Am", "F", "Dm", "E", "Am", "F", "G"]): padc(ch, 8.5 + b * 1.9, 1.9, 0.25, 650)
for k in range(10): M(glock(m2f([76, 79, 83, 88][k % 4]), 0.22, r_(), 0.9), at("cerebellum") - 0.1 + k * 0.1, 0.3, 0.4 * np.sin(k))
for i, m in enumerate([79, 76, 72, 67, 64, 60]): M(vibes(m2f(m), 0.35, r_()), at("turns") + i * 0.17, 0.3)
# lab reveal: drumroll -> ta-da
M(timpani(m2f(36), 0.5, r_()), at("scientists") - 0.05, 0.4)
for k in range(int((26.0 - 24.6) / 0.035)): M(snare(0.15 + 0.35 * k / 40, r_(), 0.15, 1.1, 0.8), 24.6 + k * 0.035, 0.35)
for m in (60, 64, 67, 72): M(brass(m2f(m), 0.8, 0.85, r_(), kind="horn"), at("robot") - 0.03, 0.35)
M(cymbal(0.5, r_(), 2.2), at("robot") - 0.03, 0.3)
# the test: curious "science" groove (D-G-D-A-ish)
for b in range(7):
    ch = ["D", "G", "D", "E"][b % 4]; padc(ch, 26.6 + b * 1.55, 1.55, 0.22, 1000)
    for k in range(4): M(musicbox(m2f(C[ch][2] + 12 + [0, 4, 7, 4][k]), 0.32, r_()), 26.6 + b * 1.55 + k * 0.38, 0.3, 0.2)
# "And suddenly..." DEAD STOP (handled in the mix), then the joyful romp
t0 = at("tickled", 1) - 0.02
for m in (60, 64, 67, 72, 76): M(brass(m2f(m), 0.6, 0.9, r_(), kind="horn"), t0, 0.35)
for b in range(5):
    ch = ["C", "F", "G", "C", "F"][b]; padc(ch, t0 + b * 1.15, 1.15, 0.3, 1500)
    for k in range(8): plk(C[ch][k % 4] + 12, t0 + b * 1.15 + k * 0.144, 0.4, 0.4 * ((k % 2) * 2 - 1))
for i, m in enumerate([67, 64, 60]): plk(m, at("up") + i * 0.2, 0.4)   # "couldn't keep up" sag
# outro: music box lullaby, a happy little button
for b, ch in enumerate(["F", "C", "G", "C"]): padc(ch, 45.6 + b * 1.25, 1.25, 0.25, 1200)
for i, m in enumerate([72, 76, 79, 84, 79, 76, 72]): M(musicbox(m2f(m), 0.45, r_()), 45.7 + i * 0.5, 0.4)
M(triangle(0.4, r_()), at("one", 1) + 0.5, 0.3)

# ---------------- sfx ----------------
S(G.bird_chirps(8.4, r_(), 0.4) * 0.4, 0.0, 0.2); S(G.bird_chirps(5.0, r_(), 0.4) * 0.4, 45.7, 0.2)
for k in range(12): S(swish(r_(), 0.12), 0.35 + k * 0.17, 0.25, 0.3 * np.sin(k))   # fingers wiggling on the shirt
S(G.whoosh(0.4, r_(), 0.3, 400, 2000), at("right") - 0.1, 0.25)   # shrug
t = tt(0.08); S(np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.02) * 0.4, at("brain") - 0.02, 0.4)   # head tap "tock"
S(G.whoosh(0.8, r_(), 0.4, 200, 2500), 8.35, 0.5)   # into the x-ray
t = tt(1.0); S(np.sin(2 * np.pi * 1568 * t) * np.exp(-t / 0.35) * 0.3, at("cerebellum") + 0.1, 0.45)   # cerebellum ding
for k in range(6): S(click(r_(), 2500), at("turns") + k * 0.15, 0.35)   # volume knob clicks
for k in range(10): S(swish(r_(), 0.12), at("fingers") + k * 0.16, 0.22)   # fingers again
t = tt(0.3); S(lp(R.standard_normal(len(t)), 500) * np.exp(-t / 0.04) * 1.2, at("knows") - 0.02, 0.6)   # SEEN IT stamp
hum = lp(colored(N, r_(), 1.0), 300) * 0.25 + np.sin(phase(np.full(N, 60.0))) * 0.04 + np.sin(phase(np.full(N, 15700.0))) * 0.006
lab = np.zeros(N); lab[ns(22.0):ns(45.6)] = 1; lab = ndimage.uniform_filter1d(lab, ns(0.3)); S(hum * lab, 0, 0.5)
S(G.whoosh(0.6, r_(), 0.5, 300, 3500), at("robot") - 0.35, 0.5)   # sheet off
S(servo(2.6, r_()), at("handle") - 0.1, 0.35, -0.3); S(servo(9.5, r_(), 150), at("tickles") - 0.2, 0.25, 0.3)
for k in range(int((44.0 - 29.2) / 0.31)): S(swish(r_(), 0.2) * (0.5 if k < 25 else 1.0), 29.2 + k * 0.31, 0.25, 0.4)   # foam strokes
for k in range(8): S(click(r_(), 1800), at("delay") + k * 0.1, 0.4)   # dial
for k in range(5): S(click(r_(), 1800), at("longer") + k * 0.1, 0.4)
S(laugh(1.0, r_(), 170), at("tickled", 1) - 0.05, 0.9)
S(laugh(3.2, r_(), 185, 7.0), at("tickled", 1) + 1.0, 0.8)
S(laugh(1.5, r_(), 140, 5.0, 0.95, "o") * 0.6, at("tickled", 1) + 0.6, 0.35, -0.5)   # scientists chuckle
for k in range(7): t = tt(0.05); S(np.sin(2 * np.pi * 2000 * t) * 0.2, 42.9 + k * 0.2, 0.3, 0.3)   # LOADING bleeps
for k in range(4): S(G.oof(r_(), "oof") * 0.5, 43.0 + k * 0.35, 0.3)   # panting brain
for k in range(int((48.3 - 45.7) / 0.12)): S(click(r_(), 4000) * 0.5, 45.7 + k * 0.12, 0.3, -0.3)   # wind-up tick-tick
S(laugh(1.4, r_(), 200, 7.5, 1.05, "i") * 0.8, at("slow") + 0.1, 0.6)   # happy giggle
for f in [255, 660, 790, 1110, 1290, 1370]: S(G.whoosh(0.5, r_(), 0.3, 300, 2400), f / FPS - 0.3, 0.2)

# ---------------- mix ----------------
vx, _ = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
duck = np.zeros(N)
for w in words: duck[max(0, ns(w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12)); gain_m = 10 ** ((-6.0 * duck) / 20)
stop = np.ones(N); stop[ns(37.4):ns(at("tickled", 1) - 0.05)] = 0.0; stop = ndimage.uniform_filter1d(stop, ns(0.05))
def to_lufs(x, target): l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
v = to_lufs(v, V_T); m = to_lufs(mus, V_T - 9.0 + 3.0) * gain_m * stop; s = to_lufs(sfx, V_T - 7.0 - 4.0)
s = s * np.maximum(stop, 0.25)
mix = to_lufs(v + m + s, -15.0)
ceil = 10 ** (-1.5 / 20)
mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
mix = fades(mix, 0.002, 0.4)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print("mix LUFS", round(integrated(mix), 2), "len", mix.shape[1] / SR)
