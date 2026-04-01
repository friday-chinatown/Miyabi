# 最適化移行計画: Claude Code 司令塔 + Codex ワーカー アーキテクチャ

> 前提ドキュメント: `20_api_free_migration_plan.md` の分析結果を踏まえ、
> **Claude Code CLI = 司令塔（Orchestrator）** / **Codex CLI = ワーカー（Executor）** という
> 明確な役割分担で再設計した最適化計画。

---

## 目次

1. [アーキテクチャ概要: Claude 司令塔 + Codex ワーカー](#1-アーキテクチャ概要-claude-司令塔--codex-ワーカー)
2. [タスクルーティング設計](#2-タスクルーティング設計)
3. [実装計画](#3-実装計画)
4. [Codex CLI 呼び出し方法](#4-codex-cli-呼び出し方法)
5. [具体的なコード例](#5-具体的なコード例)
6. [実行フロー図](#6-実行フロー図)
7. [コスト分析](#7-コスト分析)
8. [リスクと対策](#8-リスクと対策)

---

## 1. アーキテクチャ概要: Claude 司令塔 + Codex ワーカー

### 1.1 なぜこの分担が最適か

#### Claude Code CLI の強み（司令塔に最適な理由）

| 強み | 詳細 |
|------|------|
| **コンテキスト理解** | 1Mトークンの巨大コンテキストウィンドウで、Issue全文+関連コード+プロジェクト構造を一度に把握 |
| **構造化出力** | `--output-format json` でプログラマティックに解析可能なJSON出力をネイティブサポート |
| **セッション管理** | `--continue <session_id>` で前回の分析結果を引き継いだ連続判断が可能 |
| **分析・推論力** | Claude Opus 4 / Sonnet 4 の高い推論能力で、複雑な要件分析・タスク分解・判断が得意 |
| **システムプロンプト** | `--system-prompt` でエージェントごとの役割を明確に指定可能 |
| **日本語能力** | ビジネスエージェントの日本語レポート生成に優れる |

#### Codex CLI の強み（ワーカーに最適な理由）

| 強み | 詳細 |
|------|------|
| **直接ファイル編集** | ファイルを直接作成・編集する「エージェント」として動作。JSON経由でなく実ファイルを操作 |
| **マルチエージェント** | `--agent worker/reviewer/architect/explorer` で専門化されたサブエージェントを使い分け |
| **承認ポリシー** | `--approval-policy full-auto` で完全自動実行が可能（CI/CD向け） |
| **サンドボックス** | `sandbox_mode = "workspace-write"` でセキュアなファイル操作 |
| **並列実行** | `max_threads = 4` で最大4並列のサブエージェント実行 |
| **MCP統合** | Context7, Playwright等のMCPサーバーをネイティブ統合済み |
| **コーディング特化** | GPT-5.4 のコード生成能力 + ファイルシステム直接操作で高効率 |

#### 分担の根拠

```
司令塔（Claude Code）の仕事:
  "何をすべきか" を決める（WHAT / WHY）
  - Issue を読んで理解する
  - タスクに分解する
  - 優先度・ラベルを決める
  - PR の説明文を書く
  - デプロイ可否を判断する
  - ビジネス戦略を分析する

ワーカー（Codex）の仕事:
  "どうやるか" を実行する（HOW）
  - コードを書く
  - テストを書く
  - コードをレビューする
  - リファクタリングする
  - ファイルを編集する
```

### 1.2 アーキテクチャ図

```
                    ┌─────────────────────────────────────────────────┐
                    │              GitHub Issue / Webhook              │
                    └──────────────────────┬──────────────────────────┘
                                           │
                                           ▼
                    ┌─────────────────────────────────────────────────┐
                    │              Miyabi Orchestrator                 │
                    │            (TaskRouter + DAG Engine)             │
                    └──────────┬──────────────────────┬───────────────┘
                               │                      │
              ┌────────────────▼────────┐   ┌────────▼────────────────┐
              │   Claude Code CLI       │   │     Codex CLI           │
              │   (司令塔 / Commander)   │   │   (ワーカー / Executor)  │
              │                         │   │                         │
              │  claude -p "..."        │   │  codex -p "..."         │
              │  --output-format json   │   │  --agent worker         │
              │  --system-prompt "..."  │   │  --approval-policy      │
              │  --continue <session>   │   │    full-auto            │
              │                         │   │                         │
              │  担当:                   │   │  担当:                   │
              │  - Issue分析・分類       │   │  - コード生成            │
              │  - タスク分解・DAG構築   │   │  - テスト生成            │
              │  - ラベリング(53種)      │   │  - コードレビュー        │
              │  - PR文書作成           │   │  - リファクタリング      │
              │  - デプロイ判断         │   │  - バグ修正              │
              │  - ビジネス分析(14種)   │   │  - ファイル操作          │
              └─────────────────────────┘   └─────────────────────────┘
                         │                              │
                         │   ┌──────────────────────┐   │
                         └──►│   共有インターフェース   │◄──┘
                             │   LLMProvider I/F     │
                             │   + TaskRouter        │
                             │   + RateLimiter       │
                             └──────────────────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │   GitHub API          │
                             │   (Issues, PRs,       │
                             │    Labels, Projects)  │
                             └──────────────────────┘
```

### 1.3 データフロー概要

```
司令塔 → ワーカー の指示フロー:

  Claude Code (分析)
       │
       ├─ JSON出力: { tasks: [...], dag: [...] }
       │
       ▼
  TaskRouter (ルーティング)
       │
       ├─ taskType: "code-generation" → Codex --agent worker
       ├─ taskType: "code-review"     → Codex --agent reviewer
       ├─ taskType: "test-generation" → Codex --agent worker
       │
       ▼
  Codex CLI (実行)
       │
       ├─ ファイル直接編集
       ├─ テスト実行
       │
       ▼
  Claude Code (判断)
       │
       ├─ レビュー結果を評価
       ├─ PR作成可否を判断
       └─ デプロイ判断
```

---

## 2. タスクルーティング設計

### 2.1 Miyabi Agent → CLI Backend マッピング

| Miyabi Agent | CLI Backend | Codex Agent | 理由 |
|---|---|---|---|
| **CoordinatorAgent** | Claude Code | - | 司令塔。タスク分解、DAG構築、全体オーケストレーションは高度な推論が必要 |
| **IssueAgent** | Claude Code | - | 53ラベル分類は豊富なコンテキスト理解と分析力が必要 |
| **CodeGenAgent** | Codex | `worker` | コード生成はCodexが直接ファイルを作成・編集できるため効率的 |
| **ReviewAgent** | Codex | `reviewer` | `.codex/agents/reviewer.toml` に専門レビュー設定済み。バグ・セキュリティ・テスト不足を検出 |
| **TestAgent** | Codex | `worker` | テストコード生成はコーディングタスク。workerが直接テストファイルを生成 |
| **PRAgent** | Claude Code | - | PR文書作成は判断+文書力。Conventional Commits準拠の説明文生成 |
| **DeploymentAgent** | Claude Code | - | デプロイ可否の判断は司令塔の仕事。リスク評価・承認フロー |
| **StrategyAgent** | Claude Code | - | ビジネス戦略分析は高度な推論と日本語力が必要 |
| **MarketingAgent** | Claude Code | - | マーケティング分析・コンテンツ戦略 |
| **SalesAgent** | Claude Code | - | セールス分析・パイプライン評価 |
| **AnalyticsAgent** | Claude Code | - | データ分析・KPI評価・レポート生成 |
| **その他Business(10)** | Claude Code | - | 全14ビジネスエージェントは分析・判断中心のためClaude Code |

### 2.2 タスクタイプ → Provider 決定ロジック

```typescript
/**
 * タスクタイプに基づく Provider 選択ルール
 *
 * 判断基準:
 * 1. "コードを書く" → Codex
 * 2. "考える・分析する・判断する" → Claude Code
 * 3. "文書を書く" → Claude Code
 */
const TASK_ROUTING_RULES: Record<TaskType, {
  provider: 'claude-cli' | 'codex-cli';
  codexAgent?: 'worker' | 'reviewer' | 'architect' | 'explorer';
  reason: string;
}> = {
  // === Claude Code（司令塔）タスク ===
  'issue-analysis':      { provider: 'claude-cli', reason: 'Issue理解は高度なコンテキスト分析が必要' },
  'task-decomposition':  { provider: 'claude-cli', reason: 'タスク分解はDAG構築を含む計画立案' },
  'labeling':            { provider: 'claude-cli', reason: '53ラベルの分類は深い理解力が必要' },
  'pr-creation':         { provider: 'claude-cli', reason: 'PR文書はConventional Commits準拠の判断' },
  'deploy-decision':     { provider: 'claude-cli', reason: 'デプロイ可否はリスク評価を含む意思決定' },
  'business-analysis':   { provider: 'claude-cli', reason: 'ビジネス分析は高度な推論と日本語力' },
  'documentation':       { provider: 'claude-cli', reason: 'ドキュメント生成は構造化された文書力' },
  'general-analysis':    { provider: 'claude-cli', reason: '汎用分析はClaude Codeの得意分野' },

  // === Codex（ワーカー）タスク ===
  'code-generation':     { provider: 'codex-cli', codexAgent: 'worker',   reason: 'コード生成はファイル直接操作で効率的' },
  'code-review':         { provider: 'codex-cli', codexAgent: 'reviewer', reason: 'reviewer.toml設定でバグ・セキュリティ検出に特化' },
  'test-generation':     { provider: 'codex-cli', codexAgent: 'worker',   reason: 'テスト生成はコーディングタスク' },
  'refactoring':         { provider: 'codex-cli', codexAgent: 'worker',   reason: 'リファクタリングはファイル直接編集が効率的' },
  'bug-fix':             { provider: 'codex-cli', codexAgent: 'worker',   reason: 'バグ修正は実装タスク' },
  'architecture-review': { provider: 'codex-cli', codexAgent: 'architect', reason: 'architect.toml設定でパッケージ境界分析に特化' },
  'codebase-exploration':{ provider: 'codex-cli', codexAgent: 'explorer', reason: 'explorer.toml設定で読み取り専用分析に特化' },
};
```

### 2.3 ルーティングフローチャート

```
タスク到着
    │
    ▼
┌─────────────────────┐
│ タスクタイプ判定      │
│ (TaskRouter)         │
└──────────┬──────────┘
           │
    ┌──────┴──────────────────────────┐
    │                                  │
    ▼                                  ▼
"分析/判断/文書?"                   "実装/コーディング?"
    │                                  │
    ▼                                  ▼
Claude Code CLI                    Codex CLI
    │                                  │
    ├─ --output-format json            ├─ --agent worker    (生成/修正)
    ├─ --system-prompt <role>          ├─ --agent reviewer  (レビュー)
    └─ -p "prompt"                     ├─ --agent architect (設計分析)
                                       ├─ --agent explorer  (調査)
                                       └─ --approval-policy full-auto
```

---

## 3. 実装計画

### 3.1 パッケージ構成

```
packages/miyabi-agent-sdk/src/
├── clients/
│   ├── AnthropicClient.ts          # 既存（フォールバック用に維持）
│   └── ClaudeCodeClient.ts         # 既存（ClaudeCLIProvider のベースとして活用）
├── providers/
│   ├── types.ts                    # LLMProvider interface + 全型定義
│   ├── claude-cli-provider.ts      # Claude Code CLI Provider（司令塔）
│   ├── codex-cli-provider.ts       # Codex CLI Provider（ワーカー）★新規
│   ├── anthropic-api-provider.ts   # Anthropic API Provider（フォールバック）
│   ├── task-router.ts              # TaskRouter（ルーティングエンジン）
│   ├── provider-factory.ts         # ProviderFactory（設定からインスタンス生成）
│   ├── rate-limiter.ts             # 共通レート制限ユーティリティ
│   ├── utils/
│   │   └── json-parser.ts          # 共通JSONパーサー（4パターン対応）
│   └── index.ts                    # エクスポート
└── index.ts                        # パッケージエントリポイント更新
```

### 3.2 LLMProvider インターフェース設計

```typescript
// packages/miyabi-agent-sdk/src/providers/types.ts

/**
 * LLM Provider の共通インターフェース
 *
 * 設計方針:
 * - Claude Code（司令塔）と Codex（ワーカー）の両方を統一的に扱う
 * - タスクタイプごとに最適な Provider に自動ルーティング
 * - フォールバック対応（CLI不可時は API に fallback）
 */
export interface LLMProvider {
  /** プロバイダー名 */
  readonly name: 'claude-cli' | 'codex-cli' | 'anthropic-api';

  /** プロバイダーが利用可能かチェック（CLIインストール確認等） */
  isAvailable(): Promise<boolean>;

  /** 汎用テキスト生成 */
  generate(request: GenerateRequest): Promise<GenerateResponse>;

  /** Issue 分析（司令塔タスク） */
  analyzeIssue(issue: IssueAnalysisRequest): Promise<IssueAnalysisResponse>;

  /** コード生成（ワーカータスク） */
  generateCode(request: CodeGenRequest): Promise<CodeGenResponse>;

  /** コードレビュー（ワーカータスク） */
  reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse>;

  /** タスク分解（司令塔タスク） */
  decompose(request: DecomposeRequest): Promise<DecomposeResponse>;
}

// ── タスクタイプ定義 ──

export type TaskType =
  // 司令塔タスク（Claude Code）
  | 'issue-analysis'
  | 'task-decomposition'
  | 'labeling'
  | 'pr-creation'
  | 'deploy-decision'
  | 'business-analysis'
  | 'documentation'
  | 'general-analysis'
  // ワーカータスク（Codex）
  | 'code-generation'
  | 'code-review'
  | 'test-generation'
  | 'refactoring'
  | 'bug-fix'
  | 'architecture-review'
  | 'codebase-exploration';

// ── Codex エージェントタイプ ──

export type CodexAgentType = 'default' | 'worker' | 'reviewer' | 'architect' | 'explorer';

// ── リクエスト/レスポンス型 ──

export interface GenerateRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  outputFormat?: 'text' | 'json';
  timeout?: number;
  workingDir?: string;
  /** Codex専用: 使用するエージェント */
  codexAgent?: CodexAgentType;
  /** Codex専用: 承認ポリシー */
  approvalPolicy?: 'on-request' | 'auto-edit' | 'full-auto';
}

export interface GenerateResponse {
  content: string;
  provider: string;
  model?: string;
  tokensUsed?: { input: number; output: number };
  cost: number;           // CLI利用時は常に 0
  durationMs?: number;
  sessionId?: string;     // Claude CLI のセッション管理用
  filesChanged?: string[]; // Codex がファイル変更した場合のパス一覧
}

export interface IssueAnalysisRequest {
  title: string;
  body: string;
  number?: number;
}

export interface IssueAnalysisResponse {
  type: string;
  complexity: 'small' | 'medium' | 'large' | 'xlarge';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  labels: string[];
  relatedFiles?: string[];
  reasoning?: string;
  tokensUsed?: { input: number; output: number };
  cost: number;
}

export interface CodeGenRequest {
  requirements: string;
  context: string;
  language?: string;
  existingFiles?: Array<{ path: string; content: string }>;
  /** Codex で直接ファイル書き込みするか（true推奨） */
  directWrite?: boolean;
}

export interface CodeGenResponse {
  files: Array<{
    path: string;
    content: string;
    action: 'create' | 'modify' | 'delete';
  }>;
  tests: Array<{
    path: string;
    content: string;
    action: 'create' | 'modify' | 'delete';
  }>;
  qualityScore: number;
  tokensUsed?: { input: number; output: number };
  cost: number;
}

export interface CodeReviewRequest {
  files: Array<{ path: string; content: string }>;
  standards?: {
    minQualityScore?: number;
    requireTests?: boolean;
    securityScan?: boolean;
  };
}

export interface CodeReviewResponse {
  qualityScore: number;
  passed: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    file: string;
    line?: number;
    message: string;
  }>;
  suggestions: string[];
  tokensUsed?: { input: number; output: number };
  cost: number;
}

export interface DecomposeRequest {
  prompt: string;
  context?: string;
  constraints?: string[];
  maxTasks?: number;
}

export interface DecomposeResponse {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    agent: string;
    dependencies: string[];
    estimatedMinutes: number;
  }>;
  dag: Array<{ from: string; to: string }>;
  totalEstimatedMinutes: number;
}

// ── Provider 設定 ──

export interface ProviderConfig {
  type: 'claude-cli' | 'codex-cli' | 'anthropic-api';
  enabled: boolean;
  timeout?: number;
  maxRetries?: number;
  options?: Record<string, unknown>;
}

export interface RoutingConfig {
  routes: Record<TaskType, 'claude-cli' | 'codex-cli'>;
  fallback: 'claude-cli' | 'codex-cli' | 'anthropic-api';
  fallbackOrder: Array<'claude-cli' | 'codex-cli' | 'anthropic-api'>;
}
```

### 3.3 既存コードへの変更差分

#### (A) BusinessBaseAgent の変更

**ファイル**: `packages/core/src/business-base-agent.ts`

```diff
- import Anthropic from '@anthropic-ai/sdk';
+ import type { LLMProvider, GenerateRequest, GenerateResponse } from '@agentic-os/miyabi-agent-sdk/providers';

  export interface BusinessAgentConfig {
-   anthropicApiKey: string;
+   llmProvider: LLMProvider;      // API Key ではなく Provider を注入
    githubToken?: string;
    debug?: boolean;
    logDirectory?: string;
  }

  export abstract class BusinessBaseAgent {
    protected config: BusinessAgentConfig;
-   protected anthropic: Anthropic;
+   protected llmProvider: LLMProvider;
    protected agentType: string;

    constructor(config: BusinessAgentConfig, agentType: string) {
      this.config = config;
      this.agentType = agentType;
-     this.anthropic = new Anthropic({
-       apiKey: config.anthropicApiKey,
-     });
+     this.llmProvider = config.llmProvider;
    }

    /**
-    * Claude API 呼び出し
+    * LLM Provider 経由でプロンプト実行
     */
-   protected async callClaude(prompt: string, systemPrompt?: string): Promise<string> {
-     const response = await this.anthropic.messages.create({
-       model: 'claude-sonnet-4-20250514',
-       max_tokens: 8192,
-       system: systemPrompt || '',
-       messages: [{ role: 'user', content: prompt }],
-     });
-     const content = response.content[0];
-     if (content.type !== 'text') throw new Error('Unexpected response type');
-     return content.text;
+   protected async callLLM(prompt: string, systemPrompt?: string): Promise<string> {
+     const response = await this.llmProvider.generate({
+       prompt,
+       systemPrompt,
+       outputFormat: 'text',
+       timeout: 120_000,
+     });
+     return response.content;
    }
  }
```

#### (B) LLMDecomposer の変更

**ファイル**: `packages/task-manager/src/decomposition/llm-decomposer.ts`

```diff
- import Anthropic from '@anthropic-ai/sdk';
+ import type { LLMProvider } from '@agentic-os/miyabi-agent-sdk/providers';

  export class LLMDecomposer {
-   private client: Anthropic;
-   private config: LLMConfig;
+   private provider: LLMProvider;
    private validator: DecompositionValidator;

-   constructor(config: LLMConfig) {
-     if (config.provider !== 'anthropic') {
-       throw new Error('Only Anthropic provider is currently supported');
-     }
-     this.config = config;
-     this.client = new Anthropic({ apiKey: config.apiKey });
+   constructor(provider: LLMProvider) {
+     this.provider = provider;
      this.validator = new DecompositionValidator();
    }

    async decompose(request: DecompositionRequest): Promise<DecompositionResult> {
      const startTime = Date.now();
      const warnings: DecompositionWarning[] = [];

      const userPrompt = request.context || request.constraints
        ? buildDecompositionPrompt(request)
        : buildSimplePrompt(request.prompt);

-     const response = await this.client.messages.create({
-       model: this.config.model,
-       max_tokens: this.config.maxTokens,
-       system: SYSTEM_PROMPT,
-       messages: [{ role: 'user', content: userPrompt }],
-     });
+     const response = await this.provider.generate({
+       prompt: userPrompt,
+       systemPrompt: SYSTEM_PROMPT,
+       outputFormat: 'json',
+       timeout: 60_000,
+     });

-     const content = response.content[0];
-     if (content.type !== 'text') throw new Error('Unexpected response type');
-     const text = content.text;
+     const text = response.content;

      // 以降の parsing/validation ロジックは変更なし
      ...
    }
  }
```

### 3.4 フェーズ別実装計画

```
Phase 1: 基盤（2日）
├── providers/types.ts         - 全インターフェース・型定義
├── providers/utils/json-parser.ts - 共通JSONパーサー（既存ロジック抽出）
├── providers/rate-limiter.ts  - 共通レート制限ユーティリティ
└── providers/index.ts         - エクスポート設定

Phase 2: Claude Code Provider（2日）
├── providers/claude-cli-provider.ts  - 既存 ClaudeCodeClient ベースで拡張
└── テスト + 動作確認

Phase 3: Codex Provider（3日）★最重要
├── providers/codex-cli-provider.ts   - 完全新規実装
├── .codex/ 設定との連携
└── テスト + 動作確認

Phase 4: 統合（3日）
├── providers/task-router.ts          - ルーティングエンジン
├── providers/provider-factory.ts     - 設定ベースのインスタンス生成
├── BusinessBaseAgent 移行            - callClaude → callLLM
├── LLMDecomposer 移行               - Anthropic SDK → LLMProvider
└── 統合テスト

合計: 10日
```

---

## 4. Codex CLI 呼び出し方法

### 4.1 基本コマンド構文

既存の `.codex/config.toml` から読み取った設定に基づく。

```bash
# 基本実行（非対話モード）
codex -p "プロンプトテキスト"

# エージェント指定
codex --agent worker -p "認証ミドルウェアを実装してください"
codex --agent reviewer -p "src/auth.ts をレビューしてください"
codex --agent architect -p "パッケージ境界を分析してください"
codex --agent explorer -p "プロジェクト構造をマッピングしてください"

# 承認ポリシー指定（自動化に必須）
codex --approval-policy full-auto -p "テストを追加してください"
codex --approval-policy auto-edit -p "リファクタリングしてください"

# 作業ディレクトリ指定
codex --cd /path/to/project -p "このプロジェクトのバグを修正してください"

# モデル指定（config.toml のデフォルトを上書き）
codex --model gpt-5.4 -p "複雑なアルゴリズムを実装してください"
codex --model gpt-5.4-mini -p "ユーティリティ関数を作成してください"
```

### 4.2 .codex/ 既存設定の活用

Miyabi リポジトリには以下のエージェント設定が既に存在する:

| エージェント | 設定ファイル | モデル | reasoning_effort | 主な用途 |
|---|---|---|---|---|
| `default` | `.codex/agents/default.toml` | gpt-5.4 | medium | 汎用タスク |
| `worker` | `.codex/agents/worker.toml` | gpt-5.4-mini | medium | 実装・ファイル編集（コスト効率重視） |
| `reviewer` | `.codex/agents/reviewer.toml` | gpt-5.4 | high | コードレビュー（精度重視） |
| `architect` | `.codex/agents/architect.toml` | gpt-5.4 | high | アーキテクチャ分析 |
| `explorer` | `.codex/agents/explorer.toml` | gpt-5.4-mini | medium | 読み取り専用の調査 |

#### config.toml の重要設定

```toml
# .codex/config.toml から抽出

[features]
multi_agent = true              # マルチエージェント有効 → 並列実行可能
unified_exec = true             # 統合実行
fast_mode = true                # 高速モード

[agents]
max_threads = 4                 # 最大4並列
max_depth = 2                   # サブエージェントのネスト深度
job_max_runtime_seconds = 1800  # 30分タイムアウト

[sandbox_workspace_write]
network_access = true           # ネットワークアクセス許可
```

### 4.3 タスク別の具体的なコマンド例

```bash
# ── コード生成 ──
codex --agent worker \
  --approval-policy full-auto \
  -p "packages/miyabi-agent-sdk/src/providers/codex-cli-provider.ts を作成してください。
      LLMProvider インターフェースを実装し、codex CLI を spawn で呼び出します。
      既存の ClaudeCodeClient.ts のパターンに従ってください。"

# ── コードレビュー ──
codex --agent reviewer \
  --approval-policy on-request \
  -p "packages/miyabi-agent-sdk/src/providers/ の全ファイルをレビューしてください。
      バグ、セキュリティ問題、不足テストに焦点を当ててください。
      出力は JSON 形式で: {qualityScore, passed, issues, suggestions}"

# ── テスト生成 ──
codex --agent worker \
  --approval-policy full-auto \
  -p "packages/miyabi-agent-sdk/src/providers/codex-cli-provider.ts のユニットテストを
      packages/miyabi-agent-sdk/src/providers/__tests__/codex-cli-provider.test.ts に作成してください。
      vitest を使用し、spawn のモックを含めてください。"

# ── リファクタリング ──
codex --agent worker \
  --approval-policy auto-edit \
  -p "packages/core/src/business-base-agent.ts を修正してください。
      Anthropic SDK の直接 import を削除し、
      LLMProvider インターフェースを依存性注入で受け取るように変更してください。"

# ── アーキテクチャ分析 ──
codex --agent architect \
  --approval-policy on-request \
  -p "packages/ のパッケージ間依存関係を分析し、
      循環依存やレイヤー違反がないか確認してください。"

# ── コードベース探索 ──
codex --agent explorer \
  --approval-policy on-request \
  -p "Anthropic SDK を直接 import しているファイルを全て特定し、
      各ファイルでの使用パターンをリストアップしてください。"
```

### 4.4 Codex 出力のパース戦略

Codex CLI は Claude Code CLI の `--output-format json` のような構造化出力オプションを持たない。
そのため、以下の戦略でパースする:

```typescript
/**
 * Codex CLI 出力パース戦略
 *
 * 1. プロンプトで JSON 出力を明示的に要求
 * 2. stdout からの JSON 抽出（```json ブロック or { } 検出）
 * 3. ファイル変更の場合は git diff でパース
 */

// 方法1: プロンプトで JSON を要求
const prompt = `...
出力は以下の JSON 形式のみで回答してください。他のテキストは含めないでください:
{
  "qualityScore": 85,
  "passed": true,
  "issues": [...],
  "suggestions": [...]
}`;

// 方法2: git diff ベースのファイル変更検出
async function detectCodexFileChanges(cwd: string): Promise<string[]> {
  const { stdout } = await execAsync('git diff --name-only', { cwd });
  return stdout.trim().split('\n').filter(Boolean);
}

// 方法3: Codex の直接ファイル操作後に結果を検証
async function verifyCodexOutput(cwd: string): Promise<{
  filesChanged: string[];
  buildPassed: boolean;
  testsPassed: boolean;
}> {
  const filesChanged = await detectCodexFileChanges(cwd);

  // ビルド検証
  let buildPassed = false;
  try {
    await execAsync('npm run build', { cwd, timeout: 60_000 });
    buildPassed = true;
  } catch { /* build failed */ }

  // テスト検証
  let testsPassed = false;
  try {
    await execAsync('npm test', { cwd, timeout: 120_000 });
    testsPassed = true;
  } catch { /* tests failed */ }

  return { filesChanged, buildPassed, testsPassed };
}
```

---

## 5. 具体的なコード例

### 5.1 CodexClient.ts 完全実装

```typescript
// packages/miyabi-agent-sdk/src/providers/codex-cli-provider.ts

import { spawn, execSync } from 'child_process';
import type {
  LLMProvider,
  GenerateRequest,
  GenerateResponse,
  IssueAnalysisRequest,
  IssueAnalysisResponse,
  CodeGenRequest,
  CodeGenResponse,
  CodeReviewRequest,
  CodeReviewResponse,
  DecomposeRequest,
  DecomposeResponse,
  CodexAgentType,
} from './types.js';
import { parseFlexibleJSON } from './utils/json-parser.js';
import { RateLimiter } from './rate-limiter.js';

// ── 設定型 ──

export interface CodexCLIProviderOptions {
  /** codex コマンドのパス（デフォルト: 'codex'） */
  command?: string;
  /** デフォルトタイムアウト（ms）。Codex はファイル操作を含むため長め */
  defaultTimeout?: number;
  /** デフォルトのエージェント */
  defaultAgent?: CodexAgentType;
  /** デフォルトの承認ポリシー */
  defaultApprovalPolicy?: 'on-request' | 'auto-edit' | 'full-auto';
  /** デフォルトモデル */
  model?: string;
  /** 作業ディレクトリ（.codex/config.toml があるリポジトリルート） */
  repoRoot?: string;
  /** レート制限: 最大同時実行数 */
  maxConcurrent?: number;
  /** レート制限: 最小実行間隔（ms） */
  minIntervalMs?: number;
}

// ── タスクタイプ → Codex エージェント マッピング ──

const TASK_TO_CODEX_AGENT: Record<string, CodexAgentType> = {
  'code-generation':      'worker',
  'test-generation':      'worker',
  'refactoring':          'worker',
  'bug-fix':              'worker',
  'code-review':          'reviewer',
  'architecture-review':  'architect',
  'codebase-exploration': 'explorer',
};

const TASK_TO_APPROVAL_POLICY: Record<string, string> = {
  'code-generation':      'full-auto',
  'test-generation':      'full-auto',
  'refactoring':          'auto-edit',
  'bug-fix':              'auto-edit',
  'code-review':          'on-request',
  'architecture-review':  'on-request',
  'codebase-exploration': 'on-request',
};

// ── Provider 実装 ──

export class CodexCLIProvider implements LLMProvider {
  readonly name = 'codex-cli' as const;

  private command: string;
  private defaultTimeout: number;
  private defaultAgent: CodexAgentType;
  private defaultApprovalPolicy: string;
  private model?: string;
  private repoRoot?: string;
  private rateLimiter: RateLimiter;

  constructor(options?: CodexCLIProviderOptions) {
    this.command = options?.command ?? 'codex';
    this.defaultTimeout = options?.defaultTimeout ?? 300_000; // 5分（ファイル操作含む）
    this.defaultAgent = options?.defaultAgent ?? 'worker';
    this.defaultApprovalPolicy = options?.defaultApprovalPolicy ?? 'full-auto';
    this.model = options?.model;
    this.repoRoot = options?.repoRoot;
    this.rateLimiter = new RateLimiter({
      maxConcurrent: options?.maxConcurrent ?? 2,   // Codex は並列2まで
      minIntervalMs: options?.minIntervalMs ?? 3000, // 3秒間隔
    });
  }

  // ── isAvailable ──

  async isAvailable(): Promise<boolean> {
    try {
      execSync(`${this.command} --version`, {
        encoding: 'utf-8',
        timeout: 10_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return true;
    } catch {
      return false;
    }
  }

  // ── generate（汎用） ──

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    return this.rateLimiter.execute(async () => {
      const agent = request.codexAgent ?? this.defaultAgent;
      const approvalPolicy = request.approvalPolicy ?? this.defaultApprovalPolicy;
      const startTime = Date.now();

      const args = this.buildArgs({
        agent,
        approvalPolicy,
        model: this.model,
        prompt: request.prompt,
      });

      const result = await this.spawnCodex(args, {
        cwd: request.workingDir ?? this.repoRoot,
        timeout: request.timeout ?? this.defaultTimeout,
      });

      return {
        content: result.stdout,
        provider: this.name,
        model: this.model ?? 'gpt-5.4',
        cost: 0,
        durationMs: Date.now() - startTime,
        filesChanged: result.filesChanged,
      };
    });
  }

  // ── analyzeIssue（Codex は通常使わないが、フォールバック対応） ──

  async analyzeIssue(issue: IssueAnalysisRequest): Promise<IssueAnalysisResponse> {
    const prompt = `以下のGitHub Issueを解析してください。JSON形式のみで回答してください。

Issue ${issue.number ? `#${issue.number}: ` : ''}${issue.title}

${issue.body || '(本文なし)'}

出力形式:
{
  "type": "bug|feature|refactor|docs|test|chore",
  "complexity": "small|medium|large|xlarge",
  "priority": "P0|P1|P2|P3",
  "labels": ["type:bug", "priority:P1-High"],
  "relatedFiles": ["src/example.ts"],
  "reasoning": "判定理由"
}`;

    const response = await this.generate({
      prompt,
      codexAgent: 'explorer',
      approvalPolicy: 'on-request',
      timeout: 60_000,
    });

    const parsed = parseFlexibleJSON(response.content);

    return {
      type: parsed.type ?? 'feature',
      complexity: parsed.complexity ?? 'medium',
      priority: parsed.priority ?? 'P2',
      labels: parsed.labels ?? [],
      relatedFiles: parsed.relatedFiles,
      reasoning: parsed.reasoning,
      cost: 0,
    };
  }

  // ── generateCode（Codex のメイン機能） ──

  async generateCode(request: CodeGenRequest): Promise<CodeGenResponse> {
    // Codex の強み: 直接ファイル操作
    if (request.directWrite !== false) {
      return this.generateCodeWithDirectWrite(request);
    }
    return this.generateCodeWithJSONOutput(request);
  }

  /**
   * 直接ファイル書き込みモード（推奨）
   *
   * Codex にファイルを直接作成・編集させ、
   * git diff で変更結果を取得する。
   */
  private async generateCodeWithDirectWrite(
    request: CodeGenRequest
  ): Promise<CodeGenResponse> {
    const prompt = `以下の要件に基づいて、${request.language ?? 'TypeScript'} のコードを実装してください。

# 要件
${request.requirements}

# コンテキスト
${request.context}

# 指示
- ファイルを直接作成・編集してください
- テストファイルも同時に作成してください
- 実装完了後、npm run build && npm test を実行して動作確認してください`;

    const cwd = request.workingDir ?? this.repoRoot ?? process.cwd();

    // git stash で現在の変更を退避（Codex の変更を分離するため）
    let stashed = false;
    try {
      const stashResult = execSync('git stash', { cwd, encoding: 'utf-8' });
      stashed = !stashResult.includes('No local changes');
    } catch {
      // stash 失敗は無視
    }

    try {
      const response = await this.generate({
        prompt,
        codexAgent: 'worker',
        approvalPolicy: 'full-auto',
        timeout: 600_000, // 10分（実装+テスト実行）
        workingDir: cwd,
      });

      // git diff で変更されたファイルを取得
      const filesChanged = response.filesChanged ?? [];

      // 変更されたファイルの内容を読み取り
      const files: CodeGenResponse['files'] = [];
      const tests: CodeGenResponse['tests'] = [];

      for (const filePath of filesChanged) {
        try {
          const content = execSync(`git show :${filePath}`, {
            cwd,
            encoding: 'utf-8',
          });

          const entry = { path: filePath, content, action: 'create' as const };

          if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) {
            tests.push(entry);
          } else {
            files.push(entry);
          }
        } catch {
          // ファイル読み取り失敗は無視
        }
      }

      return {
        files,
        tests,
        qualityScore: 80, // Codex 直接実行は品質スコアを後でレビューで判定
        cost: 0,
      };
    } finally {
      // stash を復元
      if (stashed) {
        try {
          execSync('git stash pop', { cwd, encoding: 'utf-8' });
        } catch { /* stash pop 失敗は無視 */ }
      }
    }
  }

  /**
   * JSON 出力モード（フォールバック）
   */
  private async generateCodeWithJSONOutput(
    request: CodeGenRequest
  ): Promise<CodeGenResponse> {
    const existingFilesStr = request.existingFiles
      ?.map(f => `## ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n') ?? '';

    const prompt = `以下の要件に基づいてコードを生成してください。JSON形式のみで回答してください。

# 要件
${request.requirements}

# コンテキスト
${request.context}

${existingFilesStr ? `# 既存ファイル\n${existingFilesStr}` : ''}

出力形式:
{
  "files": [{"path": "src/example.ts", "content": "...", "action": "create"}],
  "tests": [{"path": "src/example.test.ts", "content": "...", "action": "create"}],
  "qualityScore": 85
}`;

    const response = await this.generate({
      prompt,
      codexAgent: 'worker',
      approvalPolicy: 'on-request',
      timeout: 180_000,
    });

    const parsed = parseFlexibleJSON(response.content);

    return {
      files: parsed.files ?? [],
      tests: parsed.tests ?? [],
      qualityScore: parsed.qualityScore ?? 70,
      cost: 0,
    };
  }

  // ── reviewCode（Codex reviewer エージェント） ──

  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    const filesContent = request.files
      .map(f => `## ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');

    const prompt = `以下のコードをレビューしてください。JSON形式のみで回答してください。

# コード
${filesContent}

# 品質基準
- 最低品質スコア: ${request.standards?.minQualityScore ?? 80}
- テスト必須: ${request.standards?.requireTests !== false ? 'はい' : 'いいえ'}
- セキュリティスキャン: ${request.standards?.securityScan !== false ? 'はい' : 'いいえ'}

# レビュー観点（reviewer.toml準拠）
- バグ、リグレッション、セキュリティ問題を最優先
- 具体的なファイルパスと行番号を示す
- スタイルの指摘よりもリスクのある問題に集中

出力形式:
{
  "qualityScore": 85,
  "passed": true,
  "issues": [{"severity": "error|warning|info", "file": "path", "line": 42, "message": "説明"}],
  "suggestions": ["改善提案"]
}`;

    const response = await this.generate({
      prompt,
      codexAgent: 'reviewer',
      approvalPolicy: 'on-request',
      timeout: 120_000,
    });

    const parsed = parseFlexibleJSON(response.content);

    return {
      qualityScore: parsed.qualityScore ?? 0,
      passed: parsed.passed ?? false,
      issues: parsed.issues ?? [],
      suggestions: parsed.suggestions ?? [],
      cost: 0,
    };
  }

  // ── decompose（Codex は通常使わないが、フォールバック対応） ──

  async decompose(request: DecomposeRequest): Promise<DecomposeResponse> {
    const prompt = `以下のプロンプトを実行可能なタスクに分解してください。JSON形式のみで回答してください。

# プロンプト
${request.prompt}

${request.context ? `# コンテキスト\n${request.context}` : ''}

出力形式:
{
  "tasks": [{"id": "task-1", "title": "...", "description": "...", "type": "code", "agent": "codegen", "dependencies": [], "estimatedMinutes": 30}],
  "dag": [{"from": "task-1", "to": "task-2"}],
  "totalEstimatedMinutes": 60
}`;

    const response = await this.generate({
      prompt,
      codexAgent: 'architect',
      approvalPolicy: 'on-request',
      timeout: 90_000,
    });

    const parsed = parseFlexibleJSON(response.content);

    return {
      tasks: parsed.tasks ?? [],
      dag: parsed.dag ?? [],
      totalEstimatedMinutes: parsed.totalEstimatedMinutes ?? 0,
    };
  }

  // ── Private methods ──

  private buildArgs(options: {
    agent?: CodexAgentType;
    approvalPolicy?: string;
    model?: string;
    prompt: string;
  }): string[] {
    const args: string[] = [];

    // エージェント指定
    if (options.agent && options.agent !== 'default') {
      args.push('--agent', options.agent);
    }

    // 承認ポリシー
    if (options.approvalPolicy) {
      args.push('--approval-policy', options.approvalPolicy);
    }

    // モデル指定
    if (options.model) {
      args.push('--model', options.model);
    }

    // プロンプト
    args.push('-p', options.prompt);

    return args;
  }

  private async spawnCodex(
    args: string[],
    options: { cwd?: string; timeout: number }
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    filesChanged?: string[];
  }> {
    // Codex 実行前の git status を記録
    let filesBefore: string[] = [];
    const cwd = options.cwd ?? process.cwd();
    try {
      const statusBefore = execSync('git status --porcelain', {
        cwd,
        encoding: 'utf-8',
      });
      filesBefore = statusBefore.trim().split('\n').filter(Boolean);
    } catch {
      // git status 失敗は無視
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(this.command, args, {
        cwd,
        shell: false,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
          // Codex が .codex/config.toml を読み込めるようにする
          CODEX_PROJECT_ROOT: cwd,
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        proc.kill('SIGTERM');
        // SIGTERM で終了しない場合は SIGKILL
        setTimeout(() => proc.kill('SIGKILL'), 5000);
        reject(new Error(
          `Codex CLI timed out after ${options.timeout}ms. ` +
          `Agent: ${args.find((_, i, a) => a[i - 1] === '--agent') ?? 'default'}`
        ));
      }, options.timeout);

      proc.on('close', (code: number | null) => {
        clearTimeout(timeoutId);

        // Codex 実行後のファイル変更を検出
        let filesChanged: string[] | undefined;
        try {
          const statusAfter = execSync('git status --porcelain', {
            cwd,
            encoding: 'utf-8',
          });
          const filesAfter = statusAfter.trim().split('\n').filter(Boolean);
          filesChanged = filesAfter
            .filter(f => !filesBefore.includes(f))
            .map(f => f.slice(3).trim()); // " M src/file.ts" → "src/file.ts"
        } catch {
          // git status 失敗は無視
        }

        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 1,
          filesChanged,
        });
      });

      proc.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn Codex CLI: ${error.message}`));
      });
    });
  }
}
```

### 5.2 TaskRouter.ts 完全実装

```typescript
// packages/miyabi-agent-sdk/src/providers/task-router.ts

import type {
  LLMProvider,
  TaskType,
  RoutingConfig,
  CodexAgentType,
} from './types.js';

// ── デフォルトルーティング設定 ──

/**
 * 司令塔（Claude Code） vs ワーカー（Codex） のデフォルトルーティング
 *
 * 原則:
 * - "考える・分析する・判断する・文書を書く" → Claude Code
 * - "コードを書く・レビューする・テストを書く" → Codex
 */
export const DEFAULT_ROUTING: RoutingConfig = {
  routes: {
    // ── 司令塔タスク（Claude Code） ──
    'issue-analysis':      'claude-cli',
    'task-decomposition':  'claude-cli',
    'labeling':            'claude-cli',
    'pr-creation':         'claude-cli',
    'deploy-decision':     'claude-cli',
    'business-analysis':   'claude-cli',
    'documentation':       'claude-cli',
    'general-analysis':    'claude-cli',

    // ── ワーカータスク（Codex） ──
    'code-generation':     'codex-cli',
    'code-review':         'codex-cli',
    'test-generation':     'codex-cli',
    'refactoring':         'codex-cli',
    'bug-fix':             'codex-cli',
    'architecture-review': 'codex-cli',
    'codebase-exploration':'codex-cli',
  },
  fallback: 'claude-cli', // Codex 不可時は Claude Code がフォールバック
  fallbackOrder: ['claude-cli', 'codex-cli', 'anthropic-api'],
};

// ── Codex エージェント自動選択 ──

const TASK_TO_CODEX_AGENT: Partial<Record<TaskType, CodexAgentType>> = {
  'code-generation':      'worker',
  'test-generation':      'worker',
  'refactoring':          'worker',
  'bug-fix':              'worker',
  'code-review':          'reviewer',
  'architecture-review':  'architect',
  'codebase-exploration': 'explorer',
};

// ── TaskRouter クラス ──

export class TaskRouter {
  private providers = new Map<string, LLMProvider>();
  private routing: RoutingConfig;

  constructor(routing?: Partial<RoutingConfig>) {
    this.routing = {
      ...DEFAULT_ROUTING,
      ...routing,
      routes: { ...DEFAULT_ROUTING.routes, ...routing?.routes },
      fallbackOrder: routing?.fallbackOrder ?? DEFAULT_ROUTING.fallbackOrder,
    };
  }

  /**
   * プロバイダーを登録
   */
  registerProvider(type: 'claude-cli' | 'codex-cli' | 'anthropic-api', provider: LLMProvider): void {
    this.providers.set(type, provider);
  }

  /**
   * タスクタイプに応じた最適なプロバイダーを取得
   *
   * フォールバック戦略:
   * 1. ルーティング設定の優先プロバイダーを試行
   * 2. 利用不可なら fallbackOrder に従って代替を検索
   * 3. 全て利用不可ならエラー
   */
  async getProvider(taskType: TaskType): Promise<LLMProvider> {
    const preferredType = this.routing.routes[taskType] ?? this.routing.fallback;
    const preferred = this.providers.get(preferredType);

    if (preferred && await preferred.isAvailable()) {
      return preferred;
    }

    // フォールバック
    for (const type of this.routing.fallbackOrder) {
      if (type === preferredType) continue; // 既に試行済み
      const provider = this.providers.get(type);
      if (provider && await provider.isAvailable()) {
        console.warn(
          `[TaskRouter] "${preferredType}" unavailable for "${taskType}", ` +
          `falling back to "${type}"`
        );
        return provider;
      }
    }

    throw new Error(
      `No available LLM provider for task type "${taskType}". ` +
      `Tried: ${[preferredType, ...this.routing.fallbackOrder].join(', ')}`
    );
  }

  /**
   * タスクタイプに応じた Codex エージェントを取得
   */
  getCodexAgent(taskType: TaskType): CodexAgentType | undefined {
    return TASK_TO_CODEX_AGENT[taskType];
  }

  /**
   * 司令塔タスクかワーカータスクかを判定
   */
  isCommanderTask(taskType: TaskType): boolean {
    return this.routing.routes[taskType] === 'claude-cli';
  }

  isWorkerTask(taskType: TaskType): boolean {
    return this.routing.routes[taskType] === 'codex-cli';
  }

  /**
   * 全プロバイダーの可用性チェック
   */
  async healthCheck(): Promise<Record<string, { available: boolean; name: string }>> {
    const results: Record<string, { available: boolean; name: string }> = {};
    for (const [type, provider] of this.providers) {
      try {
        results[type] = {
          available: await provider.isAvailable(),
          name: provider.name,
        };
      } catch {
        results[type] = { available: false, name: provider.name };
      }
    }
    return results;
  }

  /**
   * ルーティング設定のサマリーを表示
   */
  getRoutingSummary(): Record<string, string> {
    const summary: Record<string, string> = {};
    for (const [taskType, providerType] of Object.entries(this.routing.routes)) {
      const codexAgent = TASK_TO_CODEX_AGENT[taskType as TaskType];
      summary[taskType] = codexAgent
        ? `${providerType} (agent: ${codexAgent})`
        : providerType;
    }
    return summary;
  }
}
```

### 5.3 RateLimiter.ts 共通ユーティリティ

```typescript
// packages/miyabi-agent-sdk/src/providers/rate-limiter.ts

/**
 * CLI 呼び出し用の共通レート制限ユーティリティ
 *
 * Claude Code / Codex 双方のレート制限に対応。
 * 優先度キューで重要タスクを先に実行。
 */
export interface RateLimiterOptions {
  /** 最大同時実行数（Claude Code: 1推奨, Codex: 2推奨） */
  maxConcurrent: number;
  /** 最小実行間隔（ms）（Claude Code: 2000, Codex: 3000） */
  minIntervalMs: number;
}

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  priority: number;
}

export class RateLimiter {
  private queue: QueueItem<unknown>[] = [];
  private running = 0;
  private maxConcurrent: number;
  private minIntervalMs: number;
  private lastCallTime = 0;

  constructor(options: RateLimiterOptions) {
    this.maxConcurrent = options.maxConcurrent;
    this.minIntervalMs = options.minIntervalMs;
  }

  /**
   * レート制限付きで関数を実行
   *
   * @param fn 実行する非同期関数
   * @param priority 優先度（大きいほど先に実行。デフォルト: 0）
   */
  async execute<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
      });
      // 優先度降順でソート
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
  }

  /**
   * 現在のキュー長を取得
   */
  get queueLength(): number {
    return this.queue.length;
  }

  /**
   * 現在の同時実行数を取得
   */
  get activeCount(): number {
    return this.running;
  }

  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;

    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    if (elapsed < this.minIntervalMs) {
      setTimeout(() => this.processQueue(), this.minIntervalMs - elapsed);
      return;
    }

    const item = this.queue.shift()!;
    this.running++;
    this.lastCallTime = Date.now();

    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (error) {
      item.reject(error as Error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}
```

### 5.4 ProviderFactory.ts

```typescript
// packages/miyabi-agent-sdk/src/providers/provider-factory.ts

import type { LLMProvider, ProviderConfig, RoutingConfig } from './types.js';
import { ClaudeCLIProvider, type ClaudeCLIProviderOptions } from './claude-cli-provider.js';
import { CodexCLIProvider, type CodexCLIProviderOptions } from './codex-cli-provider.js';
import { AnthropicAPIProvider } from './anthropic-api-provider.js';
import { TaskRouter } from './task-router.js';

/**
 * .miyabi.yml の llm セクション型
 */
export interface LLMConfig {
  default_provider: string;
  providers: {
    'claude-cli'?: ProviderConfig & { command?: string; options?: Record<string, unknown> };
    'codex-cli'?: ProviderConfig & { command?: string; options?: Record<string, unknown> };
    'anthropic-api'?: ProviderConfig & { options?: Record<string, unknown> };
  };
  routing?: Partial<RoutingConfig['routes']>;
  fallback_order?: string[];
}

/**
 * ProviderFactory
 *
 * .miyabi.yml の設定から Provider インスタンスと TaskRouter を生成する。
 */
export class ProviderFactory {
  /**
   * 設定から TaskRouter を構築
   */
  static createRouter(config?: LLMConfig): TaskRouter {
    const router = new TaskRouter(config ? {
      routes: config.routing as RoutingConfig['routes'],
      fallbackOrder: config.fallback_order as RoutingConfig['fallbackOrder'],
    } : undefined);

    // Claude CLI Provider
    const claudeConfig = config?.providers?.['claude-cli'];
    if (!claudeConfig || claudeConfig.enabled !== false) {
      const claudeOptions: ClaudeCLIProviderOptions = {
        command: claudeConfig?.command ?? 'claude',
        defaultTimeout: claudeConfig?.timeout ?? 120_000,
        model: claudeConfig?.options?.model as string | undefined,
        maxConcurrent: 1,
        minIntervalMs: 2000,
      };
      router.registerProvider('claude-cli', new ClaudeCLIProvider(claudeOptions));
    }

    // Codex CLI Provider
    const codexConfig = config?.providers?.['codex-cli'];
    if (!codexConfig || codexConfig.enabled !== false) {
      const codexOptions: CodexCLIProviderOptions = {
        command: codexConfig?.command ?? 'codex',
        defaultTimeout: codexConfig?.timeout ?? 300_000,
        defaultApprovalPolicy: (codexConfig?.options?.approval_policy as string) ?? 'full-auto',
        maxConcurrent: 2,
        minIntervalMs: 3000,
      };
      router.registerProvider('codex-cli', new CodexCLIProvider(codexOptions));
    }

    // Anthropic API Provider（フォールバック）
    const apiConfig = config?.providers?.['anthropic-api'];
    if (apiConfig?.enabled) {
      router.registerProvider('anthropic-api', new AnthropicAPIProvider({
        model: apiConfig.options?.model as string | undefined,
        maxTokens: apiConfig.options?.max_tokens as number | undefined,
      }));
    }

    return router;
  }

  /**
   * デフォルト設定で TaskRouter を構築（設定ファイルなし環境用）
   */
  static createDefaultRouter(): TaskRouter {
    return ProviderFactory.createRouter();
  }
}
```

### 5.5 .miyabi.yml 設定例

```yaml
# .miyabi.yml - Claude司令塔 + Codexワーカー 設定

# ── LLM プロバイダー設定 ──
llm:
  default_provider: claude-cli

  providers:
    # Claude Code CLI（司令塔）
    claude-cli:
      enabled: true
      command: claude
      timeout: 120000          # 2分
      max_retries: 2
      options:
        output_format: json
        # model はClaude Codeサブスクリプションのデフォルトを使用

    # Codex CLI（ワーカー）
    codex-cli:
      enabled: true
      command: codex
      timeout: 300000          # 5分（ファイル操作を含むため長め）
      max_retries: 1
      options:
        approval_policy: full-auto
        # エージェント設定は .codex/agents/*.toml を使用

    # Anthropic API（フォールバック / CI環境用）
    anthropic-api:
      enabled: false           # 通常は無効。CI/CD環境で必要時に有効化
      timeout: 60000
      max_retries: 3
      options:
        model: claude-sonnet-4-20250514
        max_tokens: 8192

  # タスクルーティング
  routing:
    # 司令塔タスク → Claude Code
    issue-analysis: claude-cli
    task-decomposition: claude-cli
    labeling: claude-cli
    pr-creation: claude-cli
    deploy-decision: claude-cli
    business-analysis: claude-cli
    documentation: claude-cli
    general-analysis: claude-cli
    # ワーカータスク → Codex
    code-generation: codex-cli
    code-review: codex-cli
    test-generation: codex-cli
    refactoring: codex-cli
    bug-fix: codex-cli
    architecture-review: codex-cli
    codebase-exploration: codex-cli

  # フォールバック順序
  fallback_order:
    - claude-cli
    - codex-cli
    - anthropic-api

# ── 既存設定 ──
github:
  token: ${GITHUB_TOKEN}

project:
  defaultLanguage: typescript

workflows:
  autoLabel: true
  autoReview: true

quality:
  minScore: 80
  requireTests: true
  maxRetries: 3
```

### 5.6 共通 JSON パーサー

```typescript
// packages/miyabi-agent-sdk/src/providers/utils/json-parser.ts

/**
 * 柔軟な JSON パーサー
 *
 * Claude Code / Codex の出力から JSON を抽出する4パターン対応。
 * 既存の AnthropicClient.parseJSON() と ClaudeCodeClient.parseJSON() を統合。
 */
export function parseFlexibleJSON(text: string): Record<string, unknown> {
  // Pattern 1: ```json ... ``` ブロック
  let match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch { /* next */ }
  }

  // Pattern 2: ``` ... ``` ブロック（言語指定なし）
  match = text.match(/```\s*([\s\S]*?)\s*```/);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch { /* next */ }
  }

  // Pattern 3: { ... } オブジェクト直接
  match = text.match(/(\{[\s\S]*\})/);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch { /* next */ }
  }

  // Pattern 4: 生テキスト
  try {
    return JSON.parse(text.trim());
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
      `Response (first 200 chars): ${text.slice(0, 200)}`
    );
  }
}
```

---

## 6. 実行フロー図

### 6.1 メインパイプライン

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Miyabi Autonomous Pipeline                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ① Issue 作成 (GitHub Webhook)                                       │
│     │                                                                │
│     ▼                                                                │
│  ② Claude Code CLI (CoordinatorAgent)                 [司令塔]       │
│     │  claude --output-format json -p "Issue分析..."                 │
│     │  → タスク分解 → DAG 構築                                       │
│     │  → 出力: { tasks: [...], dag: [...] }                          │
│     │                                                                │
│     ▼                                                                │
│  ③ Claude Code CLI (IssueAgent)                       [司令塔]       │
│     │  claude --system-prompt "53ラベル分類..." -p "..."             │
│     │  → 53 ラベル分類 → GitHub Labels API で適用                    │
│     │  → 出力: { labels: [...], priority: "P1" }                     │
│     │                                                                │
│     ▼                                                                │
│  ④ Codex CLI --agent worker (CodeGenAgent)            [ワーカー]     │
│     │  codex --agent worker --approval-policy full-auto \            │
│     │    -p "要件に基づいてコードを実装してください..."               │
│     │  → ファイル直接作成・編集                                      │
│     │  → ビルド確認 (npm run build)                                  │
│     │  → 出力: 変更されたファイル一覧                                │
│     │                                                                │
│     ▼                                                                │
│  ⑤ Codex CLI --agent reviewer (ReviewAgent)           [ワーカー]     │
│     │  codex --agent reviewer -p "コードをレビュー..."               │
│     │  → バグ・セキュリティ・テスト不足を検出                        │
│     │  → 出力: { qualityScore: 85, passed: true, issues: [...] }     │
│     │                                                                │
│     ├─── Score < 80 ───────────────────────────────┐                 │
│     │                                               │                │
│     │                                               ▼                │
│     │                              Codex CLI --agent worker          │
│     │                              (リトライ: 最大3回)               │
│     │                                               │                │
│     │◄──────────────────────────────────────────────┘                │
│     │                                                                │
│     ▼  Score >= 80                                                   │
│  ⑥ Codex CLI --agent worker (TestAgent)              [ワーカー]     │
│     │  codex --agent worker --approval-policy full-auto \            │
│     │    -p "テストを生成・実行してください..."                       │
│     │  → テストファイル生成 → npm test 実行                          │
│     │                                                                │
│     ▼                                                                │
│  ⑦ Claude Code CLI (PRAgent)                         [司令塔]       │
│     │  claude --output-format json -p "PR説明文を生成..."            │
│     │  → Conventional Commits 準拠の PR 作成                         │
│     │  → GitHub API で PR 作成                                       │
│     │                                                                │
│     ▼                                                                │
│  ⑧ Claude Code CLI (DeploymentAgent)                 [司令塔]       │
│     │  claude --output-format json -p "デプロイ可否を判断..."        │
│     │  → リスク評価 → デプロイ実行 or 差し戻し                       │
│     │                                                                │
│     ▼                                                                │
│  ⑨ 完了 → GitHub Issue Close + 通知                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 シーケンス図（テキスト版）

```
GitHub      Miyabi       Claude Code     Codex CLI      GitHub
Webhook   Orchestrator     (司令塔)       (ワーカー)       API
  │           │               │              │             │
  │──Issue──►│               │              │             │
  │           │               │              │             │
  │           │──analyze──►  │              │             │
  │           │  (Issue分析)  │              │             │
  │           │◄──JSON────── │              │             │
  │           │               │              │             │
  │           │──decompose──►│              │             │
  │           │  (タスク分解) │              │             │
  │           │◄──DAG─────── │              │             │
  │           │               │              │             │
  │           │──label──────►│              │             │
  │           │  (53ラベル)   │              │             │
  │           │◄──labels──── │──labels──────────────────►│
  │           │               │              │             │
  │           │──codegen─────────────────►  │             │
  │           │               │  (worker)    │             │
  │           │◄──files──────────────────── │             │
  │           │               │              │             │
  │           │──review──────────────────►  │             │
  │           │               │  (reviewer)  │             │
  │           │◄──score──────────────────── │             │
  │           │               │              │             │
  │           │  [score < 80? → retry]       │             │
  │           │               │              │             │
  │           │──test────────────────────►  │             │
  │           │               │  (worker)    │             │
  │           │◄──results────────────────── │             │
  │           │               │              │             │
  │           │──pr-text───►│              │             │
  │           │  (PR作成)     │              │             │
  │           │◄──PR body─── │──create PR───────────────►│
  │           │               │              │             │
  │           │──deploy?───►│              │             │
  │           │  (判断)       │              │             │
  │           │◄──decision── │              │             │
  │           │               │              │             │
  │           │──close issue─────────────────────────────►│
  │           │               │              │             │
