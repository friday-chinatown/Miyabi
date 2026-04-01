# Miyabi CLI コマンド & スキル体系 完全分類

> 本ドキュメントは Miyabi プラットフォーム全体のコマンド体系、スキル体系、スラッシュコマンド、プラグインコマンド、MCP ツールを上位概念から下位概念へ論理的に分類・整理したものである。

---

## 1. CLI コマンド体系（30+ コマンド）

Miyabi CLI は `npx miyabi` または `miyabi` で実行される Commander.js ベースのコマンドラインインターフェースである（パッケージバージョン: 0.22.0）。

### グローバルオプション

| オプション | 説明 |
|---|---|
| `--json` | JSON 出力モード |
| `-y, --yes` | 自動確認（プロンプトスキップ） |
| `-v, --verbose` | 詳細ログ出力 |
| `--debug` | デバッグモード |
| （引数なし） | インタラクティブメニュー起動 |

---

### 1.1 プロジェクトライフサイクル

プロジェクトの作成から設定・診断までの基盤コマンド群。

#### 初期化・セットアップ

| コマンド | 説明 | 主要オプション |
|---|---|---|
| `miyabi init <name>` | 新プロジェクト作成（53 ラベル + 16 ワークフロー自動構築） | `--private`, `--skip-install`, `--json`, `-y` |
| `miyabi install` | 既存プロジェクトへの Miyabi 追加インストール | `--dry-run`, `--non-interactive`, `-y` |
| `miyabi setup` | インタラクティブセットアップウィザード | - |
| `miyabi onboard` | 初回オンボーディング（ガイド付き初期設定） | - |

#### 認証・設定

| コマンド | 説明 | 詳細 |
|---|---|---|
| `miyabi auth` | GitHub OAuth Device Flow 認証 | サブコマンド: `login`, `logout`, `status` |
| `miyabi config` | 設定管理（`.miyabi.yml` / `.miyabirc` / `.miyabi.yaml`） | `get`, `set`, `list` 操作 |

#### 診断・ヘルスチェック

| コマンド | 説明 | 備考 |
|---|---|---|
| `miyabi status` | プロジェクト状態表示（Issue/PR/ラベル状態） | `-w` で watch モード |
| `miyabi doctor` | システムヘルスチェック（依存関係・環境検証） | 包括的診断 |
| `miyabi health` | クイックヘルスチェック | 軽量版診断 |

---

### 1.2 エージェント実行

AI エージェントの実行制御に関するコマンド群。単一 Issue から完全自律運用まで段階的な自動化レベルを提供。

#### 個別実行

| コマンド | 説明 | 対象エージェント |
|---|---|---|
| `miyabi agent run <type>` | 指定エージェントの個別実行 | coordinator, codegen, review, issue, pr, deployment, test |

#### 統合実行（ショートカット）

| コマンド | 説明 | 実行内容 |
|---|---|---|
| `miyabi run` | 統合実行インターフェース | 複数エージェント協調実行 |
| `miyabi fix <issue>` | バグ修正ショートカット | Issue 分析 → コード修正 → テスト → PR |
| `miyabi build <issue>` | 機能構築ショートカット | Issue 分析 → コード生成 → テスト → PR |
| `miyabi ship` | デプロイショートカット | ビルド → テスト → デプロイ |

#### 自律実行

| コマンド | 説明 | 自動化レベル |
|---|---|---|
| `miyabi auto` | Water Spider 完全自動化モード | Issue 自動取得 → 優先度順処理 → PR 作成 |
| `miyabi omega` | Omega-System 6 段階パイプライン | 最高レベル自律実行 |
| `miyabi cycle` | フィードバックループ制御（Issue → Code → Test → PR） | 単一 Issue 自動化サイクル |
| `miyabi sprint` | スプリント計画 + バッチ Issue 作成 | スプリント単位の一括管理 |

#### パイプライン

