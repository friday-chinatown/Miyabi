/**
 * Miyabi Agent CLI Command
 *
 * Agent実行用CLIインターフェース
 * CoordinatorAgent経由で各専門Agentを実行
 */

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import type { Command } from 'commander';
import { isJsonMode, outputSuccess, outputError } from '../utils/agent-output';
import {
  IssueAgent,
  type IssueInput,
  CodeGenAgent,
  type CodeGenInput,
  ReviewAgent,
  type ReviewInput,
  CoordinatorAgent,
  type CoordinatorInput,
  PRAgent,
  type PRInput,
} from 'miyabi-agent-sdk';
import {
  getGitHubToken,
  verifyTokenAccess,
} from '../auth/credentials';
import {
  saveCodeGenOutput,
  loadCodeGenOutput,
  saveReviewOutput,
  loadReviewOutput,
  checkIssueStorage,
} from '../utils/storage';

/**
 * 利用可能なAgent種別
 */
export const AVAILABLE_AGENTS = [
  'coordinator',
  'codegen',
  'review',
  'issue',
  'pr',
  'deploy',
  'mizusumashi',
] as const;

export type AgentType = typeof AVAILABLE_AGENTS[number];

/**
 * Agent実行オプション
 */
export interface AgentRunOptions {
  issue?: string;
  pr?: string;
  files?: string;
  parallel?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Agent実行結果
 */
export interface AgentResult {
  agent: AgentType;
  status: 'success' | 'failure' | 'skipped';
  message: string;
  duration?: number;
  details?: Record<string, unknown>;
}

/**
 * Agent一覧表示
 */
export function listAgents(options?: { json?: boolean }): void {
  const agents = [
    {
      name: 'coordinator',
      description: 'タスク統括・DAG分解',
      responsibility: 'Issue分解、並行実行制御、Agent割当'
    },
    {
      name: 'codegen',
      description: 'AI駆動コード生成',
      responsibility: 'TypeScript生成、テスト自動生成'
    },
    {
      name: 'review',
      description: 'コード品質判定',
      responsibility: '静的解析、セキュリティスキャン (80点基準)'
    },
    {
      name: 'issue',
      description: 'Issue分析・ラベリング',
      responsibility: '組織設計原則65ラベル体系、自動分類'
    },
    {
      name: 'pr',
      description: 'Pull Request自動化',
      responsibility: 'Draft PR作成、Conventional Commits'
    },
    {
      name: 'deploy',
      description: 'CI/CDデプロイ',
      responsibility: 'Firebase Deploy、ヘルスチェック、Rollback'
    },
    {
      name: 'mizusumashi',
      description: 'Super App Designer',
      responsibility: 'アプリYAML自動生成、自己修復関数'
    },
  ];

  if (isJsonMode() || options?.json) {
    outputSuccess({ agents }, 'Available agents list');
    return;
  }

  console.log(chalk.cyan.bold('\n🤖 利用可能なAgent一覧\n'));

  const table = new Table({
    head: [
      chalk.white('Agent'),
      chalk.white('説明'),
      chalk.white('責任範囲'),
    ],
    colWidths: [20, 40, 40],
  });

  agents.forEach(agent => {
    table.push([agent.name, agent.description, agent.responsibility]);
  });

  console.log(table.toString());
  console.log(chalk.gray('\n使用例: miyabi agent run codegen --issue=123\n'));
}

/**
 * 現在のGitリポジトリ情報を取得
 */
async function getCurrentRepo(): Promise<{ owner: string; name: string } | null> {
  try {
    const { execSync } = await import('child_process');
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();

    const match = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);

    if (match) {
      return { owner: match[1], name: match[2] };
    }
  } catch (_error) {
    // Git repository not found
    return null;
  }

  return null;
}


/**
 * Parse issue number from string (handles both "#9" and "9" formats)
 * Fixes: Issue #155 - Water Spider Auto mode: parseInt("#9") returns NaN
 * @param issueInput - Issue number as string (e.g., "9" or "#9")
 * @returns Parsed issue number
 * @throws Error if input is not a valid issue number
 */