```

### 6.3 ビジネスエージェント実行フロー

```
ビジネスタスク到着
    │
    ▼
┌─────────────────────────────────────┐
│  TaskRouter: business-analysis      │
│  → claude-cli（司令塔）             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Claude Code CLI                     │
│                                     │
│  claude --system-prompt              │
│    "あなたは${agentType}エージェント  │
│     以下のビジネスタスクを分析..."    │
│  --output-format json                │
│  -p "${task.description}"            │
│                                     │
│  14 エージェント全て同じパターン:     │
│  - StrategyAgent                     │
│  - MarketingAgent                    │
│  - SalesAgent                        │
│  - AnalyticsAgent                    │
│  - HR/Legal/Finance/Ops/...          │
└──────────────┬──────────────────────┘
               │
               ▼
        BusinessResult (JSON)
```

---

## 7. コスト分析

### 7.1 現状 vs 移行後

| 項目 | 現状 | 移行後 | 削減 |
|------|------|--------|------|
| **Anthropic API** | $400/月 | $0/月 | -$400/月 |
| **Claude Code Max** | - | $100/月 | +$100/月 |
| **Codex CLI** | - | $0/月 (*1) | $0/月 |
| **合計** | **$400/月** | **$100/月** | **-$300/月** |

(*1) Codex CLI のコストモデル:
- OpenAI Codex CLI は ChatGPT Plus/Pro/Team サブスクリプションに含まれる
- 現時点での月額は ChatGPT Pro: $200/月（無制限GPT-5.4アクセス）
- ただし、ChatGPT Plus ($20/月) でも Codex CLI は利用可能（レート制限あり）
- **要調査**: Codex CLI の正確なサブスクリプション要件とレート制限

### 7.2 年間コスト比較

| シナリオ | 月額 | 年額 | 現状からの年間削減 |
|----------|------|------|-------------------|
| **現状** (API $400) | $400 | $4,800 | - |
| **最小構成** (Claude Pro $20 + ChatGPT Plus $20) | $40 | $480 | **$4,320 (90%削減)** |
| **推奨構成** (Claude Max $100 + ChatGPT Plus $20) | $120 | $1,440 | **$3,360 (70%削減)** |
| **最大構成** (Claude Max $100 + ChatGPT Pro $200) | $300 | $3,600 | **$1,200 (25%削減)** |

### 7.3 コスト最適化の推奨

```
推奨構成: Claude Code Max ($100/月) + ChatGPT Plus ($20/月)
= $120/月 = $1,440/年

