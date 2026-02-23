'use client';

import React from 'react';
import AnalyticsOverview from './components/AnalyticsOverview';
import RecentVideos from './components/RecentVideos';
import GrowthChart from './components/GrowthChart';
import DashboardHeader from '../../../components/studio/DashboardHeader';

export default function Dashboard() {
  return (
    <div className="space-y-6 p-8">
      <DashboardHeader title="OVERVIEW" />

      {/* Content Area */}
      <div className="min-h-[600px] space-y-6">
        <AnalyticsOverview />
        <RecentVideos />
        <GrowthChart />
      </div>
    </div>
  );
} 