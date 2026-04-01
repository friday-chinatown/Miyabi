# Miyabi 用語集・概念辞典 (Glossary & Concept Dictionary)

> 本辞典は Miyabi プロジェクトで使用される全技術用語・概念・略語をアルファベット順に網羅する。
> 各エントリには日本語名、定義、関連概念、使用箇所を記載。

---

## A

### AAA Pattern
- **日本語名**: AAAパターン（Arrange-Act-Assert）
- **定義**: テストコードの構造化手法。準備（Arrange）、実行（Act）、検証（Assert）の3段階でテストを記述する
- **関連概念**: Vitest, TestAgent, TDD
- **使用箇所**: 07_skills_guides_documentation.md - Test Generator スキル

### AARRR
- **日本語名**: AARRRフレームワーク（海賊メトリクス）
- **定義**: Acquisition（獲得）、Activation（活性化）、Retention（継続）、Referral（紹介）、Revenue（収益）の5段階でグロースを測定するフレームワーク
- **関連概念**: FunnelDesignAgent, みちびきくん, KPI
- **使用箇所**: 03_agent_specifications.md - FunnelDesignAgent

### AgentConfig
- **日本語名**: エージェント設定
- **定義**: エージェントの名前、説明、有効状態などを定義する TypeScript インターフェース
- **関連概念**: BaseAgent, AgentRegistry, IAgent
- **使用箇所**: 02_core_cli_shared_utils.md - types/index.ts

### AgentContext
- **日本語名**: エージェントコンテキスト
- **定義**: エージェント実行時に渡される環境情報（owner, repo, issueNumber, token, workdir, config）を保持するインターフェース
- **関連概念**: AgentResult, BaseAgent, miyabi-agent-sdk
- **使用箇所**: 03_agent_specifications.md - SDK アーキテクチャ

### AgentDashboard
- **日本語名**: エージェントダッシュボード
- **定義**: リアルタイムメトリクス、履歴データ、アラートを統合表示する WebSocket ベースの監視インターフェース
- **関連概念**: WebSocket, Health Check, DashboardConfig
- **使用箇所**: 06_mcp_plugin_system.md - 監視システム

### AgentMessage
- **日本語名**: エージェントメッセージ
- **定義**: エージェント間通信のメッセージ形式。UUID v4 による ID、送信元/先、メッセージタイプ、優先度、ペイロード、TTL を含む
- **関連概念**: MessageBus, MessageType, correlationId
- **使用箇所**: 03_agent_specifications.md - エージェント間通信プロトコル

### AgentMetrics
- **日本語名**: エージェントメトリクス
- **定義**: 各エージェントの実行回数、平均所要時間、平均コスト、品質スコア、成功率などの統計情報
- **関連概念**: KPI, WeeklyReport, GitHub Projects V2
- **使用箇所**: 08_task_manager_github_projects_tests.md - メトリクス

### Agent Registry
- **日本語名**: エージェントレジストリ
- **定義**: Singleton パターンで実装されたエージェント登録・管理機構。タスク要件分析、キャッシュ（15分TTL、最大100エントリ）、動的ツール/フック作成、アイドルエージェント検索を行う
- **関連概念**: Singleton, BaseAgent, IAgent
- **使用箇所**: 02_core_cli_shared_utils.md, 03_agent_specifications.md

### Agent Skill Bus
- **日本語名**: エージェントスキルバス
- **定義**: 110以上のビルトインスキルを提供するエージェント間スキル共有キュー。npm パッケージ `agent-skill-bus` v1.2.0 として提供
- **関連概念**: Skills, MCP, CLI bus コマンド
- **使用箇所**: 01_project_overview_architecture.md, 02_core_cli_shared_utils.md

### AgentResult
- **日本語名**: エージェント実行結果
- **定義**: エージェント実行の結果を表すインターフェース。status（success/failure/partial/timeout）、message、metrics、artifacts、error を含む
- **関連概念**: AgentContext, ExecutionResult, BaseAgent
- **使用箇所**: 03_agent_specifications.md - SDK アーキテクチャ

### AgentStatus
- **日本語名**: エージェント状態
- **定義**: エージェントの実行状態を表す型。`idle | running | completed | failed` の4状態
- **関連概念**: State Machine, Task, AgentConfig
- **使用箇所**: 02_core_cli_shared_utils.md - types/index.ts

### AgentType
- **日本語名**: エージェントタイプ
- **定義**: 7種のコーディングエージェントタイプ。coordinator, codegen, review, issue, pr, deployment, test
- **関連概念**: WorkflowNodeType, AgentNode, 21エージェント
- **使用箇所**: 04_web_docgen_context_engineering.md, 08_task_manager_github_projects_tests.md

### Agentic OS
- **日本語名**: エージェンティックOS
- **定義**: GitHub をオペレーティングシステムとして扱う Miyabi の中核アーキテクチャ概念。Issues がタスクキュー、Labels がステートマシン、Projects V2 がデータ層、Actions が実行エンジン、Webhooks がイベントバスとして機能
- **関連概念**: GitHub as OS, IDD, State Machine, Water Spider
- **使用箇所**: 01_project_overview_architecture.md - PROJECT PURPOSE AND VISION

### AGENTS.md
- **日本語名**: エージェント憲法
- **定義**: v5.0 "The Final Mandate" として、自律の三法則を定義する憲法的ガバナンス文書
- **関連概念**: Three Laws of Autonomy, Guardian, Constitutional Governance
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### AIEntrepreneurAgent（あきんどさん）
- **日本語名**: AI起業家エージェント
- **定義**: 8段階ビジネスプラン作成を担当するビジネスエージェント。🔴リーダー権限
- **関連概念**: BusinessBaseAgent, Lean Canvas, ビジネスエージェント
- **使用箇所**: 03_agent_specifications.md - ビジネスエージェント

### AnalyticsAgent（かぞえるん）
- **日本語名**: アナリティクスエージェント
- **定義**: データ分析・PDCAサイクル管理を担当するビジネスエージェント。🔵分析権限
- **関連概念**: KPI, PDCA, ビジネスエージェント
- **使用箇所**: 03_agent_specifications.md - 営業・顧客管理

### AnalysisResult (Context Engineering)
- **日本語名**: 分析結果
- **定義**: コンテキストの品質スコア（0-100）、トークン数、セマンティック一貫性、情報密度、明瞭性、関連性を含む分析結果
- **関連概念**: Context Engineering, OptimizationResult, quality_score
- **使用箇所**: 04_web_docgen_context_engineering.md

### AnalysisResult (Doc Generator)
- **日本語名**: コード分析結果
- **定義**: TypeScript コード分析の結果。functions, classes, interfaces, totalFiles, analysisDate, projectPath を含む
- **関連概念**: CodeAnalyzer, ts-morph, FunctionInfo, ClassInfo
- **使用箇所**: 04_web_docgen_context_engineering.md - Doc Generator

### Apache License 2.0
- **日本語名**: Apache ライセンス 2.0
- **定義**: Miyabi プロジェクトのソースコードライセンス。著作権は合同会社みやび（Miyabi LLC）に帰属
- **関連概念**: CODEOWNERS, License
- **使用箇所**: 01_project_overview_architecture.md - LICENSE & OWNERSHIP

### AsyncFileWriter
- **日本語名**: 非同期ファイルライター
- **定義**: Singleton パターンで実装された非同期バッチファイル書込みクラス。1秒間隔フラッシュ、最大50操作でバッチ処理。同期比96.34%のパフォーマンス改善
- **関連概念**: Singleton, shared-utils, Performance
- **使用箇所**: 02_core_cli_shared_utils.md - async-file-writer.ts

### Auto-Loop Pattern
- **日本語名**: 自動ループパターン
- **定義**: ReviewAgent のスコアが80点未満の場合、CodeGenAgent に自動でフィードバックし最大3回リトライする品質改善ループ
- **関連概念**: ReviewAgent, Quality Gate, Feedback Loop, Escalation
- **使用箇所**: 03_agent_specifications.md - ReviewAgent, 07_skills_guides_documentation.md

### auto-release
- **日本語名**: 自動リリース
- **定義**: バージョンタグをトリガーに npm publish と GitHub Release を自動実行するワークフロー
- **関連概念**: npm Provenance, Conventional Commits, GitHub Actions
- **使用箇所**: 05_cicd_infrastructure.md - CI/CDワークフロー

---

## B

### Backoff (Exponential)
- **日本語名**: 指数バックオフ
- **定義**: リトライ間隔を指数的に増加させる戦略。delay *= 2、最大10秒。初期1秒、最大3回
- **関連概念**: Retry with Backoff, withRetry, shared-utils
- **使用箇所**: 02_core_cli_shared_utils.md - retry.ts

### BaseAgent
- **日本語名**: ベースエージェント
- **定義**: 全コーディングエージェントの基底クラス（150+行）。ライフサイクル管理、メトリクス収集、LDDログ更新、パフォーマンス追跡を提供する抽象クラス
- **関連概念**: AgentRegistry, IAgent, BusinessBaseAgent, coding-agents
- **使用箇所**: 03_agent_specifications.md - BaseAgent

### BidirectionalSync
- **日本語名**: 双方向同期
- **定義**: ローカルタスク状態と GitHub Issue/Projects V2 の状態を双方向で同期する機構。競合戦略は local-wins / github-wins / newest-wins / ask から選択
- **関連概念**: GitHubLabelSync, ProjectsV2Sync, SyncChange
- **使用箇所**: 08_task_manager_github_projects_tests.md - GitHub同期システム

### Boxen
- **日本語名**: ボックス描画ライブラリ
- **定義**: ターミナルにボックス枠を描画する npm パッケージ（v8.0.1）
- **関連概念**: chalk, ora, CLI/UI
- **使用箇所**: 02_core_cli_shared_utils.md - 依存関係

### BUDGET.yml
- **日本語名**: 予算設定ファイル
- **定義**: 月額予算（500 USD）、Anthropic API（400 USD / 10Mトークン）、Firebase（100 USD）、警告閾値（80%）、緊急閾値（150%）を定義する経済ガバナンス設定
- **関連概念**: Circuit Breaker, Economic Governance, Guardian
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### Builder Pattern
- **日本語名**: ビルダーパターン
- **定義**: オブジェクトの構築過程を分離するデザインパターン。AgentConfig や PipelineContext の構築に使用
- **関連概念**: Design Patterns, Factory, Singleton
- **使用箇所**: 02_core_cli_shared_utils.md - 設計パターン

### BusinessBaseAgent
- **日本語名**: ビジネスベースエージェント
- **定義**: 14のビジネスエージェントの抽象基底クラス。Claude API 呼出（claude-sonnet-4-20250514、Max Tokens 8192）、タスクバリデーション、ログ、エラーハンドリングを提供
- **関連概念**: BaseAgent, BusinessTask, BusinessResult
- **使用箇所**: 02_core_cli_shared_utils.md - BusinessBaseAgent

