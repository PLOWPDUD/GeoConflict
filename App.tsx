import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SimulationEngine } from './services/SimulationEngine';
import { 
  generateWorld, 
  generateContinents, 
  generateCustom, 
  generateRealEarth,
  generateEurope,
  generateAfrica,
  generateNorthAmerica,
  generateSouthAmerica,
  generateAsia,
  generateOceania,
  MAP_WIDTH, 
  MAP_HEIGHT 
} from './services/MapGenerators';
import { CanvasRenderer } from './components/CanvasRenderer';
import { Interface } from './components/Interface';
import { Leaderboard } from './components/Leaderboard';
import { SpawnModal } from './components/SpawnModal';
import { CountryInspector } from './components/CountryInspector';
import { EventLog } from './components/EventLog';
import { HomeScreen } from './components/HomeScreen';
import { MapMode, ToolType, TerrainType, Country } from './types';

const socket = io();

// Initial Engine Setup
const createEngine = (mode: MapMode) => {
  let data;
  switch (mode) {
    case MapMode.Continents: data = { cells: generateContinents(), countries: [], cities: [] }; break;
    case MapMode.Custom: data = { cells: generateCustom(), countries: [], cities: [] }; break;
    case MapMode.TrueEarth: data = generateRealEarth(); break;
    case MapMode.Europe: data = generateEurope(); break;
    case MapMode.Africa: data = generateAfrica(); break;
    case MapMode.NorthAmerica: data = generateNorthAmerica(); break;
    case MapMode.SouthAmerica: data = generateSouthAmerica(); break;
    case MapMode.Asia: data = generateAsia(); break;
    case MapMode.Oceania: data = generateOceania(); break;
    case MapMode.World: default: data = { cells: generateWorld(), countries: [], cities: [] }; break;
  }
  
  // Handle scenarios that return full game state (Real Earth) vs just cells
  const engine = new SimulationEngine(data.cells, MAP_WIDTH, MAP_HEIGHT);
  if (data.countries && data.countries.length > 0) {
      engine.countries = data.countries;
      engine.cities = data.cities;
  }
  return engine;
};