| コマンド | 説明 | 演算子 |
|---|---|---|
| `miyabi pipeline` | コマンド合成パイプライン | `\|` (pipe), `&&` (AND), `\|\|` (OR), `&` (parallel) |

**パイプラインコンテキスト**: pipelineId, issueNumber, prNumber, qualityScore, testsPassed, errors, checkpoints を各ステージ間で伝播。

---

### 1.3 DevOps・ツール

開発運用を支援する専門ツール群。

#### コード知能: `miyabi gni`（14 サブコマンド）

GitNexus Intelligence によるコードベースのグラフベース分析。

| サブコマンド | 説明 |
|---|---|
| `analyze` | コードインデックス構築 |
| `status` | インデックス鮮度チェック |
| `clean` | インデックス削除 |
| `wiki` | グラフからドキュメント生成 |
| `query` | コードベースへの自然言語クエリ |
| `context` | シンボルのコンテキスト取得 |
| `impact` | 変更影響分析（距離 d=1,2,3） |
| `detect_changes` | 変更検出 |
| `rename` | セマンティックリネーム（dry_run 対応） |
| `cypher` | Cypher クエリ実行 |
| `list_repos` | リポジトリ一覧 |
| `clusters` | コミュニティクラスタ |
| `processes` | プロセストレース |
| `schema` | グラフスキーマ表示 |

#### スキルバス: `miyabi bus`（11 サブコマンド）

Agent Skill Bus のキュー管理。110+ ビルトインスキルの実行・監視。

| サブコマンド | 説明 |
|---|---|
| `list` | 登録スキル一覧 |
| `search` | スキル検索 |
| `run` | スキル実行 |
| `status` | キュー状態確認 |
| `history` | 実行履歴 |
| `queue` | キュー管理 |
| `pause` | キュー一時停止 |
| `resume` | キュー再開 |
| `clear` | キュークリア |
| `stats` | 統計情報 |
| `config` | バス設定 |

#### タスク管理: `miyabi task`（4 サブコマンド）

| サブコマンド | 説明 |
|---|---|
| `list` | タスク一覧（状態フィルタ対応） |
| `view` | タスク詳細表示 |
| `add` | タスク追加 |
| `done` | タスク完了マーク |

#### その他のツールコマンド

| コマンド | 説明 | 備考 |
|---|---|---|
| `miyabi release` | リリース管理 | X (Twitter) / Discord 自動通知付き |
| `miyabi voice` | 音声駆動モード | 音声入力によるコマンド実行 |
| `miyabi skills` | Claude Code スキル管理 | スキルの登録・一覧・設定 |
| `miyabi todos` | TODO/FIXME 自動検出 → Issue 作成 | コードベーススキャン |
| `miyabi docs` | ドキュメント自動生成 | TypeScript AST 解析ベース |
| `miyabi dashboard` | ダッシュボード管理 | WebSocket リアルタイム監視 |

---

### 1.4 npm スクリプト体系（140+）

ルートレベル `package.json` に定義された npm スクリプト群。`npm run <script>` で実行。

#### コア操作スクリプト

| スクリプト | 説明 |
|---|---|
| `start` | エージェント操作開始（`tsx scripts/operations/agentic.ts`） |
| `build` | 全パッケージの TypeScript コンパイル |
| `lint` | ESLint 検証 |
| `typecheck` | 型チェック（出力なし） |
| `verify:all` | lint + typecheck + test + security:scan |

#### `agents:*` - エージェント管理

| スクリプト | 説明 |
|---|---|
| `agents:parallel:exec` | 複数 Issue 同時処理（`--issues=123,124 --concurrency=2`） |
| `agents:status` | 全エージェントの稼働状態確認 |
| `agents:verify` | 全エージェントの lint/type/test ゲート検証 |

#### `state:*` - 状態管理

