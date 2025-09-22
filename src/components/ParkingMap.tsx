import React, { useState, useEffect, useRef } from 'react';
import { ParkingAssignment } from './types';

type DepotLayoutType = {
  ibl_bays?: string[];
  parking_tracks?: Array<{ id?: string; capacity?: number }>;
  connections?: Record<string, string[]>;
  exit_points?: string[];
};

type Props = {
  assignments: ParkingAssignment[];
  depotLayout?: DepotLayoutType;
  selected?: string | null;
  onSelect?: (trainId: string | null) => void;
};

const styles = {
  train: {
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  selected: {
    filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.8))',
    transform: 'scale(1.1)',
  },
  mainSpine: {
    strokeLinecap: 'round' as const,
  },
  iblTrack: {
    strokeLinecap: 'round' as const,
  },
  parkingTrack: {
    strokeLinecap: 'round' as const,
  },
  exitPoint: {
    filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))',
  },
  shuntingPath: {
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
};

export default function ParkingMap({ assignments, depotLayout, selected, onSelect }: Props) {
  const [animatedPath, setAnimatedPath] = useState<string[]>([]);
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const intervalRef = useRef<number | null>(null);
  
  // Map train -> assignment
  const assignMap: Record<string, ParkingAssignment> = {};
  assignments.forEach(a => { assignMap[a.train_id] = a; });

  // Get selected train details
  const selectedAssignment = selected ? assignMap[selected] : null;

  // Enhanced animation with smooth path following
  useEffect(() => {
    setAnimatedPath([]);
    setAnimationStep(0);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (selectedAssignment && selectedAssignment.shunting_path && isAnimating) {
      let step = 0;
      const path = selectedAssignment.shunting_path;
      intervalRef.current = window.setInterval(() => {
        if (step < path.length) {
          setAnimatedPath(prev => [...prev, path[step]]);
          setAnimationStep(step + 1);
          step += 1;
        } else {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsAnimating(false);
        }
      }, Math.max(150, 600 / simulationSpeed));
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selected, selectedAssignment, simulationSpeed, isAnimating]);

  // Enhanced depot layout with realistic proportions
  const svgW = 1200;
  const svgH = 600;
  
  // Main spine running horizontally through center
  const spineY = svgH / 2;
  const spineStartX = 100;
  const spineEndX = svgW - 100;
  
  // IBL maintenance bays (top section) - 5 parallel tracks
  const iblBays = depotLayout?.ibl_bays || ['IBL01', 'IBL02', 'IBL03', 'IBL04', 'IBL05'];
  const iblY = 120;
  const iblSpacing = 180;
  const iblPositions: Record<string, { x: number, y: number }> = {};
  iblBays.forEach((bay, i) => {
    iblPositions[bay] = { 
      x: spineStartX + 200 + (i * iblSpacing), 
      y: iblY 
    };
  });

  // Parking tracks (bottom section) - 12 tracks in 2 rows
  const parkingTracks = depotLayout?.parking_tracks || [
    { id: 'PT01', capacity: 2 }, { id: 'PT02', capacity: 2 }, 
    { id: 'PT03', capacity: 2 }, { id: 'PT04', capacity: 2 },
    { id: 'PT05', capacity: 2 }, { id: 'PT06', capacity: 2 },
    { id: 'PT07', capacity: 2 }, { id: 'PT08', capacity: 2 },
    { id: 'PT09', capacity: 2 }, { id: 'PT10', capacity: 2 },
    { id: 'PT11', capacity: 2 }, { id: 'PT12', capacity: 2 }
  ];
  
  const trackPositions: Record<string, { x: number, y: number }> = {};
  parkingTracks.forEach((track, i) => {
    const row = Math.floor(i / 6);
    const col = i % 6;
    trackPositions[track.id || ''] = { 
      x: spineStartX + 200 + (col * 150), 
      y: spineY + 100 + (row * 60)
    };
  });

  // Entry/Exit points
  const exitPositions: Record<string, { x: number, y: number }> = {
    'ENTRY': { x: spineStartX, y: spineY },
    'EXIT01': { x: spineEndX, y: spineY - 40 },
    'EXIT02': { x: spineEndX, y: spineY + 40 },
    'MAIN': { x: spineStartX + 100, y: spineY }
  };

  // Junction points for realistic routing
  const junctionPositions: Record<string, { x: number, y: number }> = {
    'JCT_IBL': { x: spineStartX + 150, y: spineY },
    'JCT_PARK': { x: spineStartX + 150, y: spineY },
    'JCT_EXIT': { x: spineEndX - 100, y: spineY }
  };

  // Track routing algorithm - finds path through actual track connections
  const findTrackPath = (startNode: string, endNode: string): Array<{x: number, y: number}> => {
    const allPositions = { ...iblPositions, ...trackPositions, ...exitPositions, ...junctionPositions };
    
    const startPos = allPositions[startNode];
    const endPos = allPositions[endNode];
    
    if (!startPos || !endPos) return [];
    
    // Define track connectivity based on our layout
    const getRouteWaypoints = (start: string, end: string): string[] => {
      const route: string[] = [start];
      
      // IBL to Parking: IBL -> JCT_IBL -> JCT_PARK -> Parking
      if (iblBays.includes(start) && parkingTracks.find(p => p.id === end)) {
        route.push('JCT_IBL', 'JCT_PARK', end);
      }
      // Parking to IBL: Parking -> JCT_PARK -> JCT_IBL -> IBL
      else if (parkingTracks.find(p => p.id === start) && iblBays.includes(end)) {
        route.push('JCT_PARK', 'JCT_IBL', end);
      }
      // IBL to Exit: IBL -> JCT_IBL -> JCT_EXIT -> Exit
      else if (iblBays.includes(start) && Object.keys(exitPositions).includes(end)) {
        route.push('JCT_IBL', 'JCT_EXIT', end);
      }
      // Entry to IBL: Entry -> JCT_IBL -> IBL
      else if (Object.keys(exitPositions).includes(start) && iblBays.includes(end)) {
        route.push('JCT_IBL', end);
      }
      // Entry to Parking: Entry -> JCT_PARK -> Parking
      else if (Object.keys(exitPositions).includes(start) && parkingTracks.find(p => p.id === end)) {
        route.push('JCT_PARK', end);
      }
      // Parking to Exit: Parking -> JCT_PARK -> JCT_EXIT -> Exit
      else if (parkingTracks.find(p => p.id === start) && Object.keys(exitPositions).includes(end)) {
        route.push('JCT_PARK', 'JCT_EXIT', end);
      }
      // Same type movements
      else if (start !== end) {
        if (iblBays.includes(start) && iblBays.includes(end)) {
          route.push('JCT_IBL', end);
        } else if (parkingTracks.find(p => p.id === start) && parkingTracks.find(p => p.id === end)) {
          route.push('JCT_PARK', end);
        } else {
          route.push(end);
        }
      }
      
      return route;
    };
    
    const waypoints = getRouteWaypoints(startNode, endNode);
    return waypoints.map(node => allPositions[node]).filter(Boolean);
  };

  // Render realistic track infrastructure
  const renderTracks = () => {
    return (
      <>
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(100,150,255,0.1)" strokeWidth="0.5"/>
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="trackGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{stopColor:"#4a5568", stopOpacity:1}} />
            <stop offset="50%" style={{stopColor:"#718096", stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:"#4a5568", stopOpacity:1}} />
          </linearGradient>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3"/>

        {/* Main spine track */}
        <g style={styles.mainSpine}>
          <line 
            x1={spineStartX} y1={spineY} 
            x2={spineEndX} y2={spineY} 
            stroke="url(#trackGradient)" 
            strokeWidth="12"
            filter="url(#glow)"
          />
          <line 
            x1={spineStartX} y1={spineY-2} 
            x2={spineEndX} y2={spineY-2} 
            stroke="#e2e8f0" 
            strokeWidth="2"
          />
          <line 
            x1={spineStartX} y1={spineY+2} 
            x2={spineEndX} y2={spineY+2} 
            stroke="#e2e8f0" 
            strokeWidth="2"
          />
        </g>

        {/* IBL tracks with realistic connections */}
        {iblBays.map((bay, i) => {
          const pos = iblPositions[bay];
          const connectionX = spineStartX + 150;
          
          return (
            <g key={bay} style={styles.iblTrack}>
              {/* Main track */}
              <line 
                x1={pos.x - 80} y1={pos.y} 
                x2={pos.x + 80} y2={pos.y} 
                stroke="url(#trackGradient)" 
                strokeWidth="10"
                filter="url(#glow)"
              />
              
              {/* Rails */}
              <line x1={pos.x - 80} y1={pos.y-2} x2={pos.x + 80} y2={pos.y-2} stroke="#e2e8f0" strokeWidth="1.5"/>
              <line x1={pos.x - 80} y1={pos.y+2} x2={pos.x + 80} y2={pos.y+2} stroke="#e2e8f0" strokeWidth="1.5"/>
              
              {/* Sleepers */}
              {Array.from({length: 16}, (_, j) => (
                <rect 
                  key={j}
                  x={pos.x - 75 + j * 10} 
                  y={pos.y - 4} 
                  width="2" 
                  height="8"
                  fill="#4a5568"
                />
              ))}
              
              {/* Connection to spine */}
              <path 
                d={`M ${connectionX} ${spineY} Q ${connectionX + 30} ${(spineY + pos.y) / 2} ${pos.x - 80} ${pos.y}`}
                stroke="url(#trackGradient)" 
                strokeWidth="8" 
                fill="none"
                filter="url(#glow)"
              />
              
              {/* Track label with futuristic styling */}
              <g transform={`translate(${pos.x}, ${pos.y - 25})`}>
                <rect x="-20" y="-8" width="40" height="16" rx="8" fill="rgba(56,178,172,0.2)" stroke="#38b2ac" strokeWidth="1"/>
                <text 
                  textAnchor="middle" 
                  y="4"
                  fill="#38b2ac" 
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {bay}
                </text>
              </g>

              {/* Maintenance equipment indicators */}
              <circle cx={pos.x - 50} cy={pos.y - 15} r="3" fill="#38b2ac" opacity="0.7"/>
              <circle cx={pos.x + 50} cy={pos.y - 15} r="3" fill="#38b2ac" opacity="0.7"/>
            </g>
          );
        })}

        {/* Parking tracks */}
        {parkingTracks.map((track, i) => {
          const pos = trackPositions[track.id || ''];
          const connectionX = spineStartX + 150;
          
          return (
            <g key={track.id} style={styles.parkingTrack}>
              {/* Main track */}
              <line 
                x1={pos.x - 60} y1={pos.y} 
                x2={pos.x + 60} y2={pos.y} 
                stroke="url(#trackGradient)" 
                strokeWidth="8"
              />
              
              {/* Rails */}
              <line x1={pos.x - 60} y1={pos.y-1.5} x2={pos.x + 60} y2={pos.y-1.5} stroke="#e2e8f0" strokeWidth="1"/>
              <line x1={pos.x - 60} y1={pos.y+1.5} x2={pos.x + 60} y2={pos.y+1.5} stroke="#e2e8f0" strokeWidth="1"/>
              
              {/* Sleepers */}
              {Array.from({length: 12}, (_, j) => (
                <rect 
                  key={j}
                  x={pos.x - 55 + j * 10} 
                  y={pos.y - 3} 
                  width="1.5" 
                  height="6"
                  fill="#4a5568"
                />
              ))}
              
              {/* Connection to spine */}
              <path 
                d={`M ${connectionX} ${spineY} Q ${connectionX + 20} ${(spineY + pos.y) / 2} ${pos.x - 60} ${pos.y}`}
                stroke="url(#trackGradient)" 
                strokeWidth="6" 
                fill="none"
              />
              
              {/* Track label */}
              <g transform={`translate(${pos.x}, ${pos.y - 20})`}>
                <rect x="-15" y="-6" width="30" height="12" rx="6" fill="rgba(102,126,234,0.2)" stroke="#667eea" strokeWidth="1"/>
                <text 
                  textAnchor="middle" 
                  y="3"
                  fill="#667eea" 
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {track.id}
                </text>
              </g>

              {/* Position markers */}
              {[1, 2].map((position, idx) => (
                <g key={position} transform={`translate(${pos.x - 25 + (idx * 50)}, ${pos.y})`}>
                  <circle r="5" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="2"/>
                  <text textAnchor="middle" y="2" fill="#fbbf24" fontSize="8" fontWeight="bold">{position}</text>
                </g>
              ))}
            </g>
          );
        })}

        {/* Entry/Exit points with enhanced styling */}
        {Object.entries(exitPositions).map(([id, pos]) => (
          <g key={id} style={styles.exitPoint}>
            <circle
              cx={pos.x} cy={pos.y}
              r="20"
              fill="rgba(16,185,129,0.1)"
              stroke="#10b981"
              strokeWidth="2"
              filter="url(#glow)"
            />
            <circle cx={pos.x} cy={pos.y} r="12" fill="rgba(16,185,129,0.3)"/>
            <text
              x={pos.x} y={pos.y + 3}
              textAnchor="middle"
              fill="#10b981"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {id}
            </text>
            {/* Signal indicators */}
            <circle cx={pos.x + 25} cy={pos.y - 25} r="4" fill="#10b981" opacity="0.8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
            </circle>
          </g>
        ))}

        {/* Junction indicators */}
        {Object.entries(junctionPositions).map(([id, pos]) => (
          <g key={id}>
            <polygon 
              points={`${pos.x-8},${pos.y-8} ${pos.x+8},${pos.y-8} ${pos.x+8},${pos.y+8} ${pos.x-8},${pos.y+8}`}
              fill="rgba(236,72,153,0.2)" 
              stroke="#ec4899" 
              strokeWidth="1"
            />
          </g>
        ))}
      </>
    );
  };

  // Enhanced train rendering
  const renderTrains = () => {
    return assignments.map((a) => {
      let position;
      if (iblBays.includes(a.track_id)) {
        position = iblPositions[a.track_id];
      } else {
        position = trackPositions[a.track_id];
        if (position) {
          position = {
            x: position.x - 25 + ((a.position_in_track - 1) * 50),
            y: position.y
          };
        }
      }
      
      if (!position) return null;
      
      const isSelected = selected === a.train_id;
      
      return (
            <g
                key={a.train_id}
                className={`train ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect?.(isSelected ? null : a.train_id)}
                style={{cursor: 'pointer'}}
            >
          {/* Train shadow */}
          <ellipse 
            cx={position.x + 2} cy={position.y + 18} 
            rx="22" ry="6" 
            fill="rgba(0,0,0,0.3)"
          />
          
          {/* Train body with gradient */}
          <defs>
            <linearGradient id={`trainGrad-${a.train_id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isSelected ? '#fbbf24' : '#06d6a0'} />
              <stop offset="100%" stopColor={isSelected ? '#f59e0b' : '#048b5c'} />
            </linearGradient>
          </defs>
          
          <rect 
            x={position.x - 20} y={position.y - 12} 
            width={40} height={24} 
            rx="6" 
            fill={`url(#trainGrad-${a.train_id})`}
            stroke={isSelected ? '#f59e0b' : '#048b5c'} 
            strokeWidth="2"
            filter={isSelected ? "url(#glow)" : "none"}
          />
          
          {/* Train details */}
          <rect x={position.x - 16} y={position.y - 8} width={7} height={5} rx="1" fill="rgba(0,0,0,0.7)" />
          <rect x={position.x - 6} y={position.y - 8} width={7} height={5} rx="1" fill="rgba(0,0,0,0.7)" />
          <rect x={position.x + 4} y={position.y - 8} width={7} height={5} rx="1" fill="rgba(0,0,0,0.7)" />
          
          {/* Front/rear lights */}
          <circle cx={position.x - 18} cy={position.y} r="2" fill="#fbbf24"/>
          <circle cx={position.x + 18} cy={position.y} r="2" fill="#ef4444"/>
          
          {/* Train ID with background */}
          <rect 
            x={position.x - 12} y={position.y + 16} 
            width={24} height={12} 
            rx="4" 
            fill="rgba(0,0,0,0.8)"
          />
          <text 
            x={position.x} y={position.y + 24}
            textAnchor="middle"
            fill="#ffffff"
            fontWeight="bold"
            fontSize="9"
            fontFamily="monospace"
          >
            {a.train_id}
          </text>
        </g>
      );
    });
  };

  // Enhanced shunting path animation with realistic routing
  const renderShuntingPath = () => {
    if (!selectedAssignment || !selectedAssignment.shunting_path) return null;
    
    const pathNodes = selectedAssignment.shunting_path;
    if (pathNodes.length < 2) return null;

    // Generate realistic track path between consecutive nodes
    const fullTrackPath: Array<{x: number, y: number}> = [];
    
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const segmentPath = findTrackPath(pathNodes[i], pathNodes[i + 1]);
      if (i === 0) {
        fullTrackPath.push(...segmentPath);
      } else {
        // Skip first point to avoid duplication
        fullTrackPath.push(...segmentPath.slice(1));
      }
    }

    if (fullTrackPath.length < 2) return null;

    // Create smooth curved path following tracks
    const createTrackPath = (points: Array<{x: number, y: number}>) => {
      if (points.length < 2) return '';
      
      let d = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        // Use smooth curves for track transitions
        if (i === 1) {
          d += ` L ${curr.x} ${curr.y}`;
        } else {
          const next = points[i + 1];
          if (next) {
            // Smooth curve through junction points
            const cp1x = prev.x + (curr.x - prev.x) * 0.6;
            const cp1y = prev.y + (curr.y - prev.y) * 0.6;
            d += ` Q ${cp1x} ${cp1y} ${curr.x} ${curr.y}`;
          } else {
            d += ` L ${curr.x} ${curr.y}`;
          }
        }
      }
      return d;
    };

    const fullPath = createTrackPath(fullTrackPath);
    
    // Calculate animated portion based on progress
    const animatedPoints = Math.min(animationStep + 1, fullTrackPath.length);
    const animatedPath = createTrackPath(fullTrackPath.slice(0, animatedPoints));

    return (
      <g style={styles.shuntingPath}>
        {/* Full path (dimmed) */}
        <path 
          d={fullPath}
          stroke="rgba(251,191,36,0.3)"
          strokeWidth="4"
          fill="none"
          strokeDasharray="8,4"
        />
        
        {/* Animated path */}
        {animationStep > 0 && animatedPoints > 1 && (
          <path 
            d={animatedPath}
            stroke="#fbbf24"
            strokeWidth="6"
            fill="none"
            filter="url(#glow)"
            markerEnd="url(#arrowhead)"
          />
        )}
        
        {/* Track junction indicators */}
        {fullTrackPath.slice(0, animatedPoints).map((pos, i) => {
          if (i % 3 === 0) { // Show every 3rd point to avoid clutter
            return (
              <circle
                key={i}
                cx={pos.x} cy={pos.y}
                r="3"
                fill="#fbbf24"
                stroke="#f59e0b"
                strokeWidth="1"
                opacity="0.8"
              >
                <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite"/>
              </circle>
            );
          }
          return null;
        })}
        
        {/* Moving train indicator */}
        {animationStep > 0 && animatedPoints <= fullTrackPath.length && (
        <g transform={`translate(${fullTrackPath[Math.min(animatedPoints - 1, fullTrackPath.length - 1)].x}, ${fullTrackPath[Math.min(animatedPoints - 1, fullTrackPath.length - 1)].y})`}>
            <circle r="12" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="2">
            <animate attributeName="r" values="8;16;8" dur="1s" repeatCount="indefinite"/>
            </circle>
            <polygon points="-8,-6 8,-6 8,6 -8,6" fill="#fbbf24"/>
            <text y="2" textAnchor="middle" fill="#000" fontSize="8" fontWeight="bold">
            {selectedAssignment.train_id}
            </text>
        </g>
        )}
      </g>
    );
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        paddingBottom: '1rem'
      }}>
        <h3 style={{
          margin: 0,
          color: '#f8fafc',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          background: 'linear-gradient(90deg, #38bdf8, #06d6a0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Kochi Metro Depot - Real-time Operations
        </h3>
        
        {selectedAssignment && (
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <button
              onClick={() => {
                setAnimatedPath([]);
                setAnimationStep(0);
                setIsAnimating(!isAnimating);
              }}
              style={{
                background: isAnimating 
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
                  : 'linear-gradient(90deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {isAnimating ? 'Stop Simulation' : 'Start Simulation'}
            </button>
            
            <select 
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                color: '#f8fafc',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                padding: '0.5rem',
                borderRadius: '6px'
              }}
            >
              <option value={0.5}>Slow</option>
              <option value={1}>Normal</option>
              <option value={2}>Fast</option>
              <option value={3}>Express</option>
            </select>
          </div>
        )}
      </div>

      {selectedAssignment && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.6)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid rgba(251, 191, 36, 0.3)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <span style={{
              color: '#fbbf24',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              fontFamily: 'monospace'
            }}>
              {selectedAssignment.train_id}
            </span>
            <span style={{ color: '#06d6a0' }}>
              Track: {selectedAssignment.track_id} (Pos. {selectedAssignment.position_in_track})
            </span>
            <span style={{ color: '#f472b6' }}>
              Moves: {selectedAssignment.moves_required}
            </span>
          </div>
          
          <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
            <strong>Route:</strong> {selectedAssignment.shunting_path.join(' → ')}
          </div>
        </div>
      )}
      
      <div style={{
        background: '#020617',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid rgba(148, 163, 184, 0.1)',
        position: 'relative'
      }}>
        <svg 
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{
            width: '100%',
            height: '500px',
            display: 'block'
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="8"
              refX="9"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 10 4, 0 8" fill="#fbbf24" />
            </marker>
          </defs>
          
          {renderTracks()}
          {renderShuntingPath()}
          {renderTrains()}
        </svg>
      </div>
      
      <div style={{
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '0.9rem',
        marginTop: '1rem',
        fontStyle: 'italic'
      }}>
        Click any train to view its optimized shunting path and start simulation
      </div>
    </div>
  );
}