# Miyabi プロジェクト概要・アーキテクチャ 詳細分析

## PROJECT PURPOSE AND VISION

Miyabi は、GitHub Issues から本番コードデプロイまでのソフトウェア開発ライフサイクルを自動化する**自律型AI開発フレームワーク**。GitHub を OS（Agentic OS）として扱い、Issues がタスクキュー、Labels がステートマシン、Projects V2 がデータ層、GitHub Actions が実行エンジン、Webhooks がイベントバスとして機能する。

**核心的な約束**: Issue → PR 自動化を10-15分で実現。人間のコーディング不要。7つの専門AIエージェントが自律的に協調動作。

**哲学的基盤**: Windows 95がコンピュータを、iOS/Androidがスマートフォンを普遍的に使えるようにしたのと同様、Miyabiは「AIを深く理解していない人でも自律エージェントと協業できる」世界初の実用的 Agentic OS テンプレートを目指す。

---

## ARCHITECTURE OVERVIEW

### モノレポ構造

Miyabi は pnpm モノレポとして以下のパッケージ構造を持つ:

**コアパッケージ:**
| パッケージ | 説明 |
|---|---|
| `packages/cli/` | メイン Miyabi CLI (`npx miyabi`) - 25+コマンドのエントリポイント、Commander.js ベース |
| `packages/core/` | `@agentic-os/core` 基盤レイヤー - エージェントシステム基底クラス、イベント処理、オーケストレーション |
| `packages/mcp-bundle/` | MCP Server - Claude Desktop/Claude Code 向け172+統合ツール |
| `packages/miyabi-agent-sdk/` | Agent SDK - 7つのコーディングエージェントの TypeScript 実装 |
| `packages/coding-agents/` | 専門コーディングエージェント実装 |
| `packages/shared-utils/` | パッケージ間共有ユーティリティライブラリ |
| `packages/context-engineering/` | コンテキストエンジニアリング・最適化ツール |
| `packages/github-projects/` | GitHub Projects V2 統合レイヤー |
| `packages/task-manager/` | タスク管理・キューシステム |
| `packages/doc-generator/` | 自動ドキュメント生成 |
| `packages/miyabi-web/` | 監視・制御用 Web ダッシュボード |

**ワークスペース構成:** `pnpm-workspace.yaml` で `packages/*` を宣言。統一的な依存関係管理とパスエイリアスによるクロスパッケージリンクを実現。

---

## エージェントシステムアーキテクチャ

### 7つのコーディングエージェント

| # | エージェント | 役割 | 権限レベル | 詳細 |
|---|---|---|---|---|
| 1 | **CoordinatorAgent** | オーケストレーター | 🔴統括（決裁） | Issue分析、DAGによるタスク分解、エージェント選定、実行監視、ブロッカーエスカレーション |
| 2 | **IssueAgent** | アナライザー | 🟢分析 | Issue内容分析、53ラベル×10カテゴリ分類、複雑度評価、下流エージェント向けコンテキスト準備 |
| 3 | **CodeGenAgent** | コード生成 | 🔵実行 | Claude Sonnet 4使用。プロダクションレディコード生成、テストフィクスチャ、ドキュメント生成 |
| 4 | **ReviewAgent** | 品質ゲートキーパー | 🔵実行 | 100点満点評価（正確性、パフォーマンス、セキュリティ、保守性、テストカバレッジ）。80点以上でPR作成許可。最大3回リトライ |
| 5 | **TestAgent** | テスト実行 | 🔵実行 | テストスイート実行、カバレッジ収集、閾値検証、CodeGenAgentへのフィードバック |
| 6 | **PRAgent** | PR オーケストレーター | 🔵実行 | Conventional Commits形式PR作成、コミットメッセージ、マージ戦略選定 |
| 7 | **DeploymentAgent** | CI/CD自動化 | 🔵実行 | デプロイパイプライン、環境別設定（staging/production）、ヘルスチェック、自動ロールバック |

### 品質ゲートアーキテクチャ
```
CodeGenAgent出力 → ReviewAgent (スコア 0-100) → [≥80?]
                                    ↓ [No]
                          最大3回リトライ → まだ不合格? → 人間にエスカレーション
                                    ↓ [Yes]
                                 PRAgent が PR 作成
```

