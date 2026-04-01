# Miyabi テクノロジースタック分類体系（Technology Stack Taxonomy）

本ドキュメントは、Miyabi プロジェクトで使用される全技術要素を7つの層に分類し、各技術のバージョン、用途、所属パッケージ、および他技術との接続関係を網羅的に整理したものである。

---

## 1. 言語・ランタイム層（Language & Runtime Layer）

プロジェクト全体の基盤となるプログラミング言語とランタイム環境。

### 1.1 TypeScript

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^5.8.3 |
| **モジュールシステム** | ESM (ECMAScript Modules) |
| **ターゲット** | ES2022 |
| **Strict モード** | 有効（全パッケージ共通） |
| **用途** | プロジェクト全体の主要開発言語。全11パッケージの実装言語 |
| **使用パッケージ** | 全パッケージ（cli, core, mcp-bundle, miyabi-agent-sdk, coding-agents, shared-utils, context-engineering, github-projects, task-manager, doc-generator, miyabi-web） |
| **品質基準** | ESLint 0エラー、最大行長120文字、循環的複雑度 <=15、最大ネスト深度4、最大関数パラメータ5 |

**接続関係**:
- `tsx` (^4.7.0) によるビルドなし実行（開発時）
- `tsc` によるコンパイル（本番ビルド）
- `ts-morph` によるAST解析（doc-generator）
- ESLint (^8.57.1) による静的解析
- Vitest による型安全テスト

### 1.2 Node.js

| 項目 | 詳細 |
|---|---|
| **最小バージョン** | v18+ |
| **Dockerベースイメージ** | node:20-alpine |
| **CI/CDテスト対象** | 2バージョン（cli-cross-platform.yml で6並行テスト） |
| **パッケージマネージャ** | pnpm 9 |
| **用途** | サーバーサイドランタイム、CLI実行環境、MCPサーバー実行 |
| **使用パッケージ** | 全パッケージ |

**接続関係**:
- pnpm workspace によるモノレポ管理（`pnpm-workspace.yaml`）
- `http.Agent` によるHTTPコネクションプーリング（shared-utils）
- `child_process` によるサブプロセス実行（エージェント、git操作）
- `os` モジュールによるシステムリソース検出（system-optimizer）

### 1.3 Python（オプション）

| 項目 | 詳細 |
|---|---|
| **用途** | Context Engineering APIバックエンド、Miyabi定義生成システム |
| **フレームワーク** | FastAPI + Uvicorn |
| **ポート** | 9001（Context Engineering API）、8888（Gemini API） |
| **テンプレートエンジン** | Jinja2（miyabi_def テンプレート生成） |
| **使用パッケージ** | context-engineering（バックエンド）、miyabi_def/（定義生成） |

**接続関係**:
- TypeScript SDK (`ContextEngineeringClient`) からHTTP経由で呼び出し
- Google Gemini API との統合（セマンティック検索、画像/TTS生成）
- Docker Compose `context-engineering` プロファイルでコンテナ化

---

## 2. フレームワーク・ライブラリ層（Framework & Library Layer）

各パッケージの機能を実現するフレームワークとライブラリ群。

### 2.1 CLI フレームワーク

#### Commander.js

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^11.1.0 |
| **用途** | CLIコマンドフレームワーク。30+コマンドの定義・解析・実行 |
| **使用パッケージ** | packages/cli (`miyabi`), packages/doc-generator (`doc-gen`) |
| **機能** | サブコマンド、グローバルオプション（--json, -y, -v, --debug）、ヘルプ自動生成 |

**接続関係**:
- Inquirer と組み合わせてインタラクティブモードを提供
- 各コマンドは register*Command 関数で Factory パターン登録
- パイプラインシステム（`|`, `&&`, `||`, `&` 演算子）の基盤

#### Inquirer

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^9.2.12 |
| **用途** | インタラクティブプロンプト（セットアップウィザード、対話的メニュー） |
| **使用パッケージ** | packages/cli |
| **機能** | プロジェクト初期化、設定ウィザード、認証フロー |

**接続関係**:
- Commander.js のコマンド内で呼び出し
- `miyabi setup`, `miyabi onboard`, `miyabi auth` コマンドで使用

### 2.2 CLI UI ライブラリ

| パッケージ | バージョン | 用途 | 使用パッケージ |
|---|---|---|---|
| `chalk` | ^5.3.0 | ターミナルカラー出力 | cli, core |
| `ora` | ^9.0.0 | スピナー（進捗表示） | cli, core |
| `figlet` | - | ASCII アートバナー | cli |
| `gradient-string` | - | グラデーションテキスト | cli |
| `cli-table3` | ^0.6.5 | テーブル表示 | cli, core |
| `boxen` | ^8.0.1 | ボックス描画 | cli, core |
| `log-symbols` | - | ログシンボル（checkmark, warning等） | cli |
| `terminal-link` | - | クリック可能リンク | cli |
| `cli-spinners` | - | スピナーアニメーション | cli |
| `ansi-escapes` | - | ターミナル制御 | cli |

### 2.3 Web フレームワーク

#### Next.js 15

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^15.5.14 |
| **ルーティング** | App Router |
| **用途** | ワークフローエディタ Web ダッシュボード |
| **使用パッケージ** | packages/miyabi-web (`@miyabi/web`) |
| **機能** | REST API (`/api/workflows/`)、SSR、ページルーティング |

**接続関係**:
- React 18 をUIライブラリとして使用
- @xyflow/react でフロー図表示
- Tailwind CSS でスタイリング
- インメモリワークフローストレージ（`workflow-storage.ts`）

#### React 18

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^18.3.1 |
| **用途** | UIコンポーネントライブラリ |
| **使用パッケージ** | packages/miyabi-web |
| **コンポーネント** | AgentNode, ConditionNode, IssueNode, useWorkflow hook |

