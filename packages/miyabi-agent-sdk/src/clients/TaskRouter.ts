/**
 * TaskRouter - タスクルーティングとプロバイダー管理
 *
 * タスク種別に基づいて適切な LLM プロバイダーを選択する。
 *
 * ルーティング戦略:
 * - Claude CLI = 司令塔（orchestration, analysis, deployment, business）
 * - Codex CLI = ワーカー（coding, review, testing）
 * - Anthropic API = フォールバック（CLI が使えない環境）
 *
 * フォールバック順序:
 * 1. 推奨プロバイダーを試行
 * 2. 失敗時、代替プロバイダーにフォールバック
 * 3. 全 CLI 失敗時、Anthropic API にフォールバック（設定時のみ）
 */
import { spawn } from "child_process";
import type {
  LLMProvider,
  LLMProviderResponse,
  ExecutePromptOptions,
  IssueAnalysisResult,
  CodeGenerationResult,
  CodeReviewResult,
  ProviderType,
} from "./LLMProvider.js";
import { ClaudeCodeClient } from "./ClaudeCodeClient.js";
import { AnthropicClient } from "./AnthropicClient.js";

// ─────────────────────────────────────────────
// タスクカテゴリ定義
// ─────────────────────────────────────────────

/**
 * タスクカテゴリ
 *
 * 各カテゴリは推奨プロバイダーにルーティングされる。
 */
export type TaskCategory =
  | "orchestration"
  | "analysis"
  | "coding"
  | "review"
  | "testing"
  | "deployment"
  | "business";

/**
 * ルーティングルール: カテゴリ → 推奨プロバイダー
 *
 * orchestration → Claude CLI（CoordinatorAgent が使用）
 * analysis      → Claude CLI（IssueAgent, LLMDecomposer が使用）
 * coding        → Codex CLI（CodeGenAgent が使用）
 * review        → Codex CLI（ReviewAgent が使用）
 * testing       → Codex CLI（TestAgent が使用）
 * deployment    → Claude CLI（DeploymentAgent が使用）
 * business      → Claude CLI（全 14 ビジネスエージェントが使用）
 */
const ROUTING_TABLE: Record<TaskCategory, ProviderType> = {
  orchestration: "claude-cli",
  analysis: "claude-cli",
  coding: "codex-cli",
  review: "codex-cli",
  testing: "codex-cli",
  deployment: "claude-cli",
  business: "claude-cli",
};

/**
 * フォールバック順序: 推奨 → 代替 → API
 */
const FALLBACK_ORDER: Record<ProviderType, ProviderType[]> = {
  "claude-cli": ["codex-cli", "anthropic-api"],
  "codex-cli": ["claude-cli", "anthropic-api"],
  "anthropic-api": ["claude-cli", "codex-cli"],
};

// ─────────────────────────────────────────────
// プロバイダー設定
// ─────────────────────────────────────────────

/**
 * .miyabi.yml から読み込まれるプロバイダー設定
 */
export interface ProviderConfig {
  /** Claude CLI コマンド名（デフォルト: "claude"） */
  claudeCommand?: string;
  /** Codex CLI コマンド名（デフォルト: "codex"） */
  codexCommand?: string;
  /** Anthropic API キー（フォールバック用） */
  anthropicApiKey?: string;
  /** Anthropic API モデル（デフォルト: "claude-sonnet-4-20250514"） */
  anthropicModel?: string;
  /** カテゴリごとのルーティング上書き */
  routingOverrides?: Partial<Record<TaskCategory, ProviderType>>;
  /** フォールバックを有効にするか（デフォルト: true） */
  enableFallback?: boolean;
  /** ヘルスチェックのタイムアウト（ミリ秒、デフォルト: 5000） */
  healthCheckTimeout?: number;
}

// ─────────────────────────────────────────────
// Claude CLI プロバイダー（LLMProvider 実装）
// ─────────────────────────────────────────────

/**
 * Claude CLI を LLMProvider インターフェースでラップ
 *
 * 内部で ClaudeCodeClient を使用し、LLMProvider 契約を満たす。
 */
class ClaudeCliProvider implements LLMProvider {
  readonly name = "Claude CLI";
  readonly type: ProviderType = "claude-cli";
  private client: ClaudeCodeClient;
  private command: string;

