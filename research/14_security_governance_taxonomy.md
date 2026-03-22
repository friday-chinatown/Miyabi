# Miyabi セキュリティ & ガバナンス タクソノミー

**文書バージョン**: 1.0
**対象**: Miyabi Autonomous AI Development Platform
**分析日**: 2026-03-21
**分類**: 包括的セキュリティ・ガバナンスアーキテクチャ参照文書

---

## 目次

1. [セキュリティアーキテクチャ全体像](#1-セキュリティアーキテクチャ全体像)
2. [認証・認可体系](#2-認証認可体系)
3. [Constitutional ガバナンス](#3-constitutional-ガバナンス)
4. [経済ガバナンス](#4-経済ガバナンス)
5. [コード品質ゲート](#5-コード品質ゲート)
6. [依存関係セキュリティ](#6-依存関係セキュリティ)
7. [コンテナセキュリティ](#7-コンテナセキュリティ)
8. [MCPサーバーセキュリティ](#8-mcpサーバーセキュリティ)

---

## 1. セキュリティアーキテクチャ全体像

### 1.1 6層セキュリティスキャン体系

Miyabiは `security-audit.yml` ワークフロー（毎日 + push/PR時トリガー）により、6層の多層防御（Defense-in-Depth）セキュリティスキャン体系を実装する。

| 層 | スキャン名 | ツール/手法 | 対象 | 検出範囲 |
|---|---|---|---|---|
| **Layer 1** | 依存関係脆弱性スキャン | `npm audit` | package.json / pnpm-lock.yaml | CVE登録済み脆弱性、既知の依存関係リスク |
| **Layer 2** | シークレットスキャン | Gitleaks | 全ソースコード、コミット履歴 | APIキー、トークン、パスワード、秘密鍵のハードコード |
| **Layer 3** | カスタムセキュリティスキャナー | `security-manager.ts` | アプリケーションコード | プロジェクト固有のセキュリティパターン違反 |
| **Layer 4** | 静的セキュリティ分析 | CodeQL (`security-extended`) | TypeScript/JavaScript | OWASP Top 10パターン、CWE分類脆弱性 |
| **Layer 5** | SBOM生成 | サプライチェーン分析 | 全依存関係ツリー | ソフトウェア部品表（Software Bill of Materials） |
| **Layer 6** | ベストプラクティス評価 | OpenSSF Scorecard | リポジトリ全体 | セキュリティベストプラクティス準拠度 |

**実行スケジュール**:
- `security-audit.yml`: 毎日自動 + push/PR時
- `codeql.yml`: 毎週月曜日（`security-extended` クエリスイート）
- `gitleaks.yml`: 全push/PRイベント

**脆弱性対応SLA**: 48時間以内の対応を必須とする。

### 1.2 入力バリデーション体系（CWE-22対策）

CLI パッケージ (`packages/cli/src/setup/validation.ts`) に実装された包括的入力バリデーション。CWE-22（Path Traversal）を主軸に、複数のCWEパターンに対応する。

#### 1.2.1 パスバリデーション (`validateProjectPath`)

| チェック項目 | 対策 | 対応CWE |
|---|---|---|
| 絶対パス必須 | `path.isAbsolute()` | CWE-22 |
| パストラバーサル検出 | `path.normalize()` で `..` を検出 | CWE-22 |
| NULLバイトインジェクション | `\0` 文字の存在チェック | CWE-158 |
| シンボリックリンク攻撃 | `path.resolve()` と `path.normalize()` の一致検証 | CWE-59 |

#### 1.2.2 ファイルパスバリデーション (`validateFilePath`)

| チェック項目 | 実装 | 目的 |
|---|---|---|
| 絶対パス強制 | `path.isAbsolute()` | 相対パス攻撃防止 |
| NULLバイト排除 | `includes('\0')` チェック | パスインジェクション防止 |
| ベースディレクトリ制約 | `resolvedPath.startsWith(normalizedBase)` | サンドボックス逸脱防止 |
| パストラバーサル検出 | `normalized.includes('..')` | ディレクトリトラバーサル防止 |

#### 1.2.3 ファイルサイズバリデーション (`validateFileSize`)

- **最大ファイルサイズ制限**: 10MB（デフォルト）
- **ゼロバイトファイル検出**: 空ファイルの拒否
- **ディレクトリ誤指定検出**: `stats.isDirectory()` チェック

#### 1.2.4 ファイルコンテンツバリデーション (`validateFileContent`)

| チェック項目 | 制限値 | 目的 |
|---|---|---|
| NULLバイト排除 | 0個 | バイナリコンテンツ/インジェクション防止 |
| 制御文字排除 | `\x00-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F`, `\x7F` | 不正制御文字防止 |
| 最大行長制限 | 10,000文字 | DoS攻撃防止（極端に長い行） |
| 最大コンテンツサイズ | 10MB | メモリ枯渇攻撃防止 |

#### 1.2.5 シンボリックリンクバリデーション (`validateSymlink`)

- `fs.lstatSync()` によるシンボリックリンク検出（`follow` しない）
- 通常ファイルまたはディレクトリ以外の拒否
- シンボリックリンク攻撃（CWE-59）の完全防止

#### 1.2.6 GitHub パラメータバリデーション

| 関数 | 対象 | 制約 | セキュリティ目的 |
|---|---|---|---|
| `validateGitHubOwner` | ユーザー名 | 39文字、英数字+ハイフン、先頭/末尾ハイフン禁止 | インジェクション防止 |
| `validateGitHubRepo` | リポジトリ名 | 100文字、英数字+ハイフン+アンダースコア+ドット | パストラバーサル防止 |
| `validateGitHubToken` | トークン | 40文字以上、`ghp_`/`github_pat_`/`gho_`/`ghu_`/`ghs_`/`ghr_` プレフィックス必須 | 偽トークン防止 |
| `validateProjectName` | プロジェクト名 | 100文字、英数字+ハイフン+アンダースコア+スペース | テンプレートインジェクション防止 |

**トークンフォーマット検証**:

| プレフィックス | トークンタイプ | 用途 |
|---|---|---|
| `ghp_` | Personal Access Token (classic) | 汎用GitHub操作 |
| `github_pat_` | Fine-grained PAT | 細粒度権限制御 |
| `gho_` | OAuth | OAuth認証フロー |
| `ghu_` | User-to-server | GitHub Apps |
| `ghs_` | Server-to-server | GitHub Apps |
| `ghr_` | Refresh Token | トークンリフレッシュ |

追加チェック: 制御文字（`\x00-\x1F`, `\x7F`）、ホワイトスペース（スペース、改行、タブ）の排除。トークン値はエラーメッセージで `[REDACTED]` として表示し、ログへの漏洩を防止。

#### 1.2.7 テンプレート変数サニタイズ (`sanitizeTemplateVariable`)

- **許可文字**: 英数字、スペース、ドット、アンダースコア、ハイフンのみ
- **最大長**: 200文字（デフォルト）
- **過剰除去検出**: 50%以上の文字が除去された場合はインジェクション試行と判断し拒否
- **空文字検出**: サニタイズ後の空文字列を拒否

### 1.3 シークレット管理

#### 1.3.1 トークン取得優先度

Miyabiは以下の優先度順でGitHubトークンを解決する:

| 優先度 | ソース | 方式 | 推奨用途 |
|---|---|---|---|
| **1 (最優先)** | `gh` CLI | `gh auth token` で自動取得・ローテーション | 開発環境（推奨） |
| **2** | 環境変数 | `GITHUB_TOKEN` 環境変数 | CI/CD環境 |
| **3** | `.env` ファイル | `dotenv` による読み込み | ローカル開発フォールバック |
| **4** | OAuth Device Flow | インタラクティブブラウザ認証 | 初回セットアップ |

#### 1.3.2 GitHub Actions シークレット管理

| シークレット名 | 用途 | ローテーション方針 |
|---|---|---|
| `GITHUB_TOKEN` | GitHub API | ワークフロー毎に自動生成（`${{ secrets.GITHUB_TOKEN }}`） |
| `ANTHROPIC_API_KEY` | Claude API (Sonnet 4) | 手動ローテーション |
| `NPM_TOKEN` | npm公開 + OIDC署名 | 45日手動ローテーション |
| `X_BEARER_TOKEN` | Twitter/X 通知 | 手動ローテーション |
| `GEMINI_API_KEY` | Google Gemini API | 手動ローテーション |

#### 1.3.3 シークレット検出

- **Gitleaks統合**: 全push/PRイベントでコミット内のシークレットをスキャン
- **カスタムスキャナー**: `security-manager.ts` による追加パターン検出
- **IssueAgent検証**: Issue分析時に `eval`, `exec`, `sudo`, 外部パス、シークレット含有を検証
- **品質基準**: コードにシークレットなし（ReviewAgent品質ゲートの必須条件）

### 1.4 OWASP Top 10 対策マッピング

| OWASP ID | 脆弱性カテゴリ | Miyabiでの対策 |
|---|---|---|
| **A01:2021** | Broken Access Control | CODEOWNERS、Guardian制度、PR承認ポリシー |
| **A02:2021** | Cryptographic Failures | 認証情報パーミッション 0o600、GitHub Secrets暗号化 |
| **A03:2021** | Injection | 入力バリデーション体系、`sanitizeShellArg()`、テンプレートサニタイズ |
| **A04:2021** | Insecure Design | Constitutional三法則、WORKFLOW_RULES三戒律 |
| **A05:2021** | Security Misconfiguration | `miyabi doctor` ヘルスチェック、OpenSSF Scorecard |
| **A06:2021** | Vulnerable Components | pnpm overrides、Dependabot、npm audit、SBOM |
| **A07:2021** | Authentication Failures | OAuth Device Flow、トークンフォーマット検証、スコープ検証 |
| **A08:2021** | Software and Data Integrity | CodeQL静的分析、OIDC署名（npm publish）、SHA256チェックサム |
| **A09:2021** | Security Logging and Monitoring | LDD（Log-Driven Development）、追跡可能性の法則、`.ai/logs/` |
| **A10:2021** | Server-Side Request Forgery | ホスト名バリデーション、DNS互換性チェック、ドメインホワイトリスト |

---

## 2. 認証・認可体系

### 2.1 GitHub OAuth Device Flow

Miyabiは GitHub OAuth Device Flow を使用したインタラクティブ認証を実装する。

**OAuth App 設定**:
- **CLIENT_ID**: `Ov23liiMr5kSJLGJFNyn`
- **認証方式**: Device Authorization Grant (RFC 8628)

**認証フロー**:

```
1. CLI → GitHub: デバイスコード要求
        POST https://github.com/login/device/code
        client_id=Ov23liiMr5kSJLGJFNyn&scope=repo,workflow

2. GitHub → CLI: user_code + verification_uri 返却
        user_code: "ABCD-1234"
        verification_uri: "https://github.com/login/device"

3. CLI → ユーザー: user_code表示 + ブラウザ自動オープン
        open(verification_uri)

4. ユーザー → GitHub: ブラウザでuser_code入力・承認

5. CLI → GitHub: アクセストークンポーリング
        POST https://github.com/login/oauth/access_token
        client_id=...&device_code=...&grant_type=urn:ietf:params:oauth:grant-type:device_code

6. GitHub → CLI: アクセストークン返却

7. CLI: スコープ検証 → トークン保存
```

### 2.2 トークンスコープ要件

| スコープ | 権限 | 必要な操作 |
|---|---|---|
| `repo` | リポジトリ全アクセス | Issue/PR作成・更新、コード読み書き、ブランチ操作 |
| `workflow` | GitHub Actionsワークフロー管理 | ワークフローファイルのデプロイ、実行トリガー |
| `read:project` | Projects V2 読み取り | プロジェクトボード表示、メトリクス取得 |
| `write:project` | Projects V2 書き込み | カスタムフィールド更新、アイテム追加 |

**スコープ検証**: トークン取得後、必要スコープの存在を検証。不足スコープがある場合はエラー返却。

### 2.3 認証情報保存

**保存場所**: `~/.miyabi/credentials.json`

**ファイルパーミッション**: `0o600`（所有者のみ読み書き可能）

**保存情報**:
- アクセストークン
- トークンタイプ
- スコープ一覧
- 取得タイムスタンプ

**セキュリティ考慮事項**:
- ホームディレクトリ配下の隠しディレクトリに格納
- UNIX パーミッションモデルによるアクセス制御
- トークンはプレーンテキスト保存（OS レベルの保護に依存）
- `.gitignore` パターンによるバージョン管理除外

### 2.4 非インタラクティブモード（CI/CD）

CI/CD環境での認証は環境変数ベースで動作する:

```bash
export GITHUB_TOKEN=ghp_xxx          # 必須
export MIYABI_JSON=1                 # JSON出力強制
export MIYABI_AUTO_YES=1             # プロンプト自動スキップ
```

**CI/CD用コマンドフラグ**:
- `--json`: 構造化JSON出力
- `--yes` / `-y`: 確認プロンプト自動承認
- `--non-interactive`: インタラクティブUI完全無効化

**エラーコード体系**（自動化対応）:

| 終了コード | 定数名 | 意味 | 自動復旧 |
|---|---|---|---|
| 0 | `SUCCESS` | 正常完了 | - |
| 1 | `GENERAL_ERROR` | 不明エラー | 不可 |
| 2 | `CONFIG_ERROR` | `GITHUB_TOKEN` 未設定/無効設定 | `miyabi auth login` |
| 3 | `VALIDATION_ERROR` | 無効な引数 | 引数修正 |
| 4 | `NETWORK_ERROR` | GitHub API到達不可 | リトライ |
| 5 | `AUTH_ERROR` | 認証失敗、無効トークン | 再認証 |

### 2.5 アクセス制御モデル

#### 2.5.1 CODEOWNERS

```
# 全ファイルのデフォルトオーナー
*  @ShunsukeHayashi

# エージェントコード、スクリプト、ワークフロー、セキュリティ、
# ドキュメント、設定すべて @ShunsukeHayashi
```

全ファイルが単一のGuardian（@ShunsukeHayashi）の所有下にあり、PRマージには所有者のレビュー承認が必須。

#### 2.5.2 エージェント権限レベル

| 権限色 | レベル | 並列実行 | エージェント数 | 権限内容 |
|---|---|---|---|---|
| 🔴 赤 | リーダー（統括） | 不可 | 2 | 戦略的意思決定、エスカレーション権限 |
| 🟢 緑 | 実行役 | 可能 | 12 | コード生成、テスト実行、コンテンツ作成 |
| 🔵 青 | 分析役 | 可能 | 5 | Issue分析、品質レビュー、データ分析 |
| 🟡 黄 | サポート（条件付き） | 条件付き | 3 | PR作成（レビュー合格後）、デプロイ（承認後） |

#### 2.5.3 デプロイ権限

| 環境 | デプロイ方式 | 承認要件 |
|---|---|---|
| Staging | 自動デプロイ | ReviewAgent 80点以上 |
| Production | Guardian承認必須 | Guardian手動承認 + ReviewAgent 80点以上 + 全テスト合格 |

---

## 3. Constitutional ガバナンス

### 3.1 AGENTS.md v5.0 "The Final Mandate" - 自律の三法則

Miyabiの全エージェント運用を律する最上位ガバナンス文書。

| 法則 | 正式名称 | 内容 | 実装メカニズム | 違反時の影響 |
|---|---|---|---|---|
| **第一法則** | 客観性の法則 | 感情・感傷を排除。データ駆動判断のみ | 品質スコア 0-100（閾値 ≥80）、メトリクス収集 | 品質ゲート不合格 |
| **第二法則** | 自給自足の法則 | 人間依存最小化 | エスカレーション率 ≤5% 目標、Auto-Retry Loop | エスカレーション発生 |
| **第三法則** | 追跡可能性の法則 | 全アクションをGitHubに記録 | `.ai/logs/YYYY-MM-DD.md`、LDD、GitHub Issue/PR記録 | 監査証跡不完全 |

### 3.2 Guardian制度

**Guardian**: Shunsuke Hayashi (@ShunsukeHayashi)

Guardianは Miyabi システムの最高権限保持者であり、以下の専権事項を持つ:

| 権限領域 | 具体的権限 |
|---|---|
| **コード所有権** | CODEOWNERS による全ファイルの最終レビュー権限 |
| **PR承認** | 全PRのマージ承認/拒否権（エージェント生成PRを含む） |
| **予算管理** | サーキットブレーカー復旧の承認権 |
| **Constitutional改正** | 三法則の改正提案の最終承認 |
| **エスカレーション対応** | Sev.1/Critical エスカレーションの最終対応責任 |
| **本番デプロイ承認** | Production環境へのデプロイ最終承認 |

### 3.3 エスカレーション基準

| 重大度 | 分類 | 対応時間 | トリガー例 | 対応プロセス |
|---|---|---|---|---|
| **Sev.1 Critical** | 緊急 | **24時間** | サーキットブレーカー発動、セキュリティ侵害、システム全停止 | Guardian即時通知 → 根本原因分析 → 修正 → 復旧承認 |
| **Constitutional** | 制度的 | **7日** | 三法則改正提案、ガバナンス構造変更 | 提案Issue作成 → Guardian審査 → 承認/棄却 |
| **Budget** | 経済的 | **即時** | コスト緊急閾値（150%）接近 | ワークフロー自動停止 → Guardian通知 → 復旧承認 |
| **Technical** | 技術的 | 状況依存 | アーキテクチャ決定、セキュリティ問題 | TechLead相談 → Guardian最終承認 |
| **Requirements** | 要件的 | 状況依存 | 不明確な要件、スコープ拡大 | PO（Product Owner）相談 |

**エスカレーションフロー**:

```
Specialist Agent → CoordinatorAgent → TechLead → Guardian
                                                    ↓
                                              最終意思決定
```

### 3.4 WORKFLOW_RULES.md 三戒律

| 戒律 | 正式名称 | 原則 | 実装 |
|---|---|---|---|
| **第一戒** | Issue-Driven Development (IDD) | 「全てはIssueから始まる。例外なし。」 | Issue → 計画 → 承認 → 実装の順序強制 |
| **第二戒** | Log-Driven Development (LDD) | 全てログ記録 | `.ai/logs/YYYY-MM-DD.md` への全アクション記録 |
| **第三戒** | Zero Surprise原則 | サイレント変更禁止 | 全変更のGitHub記録、通知、レビュー要求 |

**IDD ワークフロー**:
```
Issue作成 → Label自動分類(53ラベル) → タスク分解(DAG) → 実装 → レビュー → PR → デプロイ → Close
```

### 3.5 ラベルベースステートマシン

53ラベル x 10カテゴリによる状態管理:

```
pending → analyzing → implementing → reviewing → done
              ↓
          blocked/paused
```

| カテゴリ | ラベル数 | 代表例 |
|---|---|---|
| State | 8 | `pending`, `analyzing`, `implementing`, `reviewing`, `done`, `blocked` |
| Agent | 6 | `agent:coordinator`, `agent:codegen`, `agent:review` |
| Priority | 4 | `P0-Critical`, `P1-High`, `P2-Medium`, `P3-Low` |
| Type | 7 | `feature`, `bug`, `docs`, `refactor`, `test` |
| Severity | 4 | `Sev.1-Critical`, `Sev.2-High`, `Sev.3-Medium`, `Sev.4-Low` |
| Phase | 5 | `planning`, `implementation`, `testing`, `deployment`, `monitoring` |
| Special | 7 | `security`, `cost-watch`, `dependencies`, `experiment` |
| Trigger | 4 | `🤖agent-execute`, `generate-report`, `deploy-staging`, `deploy-production` |
| Quality | 4 | `excellent(90+)`, `good(80-89)`, `needs-improvement(60-79)`, `poor(<60)` |
| Community | 4 | `good-first-issue`, `help-wanted`, `question`, `discussion` |

**状態遷移ルール**: 28のルールにより有効な状態遷移を厳密に定義（`state-machine.yml` ワークフロー）。

---

## 4. 経済ガバナンス

### 4.1 BUDGET.yml 予算制約

```yaml
monthly_budget_usd: 500

cost_allocation:
  anthropic_api: 400 USD    # Claude Sonnet 4 (10M tokens/month)
  github_actions: 0 USD     # 無料枠使用
  firebase: 100 USD         # Hosting/Functions
```

### 4.2 サーキットブレーカーパターン

経済的暴走を防止する自動制御メカニズム:

| 閾値 | レベル | トリガー条件 | 自動アクション |
|---|---|---|---|
| **80%** | 警告 (Warning) | 月額 $400 到達 | アラート送信、コスト監視強化 |
| **100%** | 上限 (Limit) | 月額 $500 到達 | 新規タスク投入停止 |
| **150%** | 緊急 (Emergency) | 月額 $750 到達 | ワークフロー自動停止、Sev.1エスカレーション |

### 4.3 緊急時自動停止ワークフロー

150%閾値超過時に自動無効化されるワークフロー:

| 無効化対象 | 理由 |
|---|---|
| `agent-runner` | エージェント実行によるAPI消費停止 |
| `continuous-improvement` | 継続的改善ループの一時停止 |
| `agent-onboarding` | 新規エージェントオンボーディング停止 |

### 4.4 復旧プロトコル

サーキットブレーカー発動後の復旧には以下の3条件が必須:

| ステップ | 責任者 | 内容 |
|---|---|---|
| **1. Guardian承認** | @ShunsukeHayashi | 復旧の最終承認 |
| **2. 根本原因分析** | 技術チーム | コスト超過の原因特定と再発防止策 |
| **3. リソースクリーンアップ** | 技術チーム | 不要リソースの解放、設定見直し |

### 4.5 コスト追跡メトリクス

GitHub Projects V2 のカスタムフィールドによるコスト追跡:

| フィールド | タイプ | 用途 |
|---|---|---|
| `Cost` | NUMBER | タスク毎のAPIコスト（USD） |
| `Duration` | NUMBER | 実行時間（ms） |

**エージェント毎コスト制約**: `cost_per_task < $0.10`、`token_usage < 50K`

**週次レポート**: `generateWeeklyReport()` による自動集計:
- エージェント別実行回数、平均コスト、合計コスト
- 品質スコア上位Issue一覧
- 完了率、平均品質スコア

---

## 5. コード品質ゲート

### 5.1 ReviewAgent 100点スコアリングシステム

ReviewAgent（めだまん）による品質評価は100点満点のスコアリングで実施される。

**スコア計算公式**:

```
score = type_safety * 0.30
      + test_coverage * 0.30
      + lint_compliance * 0.20
      + docs * 0.20
```

**代替スコアリング（スキルベース）**:

```
score = correctness * 0.25
      + security * 0.20
      + performance * 0.15
      + readability * 0.15
      + maintainability * 0.15
      + test_coverage * 0.10
```

**グレード判定**:

| グレード | スコア範囲 | アクション |
|---|---|---|
| Excellent | 90-100 | PR作成許可、ラベル `quality:excellent` |
| Good | 80-89 | PR作成許可、ラベル `quality:good` |
| Fair / Needs Improvement | 60-79 | Auto-Retry Loop発動、ラベル `quality:needs-improvement` |
| Poor (エスカレーション) | 40-59 | エスカレーション、ラベル `quality:poor` |
| Block | 0-39 | 即時ブロック、人間介入必須 |

### 5.2 セキュリティスコアリング（SecurityValidator）

動的コード生成の安全性を `SecurityValidator` クラスで検証:

**危険パターン検出（重大度順）**:

| パターン | SecurityIssueType | 重大度 | 検出対象 |
|---|---|---|---|
| `eval()` | `EVAL_USAGE` | 100 (Critical) | 任意コード実行 |
| `new Function()` | `ARBITRARY_CODE` | 100 (Critical) | 任意コード実行 |
| `exec()`/`spawn()` 等 | `CHILD_PROCESS` | 95 (Critical) | コマンドインジェクション |
| Prototype pollution | `PROTOTYPE_POLLUTION` | 85 (High) | プロトタイプ汚染 |
| Dynamic `require()` | `REQUIRE_DYNAMIC` | 80 (High) | 任意モジュールロード |
| `writeFile()` 等 | `FILE_SYSTEM_WRITE` | 75 (High) | 不正ファイル書き込み |
| Global modification | `GLOBAL_MODIFICATION` | 70 (Medium) | グローバルオブジェクト改変 |
| `process.env` アクセス | `ENVIRONMENT_ACCESS` | 65 (Medium) | 環境変数漏洩 |
| `fetch()`/`axios()` 等 | `NETWORK_REQUEST` | 60 (Medium) | 不正ネットワーク通信 |

**安全判定**: `maxSeverity < 90` の場合のみ安全と判定。
**セキュリティスコア**: `100 - (平均重大度 * (0.5 + 0.5 * min(issue数/5, 1)))`

**機能**:
- `validate(code)`: セキュリティ問題の検出と一覧化
- `validateOrThrow(code)`: Critical問題検出時に例外スロー
- `getSecurityScore(code)`: 0-100のセキュリティスコア算出
- `sanitize(code)`: 危険パターンの自動除去（`eval()`, `new Function()`, `exec()` 等）
- `generateReport(code)`: 重大度別セキュリティレポート生成

### 5.3 ESLint / TypeScript Strict / テストカバレッジ

**ESLint設定**:

| ルール | 設定値 | 目的 |
|---|---|---|
| floating promises | 禁止 | 非同期/await型安全 |
| 命名規則 | camelCase / PascalCase | コード一貫性 |
| 最大行長 | 120文字 | 可読性 |
| 最大関数行数 | 150行 | 関数分割促進 |
| 循環的複雑度 | ≤15 | 複雑度制限 |
| 最大ネスト深度 | 4 | 読みやすさ |
| 最大関数パラメータ | 5 | インターフェース簡素化 |

**TypeScript Strict モード**: 全strict チェック有効（`strict: true`）、ターゲット ES2022、モジュール NodeNext。

**テストカバレッジ要件**:

| メトリクス | 閾値 | フレームワーク |
|---|---|---|
| Statements | 80% | Vitest + v8 coverage |
| Branches | 80% | Vitest + v8 coverage |
| Functions | 80% | Vitest + v8 coverage |
| Lines | 80% | Vitest + v8 coverage |

### 5.4 Auto-Retry Loop（最大3回）

品質ゲート不合格時の自動フィードバックループ:

```
CodeGenAgent → ReviewAgent (スコア 0-100)
                    ↓ [≥80? → Yes] → PRAgent (PR作成)
                    ↓ [<80? → No]
                    ↓
              フィードバック → CodeGenAgent（修正コード生成）
                    ↓
              ReviewAgent（再評価）
                    ↓ [最大3回リトライ]
                    ↓
              まだ不合格? → 人間にエスカレーション
                           ラベル: 🚨escalated, ❌agent-failed
```

**リトライ設定**:
- `retries`: 3
- `minTimeout`: 1000ms
- `maxTimeout`: 4000ms
- `factor`: 2（指数バックオフ）
- `randomize`: true（ジッター付き）

### 5.5 PR承認ポリシー

| 条件 | 必須/任意 | 内容 |
|---|---|---|
| ReviewAgent スコア ≥80 | 必須 | 自動品質ゲート通過 |
| TypeScript strict通過 | 必須 | 型安全性確認 |
| ESLint 0エラー | 必須 | コード品質確認 |
| 全テスト合格 | 必須 | 回帰テスト確認 |
| コードにシークレットなし | 必須 | セキュリティ確認 |
| Guardian レビュー承認 | 必須 | @ShunsukeHayashi の承認 |
| セキュリティスキャン通過 | 必須（本番デプロイ時） | 6層セキュリティスキャン |

**ブランチ命名規則**: `{type}/{issue_number}-{description}`
- 例: `feat/123-add-auth`, `fix/456-resolve-crash`

**コミット形式**: Conventional Commits (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `perf`, `style`)

---

## 6. 依存関係セキュリティ

### 6.1 pnpm overrides（脆弱性パッチ）

既知の脆弱性に対する強制バージョン固定:

| パッケージ | 脆弱バージョン | 修正バージョン | 脆弱性タイプ |
|---|---|---|---|
| `minimatch` | `<3.1.4` | `3.1.4` | DoS（正規表現）脆弱性 |
| `flatted` | `<=3.4.1` | `3.4.2` | オブジェクトインジェクション |
| `glob` | `>=10.2.0 <10.5.0` | `10.5.0` | パフォーマンス（DoS関連） |

`pnpm-workspace.yaml` および `package.json` の `pnpm.overrides` フィールドで管理。

### 6.2 Dependabot 自動更新

GitHub Dependabot による自動依存関係更新:
- 脆弱性アラート → 自動PR作成
- セマンティックバージョニングに基づく互換性評価
- CI/CDパイプラインによる自動テスト実行

### 6.3 ライセンスチェック

**許可ライセンス一覧**:

| ライセンス | SPDX ID | 商用利用 |
|---|---|---|
| MIT License | `MIT` | 可 |
| Apache License 2.0 | `Apache-2.0` | 可 |
| BSD 3-Clause | `BSD-3-Clause` | 可 |
| ISC License | `ISC` | 可 |

Miyabi自体は **Apache License 2.0** で配布。依存関係のライセンスが上記に含まれない場合は手動レビュー対象。

### 6.4 SBOM（Software Bill of Materials）生成

6層セキュリティスキャンの Layer 5 として SBOM を自動生成:
- 全依存関係ツリーの完全な部品表
- サプライチェーン攻撃の検出・追跡
- 規制コンプライアンス（EO 14028等）への対応基盤

### 6.5 npm パッケージ公開セキュリティ

| 保護機能 | 実装 |
|---|---|
| OIDC署名 | `npm-publish.yml` による署名付き公開 |
| SHA256チェックサム | リリースバイナリの整合性検証 |
| NPM_TOKEN管理 | GitHub Secrets、45日ローテーション |

---

## 7. コンテナセキュリティ

### 7.1 非rootユーザー実行

```dockerfile
# runtime ステージ
RUN addgroup -g 1001 miyabi && \
    adduser -u 1001 -G miyabi -s /bin/sh -D miyabi

USER miyabi
```

| 設定項目 | 値 | セキュリティ効果 |
|---|---|---|
| ユーザー名 | `miyabi` | 専用サービスアカウント |
| UID | `1001` | 非特権UID（root=0を回避） |
| GID | `1001` | 専用グループ |
| シェル | `/bin/sh` | 最小シェル |
| ホームディレクトリ | 無し (`-D`) | 不要ファイル削減 |

### 7.2 Alpine最小イメージ

| ステージ | ベースイメージ | サイズ | 内容 |
|---|---|---|---|
| base | `node:20-alpine` | ~120MB | git, openssh-client, ca-certificates |
| deps | base | +依存関係 | pnpm 9, production deps only (`--frozen-lockfile --prod`) |
| builder | base | +全依存関係 | 全依存関係 + TypeScriptビルド |
| runtime | base | 最小 | 非rootユーザー、ビルド成果物のみ |

**Alpine選択理由**:
- musl libc ベースの最小Linuxディストリビューション
- 不要パッケージの排除によるアタックサーフェス最小化
- CVE対象パッケージ数の削減

### 7.3 マルチステージビルド

4ステージのマルチステージビルドにより、最終イメージに含まれるのは:

| 含まれるもの | 含まれないもの |
|---|---|
| コンパイル済みJavaScript (`dist/`) | TypeScriptソースコード |
| Production依存関係のみ | devDependencies |
| 実行に必要な設定ファイル | ビルドツール（tsc等） |
| 非rootユーザー設定 | テストファイル |

**ビルド除外**（ビルダーステージ）:
- `dashboard-server` パッケージ
- `github-projects` パッケージ

### 7.4 ヘルスチェック

**Docker Compose ヘルスチェック設定**:

| パラメータ | 値 | 意味 |
|---|---|---|
| 間隔 | 30秒 | チェック実行間隔 |
| プロトコル | HTTP/プロセス | ヘルスエンドポイント確認 |
| 失敗判定 | 連続3回失敗 | コンテナ再起動トリガー |

**リソース制約**:

| リソース | 制限値 | 予約値 |
|---|---|---|
| CPU | 2.0コア | 0.5コア |
| メモリ | 2GB | 512MB |

**ボリュームマウント**:

| ボリューム | マウントモード | 用途 |
|---|---|---|
| config | Read-Only (RO) | 設定ファイル（改竄防止） |
| logs | Read-Write | ログ出力 |
| output | Read-Write | 成果物出力 |
| agent-data | Read-Write | エージェント作業データ |

### 7.5 オプショナルサービスのセキュリティ

| サービス | プロファイル | セキュリティ考慮 |
|---|---|---|
| PostgreSQL 16-alpine | `with-database` | Alpine最小イメージ、専用ネットワーク |
| Redis 7-alpine | `with-cache` | Alpine最小イメージ、メモリ制限 |
| Context Engineering API | `context-engineering` | ポート 8888/9001 のみ公開 |

---

## 8. MCPサーバーセキュリティ

### 8.1 コマンドインジェクション防止

`packages/mcp-bundle/src/utils/security.ts` に実装された `sanitizeShellArg()` 関数:

```typescript
export function sanitizeShellArg(arg: string): string {
  if (!arg) return '';
  return arg.replace(/[;&|`$(){}[\]<>\\!#*?~\n\r]/g, '');
}
```

**除去対象文字**:

| 文字 | 攻撃ベクトル |
|---|---|
| `;` | コマンド連結 |
| `&` | バックグラウンド実行/AND演算 |
| `\|` | パイプ |
| `` ` `` | コマンド置換 |
| `$` | 変数展開 |
| `()` | サブシェル |
| `{}` | ブレース展開 |
| `[]` | グロブパターン |
| `<>` | リダイレクション |
| `\\` | エスケープ |
| `!` | 履歴展開 |
| `#` | コメント |
| `*?~` | グロブ/ホームディレクトリ展開 |
| `\n\r` | 改行インジェクション |

**使用箇所**: `commandExists()` 関数でのシステムコマンド存在確認時に適用。

### 8.2 パストラバーサル保護

`sanitizePath()` 関数による多段防御:

```typescript
export function sanitizePath(basePath: string, userPath: string): string {
  // Step 1: 絶対パス解決
  const resolved = resolve(basePath, userPath);
  const normalizedBase = resolve(basePath);

  // Step 2: ベースディレクトリ制約チェック
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error('Path traversal detected');
  }

  // Step 3: シンボリックリンク解決（ファイル存在時）
  if (existsSync(resolved)) {
    const realPath = realpathSync(resolved);
    if (!realPath.startsWith(normalizedBase)) {
      throw new Error('Symlink traversal detected');
    }
    return realPath;
  }

  return resolved;
}
```

**防御層**:

| 層 | チェック | 防御対象 |
|---|---|---|
| 1 | `resolve()` によるパス正規化 | `../` によるトラバーサル |
| 2 | `startsWith(normalizedBase)` | ベースディレクトリ外アクセス |
| 3 | `realpathSync()` | シンボリックリンクによるエスケープ |

### 8.3 シンボリックリンク攻撃防止

2箇所で実装:

**MCP Bundle (`security.ts`)**:
- `sanitizePath()` 内で `realpathSync()` により実パスを解決
- 解決後のパスがベースディレクトリ外を指す場合は `Symlink traversal detected` エラー

**CLI (`validation.ts`)**:
- `validateSymlink()` で `lstatSync()` を使用（シンボリックリンクをフォローしない）
- シンボリックリンク自体を検出して拒否
- 通常ファイルまたはディレクトリ以外のファイルタイプも拒否

### 8.4 入力長制限

DoS攻撃防止のための入力長制限:

| 入力タイプ | 最大長 | 定数名 | 目的 |
|---|---|---|---|
| クエリ文字列 | 1,000文字 | `MAX_QUERY_LENGTH` | 検索クエリDoS防止 |
| ファイルパス | 4,096文字 | `MAX_PATH_LENGTH` | パス処理DoS防止 |
| ホスト名 | 253文字 | `MAX_HOSTNAME_LENGTH` | DNS解決DoS防止 |
| PID | 1 - 4,194,304 | `LINUX_MAX_PID` | プロセスID整数オーバーフロー防止 |

### 8.5 ホスト名バリデーション

```typescript
export function isValidHostname(hostname: string): boolean {
  // 長さチェック（253文字制限）
  // IPv4アドレス検証（0-255範囲）
  // DNS互換ホスト名フォーマット検証
}
```

| 検証項目 | 許可パターン | 防御対象 |
|---|---|---|
| 長さ | ≤253文字 | バッファオーバーフロー |
| IPv4 | `(\d{1,3}\.){3}\d{1,3}` (各オクテット 0-255) | 不正IPアドレス |
| ホスト名 | `^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$` | DNS互換性 |

### 8.6 PIDバリデーション

```typescript
export function isValidPid(pid: unknown): boolean {
  if (typeof pid !== 'number') return false;
  if (!Number.isInteger(pid)) return false;
  if (pid < 1) return false;
  if (pid > LINUX_MAX_PID) return false;  // 4,194,304
  return true;
}
```

**検証項目**: 型チェック（number）→ 整数チェック → 範囲チェック（1 - 4,194,304）

### 8.7 MCPバンドルキャッシュセキュリティ

```typescript
class SimpleCache {
  get<T>(key: string): T | null  // TTL対応（デフォルト5秒）
  set<T>(key: string, data: T, ttlMs: number = 5000): void
  clear(): void
}
```

- **TTLベース有効期限**: キャッシュポイズニング攻撃の窓口を最小化（5秒デフォルト）
- **型安全**: ジェネリクスによる型安全なキャッシュアクセス

### 8.8 172ツールのセキュリティ分類

MCP Bundle の172ツールをセキュリティリスク別に分類:

| リスクレベル | カテゴリ | ツール例 | セキュリティ対策 |
|---|---|---|---|
| **High** | Process Inspector (14ツール) | `process_kill`, `process_search` | PIDバリデーション、権限チェック |
| **High** | Docker (10ツール) | `docker_run`, `docker_build` | コマンドサニタイズ |
| **High** | Database (6ツール) | `db_query`, `db_execute` | SQLインジェクション防止 |
| **Medium** | Git Inspector (19ツール) | `git_diff`, `git_log` | パスサニタイズ |
| **Medium** | File Watcher (10ツール) | `file_search`, `file_compare` | パストラバーサル防止 |
| **Medium** | Network Inspector (15ツール) | `network_ping`, `network_dns` | ホスト名バリデーション |
| **Medium** | GitHub Integration (21ツール) | `github_create_pr` | トークン認証 |
| **Low** | Resource Monitor (10ツール) | `resource_cpu`, `resource_memory` | 読み取り専用 |
| **Low** | Time Tools (4ツール) | `time_now`, `time_convert` | 入力バリデーション |
| **Low** | Calculator (3ツール) | `calc_math`, `calc_stats` | 入力バリデーション |

---

## 付録A: セキュリティ関連ファイル一覧

| ファイルパス | 役割 |
|---|---|
| `packages/cli/src/setup/validation.ts` | CLI入力バリデーション（CWE-22対策含む） |
| `packages/mcp-bundle/src/utils/security.ts` | MCPサーバーセキュリティユーティリティ |
| `packages/mcp-bundle/src/utils/validation.ts` | MCP汎用バリデーション |
| `packages/coding-agents/utils/security-validator.ts` | 動的コード生成セキュリティ検証 |
| `packages/coding-agents/review/security-scanner.ts` | コードレビューセキュリティスキャナー |
| `scripts/security/security-manager.ts` | セキュリティ管理スクリプト |
| `scripts/security/security-report.ts` | セキュリティレポート生成 |
| `.github/workflows/security-audit.yml` | 6層セキュリティスキャンワークフロー |
| `.github/workflows/codeql.yml` | CodeQL静的分析ワークフロー |
| `.github/workflows/gitleaks.yml` | シークレット検出ワークフロー |
| `AGENTS.md` | Constitutional ガバナンス（三法則） |
| `GUARDIAN.md` | Guardian制度定義 |
| `WORKFLOW_RULES.md` | ワークフロー三戒律 |
| `BUDGET.yml` | 経済ガバナンス定義 |
| `CODEOWNERS` | コード所有権定義 |

## 付録B: セキュリティテスト一覧

| テストファイル | 対象 |
|---|---|
| `packages/coding-agents/tests/security-validator-test.ts` | SecurityValidator ユニットテスト |
| `packages/mcp-bundle/tests/unit/utils/validation.test.ts` | MCP Validation ユニットテスト |
| `packages/mcp-bundle/tests/` (security 4ファイル) | MCPセキュリティテスト |
| `tests/SecurityScanner.test.ts` | セキュリティスキャナーテスト |
| `tests/integration/agent-verification.test.ts` | エージェントコンプライアンステスト |

## 付録C: ガバナンス文書階層

```
Constitutional Layer (最上位)
├── AGENTS.md v5.0 "The Final Mandate"
│   ├── 第一法則: 客観性の法則
│   ├── 第二法則: 自給自足の法則
│   └── 第三法則: 追跡可能性の法則
├── GUARDIAN.md
│   └── Guardian: @ShunsukeHayashi（最高権限）
└── WORKFLOW_RULES.md
    ├── 第一戒: Issue-Driven Development (IDD)
    ├── 第二戒: Log-Driven Development (LDD)
    └── 第三戒: Zero Surprise原則

Economic Layer (経済制約)
├── BUDGET.yml
│   ├── 月額上限: $500
│   ├── 警告閾値: 80%
│   └── 緊急閾値: 150%
└── サーキットブレーカーパターン

Operational Layer (運用制御)
├── CODEOWNERS → 全ファイル @ShunsukeHayashi
├── Labels (53 x 10カテゴリ) → ステートマシン
├── GitHub Actions (24ワークフロー) → 実行エンジン
└── 6層セキュリティスキャン → 継続的検証

Technical Layer (技術実装)
├── validation.ts → 入力バリデーション
├── security.ts → MCPセキュリティ
├── security-validator.ts → コード生成セキュリティ
├── ESLint + TypeScript strict → コード品質
├── Vitest + Playwright → テスト自動化
└── Docker マルチステージ → コンテナセキュリティ
```
