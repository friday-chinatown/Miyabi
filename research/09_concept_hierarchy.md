# Miyabi 論理的概念階層 - 完全体系図

## 最上位概念: Miyabi = Agentic OS

**定義**: GitHub を OS として扱い、Issue から本番デプロイまでのソフトウェア開発ライフサイクルを自律的 AI エージェント群が 10-15 分で自動化する、世界初の実用的 Agentic OS テンプレート。

**核心的約束**: Issue を書くだけで、人間のコーディング不要で PR が自動生成され、本番デプロイまで完了する。

---

## Level 1: ビジョンと哲学 (WHY)

### 1.1 存在意義

```
Miyabi
├── 歴史的位置づけ
│   ├── Windows 95 → コンピュータの民主化
│   ├── iOS/Android → スマートフォンの民主化
│   └── Miyabi → AI エージェントとの協業の民主化
├── 核心価値
│   ├── 非技術者でも自律エージェントと協業可能
│   ├── Issue → Production を 10-15 分で実現
│   └── 人間介入率 5% 以下を目標
└── ライセンス・所有権
    ├── Apache License 2.0
    ├── 著作権: Shunsuke Hayashi / 合同会社みやび (Miyabi LLC)
    └── 商標: "Miyabi" コモンロー商標
```

### 1.2 自律の三法則 (Constitutional Governance)

```
三法則
├── 第一法則: 客観性の法則
│   ├── 感情・感傷を排除
│   ├── データ駆動判断のみ
│   └── 実装 → 品質スコア 0-100、合格 ≥80
├── 第二法則: 自給自足の法則
│   ├── 人間依存最小化
│   ├── エスカレーション率 ≤5% 目標
│   └── 実装 → Auto-Retry Loop（最大 3 回）
└── 第三法則: 追跡可能性の法則
    ├── 全アクションを GitHub に記録
    ├── 完全な監査証跡
    └── 実装 → `.ai/logs/YYYY-MM-DD.md`
```

### 1.3 三つの戒律 (Workflow Rules)

```
大原則: 「全ては Issue から始まる。例外なし。」
├── IDD (Issue-Driven Development)
│   └── Issue → Label → Decompose → Implement → Review → PR → Deploy → Close
├── LDD (Log-Driven Development)
│   └── 全てログ記録、log-commands.sh フックで強制
└── Zero Surprise 原則
    └── サイレント変更禁止、全変更を追跡可能に
```

### 1.4 Guardian システム

```
Guardian: ShunsukeHayashi (@ShunsukeHayashi)
├── エスカレーション基準
│   ├── Critical (Sev.1) → 24 時間対応（サーキットブレーカー発動、セキュリティ侵害）
│   ├── Constitutional → 7 日（法則改正提案）
│   └── Budget → 即時（コスト緊急閾値接近）
├── 承認権限
│   ├── Production デプロイ承認
│   ├── PR マージ最終承認
│   └── サーキットブレーカー復旧承認
└── CODEOWNERS
    └── 全ファイルのデフォルト所有者: @ShunsukeHayashi
```

---

## Level 2: アーキテクチャと設計 (WHAT)

### 2.1 GitHub as Operating System

```
GitHub OS マッピング
├── Issues = プロセス制御 / タスクキュー
│   ├── 各 Issue がエージェントワークフローをトリガー
│   └── `🤖agent-execute` ラベルで実行開始
├── Labels = ステートマシン
│   ├── 53 ラベル × 10 カテゴリ
│   └── 状態遷移: pending → analyzing → implementing → reviewing → done
├── Projects V2 = データ永続化層
│   ├── カスタムフィールド: Agent, Duration, Cost, Quality Score, Sprint
│   └── リレーショナルデータ、メトリクス、状態保持
├── Actions = 実行エンジン
│   ├── 24 GitHub Actions ワークフロー
│   └── カスタム Action: agent-executor
├── Webhooks = イベントバス
│   ├── リアルタイム状態変更通知
│   └── webhook-handler.yml（中央イベントルーター）
├── Secrets = セキュアボールト
│   └── GITHUB_TOKEN, ANTHROPIC_API_KEY, NPM_TOKEN, X_BEARER_TOKEN, GEMINI_API_KEY
├── Pages = ダッシュボード
├── Discussions = メッセージキュー
└── CODEOWNERS = アクセス制御
```

### 2.2 ラベルシステム（53 ラベル × 10 カテゴリ）

```
ラベル体系
├── State (8): pending, analyzing, implementing, reviewing, done, blocked, paused, failed
├── Agent (6): coordinator, codegen, review, issue, pr, deployment
├── Priority (4): P0-Critical, P1-High, P2-Medium, P3-Low
├── Type (7): feature, bug, docs, refactor, test, architecture, deployment
├── Severity (4): Sev.1-Critical, Sev.2-High, Sev.3-Medium, Sev.4-Low
├── Phase (5): planning, implementation, testing, deployment, monitoring
├── Special (7): security, cost-watch, dependencies, experiment
├── Trigger (4): agent-execute, generate-report, deploy-staging, deploy-production
├── Quality (4): excellent(90+), good(80-89), needs-improvement(60-79), poor(<60)
└── Community (4): good-first-issue, help-wanted, question, discussion
```

### 2.3 モノレポ構造

```
pnpm モノレポ (pnpm-workspace.yaml)
├── packages/cli/               → miyabi (v0.22.0) - CLI エントリポイント
├── packages/core/              → @agentic-os/core (v0.1.0) - 基盤レイヤー
├── packages/coding-agents/     → 7 コーディングエージェント実装
├── packages/miyabi-agent-sdk/  → Agent SDK
├── packages/mcp-bundle/        → miyabi-mcp-bundle (v3.8.0) - 172 ツール
├── packages/shared-utils/      → @miyabi/shared-utils (v0.1.0) - 共有ユーティリティ
├── packages/context-engineering/ → @miyabi/context-engineering (v0.1.0)
├── packages/github-projects/   → @agentic-os/github-projects (v1.0.0)
├── packages/task-manager/      → @miyabi/task-manager (v0.1.0)
├── packages/doc-generator/     → @agentic-os/doc-generator (v1.0.0)
└── packages/miyabi-web/        → @miyabi/web (v1.0.0) - Web ダッシュボード
```

### 2.4 パッケージ間依存関係

```
依存関係グラフ
packages/cli
├── → @agentic-os/core
├── → @miyabi/shared-utils
├── → agent-skill-bus
├── → miyabi-agent-sdk
└── → 外部: @octokit/*, chalk, inquirer, yaml, dotenv, commander

@agentic-os/core
├── → 再エクスポート: @miyabi/coding-agents
├── → エクスポート: BusinessBaseAgent
└── → 外部: @octokit/*, @anthropic-ai/sdk

@miyabi/shared-utils
└── → 外部依存なし（純 TypeScript）

packages/task-manager
├── → @anthropic-ai/sdk
├── → @octokit/rest, @octokit/graphql
└── → uuid

packages/miyabi-web
├── → Next.js 15, React 18
├── → @xyflow/react
└── → Tailwind CSS
```

