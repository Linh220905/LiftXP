/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const darkPalette = {
  text: '#F8FAFC',
  tint: '#38BDF8',
  background: '#080C14',
  foreground: '#F8FAFC',
  card: '#111724',
  cardForeground: '#F8FAFC',
  primary: '#38BDF8',
  primaryForeground: '#080C14',
  secondary: '#1A2333',
  secondaryForeground: '#E2E8F0',
  muted: '#141D2E',
  mutedForeground: '#94A3B8',
  accent: '#38BDF8',
  accentForeground: '#080C14',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  border: '#1E293B',
  input: '#162032',
  success: '#22C55E',
  gold: '#FBBF24',
  cobalt: '#38BDF8',
  coral: '#F97316',
};

const colors = {
  light: darkPalette,
  dark: darkPalette,
  radius: 18,
};

export default colors;
