# Miyabi デザインパターン & アーキテクチャ原則

本ドキュメントは、Miyabi の全コードベースに適用されているデザインパターンとアーキテクチャ原則を体系的に整理したものである。各パターンについて、**どこで使われているか（WHERE）**と**なぜ採用されたか（WHY）**を明記する。

---

## 1. アーキテクチャパターン

### 1.1 Agentic OS（GitHub as Operating System）

**WHERE**: システム全体のアーキテクチャ基盤。`AGENTS.md`、`WORKFLOW_RULES.md`、24の GitHub Actions ワークフローで実装。

**WHY**: GitHub の既存インフラを OS のプリミティブとして再利用することで、独自インフラ構築コストをゼロにしながら、エンタープライズグレードの信頼性と拡張性を獲得する。

| GitHub 機能 | OS としての役割 | 具体的実装 |
|---|---|---|
| Issues | プロセス制御 / タスクキュー | 各 Issue がエージェントワークフローをトリガー |
| Labels | ステートマシン | 53 ラベル x 10 カテゴリで状態遷移管理 |
| Projects V2 | データ永続化層 | カスタムフィールド（Agent, Duration, Cost, Quality Score） |
| Actions | 実行エンジン | 24 ワークフロー（autonomous-agent, state-machine 等） |
| Webhooks | イベントバス | webhook-handler.yml で全 GitHub イベントをルーティング |
| Secrets | セキュアボールト | ANTHROPIC_API_KEY, GITHUB_TOKEN 等の暗号化管理 |
| CODEOWNERS | アクセス制御 | @ShunsukeHayashi による全ファイル所有権 |
| Discussions | メッセージキュー | 非同期コミュニケーションチャネル |

### 1.2 Monorepo（pnpm workspace）

**WHERE**: プロジェクトルートの `pnpm-workspace.yaml` で `packages/*` を宣言。11 パッケージ（cli, core, mcp-bundle, miyabi-agent-sdk, coding-agents, shared-utils, context-engineering, github-projects, task-manager, doc-generator, miyabi-web）。

**WHY**: パッケージ間の依存関係を統一的に管理し、パスエイリアスによるクロスパッケージリンクを実現する。バージョン整合性の保証と、共有ユーティリティの重複排除が主な利点。

**依存グラフ**:
```
packages/cli
  +-- @agentic-os/core
  +-- @miyabi/shared-utils（外部依存なし、純 TypeScript）
  +-- miyabi-agent-sdk
  +-- agent-skill-bus

@agentic-os/core
  +-- @miyabi/coding-agents（再エクスポート）
  +-- @anthropic-ai/sdk, @octokit/*
```

### 1.3 Event-Driven Architecture（Webhooks, Message Bus）

**WHERE**: `webhook-handler.yml`（中央イベントルーター）、`agent-event.sh`（エージェントイベント発信）、WebSocket ダッシュボード（リアルタイム更新）、`AgentMessage` インターフェース（エージェント間通信）。

**WHY**: エージェント間の疎結合を実現し、非同期・並列処理を自然に表現する。Issue のラベル変更やコメント追加がイベントとして伝播し、適切なエージェントがリアクティブに起動する。

**メッセージタイプ**:
- `TASK_ASSIGNMENT` - Coordinator から Specialist へのタスク配信
- `STATUS_UPDATE` - Specialist から Coordinator への進捗報告
- `ESCALATION` - 失敗時の上位エスカレーション
- `HEARTBEAT` - ヘルスチェック用の生存確認
- `CAPABILITY_QUERY/RESPONSE` - エージェント能力の動的広告

### 1.4 Microservices（MCP Servers）

**WHERE**: 7 つの MCP サーバー（ide-integration, github-enhanced, project-context, filesystem, context-engineering, miyabi, gemini-image-generation）。172 ツールのバンドルサーバー（`mcp-bundle`、21 カテゴリ）。

**WHY**: 各サーバーが独立した責務を持ち、Claude Desktop / Claude Code から統一プロトコル（MCP）でアクセス可能。サーバー単位でのスケーリング、障害分離、独立デプロイが可能。

### 1.5 Plugin Architecture（.claude-plugin）

