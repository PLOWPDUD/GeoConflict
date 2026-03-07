import { Cell, TerrainType, Country, City } from '../types';
import { SimpleNoise, getRandomColor } from '../utils/random';
import { generateFlag } from '../utils/flagGenerator';

// Increased resolution for world map details
const WIDTH = 300;
const HEIGHT = 160;

export const MAP_WIDTH = WIDTH;
export const MAP_HEIGHT = HEIGHT;

const createEmptyGrid = (defaultTerrain: TerrainType): Cell[] => {
  const cells: Cell[] = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      cells.push({
        x,
        y,
        terrain: defaultTerrain,
        ownerId: null,
        cityId: null,
        defense: 0,
      });
    }
  }
  return cells;
};

// --- Real World Data Helpers ---

// A very simplified low-res run-length encoded world map
// 0=Water, 1=Land.
// This is a rough approximation scaled to 300x160. 
// Ideally we would fetch this, but for a self-contained app we approximate.
const isLandCoordinate = (x: number, y: number): boolean => {
    // Normalize to 0-1
    const nx = x / WIDTH;
    const ny = y / HEIGHT;

    // Mathematical approximations of continents (Bounding Boxes & Ellipses)
    // This is faster and smaller than a massive bitmap string

    // South America
    if (nx > 0.25 && nx < 0.35 && ny > 0.5 && ny < 0.85) return true; 
    // North America
    if (nx > 0.15 && nx < 0.35 && ny > 0.1 && ny < 0.5) return true;
    // Africa
    if (nx > 0.42 && nx < 0.60 && ny > 0.35 && ny < 0.75) return true;
    // Europe
    if (nx > 0.42 && nx < 0.60 && ny > 0.15 && ny < 0.35) return true;
    // Asia (Huge blob)
    if (nx > 0.60 && nx < 0.90 && ny > 0.15 && ny < 0.55) return true;
    // Oceania
    if (nx > 0.75 && nx < 0.95 && ny > 0.6 && ny < 0.8) return true;
    // Antarctica
    if (ny > 0.9) return true;
    // Greenland
    if (nx > 0.35 && nx < 0.45 && ny > 0.05 && ny < 0.15) return true;

    return false;
};

// Refined "Noise + Mask" approach for better looking procedural earth
const generateEarthTerrain = (offsetX: number = 0, offsetY: number = 0, zoom: number = 1): Cell[] => {
    const cells = createEmptyGrid(TerrainType.Water);
    const noise = new SimpleNoise(123); // Fixed seed for consistency
    
    for (const c of cells) {
        // Coordinate mapping for Zoom/Pan regions
        // Map grid (0..WIDTH) to World Space (0..1)
        
        const worldX = (c.x / WIDTH) / zoom + offsetX;
        const worldY = (c.y / HEIGHT) / zoom + offsetY;

        // Base Land Mask (The heavy lifting)
        let isLand = false;
        
        // --- Manual Shape Definitions (The "Art" part) ---
        // Coordinates are roughly 0.0 to 1.0 (Left to Right, Top to Bottom)
        
        // North America
        if (checkPoly(worldX, worldY, [0.1, 0.1], [0.4, 0.1], [0.3, 0.5], [0.15, 0.4])) isLand = true;
        // South America
        if (checkPoly(worldX, worldY, [0.28, 0.5], [0.38, 0.55], [0.32, 0.85], [0.28, 0.7])) isLand = true;
        // Europe
        if (checkPoly(worldX, worldY, [0.45, 0.15], [0.6, 0.15], [0.55, 0.35], [0.42, 0.32])) isLand = true;
        // Africa
        if (checkPoly(worldX, worldY, [0.42, 0.35], [0.62, 0.35], [0.55, 0.75], [0.45, 0.6])) isLand = true;
        // Asia
        if (checkPoly(worldX, worldY, [0.6, 0.1], [0.95, 0.1], [0.9, 0.5], [0.6, 0.45])) isLand = true;
        // India Subcontinent
        if (checkPoly(worldX, worldY, [0.65, 0.4], [0.75, 0.4], [0.70, 0.55])) isLand = true;
        // Australia
        if (checkPoly(worldX, worldY, [0.78, 0.65], [0.92, 0.65], [0.9, 0.8], [0.8, 0.78])) isLand = true;
        
        // Add some noise to edges
        const n = noise.fbm(c.x * 0.05, c.y * 0.05, 3);
        
        if (isLand) {
            // Erode edges with noise
            if (n > 0.3) c.terrain = TerrainType.Land;
        }
        
        // Mountains
        if (c.terrain === TerrainType.Land && n > 0.65) {
            c.terrain = TerrainType.Mountain;
        }
    }
    return cells;
};

