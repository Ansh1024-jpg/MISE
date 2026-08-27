/**
 * flavourMatrix.ts — MISE reasoning layer
 *
 * A client-side flavour model over the fixed competition pantry. Its job is to
 * compute pairing candidates BEFORE any model call, and inject them into the
 * concept prompt as given facts. Without this the app is a prompt wrapper.
 *
 * A note on method, because it affects how you should pitch this:
 *
 * The "shared aroma compound" hypothesis (Ahn et al., 2011) found that Western
 * recipes favour ingredient pairs sharing volatile compounds — but East Asian
 * recipes trend the OPPOSITE way, favouring pairs that share few. This pantry
 * leans Indian and Southeast Asian (curry leaves, lemongrass, tamarind,
 * jaggery, coconut). So maximising compound overlap alone is the wrong
 * objective here. This module scores four things instead:
 *
 *   1. compound overlap        — the classic bridge signal
 *   2. functional balance      — does the set cover fat / acid / sweet / umami
 *   3. curated affinity        — culinary traditions that already solved it
 *   4. familiarity penalty     — how tired the pairing is
 *
 * (4) is the one that earns points. The rubric rewards uniqueness and a
 * distinctive concept, so the engine surfaces pairs with HIGH affinity and LOW
 * familiarity — defensible surprise rather than novelty for its own sake.
 *
 * Compound tags are curated approximations of real volatile families, not lab
 * data. Say that out loud if a judge asks; it is a stronger answer than
 * implying a dataset you don't have.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role =
  | 'protein'
  | 'vegetable'
  | 'fruit'
  | 'starch'
  | 'fat'
  | 'aromatic'
  | 'seasoning'
  | 'wildcard';

/** 0–10 functional axes. `body` = textural contribution, not flavour. */
export interface Axes {
  fat: number;
  acid: number;
  sweet: number;
  bitter: number;
  umami: number;
  heat: number;
  aroma: number;
  body: number;
}

export interface IngredientProfile {
  role: Role;
  compounds: string[];
  axes: Axes;
  /** Techniques that unlock this ingredient's less obvious side. */
  unlocks: string[];
}

export interface Affinity {
  a: string;
  b: string;
  /** 0–1. How well the pair works, independent of how novel it is. */
  strength: number;
  /** 0–1. How well-trodden it is. 0.9 = everyone has eaten this. */
  familiarity: number;
  note: string;
}

export interface ScoredPair {
  a: string;
  b: string;
  score: number;
  affinity: number;
  familiarity: number;
  overlap: string[];
  note: string;
}

export interface ScoredTrio {
  members: string[];
  score: number;
  coverage: string[];
  gaps: string[];
  rationale: string;
}

const ax = (
  fat: number, acid: number, sweet: number, bitter: number,
  umami: number, heat: number, aroma: number, body: number,
): Axes => ({ fat, acid, sweet, bitter, umami, heat, aroma, body });

// ---------------------------------------------------------------------------
// The pantry
// ---------------------------------------------------------------------------

