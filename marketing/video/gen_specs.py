"""Writes lines.json + spec.json for the balcony (b1-b5) and garden (g1-g5) series."""
import json, os
def W(id, lines, spec):
    d = f'episodes/{id}'; os.makedirs(d, exist_ok=True)
    json.dump(lines, open(f'{d}/lines.json', 'w'), indent=1, ensure_ascii=False)
    json.dump(spec, open(f'{d}/spec.json', 'w'), indent=1, ensure_ascii=False)
def hook(pill, text, until=3.8): return {'pill': pill, 'text': text, 'until': until}
def end(a, b): return {'secs': 2.5, 'lines': [a, b, 'Follow along with me']}

def q_series(id, label, n, hooktext, hookvo, nxt, l_space, l_size, l_sun, l_time, l_cta, covered, l_exp='No experience? That is fine. It picks forgiving plants.'):
    hk_from = 'dims_in+1.0' if covered else 'dims_in+0.6'
    W(id, [['hook', hookvo], ['space', l_space], ['size', l_size], ['sun', l_sun], ['exp', l_exp], ['time', l_time], ['cta', l_cta]], {
        'hook': hook(f'{label} {n}', hooktext), 'endcard': end(*nxt),
        'clips': [
            {'from': hk_from, 'to': 'dims_done+0.5', 'vo': 'hook', 'smin': 0.8, 'smax': 1.3},
            {'from': 'space_in', 'to': 'dims_in', 'vo': 'space'},
            {'from': 'dims_in', 'to': 'sun_in', 'vo': 'size'},
            {'from': 'sun_in', 'to': 'exp_in', 'vo': 'sun'},
            {'from': 'exp_in', 'to': 'time_in', 'vo': 'exp'},
            {'from': 'time_in', 'to': 'time_done+0.3', 'vo': 'time'},
            {'from': 'dims_done+0.5', 'to': hk_from, 'reverse': True, 'vo': 'cta', 'smin': 0.9, 'smax': 2.0},
        ]})
def crops_series(id, label, n, hooktext, hookvo, nxt, l_crops, l_picks, l_map, l_plant, l_cta):
    W(id, [['hook', hookvo], ['crops', l_crops], ['picks', l_picks], ['map', l_map], ['planters', l_plant], ['cta', l_cta]], {
        'hook': hook(f'{label} {n}', hooktext), 'endcard': end(*nxt),
        'clips': [
            {'from': 'crops_picked-2.4', 'to': 'crops_picked+0.5', 'vo': 'hook', 'smin': 0.8, 'smax': 1.3},
            {'from': 'crops_in', 'to': 'crops_picked-2.4', 'vo': 'crops'},
            {'from': 'crops_picked-2.4', 'to': 'map', 'vo': 'picks'},
            {'from': 'map', 'to': 'planters', 'vo': 'map'},
            {'from': 'planters', 'to': 'end', 'vo': 'planters'},
            {'from': 'crops_picked+0.5', 'to': 'crops_picked-2.4', 'reverse': True, 'vo': 'cta', 'smin': 0.9, 'smax': 2.0},
        ]})
def plan_series(id, label, n, hooktext, hookvo, nxt, l_kit, l_days, l_today, l_cta):
    W(id, [['hook', hookvo], ['kit', l_kit], ['days', l_days], ['today', l_today], ['tick', 'Tick things off as you get them.'], ['cta', l_cta]], {
        'hook': hook(f'{label} {n}', hooktext), 'endcard': end(*nxt),
        'clips': [
            {'from': 'kit-0.2', 'to': 'kit_done+0.6', 'vo': 'hook', 'smin': 0.8, 'smax': 1.3},
            {'from': 'plan', 'to': 'plan_kit', 'vo': 'kit'},
            {'from': 'plan_kit', 'to': 'plan_end', 'vo': 'days'},
            {'from': 'plan_end', 'to': 'kit', 'vo': 'today'},
            {'from': 'kit', 'to': 'kit_done+0.6', 'vo': 'tick'},
            {'from': 'kit_done+0.6', 'to': 'kit-0.2', 'reverse': True, 'vo': 'cta', 'smin': 0.9, 'smax': 2.0},
        ]})
def sow_series(id, label, n, hooktext, hookvo, nxt, l_job, l_sow, l_bars, l_cal, l_cta):
    W(id, [['hook', hookvo], ['job', l_job], ['sow', l_sow], ['bars', l_bars], ['cal', l_cal], ['cta', l_cta]], {
        'hook': hook(f'{label} {n}', hooktext), 'endcard': end(*nxt),
        'clips': [
            {'from': 's1', 'to': 'bars+0.6', 'vo': 'hook', 'smin': 0.8, 'smax': 1.3},
            {'from': 'home+0.3', 'to': 'plan+0.5', 'vo': 'job'},
            {'from': 'plan+0.5', 'to': 'bars', 'vo': 'sow'},
            {'from': 'bars', 'to': 'bars2+0.8', 'vo': 'bars'},
            {'from': 'bars2+0.8', 'to': 'end', 'vo': 'cal'},
            {'from': 'bars+0.6', 'to': 's1', 'reverse': True, 'vo': 'cta', 'smin': 0.9, 'smax': 2.0},
        ]})

# ---------------- balcony ----------------
q_series('b1', 'BALCONY', 1, 'No garden? Start with your balcony',
  'No garden? Tell this app about your balcony, just as it is.', ('BALCONY 2', 'Plants that suit your space'),
  'Start with where you grow.', 'Type your real size. Rough is fine.', 'Tell it how much sun it gets.', 'And the minutes you truly have.',
  'Tomorrow, the plants that suit your balcony. Part two.', True)
