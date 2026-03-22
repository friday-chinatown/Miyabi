# Miyabi エージェントエコシステムマップ - 完全版

**文書バージョン**: 1.0
**対象**: Miyabi Autonomous Agent System 全21エージェント
**作成日**: 2026-03-21

---

## 1. エージェント分類体系

### 1.1 上位概念: Autonomous Agent System

Miyabi は **GitHub を OS（Agentic OS）として扱う自律型AI開発フレームワーク**であり、Issue から本番デプロイまでのソフトウェア開発ライフサイクルを21体のAIエージェントが自律的に遂行する。エージェントは大きく**コーディングエージェント（7体）**と**ビジネスエージェント（14体）**の2系統に分類される。

```
Autonomous Agent System (Miyabi)
├── Coding Agent Subsystem（7体）
│   ├── Orchestration Layer（統括）
│   │   └── CoordinatorAgent（しきるん）🔴
│   ├── Analysis Layer（分析）
│   │   └── IssueAgent（みつけるん）🔵
│   ├── Execution Layer（実行）
│   │   ├── CodeGenAgent（つくるん）🟢
│   │   ├── ReviewAgent（めだまん）🔵
│   │   └── TestAgent（たしかめるん）🟢
│   └── Delivery Layer（配信）
│       ├── PRAgent（まとめるん）🟡
│       └── DeploymentAgent（はこぶん）🟡
│
└── Business Agent Subsystem（14体）
    ├── Strategic Planning Layer（戦略・計画）
    │   ├── AIEntrepreneurAgent（あきんどさん）🔴
    │   ├── ProductConceptAgent（ひらめきくん）🟢
    │   ├── ProductDesignAgent（かくん）🟢
    │   ├── FunnelDesignAgent（みちびきくん）🟢
    │   ├── PersonaAgent（なりきりん）🔵
    │   └── SelfAnalysisAgent（じぶんしるん）🔵
    ├── Marketing Layer（マーケティング）
    │   ├── MarketResearchAgent（しらべるん）🔵
    │   ├── MarketingAgent（ひろめるん）🟢
    │   ├── ContentCreationAgent（かくちゃん）🟢
    │   ├── SNSStrategyAgent（つぶやきくん）🟢
    │   └── YouTubeAgent（どうがん）🟢
    └── Sales & CRM Layer（営業・顧客管理）
        ├── SalesAgent（うりこみくん）🟢
        ├── CRMAgent（つなぐん）🟡
        └── AnalyticsAgent（かぞえるん）🔵
```

### 1.2 コーディングエージェント階層関係（7体）

コーディングエージェントは**パイプライン型の逐次・並列ハイブリッド実行モデル**を採用する。CoordinatorAgent がDAG（有向非巡回グラフ）を構築し、依存関係のないタスクは最大5並行で実行される。

```
                    ┌─────────────────────────┐
                    │  CoordinatorAgent 🔴     │
                    │  （しきるん）              │
                    │  役割: 全体オーケストレーション │
                    │  DAG構築・タスク分解・監視  │
                    └────────┬────────────────┘
                             │ タスク分配
                    ┌────────┴────────────────┐
                    │                         │
            ┌───────┴───────┐        ┌───────┴───────┐
            │ IssueAgent 🔵 │        │ 並列実行プール │
            │（みつけるん）   │        │  最大5並行     │
            │ Issue分析      │        └───────┬───────┘
            │ 53ラベル分類    │                │
            └───────┬───────┘        ┌───────┼───────┐
                    │                │       │       │
                    │        ┌───────┴──┐ ┌──┴──────┐│
                    │        │CodeGen 🟢│ │Test 🟢  ││
                    │        │（つくるん）│ │（たしかめ）││
                    │        │コード生成  │ │テスト実行 ││
                    │        └────┬─────┘ └──┬──────┘│
                    │             │           │       │
                    │        ┌────┴───────────┴───┐   │
                    │        │  ReviewAgent 🔵     │   │
                    │        │ （めだまん）          │   │
                    │        │  品質ゲート 100点満点  │   │
                    │        │  合格≥80 / リトライ≤3  │   │
                    │        └────────┬────────────┘   │
                    │                 │ ≥80点           │
                    │        ┌────────┴────────────┐   │
                    │        │   PRAgent 🟡         │   │
                    │        │  （まとめるん）        │   │
                    │        │   PR作成              │   │
                    │        └────────┬────────────┘   │
                    │                 │ マージ後        │
                    │        ┌────────┴────────────┐   │
                    │        │ DeploymentAgent 🟡   │   │
                    │        │ （はこぶん）           │   │
                    │        │  CI/CD・本番デプロイ    │   │
                    │        └─────────────────────┘   │
                    └─────────────────────────────────┘
```

**階層の意味**:
- **Orchestration Layer**: CoordinatorAgent はDAG構築とタスク分解を行い、全エージェントを統括する唯一の🔴リーダー
- **Analysis Layer**: IssueAgent は入力（GitHub Issue）を分析・分類し、下流エージェントのコンテキストを準備する
- **Execution Layer**: CodeGenAgent / TestAgent / ReviewAgent が実際のコード生成・テスト・品質検証を並列で実行
- **Delivery Layer**: PRAgent / DeploymentAgent が成果物の統合とデプロイを担当（前段の完了に依存）

### 1.3 ビジネスエージェント階層関係（14体）

ビジネスエージェントは**AIEntrepreneurAgent を頂点とした機能別チーム構成**で動作する。コーディングエージェントのようなDAGパイプラインではなく、ビジネスプランの各フェーズに応じて専門エージェントが起動される。

```
                    ┌──────────────────────────┐
                    │ AIEntrepreneurAgent 🔴    │
                    │（あきんどさん）             │
                    │ 8段階ビジネスプラン策定     │
                    │ 全ビジネスエージェント統括   │
                    └───────────┬──────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
  ┌───────┴─────────┐  ┌───────┴─────────┐  ┌───────┴─────────┐
  │ 戦略・計画チーム  │  │ マーケティングチーム│  │ 営業・CRMチーム  │
  │  （5体）          │  │  （5体）          │  │  （3体）          │
  └───────┬─────────┘  └───────┬─────────┘  └───────┬─────────┘
          │                     │                     │
  ┌───────┴─────────┐  ┌───────┴─────────┐  ┌───────┴─────────┐
  │PersonaAgent 🔵  │  │MarketResearch🔵 │  │SalesAgent 🟢    │
  │（なりきりん）     │  │（しらべるん）     │  │（うりこみくん）   │
  │ペルソナ作成       │  │市場・競合分析     │  │営業戦略・SPIN     │
  │                  │  │                  │  │                  │
  │SelfAnalysis🔵   │  │MarketingAgent🟢 │  │CRMAgent 🟡      │
  │（じぶんしるん）   │  │（ひろめるん）     │  │（つなぐん）       │
  │SWOT分析          │  │マーケ戦略策定     │  │顧客関係管理       │
  │                  │  │                  │  │                  │
  │ProductConcept🟢│  │ContentCreate🟢 │  │AnalyticsAgent🔵│
  │（ひらめきくん）   │  │（かくちゃん）     │  │（かぞえるん）     │
  │MVP設計           │  │コンテンツ生成     │  │データ分析・PDCA   │
  │                  │  │                  │  │                  │
  │ProductDesign🟢  │  │SNSStrategy🟢   │  └─────────────────┘
  │（かくん）         │  │（つぶやきくん）   │
  │UI/UX設計         │  │SNS戦略           │
  │                  │  │                  │
  │FunnelDesign🟢   │  │YouTubeAgent🟢  │
  │（みちびきくん）   │  │（どうがん）       │
  │AARRR設計         │  │YouTube戦略       │
  └──────────────────┘  └──────────────────┘
```

