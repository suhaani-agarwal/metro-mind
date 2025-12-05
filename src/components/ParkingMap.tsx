import React, { useState, useEffect, useRef } from 'react';
import { ParkingAssignment } from './types';

type Train = {
  id: string;
  current_position?: string | null;
};

type UnifiedData = {
  trains?: Train[];
};

type ParkingAssignmentOutput = {
  train_id: string;
  track_id: string;
  position_in_track?: number;
  moves_required?: number;
};

type OutputData = {
  parking_assignments?: ParkingAssignmentOutput[];
};

type DepotLayoutType = {
  ibl_bays?: string[];
  parking_tracks?: Array<{ id?: string; capacity?: number }>;
  connections?: Record<string, string[]>;
  exit_points?: string[];
};

type NodePos = { x: number; y: number };
type TrackNodePath = { node: string; pos: NodePos }[];

type SimulationMove = {
  train_id: string;
  from_track: string | null;
  to_track: string;
  path: TrackNodePath;
  moves_required: number;
  start_time: number;
  duration: number;
  order: number;
};

type Props = {
  assignments: ParkingAssignment[];
  depotLayout?: DepotLayoutType;
  unifiedData?: UnifiedData;
  outputData?: OutputData;
  selected?: string | null;
  onSelect?: (trainId: string | null) => void;
};

