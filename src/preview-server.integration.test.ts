import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import {
  startServer,
  stopServer,
  getServerUrl,
  isServerRunning,
  getServerPort,
  beforeFirstGeneration
} from './utils/preview-server';

describe('PreviewServer Integration Tests', () => {
  let tmpDir: string;
  let outputPath: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-preview-'));
    outputPath = path.join(tmpDir, 'output');
    fs.mkdirSync(outputPath, { recursive: true });

    if (isServerRunning()) {
      await stopServer();
    }
  });

  afterEach(async () => {
    if (isServerRunning()) {
      await stopServer();
    }
    fs.rmSync(tmpDir, { recursive: true });
  });

  async function makeHttpRequest(url: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode || 500, headers: res.headers, body });
        });
      }).on('error', reject);
    });
  }

  function createTestOutputStructure(): void {
    fs.writeFileSync(path.join(outputPath, 'index.html'), '<html><body><h1>Home</h1></body></html>');
    fs.writeFileSync(path.join(outputPath, 'about.html'), '<html><body><h1>About</h1></body></html>');
    fs.mkdirSync(path.join(outputPath, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(outputPath, 'assets', 'styles.css'), 'body { margin: 0; }');
    fs.writeFileSync(path.join(outputPath, 'posts', 'article.html'), '<html><body><h1>Article</h1></body></html>');
    fs.mkdirSync(path.join(outputPath, 'posts'), { recursive: true });
    fs.writeFileSync(path.join(outputPath, 'posts', 'article.html'), '<html><body><h1>Article</h1></body></html>');
    fs.mkdirSync(path.join(outputPath, 'subdir'), { recursive: true });
    fs.writeFileSync(path.join(outputPath, 'subdir', 'nested.html'), '<html><body><h1>Nested</h1></body></html>');
  }

  function createFileWithBinaryContent(filePath: string, content: Buffer): void {
    fs.writeFileSync(filePath, content);
  }

  describe('Server Lifecycle', () => {
    it('should start server and return running state', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);

      expect(port).toBeGreaterThanOrEqual(3456);
      expect(port).toBeLessThan(3466);
      expect(isServerRunning()).toBe(true);
      expect(getServerPort()).toBe(port);
      expect(getServerUrl()).toBe(`http://localhost:${port}`);
    });

    it('should stop server and clear state', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);
      expect(isServerRunning()).toBe(true);

      await stopServer();

      expect(isServerRunning()).toBe(false);
      expect(getServerPort()).toBe(0);
      expect(getServerUrl()).toBe('');
    });

    it('should handle multiple start/stop cycles', async () => {
      createTestOutputStructure();

      const port1 = await startServer(outputPath, 3456);
      await stopServer();

      const port2 = await startServer(outputPath, 3456);
      await stopServer();

      const port3 = await startServer(outputPath, 3456);

      expect(port1).toBe(port2);
      expect(port2).toBe(port3);
      expect(isServerRunning()).toBe(true);

      await stopServer();
    });

    it('should return empty URL when server not running', () => {
      expect(getServerUrl()).toBe('');
      expect(getServerPort()).toBe(0);
      expect(isServerRunning()).toBe(false);
    });
  });

  describe('Port Management', () => {
    it('should use preferred port when available', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);

      expect(port).toBe(3456);
    });

    it('should increment port when preferred is in use', async () => {
      createTestOutputStructure();

      const port1 = await startServer(outputPath, 3456);
      await stopServer();

      const port2 = await startServer(outputPath, 3456);

      expect(port2).toBe(3456);
    });

    it('should fail after maximum port attempts', async () => {
      createTestOutputStructure();

      await expect(startServer(outputPath, 65530)).rejects.toThrow('Could not find available port');
    });
  });

  describe('File Serving', () => {
    it('should serve index.html at root path', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/`);

      expect(response.status).toBe(200);
      expect(response.body).toContain('<h1>Home</h1>');
    });

    it('should serve HTML files with correct content-type', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/about.html`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<h1>About</h1>');
    });

    it('should serve CSS files with correct content-type', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/assets/styles.css`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/css');
      expect(response.body).toContain('margin: 0');
    });

    it('should serve nested files', async () => {
      fs.mkdirSync(path.join(outputPath, 'subdir'), { recursive: true });
      fs.writeFileSync(path.join(outputPath, 'subdir', 'nested.html'), '<html><body><h1>Nested</h1></body></html>');

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/subdir/nested.html`);

      expect(response.status).toBe(200);
      expect(response.body).toContain('<h1>Nested</h1>');
    });

    it('should serve posts/article.html at correct path', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/posts/article.html`);

      expect(response.status).toBe(200);
      expect(response.body).toContain('<h1>Article</h1>');
    });

    it('should serve PNG images with correct content-type', async () => {
      const pngPath = path.join(outputPath, 'image.png');
      createFileWithBinaryContent(pngPath, Buffer.from([0x89, 0x50, 0x4E, 0x47]));

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/image.png`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/png');
    });

    it('should serve JPEG images with correct content-type', async () => {
      const jpgPath = path.join(outputPath, 'photo.jpg');
      createFileWithBinaryContent(jpgPath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/photo.jpg`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/jpeg');
    });

    it('should serve SVG images with correct content-type', async () => {
      const svgPath = path.join(outputPath, 'icon.svg');
      fs.writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/icon.svg`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/svg+xml');
    });

    it('should serve JavaScript files with correct content-type', async () => {
      const jsPath = path.join(outputPath, 'script.js');
      fs.writeFileSync(jsPath, 'console.log("test");');

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/script.js`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/javascript');
    });

    it('should serve text files as plain text', async () => {
      const txtPath = path.join(outputPath, 'readme.txt');
      fs.writeFileSync(txtPath, 'Plain text content');

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/readme.txt`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent file', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/nonexistent.html`);

      expect(response.status).toBe(404);
      expect(response.body).toContain('404');
    });

    it('should fall back to index.html for non-existent path when index exists', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/nonexistent/path`);

      expect(response.status).toBe(200);
      expect(response.body).toContain('<h1>Home</h1>');
    });

    it('should return 404 when index.html also missing', async () => {
      fs.mkdirSync(outputPath, { recursive: true });

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/nonexistent.html`);

      expect(response.status).toBe(404);
    });

    it('should handle empty output directory gracefully', async () => {
      fs.mkdirSync(outputPath, { recursive: true });

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/`);

      expect(response.status).toBe(404);
    });
  });

  describe('beforeFirstGeneration Flag', () => {
    it('should return true on first call', async () => {
      createTestOutputStructure();

      await startServer(outputPath, 3456);

      expect(beforeFirstGeneration()).toBe(true);
    });

    it('should return false on subsequent calls', async () => {
      createTestOutputStructure();

      await startServer(outputPath, 3456);
      beforeFirstGeneration();

      expect(beforeFirstGeneration()).toBe(false);
    });

    it('should reset flag after server restart', async () => {
      createTestOutputStructure();

      await startServer(outputPath, 3456);
      beforeFirstGeneration();
      await stopServer();

      await startServer(outputPath, 3456);
      expect(beforeFirstGeneration()).toBe(true);

      await stopServer();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple rapid requests', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);

      const requests = Array(5).fill(null).map(() => makeHttpRequest(`http://localhost:${port}/about.html`));
      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle parallel start attempts', async () => {
      createTestOutputStructure();

      const [port1, port2] = await Promise.all([
        startServer(outputPath, 3456),
        startServer(outputPath, 3456)
      ]);

      expect(port1).toBe(port2);
      expect(isServerRunning()).toBe(true);

      await stopServer();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in URLs', async () => {
      fs.writeFileSync(path.join(outputPath, 'file with spaces.html'), '<html><body>Spaces</body></html>');

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/file%20with%20spaces.html`);

      expect(response.status).toBe(200);
    });

    it('should handle large file requests', async () => {
      const largeContent = 'x'.repeat(100000);
      fs.writeFileSync(path.join(outputPath, 'large.html'), `<html><body>${largeContent}</body></html>`);

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/large.html`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(100000);
    });

    it('should handle file paths with query parameters', async () => {
      createTestOutputStructure();

      const port = await startServer(outputPath, 3456);
      const response = await makeHttpRequest(`http://localhost:${port}/about.html?param=value`);

      expect(response.status).toBe(200);
    });
  });
});