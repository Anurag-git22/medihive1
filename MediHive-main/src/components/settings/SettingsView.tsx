import React, { useState } from "react";
import {
  ArrowLeft,
  Save,
  User,
  Building2,
  Mail,
  Database,
  Lock,
  Upload,
  Check,
  Download,
  UploadCloud,
  HelpCircle,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Eye,
  KeyRound,
  Trash2,
  AlertTriangle,
  Cloud,
  RefreshCw,
  ExternalLink,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  DoctorProfile,
  ClinicSettings,
  EmailConfig,
  AppState,
} from "../../types";
import { useToast } from "../common/Toast";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import {
  exportDataBackup,
  updateUserPassword,
  validateCredentials,
} from "../../services/storage";
import {
  fetchGoogleSyncConfig,
  saveGoogleSyncConfig,
  checkGoogleAuthStatus,
  getGoogleAuthUrl,
  disconnectGoogleAccount,
  testGoogleIntegration,
  syncAllPendingRecordsToGoogle,
  syncOpdRecordToGoogle,
  fetchGoogleSyncRecords,
  fetchGoogleSyncOverview,
  subscribeGoogleSyncRecords,
} from "../../services/googleSyncService";
import {
  GoogleSyncConfig,
  GoogleSyncAuthStatus,
  GoogleSyncRecord,
  GoogleTestDiagnostics,
  GoogleSyncOverview,
} from "../../types/googleSync";

interface SettingsViewProps {
  doctor: DoctorProfile;
  clinic: ClinicSettings;
  emailConfig: EmailConfig;
  fullState: AppState;
  onUpdateDoctor: (doc: DoctorProfile) => void;
  onUpdateClinic: (cli: ClinicSettings) => void;
  onUpdateEmailConfig: (cfg: EmailConfig) => void;
  onRestoreBackup: (restoredState: AppState) => void;
  onClearAllClinicData?: () => void;
  onBack: () => void;
}

type SettingsSubView = "main" | "email" | "backup" | "auth" | "google";

