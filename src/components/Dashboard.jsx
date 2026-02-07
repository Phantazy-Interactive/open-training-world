'use client';

export default function Dashboard({ metrics, segment }) {
  const powerColor = metrics.power < 100 ? 'text-green-400'
    : metrics.power < 200 ? 'text-yellow-400'
    : metrics.power < 300 ? 'text-orange-400'
    : 'text-red-400';

  const hrColor = metrics.heart_rate < 120 ? 'text-green-400'
    : metrics.heart_rate < 150 ? 'text-yellow-400'
    : metrics.heart_rate < 170 ? 'text-orange-400'
    : 'text-red-400';

  const segmentColor = {
    warmup: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    interval_on: 'bg-red-500/20 text-red-400 border-red-500/30',
    interval_off: 'bg-green-500/20 text-green-400 border-green-500/30',
    recovery: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }[segment.type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  return (
    <div className="p-4 border-b border-gray-700">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Live Metrics
      </h2>

      {/* Current segment */}
      <div className={`mb-4 px-3 py-2 rounded-lg border ${segmentColor}`}>
        <div className="text-xs uppercase tracking-wider opacity-70">Segment</div>
        <div className="font-bold text-lg">{segment.name}</div>
        {segment.ftp_percentage > 0 && (
          <div className="text-xs opacity-70">{segment.ftp_percentage}% FTP</div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Power"
          value={metrics.power}
          unit="W"
          target={metrics.power_target}
          colorClass={powerColor}
        />
        <MetricCard
          label="Cadence"
          value={metrics.cadence}
          unit="rpm"
          target={metrics.cadence_target}
          colorClass="text-blue-400"
        />
        <MetricCard
          label="Heart Rate"
          value={metrics.heart_rate}
          unit="bpm"
          colorClass={hrColor}
        />
        <MetricCard
          label="Speed"
          value={metrics.speed.toFixed(1)}
          unit="km/h"
          colorClass="text-cyan-400"
        />
        <MetricCard
          label="Distance"
          value={metrics.distance.toFixed(2)}
          unit="km"
          colorClass="text-purple-400"
        />
        <MetricCard
          label="Time"
          value={formatTime(metrics.time_elapsed)}
          unit=""
          colorClass="text-gray-300"
        />
      </div>

      {/* Power vs Target bar */}
      {metrics.power_target > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Power vs Target</span>
            <span>{Math.round((metrics.power / metrics.power_target) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                metrics.power > metrics.power_target * 1.1 ? 'bg-red-500'
                : metrics.power > metrics.power_target * 0.9 ? 'bg-green-500'
                : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min((metrics.power / metrics.power_target) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, unit, target, colorClass }) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-2.5">
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-mono font-bold ${colorClass}`}>
        {value}
        <span className="text-xs text-gray-500 ml-1">{unit}</span>
      </div>
      {target > 0 && (
        <div className="text-xs text-gray-500">Target: {target}</div>
      )}
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
