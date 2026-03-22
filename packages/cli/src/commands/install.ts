/**
 * install command - Install Agentic OS into existing project
 *
 * Flow:
 * 1. Analyze existing project
 * 2. GitHub OAuth authentication
 * 3. Create/merge labels
 * 4. Auto-label existing Issues
 * 5. Deploy workflows (non-destructive)
 * 6. Link to Projects V2
 */

import ora from 'ora';
import chalk from 'chalk';
import { analyzeProject } from '../analyze/project';
import { githubOAuth } from '../auth/github-oauth';
import { setupLabels } from '../setup/labels';
import { autoLabelIssues } from '../analyze/issues';
import { deployWorkflows } from '../setup/workflows';
import { deployClaudeConfig, verifyClaudeConfig } from '../setup/claude-config';

import _inquirer from 'inquirer';
import { linkToProject } from '../setup/projects';
import { confirmOrDefault } from '../utils/interactive';
import { getGitHubToken, isGhCliAuthenticated } from '../utils/github-token';

export interface InstallOptions {
  dryRun?: boolean;
  nonInteractive?: boolean;
  yes?: boolean;
}

export async function install(options: InstallOptions = {}) {
  console.log(chalk.gray('Analyzing your existing project...\n'));

  // Step 1: Analyze project
  const spinner = ora('Scanning project structure...').start();
  let analysis: any;

  try {
    analysis = await analyzeProject();
    spinner.succeed(chalk.green('Project analysis complete'));
  } catch (error) {
    spinner.fail(chalk.red('プロジェクトの解析に失敗しました'));
    if (error instanceof Error) {
      if (error.message.includes('Not a git repository')) {
        throw new Error('git repository not found: このディレクトリはGitリポジトリではありません');
      }
      if (error.message.includes('no origin remote')) {
        throw new Error('git remote not found: リモートリポジトリが設定されていません');
      }
      throw new Error(`Project analysis failed: ${error.message}`);
    }
    throw new Error('Project analysis failed: Unknown error');
  }

  // Display analysis results
  console.log(chalk.cyan('\n📊 Analysis Results:\n'));
  console.log(chalk.white(`  Repository: ${analysis.repo}`));
  console.log(chalk.white(`  Languages: ${analysis.languages.join(', ')}`));
  console.log(chalk.white(`  Framework: ${analysis.framework || 'None detected'}`));
  console.log(chalk.white(`  Open Issues: ${analysis.issueCount}`));
  console.log(chalk.white(`  Pull Requests: ${analysis.prCount}\n`));

  if (options.dryRun) {
    console.log(chalk.yellow('🔍 Dry run mode - no changes will be made\n'));
    console.log(chalk.gray('Would install:'));
    console.log(chalk.gray('  ✓ 53 labels (10 categories)'));
    console.log(chalk.gray('  ✓ 12+ GitHub Actions workflows'));
    console.log(chalk.gray('  ✓ Projects V2 integration'));
    console.log(chalk.gray(`  ✓ Auto-label ${analysis.issueCount} existing Issues\n`));
    return;
  }

  // Confirm installation
  const confirmed = await confirmOrDefault(
    'Install Agentic OS into this project?',
    true,
    {
      nonInteractive: options.nonInteractive,
      yes: options.yes,
    }
  );

  if (!confirmed) {
    console.log(chalk.yellow('\n⏸️  Installation cancelled\n'));
    return;
  }

  // Show auto-approve message in non-interactive mode
  if (options.nonInteractive || options.yes) {
    console.log(chalk.gray('  [Non-interactive mode: auto-approved]\n'));
  }

  // Step 2: GitHub Authentication
  spinner.start('Authenticating with GitHub...');
  let token: string;

  try {
    // Try automatic token retrieval first (gh CLI or env var)
    try {
      token = getGitHubToken();
      const source = isGhCliAuthenticated() ? 'gh CLI' : 'environment variable';
      spinner.succeed(chalk.green(`GitHub authentication complete (via ${source})`));
    } catch (_tokenError) {
      // Fall back to OAuth if automatic retrieval fails
      spinner.text = 'No GitHub token found, starting OAuth flow...';
      token = await githubOAuth();
      spinner.succeed(chalk.green('GitHub authentication complete (via OAuth)'));
    }
  } catch (error) {
    spinner.fail(chalk.red('GitHub認証に失敗しました'));
    if (error instanceof Error) {
      throw new Error(`GitHub authentication failed: ${error.message}`);
    }
    throw new Error('GitHub authentication failed: Unknown error');
  }

  // Step 3: Setup labels
  spinner.start('Setting up labels (checking for conflicts)...');

  try {
    const result = await setupLabels(analysis.owner as string, analysis.repo as string, token, {
      merge: true,
    });
    spinner.succeed(
      chalk.green(`Labels setup complete (${result.created} created, ${result.updated} updated)`)
    );
    console.log(chalk.gray(`  ✓ Total: ${result.created + result.updated} labels configured`));
  } catch (error) {
    spinner.fail(chalk.red('ラベルのセットアップに失敗しました'));
    if (error instanceof Error) {
      console.log(chalk.yellow('\n💡 解決策:\n'));
      console.log(chalk.white('  1. GitHubトークンの権限を確認してください:'));
      console.log(chalk.gray('     - repo (Full control of private repositories)'));
      console.log(chalk.gray('     - admin:org (Full control of orgs and teams)\n'));
      console.log(chalk.white('  2. 手動でラベルを作成:'));
      console.log(chalk.gray('     gh label create "🐛 type:bug" --color "d73a4a"\n'));
      console.log(chalk.white('  3. または、Claude Codeに依頼:'));
      console.log(chalk.gray('     「識学理論準拠の65ラベルを作成してください」\n'));
      throw new Error(`Label setup failed: ${error.message}`);
    }
    throw new Error('Label setup failed: Unknown error');
  }

  // Step 4: Auto-label existing Issues
  if (analysis.issueCount > 0) {
    spinner.start(`Analyzing and labeling ${analysis.issueCount} existing Issues...`);

    try {
      const labeled = await autoLabelIssues(analysis.owner as string, analysis.repo as string, token);
      spinner.succeed(chalk.green(`${labeled} Issues labeled successfully`));
    } catch (error) {
      spinner.fail(chalk.red('自動ラベリングに失敗しました'));
      if (error instanceof Error) {
        throw new Error(`Auto-labeling failed: ${error.message}`);
      }
      throw new Error('Auto-labeling failed: Unknown error');
    }
  }

  // Step 5: Deploy workflows
  spinner.start('Deploying GitHub Actions workflows...');

  try {
    const workflowCount = await deployWorkflows(analysis.owner as string, analysis.repo as string, token, {
      skipExisting: true,
    });
    spinner.succeed(chalk.green(`${workflowCount} workflows deployed`));
  } catch (error) {
    spinner.fail(chalk.red('ワークフローのデプロイに失敗しました'));
    if (error instanceof Error) {
      throw new Error(`Workflow deployment failed: ${error.message}`);
    }
    throw new Error('Workflow deployment failed: Unknown error');
  }

  // Step 6: Link to Projects V2
  spinner.start('Connecting to GitHub Projects V2...');

  try {
    await linkToProject(analysis.owner as string, analysis.repo as string, token);
    spinner.succeed(chalk.green('Projects V2 connected'));
  } catch (error) {
    spinner.fail(chalk.red('Projects V2の接続に失敗しました'));
    if (error instanceof Error) {
      throw new Error(`Projects V2 connection failed: ${error.message}`);
    }
    throw new Error('Projects V2 connection failed: Unknown error');
  }

  // Step 7: Deploy Claude Code configuration
  spinner.start('Deploying Claude Code configuration...');

  try {
    await deployClaudeConfig({
      projectPath: process.cwd(),
      projectName: analysis.repo,
    });

    const verification = verifyClaudeConfig(process.cwd());

    if (verification.claudeDirExists && verification.claudeMdExists) {
      spinner.succeed(
        chalk.green(
          `Claude Code configured: ${verification.agentsCount} agents, ${verification.commandsCount} commands`
        )
      );
      console.log(chalk.gray('  ✓ .claude/ directory created'));
      console.log(chalk.gray('  ✓ CLAUDE.md context file created'));
    } else {
      spinner.warn(chalk.yellow('Claude Code configuration incomplete'));
    }
  } catch (_error) {
    spinner.warn(chalk.yellow('Claude Code configuration skipped'));
    console.log(chalk.gray('  You can add .claude/ manually later\n'));
  }

  // Success!
  console.log(chalk.green.bold('\n✅ Agentic OS installed successfully!\n'));
  console.log(chalk.cyan('Your project now has:'));
  console.log(chalk.white('  ✓ Automated Issue → PR pipeline'));
  console.log(chalk.white('  ✓ 6 AI agents ready to work'));
  console.log(chalk.white('  ✓ Label-based state management'));
  console.log(chalk.white('  ✓ Real-time progress tracking\n'));
  console.log(chalk.gray('💡 Create an Issue to see the magic:'));
  console.log(chalk.white('  gh issue create --title "Your task" --body "Description"\n'));
}
