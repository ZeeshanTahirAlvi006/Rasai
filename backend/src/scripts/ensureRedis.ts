// src/scripts/ensureRedis.ts
// Verifies Redis connectivity on port 6379 and automatically starts or provisions the local container if needed.
import net from 'net';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const CONTAINER_NAME = 'ndr-redis';
const REDIS_IMAGE = 'redis:7-alpine';

// Probe TCP port to check if Redis is actively accepting connections
function isPortOpen(host: string, port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

// Poll until Redis responds or timeout expires
async function waitForRedis(host: string, port: number, maxWaitMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isPortOpen(host, port, 800)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// Check if Docker daemon is responsive
async function isDockerRunning(): Promise<boolean> {
  try {
    await execAsync('docker info', { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

// Start existing container or create a new one
async function startRedisContainer(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format "{{.Names}}"`,
      { timeout: 5000 },
    );

    if (stdout.trim() === CONTAINER_NAME) {
      console.log(`[Redis] Starting existing container "${CONTAINER_NAME}"...`);
      await execAsync(`docker start ${CONTAINER_NAME}`);
    } else {
      console.log(`[Redis] Provisioning and starting new container "${CONTAINER_NAME}" on port ${REDIS_PORT}...`);
      await execAsync(`docker run -d --name ${CONTAINER_NAME} -p ${REDIS_PORT}:6379 ${REDIS_IMAGE}`);
    }

    const ready = await waitForRedis(REDIS_HOST, REDIS_PORT, 10000);
    return ready;
  } catch (err: any) {
    console.warn(`[Redis] Docker start failed: ${err.message || err}`);
    return false;
  }
}

// Attempt to launch Docker Desktop on Windows
function tryLaunchDockerDesktop(): boolean {
  if (process.platform !== 'win32') return false;

  const possiblePaths = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'Docker Desktop.exe'),
    'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
  ];

  for (const exePath of possiblePaths) {
    if (fs.existsSync(exePath)) {
      console.log(`[Redis] Launching Docker Desktop from ${exePath}...`);
      try {
        const child = spawn(exePath, [], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        return true;
      } catch (err: any) {
        console.warn(`[Redis] Could not launch Docker Desktop: ${err.message || err}`);
      }
    }
  }
  return false;
}

// Check if native redis-server is available in PATH
async function tryNativeRedisServer(): Promise<boolean> {
  try {
    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'start /B redis-server' : 'redis-server --daemonize yes';
    await execAsync(cmd, { timeout: 3000 });
    return await waitForRedis(REDIS_HOST, REDIS_PORT, 5000);
  } catch {
    return false;
  }
}

async function main() {
  // Check if Redis is already running and reachable
  if (await isPortOpen(REDIS_HOST, REDIS_PORT, 800)) {
    console.log(`[Redis] Connection verified: Redis is running at ${REDIS_HOST}:${REDIS_PORT}`);
    process.exit(0);
  }

  console.log(`[Redis] Redis is not running at ${REDIS_HOST}:${REDIS_PORT}. Initializing...`);

  // If Docker daemon is active, start the container immediately
  if (await isDockerRunning()) {
    const started = await startRedisContainer();
    if (started) {
      console.log(`[Redis] Ready: Redis is now listening at ${REDIS_HOST}:${REDIS_PORT}`);
      process.exit(0);
    }
  }

  // If Docker is not running on Windows, try launching Docker Desktop
  const launchedDocker = tryLaunchDockerDesktop();
  if (launchedDocker) {
    console.log('[Redis] Waiting for Docker daemon to become responsive (up to 30s)...');
    const start = Date.now();
    let dockerReady = false;
    while (Date.now() - start < 30000) {
      if (await isDockerRunning()) {
        dockerReady = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (dockerReady) {
      console.log('[Redis] Docker daemon is ready. Starting Redis container...');
      const started = await startRedisContainer();
      if (started) {
        console.log(`[Redis] Ready: Redis is now listening at ${REDIS_HOST}:${REDIS_PORT}`);
        process.exit(0);
      }
    }
  }

  // Attempt native redis-server if installed
  const nativeStarted = await tryNativeRedisServer();
  if (nativeStarted) {
    console.log(`[Redis] Ready: Native redis-server started on port ${REDIS_PORT}`);
    process.exit(0);
  }

  // If all automatic start attempts failed, output actionable instructions
  console.error('\n' + '='.repeat(70));
  console.error('[Redis] ERROR: Unable to connect to or start Redis at ' + `${REDIS_HOST}:${REDIS_PORT}`);
  console.error('BullMQ queues require an active Redis instance for local development.');
  console.error('\nPlease ensure Redis is running via one of the following:');
  console.error('  1. Docker Desktop:');
  console.error('     - Open Docker Desktop, then re-run: npm run dev');
  console.error('     - Or manually run: docker run -d --name ndr-redis -p 6379:6379 redis:7-alpine');
  console.error('  2. WSL / Linux:');
  console.error('     - Run: sudo service redis-server start');
  console.error('  3. Native Windows (Memurai / Redis Windows):');
  console.error('     - Start the Memurai / Redis Windows service');
  console.error('='.repeat(70) + '\n');

  process.exit(1);
}

main().catch((err) => {
  console.error('[Redis] Unexpected error ensuring Redis:', err);
  process.exit(1);
});
