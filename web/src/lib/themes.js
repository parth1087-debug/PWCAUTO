/* Themes. Each sets CSS tokens (styles.css, [data-theme]) and a chart palette. Faclon Blue is the default accent. */
const base = { c3: '#008DD2', c4: '#008542', c5: '#B66363', c6: '#8f7fd6' };
export const THEMES = [
  { id: 'light', name: 'Faclon light', bg: '#ffffff', brand: '#2F55D4', dark: false,
    chart: { ...base, c1: '#2F55D4', c2: '#40566D', grid: '#eef1f6', axis: '#5d6f82', good: '#008542', bad: '#d92d20', warn: '#c27803', bg: '#ffffff', bar: '#6F90FF', spark: '#5d6f82' } },
  { id: 'dark', name: 'Faclon dark', bg: '#0f172a', brand: '#6F90FF', dark: true,
    chart: { c1: '#6F90FF', c2: '#cbd5e2', c3: '#38b6f0', c4: '#3ccf7e', c5: '#e08a8a', c6: '#b3a5ee', grid: '#1e293b', axis: '#94a3b8', good: '#3ccf7e', bad: '#f97066', warn: '#fdb022', bg: '#111a2e', bar: '#4a6be0', spark: '#94a3b8' } },
  { id: 'midnight', name: 'Midnight', bg: '#05070d', brand: '#22d3ee', dark: true,
    chart: { c1: '#22d3ee', c2: '#c7d2fe', c3: '#818cf8', c4: '#34d399', c5: '#f472b6', c6: '#fbbf24', grid: '#141a26', axis: '#8b95a8', good: '#34d399', bad: '#fb7185', warn: '#fbbf24', bg: '#0b0f18', bar: '#0e9bb3', spark: '#8b95a8' } },
  { id: 'graphite', name: 'Graphite', bg: '#f3f3f1', brand: '#18181b', dark: false,
    chart: { c1: '#18181b', c2: '#71717a', c3: '#2F55D4', c4: '#008542', c5: '#B66363', c6: '#a1a1aa', grid: '#ececea', axis: '#5f5f66', good: '#15803d', bad: '#c2410c', warn: '#b45309', bg: '#ffffff', bar: '#52525b', spark: '#71717a' } },
  { id: 'ocean', name: 'Ocean', bg: '#eef7f8', brand: '#0e7490', dark: false,
    chart: { c1: '#0e7490', c2: '#334e68', c3: '#0891b2', c4: '#059669', c5: '#e07a5f', c6: '#6d28d9', grid: '#e3eef0', axis: '#4b6270', good: '#047857', bad: '#dc2626', warn: '#d97706', bg: '#ffffff', bar: '#38a3bd', spark: '#4b6270' } },
  { id: 'sand', name: 'Sand', bg: '#f7f3ec', brand: '#b45309', dark: false,
    chart: { c1: '#b45309', c2: '#57534e', c3: '#2F55D4', c4: '#15803d', c5: '#be185d', c6: '#a8a29e', grid: '#efe9de', axis: '#6b6359', good: '#15803d', bad: '#b91c1c', warn: '#a16207', bg: '#fffdf9', bar: '#d6904a', spark: '#6b6359' } },
];
export const themeOf = id => THEMES.find(t => t.id === id) || THEMES[0];