理由:
- Claude Code Max: 司令塔タスクに十分なレート制限
- ChatGPT Plus: Codex CLI の基本アクセス（worker/reviewer/architect/explorer）
- 年間 $3,360 の削減
- API キー管理のセキュリティリスク排除
```

---

## 8. リスクと対策

### 8.1 Codex CLI のレート制限

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Codex CLI の同時実行制限 | 高 | 高 | RateLimiter で maxConcurrent=2、minInterval=3s に制限 |
| 長時間タスクでのタイムアウト | 中 | 中 | `job_max_runtime_seconds=1800` (30分) を活用。タスクの粒度を小さく |
| サブスクリプション変更 | 高 | 低 | Anthropic API フォールバックを維持。`.miyabi.yml` で切替可能 |

**対策コード（RateLimiter 設定）**:

```typescript
// Claude Code: 保守的な設定
const claudeRateLimiter = new RateLimiter({
  maxConcurrent: 1,    // 1つずつ逐次実行
  minIntervalMs: 2000, // 2秒間隔
});

// Codex: やや緩い設定（.codex/config.toml の max_threads=4 に対応）
const codexRateLimiter = new RateLimiter({
  maxConcurrent: 2,    // 2つまで並列
  minIntervalMs: 3000, // 3秒間隔
});
```

### 8.2 出力フォーマットの差異

| リスク | 詳細 | 対策 |
|--------|------|------|
| Claude Code の JSON 出力が不安定 | `--output-format json` でもパース失敗の可能性 | 4パターン JSON パーサー (`parseFlexibleJSON`) で吸収 |
| Codex の出力が非構造化 | Codex は JSON 出力オプションがない | プロンプトで JSON を強制 + `parseFlexibleJSON` で抽出 |
| ファイル変更検出の精度 | Codex の直接ファイル操作で変更漏れ | `git status --porcelain` による前後差分比較 |

### 8.3 エラーハンドリング

```typescript
/**
 * エラーハンドリング戦略
 *
 * 1. CLI プロセスエラー → リトライ（最大3回）
 * 2. タイムアウト → SIGTERM → 5秒後 SIGKILL
 * 3. JSON パースエラー → 4パターンパーサー → 生テキスト返却
 * 4. Provider 不可 → フォールバック（claude-cli → codex-cli → anthropic-api）
 * 5. 全 Provider 不可 → エラー + 管理者通知
 */