**接続関係**:
- Next.js 15 の App Router 内で動作
- @xyflow/react によるノードベース可視化
- @testing-library/react によるコンポーネントテスト

#### @xyflow/react（React Flow）

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^12.3.6 |
| **用途** | DAGワークフローの視覚的エディタ。エージェントノード、条件分岐ノード、Issueノードの配置・接続 |
| **使用パッケージ** | packages/miyabi-web |
| **機能** | ドラッグ&ドロップ、ノード接続、サイクル検出（事前チェック） |

**接続関係**:
- React 18 のコンポーネントとして動作
- DAG検証エンジン（`dag-validator.ts`）と連携
- Kahn's Algorithm によるトポロジカルソート

#### Tailwind CSS

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^3.4.15 |
| **用途** | ユーティリティファーストCSS（Ive-styleミニマルデザイン） |
| **使用パッケージ** | packages/miyabi-web |
| **デザイントークン** | background: #fafafa, foreground: #171717, accent: #3b82f6 |

### 2.4 テストフレームワーク

#### Vitest

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^3.2.4 |
| **用途** | ユニットテスト、統合テスト |
| **使用パッケージ** | 全パッケージ |
| **カバレッジ** | @vitest/coverage-v8 (^3.2.4)、閾値80% |
| **タイムアウト** | 30秒 |
| **テストパターン** | AAA（Arrange-Act-Assert） |

**接続関係**:
- TypeScript との型安全テスト
- ReviewAgent の品質ゲート（80点以上）と連携
- GitHub Actions CI（`integrated-system-ci.yml`）で自動実行

**テスト対象ファイル**:
- ルート: BaseAgent, CodeGenAgent, ReviewAgent, SecurityScanner, DAGManager 等
- task-manager: state-machine, decomposition, executor, sync
- coding-agents: improvements, intelligent-agent, security-validator
- doc-generator: CodeAnalyzer, TemplateEngine
- mcp-bundle: cache, security, validation

#### Playwright

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^1.56.0 (`@playwright/test`) |
| **用途** | E2Eブラウザテスト、スクリーンショット、ビデオ録画 |
| **使用パッケージ** | tests/e2e/ |
| **テストファイル** | miyabi-demo.spec.ts, dashboard-quick-check.spec.ts |

**接続関係**:
- miyabi-web ダッシュボードのE2Eテスト
- GitHub Actions CI で自動実行
- CCG（Course Content Generator）での Teachable ブラウザ自動化

#### Testing Library

| 項目 | 詳細 |
|---|---|
| **バージョン** | @testing-library/react ^16.3.1 |
| **用途** | Reactコンポーネントテスト |
| **使用パッケージ** | packages/miyabi-web |

**接続関係**:
- Vitest と組み合わせて使用
- React 18 コンポーネントのDOM操作テスト

### 2.5 API クライアント

#### Octokit（REST）

| 項目 | 詳細 |
|---|---|
| **バージョン** | @octokit/rest ^21.1.1 |
| **用途** | GitHub REST API 統合（Issue, PR, Repository, Labels, Workflows） |
| **使用パッケージ** | cli, core, task-manager, github-projects, coding-agents |
| **機能** | Issue CRUD、PR作成/マージ、ラベル管理、ワークフロートリガー |

**接続関係**:
- shared-utils の `getGitHubClient()` でSingletonインスタンス管理
- LRUキャッシュ（500エントリ、5分TTL）によるレート制限対策
- HTTPコネクションプーリング（maxSockets:50）
- 認証: `gh auth token` / `GITHUB_TOKEN` / OAuth Device Flow

#### Octokit（GraphQL）

| 項目 | 詳細 |
|---|---|
| **バージョン** | @octokit/graphql ^8.2.1 |
| **用途** | GitHub GraphQL API（Projects V2 操作、複雑なクエリ） |
| **使用パッケージ** | cli, core, task-manager, github-projects |
| **機能** | Projects V2カスタムフィールド更新、メトリクス計算、レート制限情報取得 |

**接続関係**:
- REST API と同じ認証トークンを共有
- Projects V2 の5カスタムフィールド（Agent, Duration, Cost, Quality Score, Sprint）操作
- 双方向同期（BidirectionalSync）でローカル ↔ GitHub状態同期

#### Anthropic SDK

| 項目 | 詳細 |
|---|---|
| **バージョン** | @anthropic-ai/sdk ^0.71.2 |
| **用途** | Claude API統合（コード生成、レビュー、分析、タスク分解） |
| **使用パッケージ** | core, coding-agents, task-manager |
| **モデル** | claude-sonnet-4-20250514（デフォルト） |
| **Max Tokens** | 8,192 |

**接続関係**:
- BusinessBaseAgent.callClaude() で抽象化
- CodeGenAgent によるコード生成（<60秒目標）
- ReviewAgent による品質スコアリング（100点満点）
- LLMDecomposer によるタスク分解
- 月額予算: $400 / 10M tokens

### 2.6 テンプレートエンジン

#### Handlebars

| 項目 | 詳細 |
|---|---|
| **用途** | TypeScriptドキュメントのMarkdown生成 |
| **使用パッケージ** | packages/doc-generator |
| **カスタムヘルパー** | isNotEmpty, codeBlock, formatParams, visibilityIcon, modifierBadges, formatDate |

**接続関係**:
- ts-morph による AST 解析結果をテンプレートに注入
- 出力: README.md, functions.md, classes.md, interfaces.md

#### Jinja2

| 項目 | 詳細 |
|---|---|
| **用途** | Miyabi定義テンプレート生成（YAML） |
| **使用パッケージ** | miyabi_def/（Python） |
| **テンプレート** | 9ファイル（base, world_definition, entities, relations, labels, workflows, agents, skills, universal_task_execution） |

