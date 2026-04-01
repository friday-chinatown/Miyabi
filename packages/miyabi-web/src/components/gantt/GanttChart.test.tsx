import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GanttChart, {
  SAMPLE_TASKS,
  SAMPLE_GROUPS,
  SAMPLE_MILESTONES,
  type Task,
  type TaskGroup,
} from './GanttChart';

// ─────────────────────────────────────────────
// テストユーティリティ
// ─────────────────────────────────────────────

/** 最小限のタスクデータ */
function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-task',
    name: 'テストタスク',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-10'),
    progress: 50,
    status: 'running',
    ...overrides,
  };
}

// scrollTo のモック（JSDOM には存在しない）
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

// ─────────────────────────────────────────────
// テストスイート
// ─────────────────────────────────────────────

describe('GanttChart', () => {
  // ─── 基本レンダリング ───
  describe('基本レンダリング', () => {
    it('ガントチャートが正しくレンダリングされる', () => {
      render(<GanttChart tasks={[createTask()]} />);
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    it('タスク名がサイドバーに表示される', () => {
      const task = createTask({ name: 'IssueAgent — 課題分析' });
      render(<GanttChart tasks={[task]} />);
      expect(screen.getByText('IssueAgent — 課題分析')).toBeInTheDocument();
    });

    it('複数タスクが正しくレンダリングされる', () => {
      const tasks = [
        createTask({ id: 'task-1', name: 'タスク1' }),
        createTask({ id: 'task-2', name: 'タスク2' }),
        createTask({ id: 'task-3', name: 'タスク3' }),
      ];
      render(<GanttChart tasks={tasks} />);

      expect(screen.getByText('タスク1')).toBeInTheDocument();
      expect(screen.getByText('タスク2')).toBeInTheDocument();
      expect(screen.getByText('タスク3')).toBeInTheDocument();
    });

    it('タスクバーがレンダリングされる', () => {
      const task = createTask({ id: 'my-task' });
      render(<GanttChart tasks={[task]} />);
      expect(screen.getByTestId('task-bar-my-task')).toBeInTheDocument();
    });

    it('空のタスクリストでもクラッシュしない', () => {
      render(<GanttChart tasks={[]} />);
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    it('サンプルデータで全エージェントが表示される', () => {
      render(
        <GanttChart
          tasks={SAMPLE_TASKS}
          groups={SAMPLE_GROUPS}
          milestones={SAMPLE_MILESTONES}
        />,
      );

      expect(screen.getByText('IssueAgent — 課題分析')).toBeInTheDocument();
      expect(screen.getByText('CoordinatorAgent — タスク分解')).toBeInTheDocument();
      expect(screen.getByText('CodeGenAgent — コード生成')).toBeInTheDocument();
      expect(screen.getByText('ReviewAgent — コードレビュー')).toBeInTheDocument();
      expect(screen.getByText('PRAgent — PR作成')).toBeInTheDocument();
      expect(screen.getByText('DeploymentAgent — デプロイ')).toBeInTheDocument();
    });

    it('進捗率がバーに表示される', () => {
      const task = createTask({ progress: 75 });
      render(<GanttChart tasks={[task]} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  // ─── ズーム切替 ───
  describe('ズーム切替', () => {
    it('ズームボタンが3つ表示される', () => {
      render(<GanttChart tasks={[createTask()]} />);

      expect(screen.getByText('日')).toBeInTheDocument();
      expect(screen.getByText('週')).toBeInTheDocument();
      expect(screen.getByText('月')).toBeInTheDocument();
    });

    it('デフォルトで「週」が選択されている', () => {
      render(<GanttChart tasks={[createTask()]} />);
      const weekBtn = screen.getByRole('radio', { name: '週表示' });
      expect(weekBtn).toHaveAttribute('aria-checked', 'true');
    });

    it('「日」ボタンをクリックするとズームが切り替わる', () => {
      render(<GanttChart tasks={[createTask()]} />);
      const dayBtn = screen.getByRole('radio', { name: '日表示' });

      fireEvent.click(dayBtn);

      expect(dayBtn).toHaveAttribute('aria-checked', 'true');
      // 週ボタンはもう選択されていない
      const weekBtn = screen.getByRole('radio', { name: '週表示' });
      expect(weekBtn).toHaveAttribute('aria-checked', 'false');
    });

    it('「月」ボタンをクリックするとズームが切り替わる', () => {
      render(<GanttChart tasks={[createTask()]} />);
      const monthBtn = screen.getByRole('radio', { name: '月表示' });

      fireEvent.click(monthBtn);

      expect(monthBtn).toHaveAttribute('aria-checked', 'true');
    });
  });

  // ─── ダークモード ───
  describe('ダークモード', () => {
    it('デフォルトではライトモード', () => {
      render(<GanttChart tasks={[createTask()]} />);
      const chart = screen.getByTestId('gantt-chart');
      // ライトモードの背景色CSS変数を確認
      expect(chart.style.getPropertyValue('--gantt-bg')).toBe('#ffffff');
    });

    it('ダークモードトグルボタンが表示される', () => {
      render(<GanttChart tasks={[createTask()]} />);
      expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument();
    });

    it('トグルクリックでダークモードに切り替わる', () => {
      render(<GanttChart tasks={[createTask()]} />);
      const toggle = screen.getByTestId('dark-mode-toggle');

      fireEvent.click(toggle);

      const chart = screen.getByTestId('gantt-chart');
      expect(chart.style.getPropertyValue('--gantt-bg')).toBe('#0f172a');
    });

    it('ダークモードからもう一度クリックでライトモードに戻る', () => {
      render(<GanttChart tasks={[createTask()]} />);
      const toggle = screen.getByTestId('dark-mode-toggle');

      // ダークモードへ
      fireEvent.click(toggle);
      expect(
        screen.getByTestId('gantt-chart').style.getPropertyValue('--gantt-bg'),
      ).toBe('#0f172a');

      // ライトモードへ戻る
      fireEvent.click(toggle);
      expect(
        screen.getByTestId('gantt-chart').style.getPropertyValue('--gantt-bg'),
      ).toBe('#ffffff');
    });

    it('初期設定でダークモードを指定できる', () => {
      render(
        <GanttChart tasks={[createTask()]} config={{ darkMode: true }} />,
      );
      const chart = screen.getByTestId('gantt-chart');
      expect(chart.style.getPropertyValue('--gantt-bg')).toBe('#0f172a');
    });
  });

  // ─── グループ折りたたみ ───
  describe('グループ折りたたみ', () => {
    const groups: TaskGroup[] = [
      { id: 'group-a', name: '分析フェーズ' },
      { id: 'group-b', name: '開発フェーズ' },
    ];

    const tasks = [
      createTask({ id: 't1', name: 'タスクA1', groupId: 'group-a' }),
      createTask({ id: 't2', name: 'タスクA2', groupId: 'group-a' }),
      createTask({ id: 't3', name: 'タスクB1', groupId: 'group-b' }),
    ];

    it('グループヘッダーが表示される', () => {
      render(<GanttChart tasks={tasks} groups={groups} />);

      expect(screen.getByText('分析フェーズ')).toBeInTheDocument();
      expect(screen.getByText('開発フェーズ')).toBeInTheDocument();
    });

    it('展開状態ではグループ内タスクが表示される', () => {
      render(<GanttChart tasks={tasks} groups={groups} />);

      expect(screen.getByText('タスクA1')).toBeInTheDocument();
      expect(screen.getByText('タスクA2')).toBeInTheDocument();
      expect(screen.getByText('タスクB1')).toBeInTheDocument();
    });

    it('グループクリックで折りたためる', () => {
      render(<GanttChart tasks={tasks} groups={groups} />);
      const groupToggle = screen.getByTestId('group-toggle-group-a');

      // 折りたたみ前はタスクが見える
      expect(screen.getByText('タスクA1')).toBeInTheDocument();

      fireEvent.click(groupToggle);

      // 折りたたみ後はタスクが非表示
      expect(screen.queryByText('タスクA1')).not.toBeInTheDocument();
      expect(screen.queryByText('タスクA2')).not.toBeInTheDocument();
    });

    it('折りたたんだグループを再展開できる', () => {
      render(<GanttChart tasks={tasks} groups={groups} />);
      const groupToggle = screen.getByTestId('group-toggle-group-a');

      // 折りたたみ
      fireEvent.click(groupToggle);
      expect(screen.queryByText('タスクA1')).not.toBeInTheDocument();

      // 再展開
      fireEvent.click(groupToggle);
      expect(screen.getByText('タスクA1')).toBeInTheDocument();
    });

    it('一つのグループを折りたたんでも他は影響を受けない', () => {
      render(<GanttChart tasks={tasks} groups={groups} />);
      const groupToggle = screen.getByTestId('group-toggle-group-a');

      fireEvent.click(groupToggle);

      // group-a のタスクは非表示
      expect(screen.queryByText('タスクA1')).not.toBeInTheDocument();
      // group-b のタスクは表示されたまま
      expect(screen.getByText('タスクB1')).toBeInTheDocument();
    });

    it('aria-expanded属性が正しく設定される', () => {
      render(<GanttChart tasks={tasks} groups={groups} />);
      const groupToggle = screen.getByTestId('group-toggle-group-a');

      expect(groupToggle).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(groupToggle);
      expect(groupToggle).toHaveAttribute('aria-expanded', 'false');
    });
  });

  // ─── 今日線 ───
  describe('今日線', () => {
    it('今日線が表示される', () => {
      render(<GanttChart tasks={SAMPLE_TASKS} />);
      expect(screen.getByTestId('today-line')).toBeInTheDocument();
    });

    it('「今日」ラベルが表示される', () => {
      render(<GanttChart tasks={SAMPLE_TASKS} />);
      const todayLine = screen.getByTestId('today-line');
      expect(within(todayLine).getByText('今日')).toBeInTheDocument();
    });

    it('showTodayLine=false で非表示にできる', () => {
      render(
        <GanttChart
          tasks={SAMPLE_TASKS}
          config={{ showTodayLine: false }}
        />,
      );
      expect(screen.queryByTestId('today-line')).not.toBeInTheDocument();
    });
  });

  // ─── アクセシビリティ ───
  describe('アクセシビリティ', () => {
    it('ガントチャートにaria-labelが設定されている', () => {
      render(<GanttChart tasks={[createTask()]} />);
      expect(
        screen.getByRole('region', { name: 'ガントチャート' }),
      ).toBeInTheDocument();
    });

    it('ズームコントロールがラジオグループ', () => {
      render(<GanttChart tasks={[createTask()]} />);
      expect(
        screen.getByRole('radiogroup', { name: 'ズームレベル' }),
      ).toBeInTheDocument();
    });

    it('ダークモードトグルにaria-labelがある', () => {
      render(<GanttChart tasks={[createTask()]} />);
      expect(
        screen.getByLabelText('ダークモードに切替'),
      ).toBeInTheDocument();
    });
  });

  // ─── マイルストーン ───
  describe('マイルストーン', () => {
    it('マイルストーンがレンダリングされる', () => {
      render(
        <GanttChart tasks={SAMPLE_TASKS} milestones={SAMPLE_MILESTONES} />,
      );

      expect(screen.getByTestId('milestone-ms-analysis-done')).toBeInTheDocument();
      expect(screen.getByTestId('milestone-ms-release')).toBeInTheDocument();
    });
  });

  // ─── 凡例 ───
  describe('凡例', () => {
    it('凡例が表示される', () => {
      render(<GanttChart tasks={[createTask()]} />);

      expect(screen.getByText('凡例:')).toBeInTheDocument();
      expect(screen.getByText('進捗')).toBeInTheDocument();
      expect(screen.getByText('クリティカルパス')).toBeInTheDocument();
      expect(screen.getByText('マイルストーン')).toBeInTheDocument();
    });
  });

  // ─── 設定オーバーライド ───
  describe('設定オーバーライド', () => {
    it('初期ズームレベルを指定できる', () => {
      render(<GanttChart tasks={[createTask()]} config={{ zoom: 'day' }} />);
      const dayBtn = screen.getByRole('radio', { name: '日表示' });
      expect(dayBtn).toHaveAttribute('aria-checked', 'true');
    });

    it('依存線の表示を無効化できる', () => {
      const tasks = [
        createTask({ id: 't1', name: 'タスク1' }),
        createTask({
          id: 't2',
          name: 'タスク2',
          dependencies: ['t1'],
          startDate: new Date('2026-03-11'),
          endDate: new Date('2026-03-15'),
        }),
      ];
      render(
        <GanttChart tasks={tasks} config={{ showDependencies: false }} />,
      );
      expect(screen.queryByTestId('dependency-lines')).not.toBeInTheDocument();
    });
  });
});