### 14のビジネスエージェント（計画中）
Marketing, Sales, Content, Analytics エージェントによるエンドツーエンドのビジネス自動化。

---

## GitHub as Operating System

| GitHub機能 | OS的役割 | 実装 |
|---|---|---|
| **Issues** | プロセス制御 / タスクキュー | 各Issueがエージェントワークフローをトリガー |
| **Labels** | ステートマシン | 53ラベル×10カテゴリでワークフロー状態管理 |
| **Projects V2** | データ永続化層 | リレーショナルデータ、メトリクス、状態保持 |
| **Actions** | 実行エンジン | 16+ GitHub Actions ワークフロー |
| **Webhooks** | イベントバス | リアルタイム状態変更通知 |
| **Secrets** | セキュアボールト | APIキー、認証情報の暗号化管理 |
| **CODEOWNERS** | アクセス制御 | コード所有権と必須レビュー |

### ステートマシン
```
pending → analyzing → implementing → reviewing → done
```

---

## TECHNOLOGY STACK

### プライマリ言語・フレームワーク

| 技術 | 詳細 |
|---|---|
| **TypeScript** | Strict モード、ESM、ターゲット ES2022 |
| **Node.js** | v18+、pnpm 9 パッケージマネージャ |
| **Python** (オプション) | コンテキストエンジニアリングサービス、Uvicorn (port 9001)、Gemini API (port 8888) |

### 主要依存関係

**AI/エージェントインフラ:**
| パッケージ | バージョン | 用途 |
|---|---|---|
| `@anthropic-ai/sdk` | ^0.71.2 | Claude API統合（Claude Sonnet 4） |
| `@modelcontextprotocol/sdk` | ^1.20.0 | MCP サーバー/クライアント |
| `agent-skill-bus` | ^1.2.0 | 110+ビルトインスキル |

**GitHub統合:**
| パッケージ | バージョン | 用途 |
|---|---|---|
| `@octokit/rest` | ^21.1.1 | GitHub REST API |
| `@octokit/graphql` | ^8.2.1 | GitHub GraphQL API |

**CLI/UI:**
- chalk, ora, figlet, gradient-string, cli-table3, boxen, log-symbols, terminal-link, cli-spinners, ansi-escapes

**開発・テスト:**
| パッケージ | バージョン | 用途 |
|---|---|---|
| `TypeScript` | ^5.8.3 | コンパイラ |
| `Vitest` | ^3.2.4 | ユニット/統合テスト（v8カバレッジ） |
| `@playwright/test` | ^1.56.0 | E2Eブラウザテスト |
| `ESLint` | ^8.57.1 | コード品質 |
| `tsx` | ^4.7.0 | ビルドなしTS実行 |

**ユーティリティ:**
- lru-cache, p-retry, dotenv, concurrently

**コンテナ/DevOps:**
- Docker + Docker Compose
- PostgreSQL 16-alpine（オプション状態永続化）
- Redis 7-alpine（オプション座標・キャッシュ）

---

## BUILD SYSTEM & NPM SCRIPTS

### ルートレベルスクリプト（140+）

#### コア操作
| スクリプト | 説明 |
|---|---|
| `npm start` | エージェント操作開始 (`tsx scripts/operations/agentic.ts`) |
| `npm run build` | 全パッケージの TypeScript コンパイル |
| `npm run lint` | ESLint検証 |
| `npm run typecheck` | 型チェック（出力なし） |
| `npm run verify:all` | lint + typecheck + test + security:scan |

#### エージェント並列実行
| スクリプト | 説明 |
|---|---|
| `agents:parallel:exec` | 複数Issue同時処理（`--issues=123,124 --concurrency=2`） |
| `agents:status` | 全エージェントの稼働状態確認 |
| `agents:verify` | 全エージェントの lint/type/test ゲート検証 |

#### KPI・メトリクス
| スクリプト | 説明 |
|---|---|
| `kpi:collect` | KPI収集 |
| `project:info` | GitHubプロジェクト情報 |
| `project:metrics` | プロジェクトメトリクス計算 |
| `project:report` | 包括的レポート生成 |

#### 状態管理
| スクリプト | 説明 |
|---|---|
| `state:check` | ラベルステートマシン整合性検証 |
| `state:transition` | ラベル状態遷移実行 |
| `state:assign-agent` | ラベルによるエージェント割り当て |

