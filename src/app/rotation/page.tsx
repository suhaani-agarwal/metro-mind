"use client";
import React, { useState, useEffect } from 'react';

interface StationEvent {
  station: string;
  scheduled_arrival: string;
  expected_arrival: string;
  delay_minutes: number;
  delay_reasons: string[];
  delay_probability?: number | null;
  direction: string;
  rotation: number;
  sequence: number;
  next_station_duration: number;
  cumulative_time: number;
  significant_delay: boolean;
}

interface DelayAnalysis {
  base_trip_time: number;
  total_trip_time: number;
  total_delay: number;
  delay_breakdown: {
    job_cards: number;
    maintenance: number;
    weather: number;
  };
  delay_reasons: string[];
}

interface TrainSchedule {
  train_id: string;
  departure_time: string;
  departure_slot: number;
  readiness: number;
  station_events: StationEvent[];
  delay_analysis: DelayAnalysis;
  train_config: {
    job_cards_count: number;
    high_critical_jobs: number;
    maintenance_status: string;
    total_mileage: number;
  };
  total_rotations: number;
  first_departure: string;
  last_arrival: string;
}

interface RotationData {
  service_date: string;
  weather_conditions: any;
  total_trains: number;
  base_trip_time: number;
  train_schedules: TrainSchedule[];
  stations: string[];
  station_timings: any[];
  summary: {
    total_events: number;
    delayed_events: number;
    significant_delays: number;
    max_delay: number;
    avg_delay: number;
  };
  service_hours: {
    start: string;
    end: string;
  };
}

