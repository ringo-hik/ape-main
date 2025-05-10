const fs = require('fs');
const path = require('path');

const extensionJsPath = path.join(__dirname, 'out', 'extension.js');
const customHelpPath = path.join(__dirname, 'custom-help.js');

console.log('Loading files...');
let extensionJsContent = fs.readFileSync(extensionJsPath, 'utf8');
const customHelpContent = fs.readFileSync(customHelpPath, 'utf8');

console.log('Processing extension.js...');
// Find the activate function
const activateMatch = extensionJsContent.match(/async function activate\(context\)\s*\{/);

if (!activateMatch) {
  console.error('Could not find activate function');
  process.exit(1);
}

// 주석 추가: 중복 명령어 등록 방지
const commentText = `
  // ===== AUTOMATICALLY INJECTED HELP COMMAND =====
  // 다음 코드는 자동으로 주입된 도움말 명령어 등록 코드입니다.
  // 'ape.help'와 'ape.showCommandHelp' 명령어는 이미 등록되어 있으면 덮어쓰지 않고
  // 이미 존재하는 명령어 핸들러를 사용하도록 안전하게 처리됩니다.
  // 주의: defaultCommands.ts에서 /help 슬래시 명령은 이 명령어를 호출합니다.
  `;

// Splice in the registerHelpCommand invocation right after the activate function opening
const insertIndex = activateMatch.index + activateMatch[0].length;
const modifiedContent = extensionJsContent.slice(0, insertIndex) + 
  commentText + 
  '  const registerHelpCommand = ' + customHelpContent + ';\n' +
  '  registerHelpCommand(context, vscode);\n\n' +
  extensionJsContent.slice(insertIndex);

console.log('Writing modified extension.js...');
fs.writeFileSync(extensionJsPath, modifiedContent, 'utf8');

console.log('Help command injection completed successfully');