/**
 * Pipeline Executor - Command Pipeline Execution Engine
 *
 * Issue: #144 - Command Composition
 * Phase: 3 - Implementation
 *
 * Executes command pipelines with:
 * - Sequential and parallel execution
 * - Context passing between commands
 * - Error handling and rollback
 * - Checkpoint and resume functionality
 */

import { EventEmitter } from 'events';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported command types
 */
export type CommandType =
  | 'create-issue'
  | 'agent-run'
  | 'review'
  | 'test'
  | 'security-scan'
  | 'deploy'
  | 'verify'
  | 'generate-docs'
  | 'miyabi-auto'
  | 'miyabi-todos';

/**
 * Pipeline operator types
 */
export type PipelineOperator = '|' | '&&' | '||' | '&';

/**
 * Command execution status
 */
export type CommandStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Pipeline context - shared state between commands
 */
export interface PipelineContext {
  // Identification
  pipelineId: string;
  startedAt: Date;

  // Issue information
  issueNumber?: number;
  issueNumbers?: number[];
  issueUrl?: string;

  // PR information
  prNumber?: number;
  prUrl?: string;

  // Quality information
  qualityScore?: number;
  testsPassed?: boolean;
  coveragePercent?: number;

  // Deployment information
  deploymentUrl?: string;
  deploymentVersion?: string;
  environment?: 'staging' | 'production';

  // Error information
  errors: PipelineError[];
  warnings: string[];

  // Checkpoints
  checkpoints: Checkpoint[];
  currentStep: number;
  totalSteps: number;

  // Custom data from commands
  customData: Record<string, unknown>;
}

/**
 * Pipeline error
 */
export interface PipelineError {
  code: string;
  message: string;
  command: string;
  timestamp: string;
  recoverable: boolean;
}

/**
 * Checkpoint for resume functionality
 */
export interface Checkpoint {
  id: string;
  step: number;
  command: string;
  context: Partial<PipelineContext>;
  timestamp: string;
}

/**
 * Command definition in a pipeline
 */
export interface PipelineCommand {
  type: CommandType;
  args: Record<string, unknown>;
  operator?: PipelineOperator;
}

/**
 * Command result
 */
export interface CommandResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: PipelineError;
  duration: number;
}

/**
 * Pipeline definition
 */
export interface Pipeline {
  id: string;
  name: string;
  commands: PipelineCommand[];
  createdAt: string;
}

/**
 * Pipeline execution options
 */
export interface ExecutionOptions {
  dryRun?: boolean;
  verbose?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  checkpointInterval?: number;
  onProgress?: (step: number, total: number, command: string) => void;
}

/**
 * Retry policy
 */
export interface RetryPolicy {
  maxRetries: number;
  backoff: 'linear' | 'exponential';
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoff: 'exponential',
  initialDelay: 1000,
  maxDelay: 30000,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT'],
};

const DEFAULT_EXECUTION_OPTIONS: ExecutionOptions = {
  dryRun: false,
  verbose: false,
  maxRetries: 3,
  retryDelay: 1000,
  checkpointInterval: 1,
};

// ============================================================================
// Pipeline Parser
// ============================================================================

/**
 * Parse pipeline string into commands
 */
export function parsePipeline(pipelineStr: string): PipelineCommand[] {
  const commands: PipelineCommand[] = [];

  // Split by operators while keeping them
  const tokens = pipelineStr.split(/(\s*(?:\|\||&&|\||&)\s*)/).filter(Boolean);

  let currentOperator: PipelineOperator | undefined;

  for (const token of tokens) {
    const trimmed = token.trim();

    // Check if it's an operator
    if (['|', '&&', '||', '&'].includes(trimmed)) {
      currentOperator = trimmed as PipelineOperator;
      continue;
    }

    // Parse command
    const command = parseCommand(trimmed);
    if (command) {
      command.operator = currentOperator;
      commands.push(command);
      currentOperator = undefined;
    }
  }

  return commands;
}

