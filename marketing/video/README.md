# MyTerra short-video generator

This folder turns the real MyTerra app into TikTok, Reels and Shorts videos.
`PLAYBOOK.md` holds the viral rules every episode follows.

## How it works
1. **The app runs locally in local-only mode.** No Supabase keys means no
   sign-in. Run `npx vite --port 5179` from the repo root.
2. **`rec.js` records the real app frame by frame.** The page clock is frozen,
   and each frame moves it forward exactly 1/30 s before taking a 1170×2079
   screenshot. Taps, typing, scrolls, map drags and the 3D scene therefore
   play back smoothly at 30 fps, even on a machine with no graphics card. The
   clock is set to a sunny spring morning in the UK. Every interaction is
   logged with its frame number in `events.json`.
3. **`scene1.js`** is the script for Part 1 (one function call per real
   tap). It writes timeline marks (`land`, `sun`, `build`, `orbit`…) that the
   edit refers to.
4. **`vo.py`** generates the AI voiceover from `lines.json`, using Kokoro TTS
   (open source, runs locally).
5. **`music2.py`** synthesises a royalty-free background track and riser.
6. **`compose2.py`** edits the final 1080×1920 video from `edit.json`:
   - the hook clip (the payoff) comes first, with hook text and a series pill
   - slow steps are speed-ramped
   - a finger dot and ripple, a punch-in zoom and a pop sound on every tap
   - word-by-word highlighted captions
   - the music ducks under the voice
   - a cliffhanger end card, and the video ends on its first frame so it loops

## Make an episode
```
cd marketing/video
npx vite --port 5179 --host 127.0.0.1 &      # from the repo root
pip install kokoro-onnx soundfile numpy pillow
# models: kokoro-v1.0.onnx + voices-v1.0.bin from
# github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0) → tts/
python3 vo.py episodes/ep1                    # voice lines → wav + durations
node scene1.js                                # records episodes/ep1/frames
python3 music2.py 45
node scene1.js orbit                          # records the hook/loop pan → episodes/ep1/orbit
python3 merge_orbit.py episodes/ep1 orbit
python3 compose2.py episodes/ep1              # → episodes/ep1/final.mp4 (loudness −14 LUFS)
```
Don't edit or `git pull` the served repo while a recording runs. Vite
hot-reloads changed modules into the page being recorded, so use a separate
clone or worktree for git work.

Recording speed with no graphics card: about 0.12 s per frame on 2D screens,
and several seconds per frame on 3D map screens.

## New episodes
Copy `scene1.js` and change the taps. Write the lines in `lines.json` and the
cuts in `edit.json`. Check the result against the playbook checklist before
posting.
