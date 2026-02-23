'use client';

import React, { useRef, useEffect } from 'react';
import { Loader2, SendHorizonal } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function PromptInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask anything or select a template below",
  isLoading = false,
  disabled = false,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
    // Shift+Enter will naturally add a new line
  };

  const isSubmitDisabled = disabled || isLoading || !value.trim();

  return (
    <div className="bg-zinc-800 p-4 px-6 rounded-4xl flex items-center w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus
        className="flex-1 bg-transparent focus:outline-none resize-none text-white placeholder-zinc-500 text-lg min-h-[24px] max-h-32 overflow-y-auto"
        rows={1}
        disabled={disabled || isLoading}
      />
      {
        isLoading ? (
          <Loader2 className="ml-4 animate-spin text-blue-500" size={24} />
        ) : (
          <SendHorizonal
            size={24}
            className={`ml-4 cursor-pointer transition-colors ${isSubmitDisabled ? 'text-zinc-600' : 'text-zinc-400 hover:text-blue-400'}`}
            onClick={!isSubmitDisabled ? onSubmit : undefined}
          />
        )
      }
    </div>
  );
} 