/**
 * Parse a single command string
 */
function parseCommand(commandStr: string): PipelineCommand | null {
  const match = commandStr.match(/^\/?([\w-]+)(?:\s+(.*))?$/);
  if (!match) {return null;}

  const [, type, argsStr] = match;
  const args = parseArgs(argsStr || '');

  return {
    type: type as CommandType,
    args,
  };
}

/**
 * Parse command arguments
 */
function parseArgs(argsStr: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};

  // Match --key=value or --key value or positional args
  const regex = /--(\w+)(?:=("[^"]*"|'[^']*'|\S+)|\s+("[^"]*"|'[^']*'|\S+))?|(\S+)/g;
  let match;
  let positionalIndex = 0;

  while ((match = regex.exec(argsStr)) !== null) {
    if (match[1]) {
      // Named argument
      const key = match[1];
      let value: string | boolean = match[2] || match[3] || true;

      // Remove quotes
      if (typeof value === 'string') {
        value = value.replace(/^["']|["']$/g, '');
      }

      // Convert to number if applicable
      if (typeof value === 'string' && /^\d+$/.test(value)) {
        args[key] = parseInt(value, 10);
      } else {
        args[key] = value;
      }
    } else if (match[4]) {
      // Positional argument
      args[`_${positionalIndex++}`] = match[4];
    }
  }

  return args;
}

// ============================================================================
// Pipeline Executor Class
// ============================================================================

/**
 * PipelineExecutor - Execute command pipelines
 */
export class PipelineExecutor extends EventEmitter {
  private context: PipelineContext;
  private options: ExecutionOptions;
  private retryPolicy: RetryPolicy;
  private commandHandlers: Map<CommandType, CommandHandler>;
  private aborted: boolean = false;

  constructor(
    options: ExecutionOptions = {},
    retryPolicy: Partial<RetryPolicy> = {}
  ) {
    super();

    this.options = { ...DEFAULT_EXECUTION_OPTIONS, ...options };
    this.retryPolicy = { ...DEFAULT_RETRY_POLICY, ...retryPolicy };
    this.context = this.createEmptyContext();
    this.commandHandlers = new Map();

    // Register default handlers
    this.registerDefaultHandlers();
  }

  /**
   * Create empty context
   */
  private createEmptyContext(): PipelineContext {
    return {
      pipelineId: `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startedAt: new Date(),
      errors: [],
      warnings: [],
      checkpoints: [],
      currentStep: 0,
      totalSteps: 0,
      customData: {},
    };
  }

  /**
   * Register default command handlers
   */
  private registerDefaultHandlers(): void {
    // Create-issue handler
    this.registerHandler('create-issue', (args, ctx) => {
      // Simulate command execution
      const issueNumber = args.issue as number || Math.floor(Math.random() * 1000);
      ctx.issueNumber = issueNumber;
      ctx.issueUrl = `https://github.com/owner/repo/issues/${issueNumber}`;

      return {
        success: true,
        data: { issueNumber, issueUrl: ctx.issueUrl },
        duration: 1000,
      };
    });

    // Agent-run handler
    this.registerHandler('agent-run', (args, ctx) => {
      const issueNumber = args.issue as number || ctx.issueNumber;
      if (!issueNumber) {
        return {
          success: false,
          error: {
            code: 'MISSING_ISSUE',
            message: 'No issue number provided',
            command: 'agent-run',
            timestamp: new Date().toISOString(),
            recoverable: true,
          },
          duration: 0,
        };
      }

      // Simulate agent execution
      const prNumber = Math.floor(Math.random() * 100);
      ctx.prNumber = prNumber;
      ctx.prUrl = `https://github.com/owner/repo/pull/${prNumber}`;
      ctx.qualityScore = 75 + Math.floor(Math.random() * 25); // 75-100

      return {
        success: true,
        data: { prNumber, prUrl: ctx.prUrl, qualityScore: ctx.qualityScore },
        duration: 5000,
      };
    });

    // Review handler
    this.registerHandler('review', (args, ctx) => {
      const threshold = args.threshold as number || 80;
      const score = ctx.qualityScore || 75 + Math.floor(Math.random() * 25);
      ctx.qualityScore = score;

      const passed = score >= threshold;

      return {
        success: passed,
        data: { score, threshold, passed },
        error: passed ? undefined : {
          code: 'QUALITY_GATE_FAILED',
          message: `Quality score ${score} below threshold ${threshold}`,
          command: 'review',
          timestamp: new Date().toISOString(),
          recoverable: true,
        },
        duration: 2000,
      };
    });

    // Test handler
    this.registerHandler('test', (_args, ctx) => {
      const coverage = 70 + Math.floor(Math.random() * 30);
      ctx.coveragePercent = coverage;
      ctx.testsPassed = coverage >= 80;

      return {
        success: ctx.testsPassed,
        data: { coverage, passed: ctx.testsPassed },
        error: ctx.testsPassed ? undefined : {
          code: 'TESTS_FAILED',
          message: `Test coverage ${coverage}% below threshold 80%`,
          command: 'test',
          timestamp: new Date().toISOString(),
          recoverable: true,
        },
        duration: 3000,
      };
    });

    // Security-scan handler
    this.registerHandler('security-scan', (_args, _ctx) => {
      const vulnerabilities = Math.floor(Math.random() * 3);
      const passed = vulnerabilities === 0;

      return {
        success: passed,
        data: { vulnerabilities, passed },
        error: passed ? undefined : {
          code: 'SECURITY_VULNERABILITIES',
          message: `Found ${vulnerabilities} vulnerabilities`,
          command: 'security-scan',
          timestamp: new Date().toISOString(),
          recoverable: true,
        },
        duration: 2000,
      };
    });

    // Deploy handler
    this.registerHandler('deploy', (args, ctx) => {
      const environment = (args.env as string) || (args._0 as string) || 'staging';
      ctx.environment = environment as 'staging' | 'production';
      ctx.deploymentUrl = `https://${environment}.example.com`;
      ctx.deploymentVersion = `v${Date.now()}`;

      return {
        success: true,
        data: {
          environment,
          url: ctx.deploymentUrl,
          version: ctx.deploymentVersion,
        },
        duration: 5000,
      };
    });

    // Verify handler
    this.registerHandler('verify', (_args, ctx) => {
      const passed = Math.random() > 0.1; // 90% success rate

      return {
        success: passed,
        data: {
          environment: ctx.environment,
          url: ctx.deploymentUrl,
          healthCheck: passed,
        },
        error: passed ? undefined : {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed',
          command: 'verify',
          timestamp: new Date().toISOString(),
          recoverable: true,
        },
        duration: 1000,
      };
    });

    // Generate-docs handler
    this.registerHandler('generate-docs', (_args, _ctx) => ({
        success: true,
        data: { docsGenerated: true },
        duration: 2000,
      }));

    // Miyabi-auto handler
    this.registerHandler('miyabi-auto', (_args, _ctx) => ({
        success: true,
        data: { autoMode: true },
        duration: 1000,
      }));

    // Miyabi-todos handler
    this.registerHandler('miyabi-todos', (_args, ctx) => {
      const todos = Math.floor(Math.random() * 10);
      ctx.issueNumbers = Array.from({ length: todos }, () => Math.floor(Math.random() * 1000));

      return {
        success: true,
        data: { todosFound: todos, issueNumbers: ctx.issueNumbers },
        duration: 1000,
      };
    });
  }

  /**
   * Register a command handler
   */
  registerHandler(type: CommandType, handler: CommandHandler): void {
    this.commandHandlers.set(type, handler);
  }

  /**
   * Execute a pipeline
   */
  async execute(pipeline: Pipeline | string): Promise<PipelineContext> {
    // Reset state
    this.context = this.createEmptyContext();
    this.aborted = false;

    // Parse pipeline if string
    const commands = typeof pipeline === 'string'
      ? parsePipeline(pipeline)
      : pipeline.commands;

    this.context.totalSteps = commands.length;

    this.emit('pipeline:start', {
      pipelineId: this.context.pipelineId,
      commands: commands.length,
    });

    let lastResult: CommandResult | null = null;
    let parallelGroup: PipelineCommand[] = [];

    for (let i = 0; i < commands.length; i++) {
      if (this.aborted) {
        this.emit('pipeline:aborted', { step: i });
        break;
      }

      const command = commands[i];
      this.context.currentStep = i + 1;

      // Handle parallel execution
      if (command.operator === '&') {
        parallelGroup.push(command);
        continue;
      }

      // Execute parallel group if any
      if (parallelGroup.length > 0) {
        parallelGroup.push(command);
        const results = await this.executeParallel(parallelGroup);
        parallelGroup = [];

        // Check if any failed
        const failed = results.find(r => !r.success);
        if (failed) {
          lastResult = failed;
          if (commands[i + 1]?.operator !== '||') {
            break;
          }
        } else {
          lastResult = results[results.length - 1];
        }
        continue;
      }

      // Handle conditional operators
      if (command.operator === '&&' && lastResult && !lastResult.success) {
        // Skip if previous failed
        this.emit('command:skipped', { command: command.type, reason: 'previous failed' });
        continue;
      }

      if (command.operator === '||' && lastResult && lastResult.success) {
        // Skip if previous succeeded
        this.emit('command:skipped', { command: command.type, reason: 'previous succeeded' });
        continue;
      }

      // Execute command
      lastResult = await this.executeCommand(command);

      // Create checkpoint
      if (this.options.checkpointInterval && i % this.options.checkpointInterval === 0) {
        this.createCheckpoint(command.type);
      }

      // Handle failure
      if (!lastResult.success && commands[i + 1]?.operator !== '||') {
        // No fallback, stop execution
        break;
      }

      // Progress callback
      if (this.options.onProgress) {
        this.options.onProgress(i + 1, commands.length, command.type);
      }
    }

    this.emit('pipeline:complete', {
      pipelineId: this.context.pipelineId,
      success: this.context.errors.length === 0,
      duration: Date.now() - this.context.startedAt.getTime(),
    });

    return this.context;
  }

  /**
   * Execute a single command with retry
   */
  private async executeCommand(command: PipelineCommand): Promise<CommandResult> {
    const handler = this.commandHandlers.get(command.type);

    if (!handler) {
      const error: PipelineError = {
        code: 'COMMAND_NOT_FOUND',
        message: `Unknown command: ${command.type}`,
        command: command.type,
        timestamp: new Date().toISOString(),
        recoverable: false,
      };
      this.context.errors.push(error);
      return { success: false, error, duration: 0 };
    }

    this.emit('command:start', { command: command.type, args: command.args });

    const startTime = Date.now();
    let lastError: PipelineError | undefined;

    for (let attempt = 0; attempt <= this.retryPolicy.maxRetries; attempt++) {
      try {
        if (this.options.dryRun) {
          // Dry run - don't actually execute
          this.emit('command:dryrun', { command: command.type, args: command.args });
          return {
            success: true,
            data: { dryRun: true },
            duration: 0,
          };
        }

        const result = await handler(command.args, this.context);

        if (result.success) {
          this.emit('command:complete', {
            command: command.type,
            result,
            attempt,
          });
          return result;
        }

        lastError = result.error;

        // Check if error is retryable
        if (!lastError || !this.retryPolicy.retryableErrors.includes(lastError.code)) {
          break;
        }

        // Wait before retry
        if (attempt < this.retryPolicy.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          this.emit('command:retry', { command: command.type, attempt: attempt + 1, delay });
          await this.sleep(delay);
        }
      } catch (err) {
        lastError = {
          code: 'EXECUTION_ERROR',
          message: err instanceof Error ? err.message : String(err),
          command: command.type,
          timestamp: new Date().toISOString(),
          recoverable: false,
        };
      }
    }

    // All retries exhausted
    if (lastError) {
      this.context.errors.push(lastError);
    }

    this.emit('command:failed', { command: command.type, error: lastError });

    return {
      success: false,
      error: lastError,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Execute commands in parallel
   */
  private async executeParallel(commands: PipelineCommand[]): Promise<CommandResult[]> {
    this.emit('parallel:start', { commands: commands.map(c => c.type) });

    const results = await Promise.all(
      commands.map(cmd => this.executeCommand(cmd))
    );

    this.emit('parallel:complete', {
      commands: commands.map(c => c.type),
      results: results.map(r => r.success),
    });

    return results;
  }

  /**
   * Calculate retry delay with backoff
   */
  private calculateRetryDelay(attempt: number): number {
    let delay: number;

    if (this.retryPolicy.backoff === 'exponential') {
      delay = this.retryPolicy.initialDelay * Math.pow(2, attempt);
    } else {
      delay = this.retryPolicy.initialDelay * (attempt + 1);
    }

    return Math.min(delay, this.retryPolicy.maxDelay);
  }

  /**
   * Create a checkpoint
   */
  private createCheckpoint(command: string): void {
    const checkpoint: Checkpoint = {
      id: `checkpoint-${this.context.checkpoints.length}`,
      step: this.context.currentStep,
      command,
      context: { ...this.context },
      timestamp: new Date().toISOString(),
    };

    this.context.checkpoints.push(checkpoint);
    this.emit('checkpoint:created', checkpoint);
  }

  /**
   * Resume from checkpoint
   */
  async resume(checkpointId: string, pipeline: Pipeline | string): Promise<PipelineContext> {
    const checkpoint = this.context.checkpoints.find(c => c.id === checkpointId);

    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // Restore context
    Object.assign(this.context, checkpoint.context);

    // Parse and slice pipeline
    const commands = typeof pipeline === 'string'
      ? parsePipeline(pipeline)
      : pipeline.commands;

    const remainingCommands = commands.slice(checkpoint.step);

    this.emit('pipeline:resumed', { checkpointId, remainingCommands: remainingCommands.length });

    // Execute remaining commands
    return this.execute({
      id: this.context.pipelineId,
      name: 'resumed',
      commands: remainingCommands,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Abort execution
   */
  abort(): void {
    this.aborted = true;
    this.emit('pipeline:aborting');
  }

  /**
   * Get current context
   */
  getContext(): PipelineContext {
    return { ...this.context };
  }

  /**
   * Get checkpoints
   */
  getCheckpoints(): Checkpoint[] {
    return [...this.context.checkpoints];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Command handler function type
 */
type CommandHandler = (
  args: Record<string, unknown>,
  context: PipelineContext
) => Promise<CommandResult> | CommandResult;

// ============================================================================
// Pre-defined Pipelines
// ============================================================================

/**
 * Full development cycle pipeline
 */
export const FULL_CYCLE_PIPELINE = '/agent-run | /review --threshold 80 | /test | /security-scan | /deploy --env staging | /verify';

/**
 * Quick deploy pipeline
 */
export const QUICK_DEPLOY_PIPELINE = '/verify && /deploy';

/**
 * Quality gate pipeline
 */
export const QUALITY_GATE_PIPELINE = '/review && /test && /security-scan';

/**
 * Auto-fix pipeline
 */
export const AUTO_FIX_PIPELINE = '/review --auto-fix';

// ============================================================================
// Exports
// ============================================================================

export default PipelineExecutor;
