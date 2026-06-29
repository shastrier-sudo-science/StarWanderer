import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "../game/GameEngine";
import { StationUI } from "../game/StationUI";
import type { GameScreen } from "../game/types";

const CANVAS_W = 1920;
const CANVAS_H = 1080;

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [screen, setScreen] = useState<GameScreen>("title");
  const [, forceUpdate] = useState(0);

  const onStateChange = useCallback(() => {
    if (engineRef.current) {
      setScreen(engineRef.current.state.screen);
      forceUpdate(n => n + 1);
    }
  }, []);

  useEffect(() => {
    const engine = new GameEngine(onStateChange);
    engineRef.current = engine;
    if (canvasRef.current) {
      engine.mount(canvasRef.current);
    }
    return () => engine.unmount();
  }, [onStateChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      engineRef.current?.handleKeyDown(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.handleKeyUp(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    engineRef.current?.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    engineRef.current?.handleMouseDown(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseUp = () => {
    engineRef.current?.handleMouseUp();
  };

  const engine = engineRef.current;
  const isStation = screen === "station" && engine;
  const stationId = engine?.state.player.dockedStationId;
  const currentSys = engine?.state.systems[engine.state.player.currentSystemId];
  const station = stationId ? currentSys?.stations.find(s => s.id === stationId) : undefined;

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="game-canvas"
        style={{ display: isStation ? "none" : "block" }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={e => e.preventDefault()}
      />
      {isStation && engine && station && (
        <div className="station-overlay">
          <StationUI
            engine={engine}
            station={station}
            player={engine.state.player}
          />
        </div>
      )}
    </div>
  );
}
