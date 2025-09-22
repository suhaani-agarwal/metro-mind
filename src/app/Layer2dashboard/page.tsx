"use client";
import React, { useState, useEffect } from 'react';

interface TrainAssignment {
  train_id: string;
  bay: string;
  bay_position?: number;
  readiness: number;
  readiness_summary?: string;
  readiness_details?: {
    mechanical?: string;
    electrical?: string;
    safety?: string;
    cleanliness?: string;
    last_maintenance?: string;
  };
  departure_slot: number;
  departure_order: number;
  departure_time?: string;
  optimization_score?: string | number;
  needs_shunting?: boolean;
  is_priority_slot?: boolean;
}

interface StandbyTrain {
  train_id: string;
  readiness: number;
  readiness_summary: string;
  readiness_details: Record<string, any>;
  bay: string;
  bay_position: number;
  status: string;
  reason: string;
}

interface TimetableInfo {
  first_service: string;
  last_service: string;
  morning_peak_hours?: [number, number][];
  evening_peak_hours?: [number, number][];
  peak_hours?: [number, number][];
  peak_headway: number;
  off_peak_headway: number;
  service_type: string;
  timetable_code?: string;
  effective_date?: string;
}

interface OptimizationResult {
  solver_status: string;
  objective_value?: number;
  optimized_assignments?: TrainAssignment[];
  standby_trains?: StandbyTrain[];
  total_trains_available?: number;
  total_trains_scheduled?: number;
  total_standby_trains?: number;
  timetable_info?: TimetableInfo;
  departure_slots?: number[];
  service_date?: string;
  processing_time?: string;
  shunting_operations_required?: number;
  trains_requiring_shunting?: any[];
  input_validation?: ValidationResult;
  test_data_validation?: ValidationResult;
  optimization_summary?: {
    readiness_weighted: boolean;
    ad_revenue_optimized: boolean;
    demographic_targeting: boolean;
    parking_position_optimized?: boolean;
    shunting_constraints?: boolean;
    shunting_minimization?: string;
    slot_count: number;
    scheduling_method: string;
    constraint_programming?: string;
    optimization_method?: string;
  };
  optimization_focus?: string;
  error?: string;
  status?: string;
}

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  stats: Record<string, any>;
  detailed_stats?: Record<string, any>;
}

interface SwapAnalysis {
  status: string;
  swap_scenario: {
    from_train: string;
    to_train: string;
    departure_time: string;
    bay: string;
  };
  readiness_comparison: {
    scheduled_train: {
      score: number;
      summary: string;
      details: Record<string, any>;
    };
    standby_train: {
      score: number;
      summary: string;
      details: Record<string, any>;
    };
  };
  ai_analysis: {
    safety_risks: string[];
    operational_risks: string[];
    maintenance_implications: string[];
    passenger_impact: string[];
    detailed_analysis: string;
    recommendation: string;
    confidence_level: string;
    critical_concerns?: string[];
    mitigation_strategies?: string[];
    analysis_method?: string;
  };
  impact_analysis: {
    readiness_score_change: number;
    risk_level: string;
    estimated_delay_risk: string;
    passenger_impact_severity: string;
    is_peak_hour: boolean;
    overall_impact_score: number;
    estimated_shunting_moves?: number;
    estimated_extra_fuel_liters?: number;
  };
  recommendation: {
    decision: string;
    reasoning: string[];
    confidence: string;
    score_difference: number;
    ai_recommendation: string;
  };
  generated_at: string;
}

interface TimetableData {
  service_date: string;
  timetable_config: TimetableInfo;
  departure_slots: {
    count: number;
    slot_numbers: number[];
    note: string;
  };
  generated_at: string;
  holiday_check?: {
    is_public_holiday: boolean;
    service_type: string;
  };
}

