import React, { useState } from "react";
import { X, Send, MessageSquare, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "../common/Toast";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { submitSupportTicketInSupabase } from "../../services/supabaseService";
import { getStoredAuthUser } from "../../services/storage";

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactSupportModal: React.FC<ContactSupportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });
  const [topic, setTopic] = useState("General Query");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(
    null,
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast("Please fill in both the subject and message", "error");
      return;
    }

    setIsSubmitting(true);
    const user = getStoredAuthUser();
    const ticketId = `MH-${Date.now().toString().slice(-6)}`;

    try {
      await submitSupportTicketInSupabase({
        id: ticketId,
        topic,
        subject: subject.trim(),
        message: message.trim(),
        status: "Open",
        senderName: user?.name || "Clinic Staff",
        senderEmail: user?.username || undefined,
        createdAt: new Date().toISOString(),
      });

      setSubmittedTicketId(ticketId);
      showToast(
        `Support request #${ticketId} submitted successfully!`,
        "success",
      );
    } catch (err: any) {
      console.error("Support ticket error:", err);
      showToast("Failed to submit ticket. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmittedTicketId(null);
    setSubject("");
    setMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 no-print">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-support-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[96dvh] flex flex-col overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#1e536e]" />
            <h3
              id="contact-support-title"
              className="font-bold text-slate-800 text-base"
            >
              Contact MediHive Support
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedTicketId ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <div>
              <h4 className="text-base font-bold text-slate-800">
                Support Ticket Created!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Your ticket has been recorded with reference number:
              </p>
              <p className="text-sm font-black font-mono text-[#1e536e] mt-1 bg-slate-100 py-1 px-3 rounded inline-block border border-slate-200">
                #{submittedTicketId}
              </p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Our technical support team will review your query and respond
              promptly.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-lg bg-[#1e536e] hover:bg-[#18445a] text-white font-bold text-xs shadow-sm transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto touch-scroll"
          >
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              >
                <option value="General Query">General Query</option>
                <option value="Prescription Printing">
                  Prescription Printing & Format
                </option>
                <option value="Patient Records">Patient Data & History</option>
                <option value="Backup & Restore">Data Backup & Export</option>
                <option value="Feature Request">Request New Feature</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your query"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Message Description *
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what you need help with..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500 leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-[#2da478] hover:bg-[#258d67] text-white font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Ticket</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
