'use client';

import React, { useState } from 'react';
import { FiSearch } from 'react-icons/fi';

interface ProcessStepsProps {
  className?: string;
}

const ProcessSteps: React.FC<ProcessStepsProps> = ({ className = "" }) => {
  const [prompt, setPrompt] = useState('Create a video on IRCTC for education purpose');

  return (
    <div className={`process-steps w-full ${className}`}>
      <div className="flex flex-col items-center justify-center h-full p-6 w-full">

        <h2 className="text-2xl font-bold text-cyan-100 mb-6 flex items-center gap-2">
          Add Your Video Prompt</h2>
        <div className="w-full relative">
          <input
            type="text"
            placeholder="enter prompt"
            value={prompt}
            disabled
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-4 text-left py-3  rounded-full border-1 border-cyan-200 focus:border-blue-500 focus:outline-none text-white placeholder-cyan-500 font-bold"
          />
          <FiSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-cyan-200 text-lg" />
        </div>
      </div>
    </div>
  );
};

export default ProcessSteps; 