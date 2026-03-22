# Miyabi タスク管理・GitHub Projects・テスト 詳細分析

## 1. TASK-MANAGER パッケージ

**パッケージ**: `@miyabi/task-manager` v0.1.0
**依存**: @anthropic-ai/sdk, @octokit/rest, @octokit/graphql, uuid

### 1.1 タスク状態マシン（10状態）

```
draft → pending → analyzing → implementing → reviewing → deploying → done
                      ↓             ↓             ↓           ↓
                   blocked ←────────┴─────────────┴───────────┘
                      ↓
                   failed → (retry) → pending
                      ↓
                 cancelled
```

### 1.2 タスクタイプ・エージェントタイプ

**タスクタイプ（7）**: feature, bug, refactor, docs, test, deployment, chore
**エージェントタイプ（7）**: CoordinatorAgent, CodeGenAgent, ReviewAgent, IssueAgent, PRAgent, DeploymentAgent, TaskManagerAgent
**重大度**: Sev.1-Critical, Sev.2-High, Sev.3-Medium, Sev.4-Low

### 1.3 ManagedTask インターフェース

```typescript
interface ManagedTask extends BaseTask {
  currentState: TaskState;
  stateHistory: TaskStateTransition[];
  githubIssueNumber?: number;
  projectItemId?: string;
  decomposedFrom?: string;
  retryCount: number;
  executionWorktreePath?: string;
  startedAt?: string;
  completedAt?: string;
  syncVersion: number;
  pendingSyncChanges: SyncChange[];
}
```

### 1.4 状態遷移ルール（28ルール）

| From | To | 備考 |
|---|---|---|
| draft | pending, cancelled | - |
| pending | analyzing, implementing, blocked, cancelled | - |
| analyzing | implementing, pending, blocked, failed, cancelled | - |
| implementing | reviewing, blocked, failed, cancelled | - |
| reviewing | implementing, deploying, done, failed, cancelled | deploying時PR draft作成 |
| deploying | done, failed, cancelled | done時Issue close + PR merge |
| blocked | pending, cancelled | - |
| failed | pending, cancelled | - |
| done | pending | reopen |
| cancelled | draft | reopen |

### 1.5 LLMタスク分解

```typescript
class LLMDecomposer {
  constructor(provider: 'anthropic', model: string, apiKey: string, maxTokens?: number, temperature?: number)

  async decompose(request: DecompositionRequest): Promise<DecompositionResult>
}

interface DecompositionResult {
  id: string;
  originalPrompt: string;
  tasks: ManagedTask[];
  dag: DAGResult;
  metadata: DecompositionMetadata;
  warnings: DecompositionWarning[];
}

interface DAGResult {
  nodes: ManagedTask[];
  edges: DAGEdge[];
  levels: string[][];         // トポロジカルソート済みレベル
  criticalPath: string[];
  estimatedDurationMinutes: number;
}
```

**警告コード**: CIRCULAR_DEPENDENCY, MISSING_DEPENDENCY, DUPLICATE_TASK_ID, INVALID_TASK_TYPE, TOO_MANY_TASKS, NO_TASKS_GENERATED, LOW_CONFIDENCE, PARSE_ERROR

### 1.6 タスク実行システム

```typescript
class TaskExecutor {
  registerAgent(executor): void
  execute(task): Promise<ExecutionResult>
  executeParallel(tasks, concurrency): Promise<ExecutionResult[]>
  executeSequence(tasks): Promise<ExecutionResult[]>
  cancel(taskId): boolean
  getRunningTasks(): ManagedTask[]
}

interface ExecutionResult {
  taskId: string;
  success: boolean;
  state: TaskState;
  output?: string;
  error?: string;
  durationMs: number;
  agentType: AgentType;
  artifacts?: string[];
}
```

### 1.7 Worktreeコーディネーション

