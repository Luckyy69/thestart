# Sound for "The Note on the Drill": an emotional score (low brass drones and a heartbeat pulse underground, sparse
# vibes/music box while the families wait, a bright brass + glock swell on the note, a warm triumphant finale), ducked
# under the voice; SFX: mine drips + distant rumble, the collapse (deep crack, rockfall, dust roar), the refuge hum,
# desert wind, camp murmur, drill rig engine + grinding, the rod coming up, a crowd roar on the note, the winch + wheel,
# cheers and applause at the rescue, a final soft wind.
import json, os
import numpy as np
from scipy import ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, read_wav, write_wav, phase
from instruments import m2f, brass, glock, vibes, musicbox, triangle
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 2060
DUR = TOTAL / FPS; N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(33)
r_ = lambda: rng(int(R.integers(1 << 30)))
def at(word, n=0):
    hits = [w["s"] for w in words if w["w"].strip('.,?!:"').lower() == word]
    return hits[n]
FR = lambda f: f / FPS
mus = np.zeros((2, N))
def note(x, t, g=1.0, p=0.0): place(mus, pan(x, p), t, g)
BPM = 72.0; BEAT = 60 / BPM
CH = {"Am": [45, 57, 60, 64, 69, 72], "F": [41, 53, 57, 60, 65, 69], "C": [36, 48, 55, 60, 64, 67], "G": [43, 55, 59, 62, 67, 71], "Dm": [38, 50, 57, 62, 65, 69], "E": [40, 52, 56, 59, 64, 68]}
def bar(t0, ch, vel=0.42, arp=True, pulse=True, box=False):
    c = CH[ch]
    if pulse:
        for k in (0, 2): note(brass(m2f(c[0]), BEAT * 1.6, vel * 0.7, r_(), kind="tuba"), t0 + k * BEAT, 0.6)
    if arp:
        for i, m in enumerate([c[2], c[3], c[4], c[3], c[5], c[4], c[3], c[2]]):
            note((musicbox if box else vibes)(m2f(m + 12), vel * 0.5, r_(), 1.6), t0 + i * BEAT / 2, 0.4, -0.3 + 0.6 * (i % 2))
def section(t0, t1, prog, vel=0.42, arp=True, pulse=True, box=False):
    for b in range(max(1, int((t1 - t0) / (4 * BEAT)))): bar(t0 + b * 4 * BEAT, prog[b % len(prog)], vel, arp, pulse, box)
for m in [33, 45, 52, 57]: note(brass(m2f(m), 5.5, 0.45, r_(), kind="horn"), 0.1, 0.4)          # hook drone
section(6.8, 11.1, ["Am", "F"], 0.38, True, False)
for m in [28, 40, 45]: note(brass(m2f(m), 2.6, 0.9, r_(), kind="horn"), at("collapses") - 0.2, 0.5)
for k in range(14): note(brass(m2f(33), 0.4, 0.35, r_(), kind="tuba"), 19.5 + k * 0.6, 0.55)     # heartbeat in the refuge
section(28.0, 37.6, ["Am", "F", "C", "G"], 0.36, True, False, True)                              # waiting (music box)
for i, m in enumerate([69, 72, 76, 81, 84]): note(glock(m2f(m), 0.6, r_()), at("note") - 0.1 + i * 0.12, 0.5)
for m in [45, 57, 64, 69, 72]: note(brass(m2f(m), 2.2, 0.8, r_(), kind="horn"), at("thirty-three.\"") if False else 46.5, 0.5)
section(48.2, 54.2, ["Dm", "E"], 0.36, True, True)
section(54.2, DUR - 1.5, ["C", "G", "Am", "F"], 0.48, True, True)                                  # triumphant finale
for m in [48, 55, 60, 64, 67, 72]: note(brass(m2f(m), 2.5, 0.7, r_(), kind="horn"), at("light") - 0.1, 0.45)
for m in [60, 64, 67, 72, 76]: note(vibes(m2f(m + 12), 0.5, r_(), 4.5), DUR - 3.2, 0.45)
note(triangle(0.5, r_()), DUR - 3.2, 0.3)