### BusinessResult
- **日本語名**: ビジネス実行結果
- **定義**: ビジネスエージェントの実行結果。success, data, insights, recommendations, nextSteps, error を含む
- **関連概念**: BusinessBaseAgent, BusinessTask
- **使用箇所**: 02_core_cli_shared_utils.md

### BusinessTask
- **日本語名**: ビジネスタスク
- **定義**: ビジネスエージェントに渡されるタスク定義。type, description, context, metadata を含む
- **関連概念**: BusinessBaseAgent, BusinessResult
- **使用箇所**: 02_core_cli_shared_utils.md

---

## C

### CCG (AI Course Content Generator)
- **日本語名**: AIコースコンテンツジェネレーター
- **定義**: Gemini API によるオンラインコース完全生成スキル。コース構造→レッスンスクリプト→TTS→スライド→ビデオレンダリングのパイプライン
- **関連概念**: Gemini API, Teachable, TTS
- **使用箇所**: 07_skills_guides_documentation.md - 外部統合スキル

### Chalk
- **日本語名**: ターミナルカラーライブラリ
- **定義**: ターミナル出力に色・スタイルを付与する npm パッケージ（v5.3.0）
- **関連概念**: ora, CLI/UI, figlet
- **使用箇所**: 01_project_overview_architecture.md, 02_core_cli_shared_utils.md

### CHANGELOG
- **日本語名**: 変更履歴
- **定義**: Keep a Changelog 形式（Added, Changed, Fixed, Deprecated, Removed, Security）で記述されるバージョン毎の変更記録
- **関連概念**: Conventional Commits, Doc Generator
- **使用箇所**: 07_skills_guides_documentation.md - Doc Generator スキル

### Circuit Breaker
- **日本語名**: サーキットブレーカー
- **定義**: コスト監視による自動安全停止機構。月額予算の150%到達で agent-runner, continuous-improvement, agent-onboarding ワークフローを自動無効化。復旧には Guardian 承認、根本原因分析、リソースクリーンアップが必要
- **関連概念**: BUDGET.yml, Economic Governance, Guardian, Escalation
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### ClassInfo
- **日本語名**: クラス情報
- **定義**: ts-morph で解析されたクラスの構造情報。name, description, extends, implements, properties, methods, isAbstract, isExported を含む
- **関連概念**: CodeAnalyzer, FunctionInfo, InterfaceInfo
- **使用箇所**: 04_web_docgen_context_engineering.md - Doc Generator

### Claude Code
- **日本語名**: Claude Code
- **定義**: Anthropic の Claude をベースとした AI コーディングアシスタント。Miyabi の MCP サーバーと統合して動作
- **関連概念**: MCP, Skills, Claude Sonnet 4
- **使用箇所**: 06_mcp_plugin_system.md, 07_skills_guides_documentation.md

### Claude Sonnet 4
- **日本語名**: Claude Sonnet 4
- **定義**: Anthropic の AI モデル（claude-sonnet-4-20250514）。CodeGenAgent のコード生成、BusinessBaseAgent の推論に使用。Max Tokens: 8,000-8,192
- **関連概念**: @anthropic-ai/sdk, CodeGenAgent, BusinessBaseAgent
- **使用箇所**: 01_project_overview_architecture.md, 03_agent_specifications.md

### CLAUDE.md
- **日本語名**: Claude 設定ファイル
- **定義**: Claude Code のプロジェクト固有設定・ルールを定義するファイル。GitNexus ルール、品質基準などを記載
- **関連概念**: Claude Code, Skills, AGENTS.md
- **使用箇所**: 07_skills_guides_documentation.md, 08_task_manager_github_projects_tests.md

### CodeAnalyzer
- **日本語名**: コード分析エンジン
- **定義**: ts-morph を使用して TypeScript コードの関数・クラス・インターフェースを解析し、構造化情報を抽出するエンジン
- **関連概念**: ts-morph, AnalysisResult, Doc Generator
- **使用箇所**: 04_web_docgen_context_engineering.md

### CodeGenAgent（つくるん）
- **日本語名**: コード生成エージェント
- **定義**: Claude Sonnet 4 を使用して Issue 要件からプロダクションレディコード、Vitest テスト、JSDoc コメントを自動生成する実行エージェント。🟢実行権限。目標: 生成<60秒、品質>80/100、カバレッジ>80%
- **関連概念**: Claude Sonnet 4, ReviewAgent, Auto-Loop Pattern
- **使用箇所**: 03_agent_specifications.md, 07_skills_guides_documentation.md

### CodeQL
- **日本語名**: CodeQL静的分析
- **定義**: GitHub の静的セキュリティ分析ツール。毎週月曜に security-extended クエリスイートで実行
- **関連概念**: Security, Gitleaks, SBOM
- **使用箇所**: 05_cicd_infrastructure.md - セキュリティワークフロー

### CODEOWNERS
- **日本語名**: コードオーナー
- **定義**: GitHub のコード所有権定義ファイル。Miyabi では全ファイルのデフォルトオーナーが @ShunsukeHayashi。必須レビューのアクセス制御に使用
- **関連概念**: Guardian, GitHub as OS, PR Review
- **使用箇所**: 01_project_overview_architecture.md

### Commander.js
- **日本語名**: Commander.js
- **定義**: Node.js CLI フレームワーク（v11.1.0）。Miyabi CLI の 30+コマンドの基盤
- **関連概念**: CLI, Inquirer, miyabi コマンド
- **使用箇所**: 02_core_cli_shared_utils.md

### Composite Pattern
- **日本語名**: コンポジットパターン
- **定義**: 個々のオブジェクトとオブジェクトのグループを同一視するデザインパターン。パイプラインコマンド合成に使用
- **関連概念**: Pipeline Operators, Design Patterns
- **使用箇所**: 02_core_cli_shared_utils.md - 設計パターン

### ConcurrencyConfig
- **日本語名**: 並行実行設定
- **定義**: システムリソースに応じた最適並行数設定。optimal（バランス推奨）、conservative（75%）、aggressive（最適+1、上限8）、recommended
- **関連概念**: System Optimizer, parallel execution
- **使用箇所**: 02_core_cli_shared_utils.md - system-optimizer.ts

### ConditionNode
- **日本語名**: 条件分岐ノード
- **定義**: ワークフローエディタの条件分岐ノード。2つの出力ハンドル（🟢true 25%、🔴false 75%）を持つ
- **関連概念**: AgentNode, IssueNode, WorkflowNodeType
- **使用箇所**: 04_web_docgen_context_engineering.md - miyabi-web

### Constitutional Governance
- **日本語名**: 憲法的ガバナンス
- **定義**: AGENTS.md v5.0 "The Final Mandate" による自律エージェントの行動規範。自律の三法則、Guardian による監督、エスカレーション基準を定義
- **関連概念**: Three Laws of Autonomy, Guardian, AGENTS.md
- **使用箇所**: 05_cicd_infrastructure.md

### ContentCreationAgent（かくちゃん）
- **日本語名**: コンテンツ作成エージェント
- **定義**: ブログ記事、SEOコンテンツなどのコンテンツ生成を担当するビジネスエージェント。🟢実行権限
- **関連概念**: MarketingAgent, SNSStrategyAgent, ビジネスエージェント
- **使用箇所**: 03_agent_specifications.md - マーケティング

### Context Engineering
- **日本語名**: コンテキストエンジニアリング
- **定義**: AI プロンプトの品質分析・最適化 SDK。TypeScript SDK + FastAPI バックエンド + Google Gemini AI。トークン52%削減、品質42%向上、応答時間44%短縮を実現
- **関連概念**: Context Window, ContextEngineering クラス, OptimizationResult
- **使用箇所**: 04_web_docgen_context_engineering.md

### Context Window
- **日本語名**: コンテキストウィンドウ
- **定義**: トークンバジェット管理単位（4K, 8K等）。コンテキストエンジニアリングにおけるトークン使用量の制御枠
- **関連概念**: Context Engineering, Token, Context Element
- **使用箇所**: 04_web_docgen_context_engineering.md

### Conventional Commits
- **日本語名**: コンベンショナルコミット
- **定義**: コミットメッセージの標準化形式。`<type>(<scope>): <subject>`。タイプ: feat, fix, refactor, docs, test, style, perf, chore, ci
- **関連概念**: PRAgent, Git Workflow, CHANGELOG
- **使用箇所**: 03_agent_specifications.md, 07_skills_guides_documentation.md

### CoordinatorAgent（しきるん）
- **日本語名**: コーディネーターエージェント
- **定義**: 全コーディング操作のオーケストレーター。🔴統括権限。Issue を1-3時間のアトミックタスクに分解、Kahn's Algorithm で DAG 構築、最大5並行でエージェント自動割当、DFS 循環依存検出。目標: DAG生成<30秒、分解精度>95%
- **関連概念**: DAG, Kahn's Algorithm, Escalation, IssueAgent
- **使用箇所**: 03_agent_specifications.md, 01_project_overview_architecture.md

### CRMAgent（つなぐん）
- **日本語名**: CRMエージェント
- **定義**: 顧客関係管理・LTV最大化を担当するビジネスエージェント。🟡サポート権限
- **関連概念**: SalesAgent, LTV, ビジネスエージェント
- **使用箇所**: 03_agent_specifications.md - 営業・顧客管理

### CWE-22
- **日本語名**: パストラバーサル脆弱性
- **定義**: ディレクトリトラバーサル攻撃を防ぐためのセキュリティ対策。validateProjectPath, validateFilePath で絶対パス検証、ベースディレクトリ制約を実施
- **関連概念**: Security, Input Validation
- **使用箇所**: 02_core_cli_shared_utils.md - 入力バリデーション

---

## D

### DAG (Directed Acyclic Graph)
- **日本語名**: 有向非巡回グラフ
- **定義**: タスク間の依存関係を表現する有向グラフで循環を含まないもの。CoordinatorAgent が Issue からタスク分解時に構築。DFS でサイクル検出、Kahn's Algorithm でトポロジカルソートを実施
- **関連概念**: Kahn's Algorithm, Topological Sort, CoordinatorAgent, DAGResult
- **使用箇所**: 01_project_overview_architecture.md, 03_agent_specifications.md, 04_web_docgen_context_engineering.md

### DAGResult
- **日本語名**: DAG結果
- **定義**: タスク分解後の DAG 構造。nodes, edges, levels（トポロジカルソート済み）、criticalPath, estimatedDurationMinutes を含む
- **関連概念**: DAG, DecompositionResult, LLMDecomposer
- **使用箇所**: 08_task_manager_github_projects_tests.md

### DAG Validator
- **日本語名**: DAG検証エンジン
- **定義**: ワークフローの有向非巡回グラフを検証するエンジン。DFS サイクル検出（White→Gray→Black着色）、Kahn's トポロジカルソート、切断ノード検出、エッジ検証、事前サイクルチェックを実装
- **関連概念**: DAG, Kahn's Algorithm, DFS, miyabi-web
- **使用箇所**: 04_web_docgen_context_engineering.md - dag-validator.ts