// Helper for polygon hit testing (Point in Polygon)
function checkPoly(x: number, y: number, ...points: number[][]) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i][0], yi = points[i][1];
        const xj = points[j][0], yj = points[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// --- Country Data ---
// Normalized coordinates (0.0 to 1.0) on the World Map
interface CountryDef { name: string; x: number; y: number; color?: string; region: string }

const COUNTRIES: CountryDef[] = [
    // North America
    { name: "USA", x: 0.22, y: 0.3, region: "NorthAmerica", color: "#3b82f6" },
    { name: "Canada", x: 0.22, y: 0.15, region: "NorthAmerica", color: "#ef4444" },
    { name: "Mexico", x: 0.20, y: 0.42, region: "NorthAmerica", color: "#10b981" },
    { name: "Cuba", x: 0.26, y: 0.43, region: "NorthAmerica", color: "#3b82f6" },
    { name: "Guatemala", x: 0.21, y: 0.46, region: "NorthAmerica" },
    
    // South America
    { name: "Brazil", x: 0.35, y: 0.65, region: "SouthAmerica", color: "#22c55e" },
    { name: "Argentina", x: 0.30, y: 0.8, region: "SouthAmerica", color: "#60a5fa" },
    { name: "Chile", x: 0.28, y: 0.78, region: "SouthAmerica", color: "#ef4444" },
    { name: "Peru", x: 0.28, y: 0.62, region: "SouthAmerica", color: "#f87171" },
    { name: "Colombia", x: 0.29, y: 0.52, region: "SouthAmerica", color: "#fbbf24" },
    { name: "Venezuela", x: 0.31, y: 0.51, region: "SouthAmerica" },

    // Europe
    { name: "UK", x: 0.47, y: 0.22, region: "Europe", color: "#ef4444" },
    { name: "France", x: 0.48, y: 0.26, region: "Europe", color: "#3b82f6" },
    { name: "Germany", x: 0.50, y: 0.24, region: "Europe", color: "#fbbf24" },
    { name: "Spain", x: 0.46, y: 0.30, region: "Europe", color: "#f59e0b" },
    { name: "Italy", x: 0.51, y: 0.30, region: "Europe", color: "#16a34a" },
    { name: "Poland", x: 0.52, y: 0.24, region: "Europe" },
    { name: "Ukraine", x: 0.55, y: 0.25, region: "Europe", color: "#facc15" },
    { name: "Russia", x: 0.65, y: 0.18, region: "Europe", color: "#dc2626" },
    { name: "Sweden", x: 0.52, y: 0.15, region: "Europe", color: "#fcd34d" },
    { name: "Norway", x: 0.50, y: 0.15, region: "Europe" },
    { name: "Finland", x: 0.54, y: 0.14, region: "Europe" },
    { name: "Greece", x: 0.53, y: 0.32, region: "Europe" },
    { name: "Turkey", x: 0.57, y: 0.32, region: "Europe", color: "#ef4444" },
    { name: "Portugal", x: 0.45, y: 0.30, region: "Europe" },
    { name: "Romania", x: 0.54, y: 0.28, region: "Europe" },

    // Africa
    { name: "Egypt", x: 0.55, y: 0.40, region: "Africa", color: "#fcd34d" },
    { name: "South Africa", x: 0.52, y: 0.78, region: "Africa", color: "#16a34a" },
    { name: "Nigeria", x: 0.48, y: 0.50, region: "Africa", color: "#16a34a" },
    { name: "Kenya", x: 0.58, y: 0.55, region: "Africa" },
    { name: "Ethiopia", x: 0.58, y: 0.50, region: "Africa" },
    { name: "Morocco", x: 0.45, y: 0.38, region: "Africa", color: "#ef4444" },
    { name: "Algeria", x: 0.48, y: 0.40, region: "Africa", color: "#16a34a" },
    { name: "DRC", x: 0.52, y: 0.60, region: "Africa", color: "#3b82f6" },
    { name: "Sudan", x: 0.55, y: 0.48, region: "Africa" },
    { name: "Madagascar", x: 0.62, y: 0.70, region: "Africa" },

    // Asia
    { name: "China", x: 0.75, y: 0.35, region: "Asia", color: "#dc2626" },
    { name: "India", x: 0.68, y: 0.45, region: "Asia", color: "#f97316" },
    { name: "Japan", x: 0.88, y: 0.32, region: "Asia", color: "#ef4444" },
    { name: "South Korea", x: 0.82, y: 0.32, region: "Asia", color: "#3b82f6" },
    { name: "Indonesia", x: 0.80, y: 0.60, region: "Asia", color: "#ef4444" },
    { name: "Saudi Arabia", x: 0.60, y: 0.42, region: "Asia", color: "#16a34a" },
    { name: "Iran", x: 0.62, y: 0.35, region: "Asia", color: "#16a34a" },
    { name: "Pakistan", x: 0.65, y: 0.40, region: "Asia", color: "#16a34a" },
    { name: "Thailand", x: 0.75, y: 0.50, region: "Asia" },
    { name: "Vietnam", x: 0.77, y: 0.50, region: "Asia", color: "#ef4444" },
    { name: "Mongolia", x: 0.75, y: 0.25, region: "Asia" },
    { name: "Kazakhstan", x: 0.65, y: 0.25, region: "Asia", color: "#60a5fa" },

    // Oceania
    { name: "Australia", x: 0.85, y: 0.75, region: "Oceania", color: "#fbbf24" },
    { name: "New Zealand", x: 0.95, y: 0.85, region: "Oceania" },
    { name: "Papua New Guinea", x: 0.88, y: 0.65, region: "Oceania" },
];

// --- Generation Functions ---

interface GenResult {
    cells: Cell[];
    countries: Country[];
    cities: City[];
}

// Helper to fill borders using Voronoi logic (Nearest Capital)
const fillBorders = (cells: Cell[], countries: Country[]): void => {
    // Optimization: Only iterate land cells
    const landCells = cells.filter(c => c.terrain !== TerrainType.Water);
    
    // For every land cell, find nearest country capital
    for (const cell of landCells) {
        let minDist = Infinity;
        let ownerId = null;

        for (const country of countries) {
            if (country.capitalId === null) continue;
            
            // Fast distance check
            const cx = country.capitalId % WIDTH;
            const cy = Math.floor(country.capitalId / WIDTH);
            
            const dx = cell.x - cx;
            const dy = cell.y - cy;
            const distSq = dx*dx + dy*dy;
            
            if (distSq < minDist) {
                minDist = distSq;
                ownerId = country.id;
            }
        }
        
        if (ownerId !== null) {
            cell.ownerId = ownerId;
            cell.defense = 50; // Base defense for pre-filled lands
            
            // Add a city at capital if it's the exact spot
            if (minDist === 0) {
                // Capital city logic is handled in spawn, but we need to ensure defense is high
                cell.defense = 100;
            }
        }
    }
};

const createScenario = (regionFilter: string | null): GenResult => {
    // 1. Generate Terrain
    // We adjust zoom based on region to make the map look "full"
    let zoom = 1;
    let offsetX = 0;
    let offsetY = 0;
    
    if (regionFilter === "Europe") { zoom = 4; offsetX = -0.45; offsetY = 0.12; }
    if (regionFilter === "Africa") { zoom = 2.5; offsetX = -0.45; offsetY = 0.35; }
    if (regionFilter === "NorthAmerica") { zoom = 2.5; offsetX = -0.15; offsetY = 0.1; }
    if (regionFilter === "SouthAmerica") { zoom = 2.5; offsetX = -0.25; offsetY = 0.45; }
    if (regionFilter === "Asia") { zoom = 1.8; offsetX = -0.6; offsetY = 0.08; }
    if (regionFilter === "Oceania") { zoom = 3; offsetX = -0.8; offsetY = 0.59; }

    const cells = generateEarthTerrain(offsetX, offsetY, zoom);
    
    // 2. Filter Countries
    let activeCountries = COUNTRIES;
    if (regionFilter) {
        activeCountries = COUNTRIES.filter(c => c.region === regionFilter);
    }

    // 3. Create Country Objects
    const countries: Country[] = [];
    const cities: City[] = [];

    activeCountries.forEach((def, index) => {
        // Transform normalized coord to grid coord based on zoom
        // worldX = (gridX / WIDTH) / zoom + offsetX
        // gridX = (worldX - offsetX) * zoom * WIDTH
        
        const gx = Math.floor((def.x - offsetX) * zoom * WIDTH);
        const gy = Math.floor((def.y - offsetY) * zoom * HEIGHT);

        if (gx >= 0 && gx < WIDTH && gy >= 0 && gy < HEIGHT) {
            const idx = gy * WIDTH + gx;
            const cell = cells[idx];
            
            // Ensure capital is on land
            if (cell.terrain === TerrainType.Water) {
                // Spiral search for nearest land
                // (Skipped for brevity, assuming defs are roughly accurate)
                cell.terrain = TerrainType.Land; // Force land
            }

            const id = index + 1;
            const finalColor = def.color || getRandomColor();
            const country: Country = {
                id,
                name: def.name,
                color: finalColor,
                flag: generateFlag(finalColor),
                score: 1,
                coins: 100000,
                manpower: 300000,
                lastWarTick: -1000,
                capitalId: idx
            };
            countries.push(country);
            
            // Add Capital City
            cities.push({
                id: cities.length + 1,
                name: `${def.name} City`,
                cellIndex: idx,
                ownerId: id
            });
            cell.cityId = cities.length;
        }
    });

    // 4. Fill Borders
    fillBorders(cells, countries);

    return { cells, countries, cities };
};

// --- Exported Generators ---

export const generateWorld = (): Cell[] => {
  const cells = createEmptyGrid(TerrainType.Water);
  const noise = new SimpleNoise(256);
  const scale = 0.03; // Adjusted for larger map

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const value = noise.fbm(c.x * scale, c.y * scale, 5);

    if (value > 0.60) {
      c.terrain = TerrainType.Mountain;
    } else if (value > 0.40) {
      c.terrain = TerrainType.Land;
    } else {
      c.terrain = TerrainType.Water;
    }
  }
  return cells;
};

