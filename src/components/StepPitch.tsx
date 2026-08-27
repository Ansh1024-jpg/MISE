import React from 'react';
import { PitchBeat } from '../types';
import { Loader2, Copy } from 'lucide-react';

interface Props {
  pitch: PitchBeat[] | null;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  onTogglePresent: () => void;
}

export function StepPitch({ pitch, onGenerate, isGenerating, canGenerate, onTogglePresent }: Props) {
  if (!canGenerate && !pitch) return null;

  const copyToClipboard = () => {
    if (!pitch) return;
    const text = pitch.map(p => `[${p.label}]\n${p.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-6">
        <div>
          <label className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.1em] mb-2 block">Step 06 — Communication</label>
          <h2 className="text-[28px] font-semibold">The Pitch</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onTogglePresent}
            className="px-4 py-2 border border-[#E4E2DC] text-[11px] font-semibold uppercase tracking-wider rounded-[4px] bg-white hover:bg-[#F4F4F0] transition-colors"
          >
            Present Mode
          </button>
          {!pitch && (
            <button 
              onClick={onGenerate}
              disabled={isGenerating || !canGenerate}
              className="px-6 py-2 bg-[#16181D] text-white text-[11px] font-semibold uppercase tracking-widest rounded-[4px] hover:bg-opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} /> : null}
              Generate Script
            </button>
          )}
          {pitch && (
            <button 
              onClick={copyToClipboard}
              className="px-4 py-2 bg-white text-ink font-semibold uppercase tracking-wider rounded-[4px] border border-[#E4E2DC] hover:border-[#16181D] transition-colors flex items-center gap-2 text-[11px]"
            >
              <Copy size={14} />
              Copy
            </button>
          )}
        </div>
      </div>
      
      {pitch && (
        <div className="bg-white border border-[#E4E2DC] rounded-[4px] p-8 space-y-8">
          {pitch.map((beat, idx) => (
            <div key={idx} className="relative">
              <span className="absolute -left-12 top-0 text-3xl font-bold text-[#E4E2DC]">0{idx + 1}</span>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B66] mb-2">{beat.label}</h3>
              <p className="text-[15px] text-[#16181D] leading-relaxed font-serif">{beat.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
