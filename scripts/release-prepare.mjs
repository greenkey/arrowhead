#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = new URL('.', import.meta.url).pathname;
const projectRoot = join(__dirname, '..');

const versionType = process.argv[2] || 'patch';

function getLastTag() {
  try {
    const tags = execSync('git tag --sort=-v:refname | grep "^v" | head -1', {
      cwd: projectRoot,
      encoding: 'utf-8'
    }).trim();
    return tags || null;
  } catch {
    return null;
  }
}

function getCommitsSinceTag(lastTag) {
  if (!lastTag) {
    return execSync('git log --oneline -20', {
      cwd: projectRoot,
      encoding: 'utf-8'
    }).trim().split('\n');
  }
  
  return execSync(`git log ${lastTag}..HEAD --oneline`, {
    cwd: projectRoot,
    encoding: 'utf-8'
  }).trim().split('\n').filter(line => line.length > 0);
}

function categorizeCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    docs: [],
    other: []
  };

  for (const commit of commits) {
    const message = commit.replace(/^[a-f0-9]+\s+/, '');
    
    if (message.match(/^feat/i) || message.includes('add') && !message.match(/fix|bug/i)) {
      categories.features.push(commit);
    } else if (message.match(/^fix|^bug/i) || message.includes('fix') || message.includes('bug')) {
      categories.fixes.push(commit);
    } else if (message.match(/^docs?/i) || message.includes('doc')) {
      categories.docs.push(commit);
    } else {
      categories.other.push(commit);
    }
  }

  return categories;
}

function bumpVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function updateVersions(newVersion) {
  const manifestPath = join(projectRoot, 'manifest.json');
  const packagePath = join(projectRoot, 'package.json');
  const versionsPath = join(projectRoot, 'versions.json');
  
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const versions = JSON.parse(readFileSync(versionsPath, 'utf-8'));
  
  manifest.version = newVersion;
  pkg.version = newVersion;
  versions[newVersion] = manifest.minAppVersion;
  
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  writeFileSync(versionsPath, JSON.stringify(versions, null, 2) + '\n');
  
  return { manifest, pkg, versions };
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Release Preparation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const packagePath = join(projectRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const currentVersion = pkg.version;

  console.log(`📍 Current version: ${currentVersion}`);
  console.log(`📦 Bump type: ${versionType}\n`);

  const newVersion = bumpVersion(currentVersion, versionType);
  updateVersions(newVersion);

  console.log(`✅ Version bumped to ${newVersion}\n`);

  const lastTag = getLastTag();
  const commits = getCommitsSinceTag(lastTag);
  const categories = categorizeCommits(commits);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  CHANGELOG SUGGESTIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (lastTag) {
    console.log(`\n📜 Changes since ${lastTag}:\n`);
  } else {
    console.log('\n📜 Recent commits:\n');
  }

  if (categories.features.length > 0) {
    console.log('### Features');
    categories.features.forEach(c => console.log(`• ${c}`));
    console.log('');
  }

  if (categories.fixes.length > 0) {
    console.log('### Fixes');
    categories.fixes.forEach(c => console.log(`• ${c}`));
    console.log('');
  }

  if (categories.docs.length > 0) {
    console.log('### Documentation');
    categories.docs.forEach(c => console.log(`• ${c}`));
    console.log('');
  }

  if (categories.other.length > 0) {
    console.log('### Other');
    categories.other.forEach(c => console.log(`• ${c}`));
    console.log('');
  }

  if (commits.length === 0) {
    console.log('(No commits found)\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📝 NEXT STEPS:');
  console.log('');
  console.log('1. Update CHANGELOG.md with the changes above');
  console.log('   - Add a new section: ## [Unreleased] → ## [X.Y.Z]');
  console.log('   - Include notable changes in appropriate categories');
  console.log('');
  console.log('2. Review the version bump in:');
  console.log(`   - manifest.json (${newVersion})`);
  console.log(`   - package.json (${newVersion})`);
  console.log('');
  console.log('3. Commit and push the changes:');
  console.log(`   npm run release:commit "Your release description"`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  IMPORTANT: Do NOT create tags manually!');
  console.log('   Tags are automatically created by CI/CD after');
  console.log('   all tests pass on the master branch.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(console.error);