**WHERE**: `plugin.json`（miyabi-operations プラグイン定義）、10 コマンド（miyabi-init, miyabi-status, miyabi-auto 等）、6 自動化フック（auto-format.sh, validate-typescript.sh 等）。

**WHY**: Claude Code のプラグインシステムを活用し、Miyabi の全機能を宣言的に公開する。新機能追加時にコアシステムを変更せず、プラグインコマンドの追加のみで拡張可能。

---

## 2. デザインパターン

### 2.1 Creational Patterns（生成パターン）

#### Singleton

**WHERE**:
- `AsyncFileWriter` - `packages/shared-utils/src/async-file-writer.ts`。インスタンスを一元管理し、バッファリングとバッチフラッシュを統制
- `GitHubClient` - `packages/shared-utils/src/api-client.ts`。`getGitHubClient(token?)` で単一インスタンスを返却し、コネクションプーリングを共有
- `AgentRegistry` - `packages/core/src/agents/index.ts`。全エージェントの登録・検索を中央管理

**WHY**: リソース集約型オブジェクト（HTTP コネクションプール、ファイル I/O バッファ）のインスタンス増殖を防ぎ、状態の一貫性を保証する。特に `AsyncFileWriter` では 96.34% のパフォーマンス改善を実現しており、Singleton による統一バッファ管理が不可欠。

#### Factory

**WHERE**:
- `AgentFactory` - エージェントタイプ文字列からコンクリートエージェントを生成。`AgentRegistry` と連携して動的インスタンス化
- `register*Command` 関数群 - `packages/cli/` 内の各コマンドモジュールが Commander.js にコマンドを登録する Factory 関数を公開

**WHY**: エージェント生成ロジックを集約し、新エージェント追加時の変更箇所を最小化する。CLI コマンド登録では、30 以上のコマンドを統一的なインターフェースで追加可能にする。

#### Builder

**WHERE**:
- `AgentConfig` - エージェント設定の段階的構築。`name`, `description`, `enabled` 等を逐次設定
- `PipelineContext` - パイプライン実行コンテキストの構築。`pipelineId`, `issueNumber`, `qualityScore`, `checkpoints` を段階的に蓄積

**WHY**: 複雑な設定オブジェクトの構築を読みやすく、型安全に行う。特にパイプラインコンテキストは実行中に動的に情報が追加されるため、Builder パターンが自然に適合する。

### 2.2 Structural Patterns（構造パターン）

#### Facade

**WHERE**: `ContextEngineering` クラス（`packages/context-engineering/`）が `ContextEngineeringClient`（HTTP クライアント）をラップし、高レベル API を提供。`analyze()`, `optimize()`, `autoOptimize()`, `analyzeAndOptimize()` 等。

**WHY**: FastAPI バックエンド（Python）との HTTP 通信の複雑さを隠蔽し、TypeScript 側から直感的に利用可能にする。セッション管理、コンテキストウィンドウ、テンプレート管理を統一インターフェースに集約。

#### Composite

**WHERE**: パイプラインコマンド合成（`packages/cli/`）。演算子 `|`（pipe）、`&&`（AND）、`||`（OR）、`&`（parallel）を使い、コマンドをツリー構造で合成。

```
full-cycle: /agent-run | /review | /test | /security-scan | /deploy | /verify
quality-gate: /review && /test && /security-scan
```

**WHY**: 単純なコマンドを組み合わせて複雑なワークフローを表現する。各コマンドは同一の `execute()` インターフェースを持ち、再帰的に合成可能。

#### Adapter

**WHERE**: MCP Server が CLI コマンドをラップ。例: `miyabi__agent_run` ツールが内部で `miyabi agent run` CLI コマンドを実行。Miyabi Integration Server（635 行）で 12 ツールが CLI コマンドを MCP プロトコルに適合させる。

**WHY**: CLI ツールとして設計された機能を、MCP プロトコル（JSON-RPC ベース）経由で Claude Desktop / Claude Code から利用可能にする。既存資産の再利用と、新しいインターフェースへの適合を両立。

### 2.3 Behavioral Patterns（振る舞いパターン）

#### State Machine