### 2.5 技術スタック

```
技術スタック
├── プライマリ言語
│   ├── TypeScript (Strict モード, ESM, ES2022)
│   └── Python (オプション: Context Engineering, Gemini API)
├── ランタイム
│   ├── Node.js v18+ / v20 (Docker)
│   └── pnpm 9 パッケージマネージャ
├── AI/LLM
│   ├── Claude Sonnet 4 (claude-sonnet-4-20250514) → コード生成・レビュー
│   ├── Gemini 3 Flash Preview / 2.5 Flash → コンテキストエンジニアリング、画像生成
│   └── GPT-5.4 / GPT-5.4-mini → .codex エージェント設定
├── GitHub 統合
│   ├── @octokit/rest ^21.1.1 (REST API)
│   └── @octokit/graphql ^8.2.1 (GraphQL API)
├── MCP
│   └── @modelcontextprotocol/sdk ^1.20.0
├── CLI フレームワーク
│   ├── Commander.js ^11.1.0
│   ├── Inquirer ^9.2.12
│   └── UI: chalk, ora, figlet, gradient-string, cli-table3, boxen
├── Web フレームワーク
│   ├── Next.js 15 (App Router)
│   ├── React 18
│   ├── @xyflow/react (React Flow)
│   └── Tailwind CSS
├── テスト
│   ├── Vitest ^3.2.4 (Unit/Integration, v8 カバレッジ)
│   ├── Playwright ^1.56.0 (E2E)
│   └── @testing-library/react ^16.3.1
├── コンテナ/DevOps
│   ├── Docker + Docker Compose (マルチステージビルド)
│   ├── PostgreSQL 16-alpine (オプション)
│   └── Redis 7-alpine (オプション)
└── ユーティリティ
    ├── lru-cache, p-retry, dotenv
    ├── ts-morph (AST パーサー)
    ├── Handlebars (テンプレートエンジン)
    └── agent-skill-bus ^1.2.0 (110+ ビルトインスキル)
```

---

## Level 3: システムとコンポーネント (HOW)

### 3.1 エージェントシステム

#### 3.1.1 コーディングエージェント（7 体）

```
コーディングエージェント
├── CoordinatorAgent (しきるん) 🔴 リーダー
│   ├── 役割: タスク分解リーダー、全操作オーケストレーション
│   ├── 機能
│   │   ├── GitHub Issue → 1-3 時間アトミックタスクに分解
│   │   ├── Kahn's Algorithm による DAG 構築
│   │   ├── DFS ベース循環依存検出
│   │   ├── 最大 5 並行エージェント自動割り当て
│   │   └── リアルタイム進捗監視・実行レポート
│   ├── SLA: DAG 生成 <30 秒、分解精度 >95%、並列効率 >70%
│   └── エスカレーション先: TechLead（技術）、PO（要件）
│
├── CodeGenAgent (つくるん) 🟢 実行役
│   ├── 役割: Claude Sonnet 4 による AI コード生成
│   ├── 機能: Issue 要件解析、TypeScript コード生成、Vitest テスト自動生成、JSDoc
│   ├── モデル: claude-sonnet-4-20250514, Max Tokens: 8,000
│   ├── SLA: コード生成 <60 秒、品質 >80/100、カバレッジ >80%
│   └── Context Engineering 統合: プロンプト最適化パイプライン
│
├── ReviewAgent (めだまん) 🔵 分析役
│   ├── 役割: コード品質検証・100 点スコアリング
│   ├── スコア公式
│   │   ├── type_safety * 0.3
│   │   ├── test_coverage * 0.3
│   │   ├── lint_compliance * 0.2
│   │   └── docs * 0.2
│   ├── Grade: excellent(≥90), good(≥80), fair(≥60), poor(<60)
│   ├── Auto-Loop: スコア <80 → 最大 3 回リトライ
│   └── SLA: レビュー <90 秒、問題検出 >90%、偽陽性 <10%
│
├── IssueAgent (みつけるん) 🔵 分析役
│   ├── 役割: GitHub Issue 分析・53 ラベル自動分類
│   ├── 10 カテゴリ: type, priority, severity, state, agent, quality, squad, effort, domain, status
│   ├── 複雑度評価: ファイル数、クロスモジュール影響、テストカバレッジ、外部依存、セキュリティ影響
│   ├── SLA: 分析 <15 秒、ラベル精度 >90%、重複検出 >70%
│   └── セキュリティ検証: eval, exec, sudo, 外部パス、シークレット検出
│
├── PRAgent (まとめるん) 🟡 サポート
│   ├── 役割: PR 自動作成 (Conventional Commits)
│   ├── コミットタイプ: feat, fix, refactor, docs, test, style, perf, chore, ci
│   ├── ブランチ命名: {type}/{issue_number}-{description}
│   ├── SLA: PR 作成 <30 秒、マージ成功率 >95%
│   └── マージポリシー: PR 作成は自動、マージは Guardian 承認必須
│
├── DeploymentAgent (はこぶん) 🟡 サポート
│   ├── 役割: CI/CD 自動化・本番デプロイ
│   ├── 4 段階パイプライン: Build(60s) → Test(120s) → Deploy(60s) → Health Check(60s)
│   ├── SLA: 可用性 99.9%、応答 <10 秒(P95)、成功率 >99%
│   ├── 自動ロールバック: ヘルスチェック失敗時
│   └── 環境: Staging（自動）、Production（Guardian 承認必須）
│
└── TestAgent (たしかめるん) 🟢 実行役（オプション）
    ├── 役割: テスト実行・カバレッジ分析
    ├── テストスタック: Vitest (unit/integration)、Playwright (E2E)、Testing Library
    ├── パターン: AAA (Arrange → Act → Assert)
    ├── SLA: テスト実行 <180 秒、合格率 >95%、カバレッジ >80%
    └── カバレッジ要件: 80% (statements, branches, functions, lines)
```

#### 3.1.2 ビジネスエージェント（14 体）

```
ビジネスエージェント
├── 戦略・計画（6 体）
│   ├── AIEntrepreneurAgent (あきんどさん) 🔴 → 8 段階ビジネスプラン
│   ├── ProductConceptAgent (ひらめきくん) 🟢 → MVP 設計・Lean Canvas
│   ├── ProductDesignAgent (かくん) 🟢 → UI/UX 設計・デザインシステム
│   ├── FunnelDesignAgent (みちびきくん) 🟢 → カスタマージャーニー・AARRR
│   ├── PersonaAgent (なりきりん) 🔵 → ターゲット顧客ペルソナ
│   └── SelfAnalysisAgent (じぶんしるん) 🔵 → SWOT 分析・キャリア計画
├── マーケティング（5 体）
│   ├── MarketResearchAgent (しらべるん) 🔵 → 市場調査・競合分析
│   ├── MarketingAgent (ひろめるん) 🟢 → マーケティング戦略
│   ├── ContentCreationAgent (かくちゃん) 🟢 → コンテンツ生成（ブログ、SEO）
│   ├── SNSStrategyAgent (つぶやきくん) 🟢 → SNS 戦略・投稿カレンダー
│   └── YouTubeAgent (どうがん) 🟢 → YouTube 戦略・SEO 最適化
└── 営業・顧客管理（3 体）
    ├── SalesAgent (うりこみくん) 🟢 → 営業戦略・SPIN Selling
    ├── CRMAgent (つなぐん) 🟡 → 顧客関係管理・LTV 最大化
    └── AnalyticsAgent (かぞえるん) 🔵 → データ分析・PDCA
```

