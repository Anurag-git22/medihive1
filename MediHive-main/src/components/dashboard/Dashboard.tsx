import React, { useState, useMemo } from "react";
import {
  Search,
  UserPlus,
  Clock,
  FileText,
  IndianRupee,
  Bell,
  ChevronRight,
  Eye,
  Edit3,
  ChevronLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Stethoscope,
  ArrowRight,
  Activity,
  UserCheck,
  Phone,
} from "lucide-react";
import { Patient, OPDRecord, QueueItem } from "../../types";
import {
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isAfter,
  isBefore,
  addDays,
  addMonths,
  subMonths,
} from "date-fns";

interface DashboardProps {
  patients: Patient[];
  queue?: QueueItem[];
  onAddPatient: () => void;
  onViewPatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onNavigateToOpd: (patientId?: string) => void;
  onNavigateToCalendar: (date?: string) => void;
  onNavigateToPatients: () => void;
  onCallPatientIntoCabin?: (queueId?: string) => void;
  onOpenConsultation?: (queueItem: QueueItem) => void;
  onNavigateToQueue?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  patients,
  queue = [],
  onAddPatient,
  onViewPatient,
  onEditPatient,
  onNavigateToOpd,
  onNavigateToCalendar,
  onNavigateToPatients,
  onCallPatientIntoCabin,
  onOpenConsultation,
  onNavigateToQueue,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [revenuePeriod, setRevenuePeriod] = useState<
    "today" | "weekly" | "monthly" | "yearly"
  >("today");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // All OPD visits flattened
  const allRecords = useMemo(() => {
    const records: { record: OPDRecord; patient: Patient }[] = [];
    patients.forEach((p) => {
      p.records.forEach((r) => {
        records.push({ record: r, patient: p });
      });
    });
    return records.sort(
      (a, b) =>
        new Date(b.record.visitDate).getTime() -
        new Date(a.record.visitDate).getTime(),
    );
  }, [patients]);

  // Today's OPD count
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todaysOpdRecords = useMemo(() => {
    return allRecords.filter((r) => r.record.visitDate === todayStr);
  }, [allRecords, todayStr]);

  // Follow-ups due today or this week
  const followUpsDue = useMemo(() => {
    return allRecords.filter((r) => {
      if (!r.record.nextVisitDate) return false;
      return r.record.nextVisitDate === todayStr;
    });
  }, [allRecords, todayStr]);

  // Overdue follow-ups (next visit date < today)
  const overdueFollowUps = useMemo(() => {
    return allRecords.filter((r) => {
      if (!r.record.nextVisitDate) return false;
      return isBefore(parseISO(r.record.nextVisitDate), parseISO(todayStr));
    });
  }, [allRecords, todayStr]);

  // Revenue calculation
  const revenueStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let todayRev = 0;
    let weekRev = 0;
    let monthRev = 0;
    let yearRev = 0;

    allRecords.forEach(({ record }) => {
      const vDate = parseISO(record.visitDate);
      const fee = record.totalFee || 0;

      if (record.visitDate === todayStr) {
        todayRev += fee;
      }
      if (vDate >= weekStart && vDate <= weekEnd) {
        weekRev += fee;
      }
      if (vDate >= monthStart && vDate <= monthEnd) {
        monthRev += fee;
      }
      if (vDate.getFullYear() === now.getFullYear()) {
        yearRev += fee;
      }
    });