**WHERE**:
- `TaskStateMachine` - `packages/task-manager/`。10 状態（draft, pending, analyzing, implementing, reviewing, deploying, done, blocked, failed, cancelled）と 28 の遷移ルールを定義
- Label-based ステートマシン - `state-machine.yml` GitHub Actions ワークフロー。Issue/PR ライフサイクルに応じてラベルを自動遷移

**WHY**: エージェントワークフローの状態遷移を厳密に管理し、不正な状態遷移を防止する。`pending -> analyzing -> implementing -> reviewing -> done` という正常フローと、`blocked`, `failed` への例外遷移を型安全に定義。GitHub Labels との同期により、状態が常に可視化される。

**状態遷移図**:
```
draft -> pending -> analyzing -> implementing -> reviewing -> deploying -> done
                       |              |              |            |
                       v              v              v            v
                    blocked <---------+--------------+------------+
                       |
                       v
                    failed -> (retry) -> pending
                       |
                       v
                   cancelled
```

#### Observer

**WHERE**:
- `EventEmitter` in Pipeline - パイプライン実行中のステップ完了イベントを監視
- WebSocket Dashboard - `DashboardConfig`（updateInterval: 1000ms）でリアルタイムメトリクス配信。`AgentDashboard` インターフェースで `activeAgents`, `queuedTasks`, `avgExecutionTime`, `currentThroughput` を購読

**WHY**: パイプライン実行の進捗をリアルタイムに通知し、ダッシュボードや外部システムとの疎結合な連携を実現する。エージェントの状態変更をイベントとして発行することで、監視システムが独立してスケール可能。

#### Strategy

**WHERE**:
- `RetryStrategy` - `packages/shared-utils/src/retry.ts`。`RetryOptions`（maxAttempts, initialDelayMs, backoffMultiplier）で戦略を外部注入
- `ConflictResolution` - `BidirectionalSyncOptions` の `conflictStrategy`：`'local-wins' | 'github-wins' | 'newest-wins' | 'ask'`
- `MergeStrategy` - PRAgent のマージ方針選定

**WHY**: 同一アルゴリズムの異なるバリエーションを交換可能にする。特にリトライ戦略では、API 種別（GitHub REST vs Claude API）に応じて `retryableErrors` を変更でき、コンフリクト解決では運用方針に応じて戦略を切り替え可能。

#### Chain of Responsibility

**WHERE**: Quality Gate チェーン。

```
CodeGenAgent 出力
  -> ReviewAgent（100 点スコアリング）
    -> [score >= 80?]
      -> Yes: PRAgent が PR 作成
      -> No: Auto-Retry（最大 3 回）
        -> まだ不合格?: 人間にエスカレーション
```

**WHY**: 品質検証の各段階を独立した責務として分離し、チェーンの途中で処理を中断（リトライ）または次段階へ受け渡すことを自然に表現する。エスカレーション閾値の変更やチェーン段階の追加が容易。

#### Command

**WHERE**:
- CLI コマンド - Commander.js ベースの 30 コマンド。各コマンドが `action` ハンドラとして実行ロジックをカプセル化
- Pipeline 演算子 - `PipelineOperator`（`|`, `&&`, `||`, `&`）でコマンドの実行順序と条件を宣言的に指定

**WHY**: 操作の要求と実行を分離し、キューイング、ログ記録、Undo（チェックポイントからの再開）を可能にする。パイプラインのチェックポイント機能は、失敗ステップからの再開を実現する。

#### Template Method

**WHERE**: `BaseAgent.run()` が固定のライフサイクルを定義し、サブクラスが `abstract execute(task)` を実装。

```
BaseAgent ライフサイクル:
1. globalMetricsCollector.onAgentStart()
2. sendAgentEvent('started')
3. PerformanceMonitor.startAgentTracking()
4. validateTask(task)
5. execute(task)          <-- 抽象メソッド（サブクラスが実装）
6. recordMetrics(result)
7. updateLDDLog(result)
8. traceLogger.endAgentExecution()
9. performanceMonitor.endAgentTracking()
```

同様に `BusinessBaseAgent` も `abstract execute(task: BusinessTask): Promise<BusinessResult>` を定義し、14 のビジネスエージェントが個別実装。

