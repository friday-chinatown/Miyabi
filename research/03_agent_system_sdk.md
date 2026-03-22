# Miyabi エージェントシステム・SDK 詳細分析

## 概要

Miyabi は **21エージェントの自律運用プラットフォーム**（7 Coding + 14 Business）。かわいい日本語キャラクター名（例：「つくるん」= CodeGenAgent、「しきるん」= CoordinatorAgent）を使用し、非技術者にもアクセスしやすくしながら、高度なAIオーケストレーションを実現。

---

## 1. コーディングエージェント（7体）

### 1.1 CoordinatorAgent（しきるん）🔴 リーダー

- **役割**: タスク分解リーダー。全コーディング操作をオーケストレーション
- **権限**: 🔴 統括権限（戦略的意思決定）
- **機能**:
  - GitHub Issueを1-3時間のアトミックタスクに分解
  - Kahn's Algorithmを使用したDAG（有向非巡回グラフ）構築
  - 最大5並行でエージェント自動割り当て
  - DFSベースの循環依存検出
  - リアルタイム進捗監視・実行レポート生成
- **パフォーマンス目標**: DAG生成 <30秒、タスク分解精度 >95%、並列効率 >70%
- **エスカレーション先**: TechLead（技術決定）、PO（不明確な要件）

### 1.2 CodeGenAgent（つくるん）🟢 実行役

- **役割**: Claude Sonnet 4によるAIコード生成
- **権限**: 🔵 実行権限
- **機能**: Issue要件解析、TypeScriptコード生成、Vitestテスト自動生成、JSDocコメント・型定義追加
- **モデル**: `claude-sonnet-4-20250514`、Max Tokens: 8,000
- **パフォーマンス目標**: コード生成 <60秒、品質スコア >80/100、テストカバレッジ >80%
- **エスカレーション先**: TechLead（複雑なアーキテクチャ、セキュリティ問題）

### 1.3 ReviewAgent（めだまん）🔵 分析役

- **役割**: コード品質検証・スコアリング（100点満点）
- **権限**: 🔵 実行権限（品質ゲートキーパー）
- **品質スコア公式**:
  ```
  score = type_safety*0.3 + test_coverage*0.3 + lint_compliance*0.2 + docs*0.2
  Grade: excellent(≥90), good(≥80), fair(≥60), poor(<60)
  ```
- **Auto-Loopパターン**: スコア<80で最大3回自動リトライ
- **パフォーマンス目標**: レビュー時間 <90秒、問題検出率 >90%、偽陽性率 <10%

### 1.4 IssueAgent（みつけるん）🔵 分析役

- **役割**: GitHub Issue分析・53ラベル自動分類
- **53ラベル×10カテゴリ**: type, priority, severity, state, agent, quality, squad, effort, domain, status
- **パフォーマンス目標**: 分析時間 <15秒、ラベル精度 >90%、重複検出 >70%

### 1.5 PRAgent（まとめるん）🟡 サポート

- **役割**: PR自動作成（Conventional Commits形式）
- **権限**: 🟡 条件付き実行（レビュー合格後）
- **コミットタイプ**: feat, fix, refactor, docs, test
- **パフォーマンス目標**: PR作成 <30秒、マージ成功率 >95%

### 1.6 DeploymentAgent（はこぶん）🟡 サポート

- **役割**: CI/CD自動化・本番デプロイ
- **4段階パイプライン**: Build(60s) → Test(120s) → Deploy(60s) → Health Check(60s)
- **SLA**: 可用性99.9%、応答時間<10秒(P95)、成功率>99%
- **自動ロールバック**: ヘルスチェック失敗時

### 1.7 TestAgent（たしかめるん）🟢 実行役（オプション）

- **役割**: テスト実行・カバレッジ分析
- **パフォーマンス目標**: テスト実行 <180秒、合格率 >95%、カバレッジ >80%

---

## 2. ビジネスエージェント（14体）

### 戦略・計画（6体）

