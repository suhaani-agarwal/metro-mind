"use client";
import React, { useState, useEffect } from 'react';
import {useRouter} from 'next/navigation';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

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
  const router = useRouter();
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
  const [showAIAnalysis, setShowAIAnalysis] = useState(true);

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
      case 'ACCEPTED': return 'bg-emerald-900/50 text-emerald-300 border-emerald-700';
      case 'REJECTED': return 'bg-red-900/50 text-red-300 border-red-700';
      case 'REVIEW_REQUIRED': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'FEASIBLE': return 'bg-indigo-900/50 text-indigo-300 border-indigo-700';
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
          <h2 className="text-xl font-semibold text-white">Loading Schedule Data</h2>
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
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Data</h2>
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
          <h2 className="text-2xl font-bold text-white mb-4">No Schedule Data</h2>
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
  const holidayStatus = getHolidayStatus();

    const generatePDF = () => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Kochi Metro - Optimized Schedule', 105, 15, { align: 'center' });
  
  // Date and Info
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Service Date: ${selectedDate}`, 14, 25);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
  
  // Timetable Info
  if (data?.timetable_info) {
    doc.text(`First Service: ${data.timetable_info.first_service} | Last Service: ${data.timetable_info.last_service}`, 14, 39);
    doc.text(`Peak Headway: ${formatHeadway(data.timetable_info.peak_headway)} | Off-Peak: ${formatHeadway(data.timetable_info.off_peak_headway)}`, 14, 46);
  }
  
  // Summary Stats
  const summaryY = 55;
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Trains Scheduled: ${data?.total_trains_scheduled || 0}`, 14, summaryY);
  doc.text(`Standby Trains: ${data?.total_standby_trains || 0}`, 60, summaryY);
  doc.text(`Shunting Operations: ${data?.shunting_operations_required || 0}`, 110, summaryY);
  doc.text(`Solver Status: ${data?.solver_status || 'N/A'}`, 160, summaryY);
  
  // Schedule Table
  const tableColumn = ["Slot", "Train ID", "Bay", "Position", "Departure", "Readiness", "Status"];
  const tableRows: any[] = [];
  
  sortedAssignments.forEach((train) => {
    const trainData = [
      train.departure_slot,
      train.departure_order,
      train.train_id,
      train.bay,
      train.bay_position || '-',
      train.departure_time || '-',
      `${train.readiness}%`,
      train.needs_shunting ? 'Shunting Required' : (train.is_priority_slot ? 'Priority' : 'Regular')
    ];
    tableRows.push(trainData);
  });
  
    autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 65,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 15 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
      6: { cellWidth: 20 },
      7: { cellWidth: 30 }
    }
  });
  // Standby Trains Section
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY < 250 && data?.standby_trains && data.standby_trains.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Standby Trains', 14, finalY);
    
    const standbyColumns = ["Train ID", "Bay", "Position", "Readiness", "Status"];
    const standbyRows: any[] = [];
    
    data.standby_trains.forEach((train) => {
      const standbyData = [
        train.train_id,
        train.bay,
        train.bay_position,
        `${train.readiness}%`,
        train.status
      ];
      standbyRows.push(standbyData);
    });
    
    autoTable(doc, {
      head: [standbyColumns],
      body: standbyRows,
      startY: finalY + 15,
      theme: 'grid',
      headStyles: {
        fillColor: [139, 92, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      }
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text('Kochi Metro Rail - Automated Scheduling System', 105, 295, { align: 'center' });
  }
  
  return doc;
};

const downloadPDF = () => {
  const doc = generatePDF();
  doc.save(`kochi-metro-schedule-${selectedDate}.pdf`);
};

const shareViaWhatsApp = () => {
  const doc = generatePDF();
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  // Create shareable message
  const message = `Kochi Metro Schedule for ${selectedDate}\n\n` +
    `• ${data?.total_trains_scheduled || 0} trains scheduled\n` +
    `• ${data?.total_standby_trains || 0} standby trains available\n` +
    `• ${data?.shunting_operations_required || 0} shunting operations required\n` +
    `• Solver status: ${data?.solver_status || 'N/A'}\n\n` +
    `Schedule attached as PDF.`;
  
  // Create downloadable link
  const link = document.createElement('a');
  link.href = pdfUrl;
  link.download = `kochi-metro-schedule-${selectedDate}.pdf`;
  
  // For WhatsApp sharing, we can't directly attach the PDF, but we can provide the download link
  // In a real app, you'd upload the PDF to a server and share that URL
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  
  // Also trigger download
  link.click();
  URL.revokeObjectURL(pdfUrl);
};

const shareSchedule = () => {
  if (navigator.share) {
    // Use Web Share API if available
    const doc = generatePDF();
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `kochi-metro-schedule-${selectedDate}.pdf`, { 
      type: 'application/pdf' 
    });
    
    navigator.share({
      title: `Kochi Metro Schedule - ${selectedDate}`,
      text: `Kochi Metro optimized schedule for ${selectedDate}. ${data?.total_trains_scheduled || 0} trains scheduled.`,
      files: [pdfFile]
    }).catch((error) => {
      console.log('Web Share failed, falling back to WhatsApp:', error);
      shareViaWhatsApp();
    });
  } else {
    // Fallback to WhatsApp
    shareViaWhatsApp();
  }
};
const saveToServer = async () => {
    try {
      const doc = generatePDF();
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], 'kochi-metro-schedule.pdf', { type: 'application/pdf' });

      const form = new FormData();
      form.append('file', pdfFile);

      const res = await fetch('http://localhost:5005/save-schedule-pdf', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: 'Save failed' }));
        throw new Error(e.detail || 'Failed to save PDF on server');
      }

      alert('PDF saved on server at backend/app/data/kochi-metro-schedule.pdf');
    } catch (err) {
      console.error('Save to server failed', err);
      alert(err instanceof Error ? err.message : 'Failed to save PDF to server');
    }
  };

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
    <div className="max-w-[1800px] mx-auto space-y-6">

      {/* Clean Header */}
      <div className="bg-slate-800/50 border-0 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Title Section */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
              Train Schedule Optimization
            </span>
          </h1>
              <p className="text-sm text-slate-400 mt-0.5">AI-powered scheduling system</p>
            </div>
          </div>
          
          {/* Status & Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${data.solver_status === 'OPTIMAL' ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className="text-sm font-medium text-slate-200">{data.solver_status}</span>
            </div>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 text-slate-200 rounded-lg px-4 py-2 text-sm border border-slate-700 focus:outline-none focus:border-teal-500 transition-colors"
            />
            
            
            
            <button
              onClick={() => router.push("/rotation")}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Delays
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Sidebar - Stats & Quick Info */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Trains Scheduled */}
            <div className="bg-slate-800/50 border-0 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">SCHEDULED</div>
                  <div className="text-2xl font-bold text-white">{data.total_trains_scheduled || assignments.length}</div>
                  <div className="text-slate-500 text-sm">Active Service</div>
                </div>
                <div className="p-2 bg-teal-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Standby Trains */}
            <div className="bg-slate-800/50 border-0 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">STANDBY</div>
                  <div className="text-2xl font-bold text-white">{data.total_standby_trains || 0}</div>
                  <div className="text-slate-500 text-sm">Ready on Call</div>
                </div>
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Timetable Quick Info */}
          {data.timetable_info && (
            <div className="bg-slate-800/50 border-0 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-teal-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Timetable Info
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">First Service:</span>
                  <span className="text-teal-400 font-medium">{data.timetable_info.first_service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Service:</span>
                  <span className="text-teal-400 font-medium">{data.timetable_info.last_service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Peak Headway:</span>
                  <span className="text-emerald-400 font-medium">{formatHeadway(data.timetable_info.peak_headway)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Off-Peak:</span>
                  <span className="text-orange-400 font-medium">{formatHeadway(data.timetable_info.off_peak_headway)}</span>
                </div>
              </div>
              <button
                onClick={fetchTimetableData}
                className="w-full mt-3 px-3 py-1.5 text-xs bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 rounded-lg transition-colors border border-slate-700"
              >
                View Full Details
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-4">
            {/* What-If Analysis */}
            <div className="bg-slate-800/50 border-0 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-purple-400 mb-3">What-If Analysis</h3>
              <button
                onClick={openWhatIfPanel}
                className="w-full p-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg border border-purple-500/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-sm">Scenario Testing</span>
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Manual Override */}
            <div className="bg-slate-800/50 border-0 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3">Manual Override</h3>
              <button
                onClick={openOverridePanel}
                className="w-full p-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg border border-emerald-500/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="text-sm">Expert Override</span>
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Schedule Table */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          
          {/* Shunting Operations Warning */}
          {data.trains_requiring_shunting && data.trains_requiring_shunting.length > 0 && (
            <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded-r-lg">
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

          {/* Suggested Overrides */}
          {suggestedOverrides.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-teal-400 flex items-center gap-2">
                  <span>🧠</span>
                  AI Suggested Overrides
                </h2>
                <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                  {suggestedOverrides.length} suggestions
                </span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {suggestedOverrides.map((suggestion, index) => (
                  <div key={index} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 transition-all hover:border-teal-500/40">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-teal-400">
                          {suggestion.from_train} → {suggestion.to_train}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            suggestion.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-300' :
                            suggestion.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-slate-500/20 text-slate-300'
                          }`}>
                            {suggestion.confidence || 'medium'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedScheduledTrain(suggestion.from_train);
                          setSelectedStandbyTrain(suggestion.to_train);
                          setShowOverride(true);
                        }}
                        className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white text-xs rounded transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">{suggestion.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Schedule Table */}
          <div className="bg-slate-800/50 border-0 rounded-xl p-4">
            {/* Table Header */}
<div className="bg-slate-800/50 border-0 rounded-xl p-4">
  <div className="flex justify-between items-center">
    <div>
      <h2 className="text-xl font-bold text-teal-400">Optimized Schedule</h2>
      <p className="text-sm text-slate-400 mt-1">
        {sortedAssignments.length} trains scheduled • AI-optimized assignments
      </p>
    </div>
    <div className="flex gap-3">
      <button
        onClick={downloadPDF}
        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
      </button>
      <button
        onClick={shareSchedule}
        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>
      <button
                      onClick={saveToServer}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 5v12" />
                      </svg>
                      Save to Server
                    </button>
    </div>
  </div>
</div>
            
            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Slot</th>
                    
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Train ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Departure</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Readiness</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {sortedAssignments.map((train, index) => (
                    <tr key={train.train_id} className="hover:bg-slate-700/30 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center justify-center px-3 py-1.5 bg-teal-500/20 border border-teal-500/40 rounded-lg">
                          <span className="text-sm font-bold text-teal-300">{train.departure_slot}</span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{train.train_id}</div>
                        {train.readiness_summary && (
                          <div className="text-xs text-slate-400 mt-1 max-w-xs truncate" title={train.readiness_summary}>
                            {train.readiness_summary}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{train.bay}</div>
                        {train.bay_position && (
                          <div className="text-xs text-slate-400">Position: {train.bay_position}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{train.departure_time || '-'}</div>
                        <div className="text-xs text-slate-500">Slot #{train.departure_slot}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getReadinessIcon(train.readiness)}</span>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-lg ${getReadinessColor(train.readiness)}`}>
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
                            <span className="text-slate-500 text-xs">Regular</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sortedAssignments.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚂</div>
                <h3 className="text-xl font-semibold text-slate-300 mb-2">No Trains Scheduled</h3>
                <p className="text-slate-500">No optimized train assignments available for this date.</p>
              </div>
            )}
          </div>

          {/* Standby Trains Summary */}
          {data.standby_trains && data.standby_trains.length > 0 && (
            <div className="bg-slate-800/50 border-0 rounded-xl p-4">
              <h2 className="text-xl font-bold text-teal-400 mb-4">Standby Trains ({data.standby_trains.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.standby_trains.slice(0, 6).map((train) => (
                  <div key={train.train_id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-white">{train.train_id}</div>
                      <span className={`px-3 py-1.5 rounded text-xs font-bold border shadow-lg ${getReadinessColor(train.readiness)}`}>
                        {train.readiness}%
                      </span>
                    </div>
                    <div className="text-sm text-slate-400 mb-2">{train.bay} • Position {train.bay_position}</div>
                    <div className="text-xs text-slate-500 truncate" title={train.readiness_summary}>
                      {train.readiness_summary}
                    </div>
                  </div>
                ))}
              </div>
              {data.standby_trains.length > 6 && (
                <div className="mt-4 text-center">
                  <span className="text-sm text-slate-400">
                    Showing 6 of {data.standby_trains.length} standby trains
                  </span>
                </div>
              )}
            </div>
          )}

        </div> {/* End Main Content */}
      </div> {/* End Grid Layout */}


        {/* What-If Analysis Panel - UPDATED */}
  {showWhatIf && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white">Train Swap Analysis</h3>
              <p className="text-gray-400 mt-1">Compare standby trains with scheduled trains</p>
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
                <h4 className="text-lg font-semibold text-gray-200">Standby Trains</h4>
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
                    const issueCount = (train.readiness_summary?.match(/needs|poor|critical|overdue|required|attention|maintenance/gi) || []).length;
                    
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
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div className="text-xl">
                              {readinessScore >= 95 ? '🟢' : 
                               readinessScore >= 85 ? '🟡' : 
                               readinessScore >= 70 ? '🟠' : '🔴'}
                            </div>
                            <div>
                              <div className="font-bold text-lg text-white">{train.train_id}</div>
                              <div className="text-sm text-gray-400">
                                {train.bay} • Position {train.bay_position}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`px-3 py-1 rounded-lg text-lg font-bold border ${getReadinessColor(readinessScore)}`}>
                              {readinessScore}%
                            </div>
                            {issueCount > 0 && (
                              <div className="text-xs text-orange-400 mt-1">
                                {issueCount} issue{issueCount !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-300 mb-2 line-clamp-2" title={train.readiness_summary}>
                          {train.readiness_summary || 'Ready for service'}
                        </div>
                        
                        {train.readiness_details && (
                          <div className="flex gap-1 flex-wrap">
                            {Object.entries(train.readiness_details).slice(0, 3).map(([key, value]) => {
                              const isIssue = typeof value === 'string' && 
                                (value.toLowerCase().includes('needs') || 
                                 value.toLowerCase().includes('poor') ||
                                 value.toLowerCase().includes('attention') ||
                                 value.toLowerCase().includes('critical'));
                              
                              return (
                                <span
                                  key={key}
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    isIssue 
                                      ? 'bg-red-900/30 text-red-300 border border-red-700'
                                      : 'bg-emerald-900/30 text-emerald-300 border border-emerald-700'
                                  }`}
                                >
                                  {key}: {typeof value === 'string' ? value : 'OK'}
                                </span>
                              );
                            })}
                            {Object.keys(train.readiness_details).length > 3 && (
                              <span className="text-xs text-gray-500 px-2 py-0.5">
                                +{Object.keys(train.readiness_details).length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {standbyTrains.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-6xl mb-4">🚂</div>
                      <h4 className="text-lg font-medium text-gray-300 mb-2">No Standby Trains</h4>
                      <p className="text-sm">All trains are scheduled for service</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scheduled Trains */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-200">Scheduled Trains</h4>
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
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">🚄</div>
                        <div>
                          <div className="font-bold text-lg text-white">{train.train_id}</div>
                          <div className="text-sm text-gray-400">
                            Slot {train.departure_slot} • Bay {train.bay}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-lg text-lg font-bold border ${getReadinessColor(train.readiness)}`}>
                          {train.readiness}%
                        </div>
                        {train.needs_shunting && (
                          <div className="text-xs text-orange-400 mt-1">Shunting required</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-400">
                        Position {train.bay_position} • Departure #{train.departure_order}
                      </div>
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
                  'Analyze Swap'
                )}
              </button>
            </div>

            {selectedScheduledTrain && selectedStandbyTrain && (
              <div className="p-3 bg-teal-900/20 border border-teal-700 rounded-lg">
                <h5 className="font-semibold text-teal-300 mb-1">Selected swap:</h5>
                <p className="text-teal-200 text-sm">
                  Replace <strong>{selectedScheduledTrain}</strong> with <strong>{selectedStandbyTrain}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Swap Analysis Results Modal - UPDATED */}
  {showSwapAnalysis && swapAnalysis && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white">Swap Analysis</h3>
              <p className="text-gray-400 mt-1">
                {swapAnalysis?.swap_scenario?.from_train || 'N/A'} → {swapAnalysis?.swap_scenario?.to_train || 'N/A'}
              </p>
            </div>
            <button
              onClick={() => setShowSwapAnalysis(false)}
              className="text-gray-400 hover:text-gray-200 text-2xl p-2 hover:bg-gray-700 rounded-lg"
            >
              ✕
            </button>
          </div>

          {swapAnalysis.status === 'success' ? (
  <div className="space-y-6">
    {/* Recommendation Card */}
    <div className={`p-4 rounded-lg border ${getRecommendationColor(swapAnalysis?.recommendation?.decision || 'UNKNOWN')}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {swapAnalysis.recommendation.decision === 'ACCEPTED' ? '✅' :
                         swapAnalysis.recommendation.decision === 'REJECTED' ? '❌' :
                         swapAnalysis.recommendation.decision === 'REVIEW_REQUIRED' ? '⚠️' : 'ℹ️'}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">
                          {swapAnalysis.recommendation.decision === 'ACCEPTED' ? 'Approve Swap' :
                           swapAnalysis.recommendation.decision === 'REJECTED' ? 'Reject Swap' :
                           swapAnalysis.recommendation.decision === 'REVIEW_REQUIRED' ? 'Review Required' : 'Neutral'}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Confidence: {swapAnalysis.recommendation.confidence}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                    <h5 className="font-medium">Key Factors:</h5>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {swapAnalysis.recommendation.reasoning.slice(0, 3).map((reason, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-700/50 text-gray-300 rounded-full text-sm"
                      >
                        {reason.replace(/[.,]$/, '')}
                      </span>
                    ))}
                    {swapAnalysis.recommendation.reasoning.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{swapAnalysis.recommendation.reasoning.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Readiness Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-600 rounded-lg p-4 bg-gray-900/30">
                  <h4 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
                    <span>Current Train</span>
                    <span className="text-teal-300">{swapAnalysis?.swap_scenario?.from_train || 'Unknown'}</span>
                  </h4>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`text-3xl font-bold ${getReadinessColor(swapAnalysis.readiness_comparison.scheduled_train.score).split(' ')[1]}`}>
                      {swapAnalysis.readiness_comparison.scheduled_train.score}%
                    </div>
                    <div className="text-sm text-gray-400">
                      {swapAnalysis.swap_scenario.departure_time || 'No slot'}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-300 mb-3 line-clamp-2">
                    {swapAnalysis.readiness_comparison.scheduled_train.summary}
                  </div>
                  
                  <div className="space-y-2">
                    {Object.entries(swapAnalysis.readiness_comparison.scheduled_train.details).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className={`px-2 py-0.5 rounded ${typeof value === 'string' && value.toLowerCase().includes('needs') ? 'bg-red-900/30 text-red-300' : 'bg-emerald-900/30 text-emerald-300'}`}>
                          {typeof value === 'string' ? value : 'OK'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-600 rounded-lg p-4 bg-gray-900/30">
                  <h4 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
                    <span>Standby Train</span>
                    <span className="text-purple-300">{swapAnalysis.swap_scenario.to_train}</span>
                  </h4>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`text-3xl font-bold ${getReadinessColor(swapAnalysis.readiness_comparison.standby_train.score).split(' ')[1]}`}>
                      {swapAnalysis.readiness_comparison.standby_train.score}%
                    </div>
                    <div className="text-sm text-gray-400">
                      Bay {swapAnalysis.swap_scenario.bay || 'Unknown'}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-300 mb-3 line-clamp-2">
                    {swapAnalysis.readiness_comparison.standby_train.summary}
                  </div>
                  
                  <div className="space-y-2">
                    {Object.entries(swapAnalysis.readiness_comparison.standby_train.details).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className={`px-2 py-0.5 rounded ${typeof value === 'string' && value.toLowerCase().includes('needs') ? 'bg-red-900/30 text-red-300' : 'bg-emerald-900/30 text-emerald-300'}`}>
                          {typeof value === 'string' ? value : 'OK'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-700">
                  <div className="text-2xl font-bold text-emerald-400">
                    {swapAnalysis.impact_analysis.readiness_score_change > 0 ? '+' : ''}{swapAnalysis.impact_analysis.readiness_score_change}%
                  </div>
                  <div className="text-sm text-gray-400">Readiness Change</div>
                </div>
                
                <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-700">
                  <div className="text-2xl font-bold text-orange-400">
                    {swapAnalysis.impact_analysis.estimated_shunting_moves || 0}
                  </div>
                  <div className="text-sm text-gray-400">Shunting Moves</div>
                </div>
                
                <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-700">
                  <div className={`text-2xl font-bold ${getRiskLevelColor(swapAnalysis.impact_analysis.risk_level).includes('bg-red') ? 'text-red-400' : 'text-yellow-400'}`}>
                    {swapAnalysis.impact_analysis.risk_level}
                  </div>
                  <div className="text-sm text-gray-400">Risk Level</div>
                </div>
                
                <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-700">
                  <div className="text-2xl font-bold text-gray-300">
                    {swapAnalysis.impact_analysis.is_peak_hour ? 'Peak' : 'Off-peak'}
                  </div>
                  <div className="text-sm text-gray-400">Time Period</div>
                </div>
              </div>

              {/* AI Analysis - Collapsible Section */}
<div className="border border-gray-700 rounded-lg overflow-hidden">
  <button
    onClick={() => setShowAIAnalysis(!showAIAnalysis)}
    className="w-full p-4 bg-gray-900/50 flex justify-between items-center hover:bg-gray-800/50 transition-colors"
  >
    <h4 className="font-semibold text-gray-200">AI Analysis</h4>
    <div className="text-gray-400">
      {showAIAnalysis ? '▲' : '▼'}
    </div>
  </button>
  
  {showAIAnalysis && (
    <div className="p-4 space-y-4">
      {/* Simplified Analysis Summary */}
      <div className="text-sm text-gray-300 bg-gray-900/30 p-4 rounded-lg">
        <p className="mb-3">
          {swapAnalysis.ai_analysis.detailed_analysis && swapAnalysis.ai_analysis.detailed_analysis.length > 300 
            ? swapAnalysis.ai_analysis.detailed_analysis.substring(0, 300) + '...'
            : swapAnalysis.ai_analysis.detailed_analysis}
        </p>
        
        {/* Safety Warnings */}
        {swapAnalysis.ai_analysis.safety_risks && swapAnalysis.ai_analysis.safety_risks.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400">⚠️</span>
              <span className="font-medium text-red-400">Safety Warnings:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {swapAnalysis.ai_analysis.safety_risks.slice(0, 3).map((risk, index) => (
                <span key={index} className="px-3 py-1 bg-red-900/20 text-red-300 rounded-full text-xs">
                  {risk}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Operational Notes */}
        {swapAnalysis.ai_analysis.operational_risks && swapAnalysis.ai_analysis.operational_risks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-400">⚙️</span>
              <span className="font-medium text-orange-400">Operational Notes:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {swapAnalysis.ai_analysis.operational_risks.slice(0, 3).map((risk, index) => (
                <span key={index} className="px-3 py-1 bg-orange-900/20 text-orange-300 rounded-full text-xs">
                  {risk}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Critical Concerns & Mitigation - Collapsible if too many */}
      {((swapAnalysis.ai_analysis.critical_concerns && swapAnalysis.ai_analysis.critical_concerns.length > 0) || 
        (swapAnalysis.ai_analysis.mitigation_strategies && swapAnalysis.ai_analysis.mitigation_strategies.length > 0)) && (
        <div className="space-y-4">
          {swapAnalysis.ai_analysis.critical_concerns && swapAnalysis.ai_analysis.critical_concerns.length > 0 && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <h4 className="font-semibold text-red-300 mb-2">Critical Issues</h4>
              <ul className="space-y-1 text-sm text-red-200">
                {swapAnalysis.ai_analysis.critical_concerns.slice(0, 3).map((concern, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{concern}</span>
                  </li>
                ))}
                {swapAnalysis.ai_analysis.critical_concerns.length > 3 && (
                  <li className="text-xs text-gray-400">
                    +{swapAnalysis.ai_analysis.critical_concerns.length - 3} more concerns
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {swapAnalysis.ai_analysis.mitigation_strategies && swapAnalysis.ai_analysis.mitigation_strategies.length > 0 && (
            <div className="bg-teal-900/20 border border-teal-700 rounded-lg p-4">
              <h4 className="font-semibold text-teal-300 mb-2">Recommended Actions</h4>
              <ul className="space-y-1 text-sm text-teal-200">
                {swapAnalysis.ai_analysis.mitigation_strategies.slice(0, 3).map((strategy, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{strategy}</span>
                  </li>
                ))}
                {swapAnalysis.ai_analysis.mitigation_strategies.length > 3 && (
                  <li className="text-xs text-gray-400">
                    +{swapAnalysis.ai_analysis.mitigation_strategies.length - 3} more actions
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )}
</div>
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

        {/* Timetable Modal */}
        {showTimetable && timetableData && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-96 overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Detailed Timetable Information</h3>
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
                <h3 className="text-2xl font-bold text-white">Override Schedule</h3>
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
                          <div className="text-white font-medium">{t.train_id}</div>
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
                          <div className="text-white font-medium">{t.train_id}</div>
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
                  className="w-full bg-gray-900 border border-gray-700 rounded-md text-white p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-emerald-600"></textarea>
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