### 1.4 権限レベル別分類

全21体のエージェントは4段階の権限レベルに分類される。権限レベルは並列実行の可否、意思決定権限、エスカレーション責任を規定する。

| 権限レベル | 色 | 意味 | エージェント数 | 並列実行 | 意思決定権限 |
|---|---|---|---|---|---|
| 🔴 リーダー | 赤 | 統括・決裁権限 | 2体 | 不可（排他実行） | 戦略的意思決定、タスク分配、エスカレーション |
| 🟢 実行役 | 緑 | アクティブ実行 | 12体 | 可能（最大5並行） | 割り当てられたタスクの自律実行 |
| 🔵 分析役 | 青 | 調査・分析・評価 | 5体 | 可能 | 分析結果の報告、品質判定 |
| 🟡 サポート | 黄 | 条件付き実行 | 3体 | 条件付き | 前段エージェントの完了に依存 |

**🔴 リーダー（2体）**:

| # | エージェント | 日本語名 | 統括範囲 |
|---|---|---|---|
| 1 | CoordinatorAgent | しきるん | コーディング全体（7体） |
| 8 | AIEntrepreneurAgent | あきんどさん | ビジネス全体（14体） |

**🟢 実行役（12体）**:

| # | エージェント | 日本語名 | 実行内容 |
|---|---|---|---|
| 2 | CodeGenAgent | つくるん | Claude Sonnet 4 コード生成 |
| 7 | TestAgent | たしかめるん | テスト実行・カバレッジ分析 |
| 9 | ProductConceptAgent | ひらめきくん | MVP設計・Lean Canvas |
| 10 | ProductDesignAgent | かくん | UI/UX設計・デザインシステム |
| 11 | FunnelDesignAgent | みちびきくん | カスタマージャーニー・AARRR |
| 15 | MarketingAgent | ひろめるん | マーケティング戦略策定 |
| 16 | ContentCreationAgent | かくちゃん | コンテンツ生成（ブログ、SEO） |
| 17 | SNSStrategyAgent | つぶやきくん | SNS戦略・投稿カレンダー |
| 18 | YouTubeAgent | どうがん | YouTube戦略・SEO最適化 |
| 19 | SalesAgent | うりこみくん | 営業戦略・SPIN Selling |

**🔵 分析役（5体）**:

| # | エージェント | 日本語名 | 分析内容 |
|---|---|---|---|
| 4 | IssueAgent | みつけるん | Issue分析・53ラベル分類 |
| 3 | ReviewAgent | めだまん | コード品質100点評価 |
| 12 | PersonaAgent | なりきりん | ターゲット顧客ペルソナ分析 |
| 13 | SelfAnalysisAgent | じぶんしるん | SWOT分析・キャリア計画 |
| 14 | MarketResearchAgent | しらべるん | 市場調査・競合分析 |
| 21 | AnalyticsAgent | かぞえるん | データ分析・PDCA |

**🟡 サポート（3体）**:

| # | エージェント | 日本語名 | 依存条件 |
|---|---|---|---|
| 5 | PRAgent | まとめるん | ReviewAgent スコア≥80 |
| 6 | DeploymentAgent | はこぶん | PRAgent マージ完了 |
| 20 | CRMAgent | つなぐん | SalesAgent・AnalyticsAgent 連携 |

### 1.5 並列実行可否マトリクス

コーディングエージェントの並列実行可否をDAG依存関係に基づいて定義する。

| エージェント | Coordinator | Issue | CodeGen | Review | Test | PR | Deployment |
|---|---|---|---|---|---|---|---|
| **CoordinatorAgent** | - | 起動可 | 起動可 | 起動可 | 起動可 | 起動可 | 起動可 |
| **IssueAgent** | 結果報告 | - | 並列不可※1 | 並列不可 | 並列不可 | 並列不可 | 並列不可 |
| **CodeGenAgent** | 結果報告 | 依存 | - | 並列不可※2 | 並列可 | 並列不可 | 並列不可 |
| **ReviewAgent** | 結果報告 | 非依存 | 依存※2 | - | 並列可 | 並列不可 | 並列不可 |
| **TestAgent** | 結果報告 | 非依存 | 並列可 | 並列可 | - | 並列不可 | 並列不可 |
| **PRAgent** | 結果報告 | 非依存 | 非依存 | 依存※3 | 非依存 | - | 並列不可 |
| **DeploymentAgent** | 結果報告 | 非依存 | 非依存 | 非依存 | 非依存 | 依存※4 | - |

- ※1: IssueAgent の分析結果がCodeGenAgent のコンテキスト入力となるため逐次
- ※2: CodeGenAgent の出力がReviewAgent のレビュー対象。品質ループ（Auto-Loop）により最大3回のCodeGen→Review往復あり
- ※3: ReviewAgent スコア≥80がPR作成の前提条件
- ※4: PRマージがデプロイの前提条件

**ビジネスエージェント並列実行**:

ビジネスエージェントはコーディングエージェントほど厳密なDAG依存がなく、同一チーム内では比較的自由に並列実行可能。ただし以下の制約がある:

| チーム | 並列実行可能な組み合わせ | 逐次実行が必要な組み合わせ |
|---|---|---|
| 戦略・計画 | PersonaAgent + SelfAnalysisAgent | PersonaAgent → ProductConceptAgent → ProductDesignAgent → FunnelDesignAgent |
| マーケティング | ContentCreation + SNSStrategy + YouTube | MarketResearch → MarketingAgent → (Content/SNS/YouTube) |
| 営業・CRM | なし（3体とも連携） | SalesAgent → CRMAgent、AnalyticsAgent は非同期で常時実行可 |

---

## 2. エージェント間依存関係

### 2.1 コーディングエージェント依存関係マップ

