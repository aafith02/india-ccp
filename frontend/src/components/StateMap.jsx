import { useState, useEffect } from "react";
import api from "../api/client";

export default function StateMap({ onSelectState }) {
  const [states, setStates] = useState([]);

  useEffect(() => {
    api.get("/states").then(r => setStates(r.data.states || [])).catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
      {states.map(s => (
        <button key={s.id} onClick={() => onSelectState?.(s)}
          className="bg-white border rounded-lg p-2 text-xs text-center hover:bg-teal-50 hover:border-teal-300 transition truncate">
          {s.name}
        </button>
      ))}
    </div>
  );
}
