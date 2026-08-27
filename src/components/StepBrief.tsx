import React, { useState, useEffect } from 'react';
import { PANTRY, CATEGORIES } from '../constants';
import { Brief, Course, SessionData } from '../types';
import { Loader2 } from 'lucide-react';

interface Props {
  session: SessionData;
  onGenerate: (brief: Brief) => void;
  isGenerating: boolean;
}

export function StepBrief({ session, onGenerate, isGenerating }: Props) {
  const [availableIngredients, setAvailableIngredients] = useState<Set<string>>(
    new Set(PANTRY.map(p => p.name))
  );
  const [course, setCourse] = useState<Course>('main');
  const [audienceNote, setAudienceNote] = useState('');
  const [cookTime, setCookTime] = useState(60);
  const [servings, setServings] = useState(4);
  const [priorities, setPriorities] = useState({
    uniqueness: 50,
    visualAppeal: 50,
    health: 50,
    sustainability: 50,
  });

  useEffect(() => {
    if (session.brief) {
      setAvailableIngredients(new Set(session.brief.availableIngredients));
      setCourse(session.brief.course);
      setAudienceNote(session.brief.audienceNote);
      setCookTime(session.brief.cookTime);
      setServings(session.brief.servings);
      setPriorities(session.brief.priorities);
    }
  }, [session.brief]);

  const toggleIngredient = (name: string) => {
    setAvailableIngredients(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    const categoryItems = PANTRY.filter(p => p.category === category).map(p => p.name);
    const allSelected = categoryItems.every(item => availableIngredients.has(item));
    
    setAvailableIngredients(prev => {
      const next = new Set(prev);
      if (allSelected) {
        categoryItems.forEach(item => next.delete(item));
      } else {
        categoryItems.forEach(item => next.add(item));
      }
      return next;
    });
  };

  const handleGenerate = () => {
    onGenerate({
      availableIngredients: Array.from(availableIngredients),
      course,
      audienceNote,
      cookTime,
      servings,
      priorities
    });
  };

  return (
    <div className="w-full">
      <div>
        <label className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.1em] mb-2 block">Step 01 — Configuration</label>
        <h2 className="text-[28px] font-semibold mb-6">The Brief</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-text mb-4">Pantry Availability</h2>
            <div className="space-y-6">
              {CATEGORIES.map(category => {
                const items = PANTRY.filter(p => p.category === category);
                if (items.length === 0) return null;
                const allSelected = items.every(item => availableIngredients.has(item.name));
                
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-[13px] font-semibold text-[#16181D]">{category}</h3>
                      <button 
                        onClick={() => toggleCategory(category)}
                        className="text-[10px] text-muted-text hover:text-ink uppercase tracking-wider"
                      >
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {items.map(item => (
                        <button
                          key={item.name}
                          onClick={() => toggleIngredient(item.name)}
                          className={`px-3 py-1.5 text-sm rounded-[4px] border transition-colors ${
                            availableIngredients.has(item.name) 
                              ? 'bg-[#16181D] text-white border-[#16181D]' 
                              : 'bg-white text-[#6B6B66] border-[#E4E2DC] hover:border-[#16181D]'
                          }`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-text mb-4">Constraints</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Course</label>
                <div className="flex gap-2">
                  {(['starter', 'main', 'dessert'] as Course[]).map(c => (
                    <button
                      key={c}
                      onClick={() => setCourse(c)}
                      className={`flex-1 py-2 text-sm rounded-[4px] border capitalize font-medium ${
                        course === c ? 'bg-[#16181D] text-white border-[#16181D]' : 'bg-white text-[#6B6B66] border-[#E4E2DC] hover:border-[#16181D]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Audience Note</label>
                <textarea 
                  value={audienceNote}
                  onChange={e => setAudienceNote(e.target.value)}
                  placeholder="e.g. Judges prefer bold, spice-forward food"
                  className="w-full p-3 border border-[#E4E2DC] rounded-[4px] text-sm bg-white focus:outline-none focus:border-[#16181D] resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-ink mb-2">Cook Time (min)</label>
                  <input 
                    type="number" 
                    value={cookTime}
                    onChange={e => setCookTime(Number(e.target.value))}
                    className="w-full p-2 border border-[#E4E2DC] rounded-[4px] text-sm bg-white focus:outline-none focus:border-[#16181D]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-ink mb-2">Servings</label>
                  <input 
                    type="number" 
                    value={servings}
                    onChange={e => setServings(Number(e.target.value))}
                    className="w-full p-2 border border-[#E4E2DC] rounded-[4px] text-sm bg-white focus:outline-none focus:border-[#16181D]"
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-text mb-4">Priorities</h2>
            <div className="space-y-4">
              {Object.entries(priorities).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1 font-medium">
                    <span className="capitalize text-ink">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-muted-text">{value}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={value}
                    onChange={e => setPriorities(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="w-full accent-ink"
                  />
                </div>
              ))}
            </div>
          </section>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-[#7A2E2E] text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 rounded-[4px]"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={16} /> : null}
            {isGenerating ? 'Reasoning...' : 'Generate Concepts'}
          </button>
        </div>
      </div>
    </div>
  );
}
