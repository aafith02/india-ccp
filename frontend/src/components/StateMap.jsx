/**
 * Abstract state map silhouette component.
 * Shows state code, symbol emoji + a simple geometric representation.
 */
export default function StateMap({ stateCode, stateName, activeProjects = 0, theme, symbol, labels = {} }) {
  return (
    <div className="bg-white rounded-xl shadow-card p-5 animate-fade-up-delay">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {labels.stateMap || "State Map"}
      </h3>
      <div className="flex items-center gap-4">
        {/* Abstract map silhouette */}
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: theme?.primary + "15" }}
        >
          {/* Abstract geometric pattern representing state */}
          <svg viewBox="0 0 100 100" className="w-full h-full opacity-30">
            <path
              d="M20,80 Q30,20 50,30 T80,20 Q90,50 75,70 T50,85 Q30,90 20,80 Z"
              fill={theme?.primary || "#0d9488"}
            />
            <circle cx="50" cy="50" r="5" fill={theme?.secondary || "#d4a76a"} />
          </svg>
          <div className="absolute flex flex-col items-center">
            {symbol?.emoji && (
              <span className="text-2xl leading-none mb-0.5">{symbol.emoji}</span>
            )}
            <span
              className="text-lg font-heading font-bold"
              style={{ color: theme?.primary }}
            >
              {stateCode}
            </span>
          </div>
        </div>

        <div>
          <p className="font-heading font-semibold text-lg" style={{ color: theme?.primary }}>
            {stateName}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-semibold text-gray-700">{activeProjects}</span>{" "}
            {labels.activeProjects || "Active Projects"}
          </p>
        </div>
      </div>
    </div>
  );
}
