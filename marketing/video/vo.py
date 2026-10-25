import json, os, soundfile as sf, sys
HERE = os.path.dirname(os.path.abspath(__file__))
from kokoro_onnx import Kokoro
k = Kokoro(os.path.join(HERE, "tts/kokoro-v1.0.onnx"), os.path.join(HERE, "tts/voices-v1.0.bin"))
d = sys.argv[1]; out = {}
for key, text in json.load(open(d + "/lines.json")):
    s, sr = k.create(text, voice="af_heart", speed=1.12, lang="en-us")
    sf.write(f"{d}/vo_{key}.wav", s, sr); out[key] = round(len(s) / sr, 3)
json.dump(out, open(d + "/durs.json", "w")); print(out, round(sum(out.values()), 1))
