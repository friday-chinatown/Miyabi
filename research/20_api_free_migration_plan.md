# API-Free マイグレーション計画: Claude Code CLI / Codex CLI バックエンド移行

## 目次

1. [現状のAPI依存分析](#1-現状のapi依存分析)
2. [Claude Code CLI バックエンド](#2-claude-code-cli-バックエンド)
3. [Codex CLI バックエンド](#3-codex-cli-バックエンド)
4. [マルチバックエンドアーキテクチャ設計](#4-マルチバックエンドアーキテクチャ設計)
5. [移行計画（段階的）](#5-移行計画段階的)
6. [実装コード例](#6-実装コード例)

---

## 1. 現状のAPI依存分析

### 1.1 Anthropic API 使用箇所

Miyabiは現在、以下の箇所で `@anthropic-ai/sdk` を直接使用してAPIコールを行っている。

#### (A) miyabi-agent-sdk / AnthropicClient

**ファイル**: `packages/miyabi-agent-sdk/src/clients/AnthropicClient.ts`

| メソッド | 用途 | max_tokens | API必須度 |
|----------|------|------------|-----------|
| `analyzeIssue()` | Issue分析・ラベル分類 | 1,024 | **代替可能** - CLI経由で同等の結果を得られる |
| `generateCode()` | コード生成 | 32,768 | **代替可能** - Claude Code CLIの方がファイルアクセス付きで高品質 |
| `reviewCode()` | コードレビュー | 4,096 | **代替可能** - CLI経由で実行可能 |
| `calculateCost()` | コスト計算 | N/A | **API専用** - CLI使用時は $0 のため不要になる |

- モデル: `claude-sonnet-4-20250514`
- 環境変数: `ANTHROPIC_API_KEY` が必須
- コスト: Input $3/1M tokens, Output $15/1M tokens

#### (B) miyabi-agent-sdk / ClaudeCodeClient（既存CLI統合）

**ファイル**: `packages/miyabi-agent-sdk/src/clients/ClaudeCodeClient.ts`

既に `claude -p` コマンドを `spawn` で呼び出すCLIクライアントが実装済み。以下のメソッドを提供:

| メソッド | 用途 | timeout |
|----------|------|---------|
| `executePrompt()` | 汎用プロンプト実行 | configurable |
| `analyzeIssue()` | Issue分析 | 60,000ms |
| `generateCode()` | コード生成 | 120,000ms |
| `reviewCode()` | コードレビュー | 90,000ms |

- コスト: $0（Claude Code サブスクリプション内）
- shell: false でセキュリティ確保済み
- JSON パースは4パターン対応済み

#### (C) core / BusinessBaseAgent

**ファイル**: `packages/core/src/business-base-agent.ts`

| メソッド | 用途 | API必須度 |
|----------|------|-----------|
| `callClaude()` | ビジネスエージェント共通のClaude API呼び出し | **代替可能** |

- コンストラクタで `anthropicApiKey` を必須としている
- 14のビジネスエージェント全てがこの基底クラスを継承
- モデル: `claude-sonnet-4-20250514`、max_tokens: 8,192

#### (D) task-manager / LLMDecomposer

**ファイル**: `packages/task-manager/src/decomposition/llm-decomposer.ts`

| メソッド | 用途 | API必須度 |
|----------|------|-----------|
| `decompose()` | プロンプトをタスクDAGに分解 | **代替可能** |

- `Anthropic` SDKを直接使用
- `provider !== 'anthropic'` の場合エラーを投げる（ハードコード制約）
- DAG構築のためのLLM呼び出し

#### (E) CLI スクリプト群

**ファイル群**: `packages/cli/scripts/`

| スクリプト | 用途 | API必須度 |
|-----------|------|-----------|
| `ai-label-issue.ts` | Issue自動ラベリング | **代替可能** |
| `discussion-bot.ts` | ディスカッションボット | **代替可能** |
| `convert-idea-to-issue.ts` | アイデア→Issue変換 | **代替可能** |

- 全て `ANTHROPIC_API_KEY` 環境変数を必須としている

### 1.2 Gemini API 使用箇所

**ファイル**: `packages/context-engineering/src/index.ts`

| 用途 | API必須度 |
|------|-----------|
| プロンプト品質分析・最適化 | **オプション** - Context Engineeringサービス経由 |

- Python Uvicorn サーバー (port 8888) で別プロセス実行
- Gemini APIはオプションプロファイル (`context-engineering`) でのみ有効
- コアワークフローには影響しない

### 1.3 API必須 vs オプション マトリクス

| コンポーネント | 現在のAPI | 必須/オプション | CLI代替可能性 |
|---------------|-----------|-----------------|--------------|
| AnthropicClient | Anthropic | 必須（フォールバック） | Claude CLI |
| ClaudeCodeClient | Claude CLI | 既にCLI | N/A |
| BusinessBaseAgent | Anthropic | 必須（14エージェント） | Claude CLI |
| LLMDecomposer | Anthropic | 必須 | Claude CLI or Codex CLI |
| ai-label-issue.ts | Anthropic | オプション | Claude CLI |
| discussion-bot.ts | Anthropic | オプション | Claude CLI |
| convert-idea-to-issue.ts | Anthropic | オプション | Claude CLI |
| ContextEngineering | Gemini | オプション | 独立サービス |

### 1.4 月間コスト影響

現在の `BUDGET.yml` 設定:
- Anthropic API: **$400/月** (10M tokens/month)
- CLI移行後: **$0/月**（Claude Code Max $100/月 or Claude Code Pro $20/月のサブスクリプションに含まれる）

**年間削減見込み**: $4,800 → $0（API費用分）

---

## 2. Claude Code CLI バックエンド

### 2.1 `claude` コマンド詳細リファレンス

#### 基本実行モード

```bash
# 非対話的プロンプト実行（最も重要）
claude -p "プロンプトテキスト"

# --print フラグ（-p と同等、長形式）
claude --print "プロンプトテキスト"

# stdin からプロンプトを受け取る
echo "コードを分析してください" | claude -p

# ファイルの内容を渡す
cat src/index.ts | claude -p "このコードをレビューしてください"
```

#### 出力フォーマット制御

```bash
# JSON出力（プログラマティック解析用）
claude --output-format json -p "ファイル一覧を返してください"

# ストリーミングJSON出力（リアルタイム処理用）
claude --output-format stream-json -p "説明してください"

# テキスト出力（デフォルト）
claude --output-format text -p "要約してください"
```

**JSON出力の構造**:
```json
{
  "type": "result",
  "subtype": "success",
  "cost_usd": 0.003,
  "is_error": false,
  "duration_ms": 1234,
  "duration_api_ms": 1100,
  "num_turns": 1,
  "result": "応答テキスト",
  "session_id": "abc123-def456"
}
```

#### セッション管理

```bash
# 最後のセッションを再開
claude --resume

# 特定のセッションを継続
claude --continue <session_id>

# 非対話的モード（CI/CD向け）
claude --no-interactive

# セッションID付きで実行
claude -p "初回プロンプト" --output-format json
# → session_id を取得
claude --continue <session_id> -p "フォローアッププロンプト"
```

#### システムプロンプト指定

```bash
# --system-prompt でシステムプロンプトを指定
claude --system-prompt "あなたはTypeScriptの専門家です" -p "コードを生成してください"

# ファイルからシステムプロンプトを読み込む
claude --system-prompt "$(cat prompts/reviewer.txt)" -p "レビューしてください"
```

#### モデル選択

```bash
# デフォルトモデル（通常 Claude Sonnet 4）
claude -p "コード生成"

# 特定モデルを指定
claude --model claude-sonnet-4-20250514 -p "コード生成"
```

#### 作業ディレクトリ

```bash
# 特定ディレクトリで実行（ファイルアクセスのコンテキスト）
cd /path/to/project && claude -p "このプロジェクトを分析してください"
```

### 2.2 APIの代わりにCLIを呼ぶ方法

#### execSync パターン（同期実行）

```typescript
import { execSync } from 'child_process';

function claudeSync(prompt: string, options?: {
  cwd?: string;
  timeout?: number;
  systemPrompt?: string;
}): string {
  const args: string[] = ['--output-format', 'json', '-p', prompt];

  if (options?.systemPrompt) {
    args.unshift('--system-prompt', options.systemPrompt);
  }

  const result = execSync(
    `claude ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`,
    {
      cwd: options?.cwd || process.cwd(),
      timeout: options?.timeout || 120_000,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB
      env: { ...process.env, FORCE_COLOR: '0' },
    }
  );

  return result;
}
```

**注意**: `execSync` はメインスレッドをブロックする。エージェントの並列実行時は `spawn` パターンを推奨。

#### spawn パターン（非同期実行 - 推奨）

```typescript
import { spawn, type ChildProcess } from 'child_process';

interface ClaudeCLIResult {
  success: boolean;
  content: string;
  sessionId?: string;
  durationMs?: number;
  costUsd?: number;
  raw?: Record<string, unknown>;
}

async function claudeAsync(
  prompt: string,
  options?: {
    cwd?: string;
    timeout?: number;
    systemPrompt?: string;
    sessionId?: string;
    signal?: AbortSignal;
  }
): Promise<ClaudeCLIResult> {
  return new Promise((resolve, reject) => {
    const args: string[] = [];

    // セッション継続
    if (options?.sessionId) {
      args.push('--continue', options.sessionId);
    }

    // システムプロンプト
    if (options?.systemPrompt) {
      args.push('--system-prompt', options.systemPrompt);
    }

    // 出力形式
    args.push('--output-format', 'json');

    // プロンプト
    args.push('-p', prompt);

    const proc: ChildProcess = spawn('claude', args, {
      cwd: options?.cwd || process.cwd(),
      shell: false,  // セキュリティ: shell injection 防止
      env: { ...process.env, FORCE_COLOR: '0' },
      signal: options?.signal,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // タイムアウト処理
    const timeoutId = options?.timeout
      ? setTimeout(() => {
          proc.kill('SIGTERM');
          reject(new Error(`Claude CLI timed out after ${options.timeout}ms`));
        }, options.timeout)
      : null;

    proc.on('close', (code: number | null) => {
      if (timeoutId) clearTimeout(timeoutId);

      if (code === 0) {
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve({
            success: !parsed.is_error,
            content: parsed.result || stdout.trim(),
            sessionId: parsed.session_id,
            durationMs: parsed.duration_ms,
            costUsd: parsed.cost_usd,
            raw: parsed,
          });
        } catch {
          // JSON パース失敗時はテキストとして返す
          resolve({
            success: true,
            content: stdout.trim(),
          });
        }
      } else {
        reject(new Error(
          `Claude CLI failed with exit code ${code}\nStderr: ${stderr}\nStdout: ${stdout}`
        ));
      }
    });

    proc.on('error', (error: Error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
    });
  });
}
```

#### stdin パイプパターン（大量テキスト入力用）

```typescript
import { spawn } from 'child_process';

async function claudeWithStdin(
  prompt: string,
  stdinContent: string,
  options?: { cwd?: string; timeout?: number }
): Promise<ClaudeCLIResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', [
      '--output-format', 'json',
      '-p', prompt,
    ], {
      cwd: options?.cwd,
      shell: false,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

    // stdin にコンテンツを書き込み
    proc.stdin?.write(stdinContent);
    proc.stdin?.end();

    const timeoutId = options?.timeout
      ? setTimeout(() => { proc.kill(); reject(new Error('Timeout')); }, options.timeout)
      : null;

    proc.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve({ success: true, content: parsed.result || stdout.trim(), raw: parsed });
        } catch {
          resolve({ success: true, content: stdout.trim() });
        }
      } else {
        reject(new Error(`Exit ${code}: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}
```

### 2.3 利点

| 利点 | 詳細 |
|------|------|
| **APIキー不要** | `ANTHROPIC_API_KEY` が不要。Claude Code のサブスクリプションのみで動作 |
| **コスト$0** | API従量課金なし。月額固定のサブスクリプション費用のみ |
| **ファイルアクセス** | Claude Code CLIはローカルファイルシステムに直接アクセス可能 |
| **ツール使用** | Claude Code内蔵のBash、Read、Write、Grep、Globツールが利用可能 |
| **セッション管理** | `--continue` / `--resume` でコンテキストを保持した連続会話が可能 |
| **セキュリティ** | ローカル実行のため、APIキー漏洩リスクなし |

### 2.4 制約

| 制約 | 詳細 | 対策 |
|------|------|------|
| **レート制限** | Claude Code Maxでも1時間あたりの使用量制限あり | キューイング + 優先度ベースの実行 |
| **並列実行制限** | 同時に複数の `claude` プロセスを起動すると制限に抵触しやすい | 逐次実行 or セマフォによる同時実行数制御 |
| **応答時間の変動** | ネットワーク状況・サーバー負荷により応答時間が変動 | タイムアウト + リトライ戦略 |
| **JSON出力の信頼性** | `--output-format json` でもパースエラーの可能性あり | 既存の4パターンJSONパーサーを活用 |
| **プロセス起動オーバーヘッド** | 毎回CLIプロセスを起動するため、API呼び出しより遅い | セッション継続で軽減 |
| **CI/CD環境** | CI/CDサーバーに `claude` CLIがインストールされている必要がある | Docker イメージにプリインストール or APIフォールバック |
| **Windows対応** | Windowsでの `spawn` 挙動の差異 | `cross-spawn` パッケージ or 既存の `isWindows()` ユーティリティ活用 |

### 2.5 レート制限への対処

```typescript
import { EventEmitter } from 'events';

class ClaudeCLIRateLimiter extends EventEmitter {
  private queue: Array<{
    fn: () => Promise<ClaudeCLIResult>;
    resolve: (value: ClaudeCLIResult) => void;
    reject: (reason: Error) => void;
    priority: number;
  }> = [];
  private running = 0;
  private maxConcurrent: number;
  private minIntervalMs: number;
  private lastCallTime = 0;

  constructor(options?: { maxConcurrent?: number; minIntervalMs?: number }) {
    super();
    this.maxConcurrent = options?.maxConcurrent ?? 1;
    this.minIntervalMs = options?.minIntervalMs ?? 2000; // 2秒間隔
  }

  async execute(
    fn: () => Promise<ClaudeCLIResult>,
    priority = 0
  ): Promise<ClaudeCLIResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, priority });
      // 優先度でソート（高い方が先）
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
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

---

## 3. Codex CLI バックエンド

### 3.1 `codex` コマンドの使い方

OpenAI Codex CLI は、GPT-5.4系モデルを使用した自律コーディングエージェント。

#### 基本コマンド

```bash
# 非対話的プロンプト実行
codex -p "TypeScriptの認証ミドルウェアを生成してください"

# 作業ディレクトリ指定
codex -p "このプロジェクトのバグを修正してください" --cd /path/to/project

# 承認ポリシー指定
codex --approval-policy auto-edit -p "テストを追加してください"
codex --approval-policy full-auto -p "リファクタリングしてください"

# モデル指定
codex --model gpt-5.4-mini -p "簡単なユーティリティ関数を作成"
```

#### 承認ポリシー

| ポリシー | 説明 | 用途 |
|----------|------|------|
| `on-request` | 各操作に承認を要求（デフォルト） | 対話的開発 |
| `auto-edit` | ファイル編集は自動承認、コマンド実行は承認 | コーディングタスク |
| `full-auto` | 全操作を自動承認 | CI/CD、自動化パイプライン |

#### マルチエージェント実行

```bash
# 特定のエージェント設定で実行
codex --agent architect -p "このアーキテクチャをレビューしてください"
codex --agent worker -p "認証機能を実装してください"
codex --agent reviewer -p "コードをレビューしてください"
codex --agent explorer -p "プロジェクト構造を分析してください"
```

### 3.2 既存の .codex/ 設定の活用

Miyabi には既に完全な `.codex/` 設定が構築されている。

#### config.toml の主要設定

```toml
# D:/updatedMiyabi/Miyabi/.codex/config.toml より

model = "gpt-5.4"
review_model = "gpt-5.4"
model_reasoning_effort = "high"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
web_search = "live"

[features]
multi_agent = true          # マルチエージェント有効
unified_exec = true         # 統合実行
shell_snapshot = true       # シェルスナップショット
apps = true
fast_mode = true
skill_mcp_dependency_install = true

[agents]
max_threads = 4             # 最大4並列
max_depth = 2               # ネスト深度2
job_max_runtime_seconds = 1800  # 30分タイムアウト
```

#### エージェント設定一覧

| エージェント | ファイル | モデル | reasoning_effort | 用途 |
|-------------|---------|--------|------------------|------|
| `default` | `.codex/agents/default.toml` | gpt-5.4 | medium | デフォルト実行 |
| `architect` | `.codex/agents/architect.toml` | gpt-5.4 | high | アーキテクチャ分析 |
| `worker` | `.codex/agents/worker.toml` | gpt-5.4-mini | medium | 実装作業 |
| `reviewer` | `.codex/agents/reviewer.toml` | gpt-5.4 | high | コードレビュー |
| `explorer` | `.codex/agents/explorer.toml` | gpt-5.4-mini | medium | 読み取り専用分析 |

#### MCP サーバー統合

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
enabled = true

[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@0.0.67"]
enabled = true
```

### 3.3 コーディングタスクに特化した使い方

Codex CLI は、Claude Code CLI と異なりファイル編集とコマンド実行を直接行う「エージェント」として動作する。

#### タスク別推奨パターン

```bash
# 1. コード生成（worker エージェント + full-auto）
codex --agent worker --approval-policy full-auto \
  -p "packages/shared-utils/src/に新しいcache.tsユーティリティを作成してください。LRUキャッシュの実装です。"

# 2. コードレビュー（reviewer エージェント）
codex --agent reviewer --approval-policy on-request \
  -p "packages/miyabi-agent-sdk/src/clients/ の変更をレビューしてください。バグ、セキュリティ問題、不足テストに焦点を当ててください。"

# 3. アーキテクチャ分析（architect エージェント）
codex --agent architect --approval-policy on-request \
  -p "packages/ のパッケージ境界とオーケストレーションフローを分析してください。"

# 4. コードベース探索（explorer エージェント）
codex --agent explorer --approval-policy on-request \
  -p "packages/coding-agents/ の全エージェントの実行フローをマッピングしてください。"

# 5. バグ修正（worker + auto-edit）
codex --agent worker --approval-policy auto-edit \
  -p "Issue #270: ログイン時にセッショントークンが更新されないバグを修正してください。"
```

### 3.4 Codex CLI プログラマティック呼び出し

```typescript
import { spawn } from 'child_process';

interface CodexCLIResult {
  success: boolean;
  output: string;
  filesChanged?: string[];
  exitCode: number;
}

async function executeCodex(
  prompt: string,
  options?: {
    agent?: 'default' | 'architect' | 'worker' | 'reviewer' | 'explorer';
    approvalPolicy?: 'on-request' | 'auto-edit' | 'full-auto';
    cwd?: string;
    timeout?: number;
    model?: string;
  }
): Promise<CodexCLIResult> {
  return new Promise((resolve, reject) => {
    const args: string[] = [];

    // エージェント指定
    if (options?.agent) {
      args.push('--agent', options.agent);
    }

    // 承認ポリシー（自動化時は full-auto）
    if (options?.approvalPolicy) {
      args.push('--approval-policy', options.approvalPolicy);
    }

    // モデル指定
    if (options?.model) {
      args.push('--model', options.model);
    }

    // プロンプト
    args.push('-p', prompt);

    const proc = spawn('codex', args, {
      cwd: options?.cwd || process.cwd(),
      shell: false,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timeoutId = options?.timeout
      ? setTimeout(() => {
          proc.kill('SIGTERM');
          reject(new Error(`Codex CLI timed out after ${options.timeout}ms`));
        }, options.timeout)
      : null;

    proc.on('close', (code: number | null) => {
      if (timeoutId) clearTimeout(timeoutId);

      resolve({
        success: code === 0,
        output: stdout.trim(),
        exitCode: code ?? 1,
      });
    });

    proc.on('error', (error: Error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(new Error(`Failed to spawn Codex CLI: ${error.message}`));
    });
  });
}
```

### 3.5 Claude CLI vs Codex CLI 比較

| 比較項目 | Claude Code CLI | Codex CLI |
|----------|----------------|-----------|
| **提供元** | Anthropic | OpenAI |
| **モデル** | Claude Sonnet 4 / Opus 4 | GPT-5.4 / GPT-5.4-mini |
| **課金** | サブスクリプション ($20-$100/月) | API Key or サブスクリプション |
| **JSON出力** | `--output-format json` | テキスト出力のみ（構造化は要工夫） |
| **セッション管理** | `--continue`, `--resume` | セッション内で継続 |
| **マルチエージェント** | なし（単一プロセス） | `--agent` で設定切替 |
| **ファイル編集** | ツール経由（Read, Write, Edit） | 直接ファイル編集 |
| **サンドボックス** | 標準的なOS権限 | `sandbox_mode` で制御可能 |
| **MCP統合** | ネイティブ対応 | `mcp_servers` 設定で対応 |
| **自動承認** | `--no-interactive` | `--approval-policy full-auto` |
| **適材適所** | 分析・レビュー・ドキュメント | コーディング・実装・テスト |

---

## 4. マルチバックエンドアーキテクチャ設計

### 4.1 Provider パターン

```
                          ┌─────────────────────┐
                          │   TaskRouter        │
                          │  (タスクタイプ判定)    │
                          └──────┬──────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼──────┐ ┌──▼──────────┐ ┌▼──────────────┐
            │ ClaudeCLI    │ │ CodexCLI    │ │ Anthropic     │
            │ Provider     │ │ Provider    │ │ Provider      │
            │              │ │             │ │ (フォールバック) │
            └───────┬──────┘ └──┬──────────┘ └┬──────────────┘
                    │            │              │
                    ▼            ▼              ▼
              claude CLI     codex CLI     Anthropic SDK
              (spawn)        (spawn)       (HTTP API)
```

### 4.2 Provider インターフェース

```typescript
// packages/miyabi-agent-sdk/src/providers/types.ts

/**
 * LLM Provider の共通インターフェース
 */
export interface LLMProvider {
  /** プロバイダー名 */
  readonly name: string;

  /** プロバイダーが利用可能かチェック */
  isAvailable(): Promise<boolean>;

  /** テキスト生成 */
  generate(request: GenerateRequest): Promise<GenerateResponse>;

  /** Issue分析 */
  analyzeIssue(issue: IssueAnalysisRequest): Promise<IssueAnalysisResponse>;

  /** コード生成 */
  generateCode(request: CodeGenRequest): Promise<CodeGenResponse>;

  /** コードレビュー */
  reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse>;

  /** タスク分解 */
  decompose(request: DecomposeRequest): Promise<DecomposeResponse>;
}

/**
 * 汎用テキスト生成リクエスト
 */
export interface GenerateRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  outputFormat?: 'text' | 'json';
  timeout?: number;
  workingDir?: string;
}

/**
 * 汎用テキスト生成レスポンス
 */
export interface GenerateResponse {
  content: string;
  provider: string;
  model?: string;
  tokensUsed?: { input: number; output: number };
  cost?: number;       // USD, CLI利用時は 0
  durationMs?: number;
  sessionId?: string;  // Claude CLI のセッション管理用
}

/**
 * Issue分析リクエスト
 */
export interface IssueAnalysisRequest {
  title: string;
  body: string;
  number?: number;
}

/**
 * Issue分析レスポンス
 */
export interface IssueAnalysisResponse {
  type: string;
  complexity: string;
  priority: string;
  labels: string[];
  relatedFiles?: string[];
  reasoning?: string;
  tokensUsed?: { input: number; output: number };
  cost?: number;
}

/**
 * コード生成リクエスト
 */
export interface CodeGenRequest {
  requirements: string;
  context: string;
  language?: string;
  existingFiles?: Array<{ path: string; content: string }>;
}

/**
 * コード生成レスポンス
 */
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
  cost?: number;
}

/**
 * コードレビューリクエスト
 */
export interface CodeReviewRequest {
  files: Array<{ path: string; content: string }>;
  standards?: {
    minQualityScore?: number;
    requireTests?: boolean;
    securityScan?: boolean;
  };
}

/**
 * コードレビューレスポンス
 */
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
  cost?: number;
}

/**
 * タスク分解リクエスト
 */
export interface DecomposeRequest {
  prompt: string;
  context?: string;
  constraints?: string[];
  maxTasks?: number;
}

/**
 * タスク分解レスポンス
 */
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

/**
 * プロバイダー設定
 */
export interface ProviderConfig {
  /** 使用するプロバイダー */
  type: 'claude-cli' | 'codex-cli' | 'anthropic-api';

  /** タイムアウト（ms） */
  timeout?: number;

  /** リトライ回数 */
  maxRetries?: number;

  /** プロバイダー固有設定 */
  options?: Record<string, unknown>;
}
```

### 4.3 タスクタイプ別ルーティング

```typescript
// packages/miyabi-agent-sdk/src/providers/task-router.ts

import type { LLMProvider, ProviderConfig } from './types.js';

/**
 * タスクタイプに基づいてプロバイダーを選択するルーター
 */
export type TaskType =
  | 'issue-analysis'
  | 'code-generation'
  | 'code-review'
  | 'task-decomposition'
  | 'documentation'
  | 'general-analysis'
  | 'architecture-review';

/**
 * ルーティング設定
 */
export interface RoutingConfig {
  /** タスクタイプ → プロバイダータイプのマッピング */
  routes: Record<TaskType, ProviderConfig['type']>;

  /** フォールバックプロバイダー */
  fallback: ProviderConfig['type'];

  /** フォールバックの順序 */
  fallbackOrder: ProviderConfig['type'][];
}

/**
 * デフォルトのルーティング設定
 *
 * 設計思想:
 * - コーディングタスク → Codex CLI（ファイル直接編集、マルチエージェント）
 * - レビュー → Claude CLI or Codex reviewer
 * - 分析・ドキュメント → Claude CLI（JSON出力、セッション管理）
 * - フォールバック → Anthropic API（CI/CD、CLIなし環境）
 */
export const DEFAULT_ROUTING: RoutingConfig = {
  routes: {
    'issue-analysis':      'claude-cli',
    'code-generation':     'codex-cli',
    'code-review':         'claude-cli',
    'task-decomposition':  'claude-cli',
    'documentation':       'claude-cli',
    'general-analysis':    'claude-cli',
    'architecture-review': 'codex-cli',
  },
  fallback: 'anthropic-api',
  fallbackOrder: ['claude-cli', 'codex-cli', 'anthropic-api'],
};

/**
 * TaskRouter - タスクタイプに応じてプロバイダーを選択
 */
export class TaskRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private routing: RoutingConfig;

  constructor(routing?: Partial<RoutingConfig>) {
    this.routing = {
      ...DEFAULT_ROUTING,
      ...routing,
      routes: { ...DEFAULT_ROUTING.routes, ...routing?.routes },
    };
  }

  /**
   * プロバイダーを登録
   */
  registerProvider(type: ProviderConfig['type'], provider: LLMProvider): void {
    this.providers.set(type, provider);
  }

  /**
   * タスクタイプに応じた最適なプロバイダーを取得
   */
  async getProvider(taskType: TaskType): Promise<LLMProvider> {
    // 1. ルーティング設定から優先プロバイダーを取得
    const preferredType = this.routing.routes[taskType] || this.routing.fallback;
    const preferred = this.providers.get(preferredType);

    if (preferred && await preferred.isAvailable()) {
      return preferred;
    }

    // 2. フォールバック順序で利用可能なプロバイダーを検索
    for (const type of this.routing.fallbackOrder) {
      const provider = this.providers.get(type);
      if (provider && await provider.isAvailable()) {
        console.warn(
          `[TaskRouter] Primary provider "${preferredType}" unavailable for "${taskType}", ` +
          `falling back to "${type}"`
        );
        return provider;
      }
    }

    throw new Error(
      `No available LLM provider for task type "${taskType}". ` +
      `Tried: ${this.routing.fallbackOrder.join(', ')}`
    );
  }

  /**
   * 全プロバイダーの可用性チェック
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [type, provider] of this.providers) {
      try {
        results[type] = await provider.isAvailable();
      } catch {
        results[type] = false;
      }
    }
    return results;
  }
}
```

### 4.4 .miyabi.yml 設定拡張

```yaml
# .miyabi.yml - プロバイダー設定セクション

# LLMプロバイダー設定
llm:
  # デフォルトプロバイダー
  default_provider: claude-cli

  # プロバイダー定義
  providers:
    claude-cli:
      enabled: true
      command: claude
      timeout: 120000        # 2分
      max_retries: 2
      rate_limit:
        max_concurrent: 1
        min_interval_ms: 2000
      options:
        output_format: json
        model: claude-sonnet-4-20250514

    codex-cli:
      enabled: true
      command: codex
      timeout: 300000        # 5分（ファイル編集を含むため長め）
      max_retries: 1
      options:
        approval_policy: full-auto
        sandbox_mode: workspace-write

    anthropic-api:
      enabled: false         # フォールバック用。明示的に有効化が必要
      timeout: 60000
      max_retries: 3
      options:
        model: claude-sonnet-4-20250514
        max_tokens: 8192
      # api_key は環境変数 ANTHROPIC_API_KEY から取得

  # タスクルーティング
  routing:
    issue-analysis: claude-cli
    code-generation: codex-cli
    code-review: claude-cli
    task-decomposition: claude-cli
    documentation: claude-cli
    general-analysis: claude-cli
    architecture-review: codex-cli

  # フォールバック順序
  fallback_order:
    - claude-cli
    - codex-cli
    - anthropic-api

# GitHub設定（既存）
github:
  token: ${GITHUB_TOKEN}

# プロジェクト設定（既存）
project:
  defaultLanguage: typescript

# ワークフロー設定（既存）
workflows:
  autoLabel: true
  autoReview: true
```

---

## 5. 移行計画（段階的）

### Phase 1: Provider インターフェース作成（1-2日）

**目標**: 共通インターフェースを定義し、既存のAnthropicClient / ClaudeCodeClient を新インターフェースに準拠させる

**タスク**:

1. `packages/miyabi-agent-sdk/src/providers/types.ts` 作成
   - `LLMProvider` インターフェース定義
   - リクエスト/レスポンス型定義
   - `ProviderConfig` 型定義

2. `packages/miyabi-agent-sdk/src/providers/task-router.ts` 作成
   - `TaskRouter` クラス実装
   - デフォルトルーティング設定
   - ヘルスチェック機能

3. `packages/miyabi-agent-sdk/src/providers/index.ts` 作成
   - エクスポート構成

**検証方法**:
```bash
npm run typecheck   # 型チェック通過
npm run lint        # ESLint通過
```

### Phase 2: Claude CLI Provider 実装（2-3日）

**目標**: `claude` CLI を `LLMProvider` インターフェースで呼び出せるようにする

**タスク**:

1. `packages/miyabi-agent-sdk/src/providers/claude-cli-provider.ts` 作成
   - 既存 `ClaudeCodeClient` のロジックをベースに実装
   - `--output-format json` による構造化出力対応
   - セッション管理（`--continue`）対応
   - レート制限管理

2. CLI可用性チェック実装
   - `claude --version` によるインストール確認
   - PATH上の存在チェック

3. JSON パース強化
   - 既存の4パターンパーサーを共通ユーティリティに抽出

**検証方法**:
```bash
# 手動テスト
npx tsx -e "
  import { ClaudeCLIProvider } from './packages/miyabi-agent-sdk/src/providers/claude-cli-provider.js';
  const provider = new ClaudeCLIProvider();
  console.log('Available:', await provider.isAvailable());
  const result = await provider.generate({ prompt: 'Hello' });
  console.log('Result:', result.content.slice(0, 100));
"

# ユニットテスト
npx vitest run packages/miyabi-agent-sdk/src/providers/__tests__/claude-cli-provider.test.ts
```

### Phase 3: Codex CLI Provider 実装（2-3日）

**目標**: `codex` CLI を `LLMProvider` インターフェースで呼び出せるようにする

**タスク**:

1. `packages/miyabi-agent-sdk/src/providers/codex-cli-provider.ts` 作成
   - `.codex/config.toml` 設定活用
   - エージェント切替（`--agent architect/worker/reviewer/explorer`）
   - 承認ポリシー自動設定
   - `full-auto` モードでの自動実行

2. エージェント↔タスクタイプの自動マッピング
   - code-generation → worker エージェント
   - code-review → reviewer エージェント
   - architecture-review → architect エージェント
   - 分析系 → explorer エージェント

3. Codex 出力のパース
   - テキスト出力からの構造化データ抽出
   - ファイル変更の検出

**検証方法**:
```bash
# Codex CLI が利用可能な環境で
npx vitest run packages/miyabi-agent-sdk/src/providers/__tests__/codex-cli-provider.test.ts
```

### Phase 4: Anthropic API Provider ラッパー（1日）

**目標**: 既存の `AnthropicClient` を `LLMProvider` インターフェースでラップする（フォールバック用）

**タスク**:

1. `packages/miyabi-agent-sdk/src/providers/anthropic-api-provider.ts` 作成
   - 既存 `AnthropicClient` をラップ
   - `isAvailable()` で `ANTHROPIC_API_KEY` 環境変数の存在チェック

2. コスト計算ロジックの統合
   - API使用時のみコスト記録

### Phase 5: タスクルーティング・統合テスト（2-3日）

**目標**: `TaskRouter` を通じて全プロバイダーを統合し、`.miyabi.yml` からの設定読み込みを実装

**タスク**:

1. `.miyabi.yml` の `llm` セクション読み込み
   - `packages/cli/src/config/loader.ts` の拡張
   - 既存の `MiyabiConfig` インターフェースに `llm` フィールド追加

2. `ProviderFactory` 実装
   - 設定に基づいてプロバイダーインスタンスを生成
   - シングルトンパターンでプロバイダーをキャッシュ

3. 既存コードの移行
   - `BusinessBaseAgent.callClaude()` → `TaskRouter.getProvider('general-analysis').generate()`
   - `LLMDecomposer` → `TaskRouter.getProvider('task-decomposition').decompose()`
   - CLI スクリプト群の更新

4. 統合テスト
   - プロバイダー切替テスト
   - フォールバック動作テスト
   - ルーティングテスト

**検証方法**:
```bash
npm run verify:all   # 全検証パイプライン
npm run agents:verify  # エージェント検証
```

### Phase 6: ドキュメント・移行ガイド（1日）

**タスク**:
1. `docs/operations/PROVIDER_MIGRATION.md` 作成
2. `.miyabi.yml.example` 更新
3. `CLAUDE.md` のEnvironment Variables セクション更新
4. `BUDGET.yml` のコスト見積もり更新

### タイムライン

```
Phase 1 ─────── Phase 2 ────────── Phase 3 ────────── Phase 4 ── Phase 5 ──────── Phase 6
[1-2日]         [2-3日]             [2-3日]             [1日]      [2-3日]          [1日]
Provider I/F    Claude CLI Prov.    Codex CLI Prov.     API Wrap   統合・テスト     ドキュメント

合計: 9-13日
```

---

## 6. 実装コード例

### 6.1 ClaudeCLIProvider 完全実装

```typescript
// packages/miyabi-agent-sdk/src/providers/claude-cli-provider.ts

import { spawn } from 'child_process';
import { execSync } from 'child_process';
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
} from './types.js';
import { parseFlexibleJSON } from './utils/json-parser.js';

export interface ClaudeCLIProviderOptions {
  /** claude コマンドのパス（デフォルト: 'claude'） */
  command?: string;
  /** デフォルトタイムアウト（ms） */
  defaultTimeout?: number;
  /** デフォルトモデル */
  model?: string;
  /** レート制限: 最大同時実行数 */
  maxConcurrent?: number;
  /** レート制限: 最小実行間隔（ms） */
  minIntervalMs?: number;
}

export class ClaudeCLIProvider implements LLMProvider {
  readonly name = 'claude-cli';

  private command: string;
  private defaultTimeout: number;
  private model?: string;
  private running = 0;
  private maxConcurrent: number;
  private minIntervalMs: number;
  private lastCallTime = 0;

  constructor(options?: ClaudeCLIProviderOptions) {
    this.command = options?.command ?? 'claude';
    this.defaultTimeout = options?.defaultTimeout ?? 120_000;
    this.model = options?.model;
    this.maxConcurrent = options?.maxConcurrent ?? 1;
    this.minIntervalMs = options?.minIntervalMs ?? 2000;
  }

  /**
   * claude CLI が利用可能か確認
   */
  async isAvailable(): Promise<boolean> {
    try {
      execSync(`${this.command} --version`, {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 汎用テキスト生成
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    await this.waitForSlot();

    const args: string[] = [];

    if (request.systemPrompt) {
      args.push('--system-prompt', request.systemPrompt);
    }

    if (this.model || request.outputFormat === 'json') {
      args.push('--output-format', 'json');
    }

    args.push('-p', request.prompt);

    const result = await this.spawnClaude(args, {
      cwd: request.workingDir,
      timeout: request.timeout ?? this.defaultTimeout,
    });

    return {
      content: result.content,
      provider: this.name,
      model: this.model,
      tokensUsed: result.tokensUsed,
      cost: result.cost ?? 0,
      durationMs: result.durationMs,
      sessionId: result.sessionId,
    };
  }

  /**
   * Issue分析
   */
  async analyzeIssue(issue: IssueAnalysisRequest): Promise<IssueAnalysisResponse> {
    const prompt = `以下のGitHub Issueを解析し、適切なラベル、複雑度、優先度、種類を判定してください。

# Issue情報
${issue.number ? `Issue #${issue.number}` : ''}
Title: ${issue.title}
Body: ${issue.body || "(本文なし)"}

# 出力形式（JSON）
{
  "labels": ["type:bug", "priority:P1-High", "complexity:medium"],
  "complexity": "small|medium|large|xlarge",
  "priority": "P0|P1|P2|P3",
  "type": "bug|feature|refactor|docs|test|chore",
  "relatedFiles": ["src/example.ts"],
  "reasoning": "判定理由を簡潔に説明"
}

**重要**: 必ずJSON形式のみで回答してください。`;

    const response = await this.generate({
      prompt,
      outputFormat: 'json',
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
      tokensUsed: response.tokensUsed,
      cost: 0,
    };
  }

  /**
   * コード生成
   */
  async generateCode(request: CodeGenRequest): Promise<CodeGenResponse> {
    const existingFilesStr = request.existingFiles
      ?.map(f => `## ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n') ?? '';

    const prompt = `以下の要件に基づいて、${request.language ?? 'typescript'}のコードを生成してください。

# 要件
${request.requirements}

# コンテキスト（既存コード・関連ファイル）
${request.context}

${existingFilesStr ? `# 既存ファイル\n${existingFilesStr}` : ''}

# 出力形式（JSON）
{
  "files": [
    { "path": "src/example.ts", "content": "完全なコード", "action": "create" }
  ],
  "tests": [
    { "path": "src/example.test.ts", "content": "テストコード", "action": "create" }
  ],
  "qualityScore": 85
}

**重要**: 必ずJSON形式のみで回答してください。`;

    const response = await this.generate({
      prompt,
      outputFormat: 'json',
      timeout: 180_000, // 3分
    });

    const parsed = parseFlexibleJSON(response.content);

    return {
      files: parsed.files ?? [],
      tests: parsed.tests ?? [],
      qualityScore: parsed.qualityScore ?? 70,
      tokensUsed: response.tokensUsed,
      cost: 0,
    };
  }

  /**
   * コードレビュー
   */
  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    const filesContent = request.files
      .map(f => `## ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');

    const prompt = `以下のコードをレビューしてください。

# コード
${filesContent}

# 品質基準
- 最低品質スコア: ${request.standards?.minQualityScore ?? 80}
- テスト必須: ${request.standards?.requireTests !== false ? 'はい' : 'いいえ'}
- セキュリティスキャン: ${request.standards?.securityScan !== false ? 'はい' : 'いいえ'}

# 出力形式（JSON）
{
  "qualityScore": 85,
  "passed": true,
  "issues": [
    { "severity": "error|warning|info", "file": "src/example.ts", "line": 42, "message": "説明" }
  ],
  "suggestions": ["改善提案"]
}

**重要**: 必ずJSON形式のみで回答してください。`;

    const response = await this.generate({
      prompt,
      outputFormat: 'json',
      timeout: 90_000,
    });

    const parsed = parseFlexibleJSON(response.content);

    return {
      qualityScore: parsed.qualityScore ?? 0,
      passed: parsed.passed ?? false,
      issues: parsed.issues ?? [],
      suggestions: parsed.suggestions ?? [],
      tokensUsed: response.tokensUsed,
      cost: 0,
    };
  }

  /**
   * タスク分解
   */
  async decompose(request: DecomposeRequest): Promise<DecomposeResponse> {
    const prompt = `以下のプロンプトを実行可能なタスクに分解してください。

# プロンプト
${request.prompt}

${request.context ? `# コンテキスト\n${request.context}` : ''}
${request.constraints?.length ? `# 制約\n${request.constraints.join('\n')}` : ''}
${request.maxTasks ? `# 最大タスク数: ${request.maxTasks}` : ''}

# 出力形式（JSON）
{
  "tasks": [
    {
      "id": "task-1",
      "title": "タスク名",
      "description": "詳細説明",
      "type": "code|test|review|docs|config",
      "agent": "codegen|review|test|pr|deployment",
      "dependencies": [],
      "estimatedMinutes": 30
    }
  ],
  "dag": [
    { "from": "task-1", "to": "task-2" }
  ],
  "totalEstimatedMinutes": 60
}

**重要**: 必ずJSON形式のみで回答してください。`;

    const response = await this.generate({
      prompt,
      outputFormat: 'json',
      timeout: 60_000,
    });

    const parsed = parseFlexibleJSON(response.content);

    return {
      tasks: parsed.tasks ?? [],
      dag: parsed.dag ?? [],
      totalEstimatedMinutes: parsed.totalEstimatedMinutes ?? 0,
    };
  }

  // ── Private methods ──────────────────────────────────────

  private async waitForSlot(): Promise<void> {
    while (this.running >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minIntervalMs - elapsed)
      );
    }
  }

  private async spawnClaude(
    args: string[],
    options: { cwd?: string; timeout: number }
  ): Promise<{
    content: string;
    tokensUsed?: { input: number; output: number };
    cost?: number;
    durationMs?: number;
    sessionId?: string;
  }> {
    this.running++;
    this.lastCallTime = Date.now();

    try {
      return await new Promise((resolve, reject) => {
        const proc = spawn(this.command, args, {
          cwd: options.cwd || process.cwd(),
          shell: false,
          env: { ...process.env, FORCE_COLOR: '0' },
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
          reject(new Error(`Claude CLI timed out after ${options.timeout}ms`));
        }, options.timeout);

        proc.on('close', (code: number | null) => {
          clearTimeout(timeoutId);

          if (code === 0) {
            // --output-format json の場合の解析
            try {
              const parsed = JSON.parse(stdout.trim());
              resolve({
                content: parsed.result ?? stdout.trim(),
                sessionId: parsed.session_id,
                durationMs: parsed.duration_ms,
                cost: parsed.cost_usd ?? 0,
                tokensUsed: {
                  input: Math.floor((parsed.result?.length ?? stdout.length) / 4),
                  output: Math.floor((parsed.result?.length ?? stdout.length) / 4),
                },
              });
            } catch {
              // テキスト出力として処理
              resolve({
                content: stdout.trim(),
                tokensUsed: {
                  input: Math.floor(args.join(' ').length / 4),
                  output: Math.floor(stdout.length / 4),
                },
                cost: 0,
              });
            }
          } else {
            reject(new Error(
              `Claude CLI exited with code ${code}\nStderr: ${stderr}\nStdout: ${stdout.slice(0, 500)}`
            ));
          }
        });

        proc.on('error', (error: Error) => {
          clearTimeout(timeoutId);
          reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
        });
      });
    } finally {
      this.running--;
    }
  }
}
```

### 6.2 CodexCLIProvider 完全実装

```typescript
// packages/miyabi-agent-sdk/src/providers/codex-cli-provider.ts

import { spawn } from 'child_process';
import { execSync } from 'child_process';
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
} from './types.js';
import { parseFlexibleJSON } from './utils/json-parser.js';

export type CodexAgent = 'default' | 'architect' | 'worker' | 'reviewer' | 'explorer';
export type CodexApprovalPolicy = 'on-request' | 'auto-edit' | 'full-auto';

export interface CodexCLIProviderOptions {
  /** codex コマンドのパス */
  command?: string;
  /** デフォルトタイムアウト（ms） */
  defaultTimeout?: number;
  /** デフォルトモデル */
  model?: string;
  /** デフォルト承認ポリシー */
  defaultApprovalPolicy?: CodexApprovalPolicy;
  /** 作業ディレクトリ */
  workingDir?: string;
}

/**
 * タスクタイプからCodexエージェントへのマッピング
 */
const TASK_TO_AGENT: Record<string, CodexAgent> = {
  'code-generation':    'worker',
  'code-review':        'reviewer',
  'architecture-review': 'architect',
  'general-analysis':   'explorer',
  'issue-analysis':     'explorer',
  'task-decomposition': 'architect',
  'documentation':      'default',
};

/**
 * タスクタイプから承認ポリシーへのマッピング
 */
const TASK_TO_POLICY: Record<string, CodexApprovalPolicy> = {
  'code-generation':    'full-auto',
  'code-review':        'on-request',
  'architecture-review': 'on-request',
  'general-analysis':   'on-request',
  'issue-analysis':     'on-request',
  'task-decomposition': 'on-request',
  'documentation':      'auto-edit',
};

export class CodexCLIProvider implements LLMProvider {
  readonly name = 'codex-cli';

  private command: string;
  private defaultTimeout: number;
  private model?: string;
  private defaultApprovalPolicy: CodexApprovalPolicy;
  private workingDir?: string;

  constructor(options?: CodexCLIProviderOptions) {
    this.command = options?.command ?? 'codex';
    this.defaultTimeout = options?.defaultTimeout ?? 300_000; // 5分
    this.model = options?.model;
    this.defaultApprovalPolicy = options?.defaultApprovalPolicy ?? 'full-auto';
    this.workingDir = options?.workingDir;
  }

  async isAvailable(): Promise<boolean> {
    try {
      execSync(`${this.command} --version`, {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return true;
    } catch {
      return false;
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const args: string[] = [];

    // 承認ポリシー
    args.push('--approval-policy', this.defaultApprovalPolicy);

    // モデル
    if (this.model) {
      args.push('--model', this.model);
    }

    // プロンプト
    args.push('-p', request.prompt);

    const result = await this.spawnCodex(args, {
      cwd: request.workingDir ?? this.workingDir,
      timeout: request.timeout ?? this.defaultTimeout,
    });

    return {
      content: result.output,
      provider: this.name,
      model: this.model,
      cost: 0,
      durationMs: result.durationMs,
    };
  }

  async analyzeIssue(issue: IssueAnalysisRequest): Promise<IssueAnalysisResponse> {
    const prompt = `Analyze this GitHub Issue and return ONLY a JSON object:

Issue ${issue.number ? `#${issue.number}: ` : ''}${issue.title}

${issue.body || '(no body)'}

Return JSON:
{
  "type": "bug|feature|refactor|docs|test",
  "complexity": "small|medium|large|xlarge",
  "priority": "P0|P1|P2|P3",
  "labels": ["type:bug", "priority:P2-Medium"],
  "relatedFiles": ["file.ts"],
  "reasoning": "explanation"
}`;

    const result = await this.executeWithAgent('explorer', prompt, 60_000);
    const parsed = parseFlexibleJSON(result);

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

  async generateCode(request: CodeGenRequest): Promise<CodeGenResponse> {
    const prompt = `Generate ${request.language ?? 'TypeScript'} code for:

${request.requirements}

Context: ${request.context}

Return ONLY JSON:
{
  "files": [{ "path": "src/example.ts", "content": "...", "action": "create" }],
  "tests": [{ "path": "test/example.test.ts", "content": "...", "action": "create" }],
  "qualityScore": 85
}`;

    const result = await this.executeWithAgent('worker', prompt, 180_000);
    const parsed = parseFlexibleJSON(result);

    return {
      files: parsed.files ?? [],
      tests: parsed.tests ?? [],
      qualityScore: parsed.qualityScore ?? 70,
      cost: 0,
    };
  }

  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    const filesStr = request.files
      .map(f => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');

    const prompt = `Review this code. Focus on bugs, security issues, and missing tests.
Min quality score: ${request.standards?.minQualityScore ?? 80}

${filesStr}

Return ONLY JSON:
{
  "qualityScore": 85,
  "passed": true,
  "issues": [{ "severity": "warning", "file": "src/x.ts", "line": 42, "message": "desc" }],
  "suggestions": ["suggestion"]
}`;

    const result = await this.executeWithAgent('reviewer', prompt, 90_000);
    const parsed = parseFlexibleJSON(result);

    return {
      qualityScore: parsed.qualityScore ?? 0,
      passed: parsed.passed ?? false,
      issues: parsed.issues ?? [],
      suggestions: parsed.suggestions ?? [],
      cost: 0,
    };
  }

  async decompose(request: DecomposeRequest): Promise<DecomposeResponse> {
    const prompt = `Decompose this into executable tasks:

${request.prompt}

${request.context ? `Context: ${request.context}` : ''}

Return ONLY JSON:
{
  "tasks": [{
    "id": "task-1", "title": "Task", "description": "...",
    "type": "code", "agent": "codegen", "dependencies": [], "estimatedMinutes": 30
  }],
  "dag": [{ "from": "task-1", "to": "task-2" }],
  "totalEstimatedMinutes": 60
}`;

    const result = await this.executeWithAgent('architect', prompt, 120_000);
    const parsed = parseFlexibleJSON(result);

    return {
      tasks: parsed.tasks ?? [],
      dag: parsed.dag ?? [],
      totalEstimatedMinutes: parsed.totalEstimatedMinutes ?? 0,
    };
  }

  // ── Private ──────────────────────────────────────────────

  private async executeWithAgent(
    agent: CodexAgent,
    prompt: string,
    timeout: number
  ): Promise<string> {
    const policy = TASK_TO_POLICY[agent] ?? this.defaultApprovalPolicy;

    const args: string[] = [
      '--agent', agent,
      '--approval-policy', policy,
    ];

    if (this.model) {
      args.push('--model', this.model);
    }

    args.push('-p', prompt);

    const result = await this.spawnCodex(args, {
      cwd: this.workingDir,
      timeout,
    });

    return result.output;
  }

  private async spawnCodex(
    args: string[],
    options: { cwd?: string; timeout: number }
  ): Promise<{ output: string; durationMs: number }> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const proc = spawn(this.command, args, {
        cwd: options.cwd || process.cwd(),
        shell: false,
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

      const timeoutId = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Codex CLI timed out after ${options.timeout}ms`));
      }, options.timeout);

      proc.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        if (code === 0) {
          resolve({ output: stdout.trim(), durationMs });
        } else {
          reject(new Error(
            `Codex CLI exited with code ${code}\nStderr: ${stderr}\nStdout: ${stdout.slice(0, 500)}`
          ));
        }
      });

      proc.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn Codex CLI: ${error.message}`));
      });
    });
  }
}
```

### 6.3 AnthropicAPIProvider（フォールバック）

```typescript
// packages/miyabi-agent-sdk/src/providers/anthropic-api-provider.ts

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
} from './types.js';

/**
 * 既存の AnthropicClient を LLMProvider インターフェースでラップ
 *
 * フォールバック用: CLIが利用できない環境（CI/CD、Docker等）で使用
 */
export class AnthropicAPIProvider implements LLMProvider {
  readonly name = 'anthropic-api';
  private client: import('./types.js').AnthropicClient | null = null;

  async isAvailable(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private async getClient(): Promise<any> {
    if (!this.client) {
      // 動的importでバンドルサイズを最小化（CLIのみ利用時にSDKを読み込まない）
      const { AnthropicClient } = await import('../clients/AnthropicClient.js');
      this.client = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
    }
    return this.client;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: request.maxTokens ?? 8192,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic API');
    }

    const inputCost = (response.usage.input_tokens / 1_000_000) * 3.0;
    const outputCost = (response.usage.output_tokens / 1_000_000) * 15.0;

    return {
      content: content.text,
      provider: this.name,
      model: 'claude-sonnet-4-20250514',
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      cost: inputCost + outputCost,
    };
  }

  async analyzeIssue(issue: IssueAnalysisRequest): Promise<IssueAnalysisResponse> {
    const client = await this.getClient();
    const result = await client.analyzeIssue(issue.title, issue.body);
    return { ...result, cost: client.calculateCost(result.tokensUsed) };
  }

  async generateCode(request: CodeGenRequest): Promise<CodeGenResponse> {
    const client = await this.getClient();
    const result = await client.generateCode(
      request.requirements,
      request.context,
      request.language
    );
    return { ...result, cost: client.calculateCost(result.tokensUsed) };
  }

  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    const client = await this.getClient();
    const result = await client.reviewCode(request.files, request.standards);
    return { ...result, cost: client.calculateCost(result.tokensUsed) };
  }

  async decompose(request: DecomposeRequest): Promise<DecomposeResponse> {
    // LLMDecomposer のロジックを委譲
    const response = await this.generate({
      prompt: request.prompt,
      systemPrompt: 'You are a task decomposition expert. Return JSON only.',
      maxTokens: 4096,
    });

    const { parseFlexibleJSON } = await import('./utils/json-parser.js');
    const parsed = parseFlexibleJSON(response.content);

    return {
      tasks: parsed.tasks ?? [],
      dag: parsed.dag ?? [],
      totalEstimatedMinutes: parsed.totalEstimatedMinutes ?? 0,
    };
  }
}
```

### 6.4 JSON パーサー共通ユーティリティ

```typescript
// packages/miyabi-agent-sdk/src/providers/utils/json-parser.ts

/**
 * LLM出力からJSONを柔軟にパースするユーティリティ
 *
 * 対応パターン:
 * 1. ```json ... ``` ブロック
 * 2. ``` ... ``` ブロック
 * 3. { ... } 直接JSON
 * 4. 生テキスト
 */
export function parseFlexibleJSON(text: string): any {
  // Pattern 1: ```json ... ```
  let match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch { /* next */ }
  }

  // Pattern 2: ``` ... ```
  match = text.match(/```\s*([\s\S]*?)\s*```/);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch { /* next */ }
  }

  // Pattern 3: { ... } (最も外側の波括弧を検出)
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
      `Response (first 500 chars): ${text.slice(0, 500)}`
    );
  }
}
```

### 6.5 ProviderFactory - 設定からプロバイダーを生成

```typescript
// packages/miyabi-agent-sdk/src/providers/provider-factory.ts

import type { ProviderConfig, LLMProvider } from './types.js';
import { ClaudeCLIProvider } from './claude-cli-provider.js';
import { CodexCLIProvider } from './codex-cli-provider.js';
import { AnthropicAPIProvider } from './anthropic-api-provider.js';
import { TaskRouter, type RoutingConfig, type TaskType } from './task-router.js';

export interface LLMConfig {
  default_provider: ProviderConfig['type'];
  providers: {
    'claude-cli'?: {
      enabled: boolean;
      command?: string;
      timeout?: number;
      max_retries?: number;
      rate_limit?: { max_concurrent?: number; min_interval_ms?: number };
      options?: { output_format?: string; model?: string };
    };
    'codex-cli'?: {
      enabled: boolean;
      command?: string;
      timeout?: number;
      options?: { approval_policy?: string; sandbox_mode?: string };
    };
    'anthropic-api'?: {
      enabled: boolean;
      timeout?: number;
      max_retries?: number;
      options?: { model?: string; max_tokens?: number };
    };
  };
  routing?: Record<string, ProviderConfig['type']>;
  fallback_order?: ProviderConfig['type'][];
}

/**
 * .miyabi.yml の llm セクションからプロバイダーとルーターを構築
 */
export class ProviderFactory {
  private static instance: TaskRouter | null = null;

  /**
   * TaskRouter のシングルトンインスタンスを取得
   */
  static async create(config: LLMConfig): Promise<TaskRouter> {
    if (ProviderFactory.instance) {
      return ProviderFactory.instance;
    }

    const routing: Partial<RoutingConfig> = {};

    if (config.routing) {
      routing.routes = config.routing as Record<TaskType, ProviderConfig['type']>;
    }

    if (config.fallback_order) {
      routing.fallbackOrder = config.fallback_order;
    }

    const router = new TaskRouter(routing);

    // Claude CLI Provider
    const claudeConfig = config.providers['claude-cli'];
    if (claudeConfig?.enabled !== false) {
      const provider = new ClaudeCLIProvider({
        command: claudeConfig?.command,
        defaultTimeout: claudeConfig?.timeout,
        model: claudeConfig?.options?.model,
        maxConcurrent: claudeConfig?.rate_limit?.max_concurrent,
        minIntervalMs: claudeConfig?.rate_limit?.min_interval_ms,
      });

      if (await provider.isAvailable()) {
        router.registerProvider('claude-cli', provider);
      } else {
        console.warn('[ProviderFactory] claude CLI not found on PATH, skipping');
      }
    }

    // Codex CLI Provider
    const codexConfig = config.providers['codex-cli'];
    if (codexConfig?.enabled !== false) {
      const provider = new CodexCLIProvider({
        command: codexConfig?.command,
        defaultTimeout: codexConfig?.timeout,
        defaultApprovalPolicy: codexConfig?.options?.approval_policy as any,
      });

      if (await provider.isAvailable()) {
        router.registerProvider('codex-cli', provider);
      } else {
        console.warn('[ProviderFactory] codex CLI not found on PATH, skipping');
      }
    }

    // Anthropic API Provider (フォールバック)
    const apiConfig = config.providers['anthropic-api'];
    if (apiConfig?.enabled) {
      const provider = new AnthropicAPIProvider();

      if (await provider.isAvailable()) {
        router.registerProvider('anthropic-api', provider);
      } else {
        console.warn(
          '[ProviderFactory] ANTHROPIC_API_KEY not set, Anthropic API provider unavailable'
        );
      }
    }

    ProviderFactory.instance = router;
    return router;
  }

  /**
   * シングルトンをリセット（テスト用）
   */
  static reset(): void {
    ProviderFactory.instance = null;
  }
}
```

### 6.6 既存コードの移行例

#### BusinessBaseAgent の移行

```typescript
// packages/core/src/business-base-agent.ts（移行後）

import type { LLMProvider, GenerateResponse } from 'miyabi-agent-sdk/providers';

export interface BusinessAgentConfig {
  // anthropicApiKey は不要に
  // anthropicApiKey: string;  ← 削除
  provider: LLMProvider;       // ← 新規: プロバイダーインスタンスを受け取る
  githubToken?: string;
  debug?: boolean;
  logDirectory?: string;
}

export abstract class BusinessBaseAgent {
  protected config: BusinessAgentConfig;
  protected provider: LLMProvider;  // ← Anthropic SDK から LLMProvider に変更
  protected agentType: string;

  constructor(config: BusinessAgentConfig, agentType: string) {
    this.config = config;
    this.provider = config.provider;
    this.agentType = agentType;
  }

  /**
   * Call LLM with system prompt（CLI/API 透過）
   */
  protected async callClaude(
    prompt: string,
    systemPrompt?: string,
    _model?: string   // 互換性のため残すが無視
  ): Promise<string> {
    try {
      const response: GenerateResponse = await this.provider.generate({
        prompt,
        systemPrompt,
        maxTokens: 8192,
      });

      this.log(`Provider: ${response.provider}, Cost: $${response.cost ?? 0}`, 'info');
      return response.content;
    } catch (error) {
      this.log(`LLM Provider error: ${(error as Error).message}`, 'error');
      throw error;
    }
  }

  // ... 残りのメソッドは変更なし
}
```

#### LLMDecomposer の移行

```typescript
// packages/task-manager/src/decomposition/llm-decomposer.ts（移行後）

import type { LLMProvider, DecomposeResponse } from 'miyabi-agent-sdk/providers';

export interface LLMConfig {
  // provider: 'anthropic';  ← 削除（ハードコード制約を解除）
  provider: LLMProvider;     // ← プロバイダーインスタンスを受け取る
  model?: string;            // 参考用（プロバイダーが内部で管理）
  maxTokens?: number;
}

export class LLMDecomposer {
  private provider: LLMProvider;

  constructor(config: LLMConfig) {
    this.provider = config.provider;
  }

  async decompose(request: DecompositionRequest): Promise<DecompositionResult> {
    const response = await this.provider.decompose({
      prompt: request.prompt,
      context: request.context,
      constraints: request.constraints,
      maxTasks: request.maxTasks,
    });

    // 既存のバリデーション・変換ロジックをそのまま適用
    return this.transformResponse(response);
  }

  private transformResponse(response: DecomposeResponse): DecompositionResult {
    // ... 既存の変換ロジック
  }
}
```

### 6.7 .miyabi.yml 完全設定例

```yaml
# .miyabi.yml - Miyabi プロジェクト設定
# この設定ファイルはプロジェクトルートに配置してください

# ── LLMプロバイダー設定 ────────────────────────────────

llm:
  # デフォルトプロバイダー
  # 'claude-cli' | 'codex-cli' | 'anthropic-api'
  default_provider: claude-cli

  providers:
    # Claude Code CLI（推奨: APIキー不要、$0コスト）
    claude-cli:
      enabled: true
      command: claude                # Claude Code CLI のパス
      timeout: 120000                # 2分（Issue分析など）
      max_retries: 2
      rate_limit:
        max_concurrent: 1            # 同時実行数（レート制限対策）
        min_interval_ms: 2000        # 最小実行間隔
      options:
        output_format: json          # JSON出力モード
        # model: claude-sonnet-4-20250514  # モデル指定（省略時はデフォルト）

    # OpenAI Codex CLI（コーディング特化）
    codex-cli:
      enabled: true
      command: codex
      timeout: 300000                # 5分（コード生成を含むため長め）
      max_retries: 1
      options:
        approval_policy: full-auto   # 自動承認（プログラマティック実行時）
        sandbox_mode: workspace-write

    # Anthropic API（フォールバック用: CI/CD環境など）
    anthropic-api:
      enabled: false                 # 明示的に有効化が必要
      timeout: 60000
      max_retries: 3
      options:
        model: claude-sonnet-4-20250514
        max_tokens: 8192
      # api_key は環境変数 ANTHROPIC_API_KEY から取得

  # タスクタイプ別ルーティング
  routing:
    issue-analysis: claude-cli       # Issue分析 → Claude CLI
    code-generation: codex-cli       # コード生成 → Codex CLI (worker)
    code-review: claude-cli          # コードレビュー → Claude CLI
    task-decomposition: claude-cli   # タスク分解 → Claude CLI
    documentation: claude-cli        # ドキュメント → Claude CLI
    general-analysis: claude-cli     # 汎用分析 → Claude CLI
    architecture-review: codex-cli   # アーキテクチャ → Codex CLI (architect)

  # フォールバック順序
  # 優先プロバイダーが利用不可の場合、この順序で代替を試行
  fallback_order:
    - claude-cli
    - codex-cli
    - anthropic-api

# ── GitHub設定 ─────────────────────────────────────────

github:
  # token は環境変数 GITHUB_TOKEN から取得
  defaultPrivate: false

# ── プロジェクト設定 ───────────────────────────────────

project:
  defaultLanguage: typescript
  defaultFramework: next

# ── ワークフロー設定 ───────────────────────────────────

workflows:
  autoLabel: true
  autoReview: true
  autoSync: true

# ── CLI設定 ────────────────────────────────────────────

cli:
  language: ja
  theme: default
  verboseErrors: false
```

### 6.8 Provider エクスポート構造

```typescript
// packages/miyabi-agent-sdk/src/providers/index.ts

// 型定義
export type {
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
  ProviderConfig,
} from './types.js';

// プロバイダー実装
export { ClaudeCLIProvider } from './claude-cli-provider.js';
export type { ClaudeCLIProviderOptions } from './claude-cli-provider.js';

export { CodexCLIProvider } from './codex-cli-provider.js';
export type { CodexCLIProviderOptions, CodexAgent, CodexApprovalPolicy } from './codex-cli-provider.js';

export { AnthropicAPIProvider } from './anthropic-api-provider.js';

// ルーティング
export { TaskRouter, DEFAULT_ROUTING } from './task-router.js';
export type { RoutingConfig, TaskType } from './task-router.js';

// ファクトリ
export { ProviderFactory } from './provider-factory.js';
export type { LLMConfig } from './provider-factory.js';

// ユーティリティ
export { parseFlexibleJSON } from './utils/json-parser.js';
```

---

## 付録: ディレクトリ構造（移行後）

```
packages/miyabi-agent-sdk/src/
├── clients/                        # 既存（非推奨化予定）
│   ├── AnthropicClient.ts          # → AnthropicAPIProvider に統合
│   ├── ClaudeCodeClient.ts         # → ClaudeCLIProvider に統合
│   ├── GitHubClient.ts             # 変更なし
│   └── index.ts
├── providers/                      # 新規
│   ├── types.ts                    # LLMProvider インターフェース
│   ├── claude-cli-provider.ts      # Claude Code CLI ラッパー
│   ├── codex-cli-provider.ts       # Codex CLI ラッパー
│   ├── anthropic-api-provider.ts   # Anthropic API フォールバック
│   ├── task-router.ts              # タスクタイプ別ルーティング
│   ├── provider-factory.ts         # 設定ベースのプロバイダー生成
│   ├── utils/
│   │   └── json-parser.ts          # 共通JSONパーサー
│   └── index.ts                    # エクスポート
├── agents/                         # 既存（プロバイダー利用に移行）
│   ├── CodeGenAgent.ts
│   ├── ReviewAgent.ts
│   └── IssueAgent.ts
└── index.ts
```

---

## 付録: 環境変数の変化

### 移行前（API依存）

```bash
# 必須
GITHUB_TOKEN=ghp_xxx
ANTHROPIC_API_KEY=sk-ant-xxx        # $400/月のAPI費用

# オプション
GEMINI_API_KEY=xxx                  # Context Engineering用
```

### 移行後（CLI依存）

```bash
# 必須
GITHUB_TOKEN=ghp_xxx
# claude CLI がPATH上にインストールされていること
# codex CLI がPATH上にインストールされていること（オプション）

# フォールバック用（通常は不要）
# ANTHROPIC_API_KEY=sk-ant-xxx      # CI/CD環境でのみ設定
```

**結論**: `ANTHROPIC_API_KEY` は通常の開発ワークフローでは不要になり、月間API費用$400が$0に削減される。Claude Code / Codex CLI のサブスクリプション費用のみで全機能が動作する。
