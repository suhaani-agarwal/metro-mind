"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";

interface TrainParking {
  train_id: string;
  bay: string;
  position: number;
  status: "parking" | "maintenance";
  arrival_time: string;
  departure_time?: string;
  notes: string;
}

interface ParkingTrack {
  track: string;
  positions: number[];
  type: "parking" | "maintenance";
}

// Draggable Train Component
const DraggableTrain = ({
  trainId,
  isOverlay = false,
}: {
  trainId: string;
  isOverlay?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `train-${trainId}`,
      data: { trainId, type: "train" },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        cursor-grab active:cursor-grabbing 
        font-semibold text-sm py-1 px-3 rounded shadow-sm
        ${
          isOverlay
            ? "bg-sky-500 text-white shadow-xl scale-105"
            : "bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30"
        }
        ${isDragging ? "opacity-50" : "opacity-100"}
        transition-colors duration-200
      `}
    >
      🚆 {trainId}
    </div>
  );
};

// Droppable Spot Component
const DroppableSpot = ({
  id,
  children,
  isOccupied,
  type,
}: {
  id: string;
  children: React.ReactNode;
  isOccupied: boolean;
  type: "parking" | "maintenance";
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: { id, type: "spot", isOccupied, trackType: type },
  });

  let borderColor = "border-slate-600/50";
  let bgColor = "bg-slate-700/50";

  if (isOver) {
    if (isOccupied) {
      borderColor = "border-amber-500";
      bgColor = "bg-amber-500/20"; // Warning/Displace
    } else {
      borderColor = "border-emerald-500";
      bgColor = "bg-emerald-500/20"; // Good to drop
    }
  } else if (isOccupied) {
    if (type === "maintenance") {
      borderColor = "border-amber-400/50";
      bgColor = "bg-amber-400/20";
    } else {
      borderColor = "border-emerald-400/50";
      bgColor = "bg-emerald-400/20";
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        p-3 rounded-lg text-center border transition-all duration-300 min-h-[80px] flex flex-col justify-center items-center
        ${borderColor} ${bgColor}
      `}
    >
      {children}
    </div>
  );
};