| スクリプト | 説明 |
|---|---|
| `state:check` | ラベルステートマシン整合性検証 |
| `state:transition` | ラベル状態遷移実行 |
| `state:assign-agent` | ラベルによるエージェント割り当て |

#### `webhook:*` - Webhook

| スクリプト | 説明 |
|---|---|
| `webhook:server` | Webhook サーバー起動 |
| `webhook:test:issue` | Issue Webhook テスト |
| `webhook:test:pr` | PR Webhook テスト |
| `webhook:test:push` | Push Webhook テスト |
| `webhook:test:comment` | Comment Webhook テスト |

#### `mcp:*` - MCP サーバー管理

| スクリプト | 説明 |
|---|---|
| `mcp:health-check` | MCP サーバーヘルスチェック |
| `test:mcp:integration` | MCP 統合テスト |
| `test:mcp:performance` | MCP パフォーマンステスト |

#### `water-spider:*` - 完全自動化

| スクリプト | 説明 |
|---|---|
| `water-spider:start` | 自律システム起動 |
| `water-spider:create-sessions` | エージェントセッション作成 |
| `water-spider:kill-sessions` | セッション終了 |

#### `kpi:*` / `project:*` - メトリクス・レポート

| スクリプト | 説明 |
|---|---|
| `kpi:collect` | KPI 収集 |
| `project:info` | GitHub プロジェクト情報 |
| `project:metrics` | プロジェクトメトリクス計算 |
| `project:report` | 包括的レポート生成 |

#### メディア生成スクリプト

| スクリプト | 説明 |
|---|---|
| `generate-image` | 画像生成（Gemini API） |
| `generate-speech` | 音声生成（TTS） |
| `generate-video` | 動画生成 |
| `generate-i2v` | 画像 → 動画変換 |

#### セキュリティスクリプト

| スクリプト | 説明 |
|---|---|
| `security:audit` | npm audit 実行 |
| `security:scan` | シークレット検出スキャン |

---

## 2. スキル体系（23 実行可能スキル）

Claude Code の `.claude/skills/` ディレクトリに配置されるスキル定義。3 層 Progressive Disclosure アーキテクチャで管理。

- **Layer 1**: インデックスのみ（~500 トークン、常時ロード）
- **Layer 2**: スキルメタデータ（~1,000 トークン、オンデマンド）
- **Layer 3**: フルコンテンツ（~5,000 トークン、アクティベーション時）

---

### 2.1 エージェントスキル（7 スキル）

コーディングエージェントの直接実行スキル。各スキルは対応するエージェントの全機能をラップする。

| # | スキル名 | トリガー例 | 機能概要 |
|---|---|---|---|
| 1 | **Coordinator Agent** | "decompose this issue", "run full pipeline" | Issue 分析 → DAG 構築 → エージェント割当 → 並列実行追跡 |
| 2 | **Issue Agent** | "analyze this issue", "label issues" | 53 ラベル × 10 カテゴリ自動分類、複雑度評価 |
| 3 | **Code Reviewer** | "review this code", "check this PR" | 100 点スコアリング（Correctness 30% + Security 25% + Performance 20% + Maintainability 15% + Testing 10%） |
| 4 | **PR Agent** | "create PR", "merge this PR" | Conventional Commits 形式 PR 作成、ブランチ命名: `{type}/{issue_number}-{description}` |
| 5 | **Deploy Agent** | "deploy to production", "rollback" | 4 段階パイプライン: Build → Test → Deploy → Health Check |
| 6 | **Test Generator** | "write tests", "improve coverage" | Vitest / Playwright / Testing Library、AAA パターン、80% カバレッジ目標 |
| 7 | **Autonomous Coding Agent** | "autonomous coding", "coding agent" | Claude Code CLI ラッパー、入力サニタイズ付き自律コーディング |

---

### 2.2 プラットフォームスキル（3 スキル）

Miyabi プラットフォーム固有のオーケストレーション・品質管理スキル。