#### 3.1.3 キャラクターシステム

```
命名・カラーコーディング
├── 🔴 赤 = リーダー（並列不可、2 体）
├── 🟢 緑 = 実行役（並列可能、12 体）
├── 🔵 青 = 分析役（並列可能、5 体）
├── 🟡 黄 = サポート（条件付き並列、3 体）
└── 命名規則
    ├── ひらがな/カタカナ優先
    ├── 役割を表現（つくる=create, めだ=eye）
    ├── 親しみやすい接尾辞（〜くん、〜ちゃん、〜るん）
    └── 3-5 文字
```

#### 3.1.4 エージェント間通信

```
通信プロトコル
├── メッセージ形式
│   ├── id: UUID v4
│   ├── from/to: AgentType
│   ├── type: MessageType
│   ├── priority: 0-3 (0=CRITICAL)
│   ├── payload: Generic<T>
│   ├── timestamp: ISO 8601
│   ├── correlationId: トレーシング用
│   └── ttl: Time-to-live (ms)
├── メッセージタイプ
│   ├── TASK_ASSIGNMENT (Coordinator → Specialist)
│   ├── STATUS_UPDATE (Specialist → Coordinator)
│   ├── ESCALATION (Specialist → Coordinator)
│   ├── RESULT_REPORT (Specialist → Coordinator)
│   ├── ERROR_REPORT (Any → Coordinator)
│   ├── HEARTBEAT (ヘルスチェック)
│   └── CAPABILITY_QUERY/RESPONSE (能力広告)
└── 通信フロー
    └── Coordinator → MessageBus → Agent.receiveMessage() → execute() → MessageBus → Coordinator
```

#### 3.1.5 SLA ティア

```
SLA 体系
├── Tier 1: Critical (Coordinator, Deployment)
│   └── 可用性 99.9%, 応答 <10 秒(P95), 成功率 >99%, 復旧 <5 分
├── Tier 2: High (CodeGen, Review, Issue, PR)
│   └── 可用性 99.5%, 応答 <30 秒(P95), 成功率 >95%, 復旧 <15 分
└── Tier 3: Standard (Business, Test)
    └── 可用性 99.0%, 応答 <60 秒(P95), 成功率 >90%, 復旧 <30 分
```

### 3.2 SDK アーキテクチャ

```
SDK 層構造
├── @agentic-os/core
│   ├── 型定義 (types/index.ts)
│   │   ├── AgentStatus: 'idle' | 'running' | 'completed' | 'failed'
│   │   ├── AgentConfig: name, description, enabled
│   │   ├── AgentResult<T>: success, data, error, timestamp
│   │   └── Task: id, title, description, status, createdAt, updatedAt
│   ├── AgentRegistry (Singleton)
│   │   ├── register(name, agent)
│   │   ├── get(name) → IAgent
│   │   ├── getAll() → IAgent[]
│   │   └── インテリジェント割り当て（15 分 TTL キャッシュ、最大 100 エントリ）
│   └── BusinessBaseAgent (abstract)
│       ├── execute(task) → BusinessResult [抽象]
│       ├── validateTask(task)
│       ├── callClaude(prompt, systemPrompt?, model?)
│       ├── formatResult()
│       └── handleError()
│
├── miyabi-agent-sdk
│   ├── AgentContext: owner, repo, issueNumber, token, workdir, config
│   ├── AgentResult: status, message, metrics, artifacts, error
│   └── リトライ設定: retries=3, minTimeout=1000, maxTimeout=4000, factor=2
│
└── coding-agents パッケージ
    ├── BaseAgent (150+ 行)
    │   └── ライフサイクル
    │       ├── 1. globalMetricsCollector.onAgentStart()
    │       ├── 2. sendAgentEvent('started')
    │       ├── 3. PerformanceMonitor.startAgentTracking()
    │       ├── 4. validateTask(task)
    │       ├── 5. execute(task) [抽象メソッド]
    │       ├── 6. recordMetrics(result)
    │       ├── 7. updateLDDLog(result)
    │       ├── 8. traceLogger.endAgentExecution()
    │       └── 9. performanceMonitor.endAgentTracking()
    └── エクスポート構造
        ├── ./base-agent, ./types
        ├── ./coordinator, ./codegen, ./review, ./issue, ./pr, ./deployment
        ├── ./feedback-loop (Auto-loop パターン)
        ├── ./water-spider (セッション管理)
        ├── ./worktree (git worktree ユーティリティ)
        ├── ./monitoring (パフォーマンス監視)
        └── ./omega-system (6 段階パイプライン)
```

### 3.3 CLI システム

```
miyabi CLI (v0.22.0, Commander.js)
├── グローバルオプション
│   ├── --json (JSON 出力)
│   ├── -y, --yes (自動確認)
│   ├── -v, --verbose (詳細ログ)
│   └── --debug (デバッグ)
├── プロジェクト作成
│   ├── init <name> → 新プロジェクト（53 ラベル + 16 ワークフロー）
│   └── install → 既存プロジェクトに追加
├── ステータス・診断
│   ├── status (-w: watch モード)
│   ├── doctor → システムヘルスチェック
│   ├── health → クイックヘルス
│   └── config → 設定管理
├── セットアップ・認証
│   ├── setup → ウィザード
│   ├── onboard → 初回オンボーディング
│   └── auth → GitHub OAuth (login/logout/status)
├── 自動化
│   ├── agent run <type> → 個別エージェント実行
│   ├── run → 統合実行
│   ├── auto → Water Spider 完全自動化
│   ├── omega → Omega-System 6 段階パイプライン
│   ├── pipeline → コマンド合成（pipe/AND/OR/parallel）
│   ├── fix <issue> → バグ修正ショートカット
│   ├── build <issue> → 機能構築ショートカット
│   ├── ship → デプロイショートカット
│   ├── cycle → フィードバックループ制御
│   └── sprint → スプリント計画 + バッチ Issue 作成
├── DevOps ツール
│   ├── gni → GitNexus コード知能（14 サブコマンド）
│   ├── bus → Agent Skill Bus キュー管理（11 サブコマンド）
│   ├── task → タスク管理（list/view/add/done）
│   ├── release → リリース管理 + X/Discord 通知
│   ├── voice → 音声駆動モード
│   ├── skills → Claude Code スキル管理
│   ├── todos → TODO 検出 → Issue 作成
│   ├── dashboard → ダッシュボード管理
│   └── docs → ドキュメント自動生成
├── 設定システム
│   ├── MiyabiConfig: github, project, labels, workflows, cli
│   └── 検索順: .miyabi.yml → .miyabirc → .miyabi.yaml
├── パイプラインシステム
│   ├── 演算子: | (pipe), && (AND), || (OR), & (parallel)
│   └── コンテキスト: pipelineId, issueNumber, prNumber, qualityScore, testsPassed
├── 認証システム
│   ├── GitHub OAuth Device Flow
│   ├── OAuth App CLIENT_ID: Ov23liiMr5kSJLGJFNyn
│   ├── スコープ: repo, workflow
│   └── 保存先: ~/.miyabi/credentials.json (0o600)
├── プロジェクト分析
│   ├── 言語検出: package.json, requirements.txt, go.mod, Cargo.toml 等
│   ├── フレームワーク検出: Next.js, React, Vue, Express, Django 等
│   └── ビルドツール/パッケージマネージャ検出
├── フィードバックシステム
│   ├── エラー自動報告先: github.com/ShunsukeHayashi/Miyabi
│   └── エラー種別: 認証失敗、リポジトリ作成失敗、リソース未発見、権限、ネットワーク
├── エラーコード体系
│   ├── 0: SUCCESS
│   ├── 1: GENERAL_ERROR
│   ├── 2: CONFIG_ERROR
│   ├── 3: VALIDATION_ERROR
│   ├── 4: NETWORK_ERROR
│   └── 5: AUTH_ERROR
└── クロスプラットフォーム
    └── isWindows(), isMacOS(), isLinux(), getPlatform(), execCommand()
```

