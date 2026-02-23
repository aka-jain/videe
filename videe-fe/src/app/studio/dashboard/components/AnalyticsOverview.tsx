'use client';

import React from 'react';
import { FaVideo, FaEye, FaDownload, FaClock } from 'react-icons/fa';
import AnalyticsCard from '../../../../components/studio/AnalyticsCard';
import { useGenerationData } from '../../../../hooks/useGenerationData';

export default function AnalyticsOverview() {
  const { loading, getStatistics } = useGenerationData();
  const stats = getStatistics();

  // Map icon names to actual icon components
  const iconMap = {
    FaVideo: <FaVideo />,
    FaEye: <FaEye />,
    FaDownload: <FaDownload />,
    FaClock: <FaClock />
  };

  const analyticsData = [
    {
      title: "Total Videos",
      value: loading ? "..." : stats.total.toString(),
      icon: "FaVideo",
      color: "blue"
    },
    {
      title: "Completed",
      value: loading ? "..." : stats.completed.toString(),
      icon: "FaEye",
      color: "green"
    },
    {
      title: "In Progress",
      value: loading ? "..." : stats.inProgress.toString(),
      icon: "FaClock",
      color: "yellow"
    },
    {
      title: "Errors",
      value: loading ? "..." : stats.errors.toString(),
      icon: "FaDownload",
      color: "red"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {analyticsData.map((item, index) => (
        <AnalyticsCard
          key={index}
          title={item.title}
          value={item.value}
          icon={iconMap[item.icon as keyof typeof iconMap]}
          color={item.color}
        />
      ))}
    </div>
  );
} 