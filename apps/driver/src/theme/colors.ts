export const colors = {
  // Glossy primary
  orange: '#FF6B00',
  orangeLight: '#FF8C33',
  orangeDark: '#CC5500',

  // Base
  white: '#FFFFFF',
  black: '#000000',
  offWhite: '#F5F5F5',
  offBlack: '#1A1A1A',

  // Glass / glossy overlays
  glassDark: 'rgba(0, 0, 0, 0.6)',
  glassLight: 'rgba(255, 255, 255, 0.6)',
  glassOrange: 'rgba(255, 107, 0, 0.15)',

  // Semantic
  success: '#00C853',
  error: '#FF1744',
  warning: '#FFD600',
  info: '#2979FF',

  // Dark mode
  dark: {
    background: '#0A0A0A',
    card: '#1A1A1A',
    cardBorder: 'rgba(255, 107, 0, 0.2)',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    inputBg: '#1E1E1E',
    inputBorder: '#333333',
  },

  // Light mode
  light: {
    background: '#F5F5F5',
    card: '#FFFFFF',
    cardBorder: 'rgba(0, 0, 0, 0.08)',
    text: '#1A1A1A',
    textSecondary: '#666666',
    inputBg: '#FFFFFF',
    inputBorder: '#E0E0E0',
  },
} as const;
