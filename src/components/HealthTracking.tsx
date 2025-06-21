import React, { useState } from 'react';
import { 
  Plus, 
  Heart, 
  Activity, 
  Thermometer, 
  Scale, 
  Droplet,
  Calendar,
  TrendingUp,
  Edit3,
  Loader2,
  Trash2
} from 'lucide-react';
import { useHealthMetrics } from '../hooks/useHealthMetrics';

const healthCategories = [
  { id: 'blood_pressure', name: 'Blood Pressure', icon: Heart, unit: 'mmHg', color: 'red', placeholder: '120/80' },
  { id: 'blood_glucose', name: 'Blood Glucose', icon: Droplet, unit: 'mg/dL', color: 'pink', placeholder: '100' },
  { id: 'heart_rate', name: 'Heart Rate', icon: Activity, unit: 'bpm', color: 'blue', placeholder: '72' },
  { id: 'temperature', name: 'Temperature', icon: Thermometer, unit: '°F', color: 'orange', placeholder: '98.6' },
  { id: 'weight', name: 'Weight', icon: Scale, unit: 'lbs', color: 'green', placeholder: '150' },
];

interface MetricFormData {
  value: string;
  notes: string;
}

interface MultiMetricFormData {
  blood_pressure: MetricFormData;
  blood_glucose: MetricFormData;
  heart_rate: MetricFormData;
  temperature: MetricFormData;
  weight: MetricFormData;
  date: string;
  time: string;
}

export default function HealthTracking() {
  const [selectedCategory, setSelectedCategory] = useState('blood_pressure');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<MultiMetricFormData>({
    blood_pressure: { value: '', notes: '' },
    blood_glucose: { value: '', notes: '' },
    heart_rate: { value: '', notes: '' },
    temperature: { value: '', notes: '' },
    weight: { value: '', notes: '' },
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].slice(0, 5)
  });

  const { 
    metrics: allMetrics, 
    loading, 
    addMetric, 
    deleteMetric 
  } = useHealthMetrics();

  const selectedCategoryData = healthCategories.find(cat => cat.id === selectedCategory);
  const categoryRecords = allMetrics.filter(record => record.metric_type === selectedCategory);

  const handleMetricChange = (metricType: string, field: 'value' | 'notes', value: string) => {
    setFormData(prev => ({
      ...prev,
      [metricType]: {
        ...prev[metricType as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleDateTimeChange = (field: 'date' | 'time', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      blood_pressure: { value: '', notes: '' },
      blood_glucose: { value: '', notes: '' },
      heart_rate: { value: '', notes: '' },
      temperature: { value: '', notes: '' },
      weight: { value: '', notes: '' },
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].slice(0, 5)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const recordedAt = new Date(`${formData.date}T${formData.time}`);
    const metricsToAdd = [];

    // Collect all metrics that have values
    for (const category of healthCategories) {
      const metricData = formData[category.id as keyof typeof formData];
      if (typeof metricData === 'object' && metricData.value.trim()) {
        metricsToAdd.push({
          metric_type: category.id as any,
          value: metricData.value.trim(),
          unit: category.unit,
          notes: metricData.notes.trim() || undefined,
          recorded_at: recordedAt.toISOString()
        });
      }
    }

    if (metricsToAdd.length === 0) {
      alert('Please enter at least one health metric value.');
      setSubmitting(false);
      return;
    }

    try {
      // Add all metrics
      const results = await Promise.all(
        metricsToAdd.map(metric => addMetric(metric))
      );

      // Check if any failed
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        alert(`Error adding some metrics: ${errors.map(e => e.error).join(', ')}`);
      } else {
        setShowAddForm(false);
        resetForm();
      }
    } catch (error) {
      alert(`Error adding metrics: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    if (confirm('Are you sure you want to delete this reading?')) {
      const { error } = await deleteMetric(metricId);
      if (error) {
        alert(`Error deleting metric: ${error}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading health metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Health Tracking</h1>
          <p className="text-gray-600">Monitor and track your health metrics</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 flex-shrink-0 ml-4"
        >
          <Plus className="h-5 w-5" />
          <span>Add Reading</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {healthCategories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{category.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Latest Reading */}
          {categoryRecords.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Latest Reading</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {categoryRecords[0].value} {categoryRecords[0].unit}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(categoryRecords[0].recorded_at).toLocaleDateString()} at{' '}
                    {new Date(categoryRecords[0].recorded_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <div className={`p-3 rounded-full bg-${selectedCategoryData?.color}-100`}>
                  {selectedCategoryData && (
                    <selectedCategoryData.icon className={`h-8 w-8 text-${selectedCategoryData.color}-600`} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Records List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Readings</h3>
              {categoryRecords.length > 0 && (
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>View Trends</span>
                </button>
              )}
            </div>

            {categoryRecords.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  {selectedCategoryData && <selectedCategoryData.icon className="h-12 w-12 mx-auto" />}
                </div>
                <p className="text-gray-500">No readings recorded yet</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add your first reading
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium text-gray-900">
                          {record.value} {record.unit}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(record.recorded_at).toLocaleDateString()} at{' '}
                          {new Date(record.recorded_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleDeleteMetric(record.id)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        title="Delete reading"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Metric Add Reading Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-medium text-gray-900">Add Health Readings</h3>
              <p className="text-sm text-gray-600 mt-1">Enter values for any or all health metrics</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleDateTimeChange('date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleDateTimeChange('time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Health Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {healthCategories.map((category) => {
                  const Icon = category.icon;
                  const metricData = formData[category.id as keyof typeof formData] as MetricFormData;
                  
                  return (
                    <div key={category.id} className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                          <Icon className={`h-5 w-5 text-${category.color}-600`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <p className="text-sm text-gray-500">Unit: {category.unit}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={metricData.value}
                          onChange={(e) => handleMetricChange(category.id, 'value', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`${category.placeholder} ${category.unit}`}
                        />
                        
                        <textarea
                          value={metricData.notes}
                          onChange={(e) => handleMetricChange(category.id, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                          placeholder="Notes (optional)"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form Actions */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving Readings...
                    </div>
                  ) : (
                    'Save Readings'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}