### DashboardConfig
- **日本語名**: ダッシュボード設定
- **定義**: 監視ダッシュボードの設定。updateInterval: 1秒、websocketPort: 3001、maxErrorLogs: 100、retentionDays: 7
- **関連概念**: AgentDashboard, WebSocket
- **使用箇所**: 06_mcp_plugin_system.md

### Dead Letter Queue
- **日本語名**: デッドレターキュー
- **定義**: 処理に失敗したメッセージを格納するキュー。将来計画として記載
- **関連概念**: MessageBus, AgentMessage
- **使用箇所**: 03_agent_specifications.md - 既知のギャップ

### DecompositionResult
- **日本語名**: タスク分解結果
- **定義**: LLM によるタスク分解の結果。id, originalPrompt, tasks, dag(DAGResult), metadata, warnings を含む
- **関連概念**: LLMDecomposer, DAGResult, TaskManager
- **使用箇所**: 08_task_manager_github_projects_tests.md

### DecompositionWarning
- **日本語名**: 分解警告
- **定義**: タスク分解時の警告コード。CIRCULAR_DEPENDENCY, MISSING_DEPENDENCY, DUPLICATE_TASK_ID, INVALID_TASK_TYPE, TOO_MANY_TASKS, NO_TASKS_GENERATED, LOW_CONFIDENCE, PARSE_ERROR
- **関連概念**: DecompositionResult, LLMDecomposer
- **使用箇所**: 08_task_manager_github_projects_tests.md

### Dependabot
- **日本語名**: Dependabot
- **定義**: GitHub の自動依存関係更新ツール。脆弱性検出・自動 PR 作成
- **関連概念**: Security, npm audit, pnpm overrides
- **使用箇所**: 01_project_overview_architecture.md - 脆弱性対応

### DeploymentAgent（はこぶん）
- **日本語名**: デプロイメントエージェント
- **定義**: CI/CD 自動化・本番デプロイを担当するエージェント。🟡サポート権限。4段階パイプライン: Build(60s)→Test(120s)→Deploy(60s)→Health Check(60s)。SLA: 可用性99.9%、応答<10秒(P95)、成功率>99%。ヘルスチェック失敗時自動ロールバック
- **関連概念**: CI/CD, Health Check, Rollback, SLA
- **使用箇所**: 03_agent_specifications.md

### Design Patterns
- **日本語名**: デザインパターン
- **定義**: Miyabi で使用される設計パターン群。Singleton, Factory, Builder, Observer, Strategy, Composite, State Machine
- **関連概念**: 個別パターン参照
- **使用箇所**: 02_core_cli_shared_utils.md, 08_task_manager_github_projects_tests.md

### Device Flow (OAuth)
- **日本語名**: デバイスフロー認証
- **定義**: GitHub OAuth Device Flow による認証。デバイスコード要求→user_code表示→ブラウザ自動オープン→トークンポーリング→スコープ検証→トークン返却
- **関連概念**: OAuth, GitHub Token, auth コマンド
- **使用箇所**: 02_core_cli_shared_utils.md - 認証システム

### DFS (Depth-First Search)
- **日本語名**: 深さ優先探索
- **定義**: グラフ探索アルゴリズム。DAG のサイクル検出に White→Gray→Black 着色法で使用
- **関連概念**: DAG, Cycle Detection, Kahn's Algorithm
- **使用箇所**: 03_agent_specifications.md, 04_web_docgen_context_engineering.md

### Discord Integration
- **日本語名**: Discord統合
- **定義**: Discord MCP サーバー（400+行）による7ツール提供。メッセージ送信、リリース告知、GitHub イベント通知、サーバー統計、イベント作成
- **関連概念**: MCP, Release, WebSocket
- **使用箇所**: 06_mcp_plugin_system.md

### Docker
- **日本語名**: Docker
- **定義**: コンテナ化プラットフォーム。マルチステージビルド（base→deps→builder→runtime）、非rootユーザー(miyabi:1001)、Alpine ベース
- **関連概念**: Docker Compose, Dockerfile, Kubernetes
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### Docker Compose
- **日本語名**: Docker Compose
- **定義**: マルチコンテナ管理。miyabi-agent（デフォルト）、PostgreSQL 16-alpine（with-database）、Redis 7-alpine（with-cache）、Context API（context-engineering）
- **関連概念**: Docker, PostgreSQL, Redis
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### Doc Generator
- **日本語名**: ドキュメント生成器
- **定義**: `@agentic-os/doc-generator` v1.0.0。ts-morph による TypeScript コード解析、Handlebars テンプレートによる Markdown ドキュメント自動生成。CLI: `doc-gen`
- **関連概念**: ts-morph, Handlebars, CodeAnalyzer, TemplateEngine
- **使用箇所**: 04_web_docgen_context_engineering.md

### dotenv
- **日本語名**: 環境変数読込ライブラリ
- **定義**: `.env` ファイルから環境変数を読み込む npm パッケージ（v16.6.1）
- **関連概念**: Environment Variables, GITHUB_TOKEN
- **使用箇所**: 02_core_cli_shared_utils.md

### DynamicAgent
- **日本語名**: ダイナミックエージェント
- **定義**: AgentRegistry による動的なツール/フック作成とエージェント割当機構。タスク要件分析→キャッシュ確認→動的作成→割当の流れ
- **関連概念**: AgentRegistry, BaseAgent
- **使用箇所**: 03_agent_specifications.md - AgentRegistry

---

## E

### Economic Governance
- **日本語名**: 経済ガバナンス
- **定義**: BUDGET.yml による月額コスト管理体制。Anthropic API 400USD、Firebase 100USD。80%で警告、150%でサーキットブレーカー発動
- **関連概念**: BUDGET.yml, Circuit Breaker, Guardian
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### Escalation
- **日本語名**: エスカレーション
- **定義**: エージェントが自律的に解決できない問題を上位（Guardian/TechLead/PO）に通知する仕組み。重大度別: Critical(24時間), Constitutional(7日), Budget(即時)
- **関連概念**: Guardian, Three Laws of Autonomy, Circuit Breaker
- **使用箇所**: 01_project_overview_architecture.md, 03_agent_specifications.md, 05_cicd_infrastructure.md

### ESLint
- **日本語名**: ESLint
- **定義**: JavaScript/TypeScript コード品質ツール（v8.57.1）。floating promises 禁止、命名規則、最大行長120、関数行数150、循環的複雑度≤15、ネスト深度4、パラメータ5
- **関連概念**: Quality Gate, TypeScript, Lint
- **使用箇所**: 01_project_overview_architecture.md - Quality Standards

### ESM (ECMAScript Modules)
- **日本語名**: ECMAScript モジュール
- **定義**: JavaScript の標準モジュールシステム。Miyabi 全パッケージで ESM を採用、ターゲット ES2022
- **関連概念**: TypeScript, Node.js, import/export
- **使用箇所**: 01_project_overview_architecture.md, 02_core_cli_shared_utils.md

### EventEmitter
- **日本語名**: イベントエミッター
- **定義**: Observer パターンの実装。パイプライン実行時のイベント通知に使用
- **関連概念**: Observer Pattern, Pipeline, Webhooks
- **使用箇所**: 02_core_cli_shared_utils.md - 設計パターン

### ExecutionResult
- **日本語名**: 実行結果
- **定義**: タスク実行の結果。taskId, success, state, output, error, durationMs, agentType, artifacts を含む
- **関連概念**: TaskExecutor, ManagedTask, AgentResult
- **使用箇所**: 08_task_manager_github_projects_tests.md

### ExitCode
- **日本語名**: 終了コード
- **定義**: CLI 終了コード体系。SUCCESS(0), GENERAL_ERROR(1), CONFIG_ERROR(2), VALIDATION_ERROR(3), NETWORK_ERROR(4), AUTH_ERROR(5)
- **関連概念**: CLI, Error Handling
- **使用箇所**: 02_core_cli_shared_utils.md

---

## F

### Factory Pattern
- **日本語名**: ファクトリーパターン
- **定義**: オブジェクト生成をカプセル化するデザインパターン。AgentFactory、register*Command 関数で使用
- **関連概念**: Design Patterns, AgentRegistry
- **使用箇所**: 02_core_cli_shared_utils.md

### FastAPI
- **日本語名**: FastAPI
- **定義**: Python 製高速 Web フレームワーク。Context Engineering API バックエンド（Port 9001）に使用
- **関連概念**: Context Engineering, Uvicorn, Python
- **使用箇所**: 04_web_docgen_context_engineering.md

### Feature Branch
- **日本語名**: フィーチャーブランチ
- **定義**: 自律エージェントが作成する作業ブランチ。命名規則: `agent/issue-{number}-{timestamp}` または `{type}/{issue_number}-{description}`
- **関連概念**: Git Workflow, PRAgent, Conventional Commits
- **使用箇所**: 05_cicd_infrastructure.md, 07_skills_guides_documentation.md

### Feedback Loop
- **日本語名**: フィードバックループ
- **定義**: CodeGenAgent → ReviewAgent → フィードバック → 再生成の品質改善サイクル。CLI の `miyabi cycle` コマンドで制御
- **関連概念**: Auto-Loop Pattern, ReviewAgent, Quality Gate
- **使用箇所**: 03_agent_specifications.md, 02_core_cli_shared_utils.md

### Figlet
- **日本語名**: フィグレット
- **定義**: ASCII アートテキスト生成ライブラリ。CLI のバナー表示に使用
- **関連概念**: CLI/UI, chalk, gradient-string
- **使用箇所**: 01_project_overview_architecture.md

### Firebase
- **日本語名**: Firebase
- **定義**: Google のアプリケーションプラットフォーム。Staging/Production 環境のデプロイ先。月額予算100USD
- **関連概念**: DeploymentAgent, BUDGET.yml, Environment Variables
- **使用箇所**: 01_project_overview_architecture.md

### Five Forces (Porter's)
- **日本語名**: ファイブフォース（ポーターの5つの力）
- **定義**: 業界の競争構造を分析するフレームワーク。MarketResearchAgent の競合分析に関連
- **関連概念**: MarketResearchAgent, SWOT, ビジネスエージェント
- **使用箇所**: 03_agent_specifications.md（間接参照）

### FunctionInfo
- **日本語名**: 関数情報
- **定義**: ts-morph で解析された関数の構造情報。name, description, parameters, returnType, isAsync, isExported, decorators, sourceCode, filePath, line を含む
- **関連概念**: CodeAnalyzer, ClassInfo, InterfaceInfo
- **使用箇所**: 04_web_docgen_context_engineering.md

### FunnelDesignAgent（みちびきくん）
- **日本語名**: ファネル設計エージェント
- **定義**: カスタマージャーニー・AARRR フレームワークを担当するビジネスエージェント。🟢実行権限
- **関連概念**: AARRR, PersonaAgent, ビジネスエージェント
- **使用箇所**: 03_agent_specifications.md

---

## G

