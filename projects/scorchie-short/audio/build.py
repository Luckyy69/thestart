# Sound for "The Skyscraper That Cooked a Car": original bouncy score (tuba + glock + snare, swung vibes for the
# explanation, a sour fall for the fins, a golden reprise in Vegas) ducked under the voice, synthesized SFX on the
# picture's events, mixed to -15 LUFS / <= -1 dBTP, 48 kHz stereo, exactly TOTAL frames long.
# Standard mix: music +3 dB, SFX -6 dB relative to the bed levels below; voice unchanged.
import json, os, sys
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, integrated, true_peak, read_wav, write_wav, phase, modal
from instruments import m2f, brass, glock, vibes, triangle
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1940
DUR = TOTAL / FPS
N = ns(DUR)
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
R = np.random.default_rng(7)
r_ = lambda: rng(int(R.integers(1 << 30)))

# ---------------- music ----------------
BPM = 116.0
BEAT = 60.0 / BPM
mus = np.zeros((2, N))
def note(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p), t, g)
# F major motif (MIDI), 2 bars of 8 eighths; None = rest
MOTIF_A = [72, None, 77, 76, 74, None, 72, 69, 70, None, 74, 72, 70, 69, 67, None]
MOTIF_B = [72, None, 77, 79, 81, None, 79, 77, 76, 74, 76, 77, 72, None, None, None]
CHORDS = {"F": (53, 60), "Bb": (46, 53), "C": (48, 55), "Dm": (50, 57), "Gm": (43, 50)}
PROG = ["F", "Dm", "Bb", "C"]
def bar_band(t0, chord, vel=0.6, mel=None, mel_vel=0.5, snare=True, swing=0.0):
    root, fifth = CHORDS[chord]
    for k in range(4):
        tb = t0 + k * BEAT
        if k % 2 == 0: note(brass(m2f(root if k == 0 else fifth), BEAT * 0.8, vel, r_(), kind="tuba"), tb, 0.9)
        else: note(brass(m2f(root + 12 + (4 if chord in ("F", "Bb", "C") else 3)), BEAT * 0.35, vel * 0.45, r_(), kind="horn"), tb + 0.0, 0.5, 0.3)
        if snare and k in (1, 3):
            n = R.standard_normal(ns(0.18)); tt_ = np.arange(len(n)) / SR
            note(bp(n, 1500, 7000, 2) * np.exp(-tt_ / 0.05) * 0.35 * vel, tb, 1.0, -0.2)
    if mel:
        for i, m in enumerate(mel):
            if m is None: continue
            off = (i // 2) * BEAT + (i % 2) * BEAT * (0.5 + swing)
            note(glock(m2f(m), mel_vel, r_(), 1.2), t0 + off, 0.55, 0.15)
def section(t0, t1, mel_bars=True, vel=0.6, swing=0.0, prog=PROG):
    nbar = int((t1 - t0) / (4 * BEAT))
    for b in range(nbar):
        motif = (MOTIF_A if (b // 2) % 2 == 0 else MOTIF_B)
        half = motif[:8] if b % 2 == 0 else motif[8:]
        bar_band(t0 + b * 4 * BEAT, prog[b % len(prog)], vel, half if mel_bars else None, 0.5, True, swing)
def stab(t, chord="F", vel=0.9, oct=0):
    root, fifth = CHORDS[chord]
    for m in (root + 12, fifth + 12, root + 24 + (4 if chord != "Dm" else 3)):
        note(brass(m2f(m + oct), 0.45, vel, r_(), kind="horn"), t, 0.55)
    note(brass(m2f(root), 0.6, vel, r_(), kind="tuba"), t, 0.8)
    note(triangle(0.5, r_()), t, 0.3, 0.4)

stab(0.0, "F")                                 # hook hit
note(glock(m2f(84), 0.7, r_()), W_MELT := 1.18, 0.6)
section(4.0, 30.0, True, 0.6)                    # 2013 .. crowds
stab(30.2, "F", 0.7); stab(33.15, "Dm", 0.7, -12) # luckily / unluckily (stop-time)
for i, m in enumerate([60, 64, 67, 72, 67, 64, 60, 65, 69, 72, 69, 65] * 2):  # explanation: vibes arpeggios
    note(vibes(m2f(m + 12), 0.45, r_(), 1.4), 35.5 + i * BEAT * 0.5, 0.5, -0.2 + 0.4 * (i % 2))
for i in range(int((47.4 - 35.5) / (2 * BEAT))):
    ch = ["F", "Bb", "C", "F"][i % 4]; note(brass(m2f(CHORDS[ch][0]), BEAT * 1.6, 0.45, r_(), kind="tuba"), 35.5 + i * 2 * BEAT, 0.7)
stab(47.45, "F", 1.0)                             # "skyscraper" punch
for i, m in enumerate([58, 57, 56, 55]):          # fins: sour descending wah
    note(brass(m2f(m), 0.55 if i < 3 else 1.1, 0.7, r_(), kind="horn", fall=(-200 if i == 3 else 0)), 49.3 + i * 0.55, 0.6)
for k in range(5):                                # suspense: low ticking tuba
    note(brass(m2f(41), 0.25, 0.5, r_(), kind="tuba"), 53.0 + k * BEAT, 0.7)
section(56.2, 62.0, True, 0.55, swing=0.17, prog=["Bb", "Gm", "C", "F"])  # Vegas reprise, swung
stab(62.3, "Dm", 1.0, -12); stab(63.3, "F", 0.8)  # death ray + button

# ---------------- sfx ----------------
sfx = np.zeros((2, N))
def S(x, t, g=1.0, p=0.0): place(sfx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def sizzle(dur, level=1.0, bright=5000, seed=None):
    r = r_(); n = ns(dur); nz = r.standard_normal(n)
    crack = (r.random(n) < 0.0025) * r.standard_normal(n) * 6
    y = hp(nz, 2500) * 0.25 * (0.6 + 0.4 * smooth_noise(n, r, 6)) + hp(crack, 1500)
    return fades(lp(y, bright) * level, 0.15, 0.3)
def engine(dur, f0=55, f1=32):
    t = tt(dur); f = np.linspace(f0, f1, len(t)); ph = phase(f)
    y = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sign(np.sin(ph))) * 0.25
    y = lp(y + 0.08 * colored(len(t), r_(), 1.0), 900)
    return fades(y * np.minimum(1, t / 0.4), 0.05, 0.6)
def zing(dur=0.35, f0=900, f1=2600, g=0.3):
    t = tt(dur); y = np.sin(phase(np.geomspace(f0, f1, len(t)))) * np.exp(-t / (dur * 0.6))
    return fades(y * g, 0.005, 0.05)
def zap(dur=1.4):
    t = tt(dur); f = np.geomspace(1800, 140, len(t))
    y = np.sin(phase(f)) * 0.5 + 0.6 * hp(R.standard_normal(len(t)), 1200) * np.exp(-t / 0.4)
    return fades(y * np.exp(-t / 0.7), 0.002, 0.2)
def tick(): return G.clink(r_(), 2600, 0.05, 0.6) * 0.5
cuts = [119, 286, 425, 598, 648, 817, 906, 1066, 1154, 1285, 1355, 1469, 1591, 1688, 1821]
for f in cuts: S(G.whoosh(0.5, r_(), 0.32, 300, 2000), f / FPS - 0.32, 0.22)
# ambience
amb_city = G.breeze(DUR, r_(), 0.7) * 0.35 + G.bird_chirps(DUR, r_(), 0.35) * 0.4
traffic = lp(colored(N, r_(), 1.2), 500) * 0.06
env = np.zeros(N)
def span(a, b, g=1.0):
    i0, i1 = ns(a), ns(b); env[i0:i1] = np.maximum(env[i0:i1], g)
span(0, 35.5, 1); span(48.9, 56.2, 1); span(42.8, 45.2, 0.6)
from scipy import ndimage
env = ndimage.uniform_filter1d(env, ns(0.3))
amb = np.asarray(amb_city)[:N] if np.ndim(amb_city) == 1 else np.asarray(amb_city)[0][:N]
S(np.pad(amb + traffic, (0, max(0, N - len(amb))))[:N] * env, 0, 0.9)
vegas_env = np.zeros(N); vegas_env[ns(56.0):] = 1; vegas_env = ndimage.uniform_filter1d(vegas_env, ns(0.5))
wb = G.water_bed(DUR, r_(), 0.4)
wb = (np.asarray(wb)[0] if np.ndim(wb) == 2 else np.asarray(wb))[:N]
S(np.pad(wb, (0, N - len(wb))) * vegas_env * 0.35, 0, 1.0)
# hook: sizzle + creaks + metal sag
S(sizzle(3.8, 0.9), 0.0, 0.5); S(G.creak(0.7, r_(), 80, 140, G.SMALLMETAL, scale=0.6), 1.15, 0.35, 0.2)
# car drives in, door, footsteps
S(engine(2.3), 9.2, 0.6, -0.5); S(G.push_thump(r_()), 11.85, 0.5, 0.2)
for k in range(6): S(G.stroll_step(r_(), 0.6), 12.2 + k * 0.42, 0.25, 0.3)
# melting: creak + sizzle + hiss puffs on mirror / badge / panels
for tw, g in [(15.23, 0.35), (16.37, 0.3), (17.74, 0.45)]:
    S(G.creak(0.6, r_(), 60, 120, G.SMALLMETAL, scale=0.7), tw - 0.05, g, 0.1)
S(sizzle(6.0, 0.8), 14.2, 0.4); S(sizzle(1.2, 1.3, 7000), 17.7, 0.4)
# word gets around: murmur
for k in range(5): S(G.babble(1.8, r_(), 140 + 40 * k, 1.0 + 0.1 * k) * 0.5, 19.9 + 0.15 * k, 0.25, -0.6 + 0.3 * k)
# reporter: steps, crack, sizzle, crowd laugh
for k in range(4): S(G.stroll_step(r_(), 0.5), 21.7 + k * 0.38, 0.22, -0.3)
S(G.clink(r_(), 1400, 0.08, 0.8), 24.06, 0.6); S(G.wood_crack(r_()) * 0.15, 24.06, 0.5)
S(sizzle(2.6, 1.4, 7000), 24.95, 0.55)
for k in range(8): S(G.babble(2.6, r_(), 120 + 25 * k, 1.0) * 0.5, 27.1 + 0.1 * k, 0.22, -0.7 + 0.2 * k)
# clock ticks: slow two hours, then racing days
for k in range(6): S(tick(), 30.25 + k * 0.48, 0.6, -0.3)
tk = 33.15
while tk < 35.4: S(tick(), tk, 0.5, -0.3); tk += 0.11
# rays
S(zing(0.5, 700, 1800, 0.25), 35.9); S(zing(0.5, 1800, 700, 0.25), 36.9)
for k in range(8): S(zing(0.4, 600 + 80 * k, 2400, 0.12), 39.0 + 0.12 * k, 1.0, -0.4 + 0.1 * k)
S(glock(m2f(96), 0.8, r_()), 41.78, 0.4)
S(sizzle(2.0, 0.6, 6000), 43.2, 0.35)                     # leaf
S(G.whoosh(0.7, r_(), 0.45, 200, 1600), 47.0, 0.4)         # punch-in
for k in range(10): S(G.hammer_hit(r_(), 0.5), 49.9 + k * 0.21, 0.18, -0.5 + 0.1 * k)  # fins clank on
S(G.oof(r_(), "oh"), 51.2, 0.25, -0.2)
# Vegas: bag melts, guest whoa, waiter, death ray
S(sizzle(1.6, 1.1, 6500), 58.4, 0.45); S(G.whoa(r_()), 58.55, 0.3, 0.2)
S(zap(1.6), 62.28, 0.5); S(G.whoosh(1.0, r_(), 0.1, 300, 2500, tail=0.6), 62.28, 0.35)

# ---------------- mix ----------------
vx, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = np.zeros((2, N)); vv = st(vx)[:, :N]; v[:, :vv.shape[1]] = vv
vl = integrated(v)
spans = [(w["s"], w["e"]) for w in words]
duck = np.zeros(N)
for a, b in spans: duck[max(0, ns(a - 0.08)):ns(b + 0.12)] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.12))
gain_m = 10 ** ((-6.0 * duck) / 20)
def to_lufs(x, target):
    l = integrated(x); return x * 10 ** ((target - l) / 20) if np.isfinite(l) else x
V_T = -16.0
v = to_lufs(v, V_T)
m = to_lufs(mus, V_T - 9.0 + 3.0) * gain_m       # music bed +3 dB over the -12 LU base
s = to_lufs(sfx, V_T - 7.0 - 6.0)              # SFX -6 dB
mix = v + m + s
mix = to_lufs(mix, -15.0)
peak = np.max(np.abs(mix)); ceil = 10 ** (-1.5 / 20)
mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
mix = fades(mix, 0.002, 0.25)
write_wav(os.path.join(HERE, "mix.wav"), mix)
write_wav(os.path.join(HERE, "stem_music.wav"), m); write_wav(os.path.join(HERE, "stem_sfx.wav"), s)
print("voice LUFS", round(vl, 1), "-> mix LUFS", round(integrated(mix), 2), "TP dBTP", round(20 * np.log10(true_peak(mix) + 1e-9), 2), "len", mix.shape[1] / SR)
