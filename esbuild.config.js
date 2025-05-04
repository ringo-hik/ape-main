const esbuild = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');
const path = require('path');
const fs = require('fs');

// Command line arguments
const args = process.argv.slice(2);
const production = args.includes('--production');
const watch = args.includes('--watch');
const clean = args.includes('--clean');

// Clean dist directory if --clean is specified
if (clean) {
  console.log('Cleaning dist directory...');
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true, force: true });
  }
  if (!args.includes('--build')) {
    process.exit(0);
  }
}

// Copy web assets to dist directory
function copyWebAssets() {
  console.log('Copying web assets to dist directory...');
  
  // Create dist/resources if it doesn't exist
  if (!fs.existsSync('./dist/resources')) {
    fs.mkdirSync('./dist/resources', { recursive: true });
  }
  
  // Copy resources directory recursively
  function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  // Copy the resources directory
  copyDir('./resources', './dist/resources');
  console.log('Web assets copied successfully!');
}

const commonConfig = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outdir: 'dist',
  platform: 'node',
  target: 'node16',
  sourcemap: !production,
  minify: production,
  format: 'cjs',
  plugins: [
    nodeExternalsPlugin({
      allowList: ['vscode']
    })
  ],
  define: {
    'process.env.NODE_ENV': production ? '"production"' : '"development"'
  },
  logLevel: 'info',
  external: ['vscode']
};

async function build() {
  try {
    if (watch) {
      // Watch mode
      const ctx = await esbuild.context(commonConfig);
      await ctx.watch();
      console.log('Watching for changes...');
      
      // Copy web assets initially and then on file changes
      copyWebAssets();
      
      // Watch resources directory for changes
      fs.watch('./resources', { recursive: true }, (eventType, filename) => {
        if (filename) {
          console.log(`Detected change in web assets: ${filename}`);
          copyWebAssets();
        }
      });
      
    } else {
      // Single build
      await esbuild.build(commonConfig);
      copyWebAssets();
      console.log('Build completed successfully!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();