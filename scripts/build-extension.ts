// @ts-nocheck
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

const root = process.cwd();
const dist = path.join(root, 'dist');

async function copyRecursive(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) await copyRecursive(srcPath, destPath);
    else await fs.copyFile(srcPath, destPath);
  }
}

async function build() {
  try {
    await fs.rm(dist, { recursive: true, force: true });
    await fs.mkdir(dist, { recursive: true });

    console.log('Running tsc');
    execSync('npx tsc -p tsconfig.ext.json', { stdio: 'inherit' });

    const runtimeRoot = path.join(root, 'src', 'runtime');
    const staticCopies = [
      { src: path.join(runtimeRoot, 'manifest.json'), dest: path.join(dist, 'manifest.json') },
      { src: path.join(runtimeRoot, 'background'), dest: path.join(dist, 'background') },
      { src: path.join(runtimeRoot, 'popup'), dest: path.join(dist, 'popup') },
      { src: path.join(runtimeRoot, 'content', 'highlight.css'), dest: path.join(dist, 'content', 'highlight.css') },
      { src: path.join(runtimeRoot, 'content', 'content.js'), dest: path.join(dist, 'content', 'content.js') },
      { src: path.join(runtimeRoot, 'keywords'), dest: path.join(dist, 'keywords') },
      { src: path.join(root, 'README.md'), dest: path.join(dist, 'README.md') },
    ];

    for (const item of staticCopies) {
      const stat = await fs.stat(item.src).catch(() => null);
      if (!stat) continue;
      if (stat.isDirectory()) await copyRecursive(item.src, item.dest);
      else {
        await fs.mkdir(path.dirname(item.dest), { recursive: true });
        await fs.copyFile(item.src, item.dest);
      }
    }

    try {
      console.log('Bundling content script with esbuild');
      execSync('npx esbuild src/entry/content.ts --bundle --platform=browser --outfile=dist/content/content.js --format=iife --sourcemap --tsconfig=tsconfig.ext.json', { stdio: 'inherit' });
      console.log('Bundled content script to dist/content/content.js');
    } catch (e) {
      console.warn('esbuild bundling failed', e);
    }
  } catch (e) {
    console.error('Build failed', e);
    process.exit(1);
  }
}

build();