**接続関係**:
- Python `generate.py` スクリプトで実行
- 14エンティティ、39リレーション、57ラベル、21エージェントの定義生成

### 2.7 AST 解析

#### ts-morph

| 項目 | 詳細 |
|---|---|
| **用途** | TypeScript AST（抽象構文木）解析。関数、クラス、インターフェースの抽出 |
| **使用パッケージ** | packages/doc-generator |
| **抽出情報** | FunctionInfo, ClassInfo, InterfaceInfo（パラメータ、戻り値型、デコレータ、ソースコード、行番号） |

**接続関係**:
- Handlebars テンプレートに解析結果を渡してMarkdown生成
- tsconfig.json を読み込んでプロジェクト構造を理解

### 2.8 ユーティリティライブラリ

| パッケージ | バージョン | 用途 | 使用パッケージ |
|---|---|---|---|
| `lru-cache` | - | LRUキャッシュ（GitHub API応答、AgentRegistry） | shared-utils, coding-agents |
| `p-retry` | - | リトライロジック（指数バックオフ） | shared-utils |
| `dotenv` | ^16.6.1 | .envファイル読み込み | cli |
| `concurrently` | - | 並列プロセス実行 | ルートスクリプト |
| `yaml` | ^2.3.4 | YAML解析（設定ファイル） | cli |
| `open` | ^10.0.3 | ブラウザURLオープン（OAuth） | cli |
| `uuid` | - | UUID v4生成（メッセージID、タスクID） | task-manager, coding-agents |

### 2.9 Agent Skill Bus

| 項目 | 詳細 |
|---|---|
| **バージョン** | agent-skill-bus ^1.2.0 |
| **用途** | 110+ビルトインスキルのキュー管理 |
| **使用パッケージ** | packages/cli |
| **CLIコマンド** | `miyabi bus`（11サブコマンド）、`miyabi skills` |

**接続関係**:
- 3層アーキテクチャ: MCP（高コンテキスト） > Skills（低コンテキスト） > Subagents（独立ウィンドウ）
- Progressive Disclosure: Layer 1 (~500トークン) → Layer 2 (~1,000トークン) → Layer 3 (~5,000トークン)

---

## 3. AI・機械学習層（AI & Machine Learning Layer）

自律的コード生成・分析を実現するAIモデルとプロトコル。

### 3.1 Claude Sonnet 4（Anthropic）

| 項目 | 詳細 |
|---|---|
| **モデルID** | claude-sonnet-4-20250514 |
| **SDK** | @anthropic-ai/sdk ^0.71.2 |
| **Max Tokens** | 8,192 |
| **月額予算** | $400（10M tokens/month） |
| **用途** | コード生成、コードレビュー、Issue分析、タスク分解、53ラベル自動分類 |
| **使用パッケージ** | core (BusinessBaseAgent), coding-agents (CodeGenAgent, ReviewAgent), task-manager (LLMDecomposer) |

**エージェント別利用パターン**:

| エージェント | 利用目的 | 性能目標 |
|---|---|---|
| CodeGenAgent（つくるん） | TypeScriptコード生成、テスト生成、JSDoc生成 | <60秒、品質>80/100 |
| ReviewAgent（めだまん） | 品質スコアリング（100点満点）、Auto-Loop | <90秒、検出率>90% |
| IssueAgent（みつけるん） | Issue分析、53ラベル自動分類 | <15秒、精度>90% |
| CoordinatorAgent（しきるん） | タスク分解、DAG構築 | <30秒、精度>95% |
| LLMDecomposer | タスク分解、DAG生成 | 警告コード8種対応 |

**接続関係**:
- BusinessBaseAgent.callClaude() で統一API
- サーキットブレーカー: 月額$500超で自動停止
- GitHub Actions `ai-auto-label.yml` でワークフロー統合

### 3.2 Google Gemini

| 項目 | 詳細 |
|---|---|
| **モデル** | gemini-3-flash-preview（Thinking付き）、gemini-2.5-flash（フォールバック） |
| **用途** | コンテキストエンジニアリング、画像生成、TTS（Text-to-Speech）生成 |
| **使用パッケージ** | context-engineering, MCP gemini-image-generation サーバー |
| **ポート** | 8888（Gemini API サービス） |
| **シークレット** | GEMINI_API_KEY |

**MCPツール**:
- `gemini__generate_image` - 単一画像生成
- `gemini__generate_images_batch` - バッチ画像生成
- `gemini__generate_speech` - TTS生成
- `gemini__generate_speeches_batch` - バッチTTS
- `search_guides_with_gemini` - セマンティック検索

**接続関係**:
- Context Engineering API（FastAPI/Python）経由で呼び出し
- CCG（AI Course Content Generator）でコース生成パイプライン統合
- Docker Compose `context-engineering` プロファイルでデプロイ

### 3.3 MCP（Model Context Protocol）

| 項目 | 詳細 |
|---|---|
| **SDKバージョン** | @modelcontextprotocol/sdk ^1.20.0 |
| **サーバー数** | 7 MCPサーバー + 1バンドルサーバー |
| **総ツール数** | 180+（バンドル172 + カスタム30+） |
| **通信プロトコル** | stdio |
| **タイムアウト** | 120秒（全サーバー共通） |
| **使用パッケージ** | packages/mcp-bundle (`miyabi-mcp-bundle` v3.8.0) |

**7 MCPサーバー構成**:

| サーバー | ツール数 | 用途 |
|---|---|---|
| ide-integration | 3 | VS Code診断、Jupyter実行、Prettier/ESLintフォーマット |
| github-enhanced | 5 | Issue/PR管理、自動ラベリング、エージェント生成PR |
| project-context | 5 | プロジェクト構造、依存関係、コードベース分析 |
| filesystem | - | ワークスペースファイルアクセス |
| context-engineering | 6 | AIコンテキスト分析、セマンティック検索 |
| miyabi | 12 | CLI統合（init, status, agent_run, auto, todos, config, docs, deploy, test） |
| gemini-image-generation | 5 | Gemini 2.5 Flash画像/TTS生成 |