```
┌──────────────────────────────────────────────────────────────────────┐
│                        依存関係フローチャート                         │
│                                                                      │
│  [GitHub Issue]                                                      │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────┐  分析結果   ┌──────────────────┐                   │
│  │ IssueAgent  │ ─────────→ │ CoordinatorAgent │                   │
│  │ 53ラベル分類 │             │ DAG構築・分配    │                   │
│  └─────────────┘             └────────┬─────────┘                   │
│                                       │                              │
│                              ┌────────┼────────┐                    │
│                              │        │        │                    │
│                              ▼        ▼        ▼                    │
│                         ┌────────┐ ┌──────┐ ┌──────────┐           │
│                         │CodeGen │ │ Test │ │ その他    │           │
│                         │Agent   │ │Agent │ │ タスク    │           │
│                         └───┬────┘ └──┬───┘ └──────────┘           │
│                             │         │                              │
│                    コード出力│    テスト結果                          │
│                             ▼         │                              │
│                      ┌────────────┐   │                              │
│                ┌────→│ReviewAgent │←──┘                              │
│                │     │100点評価    │                                   │
│                │     └──────┬─────┘                                   │
│                │            │                                         │
│           <80点│    ≥80点   │                                         │
│          リトライ│           ▼                                         │
│          (最大3回)    ┌──────────┐                                    │
│                │     │ PRAgent  │                                    │
│                │     │PR作成     │                                    │
│                └─────┘ └────┬────┘                                    │
│                              │ マージ                                 │
│                              ▼                                        │
│                      ┌──────────────┐                                │
│                      │Deployment    │                                │
│                      │Agent         │                                │
│                      │staging→prod  │                                │
│                      └──────────────┘                                │
│                              │                                        │
│                              ▼                                        │
│                       [Production]                                   │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 主要依存関係の詳細

#### 2.2.1 CoordinatorAgent → 他全エージェントへのタスク配分

CoordinatorAgent は Kahn's Algorithm を使用してDAG（有向非巡回グラフ）を構築し、以下のプロセスでタスクを配分する:

1. **Issue受信**: GitHub Issue をトリガーとして起動
2. **IssueAgent 分析結果の取得**: 53ラベル分類・複雑度評価を受信
3. **タスク分解**: Issueを1-3時間のアトミックタスクに分解
4. **DAG構築**: タスク間の依存関係をグラフとして構築
5. **DFS循環検出**: 循環依存がないことを検証
6. **並列度計算**: `Math.min(independentTaskCount, cpuCoreCount, 5)` で最大並列数を決定
7. **エージェント割当**: AgentRegistry からアイドルエージェントを検索し、タスクメタデータ付きで割当
8. **進捗監視**: リアルタイム進捗追跡とレポート生成

**メッセージ通信**:
```typescript
// CoordinatorAgent → Specialist
MessageType: TASK_ASSIGNMENT
Priority: 0-3 (0=CRITICAL)
TTL: ms単位

// Specialist → CoordinatorAgent
MessageType: STATUS_UPDATE | RESULT_REPORT | ESCALATION | ERROR_REPORT
```

**パフォーマンス目標**: DAG生成 <30秒、タスク分解精度 >95%、並列効率 >70%

#### 2.2.2 CodeGenAgent <-> ReviewAgent 品質ループ

CodeGenAgent と ReviewAgent の間には**Auto-Loop パターン**と呼ばれる品質フィードバックループが存在する。これはシステムの品質保証における最も重要な依存関係である。

```
┌──────────────┐     コード出力      ┌──────────────┐
│ CodeGenAgent │ ──────────────────→ │ ReviewAgent  │
│   つくるん    │                     │   めだまん    │
│              │ ←──────────────────  │              │
│              │   フィードバック      │              │
│              │   (スコア<80の場合)   │              │
└──────────────┘                     └──────────────┘
```

**品質スコア公式**:
```
score = type_safety * 0.30
      + test_coverage * 0.30
      + lint_compliance * 0.20
      + documentation * 0.20

Grade:
  excellent: ≥90
  good:      ≥80 (PR作成許可閾値)
  fair:      ≥60
  poor:      <60
```

**Auto-Loopフロー**:
1. CodeGenAgent がコードを生成（Claude Sonnet 4、Max 8,000 tokens）
2. ReviewAgent が100点満点でスコアリング
3. スコア≥80 → PRAgent に進行許可
4. スコア<80 → フィードバック付きでCodeGenAgent に差し戻し
5. 最大3回リトライ
6. 3回リトライ後も不合格 → 人間（TechLead/Guardian）にエスカレーション

#### 2.2.3 IssueAgent → CoordinatorAgent への分析結果渡し

IssueAgent はGitHub Issue のテキストを解析し、構造化された分析結果を CoordinatorAgent に渡す。

**IssueAgent の出力**:
- **53ラベル自動分類**: 10カテゴリ（type, priority, severity, state, agent, quality, squad, effort, domain, status）
- **複雑度評価**: ファイル数、クロスモジュール影響、テストカバレッジ、外部依存、セキュリティ影響の重み付きスコア
- **セキュリティ検証**: eval, exec, sudo, 外部パス、シークレット含有チェック
- **重複検出**: 既存Issue との重複率 >70% を検出

**パフォーマンス目標**: 分析時間 <15秒、ラベル精度 >90%

#### 2.2.4 PRAgent <- ReviewAgent の承認依存

PRAgent は ReviewAgent のスコアが80点以上である場合にのみ PR を作成できる。これは**ハードゲート**であり、バイパスは不可能。

**PRAgent の動作条件**:
- ReviewAgent スコア ≥80 （必須）
- 全テスト合格（TestAgent 確認済み）
- ESLint エラー 0件
- TypeScript 型チェック合格

**PR作成の仕様**:
- ブランチ命名: `{type}/{issue_number}-{description}`（例: `feat/270-add-auth`）
- コミット形式: Conventional Commits（feat, fix, refactor, docs, test）
- マージポリシー: PR作成は自動、マージはGuardian承認必須

**パフォーマンス目標**: PR作成 <30秒、マージ成功率 >95%

#### 2.2.5 DeploymentAgent <- PRAgent のマージ依存

DeploymentAgent は PRAgent が作成したPRがマージされた後にのみデプロイパイプラインを起動する。

**4段階デプロイパイプライン**:
```
Build (60秒) → Test (120秒) → Deploy (60秒) → Health Check (60秒)
```

**環境別制御**:
- **Staging**: 自動デプロイ（PRマージ後即座に実行）
- **Production**: Guardian承認必須

**障害対応**:
- ヘルスチェック失敗時 → 自動ロールバック
- ロールバック期限: 1時間以内

**SLA**: 可用性99.9%、応答時間<10秒(P95)、成功率>99%

### 2.3 エージェント間通信プロトコル

全エージェント間の通信は `AgentMessage` インターフェースに準拠する。

```typescript
interface AgentMessage<T = unknown> {
  id: string;                  // UUID v4
  from: AgentType;             // 送信元エージェント
  to: AgentType;               // 送信先エージェント
  type: MessageType;           // メッセージ種別
  priority: MessagePriority;   // 0(CRITICAL) - 3(LOW)
  payload: T;                  // ペイロード
  timestamp: string;           // ISO 8601
  correlationId?: string;      // 関連メッセージID
  ttl?: number;                // Time-to-live (ms)
}
```

**メッセージタイプ一覧**:

| タイプ | 方向 | 用途 |
|---|---|---|
| `TASK_ASSIGNMENT` | Coordinator → Specialist | タスク割当 |
| `STATUS_UPDATE` | Specialist → Coordinator | 進捗報告 |
| `ESCALATION` | Specialist → Coordinator | エスカレーション |
| `RESULT_REPORT` | Specialist → Coordinator | 結果報告 |
| `ERROR_REPORT` | Any → Coordinator | エラー報告 |
| `HEARTBEAT` | Any ↔ Any | ヘルスチェック |
| `CAPABILITY_QUERY` | Any → Any | 能力問い合わせ |
| `CAPABILITY_RESPONSE` | Any → Any | 能力応答 |

### 2.4 エスカレーションチェーン

```
Specialist Agent
  │ (解決不能な問題)
  ▼
CoordinatorAgent / AIEntrepreneurAgent
  │ (技術的意思決定が必要)
  ▼
TechLead (技術決定) / PO (不明確な要件)
  │ (Constitutional/Budget/Security)
  ▼
