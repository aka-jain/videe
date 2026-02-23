'use client';

import React, { useState } from 'react';
import { Loader2, Save, Search, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import Button from '../Button';

export interface MemoryItem {
  id?: string;
  memory: string;
  score?: number;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

export default function MemoriesSection() {
  const [open, setOpen] = useState(false);
  const [saveInput, setSaveInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const clearMessage = () => setMessage(null);

  const handleSave = async () => {
    if (!saveInput.trim()) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: saveInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save memory');
      setSaveInput('');
      setMessage({ type: 'success', text: 'Memory saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save memory' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setIsSearching(true);
    setMessage(null);
    setMemories([]);
    try {
      const res = await fetch('/api/memories/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchInput.trim(), topK: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to search memories');
      const list = Array.isArray(data) ? data : data?.memories ?? data?.results ?? [];
      setMemories(Array.isArray(list) ? list : []);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to search memories' });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left text-zinc-400 hover:text-zinc-300 rounded-lg py-2 px-1 transition-colors"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <Brain size={20} />
        <h2 className="text-lg font-medium text-zinc-300">Memories</h2>
      </button>

      {open && (
        <div className="space-y-4 mt-3">
      {/* Save memory */}
      <div className="bg-zinc-800/80 p-4 rounded-2xl space-y-3">
        <label className="text-sm font-medium text-zinc-400 block">Save a memory</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={saveInput}
            onChange={(e) => { setSaveInput(e.target.value); clearMessage(); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="e.g. User prefers short videos under 60 seconds"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            disabled={isSaving}
          />
          <Button
            onClick={handleSave}
            disabled={isSaving || !saveInput.trim()}
            size="xs"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          </Button>
        </div>
      </div>

      {/* Search memories */}
      <div className="bg-zinc-800/80 p-4 rounded-2xl space-y-3">
        <label className="text-sm font-medium text-zinc-400 block">Search memories</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); clearMessage(); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. What are my video preferences?"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            disabled={isSearching}
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchInput.trim()}
            variant="outline"
            size="sm"
          >
            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {/* <span className="ml-1.5">{isSearching ? 'Searching…' : 'Fetch'}</span> */}
          </Button>
        </div>
      </div>

      {message && (
        <p
          className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      {memories.length > 0 && (
        <div className="bg-zinc-800/80 p-4 rounded-2xl space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">Results</h3>
          <ul className="space-y-2">
            {memories.map((m, i) => (
              <li
                key={m.id ?? i}
                className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-zinc-300 text-sm"
              >
                {typeof m.memory === 'string' ? m.memory : JSON.stringify(m)}
                {typeof m.score === 'number' && (
                  <span className="ml-2 text-zinc-500 text-xs">({(m.score * 100).toFixed(0)}%)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