| # | スキル名 | トリガー例 | 機能概要 |
|---|---|---|---|
| 1 | **Miyabi Pipeline** | "run pipeline", "full cycle" | コマンド合成（`\|`, `&&`, `\|\|`, `&`）。プリセット: `full-cycle`, `quick-deploy`, `quality-gate` |
| 2 | **Miyabi Quality Gate** | "check quality", "quality gate" | 100 点スコアリング（6 観点）、Auto-Retry Loop 最大 3 回 |
| 3 | **Miyabi GitHub OS** | "github os", "issue driven" | GitHub as OS アーキテクチャ運用（Issues = タスクキュー、Labels = ステートマシン、Projects V2 = データ層） |

---

### 2.3 開発スキル（5 スキル）

日常の開発タスクを支援するユーティリティスキル。

| # | スキル名 | トリガー例 | 機能概要 |
|---|---|---|---|
| 1 | **Commit Helper** | "commit message", "conventional commit" | Conventional Commits 形式: `<type>(<scope>): <subject>`、命令形、50 文字以内 |
| 2 | **Refactor Helper** | "refactor this", "code smell" | コードスメル検出（長い関数、重複、God class）、1 コミット 1 変更原則 |
| 3 | **Doc Generator** | "generate docs", "create documentation" | JSDoc/TSDoc、README、CHANGELOG（Keep a Changelog 形式） |
| 4 | **Skill Creator** | "create skill", "new skill" | `.claude/skills/[skill-name]/SKILL.md` 構造でスキル生成 |
| 5 | **Agent Skill Use** | "use skill", "skill architecture" | 3 層アーキテクチャガイド: MCP → Skills → Subagents |

---

### 2.4 外部統合スキル（2 スキル）

外部サービスとの統合を実現するスキル。

| # | スキル名 | トリガー例 | 機能概要 |
|---|---|---|---|
| 1 | **CCG (AI Course Content Generator)** | "create course", "generate course" | Gemini API によるコース構造 → スクリプト → TTS → スライド → ビデオ |
| 2 | **Teachable Course Creator** | "upload to teachable" | CCG コンテンツを Teachable に Chrome MCP で自動アップロード |

---

### 2.5 GitNexus スキル（6 スキル）

コードベースのグラフベース分析・操作スキル。

| # | スキル名 | トリガー例 | 機能概要 |
|---|---|---|---|
| 1 | **GitNexus CLI** | "analyze codebase", "gitnexus" | `npx gitnexus analyze/status/clean/wiki`、git commit 後の自動 analyze |
| 2 | **GitNexus Guide** | "how does X work?" | ツール群（query, context, impact, detect_changes, rename, cypher, list_repos） |
| 3 | **GitNexus Exploring** | "project structure", "how does auth work?" | repos → context → query → context(deep) → process trace |
| 4 | **GitNexus Impact Analysis** | "is it safe to change X?", "what will break?" | 影響距離分析（d=1 確実、d=2 影響あり、d=3 テスト要）、リスクレベル判定 |
| 5 | **GitNexus Debugging** | "why is X failing?", "error trace" | エラーメッセージ検索 → context → プロセストレース → Cypher |
| 6 | **GitNexus Refactoring** | "rename function", "refactor safely" | dry_run → レビュー → 実行 → detect_changes、find-and-replace 禁止 |

---

## 3. スラッシュコマンド（10 コマンド）

Claude Code セッション内で `/` プレフィックスで実行するコマンド。スキルを直接起動するショートカット。