export const generateContinents = (): Cell[] => {
  const cells = createEmptyGrid(TerrainType.Water);
  const numContinents = 8;
  const noise = new SimpleNoise(256);
  const centers = [];
  for(let i=0; i<numContinents; i++) {
    centers.push({ x: Math.random() * WIDTH, y: Math.random() * HEIGHT });
  }

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    let maxInfluence = 0;
    for(const center of centers) {
        const dx = c.x - center.x;
        const dy = c.y - center.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const influence = (40 / (dist + 1)); 
        maxInfluence += influence;
    }
    const noiseVal = noise.fbm(c.x * 0.05, c.y * 0.05, 2) * 2;
    if (maxInfluence + noiseVal > 3.0) {
       c.terrain = TerrainType.Land;
       if (maxInfluence + noiseVal > 5.0) c.terrain = TerrainType.Mountain;
    }
  }
  return cells;
};

export const generateCustom = (): Cell[] => createEmptyGrid(TerrainType.Water);

// Real World Wrappers
export const generateRealEarth = () => createScenario(null);
export const generateEurope = () => createScenario("Europe");
export const generateAfrica = () => createScenario("Africa");
export const generateAsia = () => createScenario("Asia");
export const generateNorthAmerica = () => createScenario("NorthAmerica");
export const generateSouthAmerica = () => createScenario("SouthAmerica");
export const generateOceania = () => createScenario("Oceania");
