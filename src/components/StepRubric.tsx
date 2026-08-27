import React from 'react';
import { RubricScores, RubricEvaluation } from '../types';
import { Loader2 } from 'lucide-react';

interface Props {
  scores: RubricScores | null;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
}

export function StepRubric({ scores, onGenerate, isGenerating, canGenerate }: Props) {
  if (!canGenerate && !scores) return null;

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-6">
        <div>
          <label className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.1em] mb-2 block">Step 05 — Judging Criteria</label>
          <h2 className="text-[28px] font-semibold">Rubric Evaluation</h2>
        </div>
        {!scores && (
          <button 
            onClick={onGenerate}
            disabled={isGenerating || !canGenerate}
            className="px-6 py-4 bg-[#16181D] text-white text-[12px] font-semibold uppercase tracking-widest rounded-[4px] hover:bg-opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={16} /> : null}
            Run Evaluation
          </button>
        )}
      </div>
      
      {scores && (
        <div className="space-y-6">
          <RubricRow 
            title="Culinary quality & taste" 
            maxScore={25} 
            evaluation={scores.culinary_quality} 
          />
          <RubricRow 
            title="AI + vibe-coding innovation" 
            maxScore={20} 
            evaluation={scores.innovation} 
          />
          <RubricRow 
            title="Culinary creativity" 
            maxScore={15} 
            evaluation={scores.creativity} 
          />
          <RubricRow 
            title="Problem & product thinking" 
            maxScore={15} 
            evaluation={scores.problem_thinking} 
          />
          <RubricRow 
            title="Response to constraints" 
            maxScore={10} 
            evaluation={scores.constraint_response} 
          />
          <RubricRow 
            title="User experience" 
            maxScore={5} 
            evaluation={scores.user_experience} 
          />
          <RubricRow 
            title="Pitch & story" 
            maxScore={10} 
            evaluation={scores.pitch_story} 
          />
          
          <div className="mt-8 p-6 bg-[#16181D] text-[#FAFAF8] rounded-[4px] flex justify-between items-center">
            <span className="text-[16px] font-medium tracking-wide">Total Score</span>
            <span className="text-5xl font-bold">
              {(Object.values(scores) as RubricEvaluation[]).reduce((sum, s) => sum + (s?.score || 0), 0)} <span className="text-xl text-[#6B6B66] font-normal">/ 100</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function RubricRow({ title, maxScore, evaluation }: { title: string, maxScore: number, evaluation: any }) {
  if (!evaluation) return null;

  const percentage = (evaluation.score / maxScore) * 100;
  
  return (
    <div className="bg-white border border-[#E4E2DC] rounded-[4px] p-6 flex flex-col md:flex-row gap-6 items-start">
      <div className="md:w-1/4 flex-shrink-0">
        <h3 className="text-[13px] font-semibold text-ink mb-2">{title}</h3>
        <div className="text-3xl font-bold text-[#16181D]">
          {evaluation.score || 0} <span className="text-sm text-[#6B6B66] font-normal">/ {maxScore}</span>
        </div>
      </div>
      
      <div className="md:w-3/4 flex-1">
        <div className="h-1 bg-[#F4F4F0] overflow-hidden mb-4 rounded-full">
          <div 
            className="h-full bg-[#16181D]" 
            style={{ width: `${Math.min(100, Math.max(0, percentage || 0))}%` }}
          />
        </div>
        
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B66] block mb-1">Reasoning</span>
            <p className="text-[13px] text-ink">{evaluation.reasoning || 'No reasoning provided.'}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A2E2E] block mb-1">Highest-Leverage Improvement</span>
            <p className="text-[13px] text-ink">{evaluation.improvement || 'No improvements suggested.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