**バンドルサーバー（172ツール、21カテゴリ）**:

| カテゴリ | ツール数 | 主要機能 |
|---|---|---|
| Git Inspector | 19 | status, branch, log, blame, diff, tags |
| Tmux Monitor | 10 | session/window/pane管理 |
| Log Aggregator | 7 | search, errors, tail, stats |
| Resource Monitor | 10 | CPU, memory, disk, processes |
| Network Inspector | 15 | ports, DNS, ping, SSL |
| Process Inspector | 14 | list, search, tree, kill |
| File Watcher | 10 | stats, changes, search, compare |
| Claude Code Monitor | 8 | config, MCP status, session |
| GitHub Integration | 21 | issues, PRs, workflows, releases |
| Docker | 10 | containers, images, build, run |
| Docker Compose | 4 | services, up/down, logs |
| Kubernetes | 6 | pods, services, deployments |
| Spec-Kit | 9 | spec作成、検証、生成 |
| Database | 6 | SQLite/PostgreSQL/MySQL |
| Sequential Thinking | 3 | 構造化推論 |
| その他 | 20 | systemd, Windows Event, Time, Calculator, Generator, MCP Discovery |

**接続関係**:
- Claude Desktop / Claude Code から stdio 経由で接続
- SimpleCache（TTL 5秒）によるツール応答キャッシュ
- GitHub Actions `mcp-health-check.yml` で毎日ヘルスチェック

### 3.4 OpenAI / Codex（補助）

| 項目 | 詳細 |
|---|---|
| **モデル** | gpt-5.4, gpt-5.4-mini |
| **用途** | .codex エージェント設定（architect, default, explorer, reviewer, worker） |
| **設定形式** | TOML |

**接続関係**:
- Claude Sonnet 4 が主要AIだが、Codexエージェント設定として補助的に定義

---

## 4. インフラ・DevOps層（Infrastructure & DevOps Layer）

ビルド、デプロイ、CI/CD、コンテナ化を担う基盤技術。

### 4.1 Docker

| 項目 | 詳細 |
|---|---|
| **Dockerfileステージ** | 4段階マルチステージビルド |
| **ベースイメージ** | node:20-alpine |
| **実行ユーザー** | miyabi (UID 1001)、非root実行 |
| **リソース制限** | CPU: 2.0/0.5、RAM: 2GB/512MB |
| **ヘルスチェック** | 30秒間隔 |

**マルチステージビルド**:

| ステージ | ベース | 内容 |
|---|---|---|
| base | node:20-alpine | git, openssh-client, ca-certificates |
| deps | base | pnpm 9, `--frozen-lockfile --prod`（本番依存のみ） |
| builder | base | 全依存関係 + TypeScriptビルド（dashboard-server, github-projects除外） |
| runtime | base | 非rootユーザー、最小ビルド成果物コピー |

**接続関係**:
- Docker Compose でマルチサービス構成
- GitHub Actions `docker-build.yml` でマルチプラットフォーム（amd64/arm64）ビルド
- MCPバンドルの Docker カテゴリ（10ツール）で管理

### 4.2 Docker Compose

| サービス | プロファイル | イメージ | ポート | 用途 |
|---|---|---|---|---|
| miyabi-agent | デフォルト | miyabi-agent:latest | - | メインエージェント実行 |
| postgres | `with-database` | postgres:16-alpine | 5432 | 状態永続化 |
| redis | `with-cache` | redis:7-alpine | 6379 | 座標・キャッシュ |
| context-api | `context-engineering` | カスタム | 8888, 9001 | コンテキスト最適化API |

**ボリューム**: config(RO), logs, output, agent-data

### 4.3 GitHub Actions

| 項目 | 詳細 |
|---|---|
| **ワークフロー数** | 24 |
| **コスト** | 無料枠 |

**ワークフロー分類**:

#### コア自律ワークフロー（4）

| ワークフロー | トリガー | 用途 |
|---|---|---|
| `ai-auto-label.yml` | Issue opened | Claude AIによる53ラベル自動分類 |
| `autonomous-agent.yml` | Issue labeled/commented, manual | エージェント自律実行 |
| `state-machine.yml` | Issue/PR lifecycle | ラベルベース状態遷移管理 |
| `webhook-handler.yml` | 全GitHubイベント | 中央イベントルーター |

#### CI/CDワークフロー（5）

| ワークフロー | 用途 |
|---|---|
| `integrated-system-ci.yml` | 5段階CI: lint → typecheck → unit → e2e → build |
| `cli-cross-platform.yml` | 3OS x 2Node版テスト（6並行） |
| `docker-build.yml` | マルチプラットフォームDocker（amd64/arm64） |
| `auto-release.yml` | バージョンタグ → npm publish + GitHub Release |
| `npm-publish.yml` | npm公開 + OIDC署名 + provenance |

#### セキュリティワークフロー（3）

| ワークフロー | 頻度 | 内容 |
|---|---|---|
| `security-audit.yml` | 毎日+push/PR | 6層セキュリティスキャン |
| `codeql.yml` | 毎週月曜 | 静的セキュリティ分析（security-extended） |
| `gitleaks.yml` | push/PR | シークレット検出 |

#### その他（12）

| ワークフロー | 用途 |
|---|---|
| `commit-to-issue.yml` | `#auto`タグ付きコミット → Issue自動作成 |
| `label-sync.yml` | labels.yml → GitHub同期 |
| `mcp-health-check.yml` | MCPサーバー毎日ヘルスチェック |
| `snapshot-test.yml` | スナップショットテスト一貫性検証 |