Guardian (ShunsukeHayashi)
```

**エスカレーション基準**:

| 重大度 | 対応時間 | トリガー条件 |
|---|---|---|
| Sev.1-Critical | 24時間 | サーキットブレーカー発動、セキュリティ侵害、Auto-Loop 3回失敗 |
| Constitutional | 7日 | 自律の三法則改正提案 |
| Budget | 即時 | コスト緊急閾値（150%）接近 |

---

## 3. エージェントライフサイクル

### 3.1 ライフサイクル全体図

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  登録     │ →  │  割当     │ →  │  実行     │ →  │ メトリクス │ →  │ LDDログ  │
│ Registry │    │ Factory  │    │ BaseAgent│    │  記録     │    │  記録     │
│          │    │          │    │ .run()   │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 3.2 詳細ライフサイクルフェーズ

#### Phase 1: 登録（AgentRegistry）

AgentRegistry はSingletonパターンで実装され、全エージェントのインスタンスを一元管理する。

```typescript
class AgentRegistry {
  // Singletonインスタンス
  register(name: string, agent: IAgent): void    // エージェント登録
  get(name: string): IAgent | undefined           // 名前で取得
  getAll(): IAgent[]                               // 全エージェント取得
}
```

**登録プロセス**:
1. エージェントクラスが `IAgent` インターフェースを実装
2. `AgentRegistry.register()` で名前付き登録
3. 登録時にバージョン情報と能力（Capability）を宣言
4. キャッシュ: 15分TTL、最大100エントリ

#### Phase 2: 割当（AgentFactory）

AgentFactory はタスク要件を分析し、最適なエージェントを選択・割当する。

**割当アルゴリズム**:
1. タスク要件分析 → 複雑度、必要能力の特定
2. キャッシュ確認（15分TTL、最大100エントリ）
3. 動的ツール/フック作成
4. アイドルエージェント検索 or 新規インスタンス作成
5. メタデータ付きタスク割当

#### Phase 3: 実行（BaseAgent.run）

BaseAgent は150+行の抽象基底クラスで、以下のライフサイクルフックを提供する。

```typescript
// 実行ライフサイクル（9ステップ）
async run(task: Task): Promise<AgentResult> {
  // Step 1: メトリクス収集開始
  globalMetricsCollector.onAgentStart(this.name);

  // Step 2: イベント発信
  sendAgentEvent('started', { agent: this.name, task });

  // Step 3: パフォーマンス追跡開始
  PerformanceMonitor.startAgentTracking(this.name);

  // Step 4: タスク検証
  this.validateTask(task);

  // Step 5: 実行（サブクラスで実装）
  const result = await this.execute(task);

  // Step 6: メトリクス記録
  this.recordMetrics(result);

  // Step 7: LDDログ更新
  this.updateLDDLog(result);

  // Step 8: トレースログ終了
  traceLogger.endAgentExecution(this.name);

  // Step 9: パフォーマンス追跡終了
  performanceMonitor.endAgentTracking(this.name);

  return result;
}
```

**実行結果インターフェース**:
```typescript
interface AgentResult {
  status: 'success' | 'failure' | 'partial' | 'timeout';
  message: string;
  metrics: AgentMetrics;
  artifacts?: AgentArtifact[];
  error?: AgentError;
}
```

**リトライ設定**: retries=3, minTimeout=1000ms, maxTimeout=4000ms, factor=2, randomize=true

#### Phase 4: メトリクス記録

実行完了後、以下のメトリクスが自動収集される:

| メトリクス | 型 | 説明 |
|---|---|---|
| `execution_time` | number (ms) | 実行時間 |
| `success_rate` | percentage | 成功率 |
| `retry_count` | number | リトライ回数 |
| `error_rate` | percentage | エラー率 |
| `memory_usage` | number (MB) | メモリ使用量 |
| `token_usage` | number | トークン消費量 |
| `cost_per_task` | number (USD) | タスクあたりコスト |

メトリクスは GitHub Projects V2 のカスタムフィールド（Agent, Duration, Cost, Quality Score, Sprint）に同期される。

#### Phase 5: LDDログ記録

Log-Driven Development (LDD) の原則に基づき、全アクションが `.ai/logs/YYYY-MM-DD.md` に記録される。

**ログフォーマット**:
```
[ISO 8601] [AgentName] [Status] [Duration] [Details]
```

**追跡可能性の法則**: 全アクションをGitHubに記録し、完全な監査証跡を維持する。

### 3.3 状態遷移マシン（10状態・28遷移ルール）

```
draft → pending → analyzing → implementing → reviewing → deploying → done
                      ↓             ↓             ↓           ↓
                   blocked ←────────┴─────────────┴───────────┘
                      ↓
                   failed → (retry) → pending
                      ↓
                 cancelled
