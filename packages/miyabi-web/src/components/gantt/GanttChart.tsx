'use client';

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from 'react';

// ─────────────────────────────────────────────
// 型定義 (Type Definitions)
// ─────────────────────────────────────────────

/** タスクの状態 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/** ズームレベル */
export type ZoomLevel = 'day' | 'week' | 'month';

/** タスク定義 */
export interface Task {
  /** 一意のID */
  id: string;
  /** タスク名 */
  name: string;
  /** 開始日 */
  startDate: Date;
  /** 終了日 */
  endDate: Date;
  /** 進捗率 (0-100) */
  progress: number;
  /** 状態 */
  status: TaskStatus;
  /** 所属グループID */
  groupId?: string;
  /** 依存タスクID一覧 */
  dependencies?: string[];
  /** クリティカルパス上のタスクか */
  isCritical?: boolean;
  /** エージェント種別 */
  agentType?: string;
  /** 説明 */
  description?: string;
}

/** マイルストーン定義 */
export interface Milestone {
  /** 一意のID */
  id: string;
  /** マイルストーン名 */
  name: string;
  /** 日付 */
  date: Date;
  /** 表示色 */
  color?: string;
}

/** グループ定義 */
export interface TaskGroup {
  /** 一意のID */
  id: string;
  /** グループ名 */
  name: string;
  /** 折りたたみ状態 */
  collapsed?: boolean;
}

/** ガントチャート設定 */
export interface GanttConfig {
  /** ズームレベル */
  zoom: ZoomLevel;
  /** ダークモード */
  darkMode: boolean;
  /** 今日線の表示 */
  showTodayLine: boolean;
  /** 依存線の表示 */
  showDependencies: boolean;
  /** クリティカルパスの強調表示 */
  highlightCriticalPath: boolean;
  /** 行の高さ (px) */
  rowHeight: number;
  /** ヘッダーの高さ (px) */
  headerHeight: number;
}

/** ガントチャート Props */
export interface GanttChartProps {
  /** タスク一覧 */
  tasks: Task[];
  /** マイルストーン一覧 */
  milestones?: Milestone[];
  /** グループ一覧 */
  groups?: TaskGroup[];
  /** 設定（部分的なオーバーライド可能） */
  config?: Partial<GanttConfig>;
  /** クラス名 */
  className?: string;
}

// ─────────────────────────────────────────────
// 雅カラーパレット (Miyabi Color Palette)
// ─────────────────────────────────────────────

const MIYABI_COLORS = {
  pink: '#f8b4c8',
  pinkLight: '#fce4ec',
  pinkDark: '#e91e63',
  indigo: '#1e3a5f',
  indigoLight: '#3d5a80',
  indigoDark: '#0d1b2a',
  gold: '#d4a843',
  goldLight: '#f5e6c8',
  goldDark: '#b8860b',
} as const;

// ─────────────────────────────────────────────
// デフォルト設定
// ─────────────────────────────────────────────

const DEFAULT_CONFIG: GanttConfig = {
  zoom: 'week',
  darkMode: false,
  showTodayLine: true,
  showDependencies: true,
  highlightCriticalPath: true,
  rowHeight: 48,
  headerHeight: 56,
};

// ─────────────────────────────────────────────
// サンプルデータ — Miyabi エージェントパイプライン
// ─────────────────────────────────────────────

const today = new Date();
function daysFromNow(offset: number): Date {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d;
}

/** サンプルグループ */
export const SAMPLE_GROUPS: TaskGroup[] = [
  { id: 'analysis', name: '分析フェーズ' },
  { id: 'development', name: '開発フェーズ' },
  { id: 'delivery', name: '納品フェーズ' },
];

