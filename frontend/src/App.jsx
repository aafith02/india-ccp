import { Routes, Route, Navigate } from "react-router-dom";
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
  return <Navigate to="/portal" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Dashboard (role-aware) */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Tenders */}
      <Route path="/tenders" element={<ProtectedRoute><TenderList /></ProtectedRoute>} />
      <Route path="/tenders/new" element={<ProtectedRoute roles={["state_gov"]}><CreateTender /></ProtectedRoute>} />
      <Route path="/tenders/:id" element={<ProtectedRoute><TenderDetail /></ProtectedRoute>} />
      <Route path="/tenders/:id/bid" element={<ProtectedRoute roles={["contractor"]}><BidSubmission /></ProtectedRoute>} />

      {/* Bids */}
      <Route path="/my-bids" element={<ProtectedRoute roles={["contractor"]}><ContractorDashboard /></ProtectedRoute>} />

      {/* Contracts */}
      <Route path="/contracts" element={<ProtectedRoute roles={["state_gov", "central_gov"]}><TenderList /></ProtectedRoute>} />
      <Route path="/contracts/:id" element={<ProtectedRoute><ContractExecution /></ProtectedRoute>} />
      <Route path="/my-contracts" element={<ProtectedRoute roles={["contractor"]}><ContractorDashboard /></ProtectedRoute>} />

      {/* Funding */}
      <Route path="/funding" element={<ProtectedRoute roles={["state_gov", "central_gov"]}><FundingPage /></ProtectedRoute>} />

      {/* Complaints */}
      <Route path="/complaints" element={<ProtectedRoute roles={["state_gov", "central_gov", "auditor_ngo"]}><AuditorPanel /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} />

      {/* Public */}
      <Route path="/portal" element={<ProtectedRoute><CommunityPortal /></ProtectedRoute>} />
      <Route path="/ledger" element={<ProtectedRoute><PublicLedger /></ProtectedRoute>} />
      <Route path="/contractors" element={<ProtectedRoute roles={["state_gov"]}><TenderList /></ProtectedRoute>} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
