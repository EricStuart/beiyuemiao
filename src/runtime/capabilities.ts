import type { QualityLevel } from '../model/types';

export interface DeviceProfile {
  width: number;
  pixelRatio: number;
  deviceMemory?: number;
}

export function selectQuality(profile: DeviceProfile): QualityLevel {
  const memory = profile.deviceMemory ?? 4;
  if (profile.width < 560 || memory <= 2 || profile.pixelRatio > 2.5) return 'low';
  if (profile.width >= 1200 && memory >= 8 && profile.pixelRatio <= 2) return 'high';
  return 'medium';
}

export function currentDeviceProfile(): DeviceProfile {
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  return {
    width: window.innerWidth,
    pixelRatio: window.devicePixelRatio || 1,
    deviceMemory: navigatorWithMemory.deviceMemory,
  };
}
