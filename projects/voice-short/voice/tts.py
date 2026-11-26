import json, urllib.request, base64, sys
vid = sys.argv[1]; speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
text = open('text.txt').read()
body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2",
  "voice_settings": {"stability": 0.6, "similarity_boost": 0.75, "style": 0.2, "use_speaker_boost": True, "speed": speed}}).encode()
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_128", data=body,
  headers={"xi-api-key": "proxy-injected", "Content-Type": "application/json"})
r = json.load(urllib.request.urlopen(req, timeout=300))
open('voice.mp3', 'wb').write(base64.b64decode(r['audio_base64']))
a = r['alignment']; json.dump(a, open('alignment.json', 'w'))
words = []; cur = ''; s = None; last = 0
for c, t0, t1 in zip(a['characters'], a['character_start_times_seconds'], a['character_end_times_seconds']):
    if c.isspace():
        if cur: words.append({"w": cur, "s": round(s, 3), "e": round(last, 3)}); cur = ''
    else:
        if not cur: s = t0
        cur += c; last = t1
if cur: words.append({"w": cur, "s": round(s, 3), "e": round(last, 3)})
json.dump(words, open('words.json', 'w'), indent=0)
print(len(words), words[-1])