export const PANTRY: Record<string, IngredientProfile> = {
  // --- Protein -------------------------------------------------------------
  tofu: {
    role: 'protein',
    compounds: ['legume-pyrazine', 'neutral-canvas', 'umami-glutamate'],
    axes: ax(3, 0, 1, 1, 4, 0, 1, 6),
    unlocks: ['press-and-sear', 'freeze-thaw for sponge texture', 'silken purée', 'smoke'],
  },
  'red lentils': {
    role: 'protein',
    compounds: ['legume-pyrazine', 'earthy', 'starchy-neutral'],
    axes: ax(1, 0, 2, 2, 3, 0, 2, 7),
    unlocks: ['collapse into velouté', 'crisp-fry raw for crunch', 'ferment into batter'],
  },
  'green lentils': {
    role: 'protein',
    compounds: ['legume-pyrazine', 'earthy', 'green-hexanal'],
    axes: ax(1, 0, 1, 3, 3, 0, 2, 8),
    unlocks: ['hold shape as caviar substitute', 'sprout', 'confit in fat'],
  },
  chickpeas: {
    role: 'protein',
    compounds: ['legume-pyrazine', 'nutty-maillard', 'starchy-neutral'],
    axes: ax(2, 0, 2, 2, 3, 0, 2, 8),
    unlocks: ['aquafaba as foam/meringue', 'flour into panisse', 'blister-roast'],
  },
  'black beans': {
    role: 'protein',
    compounds: ['legume-pyrazine', 'earthy', 'roasted-thiol'],
    axes: ax(1, 0, 2, 4, 4, 0, 3, 8),
    unlocks: ['mole-style purée', 'black cooking liquor as sauce base', 'char'],
  },
  'mung beans': {
    role: 'protein',
    compounds: ['legume-pyrazine', 'green-hexanal', 'starchy-neutral'],
    axes: ax(1, 0, 2, 2, 3, 0, 2, 7),
    unlocks: ['sprout for raw crunch', 'batter for crepe', 'sweet dessert paste'],
  },

  // --- Vegetables ----------------------------------------------------------
  tomato: {
    role: 'vegetable',
    compounds: ['green-hexanal', 'umami-glutamate', 'ester-fruity', 'sulfurous-trace'],
    axes: ax(0, 6, 3, 1, 8, 0, 5, 4),
    unlocks: ['slow-dry to concentrate', 'clarify into consommé', 'burn skin for smoke'],
  },
  mushroom: {
    role: 'vegetable',
    compounds: ['earthy-geosmin', 'umami-glutamate', 'roasted-thiol', 'octenol'],
    axes: ax(1, 0, 1, 3, 9, 0, 6, 7),
    unlocks: ['dry-sear before fat', 'dehydrate to powder', 'brine as bacon substitute'],
  },
  cauliflower: {
    role: 'vegetable',
    compounds: ['sulfurous', 'green-hexanal', 'nutty-maillard'],
    axes: ax(0, 0, 2, 3, 3, 0, 4, 7),
    unlocks: ['whole-roast for a centrepiece', 'raw shaved couscous', 'charred purée'],
  },
  beetroot: {
    role: 'vegetable',
    compounds: ['earthy-geosmin', 'caramel-furanone', 'sweet-earth'],
    axes: ax(0, 2, 6, 3, 3, 0, 5, 7),
    unlocks: ['salt-bake', 'juice reduced to glaze', 'cure other ingredients with it'],
  },
  'sweet potato': {
    role: 'vegetable',
    compounds: ['caramel-furanone', 'maillard-pyrazine', 'starchy-neutral', 'sweet-earth'],
    axes: ax(0, 0, 7, 1, 3, 0, 4, 8),
    unlocks: ['slow low roast for maltose conversion', 'crisp threads', 'sweet-course pivot'],
  },

  // --- Fruit ---------------------------------------------------------------
  apple: {
    role: 'fruit',
    compounds: ['ester-fruity', 'malic', 'green-hexanal', 'floral-linalool'],
    axes: ax(0, 6, 6, 1, 0, 0, 5, 5),
    unlocks: ['quick-pickle raw', 'burnt-apple purée', 'juice as acid instead of lemon'],
  },
  lemon: {
    role: 'fruit',
    compounds: ['citral', 'citric', 'terpene-pinene', 'floral-linalool'],
    axes: ax(0, 10, 1, 4, 0, 0, 8, 1),
    unlocks: ['preserve in salt for 20 min', 'burnt-zest oil', 'whole-fruit purée for bitterness'],
  },
  pineapple: {
    role: 'fruit',
    compounds: ['ester-fruity', 'citric', 'caramel-furanone', 'sulfurous-trace'],
    axes: ax(0, 7, 8, 1, 2, 0, 7, 5),
    unlocks: ['char to caramelise', 'bromelain tenderises/ruins dairy — use fast', 'core as stock'],
  },
  mango: {
    role: 'fruit',
    compounds: ['ester-fruity', 'terpene-pinene', 'lactone-creamy', 'floral-linalool'],
    axes: ax(1, 4, 8, 1, 0, 0, 7, 6),
    unlocks: ['use unripe as a souring agent', 'purée as an emulsion body', 'dehydrate to leather'],
  },
  pomegranate: {
    role: 'fruit',
    compounds: ['tartaric-sour', 'ester-fruity', 'phenolic', 'tannic'],
    axes: ax(0, 7, 5, 4, 0, 0, 5, 3),
    unlocks: ['reduce juice to molasses', 'seeds as textural burst', 'tannin as a bitter counterweight'],
  },

  // --- Starch --------------------------------------------------------------
  rice: {
    role: 'starch',
    compounds: ['starchy-neutral', 'popcorn-acetylpyrroline', 'nutty-maillard'],
    axes: ax(0, 0, 2, 0, 1, 0, 2, 7),
    unlocks: ['puff dried grains', 'toast raw then grind', 'ferment batter overnight — too slow here'],
  },
  corn: {
    role: 'starch',
    compounds: ['starchy-neutral', 'popcorn-acetylpyrroline', 'caramel-furanone', 'sweet-earth'],
    axes: ax(1, 0, 7, 0, 3, 0, 4, 6),
    unlocks: ['char on high heat', 'milk the cobs for a sweet liquid', 'pop as garnish'],
  },
  potato: {
    role: 'starch',
    compounds: ['starchy-neutral', 'earthy-geosmin', 'maillard-pyrazine'],
    axes: ax(0, 0, 2, 1, 2, 0, 2, 9),
    unlocks: ['confit in fat', 'crisp lattice', 'cold-water rinse for glassy texture'],
  },
  polenta: {
    role: 'starch',
    compounds: ['starchy-neutral', 'popcorn-acetylpyrroline', 'caramel-furanone'],
    axes: ax(1, 0, 4, 0, 2, 0, 3, 8),
    unlocks: ['set firm then grill', 'loose and pourable as a sauce', 'fry into crisp shards'],
  },
  cassava: {
    role: 'starch',
    compounds: ['starchy-neutral', 'earthy', 'neutral-canvas'],
    axes: ax(0, 0, 3, 1, 1, 0, 1, 9),
    unlocks: ['double-fry for glass crust', 'grate into a binding starch', 'pearl-like texture'],
  },

  // --- Fat / Dairy ---------------------------------------------------------
  'olive oil': {
    role: 'fat',
    compounds: ['green-hexanal', 'phenolic', 'peppery-bitter', 'terpene-pinene'],
    axes: ax(9, 0, 0, 4, 0, 1, 5, 3),
    unlocks: ['emulsify into a sauce', 'infuse with aromatics cold', 'use raw as a finishing note'],
  },
  butter: {
    role: 'fat',
    compounds: ['buttery-diacetyl', 'lactone-creamy', 'maillard-pyrazine'],
    axes: ax(9, 0, 2, 0, 2, 0, 4, 5),
    unlocks: ['brown to nut solids', 'mount a sauce', 'whip cold with acid'],
  },
  ghee: {
    role: 'fat',
    compounds: ['buttery-diacetyl', 'nutty-maillard', 'lactone-creamy', 'caramel-furanone'],
    axes: ax(10, 0, 2, 0, 2, 0, 6, 4),
    unlocks: ['bloom whole spices in it', 'high-heat sear', 'finish a dish off the heat'],
  },
  'coconut milk': {
    role: 'fat',
    compounds: ['coconut-lactone', 'lactone-creamy', 'sweet-earth'],
    axes: ax(8, 0, 4, 0, 1, 0, 5, 7),
    unlocks: ['split deliberately for fried aromatics', 'set with starch', 'whip the cold solids'],
  },
  'sunflower oil': {
    role: 'fat',
    compounds: ['neutral-canvas', 'nutty-maillard'],
    axes: ax(9, 0, 0, 0, 0, 0, 1, 3),
    unlocks: ['deep-fry medium', 'carrier for infusions', 'emulsion base that adds no flavour'],
  },

  // --- Aromatics -----------------------------------------------------------
  ginger: {
    role: 'aromatic',
    compounds: ['terpene-pinene', 'citral', 'pungent-gingerol', 'floral-linalool'],
    axes: ax(0, 1, 1, 2, 0, 4, 8, 1),
    unlocks: ['juice raw for heat', 'candy in sugar', 'fry in shreds for garnish'],
  },
  garlic: {
    role: 'aromatic',
    compounds: ['sulfur-allicin', 'sulfurous', 'roasted-thiol'],
    axes: ax(0, 0, 1, 2, 5, 3, 8, 1),
    unlocks: ['slow-confit to sweetness', 'raw microplane for aggression', 'black-char'],
  },
  'spring onion': {
    role: 'aromatic',
    compounds: ['sulfur-allicin', 'green-hexanal', 'sulfurous'],
    axes: ax(0, 0, 2, 1, 3, 2, 6, 3),
    unlocks: ['char the greens', 'oil made from the tops', 'raw ribbons in ice water'],
  },
  lemongrass: {
    role: 'aromatic',
    compounds: ['citral', 'floral-linalool', 'terpene-pinene'],
    axes: ax(0, 2, 1, 1, 0, 0, 9, 2),
    unlocks: ['bruise and infuse into fat', 'pound into a paste', 'use the stalk as a skewer'],
  },
  coriander: {
    role: 'aromatic',
    compounds: ['green-hexanal', 'floral-linalool', 'aldehyde-soapy', 'citral'],
    axes: ax(0, 1, 0, 2, 0, 0, 8, 2),
    unlocks: ['use the stems, not the leaves, for depth', 'root as a paste base', 'oil'],
  },
  'green chili': {
    role: 'aromatic',
    compounds: ['capsaicin', 'green-hexanal', 'terpene-pinene'],
    axes: ax(0, 0, 1, 2, 0, 8, 6, 1),
    unlocks: ['blister whole', 'infuse into a fat to distribute heat evenly', 'quick-pickle'],
  },
  'curry leaves': {
    role: 'aromatic',
    compounds: ['terpene-pinene', 'citral', 'sulfurous-trace', 'floral-linalool'],
    axes: ax(0, 0, 0, 3, 1, 0, 9, 1),
    unlocks: ['fry crisp in hot fat', 'powder the fried leaves', 'infuse into coconut milk'],
  },
  cinnamon: {
    role: 'seasoning',
    compounds: ['cinnamaldehyde', 'phenolic', 'sweet-spice'],
    axes: ax(0, 0, 3, 3, 0, 1, 8, 1),
    unlocks: ['use in a savoury braise, not a dessert', 'infuse into oil', 'toast whole'],
  },
  cloves: {
    role: 'seasoning',
    compounds: ['clove-eugenol', 'phenolic', 'sweet-spice'],
    axes: ax(0, 0, 2, 5, 0, 2, 10, 1),
    unlocks: ['one clove is a seasoning, three is a mistake', 'infuse into a syrup', 'bloom in fat'],
  },
  peppercorn: {
    role: 'seasoning',
    compounds: ['peppery-piperine', 'terpene-pinene', 'woody'],
    axes: ax(0, 0, 0, 3, 0, 5, 7, 1),
    unlocks: ['crack coarse at the end', 'infuse into cream or coconut milk', 'toast whole'],
  },

  // --- Flavour -------------------------------------------------------------
  'soy sauce': {
    role: 'seasoning',
    compounds: ['umami-glutamate', 'roasted-thiol', 'maillard-pyrazine', 'salty', 'phenolic'],
    axes: ax(0, 2, 2, 3, 10, 0, 6, 2),
    unlocks: ['reduce to a glaze', 'use as a curing salt', 'a few drops in a sweet dish'],
  },
  honey: {
    role: 'seasoning',
    compounds: ['floral-linalool', 'caramel-furanone', 'ester-fruity', 'sweet'],
    axes: ax(0, 1, 9, 1, 0, 0, 6, 4),
    unlocks: ['caramelise to bitterness', 'gastrique with vinegar', 'raw as a finishing drizzle'],
  },
  tamarind: {
    role: 'seasoning',
    compounds: ['tartaric-sour', 'caramel-furanone', 'ester-fruity', 'sweet-sour'],
    axes: ax(0, 9, 4, 2, 3, 0, 6, 4),
    unlocks: ['thin into a sharp dressing', 'reduce to a lacquer', 'balance against jaggery'],
  },
  jaggery: {
    role: 'seasoning',
    compounds: ['caramel-furanone', 'maillard-pyrazine', 'sweet', 'phenolic'],
    axes: ax(0, 0, 9, 2, 1, 0, 5, 4),
    unlocks: ['melt into a dark caramel', 'season a savoury sauce', 'set into a brittle'],
  },
  vinegar: {
    role: 'seasoning',
    compounds: ['acetic', 'ester-fruity', 'sharp'],
    axes: ax(0, 10, 1, 0, 0, 0, 5, 1),
    unlocks: ['quick-pickle in 15 min', 'gastrique', 'a splash to reset a flat dish'],
  },

  // --- Wildcard ------------------------------------------------------------
  '100% dark chocolate': {
    role: 'wildcard',
    compounds: ['maillard-pyrazine', 'phenolic', 'bitter-theobromine', 'roasted-thiol', 'caramel-furanone'],
    axes: ax(7, 0, 0, 9, 3, 0, 8, 6),
    unlocks: ['use unsweetened in a savoury sauce', 'shave raw as a bitter garnish', 'temper for snap'],
  },
  jackfruit: {
    role: 'wildcard',
    compounds: ['ester-fruity', 'sulfurous-trace', 'floral-linalool', 'tropical'],
    axes: ax(1, 2, 6, 1, 3, 0, 7, 8),
    unlocks: ['shred unripe as a meat texture', 'ripe as a dessert fruit', 'char the shreds'],
  },
  banana: {
    role: 'wildcard',
    compounds: ['ester-fruity', 'isoamyl-acetate', 'lactone-creamy', 'sweet'],
    axes: ax(1, 1, 8, 1, 0, 0, 6, 8),
    unlocks: ['blacken the skin and roast whole', 'use green as a starch', 'ferment fast with heat'],
  },
  'coconut flakes': {
    role: 'wildcard',
    compounds: ['coconut-lactone', 'nutty-maillard', 'lactone-creamy'],
    axes: ax(6, 0, 4, 1, 0, 0, 5, 5),
    unlocks: ['toast dark for a nut substitute', 'grind into a paste', 'crisp topping'],
  },
};

