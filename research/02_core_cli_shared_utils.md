# Miyabi Core・CLI・Shared-Utils パッケージ 詳細分析

## 1. PACKAGES/CORE - エージェントシステム基盤

**パッケージ名**: `@agentic-os/core`
**バージョン**: 0.1.0
**モジュール**: ESM

### 1.1 エクスポート構造
```
./            → ./dist/index.js (メイン)
./agents      → ./dist/agents/index.js
./types       → ./dist/types/index.js
```

### 1.2 型定義 (`types/index.ts`)

```typescript
type AgentStatus = 'idle' | 'running' | 'completed' | 'failed'

interface AgentConfig {
  name: string
  description?: string
  enabled?: boolean
  [key: string]: unknown
}

interface AgentResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: AgentStatus
  createdAt: string
  updatedAt: string
}
```

### 1.3 エージェントシステム (`agents/index.ts`)

```typescript
interface IAgent {
  name: string
  version: string
  execute(): Promise<void>
}

// Singletonパターン
class AgentRegistry {
  register(name: string, agent: IAgent): void
  get(name: string): IAgent | undefined
  getAll(): IAgent[]
}
```

### 1.4 BusinessBaseAgent（ビジネスエージェント基底クラス）

```typescript
interface BusinessAgentConfig {
  anthropicApiKey: string
  githubToken?: string
  debug?: boolean
  logDirectory?: string
}

interface BusinessTask {
  type: string
  description: string
  context?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

interface BusinessResult {
  success: boolean
  data: Record<string, unknown>
  insights?: string[]
  recommendations?: string[]
  nextSteps?: string[]
  error?: string
}

abstract class BusinessBaseAgent {
  constructor(config: BusinessAgentConfig, agentType: string)

  abstract execute(task: BusinessTask): Promise<BusinessResult>

  protected validateTask(task: BusinessTask): void
  protected log(message: string, level: 'info'|'warning'|'error'): void
  protected callClaude(prompt: string, systemPrompt?: string, model?: string): Promise<string>
  protected formatResult(...): BusinessResult
  protected handleError(error: Error, context: string): BusinessResult
}
```

**Claude APIモデル**: `claude-sonnet-4-20250514` (デフォルト)、Max Tokens: 8192

### 1.5 依存関係
| パッケージ | バージョン | 用途 |
|---|---|---|
| `@anthropic-ai/sdk` | ^0.71.2 | Claude API統合 |
| `@octokit/rest` | ^21.1.1 | GitHub REST API |
| `@octokit/graphql` | ^8.2.1 | GitHub GraphQL API |
| `chalk` | ^5.3.0 | ターミナルカラー |
| `ora` | ^9.0.0 | スピナー |
| `cli-table3` | ^0.6.5 | テーブル表示 |
| `boxen` | ^8.0.1 | ボックス描画 |

---

## 2. PACKAGES/CLI - コマンドラインインターフェース

**パッケージ名**: `miyabi`
**バージョン**: 0.22.0
**モジュール**: ESM
**実行**: `npx miyabi` / `miyabi`

### 2.1 依存関係（21パッケージ）
| パッケージ | バージョン | 用途 |
|---|---|---|
| `commander` | ^11.1.0 | CLIフレームワーク |
| `inquirer` | ^9.2.12 | インタラクティブプロンプト |
| `@octokit/rest` | ^21.1.1 | GitHub REST API |
| `@octokit/graphql` | ^8.2.1 | GitHub GraphQL |
| `chalk` | ^5.3.0 | ターミナルカラー |
| `ora` | ^9.0.0 | スピナー |
| `dotenv` | ^16.6.1 | .env読込 |
| `yaml` | ^2.3.4 | YAML解析 |
| `open` | ^10.0.3 | URLオープン |
| `agent-skill-bus` | ^1.2.0 | エージェントスキルキュー |
| `miyabi-agent-sdk` | ^0.1.0-alpha.2 | Agent SDK |

### 2.2 CLIコマンド構造（30コマンド）

```
miyabi
├── グローバルオプション:
│   ├── --json          (JSON出力モード)
│   ├── -y, --yes       (自動確認)
│   ├── -v, --verbose   (詳細ログ)
│   └── --debug         (デバッグモード)
├── 引数なし: インタラクティブメニュー
└── 30+コマンド
```

#### プロジェクト作成
| コマンド | 説明 | オプション |
|---|---|---|
| `init <name>` | 新プロジェクト作成 | --private, --skip-install, --json, -y |
| `install` | 既存プロジェクトに追加 | --dry-run, --non-interactive, -y |

