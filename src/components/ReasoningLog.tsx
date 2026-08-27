import React, { useState } from 'react';
import { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
}

export function ReasoningLog({ logs }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (logs.length === 0) return null;

  return (
    <div className="z-50 bg-[#16181D]">
      {isOpen && (
        <div className="max-h-64 overflow-y-auto p-4 flex flex-col gap-4 bg-[#111111] text-xs font-mono text-[#A1A1AA] border-t border-[#27272A]">
          {logs.map(log => (
            <div key={log.id} className="border-l-2 border-[#2F5D62] pl-3">
              <div className="flex justify-between text-[#FAFAF8] mb-1">
                <span className="font-semibold">{log.step}</span>
                <span>{new Date(log.timestamp).toLocaleTimeString()} · {log.latency}ms</span>
              </div>
              <pre className="whitespace-pre-wrap break-words opacity-80">
                {log.prompt}
              </pre>
            </div>
          ))}
        </div>
      )}
      
      <footer 
        onClick={() => setIsOpen(!isOpen)}
        className="h-[32px] w-full flex items-center px-4 font-mono text-[9px] text-white/50 justify-between cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="flex gap-4">
          <span>LOG: {logs[0].step}</span>
          <span>LATENCY: {logs[0].latency}ms</span>
        </div>
        <span>{isOpen ? 'REASONING LOG — CLICK TO COLLAPSE' : 'REASONING LOG — CLICK TO EXPAND'}</span>
      </footer>
    </div>
  );
}
