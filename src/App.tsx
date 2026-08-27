import React, { useState } from 'react';
import { useAppStore } from './store';
import { StepBrief } from './components/StepBrief';
import { StepConcepts } from './components/StepConcepts';
import { StepRecipe } from './components/StepRecipe';
import { StepTwist } from './components/StepTwist';
import { StepRubric } from './components/StepRubric';
import { StepPitch } from './components/StepPitch';
import { ReasoningLog } from './components/ReasoningLog';
import { callGemini, callGeminiStreamWithFallback } from './api';
import { formatForPrompt } from './flavourMatrix';
import { Type } from '@google/genai';
import { Recipe, RubricEvaluation } from './types';
import { Trash2 } from 'lucide-react';

export default function App() {
  const { session, updateSession, logs, addLog, resetSession, saveSessionToHistory, deleteSessionFromHistory, loadSessionFromHistory, getHistory } = useAppStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionNameInput, setSessionNameInput] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const steps = [
    { num: 1, label: 'Brief', locked: false, completed: !!session.brief },
    { num: 2, label: 'Concepts', locked: !session.brief, completed: !!session.concepts },
    { num: 3, label: 'Recipe', locked: session.selectedConceptIndex === null, completed: !!session.recipe },
    { num: 4, label: 'Twist', locked: !session.recipe, completed: !!session.twistPlan || !!session.twistSkipped },
    { num: 5, label: 'Rubric', locked: !session.twistPlan && !session.twistSkipped, completed: !!session.rubric },
    { num: 6, label: 'Pitch', locked: !session.rubric, completed: !!session.pitch }
  ];

  /**
   * Every model call is stateless — there is no conversation history. Any step
   * that reasons about "the dish" has to be handed the dish explicitly, or the
   * model invents one. Build the context block from whatever the session has
   * so far.
   */
  const buildDishContext = () => {
    const parts: string[] = ['CURRENT DISH STATE'];

    if (session.brief) {
      parts.push(`BRIEF:
Course: ${session.brief.course}
Servings: ${session.brief.servings}
Cook time: ${session.brief.cookTime} minutes
Audience note: ${session.brief.audienceNote}
Available pantry: ${session.brief.availableIngredients.join(', ')}
Priorities: uniqueness ${session.brief.priorities.uniqueness}, visual ${session.brief.priorities.visualAppeal}, health ${session.brief.priorities.health}, sustainability ${session.brief.priorities.sustainability}`);
    }

    if (session.concepts && session.selectedConceptIndex !== null) {
      parts.push(`SELECTED CONCEPT:
${JSON.stringify(session.concepts[session.selectedConceptIndex], null, 2)}`);
    }

    if (session.recipe) {
      parts.push(`RECIPE:
${JSON.stringify(session.recipe, null, 2)}`);
    }

    if (session.twistConstraint) {
      parts.push(`SURPRISE CONSTRAINT APPLIED: "${session.twistConstraint}"`);
    }

    if (session.twistPlan) {
      parts.push(`RESPONSE TO THE CONSTRAINT:
${JSON.stringify(session.twistPlan, null, 2)}`);
    }

    return parts.join('\n\n');
  };

  const handleGenerateConcepts = async (brief: any) => {
    setIsGenerating(true);
    updateSession(s => ({ ...s, brief }));

    // Client-side reasoning layer: compute pairing candidates before the model
    // sees anything, and hand them over as facts rather than suggestions.
    const analysis = formatForPrompt(brief.availableIngredients, {
      uniquenessSlider: brief.priorities.uniqueness,
    });
    
    addLog('Flavour Analysis (Pre-compute)', analysis, 0);

    const prompt = `${analysis}

---

Based on this brief, generate exactly THREE distinct dish concepts.
Available Pantry: ${brief.availableIngredients.join(', ')}
Course: ${brief.course}
Time Budget: ${brief.cookTime} minutes
Servings: ${brief.servings}
Audience Note: ${brief.audienceNote}
Priorities: Uniqueness (${brief.priorities.uniqueness}/100), Visual Appeal (${brief.priorities.visualAppeal}/100), Health (${brief.priorities.health}/100), Sustainability (${brief.priorities.sustainability}/100)

Note: State explicitly in the \`flavour_logic\` how the top-weighted priority shaped the dish.
Set \`pair_basis\` to the exact pair from the precomputed analysis above that this concept is built on.`;

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          one_line_pitch: { type: Type.STRING },
          course: { type: Type.STRING },
          core_ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          technique_stack: { type: Type.ARRAY, items: { type: Type.STRING } },
          pair_basis: { type: Type.STRING },
          flavour_logic: { type: Type.STRING },
          unexpected_move: { type: Type.STRING },
          scores: {
            type: Type.OBJECT,
            properties: {
              uniqueness: { type: Type.NUMBER },
              feasibility_60min: { type: Type.NUMBER },
              visual_impact: { type: Type.NUMBER },
              health: { type: Type.NUMBER },
              sustainability: { type: Type.NUMBER }
            }
          },
          score_reasons: {
            type: Type.OBJECT,
            properties: {
              uniqueness: { type: Type.STRING },
              feasibility_60min: { type: Type.STRING },
              visual_impact: { type: Type.STRING },
              health: { type: Type.STRING },
              sustainability: { type: Type.STRING }
            }
          },
          risks: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["name", "one_line_pitch", "course", "core_ingredients", "technique_stack", "pair_basis", "flavour_logic", "unexpected_move", "scores", "score_reasons", "risks"]
      }
    };

    try {
      const start = Date.now();
      const concepts = await callGemini(prompt, schema, 0.7);
      addLog('Generate Concepts', prompt, Date.now() - start);
      updateSession(s => ({ ...s, concepts, selectedConceptIndex: null, recipe: null, twistPlan: null, rubric: null, pitch: null }));
      setCurrentStep(2);
    } catch (e) {
      console.error(e);
      addLog('Generate Concepts (Error)', String(e), 0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectConcept = (index: number) => {
    updateSession(s => ({ ...s, selectedConceptIndex: index, recipe: null, twistPlan: null, rubric: null, pitch: null }));
    setCurrentStep(3);
  };

  const handleGenerateRecipe = async () => {
    if (session.selectedConceptIndex === null || !session.concepts || !session.brief) return;
    setGenError(null);
    setIsGenerating(true);

    const concept = session.concepts[session.selectedConceptIndex];
    const prompt = `Generate a detailed recipe for "${concept.name}".
Course: ${concept.course}
Servings: ${session.brief.servings}
Cook Time: ${session.brief.cookTime} minutes
Ingredients available: ${session.brief.availableIngredients.join(', ')}

Concept to execute:
${JSON.stringify(concept, null, 2)}

Return JSON for a recipe including:
1. scaled ingredients list (with quantities)
2. numbered method steps
3. PARALLELISED cook timeline (array of {start_min, end_min, station, action}) for 2-3 people working simultaneously in ${session.brief.cookTime} mins.
4. plating_instruction (composition, height, negative_space, colour_contrast, garnish)
5. rationale: 3 sentences why this dish answers the brief.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        ingredients: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING } }, required: ["name", "quantity"] } },
        method: { type: Type.ARRAY, items: { type: Type.STRING } },
        timeline: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { start_min: { type: Type.NUMBER }, end_min: { type: Type.NUMBER }, station: { type: Type.STRING }, action: { type: Type.STRING } }, required: ["start_min", "end_min", "station", "action"] } },
        plating_instruction: { type: Type.OBJECT, properties: { composition: { type: Type.STRING }, height: { type: Type.STRING }, negative_space: { type: Type.STRING }, colour_contrast: { type: Type.STRING }, garnish: { type: Type.STRING } }, required: ["composition", "height", "negative_space", "colour_contrast", "garnish"] },
        rationale: { type: Type.STRING }
      },
      required: ["ingredients", "method", "timeline", "plating_instruction", "rationale"]
    };

    const prevRecipe = session.recipe;

    try {
      const start = Date.now();

      // Skeleton so the UI has something to fill while the stream lands.
      updateSession(s => ({
        ...s,
        recipe: {
          ingredients: [],
          method: [],
          timeline: [],
          plating_instruction: { composition: '', height: '', negative_space: '', colour_contrast: '', garnish: '' },
          rationale: ''
        }
      }));

      const { result, usedFallback } = await callGeminiStreamWithFallback(
        prompt,
        schema,
        0.4,
        (partial) => updateSession(s => ({ ...s, recipe: partial }))
      );

      addLog(
        usedFallback ? 'Generate Recipe (Fallback, no stream)' : 'Generate Recipe (Stream)',
        prompt,
        Date.now() - start
      );
      updateSession(s => ({ ...s, recipe: result }));
    } catch (e) {
      console.error(e);
      addLog('Generate Recipe (Error)', String(e), 0);
      // Roll the skeleton back, or the step reads as complete when it is not.
      updateSession(s => ({ ...s, recipe: prevRecipe }));
      setGenError('Recipe generation failed. Open the browser console for the exact error — on a corporate network this is usually the proxy blocking the request.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSkipTwist = () => {
    updateSession(s => ({ ...s, twistSkipped: true, twistConstraint: null, twistPlan: null }));
    setCurrentStep(5);
  };

  const handleGenerateTwist = async (constraint: string) => {
    if (!session.recipe) return;
    setIsGenerating(true);
    updateSession(s => ({ ...s, twistConstraint: constraint, twistSkipped: false }));

    const prompt = `Re-plan the selected dish given this surprise constraint: "${constraint}".
Original ingredients: ${session.recipe.ingredients.map(i => i.name).join(', ')}
Original method: ${session.recipe.method.join(' ')}
Pantry still available: ${session.brief?.availableIngredients.join(', ') ?? 'as previously specified'}

Output a diff array showing what was 'added', 'removed', 'modified', or 'kept' with justifications.
Also output the fully updated new_recipe object (ingredients and method).`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        diff: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              change_type: { type: Type.STRING },
              item_name: { type: Type.STRING },
              justification: { type: Type.STRING }
            },
            required: ["change_type", "item_name", "justification"]
          }
        },
        new_recipe: {
          type: Type.OBJECT,
          properties: {
            ingredients: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING } }, required: ["name", "quantity"] } },
            method: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["ingredients", "method"]
        }
      },
      required: ["diff", "new_recipe"]
    };

    try {
      const start = Date.now();
      const twistPlan = await callGemini(prompt, schema, 0.7);
      addLog('Generate Twist', prompt, Date.now() - start);
      updateSession(s => ({ ...s, twistPlan }));
    } catch (e) {
      console.error(e);
      addLog('Generate Twist (Error)', String(e), 0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRubric = async () => {
    if (!session.recipe) return;
    setIsGenerating(true);

    const prompt = `${buildDishContext()}

---

Score the dish described above against this fixed rubric. Judge only what is
actually in the dish state — do not assume features that are not described.

Culinary quality & taste (max 25)
AI + vibe-coding innovation (max 20)
Culinary creativity (max 15)
Problem & product thinking (max 15)
Response to constraints (max 10)
User experience (max 5)
Pitch & story (max 10)

Provide a score, reasoning, and one single highest-leverage improvement for each row.
Reasoning must cite something specific from the dish state above.`;

    const evalSchema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        reasoning: { type: Type.STRING },
        improvement: { type: Type.STRING }
      },
      required: ["score", "reasoning", "improvement"]
    };

    const schema = {
      type: Type.OBJECT,
      properties: {
        culinary_quality: evalSchema,
        innovation: evalSchema,
        creativity: evalSchema,
        problem_thinking: evalSchema,
        constraint_response: evalSchema,
        user_experience: evalSchema,
        pitch_story: evalSchema
      },
      required: [
        "culinary_quality",
        "innovation",
        "creativity",
        "problem_thinking",
        "constraint_response",
        "user_experience",
        "pitch_story"
      ]
    };

    try {
      const start = Date.now();
      const rubric = await callGemini(prompt, schema, 0.5);
      addLog('Generate Rubric', prompt, Date.now() - start);
      updateSession(s => ({ ...s, rubric }));
    } catch (e) {
      console.error(e);
      addLog('Generate Rubric (Error)', String(e), 0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePitch = async () => {
    if (!session.rubric) return;
    setIsGenerating(true);

    const prompt = `${buildDishContext()}

RUBRIC EVALUATION:
${JSON.stringify(session.rubric, null, 2)}

---

Write a 5-minute pitch script for the dish described above.
It must follow exactly five labelled beats:
1. The Problem
2. The App (MISE)
3. The Dish
4. The Twist
5. The Sell

Name the actual dish, the actual ingredients and the actual constraint — no
placeholders. Lean on the rubric rows that scored highest. Write it to be
spoken aloud, not read.

Provide it as an array of objects with label and content.`;

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ["label", "content"]
      }
    };

    try {
      const start = Date.now();
      const pitch = await callGemini(prompt, schema, 0.7);
      addLog('Generate Pitch', prompt, Date.now() - start);
      updateSession(s => ({ ...s, pitch }));
    } catch (e) {
      console.error(e);
      addLog('Generate Pitch (Error)', String(e), 0);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isPresentMode) {
    return (
      <div className="bg-[#FAFAF8] min-h-screen text-[#16181D] pb-32">
        <div className="max-w-4xl mx-auto py-12 px-6">
          <div className="flex justify-between items-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight">MISE - Presentation</h1>
            <button
              onClick={() => setIsPresentMode(false)}
              className="px-4 py-2 border border-[#E4E2DC] bg-white text-[11px] font-semibold uppercase tracking-wider rounded-[4px] hover:bg-[#F4F4F0] transition-colors"
            >
              Exit Present Mode
            </button>
          </div>

          <div className="space-y-32">
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-6">Step 1: The Brief</h2>
              <div className="text-[15px] font-medium leading-relaxed bg-white p-8 border border-[#E4E2DC] rounded-[4px]">
                We set out to create a <strong>{session.brief?.course}</strong> dish for <strong>{session.brief?.servings}</strong> in <strong>{session.brief?.cookTime}</strong> minutes.
                <br /><br />
                Audience note: <em>"{session.brief?.audienceNote}"</em>
              </div>
            </section>

            {session.selectedConceptIndex !== null && session.concepts && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-6">Step 2: Selected Concept</h2>
                <div className="bg-white p-8 border border-[#E4E2DC] rounded-[4px]">
                  <h3 className="text-3xl font-bold mb-2">{session.concepts[session.selectedConceptIndex]?.name}</h3>
                  <p className="text-xl italic text-[#6B6B66] mb-8">"{session.concepts[session.selectedConceptIndex]?.one_line_pitch}"</p>
                  {session.concepts[session.selectedConceptIndex]?.pair_basis && (
                    <div className="mb-6">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] block mb-2">The Pairing</span>
                      <span className="text-[15px] font-medium text-[#2F5D62]">{session.concepts[session.selectedConceptIndex]?.pair_basis}</span>
                    </div>
                  )}
                  <div className="text-[15px] leading-relaxed">{session.concepts[session.selectedConceptIndex]?.flavour_logic}</div>
                </div>
              </section>
            )}

            {session.recipe && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-6">Step 3: The Recipe</h2>
                <div className="bg-white p-8 border border-[#E4E2DC] rounded-[4px]">
                  <p className="text-xl italic leading-relaxed text-[#7A2E2E] border-l-4 border-[#7A2E2E] pl-6 mb-8">{session.recipe.rationale}</p>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-4">Core Method</h4>
                  <ol className="list-decimal pl-6 space-y-4 text-[15px]">
                    {session.recipe.method?.map((m, i) => <li key={i}>{m}</li>)}
                  </ol>
                </div>
              </section>
            )}

            {session.twistPlan && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-6">Step 4: The Twist</h2>
                <div className="bg-white p-8 border border-[#E4E2DC] rounded-[4px]">
                  <div className="text-2xl font-semibold mb-8">Constraint: "{session.twistConstraint}"</div>
                  <div className="space-y-4">
                    {session.twistPlan.diff?.map((d, i) => (
                      <div key={i} className="flex gap-6 text-[15px] border-b border-[#F4F4F0] pb-4">
                        <div className="w-24 font-bold capitalize text-[#6B6B66]">{d.change_type}</div>
                        <div>
                          <span className="font-semibold">{d.item_name}</span>
                          <span className="block text-[#6B6B66] mt-1">{d.justification}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {session.rubric && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-6">Step 5: Rubric Evaluation</h2>
                <div className="bg-[#16181D] text-[#FAFAF8] p-12 rounded-[4px] text-center">
                  <div className="text-2xl text-[#A1A1AA] mb-4">Total Score</div>
                  <div className="text-8xl font-bold">
                    {(Object.values(session.rubric) as RubricEvaluation[]).reduce((sum, s) => sum + (s?.score || 0), 0)}<span className="text-4xl text-[#6B6B66] font-normal">/100</span>
                  </div>
                </div>
              </section>
            )}

            {session.pitch && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-6">Step 6: The Pitch Script</h2>
                <div className="space-y-12">
                  {session.pitch?.map((beat, idx) => (
                    <div key={idx}>
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B66] mb-4">{beat.label}</h3>
                      <p className="text-2xl leading-normal font-serif">{beat.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#FAFAF8] text-[#16181D] font-sans overflow-hidden">
      <aside className="w-[200px] border-r border-[#E4E2DC] flex flex-col shrink-0 hidden md:flex">
        <div className="p-6 border-b border-[#E4E2DC]">
          <h1 className="text-[22px] font-bold tracking-tighter text-[#7A2E2E]">MISE</h1>
          <p className="text-[10px] text-[#6B6B66] uppercase tracking-widest mt-1">Culinary Engine</p>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <label className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-wider mb-4 block">Saved Sessions</label>
          <div className="space-y-3">
            {getHistory().map(hist => (
              <div
                key={hist.id}
                onClick={() => { loadSessionFromHistory(hist.id); setCurrentStep(1); setSessionToDelete(null); }}
                className={`p-2 rounded-[4px] cursor-pointer transition-colors group flex flex-col gap-2 ${
                  hist.id === session.id ? 'bg-white border border-[#E4E2DC]' : 'opacity-50 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="overflow-hidden pr-2">
                    <p className="text-[13px] font-medium truncate">{hist.name}</p>
                    <p className="text-[10px] text-[#6B6B66]">{new Date(hist.timestamp).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionToDelete(hist.id === sessionToDelete ? null : hist.id);
                    }}
                    className={`${sessionToDelete === hist.id ? 'opacity-100 text-[#7A2E2E]' : 'opacity-0 group-hover:opacity-100 text-[#6B6B66] hover:text-[#7A2E2E]'} transition-all p-1`}
                    title="Delete Session"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {sessionToDelete === hist.id && (
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSessionFromHistory(hist.id);
                        setSessionToDelete(null);
                      }}
                      className="flex-1 py-1 bg-[#7A2E2E] text-white text-[9px] font-bold uppercase tracking-wider rounded-[2px]"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(null);
                      }}
                      className="flex-1 py-1 bg-[#F4F4F0] text-[#16181D] text-[9px] font-bold uppercase tracking-wider rounded-[2px]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
            {getHistory().length === 0 && (
              <div className="text-[10px] text-[#6B6B66] italic">No saved sessions.</div>
            )}
          </div>
        </nav>
        <div className="p-4 border-t border-[#E4E2DC]">
          {isSavingSession ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={sessionNameInput}
                onChange={(e) => setSessionNameInput(e.target.value)}
                className="w-full p-2 border border-[#E4E2DC] text-[13px] rounded-[4px] outline-none focus:border-[#16181D]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sessionNameInput.trim()) {
                     saveSessionToHistory(sessionNameInput.trim());
                     setIsSavingSession(false);
                  }
                  if (e.key === 'Escape') {
                     setIsSavingSession(false);
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { 
                    if (sessionNameInput.trim()) {
                      saveSessionToHistory(sessionNameInput.trim()); 
                      setIsSavingSession(false); 
                    }
                  }}
                  className="flex-1 py-2 bg-[#16181D] text-white text-[10px] font-bold uppercase tracking-wider rounded-[4px]"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsSavingSession(false)}
                  className="flex-1 py-2 bg-white border border-[#E4E2DC] text-[#16181D] text-[10px] font-bold uppercase tracking-wider rounded-[4px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setSessionNameInput(
                  session.concepts && session.selectedConceptIndex !== null 
                    ? session.concepts[session.selectedConceptIndex]?.name 
                    : session.name
                );
                setIsSavingSession(true);
              }}
              className="w-full py-2 bg-white border border-[#E4E2DC] text-[10px] font-bold uppercase tracking-wider rounded-[4px] hover:bg-[#F4F4F0] transition-colors"
            >
              Save Session
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-[64px] border-b border-[#E4E2DC] flex items-center px-8 justify-between shrink-0">
          <div className="flex gap-8 overflow-x-auto">
            {steps.map(step => (
              <div
                key={step.num}
                onClick={() => !step.locked && setCurrentStep(step.num)}
                className={`flex flex-col items-start justify-center h-[64px] cursor-pointer border-b-2 transition-all ${
                  currentStep === step.num ? 'border-[#7A2E2E]' : 'border-transparent'
                } ${step.locked ? 'opacity-30 cursor-not-allowed' : (currentStep !== step.num ? 'opacity-40 hover:opacity-100' : '')}`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${currentStep === step.num ? 'text-[#7A2E2E]' : (step.completed ? 'text-[#2F5D62]' : '')}`}>
                  0{step.num}
                </span>
                <span className="text-[13px] font-medium">{step.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 shrink-0 ml-4">
            <button
              onClick={() => { resetSession(); setCurrentStep(1); }}
              className="px-4 py-2 border border-[#E4E2DC] text-[11px] font-semibold uppercase tracking-wider rounded-[4px] bg-white hover:bg-[#F4F4F0] transition-colors whitespace-nowrap"
            >
              Reset Session
            </button>
          </div>
        </header>

        <section className="flex-1 p-8 flex flex-col space-y-6 overflow-y-auto">
          {genError && (
            <div className="mb-6 px-4 py-3 border border-[#FAC1BC] bg-[#FEEAE8] text-[#7A2E2E] text-[12px] rounded-[4px]">
              {genError}
            </div>
          )}
          {currentStep === 1 && <StepBrief key={session.id} session={session} onGenerate={handleGenerateConcepts} isGenerating={isGenerating} />}
          {currentStep === 2 && session.concepts && <StepConcepts key={session.id} concepts={session.concepts} onSelect={handleSelectConcept} selectedIndex={session.selectedConceptIndex} />}
          {currentStep === 3 && <StepRecipe key={session.id} concept={session.selectedConceptIndex !== null && session.concepts ? session.concepts[session.selectedConceptIndex] : null} recipe={session.recipe} onGenerate={handleGenerateRecipe} isGenerating={isGenerating} />}
          {currentStep === 4 && <StepTwist key={session.id} originalRecipe={session.recipe} twistPlan={session.twistPlan} onGenerate={handleGenerateTwist} onSkip={handleSkipTwist} isGenerating={isGenerating} twistConstraint={session.twistConstraint} />}
          {currentStep === 5 && <StepRubric key={session.id} scores={session.rubric} onGenerate={handleGenerateRubric} isGenerating={isGenerating} canGenerate={!!session.recipe} />}
          {currentStep === 6 && <StepPitch key={session.id} pitch={session.pitch} onGenerate={handleGeneratePitch} isGenerating={isGenerating} canGenerate={!!session.rubric} onTogglePresent={() => setIsPresentMode(true)} />}
        </section>

        <ReasoningLog logs={logs} />
      </main>
    </div>
  );
}
