/**
 * VRVerse Player — Job Queue
 * In-memory job queue with concurrency control.
 * Interface is Bull-compatible so Redis-backed Bull can be swapped in later.
 */

import { logger } from '../utils/logger';

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled';

export interface Job<T = any> {
  id: string;
  data: T;
  status: JobStatus;
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type JobProcessor<T> = (job: Job<T>) => Promise<any>;

/**
 * Simple in-memory job queue.
 * Supports: add, process, cancel, status, concurrency control.
 * Drop-in replacement interface for Bull queue.
 */
export class JobQueue<T = any> {
  private jobs: Map<string, Job<T>> = new Map();
  private waiting: string[] = [];
  private activeCount = 0;
  private processor: JobProcessor<T> | null = null;
  private concurrency: number;
  private listeners: Map<string, ((job: Job<T>) => void)[]> = new Map();

  constructor(
    public readonly name: string,
    concurrency = 1
  ) {
    this.concurrency = concurrency;
    logger.info(`Queue "${name}" created (concurrency: ${concurrency})`);
  }

  /** Register the job processor function */
  process(handler: JobProcessor<T>): void {
    this.processor = handler;
    // Process any waiting jobs
    this.processNext();
  }

  /** Add a job to the queue */
  add(id: string, data: T): Job<T> {
    const job: Job<T> = {
      id,
      data,
      status: 'waiting',
      progress: 0,
      createdAt: new Date(),
    };

    this.jobs.set(id, job);
    this.waiting.push(id);
    logger.info(`Job ${id} added to queue "${this.name}"`);

    // Try to process immediately
    this.processNext();

    return job;
  }

  /** Get a job by ID */
  getJob(id: string): Job<T> | undefined {
    return this.jobs.get(id);
  }

  /** Get all jobs */
  getAllJobs(): Job<T>[] {
    return Array.from(this.jobs.values());
  }

  /** Cancel a job */
  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.status === 'waiting') {
      job.status = 'cancelled';
      this.waiting = this.waiting.filter(jid => jid !== id);
      this.emit('cancelled', job);
      return true;
    }

    if (job.status === 'active') {
      job.status = 'cancelled';
      this.activeCount--;
      this.emit('cancelled', job);
      this.processNext();
      return true;
    }

    return false;
  }

  /** Update job progress */
  updateProgress(id: string, progress: number): void {
    const job = this.jobs.get(id);
    if (job) {
      job.progress = progress;
    }
  }

  /** Listen for job events */
  on(event: string, handler: (job: Job<T>) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /** Get queue statistics */
  getStats(): { waiting: number; active: number; completed: number; failed: number } {
    let waiting = 0, active = 0, completed = 0, failed = 0;
    for (const job of this.jobs.values()) {
      switch (job.status) {
        case 'waiting': waiting++; break;
        case 'active': active++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
      }
    }
    return { waiting, active, completed, failed };
  }

  /** Process next waiting job if concurrency allows */
  private async processNext(): Promise<void> {
    if (!this.processor) return;
    if (this.activeCount >= this.concurrency) return;
    if (this.waiting.length === 0) return;

    const jobId = this.waiting.shift()!;
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'waiting') {
      this.processNext();
      return;
    }

    this.activeCount++;
    job.status = 'active';
    job.startedAt = new Date();

    logger.info(`Processing job ${jobId}`);

    try {
      const result = await this.processor(job);
      if ((job.status as string) === 'cancelled') return;

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      job.progress = 100;
      this.emit('completed', job);
      logger.success(`Job ${jobId} completed`);
    } catch (err: any) {
      if ((job.status as string) === 'cancelled') return;

      job.status = 'failed';
      job.error = err.message;
      job.completedAt = new Date();
      this.emit('failed', job);
      logger.error(`Job ${jobId} failed: ${err.message}`);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  /** Emit an event to listeners */
  private emit(event: string, job: Job<T>): void {
    const handlers = this.listeners.get(event) || [];
    for (const handler of handlers) {
      try {
        handler(job);
      } catch (err) {
        logger.error(`Event handler error: ${err}`);
      }
    }
  }
}
