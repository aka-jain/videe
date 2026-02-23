'use client';

import React from 'react';
import { FaMoneyBill, FaDollarSign, FaCreditCard, FaChartLine, FaArrowUp, FaArrowDown } from 'react-icons/fa';

export default function RevenueAnalytics() {
  const revenueStats = [
    { title: 'Total Revenue', value: '$12,345', icon: <FaMoneyBill />, color: 'text-green-600', change: '+18%' },
    { title: 'Monthly Revenue', value: '$2,890', icon: <FaDollarSign />, color: 'text-blue-600', change: '+12%' },
    { title: 'Subscriptions', value: '156', icon: <FaCreditCard />, color: 'text-purple-600', change: '+8%' },
    { title: 'Avg. Revenue/User', value: '$45.67', icon: <FaChartLine />, color: 'text-orange-600', change: '+5%' },
  ];

  const revenueByMonth = [
    { month: 'Jan', revenue: 1200, growth: 12 },
    { month: 'Feb', revenue: 1800, growth: 8 },
    { month: 'Mar', revenue: 2200, growth: 15 },
    { month: 'Apr', revenue: 2800, growth: 22 },
    { month: 'May', revenue: 3200, growth: 18 },
    { month: 'Jun', revenue: 3800, growth: 25 },
  ];

  const topRevenueSources = [
    { source: 'Premium Subscriptions', revenue: 5600, percentage: 45 },
    { source: 'Video Downloads', revenue: 3200, percentage: 26 },
    { source: 'Ad Revenue', revenue: 2100, percentage: 17 },
    { source: 'Custom Videos', revenue: 1445, percentage: 12 },
  ];

  return (
    <div className="space-y-6">
      {/* Revenue Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {revenueStats.map((stat, index) => (
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
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-zinc-200">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Revenue Trend</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {revenueByMonth.map((data, index) => {
              const height = (data.revenue / 4000) * 100;
              return (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div 
                      className="w-8 bg-gradient-to-t from-green-600 to-green-400 rounded-t-sm transition-all duration-300 hover:from-green-700 hover:to-green-500"
                      style={{ height: `${height}%` }}
                    />
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap">
                      ${data.revenue}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600">{data.month}</span>
                  <div className={`flex items-center gap-1 text-xs ${
                    data.growth > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.growth > 0 ? <FaArrowUp /> : <FaArrowDown />}
                    {Math.abs(data.growth)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue Sources */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-zinc-200">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Revenue Sources</h2>
          <div className="space-y-4">
            {topRevenueSources.map((source, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900">{source.source}</span>
                  <span className="text-sm font-semibold text-zinc-900">${source.revenue}</span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>{source.percentage}% of total revenue</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-zinc-200">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">Revenue Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-zinc-600">Total Revenue (YTD)</p>
            <p className="text-2xl font-bold text-green-600">$12,345</p>
            <p className="text-sm text-green-600">+18% vs last year</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-zinc-600">Monthly Average</p>
            <p className="text-2xl font-bold text-blue-600">$2,057</p>
            <p className="text-sm text-blue-600">+12% vs last month</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-zinc-600">Projected Annual</p>
            <p className="text-2xl font-bold text-purple-600">$24,690</p>
            <p className="text-sm text-purple-600">Based on current trend</p>
          </div>
        </div>
      </div>
    </div>
  );
} 