// Word-synced captions for vertical shorts, matched to the reference look (measured on ref/japan_*, space_*):
// ONE word at a time, as spoken (case kept, punctuation kept), plain white bold sans (Inter Bold) ~72 px at 1080x1920
// (white ascender height ~53 px), a thin near-black outline (~4.5 px outside the glyph) and a faint soft shadow,
// centred at ~70 % of the frame height (slightly below the middle, clear of the platform UI). No colour highlight,
// no pop: the word simply cuts in on its cue. Long words shrink to stay inside ~86 % of the frame width.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export type Word = { w: string; s: number; e: number };
type Chunk = { words: Word[]; s: number; e: number };

/** Groups words into display chunks (default: one word each, like the reference). Each chunk stays until the next
 *  one starts, with at most `hang` s after its last word ends. */
export const chunkWords = (words: Word[], max = 1, hang = 0.5): Chunk[] => {
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => { if (cur.length) { out.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; } };
  for (const w of words) {
    if (cur.length && [...cur.map((x) => x.w), w.w].join(" ").length > 15) flush();
    cur.push(w);
    if (/[.,!?:;]$/.test(w.w) || cur.length >= max) flush();
  }
  flush();
  for (let i = 0; i < out.length; i++) out[i].e = Math.min(out[i].e + hang, i + 1 < out.length ? out[i + 1].s : out[i].e + hang);
  return out;
};

// average advance of Inter Bold glyphs in em (lowercase ~0.58, caps/digits ~0.68), for the fit-to-width check
const textEm = (s: string) => [...s].reduce((a, ch) => a + (/[A-Z0-9MW]/.test(ch) ? 0.68 : /[il.,'!:;|]/.test(ch) ? 0.3 : 0.58), 0);

export const Captions: React.FC<{ words: Word[]; y?: number; size?: number }> = ({ words, y = 0.7, size = 72 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const chunks = React.useMemo(() => chunkWords(words), [words]);
  const c = chunks.find((k) => t >= k.s - 0.03 && t < k.e);
  if (!c) return null;
  const text = c.words.map((w) => w.w).join(" ");
  const base = (size * height) / 1920;
  const px = Math.min(base, (0.86 * width) / Math.max(textEm(text) + 0.15, 0.1)); // long words shrink to fit
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: `${y * 100}%`, width: "92%", textAlign: "center", transform: "translateY(-50%)",
        whiteSpace: "nowrap", fontFamily: "'Inter', 'Liberation Sans', Arial, sans-serif", fontWeight: 700, fontSize: px,
        lineHeight: 1.1, letterSpacing: 0, color: "#ffffff",
        // stroke is centred on the glyph edge; paint-order puts the fill on top, so ~0.065 em shows outside
        WebkitTextStroke: `${0.13 * px}px #0d0c10`, paintOrder: "stroke fill",
        textShadow: `0 ${0.03 * px}px ${0.08 * px}px rgba(0,0,0,0.35)`,
      }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};