/** Always available; excluded from pairing scoring. */
export const FREE_BASICS = ['water', 'salt', 'pepper', 'sugar'];

// ---------------------------------------------------------------------------
// Curated affinities — traditions that already solved the problem
// ---------------------------------------------------------------------------

export const AFFINITIES: Affinity[] = [
  // High affinity, low familiarity — the interesting quadrant.
  { a: '100% dark chocolate', b: 'black beans', strength: 0.88, familiarity: 0.25,
    note: 'Mole logic. Shared pyrazines and roasted thiols; the chocolate reads savoury and deepens the bean, it does not sweeten it.' },
  { a: '100% dark chocolate', b: 'beetroot', strength: 0.84, familiarity: 0.3,
    note: 'Both sit on earthy-geosmin plus caramelised furanones. The beet supplies the sweetness the 100% chocolate lacks.' },
  { a: '100% dark chocolate', b: 'tamarind', strength: 0.78, familiarity: 0.15,
    note: 'Tartaric sourness cuts theobromine bitterness; both carry dark caramel notes underneath.' },
  { a: '100% dark chocolate', b: 'green chili', strength: 0.8, familiarity: 0.4,
    note: 'Capsaicin extends the finish of cocoa bitterness rather than competing with it.' },
  { a: 'mushroom', b: 'pomegranate', strength: 0.72, familiarity: 0.12,
    note: 'Tannin and sour fruit against heavy glutamate — an unusual way to lift mushroom without acid from citrus.' },
  { a: 'cauliflower', b: 'jaggery', strength: 0.7, familiarity: 0.15,
    note: 'Caramelised jaggery converts cauliflower sulfur into a nutty, roasted register.' },
  { a: 'beetroot', b: 'coconut milk', strength: 0.74, familiarity: 0.2,
    note: 'Coconut lactones round beet earth; the colour bleed into white fat is a plating asset.' },
  { a: 'polenta', b: 'curry leaves', strength: 0.72, familiarity: 0.1,
    note: 'Corn popcorn-notes and fried curry leaf share a toasted aromatic register across two cuisines.' },
  { a: 'pineapple', b: 'peppercorn', strength: 0.76, familiarity: 0.3,
    note: 'Piperine amplifies the perceived sweetness and holds the ester fruitiness on the palate longer.' },
  { a: 'green lentils', b: 'pomegranate', strength: 0.75, familiarity: 0.25,
    note: 'Sour burst against earthy legume; the seeds solve the texture problem lentils create.' },
  { a: 'jackfruit', b: 'soy sauce', strength: 0.85, familiarity: 0.35,
    note: 'Unripe jackfruit shreds have meat texture but no savour; glutamate supplies what is missing.' },
  { a: 'sweet potato', b: 'tamarind', strength: 0.78, familiarity: 0.2,
    note: 'Sourness prevents sweet potato from collapsing into dessert territory.' },
  { a: 'mango', b: 'green chili', strength: 0.82, familiarity: 0.35,
    note: 'Classic across South Asia; heat sharpens ester-driven sweetness.' },
  { a: 'corn', b: 'coconut milk', strength: 0.8, familiarity: 0.3,
    note: 'Both carry sweet-earth and lactone notes; the pairing thickens without a starch.' },
  { a: 'cinnamon', b: 'chickpeas', strength: 0.72, familiarity: 0.25,
    note: 'Cinnamaldehyde in a savoury braise reads as warmth, not dessert, against nutty legume.' },
  { a: 'banana', b: 'cloves', strength: 0.68, familiarity: 0.2,
    note: 'Eugenol grounds isoamyl acetate, which otherwise reads as artificial banana sweet.' },
  { a: 'cassava', b: 'coconut flakes', strength: 0.74, familiarity: 0.3,
    note: 'Neutral glassy starch plus toasted lactone — texture contrast with a shared background.' },

  // High affinity, high familiarity — reliable, but they cost you uniqueness.
  { a: 'mushroom', b: 'soy sauce', strength: 0.92, familiarity: 0.8,
    note: 'Glutamate stacking. Effective and very well-trodden.' },
  { a: 'tomato', b: 'soy sauce', strength: 0.86, familiarity: 0.6,
    note: 'Two glutamate sources compound superadditively.' },
  { a: 'tomato', b: 'mushroom', strength: 0.85, familiarity: 0.65,
    note: 'The standard vegetarian umami base.' },
  { a: 'tamarind', b: 'jaggery', strength: 0.9, familiarity: 0.75,
    note: 'The sour-sweet backbone of South Indian cooking. Reliable; not surprising.' },
  { a: 'coconut milk', b: 'curry leaves', strength: 0.9, familiarity: 0.7,
    note: 'Fat carries the leaf terpenes; the canonical South Indian pairing.' },
  { a: 'coconut milk', b: 'lemongrass', strength: 0.88, familiarity: 0.7,
    note: 'Citral is fat-soluble; coconut distributes it evenly through a dish.' },
  { a: 'lemon', b: 'curry leaves', strength: 0.85, familiarity: 0.55,
    note: 'Shared citral makes this a bridge pair rather than two competing aromatics.' },
  { a: 'chickpeas', b: 'tamarind', strength: 0.85, familiarity: 0.7,
    note: 'Chaat logic — sour cuts starch density.' },
  { a: 'vinegar', b: 'honey', strength: 0.86, familiarity: 0.6,
    note: 'Gastrique. The fastest way to build a balanced sauce under time pressure.' },
  { a: 'ginger', b: 'jaggery', strength: 0.8, familiarity: 0.6,
    note: 'Gingerol heat against dark caramel; works in both savoury and sweet courses.' },
  { a: 'olive oil', b: 'lemon', strength: 0.85, familiarity: 0.92,
    note: 'Correct and completely expected. Use it, do not build the concept on it.' },
  { a: 'apple', b: 'cinnamon', strength: 0.9, familiarity: 0.95,
    note: 'The most familiar pairing in the pantry. A judge will have seen it a thousand times.' },
  { a: 'banana', b: '100% dark chocolate', strength: 0.88, familiarity: 0.9,
    note: 'Works, but spends your uniqueness budget for nothing.' },
  { a: 'tofu', b: 'soy sauce', strength: 0.85, familiarity: 0.9,
    note: 'Default. If you use it, the surprise has to come from elsewhere.' },
  { a: 'tomato', b: 'garlic', strength: 0.88, familiarity: 0.95,
    note: 'Invisible to a judge. Treat as a base, not a concept.' },
  { a: 'rice', b: 'coconut milk', strength: 0.85, familiarity: 0.75,
    note: 'Regionally ubiquitous. Fine as a vehicle.' },
  { a: 'potato', b: 'butter', strength: 0.9, familiarity: 0.92,
    note: 'Unimpeachable and unremarkable.' },
  { a: 'garlic', b: 'ginger', strength: 0.88, familiarity: 0.9,
    note: 'A base, not a decision.' },
];

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const key = (a: string, b: string) => [a, b].sort().join('||');

