// Crée l'image d'aperçu du lien (WhatsApp, Facebook…) : public/assets/apercu.jpg, 1200 x 630.
// Usage : npm i sharp (dans un dossier de votre choix) puis  SHARP_DIR=<dossier>/package.json node savoirplus/src/apercu.mjs
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(process.env.SHARP_DIR ?? import.meta.url);
const sharp = require("sharp");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d3a8a"/><stop offset="1" stop-color="#142a66"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1020" cy="170" r="210" fill="#ffffff" opacity="0.07"/>
  <circle cx="1100" cy="520" r="140" fill="#f59e0b" opacity="0.18"/>
  <g transform="translate(80 90) scale(2.6)">
    <rect width="48" height="48" rx="12" fill="#ffffff"/>
    <path d="M10 14.5c4-1.6 9-1.4 14 1.3v19c-5-2.7-10-2.9-14-1.3v-19z" fill="#1d3a8a"/>
    <path d="M38 14.5c-4-1.6-9-1.4-14 1.3v19c5-2.7 10-2.9 14-1.3v-19z" fill="#9db4ee"/>
    <circle cx="36" cy="12" r="8" fill="#f59e0b"/>
    <path d="M36 8v8M32 12h8" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>
  </g>
  <text x="80" y="330" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="120" fill="#ffffff">Savoir<tspan fill="#f59e0b">+</tspan></text>
  <text x="80" y="402" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="#dbe6ff">Toute votre école dans une seule plateforme</text>
  <text x="80" y="470" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#f59e0b" font-weight="700">Notes · Bulletins · Absences · Frais de scolarité · Tuteur IA</text>
  <rect x="0" y="574" width="1200" height="56" fill="#f59e0b"/>
  <text x="80" y="610" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="26" fill="#0f172a">Pour les écoles d'Afrique francophone · Lomé, Togo</text>
</svg>`;
await sharp(Buffer.from(svg)).jpeg({ quality: 88, mozjpeg: true }).toFile(path.resolve(import.meta.dirname, "..", "public", "assets", "apercu.jpg"));
console.log("apercu.jpg écrit");
