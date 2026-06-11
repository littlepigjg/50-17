import type { Level, LevelProgress, SandboxCreation } from './types';

const PROGRESS_KEY = 'coderobot_progress_v1';
const CUSTOM_LEVELS_KEY = 'coderobot_custom_levels_v1';
const SANDBOX_CREATIONS_KEY = 'coderobot_sandbox_creations_v1';

export interface ProgressData {
  [levelId: string]: LevelProgress;
}

export function loadProgress(): ProgressData {
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: ProgressData): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

export function updateLevelProgress(
  levelId: string,
  stars: number,
  steps: number
): ProgressData {
  const progress = loadProgress();
  const existing = progress[levelId];

  if (!existing || stars > existing.starsCollected || steps < existing.bestSteps) {
    progress[levelId] = {
      completed: true,
      starsCollected: Math.max(existing?.starsCollected || 0, stars),
      bestSteps: existing?.bestSteps ? Math.min(existing.bestSteps, steps) : steps,
    };
    saveProgress(progress);
  }

  return progress;
}

export function isLevelUnlocked(levelId: string, allLevels: Level[]): boolean {
  const progress = loadProgress();
  const index = allLevels.findIndex((l) => l.id === levelId);
  if (index <= 0) return true;

  const prevLevel = allLevels[index - 1];
  return progress[prevLevel.id]?.completed || false;
}

export function saveCustomLevel(level: Level): void {
  try {
    const custom = loadCustomLevels();
    const existingIndex = custom.findIndex((l) => l.id === level.id);
    if (existingIndex >= 0) {
      custom[existingIndex] = level;
    } else {
      custom.push(level);
    }
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(custom));
  } catch (e) {
    console.error('Failed to save custom level:', e);
  }
}

export function loadCustomLevels(): Level[] {
  try {
    const data = localStorage.getItem(CUSTOM_LEVELS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteCustomLevel(levelId: string): void {
  try {
    const custom = loadCustomLevels().filter((l) => l.id !== levelId);
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(custom));
  } catch (e) {
    console.error('Failed to delete custom level:', e);
  }
}

export function exportLevelToJson(level: Level): string {
  return JSON.stringify(level, null, 2);
}

export function importLevelFromJson(json: string): Level | null {
  try {
    const data = JSON.parse(json);
    if (
      data.id &&
      data.name &&
      data.width &&
      data.height &&
      data.grid &&
      data.start &&
      data.goal
    ) {
      return data as Level;
    }
    return null;
  } catch {
    return null;
  }
}

export function downloadLevel(level: Level): void {
  const json = exportLevelToJson(level);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${level.name.replace(/\s+/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareLevel(level: Level): Promise<boolean> {
  const json = exportLevelToJson(level);
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(json);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function saveSandboxCreation(creation: SandboxCreation): void {
  try {
    const creations = loadSandboxCreations();
    const existingIndex = creations.findIndex((c) => c.id === creation.id);
    const now = Date.now();
    const toSave = { ...creation, updatedAt: now };
    if (existingIndex >= 0) {
      creations[existingIndex] = toSave;
    } else {
      creations.push({ ...toSave, createdAt: now });
    }
    localStorage.setItem(SANDBOX_CREATIONS_KEY, JSON.stringify(creations));
  } catch (e) {
    console.error('Failed to save sandbox creation:', e);
  }
}

export function loadSandboxCreations(): SandboxCreation[] {
  try {
    const data = localStorage.getItem(SANDBOX_CREATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteSandboxCreation(creationId: string): void {
  try {
    const creations = loadSandboxCreations().filter((c) => c.id !== creationId);
    localStorage.setItem(SANDBOX_CREATIONS_KEY, JSON.stringify(creations));
  } catch (e) {
    console.error('Failed to delete sandbox creation:', e);
  }
}

export function exportSandboxToJson(creation: SandboxCreation): string {
  return JSON.stringify(creation, null, 2);
}

export function importSandboxFromJson(json: string): SandboxCreation | null {
  try {
    const data = JSON.parse(json);
    if (
      data.id &&
      data.name !== undefined &&
      data.width &&
      data.height &&
      data.grid
    ) {
      return data as SandboxCreation;
    }
    return null;
  } catch {
    return null;
  }
}

export function downloadSandbox(creation: SandboxCreation): void {
  const json = exportSandboxToJson(creation);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sandbox_${creation.name.replace(/\s+/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareSandbox(creation: SandboxCreation): Promise<boolean> {
  const json = exportSandboxToJson(creation);
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(json);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