```

**完全な遷移ルール表**:

| From | To（許可される遷移先） | 備考 |
|---|---|---|
| draft | pending, cancelled | 初期状態 |
| pending | analyzing, implementing, blocked, cancelled | キュー待ち |
| analyzing | implementing, pending, blocked, failed, cancelled | IssueAgent 処理中 |
| implementing | reviewing, blocked, failed, cancelled | CodeGenAgent 処理中 |
| reviewing | implementing, deploying, done, failed, cancelled | ReviewAgent 評価中 |
| deploying | done, failed, cancelled | DeploymentAgent 処理中 |
| blocked | pending, cancelled | ブロッカー解消待ち |
| failed | pending, cancelled | リトライ可能 |
| done | pending | 再オープン |
| cancelled | draft | 再オープン |

---

## 4. キャラクターシステム

### 4.1 全21体の完全マッピング

| # | 日本語名 | 英語名 | 技術名（クラス名） | 権限 | 系統 | チーム |
|---|---|---|---|---|---|---|
| 1 | しきるん | Coordinator | CoordinatorAgent | 🔴 リーダー | Coding | Orchestration |
| 2 | つくるん | CodeGen | CodeGenAgent | 🟢 実行 | Coding | Execution |
| 3 | めだまん | Reviewer | ReviewAgent | 🔵 分析 | Coding | Execution |
| 4 | みつけるん | Issue Analyzer | IssueAgent | 🔵 分析 | Coding | Analysis |
| 5 | まとめるん | PR Creator | PRAgent | 🟡 サポート | Coding | Delivery |
| 6 | はこぶん | Deployer | DeploymentAgent | 🟡 サポート | Coding | Delivery |
| 7 | たしかめるん | Tester | TestAgent | 🟢 実行 | Coding | Execution |
| 8 | あきんどさん | AI Entrepreneur | AIEntrepreneurAgent | 🔴 リーダー | Business | Strategic Planning |
| 9 | ひらめきくん | Product Concept | ProductConceptAgent | 🟢 実行 | Business | Strategic Planning |
| 10 | かくん | Product Designer | ProductDesignAgent | 🟢 実行 | Business | Strategic Planning |
| 11 | みちびきくん | Funnel Designer | FunnelDesignAgent | 🟢 実行 | Business | Strategic Planning |
| 12 | なりきりん | Persona Creator | PersonaAgent | 🔵 分析 | Business | Strategic Planning |
| 13 | じぶんしるん | Self Analyst | SelfAnalysisAgent | 🔵 分析 | Business | Strategic Planning |
| 14 | しらべるん | Market Researcher | MarketResearchAgent | 🔵 分析 | Business | Marketing |
| 15 | ひろめるん | Marketer | MarketingAgent | 🟢 実行 | Business | Marketing |
| 16 | かくちゃん | Content Creator | ContentCreationAgent | 🟢 実行 | Business | Marketing |
| 17 | つぶやきくん | SNS Strategist | SNSStrategyAgent | 🟢 実行 | Business | Marketing |
| 18 | どうがん | YouTuber | YouTubeAgent | 🟢 実行 | Business | Marketing |
| 19 | うりこみくん | Sales Rep | SalesAgent | 🟢 実行 | Business | Sales & CRM |
| 20 | つなぐん | CRM Manager | CRMAgent | 🟡 サポート | Business | Sales & CRM |
| 21 | かぞえるん | Data Analyst | AnalyticsAgent | 🔵 分析 | Business | Sales & CRM |

### 4.2 カラーコーディングルール

| 色 | 権限 | Hexカラー | Web UIマッピング | 意味 |
|---|---|---|---|---|
| 🔴 赤 | リーダー | `red-100/red-300` | coordinator: `purple-100/purple-300` | 統括・決裁。排他実行（並列不可） |
| 🟢 緑 | 実行役 | `green-100/green-300` | codegen: `blue-100/blue-300` | アクティブ実行。並列可能 |
| 🔵 青 | 分析役 | `blue-100/blue-300` | review: `green-100/green-300` | 調査・分析・評価。並列可能 |
| 🟡 黄 | サポート | `yellow-100/yellow-300` | issue: `yellow-100/yellow-300` | 条件付き実行。前段依存 |

**Web UIエージェントノードカラー（@xyflow/react）**:

| AgentType | Tailwind Color | ステータスアイコン |
|---|---|---|
| coordinator | `purple-100/purple-300` | ⏳ pending, 🔄 running, ✅ completed, ❌ failed |
| codegen | `blue-100/blue-300` | 同上 |
| review | `green-100/green-300` | 同上 |
| issue | `yellow-100/yellow-300` | 同上 |
| pr | `orange-100/orange-300` | 同上 |
| deployment | `red-100/red-300` | 同上 |
| test | `cyan-100/cyan-300` | 同上 |

### 4.3 キャラクター設計思想

Miyabi のキャラクター命名システムは以下の設計原則に基づく:

**目的**: 非技術者にもAIエージェントシステムを親しみやすくし、「AIを深く理解していない人でも自律エージェントと協業できる」世界を実現する。

**命名規則**:

| ルール | 説明 | 例 |
|---|---|---|
| ひらがな/カタカナ優先 | 漢字使用を最小限に抑え、視覚的な親しみやすさを確保 | しきるん、つくるん |
| 役割表現 | 名前が役割を直感的に表現 | つくる(create)→つくるん、めだ(eye)→めだまん |
| 親しみやすい接尾辞 | 〜くん、〜ちゃん、〜るん、〜さん で人格化 | ひらめきくん、かくちゃん |
| 3-5文字 | 短く覚えやすい長さ | かくん、どうがん |
| 敬称の使い分け | リーダーは「さん」、実行役は「くん/ちゃん」、分析役は「ん」系 | あきんどさん（リーダー）、つくるん（実行） |

**名前の語源分析**:

| 日本語名 | 語源 | 役割との関連 |
|---|---|---|
| しきるん | 仕切る（しきる）+ ん | 全体を仕切る（オーケストレーション） |
| つくるん | 作る（つくる）+ ん | コードを作る（コード生成） |
| めだまん | 目玉（めだま）+ ん | 目を光らせる（コードレビュー） |
| みつけるん | 見つける + ん | 問題を見つける（Issue分析） |
| まとめるん | まとめる + ん | PRをまとめる（PR作成） |
| はこぶん | 運ぶ（はこぶ）+ ん | コードを運ぶ（デプロイ） |
| たしかめるん | 確かめる + ん | テストで確かめる |
| あきんどさん | 商人（あきんど）+ さん | ビジネスの商人（起業家） |
| ひらめきくん | 閃き + くん | アイデアの閃き（コンセプト設計） |
| かくん | 描く（かく）+ ん | デザインを描く |
| みちびきくん | 導く + くん | 顧客を導く（ファネル設計） |
| なりきりん | なりきり + ん | ペルソナになりきる |
| じぶんしるん | 自分知る + ん | 自分を知る（自己分析） |
| しらべるん | 調べる + ん | 市場を調べる（リサーチ） |
| ひろめるん | 広める + ん | 製品を広める（マーケティング） |
| かくちゃん | 書く + ちゃん | コンテンツを書く |
| つぶやきくん | つぶやき + くん | SNSでつぶやく |
| どうがん | 動画 + ん | 動画を作る（YouTube） |
| うりこみくん | 売り込み + くん | 製品を売り込む（営業） |
| つなぐん | 繋ぐ + ん | 顧客と繋ぐ（CRM） |
| かぞえるん | 数える + ん | データを数える（分析） |

---

## 5. ビジネスエージェントワークフロー

### 5.1 AIEntrepreneurAgent の8段階ビジネスプラン

AIEntrepreneurAgent（あきんどさん）はビジネスプランの全体を8つのフェーズに分解し、各フェーズで適切なビジネスエージェントを起動する。

```
Phase 1: 自己分析・資源棚卸
         └→ SelfAnalysisAgent（じぶんしるん）: SWOT分析、コアコンピタンス特定

Phase 2: 市場調査・機会発見
         └→ MarketResearchAgent（しらべるん）: TAM/SAM/SOM、競合分析
         └→ PersonaAgent（なりきりん）: ターゲット顧客ペルソナ作成

Phase 3: プロダクトコンセプト設計
         └→ ProductConceptAgent（ひらめきくん）: MVP定義、Lean Canvas
         └→ PersonaAgent（なりきりん）: ペルソナに基づくJTBD分析

Phase 4: プロダクトデザイン
         └→ ProductDesignAgent（かくん）: UI/UX設計、デザインシステム

Phase 5: ファネル設計・顧客獲得戦略
         └→ FunnelDesignAgent（みちびきくん）: AARRR、カスタマージャーニー
         └→ MarketingAgent（ひろめるん）: GTM戦略

Phase 6: マーケティング実行計画
         └→ ContentCreationAgent（かくちゃん）: ブログ、SEOコンテンツ
         └→ SNSStrategyAgent（つぶやきくん）: SNS投稿カレンダー
         └→ YouTubeAgent（どうがん）: YouTube戦略、SEO最適化

Phase 7: 営業・顧客管理
         └→ SalesAgent（うりこみくん）: SPIN Selling、営業パイプライン
         └→ CRMAgent（つなぐん）: LTV最大化、チャーン防止

Phase 8: 分析・改善
         └→ AnalyticsAgent（かぞえるん）: KPI追跡、PDCA分析
         └→ AIEntrepreneurAgent 自身: 戦略見直し・次期計画策定
```

### 5.2 マーケティングチーム（5体）の連携

マーケティングチームは MarketResearchAgent を起点とし、調査結果に基づいて戦略策定と実行を行う。

```
┌──────────────────┐
│MarketResearchAgent│    Phase 1: 市場調査
│   しらべるん 🔵    │    - 市場規模（TAM/SAM/SOM）
│                   │    - 競合分析
│                   │    - トレンド調査
└────────┬─────────┘
         │ 調査結果
         ▼