#### MCPサーバー管理
| スクリプト | 説明 |
|---|---|
| `mcp:health-check` | MCPサーバーヘルスチェック |
| `test:mcp:integration` | MCP統合テスト |
| `test:mcp:performance` | MCPパフォーマンステスト |

#### Webhook
| スクリプト | 説明 |
|---|---|
| `webhook:test:issue/pr/push/comment` | Webhookテスト |
| `webhook:server` | Webhookサーバー起動 |

#### Water Spider（完全自動化）
| スクリプト | 説明 |
|---|---|
| `water-spider:start` | 自律システム起動 |
| `water-spider:create-sessions` | エージェントセッション作成 |
| `water-spider:kill-sessions` | セッション終了 |

#### メディア生成
| スクリプト | 説明 |
|---|---|
| `generate-image` | 画像生成 |
| `generate-speech` | 音声生成 |
| `generate-video` | 動画生成 |
| `generate-i2v` | 画像→動画変換 |

---

## DOCKER CONFIGURATION

### Docker Compose サービス

**メインサービス: miyabi-agent**
- イメージ: `miyabi-agent:latest`（マルチステージビルド）
- リソース: CPU制限2.0/予約0.5、メモリ制限2GB/予約512MB
- ヘルスチェック: 30秒間隔
- ボリューム: config(RO), logs, output, agent-data

**オプションサービス:**
| サービス | プロファイル | 用途 |
|---|---|---|
| PostgreSQL 16-alpine | `with-database` | 状態永続化 |
| Redis 7-alpine | `with-cache` | 座標・キャッシュ |
| Context Engineering API | `context-engineering` | コンテキスト最適化 |

### Dockerfile（マルチステージビルド）

| ステージ | ベース | 内容 |
|---|---|---|
| base | node:20-alpine | git, openssh-client, ca-certificates |
| deps | base | pnpm 9, `--frozen-lockfile --prod` |
| builder | base | 全依存関係 + ビルド（dashboard-server, github-projects除外） |
| runtime | base | 非rootユーザー(miyabi, UID 1001)、ビルド成果物コピー |

---

## ENVIRONMENT VARIABLES

### 必須
| 変数 | 説明 |
|---|---|
| `GITHUB_TOKEN` | GitHub PAT（スコープ: repo, workflow, write:packages） |
| `REPOSITORY` | GitHubリポジトリ（owner/repo形式） |

### オプション
| 変数 | 説明 | デフォルト |
|---|---|---|
| `DEVICE_IDENTIFIER` | デバイス識別子 | hostname |
| `LOG_DIRECTORY` | ログ出力先 | .ai/logs |
| `DEFAULT_CONCURRENCY` | 並列実行数 | 2 |
| `USE_WORKTREE` | git worktree使用 | false |
| `FIREBASE_STAGING_PROJECT` | Firebaseステージング | - |
| `FIREBASE_PROD_PROJECT` | Firebase本番 | - |
| `TECH_LEAD_GITHUB` | テックリードGitHub | - |

---

## SECURITY POLICIES

### トークン管理（優先度順）
1. **gh CLI**（推奨）- `gh auth token` で自動ローテーション
2. **環境変数** - CI/CD向け `GITHUB_TOKEN`
3. **.envファイル** - ローカル開発フォールバック
4. **OAuth Device Flow** - インタラクティブ認証

### 脆弱性対応
- 48時間以内の対応
- `npm run security:audit` - npm audit
- `npm run security:scan` - シークレット検出
- GitHub Dependabot 自動更新
- Gitleaks 統合

### pnpm オーバーライド（脆弱性修正）
```yaml
minimatch@<3.1.4 → 3.1.4 (DOS脆弱性)
flatted@<=3.4.1 → 3.4.2 (オブジェクトインジェクション)
glob@>=10.2.0 <10.5.0 → 10.5.0 (パフォーマンス)
```

---

## LICENSE & OWNERSHIP

- **ライセンス**: Apache License 2.0
- **著作権**: 2025-2026 Shunsuke Hayashi / 合同会社みやび (Miyabi LLC)
- **作者**: Shunsuke Hayashi (@ShunsukeHayashi)
- **商標**: "Miyabi" はコモンロー商標として権利主張
- **注意**: ソースコードは Apache 2.0 下で配布されるが、プロプライエタリとして保護。リバースエンジニアリング禁止。