### Gemini API
- **日本語名**: Gemini API
- **定義**: Google の AI モデル API。Context Engineering バックエンド（Port 8888）、画像生成、TTS 生成に使用。モデル: gemini-3-flash-preview, gemini-2.5-flash
- **関連概念**: Context Engineering, CCG, Image Generation
- **使用箇所**: 04_web_docgen_context_engineering.md, 07_skills_guides_documentation.md

### gh CLI
- **日本語名**: GitHub CLI
- **定義**: GitHub の公式コマンドラインツール。`gh auth token` による自動トークンローテーションが推奨認証方法
- **関連概念**: GitHub Token, OAuth, Authentication
- **使用箇所**: 01_project_overview_architecture.md

### GitHub Actions
- **日本語名**: GitHub Actions
- **定義**: GitHub の CI/CD 実行エンジン。Miyabi では24ワークフローが定義され、Agentic OS の実行エンジンとして機能
- **関連概念**: Agentic OS, CI/CD, Workflows
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### GitHub as OS
- **日本語名**: GitHub をOSとして利用
- **定義**: GitHub の各機能を OS のコンポーネントに見立てるアーキテクチャ。Issues=タスクキュー、Labels=ステートマシン、Projects V2=データ層、Actions=実行エンジン、Webhooks=イベントバス、Secrets=セキュアボールト、CODEOWNERS=アクセス制御、Pages=ダッシュボード、Discussions=メッセージキュー
- **関連概念**: Agentic OS, IDD, State Machine
- **使用箇所**: 01_project_overview_architecture.md, 07_skills_guides_documentation.md

### GitHub Projects V2
- **日本語名**: GitHub Projects V2
- **定義**: GitHub のプロジェクト管理機能。Miyabi のデータ永続化層として使用。カスタムフィールド: Agent, Duration, Cost, Quality Score, Sprint
- **関連概念**: GitHub as OS, ProjectsV2Sync, AgentMetrics
- **使用箇所**: 01_project_overview_architecture.md, 08_task_manager_github_projects_tests.md

### GitHubLabelSync
- **日本語名**: GitHubラベル同期
- **定義**: タスク状態と GitHub Issue ラベルを同期するコンポーネント
- **関連概念**: BidirectionalSync, Label State Machine, 53 Labels
- **使用箇所**: 08_task_manager_github_projects_tests.md

### GitHubProjectsClient
- **日本語名**: GitHub Projects クライアント
- **定義**: `@agentic-os/github-projects` v1.0.0 のメインクラス。プロジェクト情報取得、フィールド更新、メトリクス計算、週次レポート生成、レート制限監視
- **関連概念**: GitHub Projects V2, AgentMetrics, WeeklyReport
- **使用箇所**: 08_task_manager_github_projects_tests.md

### Gitleaks
- **日本語名**: Gitleaks
- **定義**: シークレット検出ツール。push/PR 時に自動実行し、ソースコード内の秘密情報漏洩を防止
- **関連概念**: Security, CodeQL, SBOM
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### GitNexus
- **日本語名**: GitNexus（コード知能）
- **定義**: コードベースのグラフ分析ツール。14サブコマンド、6スキル（CLI, Guide, Exploring, Impact Analysis, Debugging, Refactoring）。グラフスキーマ: File, Function, Class, Interface, Method, Community, Process ノードと CALLS, IMPORTS, EXTENDS, IMPLEMENTS, DEFINES エッジ
- **関連概念**: Cypher, Impact Analysis, gitnexus_rename
- **使用箇所**: 02_core_cli_shared_utils.md, 07_skills_guides_documentation.md

### gradient-string
- **日本語名**: グラデーション文字列
- **定義**: ターミナルにグラデーションカラーテキストを出力するライブラリ
- **関連概念**: CLI/UI, chalk, figlet
- **使用箇所**: 01_project_overview_architecture.md

### Guardian
- **日本語名**: ガーディアン
- **定義**: Miyabi システムの最高権限者。ShunsukeHayashi (@ShunsukeHayashi)。サーキットブレーカー復旧承認、Production デプロイ承認、憲法改正、エスカレーション対応を担当
- **関連概念**: GUARDIAN.md, Escalation, Constitutional Governance
- **使用箇所**: 05_cicd_infrastructure.md, 07_skills_guides_documentation.md

---

## H

### Handlebars
- **日本語名**: Handlebars テンプレートエンジン
- **定義**: Doc Generator で使用されるテンプレートエンジン。カスタムヘルパー: isNotEmpty, codeBlock, formatParams, visibilityIcon, modifierBadges, formatDate
- **関連概念**: Doc Generator, TemplateEngine, Markdown
- **使用箇所**: 04_web_docgen_context_engineering.md

### Health Check
- **日本語名**: ヘルスチェック
- **定義**: システム正常性確認機構。DeploymentAgent の4段階パイプライン最終段、Docker コンテナ30秒間隔確認、MCP サーバー毎日チェック、CLI `miyabi doctor` / `miyabi health` コマンド
- **関連概念**: DeploymentAgent, Docker, MCP, Rollback
- **使用箇所**: 01_project_overview_architecture.md, 03_agent_specifications.md, 05_cicd_infrastructure.md

### HEARTBEAT
- **日本語名**: ハートビート
- **定義**: エージェント間通信のヘルスチェック用メッセージタイプ
- **関連概念**: AgentMessage, MessageType, Health Check
- **使用箇所**: 03_agent_specifications.md

### Hooks
- **日本語名**: フック
- **定義**: イベント駆動の自動実行スクリプト群（6フック）。auto-format.sh, validate-typescript.sh, log-commands.sh, agent-event.sh, session-continue.sh, webhook-fallback.js
- **関連概念**: pre-commit, LDD, agent-event
- **使用箇所**: 06_mcp_plugin_system.md - フックシステム

### HTTP Connection Pooling
- **日本語名**: HTTPコネクションプーリング
- **定義**: HTTP 接続を再利用するパフォーマンス最適化。keepAlive, maxSockets:50, maxFreeSockets:10, timeout:30秒。25-50%改善、高並行時最大10倍
- **関連概念**: API Client, LRU Cache, shared-utils
- **使用箇所**: 02_core_cli_shared_utils.md - api-client.ts

---

## I

### IAgent
- **日本語名**: エージェントインターフェース
- **定義**: エージェントの基本インターフェース。name, version, execute() を定義
- **関連概念**: AgentRegistry, BaseAgent
- **使用箇所**: 02_core_cli_shared_utils.md

### IDD (Issue-Driven Development)
- **日本語名**: Issue駆動開発
- **定義**: 「全てはIssueから始まる。例外なし。」を大原則とする開発手法。Issue → Label → Decompose → Implement → Review → PR → Deploy → Close
- **関連概念**: LDD, Zero Surprise Principle, Agentic OS
- **使用箇所**: 05_cicd_infrastructure.md, 07_skills_guides_documentation.md

### In-memory Storage
- **日本語名**: インメモリストレージ
- **定義**: miyabi-web のワークフローストレージ実装。サーバーサイドでメモリ内にワークフローデータを保持
- **関連概念**: workflow-storage.ts, miyabi-web
- **使用箇所**: 04_web_docgen_context_engineering.md

### Inquirer
- **日本語名**: Inquirer
- **定義**: CLI インタラクティブプロンプトライブラリ（v9.2.12）。セットアップウィザード等に使用
- **関連概念**: Commander.js, CLI
- **使用箇所**: 02_core_cli_shared_utils.md

### InterfaceInfo
- **日本語名**: インターフェース情報
- **定義**: ts-morph で解析されたインターフェースの構造情報。name, description, extends, properties, methods を含む
- **関連概念**: CodeAnalyzer, ClassInfo, FunctionInfo
- **使用箇所**: 04_web_docgen_context_engineering.md

### ISO 8601
- **日本語名**: ISO 8601日付形式
- **定義**: 国際標準の日時表記形式。AgentMessage の timestamp に使用
- **関連概念**: AgentMessage, timestamp
- **使用箇所**: 03_agent_specifications.md

### IssueAgent（みつけるん）
- **日本語名**: Issue分析エージェント
- **定義**: GitHub Issue を分析し53ラベル×10カテゴリに自動分類するエージェント。🔵分析権限。複雑度評価、下流エージェント向けコンテキスト準備。目標: 分析<15秒、ラベル精度>90%、重複検出>70%
- **関連概念**: Label State Machine, 53 Labels, CoordinatorAgent
- **使用箇所**: 03_agent_specifications.md

### IssueNode
- **日本語名**: Issueノード
- **定義**: ワークフローエディタの GitHub Issue ノード。issueNumber, title, status(open/closed) を含む
- **関連概念**: AgentNode, ConditionNode, WorkflowNodeType
- **使用箇所**: 04_web_docgen_context_engineering.md

### 一周 (Isshū)
- **日本語名**: 一周
- **定義**: CLI エラー自動報告に使用されるラベル名。エラー発生時に GitHub Issue として自動報告される
- **関連概念**: Feedback System, Error Reporting
- **使用箇所**: 02_core_cli_shared_utils.md

---

## J

### Jinja2
- **日本語名**: Jinja2テンプレートエンジン
- **定義**: Python 製テンプレートエンジン。Miyabi 定義システム（miyabi_def/）のテンプレート（.yaml.j2）に使用。base, world_definition, entities, relations, labels, workflows, agents, skills, universal_task_execution の9テンプレート
- **関連概念**: miyabi_def, Template, Python, generate.py
- **使用箇所**: 08_task_manager_github_projects_tests.md - テンプレートシステム

### JSDoc
- **日本語名**: JSDoc
- **定義**: JavaScript/TypeScript のドキュメンテーションコメント規格。CodeGenAgent が自動生成するコードに付与
- **関連概念**: CodeGenAgent, Doc Generator, TSDoc
- **使用箇所**: 03_agent_specifications.md, 07_skills_guides_documentation.md

---

## K

### Kahn's Algorithm
- **日本語名**: カーンのアルゴリズム
- **定義**: トポロジカルソートのアルゴリズム。入次数0のノードからキューで処理し、DAG の実行順序を計算。CoordinatorAgent と DAG Validator で使用
- **関連概念**: DAG, Topological Sort, CoordinatorAgent
- **使用箇所**: 03_agent_specifications.md, 04_web_docgen_context_engineering.md

### Keep a Changelog
- **日本語名**: Keep a Changelog
- **定義**: CHANGELOG のフォーマット標準。カテゴリ: Added, Changed, Fixed, Deprecated, Removed, Security
- **関連概念**: CHANGELOG, Conventional Commits
- **使用箇所**: 07_skills_guides_documentation.md

### KPI (Key Performance Indicator)
- **日本語名**: 主要業績評価指標
- **定義**: エージェントのパフォーマンス測定指標。`npm run kpi:collect` で収集。execution_time, success_rate, retry_count, error_rate, memory_usage, token_usage, cost_per_task
- **関連概念**: AgentMetrics, SLA, WeeklyReport
- **使用箇所**: 01_project_overview_architecture.md, 03_agent_specifications.md