  constructor(command = "claude") {
    this.command = command;
    this.client = new ClaudeCodeClient(command);
  }

  /**
   * Claude CLI でプロンプトを実行
   */
  async executePrompt(
    prompt: string,
    options?: ExecutePromptOptions
  ): Promise<LLMProviderResponse> {
    const result = await this.client.executePrompt(prompt, {
      timeout: options?.timeout,
      workingDir: options?.workingDir,
    });
    return {
      content: result.content,
      tokensUsed: result.tokensUsed,
      cost: result.cost ?? 0,
      provider: "claude-cli",
    };
  }

  /**
   * Issue 分析（Claude CLI 経由）
   */
  async analyzeIssue(issueData: {
    title: string;
    body: string;
    number: number;
  }): Promise<IssueAnalysisResult> {
    return this.client.analyzeIssue(issueData);
  }

  /**
   * コード生成（Claude CLI 経由）
   */
  async generateCode(requirements: {
    taskId: string;
    requirements: string;
    context: string;
    language: string;
  }): Promise<CodeGenerationResult> {
    return this.client.generateCode(requirements);
  }

  /**
   * コードレビュー（Claude CLI 経由）
   */
  async reviewCode(
    files: Array<{ path: string; content: string }>
  ): Promise<CodeReviewResult> {
    return this.client.reviewCode(files);
  }

  /**
   * Claude CLI の存在を確認
   *
   * `claude --version` を実行し、正常終了するか確認する。
   */
  async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.command, ["--version"], {
        shell: false,
        timeout: 5000,
      });
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });
  }
}

// ─────────────────────────────────────────────
// Codex CLI プロバイダー（LLMProvider 実装）
// ─────────────────────────────────────────────

/**
 * Codex CLI を LLMProvider インターフェースでラップ
 *
 * OpenAI Codex CLI を使用し、コーディング特化タスクを実行する。
 * `codex -q "prompt"` で非対話的に実行。
 */
class CodexCliProvider implements LLMProvider {
  readonly name = "Codex CLI";
  readonly type: ProviderType = "codex-cli";
  private command: string;

  constructor(command = "codex") {
    this.command = command;
  }

