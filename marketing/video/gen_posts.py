import json
BAL = '#balconygarden #containergardening #growyourownfood #urbangardening #beginnergardener #smallspacegardening #gardening'
GAR = '#gardening #growyourownfood #beginnergardener #vegetablegarden #raisedbeds #ukgarden #homegrown'
CTA = 'Try it free for 7 days: myterra.farm'
PIN = 'Your real space, in your pocket 🌱 Free 7-day trial, no card: myterra.farm'
P = {
 'b1': ('Balcony 1/5 · The questions', 'No garden? Start with your balcony', 'Growing food on a balcony, from scratch 🌱 Tell the app about your real balcony: its size, its sun, the time you have. No experience needed. A demo balcony in the app, dates simulated. Part 2: the plants that suit your space.', BAL),
 'b2': ('Balcony 2/5 · What grows in pots', 'What actually grows on a balcony?', 'What actually grows on a balcony? 🪴 The app picks plants that are happy in pots, for your light, your space and the season. A demo balcony, dates simulated. Part 3: your first week, planned.', BAL),
 'b3': ('Balcony 3/5 · First week', 'Your first shopping list, already written', 'Not sure what to buy for your balcony? 🛒 Your first shopping list and your first week of jobs are already written. Tick things off as you get them. A demo balcony, dates simulated. Part 4: the first seeds go in.', BAL),
 'b4': ('Balcony 4/5 · Sowing', 'Sowed your first seeds? One tap', 'Sowed your first seeds on the balcony? One tap 🌱 The app estimates when each plant will be ready and fills in your calendar. A demo balcony, dates simulated. Part 5: watch it grow.', BAL),
 'b5': ('Balcony 5/5 · Growth preview', 'Your balcony in three months', 'What will your balcony look like in three months? 🌿 Slide the clock forward and watch the pots fill. An estimate from a demo balcony: real plants vary with weather and care. Next: the same, for a garden.', BAL),
 'g1': ('Garden 1/5 · The questions', 'A garden, and no idea where to begin?', 'Got a back garden and no idea where to begin? 🏡 Tell the app what you have: its size, its sun, the time you can give it. No experience needed. A demo garden in the app, dates simulated. Part 2: what to plant first.', GAR),
 'g2': ('Garden 2/5 · What to plant first', 'What to plant first in a new garden', 'What to plant first in a new garden? 🥬 The app picks easy wins for your light, your space and the season, and draws your first bed at its real size. A demo garden, dates simulated. Part 3: your first week, planned.', GAR),
 'g3': ('Garden 3/5 · Shopping list + first week', 'Your first shopping list, already written', 'Not sure what to buy for your garden? 🛒 Your first shopping list and your first week of jobs are already written. Tick things off as you get them. A demo garden, dates simulated. Part 4: sowing, and the calendar.', GAR),
 'g4': ('Garden 4/5 · Sowing + calendar', 'Sow once. The calendar fills in', 'Sowed your first seeds? One tap, and the calendar fills in 🌱 The app estimates when each plant will be ready. A demo garden, dates simulated. Part 5: a short morning walk round the garden.', GAR),
 'g5': ('Garden 5/5 · Morning walk', 'A short morning walk, one stop at a time', 'A short morning walk round your garden, one stop at a time 🌿 Tick off the jobs, tell the app how things look. A demo garden, dates simulated. More soon.', GAR),
}
for k, (t, hook, cap, tags) in P.items():
    cap_full = f"{cap}\n{CTA}\n{tags}"
    open(f'episodes/{k}/post.md', 'w').write(f"# {t}\n\n**On-screen hook:** {hook}\n\n**Caption (paste as is):**\n\n{cap_full}\n\n**Pinned comment:** {PIN}\n\n**Settings:** AI-generated content label ON (synthetic voice). Post time: see 07-posting/PLAN.md.\n\n**Honesty:** demo space in the app, simulated dates. Growth preview is an estimate.\n")
    assert 'myterra.farm' in cap_full and '7 days' in cap_full and len(tags.split()) == 7
print('posts ok')
