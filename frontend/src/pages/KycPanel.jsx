import { useState, useEffect } from "react";
import api from "../api/client";

export default function KycPanel() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState({});

  useEffect(() => { fetchPending(); }, []);

  async function fetchPending() {
    try {
      const { data } = await api.get("/kyc/pending");
      setContractors(data.contractors || []);
    } catch { }
    setLoading(false);
  }

  async function verify(userId) {
    await api.patch(`/kyc/${userId}/verify`);
    fetchPending();
  }

  async function reject(userId) {
    const reason = rejectReason[userId];
    if (!reason) return alert("Please enter a rejection reason");
    await api.patch(`/kyc/${userId}/reject`, { reason });
    fetchPending();
  }

  if (loading) return <div className="p-8 text-gray-500">Loading KYC requests...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">KYC Verification</h1>
        <p className="text-gray-500 text-sm mt-1">Verify contractor identities in your state</p>
      </div>

      {contractors.length === 0 ? (
        <div className="bg-green-50 text-green-700 p-6 rounded-xl text-center">
          No pending KYC requests. All contractors verified!
        </div>
      ) : (
        <div className="space-y-4">
          {contractors.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{c.name}</h3>
                  <p className="text-sm text-gray-500">{c.email}</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <p><span className="text-gray-400">ID Number:</span> <span className="font-mono">{c.kyc_data?.id_number || "N/A"}</span></p>
                    <p><span className="text-gray-400">Business:</span> {c.kyc_data?.business_name || "N/A"}</p>
                    <p><span className="text-gray-400">Registered:</span> {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Pending</span>
              </div>

              <div className="mt-4 flex gap-3 items-end">
                <button onClick={() => verify(c.id)} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition">
                  Verify KYC
                </button>
                <div className="flex-1 flex gap-2">
                  <input
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Rejection reason..."
                    value={rejectReason[c.id] || ""}
                    onChange={(e) => setRejectReason((p) => ({ ...p, [c.id]: e.target.value }))}
                  />
                  <button onClick={() => reject(c.id)} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
