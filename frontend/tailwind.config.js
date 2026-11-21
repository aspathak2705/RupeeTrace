/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rt-canvas': '#F5EBDD',
        'rt-surface': '#FFFFFF',
        'rt-primary': '#F4D63D',
        'rt-ink': '#171717',
        'rt-coral': '#F06A4D',
        'rt-mint': '#B9D9D1',
        'rt-muted': '#E5DED2',
        'rt-secondary-text': '#625F58',
      },
      fontFamily: {
        headline: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderWidth: {
        '3': '3px',
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0px #171717',
        'brutal': '4px 4px 0px #171717',
        'brutal-lg': '6px 6px 0px #171717',
        'brutal-xl': '8px 8px 0px #171717',
        'brutal-primary': '4px 4px 0px #F4D63D',
        'brutal-coral': '4px 4px 0px #F06A4D',
        'brutal-mint': '4px 4px 0px #B9D9D1',
      }
    },
  },
  plugins: [],
}
