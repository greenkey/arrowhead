import * as http from "http";
import * as fs from "fs";
import * as path from "path";

let server: http.Server | null = null;
let currentPort: number = 0;
let currentOutputDir: string = "";

export async function startServer(outputDir: string, preferredPort: number = 3456): Promise<number> {
  if (server) {
    await stopServer();
  }

  currentOutputDir = outputDir;
  const maxAttempts = 10;
  let port = preferredPort;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
      let filePath = path.join(outputDir, url === "/" ? "index.html" : url);
      
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
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("500 Internal Server Error");
          }
        } else {
          res.writeHead(200, { "Content-Type": contentType });
          res.end(data);
        }
      });
    });

    serverInstance.headersTimeout = 5000;
    serverInstance.timeout = 5000;

    serverInstance.on("error", (error: NodeJS.ErrnoException) => {
      reject(error);
    });

    serverInstance.listen(port, () => {
      server = serverInstance;
      resolve(port);
    });
  });
}

export async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      const serverRef = server;
      server.close(() => {
        server = null;
        currentPort = 0;
        resolve();
      });

      setTimeout(() => {
        if (server === serverRef && serverRef) {
          try {
            (serverRef as any)._connections = 0;
          } catch (e) {}
          server = null;
          currentPort = 0;
          resolve();
        }
      }, 1000);
    } else {
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