    return {
      today: todayRev,
      weekly: weekRev,
      monthly: monthRev,
      yearly: yearRev,
    };
  }, [allRecords, todayStr]);

  // Filtered patients for search
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients.slice(0, 6);
    const q = searchQuery.toLowerCase().trim();
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.mobile.includes(q),
    );
  }, [patients, searchQuery]);

  // Date strip helper (dynamic current week)
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      return {
        num: d.getDate(),
        label: format(d, "EEE"),
        date: format(d, "yyyy-MM-dd"),
        fullDate: d,
      };
    });
  }, [selectedDate]);

  // Queue computations for today
  const todaysQueue = useMemo(() => {
    return (queue || []).filter((q) => q.visitDate === todayStr);
  }, [queue, todayStr]);

  const currentWithDoctor = useMemo(() => {
    return todaysQueue.find((q) => q.status === "With Doctor");
  }, [todaysQueue]);

  const nextInLine = useMemo(() => {
    return todaysQueue
      .filter((q) => q.status === "Next" || q.status === "Waiting")
      .sort((a, b) => {
        if (a.status === "Next" && b.status !== "Next") return -1;
        if (b.status === "Next" && a.status !== "Next") return 1;
        const seqA = Number(a.sequenceNumber) || 0;
        const seqB = Number(b.sequenceNumber) || 0;
        if (seqA !== seqB) return seqA - seqB;
        return (a.arrivalTime || "").localeCompare(b.arrivalTime || "");
      })[0];
  }, [todaysQueue]);

  const waitingQueueList = useMemo(() => {
    return todaysQueue
      .filter((q) => q.status === "Next" || q.status === "Waiting")
      .sort((a, b) => {
        if (a.status === "Next" && b.status !== "Next") return -1;
        if (b.status === "Next" && a.status !== "Next") return 1;
        const seqA = Number(a.sequenceNumber) || 0;
        const seqB = Number(b.sequenceNumber) || 0;
        if (seqA !== seqB) return seqA - seqB;
        return (a.arrivalTime || "").localeCompare(b.arrivalTime || "");
      });
  }, [todaysQueue]);

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 page-fade-in">
      {/* Top Bar: Search + Add Patient Button + Mini Calendar strip */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient by Name / Patient ID / Mobile"
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500 focus:bg-white transition"
          />
        </div>

        {/* Action button & Mini Calendar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            onClick={onAddPatient}
            className="w-full sm:w-auto bg-[#2da478] hover:bg-[#258d67] text-white font-medium text-sm px-4 py-2 rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Patient</span>
          </button>

          {/* Mini Calendar strip matching current date */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs overflow-x-auto touch-scroll max-w-full">
            <button
              onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-700 px-1">
              {format(selectedDate, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-200">
              {weekDays.map((d) => {
                const isSelected = isSameDay(d.fullDate, selectedDate);
                const isToday = isSameDay(d.fullDate, new Date());
                return (
                  <button
                    key={d.date}
                    onClick={() => {
                      setSelectedDate(d.fullDate);
                      onNavigateToCalendar(d.date);
                    }}
                    title={`${d.label} ${d.date}`}
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] transition ${
                      isSelected
                        ? "bg-[#1e536e] text-white shadow-xs"
                        : isToday
                          ? "bg-emerald-100 text-emerald-800 font-extrabold"
                          : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {d.num}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Live Clinic Queue & Cabin Status Widget */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-[#194358] to-[#255f7c] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-sm font-bold tracking-wide uppercase">
              Live Consultation Cabin
            </h2>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-white/15 text-sky-100 border border-white/20"></span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-sky-200 font-medium">
              Waiting:{" "}
              <strong className="text-white">{waitingQueueList.length}</strong>
            </span>
            {onNavigateToQueue && (
              <button
                onClick={onNavigateToQueue}
                className="text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg border border-white/20 transition flex items-center gap-1"
              >
                <span>Full Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          {currentWithDoctor ? (
            /* Patient is currently in cabin */
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center font-black text-lg shadow-sm shrink-0">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-100">
                    Token
                  </span>
                  <span>{currentWithDoctor.queueNumber}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white tracking-wide uppercase">
                      Now in Cabin
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {currentWithDoctor.patientName}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      ({currentWithDoctor.patientAge}y,{" "}
                      {currentWithDoctor.patientGender}) • ID:{" "}
                      {currentWithDoctor.patientId}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 pt-0.5">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {currentWithDoctor.patientMobile}
                    </span>
                    <span>•</span>
                    <span>
                      Complaint:{" "}
                      <strong className="text-slate-800">
                        {currentWithDoctor.complaint || "Checkup"}
                      </strong>
                    </span>
                    {currentWithDoctor.symptoms &&
                      currentWithDoctor.symptoms.length > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1">
                          ({currentWithDoctor.symptoms.slice(0, 3).join(", ")})
                        </span>
                      )}
                  </div>

                  {/* Vitals summary preview */}
                  {currentWithDoctor.vitals && (
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1.5">
                      <span className="bg-white px-2 py-0.5 rounded border border-emerald-200">
                        BP:{" "}
                        <strong className="text-slate-800">
                          {currentWithDoctor.vitals.bp || "—"}
                        </strong>
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-emerald-200">
                        Temp:{" "}
                        <strong className="text-slate-800">
                          {currentWithDoctor.vitals.temp
                            ? `${currentWithDoctor.vitals.temp}°F`
                            : "—"}
                        </strong>
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-emerald-200">
                        Pulse:{" "}
                        <strong className="text-slate-800">
                          {currentWithDoctor.vitals.pulse
                            ? `${currentWithDoctor.vitals.pulse} bpm`
                            : "—"}
                        </strong>
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-emerald-200">
                        SpO2:{" "}
                        <strong className="text-slate-800">
                          {currentWithDoctor.vitals.spo2
                            ? `${currentWithDoctor.vitals.spo2}%`
                            : "—"}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
                <button
                  onClick={() =>
                    onOpenConsultation && onOpenConsultation(currentWithDoctor)
                  }
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Open Consultation</span>
                </button>

                {nextInLine && onCallPatientIntoCabin && (
                  <button
                    onClick={() => onCallPatientIntoCabin(nextInLine.id)}
                    title={`Take Next Patient: ${nextInLine.patientName} (${nextInLine.queueNumber}) into Cabin`}
                    className="px-4 py-2.5 bg-[#194358] hover:bg-[#205570] text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer border border-sky-400/30"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Take Next: {nextInLine.queueNumber}</span>
                  </button>
                )}
              </div>
            </div>
          ) : nextInLine ? (
            /* Cabin is available and patients are waiting in queue */
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 bg-sky-50/60 border border-sky-200/80 rounded-xl p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex flex-col items-center justify-center font-black text-lg shadow-sm shrink-0">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-amber-100">
                    Next
                  </span>
                  <span>{nextInLine.queueNumber}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white tracking-wide uppercase">
                      Ready to Call
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {nextInLine.patientName}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      ({nextInLine.patientAge}y, {nextInLine.patientGender}) •
                      ID: {nextInLine.patientId}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Complaint:{" "}
                    <strong className="text-slate-800">
                      {nextInLine.complaint || "Checkup"}
                    </strong>
                    {nextInLine.symptoms &&
                      nextInLine.symptoms.length > 0 &&
                      ` (${nextInLine.symptoms.join(", ")})`}
                    {nextInLine.symptomDuration &&
                      ` • Duration: ${nextInLine.symptomDuration}`}
                  </p>

                  {nextInLine.vitals && (
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
                      <span className="bg-white px-2 py-0.5 rounded border border-sky-200">
                        BP:{" "}
                        <strong className="text-slate-800">
                          {nextInLine.vitals.bp || "—"}
                        </strong>
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-sky-200">
                        Temp:{" "}
                        <strong className="text-slate-800">
                          {nextInLine.vitals.temp
                            ? `${nextInLine.vitals.temp}°F`
                            : "—"}
                        </strong>
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-sky-200">
                        SpO2:{" "}
                        <strong className="text-slate-800">
                          {nextInLine.vitals.spo2
                            ? `${nextInLine.vitals.spo2}%`
                            : "—"}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                <button
                  onClick={() =>
                    onCallPatientIntoCabin &&
                    onCallPatientIntoCabin(nextInLine.id)
                  }
                  className="w-full md:w-auto px-6 py-3 bg-[#194358] hover:bg-[#205570] text-white text-sm font-bold rounded-xl shadow-md hover:shadow transition flex items-center justify-center gap-2 cursor-pointer animate-pulse hover:animate-none"
                >
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span>
                    Take Next Patient into Cabin ({nextInLine.queueNumber})
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Queue is empty */
            <div className="py-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Cabin is open and queue is empty
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Patients registered by the receptionist will immediately appear
                here in FIFO order.
              </p>
            </div>
          )}

          {/* Mini Waiting Pipeline if multiple patients are in queue */}
          {waitingQueueList.length > 1 && (
            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Upcoming in Line ({waitingQueueList.length} total)
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {waitingQueueList.slice(0, 3).map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {item.patientName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.queueNumber} • {item.complaint || "Checkup"}
                        </p>
                      </div>
                    </div>
                    {item.status !== "With Doctor" && (
                      <button
                        onClick={() =>
                          onCallPatientIntoCabin &&
                          onCallPatientIntoCabin(item.id)
                        }
                        className="px-2 py-1 bg-white hover:bg-slate-200 text-[11px] font-semibold text-sky-800 rounded border border-slate-300 shrink-0 transition"
                      >
                        Call
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overdue followups */}
        <button
          type="button"
          onClick={() => onNavigateToCalendar()}
          className="w-full text-left bg-white p-5 rounded-xl border border-sky-100 shadow-sm hover:shadow-md transition cursor-pointer group flex items-center justify-between relative overflow-hidden"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overdue
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
                {overdueFollowUps.length}
              </h3>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-600 transition-colors" />
        </button>

        {/* Card 2: Today's OPD */}
        <button
          type="button"
          onClick={() => onNavigateToOpd()}
          className="w-full text-left bg-white p-5 rounded-xl border border-amber-100 shadow-sm hover:shadow-md transition cursor-pointer group flex items-center justify-between relative overflow-hidden"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Today's OPD
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
                {todaysOpdRecords.length}
              </h3>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-600 transition-colors" />
        </button>

        {/* Card 3: Revenue (with switcher) */}
        <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition group flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={revenuePeriod}
                    onChange={(e) => setRevenuePeriod(e.target.value as any)}
                    className="text-xs font-semibold text-purple-700 bg-purple-50 border-0 rounded py-0.5 px-1.5 cursor-pointer focus:ring-1 focus:ring-purple-400"
                  >
                    <option value="today">Today's Revenue</option>
                    <option value="weekly">Weekly Revenue</option>
                    <option value="monthly">Monthly Revenue</option>
                    <option value="yearly">Yearly Revenue</option>
                  </select>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
                  ₹{revenueStats[revenuePeriod].toLocaleString("en-IN")}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Follow-ups Due */}
        <button
          type="button"
          onClick={() => onNavigateToCalendar()}
          className="w-full text-left bg-white p-5 rounded-xl border border-emerald-100 shadow-sm hover:shadow-md transition cursor-pointer group flex items-center justify-between relative overflow-hidden"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Follow-ups Due
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
                {followUpsDue.length}
              </h3>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
        </button>
      </div>

      {/* Recent Patients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 sm:px-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Recent Patients
            </h2>
            <p className="text-xs text-slate-500">
              Recently registered and treated clinic patients
            </p>
          </div>
          <button
            onClick={onNavigateToPatients}
            className="text-xs font-semibold text-[#1e536e] hover:text-[#287399] bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition border border-sky-100"
          >
            View All ({patients.length})
          </button>
        </div>

        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left text-sm min-w-162.5">
            <thead className="bg-[#1e536e] text-white text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Patient ID</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-5 py-3">DOB / DOR</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-5 py-3">Mobile</th>
                <th className="px-5 py-3">Last Visit</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-slate-400 text-sm"
                  >
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`View records for ${patient.fullName}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onViewPatient(patient);
                      }
                    }}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer focus:bg-sky-50/60 focus:outline-none"
                    onClick={() => onViewPatient(patient)}
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-xs">
                        {patient.id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 capitalize">
                      {patient.fullName}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {patient.age}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">
                      {patient.dob || patient.registrationDate}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          patient.gender === "Male"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-pink-50 text-pink-700"
                        }`}
                      >
                        {patient.gender}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                      {patient.mobile}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium font-mono text-xs">
                      {patient.lastVisitDate}
                    </td>
                    <td
                      className="px-5 py-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onViewPatient(patient)}
                          title="View Patient Records"
                          className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-md transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditPatient(patient)}
                          title="Edit Patient Details"
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
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
