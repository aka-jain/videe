'use client';

import React, { useState } from 'react';
import { FiSearch, FiFileText, FiVolume2, FiTag, FiVideo, FiFilm, FiDownload } from 'react-icons/fi';

interface ProcessStepsProps {
  className?: string;
}

const ProcessSteps: React.FC<ProcessStepsProps> = ({ className = "" }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [prompt, setPrompt] = useState('Create a video on IRCTC for education purpose');

  const steps = [
    { id: 1, title: "Enter Video Prompt", icon: <FiSearch /> },
    { id: 2, title: "Script Generation", icon: <FiFileText /> },
    { id: 3, title: "Audio Generation", icon: <FiVolume2 /> },
    { id: 4, title: "Keyword Extraction", icon: <FiTag /> },
    { id: 5, title: "Video Clip Processing", icon: <FiVideo /> },
    { id: 6, title: "Video Assembly", icon: <FiFilm /> },
    { id: 7, title: "Final Preview & Download", icon: <FiDownload /> }
  ];

  const currentStepData = steps.find(step => step.id === currentStep);

  return (
    <div className={`process-steps w-full ${className}`}>
      {/* Header Bar with Step Indicator */}
      <div className="bg-cyan-900/30 border-b border-cyan-200/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
              {currentStep}
            </div>
            <div>
              <h3 className="text-lg font-bold text-cyan-100 flex items-center gap-2">
                {currentStepData?.icon}
                {currentStepData?.title}
              </h3>
              <p className="text-cyan-300 text-sm">
                Step {currentStep} of {steps.length}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex-1 max-w-xs mx-4">
            <div className="w-full bg-cyan-900/30 rounded-full h-2">
              <div 
                className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {/* Step Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="w-8 h-8 bg-cyan-800 hover:bg-cyan-700 disabled:bg-cyan-900/30 disabled:text-cyan-600 text-white rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed text-sm"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
              disabled={currentStep === steps.length}
              className="w-8 h-8 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-900/30 disabled:text-cyan-600 text-white rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed text-sm"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center h-full p-6 w-full">
        <h2 className="text-2xl font-bold text-cyan-100 mb-6 flex items-center gap-2">
          Enter Video Prompt</h2>
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