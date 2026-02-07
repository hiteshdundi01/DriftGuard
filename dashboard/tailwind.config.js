/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // DriftGuard brand colors
                'drift': {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                    950: '#052e16',
                },
                'swarm': {
                    bg: '#050508', // Deep space black
                    card: '#0a0a12', // Slightly lighter space
                    border: '#1f1f2e',
                    text: '#e4e4e7',
                    muted: '#a1a1aa',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
                mono: ['Space Grotesk', 'monospace'],
            },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'decay': 'decay 3s linear forwards',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(34, 197, 94, 0.6)' },
                },
                'decay': {
                    '0%': { opacity: '1' },
                    '100%': { opacity: '0.1' },
                }
            }
        },
    },
    plugins: [],
}