**WHY**: メトリクス収集、ログ記録、イベント発信といった横断的関心事を基底クラスに集約し、各エージェントはビジネスロジックのみに集中できる。7 コーディングエージェント + 14 ビジネスエージェントで共通のライフサイクル管理を保証。

---

## 3. アーキテクチャ原則

### 3.1 Constitutional Governance（憲法的ガバナンス - 三法則）

**WHERE**: `AGENTS.md` v5.0 "The Final Mandate" で宣言。全エージェントの行動規範として強制。

| 法則 | 内容 | 実装 |
|---|---|---|
| 客観性の法則 | 感情・感傷を排除。データ駆動判断のみ | 品質スコア 0-100、合格 >= 80 |
| 自給自足の法則 | 人間依存最小化 | エスカレーション率 <= 5% 目標 |
| 追跡可能性の法則 | 全アクションを GitHub に記録 | `.ai/logs/YYYY-MM-DD.md` に完全監査証跡 |

**WHY**: AI エージェントの自律性と信頼性を両立するための不変原則。Guardian（@ShunsukeHayashi）のみが法則改正を提案可能（7 日の対応期間）。

### 3.2 Issue-Driven Development（IDD）

**WHERE**: `WORKFLOW_RULES.md` の大原則「全ては Issue から始まる。例外なし。」。`commit-to-issue.yml` で `#auto` タグ付きコミットが自動的に Issue を作成。

**WHY**: 全ての変更に追跡可能な起点を設け、変更の理由と影響を事前に明文化する。Issue なき実装は追跡不能であり、三法則の「追跡可能性」に違反する。

### 3.3 Log-Driven Development（LDD）

**WHERE**: `log-commands.sh` フック、`BaseAgent.updateLDDLog()` メソッド、`.ai/logs/` ディレクトリ。

**WHY**: エージェントの全行動をログに記録し、事後分析・デバッグ・パフォーマンス改善の基盤とする。サイレント変更を構造的に不可能にする。

### 3.4 Zero Surprise Principle

**WHERE**: `WORKFLOW_RULES.md` の 3 つの戒律の一つ。サイレント変更禁止。

**WHY**: AI エージェントが人間の知らないところで変更を加えることを防止する。全ての変更は Issue、Label 遷移、ログとして可視化される。

### 3.5 Economic Circuit Breaker（経済的サーキットブレーカー）

**WHERE**: `BUDGET.yml`（月額 $500）。`thresholds.warning: 0.8`（80% でアラート）、`thresholds.emergency: 1.5`（150% でワークフロー自動停止）。

**WHY**: AI エージェントの暴走による予期せぬコスト増大を防止する。緊急閾値超過時は `agent-runner`, `continuous-improvement`, `agent-onboarding` を自動無効化し、復旧には Guardian 承認 + 根本原因分析が必要。

### 3.6 Progressive Disclosure（3 層コンテキスト最適化）

**WHERE**: Agent Skill Use スキルで定義。

| Layer | 内容 | トークン消費 | ロードタイミング |
|---|---|---|---|
| Layer 1 | インデックスのみ | ~500 トークン | 常時ロード |
| Layer 2 | スキルメタデータ | ~1,000 トークン | オンデマンド |
| Layer 3 | フルコンテンツ | ~5,000 トークン | アクティベーション時 |

**WHY**: AI のコンテキストウィンドウは有限リソースであり、不要な情報でトークンを浪費すると品質が低下する。必要な深さの情報のみを段階的にロードすることで、トークン削減 >30%、スキルロード <500ms を実現。

### 3.7 Quality Gate（80 点閾値）

**WHERE**: `ReviewAgent` の品質スコアリング。`score = type_safety*0.3 + test_coverage*0.3 + lint_compliance*0.2 + docs*0.2`。80 点未満は最大 3 回自動リトライ、それでも不合格なら人間にエスカレーション。

**WHY**: 自律的なコード生成の品質を客観的に保証する。閾値 80 点は「Good」グレード（80-89）以上を要求し、「Fair」（60-79）以下のコードがプロダクションに到達することを構造的に防止する。

