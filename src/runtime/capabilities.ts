import type { QualityLevel } from '../model/types';

export interface DeviceProfile {
  width: number;
  pixelRatio: number;
  deviceMemory?: number;
}

export function selectQuality(profile: DeviceProfile): QualityLevel {
  void profile;
  return 'high';
}

export function currentDeviceProfile(): DeviceProfile {
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  return {
    width: window.innerWidth,
    pixelRatio: window.devicePixelRatio || 1,
    deviceMemory: navigatorWithMemory.deviceMemory,
  };
}