### Kubernetes
- **日本語名**: Kubernetes
- **定義**: コンテナオーケストレーションプラットフォーム。MCP バンドルサーバーで6ツール（pods, services, deployments）を提供
- **関連概念**: Docker, Docker Compose, MCP Bundle
- **使用箇所**: 06_mcp_plugin_system.md

---

## L

### Label State Machine
- **日本語名**: ラベルステートマシン
- **定義**: GitHub Labels を用いたワークフロー状態管理機構。53ラベル×10カテゴリ。状態フロー: pending→analyzing→implementing→reviewing→done（blocked/paused への遷移あり）
- **関連概念**: State Machine, IssueAgent, 53 Labels
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### LDD (Log-Driven Development)
- **日本語名**: ログ駆動開発
- **定義**: 全アクションをログに記録する開発手法。`.ai/logs/YYYY-MM-DD.md` 形式。log-commands.sh フックで自動記録。追跡可能性の法則の実装
- **関連概念**: IDD, Zero Surprise Principle, Three Laws of Autonomy
- **使用箇所**: 05_cicd_infrastructure.md, 06_mcp_plugin_system.md

### Lean Canvas
- **日本語名**: リーンキャンバス
- **定義**: スタートアップ向けの1ページビジネスモデル設計ツール。ProductConceptAgent が MVP 設計に使用
- **関連概念**: ProductConceptAgent, MVP, AIEntrepreneurAgent
- **使用箇所**: 03_agent_specifications.md

### LLMDecomposer
- **日本語名**: LLMタスク分解器
- **定義**: LLM（Anthropic/Claude）を使用してタスクを自動分解するクラス。provider, model, apiKey, maxTokens, temperature を設定
- **関連概念**: DecompositionResult, DAGResult, CoordinatorAgent
- **使用箇所**: 08_task_manager_github_projects_tests.md

### LRU Cache
- **日本語名**: LRUキャッシュ（Least Recently Used）
- **定義**: 最も長く未使用のエントリを破棄するキャッシュ戦略。GitHub API クライアントで500エントリ、5分TTL、updateAgeOnGet で使用。API レート制限消費を削減
- **関連概念**: lru-cache, HTTP Connection Pooling, API Client
- **使用箇所**: 02_core_cli_shared_utils.md

### LTV (Lifetime Value)
- **日本語名**: 顧客生涯価値
- **定義**: 顧客1人が生涯にわたってもたらす収益。CRMAgent が最大化を担当
- **関連概念**: CRMAgent, AARRR, KPI
- **使用箇所**: 03_agent_specifications.md

---

## M

### ManagedTask
- **日本語名**: マネージドタスク
- **定義**: タスク管理システムの中核インターフェース。BaseTask を拡張し、currentState, stateHistory, githubIssueNumber, projectItemId, retryCount, executionWorktreePath, syncVersion, pendingSyncChanges を含む
- **関連概念**: TaskState, TaskManager, TaskExecutor
- **使用箇所**: 08_task_manager_github_projects_tests.md

### MarketingAgent（ひろめるん）
- **日本語名**: マーケティングエージェント
- **定義**: マーケティング戦略を担当するビジネスエージェント。🟢実行権限
- **関連概念**: ContentCreationAgent, SNSStrategyAgent, ビジネスエージェント
- **使用箇所**: 03_agent_specifications.md

### MarketResearchAgent（しらべるん）
- **日本語名**: 市場調査エージェント
- **定義**: 市場調査・競合分析を担当するビジネスエージェント。🔵分析権限
- **関連概念**: Five Forces, SWOT, ビジネスエージェント
- **使用箇所**: 03_agent_specifications.md

### MCP (Model Context Protocol)
- **日本語名**: モデルコンテキストプロトコル
- **定義**: AI モデルとツール/データソースを接続する標準プロトコル。Miyabi では7サーバー（180+ツール）を実装。`@modelcontextprotocol/sdk` v1.20.0 使用
- **関連概念**: MCP Bundle, MCP Servers, Claude Code
- **使用箇所**: 01_project_overview_architecture.md, 06_mcp_plugin_system.md

### MCP Bundle
- **日本語名**: MCPバンドルサーバー
- **定義**: `miyabi-mcp-bundle` v3.8.0。172ツールを21カテゴリに分類した統合 MCP サーバー（3629行）
- **関連概念**: MCP, 21カテゴリ, Claude Desktop
- **使用箇所**: 06_mcp_plugin_system.md

### MCP Servers (7 servers)
- **日本語名**: MCPサーバー群
- **定義**: ide-integration, github-enhanced, project-context, filesystem, context-engineering, miyabi, gemini-image-generation の7サーバー。各120秒タイムアウト
- **関連概念**: MCP, MCP Bundle
- **使用箇所**: 06_mcp_plugin_system.md

### MessageBus
- **日本語名**: メッセージバス
- **定義**: エージェント間の非同期メッセージ通信基盤。TASK_ASSIGNMENT, STATUS_UPDATE, ESCALATION, RESULT_REPORT, ERROR_REPORT, HEARTBEAT, CAPABILITY_QUERY/RESPONSE タイプをサポート
- **関連概念**: AgentMessage, MessageType
- **使用箇所**: 03_agent_specifications.md

### MessagePriority
- **日本語名**: メッセージ優先度
- **定義**: エージェントメッセージの優先度。0(CRITICAL)〜3の4段階
- **関連概念**: AgentMessage, MessageBus
- **使用箇所**: 03_agent_specifications.md

### MessageType
- **日本語名**: メッセージタイプ
- **定義**: TASK_ASSIGNMENT, STATUS_UPDATE, ESCALATION, RESULT_REPORT, ERROR_REPORT, HEARTBEAT, CAPABILITY_QUERY, CAPABILITY_RESPONSE
- **関連概念**: AgentMessage, MessageBus
- **使用箇所**: 03_agent_specifications.md

### Miyabi
- **日本語名**: みやび
- **定義**: 自律型AI開発フレームワーク。GitHub を Agentic OS として扱い、21エージェント（7 Coding + 14 Business）が Issue から Production デプロイまでを10-15分で自動化。合同会社みやび（Miyabi LLC）が開発
- **関連概念**: Agentic OS, 21 Agents, GitHub as OS
- **使用箇所**: 全研究ファイル

### MiyabiConfig
- **日本語名**: Miyabi設定
- **定義**: CLI 設定インターフェース。github, project, labels, workflows, cli（language: ja/en, theme: default/minimal）を定義
- **関連概念**: config/loader.ts, .miyabi.yml
- **使用箇所**: 02_core_cli_shared_utils.md

### miyabi-agent-sdk
- **日本語名**: Miyabiエージェント SDK
- **定義**: 7つのコーディングエージェントの TypeScript 実装 SDK（v0.1.0-alpha.2）。AgentContext, AgentResult, リトライ設定を定義
- **関連概念**: coding-agents, BaseAgent, AgentContext
- **使用箇所**: 03_agent_specifications.md

### miyabi-web
- **日本語名**: Miyabi Web UI
- **定義**: `@miyabi/web` v1.0.0。Next.js 15 + React 18 + @xyflow/react によるワークフローエディタ。Tailwind CSS（Ive-style ミニマルデザイン）。AgentNode, ConditionNode, IssueNode の3種ノード
- **関連概念**: Next.js, React Flow, DAG Validator, Tailwind CSS
- **使用箇所**: 04_web_docgen_context_engineering.md

### Monorepo
- **日本語名**: モノレポ
- **定義**: 複数パッケージを単一リポジトリで管理する開発手法。pnpm-workspace.yaml で `packages/*` を宣言し統一的な依存関係管理を実現
- **関連概念**: pnpm, pnpm-workspace.yaml, Packages
- **使用箇所**: 01_project_overview_architecture.md

### MVP (Minimum Viable Product)
- **日本語名**: 最小実行可能製品
- **定義**: 最小限の機能で市場投入可能な製品。ProductConceptAgent が Lean Canvas と共に設計
- **関連概念**: Lean Canvas, ProductConceptAgent
- **使用箇所**: 03_agent_specifications.md

---

## N

### Next.js
- **日本語名**: Next.js
- **定義**: React ベースのフルスタックフレームワーク（v15.5.14）。miyabi-web で App Router を使用
- **関連概念**: React, miyabi-web, App Router
- **使用箇所**: 04_web_docgen_context_engineering.md

### Node.js
- **日本語名**: Node.js
- **定義**: JavaScript ランタイム。v18+ 必須。pnpm 9 パッケージマネージャ
- **関連概念**: TypeScript, ESM, pnpm
- **使用箇所**: 01_project_overview_architecture.md

### npm audit
- **日本語名**: npm監査
- **定義**: npm パッケージの脆弱性スキャン。`npm run security:audit` で実行。6層セキュリティの第1層
- **関連概念**: Security, Gitleaks, Dependabot
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### npm Provenance
- **日本語名**: npm出所証明
- **定義**: npm パッケージの出所を OIDC 署名で証明する仕組み。auto-release / npm-publish ワークフローで使用
- **関連概念**: auto-release, SBOM, Security
- **使用箇所**: 05_cicd_infrastructure.md

---

## O

### OAuth
- **日本語名**: OAuth認証
- **定義**: GitHub OAuth Device Flow による認証。CLIENT_ID: `Ov23liiMr5kSJLGJFNyn`、スコープ: repo, workflow。認証情報は `~/.miyabi/credentials.json` に保存（パーミッション 0o600）
- **関連概念**: Device Flow, GITHUB_TOKEN, auth コマンド
- **使用箇所**: 02_core_cli_shared_utils.md

### Observer Pattern
- **日本語名**: オブザーバーパターン
- **定義**: イベント発生時に登録済みオブザーバーに通知するデザインパターン。Pipeline executor で EventEmitter として使用
- **関連概念**: EventEmitter, Design Patterns
- **使用箇所**: 02_core_cli_shared_utils.md

### Octokit
- **日本語名**: Octokit
- **定義**: GitHub の公式 API クライアントライブラリ。`@octokit/rest` v21.1.1（REST API）、`@octokit/graphql` v8.2.1（GraphQL API）
- **関連概念**: GitHub API, GitHubProjectsClient
- **使用箇所**: 01_project_overview_architecture.md, 02_core_cli_shared_utils.md

### Omega System (Ω-System)
- **日本語名**: オメガシステム
- **定義**: 6段階パイプライン。`miyabi omega` コマンドで実行。universal_task_execution.yaml.j2 テンプレートで定義
- **関連概念**: Pipeline, Water Spider, coding-agents
- **使用箇所**: 02_core_cli_shared_utils.md, 03_agent_specifications.md, 08_task_manager_github_projects_tests.md

### OpenSSF Scorecard
- **日本語名**: OpenSSFスコアカード
- **定義**: オープンソースプロジェクトのセキュリティベストプラクティス評価。6層セキュリティの第6層
- **関連概念**: Security, SBOM, CodeQL
- **使用箇所**: 05_cicd_infrastructure.md