const AFFINITY_INDEX: Map<string, Affinity> = new Map(
  AFFINITIES.map((p) => [key(p.a, p.b), p]),
);

/** Compounds shared by two ingredients. */
export function sharedCompounds(a: string, b: string): string[] {
  const A = PANTRY[a]?.compounds ?? [];
  const B = new Set(PANTRY[b]?.compounds ?? []);
  return A.filter((c) => B.has(c));
}

/** Jaccard overlap on compound sets, 0–1. */
export function overlapScore(a: string, b: string): number {
  const A = PANTRY[a]?.compounds ?? [];
  const B = PANTRY[b]?.compounds ?? [];
  if (!A.length || !B.length) return 0;
  const shared = sharedCompounds(a, b).length;
  const union = new Set([...A, ...B]).size;
  return shared / union;
}

/**
 * How much two ingredients complete each other on the functional axes.
 * Rewards one being strong where the other is weak on fat / acid / sweet /
 * umami, which is what actually makes a plate feel balanced.
 */
export function complementScore(a: string, b: string): number {
  const A = PANTRY[a]?.axes;
  const B = PANTRY[b]?.axes;
  if (!A || !B) return 0;
  const pairs: Array<keyof Axes> = ['fat', 'acid', 'sweet', 'umami', 'bitter'];
  let total = 0;
  for (const k of pairs) {
    const hi = Math.max(A[k], B[k]);
    const lo = Math.min(A[k], B[k]);
    // Best when one is high and the other is low.
    total += (hi / 10) * (1 - lo / 10);
  }
  return total / pairs.length;
}

