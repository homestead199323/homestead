/* PRESERVATION RECIPES — step-by-step recipes that sit under a preservation method
   in Manuals → Preserving. Each recipe links to its parent method via `parent`.
     cheese_making  → 8 fresh cheeses from easy-to-find ingredients
     smoking_curing → 3 prosciutto-style whole-muscle cures (beginner → advanced)
   Fields: name, parent, cat, icon, difficulty, time (short), yield, shelf (short),
   overview, safety[], ingredients[], what_you_need, method[] (string steps; an
   ALL-CAPS "LABEL:" prefix is shown bold), storage, best_for, troubleshooting,
   science, tip, sources.
   Verified against: USDA/FSIS & foodsafety.gov storage charts, FDA 21 CFR 133,
   NHS pregnancy guidance, CDC, Oregon State / NMSU / UCCE / Univ. of Alaska
   extension, Univ. of Guelph dairy science, Consorzio del Prosciutto di Parma
   specification (2025), Santé publique France, Virginia Tech & Univ. of Kentucky
   country-ham guides, New England Cheesemaking Supply, Marianski. Added 2026-09-28. */

export const RECIPES = {

  /* ─────────────── CHEESE ─────────────── */

  ricotta: {
    name: "Ricotta (Whole-Milk)",
    parent: "cheese_making",
    cat: "Cheese Recipes",
    icon: "🥣",
    difficulty: "Easy",
    time: "1 hour",
    yield: "250–450 g from 2 L of milk (depends on draining time)",
    shelf: "Fridge 5–7 days",
    overview: "The easiest cheese there is: hot milk plus a splash of acid. No rennet, no cultures, no special kit — just milk, lemon juice or vinegar, and salt. Ready in under an hour and much fresher than shop ricotta. The perfect first cheese, and the fastest way to use surplus milk from your own cow or goats.",
    safety: [
      "Using your own raw milk? This recipe heats it to 88–91°C — above pasteurisation temperature — so no separate pasteurising is needed.",
      "Ricotta is a fresh, moist cheese: keep it in the fridge and treat it like milk."
    ],
    ingredients: [
      "2 L (½ US gallon) whole milk — not UHT / ultra-pasteurised",
      "80 ml (about 5 tbsp) fresh lemon juice or white vinegar — or ½ tsp citric acid dissolved in 60 ml water",
      "½ tsp fine non-iodised salt (to taste)"
    ],
    what_you_need: "Heavy-bottomed stainless-steel pot (not aluminium — acid reacts with it). Thermometer. Slotted spoon. Colander lined with a double layer of cheesecloth/muslin or a clean thin tea towel. A bowl to catch the whey.",
    method: [
      "Pour the milk into the pot, add the salt and warm over medium heat, stirring gently and scraping the bottom so it doesn't scorch.",
      "Heat to 88–91°C (190–195°F). Small flakes may appear from about 75°C — that's normal.",
      "Take the pot off the heat. Pour in the acid and stir slowly just 2–3 times — curds form almost immediately.",
      "Check the liquid between the curds: it should be clear and yellow-green. If it's still milky, stir in 1 more tablespoon of lemon juice or vinegar and wait a minute. Repeat once if needed.",
      "Leave undisturbed for 10 minutes so the curds firm up.",
      "Ladle the curds gently into the lined colander. Drain 10–15 minutes for soft, spoonable ricotta, or 30–60 minutes for firm ricotta for lasagne or baking.",
      "Tip into a clean container, cover and chill."
    ],
    storage: "Fridge (0–4°C) in a covered container: best within 5 days, up to 7. Freezing: not recommended for eating fresh — it turns watery and grainy — but frozen ricotta is fine for lasagne and baking (up to 6 months). The leftover liquid is acid whey: use it within a few days in bread dough, soups or smoothies. It will NOT make a second batch of ricotta.",
    best_for: "Lasagne, stuffed pasta, pancakes, cheesecake, on toast with honey, dotted over pizza after baking. Cow, goat or sheep milk all work — sheep milk gives the richest ricotta.",
    troubleshooting: "Few or no curds = milk not hot enough, or UHT / ultra-pasteurised milk — reheat to 88°C and add a little more acid. Rubbery, squeaky curds = too much acid or stirred too hard. Dry, grainy ricotta = drained too long — stir back a spoon of whey or cream. Tastes of lemon = use vinegar or citric acid next time (more neutral).",
    science: "Heat above about 85°C unfolds the whey proteins so they stick to the casein. The acid then drops the pH until the casein loses its charge and clumps into soft curds, carrying fat and those whey proteins with it. No rennet is involved — that's why ricotta is soft and grainy rather than sliceable.",
    tip: "Real Italian ricotta ('re-cooked') is made from the SWEET whey left after a rennet cheese like halloumi: heat that whey to 88–91°C within an hour of making the cheese, add vinegar a spoonful at a time until fine curds appear, and skim them into a fine cloth. For extra-rich whole-milk ricotta, swap 250 ml of the milk for double cream.",
    sources: "New England Cheesemaking Supply; UC Cooperative Extension Master Food Preservers; Univ. of Guelph Cheesemaking Technology; USDA FoodKeeper."
  },

  paneer: {
    name: "Paneer",
    parent: "cheese_making",
    cat: "Cheese Recipes",
    icon: "🍛",
    difficulty: "Easy",
    time: "1–2.5 hours",
    yield: "250–350 g from 2 L of milk",
    shelf: "Fridge 3–5 days",
    overview: "India's fresh pressed cheese: boiled milk split with lemon juice, then pressed into a firm block. It doesn't melt, so you can cube it, fry it and drop it into curries or onto skewers. Two ingredients, no special equipment.",
    safety: [
      "The milk is boiled, so your own raw milk is fine — no separate pasteurising needed.",
      "Paneer is fresh and unsalted with a short life: keep it cold and eat it within a few days."
    ],
    ingredients: [
      "2 L (½ US gallon) whole milk — full-fat gives the best yield; avoid UHT",
      "3 tbsp (45 ml) lemon juice or white vinegar mixed with 3 tbsp water — have 1–2 tbsp extra ready"
    ],
    what_you_need: "Large heavy pot. Wooden spoon. Colander lined with cheesecloth/muslin. A board, a plate, and a 3–5 kg weight (a big pot filled with water works).",
    method: [
      "Bring the milk to a gentle boil over medium heat, stirring often so it doesn't catch on the bottom.",
      "As soon as it rises and foams, turn off the heat and stir in the diluted lemon juice a little at a time.",
      "Stop adding acid when the milk splits into white curds and clear, yellow-green whey. If the whey stays milky, add another tablespoon and stir gently.",
      "Leave 5 minutes, then pour everything into the lined colander (set over a bowl if you want to keep the whey).",
      "Optional: rinse the curds under cold water to remove any lemon taste.",
      "Gather the cloth, twist and squeeze out the whey. Shape the wrapped curd into a flat square about 2–3 cm thick.",
      "Put it on a board, cover with a plate and the 3–5 kg weight. Press 30 minutes for soft paneer, up to 2 hours for a firm block that holds its shape when fried.",
      "Unwrap and cut into cubes or slabs. For a firmer, springier texture, soak the block in cold water in the fridge for 2–3 hours before using."
    ],
    storage: "Fridge in an airtight box: best within 3 days, up to 5. Freezing: possible for up to about 4 months, but thawed paneer turns crumbly — use it in curries, not for grilling. The whey is acid whey — good in bread dough, dal or soup.",
    best_for: "Palak paneer, paneer tikka, curries, stir-fries, barbecue skewers, scrambled paneer (bhurji). Cow's milk gives the firmest block; buffalo milk is traditional and richer.",
    troubleshooting: "Tiny curds that won't hold together = milk not hot enough, or UHT milk. Hard, rubbery paneer = too much acid or pressed too long and heavy — use less acid and press 30–60 minutes. Crumbles when cut = not pressed enough, or cut while warm — chill it first. Sour taste = rinse the curds before pressing.",
    science: "Boiling unfolds the whey proteins so they bind to the casein. Acid then drops the pH to about 5.3, where the casein clumps and traps the fat. Pressing knits the curds into a solid block. Because it's heat-and-acid set with no rennet, paneer softens in the pan but never melts.",
    tip: "Paneer is at its best within 24 hours — make it the day you cook with it. Want a seasoned block? Knead ½ tsp salt into the curds before pressing. Fresh cubes brown beautifully in a hot pan with a little ghee or oil.",
    sources: "NIFTEM (Govt. of India) paneer process; Univ. of Guelph Cheesemaking Technology; New England Cheesemaking Supply."
  },

  labneh: {
    name: "Labneh (Strained Yogurt Cheese)",
    parent: "cheese_making",
    cat: "Cheese Recipes",
    icon: "🫒",
    difficulty: "Easy",
    time: "12–48 h (mostly waiting)",
    yield: "About 500 g from 1 kg of yogurt (spreadable)",
    shelf: "Fridge up to 1 week",
    overview: "The simplest cheese of all: salted yogurt hung in a cloth until it turns thick, tangy and spreadable. No heating, no rennet, no thermometer. Strain it longer and it firms up enough to roll into balls and keep under olive oil.",
    safety: [
      "Use shop-bought pasteurised yogurt, or homemade yogurt made from milk you heated first.",
      "Strain it in the fridge, never on the counter.",
      "Labneh balls in olive oil must live in the fridge and be eaten within a week. Oil shuts out air, and botulism bacteria grow without it — in 2022 Canada recalled a shop-bought labneh in oil because it could let them grow. Keep the oil plain: no garlic or herbs in the jar."
    ],
    ingredients: [
      "1 kg (about 4 cups) plain full-fat yogurt, Greek-style or regular — check the label: no gelatin, starch or gums (they stop it draining)",
      "¾ tsp fine non-iodised salt (about 4 g)",
      "For labneh balls (optional): extra-virgin olive oil to cover; za'atar, dried mint or chilli flakes to sprinkle on when serving"
    ],
    what_you_need: "Sieve or colander. Double layer of cheesecloth/muslin (or a thin clean tea towel or large coffee filter). A bowl deep enough to hold the sieve above the whey. Cling film. For balls: a sterilised glass jar.",
    method: [
      "Stir the salt into the yogurt.",
      "Line the sieve with the damp cloth and set it over the bowl, leaving space underneath for the whey.",
      "Spoon in the yogurt, fold the cloth over (or cover with cling film) and put the whole set-up in the fridge.",
      "SPREADABLE: strain 10–12 hours — about half the weight drips out as whey.",
      "FIRM (FOR BALLS): strain 24–48 hours, squeezing the cloth gently once or twice. It should hold its shape like soft cream cheese.",
      "Scrape spreadable labneh into a clean container and chill. For balls: with lightly oiled hands, roll walnut-sized balls, chill them on a tray for a few hours to firm up, pack into the sterilised jar and cover completely with olive oil.",
      "Serve spread on a plate with a well of olive oil, za'atar or mint, and warm bread."
    ],
    storage: "Fridge in a covered container: up to 1 week (lab tests show about 9–10 days at 5°C — but only 2–3 days at room temperature). Labneh balls under oil: fridge only, eat within 1 week, always with a clean spoon. Keep the oil plain and add herbs when serving — oil with herbs or garlic in it, fresh OR dried, must be refrigerated and used within 4 days (Oregon State Univ. Extension). The oil turns cloudy and solid in the fridge: leave the jar out 15–20 minutes before serving, then put it back. Freezing: not recommended — it turns grainy.",
    best_for: "Mezze plates, breakfast with cucumber, tomato and olives, dips, instead of cream cheese on bagels, dolloped on roast vegetables or lamb. Goat's-milk yogurt makes a tangier labneh.",
    troubleshooting: "Won't thicken = yogurt with gelatin, starch or gums — use one with only milk and cultures. Too sour = strained too long or old yogurt — use fresh yogurt and the shorter time. Grainy = low-fat yogurt — use full-fat. Any mould (pink, orange, green or fuzzy spots) = throw the whole batch away.",
    science: "Yogurt is milk already curdled by lactic-acid bacteria. Straining simply removes whey (water, lactose, some minerals), roughly doubling the protein and fat. Its acidity, the salt and cold storage are what hold spoilage back — which is why it still needs the fridge.",
    tip: "Put a small weight (a saucer with a can on it) on the folded cloth to speed up straining. Mix a spoonful of labneh with grated cucumber, garlic and mint for an instant tzatziki-style dip, or sweeten with honey for a quick dessert.",
    sources: "America's Test Kitchen; Journal of Dairy Science (2002) labneh shelf-life study; Canadian Food Inspection Agency recall notice (2022); Oregon State Univ. Extension (herbs in oil)."
  },

  mascarpone: {
    name: "Mascarpone",
    parent: "cheese_making",
    cat: "Cheese Recipes",
    icon: "🍰",
    difficulty: "Easy",
    time: "Overnight",
    yield: "About 300–350 g from 500 ml of cream",
    shelf: "Fridge up to 1 week",
    overview: "The rich, spoonable Italian cream cheese behind tiramisu. There's no culture and no rennet: cream is heated, thickened with a little acid, and drained overnight. Two ingredients.",
    safety: [
      "Heating the cream to 85–88°C for 5 minutes also pasteurises it, so cream from your own animals is fine.",
      "It's a very moist fresh cheese — keep it cold and use it within a week."
    ],
    ingredients: [
      "500 ml (2 cups) double / heavy cream (36–48% fat) — UHT cream works but can turn out a little grainier",
      "1 tbsp (15 ml) fresh lemon juice — or ⅛ tsp tartaric acid (from wine and home-brew shops; NOT cream of tartar) dissolved in 1 tbsp water"
    ],
    what_you_need: "Small heavy pot, or a heatproof bowl over simmering water (bain-marie). Thermometer. Whisk. Fine sieve lined with 2–3 layers of fine cheesecloth/muslin or a coffee filter. Bowl.",
    method: [
      "Heat the cream gently, stirring, to 85–88°C (185–190°F). Use low heat or a bain-marie — don't let it boil or catch.",
      "Hold at that temperature for 5 minutes, stirring.",
      "Take off the heat and stir in the lemon juice (or tartaric acid solution). Keep stirring gently for 1–2 minutes: the cream thickens and coats the back of a spoon with fine flecks. It will NOT split into curds and whey — that's correct.",
      "Leave to cool at room temperature for 20–30 minutes, then cover.",
      "Pour into the lined sieve set over a bowl, cover and drain in the fridge: 1–2 hours for a soft, classic texture; 8–12 hours (overnight) for thick, firm mascarpone.",
      "Scrape into a clean container and whisk briefly for a smooth finish."
    ],
    storage: "Fridge in an airtight container: up to 1 week. Do not freeze — it splits and curdles when thawed. The little liquid that drains off is rich whey: use it in baking.",
    best_for: "Tiramisu, cheesecake, stirred into risotto or pasta sauce, with fresh berries and honey, cake fillings and frosting.",
    troubleshooting: "Stays runny = not drained long enough or not held hot long enough — drain longer in the fridge, and next time hold at 85–88°C for the full 5 minutes. Grainy or split = overheated or boiled — keep it below 90°C and stir. Too firm = drained too long — whisk in a spoon of cream. Lemony taste = use tartaric acid next time (flavourless).",
    science: "Cream is mostly fat droplets with only a little protein. Heat plus a small dose of acid makes those proteins link up around the fat into a soft gel. There's too little protein for real curds to form, so draining only removes some water — leaving a cheese that is 45–55% fat.",
    tip: "Make it the day before you need it: overnight draining gives the dense texture of shop mascarpone. One batch (about 300 g) is roughly what a tiramisu for 4 needs.",
    sources: "New England Cheesemaking Supply; GEA (industrial mascarpone process); Academy of Cheese (freezing)."
  },

  chevre: {
    name: "Chèvre (Fresh Goat Cheese)",
    parent: "cheese_making",
    cat: "Cheese Recipes",
    icon: "🐐",
    difficulty: "Easy–Intermediate",
    time: "1–2 days (mostly waiting)",
    yield: "About 450 g from 4 L of goat milk",
    shelf: "Fridge 7–10 days",
    overview: "Soft, tangy, spreadable goat cheese — THE homestead cheese for anyone with dairy goats. It barely needs any work: warm the milk slightly, add a starter and a few drops of rennet, and leave it overnight while the cultures do the job. Works with cow's milk too (then it's fromage frais).",
    safety: [
      "The milk is only warmed to room temperature, so the recipe does NOT heat-treat it. Pasteurise your own raw milk first (63°C for 30 minutes — see Pro Tip) or use pasteurised shop goat milk.",
      "Fresh cheese made from raw milk can carry Listeria, E. coli, Salmonella or Brucella — the riskiest foods of all for pregnant people, young children, the elderly and anyone with weak immunity.",
      "NHS: pasteurised goats' cheese without a white rind is fine in pregnancy — if you're pregnant, make it with shop-bought pasteurised milk."
    ],
    ingredients: [
      "4 L (1 US gallon) goat milk — pasteurised is fine, not UHT",
      "Starter: 1/16 tsp mesophilic culture (or a chèvre culture sachet, dosed as its label says) — OR 120 ml (½ cup) fresh cultured buttermilk labelled 'live cultures' (less predictable)",
      "Rennet: 2–4 drops of single-strength liquid rennet diluted in 2 tbsp cool non-chlorinated water — skip it if your chèvre culture already contains rennet",
      "1½–2 tsp flaky or cheese salt (non-iodised), to taste",
      "Optional: chopped fresh herbs, cracked pepper, or honey to finish"
    ],
    what_you_need: "Stainless-steel pot. Thermometer. Long spoon. Fine cheesecloth/butter muslin (or cheese moulds with holes). Colander and bowl. A hook or wooden spoon to hang the bag over a bowl. Cultures and rennet: cheesemaking or home-brew shops, or online. Non-chlorinated water = bottled, or boiled then cooled (chlorine can kill rennet).",
    method: [
      "Warm the milk gently to 20–22°C (68–72°F) — just room temperature.",
      "Sprinkle the culture on the surface, wait 2 minutes, then stir gently (or stir in the buttermilk).",
      "Add the diluted rennet and stir slowly up and down for 30 seconds. Then stop.",
      "Cover and leave undisturbed at room temperature (20–22°C) for 12–24 hours. It's ready when it has set into one soft mass pulling away from the sides, with a layer of clear yellowish whey on top.",
      "Line a colander with damp muslin, set it over a bowl and gently ladle in the curd.",
      "Tie the corners and hang the bag over the bowl (or leave it in the colander). Drain 6–12 hours at room temperature: shorter = soft and spreadable; longer = firm enough to shape into logs.",
      "Tip into a bowl, mix in the salt (and herbs if using), shape into logs or rounds, and chill."
    ],
    storage: "Fridge, wrapped or in a covered box: best within 7–10 days, up to 2 weeks. Freezes well: wrap tightly, freeze for up to a few months, and thaw slowly in the fridge (1–2 days) — the texture becomes slightly more crumbly. The whey is acid whey: use it in baking.",
    best_for: "On toast or crackers, salads with beetroot and walnuts, tarts, stuffed peppers, rolled in herbs or cracked pepper, drizzled with honey. A perfect first cheese for goat keepers.",
    troubleshooting: "No set after 24 hours = dead or old culture, room too cold, or UHT milk. The milk has sat warm without the acid that protects it — throw it away; don't try to re-culture it. Next time keep it at 20–22°C and use fresh culture. Very soft, won't drain = not set long enough, or ladled roughly. Bitter = too much rennet — use the minimum (2 drops). Too sour = set or drained too long or too warm. Any mould on fresh chèvre = discard.",
    science: "Mesophilic ('medium-temperature') bacteria slowly turn lactose into lactic acid at room temperature. The acid does most of the curdling — the tiny dose of rennet only firms the curd enough to drain well. This slow acid set is why chèvre is tangy and spreadable rather than stretchy or sliceable.",
    tip: "Pasteurising your own milk: heat to 63°C (145°F) and hold for 30 minutes — if it drops below 63°C, restart the timer. Then cool it fast in a sink of iced water, stirring, down to 20–22°C and carry on. Don't let it go above about 75°C — overheated milk sets weakly.",
    sources: "New England Cheesemaking Supply; Goat Journal; NMSU Extension E-216; Oregon State Univ. Extension (home pasteurisation); CDC (raw milk); NHS."
  },

  mozzarella: {
    name: "30-Minute Mozzarella",
    parent: "cheese_making",
    cat: "Cheese Recipes",
    icon: "🍕",
    difficulty: "Intermediate",
    time: "45 minutes",
    yield: "About 350–450 g from 4 L of milk",
    shelf: "Fridge 2–3 days (max 1 week)",
    overview: "Fresh, stretchy mozzarella in about half an hour — no cultures, no ageing. Citric acid does the acidifying, a little rennet sets the curd, then you heat and stretch it until it's smooth and shiny. The stretch takes a couple of attempts to master; it's worth it.",
    safety: [
      "The milk only reaches about 41°C before stretching, so pasteurise your own raw milk first (63°C for 30 minutes, then cool) — or use shop milk.",
      "Wear heat-proof gloves: the curd must reach 57°C and stretching water is about 80°C.",
      "NHS: pasteurised mozzarella is fine in pregnancy — if you're pregnant, use shop-bought pasteurised milk."
    ],
    ingredients: [
      "4 L (1 US gallon) whole milk — pasteurised is fine; NOT UHT or 'ultra-pasteurised' (it won't set). Don't add calcium chloride (it stops the stretch)",
      "1½ tsp citric acid powder dissolved in 250 ml (1 cup) cool water",
      "¼ tsp single-strength liquid rennet (or ¼ rennet tablet) dissolved in 60 ml (¼ cup) cool non-chlorinated water — rennet strengths vary, follow your label",
      "1 tsp flaky or cheese salt (non-iodised)"
    ],
    what_you_need: "Large stainless-steel pot. Thermometer. Long knife. Slotted spoon. Colander. Microwave-safe bowl (or a second pot of ~80°C water for the no-microwave method). Heat-proof rubber gloves. Bowl of iced water. Citric acid: baking/home-brew aisle or online. Rennet: cheesemaking or home-brew shops, or online.",
    method: [
      "Pour the citric acid solution into the pot, then add the cold milk and stir well.",
      "Heat slowly to 32°C (90°F), stirring gently.",
      "Take off the heat. Stir in the rennet solution with slow up-and-down strokes for 30 seconds, then stop the milk moving and cover.",
      "Leave 5 minutes. The curd should look like soft custard with clear whey at the edges and split cleanly around a knife. If it's still soft, give it up to 30 minutes more.",
      "Cut the curd into 2.5 cm (1 in) squares, all the way to the bottom.",
      "Back on low heat, warm to 41°C (105°F) — or 43°C (110°F) if you'll stretch in hot water — stirring gently for 2–5 minutes. The curds shrink and firm up.",
      "Scoop the curds into a colander and let the whey drain; press gently to squeeze out more.",
      "STRETCH IN THE MICROWAVE: put the curds in the bowl, microwave 1 minute, pour off the whey and fold the curd over itself. Heat in 30-second bursts, folding in between, until the curd reaches 57°C (135°F) — it turns glossy and stretches like taffy.",
      "OR STRETCH IN HOT WATER: dip the curds into water or whey at about 80°C (175°F) with a slotted spoon or gloved hands, fold and stretch, and re-dip as it stiffens.",
      "Sprinkle on the salt while stretching. Stop as soon as it's smooth and shiny — overworking makes it rubbery.",
      "Shape into balls, pinching the seam underneath, and drop into iced water for 5–10 minutes to hold the shape."
    ],
    storage: "Best eaten the same day or within 2–3 days. Fridge up to about 1 week in a covered box, submerged in lightly salted cold water or cooled whey so it doesn't dry out. Freezer: up to 1 month — it turns slightly crumbly, but it's fine for pizza and baking.",
    best_for: "Pizza, caprese salad with ripe tomatoes and basil, lasagne, panini, baked pasta. Best with fresh whole cow's milk; goat milk works but gives a softer, less stretchy curd.",
    troubleshooting: "Curd won't set, or turns to a ricotta-like mush = UHT / ultra-pasteurised milk (the most common cause), chlorinated water killed the rennet, old rennet, or milk too hot. Won't stretch, tears apart = not hot enough (get the curd to 57°C) or too little acid. Tough and rubbery = overheated or over-stretched — stop as soon as it's shiny. Very soft and sticky = too much acid or too hot — use slightly less citric acid next time.",
    science: "Citric acid lowers the pH to the point where rennet works fast and the curd can later stretch. Rennet cuts the casein so it forms a gel. Heating to about 57°C softens the protein network and melts the fat, and stretching lines the proteins up into long fibres — the 'pasta filata' that gives mozzarella its stringy texture.",
    tip: "Buy milk labelled just 'pasteurised'. In Germany look for 'traditionell hergestellt' and avoid 'H-Milch' and 'länger haltbar' (ESL) — anything UHT, ultra-pasteurised or ESL gives mush. Keep the whey for pizza or bread dough.",
    sources: "New England Cheesemaking Supply; UC Cooperative Extension; Univ. of Alaska Fairbanks Extension; NMSU Extension E-216; NHS."
  },

  halloumi: {
    name: "Halloumi",
    parent: "cheese_making",
    cat: "Cheese Recipes",
    icon: "🔥",
    difficulty: "Intermediate",
    time: "3–4 hours",
    yield: "About 450 g from 4 L of milk (plus a little bonus ricotta)",
    shelf: "1–2 weeks · in brine: months",
    overview: "Cyprus's famous grilling cheese: it squeaks, browns and doesn't melt in a hot pan. The secret is the last step — pressed slabs of curd are poached in their own hot whey until they float, which gives halloumi its springy texture. Just milk, rennet and salt, plus dried mint if you want it traditional.",
    safety: [
      "Cooking the curd in whey at 88–91°C for 30–40 minutes heat-treats the cheese, but pasteurising your own raw milk first is still the safer habit.",
      "Keep finished halloumi refrigerated. NHS: pasteurised halloumi is fine in pregnancy — if you're pregnant, use shop-bought pasteurised milk."
    ],
    ingredients: [
      "4 L (1 US gallon) whole cow, goat or sheep milk (or a mix) — not UHT",
      "¼ tsp single-strength liquid rennet (follow your label) in 60 ml cool non-chlorinated water",
      "Optional, for shop milk: ⅜ tsp calcium chloride (30% solution) in 60 ml cool water — gives a firmer set",
      "Salt: about 3% of the cheese weight (≈15 g per 450 g), plus extra for a storage brine",
      "Optional: 1 tsp dried mint (traditional)"
    ],
    what_you_need: "Large stainless-steel pot. Thermometer. Long knife. Slotted spoon. Colander lined with cheesecloth. A cheese mould or small square container with holes (or just the cloth-wrapped curd on a board). Board and a 1–2 kg weight. Cooling rack.",
    method: [
      "Warm the milk to 30–31°C (86–88°F). If using calcium chloride, stir it in and wait 5 minutes.",
      "Stir in the rennet with slow up-and-down strokes for 30 seconds. Cover and leave undisturbed 30–40 minutes, until the curd splits cleanly around a knife.",
      "Cut the curd into 2 cm cubes and rest 5 minutes.",
      "Very slowly raise the temperature to 38–41°C (100–106°F) over 20–30 minutes, stirring gently. Hold there, stirring now and then, for another 20–30 minutes until the curds are firm and springy.",
      "Ladle the curds into the lined mould or colander. KEEP ALL THE WHEY in the pot.",
      "Press under a 1–2 kg weight for 1–2 hours, turning the block every 15–20 minutes, until it's firm and rubbery.",
      "Cut the pressed curd into slabs about 8 × 12 cm and 2–3 cm thick.",
      "Heat the whey to 88–91°C (190–195°F) — hot but NOT boiling. Slide in the slabs and cook 30–40 minutes: they sink at first and float when done. Fine white curds may rise too — skim them off, that's bonus ricotta.",
      "Lift the slabs onto a rack to drain and cool for 20 minutes.",
      "While still warm, rub all over with the salt (and mint). Traditionally each slab is folded in half. Cool completely, then chill."
    ],
    storage: "Fridge, wrapped: 1–2 weeks — the flavour improves after 3–5 days. Long keeping: submerge in an 8–12% brine (80–120 g salt per litre of cooled whey or water) in the fridge — it keeps a few weeks up to several months and gets saltier (soak in fresh water for an hour before grilling if it's too salty). Freezer: halloumi freezes well — up to 6 months, best within 2–3.",
    best_for: "Grilled or pan-fried slices (no oil needed in a non-stick pan), barbecue skewers, salads with watermelon and mint, burgers, breakfast with eggs.",
    troubleshooting: "Slabs don't float after 40 minutes = keep cooking a little longer, and check the whey is really 88–91°C. Crumbles in the pan = not pressed or cooked in whey long enough. Weak, soft set = UHT milk, or shop milk without calcium chloride. Too salty = brine too strong — soak before cooking.",
    science: "Halloumi is made fast and without a starter culture, so it stays low in acid and the casein keeps its calcium — that's what holds the curd together under heat. The hot-whey cook then sets the proteins further. Together they let halloumi soften and brown without melting, and give it that squeak.",
    tip: "Don't waste the hot whey after cooking the slabs: skim off the fine curds that rise and drain them in a fine cloth — real whey ricotta (about 100–200 g from 4 L of milk).",
    sources: "New England Cheesemaking Supply; Kaminarides et al., Foods (2019); Academy of Cheese (freezing); NHS."
  },

  feta: {
    name: "Feta",
    parent: "cheese_making",
    cat: "Cheese Recipes",
    icon: "🥗",
    difficulty: "Intermediate",
    time: "3 days + brine ageing",
    yield: "Roughly 450–600 g from 4 L of milk",
    shelf: "In brine: up to 6 months",
    overview: "Salty, tangy, crumbly brined cheese — traditionally from sheep or goat milk. A starter culture sours the curd overnight, then it's salted and kept under brine, which is also how it's preserved. It needs three shop-bought extras (culture, rennet, calcium chloride), all from one cheesemaking supplier.",
    safety: [
      "The milk never goes above about 35°C, so pasteurise your own raw milk first (63°C for 30 minutes, then cool) or use shop milk.",
      "The overnight drain happens at room temperature on purpose — the culture's acid is what protects the cheese. Use an active culture and fresh milk; if the curd smells yeasty, bloats or develops holes, discard it.",
      "NHS: pasteurised feta is fine in pregnancy — if you're pregnant, use shop-bought pasteurised milk."
    ],
    ingredients: [
      "4 L (1 US gallon) whole milk — goat, sheep or cow (goat/sheep is traditional); not UHT",
      "Starter: 1/16 tsp mesophilic culture — OR 120 ml (½ cup) fresh cultured buttermilk labelled 'live cultures' (less predictable)",
      "Shop milk: ⅛ tsp calcium chloride (30% solution) in 60 ml cool water",
      "⅛–¼ tsp single-strength liquid rennet (follow your label) in 60 ml cool non-chlorinated water",
      "Salt for dry-salting: about 5% of the drained cheese weight (≈25 g per 500 g)",
      "Storage brine, per 1 L: 80 g salt + 2½ tsp (12 ml) calcium chloride 30% + 2 tsp (9 ml) white vinegar, topped up with water to 1 L"
    ],
    what_you_need: "Large stainless-steel pot. Thermometer. Long knife. Slotted spoon. Cheesecloth/butter muslin. Colander or feta moulds. A lidded box for salting. A glass jar or tub with a lid for the brine.",
    method: [
      "Warm the milk to 32–35°C (90–95°F).",
      "Sprinkle on the culture, wait 2 minutes, then stir (or stir in the buttermilk). Cover and keep at that temperature for 60–90 minutes to ripen.",
      "Stir in the calcium chloride solution (shop milk only) and wait 5 minutes. Add the rennet with slow up-and-down strokes for 30 seconds. Cover and leave undisturbed 45–50 minutes, until a clean break.",
      "Cut the curd into 1.5 cm cubes and rest 10 minutes.",
      "Stir gently for 15–30 minutes at the same temperature — the curds shrink and firm up.",
      "Ladle the curds into the cloth-lined colander or moulds. Drain overnight at room temperature (about 20°C), turning the block 2–3 times in the first few hours. By morning it should smell pleasantly tangy.",
      "SALT: cut into blocks of about 5 cm. Sprinkle half the salt over all sides, put in a lidded box in the fridge for 1 day and pour off the liquid. Next day, repeat with the rest of the salt.",
      "BRINE: make the storage brine, chill it, and put the feta in the jar completely covered. Lid on, into the fridge. Taste after a week — the flavour gets fuller over the following weeks."
    ],
    storage: "In the storage brine in the fridge: up to 6 months (commercial best-before) — it gets saltier and tangier with time; soak slices in water or milk for 30 minutes if too salty. Keep it fully submerged and always use a clean fork. Dry-salted without brine, wrapped: 1–2 weeks. Freezer: crumbled feta, up to 2–3 months for cooking — texture gets more crumbly.",
    best_for: "Greek salad, spinach pies (spanakopita), baked with tomatoes and peppers, crumbled over roast vegetables, watermelon and mint salad. Goat and sheep milk give the classic sharp, crumbly feta; cow's milk makes a milder, creamier one.",
    troubleshooting: "Slimy or mushy surface in brine = brine without calcium chloride and vinegar — it pulls calcium out of the cheese; use the brine recipe above. Too salty = soak before serving, or salt a little less next time. Not tangy by morning = the culture failed and the curd drained overnight without acid protection — throw it away. Next time use fresh culture and keep the drain around 20°C. Holes, bloating or a yeasty smell = contamination — discard.",
    science: "The culture makes lactic acid overnight, dropping the pH to about 4.7 — that acidity plus salt is what preserves feta. The brine keeps air and moulds out, while the calcium chloride and vinegar in it match the cheese's chemistry so the brine doesn't draw calcium out of the curd and soften it.",
    tip: "Start in the morning: you'll finish cutting and stirring by lunchtime and the curd drains overnight. Sheep milk gives noticeably more cheese per litre than cow's milk, because it has more fat and protein.",
    sources: "New England Cheesemaking Supply (beginner feta); Univ. of Guelph Cheesemaking Technology (feta brine); NMSU Extension E-216; NHS."
  },

  /* ─────────────── PROSCIUTTO & CURED MEATS ─────────────── */

  duck_prosciutto: {
    name: "Duck Prosciutto (Beginner Cure)",
    parent: "smoking_curing",
    cat: "Cured Meat Recipes",
    icon: "🦆",
    difficulty: "Easy–Intermediate",
    time: "3–4 weeks",
    yield: "About 70% of the raw weight (30% is lost as water)",
    shelf: "Fridge up to 1 month",
    overview: "The best first cure: a whole duck breast salted, then air-dried for two or three weeks until it slices like silky prosciutto with a ribbon of sweet fat. Small, cheap and quick — it teaches you weighing, curing and drying before you risk a whole pork leg.",
    safety: [
      "Poultry carries Salmonella more often than pork or beef. A 2015 outbreak at a restaurant in Darwin, Australia (21 people ill, 7 went to hospital) came from duck prosciutto cured and dried at room temperature. Cure ONLY in the fridge (1–4°C) and dry ONLY at 10–15°C — never on the kitchen counter.",
      "Curing and drying stop Salmonella multiplying but don't reliably kill what's already on the meat — so use very fresh breasts from an inspected source, and keep boards, hands and knives clean.",
      "Weigh the salt and cure exactly. Cure #2 is toxic in large amounts: keep it labelled, away from children, and never use it as table salt.",
      "Pregnant people, young children, people over 65 and anyone with weakened immunity should not eat raw-cured meat unless it's cooked until steaming hot (NHS, CDC)."
    ],
    ingredients: [
      "1–2 duck breasts, skin and fat on (Magret/Moulard, Muscovy or Pekin, 300–500 g each)",
      "Salt (non-iodised): 3% of the meat weight — 30 g per kg (e.g. 12 g for a 400 g breast)",
      "Cure #2 (Prague Powder #2 / Instacure #2 — 6.25% nitrite + 4% nitrate): 0.25% of the meat weight — 2.5 g per kg (e.g. 1.0 g for a 400 g breast). Don't substitute European nitrite curing salt (Nitritpökelsalz / sel nitrité) — it's a different, much weaker product",
      "Optional: sugar 0.5% (5 g per kg); 1 tsp cracked black or white pepper; a few crushed juniper berries; thyme; orange zest"
    ],
    what_you_need: "Digital kitchen scale plus a 0.1 g pocket scale for the cure. Zip-lock or vacuum bag. Fridge. Cheesecloth or butcher's netting and string. A place to hang it at 10–15°C and 70–85% humidity with gentle air movement — a cool cellar, or a fridge/wine-fridge curing chamber with a temperature and humidity controller. Thermometer-hygrometer. Notebook for weights.",
    method: [
      "Trim loose bits and silverskin; leave the fat cap on. Pat dry. WEIGH the breast(s) and write the weight down.",
      "Calculate: salt = weight × 0.03; Cure #2 = weight × 0.0025; sugar (optional) = weight × 0.005. Mix with the pepper and herbs.",
      "Rub the mix evenly over every surface, including the edges. Put in the bag, press out the air, and refrigerate at 1–4°C.",
      "Cure 7 days (up to 10 for thick breasts), flipping the bag every day. With this weighed method it can't get too salty, so extra days do no harm.",
      "Rinse off the spices quickly under cold water and pat very dry. Dust with fresh cracked pepper if you like.",
      "Wrap in 2 layers of cheesecloth (or netting), tie with string, and hang at 10–15°C and 70–85% humidity. Weigh every few days.",
      "It's ready when it has lost 30% of its starting weight from step 1 (e.g. 400 g → 280 g) and feels firm but still yielding — usually 2–3 weeks.",
      "Unwrap, wipe off any white bloom with a vinegar-dampened cloth if you like, and slice paper-thin against the grain."
    ],
    storage: "Whole breast wrapped in baking paper or vacuum-sealed, in the fridge: eat within 1 month — it slowly keeps drying. Sliced: wrap tightly, fridge, eat within 3 days. Freezer: possible for up to 1 month but it loses texture — not recommended. Dried too hard on the outside? Vacuum-seal it and rest it in the fridge for 2 weeks — moisture evens out.",
    best_for: "Thin slices on a charcuterie board, with melon or figs, on salads, on pizza after baking. Fatty Magret/Moulard or Muscovy breasts give the best result; Pekin breasts are smaller and dry faster.",
    troubleshooting: "Hard dark outside, soft raw-looking inside (case hardening) = air too dry or too much airflow — raise humidity to 75–85%, reduce the fan, and vacuum-rest in the fridge for 2 weeks. Slimy surface or sour smell = dried too warm or too humid, or poor hygiene — discard. White powdery mould = harmless. Green, black, yellow or fuzzy mould = discard (on a piece this small, don't try to scrub it off).",
    science: "Salt pulls water out of the muscle and dissolves into it, lowering its 'water activity' so bacteria struggle to grow. Nitrite from the cure turns into nitric oxide, fixing the rosy colour and blocking Clostridium botulinum; the nitrate in Cure #2 slowly converts into more nitrite during drying. Losing 30% of its weight concentrates everything, leaving a firm, dense meat you can slice thin.",
    tip: "Write everything down: date, starting weight, grams of salt and cure, and every weigh-in. The classic method — burying the breast in salt for 24 hours — works too, but the weighed method never comes out too salty.",
    sources: "Communicable Diseases Intelligence 41(1), 2017 (Darwin outbreak); USDA FSIS guideline GD-2023-0002; Hank Shaw (Honest Food); Ruhlman & Polcyn, Charcuterie; NHS; CDC."
  },

  lonzino: {
    name: "Lonzino — Cured Pork Loin ('Mini Prosciutto')",
    parent: "smoking_curing",
    cat: "Cured Meat Recipes",
    icon: "🥓",
    difficulty: "Intermediate",
    time: "6–10 weeks",
    yield: "About 65–70% of the raw weight",
    shelf: "Vacuum-sealed: 1–2 months",
    overview: "Tastes like prosciutto, made from a boneless pork loin in 6–10 weeks instead of 14 months. It's one clean muscle with no bone, so the salt reaches the centre easily — the safest way to learn whole-muscle pork curing before you try a leg.",
    safety: [
      "Use pork from an inspected source (supermarket or licensed butcher). Home-raised pigs: have the carcass tested for Trichinella — mandatory in Germany and required for many pigs across the EU. Never raw-cure wild boar: curing doesn't reliably kill Trichinella, and freezing may not kill the freeze-resistant kinds found in wild game.",
      "Cure ONLY in the fridge (1–4°C). Dry at 10–15°C — never warmer.",
      "Weigh salt and Cure #2 exactly. Cure #2 is toxic in large amounts: label it, keep it away from children, never use it as table salt.",
      "Pregnant people, young children, people over 65 and anyone with weakened immunity should only eat it cooked until steaming hot (NHS, CDC)."
    ],
    ingredients: [
      "1 centre-cut boneless pork loin, 1.5–2.5 kg, with a thin (about 5 mm) layer of fat left on top",
      "Salt (non-iodised): 3% of the trimmed weight — 30 g per kg",
      "Cure #2 (Prague Powder #2 / Instacure #2): 0.25% — 2.5 g per kg. Don't substitute European nitrite curing salt (Nitritpökelsalz) — different strength",
      "Sugar: 0.5% — 5 g per kg (optional)",
      "Spices per kg (optional): 4 g cracked black pepper, 2 g fennel seeds, 1 crushed garlic clove, 3–4 crushed juniper berries",
      "Casing: a beef middle or large collagen casing (65–90 mm) — or 2 layers of cheesecloth plus butcher's netting"
    ],
    what_you_need: "Kitchen scale plus a 0.1 g scale for the cure. Vacuum or large zip-lock bag. Fridge. Casing (or cheesecloth + netting). Butcher's string. A sterile needle or sausage pricker. A curing space at 10–15°C and 70–80% humidity with gentle airflow. Thermometer-hygrometer. Notebook.",
    method: [
      "Trim off the silverskin and any loose meat, and square off the ends. Leave the thin fat layer on top. WEIGH it and write the weight down.",
      "Calculate salt (× 0.03), Cure #2 (× 0.0025) and sugar (× 0.005). Mix with the spices.",
      "Rub the cure into every surface. Bag it, press out the air, and refrigerate at 1–4°C.",
      "Cure 10–14 days, turning the bag every 1–2 days and massaging the liquid around.",
      "Rinse quickly and pat very dry. Optional: roll in cracked pepper.",
      "Stuff into the soaked casing (or wrap tightly in 2 layers of cheesecloth), tie firmly, and truss with string every 3–4 cm. Prick any air pockets with the sterile needle.",
      "WEIGH again and write down this hanging weight. Hang at 10–15°C and 70–80% humidity with gentle air movement.",
      "Weigh it every week. It's ready at 30–35% loss from the hanging weight — usually 4–8 weeks. It should feel firm all the way through with just a little give in the centre.",
      "Peel off the casing and slice very thin."
    ],
    storage: "Whole, vacuum-sealed or wrapped in baking paper, in the fridge: 1–2 months — the flavour keeps improving for the first few weeks. (USDA gives 2–3 months for cut commercial dry-cured ham; with homemade, stay at the shorter end.) Sliced: eat within 3 days. Freezer: up to 1 month, but the texture suffers — not recommended.",
    best_for: "Antipasti boards, with melon or figs, sandwiches with rocket and parmesan, wrapped round asparagus or grissini.",
    troubleshooting: "Case hardening (dark hard ring outside, soft centre) = humidity too low or too much airflow — raise humidity to 75–80%, cut the fan, and vacuum-seal and rest it in the fridge for 2–3 weeks to even out. White powdery mould = the good kind (Penicillium). Small green or blue spots = wipe off with a vinegar-dampened cloth and watch; black, yellow, orange, pink or furry mould, or mould that has grown into the meat = discard. Sour, rotten or 'off' smell when cut = discard. Casing pulling away from the meat = air pockets — prick them and truss tighter.",
    science: "Salt dissolves into the meat and lowers its water activity; nitrite blocks Clostridium botulinum and fixes the colour; the nitrate in Cure #2 slowly turns into nitrite during the weeks of drying, keeping the protection going in the centre. Slow drying at high humidity lets water move out of the middle as fast as it leaves the surface — which is what prevents case hardening.",
    tip: "A reliable curing chamber = an old fridge + a plug-in temperature controller + a small humidifier (set about 12–13°C and 75% humidity). In Western Europe a cellar or garage is only cool enough from late autumn to early spring and swings too much — check it with a thermometer-hygrometer for a week before trusting it.",
    sources: "Marianski, Home Production of Quality Meats and Sausages (dry-cured loins, lomo); Ruhlman & Polcyn, Salumi; EU Regulation 2015/1375 & CDC (Trichinella); foodsafety.gov cold-storage chart; NHS; CDC."
  },

  prosciutto_leg: {
    name: "Prosciutto Crudo — Whole Leg",
    parent: "smoking_curing",
    cat: "Cured Meat Recipes",
    icon: "🍖",
    difficulty: "Advanced",
    time: "12–18 months",
    yield: "A 10 kg fresh leg gives about 6.5–7 kg of ham",
    shelf: "Once cut: about 40 days",
    overview: "The real thing: a whole pork leg, salt, cold and time. Parma ham is made from nothing but pork and sea salt and aged at least 14 months — this recipe follows the same stages, scaled for one leg at home. It's a 12–18-month project and the one most likely to go wrong, so only start when you have (1) a fridge that can hold the leg at 1–4°C for three months, (2) a place that stays at 12–15°C for a year, and (3) a scale that weighs 20 kg.",
    safety: [
      "Botulism is the real risk. In France, home-made or small-producer dry-cured ham has been the single biggest source of foodborne botulism outbreaks (Santé publique France). It happens when the leg gets warm before the salt has reached the centre. The WHOLE cold stage — salting plus resting, at least 90 days — must stay at 1–4°C (aim for 2–3°C). If the leg sits above 5°C during that time, don't continue.",
      "Use too much salt rather than too little: outbreaks are linked to under-salted ham (below about 5% salt).",
      "Pork source: a fresh leg from an inspected source, ideally 1–3 days after slaughter and never frozen. Home-raised pigs: have the carcass tested for Trichinella. Never raw-cure wild boar.",
      "Before cutting, always do the SMELL TEST (see that step). Any sour, putrid or rotten smell near the bone = throw the whole ham away.",
      "Pregnant people, young children, people over 65 and anyone with weakened immunity should only eat it cooked until steaming hot (NHS, CDC)."
    ],
    ingredients: [
      "1 fresh pork hind leg, skin and trotter on, 9–12 kg, with a good fat layer (2 cm or more)",
      "5–10 kg coarse sea salt, non-iodised (enough to cover the leg twice — much of it is thrown away)",
      "Optional extra insurance: Cure #2 at 2.5 g per kg of trimmed leg weight (e.g. 25 g for 10 kg), weighed exactly. Traditional Parma uses none; many home curers use it",
      "For the 'sugna' paste (month 5–7): about 200 g lard mixed with 1 tbsp salt, 1 tbsp ground black pepper and 2–4 tbsp rice flour to a thick paste"
    ],
    what_you_need: "A fridge or cold room that holds 1–4°C for 3 months with room for the leg in a tub. A food-grade plastic tub or deep tray. A board and 10+ kg of weights (water bottles work). A scale that weighs 20 kg. Thermometer-hygrometer. A ham bag or cheesecloth, butcher's hook and string. An ageing space at 12–15°C and 70–80% humidity for 9–15 months (cellar or curing chamber). A thin bamboo skewer for the smell test. A notebook.",
    method: [
      "CHILL: keep the leg at 0–4°C for 24 hours so it's cold right through and firm to trim.",
      "TRIM: remove the aitch (pelvic) bone — or ask your butcher to — leaving just the ball of the thigh bone showing. Trim the cut face into a smooth rounded shape with no flaps or pockets where salt can't reach, and trim the skin and fat back a few centimetres around the cut face so salt can get in.",
      "PRESS OUT THE BLOOD: push firmly with your thumbs along the main blood vessel, from the hock towards the exposed end, until no more blood comes out. Leftover blood spoils first.",
      "WEIGH: write down the trimmed weight — every number from here on uses it.",
      "OPTIONAL CURE #2: weigh 2.5 g per kg and rub it into all the exposed meat, especially around the bone end.",
      "FIRST SALTING (7 DAYS): spread 2 cm of salt in the tub, lay the leg in it, rub salt firmly into all exposed meat, then pack a thick layer over the cut face and around the bone end; a thin layer over the skin is enough. Put a board and 10+ kg of weight on top. Refrigerate at 1–4°C. Pour off the liquid that collects every 2–3 days.",
      "SECOND SALTING: after 7 days, brush off the old salt, re-pack with fresh salt the same way, weight it and return it to the cold. Total time in salt = 1.5–2 days per kg of trimmed weight (a 10 kg leg: 15–20 days, including the first week). Beginners: use the longer time.",
      "RESTING (THE KEY STAGE): brush off all the salt, wipe the leg dry, and hang it or lay it on a rack in the fridge at 1–4°C and 70–80% humidity until salting + resting add up to at least 90 days (about 10 more weeks). The salt spreads evenly to the centre while the surface dries.",
      "WASH AND DRY: rinse in lukewarm water, scrub off the salt crust, pat dry and let it dry for 1–2 days at 12–15°C.",
      "AGEING: put it in a ham bag or wrap it in cheesecloth (keeps insects off) and hang at 12–15°C and 70–80% humidity with gentle air movement. Weigh it every month and write it down.",
      "SUGNA (MONTH 5–7): once the exposed meat is firm and dry, smear the lard paste over all exposed meat and cracks (not the skin). It stops the meat drying too hard while the inside keeps maturing.",
      "READY WHEN BOTH ARE TRUE: at least 12 months from the start of salting (Parma requires 14), AND the leg has lost at least 30% of its trimmed weight (10 kg → 7 kg or less).",
      "SMELL TEST: push a clean thin bamboo skewer deep in beside the bone joint and in 2–3 other spots near the bone. Pull it out and smell immediately. It should smell sweet, nutty and cured. Sour, putrid or rotten anywhere = throw the whole ham away. Use a fresh or washed skewer for each spot.",
      "SLICE: cut paper-thin across the widest part, trimming skin and outer fat back only as far as you're cutting."
    ],
    storage: "Uncut, on the bone: it keeps hanging at 12–15°C for months after it's ready, slowly drying further. Once cut: cover the cut face with a slice of its own fat or baking paper plus cling film, keep it cool (below 15°C, or in the fridge) and finish it within about 40 days. Boneless pieces, vacuum-sealed, in the fridge: USDA gives 2–3 months for cut dry-cured ham — with homemade, stay at the shorter end. Sliced: eat within 3 days. Freezing: not recommended (Parma consortium) — it ruins the texture.",
    best_for: "Paper-thin slices with melon or figs, on pizza after baking, with good bread and butter, wrapped round grissini. The bone and trimmings flavour soups and bean stews (cook them).",
    troubleshooting: "Sour or putrid smell near the bone ('bone sour') = the leg was too warm before the salt reached the centre, or blood was left in — discard the whole ham. Deep cracks or very hard dark outer meat = air too dry or too fast — raise humidity and apply the sugna earlier. Soft slimy surface = too humid or too little salt — wipe with vinegar, lower humidity, improve airflow; if you suspect it was under-salted, do the skewer smell test now — any off smell = discard. Fine dust or tiny moving specks = ham mites — brush off, rub with lard, and keep it in a ham bag. White mould = harmless; green or blue spots = scrub off with a vinegar-dampened cloth; black, yellow or hairy mould growing into the meat = cut well beyond it, or discard if it's widespread.",
    science: "Salt moves into the leg only about 2.5 cm (1 inch) a week, pulling water out and lowering water activity until spoilage bacteria can't grow. Until it reaches the centre, only cold protects the meat: Clostridium botulinum type B — the kind in French ham outbreaks — can grow from about 3.3°C. That's why the cold stage is long and strict. During ageing, the leg's own enzymes slowly break proteins and fats into the sweet, nutty flavour of prosciutto.",
    tip: "Practise on duck prosciutto and lonzino first. Keep a log: date, trimmed weight, days in salt, a daily temperature check during the cold stage, and monthly weights. In Western Europe, winter garages and sheds swing between 0 and 10°C+ — don't trust them for the cold stage; use a fridge. If the fridge fails during the cold stage: if the leg was above 5°C for no more than about 4 hours and smells fine, stop the cure, soak it and cook it right away as a boiled ham. If it was warm for longer — or you don't know how long — throw it away. A fridge thermometer with min/max memory tells you.",
    sources: "Consorzio del Prosciutto di Parma — specification (17 May 2025) and 'Making Parma Ham'; Santé publique France BEH 2018 and Toxins 2020 (botulism & home-cured ham); US FDA Fish & Fishery Hazards Guide ch. 13; Univ. of Kentucky ASC-213 & Virginia Tech country-ham guides; foodsafety.gov; NHS; CDC."
  }
};