┌──────────────────┐
│ MarketingAgent    │    Phase 2: 戦略策定
│   ひろめるん 🟢    │    - GTM戦略
│                   │    - チャネル選定
│                   │    - 予算配分
└────────┬─────────┘
         │ 戦略方針
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ContentCreate │   │SNSStrategy   │   │YouTubeAgent  │
│  かくちゃん🟢 │   │つぶやきくん🟢│   │  どうがん🟢   │
│              │   │              │   │              │
│ブログ・SEO    │   │SNS投稿計画   │   │YouTube戦略   │
│記事生成       │   │投稿カレンダー │   │SEO最適化     │
│ランディングページ│ │ハッシュタグ   │   │スクリプト作成 │
└──────────────┘   └──────────────┘   └──────────────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │ 実行結果
                            ▼
                  ┌──────────────────┐
                  │ AnalyticsAgent   │    Phase 3: 効果測定
                  │   かぞえるん 🔵   │    - KPI追跡
                  │                  │    - PDCA分析
                  │                  │    - ROI計算
                  └──────────────────┘
```

**並列実行ポイント**: ContentCreationAgent、SNSStrategyAgent、YouTubeAgent の3体は互いに依存関係がないため、MarketingAgent の戦略方針確定後に並列実行可能。

### 5.3 営業・顧客管理チーム（3体）の連携

営業チームは SalesAgent を中心に、CRMAgent と AnalyticsAgent が連携してセールスパイプラインを管理する。

```
┌──────────────────┐
│  SalesAgent       │    Phase 1: 営業活動
│  うりこみくん 🟢   │    - SPIN Selling
│                   │    - 営業パイプライン管理
│                   │    - 提案書作成
│                   │    - 商談管理
└────────┬─────────┘
         │ 顧客データ・商談結果
         ▼
┌──────────────────┐
│  CRMAgent         │    Phase 2: 顧客関係管理
│  つなぐん 🟡       │    - 顧客データベース管理
│                   │    - LTV最大化施策
│                   │    - チャーン（解約）防止
│                   │    - アップセル/クロスセル推奨
└────────┬─────────┘
         │ CRMデータ
         ▼
┌──────────────────┐
│ AnalyticsAgent    │    Phase 3: 分析・改善
│  かぞえるん 🔵     │    - セールスKPI分析
│                   │    - コンバージョン率追跡
│                   │    - PDCA サイクル提案
│                   │    - 予測分析
└────────┬─────────┘
         │ 分析結果・改善提案
         ▼
     SalesAgent にフィードバック（PDCAループ）
```

**CRMAgent の依存条件**: CRMAgent は🟡サポートとして、SalesAgent の商談データと AnalyticsAgent の分析結果を統合する。両エージェントのアウトプットがなければCRM運用が成立しないため条件付き実行となる。

---

## 6. SDK・拡張性

### 6.1 BaseAgent / BusinessBaseAgent の継承構造

Miyabi のエージェントは2つの基底クラスから派生する:

```
IAgent (interface)
├── BaseAgent (abstract class) ─── コーディングエージェント用
│   ├── CoordinatorAgent
│   ├── CodeGenAgent
│   ├── ReviewAgent
│   ├── IssueAgent
│   ├── PRAgent
│   ├── DeploymentAgent
│   └── TestAgent
│
└── BusinessBaseAgent (abstract class) ─── ビジネスエージェント用
    ├── AIEntrepreneurAgent
    ├── ProductConceptAgent
    ├── ProductDesignAgent
    ├── FunnelDesignAgent
    ├── PersonaAgent
    ├── SelfAnalysisAgent
    ├── MarketResearchAgent
    ├── MarketingAgent
    ├── ContentCreationAgent
    ├── SNSStrategyAgent
    ├── YouTubeAgent
    ├── SalesAgent
    ├── CRMAgent
    └── AnalyticsAgent
```

#### 6.1.1 IAgent インターフェース（packages/core）

```typescript
interface IAgent {
  name: string;
  version: string;
  execute(): Promise<void>;
}
```

#### 6.1.2 BaseAgent（packages/coding-agents）

BaseAgent はコーディングエージェント共通の150+行の抽象基底クラス。

**提供機能**:
- ライフサイクル管理（9ステップ）
- メトリクス自動収集
- LDDログ記録
- パフォーマンス監視
- イベント発信
- リトライ制御（retries=3, exponential backoff）

**必須オーバーライド**:
```typescript
abstract execute(task: Task): Promise<AgentResult>;
```

**オプションオーバーライド**:
```typescript
protected validateTask(task: Task): void;     // タスク検証カスタマイズ
protected recordMetrics(result: AgentResult): void;  // メトリクス記録カスタマイズ
```

#### 6.1.3 BusinessBaseAgent（packages/core）

BusinessBaseAgent はビジネスエージェント共通の抽象基底クラス。Claude APIとの直接統合を内蔵する。

```typescript
abstract class BusinessBaseAgent {
  // コンストラクタ
  constructor(config: BusinessAgentConfig, agentType: string)

  // 必須オーバーライド
  abstract execute(task: BusinessTask): Promise<BusinessResult>;

  // 提供ユーティリティ
  protected validateTask(task: BusinessTask): void;
  protected log(message: string, level: 'info'|'warning'|'error'): void;
  protected callClaude(prompt: string, systemPrompt?: string, model?: string): Promise<string>;
  protected formatResult(...): BusinessResult;
  protected handleError(error: Error, context: string): BusinessResult;
}
```

**BusinessAgentConfig**:
```typescript
interface BusinessAgentConfig {
  anthropicApiKey: string;        // Claude API キー（必須）
  githubToken?: string;           // GitHub トークン（オプション）
  debug?: boolean;                // デバッグモード
  logDirectory?: string;          // ログ出力先
}
```

**BusinessResult**:
```typescript
interface BusinessResult {
  success: boolean;
  data: Record<string, unknown>;
  insights?: string[];            // 洞察
  recommendations?: string[];    // 推奨事項
  nextSteps?: string[];           // 次のステップ
  error?: string;
}
```

**Claudeモデル**: `claude-sonnet-4-20250514`（デフォルト）、Max Tokens: 8,192

### 6.2 カスタムエージェント作成方法

#### 6.2.1 コーディングエージェントの作成

```typescript
import { BaseAgent, AgentResult, Task } from '@miyabi/coding-agents/base-agent';

class CustomCodingAgent extends BaseAgent {
  readonly name = 'CustomCodingAgent';
  readonly version = '1.0.0';

  async execute(task: Task): Promise<AgentResult> {
    // カスタムロジック
    const result = await this.performCustomWork(task);

    return {
      status: result.ok ? 'success' : 'failure',
      message: result.message,
      metrics: this.collectMetrics(),
      artifacts: result.files,
    };
  }

  protected validateTask(task: Task): void {
    // カスタム検証ロジック
    if (!task.description) {
      throw new Error('Task description is required');
    }
  }
}

// AgentRegistry に登録
import { AgentRegistry } from '@agentic-os/core/agents';
const registry = AgentRegistry.getInstance();
registry.register('custom-coding', new CustomCodingAgent());
```

#### 6.2.2 ビジネスエージェントの作成

```typescript
import { BusinessBaseAgent, BusinessTask, BusinessResult, BusinessAgentConfig } from '@agentic-os/core';

class CustomBusinessAgent extends BusinessBaseAgent {
  constructor(config: BusinessAgentConfig) {
    super(config, 'custom-business');
  }