**カスタムAction**:
- `actions/agent-executor/action.yml`: 10入力パラメータ、5出力、タイムアウト30分、リトライ3回

**接続関係**:
- GitHub Issues/Labels とステートマシン連携
- Docker ビルドとnpm publish の自動化
- セキュリティスキャンの自動化
- サーキットブレーカー: 予算超過時にワークフロー自動停止

### 4.4 npm（パッケージ管理・公開）

| 項目 | 詳細 |
|---|---|
| **パッケージマネージャ** | pnpm 9 |
| **公開パッケージ** | miyabi (cli), miyabi-mcp-bundle, miyabi-agent-sdk |
| **公開方法** | OIDC署名 + provenance |
| **シークレット** | NPM_TOKEN（45日ローテーション） |
| **セキュリティ** | `npm audit`, pnpmオーバーライド（minimatch, flatted, glob脆弱性修正） |

**pnpmオーバーライド**:
- minimatch <3.1.4 → 3.1.4（DOS脆弱性）
- flatted <=3.4.1 → 3.4.2（オブジェクトインジェクション）
- glob >=10.2.0 <10.5.0 → 10.5.0（パフォーマンス）

### 4.5 ESLint

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^8.57.1 |
| **用途** | コード品質・スタイル強制 |
| **使用パッケージ** | 全パッケージ |

**ルール**:
- 非同期/await型安全（floating promises禁止）
- 命名規則（camelCase/PascalCase）
- 最大行長: 120文字
- 最大関数行数: 150
- 循環的複雑度: <=15
- 最大ネスト深度: 4
- 最大関数パラメータ: 5

**接続関係**:
- pre-commit フック（`auto-format.sh`）
- GitHub Actions CI で自動実行
- IDE Integration MCPサーバーでリアルタイム診断

### 4.6 tsx

| 項目 | 詳細 |
|---|---|
| **バージョン** | ^4.7.0 |
| **用途** | ビルドなしTypeScript実行（開発時） |
| **使用例** | `tsx scripts/operations/agentic.ts`（`npm start`） |

### 4.7 分散クラスター

| 項目 | 詳細 |
|---|---|
| **最大マシン数** | 5台（MacBook + Windows + Mac mini x3） |
| **ネットワーク** | SSH / Tailscale |
| **用途** | マシン間並列エージェント実行 |
| **協調方式** | GitHub Issue状態による分散ワークフロー |

---

## 5. データ・永続化層（Data & Persistence Layer）

状態管理、キャッシュ、データ永続化を担う技術群。

### 5.1 PostgreSQL（オプション）

| 項目 | 詳細 |
|---|---|
| **バージョン** | 16-alpine |
| **プロファイル** | `with-database` |
| **用途** | エージェント状態永続化（オプション） |
| **ポート** | 5432 |

**接続関係**:
- Docker Compose でコンテナとしてデプロイ
- MCPバンドルの Database カテゴリ（6ツール）で操作可能
- 現状はオプション。デフォルトはインメモリ + GitHub

### 5.2 Redis（オプション）

| 項目 | 詳細 |
|---|---|
| **バージョン** | 7-alpine |
| **プロファイル** | `with-cache` |
| **用途** | 座標データキャッシュ（オプション） |
| **ポート** | 6379 |

**接続関係**:
- Docker Compose でコンテナとしてデプロイ
- 現状はオプション。デフォルトは LRUキャッシュ

### 5.3 インメモリストレージ

#### LRU Cache

| 項目 | 詳細 |
|---|---|
| **パッケージ** | lru-cache |
| **GitHub API キャッシュ** | 500エントリ、5分TTL、アクセス時寿命更新 |
| **AgentRegistry キャッシュ** | 100エントリ、15分TTL |
| **MCPバンドル SimpleCache** | TTL 5秒 |
| **使用パッケージ** | shared-utils, coding-agents, mcp-bundle |

**接続関係**:
- `withGitHubCache<T>(key, fetcher)` でキャッシュファースト取得
- GitHub API レート制限消費の削減

#### ワークフローストレージ

| 項目 | 詳細 |
|---|---|
| **実装** | `workflow-storage.ts`（インメモリ Map） |
| **用途** | ワークフロー CRUD（miyabi-web） |
| **使用パッケージ** | packages/miyabi-web |

**接続関係**:
- Next.js API Routes (`/api/workflows/`) から呼び出し
- 将来的に PostgreSQL に移行可能

### 5.4 GitHub（プライマリデータ層）

Miyabi の「Agentic OS」思想において、GitHub 自体がプライマリデータストアとして機能する。

| GitHub機能 | データ層としての役割 | 詳細 |
|---|---|---|
| **Issues** | タスクキュー | 各Issueがエージェントワークフローをトリガー |
| **Labels** | ステートマシン状態 | 53ラベル x 10カテゴリ（state, agent, priority, type, severity, phase, special, trigger, quality, community） |
| **Projects V2** | リレーショナルデータ | 5カスタムフィールド（Agent, Duration, Cost, Quality Score, Sprint） |
| **Secrets** | セキュアボールト | APIキー、認証情報の暗号化管理 |
| **CODEOWNERS** | アクセス制御 | コード所有権と必須レビュー |
| **Discussions** | メッセージキュー | 非同期コミュニケーション |
| **Pages** | ダッシュボード | 静的コンテンツ配信 |

**接続関係**:
- BidirectionalSync によるローカル ↔ GitHub 双方向同期
- conflictStrategy: 'local-wins' | 'github-wins' | 'newest-wins' | 'ask'
- GitHubLabelSync: タスク状態 ↔ ラベル同期
- ProjectsV2Sync: タスク状態 ↔ カスタムフィールド同期

### 5.5 ファイルシステム

