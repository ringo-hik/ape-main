// 명령어 버튼 UI를 위한 추가 자바스크립트

/**
 * 명령어 그룹별 아이콘 매핑
 */
const COMMAND_ICONS = {
  'jira': 'issue-opened',
  'git': 'git-branch',
  'swdp': 'package',
  'build': 'terminal',
  'help': 'question',
  'settings': 'gear',
  'search': 'search',
  'chat': 'comment',
  'code': 'code',
  'default': 'play'
};

/**
 * 명령어 ID로부터 적절한 아이콘을 결정합니다.
 * @param {string} commandId 명령어 ID
 * @returns {string} 코디콘 아이콘 이름
 */
function getIconForCommand(commandId) {
  if (!commandId) return COMMAND_ICONS.default;
  
  // 명령어 ID에서 주요 그룹 추출
  const parts = commandId.split('.');
  const mainGroup = parts[0];
  
  // 특정 명령어 패턴 매칭
  if (commandId.includes('issue')) return 'issue-opened';
  if (commandId.includes('pull') || commandId.includes('pr')) return 'git-pull-request';
  if (commandId.includes('commit')) return 'git-commit';
  if (commandId.includes('build')) return 'rocket';
  if (commandId.includes('deploy')) return 'cloud-upload';
  if (commandId.includes('test')) return 'beaker';
  if (commandId.includes('help')) return 'question';
  if (commandId.includes('settings')) return 'gear';
  
  // 주요 그룹 매칭
  return COMMAND_ICONS[mainGroup] || COMMAND_ICONS.default;
}

/**
 * 명령어 그룹에 따라 CSS 클래스를 생성합니다.
 * @param {string} commandId 명령어 ID
 * @returns {string} CSS 클래스 이름
 */
function getCommandGroupClass(commandId) {
  if (!commandId) return '';
  
  const parts = commandId.split('.');
  return parts.length > 0 ? `command-group-${parts[0]}` : '';
}

/**
 * 기존 createCommandButton 함수를 확장한 버전입니다.
 * 아이콘 자동 결정 및 그룹 스타일링을 추가합니다.
 */
function createCommandButton(command) {
  const buttonContainer = document.createElement('div');
  buttonContainer.className = `command-button ${getCommandGroupClass(command.id)}`;
  buttonContainer.title = command.description || '';
  
  const button = document.createElement('button');
  button.className = 'button-content';
  button.onclick = () => {
    vscode.postMessage({
      command: 'executeCommand',
      commandId: command.id
    });
  };
  
  // 아이콘 자동 결정 또는 명시적 아이콘 사용
  const iconName = command.iconName || getIconForCommand(command.id);
  const icon = document.createElement('i');
  icon.className = `codicon codicon-${iconName}`;
  button.appendChild(icon);
  
  // 레이블 추가
  const label = document.createElement('span');
  label.textContent = command.label || command.id.split('.').pop() || command.id;
  button.appendChild(label);
  
  buttonContainer.appendChild(button);
  return buttonContainer;
}