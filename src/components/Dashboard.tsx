import React from 'react';
import { 
  Heart, 
  Activity, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Droplet,
  Thermometer,
  Scale,
  Loader2,
  Plus
} from 'lucide-react';
import { useHealthMetrics } from '../hooks/useHealthMetrics';
import { useAuth } from '../hooks/useAuth';

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

// Helper function to get icon with fallback
const getMetricIcon = (metricType: string) => {
  return metricIcons[metricType as keyof typeof metricIcons] || AlertCircle;
};

// Helper function to get color with fallback
const getMetricColor = (metricType: string) => {
  return metricColors[metricType as keyof typeof metricColors] || 'gray';
};

export default function Dashboard() {
  const { user } = useAuth();
  const { metrics: allMetrics, loading: metricsLoading } = useHealthMetrics();

  // Get latest metric for each type
  const getLatestMetric = (type: string) => {
    return allMetrics.find(metric => metric.metric_type === type);
  };

  const latestMetrics = [
    'blood_pressure',
    'blood_glucose',
    'heart_rate', 
    'temperature',
    'weight',
  ].map(type => {
    const metric = getLatestMetric(type);
    const Icon = getMetricIcon(type);
    const color = getMetricColor(type);
    
    return {
      id: type,
      title: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: metric?.value || '--',
      trend: 'stable',
      icon: Icon,
      color,
      lastRecorded: metric?.recorded_at
    };
  });

  // Get recent activities from appointments and metrics
  const recentActivities = [
    ...allMetrics.slice(0, 2).map(metric => ({
      id: `metric-${metric.id}`,
      type: 'health_metric',
      title: `${metric.metric_type.replace('_', ' ')} recorded: ${metric.value} ${metric.unit}`,
      time: new Date(metric.recorded_at).toLocaleDateString(),
      status: 'recorded'
    }))
  ].sort((a, b) => {
    const timeA = new Date(allMetrics.find(m => `metric-${m.id}` === a.id)?.recorded_at || 0);
    const timeB = new Date(allMetrics.find(m => `metric-${m.id}` === b.id)?.recorded_at || 0);
    return timeB.getTime() - timeA.getTime();
  }).slice(0, 4);

  const firstName = user?.email?.split('@')[0] || 'User';

  if (metricsLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {firstName}!</h1>
        <p className="text-blue-100">Here's your health overview for today</p>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {latestMetrics.map((metric) => {
          const Icon = metric.icon;
          const color = metric.color;
          return (
            <div key={metric.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${
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
                <div className="flex items-center space-x-1">
                  {metric.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {metric.trend === 'stable' && <div className="w-4 h-0.5 bg-gray-400 rounded" />}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                {metric.lastRecorded && (
                  <p className="text-xs text-gray-400">
                    Last: {new Date(metric.lastRecorded).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
        </div>
        <div className="p-6">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No recent activities</p>
              <p className="text-sm text-gray-400">Start by recording health metrics or booking appointments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-full ${
                    activity.status === 'completed' || activity.status === 'recorded'
                      ? 'bg-green-100'
                      : activity.status === 'upcoming'
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}>
                    {activity.type === 'health_metric' && <Activity className="h-5 w-5 text-green-600" />}
                    {activity.type === 'appointment' && <Calendar className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'completed' || activity.status === 'recorded'
                      ? 'bg-green-100 text-green-800'
                      : activity.status === 'upcoming'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => window.location.hash = '#voice-chat'}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Start Voice Chat</h3>
              <p className="text-sm text-gray-500">Ask health questions</p>
            </div>
          </div>
        </button>
        
        <button 
          onClick={() => window.location.hash = '#health-tracking'}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left col-span-1 md:col-span-2"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Plus className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Add Health Data</h3>
              <p className="text-sm text-gray-500">Record metrics</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}