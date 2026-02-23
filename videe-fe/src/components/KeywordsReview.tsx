'use client';

import React, { useState } from 'react';
import { FiTag } from 'react-icons/fi';

interface Keyword {
  id: string;
  text: string;
  category: string;
  relevance: number;
  isSelected: boolean;
}

interface KeywordsReviewProps {
  className?: string;
}

const KeywordsReview: React.FC<KeywordsReviewProps> = ({ className = "" }) => {
  const [keywords] = useState<Keyword[]>([
    { id: '1', text: 'IRCTC', category: 'Brand', relevance: 95, isSelected: true },
    { id: '2', text: 'Railway Booking', category: 'Service', relevance: 88, isSelected: true },
    { id: '3', text: 'Travel Planning', category: 'Service', relevance: 85, isSelected: true },
  ]);

  const selectedKeywords = keywords.filter(k => k.isSelected);
  const totalKeywords = keywords.length;

  return (
    <div className={`keywords-review w-full ${className}`}>
      <div className="flex flex-col items-center justify-center h-full p-6 w-full">
        <h2 className="text-2xl font-bold text-cyan-100 mb-6 flex items-center gap-2">
          <FiTag className="text-cyan-200" />
          Keywords Review
        </h2>
        
        <div className="w-full max-w-4xl">
          {/* Summary Stats */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-cyan-900/30 rounded-xl p-4 border border-cyan-200/30">
              <div className="text-cyan-200 text-sm">Total Keywords</div>
              <div className="text-2xl font-bold text-cyan-100">{totalKeywords}</div>
            </div>
            <div className="bg-cyan-900/30 rounded-xl p-4 border border-cyan-200/30">
              <div className="text-cyan-200 text-sm">Selected Keywords</div>
              <div className="text-2xl font-bold text-cyan-100">{selectedKeywords.length}</div>
            </div>
            <div className="bg-cyan-900/30 rounded-xl p-4 border border-cyan-200/30">
              <div className="text-cyan-200 text-sm">Average Relevance</div>
              <div className="text-2xl font-bold text-cyan-100">
                {Math.round(keywords.reduce((acc, k) => acc + k.relevance, 0) / keywords.length)}%
              </div>
            </div>
          </div> */}

          {/* Keywords List */}
          <div className="">
           
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {keywords.map((keyword) => (
                <div
                  key={keyword.id}
                  className={`p-3 rounded-lg border transition-all ${
                    keyword.isSelected 
                      ? 'bg-cyan-800/50 border-cyan-400/50' 
                      : 'bg-cyan-800/20 border-cyan-200/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${keyword.isSelected ? 'text-cyan-100' : 'text-cyan-300'}`}>
                      {keyword.text}
                    </span>
                    <span className="text-xs px-2 py-1 bg-cyan-700/50 rounded text-cyan-200">
                      {keyword.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-cyan-800 rounded-full">
                      <div 
                        className="h-2 bg-cyan-400 rounded-full transition-all"
                        style={{ width: `${keyword.relevance}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-cyan-300 w-8">{keyword.relevance}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {/* <div className="flex justify-center items-center mt-6">
            <button className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors">
              Continue
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default KeywordsReview; 