### OptimizationResult
- **日本語名**: 最適化結果
- **定義**: コンテキスト最適化の結果。original_content, optimized_content, quality_score, original_token_count, optimized_token_count, token_reduction_percent（例: 52%）, improvements を含む
- **関連概念**: Context Engineering, AnalysisResult
- **使用箇所**: 04_web_docgen_context_engineering.md

### Ora
- **日本語名**: Ora
- **定義**: ターミナルスピナーライブラリ（v9.0.0）。CLI の処理中表示に使用
- **関連概念**: CLI/UI, chalk
- **使用箇所**: 02_core_cli_shared_utils.md

---

## P

### p-retry
- **日本語名**: リトライライブラリ
- **定義**: Promise ベースのリトライ機構ライブラリ
- **関連概念**: Retry with Backoff, withRetry
- **使用箇所**: 01_project_overview_architecture.md

### PDCA
- **日本語名**: PDCAサイクル
- **定義**: Plan-Do-Check-Act の改善サイクル。AnalyticsAgent が管理
- **関連概念**: AnalyticsAgent, KPI
- **使用箇所**: 03_agent_specifications.md

### PerformanceMonitor
- **日本語名**: パフォーマンスモニター
- **定義**: エージェント実行のパフォーマンス追跡コンポーネント。BaseAgent ライフサイクルの一部
- **関連概念**: BaseAgent, AgentMetrics, KPI
- **使用箇所**: 03_agent_specifications.md

### PersonaAgent（なりきりん）
- **日本語名**: ペルソナエージェント
- **定義**: ターゲット顧客ペルソナ作成を担当するビジネスエージェント。🔵分析権限
- **関連概念**: FunnelDesignAgent, MarketResearchAgent
- **使用箇所**: 03_agent_specifications.md

### Pipeline Operators
- **日本語名**: パイプライン演算子
- **定義**: コマンド合成の演算子。`|`（pipe: 順次実行・コンテキスト渡し）、`&&`（AND: 前が成功時のみ）、`||`（OR: 前が失敗時のみ）、`&`（parallel: 同時実行）
- **関連概念**: Pipeline, miyabi pipeline コマンド
- **使用箇所**: 02_core_cli_shared_utils.md

### PipelineContext
- **日本語名**: パイプラインコンテキスト
- **定義**: パイプライン実行時の状態情報。pipelineId, issueNumber, prNumber, qualityScore, testsPassed, errors, checkpoints を含む
- **関連概念**: Pipeline Operators, Builder Pattern
- **使用箇所**: 02_core_cli_shared_utils.md

### Playwright
- **日本語名**: Playwright
- **定義**: E2E ブラウザテストフレームワーク（v1.56.0）。スクリーンショット、ビデオ記録、ブラウザ自動化
- **関連概念**: Vitest, E2E Testing, miyabi-web
- **使用箇所**: 01_project_overview_architecture.md, 08_task_manager_github_projects_tests.md

### Plugin System
- **日本語名**: プラグインシステム
- **定義**: `miyabi-operations` v1.0.0。10コマンド（init, status, auto, amembo, watch, todos, agent, docs, deploy, test）を提供する Claude Code 拡張機構
- **関連概念**: plugin.json, MCP, Skills
- **使用箇所**: 06_mcp_plugin_system.md

### pnpm
- **日本語名**: pnpm
- **定義**: 高速パッケージマネージャ（v9）。モノレポ管理に使用。`pnpm-workspace.yaml` でワークスペース定義、`--frozen-lockfile` で再現性確保
- **関連概念**: Monorepo, Node.js, npm
- **使用箇所**: 01_project_overview_architecture.md

### pnpm overrides
- **日本語名**: pnpmオーバーライド
- **定義**: 脆弱性修正のための依存関係バージョン強制上書き。minimatch→3.1.4, flatted→3.4.2, glob→10.5.0
- **関連概念**: Security, npm audit, Dependabot
- **使用箇所**: 01_project_overview_architecture.md

### PostgreSQL
- **日本語名**: PostgreSQL
- **定義**: リレーショナルデータベース（16-alpine）。オプション状態永続化に使用。Docker Compose `with-database` プロファイル
- **関連概念**: Docker Compose, Redis, Data Persistence
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### PRAgent（まとめるん）
- **日本語名**: PR作成エージェント
- **定義**: PR 自動作成を担当するエージェント。🟡条件付き実行（レビュー合格後）。Conventional Commits 形式、コミットタイプ: feat/fix/refactor/docs/test。目標: PR作成<30秒、マージ成功率>95%
- **関連概念**: Conventional Commits, ReviewAgent, Feature Branch
- **使用箇所**: 03_agent_specifications.md

### ProductConceptAgent（ひらめきくん）
- **日本語名**: プロダクトコンセプトエージェント
- **定義**: MVP 設計・Lean Canvas 作成を担当するビジネスエージェント。🟢実行権限
- **関連概念**: MVP, Lean Canvas, AIEntrepreneurAgent
- **使用箇所**: 03_agent_specifications.md

### ProductDesignAgent（かくん）
- **日本語名**: プロダクトデザインエージェント
- **定義**: UI/UX 設計・デザインシステム構築を担当するビジネスエージェント。🟢実行権限
- **関連概念**: ProductConceptAgent, miyabi-web
- **使用箇所**: 03_agent_specifications.md

### Progressive Disclosure
- **日本語名**: 段階的開示
- **定義**: 情報を段階的に提示する設計原則。Agent Skill Use の3層: Layer 1 インデックス（~500トークン）→ Layer 2 メタデータ（~1,000トークン）→ Layer 3 フルコンテンツ（~5,000トークン）
- **関連概念**: Agent Skill Bus, Context Engineering, Token
- **使用箇所**: 07_skills_guides_documentation.md

### PromptTemplate
- **日本語名**: プロンプトテンプレート
- **定義**: 変数付き再利用可能プロンプト。template_id, name, template, category, tags, variables, usage_count を含む
- **関連概念**: Context Engineering, Jinja2
- **使用箇所**: 04_web_docgen_context_engineering.md

### Python
- **日本語名**: Python
- **定義**: オプション言語。Context Engineering API バックエンド（FastAPI/Uvicorn）、Gemini API サービス、miyabi_def 生成システムに使用
- **関連概念**: FastAPI, Uvicorn, Jinja2
- **使用箇所**: 01_project_overview_architecture.md, 04_web_docgen_context_engineering.md

---

## Q

### Quality Gate
- **日本語名**: 品質ゲート
- **定義**: コード品質の合否判定機構。ReviewAgent による100点満点評価、80点以上で合格。不合格時最大3回リトライ後エスカレーション
- **関連概念**: ReviewAgent, Auto-Loop Pattern, Quality Score
- **使用箇所**: 01_project_overview_architecture.md, 03_agent_specifications.md, 07_skills_guides_documentation.md

### Quality Score
- **日本語名**: 品質スコア
- **定義**: 0-100点の品質評価値。ReviewAgent 計算式: type_safety*0.3 + test_coverage*0.3 + lint_compliance*0.2 + docs*0.2。グレード: excellent(≥90), good(≥80), fair(≥60), poor(<60)
- **関連概念**: Quality Gate, ReviewAgent, GitHub Projects V2
- **使用箇所**: 03_agent_specifications.md, 07_skills_guides_documentation.md

---

## R

### React
- **日本語名**: React
- **定義**: UI ライブラリ（v18.3.1）。miyabi-web のフロントエンドに使用
- **関連概念**: Next.js, miyabi-web, @xyflow/react
- **使用箇所**: 04_web_docgen_context_engineering.md

### React Flow (@xyflow/react)
- **日本語名**: React Flow
- **定義**: フロー図/グラフエディタライブラリ（v12.3.6）。miyabi-web のワークフローエディタの基盤
- **関連概念**: miyabi-web, DAG, AgentNode
- **使用箇所**: 04_web_docgen_context_engineering.md

### Redis
- **日本語名**: Redis
- **定義**: インメモリデータストア（7-alpine）。オプション座標・キャッシュに使用。Docker Compose `with-cache` プロファイル
- **関連概念**: Docker Compose, PostgreSQL, LRU Cache
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### Retry with Backoff
- **日本語名**: バックオフ付きリトライ
- **定義**: 指数バックオフによるリトライ機構。maxAttempts:3, initialDelay:1000ms, maxDelay:10000ms, backoffMultiplier:2。ECONNRESET, ETIMEDOUT, ENOTFOUND, rate limit を対象
- **関連概念**: withRetry, shared-utils, Exponential Backoff
- **使用箇所**: 02_core_cli_shared_utils.md

### ReviewAgent（めだまん）
- **日本語名**: レビューエージェント
- **定義**: コード品質検証・スコアリングを担当する品質ゲートキーパー。🔵実行権限。100点満点評価、80点以上で PR 作成許可。最大3回リトライ。目標: レビュー<90秒、問題検出率>90%、偽陽性率<10%
- **関連概念**: Quality Gate, Quality Score, Auto-Loop Pattern
- **使用箇所**: 03_agent_specifications.md

### ReviewAgent Score
- **日本語名**: レビューエージェントスコア
- **定義**: コード品質の100点満点スコア。Correctness(30%/25%) + Security(25%/20%) + Performance(20%/15%) + Maintainability(15%) + Testing/Test Coverage(10%) + Readability(15%)。スキルによりウェイト配分が異なる
- **関連概念**: Quality Score, Quality Gate, ReviewAgent
- **使用箇所**: 03_agent_specifications.md, 07_skills_guides_documentation.md

### Rollback
- **日本語名**: ロールバック
- **定義**: デプロイ失敗時の自動復元機構。DeploymentAgent がヘルスチェック失敗時に自動実行。1時間以内の手動ロールバックも可能
- **関連概念**: DeploymentAgent, Health Check, CI/CD
- **使用箇所**: 03_agent_specifications.md, 07_skills_guides_documentation.md

---

## S

### SalesAgent（うりこみくん）
- **日本語名**: 営業エージェント
- **定義**: 営業戦略・SPIN Selling を担当するビジネスエージェント。🟢実行権限
- **関連概念**: CRMAgent, ビジネスエージェント
- **使用箇所**: 03_agent_specifications.md

### SBOM (Software Bill of Materials)
- **日本語名**: ソフトウェア部品表
- **定義**: ソフトウェアの依存関係を一覧化した文書。6層セキュリティの第5層として生成
- **関連概念**: Security, OpenSSF Scorecard, npm Provenance
- **使用箇所**: 05_cicd_infrastructure.md

### SelfAnalysisAgent（じぶんしるん）
- **日本語名**: 自己分析エージェント
- **定義**: SWOT 分析・キャリア計画を担当するビジネスエージェント。🔵分析権限
- **関連概念**: SWOT, ビジネスエージェント
- **使用箇所**: 03_agent_specifications.md

### Sequential Thinking
- **日本語名**: 構造化推論
- **定義**: MCP バンドルサーバーの推論ツール（3ツール）。段階的な構造化思考を支援
- **関連概念**: MCP Bundle, Context Engineering
- **使用箇所**: 06_mcp_plugin_system.md