---

## 4. パフォーマンスパターン

### 4.1 Connection Pooling（HTTP/HTTPS agents）

**WHERE**: `packages/shared-utils/src/api-client.ts`

```typescript
const httpAgent = new HttpAgent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000
})
```

**WHY**: GitHub API への頻繁なリクエストで TCP ハンドシェイクのオーバーヘッドを排除。25-50% のレイテンシ改善、高並行時は最大 10 倍の性能向上を実現。

### 4.2 LRU Caching（GitHub API responses）

**WHERE**: `packages/shared-utils/src/api-client.ts`

```typescript
const githubCache = new LRUCache<string, any>({
  max: 500,            // 500 エントリ
  ttl: 1000 * 60 * 5,  // 5 分 TTL
  updateAgeOnGet: true
})
```

`withGitHubCache<T>(key, fetcher)` 関数でキャッシュファースト取得を実装。

**WHY**: GitHub API のレート制限（5,000 req/hour）消費を削減し、同一リソースへの重複リクエストを排除する。`updateAgeOnGet: true` により、頻繁にアクセスされるエントリの生存期間を延長。

### 4.3 Async Batching（AsyncFileWriter）

**WHERE**: `packages/shared-utils/src/async-file-writer.ts`。Singleton パターンで実装。

```
FLUSH_INTERVAL_MS = 1000   // 1 秒ごとにフラッシュ
MAX_BATCH_SIZE = 50         // 50 操作でフラッシュ
```

**WHY**: 同期ファイル I/O 比で **96.34% のパフォーマンス改善**。LDD（Log-Driven Development）による大量のログ書き込みを効率化し、エージェント実行のボトルネックを排除。

### 4.4 System-Aware Concurrency（CPU/Memory based scaling）

**WHERE**: `packages/shared-utils/src/system-optimizer.ts`

```
最適並行数アルゴリズム:
cpuBased = max(1, cpuCount - 1)
memoryBased = floor(freeMemory / 2GB)
isOverloaded = loadAverage1m > cpuCount
loadAdjusted = min(cpuBased, memoryBased)
if overloaded: loadAdjusted *= 0.75
optimal = min(loadAdjusted, 8)
```

出力: `optimal`（バランス推奨）、`conservative`（75%）、`aggressive`（+1、上限 8）。

**WHY**: 固定並行数ではなく、実行環境のリソース状況に動的に適応する。分散クラスター実行（最大 5 台）で異なるスペックのマシンが混在する環境で特に重要。

### 4.5 DAG-based Parallel Execution（Kahn's Algorithm）

**WHERE**: `CoordinatorAgent`（しきるん）のタスク分解、`dag-validator.ts`（Web UI）、`LLMDecomposer`（task-manager）。

```typescript
const concurrency = Math.min(
  independentTaskCount,  // DAG レベルサイズ
  cpuCoreCount,          // システム容量
  5                      // ハード制限
)
```

- Kahn's Algorithm によるトポロジカルソートで並列実行レベルを算出
- DFS ベースの循環依存検出（White -> Gray -> Black 着色法）
- クリティカルパス特定と推定実行時間計算

**WHY**: タスク間の依存関係を解析し、独立タスクの最大並列実行を実現する。Issue を 1-3 時間のアトミックタスクに分解した後、DAG 構築 <30 秒、並列効率 >70% を目標とする。

---

## 5. 耐障害性パターン

### 5.1 Circuit Breaker（経済的）

**WHERE**: `BUDGET.yml` の `thresholds.emergency: 1.5`。CI/CD ワークフロー内で時間単位のコスト監視を実施。

**動作**:
1. コスト監視が緊急閾値（150%）超過を検出
2. `agent-runner`, `continuous-improvement`, `agent-onboarding` ワークフローを自動無効化
3. `Sev.1-Critical` エスカレーション Issue を自動作成
4. 復旧条件: Guardian 承認 + 根本原因分析 + リソースクリーンアップ

**WHY**: AI エージェントの自律運用では、バグやループによる無制限の API 呼び出しリスクが存在する。月額 $500 の予算を超過した場合にシステムを自動停止し、財務的損害を限定する。

