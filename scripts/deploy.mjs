import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npm run deploy -- <vault-path>');
  console.error('Example: npm run deploy -- ~/Documents/MyVault');
  process.exit(1);
}

const vaultPath = args[0];
const pluginName = 'arrowhead-obsidian-plugin';
const targetFolder = join(vaultPath, '.obsidian', 'plugins', pluginName);

async function deploy() {
  console.log('Building plugin...');

  const { execSync } = await import('node:child_process');
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });

  console.log(`\nDeploying to ${targetFolder}...`);

  try {
    await rm(targetFolder, { recursive: true, force: true });
  } catch {
    // Folder might not exist, that's fine
  }

  await mkdir(targetFolder, { recursive: true });

  await cp(join(projectRoot, 'main.js'), join(targetFolder, 'main.js'));
  await cp(join(projectRoot, 'manifest.json'), join(targetFolder, 'manifest.json'));
  await cp(join(projectRoot, 'styles.css'), join(targetFolder, 'styles.css'));

  console.log('Plugin deployed successfully!');
}

deploy().catch(console.error);