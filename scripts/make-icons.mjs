import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('public', { recursive: true });

const f = '<path d="M150 124h232v70H230v54h128v68H230v108h-80V124z" fill="#0a0b0c"/>';

const variants = [
  {
    file: 'public/icon-192.png',
    size: 192,
    svg: `<rect width="512" height="512" rx="120" fill="#d7ff45"/>${f}`,
    transparent: true,
  },
  {
    file: 'public/icon-512.png',
    size: 512,
    svg: `<rect width="512" height="512" rx="120" fill="#d7ff45"/>${f}`,
    transparent: true,
  },
  {
    file: 'public/icon-maskable-512.png',
    size: 512,
    svg: `<rect width="512" height="512" fill="#d7ff45"/><g transform="translate(256 256) scale(.72) translate(-256 -256)">${f}</g>`,
    transparent: false,
  },
  {
    file: 'public/apple-touch-icon.png',
    size: 180,
    svg: `<rect width="512" height="512" fill="#d7ff45"/><g transform="translate(256 256) scale(.9) translate(-256 -256)">${f}</g>`,
    transparent: false,
  },
];

const browser = await chromium.launch({ channel: 'chrome' });
for (const variant of variants) {
  const page = await browser.newPage({
    viewport: { width: variant.size, height: variant.size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}svg{display:block;width:100%;height:100%}</style><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${variant.svg}</svg>`,
  );
  await page.screenshot({ path: variant.file, omitBackground: variant.transparent });
  await page.close();
  console.log(`wrote ${variant.file} (${variant.size}x${variant.size})`);
}
await browser.close();