/**
 * The headline number. High = strong pairing that a judge has not already
 * eaten a hundred times. `surprise` controls how hard novelty is weighted;
 * wire it to the Uniqueness slider in the brief.
 */
export function pairScore(a: string, b: string, surprise = 0.6): ScoredPair {
  const curated = AFFINITY_INDEX.get(key(a, b));
  const overlap = sharedCompounds(a, b);

  const base = curated
    ? curated.strength
    : 0.55 * overlapScore(a, b) + 0.45 * complementScore(a, b);

  const familiarity = curated ? curated.familiarity : Math.min(0.5, overlapScore(a, b));
  const score = base * (1 - familiarity * surprise);

  return {
    a,
    b,
    score: Number(score.toFixed(3)),
    affinity: Number(base.toFixed(3)),
    familiarity,
    overlap,
    note:
      curated?.note ??
      (overlap.length
        ? `Bridged by ${overlap.join(', ')}.`
        : 'No shared aroma family — this is a contrast pairing and needs a third ingredient to bridge it.'),
  };
}

/** Top surprise-adjusted pairs among the available ingredients. */
export function topPairs(available: string[], n = 12, surprise = 0.6): ScoredPair[] {
  const pool = available.filter((i) => PANTRY[i]);
  const out: ScoredPair[] = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      out.push(pairScore(pool[i], pool[j], surprise));
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, n);
}

