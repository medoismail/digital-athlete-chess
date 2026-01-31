/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        molty: {
          purple: '#8B5CF6',
          pink: '#EC4899',
          blue: '#3B82F6',
          dark: '#0f0f0f',
          card: '#1a1a1a',
          border: '#2a2a2a',
        },
      },
      backgroundImage: {
        'gradient-molty': 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #3B82F6 100%)',
      },
    },
  },
  plugins: [],
};
