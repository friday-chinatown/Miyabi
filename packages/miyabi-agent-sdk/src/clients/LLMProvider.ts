/**
 * LLM Provider Interface
 *
 * Claude CLI / Codex CLI / Anthropic API の共通インターフェース。
 * 各プロバイダーはこのインターフェースを実装し、TaskRouter から
 * 統一的に呼び出される。
 *
 * 設計思想:
 * - Claude CLI = 司令塔（オーケストレーション、分析、計画）
 * - Codex CLI = ワーカー（コーディング、レビュー、テスト）
 * - Anthropic API = フォールバック（CI/CD、cron 等）
 */

/**
 * プロバイダー種別
 *
 * - claude-cli: Claude Code CLI（サブスク内 $0）
 * - codex-cli: OpenAI Codex CLI（コーディング特化）
 * - anthropic-api: Anthropic SDK 直接呼び出し（有料）
 */
export type ProviderType = "claude-cli" | "codex-cli" | "anthropic-api";

/**
 * LLM プロバイダーからの統一レスポンス
 */
export interface LLMProviderResponse {
  /** 生成されたコンテンツ */
  content: string;
  /** トークン使用量（推定値の場合あり） */
  tokensUsed?: { input: number; output: number };
  /** コスト（USD、サブスク内は 0） */
  cost?: number;
  /** レスポンスを返したプロバイダー */
  provider: ProviderType;
}

/**
 * プロンプト実行オプション
 */
export interface ExecutePromptOptions {
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** 作業ディレクトリ */
  workingDir?: string;
  /** システムプロンプト（API モード時に使用） */
  systemPrompt?: string;
  /** モデル指定（プロバイダーのデフォルトを上書き） */
  model?: string;
}

/**
 * Issue 分析結果
 */
export interface IssueAnalysisResult {
  type: string;
  complexity: string;
  priority: string;
  relatedFiles: string[];
  labels: string[];
  reasoning?: string;
}

/**
 * コード生成結果
 */
export interface CodeGenerationResult {
  files: Array<{
    path: string;
    content: string;
    action: "create" | "modify" | "delete";
  }>;
  tests: Array<{
    path: string;
    content: string;
    action: "create" | "modify" | "delete";
  }>;
  qualityScore: number;
}

/**
 * コードレビュー結果
 */
export interface CodeReviewResult {
  qualityScore: number;
  passed: boolean;
  issues: Array<{
    severity: string;
    message: string;
    file?: string;
    line?: number;
  }>;
  suggestions: string[];
}

/**
 * LLM プロバイダー共通インターフェース
 *
 * Claude CLI、Codex CLI、Anthropic API のすべてが
 * このインターフェースを実装する。TaskRouter は
 * このインターフェースを通じてプロバイダーを呼び出す。
 */
export interface LLMProvider {
  /** プロバイダー名（表示用） */
  readonly name: string;
  /** プロバイダー種別 */
  readonly type: ProviderType;

  /**
   * プロンプトを実行し、レスポンスを返す
   *
   * @param prompt - 実行するプロンプト
   * @param options - 実行オプション
   * @returns 統一レスポンス
   */
  executePrompt(
    prompt: string,
    options?: ExecutePromptOptions
  ): Promise<LLMProviderResponse>;

  /**
   * GitHub Issue を分析
   *
   * @param issueData - Issue のタイトル、本文、番号
   * @returns 分析結果（種別、複雑度、優先度など）
   */
  analyzeIssue(issueData: {
    title: string;
    body: string;
    number: number;
  }): Promise<IssueAnalysisResult>;

  /**
   * 要件に基づいてコードを生成
   *
   * @param requirements - 生成要件
   * @returns 生成されたファイルとテスト
   */
  generateCode(requirements: {
    taskId: string;
    requirements: string;
    context: string;
    language: string;
  }): Promise<CodeGenerationResult>;

  /**
   * コードをレビュー
   *
   * @param files - レビュー対象のファイル群
   * @returns レビュー結果（スコア、問題点、提案）
   */
  reviewCode(
    files: Array<{ path: string; content: string }>
  ): Promise<CodeReviewResult>;

  /**
   * プロバイダーの健全性を確認
   *
   * CLI の存在確認、API キーの有効性確認など。
   * @returns 正常なら true
   */
  healthCheck(): Promise<boolean>;
}
