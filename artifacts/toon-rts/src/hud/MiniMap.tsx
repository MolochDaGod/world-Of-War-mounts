import { useEffect, useRef } from 'react';
import { useWorldStore } from '@/game/store/worldStore';
import { useGameStore } from '@/game/store/gameStore';
import { GameUI } from '@/game/assets/CraftpixManifest';

const MAP_SIZE = 160;
const WORLD_HALF = 100; // world spans roughly -100 to +100

function worldToMap(wx: number, wz: number): [number, number] {
  const x = ((wx + WORLD_HALF) / (WORLD_HALF * 2)) * MAP_SIZE;
  const y = ((wz + WORLD_HALF) / (WORLD_HALF * 2)) * MAP_SIZE;
  return [x, y];
}

export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const resourceNodes = useWorldStore.getState().resourceNodes;
  const worldItems = useWorldStore.getState().worldItems;

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { resourceNodes, worldItems, animals } = useWorldStore.getState();
      const { units } = useGameStore.getState();

      // Background
      ctx.fillStyle = '#1a2f1a';
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 4; i++) {
        const p = (i / 4) * MAP_SIZE;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, MAP_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(MAP_SIZE, p); ctx.stroke();
      }

      // Resource nodes
      for (const node of resourceNodes) {
        if (node.depleted) continue;
        const [x, y] = worldToMap(node.position[0], node.position[2]);
        let color = '#22c55e';
        if (node.kind === 'goldMine')    color = '#ffd700';
        if (node.kind === 'crystalMine') color = '#67e8f9';
        if (node.kind === 'coalMine')    color = '#9ca3af';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, node.kind === 'tree' ? 1.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // World items (chests)
      for (const item of worldItems) {
        if (item.collected) continue;
        const [x, y] = worldToMap(item.position[0], item.position[2]);
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Animals
      for (const animal of animals) {
        if (animal.behavior === 'dead') continue;
        const [x, y] = worldToMap(animal.position[0], animal.position[2]);
        const hostile = animal.kind === 'bear' || animal.kind === 'wolf' || animal.kind === 'boar';
        ctx.fillStyle = hostile ? '#fb923c' : '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player units (team 1 = blue)
      for (const unit of units) {
        if (unit.state === 'dead') continue;
        const [x, y] = worldToMap(unit.position[0], unit.position[2]);
        ctx.fillStyle = unit.teamId === 1 ? '#3b82f6' : '#ef4444';
        ctx.shadowColor = unit.teamId === 1 ? '#3b82f6' : '#ef4444';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Camera indicator (placeholder centered rect)
      const camW = 40;
      const camH = 40;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(MAP_SIZE / 2 - camW / 2, MAP_SIZE / 2 - camH / 2, camW, camH);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      className="pointer-events-auto hud-minimap-frame"
      style={{
        width: `${MAP_SIZE + 28}px`,
        height: `${MAP_SIZE + 28}px`,
        backgroundImage: `url('${GameUI.fightCircle}'), url('/ui/hud/ornate-panel.jpg')`,
        backgroundSize: '100% 100%, cover',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
      }}
    >
      <canvas
        ref={canvasRef}
        width={MAP_SIZE}
        height={MAP_SIZE}
        style={{
          borderRadius: '50%',
          display: 'block',
        }}
      />
    </div>
  );
}