export const SettingsView: React.FC<SettingsViewProps> = ({
  doctor,
  clinic,
  emailConfig,
  fullState,
  onUpdateDoctor,
  onUpdateClinic,
  onUpdateEmailConfig,
  onRestoreBackup,
  onClearAllClinicData,
  onBack,
}) => {
  const { showToast } = useToast();
  const [currentSubView, setCurrentSubView] = useState<SettingsSubView>("main");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const totalOpdRecords = (fullState.patients || []).reduce(
    (acc, p) => acc + (p.records?.length || 0),
    0,
  );
  const totalNotes = Object.keys(fullState.dailyNotes || {}).length;

  // Doctor Info state
  const [docName, setDocName] = useState(doctor.name);
  const [docQual, setDocQual] = useState(doctor.qualifications);
  const [docSpec, setDocSpec] = useState(doctor.specialisation);
  const [docLicense, setDocLicense] = useState(doctor.medicalLicenseNo);
  const [docEmail, setDocEmail] = useState(doctor.email);
  const [docContact, setDocContact] = useState(doctor.contact);
  const [docPhoto, setDocPhoto] = useState(doctor.photoUrl || "");

  // Clinic Info state
  const [clinicName, setClinicName] = useState(clinic.name);
  const [clinicAddress, setClinicAddress] = useState(clinic.address);
  const [clinicPhone, setClinicPhone] = useState(clinic.phone);
  const [clinicWebsite, setClinicWebsite] = useState(clinic.website || "");
  const [clinicHours, setClinicHours] = useState(clinic.operatingHours);
  const [clinicLogo, setClinicLogo] = useState(clinic.logoUrl || "");

  // SMTP state
  const [smtpEmail, setSmtpEmail] = useState(emailConfig.smtpEmail);
  const [smtpPassword, setSmtpPassword] = useState(emailConfig.smtpAppPassword);
  const [smtpServer, setSmtpServer] = useState(emailConfig.smtpServer);
  const [smtpPort, setSmtpPort] = useState(emailConfig.smtpPort);

  // Synchronize state when props update (e.g. after Supabase loads on refresh)
  React.useEffect(() => {
    setDocName(doctor.name);
    setDocQual(doctor.qualifications);
    setDocSpec(doctor.specialisation);
    setDocLicense(doctor.medicalLicenseNo);
    setDocEmail(doctor.email);
    setDocContact(doctor.contact);
    setDocPhoto(doctor.photoUrl || "");
  }, [doctor]);

  React.useEffect(() => {
    setClinicName(clinic.name);
    setClinicAddress(clinic.address);
    setClinicPhone(clinic.phone);
    setClinicWebsite(clinic.website || "");
    setClinicHours(clinic.operatingHours);
    setClinicLogo(clinic.logoUrl || "");
  }, [clinic]);

  React.useEffect(() => {
    setSmtpEmail(emailConfig.smtpEmail);
    setSmtpPassword(emailConfig.smtpAppPassword);
    setSmtpServer(emailConfig.smtpServer);
    setSmtpPort(emailConfig.smtpPort);
  }, [emailConfig]);

  // Auth state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Backup state
  const [backupPeriod, setBackupPeriod] = useState<number | "all">("all");
  const [backupFormat, setBackupFormat] = useState<"excel" | "json">("excel");

  // Google Sync state
  const [googleConfig, setGoogleConfig] = useState<GoogleSyncConfig>({
    id: 1,
    sheetId: "",
    driveRootFolderId: "",
    doctorEmail: "shreyashshigwan10@gmail.com",
    autoSyncEnabled: true,
    lastSyncAt: null,
  });
  const [googleAuth, setGoogleAuth] = useState<GoogleSyncAuthStatus>({
    isConnected: false,
    email: null,
  });
  const [googleOverview, setGoogleOverview] =
    useState<GoogleSyncOverview | null>(null);
  const [googleDiagnostics, setGoogleDiagnostics] =
    useState<GoogleTestDiagnostics | null>(null);
  const [googleRecords, setGoogleRecords] = useState<GoogleSyncRecord[]>([]);
  const [isTestingGoogle, setIsTestingGoogle] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isSavingGoogleConfig, setIsSavingGoogleConfig] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  // Load Google settings & status
  const loadGoogleData = async () => {
    setIsLoadingGoogle(true);
    try {
      const [cfg, auth, overview, recs] = await Promise.all([
        fetchGoogleSyncConfig(),
        checkGoogleAuthStatus(),
        fetchGoogleSyncOverview(),
        fetchGoogleSyncRecords(),
      ]);
      setGoogleConfig(cfg);
      setGoogleAuth(auth);
      setGoogleOverview(overview);
      setGoogleRecords(recs);
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleRefreshGoogleLog = async () => {
    setIsLoadingGoogle(true);
    try {
      await loadGoogleData();
      showToast("Realtime sync log refreshed with latest records.", "success");
    } catch {
      showToast("Failed to refresh sync log.", "error");
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  React.useEffect(() => {
    if (currentSubView === "google") {
      loadGoogleData();
      const unsubscribe = subscribeGoogleSyncRecords(() => {
        fetchGoogleSyncRecords().then(setGoogleRecords);
        fetchGoogleSyncOverview().then(setGoogleOverview);
      });
      return () => unsubscribe();
    }
  }, [currentSubView]);

  const handleConnectGoogle = async () => {
    try {
      const { url, error } = await getGoogleAuthUrl();
      if (error || !url) {
        showToast(
          error || "Could not generate Google authorization link.",
          "error",
        );
        return;
      }
      window.location.href = url;
    } catch (err: any) {
      showToast(`OAuth initialization failed: ${err.message}`, "error");
    }
  };

  const handleDisconnectGoogle = async () => {
    if (
      window.confirm(
        "Are you sure you want to disconnect your Google account from MediHive?",
      )
    ) {
      const success = await disconnectGoogleAccount();
      if (success) {
        setGoogleAuth({ isConnected: false, email: null });
        showToast("Google account disconnected.", "info");
        loadGoogleData();
      }
    }
  };

  const handleSaveGoogleConfigForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGoogleConfig(true);
    try {
      const success = await saveGoogleSyncConfig(googleConfig);
      if (success) {
        showToast("Google Drive & Sheets configuration saved.", "success");
        loadGoogleData();
      } else {
        showToast("Failed to save Google configuration.", "error");
      }
    } catch (err: any) {
      showToast(`Error saving config: ${err.message}`, "error");
    } finally {
      setIsSavingGoogleConfig(false);
    }
  };

  const handleRunGoogleTest = async () => {
    setIsTestingGoogle(true);
    setGoogleDiagnostics(null);
    try {
      const results = await testGoogleIntegration();
      setGoogleDiagnostics(results);
      if (results.allPassed) {
        showToast("Google Cloud Integration verified successfully!", "success");
      } else {
        showToast(
          "Some Google tests reported warnings or missing access.",
          "info",
        );
      }
    } catch (err: any) {
      showToast(`Diagnostic test error: ${err.message}`, "error");
    } finally {
      setIsTestingGoogle(false);
    }
  };

  const handleTriggerBulkSync = async () => {
    setIsSyncingAll(true);
    try {
      showToast("Starting Google Drive & Sheets synchronization...", "info");
      const res = await syncAllPendingRecordsToGoogle();
      if (res.success) {
        showToast(
          `Sync complete! ${res.syncedCount ?? 0} records updated in Google.`,
          "success",
        );
      } else {
        showToast(
          `Sync notice: ${res.error || "Some records could not be synchronized."}`,
          "info",
        );
      }
      loadGoogleData();
    } catch (err: any) {
      showToast(`Bulk sync error: ${err.message}`, "error");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSingleRetry = async (opdId: string) => {
    try {
      showToast(`Retrying Google sync for ${opdId}...`, "info");
      const res = await syncOpdRecordToGoogle(opdId, { force: true });
      if (res.success) {
        showToast(`Record ${opdId} synced to Google!`, "success");
      } else {
        showToast(`Sync failed for ${opdId}: ${res.error}`, "error");
      }
      loadGoogleData();
    } catch (err: any) {
      showToast(`Retry error: ${err.message}`, "error");
    }
  };

  // Photo / Logo upload handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setDocPhoto(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setClinicLogo(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Doctor & Clinic Details
  const handleSaveMainSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDoctor: DoctorProfile = {
      ...doctor,
      name: docName,
      qualifications: docQual,
      specialisation: docSpec,
      medicalLicenseNo: docLicense,
      email: docEmail,
      contact: docContact,
      photoUrl: docPhoto,
    };
    const updatedClinic: ClinicSettings = {
      ...clinic,
      name: clinicName,
      address: clinicAddress,
      phone: clinicPhone,
      website: clinicWebsite,
      operatingHours: clinicHours,
      logoUrl: clinicLogo,
    };

    onUpdateDoctor(updatedDoctor);
    onUpdateClinic(updatedClinic);
    showToast("Doctor and Clinic settings saved successfully!", "success");
  };

  // Save SMTP
  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedEmail: EmailConfig = {
      ...emailConfig,
      smtpEmail,
      smtpAppPassword: smtpPassword,
      smtpServer,
      smtpPort: Number(smtpPort) || 587,
      enableNotifications: true,
    };
    onUpdateEmailConfig(updatedEmail);
    showToast("Email SMTP configuration saved successfully!", "success");
  };

  // Test Email
  const handleTestEmail = () => {
    showToast(`Test email dispatched to ${smtpEmail} (Simulated)`, "info");
  };

  // Change Password
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      showToast("Please enter your current password", "error");
      return;
    }
    const currentUsername = fullState.currentUser?.username || "admin";
    const isCurrentValid = validateCredentials(
      currentUsername,
      currentPassword,
    );
    if (!isCurrentValid) {
      showToast("Current password is incorrect.", "error");
      return;
    }
    if (!newPassword.trim()) {
      showToast("Please enter a new password", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New password and confirm password do not match", "error");
      return;
    }
    const success = updateUserPassword(currentUsername, newPassword);
    if (success) {
      showToast("Password changed successfully! Keep it safe.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      showToast("Failed to update password.", "error");
    }
  };

  // Generate Backup
  const handleGenerateBackup = () => {
    exportDataBackup(fullState, backupPeriod, backupFormat);
    showToast(
      `Backup exported successfully as ${backupFormat.toUpperCase()}`,
      "success",
    );
  };

  // Restore Backup
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.patients && parsed.doctor && parsed.clinic) {
          onRestoreBackup(parsed as AppState);
          showToast("Clinic backup restored successfully!", "success");
        } else {
          showToast("Invalid backup file format.", "error");
        }
      } catch (err) {
        showToast("Error reading backup file.", "error");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 page-fade-in no-print">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (currentSubView !== "main") {
                setCurrentSubView("main");
              } else {
                onBack();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {currentSubView === "main" && "Settings"}
              {currentSubView === "email" && "Email Configuration"}
              {currentSubView === "backup" && "Backup Data"}
              {currentSubView === "auth" && "Authentication Settings"}
              {currentSubView === "google" &&
                "Google Drive & Sheets Integration"}
            </h1>
            <p className="text-xs text-slate-500">
              {currentSubView === "main" &&
                "Personalise doctor profile, clinic branding and documents"}
              {currentSubView === "email" &&
                "Configure SMTP settings for sending prescriptions and alerts"}
              {currentSubView === "backup" &&
                "Generate monthly or full backups of your clinic data"}
              {currentSubView === "auth" &&
                "Manage passwords and staff account security"}
              {currentSubView === "google" &&
                "Authorize Google OAuth, set Sheet & Drive folder IDs, and verify cloud sync"}
            </p>
          </div>
        </div>
      </div>

      {/* VIEW 1: Main Settings (Doctor Info + Clinic Details) matching Pages 10 & 11 */}
      {currentSubView === "main" && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveMainSettings}
            className="bg-white rounded-xl shadow-sm border border-slate-200/90 divide-y divide-slate-100 overflow-hidden"
          >
            {/* Doctor Information (Page 10) */}
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold text-[#1e536e] uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Doctor Information</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Profile Photo
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {docPhoto ? (
                        <img
                          src={docPhoto}
                          alt="Doctor avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7 text-slate-400" />
                      )}
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition border border-slate-200">
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Doctor's Name
                    </label>
                    <input
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Medical License No.
                    </label>
                    <input
                      type="text"
                      value={docLicense}
                      onChange={(e) => setDocLicense(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Qualifications
                    </label>
                    <input
                      type="text"
                      value={docQual}
                      onChange={(e) => setDocQual(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Specialisation
                    </label>
                    <input
                      type="text"
                      value={docSpec}
                      onChange={(e) => setDocSpec(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={docEmail}
                      onChange={(e) => setDocEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={docContact}
                      onChange={(e) => setDocContact(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Clinic Details (Page 11) */}
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold text-[#1e536e] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Clinic Details</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clinic Name
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clinic Phone
                  </label>
                  <input
                    type="tel"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clinic Address
                  </label>
                  <input
                    type="text"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Website (if any)
                  </label>
                  <input
                    type="text"
                    value={clinicWebsite}
                    onChange={(e) => setClinicWebsite(e.target.value)}
                    placeholder="e.g. www.shwetaayurveda.com"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={clinicHours}
                    onChange={(e) => setClinicHours(e.target.value)}
                    placeholder="Morning 10 am to 1 pm & Evening 5 pm to 8 pm"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                  />
                </div>
              </div>

              {/* Live Preview Box of Prescription Letterhead matching Page 11 */}
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Live Prescription Letterhead Preview
                </span>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#1e536e] text-sm">
                      {clinicName}
                    </h4>
                    <p className="text-xs text-slate-700">{docName}</p>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      {docQual}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Reg: {docLicense}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-slate-500">
                    <p>Phone: {clinicPhone}</p>
                    <p>Hours: {clinicHours}</p>
                  </div>
                </div>
              </div>

              {/* Save Settings Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#2ba4c7] hover:bg-[#228da8] text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          </form>

          {/* Sub-Cards: Email Configuration, Backup Data, Authentication, Google Cloud Sync */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Email Config Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#1e536e]" />
                  <span>Email Configuration</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Manage SMTP email and app password for automated
                  prescriptions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentSubView("email")}
                className="w-full py-2 bg-[#2ba4c7] hover:bg-[#228da8] text-white text-xs font-semibold rounded-lg transition text-center shadow-xs cursor-pointer"
              >
                Configure Email
              </button>
            </div>

            {/* Backup Data Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#1e536e]" />
                  <span>Backup Data</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Generate monthly or full backups of all patient and clinic
                  data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentSubView("backup")}
                className="w-full py-2 bg-[#2ba4c7] hover:bg-[#228da8] text-white text-xs font-semibold rounded-lg transition text-center shadow-xs cursor-pointer"
              >
                Generate Backup
              </button>
            </div>

            {/* Authentication Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#1e536e]" />
                  <span>Authentication</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Manage login settings and master doctor password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentSubView("auth")}
                className="w-full py-2 bg-[#2ba4c7] hover:bg-[#228da8] text-white text-xs font-semibold rounded-lg transition text-center shadow-xs cursor-pointer"
              >
                Authentication
              </button>
            </div>

            {/* Google Cloud Sync Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-[#1e536e]" />
                    <span>Google Cloud Sync</span>
                  </h3>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      googleAuth.isConnected ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Synchronize patient records to Google Sheets & clinical images
                  to Google Drive.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentSubView("google")}
                className="w-full py-2 bg-[#2ba4c7] hover:bg-[#228da8] text-white text-xs font-semibold rounded-lg transition text-center shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Google Integration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Email / SMTP Configuration matching Page 11 Bottom */}
      {currentSubView === "email" && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveSmtp}
            className="bg-white rounded-xl shadow-sm border border-slate-200/90 p-6 space-y-5"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-[#1e536e]">
                SMTP Settings
              </h2>
              <p className="text-xs text-slate-500">
                Configure SMTP credentials for automated emails
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SMTP Email
                </label>
                <input
                  type="email"
                  value={smtpEmail}
                  onChange={(e) => setSmtpEmail(e.target.value)}
                  placeholder="e.g. shreyashshigwan10@gmail.com"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SMTP App Password
                </label>
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="16-digit app password"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SMTP Server
                </label>
                <input
                  type="text"
                  value={smtpServer}
                  onChange={(e) => setSmtpServer(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  placeholder="587"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestEmail}
                className="px-4 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition"
              >
                Send Test Email
              </button>

              <button
                type="submit"
                className="bg-[#2ba4c7] hover:bg-[#228da8] text-white font-bold text-xs sm:text-sm px-6 py-2 rounded-lg shadow-sm flex items-center gap-2 transition"
              >
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </button>
            </div>
          </form>

          {/* Help Guide for Gmail App Password matching Page 11 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-600" />
              <span>Help Guide — How to get Gmail App Password</span>
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed pl-2">
              <li>
                Go to your Google Account settings (
                <em>myaccount.google.com</em>)
              </li>
              <li>
                Navigate to <strong>Security &gt; 2-Step Verification</strong>
              </li>
              <li>Enable 2-Step Verification if not already enabled</li>
              <li>
                Go to <strong>App Passwords</strong> (under 2-Step Verification)
              </li>
              <li>
                Create a new app password for <em>'Mail'</em> and paste the
                16-character code here.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* VIEW 3: Backup Data matching Page 12 Top */}
      {currentSubView === "backup" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-[#1e536e]">
                Backup Data
              </h2>
              <p className="text-xs text-slate-500">
                Generate monthly or full backups of all clinic records
              </p>
            </div>

            {/* Generator Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Backup Time Range
                </label>
                <select
                  value={backupPeriod}
                  onChange={(e) =>
                    setBackupPeriod(
                      e.target.value === "all" ? "all" : Number(e.target.value),
                    )
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                >
                  <option value={1}>1 Month (Last 30 days)</option>
                  <option value={3}>3 Months (Last 3 months)</option>
                  <option value={6}>6 Months (Last 6 months)</option>
                  <option value={12}>12 Months (Last 12 months)</option>
                  <option value="all">Complete Backup (All time data)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Export Format
                </label>
                <select
                  value={backupFormat}
                  onChange={(e) => setBackupFormat(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                >
                  <option value="excel">Excel (.xlsx) Spreadsheet</option>
                  <option value="json">JSON Backup Archive (.json)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleGenerateBackup}
                  className="w-full bg-[#2ba4c7] hover:bg-[#228da8] text-white font-bold text-sm py-2 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Generate Backup ▼</span>
                </button>
              </div>
            </div>

            {/* Restore Section */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 mb-2">
                Restore from Existing Backup File
              </h3>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                <UploadCloud className="w-4 h-4 text-medihive-600" />
                <span>Upload & Restore JSON Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Danger Zone: Data Management & Reset */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Reset Clinic Records
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanently clear patient records and consultations while
                  keeping clinic settings intact.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <span className="block text-2xl font-black text-slate-800 font-mono">
                  {fullState.patients.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Patients
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <span className="block text-2xl font-black text-slate-800 font-mono">
                  {totalOpdRecords}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  OPD Records
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <span className="block text-2xl font-black text-slate-800 font-mono">
                  {fullState.queue.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Queue Items
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <span className="block text-2xl font-black text-slate-800 font-mono">
                  {totalNotes}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Calendar Notes
                </span>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setResetConfirmText("");
                  setShowResetModal(true);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset & Clear All Clinic Records...</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: Authentication / Change Password matching Page 12 Bottom */}
      {currentSubView === "auth" && (
        <form
          onSubmit={handleChangePassword}
          className="bg-white rounded-xl shadow-sm border border-slate-200/90 p-6 space-y-5"
        >
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#1e536e]">
              Authentication Settings
            </h2>
            <p className="text-xs text-slate-500">
              Change your password securely
            </p>
          </div>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password (admin123)"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="bg-[#2ba4c7] hover:bg-[#228da8] text-white font-bold text-sm px-6 py-2 rounded-lg shadow-sm flex items-center gap-2 transition"
              >
                <KeyRound className="w-4 h-4" />
                <span>Change Password</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* VIEW 4: Google Cloud Sync (Sheets & Drive Integration) */}
      {currentSubView === "google" && (
        <div className="space-y-6">
          {/* Quick Metrics & Sync Trigger Bar */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>Google Sheets & Drive Synchronization</span>
                    {googleAuth.isConnected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Action Required
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dual-destination backup: Consultations in Google Sheets &
                    prescription photos in Google Drive
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleTriggerBulkSync}
                  disabled={isSyncingAll || !googleAuth.isConnected}
                  className="w-full md:w-auto px-4 py-2 text-xs font-bold text-white bg-[#1e536e] hover:bg-[#163f54] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-xs flex items-center justify-center gap-2"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isSyncingAll ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isSyncingAll ? "Syncing..." : "Sync Pending Records Now"}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Consultations
                </div>
                <div className="text-xl font-black text-slate-800 mt-1">
                  {totalOpdRecords}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                  Synced to Google
                </div>
                <div className="text-xl font-black text-emerald-800 mt-1">
                  {googleOverview?.syncedCount ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/70">
                <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                  Pending Sync
                </div>
                <div className="text-xl font-black text-amber-800 mt-1">
                  {googleOverview?.pendingCount ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200/70">
                <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                  Failed / Attention
                </div>
                <div className="text-xl font-black text-rose-800 mt-1">
                  {googleOverview?.failedCount ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Google Account Authorization */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#1e536e] uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>1. Google Account Authorization (OAuth 2.0)</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Google Drive image storage requires direct authorization with the
              doctor's Google account (
              <span className="font-semibold text-slate-800">
                shreyashshigwan10@gmail.com
              </span>
              ) to access the 15 GB quota. All tokens are encrypted and handled
              exclusively by backend Supabase Edge Functions.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                  G
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    {googleAuth.isConnected
                      ? "Authorized Doctor Account"
                      : "No Google Account Linked"}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {googleAuth.isConnected
                      ? googleAuth.email || "shreyashshigwan10@gmail.com"
                      : "Click below to grant Drive & Sheets access"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {googleAuth.isConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                  >
                    Disconnect Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#2ba4c7] hover:bg-[#228da8] rounded-lg shadow-xs transition flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Authorize Google Account</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Drive & Sheets Destination Settings */}
          <form
            onSubmit={handleSaveGoogleConfigForm}
            className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1e536e] uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span>2. Destination File & Folder Configuration</span>
              </h3>
              <div className="flex items-center gap-2">
                {googleConfig.sheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${googleConfig.sheetId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Open Sheet</span>
                  </a>
                )}
                {googleConfig.driveRootFolderId && (
                  <a
                    href={`https://drive.google.com/drive/folders/${googleConfig.driveRootFolderId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium ml-2"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open Drive Folder</span>
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Sheet ID
                </label>
                <input
                  type="text"
                  value={googleConfig.sheetId || ""}
                  onChange={(e) =>
                    setGoogleConfig({
                      ...googleConfig,
                      sheetId: e.target.value,
                    })
                  }
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Drive Root Folder ID
                </label>
                <input
                  type="text"
                  value={googleConfig.driveRootFolderId || ""}
                  onChange={(e) =>
                    setGoogleConfig({
                      ...googleConfig,
                      driveRootFolderId: e.target.value,
                    })
                  }
                  placeholder="Optional (leave blank to create in root My Drive)"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={googleConfig.autoSyncEnabled}
                    onChange={(e) =>
                      setGoogleConfig({
                        ...googleConfig,
                        autoSyncEnabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-[#1e536e] rounded border-slate-300 focus:ring-[#1e536e]"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Auto-sync on OPD Registration &amp; Consultation save
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSavingGoogleConfig}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#2ba4c7] hover:bg-[#228da8] rounded-lg shadow-xs transition flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {isSavingGoogleConfig ? "Saving..." : "Save Settings"}
                  </span>
                </button>
              </div>
            </div>
          </form>

          {/* Section 3: Diagnostic & Connection Testing */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1e536e] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>3. System Diagnostic & Health Verification</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify Edge Functions, Google OAuth tokens, Drive write
                  permissions, and Sheet access
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunGoogleTest}
                disabled={isTestingGoogle}
                className="px-3.5 py-1.5 text-xs font-bold text-[#1e536e] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition flex items-center gap-2"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isTestingGoogle ? "animate-spin" : ""}`}
                />
                <span>{isTestingGoogle ? "Testing..." : "Run Test Suite"}</span>
              </button>
            </div>

            {googleDiagnostics && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">
                    Diagnostic Summary
                  </span>
                  {googleDiagnostics.allPassed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All
                      Services Operational
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                      <AlertCircle className="w-4 h-4 text-rose-600" />{" "}
                      Attention Needed
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        OAuth Token
                      </span>
                      {googleDiagnostics.oauth.ok ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {googleDiagnostics.oauth.message}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Google Drive
                      </span>
                      {googleDiagnostics.drive.ok ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {googleDiagnostics.drive.message}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Google Sheet
                      </span>
                      {googleDiagnostics.sheets.ok ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {googleDiagnostics.sheets.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Live Synchronization Log */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1e536e] uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>4. Realtime Google Synchronization Log</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recent records synced between Supabase, Google Sheets, and
                  Google Drive
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefreshGoogleLog}
                disabled={isLoadingGoogle}
                className="px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 font-medium border border-slate-200 cursor-pointer shadow-2xs"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isLoadingGoogle ? "animate-spin text-[#1e536e]" : ""}`}
                />
                <span>{isLoadingGoogle ? "Refreshing..." : "Refresh Log"}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">OPD ID</th>
                    <th className="py-2.5 px-4">Patient</th>
                    <th className="py-2.5 px-4">Google Sheet</th>
                    <th className="py-2.5 px-4">Drive Photos</th>
                    <th className="py-2.5 px-4">Last Synced</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                  {googleRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400"
                      >
                        No Google sync records found. Consultations will appear
                        here once saved.
                      </td>
                    </tr>
                  ) : (
                    googleRecords.map((rec) => {
                      const pat = fullState.patients.find(
                        (p) => p.id === rec.patientId,
                      );
                      return (
                        <tr
                          key={rec.opdId}
                          className="hover:bg-slate-50/70 transition"
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                            {rec.opdId}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {pat?.fullName || rec.patientId || "—"}
                          </td>
                          <td className="py-2.5 px-4">
                            {rec.sheetSynced ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <Check className="w-3 h-3" /> Row Synced
                              </span>
                            ) : rec.status === "failed" ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200"
                                title={rec.lastError || "Sync failed"}
                              >
                                <XCircle className="w-3 h-3" /> Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <RefreshCw className="w-3 h-3 animate-spin" />{" "}
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            {rec.driveSynced ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <FolderOpen className="w-3 h-3" /> Uploaded (
                                {rec.driveLinks?.length || 0})
                              </span>
                            ) : rec.status === "failed" ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200"
                                title={rec.lastError || "Upload failed"}
                              >
                                <XCircle className="w-3 h-3" /> Failed
                              </span>
                            ) : rec.status === "pending" ||
                              rec.status === "syncing" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <RefreshCw className="w-3 h-3 animate-spin" />{" "}
                                Uploading
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                None
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                            {rec.syncedAt
                              ? `${new Date(rec.syncedAt).toLocaleDateString()} ${new Date(rec.syncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                              : rec.createdAt
                                ? `${new Date(rec.createdAt).toLocaleDateString()} ${new Date(rec.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleSingleRetry(rec.opdId)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition"
                            >
                              Retry Sync
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <ResetClinicConfirmModal
          fullState={fullState}
          totalOpdRecords={totalOpdRecords}
          totalNotes={totalNotes}
          onClose={() => setShowResetModal(false)}
          onConfirm={() => {
            if (onClearAllClinicData) {
              onClearAllClinicData();
            }
            setShowResetModal(false);
            showToast(
              "All clinic patient and consultation records have been cleared.",
              "info",
            );
          }}
        />
      )}
    </div>
  );
};

interface ResetClinicConfirmModalProps {
  fullState: AppState;
  totalOpdRecords: number;
  totalNotes: number;
  onClose: () => void;
  onConfirm: () => void;
}

const ResetClinicConfirmModal: React.FC<ResetClinicConfirmModalProps> = ({
  fullState,
  totalOpdRecords,
  totalNotes,
  onClose,
  onConfirm,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen: true, onClose });
  const [resetConfirmText, setResetConfirmText] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-clinic-dialog-title"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-5 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-3 text-rose-600">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h3
              id="reset-clinic-dialog-title"
              className="text-base font-bold text-slate-900"
            >
              Permanently Clear All Clinic Data?
            </h3>
            <p className="text-xs text-slate-500">
              This action cannot be undone
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <p className="font-medium text-slate-800">
            The following records will be permanently erased:
          </p>
          <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1 pl-1 font-mono">
            <li>{fullState.patients.length} Patient files & visit logs</li>
            <li>{totalOpdRecords} OPD consultations & prescriptions</li>
            <li>{fullState.queue.length} Queue tokens & history</li>
            <li>{totalNotes} Calendar daily notes</li>
          </ul>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            To confirm, type{" "}
            <span className="font-mono font-black text-rose-600 select-all">
              RESET
            </span>{" "}
            below:
          </label>
          <input
            type="text"
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder="Type RESET"
            className="w-full px-3 py-2 text-sm font-mono uppercase bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-rose-900 font-bold tracking-wider"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={resetConfirmText.trim().toUpperCase() !== "RESET"}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-sm flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm & Erase All Records</span>
          </button>
        </div>
      </div>
    </div>
  );
};