| # | コマンド | カテゴリ | 説明 |
|---|---|---|---|
| 1 | `/agent-run` | 実行 | エージェント実行（Issue 番号指定） |
| 2 | `/create-issue` | 管理 | GitHub Issue 作成（ラベル自動付与） |
| 3 | `/deploy` | デプロイ | 本番デプロイ実行 |
| 4 | `/generate-docs` | ドキュメント | ドキュメント自動生成 |
| 5 | `/miyabi-auto` | 自動化 | 自律モード開始（Water Spider） |
| 6 | `/miyabi-todos` | 自動化 | TODO/FIXME 検出 → Issue 自動作成 |
| 7 | `/review` | 品質 | コードレビュー実行（100 点スコアリング） |
| 8 | `/security-scan` | セキュリティ | セキュリティスキャン実行 |
| 9 | `/test` | テスト | テスト実行（unit/integration/e2e） |
| 10 | `/verify` | 診断 | システムヘルスチェック |

---

## 4. プラグインコマンド（10 コマンド）

`plugin.json`（`miyabi-operations` v1.0.0）で定義される Claude Code プラグインコマンド。CLI コマンドの MCP 統合版。

| # | コマンド | カテゴリ | 説明 |
|---|---|---|---|
| 1 | `miyabi-init` | setup | 新プロジェクト作成 |
| 2 | `miyabi-status` | monitoring | リアルタイム状態表示 |
| 3 | `miyabi-auto` | automation | Water Spider 完全自動化（優先度アルゴリズム付き） |
| 4 | `miyabi-amembo` | monitoring | 軽量観察モード（あめんぼ） |
| 5 | `miyabi-watch` | monitoring | Webhook 監視 |
| 6 | `miyabi-todos` | automation | TODO 検出 → Issue 作成 |
| 7 | `miyabi-agent` | execution | 個別エージェント実行 |
| 8 | `miyabi-docs` | documentation | ドキュメント自動生成 |
| 9 | `miyabi-deploy` | deployment | staging/production デプロイ |
| 10 | `miyabi-test` | testing | テスト実行（unit/integration/e2e） |

**miyabi-auto 優先度アルゴリズム**:
1. 緊急度-高/即時ラベル → 高緊急
2. security/vulnerability → セキュリティ
3. status:blocked → ブロック解除
4. 規模-小 → クイックウィン
5. FIFO by creation date → 公平ローテーション

---

## 5. MCP ツール（180+ ツール、7 サーバー + 21 カテゴリバンドル）

Model Context Protocol サーバー群。Claude Desktop / Claude Code から直接呼び出し可能。

### 5.1 MCP サーバー構成（7 サーバー）

| # | サーバー | ツール数 | タイムアウト | 用途 |
|---|---|---|---|---|
| 1 | `miyabi` | 12 | 120 秒 | Miyabi CLI 統合 |
| 2 | `github-enhanced` | 5 | 120 秒 | GitHub Issue/PR 管理 |
| 3 | `project-context` | 5 | 120 秒 | プロジェクト構造分析 |
| 4 | `ide-integration` | 3 | 120 秒 | VS Code / Jupyter 統合 |
| 5 | `context-engineering` | 6 | 120 秒 | AI コンテキスト最適化 |
| 6 | `gemini-image-generation` | 5 | 120 秒 | Gemini 画像/TTS 生成 |
| 7 | `filesystem` | - | 120 秒 | ファイルシステムアクセス |

### 5.2 カスタム MCP サーバー詳細

#### Miyabi Integration Server（12 ツール）

| ツール | パラメータ | 説明 |
|---|---|---|
| `miyabi__init` | projectName, private? | 新プロジェクト作成 |
| `miyabi__install` | dryRun? | 既存プロジェクトへの追加 |
| `miyabi__status` | watch? | リアルタイム状態表示 |
| `miyabi__agent_run` | issueNumber/issueNumbers[], concurrency | エージェント実行 |
| `miyabi__auto` | maxIssues, interval | Water Spider 完全自動化 |
| `miyabi__todos` | path, autoCreate? | TODO 検出 → Issue 作成 |
| `miyabi__config` | action, key?, value? | 設定管理 |
| `miyabi__docs` | type, format, output | ドキュメント生成 |
| `miyabi__deploy` | environment, action | デプロイ実行 |
| `miyabi__test` | type, coverage?, watch? | テスト実行 |
| （他 2 ツール） | - | 追加機能 |