### CODEOWNERS
- **全ファイルのデフォルト**: @ShunsukeHayashi
- エージェントコード、スクリプト、ワークフロー、セキュリティ、ドキュメント、設定すべて @ShunsukeHayashi

---

## DEVELOPMENT WORKFLOW

### Issue → Production（10-15分）

```
1. Issue作成（開発者がfeature/bugを記述）
   ↓
2. IssueAgent 自動分析（53ラベル分類、複雑度評価）
   ↓
3. CoordinatorAgent オーケストレーション（DAGタスク分解、エージェント選定）
   ↓
4. 並列実行（CodeGen + Test + Review）
   ↓
5. 品質ゲート（ReviewAgent 80点以上 → 合格）
   ↓ [不合格: 最大3回リトライ → エスカレーション]
6. PRAgent PR作成（Conventional Commits）
   ↓
7. DeploymentAgent デプロイ（staging → production）
   ↓
8. ナレッジ更新（成功パターン蓄積）
```

---

## ECONOMIC GOVERNANCE (BUDGET.yml)

```yaml
monthly_budget_usd: 500
  anthropic_api: 400 USD (10M tokens/month)
  github_actions: 0 USD (無料枠)
  firebase: 100 USD

thresholds:
  warning: 0.8 (80% → アラート送信)
  emergency: 1.5 (150% → ワークフロー自動停止)
```

**サーキットブレーカーパターン**: 時間単位のコスト監視。緊急閾値超過でワークフロー自動無効化。復旧にはガーディアン承認と根本原因分析が必要。

---

## CLI COMMANDS (25+)

### コアシステムコマンド
| コマンド | 用途 |
|---|---|
| `miyabi status` | プロジェクト状態表示 |
| `miyabi doctor` | システム診断 |
| `miyabi init <name>` | 新プロジェクト初期化（53ラベル + 16ワークフロー） |
| `miyabi setup` | インタラクティブセットアップ |
| `miyabi auth` | GitHub OAuth |
| `miyabi config` | 設定管理 |

### エージェント実行コマンド
| コマンド | 用途 |
|---|---|
| `miyabi agent` | 個別エージェント実行 |
| `miyabi run` | 統合ランナー |
| `miyabi fix <issue>` | バグ修正ショートカット |
| `miyabi build <issue>` | 機能構築ショートカット |
| `miyabi auto` | Water Spider完全自動化 |
| `miyabi cycle` | Issue→Code→Test→PR自動化 |
| `miyabi sprint` | スプリント計画 + バッチIssue作成 |
| `miyabi pipeline` | コマンド合成（pipe/AND/OR/parallel） |

### ツール・DevOps
| コマンド | 用途 |
|---|---|
| `miyabi release` | リリース管理 + X/Discord自動通知 |
| `miyabi voice` | 音声駆動モード |
| `miyabi skills` | Agent Skill Bus管理 |
| `miyabi todos` | TODO/FIXME自動検出 → Issue作成 |
| `miyabi docs` | ドキュメント自動生成 |

---

## QUALITY STANDARDS

### ESLint設定
- 非同期/await型安全（floating promises禁止）
- 命名規則（camelCase/PascalCase）
- 最大行長: 120文字
- 最大関数行数: 150
- 循環的複雑度: ≤15
- 最大ネスト深度: 4
- 最大関数パラメータ: 5

### テスト戦略
| 種類 | フレームワーク | 詳細 |
|---|---|---|
| ユニット | Vitest | 30秒タイムアウト、v8カバレッジ |
| 統合 | Vitest | MCP/GitHub API検証 |
| E2E | Playwright | ブラウザ自動化、スクリーンショット、ビデオ |
| パフォーマンス | カスタム | ベースライン比較、k6フレームワーク |

---

## 自律の三法則（AGENTS.md）

1. **客観性の法則**: 感情・感傷を排除。データ駆動のみ
2. **自給自足の法則**: 人間依存最小化。目標: 人間介入率 ≤5%
3. **追跡可能性の法則**: 全アクションをGitHubに記録。完全な監査証跡

---

## 分散クラスター実行

最大5台のマシンで分散実行をサポート:
- MacBook + Windows + Mac mini ×3
- SSH/Tailscale ネットワークディスパッチ
- マシン間並列エージェント実行
- GitHub Issue 状態による協調ワークフロー