export default function TrainParkingPage() {
  const t = useTranslations("Parking");
  const router = useRouter();
  const [trains, setTrains] = useState<string[]>([]);
  const [parkingData, setParkingData] = useState<TrainParking[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<string>("");
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<number>(0);
  const [status, setStatus] = useState<"parking" | "maintenance">("parking");
  const [notes, setNotes] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingTrain, setEditingTrain] = useState<string>("");

  // Train ID mapping function - converts R001 to TM001
  const mapToTMFormat = (trainId: string): string => {
    if (trainId.startsWith("R")) {
      return trainId.replace("R", "TM");
    }
    return trainId; // Return as-is if it doesn't start with R
  };

  // Reverse mapping - converts TM001 back to R001 (if needed for backend, but we'll use TM everywhere)
  const mapToRFormat = (trainId: string): string => {
    if (trainId.startsWith("TM")) {
      return trainId.replace("TM", "R");
    }
    return trainId;
  };

  const parkingTracks: ParkingTrack[] = [
    { track: "01", positions: [1, 2], type: "parking" },
    { track: "02", positions: [1, 2], type: "parking" },
    { track: "03", positions: [1, 2], type: "parking" },
    { track: "04", positions: [1, 2], type: "parking" },
    { track: "05", positions: [1, 2], type: "parking" },
    { track: "06", positions: [1, 2], type: "parking" },
    { track: "07", positions: [1, 2], type: "parking" },
    { track: "08", positions: [1, 2], type: "parking" },
    { track: "09", positions: [1, 2], type: "parking" },
    { track: "10", positions: [1, 2], type: "parking" },
    { track: "11", positions: [1, 2], type: "parking" },
    { track: "12", positions: [1, 2], type: "parking" },
    { track: "IBL01", positions: [1], type: "maintenance" },
    { track: "IBL02", positions: [1], type: "maintenance" },
    { track: "IBL03", positions: [1], type: "maintenance" },
    { track: "IBL04", positions: [1], type: "maintenance" },
    { track: "IBL05", positions: [1], type: "maintenance" },
  ];

  useEffect(() => {
    fetchTrains();
    fetchParkingData();
  }, []);

  const fetchTrains = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/nightly/trains`
      );
      // Convert all train IDs to TM format for display
      const tmTrains = response.data.trains.map((train: string) =>
        mapToTMFormat(train)
      );
      setTrains(tmTrains);
    } catch (error) {
      console.error("Error fetching trains:", error);
    }
  };

  const fetchParkingData = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/nightly/parking/assignments`
      );
      // Convert all train IDs in parking data to TM format
      const tmParkingData =
        response.data.assignments?.map((assignment: TrainParking) => ({
          ...assignment,
          train_id: mapToTMFormat(assignment.train_id), // Save as TM format
        })) || [];
      setParkingData(tmParkingData);
    } catch (error) {
      console.error("Error fetching parking data:", error);
      setParkingData([]);
    }
  };

  /** Display helper */
  const getPositionDisplayName = (bay: string, position: number) => {
    if (bay.startsWith("PT")) {
      const track = bay.replace("PT", "");
      return `${t("track")} ${track} ${t("position")} ${position}`;
    } else if (bay.startsWith("IBL")) {
      const track = bay.replace("IBL", "");
      return `${t("maintenanceIBL")}${track}`;
    }
    return `${bay}-${position}`;
  };

  /** Occupancy check */
  const isPositionOccupied = (
    track: string,
    position: number,
    trackType: "parking" | "maintenance"
  ) => {
    const bay = getBayFromTrack(track, trackType);
    return parkingData.some(
      (assignment) =>
        assignment.bay === bay &&
        assignment.position === position &&
        assignment.status === trackType &&
        !assignment.departure_time
    );
  };

  /** Get train at position */
  const getTrainAtPosition = (
    track: string,
    position: number,
    trackType: "parking" | "maintenance"
  ) => {
    const bay = getBayFromTrack(track, trackType);
    return parkingData.find(
      (assignment) =>
        assignment.bay === bay &&
        assignment.position === position &&
        assignment.status === trackType &&
        !assignment.departure_time
    );
  };

  /** Convert track to bay format */
  const getBayFromTrack = (
    track: string,
    trackType: "parking" | "maintenance"
  ) => {
    if (trackType === "maintenance") {
      return track;
    }
    return `PT${track.padStart(2, "0")}`;
  };

  /** Handle status change */
  const handleStatusChange = (newStatus: "parking" | "maintenance") => {
    setStatus(newStatus);
    setSelectedTrack("");
    setSelectedPosition(newStatus === "maintenance" ? 1 : 0);
  };

  /** Handle track selection */
  const handleTrackChange = (track: string) => {
    setSelectedTrack(track);
    if (status === "maintenance") {
      setSelectedPosition(1);
    } else {
      setSelectedPosition(0);
    }
  };

  /** Assign parking */
  const handleAssignParking = async () => {
    if (!selectedTrain || !selectedTrack || !selectedPosition) {
      return;
    }

    const trackType = status;
    if (
      isPositionOccupied(selectedTrack, selectedPosition, trackType) &&
      !isEditing
    ) {
      return;
    }

    try {
      const bay = getBayFromTrack(selectedTrack, status);

      // Save with TM format directly (no conversion needed since we're using TM everywhere)
      const payload: TrainParking = {
        train_id: selectedTrain, // This is already in TM format
        bay: bay,
        position: selectedPosition,
        status,
        arrival_time: new Date().toISOString(),
        notes,
      };

      if (isEditing) {
        await axios.put(
          `${API_BASE}/api/nightly/parking/assignment/${editingTrain}`,
          payload
        );
      } else {
        await axios.post(
          `${API_BASE}/api/nightly/parking/assignment`,
          payload
        );
      }

      resetForm();
      fetchParkingData();
    } catch (error) {
      console.error("Error assigning parking:", error);
    }
  };

  const resetForm = () => {
    setSelectedTrain("");
    setSelectedTrack("");
    setSelectedPosition(0);
    setStatus("parking");
    setNotes("");
    setIsEditing(false);
    setEditingTrain("");
  };

  const parkingTracksList = parkingTracks.filter(
    (track) => track.type === "parking"
  );
  const maintenanceTracks = parkingTracks.filter(
    (track) => track.type === "maintenance"
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const trainId = active.data.current?.trainId;
    const spotId = over.id as string; // Format: "track-position-type" e.g., "01-1-parking"
    const spotData = over.data.current;

    if (!trainId || !spotId) return;

    console.log(`Dropped train ${trainId} on ${spotId}`);

    // Parse spot ID
    // We need a consistent ID format for spots. Let's use: "TRACK_ID:POSITION:TYPE"
    // e.g. "01:1:parking" or "IBL01:1:maintenance"
    const [track, posStr, type] = spotId.split(":");
    const position = parseInt(posStr);
    const trackType = type as "parking" | "maintenance";

    if (!track || !position || !trackType) return;

    // Check if we are dropping on the same spot
    const currentAssignment = parkingData.find(
      (p) => p.train_id === trainId && !p.departure_time
    );
    if (currentAssignment) {
      const currentBay = getBayFromTrack(track, trackType);
      if (
        currentAssignment.bay === currentBay &&
        currentAssignment.position === position
      ) {
        return; // Dropped on same spot
      }
    }

    // Optimistic update could go here, but let's rely on fetch for now or do it properly
    // We need to handle:
    // 1. Assigning a new train (from holding)
    // 2. Moving an existing train
    // 3. Displacing a train (swapping/bumping)

    try {
      const bay = getBayFromTrack(track, trackType);

      // If occupied, we need to move the occupant to holding (delete assignment)
      // OR swap? The requirement says "move current occupant to 'Trains Needing Parking' holding area"
      const occupant = getTrainAtPosition(track, position, trackType);
      if (occupant && occupant.train_id !== trainId) {
        // Displace occupant
        await axios.delete(
          `http://localhost:5005/api/nightly/parking/assignment/${occupant.train_id}`
        );
      }

      // If the dragged train was already parked elsewhere, we update it.
      // If it was in holding, we create a new assignment.
      if (currentAssignment) {
        // Update existing
        const payload: TrainParking = {
          train_id: trainId,
          bay: bay,
          position: position,
          status: trackType,
          arrival_time: currentAssignment.arrival_time,
          notes: currentAssignment.notes,
        };
        await axios.put(
          `http://localhost:5005/api/nightly/parking/assignment/${trainId}`,
          payload
        );
      } else {
        // Create new
        const payload: TrainParking = {
          train_id: trainId,
          bay: bay,
          position: position,
          status: trackType,
          arrival_time: new Date().toISOString(),
          notes: "",
        };
        await axios.post(
          `http://localhost:5005/api/nightly/parking/assignment`,
          payload
        );
      }

      fetchParkingData();
    } catch (error) {
      console.error("Error handling drop:", error);
      // Revert optimistic update if we implemented it
    }
  };

  const getPositionsForSelectedTrack = () => {
    if (status === "maintenance") {
      return [1];
    }
    const track = parkingTracks.find((t) => t.track === selectedTrack);
    return track ? track.positions : [];
  };

  // Get trains that are NOT currently parked
  const unparkedTrains = trains.filter(
    (trainId) =>
      !parkingData.some((p) => p.train_id === trainId && !p.departure_time)
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="min-h-screen w-full"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Header */}
          <div
            className="backdrop-blur-md rounded-2xl p-8 border border-slate-600/30 shadow-2xl text-center"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
          >
            <h1 className="text-4xl font-bold text-slate-50 mb-2 drop-shadow-lg">
              🚆 {t("title")}
            </h1>
            <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 mb-4"></div>
            <p className="text-slate-300">{t("subtitle")}</p>
          </div>

          {/* Holding Area */}
          <div
            className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
          >
            <h2 className="text-xl font-semibold text-slate-50 mb-4 flex items-center gap-2">
              <span className="text-2xl">🚉</span>{" "}
              {t("holdingArea") || "Trains Needing Parking"}
            </h2>
            <div className="flex flex-wrap gap-3 min-h-[60px] p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
              {unparkedTrains.length === 0 ? (
                <div className="text-slate-500 italic w-full text-center py-2">
                  No trains waiting
                </div>
              ) : (
                unparkedTrains.map((trainId) => (
                  <DraggableTrain key={trainId} trainId={trainId} />
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Parking Assignment Form */}
            <div
              className="xl:col-span-1 backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400"></div>
                <h2 className="text-xl font-semibold text-slate-50">
                  {isEditing ? t("editParking") : t("assignParking")}
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    {t("selectTrain")}
                  </label>
                  <select
                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    value={selectedTrain}
                    onChange={(e) => setSelectedTrain(e.target.value)}
                  >
                    <option value="" className="bg-slate-800">
                      {t("selectTrainPlaceholder")}
                    </option>
                    {trains.map((train) => (
                      <option
                        key={train}
                        value={train}
                        className="bg-slate-800"
                      >
                        {train}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    {t("assignmentType")}
                  </label>
                  <select
                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    value={status}
                    onChange={(e) =>
                      handleStatusChange(
                        e.target.value as "parking" | "maintenance"
                      )
                    }
                  >
                    <option value="parking" className="bg-slate-800">
                      {t("typeParking")}
                    </option>
                    <option value="maintenance" className="bg-slate-800">
                      {t("typeMaintenance")}
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    {status === "maintenance"
                      ? t("maintenanceBaySelection")
                      : t("stablingTrackSelection")}
                  </label>
                  <select
                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    value={selectedTrack}
                    onChange={(e) => handleTrackChange(e.target.value)}
                  >
                    <option value="" className="bg-slate-800">
                      {t("selectTrackPlaceholder")}
                    </option>
                    {(status === "maintenance"
                      ? maintenanceTracks
                      : parkingTracksList
                    ).map((track) => (
                      <option
                        key={track.track}
                        value={track.track}
                        className="bg-slate-800"
                      >
                        {status === "maintenance"
                          ? track.track
                          : `${t("track")} ${track.track}`}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTrack && status === "parking" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      {t("positionSelection")}
                    </label>
                    <select
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                      value={selectedPosition}
                      onChange={(e) =>
                        setSelectedPosition(parseInt(e.target.value))
                      }
                    >
                      <option value={0} className="bg-slate-800">
                        {t("selectPositionPlaceholder")}
                      </option>
                      {getPositionsForSelectedTrack().map((position) => {
                        const isOccupied = isPositionOccupied(
                          selectedTrack,
                          position,
                          "parking"
                        );
                        const occupyingTrain = getTrainAtPosition(
                          selectedTrack,
                          position,
                          "parking"
                        );

                        return (
                          <option
                            key={position}
                            value={position}
                            disabled={isOccupied && !isEditing}
                            className={`bg-slate-800 ${
                              isOccupied ? "text-red-400" : ""
                            }`}
                          >
                            {t("position")} {position}
                            {isOccupied
                              ? ` (${t("occupiedBy", {
                                  trainId: occupyingTrain?.train_id || "",
                                })})`
                              : ` (${t("available")})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {selectedTrack && status === "maintenance" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      {t("position")}
                    </label>
                    <div
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-300 backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    >
                      {t("position")} 1 ({t("fixedForMaintenance")})
                      {selectedPosition === 1 && (
                        <div className="text-sm text-slate-400 mt-1">
                          {isPositionOccupied(selectedTrack, 1, "maintenance")
                            ? t("occupiedBy", {
                                trainId:
                                  getTrainAtPosition(
                                    selectedTrack,
                                    1,
                                    "maintenance"
                                  )?.train_id || "",
                              })
                            : t("available")}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    {t("assignmentNotes")}
                  </label>
                  <textarea
                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm resize-none"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("notesPlaceholder")}
                  />
                </div>

                <button
                  onClick={handleAssignParking}
                  disabled={
                    !selectedTrain || !selectedTrack || !selectedPosition
                  }
                  className={`w-full py-4 px-6 text-lg font-semibold text-slate-50 rounded-xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 backdrop-blur-sm ${
                    !selectedTrain || !selectedTrack || !selectedPosition
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  style={{
                    background:
                      !selectedTrain || !selectedTrack || !selectedPosition
                        ? "rgba(100, 116, 139, 0.5)"
                        : isEditing
                        ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
                        : "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                    boxShadow:
                      !selectedTrain || !selectedTrack || !selectedPosition
                        ? "none"
                        : isEditing
                        ? "0 10px 25px -5px rgba(251, 191, 36, 0.3)"
                        : "0 10px 25px -5px rgba(56, 189, 248, 0.3)",
                  }}
                >
                  {isEditing
                    ? `🔄 ${t("updateAssignment")}`
                    : `📍 ${t("assignButton")}`}
                </button>

                {isEditing && (
                  <button
                    onClick={resetForm}
                    className="w-full py-3 px-6 rounded-xl text-slate-300 font-medium border border-slate-600 transition-all duration-300 hover:border-slate-400 hover:text-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/20 backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(100, 116, 139, 0.3)" }}
                  >
                    ✖️ {t("cancelEdit")}
                  </button>
                )}
              </div>
            </div>

            {/* Parking Visualization */}
            <div
              className="xl:col-span-2 backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full bg-gradient-to-b from-sky-400 to-blue-400"></div>
                  <h2 className="text-xl font-semibold text-slate-50">
                    {t("realTimeLayout")}
                  </h2>
                </div>
                <button
                  onClick={() => router.push("/Layer2dashboard")}
                  className="px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-900 shadow-md hover:from-sky-500 hover:to-emerald-500 transition-all duration-200"
                >
                  {t("goToDashboard")}
                </button>
              </div>

              <div className="space-y-8">
                {/* Parking Tracks - ONLY show parking trains */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-50 border-l-4 border-emerald-400 pl-4">
                    {t("stablingTracksTitle")}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {parkingTracksList.map((track) => (
                      <div
                        key={track.track}
                        className="border border-slate-600/50 rounded-xl p-4 backdrop-blur-sm"
                        style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                      >
                        <h4 className="font-semibold text-slate-50 text-center mb-3">
                          {t("track")} {track.track}
                        </h4>
                        <div className="space-y-2">
                          {track.positions.map((position) => {
                            const assignment = getTrainAtPosition(
                              track.track,
                              position,
                              "parking"
                            );
                            const spotId = `${track.track}:${position}:parking`;

                            return (
                              <DroppableSpot
                                key={position}
                                id={spotId}
                                isOccupied={!!assignment}
                                type="parking"
                              >
                                <div className="font-medium text-slate-400 text-xs mb-1">
                                  {t("position")} {position}
                                </div>
                                {assignment ? (
                                  <DraggableTrain
                                    trainId={assignment.train_id}
                                  />
                                ) : (
                                  <div className="text-xs text-slate-500">
                                    {t("available")}
                                  </div>
                                )}
                              </DroppableSpot>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Maintenance Bays - ONLY show maintenance trains */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-50 border-l-4 border-amber-400 pl-4">
                    {t("maintenanceBaysTitle")}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {maintenanceTracks.map((track) => (
                      <div
                        key={track.track}
                        className="border border-slate-600/50 rounded-xl p-4 backdrop-blur-sm"
                        style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                      >
                        <h4 className="font-semibold text-slate-50 text-center mb-3">
                          {track.track}
                        </h4>
                        {track.positions.map((position) => {
                          const assignment = getTrainAtPosition(
                            track.track,
                            position,
                            "maintenance"
                          );
                          const spotId = `${track.track}:${position}:maintenance`;

                          return (
                            <DroppableSpot
                              key={position}
                              id={spotId}
                              isOccupied={!!assignment}
                              type="maintenance"
                            >
                              {assignment ? (
                                <DraggableTrain trainId={assignment.train_id} />
                              ) : (
                                <div className="text-xs text-slate-500">
                                  {t("available")}
                                </div>
                              )}
                            </DroppableSpot>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Assignments Table */}
          <div
            className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-pink-400 to-rose-400"></div>
              <h2 className="text-xl font-semibold text-slate-50">
                {t("activeAssignments")}
              </h2>
            </div>

            {parkingData.filter((a) => !a.departure_time).length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚆</div>
                <p className="text-slate-400 text-lg">
                  {t("noActiveAssignments")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div
                  className="rounded-xl border border-slate-600/50 backdrop-blur-sm overflow-hidden"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                >
                  <table className="min-w-full">
                    <thead
                      className="border-b border-slate-600/50"
                      style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                    >
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                          {t("tableTrainId")}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                          {t("tablePosition")}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                          {t("tableStatus")}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                          {t("tableArrivalTime")}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                          {t("tableNotes")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-600/30">
                      {parkingData
                        .filter((assignment) => !assignment.departure_time)
                        .map((assignment) => (
                          <tr
                            key={assignment.train_id}
                            className="hover:bg-slate-700/30 transition-colors duration-200"
                          >
                            <td className="px-6 py-4 font-medium text-slate-50">
                              {t("train")} {assignment.train_id}
                            </td>
                            <td className="px-6 py-4 text-slate-300">
                              {getPositionDisplayName(
                                assignment.bay,
                                assignment.position
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-3 py-1 text-xs rounded-full font-medium capitalize border ${
                                  assignment.status === "parking"
                                    ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
                                    : "bg-amber-400/20 text-amber-300 border-amber-400/30"
                                }`}
                              >
                                {assignment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-300 text-sm">
                              {new Date(
                                assignment.arrival_time
                              ).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-slate-400 max-w-xs truncate text-sm">
                              {assignment.notes}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <DraggableTrain
              trainId={activeId.replace("train-", "")}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
