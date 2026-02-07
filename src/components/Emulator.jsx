'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Sample workout: "30 Minutes to Burn"
const SAMPLE_WORKOUTS = {
  '30min_burn': {
    name: '30 Minutes to Burn',
    ftp: 200,
    segments: [
      { name: 'Warmup', type: 'warmup', duration: 240, ftp_percentage: 53 },
      { name: 'Interval 1 ON', type: 'interval_on', duration: 60, ftp_percentage: 105 },
      { name: 'Interval 1 OFF', type: 'interval_off', duration: 60, ftp_percentage: 53 },
      { name: 'Interval 2 ON', type: 'interval_on', duration: 60, ftp_percentage: 110 },
      { name: 'Interval 2 OFF', type: 'interval_off', duration: 60, ftp_percentage: 53 },
      { name: 'Interval 3 ON', type: 'interval_on', duration: 60, ftp_percentage: 115 },
      { name: 'Interval 3 OFF', type: 'interval_off', duration: 60, ftp_percentage: 53 },
      { name: 'Interval 4 ON', type: 'interval_on', duration: 60, ftp_percentage: 120 },
      { name: 'Interval 4 OFF', type: 'interval_off', duration: 60, ftp_percentage: 53 },
      { name: 'Interval 5 ON', type: 'interval_on', duration: 90, ftp_percentage: 105 },
      { name: 'Interval 5 OFF', type: 'interval_off', duration: 60, ftp_percentage: 53 },
      { name: 'Interval 6 ON', type: 'interval_on', duration: 90, ftp_percentage: 110 },
      { name: 'Interval 6 OFF', type: 'interval_off', duration: 60, ftp_percentage: 53 },
      { name: 'Cooldown', type: 'recovery', duration: 300, ftp_percentage: 45 },
    ],
  },
  easy_ride: {
    name: 'Easy Ride',
    ftp: 200,
    segments: [
      { name: 'Warmup', type: 'warmup', duration: 300, ftp_percentage: 50 },
      { name: 'Steady State', type: 'recovery', duration: 1200, ftp_percentage: 65 },
      { name: 'Cooldown', type: 'recovery', duration: 300, ftp_percentage: 45 },
    ],
  },
  threshold: {
    name: 'Threshold Builder',
    ftp: 200,
    segments: [
      { name: 'Warmup', type: 'warmup', duration: 300, ftp_percentage: 55 },
      { name: 'Build 1', type: 'interval_on', duration: 300, ftp_percentage: 90 },
      { name: 'Rest', type: 'interval_off', duration: 120, ftp_percentage: 55 },
      { name: 'Build 2', type: 'interval_on', duration: 300, ftp_percentage: 95 },
      { name: 'Rest', type: 'interval_off', duration: 120, ftp_percentage: 55 },
      { name: 'Build 3', type: 'interval_on', duration: 300, ftp_percentage: 100 },
      { name: 'Cooldown', type: 'recovery', duration: 300, ftp_percentage: 45 },
    ],
  },
};

const PRESETS = {
  easy: { power: 100, cadence: 75, heart_rate: 110, speed: 22 },
  moderate: { power: 180, cadence: 85, heart_rate: 140, speed: 28 },
  hard: { power: 280, cadence: 95, heart_rate: 165, speed: 35 },
  sprint: { power: 400, cadence: 110, heart_rate: 185, speed: 42 },
};

