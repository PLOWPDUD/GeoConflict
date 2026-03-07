import React, { useRef, useEffect, useState } from 'react';
import { SimulationEngine } from '../services/SimulationEngine';
import { TerrainType } from '../types';

interface Props {
  engine: SimulationEngine;
  onInteract: (x: number, y: number) => void;
  width: number;
  height: number;
}

export const CanvasRenderer: React.FC<Props> = ({ engine, onInteract, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Viewport State (Camera)
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 4 }); 
  
  // Interaction State
  const isDragging = useRef(false);
  const lastPos = useRef<{x: number, y: number} | null>(null);
  const touchDist = useRef<number | null>(null); // For pinch zoom

  // Cache colors
  const colorCache = useRef<Map<string, {r:number, g:number, b:number}>>(new Map());

  // Init buffer once
  useEffect(() => {
    if (!bufferCanvasRef.current) {
        const buf = document.createElement('canvas');
        buf.width = width;
        buf.height = height;
        bufferCanvasRef.current = buf;
    }
  }, [width, height]);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // 1. Render Map to Buffer (Low Res)
      const buffer = bufferCanvasRef.current;
      if (buffer) {
          const bCtx = buffer.getContext('2d');
          if (bCtx) {
             const { cells, countries } = engine;
             const imageData = bCtx.createImageData(width, height);
             const data = imageData.data;
             
             // Update colors
             const hexToRgb = (hex: string) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16)
                } : { r: 0, g: 0, b: 0 };
              };

             countries.forEach(c => {
                 if (!colorCache.current.has(c.color)) {
                     colorCache.current.set(c.color, hexToRgb(c.color));
                 }
             });

             for (let i = 0; i < cells.length; i++) {
                 const cell = cells[i];
                 const idx = i * 4;
                 let r, g, b;

                 if (cell.ownerId) {
                     const country = countries.find(c => c.id === cell.ownerId);
                     if (country) {
                         const rgb = colorCache.current.get(country.color) || {r:255,g:255,b:255};
                         const variance = cell.terrain === TerrainType.Mountain ? -40 : 0;
                         const cityHighlight = cell.cityId ? 40 : 0;
                         r = Math.min(255, Math.max(0, rgb.r + variance + cityHighlight));
                         g = Math.min(255, Math.max(0, rgb.g + variance + cityHighlight));
                         b = Math.min(255, Math.max(0, rgb.b + variance + cityHighlight));
                     } else {
                         r=255; g=255; b=255; // Error pink
                     }
                 } else {
                     switch (cell.terrain) {
                         case TerrainType.Water: r=30; g=41; b=59; break;
                         case TerrainType.Land: r=71; g=85; b=105; break;
                         case TerrainType.Mountain: r=148; g=163; b=184; break;
                         default: r=0; g=0; b=0;
                     }
                 }
                 data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = 255;
             }
             bCtx.putImageData(imageData, 0, 0);
          }
      }

      // 2. Render Buffer to Screen (Transformed)
      if (buffer) {
          // Clear Screen
          ctx.fillStyle = '#020617'; // bg-slate-950
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.save();
          // Apply Camera Transform
          ctx.translate(viewport.x, viewport.y);
          ctx.scale(viewport.scale, viewport.scale);
          
          // Draw buffer without smoothing for pixel art look
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(buffer, 0, 0);
          
          ctx.restore();

          // 3. Render City Names (Overlay)
          // Only if zoomed in enough to be readable
          if (viewport.scale > 8) {
              ctx.font = 'bold 10px monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              
              const { cities } = engine;
              for(const city of cities) {
                   const cx = city.cellIndex % width;
                   const cy = Math.floor(city.cellIndex / width);
                   
                   // Project to screen
                   const screenX = cx * viewport.scale + viewport.x + (viewport.scale/2);
                   const screenY = cy * viewport.scale + viewport.y;
                   
                   // Cull offscreen
                   if (screenX < -50 || screenX > canvas.width + 50 || screenY < -50 || screenY > canvas.height + 50) continue;

                   // Draw Label Background
                   const text = city.name;
                   const measure = ctx.measureText(text);
                   const w = measure.width + 8;
                   const h = 14;
                   
                   ctx.fillStyle = 'rgba(0,0,0,0.6)';
                   ctx.fillRect(screenX - w/2, screenY - h - 4, w, h);
                   
                   // Draw Text
                   ctx.fillStyle = '#ffffff';
                   ctx.fillText(text, screenX, screenY - 6);
              }
          }

          // 4. Render Unit Size (War Status)
          // Show if zoomed in reasonably or even zoomed out
          if (viewport.scale > 2) {
              ctx.font = 'bold 12px monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              const { countries, tickCount, navyUnits } = engine;

              // Render Navy Units
              for (const unit of navyUnits) {
                  const screenX = unit.x * viewport.scale + viewport.x + (viewport.scale/2);
                  const screenY = unit.y * viewport.scale + viewport.y + (viewport.scale/2);
                  
                  // Cull offscreen
                  if (screenX < -20 || screenX > canvas.width + 20 || screenY < -20 || screenY > canvas.height + 20) continue;

                  const country = countries.find(c => c.id === unit.ownerId);
                  const color = country ? country.color : '#ffffff';

                  // Draw Ship Icon (Simple Triangle/Boat shape)
                  ctx.fillStyle = color;
                  ctx.strokeStyle = '#000000';
                  ctx.lineWidth = 1;
                  
                  const size = 6 * (viewport.scale / 4); // Scale with zoom but clamp
                  const clampedSize = Math.max(4, Math.min(size, 12));

                  ctx.beginPath();
                  // Hull
                  ctx.moveTo(screenX - clampedSize, screenY);
                  ctx.lineTo(screenX + clampedSize, screenY);
                  ctx.lineTo(screenX, screenY + clampedSize);
                  ctx.closePath();
                  ctx.fill();
                  ctx.stroke();
                  
                  // Sail
                  ctx.fillStyle = '#ffffff';
                  ctx.beginPath();
                  ctx.moveTo(screenX, screenY - clampedSize * 1.5);
                  ctx.lineTo(screenX + clampedSize * 0.8, screenY);
                  ctx.lineTo(screenX, screenY);
                  ctx.closePath();
                  ctx.fill();
                  ctx.stroke();
              }

              for (const c of countries) {
                  // Check if at war (threshold 20 ticks)
                  if (tickCount - c.lastWarTick < 20 && c.capitalId !== null) {
                       const cx = c.capitalId % width;
                       const cy = Math.floor(c.capitalId / width);
                       
                       const screenX = cx * viewport.scale + viewport.x + (viewport.scale/2);
                       const screenY = cy * viewport.scale + viewport.y;
                       
                       // Cull offscreen
                       if (screenX < -50 || screenX > canvas.width + 50 || screenY < -50 || screenY > canvas.height + 50) continue;

                       const text = `${(c.manpower / 1000).toFixed(1)}k`;
                       const measure = ctx.measureText(text);
                       const w = measure.width + 8;
                       const h = 16;

                       // Background pill
                       ctx.fillStyle = 'rgba(185, 28, 28, 0.8)'; // Red bg for war
                       ctx.beginPath();
                       ctx.roundRect(screenX - w/2, screenY - h/2 - 20, w, h, 4);
                       ctx.fill();

                       // Text
                       ctx.fillStyle = '#ffffff';
                       ctx.fillText(text, screenX, screenY - 20);
                  }
              }

              // 5. Render Sieges
              const { sieges, cities } = engine;
              for (const siege of sieges) {
                  const city = cities.find(c => c.id === siege.cityId);
                  if (!city) continue;

                  const cx = city.cellIndex % width;
                  const cy = Math.floor(city.cellIndex / width);
                  
                  const screenX = cx * viewport.scale + viewport.x + (viewport.scale/2);
                  const screenY = cy * viewport.scale + viewport.y + (viewport.scale/2);

                  // Cull
                  if (screenX < -50 || screenX > canvas.width + 50 || screenY < -50 || screenY > canvas.height + 50) continue;

                  const attacker = countries.find(c => c.id === siege.attackerId);
                  const color = attacker ? attacker.color : '#ffffff';
                  const rgb = colorCache.current.get(color) || {r:255,g:255,b:255};

                  const radius = (viewport.scale * 1.5) + (Math.sin(Date.now() / 200) * 2); // Pulsing effect

                  ctx.beginPath();
                  ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
                  
                  // Stroke
                  ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                  ctx.lineWidth = 2;
                  ctx.stroke();

                  // Fill based on progress
                  if (siege.status === 'won') {
                      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
                      ctx.fill();
                  } else {
                      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${siege.progress / 100})`;
                      ctx.fill();
                  }
              }

              // 7. Render Active Wars
              const { activeWars } = engine;
              for (const warKey of activeWars) {
                  const [id1, id2] = warKey.split('-').map(Number);
                  const c1 = countries.find(c => c.id === id1);
                  const c2 = countries.find(c => c.id === id2);
                  
                  if (c1 && c2 && c1.capitalId !== null && c2.capitalId !== null) {
                      const cx1 = c1.capitalId % width;
                      const cy1 = Math.floor(c1.capitalId / width);
                      const cx2 = c2.capitalId % width;
                      const cy2 = Math.floor(c2.capitalId / width);

                      // Midpoint
                      const mx = (cx1 + cx2) / 2;
                      const my = (cy1 + cy2) / 2;

                      const screenX = mx * viewport.scale + viewport.x + (viewport.scale/2);
                      const screenY = my * viewport.scale + viewport.y + (viewport.scale/2);

                      if (screenX < -20 || screenX > canvas.width + 20 || screenY < -20 || screenY > canvas.height + 20) continue;

                      // Draw Crossed Swords Icon
                      ctx.save();
                      ctx.translate(screenX, screenY);
                      // Pulse scale
                      const scale = 1 + Math.sin(Date.now() / 200) * 0.2;
                      ctx.scale(scale, scale);

                      ctx.strokeStyle = '#ef4444'; // Red-500
                      ctx.lineWidth = 3;
                      ctx.lineCap = 'round';

                      // Sword 1
                      ctx.beginPath();
                      ctx.moveTo(-6, -6);
                      ctx.lineTo(6, 6);
                      ctx.stroke();

                      // Sword 2
                      ctx.beginPath();
                      ctx.moveTo(6, -6);
                      ctx.lineTo(-6, 6);
                      ctx.stroke();

                      ctx.restore();
                  }
              }

              // 8. Render March Targets (Player Only or Debug)
              for (const c of countries) {
                  if (c.marchTarget !== null && c.marchTarget !== undefined) {
                      // Only show for player or if debug/god mode (showing all for now for feedback)
                      // Let's show all for now so we see bots working too
                      
                      const tx = c.marchTarget % width;
                      const ty = Math.floor(c.marchTarget / width);
                      
                      const screenX = tx * viewport.scale + viewport.x + (viewport.scale/2);
                      const screenY = ty * viewport.scale + viewport.y + (viewport.scale/2);

                      if (screenX < -20 || screenX > canvas.width + 20 || screenY < -20 || screenY > canvas.height + 20) continue;

                      // Draw Target Marker (X)
                      ctx.strokeStyle = c.color;
                      ctx.lineWidth = 2;
                      const size = 6;
                      
                      ctx.beginPath();
                      ctx.moveTo(screenX - size, screenY - size);
                      ctx.lineTo(screenX + size, screenY + size);
                      ctx.moveTo(screenX + size, screenY - size);
                      ctx.lineTo(screenX - size, screenY + size);
                      ctx.stroke();
                      
                      // Label
                      if (c.isPlayer) {
                          ctx.fillStyle = '#ffffff';
                          ctx.font = '10px monospace';
                          ctx.fillText('TARGET', screenX, screenY - 10);
                      }
                  }
              }
          }
      }

      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [engine, viewport, width, height]);


  // --- Event Handling ---

  // Convert Screen Coords to Map Coords
  const toWorld = (sx: number, sy: number) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (sx - rect.left - viewport.x) / viewport.scale;
      const y = (sy - rect.top - viewport.y) / viewport.scale;
      return { x: Math.floor(x), y: Math.floor(y) };
  };

  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      // Zoom towards pointer
      const rect = canvasRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = -e.deltaY * 0.001;
      const newScale = Math.min(Math.max(0.5, viewport.scale * (1 + zoomFactor)), 30);
      
      const scaleRatio = newScale / viewport.scale;
      
      // Calculate new offset to keep mouseX/Y at same world position
      const newX = mouseX - (mouseX - viewport.x) * scaleRatio;
      const newY = mouseY - (mouseY - viewport.y) * scaleRatio;
      
      setViewport({ x: newX, y: newY, scale: newScale });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 1 || e.shiftKey) { // Middle click or Shift+Click -> Pan
          isDragging.current = true;
          lastPos.current = { x: e.clientX, y: e.clientY };
      } else if (e.button === 0) { // Left Click -> Interact
          const pos = toWorld(e.clientX, e.clientY);
          onInteract(pos.x, pos.y);
          // Also allow dragging to paint if tool supports it
          isDragging.current = true; 
          lastPos.current = { x: e.clientX, y: e.clientY };
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      
      // If Middle Mouse or Shift -> Pan
      if (e.buttons === 4 || e.shiftKey) {
          const dx = e.clientX - lastPos.current!.x;
          const dy = e.clientY - lastPos.current!.y;
          setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          lastPos.current = { x: e.clientX, y: e.clientY };
      } else if (e.buttons === 1) {
          // Left Drag -> Interact (Paint)
          const pos = toWorld(e.clientX, e.clientY);
          onInteract(pos.x, pos.y);
          lastPos.current = { x: e.clientX, y: e.clientY };
      }
  };

  const handleMouseUp = () => {
      isDragging.current = false;
      lastPos.current = null;
  };

  // Touch Handling
  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          // Pinch Zoom Start
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          touchDist.current = dist;
          lastPos.current = { 
            x: (t1.clientX + t2.clientX) / 2, 
            y: (t1.clientY + t2.clientY) / 2 
          };
      } else if (e.touches.length === 1) {
          // Interact
          const t = e.touches[0];
          const pos = toWorld(t.clientX, t.clientY);
          onInteract(pos.x, pos.y);
          isDragging.current = true;
          lastPos.current = { x: t.clientX, y: t.clientY };
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          // Pinch Zoom / Pan
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

          if (touchDist.current && lastPos.current) {
              // Zoom
              const scaleFactor = dist / touchDist.current;
              const newScale = Math.min(Math.max(0.5, viewport.scale * scaleFactor), 30);
              
              // Pan
              const dx = center.x - lastPos.current.x;
              const dy = center.y - lastPos.current.y;

              // Simplified: Apply pan then scale
              const rect = canvasRef.current!.getBoundingClientRect();
              const pinchX = center.x - rect.left;
              const pinchY = center.y - rect.top;
              
              const scaleRatio = newScale / viewport.scale;
              const newX = pinchX - (pinchX - (viewport.x + dx)) * scaleRatio;
              const newY = pinchY - (pinchY - (viewport.y + dy)) * scaleRatio;

              setViewport({ x: newX, y: newY, scale: newScale });
          }
          
          touchDist.current = dist;
          lastPos.current = center;
      } else if (e.touches.length === 1 && isDragging.current) {
          // Drag Interact
          const t = e.touches[0];
          const pos = toWorld(t.clientX, t.clientY);
          onInteract(pos.x, pos.y);
      }
  };

  const handleTouchEnd = () => {
      isDragging.current = false;
      touchDist.current = null;
      lastPos.current = null;
  };
  
  // Resize handler
  useEffect(() => {
    const handleResize = () => {
       if (containerRef.current && canvasRef.current) {
           canvasRef.current.width = containerRef.current.clientWidth;
           canvasRef.current.height = containerRef.current.clientHeight;
           
           // Center initially
           setViewport({
               x: (containerRef.current.clientWidth - width * 4) / 2,
               y: (containerRef.current.clientHeight - height * 4) / 2,
               scale: 4
           });
       }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // call once
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);


  return (
    <div ref={containerRef} className="w-full h-full flex bg-slate-950 overflow-hidden relative border-y border-slate-800 cursor-crosshair">
      <canvas
        ref={canvasRef}
        className="block touch-none select-none outline-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      
      {/* Zoom HUD */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur rounded px-2 py-1 text-xs text-slate-400 font-mono pointer-events-none z-10">
          {Math.round(viewport.scale * 100)}%
      </div>
    </div>
  );
};