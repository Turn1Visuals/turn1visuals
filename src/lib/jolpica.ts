/**
 * Jolpica API helpers — F1 data (successor to Ergast)
 * Base: https://api.jolpi.ca/ergast/f1/
 * All functions are designed for client-side use (browser fetch).
 * No API key required. CORS-friendly.
 */

const BASE = 'https://api.jolpi.ca/ergast/f1';

/** Fetch with error handling; returns null on failure */
async function jolpicaFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}?limit=100`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.MRData as T;
  } catch {
    return null;
  }
}

// ─── Types (minimal, extend as needed) ───────────────────

export interface Driver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  dateOfBirth?: string;
  nationality?: string;
  url?: string;
}

export interface Constructor {
  constructorId: string;
  name: string;
  nationality?: string;
  url?: string;
}

export interface DriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

export interface ConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: Constructor;
}

export interface RaceResult {
  number: string;
  position: string;
  points: string;
  Driver: Driver;
  Constructor: Constructor;
  grid: string;
  laps: string;
  status: string;
  Time?: { time: string };
  FastestLap?: { rank: string; lap: string; Time: { time: string } };
}

export interface Race {
  season: string;
  round: string;
  raceName: string;
  Circuit: { circuitName: string; Location: { locality: string; country: string } };
  date: string;
  time?: string;
  Results?: RaceResult[];
}

// ─── API Functions ────────────────────────────────────────

/** Current season driver standings */
export async function getDriverStandings(): Promise<DriverStanding[]> {
  const data = await jolpicaFetch<any>('/current/driverStandings.json');
  return data?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
}

/** Current season constructor standings */
export async function getConstructorStandings(): Promise<ConstructorStanding[]> {
  const data = await jolpicaFetch<any>('/current/constructorStandings.json');
  return data?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
}

/** All race results for the current season */
export async function getSeasonResults(): Promise<Race[]> {
  const data = await jolpicaFetch<any>('/current/results.json');
  return data?.RaceTable?.Races ?? [];
}

/** All drivers on the current grid */
export async function getCurrentDrivers(): Promise<Driver[]> {
  const data = await jolpicaFetch<any>('/current/drivers.json');
  return data?.DriverTable?.Drivers ?? [];
}

/** All constructors in the current season */
export async function getCurrentConstructors(): Promise<Constructor[]> {
  const data = await jolpicaFetch<any>('/current/constructors.json');
  return data?.ConstructorTable?.Constructors ?? [];
}

/** Driver standings for a specific season */
export async function getSeasonDriverStandings(year: number): Promise<DriverStanding[]> {
  const data = await jolpicaFetch<any>(`/${year}/driverStandings.json`);
  return data?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
}
