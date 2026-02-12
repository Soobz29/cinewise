import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { getMoodSuggestions } from '../services/geminiService';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce logic for mood suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (input.trim().length >= 3) {
        setIsSuggesting(true);
        const results = await getMoodSuggestions(input);
        setSuggestions(results);
        setIsSuggesting(false);
        if (results.length > 0) setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500); // 500ms debounce for responsiveness

    return () => clearTimeout(timer);
  }, [input]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="w-full relative z-50">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-700"></div>
        <div className="relative flex items-center bg-[#1c1c1e] rounded-xl p-1.5 border border-white/10 shadow-2xl transition-all focus-within:bg-[#2c2c2e] focus-within:border-white/20">
          <Search className="w-5 h-5 text-slate-500 ml-3" />
          <input
            type="text"
            className="flex-1 bg-transparent text-white placeholder-slate-500 border-none outline-none px-4 py-2.5 text-base font-medium tracking-wide"
            placeholder="Describe a mood, plot, or mix of genres..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
            disabled={isLoading}
          />
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white/50 mr-3" />
          ) : isSuggesting ? (
             <div className="mr-3">
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
             </div>
          ) : null}
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute w-full mt-2 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden origin-top z-[60]">
          <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 flex items-center justify-between">
            <span>Suggestions</span>
            <Sparkles className="w-3 h-3 text-indigo-400" />
          </div>
          <div className="max-h-[60vh] overflow-y-auto scrollbar-hide">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-3.5 hover:bg-white/10 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0 group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5 flex items-center justify-center shrink-0 group-hover:border-indigo-500/30 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-slate-200 font-medium truncate text-sm group-hover:text-white transition-colors">
                    {suggestion}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;