| 用途 | パス | 詳細 |
|---|---|---|
| ログ | `.ai/logs/YYYY-MM-DD.md` | LDD（Log-Driven Development）ログ |
| 認証情報 | `~/.miyabi/credentials.json` | パーミッション 0o600 |
| 設定ファイル | `.miyabi.yml` / `.miyabirc` / `.miyabi.yaml` | プロジェクト設定 |
| エージェント出力 | Docker volumes (output, agent-data) | 生成物保存 |

---

## 6. 通信・プロトコル層（Communication & Protocol Layer）

サービス間通信、リアルタイム更新、イベント処理を担うプロトコル群。

### 6.1 HTTP/HTTPS

| 項目 | 詳細 |
|---|---|
| **用途** | GitHub API、Anthropic API、Gemini API、Context Engineering API |
| **コネクションプーリング** | `http.Agent` (keepAlive:true, maxSockets:50, maxFreeSockets:10, timeout:30000) |
| **性能向上** | 通常25-50%、高並行時最大10倍 |
| **使用パッケージ** | shared-utils (`api-client.ts`) |

**接続関係**:
- Octokit（REST/GraphQL）が内部で使用
- Anthropic SDK が内部で使用
- Context Engineering Client が FastAPI バックエンドに接続

### 6.2 WebSocket

| 項目 | 詳細 |
|---|---|
| **用途** | ダッシュボードリアルタイム更新、Context Engineering APIリアルタイム更新 |
| **ポート** | 3001（ダッシュボード） |
| **更新間隔** | 1秒 |
| **保持期間** | 7日 |
| **使用パッケージ** | coding-agents（監視システム）、context-engineering |

**プロトコル**:

```
Server → Client:
  { "type": "dashboard", "data": { AgentDashboard }, "timestamp": "..." }
  { "type": "alert", "data": { DashboardAlert }, "timestamp": "..." }

Client → Server:
  { "type": "request_dashboard" }
  { "type": "acknowledge_alert", "alertId": "..." }
```

**アラート閾値**:
- 高エラー率: 10%
- 長時間タスク: 30分
- キューオーバーフロー: 50タスク

### 6.3 stdio（標準入出力）

| 項目 | 詳細 |
|---|---|
| **用途** | MCP サーバー通信プロトコル |
| **使用パッケージ** | mcp-bundle、全MCPサーバー |
| **タイムアウト** | 120秒 |

**接続関係**:
- Claude Desktop / Claude Code が MCPサーバーを stdio 経由で起動・通信
- 全7 MCPサーバーが stdio プロトコルで動作

### 6.4 GitHub Webhooks

| 項目 | 詳細 |
|---|---|
| **用途** | GitHubイベントのリアルタイム通知（Issue作成、ラベル変更、PR操作） |
| **ハンドラー** | `webhook-handler.yml`（中央イベントルーター） |
| **テスト** | `webhook:test:issue/pr/push/comment` スクリプト |
| **フォールバック** | `webhook-fallback.js`（Node.jsフック） |

**接続関係**:
- Issue作成 → IssueAgent 自動起動
- ラベル変更 → ステートマシン状態遷移
- PR操作 → ReviewAgent / DeploymentAgent トリガー

### 6.5 エージェント間メッセージングプロトコル

| 項目 | 詳細 |
|---|---|
| **メッセージID** | UUID v4 |
| **タイムスタンプ** | ISO 8601 |
| **優先度** | 0（CRITICAL）- 3（LOW） |
| **TTL** | メッセージ毎に設定可能 |

**メッセージタイプ**:
- `TASK_ASSIGNMENT` - Coordinator → Specialist
- `STATUS_UPDATE` - Specialist → Coordinator
- `ESCALATION` - Specialist → Coordinator
- `RESULT_REPORT` - Specialist → Coordinator
- `ERROR_REPORT` - Any → Coordinator
- `HEARTBEAT` - ヘルスチェック
- `CAPABILITY_QUERY/RESPONSE` - 能力広告

**接続関係**:
- MessageBus によるエージェント間通信
- 将来: WebSocket/gRPC による分散実行対応計画

### 6.6 Discord Integration

| 項目 | 詳細 |
|---|---|
| **MCPツール数** | 7 |
| **用途** | リリース告知、GitHubイベント通知、コミュニティ管理 |
| **機能** | メッセージ送信（リッチEmbed）、イベント作成、リアクション |

### 6.7 X (Twitter) Integration

| 項目 | 詳細 |
|---|---|
| **シークレット** | X_BEARER_TOKEN |
| **用途** | リリース通知（`miyabi release`コマンド） |

---

## 7. セキュリティ層（Security Layer）

コード品質、脆弱性検出、アクセス制御を担うセキュリティ技術群。

### 7.1 静的セキュリティ分析

#### Gitleaks

| 項目 | 詳細 |
|---|---|
| **用途** | シークレット検出（ハードコードされた APIキー、パスワード、トークン） |
| **トリガー** | push/PR（`gitleaks.yml`） |
| **6層スキャンの位置** | 第2層 |

#### CodeQL

| 項目 | 詳細 |
|---|---|
| **用途** | 静的セキュリティ分析（security-extended クエリスイート） |
| **頻度** | 毎週月曜日 |
| **6層スキャンの位置** | 第4層 |
| **対象言語** | TypeScript/JavaScript |

#### SBOM（Software Bill of Materials）

| 項目 | 詳細 |
|---|---|
| **用途** | サプライチェーンセキュリティ（依存関係の完全リスト化） |
| **6層スキャンの位置** | 第5層 |

#### OpenSSF Scorecard

| 項目 | 詳細 |
|---|---|
| **用途** | オープンソースセキュリティベストプラクティス評価 |
| **6層スキャンの位置** | 第6層 |

#### カスタムセキュリティスキャナー

