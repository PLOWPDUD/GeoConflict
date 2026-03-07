import { Cell, Country, City, TerrainType, WorldEvent, Siege } from '../types';
import { MAP_WIDTH, MAP_HEIGHT } from './MapGenerators';
import { getRandomColor } from '../utils/random';
import { generateFlag } from '../utils/flagGenerator';

const CITY_NAMES_PREFIX = ['New', 'Old', 'Fort', 'Saint', 'Port', 'Mount', 'Lake', 'Grand', 'Little'];
const CITY_NAMES_SUFFIX = ['grad', 'town', 'ville', 'burg', 'ia', 'field', 'haven', 'side', 'wood'];

const generateCityName = () => {
  const p = CITY_NAMES_PREFIX[Math.floor(Math.random() * CITY_NAMES_PREFIX.length)];
  const s = CITY_NAMES_SUFFIX[Math.floor(Math.random() * CITY_NAMES_SUFFIX.length)];
  return `${p} ${s}`;
};

export class SimulationEngine {
  cells: Cell[];
  countries: Country[];
  cities: City[];
  events: WorldEvent[];
  width: number;
  height: number;
  tickCount: number = 0;
  
  // Game Logic state
  activeWars: Set<string> = new Set(); // Key "minId-maxId"
  alliances: Set<string> = new Set(); // Key "minId-maxId"
  truces: Map<string, number> = new Map(); // Key "minId-maxId" -> endTick
  navyUnits: { id: number; ownerId: number; x: number; y: number; targetId: number | null }[] = [];
  sieges: Siege[] = [];
  modifiedCells: Set<number> = new Set(); // Track modified cells for network sync
  
  constructor(cells: Cell[], width: number, height: number) {
    this.cells = cells;
    this.width = width;
    this.height = height;
    this.countries = [];
    this.cities = [];
    this.events = [];
    this.navyUnits = [];
    this.sieges = [];
    this.modifiedCells = new Set();
    this.alliances = new Set();
  }

  // --- Helpers ---
  getIndex(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
    return y * this.width + x;
  }

  getNeighbors(index: number): number[] {
    const x = index % this.width;
    const y = Math.floor(index / this.width);
    const neighbors = [];
    
    const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    for(const [dx, dy] of dirs) {
      const idx = this.getIndex(x + dx, y + dy);
      if (idx !== -1) neighbors.push(idx);
    }
    return neighbors;
  }