crops_series('b2', 'BALCONY', 2, 'What actually grows on a balcony?',
  'Wondering what grows on a balcony? It picks plants that are happy in pots.', ('BALCONY 3', 'Your first week, planned'),
  'Picked for your light, your space and the season.', 'Choose up to three. Fewer plants, better habits.', 'Then it draws your balcony at its real size.', 'With your first planters, sized for the time you have.',
  'Tomorrow, your first week. Part three.')
plan_series('b3', 'BALCONY', 3, 'Your first shopping list, already written',
  'Not sure what to buy? Your first shopping list is already written.', ('BALCONY 4', 'Sowing the first seeds'),
  'First, everything to buy, in one short list.', 'Then one small job a day. Mostly just watering.', 'And today\'s jobs wait on your home screen.',
  'Tomorrow, the first seeds go in. Part four.')
sow_series('b4', 'BALCONY', 4, 'Sowed your first seeds? One tap',
  'Sowed your first seeds? One tap, and the app starts counting.', ('BALCONY 5', 'Watch it grow'),
  'Open today\'s job.', 'Sowed it? Tap once.', 'Now it can estimate when each one is ready.', 'And the calendar fills in.',
  'Tomorrow, watch it grow. Part five.')
W('b5', [['hook', 'What will your balcony look like in three months? Slide the clock and see.'], ['open', 'Open your balcony.'], ['slide', 'Move the clock forward.'], ['zoom', 'Two weeks. One month. Two months.'], ['full', 'Pots full. Ready to pick.'], ['cta', 'Next, the same, but for a garden.']], {
  'hook': hook('BALCONY 5', 'Your balcony in three months'), 'endcard': end('GARDEN 1', 'Now, the garden version'),
  'clips': [
    {'from': 'g2', 'to': 'zoomed+1.2', 'vo': 'hook', 'smin': 0.8, 'smax': 1.6},
    {'from': 'home+0.3', 'to': 'map+0.8', 'vo': 'open'},
    {'from': 'map+0.8', 'to': 'g1', 'vo': 'slide'},
    {'from': 'g1', 'to': 'zoomed', 'vo': 'zoom'},
    {'from': 'zoomed', 'to': 'end', 'vo': 'full'},
    {'from': 'zoomed+1.2', 'to': 'g2', 'reverse': True, 'vo': 'cta', 'smin': 0.9, 'smax': 2.4},
  ]})

# ---------------- garden ----------------
q_series('g1', 'GARDEN', 1, 'A garden, and no idea where to begin?',
  'Got a back garden and no idea where to begin? Tell this app what you have.', ('GARDEN 2', 'What to plant first'),
  'Start with your garden.', 'Type its real size. A guess is fine.', 'Tell it how much sun it gets.', 'And the time you can give it.',
  'Tomorrow, what to plant first. Part two.', False)
crops_series('g2', 'GARDEN', 2, 'What to plant first in a new garden',
  'Not sure what to plant first? It picks easy wins for your garden.', ('GARDEN 3', 'Your first week, planned'),
  'Picked for your light, your space and the season.', 'Choose up to three. Fewer plants, better habits.', 'Then it draws your garden at its real size.', 'With a first bed, sized for the time you have.',
  'Tomorrow, your first week. Part three.')
plan_series('g3', 'GARDEN', 3, 'Your first shopping list, already written',
  'Not sure what to buy? Your first garden shopping list is already written.', ('GARDEN 4', 'Sowing, and the calendar'),
  'First, everything to buy, in one short list.', 'Then one small job a day. Mostly just watering.', 'And today\'s jobs wait on your home screen.',
  'Tomorrow, the first seeds go in. Part four.')
sow_series('g4', 'GARDEN', 4, 'Sow once. The calendar fills in',
  'Sowed your first seeds? One tap, and the calendar fills in.', ('GARDEN 5', 'A short morning walk'),
  'Open today\'s job.', 'Sowed it? Tap once.', 'Now it can estimate when each one is ready.', 'And your season is laid out.',
  'Tomorrow, a short walk round the garden. Part five.')
W('g5', [['hook', 'A short morning walk round your garden, one stop at a time.'], ['start', 'Tap morning walk.'], ['stops', 'It takes you to each bed.'], ['look', 'Tick it off. Tell it how it looks.'], ['done', 'A calm little ritual. Same time tomorrow?'], ['cta', 'Come back tomorrow. More soon.']], {
  'hook': hook('GARDEN 5', 'A short morning walk, one stop at a time'), 'endcard': {'secs': 2.5, 'lines': ['MORE SOON', 'Real growing, step by step', 'Follow along with me']},
  'clips': [
    {'from': 's1+0.3', 'to': 's1+3.6', 'vo': 'hook', 'smin': 0.8, 'smax': 1.3},
    {'from': 'home+0.3', 'to': 'walk', 'vo': 'start'},
    {'from': 'walk', 'to': 's2', 'vo': 'stops'},
    {'from': 's2', 'to': 'walk_end', 'vo': 'look'},
    {'from': 'walk_end', 'to': 'end', 'vo': 'done'},
    {'from': 's1+3.6', 'to': 's1+0.3', 'reverse': True, 'vo': 'cta', 'smin': 0.9, 'smax': 2.4},
  ]})
print('specs ok')