#### ステータス・診断
| コマンド | 説明 |
|---|---|
| `status` | Issue/PR/状態表示（-w: watch） |
| `doctor` | システムヘルスチェック |
| `health` | クイックヘルスチェック |
| `config` | 設定管理 |

#### セットアップ・認証
| コマンド | 説明 |
|---|---|
| `setup` | セットアップウィザード |
| `onboard` | 初回オンボーディング |
| `auth` | GitHub OAuth (login/logout/status) |

#### 自動化
| コマンド | 説明 |
|---|---|
| `agent run <type>` | エージェント個別実行 |
| `run` | 統合実行インターフェース |
| `auto` | Water Spider完全自動化 |
| `omega` | Ω-System 6段階パイプライン |
| `pipeline` | コマンド合成（pipe/AND/OR/parallel） |
| `fix <issue>` | バグ修正ショートカット |
| `build <issue>` | 機能構築ショートカット |
| `ship` | デプロイショートカット |

#### DevOps
| コマンド | 説明 |
|---|---|
| `gni` | GitNexus コード知能（14サブコマンド） |
| `bus` | Agent Skill Busキュー管理（11サブコマンド） |
| `task` | タスク管理（list/view/add/done） |
| `cycle` | フィードバックループ制御 |
| `release` | リリース管理 + X/Discord通知 |
| `voice` | 音声制御モード |
| `skills` | Claude Codeスキル管理 |
| `todos` | TODO検出 → Issue作成 |
| `dashboard` | ダッシュボード管理 |
| `docs` | ドキュメント自動生成 |

### 2.3 設定システム (`config/loader.ts`)

```typescript
interface MiyabiConfig {
  github?: { token?, defaultPrivate?, defaultOrg? }
  project?: { defaultLanguage?, defaultFramework?, gitignoreTemplate?, licenseTemplate? }
  labels?: { custom?: Array<{ name, color, description }> }
  workflows?: { autoLabel?, autoReview?, autoSync? }
  cli?: { language?: 'ja'|'en', theme?: 'default'|'minimal', verboseErrors? }
}
```

設定ファイル検索順: `.miyabi.yml` → `.miyabirc` → `.miyabi.yaml`

### 2.4 認証システム

**GitHub OAuth Device Flow**:
1. デバイスコード要求
2. user_code + verification_uri表示
3. ブラウザ自動オープン
4. アクセストークンポーリング
5. スコープ検証
6. トークン返却

**OAuth App**: CLIENT_ID `Ov23liiMr5kSJLGJFNyn`、スコープ: `repo`, `workflow`

**認証情報保存**: `~/.miyabi/credentials.json` (パーミッション 0o600)

### 2.5 プロジェクト分析

**言語検出**: package.json, requirements.txt, go.mod, Cargo.toml, pom.xml, Gemfile, composer.json
**フレームワーク検出**: Next.js, React, Vue, Svelte, Express, NestJS, Django, Flask, FastAPI
**ビルドツール検出**: Vite, Webpack, Rollup, TypeScript
**パッケージマネージャ検出**: npm, yarn, pnpm, bundler, poetry

### 2.6 パイプラインシステム

```typescript
type PipelineOperator = '|' | '&&' | '||' | '&'

// | (pipe) - 順次実行、コンテキスト渡し
// && (AND) - 順次実行、前が失敗→スキップ
// || (OR) - 順次実行、前が失敗時のみ実行
// & (parallel) - 同時実行
```

**パイプラインコンテキスト**: pipelineId, issueNumber, prNumber, qualityScore, testsPassed, errors, checkpoints

### 2.7 フィードバックシステム

エラー自動報告先: `github.com/ShunsukeHayashi/Miyabi`
ラベル: `一周` (Isshū)

エラー種別検出:
- GitHub認証失敗
- リポジトリ作成失敗
- リソース未発見
- 権限エラー
- ネットワークエラー

### 2.8 エラーコード体系

```typescript
enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  CONFIG_ERROR = 2,      // GITHUB_TOKEN不足
  VALIDATION_ERROR = 3,   // 無効な引数
  NETWORK_ERROR = 4,     // API到達不可
  AUTH_ERROR = 5         // 認証失敗
}
```

### 2.9 クロスプラットフォーム対応

```typescript
isWindows(): boolean
isMacOS(): boolean
isLinux(): boolean
getPlatform(): 'windows' | 'macos' | 'linux' | 'unknown'
execCommand(command, options): string
isCommandAvailable(command): boolean
```

### 2.10 入力バリデーション（CWE-22対策）