  getIndicesInRadius(cx: number, cy: number, size: number): number[] {
    if (size <= 1) {
        const idx = this.getIndex(cx, cy);
        return idx !== -1 ? [idx] : [];
    }

    const indices: number[] = [];
    const r = size - 1; 
    
    const minX = Math.max(0, cx - r);
    const maxX = Math.min(this.width - 1, cx + r);
    const minY = Math.max(0, cy - r);
    const maxY = Math.min(this.height - 1, cy + r);

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
             const dx = x - cx;
             const dy = y - cy;
             if (dx*dx + dy*dy <= r * r + 0.5) {
                 const idx = this.getIndex(x, y);
                 if (idx !== -1) indices.push(idx);
             }
        }
    }
    return indices;
  }

  logEvent(message: string, type: WorldEvent['type']) {
    this.events.unshift({
        id: Math.random(),
        message,
        type,
        timestamp: this.tickCount
    });
    if (this.events.length > 50) this.events.pop();
  }

  getWarKey(id1: number, id2: number) {
      return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
  }

  // --- Actions ---

  declareWar(id1: number, id2: number) {
      const key = this.getWarKey(id1, id2);
      this.activeWars.add(key);
      this.alliances.delete(key); // Breaking alliance
      this.logEvent(`War declared between ${this.countries.find(c => c.id === id1)?.name} and ${this.countries.find(c => c.id === id2)?.name}!`, 'war');
  }

  formAlliance(id1: number, id2: number) {
      const key = this.getWarKey(id1, id2);
      this.alliances.add(key);
      this.activeWars.delete(key); // Ending war
      this.logEvent(`Alliance formed between ${this.countries.find(c => c.id === id1)?.name} and ${this.countries.find(c => c.id === id2)?.name}.`, 'peace');
  }

  spawnCountry(x: number, y: number, name?: string, color?: string): void {
    const idx = this.getIndex(x, y);
    if (idx === -1) return;
    
    const cell = this.cells[idx];
    if (cell.terrain === TerrainType.Water) return;
    if (cell.ownerId !== null) return;

    const newId = this.countries.length > 0 ? Math.max(...this.countries.map(c => c.id)) + 1 : 1;
    const finalColor = color || getRandomColor();
    const finalName = name || `Nation ${newId}`;
    
    const newCountry: Country = {
      id: newId,
      name: finalName,
      color: finalColor,
      flag: generateFlag(finalColor),
      score: 1,
      coins: 100000,
      manpower: 300000,
      lastWarTick: -1000,
      capitalId: idx,
    };

    this.countries.push(newCountry);
    cell.ownerId = newId;
    cell.defense = 100;

    this.placeCity(x, y, `${finalName} Capital`);
    this.logEvent(`${finalName} has been founded.`, 'spawn');
  }

  setCellOwner(x: number, y: number, countryId: number, size: number = 1): void {
    const indices = this.getIndicesInRadius(x, y, size);
    for (const idx of indices) {
        const cell = this.cells[idx];
        // Only allow painting empty cells or own territory
        if (cell.terrain !== TerrainType.Water && (cell.ownerId === null || cell.ownerId === countryId)) {
            cell.ownerId = countryId;
            cell.defense = 100;
            this.modifiedCells.add(idx);
        }
    }
  }

  deleteCountry(id: number): void {
      const country = this.countries.find(c => c.id === id);
      if (country) {
        this.logEvent(`${country.name} was removed by divine intervention.`, 'annex');
      }
      this.countries = this.countries.filter(c => c.id !== id);
      
      // Remove active wars involving this country
      for (const warKey of this.activeWars) {
          if (warKey.includes(`${id}-`) || warKey.includes(`-${id}`)) {
              this.activeWars.delete(warKey);
          }
      }

      for (const cell of this.cells) {
          if (cell.ownerId === id) {
              cell.ownerId = null;
              cell.defense = 0;
              // Track change? Yes, but potentially expensive if huge country. 
              // For now, let's track it.
              // Actually, we can't easily get index here without iterating all cells.
              // Since we iterate all cells anyway:
              // Wait, we need the index.
          }
      }
      // Re-iterate with index to track
      for (let i = 0; i < this.cells.length; i++) {
          if (this.cells[i].ownerId === id) {
              this.cells[i].ownerId = null;
              this.cells[i].defense = 0;
              this.modifiedCells.add(i);
          }
      }

      for (const city of this.cities) {
          if (city.ownerId === id) city.ownerId = null;
      }
  }

  updateCountry(id: number, updates: Partial<Country>) {
      const country = this.countries.find(c => c.id === id);
      if (country) Object.assign(country, updates);
  }

  placeCity(x: number, y: number, name?: string): void {
     const idx = this.getIndex(x, y);
     if (idx === -1) return;
     const cell = this.cells[idx];
     if (cell.terrain === TerrainType.Water) return;
     if (cell.cityId !== null) return;

     const cityId = this.cities.length + 1;
     this.cities.push({
         id: cityId,
         name: name || generateCityName(),
         cellIndex: idx,
         ownerId: cell.ownerId
     });
     cell.cityId = cityId;
     cell.defense += 50;
     this.modifiedCells.add(idx);
  }

  paintTerrain(x: number, y: number, type: TerrainType, size: number = 1): void {
      const indices = this.getIndicesInRadius(x, y, size);
      for (const idx of indices) {
          this.cells[idx].terrain = type;
          if (type === TerrainType.Water) {
              this.cells[idx].ownerId = null;
              this.cells[idx].cityId = null;
              this.cells[idx].defense = 0;
          }
          this.modifiedCells.add(idx);
      }
  }

  getOwnerAt(x: number, y: number): number | null {
      const idx = this.getIndex(x, y);
      if (idx === -1) return null;
      return this.cells[idx].ownerId;
  }

  // --- Tick Logic ---

  tick(): void {
    this.tickCount++;
    
    // Resource Management & Collapse Logic
    const collapsedIds: number[] = [];
    for (const c of this.countries) {
        const ticksSinceWar = this.tickCount - c.lastWarTick;
        const isAtWar = ticksSinceWar < 20;
        
        if (isAtWar) {
            // War Economy Logic
            // "Slightly rise up again before falling down"
            // We simulate a "Mobilization Phase" for the first ~50 ticks of a conflict cycle
            // Since `lastWarTick` updates constantly during active combat, we need a way to track "start of war".
            // However, given the current simple state, we can use a randomized "War Rally" mechanic.
            // Or, we can check if resources are below a threshold and give a "Last Stand" boost.
            
            // Let's interpret "rise up again before falling down" as a periodic rally.
            // Every 100 ticks, if at war, get a boost.
            
            const isRally = this.tickCount % 100 < 20; // 20% of the time, rally
            
            if (isRally) {
                // Mobilization / Rally
                c.coins = Math.min(c.coins + 200, 120000); // Can go slightly over cap during war
                c.manpower = Math.min(c.manpower + 600, 350000);
            } else {
                // War Drain
                c.coins = Math.max(0, c.coins - 150);
                c.manpower = Math.max(0, c.manpower - 400);
            }
            
            // Random fluctuation
            c.manpower += Math.floor(Math.random() * 200 - 100);
        } else {
            // Peace Regeneration
            c.coins = Math.min(c.coins + 50, 100000);
            c.manpower = Math.min(c.manpower + 150, 300000);
            // Random fluctuation
            c.manpower += Math.floor(Math.random() * 100 - 50);
        }

        // Collapse Check
        if (c.coins <= 0 && c.manpower <= 0) {
            collapsedIds.push(c.id);
        }
    }

    // Process collapses
    for (const id of collapsedIds) {
        const c = this.countries.find(x => x.id === id);
        if (c) {
            this.logEvent(`${c.name} has collapsed due to exhaustion!`, 'annex');
            this.deleteCountry(id);
        }
    }

    // Optimization: With 48k cells, 20% is 9600 ops.
    // If performance drags, lower this ratio.
    const updateRatio = 0.1; 
    const numUpdates = Math.floor(this.cells.length * updateRatio); 
    
    for (let i = 0; i < numUpdates; i++) {
        // Optimization: Use random integer rather than Math.floor(Math.random())
        const idx = (Math.random() * this.cells.length) | 0;
        this.processCell(idx);
    }

    if (Math.random() < 0.01) this.checkRevolts();
    if (this.tickCount % 50 === 0) this.checkPeace();
    this.updateNavyUnits();
    this.updateSieges();
    this.updateScores();
  }

  updateSieges() {
      // 1. Check for new sieges
      // Iterate cities, check if any neighbor is enemy at war
      // Optimization: Only check a few cities per tick or check when cells change? 
      // For now, check all cities every 10 ticks to save perf
      if (this.tickCount % 10 === 0) {
          for (const city of this.cities) {
              if (!city.ownerId) continue;
              
              // Check if already besieged
              const existingSiege = this.sieges.find(s => s.cityId === city.id && s.status === 'active');
              if (existingSiege) continue;

              const neighbors = this.getNeighbors(city.cellIndex);
              // Find an enemy neighbor
              for (const nIdx of neighbors) {
                  const cell = this.cells[nIdx];
                  if (cell.ownerId && cell.ownerId !== city.ownerId) {
                      const warKey = this.getWarKey(city.ownerId, cell.ownerId);
                      if (this.activeWars.has(warKey)) {
                          // Start Siege
                          this.sieges.push({
                              id: Math.random(),
                              cityId: city.id,
                              attackerId: cell.ownerId,
                              progress: 0,
                              status: 'active',
                              startTick: this.tickCount
                          });
                          const attacker = this.countries.find(c => c.id === cell.ownerId);
                          const defender = this.countries.find(c => c.id === city.ownerId);
                          if (attacker && defender) {
                              // Optional: Log event? Might be too spammy.
                          }
                          break; // One siege per city
                      }
                  }
              }
          }
      }

      // 2. Update active sieges
      const activeSieges: Siege[] = [];
      for (const siege of this.sieges) {
          if (siege.status !== 'active') {
              // Keep 'won' sieges for a bit to show effect? 
              // For now, just remove them if they are old
              if (this.tickCount - siege.startTick < 200) { // Keep history briefly?
                  // Actually, let's just remove them from logic but maybe renderer handles visual fade
              }
              continue;
          }

          const city = this.cities.find(c => c.id === siege.cityId);
          if (!city || !city.ownerId) {
              siege.status = 'broken';
              continue;
          }

          // Check if attacker still has presence
          const neighbors = this.getNeighbors(city.cellIndex);
          const hasAttackerPresence = neighbors.some(n => this.cells[n].ownerId === siege.attackerId);
          
          if (!hasAttackerPresence) {
              siege.status = 'broken';
              continue; 
          }

          // Check if city owner changed (maybe conquered by normal means)
          if (city.ownerId === siege.attackerId) {
              siege.status = 'won';
              siege.progress = 100;
              continue;
          } else if (city.ownerId !== siege.attackerId && city.ownerId !== this.cities.find(c => c.id === siege.cityId)?.ownerId) {
               // Third party took it?
               siege.status = 'broken';
               continue;
          }

          // Progress Siege
          // Base progress + bonus for more neighbors
          const attackerNeighbors = neighbors.filter(n => this.cells[n].ownerId === siege.attackerId).length;
          siege.progress += 0.5 + (attackerNeighbors * 0.2);

          if (siege.progress >= 100) {
              // Conquer City!
              siege.status = 'won';
              siege.progress = 100;
              
              const cell = this.cells[city.cellIndex];
              const oldOwnerId = cell.ownerId;
              
              cell.ownerId = siege.attackerId;
              cell.defense = 50;
              city.ownerId = siege.attackerId;

              // Handle Capital Relocation (Reuse logic from processCell or extract it)
              if (oldOwnerId) {
                  const defender = this.countries.find(c => c.id === oldOwnerId);
                  const attacker = this.countries.find(c => c.id === siege.attackerId);
                  
                  if (defender && defender.capitalId === city.cellIndex) {
                       this.logEvent(`Capital of ${defender.name} fell to siege by ${attacker?.name}!`, 'annex');
                       // Relocate logic
                       const candidateCities = this.cities.filter(c => c.ownerId === oldOwnerId && c.id !== city.id);
                       if (candidateCities.length > 0) {
                           const newCapital = candidateCities[Math.floor(Math.random() * candidateCities.length)];
                           defender.capitalId = newCapital.cellIndex;
                       } else {
                           defender.capitalId = null;
                       }
                  }
              }
          }
          
          activeSieges.push(siege);
      }
      this.sieges = activeSieges;
  }

  updateNavyUnits() {
      // 1. Spawn Navy Units (Rarely, only if at war and has coast)
      if (this.tickCount % 20 === 0) {
          for (const country of this.countries) {
              const isAtWar = this.tickCount - country.lastWarTick < 50;
              if (isAtWar && Math.random() < 0.3) {
                  // Find a coastal city
                  const coastalCity = this.cities.find(c => {
                      if (c.ownerId !== country.id) return false;
                      const neighbors = this.getNeighbors(c.cellIndex);
                      return neighbors.some(n => this.cells[n].terrain === TerrainType.Water);
                  });

                  if (coastalCity) {
                      // Find water neighbor
                      const neighbors = this.getNeighbors(coastalCity.cellIndex);
                      const waterIdx = neighbors.find(n => this.cells[n].terrain === TerrainType.Water);
                      if (waterIdx !== undefined) {
                          const cell = this.cells[waterIdx];
                          this.navyUnits.push({
                              id: Math.random(),
                              ownerId: country.id,
                              x: cell.x,
                              y: cell.y,
                              targetId: null
                          });
                      }
                  }
              }
          }
      }

      // 2. Move & Combat
      const survivingUnits = [];
      for (const unit of this.navyUnits) {
          let survived = true;

          // Find Target (Enemy Navy)
          if (!unit.targetId) {
              // Simple: Find nearest enemy ship
              let minDist = Infinity;
              let target = null;
              for (const other of this.navyUnits) {
                  if (other.ownerId !== unit.ownerId) {
                       // Check if at war
                       const warKey = this.getWarKey(unit.ownerId, other.ownerId);
                       if (this.activeWars.has(warKey)) {
                           const dist = (unit.x - other.x)**2 + (unit.y - other.y)**2;
                           if (dist < minDist) {
                               minDist = dist;
                               target = other;
                           }
                       }
                  }
              }
              if (target) unit.targetId = target.id;
          }

          // Move towards target
          if (unit.targetId) {
              const target = this.navyUnits.find(u => u.id === unit.targetId);
              if (target) {
                  const dx = target.x - unit.x;
                  const dy = target.y - unit.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  
                  if (dist < 1.5) {
                      // Combat! Both die for simplicity (Kamikaze / Mutual Destruction)
                      // Or 50/50 chance
                      if (Math.random() > 0.5) {
                          survived = false; // We died
                      } else {
                          // They died (handled in their loop iteration or next frame)
                          // Actually, to be fair, let's just mark both for death or damage.
                          // Simplest: 1v1 trade.
                          survived = false;
                          // We need to ensure the other one dies too. 
                          // But we can't modify the array while iterating easily.
                          // Let's just say we die, and if they are close to us, they die next frame.
                      }
                  } else {
                      // Move
                      const speed = 0.5;
                      unit.x += (dx / dist) * speed;
                      unit.y += (dy / dist) * speed;
                  }
              } else {
                  unit.targetId = null; // Target lost
              }
          } else {
              // Wander
              unit.x += (Math.random() - 0.5) * 0.2;
              unit.y += (Math.random() - 0.5) * 0.2;
          }
          
          // Bounds check
          unit.x = Math.max(0, Math.min(this.width-1, unit.x));
          unit.y = Math.max(0, Math.min(this.height-1, unit.y));

          if (survived) survivingUnits.push(unit);
      }
      this.navyUnits = survivingUnits;
  }

  checkPeace() {
      const warsToRemove: string[] = [];
      for (const warKey of this.activeWars) {
          // 10% chance every 50 ticks to make peace
          if (Math.random() < 0.10) { 
               warsToRemove.push(warKey);
          }
      }
      
      for (const key of warsToRemove) {
          this.activeWars.delete(key);
          
          const [id1, id2] = key.split('-').map(Number);
          const c1 = this.countries.find(c => c.id === id1);
          const c2 = this.countries.find(c => c.id === id2);
          
          if (c1 && c2) {
              // Establish Truce for 500 ticks
              this.truces.set(key, this.tickCount + 500);
              this.logEvent(`Peace treaty signed between ${c1.name} and ${c2.name}.`, 'peace');
          }
      }
  }

  setPlayer(id: number) {
      this.countries.forEach(c => c.isPlayer = false);
      const c = this.countries.find(c => c.id === id);
      if (c) c.isPlayer = true;
  }

  setMarchTarget(countryId: number, x: number, y: number) {
      const c = this.countries.find(c => c.id === countryId);
      const idx = this.getIndex(x, y);
      if (c && idx !== -1) {
          c.marchTarget = idx;
          if (c.isPlayer) {
              this.logEvent(`${c.name} is marching towards a new target!`, 'war');
          }
      }
  }

  processCell(idx: number) {
      const cell = this.cells[idx];
      if (cell.ownerId === null || cell.terrain === TerrainType.Water) return;
      
      const country = this.countries.find(c => c.id === cell.ownerId);
      const marchTargetIdx = country?.marchTarget;

      const neighbors = this.getNeighbors(idx);
      let neighborIdx = -1;

      // Targeted March Logic
      if (marchTargetIdx !== undefined && marchTargetIdx !== null) {
          // Check if we reached it
          if (cell.ownerId === this.cells[marchTargetIdx].ownerId) {
             // We own the target (or close enough), maybe clear it? 
             // For now, keep pushing or clear if exact match
             if (idx === marchTargetIdx && country) {
                 country.marchTarget = null;
             }
          }

          // Find neighbor closest to target
          let bestDist = Infinity;
          const targetX = marchTargetIdx % this.width;
          const targetY = Math.floor(marchTargetIdx / this.width);

          // Bias selection: 50% chance to pick purely based on distance, 50% random expansion
          if (Math.random() < 0.5) {
              for (const n of neighbors) {
                  const nx = n % this.width;
                  const ny = Math.floor(n / this.width);
                  const dist = (nx - targetX)**2 + (ny - targetY)**2;
                  
                  // Only prefer if it's not ours or we want to reinforce path
                  // Actually we want to expand to it
                  if (this.cells[n].ownerId !== cell.ownerId) {
                      if (dist < bestDist) {
                          bestDist = dist;
                          neighborIdx = n;
                      }
                  }
              }
          }
      }

      // Fallback to random if no target or random chance
      if (neighborIdx === -1) {
          neighborIdx = neighbors[(Math.random() * neighbors.length) | 0];
      }

      const target = this.cells[neighborIdx];

      if (target.terrain === TerrainType.Water) return;

      if (target.ownerId === null) {
          const difficulty = target.terrain === TerrainType.Mountain ? 0.1 : 0.8;
          if (Math.random() < difficulty) {
              target.ownerId = cell.ownerId;
              target.defense = 10;
          }
          return;
      }

      if (target.ownerId !== cell.ownerId) {
          // Check War
          const warKey = this.getWarKey(cell.ownerId, target.ownerId);
          
          // Check Truce
          if (this.truces.has(warKey)) {
              const endTick = this.truces.get(warKey)!;
              if (this.tickCount < endTick) {
                  return; // Truce in effect, no attack
              } else {
                  this.truces.delete(warKey); // Truce expired
              }
          }

          // Check Alliance
          if (this.alliances.has(warKey)) {
              return; // Alliance in effect, no attack
          }

          if (!this.activeWars.has(warKey)) {
              this.activeWars.add(warKey);
              const c1 = this.countries.find(c => c.id === cell.ownerId);
              const c2 = this.countries.find(c => c.id === target.ownerId);
              if (c1 && c2) {
                  this.logEvent(`War broke out between ${c1.name} and ${c2.name}!`, 'war');
              }
          }

          // Update War State & Resources
          const attacker = this.countries.find(c => c.id === cell.ownerId);
          const defender = this.countries.find(c => c.id === target.ownerId);
          
          if (attacker) {
              attacker.lastWarTick = this.tickCount;
              attacker.coins = Math.max(0, attacker.coins - 10);
              attacker.manpower = Math.max(0, attacker.manpower - 50);
          }
          if (defender) {
              defender.lastWarTick = this.tickCount;
              defender.coins = Math.max(0, defender.coins - 10);
              defender.manpower = Math.max(0, defender.manpower - 50);
          }

          // Bonus for marching target
          let attackBonus = 0;
          if (attacker?.marchTarget) {
              // If this specific attack is directed towards the target, small bonus?
              // Or just the fact that we selected this cell is the bonus.
              // Let's give a small morale bonus for following orders.
              attackBonus = 10;
          }

          const attackRoll = Math.random() * (cell.defense + 50 + attackBonus);
          const defenseRoll = Math.random() * (target.defense + (target.cityId ? 50 : 0) + (target.terrain === TerrainType.Mountain ? 30 : 0));
          
          if (attackRoll > defenseRoll) {
              target.defense -= 20;
              if (target.defense <= 0) {
                  const oldOwnerId = target.ownerId;
                  const capturedIdx = neighborIdx;

                  target.ownerId = cell.ownerId;
                  target.defense = 20;
                  this.modifiedCells.add(neighborIdx); // Track change

                  // Capital Relocation Logic
                  if (oldOwnerId) {
                      const defender = this.countries.find(c => c.id === oldOwnerId);
                      if (defender && defender.capitalId === capturedIdx) {
                          this.logEvent(`Capital of ${defender.name} has fallen!`, 'annex');
                          
                          // 50/50 Chance to relocate
                          if (Math.random() > 0.5) {
                              // Find candidate cities (owned by defender, not the one just lost)
                              // Note: City objects haven't been updated yet, so they still point to oldOwnerId
                              const candidateCities = this.cities.filter(c => 
                                  c.ownerId === oldOwnerId && c.cellIndex !== capturedIdx
                              );
                              
                              if (candidateCities.length > 0) {
                                  const newCapital = candidateCities[Math.floor(Math.random() * candidateCities.length)];
                                  defender.capitalId = newCapital.cellIndex;
                                  this.logEvent(`${defender.name} moved their capital to ${newCapital.name}.`, 'spawn');
                              } else {
                                  defender.capitalId = null;
                              }
                          } else {
                              defender.capitalId = null;
                          }
                      }
                  }

                  if (target.cityId) {
                      cell.defense += 50; 
                      const city = this.cities.find(c => c.id === target.cityId);
                      if (city) city.ownerId = cell.ownerId;
                  }
              }
          } else {
              target.defense = Math.min(target.defense + 5, 100);
          }
      } else {
          if (target.defense < 100) target.defense += 1;
      }
  }

  updateScores() {
      const scores = new Map<number, number>();
      // Faster iteration?
      for(let i=0; i<this.cells.length; i++) {
          const oid = this.cells[i].ownerId;
          if (oid !== null) {
              scores.set(oid, (scores.get(oid) || 0) + 1);
          }
      }

      const survivingCountries: Country[] = [];
      for(const c of this.countries) {
          const newScore = scores.get(c.id) || 0;
          if (c.score > 0 && newScore === 0) {
              this.logEvent(`${c.name} has been annexed.`, 'annex');
          } else if (newScore > 0 || c.score === 0) {
               c.score = newScore;
               survivingCountries.push(c);
          }
      }
      this.countries = survivingCountries;
      
      // Bot AI: Pick Targets
      if (this.tickCount % 100 === 0) {
          for (const c of this.countries) {
              if (c.isPlayer) continue; // Skip player
              
              // If at war, pick a target
              const isAtWar = this.tickCount - c.lastWarTick < 50;
              if (isAtWar) {
                  // Find an enemy
                  // Iterate active wars
                  let enemyId = null;
                  for (const warKey of this.activeWars) {
                      if (warKey.includes(`${c.id}-`) || warKey.includes(`-${c.id}`)) {
                          const [id1, id2] = warKey.split('-').map(Number);
                          enemyId = (id1 === c.id) ? id2 : id1;
                          break;
                      }
                  }

                  if (enemyId) {
                      const enemy = this.countries.find(e => e.id === enemyId);
                      if (enemy && enemy.capitalId) {
                          // Target Capital
                          c.marchTarget = enemy.capitalId;
                      } else {
                          // Target random enemy city or cell
                          // Finding a cell is expensive, let's look at cities first
                          const enemyCity = this.cities.find(city => city.ownerId === enemyId);
                          if (enemyCity) {
                              c.marchTarget = enemyCity.cellIndex;
                          }
                      }
                  }
              } else {
                  // Peace time: clear target
                  c.marchTarget = null;
              }
          }
      }
  }

  checkRevolts() {
    if (this.countries.length === 0) return;
    const country = this.countries[(Math.random() * this.countries.length) | 0];
    if (country.score < 50) return; // Increased threshold for larger map
    if (!country.capitalId) return;

    const queue = [country.capitalId];
    const visited = new Set<number>();
    visited.add(country.capitalId);
    
    let limit = 0;
    while(queue.length > 0 && limit < 8000) {
        limit++;
        const curr = queue.shift()!;
        const neighbors = this.getNeighbors(curr);
        for(const n of neighbors) {
            if (this.cells[n].ownerId === country.id && !visited.has(n)) {
                visited.add(n);
                queue.push(n);
            }
        }
    }

    if (visited.size < country.score * 0.7) {
        const rebelId = this.countries.length > 0 ? Math.max(...this.countries.map(c => c.id)) + 1 : 1;
        const rebelColor = getRandomColor();
        const rebelName = `${country.name} Separatists`;
        
        const newRebel: Country = {
            id: rebelId,
            name: rebelName,
            color: rebelColor,
            flag: generateFlag(rebelColor),
            score: 0,
            coins: 100000,
            manpower: 300000,
            lastWarTick: this.tickCount,
            isRebel: true,
            capitalId: null
        };
        this.countries.push(newRebel);

        let convertedCount = 0;
        for(let i=0; i<this.cells.length; i++) {
            if (this.cells[i].ownerId === country.id && !visited.has(i)) {
                this.cells[i].ownerId = rebelId;
                this.modifiedCells.add(i); // Track change
                convertedCount++;
                if (this.countries[this.countries.length-1].capitalId === null) {
                    this.countries[this.countries.length-1].capitalId = i;
                    this.placeCity(this.cells[i].x, this.cells[i].y, `${rebelName} HQ`);
                }
            }
        }
        
        if (convertedCount > 0) {
             this.logEvent(`Rebellion! ${rebelName} have risen up against ${country.name}.`, 'revolt');
        }
    }
  }
}