import * as http from "http";
import * as fs from "fs";
import * as path from "path";

let server: http.Server | null = null;
let currentPort: number = 0;

export function resetServerState(): void {
  server = null;
  currentPort = 0;
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = http.createServer();
    tester.on('error', () => {
      try { tester.close(); } catch { /* ignore */ }
      resolve(false);
    });
    tester.on('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '0.0.0.0');
    setTimeout(() => {
      try { tester.close(); } catch { /* ignore */ }
      resolve(false);
    }, 100);
  });
}

export async function startServer(outputDir: string, preferredPort: number = 3456): Promise<number> {
  if (server) {
    await stopServer();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const maxAttempts = 100;
  let port = preferredPort;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const available = await isPortAvailable(port);
    if (!available) {
      port++;
      continue;
    }

    try {
      const availablePort = await tryStartServer(outputDir, port);
      currentPort = availablePort;
      return availablePort;
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === "EADDRINUSE") {
        port++;
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Could not find available port after ${maxAttempts} attempts`);
}

function tryStartServer(outputDir: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const serverInstance = http.createServer((req, res) => {
      const url = req.url ?? "/";
      const urlWithoutQuery = (url.split('?')[0] || url);
      const decodedUrl = decodeURIComponent(urlWithoutQuery);
      let filePath = path.join(outputDir, decodedUrl === "/" ? "index.html" : decodedUrl);
      
      filePath = path.normalize(filePath);
      if (!filePath.startsWith(outputDir)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("403 Forbidden");
        return;
      }

      const ext = path.extname(filePath);
      const contentTypes: Record<string, string> = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
        ".eot": "application/vnd.ms-fontobject"
      };

      const contentType = contentTypes[ext] || "text/plain";

      fs.readFile(filePath, (err, data) => {
        if (err) {
          if (err.code === "ENOENT") {
            const isDirectoryLikePath = decodedUrl.endsWith('/') || decodedUrl.split('/').pop()?.includes('.') === false;
            
            if (isDirectoryLikePath) {
              const indexPath = path.join(outputDir, "index.html");
              fs.readFile(indexPath, (indexErr, indexData) => {
                if (indexErr) {
                  res.writeHead(404, { "Content-Type": "text/plain" });
                  res.end("404 Not Found");
                } else {
                  res.writeHead(200, { "Content-Type": "text/html" });
                  res.end(indexData);
                }
              });
            } else {
              res.writeHead(404, { "Content-Type": "text/plain" });
              res.end("404 Not Found");
            }
          } else {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("500 Internal Server Error");
          }
        } else {
          res.writeHead(200, { "Content-Type": contentType });
          res.end(data);
        }
      });
    });

    serverInstance.headersTimeout = 10000;
    serverInstance.timeout = 10000;

    serverInstance.on("error", (error: NodeJS.ErrnoException) => {
      reject(error);
    });

    serverInstance.on('clientError', (_err, socket) => {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });

    serverInstance.listen(port, () => {
      server = serverInstance;
      resolve(port);
    });
  });
}

export async function stopServer(): Promise<void> {
  _hasGeneratedSinceServerStart = false;
  return new Promise((resolve, reject) => {
    if (server) {
      const serverRef = server;
      
      server.close((err) => {
        server = null;
        currentPort = 0;
        
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });

      setTimeout(() => {
        if (server === serverRef && serverRef) {
          try {
            (serverRef as unknown as { closeAllConnections?: () => void }).closeAllConnections?.();
            serverRef.unref();
          } catch { /* ignore */ }
          server = null;
          currentPort = 0;
          resolve();
        }
      }, 2000);
    } else {
      server = null;
      currentPort = 0;
      resolve();
    }
  });
}

export function getServerPort(): number {
  return currentPort;
}

export function isServerRunning(): boolean {
  return server !== null;
}

export function getServerUrl(): string {
  if (currentPort === 0) {
    return "";
  }
  return `http://localhost:${currentPort}`;
}

let _hasGeneratedSinceServerStart = false;

export function beforeFirstGeneration(): boolean {
  if (!_hasGeneratedSinceServerStart) {
    _hasGeneratedSinceServerStart = true;
    return true;
  }
  return false;
}