/** サンプルタスク — Miyabi パイプライン */
export const SAMPLE_TASKS: Task[] = [
  {
    id: 'issue-agent',
    name: 'IssueAgent — 課題分析',
    startDate: daysFromNow(-10),
    endDate: daysFromNow(-7),
    progress: 100,
    status: 'completed',
    groupId: 'analysis',
    agentType: 'issue',
    description: 'Issue分析、53ラベル分類、優先度決定',
    isCritical: true,
  },
  {
    id: 'coordinator-agent',
    name: 'CoordinatorAgent — タスク分解',
    startDate: daysFromNow(-7),
    endDate: daysFromNow(-4),
    progress: 100,
    status: 'completed',
    groupId: 'analysis',
    dependencies: ['issue-agent'],
    agentType: 'coordinator',
    description: 'DAG構築、サブタスク分解、依存関係解析',
    isCritical: true,
  },
  {
    id: 'codegen-agent',
    name: 'CodeGenAgent — コード生成',
    startDate: daysFromNow(-4),
    endDate: daysFromNow(0),
    progress: 75,
    status: 'running',
    groupId: 'development',
    dependencies: ['coordinator-agent'],
    agentType: 'codegen',
    description: 'Claude Sonnet 4によるコード生成',
    isCritical: true,
  },
  {
    id: 'review-agent',
    name: 'ReviewAgent — コードレビュー',
    startDate: daysFromNow(0),
    endDate: daysFromNow(2),
    progress: 0,
    status: 'pending',
    groupId: 'development',
    dependencies: ['codegen-agent'],
    agentType: 'review',
    description: '品質スコア80+必須、自動リトライ最大3回',
    isCritical: true,
  },
  {
    id: 'pr-agent',
    name: 'PRAgent — PR作成',
    startDate: daysFromNow(2),
    endDate: daysFromNow(3),
    progress: 0,
    status: 'pending',
    groupId: 'delivery',
    dependencies: ['review-agent'],
    agentType: 'pr',
    description: 'Conventional Commits形式のPR作成',
    isCritical: true,
  },
  {
    id: 'deployment-agent',
    name: 'DeploymentAgent — デプロイ',
    startDate: daysFromNow(3),
    endDate: daysFromNow(5),
    progress: 0,
    status: 'pending',
    groupId: 'delivery',
    dependencies: ['pr-agent'],
    agentType: 'deployment',
    description: 'CI/CD自動化、本番デプロイ',
    isCritical: true,
  },
];

/** サンプルマイルストーン */
export const SAMPLE_MILESTONES: Milestone[] = [
  { id: 'ms-analysis-done', name: '分析完了', date: daysFromNow(-4), color: MIYABI_COLORS.gold },
  { id: 'ms-release', name: 'リリース', date: daysFromNow(5), color: MIYABI_COLORS.pinkDark },
];

// ─────────────────────────────────────────────
// ユーティリティ関数
// ─────────────────────────────────────────────

/** 日数の差分を計算 */
function diffDays(a: Date, b: Date): number {
  return Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/** ズームレベルごとの1列幅 (px) */
function columnWidth(zoom: ZoomLevel): number {
  switch (zoom) {
    case 'day':
      return 40;
    case 'week':
      return 120;
    case 'month':
      return 200;
  }
}

/** 日付をフォーマット */
function formatDate(date: Date, zoom: ZoomLevel): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  switch (zoom) {
    case 'day':
      return `${m}/${d}`;
    case 'week':
      return `${m}/${d}週`;
    case 'month':
      return `${date.getFullYear()}年${m}月`;
  }
}

/** ズームレベルごとのステップ日数 */
function stepDays(zoom: ZoomLevel): number {
  switch (zoom) {
    case 'day':
      return 1;
    case 'week':
      return 7;
    case 'month':
      return 30;
  }
}

/** 状態の表示ラベル */
function statusLabel(status: TaskStatus): string {
  switch (status) {
    case 'pending':
      return '待機中';
    case 'running':
      return '実行中';
    case 'completed':
      return '完了';
    case 'failed':
      return '失敗';
  }
}

/** 状態の表示アイコン */
function statusIcon(status: TaskStatus): string {
  switch (status) {
    case 'pending':
      return '\u23F3'; // hourglass
    case 'running':
      return '\uD83D\uDD04'; // arrows
    case 'completed':
      return '\u2705'; // check
    case 'failed':
      return '\u274C'; // cross
  }
}

// ─────────────────────────────────────────────
// CSS変数テーマ
// ─────────────────────────────────────────────

