import React, { useState } from 'react';
import { Recipe, Concept } from '../types';
import { Loader2, AlertTriangle } from 'lucide-react';
import { PANTRY } from '../constants';

interface Props {
  concept: Concept | null;
  recipe: Recipe | null;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function StepRecipe({ concept, recipe, onGenerate, isGenerating }: Props) {
  const [cookMode, setCookMode] = useState(false);

  if (!concept) return null;
  
  const validateIngredients = (recipe: Recipe) => {
    const validNames = new Set(PANTRY.map(p => p.name.toLowerCase()));
    const invalid = recipe.ingredients.filter(ing => !validNames.has(ing.name.toLowerCase()));
    return invalid.map(i => i.name);
  };

  const invalidIngredients = recipe ? validateIngredients(recipe) : [];

  if (!recipe && !isGenerating) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-semibold text-ink mb-4">Generate Recipe for "{concept.name}"</h2>
        <p className="text-[#6B6B66] mb-8 text-sm">We'll build a parallelized 60-minute timeline and full ingredient prep spec.</p>
        <button 
          onClick={onGenerate}
          className="px-6 py-4 bg-[#16181D] text-white text-[12px] font-semibold uppercase tracking-widest rounded-[4px] hover:bg-opacity-90 transition-colors"
        >
          Draft Full Recipe
        </button>
      </div>
    );
  }

  if (isGenerating && !recipe) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center flex flex-col items-center">
        <Loader2 className="animate-spin text-[#16181D] mb-4" size={32} />
        <p className="text-[#6B6B66] text-sm">Drafting recipe and timeline...</p>
      </div>
    );
  }

  if (!recipe) return null;

  if (cookMode) {
    return (
      <div className="fixed inset-0 bg-[#000000] z-50 overflow-y-auto text-[#FAFAF8] p-6 lg:p-12">
        <button 
          onClick={() => setCookMode(false)}
          className="fixed top-6 right-6 px-4 py-2 bg-[#27272A] rounded-[4px] border border-[#3F3F46] text-[11px] uppercase tracking-wider font-semibold hover:bg-[#3F3F46] transition-colors"
        >
          Exit Cook Mode
        </button>
        
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-12">{concept.name} - 60 Min Timeline</h1>
          
          <div className="space-y-6">
            {recipe.timeline.sort((a,b) => a.start_min - b.start_min).map((step, idx) => (
              <div key={idx} className="flex flex-col lg:flex-row gap-6 items-start py-6 border-b border-[#27272A]">
                <div className="flex-shrink-0 w-32">
                  <div className="text-3xl font-bold text-[#E4E2DC]">{step.start_min} - {step.end_min}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA] mt-1">{step.station}</div>
                </div>
                <div className="text-2xl font-medium leading-snug">
                  {step.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-6">
        <div>
          <label className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.1em] mb-2 block">Step 03 — Final Architecture</label>
          <h2 className="text-[28px] font-semibold">Recipe & Timeline</h2>
        </div>
        <button 
          onClick={() => setCookMode(true)}
          className="px-4 py-2 bg-[#16181D] text-white text-[11px] font-semibold uppercase tracking-wider rounded-[4px] hover:bg-opacity-90 transition-colors"
        >
          Enter Cook Mode
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-[#E4E2DC] rounded-[6px] p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-6">60-Minute Parallel Timeline</h2>
            <div className="space-y-4">
              {recipe.timeline.sort((a,b) => a.start_min - b.start_min).map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start pb-4 border-b border-[#F4F4F0] last:border-0">
                  <div className="flex-shrink-0 w-24 text-right">
                    <span className="text-[16px] font-semibold text-[#16181D] block">{step.start_min}-{step.end_min}m</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B66] block mb-1">{step.station}</span>
                    <p className="text-[14px] text-[#16181D]">{step.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          <section className="bg-white border border-[#E4E2DC] rounded-[6px] p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-4">Plating & Composition</h2>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(recipe.plating_instruction).map(([key, value]) => (
                <div key={key}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B66] block mb-1">{key.replace('_', ' ')}</span>
                  <p className="text-[13px] text-[#16181D]">{value as string}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white border border-[#E4E2DC] rounded-[6px] p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-4">Rationale</h2>
            <p className="text-[13px] text-[#6B6B66] italic leading-relaxed">{recipe.rationale}</p>
          </section>

          <section className="bg-white border border-[#E4E2DC] rounded-[6px] p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-4">Ingredients</h2>
            {invalidIngredients.length > 0 && (
              <div className="mb-4 p-3 bg-[#FFF5F5] border border-[#7A2E2E] rounded-[4px] flex gap-2 items-start text-[#7A2E2E]">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div className="text-[12px]">
                  <strong>Pantry Violation:</strong> Not in pantry: {invalidIngredients.join(', ')}.
                </div>
              </div>
            )}
            <ul className="space-y-2 text-[13px] text-[#16181D]">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between border-b border-[#F4F4F0] pb-2 last:border-0">
                  <span className="font-medium">{ing.name}</span>
                  <span className="text-[#6B6B66]">{ing.quantity}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white border border-[#E4E2DC] rounded-[6px] p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] mb-4">Method (Linear)</h2>
            <ol className="list-decimal pl-4 space-y-2 text-[13px] text-[#16181D]">
              {recipe.method.map((step, i) => (
                <li key={i} className="pl-2 leading-relaxed">{step}</li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
