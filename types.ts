export enum TerrainType {
  Water = 0,
  Land = 1,
  Mountain = 2
}

export interface Cell {
  x: number;
  y: number;
  terrain: TerrainType;
  ownerId: number | null; // null = unowned
  cityId: number | null; // null = no city
  defense: number;
}

export interface Country {
  id: number;
  name: string;
  color: string;
  flag: string; // Base64 Data URL
  score: number; // Number of cells owned
  coins: number;
  manpower: number;
  lastWarTick: number;
  isRebel?: boolean;
  capitalId: number | null; // Index of the cell that is capital
  isPlayer?: boolean;
  marchTarget?: number | null; // Cell index
}

export interface City {
  id: number;
  name: string;
  cellIndex: number;
  ownerId: number | null;
}

export interface WorldEvent {
  id: number;
  message: string;
  type: 'war' | 'peace' | 'annex' | 'spawn' | 'revolt';
  timestamp: number; // Game tick
}

export enum MapMode {
  World = 'World', // Procedural Perlin
  Continents = 'Continents', // Procedural Blobs
  Custom = 'Custom',
  TrueEarth = 'TrueEarth',
  Europe = 'Europe',
  Africa = 'Africa',
  NorthAmerica = 'NorthAmerica',
  SouthAmerica = 'SouthAmerica',
  Asia = 'Asia',
  Oceania = 'Oceania',
}

export enum ToolType {
  Select = 'Select',
  PaintTerritory = 'PaintTerritory', // God mode specific
  BrushLand = 'BrushLand',
  BrushSea = 'BrushSea',
  BrushMountain = 'BrushMountain',
  SpawnCountry = 'SpawnCountry',
  PlaceCity = 'PlaceCity',
  Delete = 'Delete',
}

export interface NavyUnit {
  id: number;
  ownerId: number;
  x: number;
  y: number;
  targetId: number | null; // Enemy navy unit ID
}

export interface Siege {
  id: number;
  cityId: number;
  attackerId: number;
  progress: number; // 0 to 100
  status: 'active' | 'won' | 'broken';
  startTick: number;
}

export interface GameState {
  cells: Cell[];
  countries: Country[];
  cities: City[];
  navyUnits: NavyUnit[];
  sieges: Siege[];
  width: number;
  height: number;
  tick: number;
  isRunning: boolean;
}