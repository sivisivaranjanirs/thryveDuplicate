import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Droplet,
  Heart, 
  Activity, 
  Thermometer, 
  Scale, 
  User,
  Loader2,
  TrendingUp,
  Filter,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Clock
} from 'lucide-react';
import { HealthMetric } from '../lib/supabase';
import { useFriendHealthMetrics } from '../hooks/useFriendHealthMetrics';
import { motion, AnimatePresence } from 'framer-motion';

interface FriendHealthReportProps {
  friendId: string;
  friendName: string;
  friendEmail: string;
  onBack: () => void;
}

const metricIcons = {
  blood_pressure: Heart,
  blood_glucose: Droplet,
  heart_rate: Activity,
  temperature: Thermometer,
  weight: Scale,
};

const metricColors = {
  blood_pressure: 'red',
  blood_glucose: 'pink',
  heart_rate: 'blue',
  temperature: 'orange',
  weight: 'green',
};

const metricLabels = {
  blood_pressure: 'Blood Pressure',
  blood_glucose: 'Blood Glucose',
  heart_rate: 'Heart Rate',
  temperature: 'Temperature',
  weight: 'Weight',
};

// Helper function to get icon with fallback
const getMetricIcon = (metricType: string) => {
  return metricIcons[metricType as keyof typeof metricIcons] || AlertCircle;
};

// Helper function to get color with fallback
const getMetricColor = (metricType: string) => {
  return metricColors[metricType as keyof typeof metricColors] || 'gray';
};

// Helper function to get label with fallback
const getMetricLabel = (metricType: string) => {
  return metricLabels[metricType as keyof typeof metricLabels] || 
    metricType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function FriendHealthReport({ 
  friendId, 
  friendName, 
  friendEmail, 
  onBack 
}: FriendHealthReportProps) {
  const [selectedMetricType, setSelectedMetricType] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  const { metrics, loading, error, debugInfo, refetch } = useFriendHealthMetrics(friendId);

  // Filter and sort metrics
  const filteredMetrics = metrics
    .filter(metric => selectedMetricType === 'all' || metric.metric_type === selectedMetricType)
    .sort((a, b) => {
      const dateA = new Date(a.recorded_at).getTime();
      const dateB = new Date(b.recorded_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  // Group metrics by date
  const groupedMetrics = filteredMetrics.reduce((groups, metric) => {
    const date = new Date(metric.recorded_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(metric);
    return groups;
  }, {} as Record<string, HealthMetric[]>);

  // Get metric type counts for filter dropdown
  const metricTypeCounts = metrics.reduce((counts, metric) => {
    counts[metric.metric_type] = (counts[metric.metric_type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Get latest reading for each metric type
  const latestReadings = Object.keys(metricLabels).map(type => {
    const latestMetric = metrics.find(m => m.metric_type === type);
    return {
      type,
      metric: latestMetric,
      label: getMetricLabel(type),
      icon: getMetricIcon(type),
      color: getMetricColor(type)
    };
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading health report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Health Report Error</h1>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900 mb-2">Unable to Load Health Report</h3>
                <p className="text-red-700 mb-4">{error}</p>
                
                {debugInfo && (
                  <div className="bg-red-100 rounded p-3 mb-4">
                    <p className="text-sm text-red-800 font-medium mb-2">Debug Information:</p>
                    <ul className="text-xs text-red-700 space-y-1">
                      <li>Friendship exists: {debugInfo.friendship_exists ? 'Yes' : 'No'}</li>
                      <li>Friendship status: {debugInfo.friendship_status}</li>
                      <li>Can access metrics: {debugInfo.can_access_metrics ? 'Yes' : 'No'}</li>
                    </ul>
                  </div>
                )}
                
                <div className="flex space-x-3">
                  <button
                    onClick={refetch}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={onBack}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Health Report</h1>
          <div className="flex items-center space-x-2 text-gray-600">
            <User className="h-4 w-4" />
            <span>{friendName}</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm">{friendEmail}</span>
          </div>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Health Data</h3>
          <p className="text-gray-600">Your friend hasn't recorded any health metrics yet.</p>
        </div>
      ) : (
        <>
          {/* Latest Readings Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Readings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {latestReadings.map(({ type, metric, label, icon: Icon, color }) => (
                <div key={type} className="text-center">
                  <div className={`p-3 rounded-full w-fit mx-auto mb-2 ${
                    color === 'red' ? 'bg-red-100' :
                    color === 'blue' ? 'bg-blue-100' :
                    color === 'orange' ? 'bg-orange-100' :
                    color === 'green' ? 'bg-green-100' :
                    color === 'purple' ? 'bg-purple-100' :
                    'bg-gray-100'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      color === 'red' ? 'text-red-600' :
                      color === 'blue' ? 'text-blue-600' :
                      color === 'orange' ? 'text-orange-600' :
                      color === 'green' ? 'text-green-600' :
                      color === 'purple' ? 'text-purple-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  {metric ? (
                    <>
                      <p className="text-lg font-bold text-gray-900">
                        {metric.value} {metric.unit}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(metric.recorded_at).toLocaleDateString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No data</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <select
                    value={selectedMetricType}
                    onChange={(e) => setSelectedMetricType(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Metrics ({metrics.length})</option>
                    {Object.entries(metricTypeCounts).map(([type, count]) => (
                      <option key={type} value={type}>
                        {getMetricLabel(type)} ({count})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                <span>{filteredMetrics.length} readings</span>
              </div>
            </div>
          </div>

          {/* Readings Timeline */}
          <div className="space-y-6">
            <AnimatePresence>
              {Object.entries(groupedMetrics).map(([date, dayMetrics]) => (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <h3 className="font-medium text-gray-900">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {dayMetrics.length} reading{dayMetrics.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {dayMetrics.map((metric) => {
                      const Icon = getMetricIcon(metric.metric_type);
                      const color = getMetricColor(metric.metric_type);
                      const label = getMetricLabel(metric.metric_type);

                      return (
                        <div key={metric.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            color === 'red' ? 'bg-red-100' :
                            color === 'blue' ? 'bg-blue-100' :
                            color === 'orange' ? 'bg-orange-100' :
                            color === 'green' ? 'bg-green-100' :
                            color === 'purple' ? 'bg-purple-100' :
                            'bg-gray-100'
                          }`}>
                            <Icon className={`h-5 w-5 ${
                              color === 'red' ? 'text-red-600' :
                              color === 'blue' ? 'text-blue-600' :
                              color === 'orange' ? 'text-orange-600' :
                              color === 'green' ? 'text-green-600' :
                              color === 'purple' ? 'text-purple-600' :
                              'text-gray-600'
                            }`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">{label}</h4>
                              <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {new Date(metric.recorded_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mt-1">
                              <span className="text-lg font-semibold text-gray-900">
                                {metric.value} {metric.unit}
                              </span>
                            </div>
                            
                            {metric.notes && (
                              <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                                <span className="font-medium">Notes:</span> {metric.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredMetrics.length === 0 && (
              <div className="text-center py-8">
                <Filter className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No readings found for the selected filter.</p>
                <button
                  onClick={() => setSelectedMetricType('all')}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Show all readings
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}