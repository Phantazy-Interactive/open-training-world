'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const GameCanvas = forwardRef(function GameCanvas({ metrics, segment, otherRiders }, ref) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);

  useImperativeHandle(ref, () => ({
    updateMetrics: (m, s) => {
      if (sceneRef.current) {
        sceneRef.current.updateMetrics(m, s);
      }
    },
  }));

  useEffect(() => {
    let game;
    let cancelled = false;

    const initGame = async () => {
      // Dynamic import of Phaser (client-side only)
      const Phaser = (await import('phaser')).default;
      const { default: GameScene } = await import('@/game/GameScene');

      if (cancelled || !containerRef.current) return;

      const config = {
        type: Phaser.CANVAS,
        parent: containerRef.current,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        backgroundColor: '#040618',
        scene: GameScene,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: {
          pixelArt: false,
          antialias: true,
          transparent: false,
        },
      };

      game = new Phaser.Game(config);
      gameRef.current = game;

      // Get reference to scene once it's ready
      game.events.on('ready', () => {
        const scene = game.scene.getScene('GameScene');
        sceneRef.current = scene;
      });
    };

    initGame();

    return () => {
      cancelled = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, []);

  // Update other riders when they change
  useEffect(() => {
    if (sceneRef.current && otherRiders) {
      sceneRef.current.updateOtherRiders(otherRiders);
    }
  }, [otherRiders]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #040618 0%, #0c1432 100%)' }}
    />
  );
});

export default GameCanvas;