function themeVars(dark: boolean): CSSProperties {
  if (dark) {
    return {
      '--gantt-bg': '#0f172a',
      '--gantt-surface': '#1e293b',
      '--gantt-surface-hover': '#334155',
      '--gantt-border': '#334155',
      '--gantt-text': '#f1f5f9',
      '--gantt-text-secondary': '#94a3b8',
      '--gantt-grid-line': 'rgba(148, 163, 184, 0.08)',
      '--gantt-today-line': MIYABI_COLORS.gold,
      '--gantt-shadow': 'rgba(0, 0, 0, 0.4)',
    } as CSSProperties;
  }
  return {
    '--gantt-bg': '#ffffff',
    '--gantt-surface': '#f8fafc',
    '--gantt-surface-hover': '#f1f5f9',
    '--gantt-border': '#e2e8f0',
    '--gantt-text': '#0f172a',
    '--gantt-text-secondary': '#64748b',
    '--gantt-grid-line': 'rgba(148, 163, 184, 0.15)',
    '--gantt-today-line': MIYABI_COLORS.pinkDark,
    '--gantt-shadow': 'rgba(0, 0, 0, 0.08)',
  } as CSSProperties;
}

// ─────────────────────────────────────────────
// サブコンポーネント
// ─────────────────────────────────────────────