### 3.4 MCP サーバー群

```
MCP エコシステム (180+ ツール)
├── カスタム MCP サーバー（7 サーバー）
│   ├── Miyabi Integration Server (12 ツール, 635 行)
│   │   ├── miyabi__init, miyabi__install, miyabi__status
│   │   ├── miyabi__agent_run, miyabi__auto
│   │   ├── miyabi__todos, miyabi__config, miyabi__docs
│   │   └── miyabi__deploy, miyabi__test
│   ├── GitHub Enhanced Server (5 ツール, 300+ 行)
│   │   ├── create_issue_with_labels
│   │   ├── get_agent_tasks, update_issue_progress
│   │   └── create_pr_from_agent, get_pr_review_status
│   ├── Project Context Server (5 ツール, 300+ 行)
│   │   ├── get_project_structure, get_dependencies
│   │   ├── get_agent_config, analyze_codebase
│   │   └── get_recent_changes
│   ├── IDE Integration Server (3 ツール, 300+ 行)
│   │   └── get_diagnostics, execute_code, format_code
│   ├── Context Engineering Server
│   │   ├── list_ai_guides, search_ai_guides
│   │   ├── search_guides_with_gemini, analyze_guide
│   │   └── analyze_guide_url, compare_guides
│   ├── Image Generation Server (5 ツール, 400+ 行)
│   │   ├── gemini__generate_image, gemini__generate_images_batch
│   │   ├── gemini__generate_speech, gemini__generate_speeches_batch
│   │   └── gemini__check_api_key
│   └── Discord Integration Server (7 ツール, 400+ 行)
│       ├── discord_send_message, discord_announce_release
│       ├── discord_notify_github_event, discord_get_stats
│       ├── discord_create_event, discord_get_recent_messages
│       └── discord_add_reaction
│
└── バンドル MCP サーバー (172 ツール, 21 カテゴリ, v3.8.0)
    ├── Git Inspector (19): status, branch, log, blame, diff, tags
    ├── Tmux Monitor (10): session/window/pane 管理
    ├── Log Aggregator (7): sources, search, errors, tail, stats
    ├── Resource Monitor (10): CPU, memory, disk, load, processes
    ├── Network Inspector (15): interfaces, ports, DNS, ping, SSL
    ├── Process Inspector (14): list, search, tree, fd, kill
    ├── File Watcher (10): stats, changes, search, compare
    ├── Claude Code Monitor (8): config, MCP status, session, logs
    ├── GitHub Integration (21): issues, PRs, workflows, releases
    ├── Linux systemd (3): service status, start/stop, logs
    ├── Windows Event Log (2): query, filter
    ├── Docker (10): containers, images, build, run
    ├── Docker Compose (4): services, up/down, logs
    ├── Kubernetes (6): pods, services, deployments
    ├── Spec-Kit (9): spec 作成、検証、生成
    ├── MCP Tool Discovery (3): 動的ツール検索
    ├── Database (6): SQLite/PostgreSQL/MySQL
    ├── Time Tools (4): タイムゾーン変換
    ├── Calculator (3): 数学、単位変換、統計
    ├── Sequential Thinking (3): 構造化推論
    └── Generator (4): UUID、ランダム、ハッシュ
```

### 3.5 タスク管理システム

```
TaskManager パッケージ
├── タスク状態マシン（10 状態, 28 遷移ルール）
│   ├── draft → pending → analyzing → implementing → reviewing → deploying → done
│   ├── blocked ← 任意の中間状態
│   ├── failed → (retry) → pending
│   └── cancelled ← 任意の状態
├── ManagedTask インターフェース
│   ├── currentState, stateHistory
│   ├── githubIssueNumber, projectItemId
│   ├── decomposedFrom (親タスク参照)
│   ├── retryCount, executionWorktreePath
│   ├── syncVersion, pendingSyncChanges
│   └── startedAt, completedAt
├── LLM タスク分解 (LLMDecomposer)
│   ├── provider: 'anthropic', model, apiKey
│   ├── 出力: DecompositionResult
│   │   ├── tasks: ManagedTask[]
│   │   ├── dag: DAGResult (nodes, edges, levels, criticalPath, estimatedDuration)
│   │   └── warnings: CIRCULAR_DEPENDENCY, MISSING_DEPENDENCY 等
│   └── DAG 構築: Kahn's Algorithm トポロジカルソート
├── タスク実行 (TaskExecutor)
│   ├── registerAgent(executor)
│   ├── execute(task), executeParallel(tasks, concurrency)
│   ├── executeSequence(tasks)
│   └── cancel(taskId), getRunningTasks()
├── Worktree コーディネーション
│   ├── 分離 git worktree で並列実行
│   └── executeInWorktree(task), executeParallel(tasks, concurrency)
└── GitHub 同期
    ├── GitHubLabelSync: タスク状態 ↔ Issue ラベル
    ├── ProjectsV2Sync: タスク状態 ↔ Projects V2 フィールド
    └── BidirectionalSync
        ├── conflictStrategy: 'local-wins' | 'github-wins' | 'newest-wins' | 'ask'
        └── syncLabels, syncProjects, batchSize, validateTransitions
```

### 3.6 GitHub Projects V2 統合

