import React, { useState } from 'react';
import { TwistPlan, Recipe } from '../types';
import { Loader2, AlertTriangle } from 'lucide-react';
import { PANTRY } from '../constants';

interface Props {
  originalRecipe: Recipe | null;
  twistPlan: TwistPlan | null;
  onGenerate: (constraint: string) => void;
  onSkip?: () => void;
  isGenerating: boolean;
  twistConstraint: string | null;
}

export function StepTwist({ originalRecipe, twistPlan, onGenerate, onSkip, isGenerating, twistConstraint }: Props) {
  const [input, setInput] = useState(twistConstraint || '');

  if (!originalRecipe) return null;

  const validateIngredients = (recipe: Recipe) => {
    const validNames = new Set(PANTRY.map(p => p.name.toLowerCase()));
    const invalid = recipe.ingredients.filter(ing => !validNames.has(ing.name.toLowerCase()));
    return invalid.map(i => i.name);
  };

  const invalidIngredients = twistPlan ? validateIngredients(twistPlan.new_recipe) : [];

  return (
    <div className="w-full">
      <div>
        <label className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.1em] mb-2 block">Step 04 — Adaptability Test</label>
        <h2 className="text-[28px] font-semibold mb-6">The Twist</h2>
      </div>
      
      <div className="max-w-xl mb-12">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-text mb-2">Inject Constraint</label>
        <div className="flex gap-4">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='e.g. "remove tamarind" or "must be servable cold"'
            className="flex-1 p-3 border border-[#E4E2DC] rounded-[4px] text-sm bg-white focus:outline-none focus:border-[#16181D]"
          />
          <button 
            onClick={() => onGenerate(input)}
            disabled={isGenerating || !input.trim()}
            className="px-6 py-3 bg-[#7A2E2E] text-white text-[11px] font-semibold uppercase tracking-widest rounded-[4px] hover:bg-opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={16} /> : null}
            Re-plan
          </button>
          {onSkip && !twistPlan && (
            <button
              onClick={onSkip}
              disabled={isGenerating}
              className="px-6 py-3 bg-white border border-[#E4E2DC] text-ink text-[11px] font-semibold uppercase tracking-widest rounded-[4px] hover:bg-[#F4F4F0] disabled:opacity-50 transition-colors flex items-center whitespace-nowrap"
            >
              Skip the twist
            </button>
          )}
        </div>
      </div>
      
      {twistPlan && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="text-[16px] font-semibold text-ink border-b border-[#E4E2DC] pb-4">Original Recipe</h2>
            
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-text mb-2">Ingredients</h3>
              <ul className="space-y-1 text-[13px] text-muted-text opacity-75">
                {originalRecipe.ingredients.map((ing, i) => (
                  <li key={i}>{ing.name} - {ing.quantity}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-text mb-2">Method</h3>
              <ol className="list-decimal pl-4 space-y-1 text-[13px] text-muted-text opacity-75 leading-relaxed">
                {originalRecipe.method.map((step, i) => (
                  <li key={i} className="pl-1">{step}</li>
                ))}
              </ol>
            </div>
          </div>
          
          <div className="space-y-6 bg-white border-l-4 border-[#7A2E2E] pl-6 py-4 rounded-[4px]">
            <h2 className="text-[16px] font-semibold text-ink border-b border-[#E4E2DC] pb-4">New Recipe (under constraint)</h2>
            
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A2E2E] mb-3">Diff Analysis</h3>
              <div className="space-y-3">
                {twistPlan.diff.map((diff, i) => (
                  <div key={i} className={`p-3 rounded-[4px] text-[13px] border ${
                    diff.change_type === 'added' ? 'bg-[#EAF3EB] border-[#B7DDBB] text-[#1E4620]' :
                    diff.change_type === 'removed' ? 'bg-[#FEEAE8] border-[#FAC1BC] text-[#7A2E2E]' :
                    diff.change_type === 'modified' ? 'bg-[#FAFAF8] border-[#E4E2DC] text-ink' :
                    'opacity-50 border-transparent text-muted-text'
                  }`}>
                    <span className="font-semibold capitalize inline-block w-20 text-[11px] uppercase tracking-wider">{diff.change_type}:</span>
                    <span className="font-medium mr-2">{diff.item_name}</span>
                    <span className="opacity-80 block mt-1 text-[12px]">{diff.justification}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-text mb-2 mt-6">Updated Ingredients</h3>
              {invalidIngredients.length > 0 && (
                <div className="mb-4 p-3 bg-[#FFF5F5] border border-[#7A2E2E] rounded-[4px] flex gap-2 items-start text-[#7A2E2E]">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <div className="text-[12px]">
                    <strong>Pantry Violation:</strong> Not in pantry: {invalidIngredients.join(', ')}.
                  </div>
                </div>
              )}
              <ul className="space-y-1 text-[13px] text-ink">
                {twistPlan.new_recipe.ingredients.map((ing, i) => (
                  <li key={i}>{ing.name} - {ing.quantity}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