| 項目 | 詳細 |
|---|---|
| **実装** | `scripts/security/security-manager.ts` |
| **6層スキャンの位置** | 第3層 |

### 7.2 6層セキュリティスキャン（統合）

```
第1層: npm audit           → 依存関係脆弱性検出
第2層: Gitleaks            → シークレットスキャン
第3層: security-manager.ts → カスタムセキュリティルール
第4層: CodeQL              → 静的分析（security-extended）
第5層: SBOM生成            → サプライチェーン透明性
第6層: OpenSSF Scorecard   → ベストプラクティス評価
```

**実行**: `security-audit.yml`（毎日 + push/PR時）

### 7.3 入力バリデーション（CWE-22対策）

| バリデーション関数 | 用途 | 詳細 |
|---|---|---|
| `validateProjectPath` | 絶対パス検証 | パストラバーサル防止 |
| `validateGitHubOwner` | オーナー名検証 | 39文字制限、英数字+ハイフン |
| `validateGitHubRepo` | リポジトリ名検証 | 100文字制限 |
| `validateGitHubToken` | トークン形式検証 | ghp_, github_pat_, gho_ プレフィックス |
| `validateFilePath` | ファイルパス検証 | ベースディレクトリ内制約 |
| `validateFileSize` | ファイルサイズ検証 | 10MB制限 |
| `sanitizeTemplateVariable` | テンプレート変数 | 危険文字除去 |

**使用パッケージ**: packages/cli

### 7.4 MCPバンドルセキュリティ

| 対策 | 詳細 |
|---|---|
| コマンドインジェクション防止 | 特殊文字サニタイズ |
| パストラバーサル保護 | 解決パス検証 |
| シンボリックリンク攻撃防止 | 実パス解決 |
| DOS防止 | 入力長制限（query:1000, path:4096, hostname:253） |
| PID検証 | 整数範囲チェック（0 < pid < 4194304） |

### 7.5 認証・認可

#### GitHub OAuth Device Flow

| 項目 | 詳細 |
|---|---|
| **フロー** | デバイスコード要求 → user_code表示 → ブラウザ認証 → トークンポーリング → スコープ検証 |
| **CLIENT_ID** | Ov23liiMr5kSJLGJFNyn |
| **スコープ** | repo, workflow |
| **認証情報保存** | `~/.miyabi/credentials.json`（パーミッション 0o600） |

#### トークン管理（優先度順）

| 優先度 | 方式 | 用途 |
|---|---|---|
| 1 | `gh auth token` | 推奨。自動ローテーション |
| 2 | 環境変数 `GITHUB_TOKEN` | CI/CD向け |
| 3 | `.env`ファイル | ローカル開発フォールバック |
| 4 | OAuth Device Flow | インタラクティブ認証 |

#### シークレット管理

| シークレット | 用途 | ローテーション |
|---|---|---|
| GITHUB_TOKEN | GitHub API | ワークフロー毎自動 |
| ANTHROPIC_API_KEY | Claude API | 手動 |
| NPM_TOKEN | npm公開 | 手動（45日） |
| X_BEARER_TOKEN | Twitter/X | 手動 |
| GEMINI_API_KEY | Google Gemini | 手動 |

### 7.6 脆弱性対応ポリシー

| 項目 | 詳細 |
|---|---|
| **対応時間** | 48時間以内 |
| **監査コマンド** | `npm run security:audit` |
| **スキャンコマンド** | `npm run security:scan` |
| **自動更新** | GitHub Dependabot |
| **検証** | `npm run verify:all`（lint + typecheck + test + security:scan） |

---

## 技術間接続マップ（Cross-Layer Connection Map）

以下に、層をまたぐ主要な技術接続を示す。

### フロー1: Issue → Production（10-15分）

```
[通信層] GitHub Webhooks
    → [インフラ層] GitHub Actions (autonomous-agent.yml)
        → [AI層] Claude Sonnet 4 (IssueAgent: 53ラベル分類)
            → [AI層] Claude Sonnet 4 (CoordinatorAgent: DAG構築)
                → [AI層] Claude Sonnet 4 (CodeGenAgent: コード生成)
                    → [フレームワーク層] Vitest (TestAgent: テスト実行)
                        → [AI層] Claude Sonnet 4 (ReviewAgent: 品質スコア)
                            → [通信層] Octokit REST/GraphQL (PRAgent: PR作成)
                                → [インフラ層] GitHub Actions (DeploymentAgent)
                                    → [データ層] GitHub Labels (state:done)
```

### フロー2: MCP ツール実行

```
[通信層] stdio
    → [AI層] MCP SDK (@modelcontextprotocol/sdk)
        → [フレームワーク層] MCPバンドル (172ツール)
            → [通信層] HTTP (GitHub API / Docker API / 等)
                → [データ層] GitHub / Docker / Database
```

### フロー3: Web ダッシュボード

```
[フレームワーク層] Next.js 15 + React 18
    → [フレームワーク層] @xyflow/react (DAG可視化)
        → [通信層] WebSocket (リアルタイム更新)
            → [データ層] インメモリストレージ
                → [通信層] HTTP (GitHub API連携)
```

### フロー4: コンテキストエンジニアリング

```
[言語層] TypeScript SDK (ContextEngineering)
    → [通信層] HTTP (port 9001)
        → [言語層] Python FastAPI
            → [AI層] Google Gemini (セマンティック検索)
                → [データ層] セッション / コンテキストウィンドウ
```

---

## パッケージ別技術依存一覧

### packages/cli (`miyabi` v0.22.0)

