import React, { useState } from "react";
import {
  Clock,
  User,
  Activity,
  CheckCircle2,
  AlertCircle,
  Ban,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { QueueItem, QueueStatus } from "../../types";
import { useToast } from "../common/Toast";
import { getLocalDateString } from "../../services/storage";

interface ReceptionistQueueViewProps {
  queue: QueueItem[];
  onCancelQueueItem: (queueId: string) => void;
  onRefresh?: () => void;
  onDeleteQueueItem?: (queueId: string) => void;
  onClearCompletedQueue?: () => void;
}

export const ReceptionistQueueView: React.FC<ReceptionistQueueViewProps> = ({
  queue,
  onCancelQueueItem,
  onRefresh,
  onDeleteQueueItem,
  onClearCompletedQueue,
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<"all" | "active" | "completed">(
    "active",
  );

  const today = getLocalDateString();
  const todaysQueue = (queue || []).filter((q) => q.visitDate === today);

  // Active queue sorted by sequenceNumber (strict FIFO)
  const activeQueue = todaysQueue
    .filter(
      (q) =>
        q.status === "With Doctor" ||
        q.status === "Next" ||
        q.status === "Waiting",
    )
    .sort((a, b) => {
      const seqA = Number(a.sequenceNumber) || 0;
      const seqB = Number(b.sequenceNumber) || 0;
      if (seqA !== seqB) return seqA - seqB;
      return (a.arrivalTime || "").localeCompare(b.arrivalTime || "");
    });

  const completedQueue = todaysQueue
    .filter((q) => q.status === "Completed")
    .sort(
      (a, b) =>
        new Date(b.completedAt || 0).getTime() -
        new Date(a.completedAt || 0).getTime(),
    );

  const displayedQueue =
    filter === "active"
      ? activeQueue
      : filter === "completed"
        ? completedQueue
        : todaysQueue.sort((a, b) => {
            const seqA = Number(a.sequenceNumber) || 0;
            const seqB = Number(b.sequenceNumber) || 0;
            if (seqA !== seqB) return seqA - seqB;
            return (a.arrivalTime || "").localeCompare(b.arrivalTime || "");
          });

  const currentPatientWithDoctor = todaysQueue.find(
    (q) => q.status === "With Doctor",
  );

  // Next patient in line: first patient with status 'Next' or 'Waiting', matching activeQueue FIFO ordering
  const nextPatientInLine = todaysQueue
    .filter((q) => q.status === "Next" || q.status === "Waiting")
    .sort((a, b) => {
      if (a.status === "Next" && b.status !== "Next") return -1;
      if (b.status === "Next" && a.status !== "Next") return 1;
      const seqA = Number(a.sequenceNumber) || 0;
      const seqB = Number(b.sequenceNumber) || 0;
      if (seqA !== seqB) return seqA - seqB;
      return (a.arrivalTime || "").localeCompare(b.arrivalTime || "");
    })[0];

  const handleCancel = (item: QueueItem) => {
    if (item.status === "With Doctor") {
      showToast(
        "Cannot cancel patient who is currently in consultation with the doctor.",
        "error",
      );
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to cancel ${item.patientName} (${item.queueNumber})? This will remove them from the active queue.`,
    );
    if (confirmed) {
      onCancelQueueItem(item.id);
      showToast(
        `${item.patientName} (${item.queueNumber}) marked as Cancelled.`,
        "info",
      );
    }
  };

  const handleDeleteItem = (item: QueueItem) => {
    const confirmed = window.confirm(
      `Delete queue token ${item.queueNumber} for ${item.patientName}? This will permanently remove this record from the queue.`,
    );
    if (confirmed && onDeleteQueueItem) {
      onDeleteQueueItem(item.id);
      showToast(`Queue token ${item.queueNumber} deleted.`, "info");
    }
  };

  const handleClearCompleted = () => {
    const inactiveCount = todaysQueue.filter(
      (q) => q.status === "Completed" || q.status === "Cancelled",
    ).length;
    if (inactiveCount === 0) {
      showToast("No completed or cancelled tokens to clear today.", "info");
      return;
    }
    const confirmed = window.confirm(
      `Clear all completed and cancelled queue tokens (${inactiveCount} records) for today? Patients currently waiting or with the doctor will not be touched.`,
    );
    if (confirmed && onClearCompletedQueue) {
      onClearCompletedQueue();
      showToast(
        `Cleared ${inactiveCount} completed/cancelled tokens.`,
        "success",
      );
    }
  };

  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case "With Doctor":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            With Doctor
          </span>
        );
      case "Next":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Next In Line
          </span>
        );
      case "Waiting":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
            Waiting
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Completed
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-6 page-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Patient Queue</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onClearCompletedQueue && (
            <button
              onClick={handleClearCompleted}
              title="Clear all completed and cancelled tokens"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear Completed / Inactive</span>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Live Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Stage Highlights (Now Serving & Next) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Currently With Doctor */}
        <div className="bg-linear-to-br from-emerald-50 via-white to-emerald-50/30 p-5 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <Stethoscope className="w-4 h-4 text-emerald-700" />
              <span>Now in Doctor Cabin</span>
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              Active Consultation
            </span>
          </div>

          {currentPatientWithDoctor ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-emerald-950 font-mono tracking-tight">
                  {currentPatientWithDoctor.queueNumber}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 capitalize">
                    {currentPatientWithDoctor.patientName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentPatientWithDoctor.patientGender}{" "}
                    {currentPatientWithDoctor.patientAge} yrs Mobile:{" "}
                    {currentPatientWithDoctor.patientMobile}
                  </p>
                </div>
              </div>

              <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-200/80 text-xs text-slate-700">
                <strong className="text-emerald-950">Complaint:</strong>{" "}
                {currentPatientWithDoctor.complaint}
                {currentPatientWithDoctor.vitals?.temperature && (
                  <span className="ml-3 text-slate-500">
                    Temp:{" "}
                    <strong>
                      {currentPatientWithDoctor.vitals.temperature}F
                    </strong>
                  </span>
                )}
                {currentPatientWithDoctor.vitals?.bloodPressure && (
                  <span className="ml-2 text-slate-500">
                    BP:{" "}
                    <strong>
                      {currentPatientWithDoctor.vitals.bloodPressure}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              Doctor cabin is currently ready for the next patient.
            </div>
          )}
        </div>

        {/* Card 2: Next in Line */}
        <div className="bg-linear-to-br from-amber-50 via-white to-amber-50/30 p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Next Patient In Line</span>
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
              {nextPatientInLine?.status === "Next"
                ? "Ready to Enter"
                : "Waiting Next"}
            </span>
          </div>

          {nextPatientInLine ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-amber-950 font-mono tracking-tight">
                  {nextPatientInLine.queueNumber}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 capitalize">
                    {nextPatientInLine.patientName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {nextPatientInLine.patientGender}{" "}
                    {nextPatientInLine.patientAge} yrs Mobile:{" "}
                    {nextPatientInLine.patientMobile}
                  </p>
                </div>
              </div>

              <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200/80 text-xs text-slate-700">
                <strong className="text-amber-950">Complaint:</strong>{" "}
                {nextPatientInLine.complaint}
                {nextPatientInLine.vitals?.temperature && (
                  <span className="ml-3 text-slate-500">
                    Temp:{" "}
                    <strong>{nextPatientInLine.vitals.temperature}F</strong>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              No patient currently waiting next in line.
            </div>
          )}
        </div>
      </div>

      {/* Queue Filter Bar & Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden space-y-0">
        <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Today's Queue ({todaysQueue.length} total)
            </h2>
            <p className="text-xs text-slate-500">
              Patients are called in the exact order they arrive and check in
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold overflow-x-auto touch-scroll max-w-full">
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1 rounded-lg transition ${
                filter === "active"
                  ? "bg-white text-[#1e536e] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active Queue ({activeQueue.length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-3 py-1 rounded-lg transition ${
                filter === "completed"
                  ? "bg-white text-[#1e536e] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Completed ({completedQueue.length})
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg transition ${
                filter === "all"
                  ? "bg-white text-[#1e536e] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({todaysQueue.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left text-sm min-w-162.5">
            <thead className="bg-[#1e536e] text-white text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Queue No</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-4 py-3">Arrival</th>
                <th className="px-5 py-3">Complaint & Vitals</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {displayedQueue.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    No patients currently in this queue view.
                  </td>
                </tr>
              ) : (
                displayedQueue.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`transition ${
                      item.status === "With Doctor"
                        ? "bg-emerald-50/60 font-medium"
                        : item.status === "Next"
                          ? "bg-amber-50/40 font-medium"
                          : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono font-extrabold text-sm text-slate-900">
                      <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
                        {item.queueNumber}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 capitalize text-sm">
                        {item.patientName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.patientGender} {item.patientAge} yrs{" "}
                        <span className="font-mono">{item.patientMobile}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 text-[11px]">
                      {item.arrivalTime}
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="font-semibold text-slate-800 line-clamp-1">
                        {item.complaint}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 mt-1">
                        {item.vitals?.temperature && (
                          <span>Temp: {item.vitals.temperature}F</span>
                        )}
                        {item.vitals?.bloodPressure && (
                          <span>BP: {item.vitals.bloodPressure}</span>
                        )}
                        {item.vitals?.weight && (
                          <span>Wt: {item.vitals.weight}kg</span>
                        )}
                        {item.vitals?.spO2 && (
                          <span>SpO2: {item.vitals.spO2}%</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {item.status === "Waiting" || item.status === "Next" ? (
                        <button
                          type="button"
                          onClick={() => handleCancel(item)}
                          title="Cancel if patient leaves before consultation"
                          className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded text-xs font-semibold transition"
                        >
                          Cancel
                        </button>
                      ) : (item.status === "Completed" ||
                          item.status === "Cancelled") &&
                        onDeleteQueueItem ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          title="Permanently remove this queue record"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