const Layer2Dashboard: React.FC = () => {
  const [data, setData] = useState<OptimizationResult | null>(null);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null);
  const [standbyTrains, setStandbyTrains] = useState<StandbyTrain[]>([]);
  const [swapAnalysis, setSwapAnalysis] = useState<SwapAnalysis | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [showOverride, setShowOverride] = useState(false);
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [suggestedOverrides, setSuggestedOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWhatIf, setLoadingWhatIf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showValidation, setShowValidation] = useState(false);
  const [showTimetable, setShowTimetable] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [showSwapAnalysis, setShowSwapAnalysis] = useState(false);
  const [selectedScheduledTrain, setSelectedScheduledTrain] = useState<string>('');
  const [selectedStandbyTrain, setSelectedStandbyTrain] = useState<string>('');

  useEffect(() => {
    fetchScheduleData();
  }, [selectedDate]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:5005/schedule/test?service_date=${selectedDate}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
      }
      
      const result: OptimizationResult = await response.json();
      
      if (result.status && !['OPTIMAL', 'FEASIBLE'].includes(result.status) && result.solver_status !== 'OPTIMAL' && result.solver_status !== 'FEASIBLE') {
        throw new Error(result.error || result.status);
      }
      
      setData(result);
      
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStandbyTrains = async () => {
    try {
      setLoadingWhatIf(true);
      const response = await fetch('http://localhost:5005/whatif/standby-trains');
      if (!response.ok) throw new Error('Failed to fetch standby trains');
      
      const result = await response.json();
      setStandbyTrains(result.standby_trains || []);
    } catch (err) {
      console.error('Error fetching standby trains:', err);
    } finally {
      setLoadingWhatIf(false);
    }
  };

  const analyzeSwap = async () => {
    if (!selectedScheduledTrain || !selectedStandbyTrain) {
      alert('Please select both a scheduled train and a standby train');
      return;
    }

    try {
      setLoadingWhatIf(true);
      const response = await fetch('http://localhost:5005/whatif/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduled_train_id: selectedScheduledTrain,
          standby_train_id: selectedStandbyTrain,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }

      const result: SwapAnalysis = await response.json();
      setSwapAnalysis(result);
      setShowSwapAnalysis(true);
    } catch (err) {
      console.error('Error analyzing swap:', err);
      alert(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoadingWhatIf(false);
    }
  };

  const openWhatIfPanel = () => {
    setShowWhatIf(true);
    fetchStandbyTrains();
  };

  const openOverridePanel = () => {
    setShowOverride(true);
    fetchSuggestedOverrides();
  };

  const fetchSuggestedOverrides = async () => {
    try {
      const response = await fetch('http://localhost:5005/overrides/suggestions');
      const result = await response.json();
      setSuggestedOverrides(result.suggestions || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  const loadLatestSuggestions = async () => {
    try {
      const response = await fetch('http://localhost:5005/overrides/suggestions/latest');
      const result = await response.json();
      setSuggestedOverrides(result.suggestions || []);
    } catch (err) {
      console.error('Error loading suggestions:', err);
    }
  };

  const submitOverride = async () => {
    if (!selectedScheduledTrain || !selectedStandbyTrain || !overrideReason) {
      alert('Select both trains and enter a reason');
      return;
    }
    try {
      setOverrideSubmitting(true);
      const findTrain = (id: string) => {
        const sched = (data?.optimized_assignments || []).find(t => t.train_id === id);
        const stdby = (data?.standby_trains || []).find(t => t.train_id === id);
        return sched || stdby || { train_id: id };
      };
      const scheduled_train_config = findTrain(selectedScheduledTrain);
      const standby_train_config = findTrain(selectedStandbyTrain);
      const res = await fetch('http://localhost:5005/overrides/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_train_id: selectedScheduledTrain,
          standby_train_id: selectedStandbyTrain,
          scheduled_train_config,
          standby_train_config,
          reason: overrideReason,
          context: undefined
        })
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.detail || 'Failed to save override');
      alert('Override saved');
      setOverrideReason('');
      fetchSuggestedOverrides();
    } catch (err) {
      console.error('Override error:', err);
      alert(err instanceof Error ? err.message : 'Failed to save override');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const fetchValidationData = async () => {
    try {
      await fetchSuggestedOverrides();
      alert('Override suggestions generated using AI. Scroll to Suggested Overrides section.');
    } catch (err) {
      console.error('Error generating suggestions:', err);
    }
  };

  const fetchTimetableData = async () => {
    try {
      const response = await fetch(`http://localhost:5005/timetable/info?service_date=${selectedDate}`);
      const result = await response.json();
      setTimetableData(result);
      setShowTimetable(true);
    } catch (err) {
      console.error('Error fetching timetable:', err);
    }
  };

  const getReadinessColor = (score: number): string => {
    if (score >= 95) return 'bg-emerald-900/50 text-emerald-300 border-emerald-700';
    if (score >= 85) return 'bg-teal-900/50 text-teal-300 border-teal-700';
    if (score >= 75) return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
    if (score >= 65) return 'bg-orange-900/50 text-orange-300 border-orange-700';
    return 'bg-red-900/50 text-red-300 border-red-700';
  };

  const getServiceTypeColor = (serviceType: string): string => {
    switch (serviceType) {
      case 'public_holiday': return 'bg-purple-900/50 text-purple-300 border-purple-700';
      case 'sunday': return 'bg-indigo-900/50 text-indigo-300 border-indigo-700';
      case 'weekday': return 'bg-teal-900/50 text-teal-300 border-teal-700';
      default: return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };

  const getSolverStatusColor = (status: string): string => {
    switch (status) {
      case 'OPTIMAL': return 'bg-emerald-900/50 text-emerald-300 border-emerald-700';
      case 'FEASIBLE': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'INFEASIBLE': return 'bg-red-900/50 text-red-300 border-red-700';
      default: return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };

  const getRecommendationColor = (decision: string): string => {
    switch (decision) {
      case 'APPROVE': return 'bg-emerald-900/50 text-emerald-300 border-emerald-700';
      case 'REJECT': return 'bg-red-900/50 text-red-300 border-red-700';
      case 'REVIEW_REQUIRED': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      default: return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };

  const getRiskLevelColor = (risk: string): string => {
    switch (risk) {
      case 'LOW': return 'bg-emerald-900/30 text-emerald-400';
      case 'MEDIUM': return 'bg-yellow-900/30 text-yellow-400';
      case 'HIGH': return 'bg-red-900/30 text-red-400';
      default: return 'bg-gray-900/30 text-gray-400';
    }
  };

  const formatHeadway = (minutes: number): string => {
    const wholeMinutes = Math.floor(minutes);
    const seconds = Math.round((minutes - wholeMinutes) * 60);
    return `${wholeMinutes} min ${seconds > 0 ? `${seconds} sec` : ''}`.trim();
  };

  const getReadinessIcon = (score: number): string => {
    if (score >= 95) return '🟢';
    if (score >= 85) return '🔵';
    if (score >= 75) return '🟡';
    if (score >= 65) return '🟠';
    return '🔴';
  };

  const getHolidayStatus = (): { isHoliday: boolean; displayText: string } => {
    if (data?.timetable_info?.service_type === 'public_holiday') {
      return { isHoliday: true, displayText: '🎉 Public Holiday Schedule' };
    } else if (data?.timetable_info?.service_type === 'sunday') {
      return { isHoliday: false, displayText: '🗓️ Sunday Schedule' };
    }
    return { isHoliday: false, displayText: '📅 Weekday Schedule' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-100">Loading Schedule Data</h2>
          <p className="text-gray-400 mt-2">Optimizing trains with readiness & minimal shunting focus...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Error Loading Data</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={fetchScheduleData}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              Try Again
            </button>
              <button
                onClick={loadLatestSuggestions}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
              >
                View Override Suggestions (AI)
              </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">No Schedule Data</h2>
          <button
            onClick={fetchScheduleData}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            Generate Schedule
          </button>
        </div>
      </div>
    );
  }

  const assignments = data.optimized_assignments || [];
  const sortedAssignments = [...assignments].sort((a, b) => (a.departure_order || 0) - (b.departure_order || 0));
  const currentValidation = data.input_validation || data.test_data_validation;
  const holidayStatus = getHolidayStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with Date Selection and Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-100">Kochi Metro - Layer 2 Optimization</h1>
              <p className="text-gray-400 mt-2">
                Readiness-focused departure scheduling with minimal shunting optimization
              </p>
              <div className="mt-2 flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${holidayStatus.isHoliday ? 'bg-purple-900/50 text-purple-300 border-purple-700' : 'bg-teal-900/50 text-teal-300 border-teal-700'}`}>
                  {holidayStatus.displayText}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-900/50 text-emerald-300 border border-emerald-700">
                  🔄 AI-Powered What-If Analysis
                </span>
                {data.optimization_focus && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-900/50 text-orange-300 border border-orange-700">
                    🎯 {data.optimization_focus}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Service Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                {data.timetable_info && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-center border ${getServiceTypeColor(data.timetable_info.service_type)}`}>
                    {data.timetable_info.timetable_code || data.timetable_info.service_type.replace('_', ' ').toUpperCase()}
                  </span>
                )}
                
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-center border ${getSolverStatusColor(data.solver_status)}`}>
                  {data.solver_status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Optimization Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-teal-400">{data.total_trains_scheduled || assignments.length}</div>
            <div className="text-sm text-gray-400">Trains Scheduled</div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-emerald-400">{data.total_standby_trains || 0}</div>
            <div className="text-sm text-gray-400">Standby Trains</div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {data.optimization_summary?.readiness_weighted ? '✅' : '❌'}
            </div>
            <div className="text-sm text-gray-400">Readiness Focus</div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {data.optimization_summary?.parking_position_optimized ? '✅' : '❌'}
            </div>
            <div className="text-sm text-gray-400">Position Optimized</div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-red-400">{data.shunting_operations_required || 0}</div>
            <div className="text-sm text-gray-400">Shunting Ops</div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-indigo-400">
              {data.departure_slots?.length || 10}
            </div>
            <div className="text-sm text-gray-400">Available Slots</div>
          </div>
        </div>

        {/* Timetable Information */}
        {data.timetable_info && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-100">Timetable Configuration</h2>
              <button
                onClick={fetchTimetableData}
                className="px-3 py-1 text-sm bg-teal-800 hover:bg-teal-700 text-teal-200 rounded-md transition-colors"
              >
                View Details
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-400">{data.timetable_info.first_service}</div>
                <div className="text-sm text-gray-400">First Service</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-400">{data.timetable_info.last_service}</div>
                <div className="text-sm text-gray-400">Last Service</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{formatHeadway(data.timetable_info.peak_headway)}</div>
                <div className="text-sm text-gray-400">Peak Headway</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">{formatHeadway(data.timetable_info.off_peak_headway)}</div>
                <div className="text-sm text-gray-400">Off-Peak Headway</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <h3 className="font-semibold text-gray-200 mb-2">Peak Hours:</h3>
              <div className="flex flex-wrap gap-2">
                {(data.timetable_info.peak_hours || []).concat(
                  data.timetable_info.morning_peak_hours || [],
                  data.timetable_info.evening_peak_hours || []
                ).map(([start, end], index) => (
                  <span key={index} className="px-3 py-1 bg-teal-900/50 text-teal-300 border border-teal-700 rounded-full text-sm">
                    {start}:00 - {end}:00
                  </span>
                ))}
              </div>
            </div>
            
            {data.optimization_summary && (
              <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-700 rounded-lg">
                <h3 className="font-semibold text-gray-200 mb-2">Optimization Focus Applied:</h3>
                <div className="flex flex-wrap gap-2">
                  {data.optimization_summary.readiness_weighted && (
                    <span className="px-2 py-1 bg-emerald-900/50 text-emerald-300 text-xs rounded-md border border-emerald-700">Readiness Weighted</span>
                  )}
                  {data.optimization_summary.parking_position_optimized && (
                    <span className="px-2 py-1 bg-orange-900/50 text-orange-300 text-xs rounded-md border border-orange-700">Parking Position</span>
                  )}
                  {data.optimization_summary.shunting_constraints && (
                    <span className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded-md border border-red-700">Shunting Minimized</span>
                  )}
                  {data.optimization_summary.constraint_programming && (
                    <span className="px-2 py-1 bg-indigo-900/50 text-indigo-300 text-xs rounded-md border border-indigo-700">CP-SAT Optimized</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shunting Operations Warning */}
        {data.trains_requiring_shunting && data.trains_requiring_shunting.length > 0 && (
          <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-6 rounded-r-lg">
            <div className="flex">
              <div className="text-orange-400 text-xl mr-3">⚠️</div>
              <div>
                <h3 className="text-lg font-medium text-orange-300">Shunting Operations Required</h3>
                <p className="text-orange-200 mt-1">
                  {data.shunting_operations_required} trains require shunting due to parking position constraints:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.trains_requiring_shunting.map((operation, index) => (
                    <span key={index} className="px-2 py-1 bg-orange-800/50 text-orange-200 text-sm rounded border border-orange-700">
                      {typeof operation === 'string' ? operation : operation.train_id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Validation Warnings */}
        {currentValidation && (currentValidation.warnings.length > 0 || currentValidation.errors.length > 0) && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-100">Data Validation</h2>
              <button
                onClick={fetchSuggestedOverrides}
                className="px-3 py-1 text-sm bg-emerald-700 hover:bg-emerald-600 text-white rounded-md"
              >
                View Override Suggestions (AI)
              </button>
            </div>
            
            {currentValidation.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-red-400 mb-2">Errors:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {currentValidation.errors.map((error, index) => (
                    <li key={index} className="text-red-300 text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {currentValidation.warnings.length > 0 && (
              <div>
                <h3 className="font-semibold text-yellow-400 mb-2">Warnings:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {currentValidation.warnings.map((warning, index) => (
                    <li key={index} className="text-yellow-300 text-sm">{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Main Schedule Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-100">Optimized Train Schedule</h2>
            <div className="flex gap-2">
              <button
                onClick={openWhatIfPanel}
                className="px-4 py-2 text-sm bg-purple-700 hover:bg-purple-600 text-white rounded-md transition-colors font-medium"
              >
                🔄 What-If Analysis
              </button>
              <button
                onClick={openOverridePanel}
                className="px-4 py-2 text-sm bg-emerald-700 hover:bg-emerald-600 text-white rounded-md transition-colors font-medium"
              >
                ✍️ Override Schedule
              </button>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
              >
                {showDebug ? 'Hide' : 'Show'} Debug
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/50 border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Slot</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Train ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Bay</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Departure</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Readiness</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                  {showDebug && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Debug Info</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedAssignments.map((train, index) => (
                  <tr key={train.train_id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold bg-teal-800/50 text-teal-200 border border-teal-600">
                        {train.departure_slot}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-bold text-lg text-gray-200">
                        #{train.departure_order}
                      </div>
                      {train.is_priority_slot && (
                        <div className="text-xs text-emerald-400 font-medium">Priority</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-100">{train.train_id}</div>
                      {train.readiness_summary && (
                        <div className="text-xs text-gray-400 mt-1 max-w-xs truncate" title={train.readiness_summary}>
                          {train.readiness_summary}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-200 font-medium">{train.bay}</div>
                      {train.bay_position && (
                        <div className="text-xs text-gray-400">Position: {train.bay_position}</div>
                      )}
                    </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-200 font-medium">{train.departure_time || '-'}</div>
                    <div className="text-xs text-gray-500">Slot #{train.departure_slot}</div>
                  </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getReadinessIcon(train.readiness)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getReadinessColor(train.readiness)}`}>
                          {train.readiness}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                      {train.needs_shunting && (
                          <span className="px-2 py-1 bg-orange-900/50 text-orange-300 border border-orange-700 text-xs rounded-md block w-fit">
                            Shunting Required
                          </span>
                        )}
                        {train.is_priority_slot && (
                          <span className="px-2 py-1 bg-emerald-900/50 text-emerald-300 border border-emerald-700 text-xs rounded-md block w-fit">
                            Priority Slot
                          </span>
                        )}
                        {!train.needs_shunting && !train.is_priority_slot && (
                          <span className="text-gray-500 text-xs">Regular</span>
                        )}
                      </div>
                    </td>
                    {showDebug && (
                      <td className="px-4 py-3 text-xs text-gray-400">
                        <div>Score: {train.optimization_score}</div>
                        {train.readiness_details && (
                          <div className="mt-1 space-y-1">
                            <div>Mech: {train.readiness_details.mechanical}</div>
                            <div>Elec: {train.readiness_details.electrical}</div>
                            <div>Safety: {train.readiness_details.safety}</div>
                            <div>Clean: {train.readiness_details.cleanliness}</div>
                            {train.readiness_details.last_maintenance && (
                              <div>Last Maint: {train.readiness_details.last_maintenance}</div>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedAssignments.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚂</div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No Trains Scheduled</h3>
              <p className="text-gray-500">No optimized train assignments available for this date.</p>
            </div>
          )}
        </div>

        {/* Suggested Overrides */}
        {suggestedOverrides.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Suggested Overrides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestedOverrides.map((sug, idx) => (
                <div key={idx} className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                  <div className="font-semibold text-gray-200">{sug.from_train} → {sug.to_train}</div>
                  <div className="text-sm text-gray-400 mt-1">{sug.reason}</div>
                  {sug.confidence && (
                    <div className="text-xs text-teal-300 mt-2">Confidence: {sug.confidence}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standby Trains Summary */}
        {data.standby_trains && data.standby_trains.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Standby Trains ({data.standby_trains.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.standby_trains.slice(0, 6).map((train) => (
                <div key={train.train_id} className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-gray-100">{train.train_id}</div>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getReadinessColor(train.readiness)}`}>
                      {train.readiness}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">{train.bay} • Position {train.bay_position}</div>
                  <div className="text-xs text-gray-500 truncate" title={train.readiness_summary}>
                    {train.readiness_summary}
                  </div>
                </div>
              ))}
            </div>
            {data.standby_trains.length > 6 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-400">
                  Showing 6 of {data.standby_trains.length} standby trains
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={fetchScheduleData}
            className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Refresh Schedule
          </button>
          
          <button
            onClick={openWhatIfPanel}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            What-If Analysis
          </button>
          
          <button
            onClick={fetchValidationData}
            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Validate Data
          </button>
          
          <button
            onClick={fetchTimetableData}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            View Timetable
          </button>
        </div>

        {/* What-If Analysis Panel */}
{showWhatIf && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-100">What-If Train Swap Analysis</h3>
            <p className="text-gray-400 mt-1">AI-powered impact analysis for swapping scheduled trains with standby trains</p>
          </div>
          <button
            onClick={() => setShowWhatIf(false)}
            className="text-gray-400 hover:text-gray-200 text-2xl p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Standby Trains */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-200">Available Standby Trains</h4>
              <span className="text-sm text-gray-400 bg-gray-700 px-3 py-1 rounded-full">
                {standbyTrains.length} available
              </span>
            </div>
            
            {loadingWhatIf ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {standbyTrains.map((train) => {
                  const readinessScore = train.readiness || 0;
                  const issueCount = (train.readiness_summary.match(/needs|poor|critical|overdue|required|attention|maintenance/gi) || []).length;
                  
                  return (
                    <div
                      key={train.train_id}
                      className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedStandbyTrain === train.train_id 
                          ? 'border-purple-500 bg-purple-900/30 shadow-lg shadow-purple-900/20' 
                          : 'border-gray-600 hover:border-gray-500 bg-gray-900/30 hover:bg-gray-900/50'
                      }`}
                      onClick={() => setSelectedStandbyTrain(train.train_id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-xl">
                            {readinessScore >= 95 ? '🟢' : 
                             readinessScore >= 85 ? '🟡' : 
                             readinessScore >= 70 ? '🟠' : '🔴'}
                          </div>
                          <div>
                            <div className="font-bold text-lg text-gray-100">{train.train_id}</div>
                            <div className="text-sm text-gray-400">
                              {train.bay} • Position {train.bay_position}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`px-3 py-2 rounded-lg text-lg font-bold border ${getReadinessColor(readinessScore)}`}>
                            {readinessScore}%
                          </div>
                          {issueCount > 0 && (
                            <div className="text-xs text-orange-400 mt-1">
                              {issueCount} issue{issueCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-300 mb-3" title={train.readiness_summary}>
                        {train.readiness_summary || 'No summary available'}
                      </div>
                      
                      {train.readiness_details && (
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(train.readiness_details).map(([key, value]) => {
                            const isIssue = typeof value === 'string' && 
                              (value.toLowerCase().includes('needs') || 
                               value.toLowerCase().includes('poor') ||
                               value.toLowerCase().includes('attention') ||
                               value.toLowerCase().includes('critical'));
                            
                            return (
                              <span
                                key={key}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  isIssue 
                                    ? 'bg-red-900/30 text-red-300 border border-red-700'
                                    : 'bg-emerald-900/30 text-emerald-300 border border-emerald-700'
                                }`}
                              >
                                {key}: {typeof value === 'string' ? value : 'OK'}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {standbyTrains.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-6xl mb-4">🚂</div>
                    <h4 className="text-lg font-medium text-gray-300 mb-2">No Standby Trains Available</h4>
                    <p className="text-sm">All trains are currently scheduled for service</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scheduled Trains */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-200">Currently Scheduled Trains</h4>
              <span className="text-sm text-gray-400 bg-gray-700 px-3 py-1 rounded-full">
                {sortedAssignments.length} scheduled
              </span>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {sortedAssignments.map((train) => (
                <div
                  key={train.train_id}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedScheduledTrain === train.train_id 
                      ? 'border-teal-500 bg-teal-900/30 shadow-lg shadow-teal-900/20' 
                      : 'border-gray-600 hover:border-gray-500 bg-gray-900/30 hover:bg-gray-900/50'
                  }`}
                  onClick={() => setSelectedScheduledTrain(train.train_id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">🚄</div>
                      <div>
                        <div className="font-bold text-lg text-gray-100">{train.train_id}</div>
                        <div className="text-sm text-gray-400">
                          Slot {train.departure_slot} • Bay {train.bay}
                          {train.needs_shunting && (
                            <span className="text-orange-400 ml-2 px-2 py-0.5 bg-orange-900/30 rounded text-xs">
                              Shunting Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-2 rounded-lg text-lg font-bold border ${getReadinessColor(train.readiness)}`}>
                        {train.readiness}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Departure #{train.departure_order}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    Position {train.bay_position} • Ready for service
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analysis Controls */}
        <div className="mt-6 space-y-4">
          <div className="flex gap-4">
            <button
              onClick={analyzeSwap}
              disabled={!selectedScheduledTrain || !selectedStandbyTrain || loadingWhatIf}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loadingWhatIf ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </div>
              ) : (
                'Analyze Swap Impact'
              )}
            </button>
          </div>

          {selectedScheduledTrain && selectedStandbyTrain && (
            <div className="p-4 bg-teal-900/20 border border-teal-700 rounded-lg">
              <h5 className="font-semibold text-teal-300 mb-2">Selected Swap:</h5>
              <p className="text-teal-200">
                Replace <strong>{selectedScheduledTrain}</strong> with <strong>{selectedStandbyTrain}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}

        {/* Swap Analysis Results Modal */}
        {showSwapAnalysis && swapAnalysis && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-100">Swap Analysis Results</h3>
                    <p className="text-gray-400 mt-1">
                      {swapAnalysis.swap_scenario.from_train} → {swapAnalysis.swap_scenario.to_train}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSwapAnalysis(false)}
                    className="text-gray-400 hover:text-gray-200 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {swapAnalysis.status === 'success' ? (
                  <div className="space-y-6">
                    {/* Recommendation Summary */}
                    <div className={`p-4 rounded-lg border ${getRecommendationColor(swapAnalysis.recommendation.decision)}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold">
                            Recommendation: {swapAnalysis.recommendation.decision}
                          </h4>
                          <p className="mt-1">Confidence: {swapAnalysis.recommendation.confidence}</p>
                          {/* {swapAnalysis.ai_analysis.analysis_method && ( */}
                            {/* <p className="text-sm opacity-80">Analysis: {swapAnalysis.ai_analysis.analysis_method}</p> */}
                          {/* )} */}
                        </div>
                        <div className="text-2xl">
                          {swapAnalysis.recommendation.decision === 'APPROVE' ? '✅' : 
                           swapAnalysis.recommendation.decision === 'REJECT' ? '❌' : '⚠️'}
                        </div>
                      </div>
                      <div className="mt-3">
                        <h5 className="font-medium mb-2">Reasoning:</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {swapAnalysis.recommendation.reasoning.map((reason, index) => (
                            <li key={index} className="text-sm">{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Readiness Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border border-gray-600 rounded-lg p-4 bg-gray-900/30">
                        <h4 className="font-semibold text-gray-200 mb-3">Current Train ({swapAnalysis.swap_scenario.from_train})</h4>
                        <div className={`text-2xl font-bold mb-2 ${getReadinessColor(swapAnalysis.readiness_comparison.scheduled_train.score).split(' ')[1]}`}>
                          {swapAnalysis.readiness_comparison.scheduled_train.score}%
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{swapAnalysis.readiness_comparison.scheduled_train.summary}</p>
                        <div className="text-xs space-y-1">
                          {Object.entries(swapAnalysis.readiness_comparison.scheduled_train.details).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize text-gray-400">{key}:</span>
                              <span className="text-gray-300">{value as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border border-gray-600 rounded-lg p-4 bg-gray-900/30">
                        <h4 className="font-semibold text-gray-200 mb-3">Replacement Train ({swapAnalysis.swap_scenario.to_train})</h4>
                        <div className={`text-2xl font-bold mb-2 ${getReadinessColor(swapAnalysis.readiness_comparison.standby_train.score).split(' ')[1]}`}>
                          {swapAnalysis.readiness_comparison.standby_train.score}%
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{swapAnalysis.readiness_comparison.standby_train.summary}</p>
                        <div className="text-xs space-y-1">
                          {Object.entries(swapAnalysis.readiness_comparison.standby_train.details).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize text-gray-400">{key}:</span>
                              <span className="text-gray-300">{value as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Impact Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-200">Impact Analysis</h4>
                        <div className="space-y-3 bg-gray-900/30 p-4 rounded-lg border border-gray-600">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Readiness Score Change:</span>
                            <span className={`font-bold ${swapAnalysis.impact_analysis.readiness_score_change > 0 ? 'text-emerald-400' : swapAnalysis.impact_analysis.readiness_score_change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                              {swapAnalysis.impact_analysis.readiness_score_change > 0 ? '+' : ''}{swapAnalysis.impact_analysis.readiness_score_change}%
                            </span>
                          </div>
                          {(typeof swapAnalysis.impact_analysis.estimated_shunting_moves === 'number') && (
                            <div className="flex justify-between">
                              <span className="text-gray-300">Est. Extra Shunting Moves:</span>
                              <span className="font-medium text-orange-300">{swapAnalysis.impact_analysis.estimated_shunting_moves}</span>
                            </div>
                          )}
                          {(typeof swapAnalysis.impact_analysis.estimated_extra_fuel_liters === 'number') && (
                            <div className="flex justify-between">
                              <span className="text-gray-300">Est. Extra Fuel:</span>
                              <span className="font-medium text-orange-300">{swapAnalysis.impact_analysis.estimated_extra_fuel_liters} L</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-300">Risk Level:</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(swapAnalysis.impact_analysis.risk_level)}`}>
                              {swapAnalysis.impact_analysis.risk_level}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Delay Risk:</span>
                            <span className="font-medium text-gray-200">{swapAnalysis.impact_analysis.estimated_delay_risk}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Passenger Impact:</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(swapAnalysis.impact_analysis.passenger_impact_severity)}`}>
                              {swapAnalysis.impact_analysis.passenger_impact_severity}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Peak Hour:</span>
                            <span className="text-gray-200">{swapAnalysis.impact_analysis.is_peak_hour ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-200">AI Analysis</h4>
                        <div className="text-sm bg-gray-900/30 p-4 rounded-lg border border-gray-600">
                          <p className="mb-3 text-gray-300">{swapAnalysis.ai_analysis.detailed_analysis}</p>
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium text-red-400">Safety Risks:</span>
                              <ul className="list-disc list-inside mt-1 text-xs">
                                {swapAnalysis.ai_analysis.safety_risks.map((risk, index) => (
                                  <li key={index} className="text-gray-400">{risk}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="font-medium text-orange-400">Operational Risks:</span>
                              <ul className="list-disc list-inside mt-1 text-xs">
                                {swapAnalysis.ai_analysis.operational_risks.map((risk, index) => (
                                  <li key={index} className="text-gray-400">{risk}</li>
                                  ))}
                                  </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Critical Concerns & Mitigation */}
                    {((Array.isArray(swapAnalysis.ai_analysis.critical_concerns) && swapAnalysis.ai_analysis.critical_concerns.length > 0) ||
                      (Array.isArray(swapAnalysis.ai_analysis.mitigation_strategies) && swapAnalysis.ai_analysis.mitigation_strategies.length > 0)) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Array.isArray(swapAnalysis.ai_analysis.critical_concerns) && swapAnalysis.ai_analysis.critical_concerns.length > 0 && (
                          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                            <h4 className="font-semibold text-red-300 mb-2">Critical Concerns</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-red-200">
                              {swapAnalysis.ai_analysis.critical_concerns.map((concern, index) => (
                                <li key={index}>{concern}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {Array.isArray(swapAnalysis.ai_analysis.mitigation_strategies) && swapAnalysis.ai_analysis.mitigation_strategies.length > 0 && (
                          <div className="bg-teal-900/20 border border-teal-700 rounded-lg p-4">
                            <h4 className="font-semibold text-teal-300 mb-2">Mitigation Strategies</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-teal-200">
                              {swapAnalysis.ai_analysis.mitigation_strategies.map((strategy, index) => (
                                <li key={index}>{strategy}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-red-400 text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold text-gray-200 mb-2">Analysis Failed</h3>
                    <p className="text-gray-400">{swapAnalysis.status}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Validation Modal */}
        {showValidation && validationData && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-100">Data Validation Results</h3>
                  <button
                    onClick={() => setShowValidation(false)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${validationData.valid ? 'bg-emerald-900/20 border border-emerald-700' : 'bg-red-900/20 border border-red-700'}`}>
                    <div className="font-semibold">
                      {validationData.valid ? '✅ Valid' : '❌ Invalid'} Data Structure
                    </div>
                  </div>
                  
                  {validationData.warnings.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-yellow-400 mb-2">Warnings:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {validationData.warnings.map((warning, index) => (
                          <li key={index} className="text-yellow-300 text-sm">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {validationData.errors.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-400 mb-2">Errors:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {validationData.errors.map((error, index) => (
                          <li key={index} className="text-red-300 text-sm">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                    <h4 className="font-semibold text-gray-200 mb-2">Statistics:</h4>
                    <pre className="text-sm text-gray-400 overflow-x-auto">
                      {JSON.stringify(validationData.stats, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timetable Modal */}
        {showTimetable && timetableData && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-96 overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-100">Detailed Timetable Information</h3>
                  <button
                    onClick={() => setShowTimetable(false)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-200 mb-3">Service Configuration</h4>
                      <div className="space-y-2 text-sm bg-gray-900/30 p-4 rounded-lg border border-gray-600">
                        <div>
                          <span className="text-gray-400">Service Date:</span>
                          <span className="font-semibold ml-2 text-gray-200">{timetableData.service_date}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Timetable Code:</span>
                          <span className="font-semibold ml-2 text-gray-200">{timetableData.timetable_config.timetable_code || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">First Service:</span>
                          <span className="font-semibold ml-2 text-teal-300">{timetableData.timetable_config.first_service}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Last Service:</span>
                          <span className="font-semibold ml-2 text-teal-300">{timetableData.timetable_config.last_service}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Peak Headway:</span>
                          <span className="font-semibold ml-2 text-emerald-300">{formatHeadway(timetableData.timetable_config.peak_headway)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Off-Peak Headway:</span>
                          <span className="font-semibold ml-2 text-orange-300">{formatHeadway(timetableData.timetable_config.off_peak_headway)}</span>
                        </div>
                        {timetableData.timetable_config.effective_date && (
                          <div>
                            <span className="text-gray-400">Effective Date:</span>
                            <span className="font-semibold ml-2 text-gray-200">{timetableData.timetable_config.effective_date}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-200 mb-3">Departure Configuration</h4>
                      <div className="space-y-2 text-sm bg-gray-900/30 p-4 rounded-lg border border-gray-600">
                        <div>
                          <span className="text-gray-400">Total Slots:</span>
                          <span className="font-semibold ml-2 text-teal-300">{timetableData.departure_slots.count}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Slot Format:</span>
                          <span className="font-semibold ml-2 text-gray-200">Ranking (1-8)</span>
                        </div>
                        {timetableData.holiday_check && (
                          <div>
                            <span className="text-gray-400">Holiday Status:</span>
                            <span className={`font-semibold ml-2 ${timetableData.holiday_check.is_public_holiday ? 'text-purple-300' : 'text-teal-300'}`}>
                              {timetableData.holiday_check.is_public_holiday ? 'Public Holiday' : 'Regular Day'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-300 mb-2">Slot Numbers:</h5>
                        <div className="flex flex-wrap gap-2">
                          {timetableData.departure_slots.slot_numbers.map((slot, index) => (
                            <span key={index} className="px-2 py-1 bg-teal-800/50 text-teal-200 border border-teal-600 text-xs rounded text-center font-mono">
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-200 mb-3">Peak Hours</h4>
                    <div className="flex flex-wrap gap-2">
                      {/* Handle different peak hour formats */}
                      {(timetableData.timetable_config.peak_hours || []).concat(
                        timetableData.timetable_config.morning_peak_hours || [],
                        timetableData.timetable_config.evening_peak_hours || []
                      ).map(([start, end], index) => (
                        <span key={index} className="px-3 py-1 bg-teal-900/50 text-teal-300 border border-teal-700 rounded-full text-sm">
                          {start}:00 - {end}:00
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {timetableData.departure_slots.note && (
                    <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                      <h4 className="font-semibold text-yellow-300 mb-2">Note:</h4>
                      <p className="text-yellow-200 text-sm">{timetableData.departure_slots.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Override Modal */}
      {showOverride && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-100">Override Schedule</h3>
                <button onClick={() => setShowOverride(false)} className="text-gray-400 hover:text-gray-200 text-2xl">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-200 mb-3">Select Scheduled Train</h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                    {sortedAssignments.map((t) => (
                      <div key={t.train_id} onClick={() => setSelectedScheduledTrain(t.train_id)}
                        className={`p-3 border rounded cursor-pointer ${selectedScheduledTrain===t.train_id? 'border-emerald-500 bg-emerald-900/30':'border-gray-600 hover:border-gray-500 bg-gray-900/30'}`}>
                        <div className="flex justify-between">
                          <div className="text-gray-100 font-medium">{t.train_id}</div>
                          <div className="text-xs text-gray-400">Readiness {t.readiness}%</div>
                        </div>
                        <div className="text-xs text-gray-500">Bay {t.bay} • Slot {t.departure_slot}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-200 mb-3">Select Standby Train</h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                    {(data.standby_trains || []).map((t) => (
                      <div key={t.train_id} onClick={() => setSelectedStandbyTrain(t.train_id)}
                        className={`p-3 border rounded cursor-pointer ${selectedStandbyTrain===t.train_id? 'border-emerald-500 bg-emerald-900/30':'border-gray-600 hover:border-gray-500 bg-gray-900/30'}`}>
                        <div className="flex justify-between">
                          <div className="text-gray-100 font-medium">{t.train_id}</div>
                          <div className="text-xs text-gray-400">Readiness {t.readiness}%</div>
                        </div>
                        <div className="text-xs text-gray-500">Bay {t.bay} • Pos {t.bay_position}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
                <textarea value={overrideReason} onChange={(e)=>setOverrideReason(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md text-gray-100 p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-emerald-600"></textarea>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={submitOverride} disabled={overrideSubmitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-600 text-white rounded-md">
                  {overrideSubmitting? 'Saving...':'Save Override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layer2Dashboard;