const RotationPage: React.FC = () => {
  const [rotationData, setRotationData] = useState<RotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    station: 'All Stations',
    train: 'All Trains',
    direction: 'All Directions',
    rotation: 'All Rotations',
    showDelaysOnly: false,
    timeRange: 'All Day'
  });
  const [currentView, setCurrentView] = useState<'timeline' | 'table' | 'stations' | 'overview'>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<[string, string]>(['06:00', '22:00']);
  const [expandedTrains, setExpandedTrains] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState<string>('');
  const [usePredictions, setUsePredictions] = useState<boolean>(false);

  useEffect(() => {
    fetchRotationData();
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }, 30000);
    setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    return () => clearInterval(interval);
  }, [usePredictions]);

  const fetchRotationData = async () => {
    try {
      setLoading(true);
      const endpoint = usePredictions ? 'http://localhost:5005/rotation/predictions' : 'http://localhost:5005/rotation/schedule';
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch rotation data');
      const data: RotationData = await response.json();
      setRotationData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleTrainExpansion = (trainId: string) => {
    const newExpanded = new Set(expandedTrains);
    if (newExpanded.has(trainId)) {
      newExpanded.delete(trainId);
    } else {
      newExpanded.add(trainId);
    }
    setExpandedTrains(newExpanded);
  };

  const filteredEvents = rotationData ? rotationData.train_schedules.flatMap(train => 
    train.station_events.filter(event => {
      const eventTime = event.expected_arrival;
      const inTimeRange = eventTime >= selectedTimeRange[0] && eventTime <= selectedTimeRange[1];
      
      return (
        (filters.station === 'All Stations' || event.station === filters.station) &&
        (filters.train === 'All Trains' || train.train_id === filters.train) &&
        (filters.direction === 'All Directions' || event.direction === filters.direction) &&
        (filters.rotation === 'All Rotations' || event.rotation.toString() === filters.rotation) &&
        (!filters.showDelaysOnly || event.delay_minutes > 1.0) &&
        inTimeRange
      );
    })
  ).sort((a, b) => a.expected_arrival.localeCompare(b.expected_arrival)) : [];

  const timeRanges = [
    { label: 'Morning Peak (6-10 AM)', value: ['06:00', '10:00'] as [string, string] },
    { label: 'Midday (10-2 PM)', value: ['10:00', '14:00'] as [string, string] },
    { label: 'Evening Peak (2-6 PM)', value: ['14:00', '18:00'] as [string, string] },
    { label: 'Night (6-10 PM)', value: ['18:00', '22:00'] as [string, string] },
    { label: 'All Day', value: ['06:00', '22:00'] as [string, string] }
  ];

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'rainy': return '🌧️';
      case 'sunny': return '☀️';
      case 'partly_cloudy': return '⛅';
      case 'foggy': return '🌫️';
      case 'stormy': return '⛈️';
      case 'clear': return '✨';
      default: return '🌤️';
    }
  };

  const getDelayColor = (delay: number) => {
    if (delay === 0) return 'text-emerald-400';
    if (delay <= 2) return 'text-amber-400';
    if (delay <= 5) return 'text-orange-400';
    return 'text-rose-400';
  };

  const getDelayBgColor = (delay: number) => {
    if (delay === 0) return 'bg-emerald-500/20';
    if (delay <= 2) return 'bg-amber-500/20';
    if (delay <= 5) return 'bg-orange-500/20';
    return 'bg-rose-500/20';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return 'text-emerald-400';
      case 'Attention Needed': return 'text-amber-400';
      case 'Critical': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  // Helper function to safely get delay analysis with defaults
  const getDelayAnalysis = (train: TrainSchedule): DelayAnalysis => {
    return train.delay_analysis || {
      base_trip_time: 0,
      total_trip_time: 0,
      total_delay: 0,
      delay_breakdown: {
        job_cards: 0,
        maintenance: 0,
        weather: 0
      },
      delay_reasons: []
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-100">Loading Rotation Schedule</h2>
          <p className="text-gray-400 mt-2">Calculating station arrivals and delays...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Error Loading Data</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchRotationData}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!rotationData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-slate-700/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-cyan-500/20 rounded-2xl">
                  <span className="text-3xl">🚇</span>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-100 via-cyan-200 to-blue-200 bg-clip-text text-transparent">
                    Train Rotation Dashboard
                  </h1>
                  <p className="text-slate-300 mt-2 text-lg">
                    Real-time station arrivals with AI-powered delay forecasting
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-full">
                  <span className="text-cyan-400">📅</span>
                  <span className="text-slate-200">{rotationData.service_date}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-full">
                  <span>{getWeatherIcon(rotationData.weather_conditions.overall_condition)}</span>
                  <span className="text-slate-200 capitalize">{rotationData.weather_conditions.overall_condition.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-full">
                  <span className="text-amber-400">🕒</span>
                  <span className="text-slate-200">{currentTime}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-full">
                  <span className="text-emerald-400">⏱️</span>
                  <span className="text-slate-200">{rotationData.service_hours.start} - {rotationData.service_hours.end}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-full">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input type="checkbox" checked={usePredictions} onChange={(e) => setUsePredictions(e.target.checked)} />
                    Use ML predictions
                  </label>
                </div>
              </div>
            </div>
            
            <div className="text-center lg:text-right">
              <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {rotationData.total_trains}
              </div>
              <div className="text-slate-400 text-lg">Active Trains</div>
              <div className="text-sm text-slate-500 mt-1">{rotationData.summary.total_events} scheduled events</div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-cyan-400">{rotationData.summary.delayed_events}</div>
                <div className="text-slate-400 text-sm">Delayed Events</div>
              </div>
              <div className="text-2xl text-amber-400">⚠️</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-amber-400">{rotationData.summary.avg_delay}m</div>
                <div className="text-slate-400 text-sm">Avg Delay</div>
              </div>
              <div className="text-2xl text-orange-400">⏰</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl p-6 border border-rose-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-rose-400">{rotationData.summary.significant_delays}</div>
                <div className="text-slate-400 text-sm">Significant Delays</div>
              </div>
              <div className="text-2xl text-pink-400">🔴</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-emerald-400">{rotationData.summary.max_delay}m</div>
                <div className="text-slate-400 text-sm">Max Delay</div>
              </div>
              <div className="text-2xl text-green-400">📈</div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            
            {/* View Selector */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-3">Dashboard View</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'overview' as const, label: 'Overview', icon: '🌐', color: 'from-cyan-500 to-blue-500' },
                  { key: 'timeline' as const, label: 'Timeline', icon: '📅', color: 'from-emerald-500 to-green-500' },
                  { key: 'stations' as const, label: 'Stations', icon: '🚉', color: 'from-amber-500 to-orange-500' },
                  { key: 'table' as const, label: 'Table', icon: '📊', color: 'from-purple-500 to-pink-500' }
                ].map(view => (
                  <button
                    key={view.key}
                    onClick={() => setCurrentView(view.key)}
                    className={`flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${
                      currentView === view.key 
                        ? `bg-gradient-to-br ${view.color} text-white shadow-lg scale-105` 
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-300'
                    }`}
                  >
                    <span className="text-lg mb-1">{view.icon}</span>
                    <span className="text-xs font-medium">{view.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Time Range</label>
              <select
                value={filters.timeRange}
                onChange={(e) => {
                  const range = timeRanges.find(t => t.label === e.target.value)?.value || ['06:00', '22:00'];
                  setSelectedTimeRange(range);
                  setFilters(prev => ({ ...prev, timeRange: e.target.value }));
                }}
                className="w-full bg-slate-700/50 border border-slate-600 text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {timeRanges.map(range => (
                  <option key={range.label} value={range.label}>{range.label}</option>
                ))}
              </select>
            </div>

            {/* Station Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Station</label>
              <select
                value={filters.station}
                onChange={(e) => setFilters(prev => ({ ...prev, station: e.target.value }))}
                className="w-full bg-slate-700/50 border border-slate-600 text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="All Stations">All Stations</option>
                {rotationData.stations.map(station => (
                  <option key={station} value={station}>{station}</option>
                ))}
              </select>
            </div>

            {/* Train Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Train</label>
              <select
                value={filters.train}
                onChange={(e) => setFilters(prev => ({ ...prev, train: e.target.value }))}
                className="w-full bg-slate-700/50 border border-slate-600 text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="All Trains">All Trains</option>
                {rotationData.train_schedules.map(train => (
                  <option key={train.train_id} value={train.train_id}>
                    {train.train_id} ({train.total_rotations} rotations)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col justify-end space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showDelaysOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, showDelaysOnly: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-300">Show delays only</span>
              </label>
              <button
                onClick={() => setExpandedTrains(new Set())}
                className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                Collapse all
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="min-h-[600px]">
          {currentView === 'overview' && (
            <OverviewView 
              rotationData={rotationData} 
              expandedTrains={expandedTrains}
              onToggleTrain={toggleTrainExpansion}
              getDelayColor={getDelayColor}
              getDelayBgColor={getDelayBgColor}
              getDelayAnalysis={getDelayAnalysis}
            />
          )}
          
          {currentView === 'timeline' && (
            <TimelineView 
              events={filteredEvents} 
              trains={rotationData.train_schedules}
              expandedTrains={expandedTrains}
              onToggleTrain={toggleTrainExpansion}
              getDelayColor={getDelayColor}
              getDelayBgColor={getDelayBgColor}
              getDelayAnalysis={getDelayAnalysis}
            />
          )}
          
          {currentView === 'stations' && (
            <StationsView rotationData={rotationData} />
          )}
          
          {currentView === 'table' && (
            <TableView events={filteredEvents} />
          )}
        </div>

      </div>
    </div>
  );
};

// Overview View Component
const OverviewView: React.FC<{
  rotationData: RotationData;
  expandedTrains: Set<string>;
  onToggleTrain: (trainId: string) => void;
  getDelayColor: (delay: number) => string;
  getDelayBgColor: (delay: number) => string;
  getDelayAnalysis: (train: TrainSchedule) => DelayAnalysis;
}> = ({ rotationData, expandedTrains, onToggleTrain, getDelayColor, getDelayBgColor, getDelayAnalysis }) => {
  return (
    <div className="space-y-6">
      {/* Train Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {rotationData.train_schedules.map((train) => {
          const delayAnalysis = getDelayAnalysis(train);
          return (
            <div key={train.train_id} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300">
              <div 
                className="cursor-pointer"
                onClick={() => onToggleTrain(train.train_id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <span className="text-xl">🚆</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-200">{train.train_id}</h3>
                      <p className="text-slate-400 text-sm">
                        {train.total_rotations} rotations • {train.train_config?.job_cards_count || 0} job cards
                      </p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${getDelayBgColor(delayAnalysis.total_delay)}`}>
                    <span className={`text-sm font-bold ${getDelayColor(delayAnalysis.total_delay)}`}>
                      +{delayAnalysis.total_delay.toFixed(1)}m
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-cyan-400 font-bold">{train.first_departure}</div>
                    <div className="text-slate-500 text-xs">First Departure</div>
                  </div>
                  <div className="text-center">
                    <div className="text-emerald-400 font-bold">{train.last_arrival}</div>
                    <div className="text-slate-500 text-xs">Last Arrival</div>
                  </div>
                  <div className="text-center">
                    <div className="text-amber-400 font-bold">{train.train_config?.high_critical_jobs || 0}</div>
                    <div className="text-slate-500 text-xs">Critical Jobs</div>
                  </div>
                </div>
              </div>

              {expandedTrains.has(train.train_id) && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-slate-700/50 rounded-lg">
                      <div className="text-amber-400 font-bold">{delayAnalysis.delay_breakdown.job_cards.toFixed(1)}m</div>
                      <div className="text-slate-400">Job Cards</div>
                    </div>
                    <div className="text-center p-2 bg-slate-700/50 rounded-lg">
                      <div className="text-rose-400 font-bold">{delayAnalysis.delay_breakdown.maintenance.toFixed(1)}m</div>
                      <div className="text-slate-400">Maintenance</div>
                    </div>
                    <div className="text-center p-2 bg-slate-700/50 rounded-lg">
                      <div className="text-blue-400 font-bold">{delayAnalysis.delay_breakdown.weather.toFixed(1)}m</div>
                      <div className="text-slate-400">Weather</div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-300">
                    Next 3 stations:
                    <div className="mt-2 space-y-1">
                      {train.station_events?.slice(0, 3).map((event, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{event.station}</span>
                          <span className={`text-xs ${getDelayColor(event.delay_minutes)}`}>
                            {event.expected_arrival} {event.delay_minutes > 0 && `(+${event.delay_minutes}m)`}
                          </span>
                        </div>
                      )) || <div className="text-slate-400">No upcoming events</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Timeline View Component
const TimelineView: React.FC<{
  events: StationEvent[];
  trains: TrainSchedule[];
  expandedTrains: Set<string>;
  onToggleTrain: (trainId: string) => void;
  getDelayColor: (delay: number) => string;
  getDelayBgColor: (delay: number) => string;
  getDelayAnalysis: (train: TrainSchedule) => DelayAnalysis;
}> = ({ events, trains, expandedTrains, onToggleTrain, getDelayColor, getDelayBgColor, getDelayAnalysis }) => {
  const eventsByTrain = events.reduce((acc, event) => {
    const train = trains.find(t => t.station_events.includes(event));
    if (!train) return acc;
    
    if (!acc[train.train_id]) {
      acc[train.train_id] = { train, events: [] };
    }
    acc[train.train_id].events.push(event);
    return acc;
  }, {} as Record<string, { train: TrainSchedule, events: StationEvent[] }>);

  return (
    <div className="space-y-4">
      {Object.entries(eventsByTrain).map(([trainId, { train, events }]) => {
        const delayAnalysis = getDelayAnalysis(train);
        return (
          <div key={trainId} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <div 
              className="flex items-center justify-between cursor-pointer mb-4"
              onClick={() => onToggleTrain(trainId)}
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-cyan-500/20 rounded-xl">
                  <span className="text-2xl">🚄</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-200">{trainId}</h3>
                  <p className="text-slate-400">
                    Rotation {events[0]?.rotation} • {train.total_rotations} total • {train.train_config?.high_critical_jobs || 0} critical jobs
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-2 rounded-lg ${getDelayBgColor(delayAnalysis.total_delay)}`}>
                  <span className={`font-bold ${getDelayColor(delayAnalysis.total_delay)}`}>
                    +{delayAnalysis.total_delay.toFixed(1)}m total delay
                  </span>
                </div>
                <span className="text-slate-400 text-2xl">
                  {expandedTrains.has(trainId) ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {expandedTrains.has(trainId) && (
              <div className="space-y-3">
                {events.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center space-x-4 flex-1">
                      <span className="font-mono text-cyan-300 text-lg w-16">{event.expected_arrival}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-slate-200 font-medium">{event.station}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          event.direction === 'forward' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'
                        }`}>
                          {event.direction === 'forward' ? '→ Pettah' : '← Aluva'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 flex-1 justify-center">
                      <div className="text-slate-400 text-sm">
                        <span className="text-amber-400">{event.next_station_duration}min</span> to next • 
                        <span className="text-cyan-400 ml-2">{event.cumulative_time}min</span> total
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 flex-1 justify-end">
                      {event.delay_minutes > 0 ? (
                        <>
                          <div className={`px-3 py-2 rounded-lg ${getDelayBgColor(event.delay_minutes)}`}>
                            <span className={`font-bold ${getDelayColor(event.delay_minutes)}`}>
                              +{event.delay_minutes}m
                            </span>
                          </div>
                          {event.delay_reasons.length > 0 && (
                            <div className="text-sm text-slate-400 max-w-xs">
                              {event.delay_reasons[0]}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-emerald-400 font-medium">On Time</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Stations View Component
const StationsView: React.FC<{ rotationData: RotationData }> = ({ rotationData }) => {
  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-2xl font-bold text-slate-200 mb-6 flex items-center gap-3">
        <span className="p-2 bg-cyan-500/20 rounded-lg">🚉</span>
        Station Timeline & Durations
      </h3>
      <div className="space-y-3">
        {rotationData.station_timings.map((station, index) => (
          <div key={station.station} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <span className="text-cyan-300 font-bold">{index + 1}</span>
              </div>
              <div>
                <div className="font-semibold text-slate-200">{station.station}</div>
                <div className="text-slate-400 text-sm">
                  {station.next_station_duration > 0 ? 
                    `Next station: ${station.next_station_duration} minutes` : 'Terminal station'
                  }
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-cyan-300 font-mono text-lg">+{station.cumulative_time}m</div>
              <div className="text-slate-500 text-sm">from Aluva</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Table View Component
const TableView: React.FC<{ events: StationEvent[] }> = ({ events }) => {
  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Scheduled</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Expected</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Train</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Station</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Direction</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Duration</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {events.map((event, index) => {
              const isDelayed = event.delay_minutes > 0;
              return (
                <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-slate-300">{event.scheduled_arrival}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-cyan-300">{event.expected_arrival}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-200">{findTrainIdForEvent(event)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-200">{event.station}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.direction === 'forward' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'
                    }`}>
                      {event.direction === 'forward' ? '→ Pettah' : '← Aluva'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-400">
                      <span className="text-amber-400">{event.next_station_duration}m</span> next
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isDelayed ? (
                      <div className="flex items-center gap-2 text-rose-300">
                        <span className="font-medium">+{event.delay_minutes}m</span>
                        {event.delay_reasons?.[0] && (
                          <span className="text-xs text-slate-400">{event.delay_reasons[0]}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-emerald-400 font-medium">On time</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper to map an event back to its train id from the current rotationData in closure
function findTrainIdForEvent(event: StationEvent): string {
  // We infer train id using a data attribute approach via DOM-less logic: sequence is unique within each train array order, but not globally.
  // Instead, we piggyback on the fact that filteredEvents is derived from rotationData, so we can search window-level copy if present.
  // Fallback: show 'Train' with sequence index if not matched.
  try {
    const any = (window as any).__rotationData as RotationData | undefined;
    if (any) {
      for (const t of any.train_schedules) {
        if (t.station_events && t.station_events.some(e => e.station === event.station && e.expected_arrival === event.expected_arrival && e.scheduled_arrival === event.scheduled_arrival && e.direction === event.direction && e.rotation === event.rotation)) {
          return t.train_id;
        }
      }
    }
  } catch {}
  return `Train`;
}

export default RotationPage;