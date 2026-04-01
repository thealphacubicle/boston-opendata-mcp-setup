#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const isCursor = process.argv.includes('--cursor');
const isClaude = process.argv.includes('--claude');
const isGemini = process.argv.includes('--gemini');

if (!isCursor && !isClaude && !isGemini) {
  console.log('Which app would you like to configure?');
  console.log('  npx boston-opendata-mcp-setup --claude     (Claude Desktop)');
  console.log('  npx boston-opendata-mcp-setup --cursor     (Cursor)');
  console.log('  npx boston-opendata-mcp-setup --gemini     (Gemini CLI)');
  process.exit(0);
}

const MCP_SERVER_KEY = 'Boston OpenData';
const MCP_SERVER_URL = 'https://data-mcp.boston.gov/mcp';
const MCP_SERVER_CONFIG = isGemini
  ? { httpUrl: MCP_SERVER_URL }
  : {
      command: 'npx',
      args: ['-y', 'mcp-remote', MCP_SERVER_URL]
    };

function getConfigPath() {
  const platform = os.platform();
  console.log(`🔍 Detecting OS: ${platform}`);

  if (isGemini) {
    const base = platform === 'win32' ? process.env.USERPROFILE : os.homedir();
    return path.join(base, '.gemini', 'settings.json');
  }

  if (platform === 'darwin') {
    if (isCursor) {
      return path.join(os.homedir(), '.cursor', 'mcp.json');
    }
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'linux') {
    if (isCursor) {
      return path.join(os.homedir(), '.cursor', 'mcp.json');
    }
    return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'win32') {
    if (isCursor) {
      return path.join(process.env.USERPROFILE, '.cursor', 'mcp.json');
    }
    return path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json');
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

function restartApp() {
  if (isGemini) {
    console.log('\n✅ Config written! Please restart Gemini CLI for changes to take effect.');
    console.log('   Then run /mcp inside Gemini CLI to verify Boston OpenData is listed.');
    return;
  }

  if (isCursor) {
    console.log('\n✅ Please restart Cursor for the changes to take effect.');
    return;
  }

  const platform = os.platform();
  console.log('\n🔄 Attempting to restart Claude Desktop...');

  try {
    if (platform === 'darwin') {
      execSync('pkill -x Claude', { stdio: 'ignore' });
      setTimeout(() => {
        execSync('open -a Claude', { stdio: 'ignore' });
        console.log('✅ Claude Desktop restarted.');
      }, 1500);
    } else if (platform === 'linux') {
      execSync('pkill -x claude-desktop', { stdio: 'ignore' });
      execSync('claude-desktop &', { stdio: 'ignore', shell: true });
      console.log('✅ Claude Desktop restarted.');
    } else if (platform === 'win32') {
      execSync('taskkill /IM Claude.exe /F', { stdio: 'ignore' });
      execSync('start Claude', { stdio: 'ignore', shell: true });
      console.log('✅ Claude Desktop restarted.');
    }
  } catch (err) {
    console.log('⚠️  Could not automatically restart Claude Desktop.');
    console.log('   Please restart Claude Desktop manually for the changes to take effect.');
  }
}

function main() {
  console.log('🚀 Boston OpenData MCP Setup\n');

  if (isCursor) {
    console.log('⚙️  Configuring for Cursor...');
  } else if (isClaude) {
    console.log('⚙️  Configuring for Claude Desktop...');
  } else if (isGemini) {
    console.log('🔧 Configuring for Gemini CLI...');
  }

  // Resolve config file path
  let configFile;
  try {
    configFile = getConfigPath();
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }

  const configDir = path.dirname(configFile);
  console.log(`📁 Config path: ${configFile}`);

  // Create config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    console.log('📂 Config directory not found — creating it...');
    try {
      fs.mkdirSync(configDir, { recursive: true });
      console.log('✅ Config directory created.');
    } catch (err) {
      console.error(`❌ Failed to create config directory: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log('✅ Config directory found.');
  }

  let config = { mcpServers: {} };

  // Read and merge if file exists
  if (fs.existsSync(configFile)) {
    console.log('\n📄 Existing config found — reading it...');
    try {
      const raw = fs.readFileSync(configFile, 'utf8').trim();
      if (raw) {
        config = JSON.parse(raw);
        if (!config.mcpServers) {
          config.mcpServers = {};
        }
      } else {
        console.log('   (File is empty — treating as fresh config.)');
      }
    } catch (err) {
      console.error(`❌ Failed to read/parse existing config: ${err.message}`);
      process.exit(1);
    }

    // Back up original
    const backupFile = configFile + '.bak';
    console.log(`💾 Backing up original config to: ${backupFile}`);
    try {
      fs.copyFileSync(configFile, backupFile);
      console.log('✅ Backup created.');
    } catch (err) {
      console.error(`❌ Failed to create backup: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log('\n📄 No existing config found — creating a fresh one...');
  }

  // Inject MCP server config
  console.log(`\n🔧 Adding "${MCP_SERVER_KEY}" MCP server to config...`);
  config.mcpServers[MCP_SERVER_KEY] = MCP_SERVER_CONFIG;

  // Write updated config
  try {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
    console.log('✅ Config written successfully.');
  } catch (err) {
    console.error(`❌ Failed to write config: ${err.message}`);
    process.exit(1);
  }

  // Restart app
  restartApp();

  // Success message
  const delay = (isCursor || isGemini) ? 0 : 2000;
  setTimeout(() => {
    console.log('\n🎉 Setup complete!');
    if (isCursor) {
      console.log('   After restarting Cursor, look for the MCP server in your tools to confirm it is active.');
    } else if (isGemini) {
      // restart message already printed above
    } else {
      console.log('   Look for the 🔨 hammer icon in Claude Desktop to confirm the MCP server is active.');
    }
    console.log('   Test it by asking: "Show me recent 311 requests in Boston"');
  }, delay);
}

main();