```typescript
class WorktreeCoordinator {
  initialize(): Promise<void>
  executeInWorktree(task): Promise<ExecutionResult>  // 分離git worktreeで実行
  executeParallel(tasks, concurrency): Promise<ExecutionResult[]>
}
```

### 1.8 GitHub同期システム

**GitHubLabelSync**: タスク状態 ↔ GitHub Issueラベル同期
**ProjectsV2Sync**: タスク状態 ↔ GitHub Projects V2カスタムフィールド同期

**BidirectionalSync**:
```typescript
interface BidirectionalSyncOptions {
  conflictStrategy: 'local-wins' | 'github-wins' | 'newest-wins' | 'ask';
  syncLabels: boolean;
  syncProjects: boolean;
  batchSize: number;
  validateTransitions: boolean;
}
```

### 1.9 TaskManager メインクラス

```typescript
class TaskManager {
  // 分解
  decompose(request): Promise<DecompositionResult>

  // タスク管理
  createTask(input, id?): ManagedTask
  getTask(id): ManagedTask | undefined
  getTasks(): ManagedTask[]
  getTasksByState(state): ManagedTask[]
  updateTaskState(taskId, state, triggeredBy, reason): boolean

  // 実行
  executeTask(taskId): Promise<ExecutionResult>
  executeTasks(taskIds, options): Promise<ExecutionResult[]>
  executeByDAG(result): Promise<ExecutionResult[]>  // DAG順序で実行
  cancelTask(taskId): boolean

  // 同期
  syncTasks(direction): Promise<SyncResult>
  linkTaskToIssue(taskId, issueNumber): boolean
}
```

---

## 2. GITHUB-PROJECTS パッケージ

**パッケージ**: `@agentic-os/github-projects` v1.0.0

### 2.1 GitHubProjectsClient

```typescript
class GitHubProjectsClient {
  // プロジェクト
  getProjectInfo(): Promise<ProjectInfo>
  getProjectItems(limit?): Promise<ProjectItem[]>
  getProjectItemByNumber(contentNumber): Promise<ProjectItem | null>

  // フィールド更新
  updateFieldValue(input): Promise<void>
  setSingleSelectFieldByName(itemId, fieldName, optionName): Promise<void>
  setNumberField(itemId, fieldName, value): Promise<void>

  // メトリクス
  calculateAgentMetrics(): Promise<AgentMetrics[]>
  generateWeeklyReport(): Promise<WeeklyReport>

  // レート制限
  getRateLimitInfo(): Promise<RateLimitInfo>
}
```

### 2.2 カスタムフィールド

| フィールド | タイプ | 用途 |
|---|---|---|
| Agent | SINGLE_SELECT | CodeGen, Review, Deploy, Coordinator, TechLead |
| Duration | NUMBER | 実行時間（ms） |
| Cost | NUMBER | APIコスト（USD） |
| Quality Score | NUMBER | 0-100 |
| Sprint | ITERATION | スプリント追跡 |

### 2.3 メトリクス

```typescript
interface AgentMetrics {
  agent: string;
  executionCount: number;
  avgDuration: number;
  avgCost: number;
  avgQualityScore: number;
  totalCost: number;
  successRate?: number;
}

interface WeeklyReport {
  week: string;
  totalIssues: number;
  completedIssues: number;
  agentMetrics: AgentMetrics[];
  topQualityIssues: Array<{ number, title, score, url }>;
  totalCost: number;
  avgQualityScore: number;
  completionRate: number;
}
```

---

## 3. テストアーキテクチャ

### 3.1 テストフレームワーク

| ツール | バージョン | 用途 |
|---|---|---|
| Vitest | 3.2.4 | ユニット・統合テスト |
| @vitest/coverage-v8 | 3.2.4 | カバレッジ |
| @testing-library/react | 16.3.1 | コンポーネントテスト |
| Playwright | 1.56.0 | E2Eテスト |

### 3.2 テストカテゴリ