#### GitHub Enhanced Server（5 ツール）

| ツール | 説明 |
|---|---|
| `create_issue_with_labels` | Issue 作成 + 自動ラベリング |
| `get_agent_tasks` | エージェント実行可能 Issue 取得 |
| `update_issue_progress` | 進捗更新 |
| `create_pr_from_agent` | エージェント生成 PR 作成 |
| `get_pr_review_status` | レビュー状態確認 |

#### Project Context Server（5 ツール）

| ツール | 説明 |
|---|---|
| `get_project_structure` | ディレクトリツリー |
| `get_dependencies` | package.json 依存関係 |
| `get_agent_config` | エージェント設定 |
| `analyze_codebase` | LOC、ファイル数、複雑度 |
| `get_recent_changes` | 直近 git コミット |

#### IDE Integration Server（3 ツール）

| ツール | 説明 |
|---|---|
| `get_diagnostics` | TypeScript/ESLint 診断 |
| `execute_code` | Jupyter カーネル実行 |
| `format_code` | Prettier/ESLint フォーマット |

#### Context Engineering Server（6 ツール）

| ツール | 説明 |
|---|---|
| `list_ai_guides` | AI ガイド一覧 |
| `search_ai_guides` | ガイド検索 |
| `search_guides_with_gemini` | セマンティック検索（Gemini） |
| `analyze_guide` | ガイド内容分析 |
| `analyze_guide_url` | URL 内容分析 |
| `compare_guides` | 複数ガイド比較 |

#### Gemini Image Generation Server（5 ツール）

| ツール | 説明 |
|---|---|
| `gemini__generate_image` | 単一画像生成 |
| `gemini__generate_images_batch` | バッチ画像生成 |
| `gemini__generate_speech` | TTS 生成 |
| `gemini__generate_speeches_batch` | バッチ TTS |
| `gemini__check_api_key` | API キー検証 |

#### Discord Integration Server（7 ツール）

| ツール | 説明 |
|---|---|
| `discord_send_message` | メッセージ送信（リッチ Embed 対応） |
| `discord_announce_release` | リリース告知 |
| `discord_notify_github_event` | GitHub イベント通知 |
| `discord_get_stats` | サーバー統計 |
| `discord_create_event` | イベント作成 |
| `discord_get_recent_messages` | 最近のメッセージ取得 |
| `discord_add_reaction` | リアクション追加 |

---

### 5.3 バンドル MCP サーバー（172 ツール、21 カテゴリ）

`miyabi-mcp-bundle` v3.8.0（3629 行）に集約された汎用ツール群。

| # | カテゴリ | ツール数 | 主要機能 |
|---|---|---|---|
| 1 | **Git Inspector** | 19 | status, branch, log, blame, diff, tags, stash, remote, config, cherry-pick |
| 2 | **Tmux Monitor** | 10 | session/window/pane 管理、capture、resize |
| 3 | **Log Aggregator** | 7 | sources, search, errors, tail, stats, rotate, archive |
| 4 | **Resource Monitor** | 10 | CPU, memory, disk, load, processes, swap, uptime, temperature |
| 5 | **Network Inspector** | 15 | interfaces, ports, DNS, ping, traceroute, SSL, bandwidth, connections |
| 6 | **Process Inspector** | 14 | list, search, tree, fd, kill, priority, environment, limits |
| 7 | **File Watcher** | 10 | stats, changes, search, compare, permissions, checksum, metadata |
| 8 | **Claude Code Monitor** | 8 | config, MCP status, session, logs, extensions, commands |
| 9 | **GitHub Integration** | 21 | issues, PRs, workflows, releases, labels, milestones, branches, actions |
| 10 | **Linux systemd** | 3 | service status, start/stop, logs |
| 11 | **Windows Event Log** | 2 | query, filter |
| 12 | **Docker** | 10 | containers, images, build, run, exec, logs, inspect, network |
| 13 | **Docker Compose** | 4 | services, up/down, logs |
| 14 | **Kubernetes** | 6 | pods, services, deployments, namespaces, configmaps |
| 15 | **Spec-Kit** | 9 | spec 作成、検証、生成、テンプレート |
| 16 | **MCP Tool Discovery** | 3 | 動的ツール検索、カテゴリ一覧、ツール詳細 |
| 17 | **Database** | 6 | SQLite/PostgreSQL/MySQL クエリ、スキーマ、マイグレーション |
| 18 | **Time Tools** | 4 | タイムゾーン変換、カウントダウン、スケジュール |
| 19 | **Calculator** | 3 | 数学演算、単位変換、統計計算 |
| 20 | **Sequential Thinking** | 3 | 構造化推論、ステップ分解、結論導出 |
| 21 | **Generator** | 4 | UUID、ランダム文字列、ハッシュ、テンプレート |