/** Pairs that are strong but tired — show these so the team avoids them. */
export function clichePairs(available: string[], n = 6): ScoredPair[] {
  const set = new Set(available);
  return AFFINITIES.filter((p) => set.has(p.a) && set.has(p.b) && p.familiarity >= 0.6)
    .sort((x, y) => y.familiarity - x.familiarity)
    .slice(0, n)
    .map((p) => pairScore(p.a, p.b));
}

/**
 * An ingredient that connects two others sharing nothing directly — the
 * cheapest way to make a contrast pairing coherent.
 */
export function findBridge(a: string, b: string, available: string[]): string | null {
  if (sharedCompounds(a, b).length) return null;
  let best: { ing: string; score: number } | null = null;
  for (const c of available) {
    if (c === a || c === b || !PANTRY[c]) continue;
    const score = sharedCompounds(a, c).length + sharedCompounds(b, c).length;
    const bridges = sharedCompounds(a, c).length > 0 && sharedCompounds(b, c).length > 0;
    if (bridges && (!best || score > best.score)) best = { ing: c, score };
  }
  return best?.ing ?? null;
}

const AXIS_TARGETS: Array<{ axis: keyof Axes; label: string; min: number }> = [
  { axis: 'fat', label: 'fat', min: 6 },
  { axis: 'acid', label: 'acid', min: 5 },
  { axis: 'umami', label: 'savour', min: 5 },
  { axis: 'sweet', label: 'sweetness', min: 4 },
  { axis: 'aroma', label: 'aromatic lift', min: 7 },
  { axis: 'body', label: 'substance', min: 6 },
];