| # | エージェント | 名前 | 役割 | 権限 |
|---|---|---|---|---|
| 8 | AIEntrepreneurAgent | あきんどさん | 8段階ビジネスプラン作成 | 🔴 リーダー |
| 9 | ProductConceptAgent | ひらめきくん | MVP設計・Lean Canvas | 🟢 実行 |
| 10 | ProductDesignAgent | かくん | UI/UX設計・デザインシステム | 🟢 実行 |
| 11 | FunnelDesignAgent | みちびきくん | カスタマージャーニー・AARRR | 🟢 実行 |
| 12 | PersonaAgent | なりきりん | ターゲット顧客ペルソナ | 🔵 分析 |
| 13 | SelfAnalysisAgent | じぶんしるん | SWOT分析・キャリア計画 | 🔵 分析 |

### マーケティング（5体）

| # | エージェント | 名前 | 役割 | 権限 |
|---|---|---|---|---|
| 14 | MarketResearchAgent | しらべるん | 市場調査・競合分析 | 🔵 分析 |
| 15 | MarketingAgent | ひろめるん | マーケティング戦略 | 🟢 実行 |
| 16 | ContentCreationAgent | かくちゃん | コンテンツ生成（ブログ、SEO） | 🟢 実行 |
| 17 | SNSStrategyAgent | つぶやきくん | SNS戦略・投稿カレンダー | 🟢 実行 |
| 18 | YouTubeAgent | どうがん | YouTube戦略・SEO最適化 | 🟢 実行 |

### 営業・顧客管理（3体）

| # | エージェント | 名前 | 役割 | 権限 |
|---|---|---|---|---|
| 19 | SalesAgent | うりこみくん | 営業戦略・SPIN Selling | 🟢 実行 |
| 20 | CRMAgent | つなぐん | 顧客関係管理・LTV最大化 | 🟡 サポート |
| 21 | AnalyticsAgent | かぞえるん | データ分析・PDCA | 🔵 分析 |

---

## 3. キャラクター命名システム

### カラーコーディング

| 色 | 役割 | 並列実行 | 数 |
|---|---|---|---|
| 🔴 赤 | リーダー | ❌ 不可 | 2 |
| 🟢 緑 | 実行役 | ✅ 可能 | 12 |
| 🔵 青 | 分析役 | ✅ 可能 | 5 |
| 🟡 黄 | サポート | ⚠️ 条件付き | 3 |

### 命名規則
1. ひらがな/カタカナ優先（漢字最小限）
2. 役割を表現（つくる=create、めだ=eye）
3. 親しみやすい接尾辞（〜くん、〜ちゃん、〜るん）
4. 3-5文字

---

## 4. SDK アーキテクチャ

### 4.1 miyabi-agent-sdk

```typescript
interface AgentContext {
  owner: string; repo: string; issueNumber?: number;
  token: string; workdir: string; config: AgentConfig;
}

interface AgentResult {
  status: 'success' | 'failure' | 'partial' | 'timeout';
  message: string; metrics: AgentMetrics;
  artifacts?: AgentArtifact[]; error?: AgentError;
}
```

**リトライ設定**: retries=3, minTimeout=1000, maxTimeout=4000, factor=2, randomize=true

### 4.2 coding-agents パッケージ

**エクスポート構造**:
```
./base-agent     - BaseAgentクラス
./types          - 型定義
./coordinator    - CoordinatorAgent
./codegen        - CodeGenAgent
./review         - ReviewAgent
./deployment     - DeploymentAgent
./issue          - IssueAgent
./pr             - PRAgent
./feedback-loop  - Auto-loopパターン
./water-spider   - セッション管理
./worktree       - git worktreeユーティリティ
./monitoring     - パフォーマンス監視
./omega-system   - Omegaパイプライン（6段階）
```

### 4.3 BaseAgent（150+行）

**ライフサイクル**:
1. `globalMetricsCollector.onAgentStart()`
2. `sendAgentEvent('started')`
3. `PerformanceMonitor.startAgentTracking()`
4. `validateTask(task)`
5. `execute(task)` - 抽象メソッド
6. `recordMetrics(result)`
7. `updateLDDLog(result)`
8. `traceLogger.endAgentExecution()`
9. `performanceMonitor.endAgentTracking()`

### 4.4 AgentRegistry（インテリジェント割り当て）