### SimpleCache
- **日本語名**: シンプルキャッシュ
- **定義**: MCP バンドルサーバーの TTL 対応キャッシュクラス。デフォルト TTL: 5000ms
- **関連概念**: LRU Cache, MCP Bundle
- **使用箇所**: 06_mcp_plugin_system.md

### Singleton Pattern
- **日本語名**: シングルトンパターン
- **定義**: インスタンスを1つに制限するデザインパターン。AsyncFileWriter, GitHubClient, AgentRegistry で使用
- **関連概念**: Design Patterns, Factory Pattern
- **使用箇所**: 02_core_cli_shared_utils.md

### SLA (Service Level Agreement)
- **日本語名**: サービスレベル契約
- **定義**: エージェントの可用性・応答時間・成功率の保証。Tier 1(Critical): 99.9%/10秒/99%/5分復旧、Tier 2(High): 99.5%/30秒/95%/15分、Tier 3(Standard): 99.0%/60秒/90%/30分
- **関連概念**: KPI, AgentMetrics, Health Check
- **使用箇所**: 03_agent_specifications.md

### Snapshot Testing
- **日本語名**: スナップショットテスト
- **定義**: 出力のスナップショットを保存し、変更を検出するテスト手法。snapshot-test.yml ワークフローで一貫性検証
- **関連概念**: Vitest, Testing, CI/CD
- **使用箇所**: 05_cicd_infrastructure.md

### SNSStrategyAgent（つぶやきくん）
- **日本語名**: SNS戦略エージェント
- **定義**: SNS 戦略・投稿カレンダー管理を担当するビジネスエージェント。🟢実行権限
- **関連概念**: ContentCreationAgent, MarketingAgent
- **使用箇所**: 03_agent_specifications.md

### SPIN Selling
- **日本語名**: SPIN セリング
- **定義**: Situation, Problem, Implication, Need-payoff の4段階営業手法。SalesAgent が使用
- **関連概念**: SalesAgent
- **使用箇所**: 03_agent_specifications.md

### State Machine
- **日本語名**: ステートマシン（状態機械）
- **定義**: 状態遷移を管理する計算モデル。タスク管理の10状態（draft→pending→analyzing→implementing→reviewing→deploying→done、blocked, failed, cancelled）。28の遷移ルール
- **関連概念**: Label State Machine, TaskState, state-machine.yml
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md, 08_task_manager_github_projects_tests.md

### Strategy Pattern
- **日本語名**: ストラテジーパターン
- **定義**: アルゴリズムを交換可能にするデザインパターン。リトライ戦略、コマンド実行戦略で使用
- **関連概念**: Design Patterns, Retry with Backoff
- **使用箇所**: 02_core_cli_shared_utils.md

### Strict Mode (TypeScript)
- **日本語名**: TypeScript厳格モード
- **定義**: TypeScript コンパイラの厳格な型チェックモード。Miyabi 全パッケージで有効化
- **関連概念**: TypeScript, ESM, ESLint
- **使用箇所**: 01_project_overview_architecture.md, 07_skills_guides_documentation.md

### SWOT Analysis
- **日本語名**: SWOT分析
- **定義**: Strengths, Weaknesses, Opportunities, Threats の4象限で分析するフレームワーク。SelfAnalysisAgent が使用
- **関連概念**: SelfAnalysisAgent, Five Forces
- **使用箇所**: 03_agent_specifications.md

### System Optimizer
- **日本語名**: システムオプティマイザー
- **定義**: CPU/メモリ/負荷に基づく最適並行数計算。cpuBased = max(1, cpuCount-1)、memoryBased = floor(freeMemory/2GB)、上限8
- **関連概念**: ConcurrencyConfig, shared-utils
- **使用箇所**: 02_core_cli_shared_utils.md

---

## T

### Tailscale
- **日本語名**: Tailscale
- **定義**: VPN/ネットワーキングツール。分散クラスター実行でのマシン間通信に使用
- **関連概念**: Distributed Cluster, SSH
- **使用箇所**: 01_project_overview_architecture.md

### Tailwind CSS
- **日本語名**: Tailwind CSS
- **定義**: ユーティリティファースト CSS フレームワーク（v3.4.15）。miyabi-web で Ive-style ミニマルデザインに使用
- **関連概念**: miyabi-web, Next.js, Design System
- **使用箇所**: 04_web_docgen_context_engineering.md

### Task
- **日本語名**: タスク
- **定義**: 作業の最小単位。id, title, description, status, createdAt, updatedAt を含む基本インターフェース
- **関連概念**: ManagedTask, TaskState, TaskManager
- **使用箇所**: 02_core_cli_shared_utils.md

### TaskExecutor
- **日本語名**: タスク実行器
- **定義**: タスクの実行管理クラス。registerAgent, execute, executeParallel, executeSequence, cancel, getRunningTasks メソッドを提供
- **関連概念**: ManagedTask, ExecutionResult, WorktreeCoordinator
- **使用箇所**: 08_task_manager_github_projects_tests.md

### TaskManager
- **日本語名**: タスクマネージャー
- **定義**: `@miyabi/task-manager` v0.1.0 のメインクラス。タスク分解、CRUD、実行（単体/並列/DAG順序）、GitHub 同期を統合管理
- **関連概念**: ManagedTask, TaskExecutor, LLMDecomposer, BidirectionalSync
- **使用箇所**: 08_task_manager_github_projects_tests.md

### TaskManagerAgent
- **日本語名**: タスクマネージャーエージェント
- **定義**: 7つのエージェントタイプの1つ。タスク管理システムのエージェント実装
- **関連概念**: AgentType, TaskManager
- **使用箇所**: 08_task_manager_github_projects_tests.md

### TaskState
- **日本語名**: タスク状態
- **定義**: タスクの10状態。draft, pending, analyzing, implementing, reviewing, deploying, done, blocked, failed, cancelled
- **関連概念**: State Machine, ManagedTask, TaskStateTransition
- **使用箇所**: 08_task_manager_github_projects_tests.md

### TDD (Test-Driven Development)
- **日本語名**: テスト駆動開発
- **定義**: テストを先に書いてからコードを実装する開発手法。tdd-workflow.md ガイドで解説
- **関連概念**: AAA Pattern, Vitest, TestAgent
- **使用箇所**: 07_skills_guides_documentation.md

### Teachable
- **日本語名**: Teachable
- **定義**: オンラインコースプラットフォーム。CCG で生成したコンテンツを Chrome MCP 経由で自動アップロード
- **関連概念**: CCG, Browser Automation
- **使用箇所**: 07_skills_guides_documentation.md

### TemplateEngine
- **日本語名**: テンプレートエンジン
- **定義**: Doc Generator の Markdown 生成エンジン。Handlebars ベースでカスタムヘルパーを提供
- **関連概念**: Handlebars, Doc Generator, CodeAnalyzer
- **使用箇所**: 04_web_docgen_context_engineering.md

### TestAgent（たしかめるん）
- **日本語名**: テストエージェント
- **定義**: テスト実行・カバレッジ分析を担当するオプションエージェント。🟢実行権限。目標: テスト実行<180秒、合格率>95%、カバレッジ>80%
- **関連概念**: Vitest, CodeGenAgent, Quality Gate
- **使用箇所**: 03_agent_specifications.md

### Testing Library
- **日本語名**: テスティングライブラリ
- **定義**: React コンポーネントテストライブラリ（@testing-library/react v16.3.1）
- **関連概念**: Vitest, React, miyabi-web
- **使用箇所**: 04_web_docgen_context_engineering.md, 08_task_manager_github_projects_tests.md

### Three Laws of Autonomy
- **日本語名**: 自律の三法則
- **定義**: Miyabi エージェントの行動原則。(1) 客観性の法則: データ駆動のみ、(2) 自給自足の法則: 人間介入≤5%、(3) 追跡可能性の法則: 全アクションをGitHubに記録
- **関連概念**: AGENTS.md, Constitutional Governance, Guardian
- **使用箇所**: 01_project_overview_architecture.md, 05_cicd_infrastructure.md

### Topological Sort
- **日本語名**: トポロジカルソート
- **定義**: DAG のノードを依存関係順に並べるアルゴリズム。Kahn's Algorithm で実装。タスク実行順序の決定に使用
- **関連概念**: Kahn's Algorithm, DAG, CoordinatorAgent
- **使用箇所**: 03_agent_specifications.md, 04_web_docgen_context_engineering.md, 08_task_manager_github_projects_tests.md

### ts-morph
- **日本語名**: ts-morph
- **定義**: TypeScript AST（抽象構文木）操作ライブラリ。Doc Generator の CodeAnalyzer で TypeScript コードの構造解析に使用
- **関連概念**: CodeAnalyzer, AST, Doc Generator
- **使用箇所**: 04_web_docgen_context_engineering.md

### TSDoc
- **日本語名**: TSDoc
- **定義**: TypeScript 向けドキュメンテーションコメント規格。JSDoc の TypeScript 拡張
- **関連概念**: JSDoc, Doc Generator
- **使用箇所**: 07_skills_guides_documentation.md

### TTL (Time-to-Live)
- **日本語名**: 生存時間
- **定義**: データの有効期限。LRU Cache: 5分、AgentMessage: 可変(ms)、SimpleCache: 5秒、AgentRegistry キャッシュ: 15分
- **関連概念**: LRU Cache, AgentMessage, SimpleCache
- **使用箇所**: 02_core_cli_shared_utils.md, 03_agent_specifications.md, 06_mcp_plugin_system.md

### tsx
- **日本語名**: tsx
- **定義**: TypeScript 実行ツール（v4.7.0）。ビルドなしで TypeScript を直接実行
- **関連概念**: TypeScript, Node.js
- **使用箇所**: 01_project_overview_architecture.md

### TypeScript
- **日本語名**: TypeScript
- **定義**: JavaScript の型付きスーパーセット（v5.8.3）。Miyabi のプライマリ言語。Strict モード、ESM、ターゲット ES2022
- **関連概念**: Strict Mode, ESM, ESLint, Node.js
- **使用箇所**: 01_project_overview_architecture.md

---

## U

### UUID (Universally Unique Identifier)
- **日本語名**: 汎用一意識別子
- **定義**: 128ビットの一意識別子。v4（ランダム生成）をエージェントメッセージ ID、タスク ID に使用。`uuid` npm パッケージ
- **関連概念**: AgentMessage, ManagedTask, MCP Bundle Generator
- **使用箇所**: 03_agent_specifications.md, 08_task_manager_github_projects_tests.md

### Uvicorn
- **日本語名**: Uvicorn
- **定義**: Python の ASGI サーバー。Context Engineering API（Port 9001）、Gemini API（Port 8888）の実行に使用
- **関連概念**: FastAPI, Python, Context Engineering
- **使用箇所**: 01_project_overview_architecture.md

---

## V

