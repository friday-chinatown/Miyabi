/**
 * GitHub OAuth using Device Flow
 *
 * Device Flow is perfect for CLI applications:
 * https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 *
 * Flow:
 * 1. Request device code
 * 2. Show user_code and verification_uri to user
 * 3. Poll for access token
 * 4. Save token to .env
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { Octokit } from '@octokit/rest';

import open from 'open';

// GitHub OAuth App credentials
// Official Miyabi CLI OAuth App
const CLIENT_ID = process.env.AGENTIC_OS_CLIENT_ID || 'Ov23liiMr5kSJLGJFNyn';

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

/**
 * Main OAuth flow - returns GitHub token
 */
export async function githubOAuth(): Promise<string> {
  console.log(chalk.cyan('\n🔐 GitHub認証が必要です\n'));

  // Check if token already exists
  const existingToken = loadTokenFromEnv();

  if (existingToken) {
    console.log(chalk.gray('.envに保存されたトークンを確認中...'));

    // Verify token is valid
    if (await verifyToken(existingToken)) {
      console.log(chalk.green('✓ トークンは有効です\n'));
      return existingToken;
    } else {
      console.log(chalk.yellow('⚠️  トークンが無効です。再認証が必要です\n'));
    }
  }

  // Check if CLIENT_ID is configured
  if (CLIENT_ID === 'Iv1.placeholder') {
    console.log(chalk.yellow('⚠️  OAuth Appが設定されていません\n'));
    console.log(chalk.white('代わりにGitHub Personal Access Tokenを使用してください:\n'));
    console.log(chalk.cyan('  1. https://github.com/settings/tokens/new にアクセス'));
    console.log(chalk.cyan('  2. 以下の権限を選択:'));
    console.log(chalk.gray('     - repo (Full control of private repositories)'));
    console.log(chalk.gray('     - workflow (Update GitHub Action workflows)'));
    console.log(chalk.gray('     - read:project, write:project (Access projects)'));
    console.log(chalk.cyan('  3. トークンを生成してコピー'));
    console.log(chalk.cyan('  4. .env ファイルに追加: GITHUB_TOKEN=ghp_your_token\n'));

    throw new Error('OAuth App not configured: GitHub Personal Access Tokenを作成して .env に設定してください');
  }

  // Start Device Flow
  const deviceCode = await requestDeviceCode();

  // Show instructions to user
  console.log(chalk.white.bold('認証を完了してください:'));
  console.log(chalk.cyan(`\n  1. ブラウザで開く: ${deviceCode.verification_uri}`));
  console.log(chalk.cyan(`  2. コードを入力: ${chalk.bold(deviceCode.user_code)}\n`));

  // Auto-open browser
  console.log(chalk.gray('ブラウザを自動的に開いています...\n'));
  try {
    await open(deviceCode.verification_uri);
  } catch {
    console.log(chalk.yellow('ブラウザを自動的に開けませんでした。手動で開いてください。\n'));
  }

  // Poll for token
  console.log(chalk.gray('認証を待っています...'));
  const token = await pollForToken(deviceCode);

  // Verify token has required scopes
  await verifyRequiredScopes(token);

  // Note: Token is NOT saved here anymore
  // The caller (auth.ts) will save it to ~/.miyabi/credentials.json
  // For backward compatibility, .env saving is still supported via saveTokenToEnv() if needed

  return token;
}

/**
 * Step 1: Request device code from GitHub
 */
async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      scope: 'repo workflow',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Response status:', response.status);
    console.error('Response body:', errorText);
    throw new Error(`Failed to request device code: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data as DeviceCodeResponse;
}

/**
 * Step 2: Poll for access token
 */
async function pollForToken(deviceCode: DeviceCodeResponse): Promise<string> {
  const startTime = Date.now();
  const expiresIn = deviceCode.expires_in * 1000; // Convert to ms
  const interval = deviceCode.interval * 1000; // Convert to ms

  while (Date.now() - startTime < expiresIn) {
    await sleep(interval);

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          device_code: deviceCode.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });

      const data = await response.json() as any;

      if (data.access_token) {
        return data.access_token as string;
      }

      if (data.error === 'authorization_pending') {
        // Still waiting for user
        continue;
      }

      if (data.error === 'slow_down') {
        // Increase polling interval
        await sleep(interval);
        continue;
      }

      if (data.error) {
        throw new Error(`OAuth error: ${data.error} - ${data.error_description || ''}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('OAuth error')) {
        throw error;
      }
      // Network error, retry
      continue;
    }
  }

  throw new Error('Device code expired. Please try again.');
}

