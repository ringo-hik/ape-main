"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJiraCommands = createJiraCommands;
/**
 * Jira 관련 슬래시 명령어 정의
 */
const vscode = __importStar(require("vscode"));
const jiraService_1 = require("../services/jiraService");
/**
 * Jira 명령어 생성
 */
function createJiraCommands(jiraService) {
    const commands = [];
    // Jira 메인 명령어
    commands.push({
        name: 'jira',
        aliases: ['j', '지라', '이슈'],
        description: 'Jira 이슈 관련 작업을 수행합니다',
        examples: ['/jira search', '/jira create', '/jira summary', '/jira status', '/지라 검색'],
        category: 'utility',
        priority: 8,
        execute: async (context) => {
            const subCommand = context.args[0]?.toLowerCase();
            if (!subCommand) {
                // 하위 명령어 없이 사용시 도움말 표시
                const helpMessage = `
## Jira 명령어 도움말

Jira 관련 작업을 수행하기 위한 명령어입니다. 다음과 같은 하위 명령어를 사용할 수 있습니다:

- **/jira create** - 새 Jira 이슈를 생성합니다
- **/jira search** - Jira 이슈를 검색합니다
- **/jira summary** - 프로젝트 요약 정보를 표시합니다
- **/jira status** - Jira 이슈의 상태를 변경합니다

사용 예시: \`/jira search APE-\`, \`/jira create\`, \`/jira summary APE\`, \`/jira status APE-123 in-progress\`
        `;
                await vscode.commands.executeCommand('ape.sendLlmResponse', {
                    role: 'assistant',
                    content: helpMessage
                });
                return;
            }
            // 하위 명령어 처리
            switch (subCommand) {
                case 'create':
                case '생성':
                case '만들기':
                    await handleJiraCreate(jiraService);
                    break;
                case 'search':
                case '검색':
                case '찾기':
                    await handleJiraSearch(jiraService, context);
                    break;
                case 'summary':
                case '요약':
                case '통계':
                    await handleJiraSummary(jiraService, context);
                    break;
                case 'status':
                case '상태':
                case '변경':
                case 'update':
                    await handleJiraStatus(jiraService, context);
                    break;
                default:
                    vscode.window.showErrorMessage(`알 수 없는 Jira 하위 명령어: ${subCommand}`);
                    break;
            }
        },
        provideCompletions: (partialArgs) => {
            const parts = partialArgs.split(' ');
            // 첫 번째 인자 자동완성 (하위 명령어)
            if (parts.length <= 1) {
                const subCommands = ['create', 'search', 'summary', 'status', '생성', '검색', '요약', '상태', '변경'];
                return subCommands.filter(cmd => cmd.toLowerCase().startsWith(parts[0]?.toLowerCase() || ''));
            }
            // 하위 명령어에 따른 자동완성
            const subCommand = parts[0].toLowerCase();
            if (subCommand === 'search' || subCommand === '검색') {
                // 검색어 자동완성은 제공하지 않음
                return [];
            }
            else if (subCommand === 'summary' || subCommand === '요약') {
                // 프로젝트 키 자동완성은 제공하지 않음 (무수히 많을 수 있음)
                return [];
            }
            else if (subCommand === 'status' || subCommand === '상태' || subCommand === '변경') {
                // 이슈 키 자동완성은 제공하지 않음
                if (parts.length === 3) {
                    // 상태 값 자동완성
                    const statusValues = ['todo', 'in-progress', 'in-review', 'done', 'blocked'];
                    return statusValues.filter(status => status.startsWith(parts[2].toLowerCase()));
                }
            }
            return [];
        }
    });
    return commands;
}
/**
 * Jira 이슈 상태 변경 처리
 */
