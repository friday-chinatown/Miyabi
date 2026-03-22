# Miyabi CI/CD・インフラストラクチャ 詳細分析

## 概要

24のGitHub Actionsワークフロー、Constitutional（憲法的）ガバナンス、経済制約サーキットブレーカー、6層セキュリティスキャンによる包括的インフラ。

---

## 1. GitHub Workflows（24ワークフロー）

### 1.1 コアワークフロー

| ワークフロー | トリガー | 目的 |
|---|---|---|
| `ai-auto-label.yml` | Issue opened | Claude AIによる53ラベル自動分類 |
| `autonomous-agent.yml` | Issue labeled/commented, manual | コア自律エージェント実行 |
| `state-machine.yml` | Issue/PR lifecycle | ラベルベース状態遷移管理 |
| `webhook-handler.yml` | 全GitHubイベント | 中央イベントルーター |

### 1.2 自律エージェント実行 (`autonomous-agent.yml`)

**トリガー条件**:
- Issue に `🤖agent-execute` ラベル追加
- コメントに `/agent` コマンド
- manual workflow_dispatch

**実行フロー**:
1. check-trigger → should_execute判定
2. 依存関係インストール、TypeScript型チェック
3. `.env` 作成
4. `npm run agents:parallel:exec --concurrency 3`
5. コード変更検出
6. フィーチャーブランチ作成: `agent/issue-{number}-{timestamp}`
7. ドラフトPR作成（実行レポート付き）
8. ラベル追加: `🤖agent-generated`, `automated`, `needs-review`
9. 失敗時: `🚨escalated`, `❌agent-failed` ラベル

### 1.3 ステートマシン (`state-machine.yml`)

**状態フロー**:
```
pending → analyzing → implementing → reviewing → done
              ↓
          blocked/paused
```

**ジョブ**:
- `initial-triage` - 新Issue: `pending`割り当て、優先度自動検出
- `coordinator-assignment` - `agent:coordinator`ラベル → `pending→analyzing`
- `specialist-assignment` - `agent:codegen`等 → `analyzing→implementing`
- `pr-created` - PR opened → `implementing→reviewing`
- `pr-merged` - PR merged → `reviewing→done`
- `blocked-escalation` - `state:blocked` → エスカレーション

### 1.4 CI/CDワークフロー

| ワークフロー | 目的 |
|---|---|
| `integrated-system-ci.yml` | 5段階CI: lint→typecheck→unit→e2e→build |
| `cli-cross-platform.yml` | 3OS×2Node版テスト（6並行） |
| `docker-build.yml` | マルチプラットフォームDocker（amd64/arm64） |
| `auto-release.yml` | バージョンタグ → npm publish + GitHub Release |
| `npm-publish.yml` | npm公開 + OIDC署名 |

### 1.5 セキュリティワークフロー

| ワークフロー | 頻度 | 内容 |
|---|---|---|
| `security-audit.yml` | 毎日+push/PR | 6層セキュリティスキャン |
| `codeql.yml` | 毎週月曜 | 静的セキュリティ分析 |
| `gitleaks.yml` | push/PR | シークレット検出 |

**6層セキュリティ**:
1. `npm audit` - 依存関係脆弱性
2. Gitleaks - シークレットスキャン
3. カスタムスキャナー - security-manager.ts
4. CodeQL - 静的分析（security-extended）
5. SBOM生成 - サプライチェーン
6. OpenSSF Scorecard - ベストプラクティス

### 1.6 その他のワークフロー

| ワークフロー | 目的 |
|---|---|
| `commit-to-issue.yml` | `#auto`タグ付きコミット → Issue自動作成 |
| `label-sync.yml` | labels.yml → GitHub同期 |
| `mcp-health-check.yml` | MCP サーバーヘルスチェック（毎日） |
| `snapshot-test.yml` | スナップショットテスト一貫性検証 |

---

## 2. カスタムGitHub Action

### agent-executor (`actions/agent-executor/action.yml`)

**入力（10パラメータ）**:
- `agent` - エージェント名（必須）
- `issue-number` - Issue番号
- `timeout` - タイムアウト（デフォルト30分）
- `retry-attempts` - リトライ回数（デフォルト3）
- `escalate-on-failure` - 失敗時エスカレーション（デフォルトtrue）
- `use-docker` - Docker実行（デフォルトfalse）

**出力**: status, message, duration-ms, artifacts-path, report-url

---

## 3. Constitutional（憲法的）ガバナンス

### AGENTS.md v5.0 "The Final Mandate"

**自律の三法則**:

| 法則 | 内容 | 実装 |
|---|---|---|
| 客観性の法則 | データ駆動判断のみ | 品質スコア0-100、合格≥80 |
| 自給自足の法則 | 人間介入最小化 | エスカレーション率≤5%目標 |
| 追跡可能性の法則 | 全アクション記録 | `.ai/logs/YYYY-MM-DD.md` |

### GUARDIAN.md

**Guardian**: ShunsukeHayashi (@ShunsukeHayashi)

**エスカレーション基準**:
| 重大度 | 対応時間 | 例 |
|---|---|---|
| Critical (Sev.1) | 24時間 | サーキットブレーカー発動、セキュリティ侵害 |
| Constitutional | 7日 | 法則改正提案 |
| Budget | 即時 | コスト緊急閾値接近 |

### WORKFLOW_RULES.md

**大原則**: 「全てはIssueから始まる。例外なし。」

**3つの戒律**:
1. **Issue-Driven Development (IDD)** - Issue → 計画 → 承認 → 実装
2. **Log-Driven Development (LDD)** - 全てログ記録
3. **Zero Surprise原則** - サイレント変更禁止

---

## 4. ラベルシステム（50+ラベル×10カテゴリ）

| カテゴリ | 数 | 例 |
|---|---|---|
| State | 8 | pending, analyzing, implementing, reviewing, done, blocked |
| Agent | 6 | coordinator, codegen, review, issue, pr, deployment |
| Priority | 4 | P0-Critical, P1-High, P2-Medium, P3-Low |
| Type | 7 | feature, bug, docs, refactor, test, architecture, deployment |
| Severity | 4 | Sev.1-Critical, Sev.2-High, Sev.3-Medium, Sev.4-Low |
| Phase | 5 | planning, implementation, testing, deployment, monitoring |
| Special | 7 | security, cost-watch, dependencies, experiment |
| Trigger | 4 | agent-execute, generate-report, deploy-staging, deploy-production |
| Quality | 4 | excellent(90+), good(80-89), needs-improvement(60-79), poor(<60) |
| Community | 4 | good-first-issue, help-wanted, question, discussion |

---

## 5. Docker インフラ

### Dockerfile（マルチステージ）

| ステージ | ベース | 内容 |
|---|---|---|
| base | node:20-alpine | git, openssh, ca-certificates |
| deps | base | pnpm 9, production deps only |
| builder | base | 全deps + ビルド |
| runtime | base | 非rootユーザー(miyabi:1001), 最小成果物 |

**セキュリティ**: 非root実行、Alpine基盤、production deps only

### Docker Compose

| サービス | プロファイル | リソース |
|---|---|---|
| miyabi-agent | デフォルト | CPU:2.0/0.5, RAM:2GB/512MB |
| postgres:16-alpine | `with-database` | - |
| redis:7-alpine | `with-cache` | - |
| context-api | `context-engineering` | Ports: 8888, 9001 |

---

## 6. 経済ガバナンス（サーキットブレーカー）

```yaml
monthly_budget_usd: 500
  anthropic_api: 400 (10M tokens/month)
  github_actions: 0 (無料枠)
  firebase: 100

thresholds:
  warning: 80% → アラート
  emergency: 150% → ワークフロー自動停止
```

**緊急時**:
- agent-runner, continuous-improvement, agent-onboarding を自動無効化
- Sev.1-Critical エスカレーションIssue作成
- 復旧にはGuardian承認 + 根本原因分析 + リソースクリーンアップ必要

---

## 7. スクリプトディレクトリ

```
scripts/
├── cicd/           - webhook-router, cicd-integration, performance-optimizer
├── github/         - ai-label-issue, github-project-api, knowledge-base-sync
├── operations/     - agentic, parallel-executor, label-state-machine, workflow-orchestrator
├── security/       - security-manager, security-report
├── reporting/      - weekly-report, realtime-metrics, performance-report
└── setup/          - github-token, github-project, parallel-checks
```

---

## 8. シークレット管理

| シークレット | 用途 | ローテーション |
|---|---|---|
| GITHUB_TOKEN | GitHub API | ワークフロー毎自動 |
| ANTHROPIC_API_KEY | Claude API | 手動 |
| NPM_TOKEN | npm公開 | 手動(45日) |
| X_BEARER_TOKEN | Twitter/X | 手動 |
| GEMINI_API_KEY | Google Gemini | 手動 |

---

## 9. 監視・ヘルスチェック

- MCP サーバー: 毎日ヘルスチェック + 障害時Issue自動作成
- エージェント: コンプライアンステスト
- ワークフロー: 失敗検出 → Guardian通知
- Docker: コンテナヘルスチェック（30秒間隔）
