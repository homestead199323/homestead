// Build-time imports keep the illustrated assets fingerprinted and precached offline.
const assets = import.meta.glob('../../assets/quiet/*.webp', {
  eager: true, import: 'default', query: '?url',
});
export function art(name) {
  return assets[`../../assets/quiet/${name}.webp`];
}
export function cropArtwork(crop = '', stage = 3, view = 'side') {
  const name = crop.toLowerCase();
  const primary = /tomato/.test(name) ? 'tomato' : /carrot|parsnip|fennel|dill/.test(name) ? 'carrot' : /lettuce|spinach|chard|kale|endive|rocket|arugula/.test(name) ? 'lettuce' : 'basil';
  const species = [
    [/strawberry/, 'strawberry'], [/pepper|chilli|chili/, 'pepper'], [/eggplant|aubergine/, 'eggplant'],
    [/bean|pea/, 'bean'], [/cucumber/, 'cucumber'], [/pumpkin|squash|courgette|zucchini|melon/, 'pumpkin'],
    [/cabbage/, 'cabbage'], [/broccoli|cauliflower/, 'broccoli'], [/onion|leek|garlic|chive/, 'onion'],
    [/rosemary|thyme|sage|oregano/, 'rosemary'], [/lavender/, 'lavender'], [/corn|maize|wheat|barley|oat/, 'corn'],
    [/olive/, 'olive'], [/lemon|orange|citrus/, 'lemon'], [/fig/, 'fig'],
    [/apple|pear|peach|plum|cherry|apricot|almond|walnut|avocado/, 'apple'],
  ].find(([test]) => test.test(name))?.[1];
  if (view === 'top' && !species) return art(`${primary}-top-${Math.max(2, Math.min(5, stage))}`);
  if (stage >= 4 && species) return art(species);
  return art(`${primary}-${Math.max(2, Math.min(5, stage))}`);
}
