/**
 * Utilidades de detección de dispositivo (Xbox, Smart TV, Móvil, Desktop)
 * basadas en User-Agent, capacidades táctiles y viewport.
 */

export type DeviceType = 'xbox' | 'tv' | 'mobile' | 'desktop';

export interface DeviceInfo {
  type: DeviceType;
  isXbox: boolean;
  isTV: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  name: string;
}

export function detectDevice(userAgent?: string): DeviceInfo {
  const ua = (
    userAgent ||
    (typeof window !== 'undefined' ? window.navigator.userAgent : '')
  ).toLowerCase();

  const isXbox = ua.includes('xbox') || ua.includes('xbox one') || ua.includes('xbox series');

  const isTV =
    isXbox ||
    ua.includes('tizen') ||
    ua.includes('webos') ||
    ua.includes('smart-tv') ||
    ua.includes('smarttv') ||
    ua.includes('appletv') ||
    ua.includes('googletv') ||
    ua.includes('crkey');

  const isMobile =
    !isTV &&
    (ua.includes('iphone') ||
      ua.includes('ipad') ||
      ua.includes('ipod') ||
      ua.includes('android') ||
      ua.includes('mobile') ||
      ua.includes('blackberry') ||
      ua.includes('windows phone'));

  const isDesktop = !isTV && !isMobile;

  const isTouch =
    typeof window !== 'undefined'
      ? 'ontouchstart' in window || navigator.maxTouchPoints > 0
      : false;

  let name = 'Ordenador (Desktop)';
  let type: DeviceType = 'desktop';

  if (isXbox) {
    name = 'Consola Xbox';
    type = 'xbox';
  } else if (isTV) {
    name = 'Smart TV';
    type = 'tv';
  } else if (isMobile) {
    name = ua.includes('ipad')
      ? 'iPad / Tablet'
      : ua.includes('iphone')
      ? 'iPhone'
      : ua.includes('android')
      ? 'Dispositivo Android'
      : 'Dispositivo Móvil';
    type = 'mobile';
  }

  return {
    type,
    isXbox,
    isTV,
    isMobile,
    isDesktop,
    isTouch,
    name,
  };
}
