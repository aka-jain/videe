import React from 'react';

const ScriptGeneration: React.FC = () => {
  return (
    <div className="script-generation text-white">
      <h2 className="text-2xl font-bold text-cyan-100 mb-6 flex items-center justify-center gap-2">
       
          {/* <span className="text-cyan-200 font-bold text-sm">1</span> */}
        Review/Edit Generated Script</h2>
      <div className="script-content max-w-md mx-auto">
        <p className="text-center leading-relaxed">
          Our AI analyzes your video content and generates a comprehensive script
          that captures the key moments and narrative flow. The script includes
          detailed descriptions, dialogue suggestions, and scene transitions.
        </p>
      </div>
    </div>
  );
};

export default ScriptGeneration;
