import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestVaultManager } from './test-helpers';

describe('Formatting Conversion Tests', () => {
  let vaultManager: TestVaultManager;

  beforeEach(async () => {
    const tmpDir = fs.mkdtempSync('/tmp/arrowhead-test-');
    const vaultPath = path.join(tmpDir, 'vault');
    const outputPath = path.join(tmpDir, 'output');

    vaultManager = new TestVaultManager({
      vaultPath,
      outputPath
    });

    await vaultManager.setup();
  });

  afterEach(async () => {
    await vaultManager.cleanup();
  });

  describe('Bold Formatting', () => {
    it('should handle single word bold', async () => {
      const content = `---
title: Bold Test
date: 2026-03-10
---
This is **bold** text.`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('**bold**');
    });

    it('should handle multiple bold sections', async () => {
      const content = `---
title: Multiple Bold
date: 2026-03-10
---
**First** bold and **second** bold and **third** bold.`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('**First**');
      expect(fileContent).toContain('**second**');
      expect(fileContent).toContain('**third**');
    });

    it('should handle bold at start and end of line', async () => {
      const content = `---
title: Edge Bold
date: 2026-03-10
---
**Start bold** middle **end bold**`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('**Start bold**');
      expect(fileContent).toContain('**end bold**');
    });
  });

  describe('Italic Formatting', () => {
    it('should handle single word italic', async () => {
      const content = `---
title: Italic Test
date: 2026-03-10
---
This is *italic* text.`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('*italic*');
    });

    it('should handle multiple italic sections', async () => {
      const content = `---
title: Multiple Italic
date: 2026-03-10
---
*First* italic and *second* italic.`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('*First*');
      expect(fileContent).toContain('*second*');
    });

    it('should handle italic with bold combinations', async () => {
      const content = `---
title: Bold Italic
date: 2026-03-10
---
***Bold and italic*** text.`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('***Bold and italic***');
    });
  });

  describe('Header Conversion H1-H3', () => {
    it('should handle H1 headers', async () => {
      const content = `---
title: H1 Test
date: 2026-03-10
---
# Main Header`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('# Main Header');
    });

    it('should handle H2 headers', async () => {
      const content = `---
title: H2 Test
date: 2026-03-10
---
## Section Header`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('## Section Header');
    });

    it('should handle H3 headers', async () => {
      const content = `---
title: H3 Test
date: 2026-03-10
---
### Subsection Header`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('### Subsection Header');
    });

    it('should handle multiple headers of same level', async () => {
      const content = `---
title: Multiple Headers
date: 2026-03-10
---
# First H1
## Section 1
# Second H1
## Section 2`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('# First H1');
      expect(fileContent).toContain('# Second H1');
      expect(fileContent).toContain('## Section 1');
      expect(fileContent).toContain('## Section 2');
    });

    it('should handle headers in sequence', async () => {
      const content = `---
title: Header Sequence
date: 2026-03-10
---
# H1
## H2
### H3
## H2 after H3
# Another H1`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('# H1');
      expect(fileContent).toContain('## H2');
      expect(fileContent).toContain('### H3');
    });

    it('should handle headers with special characters', async () => {
      const content = `---
title: Special Headers
date: 2026-03-10
---
# Header with **bold**
## Header with *italic*
### Header with [link](url)`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('# Header with **bold**');
      expect(fileContent).toContain('## Header with *italic*');
    });
  });

  describe('Bullet Points', () => {
    it('should handle simple bullet list', async () => {
      const content = `---
title: Bullet Test
date: 2026-03-10
---
- First item
- Second item
- Third item`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('- First item');
      expect(fileContent).toContain('- Second item');
      expect(fileContent).toContain('- Third item');
    });

    it('should handle nested bullet list', async () => {
      const content = `---
title: Nested Bullets
date: 2026-03-10
---
- First level
  - Second level
    - Third level
- Back to first`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('- First level');
      expect(fileContent).toContain('  - Second level');
      expect(fileContent).toContain('    - Third level');
    });

    it('should handle bullet list with bold items', async () => {
      const content = `---
title: Bold Bullets
date: 2026-03-10
---
- **Bold item**
- *Italic item*
- ***Bold italic***`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('- **Bold item**');
      expect(fileContent).toContain('- *Italic item***');
    });

    it('should handle bullet list with headers', async () => {
      const content = `---
title: Mixed Content
date: 2026-03-10
---
# Title
- Item 1
- Item 2
## Subtitle
- Item 3`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('# Title');
      expect(fileContent).toContain('- Item 1');
      expect(fileContent).toContain('## Subtitle');
    });

    it('should handle mixed bullet characters', async () => {
      const content = `---
title: Mixed Bullets
date: 2026-03-10
---
- Standard bullet
* Alternative bullet
+ Another bullet`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('- Standard bullet');
      expect(fileContent).toContain('* Alternative bullet');
      expect(fileContent).toContain('+ Another bullet');
    });
  });

  describe('Combined Formatting', () => {
    it('should handle bold and italic together', async () => {
      const content = `---
title: Combined Test
date: 2026-03-10
---
**bold** and *italic* and ***both***`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('**bold**');
      expect(fileContent).toContain('*italic*');
      expect(fileContent).toContain('***both***');
    });

    it('should handle headers with formatted content', async () => {
      const content = `---
title: Header Content
date: 2026-03-10
---
## Section with **bold** and *italic*
Content after header with **formatting**.`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('## Section with **bold** and *italic***');
    });

    it('should handle complex nested formatting', async () => {
      const content = `---
title: Complex Formatting
date: 2026-03-10
---
# Main Header
## Section with **multiple** *formatting*
- List with ***bold italic***
- Another item with **bold**`;

      await vaultManager.createFile('pages/test.md', content);
      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('# Main Header');
      expect(fileContent).toContain('## Section with **multiple** *formatting***');
    });
  });
});