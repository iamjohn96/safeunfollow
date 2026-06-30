import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

interface LockOwner {
  pid: number;
  token: string;
  acquired_at: string;
  cwd: string;
}

interface PublishLock {
  lockPath: string;
  owner: LockOwner;
  release: () => void;
}

class PublishLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublishLockError';
  }
}

const DEFAULT_LOCK_PATH = path.join(os.tmpdir(), 'safeunfollow-blog-publish.lock');

function isProcessRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function readOwner(lockPath: string): LockOwner | null {
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8')) as LockOwner;
  } catch {
    return null;
  }
}

function acquirePublishLock(lockPath = DEFAULT_LOCK_PATH): PublishLock {
  const owner: LockOwner = {
    pid: process.pid,
    token: crypto.randomUUID(),
    acquired_at: new Date().toISOString(),
    cwd: process.cwd(),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.writeFileSync(lockPath, `${JSON.stringify(owner)}\n`, { encoding: 'utf8', flag: 'wx' });
      return {
        lockPath,
        owner,
        release: () => {
          const current = readOwner(lockPath);
          if (current?.token === owner.token) fs.unlinkSync(lockPath);
        },
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw error;
      const current = readOwner(lockPath);
      if (current && isProcessRunning(current.pid)) {
        throw new PublishLockError(
          `Another blog publication is running (PID ${current.pid}, since ${current.acquired_at}).`,
        );
      }
      fs.unlinkSync(lockPath);
    }
  }

  throw new PublishLockError(`Unable to acquire publication lock: ${lockPath}`);
}

export { DEFAULT_LOCK_PATH, PublishLockError, acquirePublishLock, isProcessRunning };
export type { PublishLock };