- `validateProjectPath` - 絶対パス、パストラバーサル防止
- `validateGitHubOwner` - 39文字制限、英数字+ハイフン
- `validateGitHubRepo` - 100文字制限
- `validateGitHubToken` - フォーマット検証（ghp_, github_pat_, gho_）
- `validateFilePath` - ベースディレクトリ内制約
- `validateFileSize` - 10MB制限
- `sanitizeTemplateVariable` - 危険文字除去

---

## 3. PACKAGES/SHARED-UTILS - 共有ユーティリティ

**パッケージ名**: `@miyabi/shared-utils`
**バージョン**: 0.1.0
**外部依存関係**: なし（純TypeScript）

### 3.1 リトライロジック (`retry.ts`)

```typescript
interface RetryOptions {
  maxAttempts?: number        // デフォルト: 3
  initialDelayMs?: number     // デフォルト: 1000
  maxDelayMs?: number         // デフォルト: 10000
  backoffMultiplier?: number  // デフォルト: 2
  retryableErrors?: string[]  // デフォルト: ['ECONNRESET','ETIMEDOUT','ENOTFOUND','rate limit']
}

async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>
```

アルゴリズム: 指数バックオフ（delay *= 2、最大10秒）

### 3.2 APIクライアント (`api-client.ts`)

**HTTPコネクションプーリング**:
```typescript
const httpAgent = new HttpAgent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000
})
```
性能向上: 25-50%、高並行時最大10倍

**LRUキャッシュ**:
```typescript
const githubCache = new LRUCache<string, any>({
  max: 500,          // 500エントリ
  ttl: 1000 * 60 * 5, // 5分TTL
  updateAgeOnGet: true
})
```

**主要関数**:
- `getGitHubClient(token?)` - Singletonパターン、コネクションプーリング使用
- `withGitHubCache<T>(key, fetcher)` - キャッシュファースト取得
- `getConnectionPoolStats()` - プール統計
- `destroyAllConnections()` - グレースフルシャットダウン

### 3.3 非同期ファイルライター (`async-file-writer.ts`)

```typescript
class AsyncFileWriter { // Singleton
  FLUSH_INTERVAL_MS = 1000  // 1秒ごとにフラッシュ
  MAX_BATCH_SIZE = 50       // 50操作でフラッシュ

  async write(filePath: string, content: string): Promise<void>
  async append(filePath: string, content: string): Promise<void>
  async flush(): Promise<void>
  forceFlush(): Promise<void>
  getStats(): { queueLength, isProcessing, hasScheduledFlush }
}
```

**パフォーマンス**: 同期操作比で**96.34%改善**

### 3.4 システムオプティマイザー (`system-optimizer.ts`)

```typescript
interface ConcurrencyConfig {
  optimal: number       // バランス推奨
  conservative: number  // 最適の75%
  aggressive: number    // 最適+1（上限8）
  recommended: number   // 最適と同じ
}
```

**最適並行数アルゴリズム**:
```
cpuBased = max(1, cpuCount - 1)
memoryBased = floor(freeMemory / 2GB)
isOverloaded = loadAverage1m > cpuCount
loadAdjusted = min(cpuBased, memoryBased)
if overloaded: loadAdjusted *= 0.75
optimal = min(loadAdjusted, 8)
```

---

## 4. パッケージ間依存関係

```
packages/cli
├── @agentic-os/core
├── @miyabi/shared-utils
├── agent-skill-bus
├── miyabi-agent-sdk
└── 外部: @octokit/*, chalk, inquirer, yaml, dotenv

@agentic-os/core
├── 再エクスポート: @miyabi/coding-agents
├── エクスポート: BusinessBaseAgent
└── 外部: @octokit/*, @anthropic-ai/sdk

@miyabi/shared-utils
├── モノレポ依存なし
└── 外部依存なし（純TypeScript）
```

## 5. 設計パターン

| パターン | 使用箇所 |
|---|---|
| Singleton | AsyncFileWriter, GitHubClient, AgentRegistry |
| Factory | AgentFactory, register*Command関数 |
| Builder | AgentConfig, PipelineContext |
| Observer | Pipeline executor (EventEmitter) |
| Strategy | リトライ戦略、コマンド実行戦略 |
| Composite | パイプラインコマンド合成 |

## 6. パフォーマンス最適化まとめ

| 最適化 | 効果 |
|---|---|
| HTTPコネクションプーリング | 25-50%改善、高並行時10倍 |
| LRUキャッシュ | APIレート制限消費削減 |
| 非同期ファイル書込み | 96.34%改善 |
| システム認識型並行制御 | CPU/メモリ/負荷に応じた1-8スケーリング |