```
GitHub Projects
├── GitHubProjectsClient
│   ├── プロジェクト情報取得: getProjectInfo(), getProjectItems()
│   ├── フィールド更新: updateFieldValue(), setSingleSelectFieldByName()
│   ├── メトリクス: calculateAgentMetrics(), generateWeeklyReport()
│   └── レート制限: getRateLimitInfo()
├── カスタムフィールド
│   ├── Agent (SINGLE_SELECT): CodeGen, Review, Deploy, Coordinator, TechLead
│   ├── Duration (NUMBER): 実行時間 (ms)
│   ├── Cost (NUMBER): API コスト (USD)
│   ├── Quality Score (NUMBER): 0-100
│   └── Sprint (ITERATION)
└── メトリクス
    ├── AgentMetrics: executionCount, avgDuration, avgCost, avgQualityScore, successRate
    └── WeeklyReport: totalIssues, completedIssues, agentMetrics, totalCost, completionRate
```

### 3.7 Web ダッシュボード

```
miyabi-web (Next.js 15 + React 18 + @xyflow/react)
├── App Router 構造
│   ├── / → /dashboard リダイレクト
│   ├── /api/workflows/ (REST: GET, POST)
│   ├── /api/workflows/[id]/ (GET, PUT, DELETE)
│   ├── /dashboard/workflows/ (一覧)
│   ├── /dashboard/workflows/create/ (新規作成)
│   └── /dashboard/workflows/[id]/ (編集)
├── ワークフローノードタイプ
│   ├── AgentNode: エージェントタイプ別カラーマッピング
│   │   └── coordinator=purple, codegen=blue, review=green, issue=yellow, pr=orange, deployment=red, test=cyan
│   ├── ConditionNode: 条件分岐（true/false 出力ハンドル）
│   └── IssueNode: GitHub Issue 参照
├── DAG 検証エンジン
│   ├── detectCycles(graph) - DFS White→Gray→Black 着色
│   ├── topologicalSort(nodes, edges) - Kahn's Algorithm
│   ├── findDisconnectedNodes(nodes, edges)
│   ├── validateEdges(nodes, edges)
│   └── wouldCreateCycle(nodes, edges, newEdge) - 事前検証
├── デザインシステム (Ive-style ミニマル)
│   └── オフホワイト背景、ニアブラック文字、ブルーアクセント
└── ストレージ: インメモリ (workflow-storage.ts)
```

### 3.8 コンテキストエンジニアリング

```
Context Engineering SDK
├── アーキテクチャ: TypeScript SDK + FastAPI(Python) + Google Gemini AI
│   ├── TypeScript SDK → HTTP → Context Engineering API (Port 9001)
│   └── Gemini API (Port 8888)
├── 核心概念
│   ├── Session: 関連作業のグルーピングコンテナ
│   ├── Context Window: トークンバジェット管理（4K, 8K 等）
│   ├── Context Element: 個別コンテンツ（system/user/data）
│   ├── Analysis: 品質スコアリング（clarity, relevance, token efficiency）
│   ├── Optimization: トークン 52% 削減 + 品質向上
│   └── Template: 変数付き再利用可能プロンプトテンプレート
├── 高レベル API (ContextEngineering クラス)
│   ├── analyze(content) → AnalysisResult
│   ├── optimize(request) → OptimizationResult
│   ├── autoOptimize(content)
│   ├── analyzeAndOptimize(content, threshold?)
│   ├── セッション管理: createSession(), listSessions()
│   ├── ウィンドウ管理: createWindow(), addElement(), analyzeWindow()
│   ├── テンプレート: createTemplate(), generateTemplate(), renderTemplate()
│   └── システム: getStats(), healthCheck()
├── パフォーマンス効果
│   ├── トークン使用量: -52%
│   ├── 品質スコア: +42%
│   ├── 応答時間: -44%
│   └── API コスト: -52%
└── バックエンド API
    ├── Session: POST/GET/DELETE /api/sessions
    ├── Context: POST/GET /api/contexts
    ├── Analysis: POST /api/analyze, /api/optimize, /api/auto-optimize
    ├── Templates: CRUD /api/templates
    └── WebSocket: /ws (リアルタイム更新)
```

### 3.9 ドキュメント生成

```
doc-generator (@agentic-os/doc-generator)
├── CodeAnalyzer (ts-morph AST パーサー)
│   ├── FunctionInfo: name, parameters, returnType, isAsync, isExported, decorators, sourceCode
│   ├── ClassInfo: name, extends, implements, properties, methods, isAbstract
│   ├── InterfaceInfo: name, extends, properties, methods
│   └── AnalysisResult: functions[], classes[], interfaces[], totalFiles
├── TemplateEngine (Handlebars)
│   ├── isNotEmpty(array), codeBlock(code, lang)
│   ├── formatParams(parameters)
│   ├── visibilityIcon: 🟢 public / 🔴 private / 🟡 protected
│   └── modifierBadges: static, async
├── CLI コマンド
│   ├── doc-gen analyze <source> --output --tsconfig --template --include-private --json
│   └── doc-gen init --output
└── 出力構造: README.md, functions.md, classes.md, interfaces.md
```

### 3.10 スキルシステム

```
スキル体系 (23 スキル)
├── コーディングエージェントスキル（7）
│   ├── Coordinator Agent: decompose, pipeline, coordinate
│   ├── Issue Agent: analyze, label, triage
│   ├── Code Reviewer: review, check PR, find bugs
│   ├── PR Agent: create PR, merge
│   ├── Deploy Agent: deploy, rollback
│   ├── Test Generator: write tests, improve coverage
│   └── Autonomous Coding Agent: Claude Code CLI 統合
├── プラットフォームスキル（3）
│   ├── Pipeline: 演算子ベースコマンド合成、プリセット (full-cycle, quick-deploy, quality-gate)
│   ├── Quality Gate: 100 点スコアリング、Auto-Retry Loop
│   └── GitHub OS: IDD ワークフロー全体管理
├── 開発スキル（5）
│   ├── Commit Helper: Conventional Commits
│   ├── Refactor Helper: コードスメル検出
│   ├── Doc Generator: JSDoc/TSDoc/README/CHANGELOG
│   ├── Skill Creator: カスタムスキル作成
│   └── Agent Skill Use: 3 層アーキテクチャ (MCP → Skills → Subagents)
│       └── Progressive Disclosure: Layer1(~500tok) → Layer2(~1,000tok) → Layer3(~5,000tok)
├── 外部統合スキル（2）
│   ├── CCG (AI Course Content Generator): Gemini API コース生成パイプライン
│   └── Teachable Course Creator: Chrome MCP ブラウザ自動化
└── GitNexus スキル（6）
    ├── CLI: analyze, status, clean, wiki
    ├── Guide: query, context, impact, detect_changes, rename, cypher
    ├── Exploring: プロジェクト構造理解
    ├── Impact Analysis: リスク評価 (LOW/MEDIUM/HIGH/CRITICAL)
    ├── Debugging: エラートレーシング
    └── Refactoring: セマンティックリネーム
```

### 3.11 CI/CD インフラストラクチャ

