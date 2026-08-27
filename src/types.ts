export type PantryCategory = 'Protein' | 'Vegetables' | 'Fruit' | 'Starch' | 'Fat/Dairy' | 'Aromatics' | 'Flavour' | 'Wildcard' | 'Free basics';

export interface PantryItem {
  name: string;
  category: PantryCategory;
}

export type BriefPriorities = {
  uniqueness: number;
  visualAppeal: number;
  health: number;
  sustainability: number;
};

export type Course = 'starter' | 'main' | 'dessert';

export interface Brief {
  availableIngredients: string[];
  course: Course;
  audienceNote: string;
  cookTime: number;
  servings: number;
  priorities: BriefPriorities;
}

export interface ConceptScore {
  uniqueness: number;
  feasibility_60min: number;
  visual_impact: number;
  health: number;
  sustainability: number;
}

export interface ConceptScoreReasons {
  uniqueness: string;
  feasibility_60min: string;
  visual_impact: string;
  health: string;
  sustainability: string;
}

export interface Concept {
  name: string;
  pair_basis: string;
  one_line_pitch: string;
  course: Course;
  core_ingredients: string[];
  technique_stack: string[];
  flavour_logic: string;
  unexpected_move: string;
  scores: ConceptScore;
  score_reasons: ConceptScoreReasons;
  risks: string[];
}

export interface CookAction {
  start_min: number;
  end_min: number;
  station: string;
  action: string;
}

export interface Recipe {
  ingredients: { name: string; quantity: string }[];
  method: string[];
  timeline: CookAction[];
  plating_instruction: {
    composition: string;
    height: string;
    negative_space: string;
    colour_contrast: string;
    garnish: string;
  };
  rationale: string;
}

export interface TwistDiffItem {
  change_type: 'added' | 'removed' | 'modified' | 'kept';
  item_name: string;
  justification: string;
}

export interface TwistPlan {
  diff: TwistDiffItem[];
  new_recipe: Recipe;
}

export interface RubricEvaluation {
  score: number;
  reasoning: string;
  improvement: string;
}

export interface RubricScores {
  culinary_quality: RubricEvaluation;
  innovation: RubricEvaluation;
  creativity: RubricEvaluation;
  problem_thinking: RubricEvaluation;
  constraint_response: RubricEvaluation;
  user_experience: RubricEvaluation;
  pitch_story: RubricEvaluation;
}

export interface PitchBeat {
  label: string;
  content: string;
}

export interface SessionData {
  id: string;
  name: string;
  timestamp: number;
  brief: Brief | null;
  concepts: Concept[] | null;
  selectedConceptIndex: number | null;
  recipe: Recipe | null;
  twistConstraint: string | null;
  twistSkipped?: boolean;
  twistPlan: TwistPlan | null;
  rubric: RubricScores | null;
  pitch: PitchBeat[] | null;
}

export interface LogEntry {
  id: string;
  step: string;
  timestamp: number;
  prompt: string;
  latency: number;
}
