/**
 * Per-business-type theme definitions.
 * Each theme maps to CSS custom properties applied on document.documentElement.
 * HSL values WITHOUT hsl() wrapper — Tailwind uses raw values.
 */

export const BUSINESS_THEMES = {
  retail: {
    '--accent': '197 58% 42%',
    '--accent-light': '200 73% 95%',
    '--sidebar-bg': '210 53% 24%',
    '--sidebar-text': '213 27% 84%',
    '--sidebar-active': '197 58% 42%',
    '--sidebar-hover': '210 42% 30%',
    '--navy': '210 53% 24%',
    '--navy-light': '210 42% 30%',
  },
  wholesale: {
    '--accent': '215 50% 38%',
    '--accent-light': '215 60% 94%',
    '--sidebar-bg': '220 40% 20%',
    '--sidebar-text': '220 25% 82%',
    '--sidebar-active': '215 50% 38%',
    '--sidebar-hover': '220 35% 28%',
    '--navy': '220 40% 20%',
    '--navy-light': '220 35% 28%',
  },
  pharmacy: {
    '--accent': '145 47% 42%',
    '--accent-light': '145 50% 94%',
    '--sidebar-bg': '148 35% 22%',
    '--sidebar-text': '145 25% 82%',
    '--sidebar-active': '145 47% 42%',
    '--sidebar-hover': '148 30% 30%',
    '--navy': '148 35% 22%',
    '--navy-light': '148 30% 30%',
  },
  restaurant: {
    '--accent': '28 80% 52%',
    '--accent-light': '28 85% 95%',
    '--sidebar-bg': '25 40% 22%',
    '--sidebar-text': '28 30% 82%',
    '--sidebar-active': '28 80% 52%',
    '--sidebar-hover': '25 35% 30%',
    '--navy': '25 40% 22%',
    '--navy-light': '25 35% 30%',
  },
  warehouse: {
    '--accent': '262 52% 55%',
    '--accent-light': '262 60% 95%',
    '--sidebar-bg': '265 35% 22%',
    '--sidebar-text': '262 25% 82%',
    '--sidebar-active': '262 52% 55%',
    '--sidebar-hover': '265 30% 30%',
    '--navy': '265 35% 22%',
    '--navy-light': '265 30% 30%',
  },
  electronics: {
    '--accent': '199 89% 48%',
    '--accent-light': '199 85% 95%',
    '--sidebar-bg': '200 45% 20%',
    '--sidebar-text': '199 30% 82%',
    '--sidebar-active': '199 89% 48%',
    '--sidebar-hover': '200 40% 28%',
    '--navy': '200 45% 20%',
    '--navy-light': '200 40% 28%',
  },
  clothes: {
    '--accent': '330 65% 50%',
    '--accent-light': '330 70% 95%',
    '--sidebar-bg': '332 35% 22%',
    '--sidebar-text': '330 25% 82%',
    '--sidebar-active': '330 65% 50%',
    '--sidebar-hover': '332 30% 30%',
    '--navy': '332 35% 22%',
    '--navy-light': '332 30% 30%',
  },
  tailor: {
    '--accent': '45 75% 48%',
    '--accent-light': '45 80% 95%',
    '--sidebar-bg': '40 35% 22%',
    '--sidebar-text': '45 25% 82%',
    '--sidebar-active': '45 75% 48%',
    '--sidebar-hover': '40 30% 30%',
    '--navy': '40 35% 22%',
    '--navy-light': '40 30% 30%',
  },
  custom: {
    '--accent': '215 16% 47%',
    '--accent-light': '215 20% 95%',
    '--sidebar-bg': '220 20% 25%',
    '--sidebar-text': '215 16% 82%',
    '--sidebar-active': '215 16% 47%',
    '--sidebar-hover': '220 18% 32%',
    '--navy': '220 20% 25%',
    '--navy-light': '220 18% 32%',
  },
};

/**
 * Apply a business theme to the document root.
 * @param {string} businessType - key from BUSINESS_THEMES
 */
export function applyBusinessTheme(businessType) {
  const theme = BUSINESS_THEMES[businessType] || BUSINESS_THEMES.retail;
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme)) {
    root.style.setProperty(prop, value);
  }
}
