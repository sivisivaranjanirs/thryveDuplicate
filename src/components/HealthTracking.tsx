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
  Trash2,
  Mic,
  MicOff
} from 'lucide-react';
import { useHealthMetrics } from '../hooks/useHealthMetrics';

const healthCategories = [
  { id: 'blood_pressure', name: 'Blood Pressure', shortName: 'BP', icon: Heart, unit: 'mmHg', color: 'red', placeholder: '120/80' },
  { id: 'blood_glucose', name: 'Blood Glucose', shortName: 'BG', icon: Droplet, unit: 'mg/dL', color: 'pink', placeholder: '100' },
  { id: 'heart_rate', name: 'Heart Rate', shortName: 'HR', icon: Activity, unit: 'bpm', color: 'blue', placeholder: '72' },
  { id: 'temperature', name: 'Temperature', shortName: 'Temp', icon: Thermometer, unit: '°F', color: 'orange', placeholder: '98.6' },
  { id: 'weight', name: 'Weight', shortName: 'Weight', icon: Scale, unit: 'lbs', color: 'green', placeholder: '150' },
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
  const [showVoiceRecording, setShowVoiceRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
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

  // Voice recording functions
  const handleStartVoiceRecording = async () => {
    try {
      setVoiceError(null);
      console.log('Starting voice recording for health metrics...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        handleVoiceRecordingComplete(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setVoiceError('Unable to access microphone. Please check your permissions.');
    }
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessingVoice(true);
    setVoiceError(null);
    
    try {
      // Convert webm to wav
      const wavBlob = await convertWebmToWav(audioBlob);
      
      // Send to STT service
      const transcription = await transcribeAudio(wavBlob);
      
      if (transcription) {
        // Parse the transcription to extract health metrics
        const parsedMetrics = parseHealthMetrics(transcription);
        
        if (parsedMetrics.length > 0) {
          // Apply parsed metrics to form
          applyParsedMetricsToForm(parsedMetrics);
          setShowVoiceRecording(false);
          setShowAddForm(true);
        } else {
          setVoiceError('Could not understand health metrics from your recording. Please try again or use manual entry.');
        }
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      setVoiceError(error instanceof Error ? error.message : 'Failed to process voice recording');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const convertWebmToWav = async (webmBlob: Blob): Promise<Blob> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const audioData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Simple WAV conversion
    const length = audioData.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    await audioContext.close();
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eleven-labs-stt`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.text) {
      throw new Error(data.error || 'Failed to transcribe audio');
    }

    return data.text;
  };

  const parseHealthMetrics = (text: string): Array<{type: string, value: string, notes?: string}> => {
    const metrics: Array<{type: string, value: string, notes?: string}> = [];
    const lowerText = text.toLowerCase();
    
    // Blood pressure patterns
    const bpPatterns = [
      /blood pressure.*?(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/i,
      /bp.*?(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/i,
      /(\d{2,3})\s*(?:over|\/)\s*(\d{2,3}).*?(?:blood pressure|bp)/i
    ];
    
    for (const pattern of bpPatterns) {
      const match = text.match(pattern);
      if (match) {
        metrics.push({
          type: 'blood_pressure',
          value: `${match[1]}/${match[2]}`,
          notes: 'Added via voice'
        });
        break;
      }
    }
    
    // Heart rate patterns
    const hrPatterns = [
      /heart rate.*?(\d{2,3})/i,
      /pulse.*?(\d{2,3})/i,
      /(\d{2,3}).*?(?:bpm|beats per minute|heart rate|pulse)/i
    ];
    
    for (const pattern of hrPatterns) {
      const match = text.match(pattern);
      if (match && !metrics.some(m => m.type === 'heart_rate')) {
        const value = parseInt(match[1]);
        if (value >= 40 && value <= 200) { // Reasonable heart rate range
          metrics.push({
            type: 'heart_rate',
            value: match[1],
            notes: 'Added via voice'
          });
          break;
        }
      }
    }
    
    // Weight patterns
    const weightPatterns = [
      /weight.*?(\d{2,3}(?:\.\d)?)\s*(?:pounds|lbs|lb)/i,
      /(\d{2,3}(?:\.\d)?)\s*(?:pounds|lbs|lb)/i,
      /weigh.*?(\d{2,3}(?:\.\d)?)/i
    ];
    
    for (const pattern of weightPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (value >= 50 && value <= 500) { // Reasonable weight range
          metrics.push({
            type: 'weight',
            value: match[1],
            notes: 'Added via voice'
          });
          break;
        }
      }
    }
    
    // Temperature patterns
    const tempPatterns = [
      /temperature.*?(\d{2,3}(?:\.\d)?)/i,
      /temp.*?(\d{2,3}(?:\.\d)?)/i,
      /(\d{2,3}(?:\.\d)?)\s*(?:degrees|fahrenheit|celsius)/i
    ];
    
    for (const pattern of tempPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (value >= 90 && value <= 110) { // Reasonable temperature range in Fahrenheit
          metrics.push({
            type: 'temperature',
            value: match[1],
            notes: 'Added via voice'
          });
          break;
        }
      }
    }
    
    // Blood glucose patterns
    const bgPatterns = [
      /blood glucose.*?(\d{2,3})/i,
      /blood sugar.*?(\d{2,3})/i,
      /glucose.*?(\d{2,3})/i,
      /(\d{2,3}).*?(?:mg\/dl|milligrams|glucose|blood sugar)/i
    ];
    
    for (const pattern of bgPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (value >= 50 && value <= 400) { // Reasonable glucose range
          metrics.push({
            type: 'blood_glucose',
            value: match[1],
            notes: 'Added via voice'
          });
          break;
        }
      }
    }
    
    return metrics;
  };

  const applyParsedMetricsToForm = (parsedMetrics: Array<{type: string, value: string, notes?: string}>) => {
    setFormData(prev => {
      const newFormData = { ...prev };
      
      parsedMetrics.forEach(metric => {
        if (metric.type in newFormData) {
          (newFormData as any)[metric.type] = {
            value: metric.value,
            notes: metric.notes || ''
          };
        }
      });
      
      return newFormData;
    });
  };

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
      <div className="p-4 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading health metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-full px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="w-full">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Health Tracking</h1>
              <p className="text-sm sm:text-base text-gray-600">Monitor and track your health metrics</p>
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
              <button
                onClick={() => setShowVoiceRecording(true)}
                className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 font-medium"
              >
                <Mic className="h-5 w-5 flex-shrink-0" />
                <span>Voice Entry</span>
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
              >
                <Plus className="h-5 w-5 flex-shrink-0" />
                <span>Add Reading</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs - Mobile Optimized */}
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="w-full overflow-x-auto scrollbar-hide">
              <nav className="flex px-4 sm:px-6 py-1" aria-label="Tabs">
                {healthCategories.map((category, index) => {
                  const Icon = category.icon;
                  const isActive = selectedCategory === category.id;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex-shrink-0 py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                        isActive
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } ${index < healthCategories.length - 1 ? 'mr-2 sm:mr-6' : ''}`}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden sm:inline">{category.name}</span>
                        <span className="sm:hidden">{category.shortName}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 overflow-hidden">
            {/* Latest Reading */}
            {categoryRecords.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm text-gray-600">Latest Reading</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 break-words overflow-hidden">
                      {categoryRecords[0].value} {categoryRecords[0].unit}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 break-words">
                      {new Date(categoryRecords[0].recorded_at).toLocaleDateString()} at{' '}
                      {new Date(categoryRecords[0].recorded_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-full bg-${selectedCategoryData?.color}-100 flex-shrink-0`}>
                    {selectedCategoryData && (
                      <selectedCategoryData.icon className={`h-6 w-6 sm:h-8 sm:w-8 text-${selectedCategoryData.color}-600`} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Records List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Recent Readings</h3>
                {categoryRecords.length > 0 && (
                  <button className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium flex items-center space-x-1 flex-shrink-0">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">View Trends</span>
                    <span className="sm:hidden">Trends</span>
                  </button>
                )}
              </div>

              {categoryRecords.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-gray-400 mb-2">
                    {selectedCategoryData && <selectedCategoryData.icon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto" />}
                  </div>
                  <p className="text-gray-500 text-sm sm:text-base">No readings recorded yet</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                    <button
                      onClick={() => setShowVoiceRecording(true)}
                      className="text-green-600 hover:text-green-700 font-medium text-sm sm:text-base"
                    >
                      Add via voice
                    </button>
                    <span className="text-gray-400 hidden sm:inline">or</span>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base"
                    >
                      Add manually
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 overflow-hidden">
                  {categoryRecords.map((record) => (
                    <div key={record.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex flex-col space-y-1">
                          <div className="font-medium text-gray-900 text-sm sm:text-base break-words overflow-hidden">
                            {record.value} {record.unit}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 break-words">
                            {new Date(record.recorded_at).toLocaleDateString()} at{' '}
                            {new Date(record.recorded_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                        {record.notes && (
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words overflow-hidden">{record.notes}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
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
      </div>

      {/* Voice Recording Modal */}
      {showVoiceRecording && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Voice Health Entry</h3>
              
              {voiceError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{voiceError}</p>
                </div>
              )}
              
              <div className="text-center">
                {isProcessingVoice ? (
                  <div className="py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Processing your voice recording...</p>
                  </div>
                ) : (
                  <div className="py-8">
                    <div className="mb-6">
                      <button
                        onClick={isRecording ? handleStopVoiceRecording : handleStartVoiceRecording}
                        className={`p-6 rounded-full transition-all duration-200 ${
                          isRecording
                            ? 'bg-red-500 text-white shadow-lg scale-110 animate-pulse'
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                        }`}
                      >
                        {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">
                        {isRecording ? 'Recording...' : 'Tap to start recording'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Say your health readings like:<br />
                        "My blood pressure is 120 over 80"<br />
                        "Heart rate 72 beats per minute"<br />
                        "Weight 150 pounds"
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowVoiceRecording(false);
                    setVoiceError(null);
                    if (isRecording) {
                      handleStopVoiceRecording();
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isProcessingVoice}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Metric Add Reading Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-lg z-10">
              <h3 className="text-lg font-medium text-gray-900">Add Health Readings</h3>
              <p className="text-sm text-gray-600 mt-1">Enter values for any or all health metrics</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
              {/* Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {healthCategories.map((category) => {
                  const Icon = category.icon;
                  const metricData = formData[category.id as keyof typeof formData] as MetricFormData;
                  
                  return (
                    <div key={category.id} className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-${category.color}-100 flex-shrink-0`}>
                          <Icon className={`h-5 w-5 text-${category.color}-600`} />
                        </div>
                        <div className="min-w-0 flex-1">
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
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-4 z-10">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="w-full sm:flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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