/**
 * Verify token is valid and has access
 */
async function verifyToken(token: string): Promise<boolean> {
  try {
    const octokit = new Octokit({ auth: token });
    await octokit.users.getAuthenticated();
    return true;
  } catch (error) {
    // Log why the token is invalid for debugging
    if (error instanceof Error) {
      console.log(chalk.gray(`トークン検証エラー: ${error.message}`));
    }
    return false;
  }
}

/**
 * Verify token has required scopes
 */
async function verifyRequiredScopes(token: string): Promise<void> {
  const octokit = new Octokit({ auth: token });

  try {
    // Check scopes by making a test request
    const response = await octokit.request('GET /user');
    const scopes = response.headers['x-oauth-scopes']?.split(', ') || [];

    const requiredScopes = ['repo', 'workflow'];
    const missingScopes = requiredScopes.filter((scope) => !scopes.includes(scope));

    // Note: project scope is only available for GitHub Apps, not OAuth Apps
    // For Projects V2, we use repo scope which includes basic project access

    if (missingScopes.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warning: Missing recommended scopes:'));
      console.log(chalk.yellow(`  ${missingScopes.join(', ')}`));
      console.log(chalk.gray('\nSome features may not work correctly.\n'));
    }
  } catch (_error) {
    console.log(chalk.yellow('\n⚠️  Could not verify token scopes\n'));
  }
}

/**
 * Load token from .env file
 */
function loadTokenFromEnv(): string | null {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    console.log(chalk.gray(`.envファイルが見つかりません: ${envPath}`));
    return null;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/GITHUB_TOKEN=([^\n\r]+)/);

    if (!match) {
      console.log(chalk.yellow('⚠️  .envファイルにGITHUB_TOKENが見つかりません'));
      return null;
    }

    const token = match[1].trim();
    // Remove quotes if present
    const cleanToken = token.replace(/^["']|["']$/g, '');

    if (!cleanToken) {
      console.log(chalk.yellow('⚠️  GITHUB_TOKENが空です'));
      return null;
    }

    console.log(chalk.gray(`トークンを読み込みました (長さ: ${cleanToken.length}文字)`));
    return cleanToken;
  } catch (error) {
    console.log(chalk.red(`.envファイルの読み込みに失敗: ${error}`));
    return null;
  }
}

/**
 * Save token to .env file
 * Uses atomic write operation to avoid TOCTOU race condition
 *
 * @deprecated Use credentials.ts instead for OAuth-based authentication
 * This function is kept for backward compatibility with existing code
 */
export function saveTokenToEnv(token: string): void {
  // Validate token format before writing (防御的プログラミング)
  if (!token || typeof token !== 'string' || !token.startsWith('gho_') && !token.startsWith('ghp_')) {
    throw new Error('Invalid GitHub token format');
  }

  const envPath = path.join(process.cwd(), '.env');
  const tempPath = `${envPath}.tmp`;
  let content = '';

  // Read existing .env if it exists (atomic read)
  try {
    content = fs.readFileSync(envPath, 'utf-8');

    // Remove existing GITHUB_TOKEN line
    content = content
      .split('\n')
      .filter((line) => !line.startsWith('GITHUB_TOKEN='))
      .join('\n');

    // Add newline if content doesn't end with one
    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
  } catch (error: any) {
    // File doesn't exist, start with empty content
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  // Append new token
  content += `GITHUB_TOKEN=${token}\n`;

  // Atomic write: write to temp file, then rename
  // This avoids TOCTOU and ensures atomicity
  fs.writeFileSync(tempPath, content, { encoding: 'utf-8', mode: 0o600 }); // 600 = rw-------
  fs.renameSync(tempPath, envPath);

  console.log(chalk.gray(`\n✓ Token saved to ${envPath}`));
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
