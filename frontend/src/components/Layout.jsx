import Header from "./Header";
import Sidebar from "./Sidebar";
import ChatBot from "./ChatBot";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
      <ChatBot />
      <ToastContainer position="bottom-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover theme="colored" />
    </div>
  );
}