```
CI/CD 体系 (24 ワークフロー)
├── コアワークフロー
│   ├── ai-auto-label.yml: Issue opened → Claude AI 53 ラベル自動分類
│   ├── autonomous-agent.yml: エージェント実行（ラベル/コメント/手動トリガー）
│   ├── state-machine.yml: ラベルベース状態遷移管理
│   └── webhook-handler.yml: 中央イベントルーター
├── CI/CD ワークフロー
│   ├── integrated-system-ci.yml: 5 段階 CI (lint→typecheck→unit→e2e→build)
│   ├── cli-cross-platform.yml: 3OS × 2Node 版テスト（6 並行）
│   ├── docker-build.yml: マルチプラットフォーム (amd64/arm64)
│   ├── auto-release.yml: バージョンタグ → npm publish + GitHub Release
│   └── npm-publish.yml: npm 公開 + OIDC 署名
├── セキュリティワークフロー
│   ├── security-audit.yml: 毎日 + push/PR → 6 層スキャン
│   ├── codeql.yml: 毎週月曜 → 静的セキュリティ分析
│   └── gitleaks.yml: push/PR → シークレット検出
├── ユーティリティワークフロー
│   ├── commit-to-issue.yml: #auto コミット → Issue 自動作成
│   ├── label-sync.yml: labels.yml → GitHub 同期
│   ├── mcp-health-check.yml: 毎日 MCP ヘルスチェック
│   └── snapshot-test.yml: スナップショット一貫性検証
└── カスタム Action: agent-executor
    ├── 入力: agent, issue-number, timeout(30min), retry-attempts(3), escalate-on-failure
    └── 出力: status, message, duration-ms, artifacts-path, report-url
```

---

## Level 4: 実装詳細 (WITH WHAT)

### 4.1 共有ユーティリティ実装

```
@miyabi/shared-utils (外部依存なし)
├── retry.ts: withRetry<T>()
│   ├── maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10000
│   ├── backoffMultiplier: 2 (指数バックオフ)
│   └── retryableErrors: ECONNRESET, ETIMEDOUT, ENOTFOUND, rate limit
├── api-client.ts
│   ├── HTTP コネクションプーリング
│   │   ├── keepAlive: true, maxSockets: 50, maxFreeSockets: 10, timeout: 30000
│   │   └── 性能: 25-50% 改善、高並行時最大 10 倍
│   ├── LRU キャッシュ
│   │   ├── max: 500 エントリ, TTL: 5 分, updateAgeOnGet: true
│   │   └── getGitHubClient(token?) → Singleton
│   └── withGitHubCache<T>(key, fetcher) → キャッシュファースト
├── async-file-writer.ts (Singleton)
│   ├── FLUSH_INTERVAL_MS: 1000, MAX_BATCH_SIZE: 50
│   ├── write(), append(), flush(), forceFlush()
│   └── 性能: 同期比 96.34% 改善
└── system-optimizer.ts
    ├── ConcurrencyConfig: optimal, conservative, aggressive, recommended
    └── アルゴリズム: min(cpuCount-1, freeMemory/2GB, 8) × loadFactor
```

### 4.2 設計パターン一覧

```
採用パターン
├── Singleton: AsyncFileWriter, GitHubClient, AgentRegistry, SimpleCache
├── Factory: AgentFactory, register*Command 関数
├── Builder: AgentConfig, PipelineContext
├── Observer: Pipeline executor (EventEmitter)
├── Strategy: リトライ戦略、コマンド実行戦略
├── Composite: パイプラインコマンド合成
├── State Machine: タスクライフサイクル (10 状態, 28 遷移)
├── Decomposition: LLM ベースタスク分解 + DAG
├── Bidirectional Sync: ローカル ↔ GitHub 状態同期
├── Worktree Isolation: 並列タスク分離実行
├── Plugin/Agent: プラグ可能エージェント実行者
├── Configuration-Driven: 全サブシステム集中設定
└── Circuit Breaker: 経済ガバナンスサーキットブレーカー
```

### 4.3 Docker インフラ実装

```
コンテナ構成
├── Dockerfile (マルチステージ)
│   ├── base: node:20-alpine + git, openssh, ca-certificates
│   ├── deps: pnpm 9 + --frozen-lockfile --prod
│   ├── builder: 全依存関係 + ビルド
│   └── runtime: 非 root ユーザー (miyabi:UID 1001), 最小成果物
├── Docker Compose サービス
│   ├── miyabi-agent (デフォルト): CPU:2.0/0.5, RAM:2GB/512MB, ヘルスチェック 30 秒
│   ├── postgres:16-alpine (with-database プロファイル)
│   ├── redis:7-alpine (with-cache プロファイル)
│   └── context-api (context-engineering プロファイル): Ports 8888, 9001
└── ボリューム: config(RO), logs, output, agent-data
```

### 4.4 セキュリティ実装

```
セキュリティ体系
├── 6 層セキュリティスキャン
│   ├── 1. npm audit → 依存関係脆弱性
│   ├── 2. Gitleaks → シークレットスキャン
│   ├── 3. カスタムスキャナー (security-manager.ts)
│   ├── 4. CodeQL → 静的分析 (security-extended)
│   ├── 5. SBOM 生成 → サプライチェーン
│   └── 6. OpenSSF Scorecard → ベストプラクティス
├── トークン管理（優先度順）
│   ├── 1. gh CLI (推奨): gh auth token 自動ローテーション
│   ├── 2. 環境変数: CI/CD 向け GITHUB_TOKEN
│   ├── 3. .env ファイル: ローカル開発フォールバック
│   └── 4. OAuth Device Flow: インタラクティブ認証
├── 入力バリデーション (CWE-22 対策)
│   ├── validateProjectPath: 絶対パス、パストラバーサル防止
│   ├── validateGitHubOwner: 39 文字制限
│   ├── validateGitHubRepo: 100 文字制限
│   ├── validateGitHubToken: フォーマット検証 (ghp_, github_pat_, gho_)
│   ├── validateFilePath: ベースディレクトリ内制約
│   ├── validateFileSize: 10MB 制限
│   └── sanitizeTemplateVariable: 危険文字除去
├── MCP バンドルセキュリティ
│   ├── コマンドインジェクション防止: 特殊文字サニタイズ
│   ├── パストラバーサル保護: 解決パス検証
│   ├── シンボリックリンク攻撃防止: 実パス解決
│   ├── DOS 防止: query:1000, path:4096, hostname:253
│   └── PID 検証: 0 < pid < 4194304
├── 脆弱性対応 SLA: 48 時間以内
├── pnpm オーバーライド
│   ├── minimatch@<3.1.4 → 3.1.4 (DOS)
│   ├── flatted@<=3.4.1 → 3.4.2 (オブジェクトインジェクション)
│   └── glob@>=10.2.0<10.5.0 → 10.5.0 (パフォーマンス)
└── Dependabot 自動更新
```

### 4.5 経済ガバナンス

