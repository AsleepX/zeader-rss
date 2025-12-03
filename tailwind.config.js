/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Source Serif 4"', '"Noto Serif SC Adjusted"', '"Noto Serif SC"', '"Source Serif Pro"', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
                outfit: ['Outfit', 'sans-serif'],
                merriweather: ['Merriweather', 'serif'],
                chinese: ['"Source Serif 4"', '"Noto Serif SC Adjusted"', '"Noto Serif SC"', '"PingFang SC"', '"Microsoft YaHei"'],
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