### 5.2 Retry with Exponential Backoff

**WHERE**: `packages/shared-utils/src/retry.ts` の `withRetry<T>()` 関数。`miyabi-agent-sdk` のリトライ設定（retries=3, minTimeout=1000, maxTimeout=4000, factor=2, randomize=true）。

```typescript
interface RetryOptions {
  maxAttempts?: number        // デフォルト: 3
  initialDelayMs?: number     // デフォルト: 1000
  maxDelayMs?: number         // デフォルト: 10000
  backoffMultiplier?: number  // デフォルト: 2
  retryableErrors?: string[]  // ['ECONNRESET','ETIMEDOUT','ENOTFOUND','rate limit']
}
```

**WHY**: GitHub API や Claude API への一時的な障害（ネットワークエラー、レート制限）を自動回復する。指数バックオフにより、障害中のサービスに過負荷をかけることを防止。`randomize: true` で複数エージェントの同時リトライ時のサンダリングハード問題を緩和。

### 5.3 Graceful Degradation（3 回失敗 -> 手動介入）

**WHERE**: ReviewAgent の Auto-Loop パターン。`score < 80` で最大 3 回自動リトライ後、人間にエスカレーション。`agent-executor` カスタムアクションの `escalate-on-failure: true`（デフォルト）。

```
CodeGen -> Review(不合格) -> Feedback -> CodeGen(リトライ 1)
  -> Review(不合格) -> Feedback -> CodeGen(リトライ 2)
    -> Review(不合格) -> Feedback -> CodeGen(リトライ 3)
      -> まだ不合格? -> エスカレーション Issue 作成
         ラベル: 🚨escalated, ❌agent-failed
```

**WHY**: 完全自動化を目指しつつ、解決不能な問題を際限なくリトライするリソース浪費を防止する。3 回の閾値は、一時的な問題（コンテキスト不足、曖昧な要件）と構造的な問題を区別する実用的な基準。

### 5.4 Auto-Rollback（デプロイ失敗時）

**WHERE**: `DeploymentAgent`（はこぶん）の 4 段階パイプライン。Build(60s) -> Test(120s) -> Deploy(60s) -> Health Check(60s)。ヘルスチェック失敗時に自動ロールバック。1 時間以内のロールバック保証。

**WHY**: プロダクション環境の可用性 99.9% SLA を維持する。デプロイ後のヘルスチェック失敗を自動検出し、人間の介入なしに前バージョンへ復帰する。

### 5.5 Dead Letter Queue（将来計画）

**WHERE**: `packages/miyabi-agent-sdk/` の既知ギャップとして記載。現時点では未実装。

**WHY**: 失敗したメッセージ（タスク割り当て、ステータス更新）を失わずに保持し、後から分析・再処理を可能にする。現在はエスカレーション Issue で代替しているが、メッセージ量増加に伴い専用キューが必要になる。

---

## 6. セキュリティパターン

### 6.1 Defense in Depth（6 層スキャン）

**WHERE**: `security-audit.yml`（毎日 + push/PR 時実行）。

| 層 | ツール | スキャン対象 |
|---|---|---|
| 1 | `npm audit` | 依存関係脆弱性 |
| 2 | Gitleaks | リポジトリ内シークレット |
| 3 | `security-manager.ts` | カスタムセキュリティルール |
| 4 | CodeQL | 静的セキュリティ分析（security-extended）|
| 5 | SBOM 生成 | サプライチェーン透明性 |
| 6 | OpenSSF Scorecard | セキュリティベストプラクティス |

追加: MCP バンドルサーバーでのコマンドインジェクション防止、パストラバーサル保護、シンボリックリンク攻撃防止、DOS 防止（入力長制限）、PID 検証。

**WHY**: 単一のセキュリティ対策は突破される可能性がある。6 層の独立した防御を重ねることで、1 つの層が突破されても他の層が攻撃を阻止する。

### 6.2 Principle of Least Privilege（非 root 実行）

**WHERE**: Dockerfile の runtime ステージ。非 root ユーザー `miyabi`（UID 1001）で実行。Alpine ベース、production deps only。

```dockerfile
# runtime ステージ
USER miyabi  # UID 1001
```