**バンドルセキュリティ機能**:
- コマンドインジェクション防止（特殊文字サニタイズ）
- パストラバーサル保護（解決パス検証）
- シンボリックリンク攻撃防止（実パス解決）
- DOS 防止（入力長制限: query 1000、path 4096、hostname 253）
- PID 検証（整数範囲: 0 < pid < 4194304）

---

## 6. 体系間の関係マップ

各コマンド体系は以下の階層で連携する。

```
[ユーザー入力]
    |
    +-- CLI コマンド (miyabi <cmd>)          # ターミナルから直接実行
    |       |
    |       +-- npm スクリプト               # 内部実行エンジン
    |       +-- Agent SDK                    # エージェント実行基盤
    |
    +-- スラッシュコマンド (/<cmd>)           # Claude Code セッション内
    |       |
    |       +-- スキル (.claude/skills/)      # Progressive Disclosure
    |
    +-- プラグインコマンド (miyabi-<cmd>)     # Claude Code プラグイン経由
    |
    +-- MCP ツール                           # Claude Desktop / Claude Code
            |
            +-- カスタムサーバー (7)          # Miyabi 固有機能
            +-- バンドルサーバー (172)        # 汎用 DevOps ツール
```

**実行フロー例（Issue → Production）**:
1. `/create-issue` または `miyabi__init` で Issue 作成
2. `miyabi agent run coordinator --issue=123` または `/agent-run` で自律処理開始
3. IssueAgent → CoordinatorAgent → CodeGenAgent → ReviewAgent → PRAgent → DeploymentAgent
4. 各段階で MCP ツール（GitHub Enhanced, Project Context 等）を活用
5. `/deploy` または `miyabi ship` で本番反映

---

## 7. 数量サマリー

| 体系 | 数量 | 備考 |
|---|---|---|
| **CLI コマンド** | 30+ | Commander.js ベース、グローバルオプション 4 種 |
| **CLI サブコマンド** | 43+ | gni(14) + bus(11) + task(4) + auth(3) + 他 |
| **npm スクリプト** | 140+ | agents, state, webhook, mcp, water-spider, kpi, generate 等 |
| **実行可能スキル** | 23 | エージェント(7) + プラットフォーム(3) + 開発(5) + 外部(2) + GitNexus(6) |
| **スラッシュコマンド** | 10 | Claude Code セッション内ショートカット |
| **プラグインコマンド** | 10 | Claude Code プラグイン経由 |
| **MCP カスタムツール** | 43+ | 7 サーバー合計 |
| **MCP バンドルツール** | 172 | 21 カテゴリ |
| **MCP ツール合計** | 215+ | カスタム + バンドル |
| **ナレッジガイド** | 13 | 開発ベストプラクティスガイド |
| **GitHub Workflows** | 24 | CI/CD、セキュリティ、自動化 |
