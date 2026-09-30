import React, { useState } from "react";
import { MediHiveLogo } from "../common/MediHiveLogo";
import { UserAccount } from "../../types";
import { useToast } from "../common/Toast";
import { authenticateUser } from "../../services/storage";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import {
  KeyRound,
  User,
  Lock,
  ArrowRight,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

interface LoginScreenProps {
  onLogin: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast("Please enter both username and password.", "error");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const authResult = authenticateUser(username, password);

      if (authResult.success && authResult.user) {
        const roleLabel =
          authResult.user.role === "receptionist" ? "Receptionist" : "Doctor";
        showToast(
          `Welcome back, ${authResult.user.name} (${roleLabel})!`,
          "success",
        );
        onLogin(authResult.user);
      } else {
        showToast(
          authResult.errorMessage ||
            "Invalid username or password. Please verify your credentials.",
          "error",
        );
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col justify-center items-center p-3 sm:p-6 lg:p-8">
      {/* Top micro brand indicator */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 px-2">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          MediHive Clinical Practice & Reception Management
        </span>
      </div>

      {/* Main Login Card with Split Style */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 flex flex-col md:flex-row min-h-125">
        {/* Left Dark Teal Panel */}
        <div className="w-full md:w-5/12 bg-linear-to-br from-[#1e536e] via-[#1a475e] to-[#123141] text-white p-6 sm:p-8 md:p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow / honeycomb pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] bg-size-[16px_16px]"></div>

          <div>
            <MediHiveLogo size="lg" textColor="text-white" />
          </div>

          <div className="my-auto py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-semibold mb-3 border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
              <span>CLINICAL & RECEPTION SUITE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              CLINIC PORTAL
            </h1>
            <p className="text-sky-100/80 text-sm leading-relaxed mb-6">
              Sign in to access your consultations, prescriptions, live patient
              queue, and front-desk clinic operations.
            </p>

            <div className="space-y-2.5 text-xs text-sky-100/75 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded bg-white/10 text-sky-300">
                  <Stethoscope className="w-3.5 h-3.5" />
                </div>
                <span>Doctor: Consultations, OPD Rx & Medical Records</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded bg-white/10 text-sky-300">
                  <ClipboardList className="w-3.5 h-3.5" />
                </div>
                <span>
                  Receptionist: Patient Registration & Live FIFO Queue
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-sky-200/60 pt-4 border-t border-white/10 flex items-center justify-between">
            <span>v2.5 Enterprise</span>
            <span>Auto Role Detection</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-7/12 p-6 sm:p-8 md:p-8 lg:p-12 flex flex-col justify-center bg-white">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Sign In
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Enter your clinic username and password to continue
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 max-w-sm mx-auto w-full"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500 focus:bg-white transition"
                  placeholder="e.g. doctor or receptionist"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500 focus:bg-white transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow transition flex items-center justify-center gap-2 group bg-[#1e536e] hover:bg-[#18445a]"
            >
              <span>
                {loading ? "Authenticating..." : "Sign In to MediHive"}
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-medium text-sky-600 hover:text-sky-800 transition"
              >
                Forgot Password or Need Access?
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}
    </div>
  );
};

interface ForgotPasswordModalProps {
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  onClose,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen: true, onClose });

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
        className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
      >
        <div className="flex items-center gap-3 text-[#1e536e]">
          <div className="p-2 bg-sky-100 rounded-lg">
            <KeyRound className="w-6 h-6 text-sky-700" />
          </div>
          <div>
            <h3 id="forgot-password-title" className="text-lg font-bold">
              Reset Password
            </h3>
            <p className="text-xs text-slate-500">
              MediHive Security Assistance
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          MediHive stores all records locally on your device for absolute
          patient privacy. To reset your master password:
        </p>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
          <p>
            • <strong>Doctor Login:</strong> <code>doctor</code> /{" "}
            <code>doctor123</code> (or <code>admin</code> /{" "}
            <code>admin123</code>)
          </p>
          <p>
            • <strong>Receptionist Login:</strong> <code>receptionist</code> /{" "}
            <code>reception123</code>
          </p>
          <p>
            • Passwords can be changed under{" "}
            <strong>Settings &gt; Authentication</strong> after logging in.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm bg-medihive-700 text-white font-medium rounded-lg hover:bg-medihive-800 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
