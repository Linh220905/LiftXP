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
  text: '#F6F8F3',
  tint: '#C8F24A',
  background: '#0B1015',
  foreground: '#F6F8F3',
  card: '#141C24',
  cardForeground: '#F6F8F3',
  primary: '#C8F24A',
  primaryForeground: '#0B1015',
  secondary: '#202C38',
  secondaryForeground: '#DCE6E0',
  muted: '#1A252E',
  mutedForeground: '#84939A',
  accent: '#2D7BFF',
  accentForeground: '#FFFFFF',
  destructive: '#FF6B6B',
  destructiveForeground: '#FFFFFF',
  border: '#273540',
  input: '#22303A',
  success: '#90D94B',
  gold: '#F2C94C',
  cobalt: '#4B8DFF',
  coral: '#FF8D70',
};

const colors = {
  light: darkPalette,
  dark: darkPalette,
  radius: 18,
};

export default colors;
