import AuditLedger from "../components/AuditLedger";

export default function PublicLedger() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl text-gray-800">Public Audit Ledger</h2>
        <p className="text-sm text-gray-500 mt-1">
          All tender actions, payments, and decisions are recorded with tamper-proof hashes
        </p>
      </div>
      <AuditLedger />
    </div>
  );
}