sfx = np.zeros((2, N))
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
SH = [(0,96,"mine"),(96,213,"camp"),(213,338,"desert"),(338,442,"mine"),(442,593,"cut"),(593,846,"mine"),(846,941,"camp"),(941,1068,"drill"),
      (1068,1139,"camp"),(1139,1450,"drill"),(1450,1632,"cut"),(1632,1902,"rescue"),(1902,TOTAL,"camp")]
def envfor(places, g=1.0, fade=0.3):
    e = np.zeros(N)
    for a, b, p in SH:
        if p in places: e[ns(FR(a)):ns(FR(b))] = g
    return ndimage.uniform_filter1d(e, ns(fade))
rumble = lp(colored(N, r_(), 1.6), 90) * 1.2
S(rumble * envfor({"mine"}), 0, 0.5)
for k in range(30):   # drips in the mine
    tk = float(R.uniform(0, DUR)); 
    if envfor({"mine"})[min(N - 1, ns(tk))] > 0.5: S(G.clink(r_(), float(R.uniform(1800, 3200)), 0.08, 0.5) * 0.4, tk, 0.4, float(R.uniform(-0.6, 0.6)))
wind = bp(colored(N, r_(), 0.8), 200, 2500, 1) * (0.6 + 0.4 * smooth_noise(N, r_(), 0.3))
S(wind * envfor({"desert", "camp", "drill", "rescue"}, 1.0), 0, 0.35)
# collapse
t = tt(4.5); n = R.standard_normal(len(t))
crack = hp(n, 1200) * np.exp(-t / 0.05) * 1.5 + lp(colored(len(t), r_(), 1.8), 160) * np.exp(-t / 1.6) * 2.2 + bp(n, 300, 4000, 1) * np.exp(-t / 1.2) * 0.8
S(fades(crack, 0.002, 0.5), at("collapses") - 0.35, 0.9)
for k in range(18): S(G.wood_crack(r_()) * 0.25, at("collapses") + float(R.uniform(-0.2, 2.0)), 0.4, float(R.uniform(-0.7, 0.7)))
# drill rig
eng = lp(colored(N, r_(), 1.0), 400) * 0.6 + np.sin(np.cumsum(np.full(N, 2 * np.pi * 48 / SR))) * 0.15
grind = bp(colored(N, r_(), 0.4), 600, 3000, 1) * (0.5 + 0.5 * smooth_noise(N, r_(), 3)) * 0.3
S((eng + grind) * envfor({"drill"}), 0, 0.45)
# camp murmur, the cheer on the note, rescue crowd
for k in range(8): S(G.babble(4.0, r_(), 120 + 25 * k, 1.0) * 0.4, FR(96) + 0.2 * k, 0.1, -0.8 + 0.2 * k)
for k in range(8): S(G.babble(4.0, r_(), 120 + 25 * k, 1.0) * 0.4, FR(846) + 0.2 * k, 0.12, -0.8 + 0.2 * k)
S(G.applause(4.0, r_(), 50), 46.6, 0.45)
for k in range(8): S(G.hurrah(r_(), 110 + 22 * k, 1.0), 46.6 + 0.08 * k, 0.12, -0.7 + 0.2 * k)
# winch + wheel at the rescue
t = tt(4.0); wn = np.sin(np.cumsum(np.full(len(t), 2 * np.pi * 70 / SR))) * 0.2 + bp(colored(len(t), r_(), 0.5), 300, 1500, 1) * 0.15
S(fades(wn, 0.3, 0.5), at("rode") - 0.8, 0.4)
S(G.applause(5.0, r_(), 60), at("light") + 0.1, 0.5)
for k in range(10): S(G.hurrah(r_(), 110 + 18 * k, 1.0), at("light") + 0.15 + 0.07 * k, 0.12, -0.8 + 0.18 * k)
for f in [96, 213, 338, 442, 593, 714, 846, 941, 1068, 1139, 1290, 1450, 1530, 1632, 1798, 1902]: S(G.whoosh(0.5, r_(), 0.32, 300, 2000), FR(f) - 0.32, 0.14)

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
