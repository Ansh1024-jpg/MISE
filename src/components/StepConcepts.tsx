import React, { useState } from 'react';
import { Concept } from '../types';

interface Props {
  concepts: Concept[];
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

const THEME_COLORS = ['#7A2E2E', '#2F5D62', '#16181D'];

const SCORE_LABELS: Array<{ key: keyof Concept['scores']; label: string }> = [
  { key: 'uniqueness', label: 'Uniqueness' },
  { key: 'feasibility_60min', label: 'Feasibility' },
  { key: 'visual_impact', label: 'Visual impact' },
  { key: 'health', label: 'Health' },
  { key: 'sustainability', label: 'Sustainability' },
];

export function StepConcepts({ concepts, onSelect, selectedIndex }: Props) {
  return (
    <div className="w-full">
      <div>
        <label className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.1em] mb-2 block">Step 02 — Concept Generation</label>
        <h2 className="text-[28px] font-semibold mb-6">Three Distinct Pathways</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {concepts.map((concept, idx) => (
          <ConceptCard
            key={idx}
            concept={concept}
            isSelected={selectedIndex === idx}
            onSelect={() => onSelect(idx)}
            themeColor={THEME_COLORS[idx % THEME_COLORS.length]}
          />
        ))}
      </div>
    </div>
  );
}

const ConceptCard: React.FC<{ concept: Concept, isSelected: boolean, onSelect: () => void, themeColor: string }> = ({ concept, isSelected, onSelect, themeColor }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className="bg-white border border-[#E4E2DC] rounded-[6px] flex flex-col overflow-hidden"
      style={{ borderLeftWidth: '3px', borderLeftColor: themeColor }}
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-[16px] font-semibold leading-tight">{concept.name}</h3>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded capitalize whitespace-nowrap ml-2"
            style={{ color: themeColor, backgroundColor: `${themeColor}1A` }} // 1A is ~10% opacity in hex
          >
            {concept.course}
          </span>
        </div>

        <p className="text-[14px] text-[#6B6B66] leading-relaxed mb-4">{concept.one_line_pitch}</p>

        <div className="mb-4">
          <label className="text-[10px] font-bold text-[#6B6B66] uppercase block mb-1">Core Pantry</label>
          <div className="flex flex-wrap gap-1">
            {concept.core_ingredients.map((ing, i) => (
              <span key={i} className="text-[10px] border border-[#E4E2DC] px-2 rounded-full">{ing}</span>
            ))}
          </div>
        </div>

        <div className="bg-[#FAFAF8] p-3 rounded-[4px] flex-1 flex flex-col justify-between mt-auto">
          <div>
            <label className="text-[11px] font-semibold text-[#16181D] uppercase tracking-wider mb-2 block">Why this works</label>

            {concept.pair_basis && (
              <div className="mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6B66] block mb-0.5">The Pairing</span>
                <span className="text-[12px] font-medium text-[#2F5D62]">{concept.pair_basis}</span>
              </div>
            )}

            <p className={`text-[12px] leading-[1.6] text-[#6B6B66] italic ${expanded ? '' : 'line-clamp-4'}`}>
              "{concept.flavour_logic}"
            </p>

            {expanded && concept.score_reasons && (
              <div className="mt-4 space-y-2 border-t border-[#E4E2DC] pt-3">
                {SCORE_LABELS.map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B66]">{label}</span>
                      <span className="text-[13px] font-semibold text-[#16181D]">{concept.scores[key]}</span>
                    </div>
                    <p className="text-[11px] leading-[1.5] text-[#6B6B66] mt-0.5">{concept.score_reasons[key]}</p>
                  </div>
                ))}
              </div>
            )}

            {expanded && concept.risks?.length > 0 && (
              <div className="mt-4 border-t border-[#E4E2DC] pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B66] block mb-1">Risks at the station</span>
                <ul className="space-y-1">
                  {concept.risks.map((r, i) => (
                    <li key={i} className="text-[11px] leading-[1.5] text-[#6B6B66]">{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setExpanded(v => !v)}
              className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-[#6B6B66] hover:text-[#16181D] transition-colors"
            >
              {expanded ? 'Show less' : 'Show full reasoning'}
            </button>
          </div>

          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold uppercase" style={{ color: themeColor }}>Unexpected Move</p>
              <p className="text-[12px] font-medium leading-tight mt-0.5">{concept.unexpected_move}</p>
            </div>
            <div className="text-right ml-2 shrink-0">
              <p className="text-[20px] font-semibold text-[#16181D] leading-none">{concept.scores.feasibility_60min}</p>
              <p className="text-[8px] uppercase tracking-tighter opacity-50 mt-1">Feasibility</p>
            </div>
          </div>
        </div>
      </div>

      {isSelected ? (
        <button
          className="w-full py-4 bg-[#16181D] text-white text-[12px] font-semibold uppercase tracking-widest cursor-default"
        >
          Selected
        </button>
      ) : (
        <button
          onClick={onSelect}
          className="w-full py-4 border-t border-[#E4E2DC] text-[12px] font-semibold uppercase tracking-widest hover:bg-[#E4E2DC] transition-colors"
        >
          Select Strategy
        </button>
      )}
    </article>
  );
}
