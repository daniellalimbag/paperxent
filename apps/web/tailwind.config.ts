import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/shared-types/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#fbfaf6',
          100: '#f4efe3',
          200: '#e6dcc7',
          ink: '#27231d',
          muted: '#6f6758',
          line: '#d8cdb8',
        },
        sage: {
          500: '#7c8b6f',
          600: '#6b7a5f',
          700: '#4f6045',
        },
        clay: {
          500: '#b9826a',
          700: '#7b4d3d',
        },
      },
      fontFamily: {
        sans: ['var(--font-serif)', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
