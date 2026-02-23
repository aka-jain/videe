'use client';

import React from 'react';
import { IconType } from 'react-icons';

interface AnalyticsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function AnalyticsCard({ title, value, icon, color, trend }: AnalyticsCardProps) {
  return (
    <div className="bg-zinc-800 p-6 rounded-lg shadow-md border border-zinc-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-200 text-sm">{title}</p>
          <p className="text-2xl font-bold text-zinc-200">{value}</p>
          {trend && (
            <div className={`text-sm mt-1 ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {trend.isPositive ? '↗' : '↘'} {trend.value}
            </div>
          )}
        </div>
        <div className={`text-2xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
} 