  async execute(task: BusinessTask): Promise<BusinessResult> {
    this.validateTask(task);
    this.log(`Executing: ${task.description}`, 'info');

    // Claude API を使用した分析
    const analysis = await this.callClaude(
      `Analyze the following: ${task.description}`,
      'You are a business strategy expert.',
    );

    return this.formatResult({
      success: true,
      data: { analysis },
      insights: ['Key insight from analysis'],
      recommendations: ['Recommended action'],
      nextSteps: ['Follow-up step'],
    });
  }
}
```

### 6.3 DynamicAgent によるテンプレート実行

Miyabi のテンプレートシステム（miyabi_def/）では、Jinja2テンプレートから動的にエージェント定義を生成できる。

**agents.yaml.j2 テンプレート**: 21エージェントの完全定義を含む。

**生成コマンド**:
```bash
python generate.py                          # 全ファイル生成
python generate.py --list-templates         # テンプレート一覧
python generate.py --intent <file>          # インテント駆動生成
```

**テンプレートから生成される定義**:
- 21エージェントのメタデータ（名前、役割、権限、依存関係）
- 18スキルの定義
- 5ワークフロー（38ステージ）の定義
- 57ラベルの定義
- 39リレーションの定義

### 6.4 パッケージ間依存関係図

```
packages/cli (miyabi v0.22.0)
├── @agentic-os/core
├── @miyabi/shared-utils
├── agent-skill-bus (^1.2.0, 110+スキル)
├── miyabi-agent-sdk (^0.1.0-alpha.2)
└── 外部: commander, inquirer, @octokit/*, chalk, yaml, dotenv

@agentic-os/core (v0.1.0)
├── 再エクスポート: @miyabi/coding-agents
├── エクスポート: BusinessBaseAgent
└── 外部: @anthropic-ai/sdk (^0.71.2), @octokit/* (^21.1.1 / ^8.2.1)

packages/coding-agents
├── BaseAgent, 7エージェント実装
├── feedback-loop (Auto-Loop パターン)
├── water-spider (セッション管理)
├── worktree (git worktree ユーティリティ)
├── monitoring (パフォーマンス監視)
└── omega-system (6段階パイプライン)

@miyabi/shared-utils (v0.1.0)
├── モノレポ内依存なし
├── 外部依存なし（純TypeScript）
└── エクスポート: withRetry, getGitHubClient, AsyncFileWriter, SystemOptimizer

packages/miyabi-agent-sdk (v0.1.0-alpha.2)
├── AgentContext, AgentResult インターフェース
└── リトライ設定, エラーハンドリング

packages/task-manager (v0.1.0)
├── @anthropic-ai/sdk, @octokit/*, uuid
├── TaskStateMachine (10状態, 28遷移ルール)
├── LLMDecomposer (DAG構築)
├── TaskExecutor (並列実行)
├── WorktreeCoordinator (分離実行)
└── BidirectionalSync (GitHub同期)

packages/github-projects (v1.0.0)
├── GitHubProjectsClient
├── カスタムフィールド管理
└── メトリクス計算, WeeklyReport生成
```

---

## 7. パフォーマンス・SLA体系

### 7.1 SLAティア分類

全21エージェントは3つのSLAティアに分類される。ティアは可用性、応答時間、成功率、復旧時間の目標値を規定する。

#### Tier 1: Critical（ミッションクリティカル）

| エージェント | 可用性 | 応答時間(P95) | 成功率 | 復旧時間 |
|---|---|---|---|---|
| CoordinatorAgent（しきるん） | 99.9% | <10秒 | >99% | <5分 |
| DeploymentAgent（はこぶん） | 99.9% | <10秒 | >99% | <5分 |

**根拠**: CoordinatorAgent は全パイプラインの起点であり、障害時は全エージェントが停止する。DeploymentAgent は本番環境への影響があるため最高レベルのSLAが必要。

#### Tier 2: High（高可用性）

| エージェント | 可用性 | 応答時間(P95) | 成功率 | 復旧時間 |
|---|---|---|---|---|
| CodeGenAgent（つくるん） | 99.5% | <30秒 | >95% | <15分 |
| ReviewAgent（めだまん） | 99.5% | <30秒 | >95% | <15分 |
| IssueAgent（みつけるん） | 99.5% | <30秒 | >95% | <15分 |
| PRAgent（まとめるん） | 99.5% | <30秒 | >95% | <15分 |

**根拠**: コーディングパイプラインの中核エージェントであり、遅延や障害がIssue→PR変換時間に直接影響する。

#### Tier 3: Standard（標準）

| エージェント | 可用性 | 応答時間(P95) | 成功率 | 復旧時間 |
|---|---|---|---|---|
| TestAgent（たしかめるん） | 99.0% | <60秒 | >90% | <30分 |
| AIEntrepreneurAgent（あきんどさん） | 99.0% | <60秒 | >90% | <30分 |
| ProductConceptAgent（ひらめきくん） | 99.0% | <60秒 | >90% | <30分 |
| ProductDesignAgent（かくん） | 99.0% | <60秒 | >90% | <30分 |
| FunnelDesignAgent（みちびきくん） | 99.0% | <60秒 | >90% | <30分 |
| PersonaAgent（なりきりん） | 99.0% | <60秒 | >90% | <30分 |
| SelfAnalysisAgent（じぶんしるん） | 99.0% | <60秒 | >90% | <30分 |
| MarketResearchAgent（しらべるん） | 99.0% | <60秒 | >90% | <30分 |
| MarketingAgent（ひろめるん） | 99.0% | <60秒 | >90% | <30分 |
| ContentCreationAgent（かくちゃん） | 99.0% | <60秒 | >90% | <30分 |
| SNSStrategyAgent（つぶやきくん） | 99.0% | <60秒 | >90% | <30分 |
| YouTubeAgent（どうがん） | 99.0% | <60秒 | >90% | <30分 |
| SalesAgent（うりこみくん） | 99.0% | <60秒 | >90% | <30分 |
| CRMAgent（つなぐん） | 99.0% | <60秒 | >90% | <30分 |
| AnalyticsAgent（かぞえるん） | 99.0% | <60秒 | >90% | <30分 |

### 7.2 全エージェントメトリクス一覧

#### 7.2.1 共通メトリクス（全21エージェント共通）

| メトリクス | 目標値 | 単位 | 収集方法 |
|---|---|---|---|
| execution_time | <120秒 | ms | PerformanceMonitor |
| success_rate | >90% | % | globalMetricsCollector |
| retry_count | <2 | 回 | BaseAgent.run() |
| error_rate | <5% | % | globalMetricsCollector |
| memory_usage | <512MB | MB | process.memoryUsage() |
| token_usage | <50K | tokens | Claude API応答 |
| cost_per_task | <$0.10 | USD | トークン単価計算 |

#### 7.2.2 エージェント固有メトリクス

| # | エージェント | 固有メトリクス | 目標値 |
|---|---|---|---|
| 1 | CoordinatorAgent | DAG生成時間 | <30秒 |
| 1 | CoordinatorAgent | タスク分解精度 | >95% |
| 1 | CoordinatorAgent | 並列効率 | >70% |
| 2 | CodeGenAgent | コード生成時間 | <60秒 |
| 2 | CodeGenAgent | 品質スコア | >80/100 |
| 2 | CodeGenAgent | テストカバレッジ | >80% |
| 3 | ReviewAgent | レビュー時間 | <90秒 |
| 3 | ReviewAgent | 問題検出率 | >90% |
| 3 | ReviewAgent | 偽陽性率 | <10% |
| 4 | IssueAgent | 分析時間 | <15秒 |
| 4 | IssueAgent | ラベル精度 | >90% |
| 4 | IssueAgent | 重複検出率 | >70% |
| 5 | PRAgent | PR作成時間 | <30秒 |
| 5 | PRAgent | マージ成功率 | >95% |
| 6 | DeploymentAgent | デプロイ時間 | <300秒（5分） |
| 6 | DeploymentAgent | 可用性 | 99.9% |
| 6 | DeploymentAgent | 応答時間(P95) | <10秒 |
| 6 | DeploymentAgent | 成功率 | >99% |
| 7 | TestAgent | テスト実行時間 | <180秒 |
| 7 | TestAgent | テスト合格率 | >95% |
| 7 | TestAgent | カバレッジ達成率 | >80% |

#### 7.2.3 システム全体パフォーマンス目標

| メトリクス | 目標値 | 説明 |
|---|---|---|
| Issue → PR | 4-7分 | Issue作成からPR作成完了まで |
| Issue → Production | 10-15分 | Issue作成から本番デプロイまで |
| コード生成 | 3-4分 | CodeGenAgent 単体 |
| 品質チェック | 1分 | ReviewAgent 単体 |
| PR作成 | 30秒 | PRAgent 単体 |
| ファイル/タスク | 6-12ファイル | 1タスクあたりの生成ファイル数 |
| 行数/タスク | 450-800行 | 1タスクあたりの生成コード行数 |
| 品質スコア | 80-95点 | ReviewAgent 100点満点 |
| テストカバレッジ | 85%+ | statements, branches, functions, lines |

### 7.3 品質ゲート体系

#### 7.3.1 ReviewAgent 100点満点スコアリング

**公式（コーディングスキル版）**:
```
score = type_safety * 0.30
      + test_coverage * 0.30
      + lint_compliance * 0.20
      + documentation * 0.20
```

**公式（Quality Gate スキル版）**:
```
score = correctness * 0.25
      + security * 0.20
      + performance * 0.15
      + readability * 0.15
      + maintainability * 0.15
      + test_coverage * 0.10
```

**グレード判定**:

| スコア | グレード | アクション |
|---|---|---|
| 90-100 | Excellent | PR即時作成、優先マージ推奨 |
| 80-89 | Good | PR作成許可（標準フロー） |
| 60-79 | Fair / Needs Improvement | CodeGenAgent へリトライ指示（最大3回） |
| 40-59 | - | 人間にエスカレーション |
| 0-39 | Poor | ブロック、即時エスカレーション |

### 7.4 経済ガバナンス（コスト制約）

| 項目 | 月間予算 | 詳細 |
|---|---|---|
| Anthropic API | $400 USD | 10M tokens/month |
| GitHub Actions | $0 USD | 無料枠使用 |
| Firebase | $100 USD | ステージング/プロダクション |
| **合計** | **$500 USD** | 月間上限 |

**サーキットブレーカーパターン**:

| 閾値 | アクション |
|---|---|
| 80% ($400) | 警告アラート送信 |
| 150% ($750) | ワークフロー自動停止（agent-runner, continuous-improvement, agent-onboarding 無効化） |

**緊急時復旧要件**:
1. Guardian承認
2. 根本原因分析（RCA）完了
3. リソースクリーンアップ実施

### 7.5 監視・ダッシュボード

**WebSocket リアルタイム監視**（Port 3001）:

```typescript
interface AgentDashboard {
  realTimeMetrics: {
    activeAgents: ActiveAgentInfo[];    // 現在稼働中のエージェント
    queuedTasks: number;                // キュー内タスク数
    avgExecutionTime: number;           // 平均実行時間
    currentThroughput: number;          // tasks/minute
  };
  historicalData: {
    dailyExecutions: Record<string, number>;      // 日別実行数
    successRate: Record<AgentType, number>;        // エージェント別成功率
    completionTimeDistribution: { fast, medium, slow };
  };
  alerts: DashboardAlert[];
}
```

**アラート閾値**:

| アラート条件 | 閾値 | 重大度 |
|---|---|---|
| 高エラー率 | >10% | Critical |
| 長時間実行タスク | >30分 | Warning |
| キューオーバーフロー | >50タスク | Critical |
| コスト超過（警告） | >80% of budget | Warning |
| コスト超過（緊急） | >150% of budget | Critical（自動停止） |

**更新間隔**: 1秒（updateInterval: 1000）
**データ保持**: 7日間（retentionDays: 7）
**最大エラーログ**: 100件（maxErrorLogs: 100）

---

## 付録A: 設計パターン一覧

Miyabi エージェントエコシステム全体で使用される設計パターンの一覧:

| パターン | 使用箇所 | 目的 |
|---|---|---|
| Singleton | AgentRegistry, AsyncFileWriter, GitHubClient | 一意なインスタンス管理 |
| Factory | AgentFactory, register*Command関数 | エージェント/コマンドの動的生成 |
| Abstract Factory | BaseAgent, BusinessBaseAgent | エージェント系統別の基底クラス |
| Builder | AgentConfig, PipelineContext | 段階的なオブジェクト構築 |
| Observer | Pipeline executor (EventEmitter), WebSocket | イベント駆動通知 |
| Strategy | リトライ戦略、コマンド実行戦略、マージ戦略 | アルゴリズムの差替え |
| State Machine | TaskStateMachine (10状態, 28遷移) | タスクライフサイクル管理 |
| Composite | パイプラインコマンド合成 | コマンドの木構造化 |
| Circuit Breaker | 経済ガバナンス、レート制限 | 障害の伝播防止 |
| DAG (Directed Acyclic Graph) | CoordinatorAgent タスク分解 | 依存関係の管理と並列度計算 |

## 付録B: エージェント関連ファイルパス

| パッケージ | パス | 内容 |
|---|---|---|
| Core | `packages/core/` | IAgent, AgentRegistry, BusinessBaseAgent |
| CLI | `packages/cli/` | Commander.js 30コマンド |
| Coding Agents | `packages/coding-agents/` | 7コーディングエージェント実装 |
| Agent SDK | `packages/miyabi-agent-sdk/` | AgentContext, AgentResult |
| Task Manager | `packages/task-manager/` | TaskStateMachine, LLMDecomposer, TaskExecutor |
| GitHub Projects | `packages/github-projects/` | GitHubProjectsClient, メトリクス |
| MCP Bundle | `packages/mcp-bundle/` | 172ツール, 21カテゴリ |
| Web UI | `packages/miyabi-web/` | Next.js 15 ワークフローエディタ |
| Context Engineering | `packages/context-engineering/` | プロンプト最適化SDK |
| Doc Generator | `packages/doc-generator/` | ts-morph + Handlebars |
| Shared Utils | `packages/shared-utils/` | リトライ, キャッシュ, 非同期IO |

## 付録C: 自律の三法則

Miyabi エージェントシステムの根本的な行動原則:

| # | 法則 | 内容 | 実装 |
|---|---|---|---|
| 1 | 客観性の法則 | 感情・感傷を排除。データ駆動のみ | 品質スコア0-100、合格≥80 |
| 2 | 自給自足の法則 | 人間依存最小化 | エスカレーション率 ≤5% 目標 |
| 3 | 追跡可能性の法則 | 全アクションをGitHubに記録 | `.ai/logs/YYYY-MM-DD.md` 完全監査証跡 |

---

*本文書は Miyabi プロジェクトの8つのリサーチファイル（01-08）を統合し、21エージェントの完全なエコシステムマップとして構造化したものである。*
