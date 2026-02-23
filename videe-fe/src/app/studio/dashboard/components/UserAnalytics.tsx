'use client';

import React from 'react';
import { FaUsers, FaUserPlus, FaUserCheck, FaUserClock, FaGlobe } from 'react-icons/fa';

export default function UserAnalytics() {
  const userStats = [
    { title: 'Total Users', value: '1,234', icon: <FaUsers />, color: 'text-blue-600', change: '+12%' },
    { title: 'New Users', value: '89', icon: <FaUserPlus />, color: 'text-green-600', change: '+8%' },
    { title: 'Active Users', value: '567', icon: <FaUserCheck />, color: 'text-purple-600', change: '+15%' },
    { title: 'Returning Users', value: '234', icon: <FaUserClock />, color: 'text-orange-600', change: '+5%' },
  ];

  const topCountries = [
    { country: 'United States', users: 456, percentage: 37 },
    { country: 'India', users: 234, percentage: 19 },
    { country: 'United Kingdom', users: 123, percentage: 10 },
    { country: 'Canada', users: 89, percentage: 7 },
    { country: 'Germany', users: 67, percentage: 5 },
  ];

  const userActivity = [
    { time: '00:00', users: 45 },
    { time: '04:00', users: 23 },
    { time: '08:00', users: 89 },
    { time: '12:00', users: 156 },
    { time: '16:00', users: 134 },
    { time: '20:00', users: 98 },
  ];

  return (
    <div className="space-y-6">
      {/* User Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userStats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-md border border-zinc-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-600 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
                <p className="text-sm text-green-600 font-medium">{stat.change}</p>
              </div>
              <div className={`text-2xl ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-zinc-200">
          <div className="flex items-center gap-2 mb-4">
            <FaGlobe className="text-cyan-600" />
            <h2 className="text-xl font-semibold text-zinc-900">Top Countries</h2>
          </div>
          <div className="space-y-3">
            {topCountries.map((country, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-200 rounded-full flex items-center justify-center text-xs font-medium">
                    {country.country.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-zinc-900">{country.country}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-zinc-200 rounded-full h-2">
                    <div 
                      className="bg-cyan-600 h-2 rounded-full" 
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-zinc-600 w-12 text-right">
                    {country.users}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Activity by Hour */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-zinc-200">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">User Activity (24h)</h2>
          <div className="h-48 flex items-end justify-between gap-1">
            {userActivity.map((activity, index) => {
              const height = (activity.users / 160) * 100;
              return (
                <div key={index} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <div 
                      className="w-6 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm transition-all duration-300 hover:from-cyan-700 hover:to-cyan-500"
                      style={{ height: `${height}%` }}
                    />
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white text-xs px-1 py-0.5 rounded opacity-0 hover:opacity-100 transition-opacity">
                      {activity.users}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600">{activity.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 