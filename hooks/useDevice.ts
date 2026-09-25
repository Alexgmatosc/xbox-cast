'use client';

import { useState, useEffect } from 'react';
import { DeviceInfo, detectDevice } from '@/lib/device';

export interface DeviceState extends DeviceInfo {
  orientation: 'portrait' | 'landscape';
  isPortrait: boolean;
  isLandscape: boolean;
}

export function useDevice(): DeviceState {
  const [device, setDevice] = useState<DeviceInfo>(() => detectDevice());
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  useEffect(() => {
    // Detectar dispositivo en cliente
    const currentDevice = detectDevice();
    setDevice(currentDevice);

    const updateOrientation = () => {
      if (typeof window !== 'undefined') {
        const isPort = window.innerHeight > window.innerWidth;
        setOrientation(isPort ? 'portrait' : 'landscape');
      }
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return {
    ...device,
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  };
}