/** ツールバー — ズーム・テーマ切替 */
function Toolbar({
  config,
  onZoomChange,
  onDarkModeToggle,
}: {
  config: GanttConfig;
  onZoomChange: (z: ZoomLevel) => void;
  onDarkModeToggle: () => void;
}) {
  const zooms: { value: ZoomLevel; label: string }[] = [
    { value: 'day', label: '日' },
    { value: 'week', label: '週' },
    { value: 'month', label: '月' },
  ];

  return (
    <div
      className="flex items-center justify-between px-5 py-3"
      style={{
        borderBottom: '1px solid var(--gantt-border)',
        background: 'var(--gantt-surface)',
      }}
    >
      {/* タイトル */}
      <div className="flex items-center gap-3">
        <h2
          className="text-base font-semibold tracking-tight"
          style={{ color: 'var(--gantt-text)' }}
        >
          Miyabi パイプライン
        </h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: MIYABI_COLORS.pinkLight,
            color: MIYABI_COLORS.pinkDark,
          }}
        >
          ガントチャート
        </span>
      </div>

      {/* コントロール */}
      <div className="flex items-center gap-2">
        {/* ズーム切替 */}
        <div
          className="flex rounded-lg overflow-hidden"
          role="radiogroup"
          aria-label="ズームレベル"
          style={{
            border: '1px solid var(--gantt-border)',
          }}
        >
          {zooms.map((z) => (
            <button
              key={z.value}
              role="radio"
              aria-checked={config.zoom === z.value}
              aria-label={`${z.label}表示`}
              onClick={() => onZoomChange(z.value)}
              className="px-3 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                background:
                  config.zoom === z.value
                    ? MIYABI_COLORS.indigo
                    : 'transparent',
                color:
                  config.zoom === z.value
                    ? '#ffffff'
                    : 'var(--gantt-text-secondary)',
              }}
            >
              {z.label}
            </button>
          ))}
        </div>

        {/* ダークモード切替 */}
        <button
          onClick={onDarkModeToggle}
          aria-label={config.darkMode ? 'ライトモードに切替' : 'ダークモードに切替'}
          data-testid="dark-mode-toggle"
          className="p-2 rounded-lg transition-all duration-200"
          style={{
            border: '1px solid var(--gantt-border)',
            color: 'var(--gantt-text-secondary)',
            background: 'transparent',
          }}
        >
          {config.darkMode ? (
            // 太陽アイコン — ライトモードへ
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            // 月アイコン — ダークモードへ
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/** タスクバー — 進捗グラデーション付き */
function TaskBar({
  task,
  left,
  width,
  isCriticalHighlight,
}: {
  task: Task;
  left: number;
  width: number;
  isCriticalHighlight: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  // 状態に応じたバーの色
  const barGradient = useMemo(() => {
    if (task.status === 'failed') {
      return `linear-gradient(135deg, #ef4444 0%, #dc2626 100%)`;
    }
    if (task.status === 'completed') {
      return `linear-gradient(135deg, ${MIYABI_COLORS.pink} 0%, ${MIYABI_COLORS.gold} 100%)`;
    }
    // 進捗部分: pink→gold グラデーション / 残り: 半透明
    return `linear-gradient(to right,
      ${MIYABI_COLORS.pink} 0%,
      ${MIYABI_COLORS.gold} ${task.progress}%,
      rgba(148, 163, 184, 0.2) ${task.progress}%,
      rgba(148, 163, 184, 0.2) 100%)`;
  }, [task.status, task.progress]);

  return (
    <div
      className="absolute flex items-center"
      style={{
        left: `${left}px`,
        width: `${Math.max(width, 24)}px`,
        height: '28px',
        top: '50%',
        transform: 'translateY(-50%)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`task-bar-${task.id}`}
    >
      {/* メインバー */}
      <div
        className="w-full h-full rounded-md transition-all duration-300"
        style={{
          background: barGradient,
          boxShadow: isCriticalHighlight
            ? `0 0 0 2px ${MIYABI_COLORS.gold}, 0 2px 8px var(--gantt-shadow)`
            : `0 1px 4px var(--gantt-shadow)`,
          opacity: task.status === 'pending' ? 0.7 : 1,
          transform: hovered ? 'scaleY(1.15)' : 'scaleY(1)',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
        }}
      />

      {/* 進捗テキスト */}
      {width > 50 && (
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-semibold pointer-events-none select-none"
          style={{
            color: task.status === 'completed' || task.progress > 50
              ? MIYABI_COLORS.indigo
              : 'var(--gantt-text-secondary)',
            textShadow: '0 1px 2px rgba(255,255,255,0.6)',
          }}
        >
          {task.progress}%
        </span>
      )}

      {/* ツールチップ — ホバー時表示 */}
      {hovered && (
        <div
          role="tooltip"
          data-testid={`tooltip-${task.id}`}
          className="absolute z-50 pointer-events-none"
          style={{
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: '220px',
          }}
        >
          <div
            className="rounded-xl px-4 py-3 text-xs"
            style={{
              background: 'var(--gantt-surface)',
              border: '1px solid var(--gantt-border)',
              boxShadow: '0 8px 32px var(--gantt-shadow)',
              color: 'var(--gantt-text)',
            }}
          >
            {/* ツールチップヘッダー */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{statusIcon(task.status)}</span>
              <span className="font-semibold text-sm" style={{ color: 'var(--gantt-text)' }}>
                {task.name}
              </span>
            </div>

            {/* 詳細情報 */}
            <div className="space-y-1" style={{ color: 'var(--gantt-text-secondary)' }}>
              <div className="flex justify-between">
                <span>状態</span>
                <span className="font-medium">{statusLabel(task.status)}</span>
              </div>
              <div className="flex justify-between">
                <span>進捗</span>
                <span className="font-medium">{task.progress}%</span>
              </div>
              <div className="flex justify-between">
                <span>期間</span>
                <span className="font-medium">
                  {task.startDate.getMonth() + 1}/{task.startDate.getDate()} 〜{' '}
                  {task.endDate.getMonth() + 1}/{task.endDate.getDate()}
                </span>
              </div>
              {task.description && (
                <div className="pt-1 mt-1" style={{ borderTop: '1px solid var(--gantt-border)' }}>
                  {task.description}
                </div>
              )}
            </div>

            {/* クリティカルパスバッジ */}
            {task.isCritical && (
              <div
                className="mt-2 text-center text-xs font-medium rounded-full px-2 py-0.5"
                style={{
                  background: MIYABI_COLORS.goldLight,
                  color: MIYABI_COLORS.goldDark,
                }}
              >
                クリティカルパス
              </div>
            )}

            {/* 吹き出し三角 */}
            <div
              className="absolute"
              style={{
                bottom: '-5px',
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '10px',
                height: '10px',
                background: 'var(--gantt-surface)',
                borderRight: '1px solid var(--gantt-border)',
                borderBottom: '1px solid var(--gantt-border)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** マイルストーンダイヤモンド */
function MilestoneDiamond({
  milestone,
  left,
}: {
  milestone: Milestone;
  left: number;
}) {
  const [hovered, setHovered] = useState(false);
  const color = milestone.color || MIYABI_COLORS.gold;

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${left}px`, top: 0, bottom: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`milestone-${milestone.id}`}
    >
      {/* ダイヤモンド */}
      <div
        className="relative"
        style={{
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          background: color,
          boxShadow: `0 0 0 2px ${color}33, 0 2px 6px ${color}44`,
          borderRadius: '2px',
          transition: 'transform 0.2s ease',
        }}
      />

      {/* ホバーラベル */}
      {hovered && (
        <div
          role="tooltip"
          className="absolute z-50 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium pointer-events-none"
          style={{
            bottom: 'calc(50% + 16px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: color,
            color: '#ffffff',
            boxShadow: `0 4px 12px ${color}44`,
          }}
        >
          {milestone.name} — {milestone.date.getMonth() + 1}/{milestone.date.getDate()}
        </div>
      )}
    </div>
  );
}

/** 依存線 (SVG) */
function DependencyLines({
  tasks,
  taskPositions,
  rowHeight,
}: {
  tasks: Task[];
  taskPositions: Map<string, { left: number; width: number; row: number }>;
  rowHeight: number;
}) {
  const lines: ReactNode[] = [];

  for (const task of tasks) {
    if (!task.dependencies) continue;
    const target = taskPositions.get(task.id);
    if (!target) continue;

    for (const depId of task.dependencies) {
      const source = taskPositions.get(depId);
      if (!source) continue;

      const x1 = source.left + source.width;
      const y1 = source.row * rowHeight + rowHeight / 2;
      const x2 = target.left;
      const y2 = target.row * rowHeight + rowHeight / 2;
      const midX = x1 + (x2 - x1) / 2;

      const isCritical =
        task.isCritical &&
        tasks.find((t) => t.id === depId)?.isCritical;

      lines.push(
        <path
          key={`${depId}-${task.id}`}
          d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
          fill="none"
          stroke={isCritical ? MIYABI_COLORS.gold : 'var(--gantt-text-secondary)'}
          strokeWidth={isCritical ? 2 : 1.5}
          strokeDasharray={isCritical ? 'none' : '6 3'}
          opacity={isCritical ? 0.8 : 0.4}
          data-testid={`dep-line-${depId}-${task.id}`}
        />,
      );

      // 矢印ヘッド
      const arrowSize = 5;
      lines.push(
        <polygon
          key={`arrow-${depId}-${task.id}`}
          points={`${x2},${y2} ${x2 - arrowSize * 2},${y2 - arrowSize} ${x2 - arrowSize * 2},${y2 + arrowSize}`}
          fill={isCritical ? MIYABI_COLORS.gold : 'var(--gantt-text-secondary)'}
          opacity={isCritical ? 0.8 : 0.4}
        />,
      );
    }
  }

  return <>{lines}</>;
}

// ─────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────

export default function GanttChart({
  tasks,
  milestones = [],
  groups = [],
  config: configOverride,
  className = '',
}: GanttChartProps) {
  const [config, setConfig] = useState<GanttConfig>({
    ...DEFAULT_CONFIG,
    ...configOverride,
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(groups.filter((g) => g.collapsed).map((g) => g.id)),
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── 設定変更ハンドラ ───
  const handleZoomChange = useCallback((zoom: ZoomLevel) => {
    setConfig((prev) => ({ ...prev, zoom }));
  }, []);

  const handleDarkModeToggle = useCallback(() => {
    setConfig((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // ─── タイムライン計算 ───
  const timeline = useMemo(() => {
    if (tasks.length === 0) {
      return { startDate: new Date(), totalDays: 30, columns: [] as { date: Date; label: string }[] };
    }

    // 全タスク・マイルストーンの範囲を計算
    let minDate = new Date(tasks[0].startDate);
    let maxDate = new Date(tasks[0].endDate);

    for (const t of tasks) {
      if (t.startDate < minDate) minDate = new Date(t.startDate);
      if (t.endDate > maxDate) maxDate = new Date(t.endDate);
    }
    for (const m of milestones) {
      if (m.date < minDate) minDate = new Date(m.date);
      if (m.date > maxDate) maxDate = new Date(m.date);
    }

    // 前後にパディングを追加
    const padDays = config.zoom === 'month' ? 15 : config.zoom === 'week' ? 5 : 2;
    minDate.setDate(minDate.getDate() - padDays);
    maxDate.setDate(maxDate.getDate() + padDays);

    const totalDays = diffDays(maxDate, minDate);
    const step = stepDays(config.zoom);
    const columns: { date: Date; label: string }[] = [];

    for (let i = 0; i <= totalDays; i += step) {
      const d = new Date(minDate);
      d.setDate(d.getDate() + i);
      columns.push({ date: d, label: formatDate(d, config.zoom) });
    }

    return { startDate: minDate, totalDays, columns };
  }, [tasks, milestones, config.zoom]);

  // ─── 表示行の構築 ───
  type RowItem =
    | { type: 'group'; group: TaskGroup }
    | { type: 'task'; task: Task };

  const rows = useMemo((): RowItem[] => {
    const result: RowItem[] = [];

    if (groups.length === 0) {
      // グループなし — タスクのみ
      for (const task of tasks) {
        result.push({ type: 'task', task });
      }
      return result;
    }

    // グループごとにタスクを整理
    const groupedTasks = new Map<string, Task[]>();
    const ungrouped: Task[] = [];

    for (const task of tasks) {
      if (task.groupId) {
        const list = groupedTasks.get(task.groupId) || [];
        list.push(task);
        groupedTasks.set(task.groupId, list);
      } else {
        ungrouped.push(task);
      }
    }

    for (const group of groups) {
      result.push({ type: 'group', group });
      if (!collapsedGroups.has(group.id)) {
        const groupTasks = groupedTasks.get(group.id) || [];
        for (const task of groupTasks) {
          result.push({ type: 'task', task });
        }
      }
    }

    // グループなしタスク
    for (const task of ungrouped) {
      result.push({ type: 'task', task });
    }

    return result;
  }, [tasks, groups, collapsedGroups]);

  // ─── タスク位置計算 ───
  const { taskPositions, totalWidth } = useMemo(() => {
    const colW = columnWidth(config.zoom);
    const totalW = timeline.columns.length * colW;
    const positions = new Map<string, { left: number; width: number; row: number }>();

    let taskRowIndex = 0;
    for (const row of rows) {
      if (row.type === 'task') {
        const task = row.task;
        const startOffset = diffDays(task.startDate, timeline.startDate);
        const duration = diffDays(task.endDate, task.startDate);
        const pxPerDay = totalW / Math.max(timeline.totalDays, 1);

        positions.set(task.id, {
          left: startOffset * pxPerDay,
          width: Math.max(duration * pxPerDay, 24),
          row: taskRowIndex,
        });
        taskRowIndex++;
      } else {
        // グループ行もカウント
        taskRowIndex++;
      }
    }

    return { taskPositions: positions, totalWidth: totalW };
  }, [rows, timeline, config.zoom]);

  // ─── 今日線の位置 ───
  const todayOffset = useMemo(() => {
    const daysFromStart = diffDays(today, timeline.startDate);
    const pxPerDay = totalWidth / Math.max(timeline.totalDays, 1);
    return daysFromStart * pxPerDay;
  }, [timeline, totalWidth]);

  // ─── 自動スクロール: 今日を中心に ───
  useEffect(() => {
    if (scrollRef.current && config.showTodayLine) {
      const container = scrollRef.current;
      const scrollTarget = todayOffset - container.clientWidth / 2;
      container.scrollLeft = Math.max(0, scrollTarget);
    }
  }, [todayOffset, config.showTodayLine]);

  // ─── サイドバー幅 ───
  const sidebarWidth = 240;

  return (
    <div
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{
        ...themeVars(config.darkMode),
        background: 'var(--gantt-bg)',
        border: '1px solid var(--gantt-border)',
        boxShadow: '0 4px 24px var(--gantt-shadow)',
        fontFamily: `-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif`,
      }}
      data-testid="gantt-chart"
      role="region"
      aria-label="ガントチャート"
    >
      {/* ツールバー */}
      <Toolbar
        config={config}
        onZoomChange={handleZoomChange}
        onDarkModeToggle={handleDarkModeToggle}
      />

      {/* メインエリア */}
      <div className="flex" style={{ minHeight: '300px' }}>
        {/* ─── 左サイドバー: タスク名 ─── */}
        <div
          className="flex-shrink-0"
          style={{
            width: `${sidebarWidth}px`,
            borderRight: '1px solid var(--gantt-border)',
            background: 'var(--gantt-surface)',
          }}
        >
          {/* サイドバーヘッダー */}
          <div
            className="flex items-center px-4 text-xs font-semibold uppercase tracking-wider"
            style={{
              height: `${config.headerHeight}px`,
              color: 'var(--gantt-text-secondary)',
              borderBottom: '1px solid var(--gantt-border)',
            }}
          >
            タスク名
          </div>

          {/* サイドバー行 */}
          {rows.map((row, i) => {
            if (row.type === 'group') {
              const isCollapsed = collapsedGroups.has(row.group.id);
              return (
                <button
                  key={`group-${row.group.id}`}
                  onClick={() => toggleGroup(row.group.id)}
                  className="w-full flex items-center gap-2 px-4 text-xs font-semibold transition-colors duration-150"
                  style={{
                    height: `${config.rowHeight}px`,
                    color: MIYABI_COLORS.indigo,
                    background: 'var(--gantt-surface)',
                    borderBottom: '1px solid var(--gantt-border)',
                  }}
                  aria-expanded={!isCollapsed}
                  aria-label={`${row.group.name}グループ${isCollapsed ? 'を展開' : 'を折りたたみ'}`}
                  data-testid={`group-toggle-${row.group.id}`}
                >
                  {/* 折りたたみ矢印 */}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    style={{
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{row.group.name}</span>
                </button>
              );
            }

            return (
              <div
                key={`task-label-${row.task.id}`}
                className="flex items-center gap-2 px-4 text-xs truncate transition-colors duration-150"
                style={{
                  height: `${config.rowHeight}px`,
                  color: 'var(--gantt-text)',
                  borderBottom: '1px solid var(--gantt-border)',
                  paddingLeft: row.task.groupId ? '28px' : '16px',
                }}
              >
                <span className="text-sm">{statusIcon(row.task.status)}</span>
                <span className="truncate font-medium">{row.task.name}</span>
              </div>
            );
          })}
        </div>

        {/* ─── 右エリア: タイムライン ─── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          style={{ position: 'relative' }}
        >
          {/* タイムラインコンテナ */}
          <div style={{ minWidth: `${totalWidth}px`, position: 'relative' }}>
            {/* ヘッダー: 日付列 */}
            <div
              className="flex sticky top-0 z-10"
              style={{
                height: `${config.headerHeight}px`,
                borderBottom: '1px solid var(--gantt-border)',
                background: 'var(--gantt-surface)',
              }}
            >
              {timeline.columns.map((col, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center text-xs font-medium flex-shrink-0"
                  style={{
                    width: `${columnWidth(config.zoom)}px`,
                    color: 'var(--gantt-text-secondary)',
                    borderRight: '1px solid var(--gantt-grid-line)',
                  }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* タスク行 */}
            <div style={{ position: 'relative' }}>
              {/* グリッド背景 */}
              {timeline.columns.map((_, i) => (
                <div
                  key={`grid-${i}`}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${i * columnWidth(config.zoom)}px`,
                    width: '1px',
                    background: 'var(--gantt-grid-line)',
                    height: `${rows.length * config.rowHeight}px`,
                  }}
                />
              ))}

              {/* 行の背景 (交互色) */}
              {rows.map((row, i) => (
                <div
                  key={`row-bg-${i}`}
                  style={{
                    height: `${config.rowHeight}px`,
                    background:
                      row.type === 'group'
                        ? 'var(--gantt-surface)'
                        : i % 2 === 0
                          ? 'transparent'
                          : 'var(--gantt-grid-line)',
                    borderBottom: '1px solid var(--gantt-grid-line)',
                  }}
                />
              ))}

              {/* 依存線 (SVG) */}
              {config.showDependencies && (
                <svg
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{
                    width: `${totalWidth}px`,
                    height: `${rows.length * config.rowHeight}px`,
                  }}
                  data-testid="dependency-lines"
                >
                  <DependencyLines
                    tasks={tasks}
                    taskPositions={taskPositions}
                    rowHeight={config.rowHeight}
                  />
                </svg>
              )}

              {/* タスクバー */}
              {rows.map((row, i) => {
                if (row.type !== 'task') return null;
                const pos = taskPositions.get(row.task.id);
                if (!pos) return null;

                return (
                  <div
                    key={`bar-${row.task.id}`}
                    className="absolute"
                    style={{
                      top: `${i * config.rowHeight}px`,
                      height: `${config.rowHeight}px`,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <TaskBar
                      task={row.task}
                      left={pos.left}
                      width={pos.width}
                      isCriticalHighlight={
                        config.highlightCriticalPath && !!row.task.isCritical
                      }
                    />
                  </div>
                );
              })}

              {/* マイルストーンダイヤモンド */}
              {milestones.map((ms) => {
                const daysFromStart = diffDays(ms.date, timeline.startDate);
                const pxPerDay = totalWidth / Math.max(timeline.totalDays, 1);
                const left = daysFromStart * pxPerDay;

                return (
                  <div
                    key={`ms-${ms.id}`}
                    className="absolute"
                    style={{
                      top: 0,
                      height: `${rows.length * config.rowHeight}px`,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <MilestoneDiamond milestone={ms} left={left} />
                  </div>
                );
              })}

              {/* 今日線 */}
              {config.showTodayLine && (
                <div
                  className="absolute top-0 z-20 pointer-events-none"
                  style={{
                    left: `${todayOffset}px`,
                    height: `${rows.length * config.rowHeight}px`,
                    width: '2px',
                    background: 'var(--gantt-today-line)',
                    boxShadow: `0 0 8px var(--gantt-today-line)`,
                  }}
                  data-testid="today-line"
                  aria-label="今日"
                >
                  {/* 今日ラベル */}
                  <div
                    className="absolute text-xs font-semibold px-2 py-0.5 rounded-b-md whitespace-nowrap"
                    style={{
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--gantt-today-line)',
                      color: '#ffffff',
                    }}
                  >
                    今日
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* フッター — 凡例 */}
      <div
        className="flex items-center gap-6 px-5 py-2.5 text-xs"
        style={{
          borderTop: '1px solid var(--gantt-border)',
          background: 'var(--gantt-surface)',
          color: 'var(--gantt-text-secondary)',
        }}
      >
        <span className="font-medium" style={{ color: 'var(--gantt-text)' }}>
          凡例:
        </span>

        {/* 進捗バー */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-2.5 rounded-sm"
            style={{
              background: `linear-gradient(135deg, ${MIYABI_COLORS.pink}, ${MIYABI_COLORS.gold})`,
            }}
          />
          <span>進捗</span>
        </div>

        {/* クリティカルパス */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-2.5 rounded-sm"
            style={{
              border: `2px solid ${MIYABI_COLORS.gold}`,
              background: 'transparent',
            }}
          />
          <span>クリティカルパス</span>
        </div>

        {/* マイルストーン */}
        <div className="flex items-center gap-1.5">
          <div
            style={{
              width: '8px',
              height: '8px',
              background: MIYABI_COLORS.gold,
              transform: 'rotate(45deg)',
              borderRadius: '1px',
            }}
          />
          <span>マイルストーン</span>
        </div>

        {/* 今日 */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-0.5"
            style={{ background: 'var(--gantt-today-line)' }}
          />
          <span>今日</span>
        </div>
      </div>
    </div>
  );
}
