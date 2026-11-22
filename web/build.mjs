// 診断LPのビルド。診断ロジックはアプリと同じ app/src/lib/diagnosis.ts を使う
//   npm run build            → dist/ を生成（そのまま静的ホスティングに置ける）
//   npm run dev              → dist/ を監視ビルド + http://localhost:5173
// 環境変数（Vercel / Cloudflare Pages などの設定画面で指定）
//   APP_STORE_URL, PLAY_STORE_URL, META_PIXEL_ID, SITE_URL
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const env = (k, d = '') => JSON.stringify(process.env[k] ?? d);
const watch = process.argv.includes('--watch');

mkdirSync('dist', { recursive: true });
const html = readFileSync('src/index.html', 'utf8')
  .replaceAll('%SITE_URL%', process.env.SITE_URL ?? '')
  .replaceAll('%META_PIXEL_ID%', process.env.META_PIXEL_ID ?? '');
writeFileSync('dist/index.html', html);
copyFileSync('src/style.css', 'dist/style.css');

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  minify: !watch,
  format: 'iife',
  target: ['es2019', 'safari13'],
  outfile: 'dist/app.js',
  define: {
    __APP_STORE_URL__: env('APP_STORE_URL'),
    __PLAY_STORE_URL__: env('PLAY_STORE_URL'),
    __META_PIXEL_ID__: env('META_PIXEL_ID'),
  },
});

if (watch) {
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: 'dist', port: 5173 });
  console.log(`http://localhost:${port}`);
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log('built dist/');
}