export default function App() {
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [mapMode, setMapMode] = useState<MapMode>(MapMode.World);
  const [tool, setTool] = useState<ToolType>(ToolType.SpawnCountry);
  const [isRunning, setIsRunning] = useState(false);
  const [engine, setEngine] = useState<SimulationEngine>(() => createEngine(MapMode.World));
  
  // UI State
  const [tickCount, setTickCount] = useState(0);
  const [brushSize, setBrushSize] = useState(1);
  
  // Modals / Inspectors
  const [spawnLocation, setSpawnLocation] = useState<{x: number, y: number} | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [godModePaintingId, setGodModePaintingId] = useState<number | null>(null);

  // Refs for the loop
  const engineRef = useRef(engine);
  const animationFrameRef = useRef<number>();

  // Helper to re-generate map
  const handleGenerate = useCallback(() => {
    const newEngine = createEngine(mapMode);
    setEngine(newEngine);
    engineRef.current = newEngine;
    setTickCount(0);
    setIsRunning(false);
    setSelectedCountryId(null);
    setGodModePaintingId(null);
  }, [mapMode]);

  // Effect to regenerate when mapMode changes IF we are already in game
  useEffect(() => {
    if (screen === 'game') {
        handleGenerate();
    }
  }, [mapMode, handleGenerate, screen]);

  // Simulation Loop (Local)
  useEffect(() => {
    if (!isRunning) return;
    const loop = () => {
      engineRef.current.tick();
      // Update react state if countries exist or events happened
      if (engineRef.current.countries.length > 0 || engineRef.current.events.length > 0) {
           setTickCount(prev => prev + 1);
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRunning]);

  // Handle Canvas Interactivity
  const handleInteract = (x: number, y: number) => {
    const eng = engineRef.current;
    
    // Override if in God Mode Paint State
    if (godModePaintingId !== null && tool === ToolType.PaintTerritory) {
         eng.setCellOwner(x, y, godModePaintingId, brushSize);
         return;
    }

    switch (tool) {
      case ToolType.Select: {
          const owner = eng.getOwnerAt(x, y);
          
          // Player March Logic: If we have a selected country, and it IS the player, and we click elsewhere
          if (selectedCountryId) {
              const selectedC = eng.countries.find(c => c.id === selectedCountryId);
              if (selectedC && selectedC.isPlayer) {
                  // If clicking on enemy or empty land, set march target
                  if (owner !== selectedCountryId) {
                      eng.setMarchTarget(selectedCountryId, x, y);
                      // Don't deselect, just command
                      return;
                  }
              }
          }

          if (owner !== null) {
              setSelectedCountryId(owner);
              setGodModePaintingId(null); // Reset painting when selecting new
          } else {
              setSelectedCountryId(null);
          }
          break;
      }
      case ToolType.SpawnCountry:
        // Open Modal instead of spawning immediately
        setSpawnLocation({ x, y });
        break;
      case ToolType.PlaceCity:
        eng.placeCity(x, y);
        break;
      case ToolType.BrushLand:
        eng.paintTerrain(x, y, TerrainType.Land, brushSize);
        break;
      case ToolType.BrushMountain:
        eng.paintTerrain(x, y, TerrainType.Mountain, brushSize);
        break;
      case ToolType.BrushSea:
        eng.paintTerrain(x, y, TerrainType.Water, brushSize);
        break;
      case ToolType.PaintTerritory:
         // Handled above in godMode check, but fallback here
         if (selectedCountryId) eng.setCellOwner(x, y, selectedCountryId, brushSize);
         break;
    }
  };

  // Modal Callbacks
  const handleSpawnConfirm = (name: string, color: string) => {
      if (spawnLocation) {
          engineRef.current.spawnCountry(spawnLocation.x, spawnLocation.y, name, color);
          setTickCount(c => c + 1);
          setSpawnLocation(null);
      }
  };

  // God Mode Callbacks
  const handleDeleteCountry = (id: number) => {
      engineRef.current.deleteCountry(id);
      setSelectedCountryId(null);
      setTickCount(c => c + 1);
  };
  
  const handleUpdateCountry = (id: number, updates: Partial<Country>) => {
      engineRef.current.updateCountry(id, updates);
      socket.emit("country:update", { id, updates });
      setTickCount(c => c + 1);
  };

  useEffect(() => {
    socket.on("country:update", ({ id, updates }) => {
      engineRef.current.updateCountry(id, updates);
      setTickCount(c => c + 1);
    });
    return () => {
      socket.off("country:update");
    };
  }, []);

  const handleDeclareWar = (id1: number, id2: number) => {
      engineRef.current.declareWar(id1, id2);
      socket.emit("country:update", { id: id1, updates: { lastWarTick: engineRef.current.tickCount } });
      setTickCount(c => c + 1);
  };

  const handleFormAlliance = (id1: number, id2: number) => {
      engineRef.current.formAlliance(id1, id2);
      setTickCount(c => c + 1);
  };

  const handlePlayAs = (id: number) => {
      engineRef.current.setPlayer(id);
      setTickCount(c => c + 1);
  };

  const togglePaintTerritory = (id: number) => {
      if (godModePaintingId === id) {
          // Stop painting
          setGodModePaintingId(null);
          setTool(ToolType.Select);
      } else {
          // Start painting
          setGodModePaintingId(id);
          setTool(ToolType.PaintTerritory);
      }
  };

  const handleStartGame = (mode: MapMode, roomName?: string, settings?: any) => {
      settingsRef.current = settings;
      setMapMode(mode);
      setScreen('game');
      
      // If settings exist, use the map setting
      if (settings?.map) {
          const mapModeMap: Record<string, MapMode> = {
              'Procedural': MapMode.World,
              'True Earth': MapMode.TrueEarth,
              'Europe': MapMode.Europe
          };
          setMapMode(mapModeMap[settings.map] || MapMode.World);
      }

      if (roomName) {
          socket.emit("room:join", { roomName, settings });
      }
  };

  // Effect to spawn player when game starts
  useEffect(() => {
      if (screen === 'game' && settingsRef.current?.playerName) {
          const eng = engineRef.current;
          // Find a random land cell
          let x, y;
          do {
              x = Math.floor(Math.random() * MAP_WIDTH);
              y = Math.floor(Math.random() * MAP_HEIGHT);
          } while (eng.getTerrainAt(x, y) !== TerrainType.Land);
          
          eng.spawnCountry(x, y, settingsRef.current.playerName, '#FF0000');
          // Set as player
          const newCountry = eng.countries[eng.countries.length - 1];
          eng.setPlayer(newCountry.id);
          setTickCount(c => c + 1);
      }
  }, [screen]);

  // Need to store settings in a ref to access in useEffect
  const settingsRef = useRef<any>(null);
  useEffect(() => {
      // This is a bit hacky, but works for now
      // In a real app, pass settings to App state
  }, []);


  if (screen === 'home') {
      return <HomeScreen onStart={handleStartGame} />;
  }

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col relative">
      <Interface 
        mapMode={mapMode}
        setMapMode={setMapMode}
        tool={tool}
        setTool={(t) => {
             setTool(t);
             // If switching away from paint territory manually, stop painting
             if (t !== ToolType.PaintTerritory) setGodModePaintingId(null);
        }}
        isRunning={isRunning}
        toggleRun={() => setIsRunning(!isRunning)}
        onGenerate={handleGenerate}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
      />

      <CanvasRenderer 
        engine={engine}
        onInteract={handleInteract}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
      />

      <EventLog events={engine.events} />
      <Leaderboard countries={engine.countries} />

      {spawnLocation && (
          <SpawnModal 
              x={spawnLocation.x} 
              y={spawnLocation.y} 
              onConfirm={handleSpawnConfirm} 
              onCancel={() => setSpawnLocation(null)}
          />
      )}

      {selectedCountryId && engine.countries.find(c => c.id === selectedCountryId) && (
          <CountryInspector 
              country={engine.countries.find(c => c.id === selectedCountryId)!}
              allCountries={engine.countries}
              onClose={() => setSelectedCountryId(null)}
              onDelete={handleDeleteCountry}
              onUpdate={handleUpdateCountry}
              onPaintTerritory={togglePaintTerritory}
              onDeclareWar={handleDeclareWar}
              onFormAlliance={handleFormAlliance}
              isPainting={godModePaintingId === selectedCountryId}
          />
      )}
    </div>
  );
}