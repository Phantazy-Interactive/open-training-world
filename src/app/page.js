'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Dashboard from '@/components/Dashboard';
import Emulator from '@/components/Emulator';
import ConnectionPanel from '@/components/ConnectionPanel';
import GameCanvas from '@/components/GameCanvas';

export default function Home() {
  const [wsConnected, setWsConnected] = useState(false);
  const [metrics, setMetrics] = useState({
    power: 0,
    power_target: 0,
    cadence: 0,
    cadence_target: 0,
    heart_rate: 0,
    speed: 0,
    distance: 0,
    time_elapsed: 0,
    time_remaining: 0,
  });
  const [segment, setSegment] = useState({
    name: 'Idle',
    type: 'recovery',
    duration: 0,
    ftp_percentage: 0,
  });
  const [otherRiders, setOtherRiders] = useState([]);
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substring(2, 10));
  const [sessionId] = useState(() => 'session_' + Date.now());
  const wsRef = useRef(null);
  const gameRef = useRef(null);

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001/connect?token=${userId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({
        type: 'register',
        user_id: userId,
        session_id: sessionId,
        username: 'Rider ' + userId.substring(5, 9),
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'world_state') {
          setOtherRiders(data.riders.filter(r => r.user_id !== userId));
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [userId, sessionId]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  const sendMetrics = useCallback((newMetrics, newSegment) => {
    setMetrics(newMetrics);
    if (newSegment) setSegment(newSegment);

    if (gameRef.current) {
      gameRef.current.updateMetrics(newMetrics, newSegment || segment);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'workout_data',
        timestamp: Date.now(),
        user_id: userId,
        session_id: sessionId,
        metrics: newMetrics,
        segment: newSegment || segment,
      }));
    }
  }, [userId, sessionId, segment]);

  return (
    <div className="flex h-screen w-screen">
      {/* Game Canvas - Left Side */}
      <div className="flex-1 relative min-w-0">
        <GameCanvas
          ref={gameRef}
          metrics={metrics}
          segment={segment}
          otherRiders={otherRiders}
        />
        {/* Overlay: distance and time */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 flex gap-6 text-sm border border-blue-900/30">
          <div>
            <span className="text-blue-400/60 text-xs uppercase tracking-wider">Distance</span>
            <span className="ml-2 font-mono text-lg text-blue-200">{metrics.distance.toFixed(2)} km</span>
          </div>
          <div>
            <span className="text-blue-400/60 text-xs uppercase tracking-wider">Time</span>
            <span className="ml-2 font-mono text-lg text-blue-200">
              {Math.floor(metrics.time_elapsed / 60)}:{(metrics.time_elapsed % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[380px] flex-shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold text-blue-400">Open Training World</h1>
          <p className="text-xs text-gray-500 mt-1">Space Flight Training Platform</p>
        </div>

        <ConnectionPanel
          connected={wsConnected}
          userId={userId}
          sessionId={sessionId}
        />

        <Dashboard
          metrics={metrics}
          segment={segment}
        />

        <Emulator
          onMetricsUpdate={sendMetrics}
        />
      </div>
    </div>
  );
}
