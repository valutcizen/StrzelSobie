import { build } from 'esbuild';
import { readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');
const require = createRequire(import.meta.url);

const minifyHtml = (html) =>
  html
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();

const loadLeafletCss = async () => {
  const cssPath = require.resolve('leaflet/dist/leaflet.css', { paths: [projectRoot] });
  const rawCss = await readFile(cssPath, 'utf8');

  // Replace relative icon URLs with absolute ones to avoid 404s in embeds.
  return rawCss
    .replace(/url\(["']?images\/marker-icon\.png["']?\)/g, 'url("https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png")')
    .replace(/url\(["']?images\/marker-icon-2x\.png["']?\)/g, 'url("https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png")')
    .replace(/url\(["']?images\/marker-shadow\.png["']?\)/g, 'url("https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png")');
};

const buildBundle = async () => {
  const result = await build({
    entryPoints: [join(projectRoot, 'src/embed-map.ts')],
    outfile: join(distDir, 'embed-map.js'),
    bundle: true,
    minify: true,
    sourcemap: false,
    format: 'esm',
    target: ['es2018'],
    platform: 'browser',
    write: false,
  });

  const output = result.outputFiles.find((file) => file.path.endsWith('embed-map.js'));
  if (!output) {
    throw new Error('embed-map.js was not generated');
  }

  return output.text;
};

const buildEmbedAssets = async () => {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const [bundle, html, leafletCss] = await Promise.all([
    buildBundle(),
    readFile(join(projectRoot, 'embed-map.html'), 'utf8'),
    loadLeafletCss(),
  ]);

  const htmlWithoutCdnLinks = html
    .replace(/<link[^>]+leaflet[^>]+>/gi, '')
    .replace(/<link[^>]+materialdesignicons[^>]+>/gi, '');

  const minifiedHtml = minifyHtml(
    htmlWithoutCdnLinks.replace(
      '</head>',
      `<style>${leafletCss}</style></head>`,
    ),
  );

  await writeFile(join(distDir, 'embed-map.js'), bundle, 'utf8');
  await writeFile(
    join(distDir, 'assets.js'),
    `export const EMBED_MAP_HTML = ${JSON.stringify(minifiedHtml)};\nexport const EMBED_MAP_JS = ${JSON.stringify(bundle)};\n`,
    'utf8',
  );
  await writeFile(
    join(distDir, 'assets.d.ts'),
    `export declare const EMBED_MAP_HTML: string;\nexport declare const EMBED_MAP_JS: string;\n`,
    'utf8',
  );
};

buildEmbedAssets().catch((error) => {
  console.error(error);
  process.exit(1);
});