export function parseIssueNumber(issueInput: string): number {
  const cleanedInput = issueInput.toString().replace(/^#/, '');
  const parsed = parseInt(cleanedInput, 10);

  if (isNaN(parsed)) {
    throw new Error(`Invalid issue number: "${issueInput}". Expected format: "9" or "#9"`);
  }

  return parsed;
}

/**
 * Agent実行
 */
export async function runAgent(
  agentName: AgentType,
  options: AgentRunOptions
): Promise<AgentResult> {
  const spinner = ora(`${agentName}Agent 実行中...`).start();
  const startTime = Date.now();

  try {
    // バリデーション
    if (!AVAILABLE_AGENTS.includes(agentName)) {
      throw new Error(`無効なAgent: ${agentName}`);
    }

    if (options.dryRun) {
      spinner.info(chalk.yellow(`[DRY RUN] ${agentName}Agent実行をシミュレート`));
      return {
        agent: agentName,
        status: 'success',
        message: 'Dry run completed',
      };
    }

    // GitHub認証チェック（OAuth or GITHUB_TOKEN）
    const githubToken = getGitHubToken();
    if (!githubToken) {
      spinner.fail(chalk.red('Not authenticated'));
      console.log(chalk.yellow('\n⚠️  GitHub認証が必要です\n'));
      console.log(chalk.white('Miyabi uses OAuth authentication for secure access.'));
      console.log(chalk.gray('Your token will be stored securely in ~/.miyabi/credentials.json\n'));
      console.log(chalk.cyan.bold('🔐 Authenticate now:\n'));
      console.log(chalk.white('  miyabi auth login'));
      console.log(chalk.gray('  (Opens browser for GitHub OAuth)\n'));
      console.log(chalk.white('Or use environment variable:'));
      console.log(chalk.gray('  export GITHUB_TOKEN=ghp_xxx\n'));
      throw new Error('Not authenticated. Run `miyabi auth login` to authenticate.');
    }

    // リポジトリ情報取得（git remoteから自動検出）
    const repoInfo = await getCurrentRepo();

    if (!repoInfo) {
      throw new Error(
        'Not a git repository or no origin remote found. ' +
        'Run this command inside a git repository with a GitHub remote.'
      );
    }

    const { owner, name: repo } = repoInfo;

    // リポジトリアクセス権限チェック（セキュリティ）
    if (!options.verbose) {spinner.text = 'Verifying repository access...';}
    const hasAccess = await verifyTokenAccess(githubToken, owner, repo);
    if (!hasAccess) {
      spinner.fail(chalk.red('Access denied'));
      throw new Error(
        `You don't have access to ${owner}/${repo}. ` +
        'Make sure you have the correct permissions.'
      );
    }

    if (!options.verbose) {spinner.text = `${agentName}Agent 実行中...`;}

    // Agent実行 - miyabi-agent-sdk を使用
    let result: any;

    switch (agentName) {
      case 'issue': {
        if (!options.issue) {
          throw new Error('--issue option is required for IssueAgent. Example: miyabi agent run issue --issue=123');
        }

        const agent = new IssueAgent({
          githubToken,
          useClaudeCode: true, // デフォルトでClaude Code CLI使用（無料）
        });

        const input: IssueInput = {
          issueNumber: parseIssueNumber(options.issue),
          repository: repo, // repo name only (e.g., "Miyabi")
          owner,            // owner name (e.g., "ShunsukeHayashi")
        };

        result = await agent.analyze(input);
        break;
      }

      case 'codegen': {
        if (!options.issue) {
          throw new Error('--issue option is required for CodeGenAgent. Example: miyabi agent run codegen --issue=123');
        }

        // First, fetch Issue details to get requirements
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: githubToken });

        const issueResponse = await octokit.issues.get({
          owner,
          repo,
          issue_number: parseIssueNumber(options.issue),
        });

        const issue = issueResponse.data;
        const requirements = issue.body || issue.title;

        const agent = new CodeGenAgent({
          githubToken,
          useClaudeCode: true, // デフォルトでClaude Code CLI使用（無料）
        });

        const input: CodeGenInput = {
          taskId: `issue-${options.issue}`,
          requirements,
          context: {
            repository: repo,
            owner,
            baseBranch: 'main',
            relatedFiles: [], // TODO: 関連ファイル自動検出
          },
          language: 'typescript', // デフォルトはTypeScript
        };

        result = await agent.generate(input);

        // Save CodeGenAgent output for PRAgent
        if (result.success && result.data) {
          saveCodeGenOutput(owner, repo, parseIssueNumber(options.issue), result.data);
        }

        break;
      }

      case 'review': {
        // ReviewAgent requires either --pr or --files, and optionally --issue for storage
        if (!options.pr && !options.files) {
          throw new Error('--pr or --files option is required for ReviewAgent. Example: miyabi agent run review --pr=123 --issue=52');
        }

        // For now, implement PR review only
        if (options.pr) {
          const { Octokit } = await import('@octokit/rest');
          const octokit = new Octokit({ auth: githubToken });

          // Fetch PR files
          const prNumber = parseInt(options.pr);
          const prFilesResponse = await octokit.pulls.listFiles({
            owner,
            repo,
            pull_number: prNumber,
          });

          // Convert PR files to GeneratedFile format
          const files = prFilesResponse.data.map((file: any) => ({
            path: file.filename,
            content: '',
            action: (file.status === 'added' ? 'create' :
                    file.status === 'removed' ? 'delete' : 'modify') as 'create' | 'delete' | 'modify',
          }));

          const agent = new ReviewAgent({
            useClaudeCode: true,
          });

          const input: ReviewInput = {
            files,
            standards: {
              minQualityScore: 80, // 80点基準
              requireTests: true,
              securityScan: true,
            },
          };

          result = await agent.review(input);

          // Save ReviewAgent output for PRAgent (if --issue provided)
          if (options.issue && result.success && result.data) {
            saveReviewOutput(owner, repo, parseIssueNumber(options.issue), result.data);
          }
        } else {
          // TODO: Implement file review
          throw new Error('--files option is not yet implemented. Use --pr for now.');
        }
        break;
      }

      case 'pr': {
        if (!options.issue) {
          throw new Error('--issue option is required for PRAgent. Example: miyabi agent run pr --issue=123');
        }

        const issueNumber = parseIssueNumber(options.issue);

        // Check if CodeGenAgent and ReviewAgent outputs exist
        const storage = checkIssueStorage(owner, repo, issueNumber);

        if (!storage.hasCodeGen) {
          throw new Error(
            `CodeGenAgent output not found for issue #${issueNumber}. ` +
            `Please run: miyabi agent run codegen --issue=${  issueNumber}`
          );
        }

        if (!storage.hasReview) {
          throw new Error(
            `ReviewAgent output not found for issue #${issueNumber}. ` +
            `Please run: miyabi agent run review --pr=XXX --issue=${  issueNumber}`
          );
        }

        // Load CodeGenAgent output
        const codegenOutput = loadCodeGenOutput(owner, repo, issueNumber);
        if (!codegenOutput?.files) {
          throw new Error('Invalid CodeGenAgent output format');
        }

        // Load ReviewAgent output
        const reviewOutput = loadReviewOutput(owner, repo, issueNumber);
        if (!reviewOutput) {
          throw new Error('Invalid ReviewAgent output format');
        }

        // Create PRAgent
        const agent = new PRAgent({
          githubToken,
        });

        const input: PRInput = {
          issueNumber,
          repository: repo,
          owner,
          files: codegenOutput.files,
          qualityReport: reviewOutput,
          baseBranch: 'main',
        };

        result = await agent.create(input);
        break;
      }

      case 'coordinator': {
        if (!options.issue) {
          throw new Error('--issue option is required for CoordinatorAgent. Example: miyabi agent run coordinator --issue=123');
        }

        const agent = new CoordinatorAgent();

        const input: CoordinatorInput = {
          issueNumber: parseIssueNumber(options.issue),
          repository: repo,
          owner,
        };

        result = await agent.execute(input);
        break;
      }

      case 'deploy':
      case 'mizusumashi': {
        // 他のAgentは同様のパターンで実装予定
        spinner.warn(chalk.yellow(`${agentName}Agent is not yet fully integrated with SDK`));
        return {
          agent: agentName,
          status: 'skipped',
          message: `${agentName}Agent SDK integration pending`,
        };
      }

      default:
        throw new Error(`Agent ${agentName} is not implemented`);
    }

    const duration = Date.now() - startTime;
    spinner.succeed(chalk.green(`${agentName}Agent 実行完了 (${duration}ms)`));

    return {
      agent: agentName,
      status: 'success',
      message: `${agentName}Agent executed successfully`,
      duration,
      details: result,
    };

  } catch (error) {
    spinner.fail(chalk.red(`${agentName}Agent 実行失敗`));

    if (options.verbose && error instanceof Error) {
      console.error(chalk.red(`エラー: ${error.message}`));
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
    } else if (error instanceof Error) {
      console.error(chalk.red(`エラー: ${error.message}`));
    }

    return {
      agent: agentName,
      status: 'failure',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Agent状態確認
 */
export function agentStatus(agentName?: AgentType): void {
  console.log(chalk.cyan.bold('\n📊 Agent実行状態\n'));

  const table = new Table({
    head: [
      chalk.white('Agent'),
      chalk.white('ステータス'),
      chalk.white('最終実行'),
      chalk.white('実行回数'),
    ],
  });

  // TODO: 実際の状態取得を実装
  const mockData = [
    ['coordinator', '✅ 稼働中', '2分前', '15回'],
    ['codegen', '💤 待機中', '10分前', '8回'],
    ['review', '✅ 稼働中', '30秒前', '12回'],
    ['issue', '✅ 稼働中', '1分前', '20回'],
    ['pr', '💤 待機中', '15分前', '5回'],
    ['deploy', '✅ 稼働中', '3分前', '7回'],
  ];

  if (agentName) {
    const filtered = mockData.filter(row => row[0] === agentName);
    filtered.forEach(row => table.push(row));
  } else {
    mockData.forEach(row => table.push(row));
  }

  console.log(table.toString());
  console.log();
}

/**
 * Agent CLIコマンド登録
 */
export function registerAgentCommand(program: Command): void {
  const agent = program
    .command('agent')
    .description('🤖 Agent実行・管理');

  // agent run <agent-name>
  agent
    .command('run <agent-name>')
    .description('Agent実行')
    .option('-i, --issue <number>', 'Issue番号指定')
    .option('--pr <number>', 'Pull Request番号指定 (ReviewAgent用)')
    .option('--files <paths>', 'ファイルパス指定 (ReviewAgent用、カンマ区切り)')
    .option('-p, --parallel <number>', '並行実行数', '1')
    .option('--dry-run', '実行シミュレーション')
    .option('-v, --verbose', '詳細ログ出力')
    .option('--json', 'JSON形式で出力')
    .action(async (agentName: string, options: AgentRunOptions & { json?: boolean }) => {
      // Agent名のバリデーション
      if (!AVAILABLE_AGENTS.includes(agentName as AgentType)) {
        // AI agent向けJSON出力
        if (isJsonMode() || options.json) {
          outputError(
            'INVALID_AGENT_NAME',
            `Invalid agent: ${agentName}`,
            true,
            `Available agents: ${AVAILABLE_AGENTS.join(', ')}`
          );
        }

        console.error(chalk.red(`❌ 無効なAgent: ${agentName}`));
        console.log(chalk.yellow('\n利用可能なAgent:'));
        console.log(chalk.gray(`  ${AVAILABLE_AGENTS.join(', ')}\n`));
        process.exit(1);
      }

      if (!isJsonMode() && !options.json) {
        console.log(chalk.cyan.bold('\n🤖 Miyabi Agent CLI\n'));
      }

      const result = await runAgent(agentName as AgentType, options);

      // JSON出力
      if (isJsonMode() || options.json) {
        if (result.status === 'success') {
          outputSuccess(result, `Agent ${agentName} executed successfully`);
        } else {
          outputError(
            'AGENT_EXECUTION_FAILED',
            result.message,
            true,
            'Check agent logs for details',
            result
          );
        }
        return;
      }

      if (result.status === 'failure') {
        process.exit(1);
      }
    });

  // agent list
  agent
    .command('list')
    .description('利用可能なAgent一覧')
    .option('--json', 'JSON形式で出力')
    .action((options: { json?: boolean }) => {
      listAgents(options);
    });

  // agent status [agent-name]
  agent
    .command('status [agent-name]')
    .description('Agent実行状態確認')
    .option('--json', 'JSON形式で出力')
    .action((agentName: string | undefined, _options: { json?: boolean }) => {
      // TODO: Implement JSON output
      agentStatus(agentName as AgentType | undefined);
    });
}