### Validation
- **日本語名**: バリデーション
- **定義**: 入力・状態の正当性検証。CLI 入力バリデーション（CWE-22対策）、DAG 検証、タスク状態遷移検証、セキュリティ検証を含む
- **関連概念**: ValidationResult, ValidationError, Quality Gate
- **使用箇所**: 02_core_cli_shared_utils.md, 04_web_docgen_context_engineering.md, 08_task_manager_github_projects_tests.md

### ValidationError
- **日本語名**: 検証エラー
- **定義**: DAG 検証のエラー型。type: cycle / disconnected / invalid_edge / missing_agent
- **関連概念**: ValidationResult, DAG Validator
- **使用箇所**: 04_web_docgen_context_engineering.md

### ValidationResult
- **日本語名**: 検証結果
- **定義**: DAG 検証の結果。valid(boolean) と errors(ValidationError[]) を含む
- **関連概念**: DAG Validator, ValidationError
- **使用箇所**: 04_web_docgen_context_engineering.md

### Vitest
- **日本語名**: Vitest
- **定義**: Vite ベースのテストフレームワーク（v3.2.4）。ユニット・統合テストに使用。30秒タイムアウト、v8 カバレッジプロバイダー
- **関連概念**: Testing, Playwright, @vitest/coverage-v8
- **使用箇所**: 01_project_overview_architecture.md, 08_task_manager_github_projects_tests.md

---

## W

### Water Spider
- **日本語名**: ウォータースパイダー（みずすまし）
- **定義**: 完全自律実行モード。`miyabi auto` / `water-spider:start` で起動。Issue の自動検出・優先度付け・エージェントセッション作成・実行・終了を自律的に管理。優先度: 緊急→セキュリティ→ブロック→クイックウィン→FIFO
- **関連概念**: Agentic OS, CoordinatorAgent, Omega System
- **使用箇所**: 01_project_overview_architecture.md, 02_core_cli_shared_utils.md, 06_mcp_plugin_system.md

### WebSocket
- **日本語名**: ウェブソケット
- **定義**: 双方向リアルタイム通信プロトコル。監視ダッシュボード（Port 3001）、Context Engineering API のリアルタイム更新に使用。Server→Client: dashboard/alert、Client→Server: request_dashboard/acknowledge_alert
- **関連概念**: AgentDashboard, DashboardConfig, Context Engineering
- **使用箇所**: 04_web_docgen_context_engineering.md, 06_mcp_plugin_system.md

### WeeklyReport
- **日本語名**: 週次レポート
- **定義**: GitHubProjectsClient が生成する週次報告。week, totalIssues, completedIssues, agentMetrics, topQualityIssues, totalCost, avgQualityScore, completionRate を含む
- **関連概念**: AgentMetrics, GitHubProjectsClient, KPI
- **使用箇所**: 08_task_manager_github_projects_tests.md

### Workflow
- **日本語名**: ワークフロー
- **定義**: 一連の作業手順を定義する自動化単位。(1) GitHub Actions の24ワークフロー、(2) miyabi-web のビジュアルワークフロー（id, name, nodes, edges）、(3) miyabi_def の5ワークフロー（38ステージ）
- **関連概念**: GitHub Actions, miyabi-web, DAG
- **使用箇所**: 01_project_overview_architecture.md, 04_web_docgen_context_engineering.md, 05_cicd_infrastructure.md

### WorkflowNodeType
- **日本語名**: ワークフローノードタイプ
- **定義**: miyabi-web のノード種別。agent / issue / condition の3タイプ
- **関連概念**: AgentNode, IssueNode, ConditionNode
- **使用箇所**: 04_web_docgen_context_engineering.md

### WORKFLOW_RULES.md
- **日本語名**: ワークフロールール
- **定義**: ワークフローの3つの戒律を定義する文書。(1) IDD、(2) LDD、(3) Zero Surprise 原則
- **関連概念**: IDD, LDD, Zero Surprise Principle
- **使用箇所**: 05_cicd_infrastructure.md

### Worktree (git worktree)
- **日本語名**: ワークツリー
- **定義**: git の複数作業ディレクトリ機能。WorktreeCoordinator が並列タスクを分離した worktree で実行し、コンフリクトを防止
- **関連概念**: WorktreeCoordinator, Feature Branch, parallel execution
- **使用箇所**: 03_agent_specifications.md, 08_task_manager_github_projects_tests.md

### WorktreeCoordinator
- **日本語名**: ワークツリーコーディネーター
- **定義**: git worktree を使用した並列タスク分離実行コーディネーター。initialize, executeInWorktree, executeParallel メソッドを提供
- **関連概念**: Worktree, TaskExecutor, parallel execution
- **使用箇所**: 08_task_manager_github_projects_tests.md

---

## X

### @xyflow/react
- **日本語名**: xyflow React
- **定義**: React Flow のフロー図/グラフエディタライブラリ（v12.3.6）。miyabi-web のワークフロー可視化に使用
- **関連概念**: React Flow, miyabi-web, DAG
- **使用箇所**: 04_web_docgen_context_engineering.md

---

## Y

### YAML
- **日本語名**: YAML
- **定義**: データシリアライゼーション言語。BUDGET.yml、labels.yml、pnpm-workspace.yaml、GitHub Actions ワークフロー、miyabi_def テンプレートに使用。`yaml` npm パッケージ（v2.3.4）
- **関連概念**: Jinja2, Configuration, GitHub Actions
- **使用箇所**: 全研究ファイル

### YouTubeAgent（どうがん）
- **日本語名**: YouTubeエージェント
- **定義**: YouTube 戦略・SEO 最適化を担当するビジネスエージェント。🟢実行権限
- **関連概念**: ContentCreationAgent, SNSStrategyAgent
- **使用箇所**: 03_agent_specifications.md

---

## Z

### Zero Surprise Principle
- **日本語名**: ゼロサプライズ原則
- **定義**: 「サイレント変更禁止」の原則。全ての変更はログ記録され、関係者に通知される。WORKFLOW_RULES.md の3つの戒律の1つ
- **関連概念**: LDD, IDD, Three Laws of Autonomy
- **使用箇所**: 05_cicd_infrastructure.md

---

## エージェント一覧（全21体）

### コーディングエージェント（7体）

| # | 英語名 | 日本語名（キャラクター） | 役割 | 権限 |
|---|---|---|---|---|
| 1 | CoordinatorAgent | しきるん | オーケストレーター | 🔴統括 |
| 2 | CodeGenAgent | つくるん | コード生成 | 🟢実行 |
| 3 | ReviewAgent | めだまん | 品質検証 | 🔵分析 |
| 4 | IssueAgent | みつけるん | Issue分析 | 🔵分析 |
| 5 | PRAgent | まとめるん | PR作成 | 🟡サポート |
| 6 | DeploymentAgent | はこぶん | デプロイ | 🟡サポート |
| 7 | TestAgent | たしかめるん | テスト実行 | 🟢実行 |

### ビジネスエージェント（14体）

| # | 英語名 | 日本語名（キャラクター） | 役割 | 権限 |
|---|---|---|---|---|
| 8 | AIEntrepreneurAgent | あきんどさん | ビジネスプラン | 🔴リーダー |
| 9 | ProductConceptAgent | ひらめきくん | MVP設計 | 🟢実行 |
| 10 | ProductDesignAgent | かくん | UI/UX設計 | 🟢実行 |
| 11 | FunnelDesignAgent | みちびきくん | カスタマージャーニー | 🟢実行 |
| 12 | PersonaAgent | なりきりん | 顧客ペルソナ | 🔵分析 |
| 13 | SelfAnalysisAgent | じぶんしるん | SWOT分析 | 🔵分析 |
| 14 | MarketResearchAgent | しらべるん | 市場調査 | 🔵分析 |
| 15 | MarketingAgent | ひろめるん | マーケティング | 🟢実行 |
| 16 | ContentCreationAgent | かくちゃん | コンテンツ生成 | 🟢実行 |
| 17 | SNSStrategyAgent | つぶやきくん | SNS戦略 | 🟢実行 |
| 18 | YouTubeAgent | どうがん | YouTube戦略 | 🟢実行 |
| 19 | SalesAgent | うりこみくん | 営業戦略 | 🟢実行 |
| 20 | CRMAgent | つなぐん | 顧客関係管理 | 🟡サポート |
| 21 | AnalyticsAgent | かぞえるん | データ分析 | 🔵分析 |

---

## キャラクター権限カラーコード

| 色 | 権限レベル | 並列実行 | 該当数 |
|---|---|---|---|
| 🔴 赤 | リーダー（戦略的意思決定） | 不可 | 2体 |
| 🟢 緑 | 実行役（タスク実行） | 可能 | 12体 |
| 🔵 青 | 分析役（情報分析） | 可能 | 5体 |
| 🟡 黄 | サポート（条件付き実行） | 条件付き | 3体（内1体はTaskManagerAgent） |

---

## 数字・記号

### 53 Labels (53ラベル)
- **日本語名**: 53ラベル
- **定義**: GitHub Issues に付与される53種類のラベル群。10カテゴリ: type, priority, severity, state, agent, quality, squad, effort, domain, status
- **関連概念**: Label State Machine, IssueAgent, GitHub as OS
- **使用箇所**: 01_project_overview_architecture.md, 03_agent_specifications.md, 05_cicd_infrastructure.md

### 10 Categories (10カテゴリ)
- **日本語名**: 10カテゴリ
- **定義**: ラベル分類の10カテゴリ。State(8), Agent(6), Priority(4), Type(7), Severity(4), Phase(5), Special(7), Trigger(4), Quality(4), Community(4)
- **関連概念**: 53 Labels, Label State Machine
- **使用箇所**: 05_cicd_infrastructure.md

### 14 Entities (14エンティティ)
- **日本語名**: 14コアエンティティ
- **定義**: Miyabi 定義システムのコアエンティティ。Issue, Task, Agent, PR, Label, QualityReport, Command, Escalation, Deployment, LDDLog, DAG, Worktree, DiscordCommunity, SubIssue
- **関連概念**: miyabi_def, 39 Relations, Jinja2
- **使用箇所**: 08_task_manager_github_projects_tests.md

### 39 Relations (39リレーション)
- **日本語名**: 39リレーション
- **定義**: 14エンティティ間の関係定義。カーディナリティ: N1(1:1), N2(1:N), N3(N:N)
- **関連概念**: 14 Entities, miyabi_def
- **使用箇所**: 08_task_manager_github_projects_tests.md

### 172 Tools (172ツール)
- **日本語名**: 172ツール
- **定義**: MCP バンドルサーバーが提供する統合ツール群。21カテゴリに分類
- **関連概念**: MCP Bundle, 21 Categories
- **使用箇所**: 06_mcp_plugin_system.md

### 24 Workflows (24ワークフロー)
- **日本語名**: 24ワークフロー
- **定義**: GitHub Actions で定義された自動化ワークフロー群。コア、CI/CD、セキュリティ、監視を含む
- **関連概念**: GitHub Actions, CI/CD, State Machine
- **使用箇所**: 05_cicd_infrastructure.md
