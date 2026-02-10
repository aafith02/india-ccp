import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ChatBot from "./ChatBot";

export default function Layout({ children }) {
  const { user } = useAuth();

  // Apply state theme if available
  const theme = user?.state?.theme || { primary: "#0d9488", secondary: "#d4a76a", bg: "#faf7f2" };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: theme.bg }}>
      <Sidebar theme={theme} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header theme={theme} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <ChatBot theme={theme} />
    </div>
  );
}
