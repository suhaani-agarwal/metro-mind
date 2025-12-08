'use client';

import { useState, useEffect } from 'react';
import { Activity, Radio, Zap, AlertTriangle, CheckCircle, TrendingUp, LucideIcon } from 'lucide-react';

interface Train {
  id: string;
  position: string;
  slot: number;
  time: string;
  speed: number;
  targetSpeed: number;
  condition: 'excellent' | 'good' | 'moderate';
  urgency: number;
  ma: number;
  nextTrain: string | null;
  distance: number | null;
  priority: boolean;
}

interface Stats {
  activeTrains: number;
  avgHeadway: number;
  systemEfficiency: number;
  optimizationsSec: number;
}

interface SpeedStatus {
  color: string;
  icon: LucideIcon;
}

export default function CBTCIntegration() {
  const [trains, setTrains] = useState<Train[]>([
    { id: 'TM010', position: 'PT02', slot: 1, time: '07:30', speed: 28, targetSpeed: 30, condition: 'excellent', urgency: 2, ma: 850, nextTrain: 'TM014', distance: 2100, priority: true },
    { id: 'TM014', position: 'PT06', slot: 2, time: '07:40', speed: 26, targetSpeed: 28, condition: 'excellent', urgency: 1, ma: 920, nextTrain: 'TM021', distance: 2300, priority: true },
    { id: 'TM021', position: 'PT01', slot: 3, time: '07:50', speed: 27, targetSpeed: 29, condition: 'excellent', urgency: 0, ma: 880, nextTrain: 'TM019', distance: 1950, priority: true },
    { id: 'TM019', position: 'PT03', slot: 4, time: '08:00', speed: 25, targetSpeed: 27, condition: 'excellent', urgency: 0, ma: 900, nextTrain: 'TM013', distance: 2050, priority: false },
    { id: 'TM013', position: 'PT05', slot: 5, time: '08:10', speed: 24, targetSpeed: 26, condition: 'excellent', urgency: 0, ma: 875, nextTrain: 'TM009', distance: 2100, priority: false },
    { id: 'TM009', position: 'PT04', slot: 6, time: '08:20', speed: 23, targetSpeed: 25, condition: 'excellent', urgency: 0, ma: 890, nextTrain: 'TM023', distance: 2200, priority: false },
    { id: 'TM023', position: 'PT07', slot: 7, time: '08:30', speed: 22, targetSpeed: 24, condition: 'good', urgency: 0, ma: 820, nextTrain: 'TM020', distance: 1850, priority: false },
    { id: 'TM020', position: 'PT10', slot: 8, time: '08:40', speed: 21, targetSpeed: 23, condition: 'moderate', urgency: 0, ma: 780, nextTrain: 'TM001', distance: 1900, priority: false },
    { id: 'TM001', position: 'PT08', slot: 9, time: '08:50', speed: 20, targetSpeed: 22, condition: 'moderate', urgency: 0, ma: 790, nextTrain: 'TM008', distance: 1950, priority: false },
    { id: 'TM008', position: 'PT09', slot: 10, time: '09:00', speed: 19, targetSpeed: 21, condition: 'moderate', urgency: 0, ma: 770, nextTrain: null, distance: null, priority: false },
  ]);

  const [stats, setStats] = useState<Stats>({
    activeTrains: 10,
    avgHeadway: 2.1,
    systemEfficiency: 94.2,
    optimizationsSec: 847
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTrains(prev => prev.map(train => ({
        ...train,
        speed: Math.max(45, Math.min(70, train.speed + (Math.random() - 0.5) * 3)),
        targetSpeed: Math.max(50, Math.min(70, train.targetSpeed + (Math.random() - 0.5) * 2)),
        ma: Math.max(700, Math.min(1000, train.ma + (Math.random() - 0.5) * 40)),
        distance: train.distance ? Math.max(1500, Math.min(2500, train.distance + (Math.random() - 0.5) * 100)) : null
      })));

      setStats(prev => ({
        ...prev,
        avgHeadway: Math.max(1.8, Math.min(2.5, prev.avgHeadway + (Math.random() - 0.5) * 0.1)),
        systemEfficiency: Math.max(92, Math.min(96, prev.systemEfficiency + (Math.random() - 0.5) * 0.5)),
        optimizationsSec: prev.optimizationsSec + Math.floor(Math.random() * 3)
      }));
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const getConditionColor = (condition: Train['condition']): string => {
    switch(condition) {
      case 'excellent': return 'text-emerald-400';
      case 'good': return 'text-blue-400';
      case 'moderate': return 'text-amber-400';
      default: return 'text-gray-400';
    }
  };

  const getSpeedStatus = (speed: number, target: number): SpeedStatus => {
    const diff = ((speed - target) / target) * 100;
    if (Math.abs(diff) < 3) return { color: 'text-emerald-400', icon: CheckCircle };
    if (diff < -5) return { color: 'text-amber-400', icon: TrendingUp };
    return { color: 'text-blue-400', icon: Activity };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent mb-2">
              CBTC Integration System
            </h1>
            <p className="text-gray-400">AI-Powered Communication-Based Train Control</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-400 font-semibold">LIVE</span>
          </div>
        </div>

        {/* AI Status Banner */}
        <div className="bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-teal-900/30 border border-purple-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="font-semibold text-purple-300">AI Speed Optimization Active</div>
              <div className="text-sm text-gray-400">Moving block technology • Real-time position tracking • Dynamic movement authority calculation</div>
            </div>
          </div>
        </div>

        {/* Train List */}
        <div className="space-y-3">
          {trains.map((train, idx) => {
            const speedStatus = getSpeedStatus(train.speed, train.targetSpeed);
            const StatusIcon = speedStatus.icon;
            
            return (
              <div key={train.id} className={`bg-slate-800/50 backdrop-blur border ${train.priority ? 'border-teal-500/50' : 'border-slate-700/50'} rounded-lg p-4 hover:border-teal-500/70 transition-all`}>
                <div className="flex items-center gap-4">
                  {/* Train Number */}
                  <div className="w-16 h-16 bg-slate-700/50 rounded-lg flex items-center justify-center border border-slate-600/50">
                    <span className="text-xl font-bold text-teal-400">{idx + 1}</span>
                  </div>

                  {/* Train Info */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
                    {/* ID & Position */}
                    <div>
                      <div className="text-lg font-bold text-white">{train.id}</div>
                      <div className="text-sm text-gray-400">{train.position} • Slot #{train.slot}</div>
                      <div className="text-xs text-gray-500">{train.time}</div>
                    </div>

                    {/* Speed */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Current Speed</div>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${speedStatus.color}`} />
                        <span className="text-xl font-bold text-white">{train.speed.toFixed(0)}</span>
                        <span className="text-gray-400 text-sm">km/h</span>
                      </div>
                    </div>

                    {/* Target Speed */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Target Speed</div>
                      <div className="text-xl font-bold text-teal-400">{train.targetSpeed.toFixed(0)}</div>
                      <div className="text-xs text-gray-500">AI Optimized</div>
                    </div>

                    {/* Movement Authority */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Movement Authority</div>
                      <div className="text-lg font-bold text-purple-400">{train.ma}m</div>
                      <div className="text-xs text-gray-500">Dynamic Block</div>
                    </div>

                    {/* Distance to Next */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Distance to Next</div>
                      {train.nextTrain ? (
                        <>
                          <div className="text-lg font-bold text-blue-400">{train.distance}m</div>
                          <div className="text-xs text-gray-500">{train.nextTrain}</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">Last train</div>
                      )}
                    </div>

                    {/* Condition */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Train Condition</div>
                      <div className={`text-sm font-semibold ${getConditionColor(train.condition)} capitalize`}>
                        {train.condition}
                      </div>
                      {train.urgency > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-pink-400" />
                          <span className="text-xs text-pink-400">Urgency {train.urgency}</span>
                        </div>
                      )}
                      {train.priority && (
                        <div className="text-xs text-teal-400 mt-1">Priority Slot</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Speed Bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-slate-700/30 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${(train.speed / 70) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 w-16 text-right">
                    {((train.speed / train.targetSpeed) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
            <div className="font-semibold text-teal-400 mb-2">Moving Block Technology</div>
            <div className="text-gray-400">Safety distance dynamically adjusts based on speed, braking capacity, and real-time conditions</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
            <div className="font-semibold text-purple-400 mb-2">AI Optimization</div>
            <div className="text-gray-400">Continuously calculates optimal speed profiles considering station approaches, curves, and train separation</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
            <div className="font-semibold text-blue-400 mb-2">Real-Time Control</div>
            <div className="text-gray-400">Position and speed updates multiple times per second with automatic safety enforcement</div>
          </div>
        </div>
      </div>
    </div>
  );
}