**Task Manager テスト** (`packages/task-manager/tests/`):
- state/task-state-machine.test.ts (212行)
- decomposition/decomposition-validator.test.ts
- execution/task-executor.test.ts
- sync/bidirectional-sync.test.ts
- sync/github-label-sync.test.ts

**ルートテスト** (`tests/`):
- BaseAgent.test.ts, CodeGenAgent.test.ts, ReviewAgent.test.ts
- SecurityScanner.test.ts, DAGManager.test.ts
- coordinator.test.ts, github-client.test.ts
- review-loop.test.ts, webhook-router.test.ts, worktree-manager.test.ts

**統合テスト** (`tests/integration/`):
- github-os-integration.test.ts
- agent-verification.test.ts
- system.test.ts
- plans-generation.test.ts

**E2Eテスト** (`tests/e2e/`):
- demo/miyabi-demo.spec.ts
- demo/dashboard-quick-check.spec.ts

**パッケージ別テスト**:
- coding-agents: improvements, intelligent-agent, security-validator
- doc-generator: CodeAnalyzer, TemplateEngine
- mcp-bundle: cache, security (4ファイル), validation

---

## 4. テンプレートシステム

### 4.1 Miyabi定義テンプレート（Jinja2）

| テンプレート | 内容 |
|---|---|
| base.yaml.j2 | メタデータ・コンテンツブロック |
| world_definition.yaml.j2 | World Space定義 |
| entities.yaml.j2 | 14エンティティ定義 |
| relations.yaml.j2 | 39リレーション定義 |
| labels.yaml.j2 | 57ラベル定義 |
| workflows.yaml.j2 | 5ワークフロー定義 |
| agents.yaml.j2 | 21エージェント定義 |
| skills.yaml.j2 | 18スキル定義 |
| universal_task_execution.yaml.j2 | Ω-System定義 |

### 4.2 CLIテンプレート

- CLAUDE.md.template, README.md.template, .env.example.template
- 14ワークフローYAMLテンプレート
- Claude Code設定テンプレート

---

## 5. Miyabi定義システム（miyabi_def/）

### 5.1 14コアエンティティ

Issue, Task, Agent, PR, Label, QualityReport, Command, Escalation, Deployment, LDDLog, DAG, Worktree, DiscordCommunity, SubIssue

### 5.2 39リレーション

カーディナリティ: N1(1:1), N2(1:N), N3(N:N)

### 5.3 5ワークフロー（38ステージ）

| ID | ワークフロー |
|---|---|
| W1 | Issue作成・トリアージ |
| W2 | タスク分解 |
| W3 | コード実装 |
| W4 | コードレビュー |
| W5 | デプロイメント |

### 5.4 生成システム

```bash
python generate.py              # 全ファイル生成
python generate.py --list-templates    # テンプレート一覧
python generate.py --intent <file>     # インテント駆動生成
```

---

## 6. リリース

- **最新**: macOS ARM64バイナリ（8.8MB）
- **検証**: SHA256チェックサム
- **バージョン**: v0.1.1

---

## 7. パフォーマンスメトリクス

| メトリクス | 目標 |
|---|---|
| Issue → PR | 4-7分 |
| コード生成 | 3-4分 |
| 品質チェック | 1分 |
| PR作成 | 30秒 |
| ファイル/タスク | 6-12ファイル |
| 行数/タスク | 450-800行 |
| 品質スコア | 80-95点 |
| テストカバレッジ | 85%+ |

---

## 8. 設計パターン

| パターン | 用途 |
|---|---|
| State Machine | タスクライフサイクル管理 |
| Decomposition | LLMベースタスク分解 + DAG |
| Bidirectional Sync | ローカル↔GitHub状態同期 |
| Worktree Isolation | 並列タスク分離実行 |
| Plugin/Agent | プラグ可能エージェント実行者 |
| Configuration-Driven | 全サブシステム集中設定 |
