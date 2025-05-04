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
  'model': 'hubot',
  'debug': 'bug',
  'clear': 'trash',
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
  const parts = commandId.split(':');
  const mainGroup = parts[0];
  
  // 명령어 이름은 콜론 이후 부분
  const commandName = parts.length > 1 ? parts[1] : mainGroup;
  
  // 특정 명령어 패턴 매칭
  if (commandName.includes('issue')) return 'issue-opened';
  if (commandName.includes('pull') || commandName.includes('pr')) return 'git-pull-request';
  if (commandName.includes('commit')) return 'git-commit';
  if (commandName.includes('build')) return 'rocket';
  if (commandName.includes('deploy')) return 'cloud-upload';
  if (commandName.includes('test')) return 'beaker';
  if (commandName.includes('help')) return 'question';
  if (commandName.includes('settings')) return 'gear';
  
  // 명령어 이름에 따른 매핑
  if (COMMAND_ICONS[commandName]) {
    return COMMAND_ICONS[commandName];
  }
  
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
  
  const parts = commandId.split(':');
  const mainGroup = parts[0];
  
  // @ 또는 / 접두사가 있는 경우 제거
  let groupName = mainGroup;
  if (groupName.startsWith('@')) {
    groupName = groupName.substring(1);
  } else if (groupName.startsWith('/')) {
    groupName = 'system';
  }
  
  return `command-group-${groupName}`;
}

/**
 * 명령어 버튼 생성 함수
 * @param {Object} command 명령어 객체
 * @returns {HTMLElement} 버튼 컨테이너
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
  label.textContent = command.label || command.id.split(':').pop() || command.id;
  button.appendChild(label);
  
  buttonContainer.appendChild(button);
  return buttonContainer;
}

/**
 * 명령어 카테고리 토글
 * @param {string} sectionId 카테고리 섹션 ID 
 */
function toggleCommandSection(sectionId) {
  const container = document.getElementById(sectionId);
  const toggleIcon = document.querySelector(`#${sectionId}-toggle`);
  
  if (container.classList.contains('collapsed')) {
    container.classList.remove('collapsed');
    toggleIcon.classList.remove('collapsed');
  } else {
    container.classList.add('collapsed');
    toggleIcon.classList.add('collapsed');
  }
}