```
経済制約 (BUDGET.yml)
├── 月間予算: $500 USD
│   ├── Anthropic API: $400 (10M tokens/month)
│   ├── GitHub Actions: $0 (無料枠)
│   └── Firebase: $100
├── サーキットブレーカー
│   ├── Warning 閾値: 80% → アラート送信
│   ├── Emergency 閾値: 150% → ワークフロー自動停止
│   └── 停止対象: agent-runner, continuous-improvement, agent-onboarding
├── 復旧プロセス
│   ├── 1. Guardian 承認
│   ├── 2. 根本原因分析
│   └── 3. リソースクリーンアップ
└── 共通メトリクス (全エージェント)
    ├── cost_per_task: <$0.10
    ├── token_usage: <50K
    └── memory_usage: <512MB
```

### 4.6 監視・ダッシュボード

```
監視システム
├── WebSocket プロトコル (Port 3001)
│   ├── Server → Client: dashboard データ, alert 通知
│   └── Client → Server: request_dashboard, acknowledge_alert
├── AgentDashboard 構造
│   ├── realTimeMetrics
│   │   ├── activeAgents, queuedTasks
│   │   ├── avgExecutionTime, currentThroughput (tasks/minute)
│   │   └── ステータスアイコン: ⏳ pending、🔄 running、✅ completed、❌ failed
│   ├── historicalData
│   │   ├── dailyExecutions
│   │   ├── successRate (AgentType 別)
│   │   └── completionTimeDistribution: fast, medium, slow
│   └── alerts (DashboardAlert[])
├── アラート閾値
│   ├── 高エラー率: 10%
│   ├── 長時間タスク: 30 分
│   └── キューオーバーフロー: 50 タスク
├── 設定
│   ├── updateInterval: 1000ms
│   ├── websocketPort: 3001
│   ├── maxErrorLogs: 100
│   └── retentionDays: 7
└── ヘルスチェック
    ├── MCP サーバー: 毎日（障害時 Issue 自動作成）
    ├── Docker コンテナ: 30 秒間隔
    └── エージェント: コンプライアンステスト
```

### 4.7 テストアーキテクチャ

```
テスト体系
├── フレームワーク
│   ├── Vitest 3.2.4 + @vitest/coverage-v8 (Unit/Integration)
│   ├── Playwright 1.56.0 (E2E)
│   └── @testing-library/react 16.3.1 (Component)
├── テストカテゴリ
│   ├── Task Manager テスト
│   │   ├── state/task-state-machine.test.ts (212 行)
│   │   ├── decomposition/decomposition-validator.test.ts
│   │   ├── execution/task-executor.test.ts
│   │   └── sync/bidirectional-sync.test.ts, github-label-sync.test.ts
│   ├── ルートテスト (tests/)
│   │   ├── BaseAgent, CodeGenAgent, ReviewAgent, SecurityScanner, DAGManager
│   │   ├── coordinator, github-client, review-loop
│   │   └── webhook-router, worktree-manager
│   ├── 統合テスト (tests/integration/)
│   │   ├── github-os-integration, agent-verification
│   │   ├── system, plans-generation
│   │   └── MCP 統合テスト、パフォーマンステスト
│   ├── E2E テスト (tests/e2e/)
│   │   ├── miyabi-demo.spec.ts
│   │   └── dashboard-quick-check.spec.ts
│   └── パッケージ別テスト
│       ├── coding-agents: improvements, intelligent-agent, security-validator
│       ├── doc-generator: CodeAnalyzer, TemplateEngine
│       └── mcp-bundle: cache, security (4 ファイル), validation
├── 品質基準
│   ├── カバレッジ: 80%+ (statements, branches, functions, lines)
│   ├── ESLint: 0 エラー
│   ├── TypeScript strict モード
│   └── ReviewAgent スコア ≥80 必須
└── CI 実行
    ├── 5 段階 CI: lint → typecheck → unit → e2e → build
    ├── クロスプラットフォーム: 3OS × 2Node 版（6 並行）
    └── Vitest タイムアウト: 30 秒
```

### 4.8 フックシステム

```
自動化フック（6 フック）
├── auto-format.sh: ESLint/Prettier pre-commit
├── validate-typescript.sh: TypeScript 型チェック
├── log-commands.sh: LDD ログ記録
├── agent-event.sh: エージェントイベント発信
│   └── イベント: started, progress, completed, error
├── session-continue.sh: セッション永続化
└── webhook-fallback.js: Webhook フォールバック (Node.js)
```

### 4.9 スクリプトディレクトリ

```
scripts/ 構造
├── cicd/: webhook-router, cicd-integration, performance-optimizer
├── github/: ai-label-issue, github-project-api, knowledge-base-sync
├── operations/: agentic, parallel-executor, label-state-machine, workflow-orchestrator
├── security/: security-manager, security-report
├── reporting/: weekly-report, realtime-metrics, performance-report
└── setup/: github-token, github-project, parallel-checks
```

### 4.10 ナレッジガイド（13 ガイド）

```
ナレッジベース
├── 開発プラクティス
│   ├── typescript-development.md → TypeScript ベストプラクティス
│   ├── tdd-workflow.md → テスト駆動開発
│   ├── debugging.md → デバッグ戦略
│   ├── git-workflow.md → Git ワークフロー
│   ├── code-review.md → コードレビュー基準
│   └── documentation.md → ドキュメンテーション
├── インフラ
│   ├── mcp-server-development.md → MCP サーバー構築
│   ├── ci-cd.md → CI/CD パイプライン
│   ├── security-audit.md → セキュリティ監査
│   └── performance.md → パフォーマンス最適化
├── プロセス
│   └── issue-driven-development.md → IDD
└── ビジネス
    ├── product-planning.md → プロダクト計画
    └── market-research.md → 市場調査
```

### 4.11 Miyabi 定義システム (miyabi_def/)

```
定義システム (Jinja2 テンプレート)
├── 14 コアエンティティ
│   └── Issue, Task, Agent, PR, Label, QualityReport, Command, Escalation,
│       Deployment, LDDLog, DAG, Worktree, DiscordCommunity, SubIssue
├── 39 リレーション
│   └── カーディナリティ: N1(1:1), N2(1:N), N3(N:N)
├── 5 ワークフロー（38 ステージ）
│   ├── W1: Issue 作成・トリアージ
│   ├── W2: タスク分解
│   ├── W3: コード実装
│   ├── W4: コードレビュー
│   └── W5: デプロイメント
├── テンプレート
│   ├── base.yaml.j2, world_definition.yaml.j2, entities.yaml.j2
│   ├── relations.yaml.j2, labels.yaml.j2, workflows.yaml.j2
│   ├── agents.yaml.j2, skills.yaml.j2, universal_task_execution.yaml.j2
│   └── CLI テンプレート: CLAUDE.md, README.md, .env.example, 14 ワークフロー YAML
└── 生成コマンド
    ├── python generate.py → 全ファイル生成
    ├── python generate.py --list-templates
    └── python generate.py --intent <file> → インテント駆動生成
```

### 4.12 プラグインシステム