| 技術 | バージョン | 層 |
|---|---|---|
| Commander.js | ^11.1.0 | フレームワーク |
| Inquirer | ^9.2.12 | フレームワーク |
| @octokit/rest | ^21.1.1 | フレームワーク |
| @octokit/graphql | ^8.2.1 | フレームワーク |
| chalk | ^5.3.0 | フレームワーク |
| ora | ^9.0.0 | フレームワーク |
| dotenv | ^16.6.1 | フレームワーク |
| yaml | ^2.3.4 | フレームワーク |
| open | ^10.0.3 | フレームワーク |
| agent-skill-bus | ^1.2.0 | フレームワーク |
| miyabi-agent-sdk | ^0.1.0-alpha.2 | フレームワーク |

### packages/core (`@agentic-os/core` v0.1.0)

| 技術 | バージョン | 層 |
|---|---|---|
| @anthropic-ai/sdk | ^0.71.2 | AI |
| @octokit/rest | ^21.1.1 | フレームワーク |
| @octokit/graphql | ^8.2.1 | フレームワーク |
| chalk | ^5.3.0 | フレームワーク |
| ora | ^9.0.0 | フレームワーク |
| cli-table3 | ^0.6.5 | フレームワーク |
| boxen | ^8.0.1 | フレームワーク |

### packages/mcp-bundle (`miyabi-mcp-bundle` v3.8.0)

| 技術 | バージョン | 層 |
|---|---|---|
| @modelcontextprotocol/sdk | ^1.20.0 | AI |
| SimpleCache | 内蔵 | データ |

### packages/miyabi-web (`@miyabi/web` v1.0.0)

| 技術 | バージョン | 層 |
|---|---|---|
| Next.js | ^15.5.14 | フレームワーク |
| React | ^18.3.1 | フレームワーク |
| @xyflow/react | ^12.3.6 | フレームワーク |
| Tailwind CSS | ^3.4.15 | フレームワーク |
| @testing-library/react | ^16.3.1 | フレームワーク |

### packages/task-manager (`@miyabi/task-manager` v0.1.0)

| 技術 | バージョン | 層 |
|---|---|---|
| @anthropic-ai/sdk | ^0.71.2 | AI |
| @octokit/rest | ^21.1.1 | フレームワーク |
| @octokit/graphql | ^8.2.1 | フレームワーク |
| uuid | - | フレームワーク |

### packages/doc-generator (`@agentic-os/doc-generator` v1.0.0)

| 技術 | バージョン | 層 |
|---|---|---|
| ts-morph | - | フレームワーク |
| Handlebars | - | フレームワーク |
| Commander.js | - | フレームワーク |

### packages/shared-utils (`@miyabi/shared-utils` v0.1.0)

| 技術 | バージョン | 層 |
|---|---|---|
| 外部依存なし | - | 純TypeScript |
| lru-cache | 内蔵 | データ |
| http.Agent | Node.js組込 | 通信 |

### packages/context-engineering (`@miyabi/context-engineering` v0.1.0)

| 技術 | バージョン | 層 |
|---|---|---|
| FastAPI (Python) | - | フレームワーク |
| Google Gemini | gemini-3-flash-preview / 2.5-flash | AI |

---

## 設計パターン一覧

各技術要素で使用されている設計パターンの横断的整理。

| パターン | 使用箇所 | 関連技術 |
|---|---|---|
| **Singleton** | AsyncFileWriter, GitHubClient, AgentRegistry | shared-utils, core |
| **Factory** | AgentFactory, register*Command | coding-agents, cli |
| **Builder** | AgentConfig, PipelineContext | coding-agents, cli |
| **Observer** | Pipeline executor (EventEmitter) | cli |
| **Strategy** | リトライ戦略、コマンド実行戦略 | shared-utils |
| **Composite** | パイプラインコマンド合成 | cli |
| **State Machine** | タスクライフサイクル（10状態、28遷移ルール） | task-manager |
| **Circuit Breaker** | 予算制御（80%警告、150%停止） | インフラ |
| **Plugin** | プラグ可能エージェント実行者 | task-manager |
| **Bidirectional Sync** | ローカル ↔ GitHub状態同期 | task-manager |
| **DAG** | Kahn's Algorithm トポロジカルソート、DFSサイクル検出 | coding-agents, miyabi-web |
| **LRU Cache** | APIレスポンスキャッシュ | shared-utils, mcp-bundle |
| **Exponential Backoff** | リトライ（delay*=2、最大10秒） | shared-utils |

---

## バージョンサマリー

全主要技術のバージョンを一覧化。

| 技術 | バージョン | 分類 |
|---|---|---|
| TypeScript | ^5.8.3 | 言語 |
| Node.js | 20 (Docker) / 18+ (最小) | ランタイム |
| pnpm | 9 | パッケージマネージャ |
| Next.js | ^15.5.14 | Webフレームワーク |
| React | ^18.3.1 | UIライブラリ |
| @xyflow/react | ^12.3.6 | フロー図 |
| Tailwind CSS | ^3.4.15 | CSS |
| Commander.js | ^11.1.0 | CLI |
| Inquirer | ^9.2.12 | CLI |
| @anthropic-ai/sdk | ^0.71.2 | AI |
| @modelcontextprotocol/sdk | ^1.20.0 | AI |
| @octokit/rest | ^21.1.1 | API |
| @octokit/graphql | ^8.2.1 | API |
| agent-skill-bus | ^1.2.0 | スキル |
| Vitest | ^3.2.4 | テスト |
| @vitest/coverage-v8 | ^3.2.4 | カバレッジ |
| @playwright/test | ^1.56.0 | E2E |
| @testing-library/react | ^16.3.1 | コンポーネントテスト |
| ESLint | ^8.57.1 | Lint |
| tsx | ^4.7.0 | 開発ツール |
| dotenv | ^16.6.1 | 設定 |
| chalk | ^5.3.0 | CLI UI |
| ora | ^9.0.0 | CLI UI |
| PostgreSQL | 16-alpine | データベース |
| Redis | 7-alpine | キャッシュ |
| Docker | node:20-alpine | コンテナ |