/** Which balance dimensions a set covers, and which it is missing. */
export function balanceOf(members: string[]): { coverage: string[]; gaps: string[] } {
  const coverage: string[] = [];
  const gaps: string[] = [];
  for (const t of AXIS_TARGETS) {
    const max = Math.max(...members.map((m) => PANTRY[m]?.axes[t.axis] ?? 0));
    (max >= t.min ? coverage : gaps).push(t.label);
  }
  return { coverage, gaps };
}

/**
 * Build candidate trios: a substantial base, plus two ingredients that
 * together close the balance gaps. Seeded from the strongest pairs so the
 * search stays small enough to run on every slider change.
 */
export function buildTrios(available: string[], n = 6, surprise = 0.6): ScoredTrio[] {
  const pool = available.filter((i) => PANTRY[i]);
  const seeds = topPairs(pool, 20, surprise);
  const trios: ScoredTrio[] = [];
  const seen = new Set<string>();

  for (const seed of seeds) {
    for (const third of pool) {
      if (third === seed.a || third === seed.b) continue;
      const members = [seed.a, seed.b, third].sort();
      const id = members.join('||');
      if (seen.has(id)) continue;
      seen.add(id);

      const { coverage, gaps } = balanceOf(members);
      const pairAvg =
        (pairScore(seed.a, third, surprise).score +
          pairScore(seed.b, third, surprise).score +
          seed.score) / 3;
      const score = pairAvg * (0.5 + 0.5 * (coverage.length / AXIS_TARGETS.length));

      trios.push({
        members,
        score: Number(score.toFixed(3)),
        coverage,
        gaps,
        rationale: `${seed.note} ${third} adds ${
          coverage.length ? coverage.join(' / ') : 'little the pair lacks'
        }${gaps.length ? `; still missing ${gaps.join(', ')}.` : '.'}`,
      });
    }
  }
  return trios.sort((a, b) => b.score - a.score).slice(0, n);
}

