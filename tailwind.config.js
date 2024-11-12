import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export const darkMode = "class";
export const content = ["./src/**/*.{html,js,njk}", "./.eleventy.js"];
export const plugins = [require("@tailwindcss/typography")];