// リトライラッパー
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; retryDelayMs: number; taskType: string }
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `[Retry] ${options.taskType} attempt ${attempt + 1}/${options.maxRetries + 1} failed: ` +
        `${lastError.message}`
      );

      if (attempt < options.maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, options.retryDelayMs * (attempt + 1)) // exponential backoff
        );
      }
    }
  }

  throw new Error(
    `${options.taskType} failed after ${options.maxRetries + 1} attempts. ` +
    `Last error: ${lastError?.message}`
  );
}
```

### 8.4 CLI インストール・可用性

| リスク | 対策 |
|--------|------|
| `claude` CLI 未インストール | `isAvailable()` で事前チェック → フォールバック |
| `codex` CLI 未インストール | `isAvailable()` で事前チェック → Claude Code にフォールバック |
| CI/CD 環境で CLI なし | `.miyabi.yml` で `anthropic-api.enabled: true` に切替 |
| Windows 環境での spawn 差異 | `shell: false` + `cross-spawn` パッケージ検討 |

### 8.5 移行リスク軽減策

```
段階的移行計画:

Week 1: Phase 1-2（基盤 + Claude CLI Provider）
  - 既存の AnthropicClient は残したまま新 Provider を追加
  - フィーチャーフラグ（MIYABI_USE_CLI=1）で切替可能に
  - 全既存テストが通ることを確認