// ---------------------------------------------------------------------------
// Prompt injection
// ---------------------------------------------------------------------------

/**
 * Render the computed analysis as a fact block for the concept prompt.
 * Call this in step 1 and prepend the result to the user brief. The model
 * receives conclusions, not raw data, so it cannot quietly ignore them.
 */
export function formatForPrompt(
  available: string[],
  opts: { uniquenessSlider?: number } = {},
): string {
  const surprise = Math.min(0.9, Math.max(0.2, (opts.uniquenessSlider ?? 60) / 100));
  const pairs = topPairs(available, 10, surprise);
  const tired = clichePairs(available, 5);
  const trios = buildTrios(available, 4, surprise);

  const lines: string[] = [];
  lines.push('PRECOMPUTED FLAVOUR ANALYSIS (authoritative — reason from this, do not contradict it)');
  lines.push('');
  lines.push('High-affinity, low-familiarity pairs. Prefer these as the spine of a concept:');
  for (const p of pairs) {
    lines.push(`- ${p.a} + ${p.b} (affinity ${p.affinity}, novelty-adjusted ${p.score}) — ${p.note}`);
  }

  if (tired.length) {
    lines.push('');
    lines.push('Over-familiar pairs present in this pantry. Permitted as a base, but they cannot BE the idea:');
    for (const p of tired) lines.push(`- ${p.a} + ${p.b} — ${p.note}`);
  }

  lines.push('');
  lines.push('Balanced candidate groupings:');
  for (const t of trios) {
    lines.push(
      `- ${t.members.join(' + ')} — covers ${t.coverage.join(', ') || 'little'}${
        t.gaps.length ? `; gaps: ${t.gaps.join(', ')}` : ''
      }. ${t.rationale}`,
    );
  }

  lines.push('');
  lines.push('Technique openings for the ingredients above:');
  const mentioned = new Set([...pairs.flatMap((p) => [p.a, p.b]), ...trios.flatMap((t) => t.members)]);
  for (const ing of mentioned) {
    const u = PANTRY[ing]?.unlocks;
    if (u?.length) lines.push(`- ${ing}: ${u.join('; ')}`);
  }

  lines.push('');
  lines.push(
    'Each concept must name which pair above it is built on, and must close at least one listed gap. ' +
    'If you use an over-familiar pair, state explicitly what supplies the surprise instead.',
  );

  return lines.join('\n');
}