"use strict";
/**
 * 인라인 완성 제공자
 *
 * VS Code 입력 중에 인라인 제안 및 고스트 텍스트를 제공하는 컴포넌트
 */
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
exports.InlineCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
const chat_1 = require("../../types/chat");
/**
 * 인라인 완성 제공자 클래스
 */
class InlineCompletionProvider {
    llmService;
    context;
    completionCache = new Map();
    cacheTimeout = 5 * 60 * 1000; // 5분
    requestQueue = new Map();
    completionConfig = {
        enabled: true,
        triggerLength: 3,
        debounceDelay: 300,
        maxLineContext: 10
    };
    // 디바운스 타이머
    debounceTimer = null;
    /**
     * 생성자
     */
    constructor(llmService, context) {
        this.llmService = llmService;
        this.context = context;
        // 설정 로드
        this.loadConfiguration();
        // 설정 변경 감지
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ape.completion')) {
                this.loadConfiguration();
            }
        });
    }
    /**
     * 설정 로드
     */
    loadConfiguration() {
        const config = vscode.workspace.getConfiguration('ape.completion');
        this.completionConfig = {
            enabled: config.get('inlineEnabled', true),
            triggerLength: config.get('triggerLength', 3),
            debounceDelay: config.get('debounceDelay', 300),
            maxLineContext: config.get('maxLineContext', 10)
        };
    }
    /**
     * 인라인 완성 제공
     */
    async provideInlineCompletionItems(document, position, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token) {
        // 비활성화된 경우
        if (!this.completionConfig.enabled) {
            return null;
        }
        // 현재 줄 가져오기
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);
        // 트리거 확인 (문자 수 검사)
        if (linePrefix.trim().length < this.completionConfig.triggerLength) {
            return null;
        }
        // 특정 파일 형식 필터링 (주석 또는 문서)
        if (this.shouldSkipCompletion(document, position)) {
            return null;
        }
        // 캐시 키 생성
        const cacheKey = `${document.fileName}:${position.line}:${position.character}:${lineText}`;
        // 캐시된 결과가 있는 경우 재사용
        const cachedResult = this.completionCache.get(cacheKey);
        if (cachedResult && Date.now() - cachedResult.timestamp < this.cacheTimeout) {
            return cachedResult.completions;
        }
        // 이미 요청 중인 경우 해당 요청의 결과 대기
        if (this.requestQueue.has(cacheKey)) {
            try {
                return await this.requestQueue.get(cacheKey);
            }
            catch (error) {
                console.error('대기 중인 인라인 완성 요청 오류:', error);
                return null;
            }
        }
        // 디바운스 적용
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        const completionPromise = new Promise((resolve) => {
            this.debounceTimer = setTimeout(async () => {
                try {
                    // 컨텍스트 수집
                    const context = await this.getCompletionContext(document, position);
                    // LLM을 통한 인라인 완성 요청
                    const completions = await this.requestInlineCompletions(context.precedingText, context.followingText, document.languageId);
                    // 결과 캐싱
                    this.completionCache.set(cacheKey, {
                        completions,
                        timestamp: Date.now()
                    });
                    // 요청 큐에서 제거
                    this.requestQueue.delete(cacheKey);
                    resolve(completions);
                }
                catch (error) {
                    console.error('인라인 완성 요청 오류:', error);
                    this.requestQueue.delete(cacheKey);
                    resolve([]);
                }
            }, this.completionConfig.debounceDelay);
        });
        // 요청 큐에 추가
        this.requestQueue.set(cacheKey, completionPromise);
        return completionPromise;
    }
    /**
     * 완성을 건너뛸지 결정
     */
    shouldSkipCompletion(document, position) {
        // 코드 블록이나 다른 특수 컨텍스트 감지
        const lineText = document.lineAt(position.line).text;
        // 마크다운 코드 블록 또는 주석 내에서는 건너뛰기
        const isMdCodeBlock = document.languageId === 'markdown' &&
            (lineText.trim().startsWith('```') ||
                document.getText(new vscode.Range(new vscode.Position(Math.max(0, position.line - 3), 0), position)).includes('```'));
        // 주석 감지
        const isInComment = this.isPositionInComment(document, position);
        return isMdCodeBlock || isInComment;
    }
    /**
     * 현재 위치가 주석 내에 있는지 확인
     */
    isPositionInComment(document, position) {
        const lineText = document.lineAt(position.line).text;
        // 언어별 주석 구문 검사
        switch (document.languageId) {
            case 'typescript':
            case 'javascript':
            case 'typescriptreact':
            case 'javascriptreact':
            case 'csharp':
            case 'java':
            case 'cpp':
            case 'c': {
                // 한 줄 주석 확인
                if (lineText.substring(0, position.character).includes('//')) {
                    return true;
                }
                // 여러 줄 주석 확인 (간단한 구현)
                const prevText = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
                const commentStarts = (prevText.match(/\/\*/g) || []).length;
                const commentEnds = (prevText.match(/\*\//g) || []).length;
                return commentStarts > commentEnds;
            }
            case 'python':
                // Python 주석
                return lineText.substring(0, position.character).includes('#');
            case 'html':
            case 'xml': {
                // HTML/XML 주석
                const htmlPrev = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
                const htmlCommentStarts = (htmlPrev.match(/<!--/g) || []).length;
                const htmlCommentEnds = (htmlPrev.match(/-->/g) || []).length;
                return htmlCommentStarts > htmlCommentEnds;
            }
        }
        return false;
    }
    /**
     * 완성 컨텍스트 수집
     */
    async getCompletionContext(document, position) {
        // 이전 텍스트 (현재 라인 포함)
        const startLine = Math.max(0, position.line - this.completionConfig.maxLineContext);
        const precedingText = document.getText(new vscode.Range(new vscode.Position(startLine, 0), position));
        // 이후 텍스트 (현재 라인의 나머지 부분 + 다음 몇 줄)
        const endLine = Math.min(document.lineCount - 1, position.line + 5);
        const followingText = document.getText(new vscode.Range(position, new vscode.Position(endLine, document.lineAt(endLine).text.length)));
        return { precedingText, followingText };
    }
    /**
     * LLM을 통한 인라인 완성 요청
     */
    async requestInlineCompletions(precedingText, followingText, languageId) {
        try {
            // 프롬프트 생성
            const prompt = `
현재 사용자가 코드를 작성하고 있습니다. 언어는 ${languageId}입니다.
사용자의 입력을 기반으로 다음에 올 코드를 정확하게 예측해서 제안해주세요.
문맥을 고려하여 가장 적절한 자연스러운 다음 코드 줄이나 구문을 작성해주세요.
인라인 제안이므로 간결하고 정확해야 합니다.

현재까지 작성된 코드:
\`\`\`${languageId}
${precedingText}
\`\`\`

현재 위치 이후의 코드 (컨텍스트):
\`\`\`${languageId}
${followingText}
\`\`\`

다음에 올 코드 예측 (최대 3개):
`;
            // LLM 요청
            const messages = [
                {
                    id: `msg_inline_${Date.now()}`,
                    role: chat_1.MessageRole.User,
                    content: prompt,
                    timestamp: new Date()
                }
            ];
            const result = await this.llmService.sendRequest(messages);
            if (result.success && result.data) {
                // 응답 파싱하여 InlineCompletionItem 배열로 변환
                return this.parseInlineCompletionResponse(result.data.content || '');
            }
            else {
                throw new Error('LLM 요청 실패');
            }
        }
        catch (error) {
            console.error('LLM 인라인 완성 요청 오류:', error);
            return [];
        }
    }
    /**
     * LLM 응답을 InlineCompletionItem으로 파싱
     */
    parseInlineCompletionResponse(responseContent) {
        const completions = [];
        try {
            // 코드 블록 추출
            const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
            const codeBlocks = [];
            let match;
            while ((match = codeBlockRegex.exec(responseContent)) !== null) {
                codeBlocks.push(match[1]);
            }
            if (codeBlocks.length > 0) {
                // 코드 블록에서 추출
                for (const block of codeBlocks) {
                    const lines = block.split('\n').filter(line => line.trim() !== '');
                    lines.forEach(line => {
                        if (line.trim()) {
                            completions.push({
                                insertText: line.trim(),
                                range: undefined
                            });
                        }
                    });
                }
            }
            else {
                // 코드 블록이 없는 경우 일반 텍스트로 처리
                const lines = responseContent.split('\n')
                    .filter(line => line.trim() !== '')
                    .filter(line => !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*'));
                lines.forEach(line => {
                    const cleanedLine = line.replace(/^\d+\.\s+/, '').trim();
                    if (cleanedLine) {
                        completions.push({
                            insertText: cleanedLine,
                            range: undefined
                        });
                    }
                });
            }
        }
        catch (error) {
            console.error('인라인 완성 응답 파싱 오류:', error);
        }
        // 중복 제거
        const uniqueCompletions = this.removeDuplicates(completions);
        return uniqueCompletions.slice(0, 3); // 최대 3개 반환
    }
    /**
     * 중복 제거
     */
    removeDuplicates(completions) {
        const seen = new Set();
        return completions.filter(item => {
            if (item.insertText && !seen.has(item.insertText.toString())) {
                seen.add(item.insertText.toString());
                return true;
            }
            return false;
        });
    }
}
exports.InlineCompletionProvider = InlineCompletionProvider;
//# sourceMappingURL=inlineCompletionProvider.js.map