  /**
   * Codex CLI でプロンプトを実行
   *
   * `codex -q "prompt"` で quiet モード実行。
   * shell: false でインジェクション防止。
   */
  async executePrompt(
    prompt: string,
    options?: ExecutePromptOptions
  ): Promise<LLMProviderResponse> {
    return new Promise((resolve, reject) => {
      const args = ["-q", prompt];
      const proc = spawn(this.command, args, {
        cwd: options?.workingDir || process.cwd(),
        shell: false,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      const timeoutId = options?.timeout
        ? setTimeout(() => {
            proc.kill();
            reject(
              new Error(
                `Codex CLI execution timed out after ${options.timeout}ms`
              )
            );
          }, options.timeout)
        : null;

      proc.on("close", (code: number | null) => {
        if (timeoutId) clearTimeout(timeoutId);

        if (code === 0) {
          resolve({
            content: stdout.trim(),
            tokensUsed: {
              input: Math.floor(prompt.length / 4),
              output: Math.floor(stdout.length / 4),
            },
            cost: 0,
            provider: "codex-cli",
          });
        } else {
          reject(
            new Error(
              `Codex CLI failed with exit code ${code}\nStderr: ${stderr}`
            )
          );
        }
      });

      proc.on("error", (error: Error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn Codex CLI: ${error.message}`));
      });
    });
  }

  /**
   * Issue 分析（Codex CLI 経由）
   */
  async analyzeIssue(issueData: {
    title: string;
    body: string;
    number: number;
  }): Promise<IssueAnalysisResult> {
    const prompt = `Analyze this GitHub issue and return ONLY a JSON object (no markdown code blocks):

Issue #${issueData.number}: ${issueData.title}

${issueData.body}

Return JSON format:
{
  "type": "bug|feature|refactor|docs|test",
  "complexity": "small|medium|large|xlarge",
  "priority": "P0|P1|P2|P3",
  "relatedFiles": ["file1.ts", "file2.ts"],
  "labels": ["type:bug", "priority:P2-Medium"]
}`;

    const response = await this.executePrompt(prompt, { timeout: 60000 });
    return this.parseJSON(response.content);
  }

  /**
   * コード生成（Codex CLI 経由）
   */
  async generateCode(requirements: {
    taskId: string;
    requirements: string;
    context: string;
    language: string;
  }): Promise<CodeGenerationResult> {
    const prompt = `Generate code for this task. Return ONLY a JSON object (no markdown code blocks):

Task: ${requirements.requirements}

Context: ${requirements.context}

Language: ${requirements.language}

Return JSON format:
{
  "files": [{ "path": "src/example.ts", "content": "...", "action": "create" }],
  "tests": [{ "path": "src/example.test.ts", "content": "...", "action": "create" }],
  "qualityScore": 95
}`;

    const response = await this.executePrompt(prompt, { timeout: 120000 });
    return this.parseJSON(response.content);
  }

  /**
   * コードレビュー（Codex CLI 経由）
   */
  async reviewCode(
    files: Array<{ path: string; content: string }>
  ): Promise<CodeReviewResult> {
    const filesStr = files
      .map((f) => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");

    const prompt = `Review this code and return ONLY a JSON object (no markdown code blocks):

${filesStr}

Return JSON format:
{
  "qualityScore": 85,
  "passed": true,
  "issues": [{ "severity": "warning", "message": "...", "file": "...", "line": 42 }],
  "suggestions": ["Add more test cases"]
}`;

    const response = await this.executePrompt(prompt, { timeout: 90000 });
    return this.parseJSON(response.content);
  }

  /**
   * Codex CLI の存在を確認
   *
   * `codex --version` を実行し、正常終了するか確認する。
   */
  async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.command, ["--version"], {
        shell: false,
        timeout: 5000,
      });
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });
  }

  /**
   * JSON パース（複数パターン対応）
   */
  private parseJSON(text: string): any {
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // next
      }
    }

    jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // next
      }
    }

    jsonMatch = text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // next
      }
    }

    try {
      return JSON.parse(text.trim());
    } catch (error) {
      throw new Error(
        `Failed to parse Codex response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// Anthropic API プロバイダー（LLMProvider 実装）
// ─────────────────────────────────────────────

/**
 * Anthropic API を LLMProvider インターフェースでラップ
 *
 * CLI が使えない環境（CI/CD、cron）でのフォールバック。
 * 有料 API を使用するため、コストが発生する。
 */
class AnthropicApiProvider implements LLMProvider {
  readonly name = "Anthropic API";
  readonly type: ProviderType = "anthropic-api";
  private client: AnthropicClient;

  constructor(apiKey?: string) {
    this.client = new AnthropicClient(apiKey);
  }

  /**
   * Anthropic API でプロンプトを実行
   */
  async executePrompt(
    prompt: string,
    _options?: ExecutePromptOptions
  ): Promise<LLMProviderResponse> {
    // AnthropicClient は直接 executePrompt を持たないため、
    // generateCode のプロンプト形式で代用する
    const result = await this.client.generateCode(prompt, "", "typescript");
    return {
      content: JSON.stringify(result),
      tokensUsed: result.tokensUsed,
      cost: this.client.calculateCost(result.tokensUsed),
      provider: "anthropic-api",
    };
  }

  /**
   * Issue 分析（Anthropic API 経由）
   */
  async analyzeIssue(issueData: {
    title: string;
    body: string;
    number: number;
  }): Promise<IssueAnalysisResult> {
    const result = await this.client.analyzeIssue(
      issueData.title,
      issueData.body
    );
    return {
      type: result.type,
      complexity: result.complexity,
      priority: result.priority,
      relatedFiles: [],
      labels: result.labels,
      reasoning: (result as any).reasoning,
    };
  }

  /**
   * コード生成（Anthropic API 経由）
   */
  async generateCode(requirements: {
    taskId: string;
    requirements: string;
    context: string;
    language: string;
  }): Promise<CodeGenerationResult> {
    const result = await this.client.generateCode(
      requirements.requirements,
      requirements.context,
      requirements.language
    );
    return {
      files: result.files,
      tests: result.tests,
      qualityScore: result.qualityScore,
    };
  }

  /**
   * コードレビュー（Anthropic API 経由）
   */
  async reviewCode(
    files: Array<{ path: string; content: string }>
  ): Promise<CodeReviewResult> {
    const result = await this.client.reviewCode(files);
    return {
      qualityScore: result.qualityScore,
      passed: result.passed,
      issues: result.issues,
      suggestions: result.suggestions,
    };
  }

  /**
   * API キーの有効性を確認
   *
   * 小さなリクエストを送信し、認証が通るか確認する。
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.analyzeIssue("health check", "ping");
      return true;
    } catch {
      return false;
    }
  }
}

// ─────────────────────────────────────────────
// ProviderFactory
// ─────────────────────────────────────────────

/**
 * プロバイダーファクトリ
 *
 * 設定に基づいて LLMProvider インスタンスを生成する。
 * .miyabi.yml の providers セクションから設定を読み込む。
 */
export class ProviderFactory {
  /**
   * プロバイダー種別からインスタンスを生成
   *
   * @param type - プロバイダー種別
   * @param config - プロバイダー設定
   * @returns LLMProvider インスタンス
   * @throws 不明なプロバイダー種別の場合
   */
  static create(type: ProviderType, config: ProviderConfig = {}): LLMProvider {
    switch (type) {
      case "claude-cli":
        return new ClaudeCliProvider(config.claudeCommand);
      case "codex-cli":
        return new CodexCliProvider(config.codexCommand);
      case "anthropic-api":
        return new AnthropicApiProvider(config.anthropicApiKey);
      default:
        throw new Error(`不明なプロバイダー種別: ${type}`);
    }
  }

  /**
   * 設定から全プロバイダーを生成
   *
   * @param config - プロバイダー設定
   * @returns プロバイダー種別をキーとしたマップ
   */
  static createAll(
    config: ProviderConfig = {}
  ): Map<ProviderType, LLMProvider> {
    const providers = new Map<ProviderType, LLMProvider>();

    // Claude CLI は常に生成（デフォルトプロバイダー）
    providers.set("claude-cli", new ClaudeCliProvider(config.claudeCommand));

    // Codex CLI も常に生成（ヘルスチェックで利用可否を判定）
    providers.set("codex-cli", new CodexCliProvider(config.codexCommand));

    // Anthropic API はキーがある場合のみ生成
    if (config.anthropicApiKey || process.env.ANTHROPIC_API_KEY) {
      providers.set(
        "anthropic-api",
        new AnthropicApiProvider(config.anthropicApiKey)
      );
    }

    return providers;
  }
}

// ─────────────────────────────────────────────
// ヘルスチェック結果
// ─────────────────────────────────────────────

/**
 * 全プロバイダーのヘルスチェック結果
 */
export interface HealthCheckResult {
  /** プロバイダー種別 */
  provider: ProviderType;
  /** プロバイダー名 */
  name: string;
  /** 利用可能か */
  available: boolean;
  /** チェック実行時刻 */
  checkedAt: Date;
}

// ─────────────────────────────────────────────
// TaskRouter
// ─────────────────────────────────────────────

/**
 * タスクルーター
 *
 * タスクカテゴリに基づいて最適な LLM プロバイダーを選択する。
 * フォールバック機能により、推奨プロバイダーが利用不可の場合は
 * 代替プロバイダーに自動的に切り替える。
 *
 * 使用例:
 * ```typescript
 * const router = new TaskRouter({
 *   claudeCommand: "claude",
 *   codexCommand: "codex",
 *   enableFallback: true,
 * });
 *
 * // コーディングタスク → Codex CLI を優先選択
 * const provider = await router.getProvider("coding");
 *
 * // 分析タスク → Claude CLI を優先選択
 * const analyst = await router.getProvider("analysis");
 * ```
 */
export class TaskRouter {
  private providers: Map<ProviderType, LLMProvider>;
  private config: ProviderConfig;
  private healthCache: Map<ProviderType, { available: boolean; cachedAt: number }>;

  /** ヘルスチェック結果のキャッシュ有効期間（ミリ秒） */
  private static readonly HEALTH_CACHE_TTL = 60_000; // 1分

  constructor(config: ProviderConfig = {}) {
    this.config = config;
    this.providers = ProviderFactory.createAll(config);
    this.healthCache = new Map();
  }

  /**
   * タスクカテゴリに基づいてプロバイダーを選択
   *
   * ルーティングルールに従い、推奨プロバイダーを返す。
   * フォールバックが有効な場合、利用不可時に代替を試行する。
   *
   * @param category - タスクカテゴリ
   * @returns 利用可能な LLMProvider
   * @throws 全プロバイダーが利用不可の場合
   */
  async getProvider(category: TaskCategory): Promise<LLMProvider> {
    // ルーティング上書きを適用
    const preferredType =
      this.config.routingOverrides?.[category] ?? ROUTING_TABLE[category];

    // 推奨プロバイダーの利用可否を確認
    const preferred = this.providers.get(preferredType);
    if (preferred && (await this.isAvailable(preferredType))) {
      return preferred;
    }

    // フォールバックが無効なら推奨プロバイダーをそのまま返す
    if (this.config.enableFallback === false) {
      if (preferred) return preferred;
      throw new Error(
        `プロバイダー ${preferredType} が設定されていません（カテゴリ: ${category}）`
      );
    }

    // フォールバック順序で利用可能なプロバイダーを探す
    const fallbacks = FALLBACK_ORDER[preferredType] ?? [];
    for (const fallbackType of fallbacks) {
      const fallback = this.providers.get(fallbackType);
      if (fallback && (await this.isAvailable(fallbackType))) {
        console.warn(
          `[TaskRouter] ${preferredType} が利用不可。${fallbackType} にフォールバック（カテゴリ: ${category}）`
        );
        return fallback;
      }
    }

    // 全フォールバック失敗 → 推奨プロバイダーを返す（エラーは呼び出し側で処理）
    if (preferred) {
      console.warn(
        `[TaskRouter] 全プロバイダーが利用不可。${preferredType} で試行（カテゴリ: ${category}）`
      );
      return preferred;
    }

    throw new Error(
      `カテゴリ ${category} に対応するプロバイダーが見つかりません`
    );
  }

  /**
   * 特定のプロバイダーを直接取得（ルーティング無視）
   *
   * @param type - プロバイダー種別
   * @returns LLMProvider インスタンス
   * @throws プロバイダーが設定されていない場合
   */
  getProviderByType(type: ProviderType): LLMProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`プロバイダー ${type} が設定されていません`);
    }
    return provider;
  }

  /**
   * 全プロバイダーのヘルスチェックを実行
   *
   * 各プロバイダーの利用可否を並列で確認し、結果を返す。
   *
   * @returns 各プロバイダーのヘルスチェック結果
   */
  async checkHealth(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const checks: Promise<void>[] = [];

    for (const [type, provider] of this.providers) {
      checks.push(
        (async () => {
          const available = await this.runHealthCheck(type);
          results.push({
            provider: type,
            name: provider.name,
            available,
            checkedAt: new Date(),
          });
        })()
      );
    }

    await Promise.all(checks);
    return results;
  }

  /**
   * ルーティングテーブルを取得（デバッグ・表示用）
   *
   * @returns カテゴリと推奨プロバイダーのマッピング
   */
  getRoutingTable(): Record<TaskCategory, ProviderType> {
    const table = { ...ROUTING_TABLE };

    // 上書きを適用
    if (this.config.routingOverrides) {
      for (const [category, type] of Object.entries(
        this.config.routingOverrides
      )) {
        table[category as TaskCategory] = type;
      }
    }

    return table;
  }

  /**
   * プロバイダーの利用可否を確認（キャッシュ付き）
   *
   * @param type - プロバイダー種別
   * @returns 利用可能なら true
   */
  private async isAvailable(type: ProviderType): Promise<boolean> {
    const cached = this.healthCache.get(type);
    const now = Date.now();

    if (cached && now - cached.cachedAt < TaskRouter.HEALTH_CACHE_TTL) {
      return cached.available;
    }

    return this.runHealthCheck(type);
  }

  /**
   * ヘルスチェックを実行し、結果をキャッシュ
   *
   * @param type - プロバイダー種別
   * @returns 利用可能なら true
   */
  private async runHealthCheck(type: ProviderType): Promise<boolean> {
    const provider = this.providers.get(type);
    if (!provider) return false;

    try {
      const available = await Promise.race<boolean>([
        provider.healthCheck(),
        new Promise<boolean>((resolve) =>
          setTimeout(
            () => resolve(false),
            this.config.healthCheckTimeout ?? 5000
          )
        ),
      ]);

      this.healthCache.set(type, { available, cachedAt: Date.now() });
      return available;
    } catch {
      this.healthCache.set(type, { available: false, cachedAt: Date.now() });
      return false;
    }
  }
}
