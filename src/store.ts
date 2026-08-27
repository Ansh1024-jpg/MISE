import { useState, useEffect } from 'react';
import { SessionData, LogEntry } from './types';

export function useAppStore() {
  const [session, setSession] = useState<SessionData>(() => {
    const saved = localStorage.getItem('mise_session_current');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return getEmptySession();
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    localStorage.setItem('mise_session_current', JSON.stringify(session));
  }, [session]);

  const updateSession = (updater: (prev: SessionData) => SessionData) => {
    setSession(updater);
  };

  const resetSession = () => {
    setSession(getEmptySession());
  };
  
  const saveSessionToHistory = (customName?: string) => {
    let currentSession = session;
    if (customName) {
      currentSession = { ...session, name: customName };
      setSession(currentSession);
    }
    
    const historyStr = localStorage.getItem('mise_sessions_history') || '[]';
    const history: SessionData[] = JSON.parse(historyStr);
    const existingIdx = history.findIndex(s => s.id === currentSession.id);
    if (existingIdx >= 0) {
      history[existingIdx] = currentSession;
    } else {
      history.push(currentSession);
    }
    localStorage.setItem('mise_sessions_history', JSON.stringify(history));
    setHistoryTick(t => t + 1);
  };
  
  const deleteSessionFromHistory = (id: string) => {
    const historyStr = localStorage.getItem('mise_sessions_history') || '[]';
    let history: SessionData[] = JSON.parse(historyStr);
    history = history.filter(s => s.id !== id);
    localStorage.setItem('mise_sessions_history', JSON.stringify(history));
    setHistoryTick(t => t + 1);
  };
  
  const loadSessionFromHistory = (id: string) => {
    const historyStr = localStorage.getItem('mise_sessions_history') || '[]';
    const history: SessionData[] = JSON.parse(historyStr);
    const found = history.find(s => s.id === id);
    if (found) {
      setSession(found);
    }
  };

  const getHistory = (): SessionData[] => {
    // We reference historyTick here just to ensure React knows getHistory's output depends on it?
    // Actually, getHistory just reads from localStorage. The historyTick state change forces a re-render in App.
    const _tick = historyTick; 
    const historyStr = localStorage.getItem('mise_sessions_history') || '[]';
    return JSON.parse(historyStr);
  };

  const addLog = (step: string, prompt: string, latency: number) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      step,
      timestamp: Date.now(),
      prompt,
      latency
    };
    setLogs(prev => [entry, ...prev]);
  };

  return { 
    session, 
    updateSession, 
    resetSession, 
    saveSessionToHistory, 
    deleteSessionFromHistory,
    loadSessionFromHistory, 
    getHistory, 
    logs, 
    addLog 
  };
}

function getEmptySession(): SessionData {
  return {
    id: Date.now().toString(),
    name: 'New Session',
    timestamp: Date.now(),
    brief: null,
    concepts: null,
    selectedConceptIndex: null,
    recipe: null,
    twistConstraint: null,
    twistPlan: null,
    rubric: null,
    pitch: null
  };
}
