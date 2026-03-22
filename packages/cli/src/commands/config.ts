/**
 * config command - Manage miyabi configuration
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig, saveConfig, mergeConfig, validateConfig, getDefaultConfig } from '../config/loader';
import { isJsonMode, outputSuccess } from '../utils/agent-output';

export interface ConfigOptions {
  init?: boolean;
  show?: boolean;
  reset?: boolean;
  json?: boolean;
}

export async function config(options: ConfigOptions = {}) {
  // JSON mode: output config as structured JSON without prompting
  if (options.json || isJsonMode()) {
    const currentConfig = loadConfig();
    outputSuccess(currentConfig, 'Configuration loaded successfully');
    return;
  }

  // Show current config
  if (options.show) {
    const currentConfig = loadConfig();
    console.log(chalk.cyan('\n📝 現在の設定:\n'));
    console.log(JSON.stringify(currentConfig, null, 2));
    console.log();
    return;
  }

  // Reset to default
  if (options.reset) {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'デフォルト設定にリセットしますか？',
        default: false,
      },
    ]);

    if (confirmed) {
      const defaultConfig = getDefaultConfig();
      saveConfig(defaultConfig);
      console.log(chalk.green('\n✅ 設定をリセットしました\n'));
    }
    return;
  }

  // Interactive configuration
  console.log(chalk.cyan('\n⚙️  Miyabi 設定\n'));

  const currentConfig = loadConfig();

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'setToken',
      message: 'GitHub トークンを設定しますか？',
      default: !currentConfig.github?.token,
    },
    {
      type: 'password',
      name: 'token',
      message: 'GitHub トークン:',
      when: (answers) => answers.setToken,
      validate: (input) => {
        if (!input) {return 'トークンを入力してください';}
        if (!input.startsWith('ghp_') && !input.startsWith('github_pat_')) {
          return 'トークン形式が無効です（ghp_ または github_pat_ で始まる必要があります）';
        }
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'defaultPrivate',
      message: '新規プロジェクトをデフォルトでプライベートにしますか？',
      default: currentConfig.github?.defaultPrivate || false,
    },
    {
      type: 'list',
      name: 'language',
      message: 'CLI の言語:',
      choices: [
        { name: '日本語', value: 'ja' },
        { name: 'English', value: 'en' },
      ],
      default: currentConfig.cli?.language || 'ja',
    },
    {
      type: 'confirm',
      name: 'verboseErrors',
      message: '詳細なエラーメッセージを表示しますか？',
      default: currentConfig.cli?.verboseErrors !== false,
    },
    {
      type: 'confirm',
      name: 'autoLabel',
      message: 'Issue の自動ラベリングを有効にしますか？',
      default: currentConfig.workflows?.autoLabel !== false,
    },
    {
      type: 'confirm',
      name: 'autoReview',
      message: 'PR の自動レビューを有効にしますか？',
      default: currentConfig.workflows?.autoReview !== false,
    },
    {
      type: 'confirm',
      name: 'autoSync',
      message: 'GitHub Projects との自動同期を有効にしますか？',
      default: currentConfig.workflows?.autoSync !== false,
    },
  ]);

  // Build new config
  const newConfig = mergeConfig({
    github: {
      token: answers.token || currentConfig.github?.token,
      defaultPrivate: answers.defaultPrivate,
    },
    workflows: {
      autoLabel: answers.autoLabel,
      autoReview: answers.autoReview,
      autoSync: answers.autoSync,
    },
    cli: {
      language: answers.language,
      verboseErrors: answers.verboseErrors,
    },
  });

  // Validate config
  const validation = validateConfig(newConfig);
  if (!validation.valid) {
    console.log(chalk.red('\n❌ 設定エラー:\n'));
    validation.errors.forEach((error) => console.log(chalk.red(`  - ${error}`)));
    console.log();
    return;
  }

  // Save config
  try {
    saveConfig(newConfig);
    console.log(chalk.green('\n✅ 設定を保存しました\n'));

    console.log(chalk.cyan('保存された設定:'));
    console.log(chalk.gray('  GitHub トークン: ') + (newConfig.github?.token ? chalk.green('設定済み') : chalk.yellow('未設定')));
    console.log(chalk.gray('  デフォルトプライベート: ') + (newConfig.github?.defaultPrivate ? chalk.green('有効') : chalk.gray('無効')));
    console.log(chalk.gray('  言語: ') + (newConfig.cli?.language === 'ja' ? '日本語' : 'English'));
    console.log(chalk.gray('  詳細エラー: ') + (newConfig.cli?.verboseErrors ? chalk.green('有効') : chalk.gray('無効')));
    console.log(chalk.gray('  自動ラベリング: ') + (newConfig.workflows?.autoLabel ? chalk.green('有効') : chalk.gray('無効')));
    console.log(chalk.gray('  自動レビュー: ') + (newConfig.workflows?.autoReview ? chalk.green('有効') : chalk.gray('無効')));
    console.log(chalk.gray('  自動同期: ') + (newConfig.workflows?.autoSync ? chalk.green('有効') : chalk.gray('無効')));
    console.log();

    console.log(chalk.cyan('💡 ヒント:'));
    console.log(chalk.white('  設定ファイル: .miyabi.yml'));
    console.log(chalk.white('  設定を表示: miyabi config --show'));
    console.log(chalk.white('  設定をリセット: miyabi config --reset\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ 設定の保存に失敗しました\n'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}
