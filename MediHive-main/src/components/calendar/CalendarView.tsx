import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Bell, 
  Plus, 
  Save, 
  CheckCircle, 
  User, 
  Phone, 
  Trash2,
  FileText
} from 'lucide-react';
import { Patient, Appointment } from '../../types';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO 
} from 'date-fns';
import { useToast } from '../common/Toast';
import { AddAppointmentModal } from './AddAppointmentModal';

interface CalendarViewProps {
  patients: Patient[];
  appointments: Appointment[];
  dailyNotes: Record<string, string>;
  onSaveDailyNote: (date: string, note: string) => void;
  onDeleteDailyNote?: (date: string) => void;
  onSaveAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onBack: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  patients,
  appointments,
  dailyNotes,
  onSaveDailyNote,
  onDeleteDailyNote,
  onSaveAppointment,
  onDeleteAppointment,
  onBack,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [noteText, setNoteText] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const { showToast } = useToast();

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // Load existing note when date changes
  React.useEffect(() => {
    setNoteText(dailyNotes[selectedDateStr] || '');
  }, [selectedDateStr, dailyNotes]);

  // Generate calendar days grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Map follow-ups from patient records
  const allFollowUps = useMemo(() => {
    const list: { patient: Patient; nextVisitDate: string; diagnosis: string }[] = [];
    patients.forEach((p) => {
      p.records.forEach((r) => {
        if (r.nextVisitDate) {
          list.push({
            patient: p,
            nextVisitDate: r.nextVisitDate,
            diagnosis: r.diagnosis || 'Follow-up Consultation',
          });
        }
      });
    });
    return list;
  }, [patients]);

  // Appointments / Follow-ups for the selected date
  const selectedDateAppointments = useMemo(() => {
    const apts = appointments.filter((a) => a.date === selectedDateStr);
    const followUps = allFollowUps
      .filter((f) => f.nextVisitDate === selectedDateStr)
      .map((f) => ({
        id: `fu-${f.patient.id}-${f.nextVisitDate}`,
        patientId: f.patient.id,
        patientName: f.patient.fullName,
        patientMobile: f.patient.mobile,
        date: f.nextVisitDate,
        time: '10:00',
        reason: `Prescription Follow-up (${f.diagnosis})`,
        type: 'Follow-up Reminder' as const,
        status: 'Scheduled' as const,
      }));
    
    // De-duplicate if already exists in appointments
    const combined = [...apts];
    followUps.forEach((fu) => {
      if (!combined.some((c) => c.patientName === fu.patientName && c.date === fu.date)) {
        combined.push(fu);
      }
    });

    return combined;
  }, [appointments, allFollowUps, selectedDateStr]);

  const handleSaveNote = () => {
    onSaveDailyNote(selectedDateStr, noteText);
    showToast(`Note saved for ${selectedDateStr}`, 'success');
  };

  const handleDeleteNote = () => {
    if (!dailyNotes[selectedDateStr] && !noteText) return;
    if (window.confirm(`Delete daily note for ${selectedDateStr}?`)) {
      setNoteText('');
      if (onDeleteDailyNote) {
        onDeleteDailyNote(selectedDateStr);
      }
      showToast(`Note deleted for ${selectedDateStr}`, 'info');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 page-fade-in no-print">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Clinic Calendar</h1>
            <p className="text-xs text-slate-500">Manage appointments, follow-ups, and daily clinic notes</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#2da478] hover:bg-[#258d67] text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-sm flex items-center justify-center gap-2 transition w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Book Appointment</span>
        </button>
      </div>

      {/* Main Grid: Calendar on Left, Daily Notes & Appointments on Right matching Page 9 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Calendar Month Grid (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200/90 p-3 sm:p-5 space-y-4">
          {/* Month Navigator */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#1e536e] flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              <span>{format(currentMonth, 'MMMM yyyy')}</span>
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(now);
                  setSelectedDate(now);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-[#1e536e] hover:bg-sky-50 rounded-lg transition"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 uppercase py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
            {calendarDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonthDay = isSameMonth(day, currentMonth);

              // Check if day has appointments / followups / notes
              const hasApts = appointments.some((a) => a.date === dayStr) ||
                allFollowUps.some((f) => f.nextVisitDate === dayStr);
              const hasNote = Boolean(dailyNotes[dayStr]);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-11.5 sm:min-h-14.5 p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-left flex flex-col justify-between transition-all relative border ${
                    isSelected
                      ? 'bg-[#1e536e] text-white border-[#1e536e] shadow-md'
                      : isCurrentMonthDay
                      ? 'bg-slate-50 hover:bg-sky-50/70 border-slate-200/80 text-slate-700'
                      : 'bg-slate-100/40 border-transparent text-slate-300'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                    {format(day, 'd')}
                  </span>

                  {/* Indicators */}
                  <div className="flex items-center gap-1 mt-1">
                    {hasApts && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? 'bg-amber-300' : 'bg-amber-500'
                        }`}
                        title="Appointments or Follow-ups"
                      />
                    )}
                    {hasNote && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? 'bg-sky-300' : 'bg-sky-500'
                        }`}
                        title="Daily Notes"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-2 flex items-center gap-4 text-[11px] text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Follow-up / Appointment
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Clinic Note Saved
            </span>
          </div>
        </div>

        {/* Right Side: Daily Notes & Day Schedule (5 cols) matching Page 9 */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Notes for Date Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-[#1e536e] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Notes for {selectedDateStr}</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Daily Log</span>
            </div>

            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write notes for this date (e.g. clinic stock, special cases, reminders)..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500 focus:bg-white transition leading-relaxed"
            />

            <div className="flex items-center justify-between">
              {(dailyNotes[selectedDateStr] || noteText) ? (
                <button
                  type="button"
                  onClick={handleDeleteNote}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Note</span>
                </button>
              ) : <span />}

              <button
                type="button"
                onClick={handleSaveNote}
                className="bg-[#2ba4c7] hover:bg-[#228da8] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </div>

          {/* Appointments & Follow-ups on Selected Date */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Schedule ({selectedDateAppointments.length})</span>
              </h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {selectedDateAppointments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No appointments or follow-ups scheduled for {selectedDateStr}.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {selectedDateAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 capitalize">
                        {apt.patientName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          apt.type === 'Follow-up Reminder'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-sky-100 text-sky-900'
                        }`}
                      >
                        {apt.type}
                      </span>
                    </div>

                    <p className="text-slate-600 text-[11px] flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-400" /> {apt.patientMobile || 'No phone'}
                      <span>•</span>
                      <Clock className="w-3 h-3 text-slate-400" /> {apt.time}
                    </p>

                    <p className="text-slate-700 font-medium text-[11px]">
                      {apt.reason}
                    </p>

                    {apt.id.startsWith('APT-') && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => onDeleteAppointment(apt.id)}
                          className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Add Appointment Modal */}
      <AddAppointmentModal
        patients={patients}
        defaultDate={selectedDateStr}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaveAppointment={onSaveAppointment}
      />
    </div>
  );
};