**WHY**: コンテナ内でのコード実行権限を最小化し、万が一の脆弱性悪用時の被害範囲を限定する。AI エージェントが生成・実行するコードは特に権限制限が重要。

### 6.3 Input Validation at Boundaries

**WHERE**: `packages/cli/` の入力バリデーション群（CWE-22 対策）。

| バリデーション | 保護対象 |
|---|---|
| `validateProjectPath` | パストラバーサル防止（絶対パス強制）|
| `validateGitHubOwner` | 39 文字制限、英数字 + ハイフン |
| `validateGitHubRepo` | 100 文字制限 |
| `validateGitHubToken` | フォーマット検証（ghp_, github_pat_, gho_）|
| `validateFilePath` | ベースディレクトリ内制約 |
| `validateFileSize` | 10MB 制限 |
| `sanitizeTemplateVariable` | 危険文字除去 |

MCP バンドルサーバー: 入力長制限（query:1000, path:4096, hostname:253）、PID 検証（0 < pid < 4194304）。

IssueAgent のセキュリティ検証: `eval`, `exec`, `sudo`, 外部パス、シークレット含有の検出。

**WHY**: 外部入力（ユーザー入力、GitHub API レスポンス、AI 生成コンテンツ）を信頼せず、システム境界で厳密に検証する。AI エージェントが生成するコードにもセキュリティ検証を適用することで、間接的な攻撃を防止。

### 6.4 Credential Rotation（gh CLI 優先）

**WHERE**: トークン管理の優先度順。

| 優先度 | 方式 | ローテーション | 用途 |
|---|---|---|---|
| 1 | `gh auth token`（推奨）| 自動 | ローカル開発 |
| 2 | 環境変数 `GITHUB_TOKEN` | ワークフロー毎自動 | CI/CD |
| 3 | `.env` ファイル | 手動 | ローカルフォールバック |
| 4 | OAuth Device Flow | セッション毎 | インタラクティブ認証 |

認証情報保存: `~/.miyabi/credentials.json`（パーミッション 0o600）。

**WHY**: 長期間有効な静的トークンのリスクを最小化する。`gh CLI` は自動的にトークンをローテーションし、CI/CD では `GITHUB_TOKEN` がワークフロー実行毎に自動生成・失効する。脆弱性修正は 48 時間以内の対応を義務化。

---

## 7. パターン間の相互関係

以下に、主要パターン間の依存・補完関係を示す。

```
Constitutional Governance（三法則）
  |
  +-- Issue-Driven Development（追跡可能性の法則の実装）
  |     +-- State Machine（Issue のライフサイクル管理）
  |     +-- Observer（状態遷移のリアルタイム通知）
  |
  +-- Log-Driven Development（追跡可能性の法則の実装）
  |     +-- Template Method（BaseAgent がログ記録を強制）
  |     +-- Async Batching（大量ログの効率的書き込み）
  |
  +-- Quality Gate（客観性の法則の実装）
  |     +-- Chain of Responsibility（段階的品質検証）
  |     +-- Strategy（リトライ戦略の交換）
  |     +-- Graceful Degradation（自動から手動へのフォールバック）
  |
  +-- Economic Circuit Breaker（自給自足の法則の制約）
        +-- Circuit Breaker（コスト超過時の自動停止）
        +-- Progressive Disclosure（トークン消費の最適化）
```

---

## 8. 将来の拡張に向けた設計考慮

| 領域 | 現状 | 将来計画 | 関連パターン |
|---|---|---|---|
| エージェント間通信 | MessageBus（インプロセス） | WebSocket/gRPC 分散実行 | Observer, Event-Driven |
| メッセージ永続化 | ログファイル | 監査証跡用データベース | Dead Letter Queue |
| レート制限 | LRU キャッシュ | バックプレッシャーメカニズム | Circuit Breaker |
| メッセージ暗号化 | なし | 機密データ保護 | Defense in Depth |
| ビジネスエージェント | 14 体計画中 | プロンプト開発・統合 | Template Method, Factory |
| 分散実行 | SSH/Tailscale（5 台） | Kubernetes オーケストレーション | Microservices |
