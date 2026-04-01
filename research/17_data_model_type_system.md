# Miyabi データモデル & 型システム 完全定義書

本ドキュメントは、Miyabi プロジェクト全体のデータモデルおよび型システムを網羅的に記述する。8つのリサーチファイル（01-08）から抽出した全 interface / type / enum / class を統合し、各データモデル間の関係性を明確にする。

---

## 目次

1. [コアデータモデル](#1-コアデータモデル)
2. [GitHub データモデル](#2-github-データモデル)
3. [品質データモデル](#3-品質データモデル)
4. [通信データモデル](#4-通信データモデル)
5. [設定データモデル](#5-設定データモデル)
6. [Context Engineering データモデル](#6-context-engineering-データモデル)
7. [型システム設計原則](#7-型システム設計原則)

---

## 1. コアデータモデル

### 1.1 Task / ManagedTask

タスクはシステムの中核エンティティであり、10状態のステートマシンと7タイプで管理される。

#### TaskState（10状態）

```typescript
type TaskState =
  | 'draft'
  | 'pending'
  | 'analyzing'
  | 'implementing'
  | 'reviewing'
  | 'deploying'
  | 'done'
  | 'blocked'
  | 'failed'
  | 'cancelled';
```

**状態遷移図**:
```
draft → pending → analyzing → implementing → reviewing → deploying → done
                      |             |             |           |
                   blocked <--------+-------------+-----------+
                      |
                   failed → (retry) → pending
                      |
                 cancelled
```

**状態遷移ルール（28ルール）**:

| From | To | 備考 |
|---|---|---|
| draft | pending, cancelled | 初期状態 |
| pending | analyzing, implementing, blocked, cancelled | キュー待ち |
| analyzing | implementing, pending, blocked, failed, cancelled | Issue分析中 |
| implementing | reviewing, blocked, failed, cancelled | コード生成中 |
| reviewing | implementing, deploying, done, failed, cancelled | 品質ゲート |
| deploying | done, failed, cancelled | デプロイ実行中 |
| blocked | pending, cancelled | ブロック解除 |
| failed | pending, cancelled | リトライ |
| done | pending | 再オープン |
| cancelled | draft | 復活 |

#### TaskType（7タイプ）

```typescript
type TaskType =
  | 'feature'
  | 'bug'
  | 'refactor'
  | 'docs'
  | 'test'
  | 'deployment'
  | 'chore';
```

#### Task（基本）

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: AgentStatus;
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
}
```

#### BaseTask

```typescript
interface BaseTask {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  severity: Severity;
  assignedAgent?: AgentType;
  metadata?: Record<string, unknown>;
}
```

#### ManagedTask（拡張タスク）

```typescript
interface ManagedTask extends BaseTask {
  currentState: TaskState;
  stateHistory: TaskStateTransition[];
  githubIssueNumber?: number;
  projectItemId?: string;
  decomposedFrom?: string;        // 親タスクID
  retryCount: number;
  executionWorktreePath?: string;  // git worktree パス
  startedAt?: string;             // ISO 8601
  completedAt?: string;           // ISO 8601
  syncVersion: number;            // 楽観的ロック用バージョン
  pendingSyncChanges: SyncChange[];
}
```

#### TaskStateTransition

```typescript
interface TaskStateTransition {
  from: TaskState;
  to: TaskState;
  triggeredBy: string;     // エージェント名 or ユーザー
  reason?: string;
  timestamp: string;       // ISO 8601
}
```

#### BusinessTask

```typescript
interface BusinessTask {
  type: string;
  description: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

---

### 1.2 Agent

7つのコーディングエージェントと14のビジネスエージェントを型で管理する。

#### AgentType（コーディング: 7）

```typescript
type AgentType =
  | 'coordinator'
  | 'codegen'
  | 'review'
  | 'issue'
  | 'pr'
  | 'deployment'
  | 'test';
```

#### BusinessAgentType（ビジネス: 14）

```typescript
type BusinessAgentType =
  | 'ai-entrepreneur'       // あきんどさん
  | 'product-concept'       // ひらめきくん
  | 'product-design'        // かくん
  | 'funnel-design'         // みちびきくん
  | 'persona'               // なりきりん
  | 'self-analysis'         // じぶんしるん
  | 'market-research'       // しらべるん
  | 'marketing'             // ひろめるん
  | 'content-creation'      // かくちゃん
  | 'sns-strategy'          // つぶやきくん
  | 'youtube'               // どうがん
  | 'sales'                 // うりこみくん
  | 'crm'                   // つなぐん
  | 'analytics';            // かぞえるん
```

#### AgentStatus

```typescript
type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';
```

#### AgentPermissionLevel（カラーコーディング）

```typescript
type AgentPermissionLevel =
  | 'leader'      // 🔴 赤 - 統括権限、並列実行不可
  | 'executor'    // 🟢 緑 - 実行権限、並列実行可
  | 'analyst'     // 🔵 青 - 分析権限、並列実行可
  | 'support';    // 🟡 黄 - 条件付き実行
```

#### IAgent

```typescript
interface IAgent {
  name: string;
  version: string;
  execute(): Promise<void>;
}
```

#### AgentContext

```typescript
interface AgentContext {
  owner: string;
  repo: string;
  issueNumber?: number;
  token: string;
  workdir: string;
  config: AgentConfig;
}
```

#### AgentResult<T>（ジェネリック）

```typescript
interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;    // ISO 8601
}
```

#### AgentResult（SDK版）

```typescript
interface AgentResult {
  status: 'success' | 'failure' | 'partial' | 'timeout';
  message: string;
  metrics: AgentMetrics;
  artifacts?: AgentArtifact[];
  error?: AgentError;
}
```

#### BusinessResult

```typescript
interface BusinessResult {
  success: boolean;
  data: Record<string, unknown>;
  insights?: string[];
  recommendations?: string[];
  nextSteps?: string[];
  error?: string;
}
```

#### AgentRegistry（Singleton）

```typescript
class AgentRegistry {
  register(name: string, agent: IAgent): void;
  get(name: string): IAgent | undefined;
  getAll(): IAgent[];
}
```

#### ActiveAgentInfo

```typescript
interface ActiveAgentInfo {
  agentType: AgentType;
  taskId: string;
  startTime: string;
  status: AgentStatus;
}
```

---

### 1.3 Workflow

ビジュアルワークフローエディタで使用されるDAGベースのワークフロー定義。

#### WorkflowNodeType

```typescript
type WorkflowNodeType = 'agent' | 'issue' | 'condition';
```

#### Workflow

```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];          // @xyflow/react の Node 型
  edges: Edge[];          // @xyflow/react の Edge 型
  createdAt: string;      // ISO 8601
  updatedAt: string;      // ISO 8601
}
```

#### AgentNodeData

```typescript
interface AgentNodeData {
  label: string;
  agentType: AgentType;
  issueNumber?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}
```

#### ConditionNodeData

```typescript
interface ConditionNodeData {
  label: string;
  condition: string;       // 条件式
  trueLabel?: string;
  falseLabel?: string;
}
```

#### IssueNodeData

```typescript
interface IssueNodeData {
  label: string;
  issueNumber: number;
  title?: string;
  status?: 'open' | 'closed';
}
```

---

### 1.4 Message / AgentMessage

エージェント間通信の標準メッセージプロトコル。

#### MessageType（8タイプ）

```typescript
type MessageType =
  | 'TASK_ASSIGNMENT'        // Coordinator → Specialist
  | 'STATUS_UPDATE'          // Specialist → Coordinator
  | 'ESCALATION'             // Specialist → Coordinator
  | 'RESULT_REPORT'          // Specialist → Coordinator
  | 'ERROR_REPORT'           // Any → Coordinator
  | 'HEARTBEAT'              // ヘルスチェック
  | 'CAPABILITY_QUERY'       // 能力問い合わせ
  | 'CAPABILITY_RESPONSE';   // 能力応答

```

#### MessagePriority（4レベル）

```typescript
type MessagePriority = 0 | 1 | 2 | 3;
// 0 = CRITICAL
// 1 = HIGH
// 2 = MEDIUM
// 3 = LOW
```

#### AgentMessage<T>（ジェネリック）

```typescript
interface AgentMessage<T = unknown> {
  id: string;                  // UUID v4
  from: AgentType;
  to: AgentType;
  type: MessageType;
  priority: MessagePriority;
  payload: T;
  timestamp: string;           // ISO 8601
  correlationId?: string;      // リクエスト-レスポンス紐付け
  ttl?: number;                // Time-to-live（ms）
}
```

#### MessageResponse

```typescript
interface MessageResponse {
  messageId: string;           // 元メッセージID
  status: 'accepted' | 'rejected' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}
```

---

### 1.5 Config

階層的設定モデル。

#### AgentConfig（基本）

```typescript
interface AgentConfig {
  name: string;
  description?: string;
  enabled?: boolean;
  [key: string]: unknown;     // 拡張可能
}
```

#### BusinessAgentConfig

```typescript
interface BusinessAgentConfig {
  anthropicApiKey: string;
  githubToken?: string;
  debug?: boolean;
  logDirectory?: string;
}
```

#### MiyabiConfig（CLI設定）

```typescript
interface MiyabiConfig {
  github?: {
    token?: string;
    defaultPrivate?: boolean;
    defaultOrg?: string;
  };
  project?: {
    defaultLanguage?: string;
    defaultFramework?: string;
    gitignoreTemplate?: string;
    licenseTemplate?: string;
  };
  labels?: {
    custom?: Array<{
      name: string;
      color: string;
      description: string;
    }>;
  };
  workflows?: {
    autoLabel?: boolean;
    autoReview?: boolean;
    autoSync?: boolean;
  };
  cli?: {
    language?: 'ja' | 'en';
    theme?: 'default' | 'minimal';
    verboseErrors?: boolean;
  };
}
```

**設定ファイル検索順**: `.miyabi.yml` → `.miyabirc` → `.miyabi.yaml`

---

## 2. GitHub データモデル

### 2.1 Issue（53ラベル分類）

#### Label カテゴリ（10カテゴリ、53+ラベル）

```typescript
type LabelCategory =
  | 'type'
  | 'priority'
  | 'severity'
  | 'state'
  | 'agent'
  | 'quality'
  | 'squad'
  | 'effort'
  | 'domain'
  | 'status';
```

#### Priority（4レベル）

```typescript
type Priority =
  | 'P0-Critical'
  | 'P1-High'
  | 'P2-Medium'
  | 'P3-Low';
```

#### Severity（4レベル）

```typescript
type Severity =
  | 'Sev.1-Critical'
  | 'Sev.2-High'
  | 'Sev.3-Medium'
  | 'Sev.4-Low';
```

#### LabelDefinition

```typescript
interface LabelDefinition {
  name: string;
  color: string;          // 6桁HEXカラー
  description: string;
  category: LabelCategory;
}
```

#### ラベル詳細一覧

| カテゴリ | 数 | ラベル例 |
|---|---|---|
| State | 8 | `state:pending`, `state:analyzing`, `state:implementing`, `state:reviewing`, `state:done`, `state:blocked`, `state:deploying`, `state:failed` |
| Agent | 6 | `agent:coordinator`, `agent:codegen`, `agent:review`, `agent:issue`, `agent:pr`, `agent:deployment` |
| Priority | 4 | `priority:P0-Critical`, `priority:P1-High`, `priority:P2-Medium`, `priority:P3-Low` |
| Type | 7 | `type:feature`, `type:bug`, `type:docs`, `type:refactor`, `type:test`, `type:architecture`, `type:deployment` |
| Severity | 4 | `severity:Sev.1-Critical`, `severity:Sev.2-High`, `severity:Sev.3-Medium`, `severity:Sev.4-Low` |
| Phase | 5 | `phase:planning`, `phase:implementation`, `phase:testing`, `phase:deployment`, `phase:monitoring` |
| Special | 7 | `security`, `cost-watch`, `dependencies`, `experiment` 等 |
| Trigger | 4 | `🤖agent-execute`, `generate-report`, `deploy-staging`, `deploy-production` |
| Quality | 4 | `quality:excellent(90+)`, `quality:good(80-89)`, `quality:needs-improvement(60-79)`, `quality:poor(<60)` |
| Community | 4 | `good-first-issue`, `help-wanted`, `question`, `discussion` |

---

### 2.2 PR（Conventional Commits）

#### ConventionalCommitType

```typescript
type ConventionalCommitType =
  | 'feat'
  | 'fix'
  | 'refactor'
  | 'docs'
  | 'test'
  | 'style'
  | 'perf'
  | 'chore'
  | 'ci';
```

#### BranchNaming

```typescript
// パターン: {type}/{issue_number}-{description}
// 例: feat/270-add-auth, fix/123-null-pointer
// エージェント生成: agent/issue-{number}-{timestamp}
type BranchName = `${ConventionalCommitType}/${number}-${string}` | `agent/issue-${number}-${string}`;
```

#### PRLabels（エージェント生成時）

```typescript
type AgentPRLabel =
  | '🤖agent-generated'
  | 'automated'
  | 'needs-review'
  | '🚨escalated'      // 失敗時
  | '❌agent-failed';   // 失敗時
```

---

### 2.3 Project Item（カスタムフィールド5つ）

#### ProjectItem

```typescript
interface ProjectItem {
  id: string;
  contentNumber: number;        // Issue/PR 番号
  title: string;
  status: string;
  fields: ProjectCustomFields;
}
```

#### ProjectCustomFields

```typescript
interface ProjectCustomFields {
  agent: ProjectAgentOption;       // SINGLE_SELECT
  duration: number;                // NUMBER - 実行時間（ms）
  cost: number;                    // NUMBER - APIコスト（USD）
  qualityScore: number;            // NUMBER - 0-100
  sprint: string;                  // ITERATION - スプリント追跡
}
```

#### ProjectAgentOption

```typescript
type ProjectAgentOption =
  | 'CodeGen'
  | 'Review'
  | 'Deploy'
  | 'Coordinator'
  | 'TechLead';
```

#### ProjectInfo

```typescript
interface ProjectInfo {
  id: string;
  title: string;
  number: number;
  fields: ProjectFieldInfo[];
}
```

#### ProjectFieldInfo

```typescript
interface ProjectFieldInfo {
  id: string;
  name: string;
  dataType: 'SINGLE_SELECT' | 'NUMBER' | 'ITERATION' | 'TEXT' | 'DATE';
  options?: Array<{ id: string; name: string }>;
}
```

---

### 2.4 Webhook Event

#### WebhookEventType

```typescript
type WebhookEventType =
  | 'issues.opened'
  | 'issues.labeled'
  | 'issues.commented'
  | 'pull_request.opened'
  | 'pull_request.merged'
  | 'pull_request.closed'
  | 'push'
  | 'workflow_dispatch';
```

#### WebSocketMessage（ダッシュボード用）

```typescript
// Server → Client
interface DashboardMessage {
  type: 'dashboard';
  data: AgentDashboard;
  timestamp: string;
}

interface AlertMessage {
  type: 'alert';
  data: DashboardAlert;
  timestamp: string;
}

// Client → Server
interface RequestDashboardMessage {
  type: 'request_dashboard';
}

interface AcknowledgeAlertMessage {
  type: 'acknowledge_alert';
  alertId: string;
}
```

---

## 3. 品質データモデル

### 3.1 QualityScore（100点、5次元）

#### QualityScore

```typescript
interface QualityScore {
  total: number;              // 0-100 合計スコア
  dimensions: QualityDimensions;
  grade: QualityGrade;
}
```

#### QualityDimensions（ReviewAgent 用）

```typescript
interface QualityDimensions {
  typeSafety: number;        // 重み 0.3
  testCoverage: number;      // 重み 0.3
  lintCompliance: number;    // 重み 0.2
  documentation: number;     // 重み 0.2
}
```

**スコア計算式**:
```
score = type_safety * 0.3 + test_coverage * 0.3 + lint_compliance * 0.2 + docs * 0.2
```

#### QualityDimensions（Quality Gate 用 - 6次元）

```typescript
interface QualityGateDimensions {
  correctness: number;       // 重み 0.25
  security: number;          // 重み 0.20
  performance: number;       // 重み 0.15
  readability: number;       // 重み 0.15
  maintainability: number;   // 重み 0.15
  testCoverage: number;      // 重み 0.10
}
```

#### QualityGrade

```typescript
type QualityGrade =
  | 'excellent'    // >= 90
  | 'good'         // >= 80
  | 'fair'         // >= 60
  | 'poor';        // < 60
```

#### QualityGateThreshold

```typescript
interface QualityGateThreshold {
  excellent: 90;     // 合格（最高品質）
  good: 80;          // 合格（PR作成許可）
  retry: 60;         // リトライ対象（最大3回）
  escalation: 40;    // エスカレーション
  block: 0;          // ブロック
}
```

---

### 3.2 ReviewResult

```typescript
interface ReviewResult {
  score: QualityScore;
  issues: ReviewIssue[];
  passed: boolean;            // score >= 80
  retryCount: number;         // 最大3回
  autoRetry: boolean;         // score < 80 && retryCount < 3
}
```

#### ReviewIssue

```typescript
interface ReviewIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'type-safety' | 'test' | 'lint' | 'docs' | 'security' | 'performance';
  message: string;
  file?: string;
  line?: number;
}
```

---

### 3.3 ValidationResult / ValidationError

#### ValidationResult（DAG検証）

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
```

#### ValidationError

```typescript
interface ValidationError {
  type: 'cycle' | 'disconnected' | 'invalid_edge' | 'missing_agent';
  message: string;
  nodeIds?: string[];
}
```

---

### 3.4 ExecutionResult

```typescript
interface ExecutionResult {
  taskId: string;
  success: boolean;
  state: TaskState;
  output?: string;
  error?: string;
  durationMs: number;
  agentType: AgentType;
  artifacts?: string[];     // 生成物パス
}
```

---

### 3.5 DecompositionResult / DAGResult

#### DecompositionResult

```typescript
interface DecompositionResult {
  id: string;
  originalPrompt: string;
  tasks: ManagedTask[];
  dag: DAGResult;
  metadata: DecompositionMetadata;
  warnings: DecompositionWarning[];
}
```

#### DAGResult

```typescript
interface DAGResult {
  nodes: ManagedTask[];
  edges: DAGEdge[];
  levels: string[][];              // トポロジカルソート済みレベル
  criticalPath: string[];          // クリティカルパスのタスクID
  estimatedDurationMinutes: number;
}
```

#### DAGEdge

```typescript
interface DAGEdge {
  from: string;    // タスクID
  to: string;      // タスクID
  type: 'dependency' | 'data-flow';
}
```

#### DecompositionMetadata

```typescript
interface DecompositionMetadata {
  provider: 'anthropic';
  model: string;
  tokensUsed: number;
  decompositionTimeMs: number;
  confidence: number;           // 0-1
}
```

#### DecompositionWarning

```typescript
interface DecompositionWarning {
  code: DecompositionWarningCode;
  message: string;
  taskIds?: string[];
}
```

#### DecompositionWarningCode

```typescript
type DecompositionWarningCode =
  | 'CIRCULAR_DEPENDENCY'
  | 'MISSING_DEPENDENCY'
  | 'DUPLICATE_TASK_ID'
  | 'INVALID_TASK_TYPE'
  | 'TOO_MANY_TASKS'
  | 'NO_TASKS_GENERATED'
  | 'LOW_CONFIDENCE'
  | 'PARSE_ERROR';
```

---

## 4. 通信データモデル

### 4.1 AgentMessage（詳細は1.4参照）

エージェント間通信プロトコルの詳細は「1.4 Message / AgentMessage」セクションを参照。

**通信フローパターン**:
```
CoordinatorAgent
  → MessageBus.sendMessage(TASK_ASSIGNMENT)
    → CodeGenAgent.receiveMessage()
      → execute(task)
        → return MessageResponse
      → MessageBus.send(response)
        → CoordinatorAgent receives response
```

---

### 4.2 PipelineContext

#### PipelineOperator

```typescript
type PipelineOperator =
  | '|'    // pipe - 順次実行、コンテキスト渡し
  | '&&'   // AND - 順次実行、前が失敗→スキップ
  | '||'   // OR - 順次実行、前が失敗時のみ実行
  | '&';   // parallel - 同時実行
```

#### PipelineContext

```typescript
interface PipelineContext {
  pipelineId: string;
  issueNumber?: number;
  prNumber?: number;
  qualityScore?: number;
  testsPassed?: boolean;
  errors: string[];
  checkpoints: PipelineCheckpoint[];
}
```

#### PipelineCheckpoint

```typescript
interface PipelineCheckpoint {
  step: string;
  status: 'completed' | 'failed' | 'skipped';
  timestamp: string;
  result?: unknown;
}
```

#### PipelinePreset

```typescript
interface PipelinePreset {
  name: string;
  description: string;
  steps: string;
}

// 定義済みプリセット:
// full-cycle:    /agent-run | /review | /test | /security-scan | /deploy | /verify
// quick-deploy:  /verify && /deploy
// quality-gate:  /review && /test && /security-scan
```

---

### 4.3 SyncChange / ConflictStrategy

#### SyncChange

```typescript
interface SyncChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  source: 'local' | 'github';
  timestamp: string;
}
```

#### ConflictStrategy

```typescript
type ConflictStrategy =
  | 'local-wins'
  | 'github-wins'
  | 'newest-wins'
  | 'ask';
```

#### BidirectionalSyncOptions

```typescript
interface BidirectionalSyncOptions {
  conflictStrategy: ConflictStrategy;
  syncLabels: boolean;
  syncProjects: boolean;
  batchSize: number;
  validateTransitions: boolean;
}
```

#### SyncResult

```typescript
interface SyncResult {
  synced: number;
  conflicts: number;
  errors: string[];
  direction: 'push' | 'pull' | 'bidirectional';
}
```

---

### 4.4 DashboardAlert

```typescript
interface DashboardAlert {
  id: string;
  type: DashboardAlertType;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  acknowledged: boolean;
}
```

#### DashboardAlertType

```typescript
type DashboardAlertType =
  | 'high-error-rate'       // 閾値: 10%
  | 'long-running-task'     // 閾値: 30分
  | 'queue-overflow';       // 閾値: 50タスク
```

#### AgentDashboard

```typescript
interface AgentDashboard {
  realTimeMetrics: {
    activeAgents: ActiveAgentInfo[];
    queuedTasks: number;
    avgExecutionTime: number;
    currentThroughput: number;      // tasks/minute
  };
  historicalData: {
    dailyExecutions: Record<string, number>;
    successRate: Record<AgentType, number>;
    completionTimeDistribution: {
      fast: number;
      medium: number;
      slow: number;
    };
  };
  alerts: DashboardAlert[];
}
```

---

## 5. 設定データモデル

### 5.1 MiyabiConfig（詳細は1.5参照）

CLI全体の設定。セクション: github, project, labels, workflows, cli。

---

### 5.2 BudgetConfig

```typescript
interface BudgetConfig {
  monthlyBudgetUsd: number;          // デフォルト: 500
  breakdown: BudgetBreakdown;
  thresholds: BudgetThresholds;
}

interface BudgetBreakdown {
  anthropicApi: number;              // デフォルト: 400 (10M tokens/month)
  githubActions: number;             // デフォルト: 0（無料枠）
  firebase: number;                  // デフォルト: 100
}

interface BudgetThresholds {
  warning: number;                   // 0.8 (80% → アラート送信)
  emergency: number;                 // 1.5 (150% → ワークフロー自動停止)
}
```

**サーキットブレーカーパターン**: emergency 閾値超過時にワークフロー自動無効化。復旧条件: Guardian承認 + 根本原因分析 + リソースクリーンアップ。

---

### 5.3 DashboardConfig

```typescript
interface DashboardConfig {
  updateInterval: number;            // デフォルト: 1000（ms）
  websocketPort: number;             // デフォルト: 3001
  maxErrorLogs: number;              // デフォルト: 100
  retentionDays: number;             // デフォルト: 7
}
```

---

### 5.4 RetryOptions

```typescript
interface RetryOptions {
  maxAttempts?: number;              // デフォルト: 3
  initialDelayMs?: number;           // デフォルト: 1000
  maxDelayMs?: number;               // デフォルト: 10000
  backoffMultiplier?: number;        // デフォルト: 2
  retryableErrors?: string[];        // デフォルト: ['ECONNRESET','ETIMEDOUT','ENOTFOUND','rate limit']
}
```

**アルゴリズム**: 指数バックオフ（delay *= backoffMultiplier、最大 maxDelayMs）

---

### 5.5 ConcurrencyConfig

```typescript
interface ConcurrencyConfig {
  optimal: number;                   // バランス推奨
  conservative: number;              // 最適の75%
  aggressive: number;                // 最適+1（上限8）
  recommended: number;               // 最適と同じ
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

### 5.6 ExitCode

```typescript
enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  CONFIG_ERROR = 2,          // GITHUB_TOKEN不足
  VALIDATION_ERROR = 3,       // 無効な引数
  NETWORK_ERROR = 4,         // API到達不可
  AUTH_ERROR = 5             // 認証失敗
}
```

---

### 5.7 環境変数

```typescript
interface EnvironmentVariables {
  // 必須
  GITHUB_TOKEN: string;              // GitHub PAT（scope: repo, workflow, write:packages）
  REPOSITORY: string;                // owner/repo 形式

  // オプション
  DEVICE_IDENTIFIER?: string;        // デフォルト: hostname
  LOG_DIRECTORY?: string;            // デフォルト: .ai/logs
  DEFAULT_CONCURRENCY?: number;      // デフォルト: 2
  USE_WORKTREE?: boolean;            // デフォルト: false
  FIREBASE_STAGING_PROJECT?: string;
  FIREBASE_PROD_PROJECT?: string;
  TECH_LEAD_GITHUB?: string;

  // API Keys
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  NPM_TOKEN?: string;
  X_BEARER_TOKEN?: string;
}
```

---

## 6. Context Engineering データモデル

### 6.1 ContextSession / ContextWindow / ContextElement

#### ContextSession

```typescript
interface ContextSession {
  session_id: string;
  name: string;
  description?: string;
  created_at: string;         // ISO 8601
  windows: ContextWindow[];
}
```

#### ContextWindow

```typescript
interface ContextWindow {
  window_id: string;
  session_id: string;
  name: string;
  max_tokens: number;         // 例: 4096, 8192
  elements: ContextElement[];
  created_at: string;
}
```

#### ContextElement

```typescript
interface ContextElement {
  element_id: string;
  window_id: string;
  role: 'system' | 'user' | 'data';
  content: string;
  token_count: number;
  metadata?: Record<string, unknown>;
}
```

---

### 6.2 AnalysisResult

```typescript
interface AnalysisResult {
  window_id: string;
  quality_score: number;              // 0-100
  token_count: number;
  semantic_coherence: number;         // 0-100
  information_density: number;        // 0-100
  clarity_score: number;              // 0-100
  relevance_score: number;            // 0-100
  issues: string[];
  recommendations: string[];
}
```

---

### 6.3 OptimizationResult

```typescript
interface OptimizationResult {
  original_content: string;
  optimized_content?: string;
  quality_score?: number;
  original_token_count: number;
  optimized_token_count?: number;
  token_reduction_percent?: number;   // 例: 52
  improvements: string[];
}
```

---

### 6.4 PromptTemplate

```typescript
interface PromptTemplate {
  template_id: string;
  name: string;
  template: string;                   // テンプレート文字列
  category: string;
  tags: string[];
  variables: string[];                // 例: ["{language}", "{requirements}"]
  usage_count: number;
}
```

---

### 6.5 SystemStats

```typescript
interface SystemStats {
  totalSessions: number;
  totalWindows: number;
  totalElements: number;
  totalTemplates: number;
  avgQualityScore: number;
  totalTokensSaved: number;
}
```

---

## 7. 型システム設計原則

### 7.1 Strict TypeScript Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

**ESLint 型安全ルール**:
- `@typescript-eslint/no-floating-promises`: error
- `@typescript-eslint/no-unsafe-assignment`: error
- `@typescript-eslint/strict-boolean-expressions`: error
- 循環的複雑度: <=15
- 最大関数行数: 150
- 最大ネスト深度: 4
- 最大関数パラメータ: 5

---

### 7.2 Generic Types パターン

Miyabi では以下のジェネリック型パターンを採用している:

```typescript
// 1. AgentResult<T> - エージェント実行結果の型安全な返却
interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// 使用例:
type CodeGenResult = AgentResult<{ files: string[]; linesOfCode: number }>;
type ReviewResult = AgentResult<{ score: number; issues: ReviewIssue[] }>;

// 2. AgentMessage<T> - 型安全なメッセージパッセージング
interface AgentMessage<T = unknown> {
  id: string;
  from: AgentType;
  to: AgentType;
  type: MessageType;
  priority: MessagePriority;
  payload: T;
  timestamp: string;
}

// 3. SimpleCache - キャッシュのジェネリック
class SimpleCache {
  get<T>(key: string): T | null;
  set<T>(key: string, data: T, ttlMs?: number): void;
}

// 4. withRetry<T> - リトライのジェネリック
async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T>;

// 5. withGitHubCache<T> - キャッシュファーストのジェネリック
async function withGitHubCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T>;
```

---

### 7.3 Union Types パターン

```typescript
// 有限状態の表現にUnion Typesを活用
type TaskState = 'draft' | 'pending' | 'analyzing' | 'implementing'
              | 'reviewing' | 'deploying' | 'done' | 'blocked'
              | 'failed' | 'cancelled';

type AgentType = 'coordinator' | 'codegen' | 'review' | 'issue'
              | 'pr' | 'deployment' | 'test';

type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';

type PipelineOperator = '|' | '&&' | '||' | '&';

type ConflictStrategy = 'local-wins' | 'github-wins' | 'newest-wins' | 'ask';

type QualityGrade = 'excellent' | 'good' | 'fair' | 'poor';

// Discriminated Union（判別共用体）パターン
type WorkflowNode =
  | { type: 'agent'; data: AgentNodeData }
  | { type: 'issue'; data: IssueNodeData }
  | { type: 'condition'; data: ConditionNodeData };
```

---

### 7.4 Interface Inheritance パターン

```typescript
// 1. BaseTask → ManagedTask 継承
interface BaseTask {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  severity: Severity;
}

interface ManagedTask extends BaseTask {
  currentState: TaskState;
  stateHistory: TaskStateTransition[];
  retryCount: number;
  syncVersion: number;
  // ... 拡張フィールド
}

// 2. BusinessBaseAgent 抽象クラス継承
abstract class BusinessBaseAgent {
  constructor(config: BusinessAgentConfig, agentType: string);
  abstract execute(task: BusinessTask): Promise<BusinessResult>;
  protected validateTask(task: BusinessTask): void;
  protected callClaude(prompt: string, systemPrompt?: string, model?: string): Promise<string>;
  protected formatResult(...args: unknown[]): BusinessResult;
  protected handleError(error: Error, context: string): BusinessResult;
}

// 具象クラス例:
class AIEntrepreneurAgent extends BusinessBaseAgent { /* ... */ }
class MarketResearchAgent extends BusinessBaseAgent { /* ... */ }

// 3. IAgent インターフェース実装
interface IAgent {
  name: string;
  version: string;
  execute(): Promise<void>;
}

// BaseAgent が IAgent を実装し、各専門エージェントが BaseAgent を継承
class BaseAgent implements IAgent {
  // ライフサイクルフック:
  // 1. globalMetricsCollector.onAgentStart()
  // 2. sendAgentEvent('started')
  // 3. PerformanceMonitor.startAgentTracking()
  // 4. validateTask(task)
  // 5. execute(task) ← 抽象メソッド
  // 6. recordMetrics(result)
  // 7. updateLDDLog(result)
}

class CoordinatorAgent extends BaseAgent { /* ... */ }
class CodeGenAgent extends BaseAgent { /* ... */ }
class ReviewAgent extends BaseAgent { /* ... */ }
```

---

### 7.5 設計パターンと型の対応

| デザインパターン | 型/クラス | 使用箇所 |
|---|---|---|
| **Singleton** | `AsyncFileWriter`, `GitHubClient`, `AgentRegistry` | リソース管理 |
| **Factory** | `AgentFactory`, `register*Command()` | エージェント/コマンド生成 |
| **Builder** | `AgentConfig`, `PipelineContext` | 複雑オブジェクト構築 |
| **Observer** | `EventEmitter` (Pipeline executor) | イベント駆動 |
| **Strategy** | `RetryOptions`, `ConflictStrategy` | アルゴリズム切り替え |
| **State Machine** | `TaskState`, `TaskStateTransition` | タスクライフサイクル |
| **Composite** | `PipelineOperator`, Workflow nodes/edges | 合成構造 |
| **Template Method** | `BusinessBaseAgent.execute()` | 抽象メソッドフック |

---

### 7.6 コード解析型（doc-generator）

```typescript
interface FunctionInfo {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    optional: boolean;
    description: string;
  }>;
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  decorators: string[];
  sourceCode: string;
  filePath: string;
  line: number;
}

interface ClassInfo {
  name: string;
  description: string;
  extends: string | null;
  implements: string[];
  properties: Array<{
    name: string;
    type: string;
    visibility: 'public' | 'private' | 'protected';
    isStatic: boolean;
    isReadonly: boolean;
    description: string;
  }>;
  methods: Array<{
    name: string;
    description: string;
    parameters: Array<{ name: string; type: string; optional: boolean }>;
    returnType: string;
    visibility: 'public' | 'private' | 'protected';
    isStatic: boolean;
    isAsync: boolean;
  }>;
  isAbstract: boolean;
  isExported: boolean;
}

interface InterfaceInfo {
  name: string;
  description: string;
  extends: string[];
  properties: Array<{
    name: string;
    type: string;
    optional: boolean;
    description: string;
  }>;
  methods: Array<{
    name: string;
    description: string;
    parameters: Array<{ name: string; type: string; optional: boolean }>;
    returnType: string;
  }>;
}

interface AnalysisResult {
  functions: FunctionInfo[];
  classes: ClassInfo[];
  interfaces: InterfaceInfo[];
  totalFiles: number;
  analysisDate: string;
  projectPath: string;
}
```

---

### 7.7 メトリクス型

#### AgentMetrics（Projects V2）

```typescript
interface AgentMetrics {
  agent: string;
  executionCount: number;
  avgDuration: number;           // ms
  avgCost: number;               // USD
  avgQualityScore: number;       // 0-100
  totalCost: number;             // USD
  successRate?: number;          // 0-1
}
```

#### WeeklyReport

```typescript
interface WeeklyReport {
  week: string;
  totalIssues: number;
  completedIssues: number;
  agentMetrics: AgentMetrics[];
  topQualityIssues: Array<{
    number: number;
    title: string;
    score: number;
    url: string;
  }>;
  totalCost: number;
  avgQualityScore: number;
  completionRate: number;        // 0-1
}
```

#### SLA Tiers

```typescript
interface SLATier {
  tier: 'critical' | 'high' | 'standard';
  agents: AgentType[];
  availability: number;          // 例: 0.999
  responseTimeP95Ms: number;     // 例: 10000
  successRate: number;           // 例: 0.99
  recoveryTimeMinutes: number;   // 例: 5
}

// Tier 1: Critical  - Coordinator, Deployment - 99.9%, <10s, >99%, <5min
// Tier 2: High      - CodeGen, Review, Issue, PR - 99.5%, <30s, >95%, <15min
// Tier 3: Standard  - Business, Test - 99.0%, <60s, >90%, <30min
```

---

### 7.8 RateLimitInfo

```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: string;               // ISO 8601 - リセット時刻
  used: number;
}
```

---

### 7.9 プラットフォーム型

```typescript
type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

// クロスプラットフォームユーティリティ
function isWindows(): boolean;
function isMacOS(): boolean;
function isLinux(): boolean;
function getPlatform(): Platform;
function execCommand(command: string, options?: ExecOptions): string;
function isCommandAvailable(command: string): boolean;
```

---

### 7.10 入力バリデーション型

```typescript
// CWE-22 対策のバリデーション関数群
function validateProjectPath(path: string): boolean;       // 絶対パス、パストラバーサル防止
function validateGitHubOwner(owner: string): boolean;      // 39文字制限、英数字+ハイフン
function validateGitHubRepo(repo: string): boolean;        // 100文字制限
function validateGitHubToken(token: string): boolean;      // ghp_, github_pat_, gho_ 形式検証
function validateFilePath(path: string, baseDir: string): boolean;  // ベースディレクトリ内制約
function validateFileSize(path: string, maxBytes?: number): boolean; // デフォルト: 10MB
function sanitizeTemplateVariable(value: string): string;  // 危険文字除去
```

---

### 7.11 エンティティ関係マップ

Miyabi 定義システムにおける14コアエンティティと39リレーション。

```
Issue ─1:N─→ Task ─N:1─→ Agent
  |              |            |
  └─1:1─→ PR    └─N:1─→ DAG  └─1:N─→ LDDLog
  |              |
  └─1:N─→ Label  └─1:1─→ QualityReport
  |              |
  └─1:N─→ SubIssue └─1:1─→ Worktree
  |
  └─1:1─→ Escalation
  |
  └─1:1─→ Deployment

エンティティ一覧:
  Issue, Task, Agent, PR, Label, QualityReport,
  Command, Escalation, Deployment, LDDLog,
  DAG, Worktree, DiscordCommunity, SubIssue

カーディナリティ:
  N1 = 1:1, N2 = 1:N, N3 = N:N
```

---

## 付録: 全型一覧インデックス

### Enum

| 名前 | セクション | 値数 |
|---|---|---|
| ExitCode | 5.6 | 6 |

### Type Alias (Union)

| 名前 | セクション | 値数 |
|---|---|---|
| TaskState | 1.1 | 10 |
| TaskType | 1.1 | 7 |
| AgentType | 1.2 | 7 |
| BusinessAgentType | 1.2 | 14 |
| AgentStatus | 1.2 | 4 |
| AgentPermissionLevel | 1.2 | 4 |
| WorkflowNodeType | 1.3 | 3 |
| MessageType | 1.4 | 8 |
| MessagePriority | 1.4 | 4 |
| LabelCategory | 2.1 | 10 |
| Priority | 2.1 | 4 |
| Severity | 2.1 | 4 |
| ConventionalCommitType | 2.2 | 9 |
| AgentPRLabel | 2.2 | 5 |
| ProjectAgentOption | 2.3 | 5 |
| WebhookEventType | 2.4 | 8 |
| QualityGrade | 3.1 | 4 |
| DecompositionWarningCode | 3.5 | 8 |
| PipelineOperator | 4.2 | 4 |
| ConflictStrategy | 4.3 | 4 |
| DashboardAlertType | 4.4 | 3 |
| Platform | 7.9 | 4 |

### Interface

| 名前 | セクション | extends |
|---|---|---|
| Task | 1.1 | - |
| BaseTask | 1.1 | - |
| ManagedTask | 1.1 | BaseTask |
| TaskStateTransition | 1.1 | - |
| BusinessTask | 1.1 | - |
| IAgent | 1.2 | - |
| AgentContext | 1.2 | - |
| AgentResult<T> | 1.2 | - |
| BusinessResult | 1.2 | - |
| ActiveAgentInfo | 1.2 | - |
| Workflow | 1.3 | - |
| AgentNodeData | 1.3 | - |
| ConditionNodeData | 1.3 | - |
| IssueNodeData | 1.3 | - |
| AgentMessage<T> | 1.4 | - |
| MessageResponse | 1.4 | - |
| AgentConfig | 1.5 | - |
| BusinessAgentConfig | 1.5 | - |
| MiyabiConfig | 1.5 | - |
| LabelDefinition | 2.1 | - |
| ProjectItem | 2.3 | - |
| ProjectCustomFields | 2.3 | - |
| ProjectInfo | 2.3 | - |
| ProjectFieldInfo | 2.3 | - |
| DashboardMessage | 2.4 | - |
| AlertMessage | 2.4 | - |
| QualityScore | 3.1 | - |
| QualityDimensions | 3.1 | - |
| QualityGateDimensions | 3.1 | - |
| QualityGateThreshold | 3.1 | - |
| ReviewResult | 3.2 | - |
| ReviewIssue | 3.2 | - |
| ValidationResult | 3.3 | - |
| ValidationError | 3.3 | - |
| ExecutionResult | 3.4 | - |
| DecompositionResult | 3.5 | - |
| DAGResult | 3.5 | - |
| DAGEdge | 3.5 | - |
| DecompositionMetadata | 3.5 | - |
| DecompositionWarning | 3.5 | - |
| PipelineContext | 4.2 | - |
| PipelineCheckpoint | 4.2 | - |
| PipelinePreset | 4.2 | - |
| SyncChange | 4.3 | - |
| BidirectionalSyncOptions | 4.3 | - |
| SyncResult | 4.3 | - |
| DashboardAlert | 4.4 | - |
| AgentDashboard | 4.4 | - |
| BudgetConfig | 5.2 | - |
| BudgetBreakdown | 5.2 | - |
| BudgetThresholds | 5.2 | - |
| DashboardConfig | 5.3 | - |
| RetryOptions | 5.4 | - |
| ConcurrencyConfig | 5.5 | - |
| EnvironmentVariables | 5.7 | - |
| ContextSession | 6.1 | - |
| ContextWindow | 6.1 | - |
| ContextElement | 6.1 | - |
| AnalysisResult | 6.2 | - |
| OptimizationResult | 6.3 | - |
| PromptTemplate | 6.4 | - |
| SystemStats | 6.5 | - |
| FunctionInfo | 7.6 | - |
| ClassInfo | 7.6 | - |
| InterfaceInfo | 7.6 | - |
| AgentMetrics | 7.7 | - |
| WeeklyReport | 7.7 | - |
| SLATier | 7.7 | - |
| RateLimitInfo | 7.8 | - |

### Class

| 名前 | セクション | パターン |
|---|---|---|
| AgentRegistry | 1.2 | Singleton |
| BusinessBaseAgent | 1.2 | Abstract / Template Method |
| BaseAgent | 7.4 | Template Method |
| AsyncFileWriter | (shared-utils) | Singleton |
| SimpleCache | (mcp-bundle) | Generic Cache |
| TaskManager | (task-manager) | Facade |
| TaskExecutor | (task-manager) | Strategy |
| WorktreeCoordinator | (task-manager) | Isolation |
| LLMDecomposer | (task-manager) | Factory |
| GitHubProjectsClient | (github-projects) | Client |
| ContextEngineering | (context-engineering) | Facade |

---

**合計**: 1 Enum + 22 Type Alias + 65 Interface + 11 Class = **99 型定義**