export default function AdvancedDepotMap({
  assignments,
  depotLayout,
  unifiedData,
  outputData,
  selected,
  onSelect,
}: Props) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [trainStates, setTrainStates] = useState<
    Record<string, { x: number; y: number; moving: boolean }>
  >({});
  const [simMoves, setSimMoves] = useState<SimulationMove[]>([]);
  const [highlighedPath, setHighlighedPath] = useState<TrackNodePath>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const SVG_W = 1600;
  const SVG_H = 530; // reduced height so graph fits inside the dashboard box

  // ========== REALISTIC DEPOT GRAPH STRUCTURE ==========
  // Every 2 consecutive tracks -> intermediate node, then converge leftward
  // Final structure: all tracks branch & converge progressively to MAIN_LINE

  const TRACK_SPACING = 35; // smaller spacing so tracks fit vertically
  const PARKING_START_Y = 5; // move parking start up to reduce overall height
  // const IBL_END_Y = PARKING_START_Y + 5 * TRACK_SPACING; // IBL in continuity (y=310)

  const iblBays = depotLayout?.ibl_bays || [
    'IBL01',
    'IBL02',
    'IBL03',
    'IBL04',
    'IBL05',
  ];
  const parkingTracks = depotLayout?.parking_tracks || Array.from(
    { length: 12 },
    (_, i) => ({ id: `PT${(i + 1).toString().padStart(2, '0')}`, capacity: 2 })
  );

  // Build comprehensive node graph
  const buildNodeGraph = () => {
    const nodes: Record<string, NodePos> = {};
    const connections: Record<string, string[]> = {};

    const TRACKS_START_X = 1400;
    const MAIN_LINE_X = 200;

    // ===== IBL NODES =====
    iblBays.forEach((bay, i) => {
      const y = PARKING_START_Y + i * TRACK_SPACING;
      nodes[`${bay}_START`] = { x: TRACKS_START_X, y };
      nodes[`${bay}_END`] = { x: TRACKS_START_X - 200, y };
      connections[`${bay}_START`] = [`${bay}_END`];
      connections[`${bay}_END`] = [];
    });

    // ===== IBL CONVERGENCE TREE =====
    // Pair-wise convergence: (IBL01,IBL02)->(IBL_CONV_12), (IBL03,IBL04)->(IBL_CONV_34), (IBL05)->(IBL_CONV_5)
    // Then all converge to IBL_MAIN
    nodes['IBL_CONV_12'] = { x: TRACKS_START_X - 350, y: PARKING_START_Y + 0.5 * TRACK_SPACING };
    nodes['IBL_CONV_34'] = { x: TRACKS_START_X - 350, y: PARKING_START_Y + 3.5 * TRACK_SPACING };
    nodes['IBL_CONV_5'] = { x: TRACKS_START_X - 350, y: PARKING_START_Y + 4 * TRACK_SPACING };
    nodes['IBL_MAIN'] = { x: TRACKS_START_X - 500, y: PARKING_START_Y + 2 * TRACK_SPACING };

    connections['IBL01_END'] = ['IBL_CONV_12'];
    connections['IBL02_END'] = ['IBL_CONV_12'];
    connections['IBL03_END'] = ['IBL_CONV_34'];
    connections['IBL04_END'] = ['IBL_CONV_34'];
    connections['IBL05_END'] = ['IBL_CONV_5'];

    connections['IBL_CONV_12'] = ['IBL_MAIN'];
    connections['IBL_CONV_34'] = ['IBL_MAIN'];
    connections['IBL_CONV_5'] = ['IBL_MAIN'];
    connections['IBL_MAIN'] = [];

    // ===== PARKING NODES =====
    parkingTracks.forEach((track, i) => {
      const y = PARKING_START_Y + (5 + i) * TRACK_SPACING;
      nodes[`${track.id}_START`] = { x: TRACKS_START_X, y };
      nodes[`${track.id}_END`] = { x: TRACKS_START_X - 350, y };
      connections[`${track.id}_START`] = [`${track.id}_END`];
      connections[`${track.id}_END`] = [];
    });

    // ===== PARKING CONVERGENCE TREE =====
    // Pair-wise: (PT01,PT02), (PT03,PT04), (PT05,PT06), (PT07,PT08), (PT09,PT10), (PT11,PT12)
    const parkingGroups = [
      ['PT01_END', 'PT02_END', 'PARK_CONV_1'],
      ['PT03_END', 'PT04_END', 'PARK_CONV_2'],
      ['PT05_END', 'PT06_END', 'PARK_CONV_3'],
      ['PT07_END', 'PT08_END', 'PARK_CONV_4'],
      ['PT09_END', 'PT10_END', 'PARK_CONV_5'],
      ['PT11_END', 'PT12_END', 'PARK_CONV_6'],
    ];

    parkingGroups.forEach((group, i) => {
      const y = PARKING_START_Y + (5 + i * 2 + 0.5) * TRACK_SPACING;
      nodes[group[2]] = { x: TRACKS_START_X - 500, y };
      connections[group[0]] = [group[2]];
      connections[group[1]] = [group[2]];
      connections[group[2]] = [];
    });

    // ===== SECONDARY PARKING CONVERGENCE =====
    // (PARK_CONV_1,2)->(PARK_SEC_1), (PARK_CONV_3,4)->(PARK_SEC_2), (PARK_CONV_5,6)->(PARK_SEC_3)
    nodes['PARK_SEC_1'] = { x: TRACKS_START_X - 650, y: PARKING_START_Y + 5.5 * TRACK_SPACING };
    nodes['PARK_SEC_2'] = { x: TRACKS_START_X - 650, y: PARKING_START_Y + 8.5 * TRACK_SPACING };
    nodes['PARK_SEC_3'] = { x: TRACKS_START_X - 650, y: PARKING_START_Y + 11.5 * TRACK_SPACING };

    connections['PARK_CONV_1'] = ['PARK_SEC_1'];
    connections['PARK_CONV_2'] = ['PARK_SEC_1'];
    connections['PARK_CONV_3'] = ['PARK_SEC_2'];
    connections['PARK_CONV_4'] = ['PARK_SEC_2'];
    connections['PARK_CONV_5'] = ['PARK_SEC_3'];
    connections['PARK_CONV_6'] = ['PARK_SEC_3'];

    // ===== FINAL CONVERGENCE TO MAIN LINE =====
    nodes['PARK_MAIN'] = { x: TRACKS_START_X - 800, y: PARKING_START_Y + 8.5 * TRACK_SPACING };
    nodes['MAIN_FUNNEL'] = { x: MAIN_LINE_X + 150, y: PARKING_START_Y + 8.5 * TRACK_SPACING };
    nodes['MAIN_LINE'] = { x: MAIN_LINE_X, y: PARKING_START_Y + 8.5 * TRACK_SPACING };

    connections['PARK_SEC_1'] = ['PARK_MAIN'];
    connections['PARK_SEC_2'] = ['PARK_MAIN'];
    connections['PARK_SEC_3'] = ['PARK_MAIN'];
    connections['IBL_MAIN'] = ['PARK_MAIN'];
    connections['PARK_MAIN'] = ['MAIN_FUNNEL'];
    connections['MAIN_FUNNEL'] = ['MAIN_LINE'];
    connections['MAIN_LINE'] = [];

    return { nodes, connections };
  };
  // Memoize node graph to avoid recreating objects each render (prevents infinite effect loops)
  const { nodes: depotNodes, connections: depotConnections } = React.useMemo(() => buildNodeGraph(), [JSON.stringify(depotLayout)]);

  // Build reverse connections map for undirected path searches
  const reverseConnections = React.useMemo(() => {
    const rev: Record<string, string[]> = {};
    Object.entries(depotConnections).forEach(([k, vs]) => {
      vs.forEach((v) => {
        if (!rev[v]) rev[v] = [];
        rev[v].push(k);
      });
    });
    return rev;
  }, [depotConnections]);

  // ========== BFS SHORTEST PATH ==========
  const bfsShortestPath = (start: string, end: string = 'MAIN_LINE'): string[] => {
    const queue: [string, string[]][] = [[start, [start]]];
    const visited = new Set<string>();
    visited.add(start);

    while (queue.length > 0) {
      const [current, path] = queue.shift()!;
      if (current === end) return path;

      // Treat graph as undirected for path finding (allow travel both ways)
      const forward = depotConnections[current] || [];
      const backward = reverseConnections[current] || [];
      const neighbors = Array.from(new Set([...forward, ...backward]));

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, [...path, neighbor]]);
        }
      }
    }
    return [start]; // Fallback
  };

  // ========== COMPUTE INITIAL TRAIN POSITIONS FROM unified.json ==========
  useEffect(() => {
    // Build initial positions along track segments so trains on same track don't overlap.
    const initialStates: Record<string, { x: number; y: number; moving: boolean }> = {};

    // Helper: compute point along straight segment between start and end nodes
    const pointAlong = (start: NodePos, end: NodePos, t: number) => ({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    });

    // Build a map of track -> trains currently on that track (from unifiedData or assignments)
    const trackOccupancy: Record<string, Array<{ id: string; slot?: number }>> = {};

    if (unifiedData?.trains) {
      unifiedData.trains.forEach((train: any) => {
        if (!train.id) return;
        // Treat null/empty current_position as MAIN_LINE (they originate from main line)
        if (train.current_position == null || train.current_position === '') {
          const trackId = 'MAIN_LINE';
          if (!trackOccupancy[trackId]) trackOccupancy[trackId] = [];
          trackOccupancy[trackId].push({ id: train.id, slot: undefined });
          return;
        }

        const raw = train.current_position;
        const [trackId, slotStr] = raw.split('-'); // e.g., PT05-2
        const slot = slotStr ? parseInt(slotStr, 10) : undefined;
        const tid = trackId || 'MAIN_LINE';
        if (!trackOccupancy[tid]) trackOccupancy[tid] = [];
        trackOccupancy[tid].push({ id: train.id, slot });
      });
    }

    // Ensure assignments trains are present in occupancy if not in unifiedData
    assignments.forEach((a) => {
      const tid = a.track_id;
      if (!trackOccupancy[tid]) trackOccupancy[tid] = [];
      if (!trackOccupancy[tid].some((t) => t.id === a.train_id)) {
        trackOccupancy[tid].push({ id: a.train_id, slot: a.position_in_track });
      }
    });

    // For each occupied track, sort by slot if available, otherwise keep given order.
    Object.entries(trackOccupancy).forEach(([trackId, trains]) => {
      trains.sort((a, b) => {
        const sa = a.slot || 0;
        const sb = b.slot || 0;
        return sa - sb;
      });

      const startNode = `${trackId}_START`;
      const endNode = `${trackId}_END`;
      const start = depotNodes[startNode];
      const end = depotNodes[endNode];
      if (!start || !end) {
        // fallback: place at START if exists
        trains.forEach((t) => {
          const sNode = depotNodes[`${t.id}_START`];
          if (sNode) initialStates[t.id] = { ...sNode, moving: false };
        });
        return;
      }

      // Place trains along the segment from START->END with spacing so they don't overlap.
      // Position 1 (slot 1) should be nearest to END (inside the track); subsequent slots are further towards START.
      const spacing = 0.34; // increased fractional spacing between consecutive trains to avoid overlap
      trains.forEach((t, idx) => {
        const slot = t.slot || idx + 1;
        // compute t factor (0=start, 1=end). We want slot1 near end (e.g., 0.85), slot2 at 0.63 etc.
        const base = 0.9;
        const tt = Math.max(0.05, base - (slot - 1) * spacing);
        const pos = pointAlong(start, end, tt);
        initialStates[t.id] = { x: pos.x, y: pos.y, moving: false };
      });
    });

    // For any assignment trains not present in occupancy (rare), place at their track START
    assignments.forEach((a) => {
      if (!initialStates[a.train_id]) {
        const startNode = `${a.track_id}_START`;
        if (depotNodes[startNode]) {
          initialStates[a.train_id] = { ...depotNodes[startNode], moving: false };
        } else {
          // fallback to MAIN_LINE
          initialStates[a.train_id] = { ...depotNodes['MAIN_LINE'], moving: false };
        }
      }
    });

    // Preserve selected train position if present
    setTrainStates((prev) => {
      const merged = { ...initialStates } as Record<string, { x: number; y: number; moving: boolean }>;
      if (selected && prev && prev[selected]) merged[selected] = prev[selected];
      return merged;
    });
  }, [unifiedData, assignments]);

  // When not simulating, place trains at their final assigned parking positions (from outputData)
  useEffect(() => {
    if (isSimulating) return; // only when not simulating
    if (!outputData?.parking_assignments) return;

    const finalStates: Record<string, { x: number; y: number; moving: boolean }> = {};

    const pointAlong = (start: NodePos, end: NodePos, t: number) => ({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    });

    // For each parking assignment, compute final pos based on slot
    outputData.parking_assignments.forEach((p: any) => {
      const trackId = p.track_id;
      const slot = p.position_in_track || 1;
      const startNode = `${trackId}_START`;
      const endNode = `${trackId}_END`;
      const start = depotNodes[startNode];
      const end = depotNodes[endNode];
      if (start && end) {
        const base = 0.9;
        const spacing = 0.34;
        const tt = Math.max(0.05, base - (slot - 1) * spacing);
        const pos = pointAlong(start, end, tt);
        finalStates[p.train_id] = { x: pos.x, y: pos.y, moving: false };
      }
    });

    // For any trains not in parking_assignments, place them at MAIN_LINE or known current positions
    // Use union of assignment train ids and provided `assignments` prop to ensure coverage
    const knownTrainIds = new Set<string>();
    outputData.parking_assignments.forEach((p: any) => knownTrainIds.add(p.train_id));
    assignments.forEach((a) => knownTrainIds.add(a.train_id));

    Array.from(knownTrainIds).forEach((tid) => {
      if (!finalStates[tid]) {
        // try to place at their assignment if present
        const assn = outputData.parking_assignments?.find((a: any) => a.train_id === tid);
        if (assn) {
          const startNode = `${assn.track_id}_START`;
          if (depotNodes[startNode]) finalStates[tid] = { ...depotNodes[startNode], moving: false };
        } else {
          finalStates[tid] = { ...depotNodes['MAIN_LINE'], moving: false };
        }
      }
    });

    // fallback: ensure every assigned train has a state
    outputData.parking_assignments.forEach((p: any) => {
      if (!finalStates[p.train_id]) {
        finalStates[p.train_id] = { ...depotNodes['MAIN_LINE'], moving: false };
      }
    });

    // Merge with existing trainStates to preserve the selected train's current position
    setTrainStates((prev) => {
  const merged: Record<string, { x: number; y: number; moving: boolean }> = {
    ...finalStates,
  };
  if (selected && prev[selected]) {
    merged[selected] = prev[selected];
  }
  return merged;
});
  }, [isSimulating, outputData, depotNodes]);

  // When simulation starts, reset train positions to the initial positions from unified.json
  useEffect(() => {
    if (!isSimulating) return;

    const initialStates: Record<string, { x: number; y: number; moving: boolean }> = {};
    const pointAlong = (start: NodePos, end: NodePos, t: number) => ({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    });

    const trackOccupancy: Record<string, Array<{ id: string; slot?: number }>> = {};
    if (unifiedData?.trains) {
      unifiedData.trains.forEach((train: any) => {
        if (!train.id) return;
        // If current_position is null/empty, treat as MAIN_LINE
        if (train.current_position == null || train.current_position === '') {
          if (!trackOccupancy['MAIN_LINE']) trackOccupancy['MAIN_LINE'] = [];
          trackOccupancy['MAIN_LINE'].push({ id: train.id, slot: undefined });
          return;
        }

        const raw = train.current_position;
        const [trackId, slotStr] = raw.split('-');
        const slot = slotStr ? parseInt(slotStr, 10) : undefined;
        const tid = trackId || 'MAIN_LINE';
        if (!trackOccupancy[tid]) trackOccupancy[tid] = [];
        trackOccupancy[tid].push({ id: train.id, slot });
      });
    }

    assignments.forEach((a) => {
      const tid = a.track_id;
      if (!trackOccupancy[tid]) trackOccupancy[tid] = [];
      if (!trackOccupancy[tid].some((t) => t.id === a.train_id)) {
        trackOccupancy[tid].push({ id: a.train_id, slot: a.position_in_track });
      }
    });

    Object.entries(trackOccupancy).forEach(([trackId, trains]) => {
      trains.sort((a, b) => (a.slot || 0) - (b.slot || 0));
      const startNode = `${trackId}_START`;
      const endNode = `${trackId}_END`;
      const start = depotNodes[startNode] || depotNodes['MAIN_LINE'];
      const end = depotNodes[endNode] || depotNodes['MAIN_LINE'];
      const spacing = 0.34;
      trains.forEach((t, idx) => {
        const slot = t.slot || idx + 1;
        const base = trackId === 'MAIN_LINE' ? 0.5 : 0.85;
        const tt = Math.max(0.05, base - (slot - 1) * spacing);
        const pos = pointAlong(start, end, tt);
        initialStates[t.id] = { x: pos.x, y: pos.y, moving: false };
      });
    });

    // Preserve selected train position if present to avoid it jumping on select
    setTrainStates((prev) => {
      const merged = { ...initialStates } as Record<string, { x: number; y: number; moving: boolean }>;
      if (selected && prev && prev[selected]) merged[selected] = prev[selected];
      return merged;
    });
  }, [isSimulating, unifiedData, assignments, depotNodes]);

  // ========== GENERATE CHOREOGRAPHED SIMULATION MOVES ==========
  useEffect(() => {
    if (!outputData?.parking_assignments) return;

    // Map current positions (track ids) from unifiedData
    const currentPositions: Record<string, string | null> = {};
    const currentSlots: Record<string, number | undefined> = {};
    if (unifiedData?.trains) {
      unifiedData.trains.forEach((train: any) => {
        if (!train.id) return;
        if (train.current_position == null || train.current_position === '') {
          currentPositions[train.id] = 'MAIN_LINE';
          currentSlots[train.id] = undefined;
          return;
        }
        const raw = train.current_position;
        const [trackId, slotStr] = raw.split('-');
        currentPositions[train.id] = trackId || 'MAIN_LINE';
        currentSlots[train.id] = slotStr ? parseInt(slotStr, 10) : undefined;
      });
    }

    // Build dependency graph: if train A is in front of train B, B depends on A
    const moves: SimulationMove[] = [];
    const trackContent: Record<string, string[]> = {}; // track -> [train_ids]

    // Initialize track content with current positions
    Object.entries(currentPositions).forEach(([trainId, trackId]) => {
      if (trackId) {
        if (!trackContent[trackId]) trackContent[trackId] = [];
        trackContent[trackId].push(trainId);
      }
    });

    // Generate moves from assignments
    outputData.parking_assignments.forEach((assignment: any) => {
      const trainId = assignment.train_id;
      const targetTrack = assignment.track_id;
      const from = currentPositions[trainId] || 'MAIN_LINE';

      // If the train is already in correct track and slot (if specified), skip move
      const desiredSlot = assignment.position_in_track;
      const currSlot = currentSlots[trainId];
      if (from === targetTrack && (!desiredSlot || desiredSlot === currSlot)) {
        return; // already correct
      }

      // If this train is currently selected, keep it stationary and don't schedule its move animation
      if (selected === trainId) return;

      const fromNode = from === 'MAIN_LINE' ? 'MAIN_LINE' : `${from}_START`;
      const toNode = `${targetTrack}_END`;
      const path = bfsShortestPath(fromNode, toNode);

      const pathWithCoords: TrackNodePath = path.map((node) => ({
        node,
        pos: depotNodes[node] || { x: 0, y: 0 },
      }));

      moves.push({
        train_id: trainId,
        from_track: from,
        to_track: targetTrack,
        path: pathWithCoords,
        moves_required: assignment.moves_required || 0,
        start_time: 0,
        duration: 1800 + pathWithCoords.length * 350,
        order: 0,
      });
    });

    // ===== SCHEDULE MOVES INTO ROUNDS WITH DEPENDENCY AWARENESS =====
    // We'll build rounds iteratively. In each round we pick moves that:
    // - do not depend on other pending moves (target track not currently occupied by a train that hasn't moved yet)
    // - do not conflict on path nodes with other moves in the same round
    const nodeSetFor = (m: SimulationMove) => new Set(m.path.map((p) => p.node).filter((n) => n !== 'MAIN_LINE'));

    const remaining: SimulationMove[] = [...moves];
    const rounds: SimulationMove[][] = [];

    // Helper: check if a track is currently occupied by a train that is still in `remaining`
    const isTargetBlocked = (targetTrack: string | null) => {
      if (!targetTrack) return false;
      const occupants = trackContent[targetTrack] || [];
      // if any occupant is still planned to move (i.e., exists in remaining), it's blocking
      return occupants.some((tid) => remaining.some((rm) => rm.train_id === tid));
    };

    while (remaining.length > 0) {
      const round: SimulationMove[] = [];

      for (const m of [...remaining]) {
        // Skip if target is blocked by a train that hasn't moved yet
        if (isTargetBlocked(m.to_track)) continue;

        // Check node conflicts with already selected moves in this round
        const mNodes = nodeSetFor(m);
        let conflict = false;
        for (const rm of round) {
          const rn = nodeSetFor(rm);
          for (const n of mNodes) {
            if (rn.has(n)) {
              conflict = true;
              break;
            }
          }
          if (conflict) break;
        }
        if (!conflict) {
          round.push(m);
          // remove from remaining
          const idx = remaining.findIndex((x) => x === m);
          if (idx >= 0) remaining.splice(idx, 1);
          // update trackContent: vacate from_track and mark to_track will be occupied by this train
          if (m.from_track && trackContent[m.from_track]) {
            trackContent[m.from_track] = trackContent[m.from_track].filter((t) => t !== m.train_id);
          }
          if (!trackContent[m.to_track]) trackContent[m.to_track] = [];
          trackContent[m.to_track].push(m.train_id);
        }
      }

      if (round.length === 0) {
        // To break deadlocks (cycles), pick the move with smallest moves_required and force it into a round
        remaining.sort((a, b) => (a.moves_required || 0) - (b.moves_required || 0));
        const forced = remaining.shift()!;
        rounds.push([forced]);
        // update trackContent for forced move
        if (forced.from_track && trackContent[forced.from_track]) {
          trackContent[forced.from_track] = trackContent[forced.from_track].filter((t) => t !== forced.train_id);
        }
        if (!trackContent[forced.to_track]) trackContent[forced.to_track] = [];
        trackContent[forced.to_track].push(forced.train_id);
        continue;
      }

      rounds.push(round);
    }

    // Compute start times for rounds (rounds run sequentially, moves within a round run in parallel)
    const GAP = 500;
    let offset = 0;
    const orderedMoves: SimulationMove[] = [];
    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      const maxDur = Math.max(...r.map((m) => m.duration));
      for (const m of r) {
        m.start_time = offset;
        m.order = i;
        orderedMoves.push(m);
      }
      offset += maxDur + GAP;
    }

    setSimMoves(orderedMoves);
  }, [outputData, unifiedData, selected, bfsShortestPath, depotNodes]);

  // ========== ANIMATION LOOP ==========
  useEffect(() => {
    if (!isSimulating || simMoves.length === 0) return;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const totalDuration = Math.max(
        ...simMoves.map((m) => m.start_time + m.duration)
      );

      if (elapsed > totalDuration) {
        setIsSimulating(false);
        startTimeRef.current = 0;
        return;
      }

      // Update train positions based on active moves
      const newStates = { ...trainStates };
      let activeMove: SimulationMove | null = null;
      let currentHighlighted: TrackNodePath | null = null;

      simMoves.forEach((move) => {
        // Skip updating the position for the selected train -- keep it stationary and highlighted
        if (selected === move.train_id) return;

        const moveProgress = (elapsed - move.start_time) / move.duration;

        if (moveProgress >= 0 && moveProgress < 1) {
          activeMove = move;
          currentHighlighted = move.path;
          // compute interpolated position over the segmented path (per-node linear interpolation)
          const segments = move.path.length - 1 || 1;
          const totalSegProgress = moveProgress * segments;
          const pathIndex = Math.floor(totalSegProgress);
          const nextIndex = Math.min(pathIndex + 1, move.path.length - 1);
          const localProgress = totalSegProgress - pathIndex;

          const current = move.path[pathIndex].pos;
          const next = move.path[nextIndex].pos;
          const x = current.x + (next.x - current.x) * localProgress;
          const y = current.y + (next.y - current.y) * localProgress;

          newStates[move.train_id] = { x, y, moving: true };
        } else if (moveProgress >= 1) {
          // Move complete: snap to final position
          const finalPos = move.path[move.path.length - 1].pos;
          newStates[move.train_id] = { ...finalPos, moving: false };
        }
      });

      setHighlighedPath(currentHighlighted || []);

      setTrainStates(newStates);
      setSimProgress(Math.min(elapsed / totalDuration, 1));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSimulating, simMoves, selected, trainStates]);

  // ========== RENDER FUNCTIONS ==========

  const renderTracks = () => {
    const allTracks = [...iblBays, ...parkingTracks.map((t) => t.id!)];

    return (
      <g>
        {/* Defs */}
        <defs>
          <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="mainLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="trackGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Draw all track lines */}
        {allTracks.map((trackId) => {
          const startNode = `${trackId}_START`;
          const endNode = `${trackId}_END`;
          const start = depotNodes[startNode];
          const end = depotNodes[endNode];

          if (!start || !end) return null;

          return (
            <g key={trackId}>
              {/* Track line */}
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="url(#trackGrad)"
                strokeWidth="18"
                filter="url(#trackGlow)"
                opacity="0.9"
              />
              {/* Rails */}
              <line
                x1={start.x}
                y1={start.y - 4}
                x2={end.x}
                y2={end.y - 4}
                stroke="#f1f5f9"
                strokeWidth="2"
              />
              <line
                x1={start.x}
                y1={start.y + 4}
                x2={end.x}
                y2={end.y + 4}
                stroke="#f1f5f9"
                strokeWidth="2"
              />
              {/* Sleepers */}
              {Array.from({
                length: Math.floor(
                  Math.sqrt(
                    (end.x - start.x) ** 2 + (end.y - start.y) ** 2
                  ) / 30
                ),
              }).map((_, i) => {
                const t = i / (Math.floor(
                  Math.sqrt(
                    (end.x - start.x) ** 2 + (end.y - start.y) ** 2
                  ) / 30
                ) || 1);
                const x = start.x + (end.x - start.x) * t;
                const y = start.y + (end.y - start.y) * t;
                return (
                  <rect
                    key={i}
                    x={x - 2}
                    y={y - 3}
                    width="4"
                    height="6"
                    fill="#334155"
                    opacity="0.7"
                  />
                );
              })}

              {/* Track label */}
              <g
                transform={`translate(${(start.x + end.x) / 2}, ${(start.y + end.y) / 2 - 25})`}
              >
                <rect
                  x="-25"
                  y="-8"
                  width="50"
                  height="16"
                  rx="4"
                  fill="rgba(30, 41, 59, 0.95)"
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                <text
                  textAnchor="middle"
                  y="4"
                  fill="#e2e8f0"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {trackId}
                </text>
              </g>
            </g>
          );
        })}

        {/* Draw convergence nodes and connections */}
        {Object.entries(depotConnections).map(([from, tos]) =>
          tos.map((to) => {
            const fromPos = depotNodes[from];
            const toPos = depotNodes[to];
            if (!fromPos || !toPos) return null;

            return (
              <line
                key={`${from}-${to}`}
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="#475569"
                strokeWidth="14"
                opacity="0.6"
                strokeDasharray="8,4"
              />
            );
          })
        )}

        {/* Main line */}
        <g>
          <line
            x1={depotNodes['MAIN_LINE'].x}
            y1={depotNodes['MAIN_LINE'].y - 25}
            x2={depotNodes['MAIN_LINE'].x}
            y2={depotNodes['MAIN_LINE'].y + 25}
            stroke="url(#mainLineGrad)"
            strokeWidth="30"
            filter="url(#trackGlow)"
          />
          <circle
            cx={depotNodes['MAIN_LINE'].x}
            cy={depotNodes['MAIN_LINE'].y}
            r="35"
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            opacity="0.5"
          />
          <text
            x={depotNodes['MAIN_LINE'].x}
            y={depotNodes['MAIN_LINE'].y - 45}
            textAnchor="middle"
            fill="#10b981"
            fontSize="14"
            fontWeight="bold"
            fontFamily="monospace"
          >
            MAIN LINE
          </text>
        </g>

        {/* Node points (debug) */}
        {Object.entries(depotNodes).map(([nodeId, pos]) => {
          if (
            nodeId.includes('_END') ||
            nodeId.includes('_START') ||
            nodeId.includes('CONV') ||
            nodeId.includes('MAIN') ||
            nodeId.includes('SEC') ||
            nodeId.includes('FUNNEL')
          ) {
            return (
              <circle
                key={nodeId}
                cx={pos.x}
                cy={pos.y}
                r="4"
                fill="#ec4899"
                opacity="0.3"
              />
            );
          }
          return null;
        })}
      </g>
    );
  };

  const renderTrains = () => {
    const TRAIN_LENGTH = 110;
    const TRAIN_HEIGHT = 28;
    // const POSITION_OFFSET = 35; // Spacing between trains on same track

    return (
      <g>
        {assignments.map((assignment) => {
          const state = trainStates[assignment.train_id];
          if (!state) return null;

          const isSelected = selected === assignment.train_id;

          // Position offset for trains behind first on same track
          const positionInTrack = assignment.position_in_track || 1;
          let offsetMultiplier = 1;
          if (positionInTrack === 2) {
            offsetMultiplier = 1.3;
          }

          return (
            <g key={assignment.train_id}>
              {/* Train shadow */}
              <ellipse
                cx={state.x + TRAIN_LENGTH / 4}
                cy={state.y + 20}
                rx={TRAIN_LENGTH / 2}
                ry="6"
                fill="#000"
                opacity="0.3"
              />

              {/* Main train body */}
              <g
                onClick={() =>
                  onSelect?.(isSelected ? null : assignment.train_id)
                }
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  filter: isSelected
                    ? 'drop-shadow(0 0 15px rgba(251, 191, 36, 0.8))'
                    : state.moving
                      ? 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.6))'
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                }}
              >
                {/* Train gradient */}
                <defs>
                  <linearGradient
                    id={`grad-${assignment.train_id}`}
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      stopColor={isSelected ? '#fbbf24' : '#dc2626'}
                    />
                    <stop
                      offset="100%"
                      stopColor={isSelected ? '#f59e0b' : '#991b1b'}
                    />
                  </linearGradient>
                </defs>

                {/* Train body */}
                <rect
                  x={state.x - TRAIN_LENGTH / 2}
                  y={state.y - TRAIN_HEIGHT / 2}
                  width={TRAIN_LENGTH}
                  height={TRAIN_HEIGHT}
                  rx="8"
                  fill={`url(#grad-${assignment.train_id})`}
                  stroke={isSelected ? '#fbbf24' : '#7f1d1d'}
                  strokeWidth="2"
                />

                {/* Windows */}
                {Array.from({ length: 7 }).map((_, i) => (
                  <rect
                    key={i}
                    x={state.x - TRAIN_LENGTH / 2 + 10 + i * 14}
                    y={state.y - 6}
                    width="10"
                    height="8"
                    rx="1"
                    fill="#0ea5e9"
                    stroke="#0284c7"
                    strokeWidth="0.5"
                  />
                ))}

                {/* Front light */}
                <circle
                  cx={state.x - TRAIN_LENGTH / 2 + 5}
                  cy={state.y}
                  r="5"
                  fill="#fbbf24"
                />

                {/* Rear light */}
                <circle
                  cx={state.x + TRAIN_LENGTH / 2 - 5}
                  cy={state.y}
                  r="5"
                  fill="#ef4444"
                />
              </g>

              {/* Train ID label */}
              <g transform={`translate(${state.x}, ${state.y - TRAIN_HEIGHT / 2 + 8})`}>
                <rect
                  x="-28"
                  y="-9"
                  width="56"
                  height="18"
                  rx="4"
                  fill="rgba(0, 0, 0, 0.8)"
                  stroke={isSelected ? '#fbbf24' : '#94a3b8'}
                  strokeWidth="1"
                />
                <text
                  textAnchor="middle"
                  y="4"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {assignment.train_id}
                </text>
              </g>

              {/* Position indicator */}
              <circle
                cx={state.x + TRAIN_LENGTH / 2 + 12}
                cy={state.y}
                r="7"
                fill={positionInTrack === 1 ? '#22c55e' : '#fbbf24'}
                stroke="white"
                strokeWidth="1"
              />
              <text
                x={state.x + TRAIN_LENGTH / 2 + 12}
                y={state.y}
                textAnchor="middle"
                dy="0.3em"
                fill="#000"
                fontSize="9"
                fontWeight="bold"
              >
                {positionInTrack}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderAnimationPath = () => {
    if (highlighedPath.length < 2) return null;

    const pathStr = highlighedPath
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.pos.x} ${p.pos.y}`)
      .join(' ');

    return (
      <g>
        {/* Background path */}
        <path
          d={pathStr}
          fill="none"
          stroke="rgba(251, 191, 36, 0.1)"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Animated path */}
        <path
          d={pathStr}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
          filter="url(#pathGlow)"
          strokeDasharray="20"
          strokeDashoffset={-simProgress * 40}
        >
          <defs>
            <filter id="pathGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </path>
      </g>
    );
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '20px',
        padding: '2rem',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
        margin: '1rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          borderBottom: '2px solid rgba(148, 163, 184, 0.2)',
          paddingBottom: '1.5rem',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: '#f8fafc',
              fontSize: '2.2rem',
              fontWeight: '800',
              background:
                'linear-gradient(90deg, #38bdf8, #06d6a0, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'monospace',
            }}
          >
            🚇 Muttom Metro Depot
          </h1>
          <p
            style={{
              margin: '0.5rem 0 0 0',
              color: '#94a3b8',
              fontSize: '1.1rem',
              fontFamily: 'monospace',
            }}
          >
            Real-time Train Operations & Choreographed Shunting
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => {
              setIsSimulating(!isSimulating);
              if (!isSimulating) startTimeRef.current = 0;
            }}
            style={{
              background: isSimulating
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : 'linear-gradient(90deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: 'monospace',
              fontSize: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            }}
          >
            {isSimulating ? '⏹️ Stop' : '▶️ Start Simulation'}
          </button>
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              color: '#e2e8f0',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          >
            Progress: {Math.round(simProgress * 100)}%
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'linear-gradient(135deg, #020617, #0f172a)',
          borderRadius: '15px',
          overflow: 'hidden',
          border: '3px solid rgba(148, 163, 184, 0.2)',
          position: 'relative',
          boxShadow:
            'inset 0 0 100px rgba(0,0,0,0.7), 0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{
            width: '100%',
            height: `${SVG_H}px`,
            display: 'block',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.7) 100%)',
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background grid */}
          <defs>
            <pattern
              id="depotGrid"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="rgba(148, 163, 184, 0.05)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#depotGrid)"
          />

          {renderTracks()}
          {renderAnimationPath()}
          {renderTrains()}
        </svg>
      </div>

      {selected && (
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
            padding: '1.5rem 2rem',
            borderRadius: '15px',
            marginTop: '2rem',
            border: '2px solid rgba(251, 191, 36, 0.5)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(251, 191, 36, 0.2)',
            color: '#cbd5e1',
            fontFamily: 'monospace',
            fontSize: '1rem',
          }}
        >
          <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
            🚂 {selected}
          </span>{' '}
          • Track: <span style={{ color: '#06d6a0' }}>
            {assignments.find((a) => a.train_id === selected)?.track_id}
          </span>
        </div>
      )}
    </div>
  );
}