```
プラグイン (miyabi-operations)
├── 10 コマンド
│   ├── miyabi-init (setup)
│   ├── miyabi-status (monitoring)
│   ├── miyabi-auto (automation) → 優先度アルゴリズム
│   │   ├── 1. 緊急度-高/即時ラベル → 高緊急
│   │   ├── 2. security/vulnerability → セキュリティ
│   │   ├── 3. status:blocked → ブロック
│   │   ├── 4. 規模-小 → クイックウィン
│   │   └── 5. FIFO by creation date → 公平ローテーション
│   ├── miyabi-amembo (monitoring) → 軽量観察
│   ├── miyabi-watch (monitoring) → Webhook 監視
│   ├── miyabi-todos (automation)
│   ├── miyabi-agent (execution)
│   ├── miyabi-docs (documentation)
│   ├── miyabi-deploy (deployment)
│   └── miyabi-test (testing)
└── CLI スラッシュコマンド (10)
    └── /agent-run, /create-issue, /deploy, /generate-docs, /miyabi-auto,
        /miyabi-todos, /review, /security-scan, /test, /verify
```

### 4.13 分散クラスター実行

```
分散実行
├── 最大 5 台: MacBook + Windows + Mac mini ×3
├── ネットワーク: SSH / Tailscale
├── マシン間並列エージェント実行
└── 協調: GitHub Issue 状態による分散ワークフロー
```

### 4.14 メディア生成

```
メディアパイプライン
├── generate-image → 画像生成 (Gemini)
├── generate-speech → 音声生成 (TTS)
├── generate-video → 動画生成
└── generate-i2v → 画像 → 動画変換
```

---

## 横断的関心事 (Cross-Cutting Concerns)

### A. セキュリティ横断

```
全レイヤーセキュリティ
├── Level 1: ガバナンス → AGENTS.md 三法則、Guardian エスカレーション
├── Level 2: アーキテクチャ → GitHub Secrets、CODEOWNERS、トークン管理
├── Level 3: システム → 6 層セキュリティスキャン、入力バリデーション、MCP セキュリティ
└── Level 4: 実装 → CWE-22 対策、コマンドインジェクション防止、非 root Docker 実行
```

### B. 品質横断

```
全レイヤー品質保証
├── Level 1: 哲学 → 客観性の法則（データ駆動のみ）
├── Level 2: 設計 → ReviewAgent 品質ゲート（≥80 点）
├── Level 3: システム → ESLint(0 エラー)、Vitest(80%+ カバレッジ)、TypeScript strict
└── Level 4: 実装 → Auto-Retry Loop(最大 3 回)、5 段階 CI、クロスプラットフォームテスト
```

### C. 監視横断

```
全レイヤー監視
├── Level 1: ガバナンス → 経済サーキットブレーカー、Guardian 通知
├── Level 2: アーキテクチャ → GitHub Projects V2 メトリクス、WeeklyReport
├── Level 3: システム → WebSocket ダッシュボード、MCP ヘルスチェック
└── Level 4: 実装 → Docker ヘルスチェック(30s)、PerformanceMonitor、globalMetricsCollector
```

### D. ログ・追跡横断

```
全レイヤー追跡
├── Level 1: 哲学 → 追跡可能性の法則、LDD（Log-Driven Development）
├── Level 2: 設計 → GitHub Issue/PR による全履歴記録
├── Level 3: システム → .ai/logs/YYYY-MM-DD.md、traceLogger、LDDLog エンティティ
└── Level 4: 実装 → log-commands.sh フック、agent-event.sh、correlationId トレーシング
```

### E. コスト最適化横断

```
全レイヤーコスト管理
├── Level 1: ガバナンス → 月間 $500 予算、サーキットブレーカー
├── Level 2: 設計 → トークン使用制限 <50K/タスク、コスト <$0.10/タスク
├── Level 3: システム → Context Engineering (-52% トークン)、LRU キャッシュ
└── Level 4: 実装 → HTTP コネクションプーリング、非同期バッチ書込み
```

---

## データフロー図

### メインワークフロー: Issue → Production

```
[Human] Issue 作成
    ↓
[GitHub Webhook] → webhook-handler.yml
    ↓
[IssueAgent] Issue 分析 → 53 ラベル自動分類 (<15s)
    ↓
[CoordinatorAgent] DAG 構築 → タスク分解 (<30s)
    ↓
[TaskManager] タスク状態管理 → git worktree 作成
    ↓
[CodeGenAgent] ×N 並列 → コード生成 (<60s)
    ↓ (Context Engineering → プロンプト最適化)
[ReviewAgent] 品質スコアリング (0-100) → ≥80?
    ↓ No → Auto-Retry (最大 3 回) → エスカレーション
    ↓ Yes
[PRAgent] PR 作成 (Conventional Commits) (<30s)
    ↓
[GitHub Actions] CI パイプライン (lint→typecheck→unit→e2e→build)
    ↓
[Guardian] マージ承認
    ↓
[DeploymentAgent] Build→Test→Deploy→Health Check
    ↓
[GitHub Projects V2] メトリクス記録 (Duration, Cost, Quality Score)
    ↓
[ナレッジベース] 成功パターン蓄積
```

### 状態遷移フロー

```
[Issue Created] → pending
    ↓ (IssueAgent ラベル付与)
pending → analyzing
    ↓ (CoordinatorAgent タスク分解完了)
analyzing → implementing
    ↓ (CodeGenAgent コード生成完了)
implementing → reviewing
    ↓ (ReviewAgent ≥80 点)
reviewing → deploying (or → implementing リトライ)
    ↓ (DeploymentAgent デプロイ完了)
deploying → done

任意状態 → blocked (ブロッカー発生時)
任意状態 → failed (エラー発生時)
failed → pending (リトライ)
```

---

## パフォーマンス目標サマリー

| フェーズ | 目標時間 | 担当 |
|---|---|---|
| Issue 分析 | <15 秒 | IssueAgent |
| DAG 構築 | <30 秒 | CoordinatorAgent |
| コード生成 | <60 秒 | CodeGenAgent |
| レビュー | <90 秒 | ReviewAgent |
| PR 作成 | <30 秒 | PRAgent |
| テスト実行 | <180 秒 | TestAgent |
| デプロイ | <300 秒 | DeploymentAgent |
| **全体 Issue → PR** | **4-7 分** | 全エージェント協調 |
| **全体 Issue → Production** | **10-15 分** | 全パイプライン |

---

## リリース情報

| 項目 | 値 |
|---|---|
| 最新バージョン | v0.1.1 |
| バイナリ | macOS ARM64 (8.8MB) |
| 検証 | SHA256 チェックサム |
| npm スクリプト | 140+ |
| CLI コマンド | 30+ |
| MCP ツール | 180+ |
| GitHub Workflows | 24 |
| エージェント | 21 (7 Coding + 14 Business) |
| ラベル | 53 × 10 カテゴリ |
| スキル | 23 |
| ナレッジガイド | 13 |
