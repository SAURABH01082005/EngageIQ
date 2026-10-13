/**
 * Design System Constants
 * Color theme preserved — radii, shadows & glass dialed down for a cleaner look
 */

export const COLORS = {
  primary: {
    main: '#3b82f6',
    light: '#60a5fa',
    lighter: '#93c5fd',
    dark: '#1e40af',
  },
  secondary: {
    main: '#8b5cf6',
    light: '#a78bfa',
    dark: '#6d28d9',
  },
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  error: '#ef4444',

  background: {
    primary: '#070b14',
    secondary: '#0f172a',
    glass: 'rgba(255, 255, 255, 0.04)',
  },

  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
  },

  border: 'rgba(255, 255, 255, 0.1)',
  borderHover: 'rgba(255, 255, 255, 0.18)',
};

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.85rem',
  lg: '1.25rem',
  xl: '1.75rem',
  xxl: '2.5rem',
};

export const BORDER_RADIUS = {
  sm: '4px',
  md: '6px',
  lg: '10px',
  xl: '12px',
  full: '9999px',
};

export const SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
  md: '0 8px 24px rgba(0, 0, 0, 0.3)',
  lg: '0 12px 32px rgba(0, 0, 0, 0.35)',
  glow: '0 0 16px rgba(59, 130, 246, 0.25)',
};

export const TRANSITIONS = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
};

export const FONT_SIZES = {
  xs: '0.75rem',
  sm: '0.8125rem',
  md: '0.9375rem',
  lg: '1.0625rem',
  xl: '1.1875rem',
  '2xl': '1.4rem',
  '3xl': '1.7rem',
};

export const FONT_WEIGHTS = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 700,
};

export const BREAKPOINTS = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px',
};

export const Z_INDEX = {
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modal: 1000,
  tooltip: 1001,
  notification: 2000,
};

export const ANIMATION = {
  spinDuration: '0.7s',
  slideDuration: '0.2s',
  fadeDuration: '0.2s',
};