async function handleJiraStatus(jiraService, context) {
    if (!jiraService) {
        vscode.window.showErrorMessage('Jira 서비스를 사용할 수 없습니다');
        return;
    }
    try {
        // 상태 변경에 필요한 파라미터 확인 (이슈 키와 새 상태)
        const statusArgs = context?.args.slice(1) || [];
        if (statusArgs.length < 1) {
            // 이슈 키 입력 받기
            const issueKey = await vscode.window.showInputBox({
                prompt: 'Jira 이슈 키를 입력하세요',
                placeHolder: '예: APE-123, PROJ-456 등'
            });
            if (!issueKey)
                return; // 취소됨
            // 상태값 선택하기
            const status = await vscode.window.showQuickPick([
                { label: '할일', value: 'todo' },
                { label: '진행중', value: 'in-progress' },
                { label: '검토중', value: 'in-review' },
                { label: '완료', value: 'done' },
                { label: '차단됨', value: 'blocked' }
            ], { placeHolder: '변경할 상태를 선택하세요' });
            if (!status)
                return; // 취소됨
            // 상태 변경 실행
            return await executeStatusChange(jiraService, issueKey, status.value);
        }
        else {
            const issueKey = statusArgs[0];
            let status;
            if (statusArgs.length < 2) {
                // 상태값 선택하기
                const selectedStatus = await vscode.window.showQuickPick([
                    { label: '할일', value: 'todo' },
                    { label: '진행중', value: 'in-progress' },
                    { label: '검토중', value: 'in-review' },
                    { label: '완료', value: 'done' },
                    { label: '차단됨', value: 'blocked' }
                ], { placeHolder: '변경할 상태를 선택하세요' });
                if (!selectedStatus)
                    return; // 취소됨
                status = selectedStatus.value;
            }
            else {
                status = statusArgs[1].toLowerCase();
            }
            // 상태 변경 실행
            return await executeStatusChange(jiraService, issueKey, status);
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Jira 이슈 상태 변경 오류: ${error instanceof Error ? error.message : String(error)}`);
        // 채팅에 오류 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `## Jira 이슈 상태 변경 오류\n\n이슈 상태 변경 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * 상태 변경 실행 함수
 */
async function executeStatusChange(jiraService, issueKey, statusStr) {
    // 상태값 검증 및 변환
    let status;
    // 상태 문자열을 JiraIssueStatus 열거형으로 변환
    switch (statusStr.toLowerCase()) {
        case 'todo':
        case 'to-do':
        case 'to_do':
        case '할일':
        case '대기':
            status = jiraService_1.JiraIssueStatus.ToDo;
            break;
        case 'in-progress':
        case 'in_progress':
        case 'inprogress':
        case '진행중':
        case '진행':
            status = jiraService_1.JiraIssueStatus.InProgress;
            break;
        case 'in-review':
        case 'in_review':
        case 'inreview':
        case '검토중':
        case '리뷰':
            status = jiraService_1.JiraIssueStatus.InReview;
            break;
        case 'done':
        case 'complete':
        case 'completed':
        case '완료':
        case '종료':
            status = jiraService_1.JiraIssueStatus.Done;
            break;
        case 'blocked':
        case 'block':
        case '차단':
        case '차단됨':
            status = jiraService_1.JiraIssueStatus.Blocked;
            break;
        default:
            throw new Error(`지원되지 않는 상태값입니다: ${statusStr}. 지원되는 상태값: todo, in-progress, in-review, done, blocked`);
    }
    // 현재 이슈 정보 조회
    const issueResult = await jiraService.getIssue(issueKey);
    if (!issueResult.success || !issueResult.data) {
        throw new Error(`이슈를 찾을 수 없습니다: ${issueKey}`);
    }
    const issue = issueResult.data;
    const currentStatus = issue.status;
    // 이미 동일한 상태면 변경하지 않음
    if (currentStatus === status) {
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `## Jira 이슈 상태 정보\n\n이슈 **${issueKey}** (${issue.summary})는 이미 **${getStatusDisplayName(status)}** 상태입니다.`
        });
        return;
    }
    // 상태 변경 실행
    const result = await jiraService.updateIssueStatus(issueKey, status);
    if (result.success) {
        vscode.window.showInformationMessage(`Jira 이슈 상태가 변경되었습니다: ${issueKey}`);
        // 채팅에 결과 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `## Jira 이슈 상태 변경 완료\n\n이슈 **${issueKey}** (${issue.summary})의 상태가 **${getStatusDisplayName(currentStatus)}**에서 **${getStatusDisplayName(status)}**(으)로 변경되었습니다.`
        });
    }
    else {
        throw new Error(result.error?.message || '이슈 상태 변경에 실패했습니다');
    }
}
/**
 * 상태 표시명 가져오기
 */
function getStatusDisplayName(status) {
    switch (status) {
        case jiraService_1.JiraIssueStatus.ToDo:
            return '할일';
        case jiraService_1.JiraIssueStatus.InProgress:
            return '진행중';
        case jiraService_1.JiraIssueStatus.InReview:
            return '검토중';
        case jiraService_1.JiraIssueStatus.Done:
            return '완료';
        case jiraService_1.JiraIssueStatus.Blocked:
            return '차단됨';
        default:
            return '알 수 없음';
    }
}
/**
 * Jira 이슈 생성 처리
 */
