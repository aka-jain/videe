'use client';

import React from 'react';
import { FaChartLine, FaArrowUp, FaArrowDown } from 'react-icons/fa';

export default function GrowthChart() {
  const growthData = [
    { period: 'Jan', views: 120, growth: 12 },
    { period: 'Feb', views: 180, growth: 8 },
    { period: 'Mar', views: 220, growth: 15 },
    { period: 'Apr', views: 280, growth: 22 },
    { period: 'May', views: 320, growth: 18 },
    { period: 'Jun', views: 380, growth: 25 },
  ];

  const totalGrowth = 18.5;
  const isPositive = totalGrowth > 0;

  return (
    <div className="bg-zinc-900 p-6 rounded-lg shadow-md border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-zinc-200">Growth Overview</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-200">Monthly Growth:</span>
          <div className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? <FaArrowUp /> : <FaArrowDown />}
            {Math.abs(totalGrowth)}%
          </div>
        </div>
      </div>
      
      <div className="h-64 bg-zinc-800 rounded-lg p-4">
        <div className="flex items-end justify-between h-full gap-2">
          {growthData.map((data, index) => {
            const height = (data.views / 400) * 100; // Normalize to max height
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div 
                    className="w-8 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all duration-300 hover:from-blue-700 hover:to-blue-500"
                    style={{ height: `${height}%` }}
                  />
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap">
                    {data.views} views
                  </div>
                </div>
                <span className="text-xs text-zinc-600">{data.period}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {growthData.slice(-4).map((data, index) => (
          <div key={index} className="text-center">
            <p className="text-sm text-zinc-600">{data.period}</p>
            <p className="font-semibold text-zinc-900">{data.views}</p>
            <div className={`flex items-center justify-center gap-1 text-xs ${
              data.growth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {data.growth > 0 ? <FaArrowUp /> : <FaArrowDown />}
              {Math.abs(data.growth)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 