1. タスク要件分析 → 複雑度、必要能力
2. キャッシュ分析（15分TTL、最大100エントリ）
3. 動的ツール/フック作成
4. アイドルエージェント検索 or 新規作成
5. メタデータ付きタスク割り当て

---

## 5. エージェント間通信プロトコル

### メッセージ形式

```typescript
interface AgentMessage<T = unknown> {
  id: string;                  // UUID v4
  from: AgentType;
  to: AgentType;
  type: MessageType;           // TASK_ASSIGNMENT, STATUS_UPDATE, etc.
  priority: MessagePriority;   // 0-3 (0=CRITICAL)
  payload: T;
  timestamp: string;           // ISO 8601
  correlationId?: string;
  ttl?: number;                // Time-to-live (ms)
}
```

### メッセージタイプ
- `TASK_ASSIGNMENT` - Coordinator → Specialist
- `STATUS_UPDATE` - Specialist → Coordinator
- `ESCALATION` - Specialist → Coordinator
- `RESULT_REPORT` - Specialist → Coordinator
- `ERROR_REPORT` - Any → Coordinator
- `HEARTBEAT` - ヘルスチェック
- `CAPABILITY_QUERY/RESPONSE` - 能力広告

### 通信フロー例
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

## 6. パフォーマンスメトリクス・SLA

### 共通メトリクス（全エージェント）
| メトリクス | 目標 |
|---|---|
| execution_time | <120秒 |
| success_rate | >90% |
| retry_count | <2 |
| error_rate | <5% |
| memory_usage | <512MB |
| token_usage | <50K |
| cost_per_task | <$0.10 |

### SLAティア

| ティア | エージェント | 可用性 | 応答時間(P95) | 成功率 | 復旧時間 |
|---|---|---|---|---|---|
| Tier 1: Critical | Coordinator, Deployment | 99.9% | <10秒 | >99% | <5分 |
| Tier 2: High | CodeGen, Review, Issue, PR | 99.5% | <30秒 | >95% | <15分 |
| Tier 3: Standard | Business, Test | 99.0% | <60秒 | >90% | <30分 |

---

## 7. 実行フロー

### コーディングワークフロー

```
1. Issue Created (#270)
   ↓
2. IssueAgent → 分析・53ラベル自動分類
   ↓
3. CoordinatorAgent → 3タスク分解、DAG構築、2並行計算
   ↓
4. 並列実行:
   Level 1: CodeGenAgent × 2（コード生成 + ドキュメント）
   ↓
5. ReviewAgent → 品質スコア: 85/100 ✅
   ↓
6. PRAgent → PR #108 作成（Conventional Commits）
   ↓
7. PR マージ（人間レビュー）
   ↓
8. DeploymentAgent → Build→Test→Deploy→Health Check
   ↓
9. 完了！Issue state:done
```

### 並列実行戦略

```typescript
const concurrency = Math.min(
  independentTaskCount,  // DAGレベルサイズ
  cpuCoreCount,          // システム容量
  5                      // ハード制限
);
```

**進捗表示**:
```
📊 進捗: 完了 2/5 | 実行中 2 | 待機中 1 | 失敗 0
[12:34:56] ⏳ [issue-270] 実行中... (CodeGenAgent)
[12:35:35] ✅ [issue-270] 完了 (39秒)
```

---

## 8. .codex エージェント設定（TOML）

| エージェント | モデル | 推論努力 | 用途 |
|---|---|---|---|
| architect | gpt-5.4 | high | アーキテクチャレビュー |
| default | gpt-5.4 | medium | デフォルト実行 |
| explorer | gpt-5.4-mini | medium | 読み取り専用分析 |
| reviewer | gpt-5.4 | high | コードレビュー |
| worker | gpt-5.4-mini | medium | 実装作業 |

---

## 9. 既知のギャップ・将来計画

1. **ビジネスプロンプト**: 14のビジネス実行プロンプト開発中
2. **リモートメッセージング**: WebSocket/gRPCによる分散実行
3. **メッセージ永続化**: 監査証跡用データベース
4. **レート制限**: バックプレッシャーメカニズム
5. **メッセージ暗号化**: 機密データ保護
6. **デッドレターキュー**: 失敗メッセージ処理