async function handleJiraCreate(jiraService) {
    if (!jiraService) {
        vscode.window.showErrorMessage('Jira 서비스를 사용할 수 없습니다');
        return;
    }
    try {
        // 프로젝트 키 입력 받기
        const projectKey = await vscode.window.showInputBox({
            prompt: 'Jira 프로젝트 키를 입력하세요',
            placeHolder: '예: APE, DEV, TEST 등'
        });
        if (!projectKey)
            return; // 취소됨
        // 이슈 유형 입력 받기
        const issueType = await vscode.window.showQuickPick(['Task', 'Bug', 'Story', 'Epic'], { placeHolder: '이슈 유형을 선택하세요' });
        if (!issueType)
            return; // 취소됨
        // 이슈 제목 입력 받기
        const summary = await vscode.window.showInputBox({
            prompt: '이슈 제목을 입력하세요',
            placeHolder: '이슈 제목'
        });
        if (!summary)
            return; // 취소됨
        // 이슈 설명 입력 받기
        const description = await vscode.window.showInputBox({
            prompt: '이슈 설명을 입력하세요 (선택사항)',
            placeHolder: '이슈 설명'
        });
        // 이슈 생성
        const result = await jiraService.createIssue({
            projectKey,
            issueType,
            summary,
            description: description || ''
        });
        if (result.success && result.data) {
            vscode.window.showInformationMessage(`Jira 이슈가 생성되었습니다: ${result.data.key}`);
            // 채팅에 결과 표시
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `## Jira 이슈 생성 완료\n\n이슈 **${result.data.key}**가 성공적으로 생성되었습니다.\n\n- **제목**: ${summary}\n- **유형**: ${issueType}\n- **프로젝트**: ${projectKey}`
            });
        }
        else {
            throw new Error(result.error?.message || '이슈 생성에 실패했습니다');
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Jira 이슈 생성 오류: ${error instanceof Error ? error.message : String(error)}`);
        // 채팅에 오류 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `## Jira 이슈 생성 오류\n\n이슈 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Jira 이슈 검색 처리
 */
async function handleJiraSearch(jiraService, context) {
    if (!jiraService) {
        vscode.window.showErrorMessage('Jira 서비스를 사용할 수 없습니다');
        return;
    }
    try {
        // 검색 조건 구성
        const searchArgs = context?.args.slice(1) || [];
        const searchText = searchArgs.join(' ');
        // 검색 텍스트가 없으면 입력 받기
        let finalSearchText = searchText;
        if (!finalSearchText) {
            finalSearchText = await vscode.window.showInputBox({
                prompt: 'Jira 검색어를 입력하세요',
                placeHolder: '프로젝트 키, 이슈 키, 텍스트 등 (예: APE-123, Bug, 로그인)'
            });
            if (!finalSearchText)
                return; // 취소됨
        }
        // 검색 조건 파싱 (간단 구현)
        const searchCriteria = {};
        // 프로젝트 키 패턴 확인
        const projectKeyMatch = finalSearchText.match(/^([A-Z0-9]+-\d+|[A-Z0-9]+)$/);
        if (projectKeyMatch) {
            if (projectKeyMatch[0].includes('-')) {
                // 특정 이슈 검색
                const result = await jiraService.getIssue(projectKeyMatch[0]);
                if (result.success && result.data) {
                    // 채팅에 결과 표시
                    await vscode.commands.executeCommand('ape.sendLlmResponse', {
                        role: 'assistant',
                        content: `## Jira 이슈 검색 결과\n\n### ${result.data.key}: ${result.data.summary}\n\n**상태**: ${result.data.status}\n**담당자**: ${result.data.assignee?.displayName || '없음'}\n**보고자**: ${result.data.reporter?.displayName || '없음'}\n\n${result.data.description || '설명 없음'}`
                    });
                    return;
                }
            }
            else {
                // 프로젝트 내 이슈 검색
                searchCriteria.projectKey = projectKeyMatch[0];
            }
        }
        else {
            // 텍스트 검색
            searchCriteria.text = finalSearchText;
        }
        // 최대 결과 수 제한
        searchCriteria.maxResults = 10;
        // 검색 실행
        const result = await jiraService.searchIssues(searchCriteria);
        if (result.success && result.data) {
            if (result.data.issues.length === 0) {
                await vscode.commands.executeCommand('ape.sendLlmResponse', {
                    role: 'assistant',
                    content: `## Jira 이슈 검색 결과\n\n검색어 \`${finalSearchText}\`에 해당하는 이슈를 찾을 수 없습니다.`
                });
                return;
            }
            // 결과 포맷팅
            let content = `## Jira 이슈 검색 결과\n\n검색어: \`${finalSearchText}\`\n\n총 **${result.data.total}**개 이슈 중 **${result.data.issues.length}**개 표시\n\n`;
            // 이슈 목록 표시
            result.data.issues.forEach(issue => {
                content += `### ${issue.key}: ${issue.summary}\n\n`;
                content += `**상태**: ${issue.status} | **담당자**: ${issue.assignee?.displayName || '없음'}\n\n`;
            });
            // 더 많은 결과가 있는 경우 안내
            if (result.data.hasMore) {
                content += `\n> 더 많은 결과가 있습니다. 검색어를 구체적으로 지정하거나 Jira 웹 인터페이스에서 확인하세요.`;
            }
            // 채팅에 결과 표시
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content
            });
        }
        else {
            throw new Error(result.error?.message || '이슈 검색에 실패했습니다');
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Jira 이슈 검색 오류: ${error instanceof Error ? error.message : String(error)}`);
        // 채팅에 오류 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `## Jira 이슈 검색 오류\n\n이슈 검색 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Jira 프로젝트 요약 처리
 */
async function handleJiraSummary(jiraService, context) {
    if (!jiraService) {
        vscode.window.showErrorMessage('Jira 서비스를 사용할 수 없습니다');
        return;
    }
    try {
        // 프로젝트 키 구성
        const summaryArgs = context?.args.slice(1) || [];
        const projectKey = summaryArgs.join(' ');
        // 프로젝트 키가 없으면 입력 받기
        let finalProjectKey = projectKey;
        if (!finalProjectKey) {
            finalProjectKey = await vscode.window.showInputBox({
                prompt: 'Jira 프로젝트 키를 입력하세요',
                placeHolder: '예: APE, DEV, TEST 등'
            });
            if (!finalProjectKey)
                return; // 취소됨
        }
        // 요약 실행
        const result = await jiraService.getProjectSummary(finalProjectKey);
        if (result.success && result.data) {
            const summary = result.data;
            // 상태별 이슈 분포 포맷팅
            let statusDistribution = '';
            for (const [status, count] of Object.entries(summary.issuesByStatus)) {
                statusDistribution += `- **${status}**: ${count}개\n`;
            }
            // 담당자별 이슈 분포 포맷팅
            let assigneeDistribution = '';
            for (const [assignee, count] of Object.entries(summary.issuesByAssignee)) {
                assigneeDistribution += `- **${assignee || '미할당'}**: ${count}개\n`;
            }
            // 우선순위별 이슈 분포 포맷팅
            let priorityDistribution = '';
            for (const [priority, count] of Object.entries(summary.issuesByPriority)) {
                priorityDistribution += `- **${priority || '미지정'}**: ${count}개\n`;
            }
            // 최근 이슈 목록 포맷팅
            let recentIssues = '';
            summary.recentIssues.forEach(issue => {
                recentIssues += `- **${issue.key}**: ${issue.summary} (${issue.status})\n`;
            });
            // 미해결 상태의 오래된 이슈 포맷팅
            let oldestUnresolvedIssues = '';
            summary.oldestUnresolvedIssues.forEach(issue => {
                oldestUnresolvedIssues += `- **${issue.key}**: ${issue.summary} (${issue.status}, 생성: ${issue.created?.split('T')[0] || '날짜 미상'})\n`;
            });
            // 결과 내용 구성
            let content = `## Jira 프로젝트 요약: ${finalProjectKey}\n\n`;
            if (summary.projectStats) {
                content += `### 프로젝트 통계\n\n`;
                content += `- **총 이슈 수**: ${summary.projectStats.totalIssues}개\n`;
                content += `- **열린 이슈 수**: ${summary.projectStats.openIssues}개\n`;
                content += `- **완료율**: ${summary.projectStats.percentComplete.toFixed(1)}%\n\n`;
            }
            content += `### 상태별 이슈 분포\n\n${statusDistribution}\n`;
            content += `### 담당자별 이슈 분포\n\n${assigneeDistribution}\n`;
            content += `### 우선순위별 이슈 분포\n\n${priorityDistribution}\n`;
            if (recentIssues) {
                content += `### 최근 이슈\n\n${recentIssues}\n`;
            }
            if (oldestUnresolvedIssues) {
                content += `### 미해결 상태의 오래된 이슈\n\n${oldestUnresolvedIssues}\n`;
            }
            if (summary.averageResolutionTime !== undefined) {
                content += `### 성능 지표\n\n`;
                content += `- **평균 해결 시간**: ${Math.round(summary.averageResolutionTime / 24)}일\n`;
            }
            // 채팅에 결과 표시
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content
            });
        }
        else {
            throw new Error(result.error?.message || '프로젝트 요약 정보를 가져오는 데 실패했습니다');
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Jira 프로젝트 요약 오류: ${error instanceof Error ? error.message : String(error)}`);
        // 채팅에 오류 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `## Jira 프로젝트 요약 오류\n\n프로젝트 요약 정보를 가져오는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
//# sourceMappingURL=jiraCommands.js.map