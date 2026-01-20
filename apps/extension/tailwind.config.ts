import type { Config } from 'tailwindcss'

export default {
	content: ['./src/**/*.{ts,tsx,html}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
			},
			colors: {
				// Light theme base colors
				surface: {
					DEFAULT: '#FFFFFF',
					secondary: '#FAFAFA',
					tertiary: '#F5F5F5',
				},
				// Text colors for light theme
				content: {
					primary: '#1F2937', // Gray 800
					secondary: '#6B7280', // Gray 500
					muted: '#9CA3AF', // Gray 400
				},
				// Brand orange colors
				brand: {
					DEFAULT: '#F97316', // Orange 500
					light: '#FDBA74', // Orange 300
					dark: '#EA580C', // Orange 600
					darker: '#C2410C', // Orange 700
				},
				// Semantic colors
				profit: '#10B981', // Emerald 500
				caution: '#F59E0B', // Amber 500
				danger: '#EF4444', // Red 500
				info: '#3B82F6', // Blue 500
				exceptional: '#8B5CF6', // Violet 500
				// Border colors
				border: {
					DEFAULT: '#E5E7EB', // Gray 200
					light: '#F3F4F6', // Gray 100
					dark: '#D1D5DB', // Gray 300
				},
			},
			boxShadow: {
				soft: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
				medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				card: '0 2px 8px rgba(0, 0, 0, 0.08)',
				elevated: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
				sidebar: '0 0 40px rgba(0, 0, 0, 0.15)',
				'glow-orange': '0 0 20px rgba(249, 115, 22, 0.3)',
				'glow-profit': '0 0 20px rgba(16, 185, 129, 0.3)',
			},
			animation: {
				'slide-in': 'slideIn 300ms ease-out',
				'fade-in': 'fadeIn 200ms ease-out',
				'score-fill': 'scoreFill 800ms cubic-bezier(0.34, 1.56, 0.64, 1)',
				'count-up': 'countUp 800ms ease-out',
				'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
				shimmer: 'shimmer 1.5s infinite linear',
				'tab-slide': 'tabSlide 200ms ease-out',
				'spin-slow': 'spin 1.5s linear infinite',
				'slide-up': 'slideUp 200ms ease-out',
			},
			keyframes: {
				slideIn: {
					'0%': { transform: 'translateX(100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' },
				},
				fadeIn: {
					'0%': { opacity: '0', transform: 'translateY(4px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				scoreFill: {
					'0%': { strokeDashoffset: '283' },
					'100%': { strokeDashoffset: 'var(--score-offset)' },
				},
				countUp: {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'50%': { opacity: '1' },
					'100%': { transform: 'translateY(0)' },
				},
				pulseGlow: {
					'0%, 100%': { boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)' },
					'50%': { boxShadow: '0 4px 30px rgba(249, 115, 22, 0.6)' },
				},
				shimmer: {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' },
				},
				tabSlide: {
					'0%': { transform: 'translateX(var(--tab-from))' },
					'100%': { transform: 'translateX(var(--tab-to))' },
				},
				slideUp: {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
			},
		},
	},
	plugins: [],
} satisfies Config
