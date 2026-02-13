export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Bold Pink Reference Palette
                'surface': '#fbcfe8', // Pink 200 (Background)
                'surface-dim': '#f9a8d4', // Pink 300

                'primary': '#be123c', // Rose 700 (Proposal Text / Yes Button)
                'on-primary': '#ffffff',
                'primary-container': '#be123c',

                'secondary': '#ffffff', // White (No Button)
                'on-secondary': '#000000',

                'tertiary': '#f472b6', // Pink 400 (Accents)
                'on-tertiary': '#ffffff',

                'on-surface': '#881337', // Rose 900 (Dark Text)
                'on-surface-variant': '#9f1239', // Rose 800

                'outline': '#fdf2f8', // Pink 50

                // Proposal Page Colors
                'primary-pink': '#ff4d8d',
                'accent-purple': '#a855f7',
                'background-light': '#fff5f7',

                // Loading Screen Colors
                'loading-primary': '#ee2b5b',
                'rose-pink': '#ff4d6d',
                'blush-pink': '#ffe5ec',
                'loading-bg-light': '#f8f6f6',
                'loading-bg-dark': '#221015',
            },
            fontFamily: {
                satisfy: ['Satisfy', 'cursive'],
                playfair: ['"Playfair Display"', 'serif'],
                inter: ['Inter', 'sans-serif'],
                display: ['Fredoka', 'sans-serif'],
                script: ['"Dancing Script"', 'cursive'],
                body: ['"Plus Jakarta Sans"', 'sans-serif'],
                // Proposal Page Fonts
                quicksand: ['Quicksand', 'sans-serif'],
                fredoka: ['Fredoka', 'sans-serif'],
                pacifico: ['Pacifico', 'cursive'],
                jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
            borderRadius: {
                'sticker': '2.5rem',
            },
            animation: {
                'float': 'float 8s ease-in-out infinite',
                'float-slow': 'float 12s ease-in-out infinite',
                'fade-in': 'fadeIn 1.5s ease-out forwards',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            },
            boxShadow: {
                'elevation-1': '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)',
                'elevation-2': '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)',
                'elevation-3': '0px 4px 8px 3px rgba(0,0,0,0.3), 0px 1px 3px 0px rgba(0,0,0,0.3)',
            }
        },
    },
    plugins: [],
}