export default function Emulator({ onMetricsUpdate }) {
  const [enabled, setEnabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState('manual'); // manual | workout
  const [selectedWorkout, setSelectedWorkout] = useState('30min_burn');
  const [workoutTime, setWorkoutTime] = useState(0);
  const [ftp, setFtp] = useState(200);

  const [power, setPower] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [heartRate, setHeartRate] = useState(60);
  const [speed, setSpeed] = useState(0);

  const [totalDistance, setTotalDistance] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const intervalRef = useRef(null);
  const accumulatedDistRef = useRef(0);

  const getCurrentSegment = useCallback((time) => {
    const workout = SAMPLE_WORKOUTS[selectedWorkout];
    if (!workout) return null;
    let cumulative = 0;
    for (const seg of workout.segments) {
      cumulative += seg.duration;
      if (time < cumulative) {
        const remaining = cumulative - time;
        return { ...seg, time_remaining: remaining };
      }
    }
    return null;
  }, [selectedWorkout]);

  const getTotalWorkoutDuration = useCallback(() => {
    const workout = SAMPLE_WORKOUTS[selectedWorkout];
    if (!workout) return 0;
    return workout.segments.reduce((sum, s) => sum + s.duration, 0);
  }, [selectedWorkout]);

  const addNoise = (value, range) => {
    return Math.max(0, value + (Math.random() - 0.5) * range * 2);
  };

  const startSimulation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(true);
    setWorkoutTime(0);
    setElapsedTime(0);
    accumulatedDistRef.current = 0;
    setTotalDistance(0);

    intervalRef.current = setInterval(() => {
      setWorkoutTime(prev => prev + 1);
      setElapsedTime(prev => prev + 1);
    }, 1000);
  }, []);

  const pauseSimulation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  };

  const stopSimulation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setWorkoutTime(0);
    setElapsedTime(0);
    accumulatedDistRef.current = 0;
    setTotalDistance(0);
    setPower(0);
    setCadence(0);
    setHeartRate(60);
    setSpeed(0);
    onMetricsUpdate({
      power: 0, power_target: 0, cadence: 0, cadence_target: 0,
      heart_rate: 60, speed: 0, distance: 0, time_elapsed: 0, time_remaining: 0,
    }, { name: 'Idle', type: 'recovery', duration: 0, ftp_percentage: 0 });
  };

  // Update metrics every second when running
  useEffect(() => {
    if (!enabled || !running) return;

    let currentPower, currentCadence, currentHR, currentSpeed;
    let currentSegment = null;

    if (mode === 'workout') {
      currentSegment = getCurrentSegment(workoutTime);
      if (!currentSegment) {
        stopSimulation();
        return;
      }

      const targetPower = Math.round(ftp * (currentSegment.ftp_percentage / 100));
      currentPower = Math.round(addNoise(targetPower, 8));
      currentCadence = Math.round(addNoise(
        currentSegment.type === 'interval_on' ? 92 : 78, 5
      ));
      currentHR = Math.round(addNoise(
        currentSegment.type === 'interval_on' ? 155 + (currentSegment.ftp_percentage - 100) * 2
        : currentSegment.type === 'warmup' ? 115
        : 120, 3
      ));
      currentSpeed = Math.round(addNoise(currentPower * 0.12 + 8, 1) * 10) / 10;

      setPower(currentPower);
      setCadence(currentCadence);
      setHeartRate(currentHR);
      setSpeed(currentSpeed);
    } else {
      currentPower = Math.round(addNoise(power, 5));
      currentCadence = Math.round(addNoise(cadence, 3));
      currentHR = Math.round(addNoise(heartRate, 2));
      currentSpeed = Math.round(addNoise(speed, 0.5) * 10) / 10;
    }

    // Accumulate distance (speed in km/h, update every 1s)
    const distIncrement = currentSpeed / 3600;
    accumulatedDistRef.current += distIncrement;
    setTotalDistance(accumulatedDistRef.current);

    const totalDuration = getTotalWorkoutDuration();
    const segment = currentSegment || {
      name: 'Manual Ride',
      type: currentPower > ftp ? 'interval_on' : 'recovery',
      duration: 0,
      ftp_percentage: Math.round((currentPower / ftp) * 100),
    };

    onMetricsUpdate({
      power: currentPower,
      power_target: currentSegment ? Math.round(ftp * (currentSegment.ftp_percentage / 100)) : 0,
      cadence: currentCadence,
      cadence_target: currentSegment ? (currentSegment.type === 'interval_on' ? 90 : 80) : 0,
      heart_rate: currentHR,
      speed: currentSpeed,
      distance: Math.round(accumulatedDistRef.current * 100) / 100,
      time_elapsed: elapsedTime,
      time_remaining: mode === 'workout' ? Math.max(0, totalDuration - workoutTime) : 0,
    }, segment);
  }, [workoutTime, enabled, running]);

  const applyPreset = (preset) => {
    const p = PRESETS[preset];
    setPower(p.power);
    setCadence(p.cadence);
    setHeartRate(p.heart_rate);
    setSpeed(p.speed);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Emulator
        </h2>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            enabled
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {enabled && (
        <div className="space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setMode('workout')}
              className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === 'workout' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              Workout
            </button>
          </div>

          {mode === 'manual' ? (
            <>
              {/* Quick presets */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Presets</div>
                <div className="flex gap-1">
                  {Object.keys(PRESETS).map(key => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs capitalize transition-colors"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <SliderControl label="Power" value={power} onChange={setPower} min={0} max={500} unit="W" color="yellow" />
              <SliderControl label="Cadence" value={cadence} onChange={setCadence} min={0} max={130} unit="rpm" color="blue" />
              <SliderControl label="Heart Rate" value={heartRate} onChange={setHeartRate} min={40} max={200} unit="bpm" color="red" />
              <SliderControl label="Speed" value={speed} onChange={setSpeed} min={0} max={60} unit="km/h" color="cyan" step={0.1} />
            </>
          ) : (
            <>
              {/* Workout selector */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Workout</div>
                <select
                  value={selectedWorkout}
                  onChange={(e) => setSelectedWorkout(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-1.5 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(SAMPLE_WORKOUTS).map(([key, w]) => (
                    <option key={key} value={key}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* FTP setting */}
              <SliderControl label="FTP" value={ftp} onChange={setFtp} min={100} max={400} unit="W" color="purple" />

              {/* Workout visualization */}
              <WorkoutGraph
                workout={SAMPLE_WORKOUTS[selectedWorkout]}
                currentTime={workoutTime}
                ftp={ftp}
              />
            </>
          )}

          {/* Control buttons */}
          <div className="flex gap-2">
            {!running ? (
              <button
                onClick={startSimulation}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors"
              >
                Start
              </button>
            ) : (
              <button
                onClick={pauseSimulation}
                className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-medium transition-colors"
              >
                Pause
              </button>
            )}
            <button
              onClick={stopSimulation}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
            >
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SliderControl({ label, value, onChange, min, max, unit, color, step = 1 }) {
  const colorMap = {
    yellow: 'accent-yellow-500',
    blue: 'accent-blue-500',
    red: 'accent-red-500',
    cyan: 'accent-cyan-500',
    purple: 'accent-purple-500',
  };

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-mono text-gray-300">{typeof value === 'number' && step < 1 ? value.toFixed(1) : value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className={`w-full h-1.5 bg-gray-700 rounded-lg cursor-pointer ${colorMap[color] || ''}`}
      />
    </div>
  );
}

function WorkoutGraph({ workout, currentTime, ftp }) {
  if (!workout) return null;

  const totalDuration = workout.segments.reduce((sum, s) => sum + s.duration, 0);
  const maxFtpPct = Math.max(...workout.segments.map(s => s.ftp_percentage));

  let cumulative = 0;

  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">
        Workout Structure ({Math.round(totalDuration / 60)} min)
      </div>
      <div className="flex h-16 bg-gray-900 rounded overflow-hidden border border-gray-700">
        {workout.segments.map((seg, i) => {
          const widthPct = (seg.duration / totalDuration) * 100;
          const heightPct = (seg.ftp_percentage / maxFtpPct) * 100;
          const segStart = cumulative;
          cumulative += seg.duration;
          const isActive = currentTime >= segStart && currentTime < cumulative;

          const colorMap = {
            warmup: 'bg-yellow-500',
            interval_on: 'bg-red-500',
            interval_off: 'bg-green-500',
            recovery: 'bg-blue-500',
          };

          return (
            <div
              key={i}
              className="flex flex-col justify-end"
              style={{ width: `${widthPct}%` }}
            >
              <div
                className={`${colorMap[seg.type] || 'bg-gray-500'} ${
                  isActive ? 'opacity-100 ring-1 ring-white' : 'opacity-60'
                } transition-opacity`}
                style={{ height: `${heightPct}%` }}
                title={`${seg.name}: ${seg.ftp_percentage}% FTP (${seg.duration}s)`}
              />
            </div>
          );
        })}
      </div>
      {/* Progress indicator */}
      <div className="h-1 bg-gray-800 mt-0.5 rounded overflow-hidden">
        <div
          className="h-full bg-white/50 transition-all"
          style={{ width: `${(currentTime / totalDuration) * 100}%` }}
        />
      </div>
    </div>
  );
}
