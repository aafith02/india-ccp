import { Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import CentralDashboard from "./pages/CentralDashboard";
import StateDashboard from "./pages/StateDashboard";
import ContractorDashboard from "./pages/ContractorDashboard";
import CommunityPortal from "./pages/CommunityPortal";
import TenderList from "./pages/TenderList";
import TenderDetail from "./pages/TenderDetail";
import CreateTender from "./pages/CreateTender";
import BidSubmission from "./pages/BidSubmission";
import ContractExecution from "./pages/ContractExecution";
import FundingPage from "./pages/FundingPage";
import PublicLedger from "./pages/PublicLedger";
import AuditorPanel from "./pages/AuditorPanel";
import ReportIssue from "./pages/ReportIssue";
import VerificationPanel from "./pages/VerificationPanel";
import KycPanel from "./pages/KycPanel";
import PointsPage from "./pages/PointsPage";
import CaseManagement from "./pages/CaseManagement";
import BlacklistManagement from "./pages/BlacklistManagement";

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "central_gov") return <CentralDashboard />;
  if (user?.role === "state_gov") return <StateDashboard />;
  if (user?.role === "contractor") return <ContractorDashboard />;
  if (user?.role === "auditor_ngo") return <AuditorPanel />;
  return <CommunityPortal />;
}

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-sm mb-4">{error.message}</p>
        <button onClick={resetErrorBoundary} className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-teal-700 transition">
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.href = "/dashboard"}>
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Dashboard (role-aware) */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Tenders */}
      <Route path="/tenders" element={<ProtectedRoute><TenderList /></ProtectedRoute>} />
      <Route path="/tenders/new" element={<ProtectedRoute roles={["state_gov"]}><CreateTender /></ProtectedRoute>} />
      <Route path="/tenders/:id" element={<ProtectedRoute><TenderDetail /></ProtectedRoute>} />
      <Route path="/tenders/:id/bid" element={<ProtectedRoute roles={["contractor"]}><BidSubmission /></ProtectedRoute>} />

      {/* Contracts */}
      <Route path="/contracts/:id" element={<ProtectedRoute><ContractExecution /></ProtectedRoute>} />

      {/* Funding */}
      <Route path="/funding" element={<ProtectedRoute roles={["state_gov", "central_gov"]}><FundingPage /></ProtectedRoute>} />

      {/* KYC Management */}
      <Route path="/kyc" element={<ProtectedRoute roles={["state_gov"]}><KycPanel /></ProtectedRoute>} />

      {/* Complaints */}
      <Route path="/complaints" element={<ProtectedRoute roles={["central_gov", "auditor_ngo"]}><AuditorPanel /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} />

      {/* Cases */}
      <Route path="/cases" element={<ProtectedRoute roles={["central_gov", "auditor_ngo"]}><CaseManagement /></ProtectedRoute>} />

      {/* Blacklist Management */}
      <Route path="/blacklist" element={<ProtectedRoute roles={["central_gov", "state_gov"]}><BlacklistManagement /></ProtectedRoute>} />

      {/* Verification (voting) */}
      <Route path="/verify" element={<ProtectedRoute roles={["state_gov"]}><VerificationPanel /></ProtectedRoute>} />

      {/* Points & Leaderboard */}
      <Route path="/points" element={<ProtectedRoute><PointsPage /></ProtectedRoute>} />

      {/* Public */}
      <Route path="/portal" element={<ProtectedRoute><CommunityPortal /></ProtectedRoute>} />
      <Route path="/ledger" element={<ProtectedRoute><PublicLedger /></ProtectedRoute>} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