Week 2: Phase 3（Codex Provider）
  - Codex Provider を追加
  - worker/reviewer エージェントのテスト
  - 既存ワークフローとの並行実行テスト

Week 3: Phase 4（統合 + 既存コード移行）
  - BusinessBaseAgent.callClaude → callLLM に移行
  - LLMDecomposer の Provider 注入に移行
  - 全パイプラインの E2E テスト

Week 4: 安定化 + ドキュメント
  - 本番切替
  - AnthropicClient はフォールバック用に維持（削除しない）
  - ANTHROPIC_API_KEY を必須から任意に変更
  - コスト監視の設定
```

---

## 付録: ファイル一覧と変更対象

### 新規作成ファイル

| ファイル | 説明 |
|----------|------|
| `providers/types.ts` | 全インターフェース・型定義 |
| `providers/claude-cli-provider.ts` | Claude Code CLI Provider |
| `providers/codex-cli-provider.ts` | Codex CLI Provider |
| `providers/anthropic-api-provider.ts` | Anthropic API Provider（ラッパー） |
| `providers/task-router.ts` | TaskRouter |
| `providers/provider-factory.ts` | ProviderFactory |
| `providers/rate-limiter.ts` | 共通レート制限 |
| `providers/utils/json-parser.ts` | 共通JSONパーサー |
| `providers/index.ts` | エクスポート |

### 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/core/src/business-base-agent.ts` | `Anthropic` SDK → `LLMProvider` 注入 |
| `packages/task-manager/src/decomposition/llm-decomposer.ts` | `Anthropic` SDK → `LLMProvider` 注入 |
| `packages/cli/scripts/ai-label-issue.ts` | `ANTHROPIC_API_KEY` → `TaskRouter` 経由 |
| `packages/cli/scripts/discussion-bot.ts` | `ANTHROPIC_API_KEY` → `TaskRouter` 経由 |
| `packages/cli/scripts/convert-idea-to-issue.ts` | `ANTHROPIC_API_KEY` → `TaskRouter` 経由 |
| `.miyabi.yml` | `llm` セクション追加 |

### 維持するファイル（削除しない）

| ファイル | 理由 |
|----------|------|
| `clients/AnthropicClient.ts` | CI/CD フォールバック用 |
| `clients/ClaudeCodeClient.ts` | ClaudeCLIProvider のベースとして参照 |
| `.codex/config.toml` | Codex CLI 設定（そのまま活用） |
| `.codex/agents/*.toml` | Codex サブエージェント設定（そのまま活用） |
