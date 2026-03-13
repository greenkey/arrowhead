#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = new URL('.', import.meta.url).pathname;
const projectRoot = join(__dirname, '..');

const customMessage = process.argv[2];

function getPackageVersion() {
  const packagePath = join(projectRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  return pkg.version;
}

function checkChangelogModified() {
  try {
    const changelogPath = join(projectRoot, 'CHANGELOG.md');
    if (!statSync(changelogPath).isFile()) {
      return { modified: false, reason: 'CHANGELOG.md does not exist' };
    }

    const status = execSync('git status --porcelain CHANGELOG.md', {
      cwd: projectRoot,
      encoding: 'utf-8'
    }).trim();

    if (status.length === 0) {
      return { modified: false, reason: 'CHANGELOG.md has not been modified' };
    }

    return { modified: true, status };
  } catch (error) {
    return { modified: false, reason: error.message };
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Release Commit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const version = getPackageVersion();
  const { modified, reason, status } = checkChangelogModified();

  if (!modified) {
    console.log('⚠️  WARNING: CHANGELOG.md has not been updated');
    console.log(`   Reason: ${reason}`);
    console.log('');
    console.log('   You can:');
    console.log('   - Update CHANGELOG.md and run this again');
    console.log('   - Proceed anyway (not recommended)');
    console.log('');
  }

  const message = customMessage || `chore: release version ${version}`;
  const tagName = `v${version}`;

  console.log(`📦 Version: ${version}`);
  console.log(`🏷️  Tag: ${tagName}`);
  console.log(`📝 Commit message: "${message}"`);
  console.log('');

  console.log('🔄 Staging and committing changes...');

  try {
    execSync('git add manifest.json package.json versions.json CHANGELOG.md', {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    execSync(`git commit -m "${message}"`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    console.log('\n✅ Changes committed successfully!\n');

    console.log('🚀 Pushing to Codeberg...');
    execSync('git push origin master', {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    console.log('\n✅ Pushed to Codeberg!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 What happens next:');
    console.log('');
    console.log('1. CI/CD runs lint, tests, and build on master push');
    console.log('2. If all checks pass, CI/CD creates and pushes tag');
    console.log('3. Tag triggers automatic release on:');
    console.log('   • Codeberg (Forgejo release)');
    console.log('   • GitHub (mirrored release)');
    console.log('');
    console.log('⏳ Monitor CI/CD at:');
    console.log('   • Codeberg: https://codeberg.org/greenkey/arrowhead/actions');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('\n❌ Error during commit or push:');
    console.error(error.message);
    process.exit(1);
  }
}

main().catch(console.error);