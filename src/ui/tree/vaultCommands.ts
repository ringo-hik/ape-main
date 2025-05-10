/**
 * Vault 트리 뷰 명령어 관리
 * 
 * Vault 문서 시스템의 명령어를 정의하고 등록합니다.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { VaultService, VaultContextType, VaultContext, VaultItem } from '../../core/services/vaultService';
import { VaultTreeProvider } from './vaultTreeProvider';

/**
 * Vault 명령어 등록
 * @param context VSCode 확장 컨텍스트
 * @param vaultService Vault 서비스
 * @param treeProvider Vault 트리 뷰 제공자
 */
export function registerVaultCommands(
  context: vscode.ExtensionContext,
  vaultService: VaultService,
  treeProvider: VaultTreeProvider
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  
  // 문서 열기 명령
  disposables.push(vscode.commands.registerCommand('ape.vault.revealDocument', async (metadata) => {
    await revealDocument(context, vaultService, metadata);
  }));
  
  // 새 문서 생성 명령
  disposables.push(vscode.commands.registerCommand('ape.vault.createDocument', async (contextData) => {
    await createDocument(context, vaultService, treeProvider, contextData);
  }));
  
  // 문서 삭제 명령
  disposables.push(vscode.commands.registerCommand('ape.vault.deleteDocument', async (metadata) => {
    await deleteDocument(context, vaultService, treeProvider, metadata);
  }));
  
  // 새 카테고리 생성 명령
  disposables.push(vscode.commands.registerCommand('ape.vault.createCategory', async (contextType) => {
    await createCategory(context, vaultService, treeProvider, contextType);
  }));
  
  // 카테고리 삭제 명령
  disposables.push(vscode.commands.registerCommand('ape.vault.deleteCategory', async (metadata) => {
    await deleteCategory(context, vaultService, treeProvider, metadata);
  }));
  
  // 내용 저장 명령
  disposables.push(vscode.workspace.onDidSaveTextDocument(async (document) => {
    await handleDocumentSave(document, vaultService, treeProvider);
  }));
  
  return disposables;
}

/**
 * 문서 열기 (Reveal)
 */
async function revealDocument(
  context: vscode.ExtensionContext,
  vaultService: VaultService,
  metadata: any
): Promise<void> {
  if (!metadata || !metadata.itemId || !metadata.contextId) {
    vscode.window.showErrorMessage('문서 정보가 올바르지 않습니다.');
    return;
  }
  
  try {
    // 컨텍스트 및 아이템 가져오기
    const vaultContext = vaultService.getContextById(metadata.contextId);
    if (!vaultContext) {
      vscode.window.showErrorMessage('문서 카테고리를 찾을 수 없습니다.');
      return;
    }
    
    // 아이템 찾기
    const item = vaultContext.items.find(item => item.id === metadata.itemId);
    if (!item) {
      vscode.window.showErrorMessage('문서를 찾을 수 없습니다.');
      return;
    }
    
    let documentUri: vscode.Uri;
    let documentContent = item.content;
    
    // 파일 경로 확인
    if (metadata.filePath && fs.existsSync(metadata.filePath)) {
      // 실제 파일이 있는 경우 해당 파일 사용
      documentUri = vscode.Uri.file(metadata.filePath);
    } else {
      // 가상 파일 생성
      const tempDir = path.join(context.globalStoragePath, 'vault-temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // 임시 파일 생성
      const tempFilePath = path.join(tempDir, `${item.id}.md`);
      fs.writeFileSync(tempFilePath, documentContent, 'utf8');
      
      documentUri = vscode.Uri.file(tempFilePath);
    }
    
    // 문서 열기
    const document = await vscode.workspace.openTextDocument(documentUri);
    await vscode.window.showTextDocument(document);
    
    // 메타데이터 저장 (파일 저장 시 동기화를 위해)
    document.userData = {
      vaultItemId: item.id,
      vaultContextId: vaultContext.id,
      vaultContextType: vaultContext.type
    };
    
  } catch (error) {
    console.error('문서 열기 오류:', error);
    vscode.window.showErrorMessage(`문서를 열 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 새 문서 생성
 */
async function createDocument(
  context: vscode.ExtensionContext,
  vaultService: VaultService,
  treeProvider: VaultTreeProvider,
  contextData: any
): Promise<void> {
  if (!contextData || !contextData.contextId) {
    // 컨텍스트 선택 UI 표시
    const contextItems = vaultService.getAllContexts().map(context => ({
      label: context.name,
      description: getContextTypeLabel(context.type),
      context
    }));
    
    if (contextItems.length === 0) {
      vscode.window.showErrorMessage('문서를 저장할 카테고리가 없습니다. 먼저 카테고리를 생성하세요.');
      return;
    }
    
    const selected = await vscode.window.showQuickPick(contextItems, {
      placeHolder: '문서를 저장할 카테고리를 선택하세요'
    });
    
    if (!selected) {
      return;
    }
    
    contextData = {
      contextId: selected.context.id,
      contextType: selected.context.type
    };
  }
  
  try {
    // 문서 이름 입력 받기
    const documentName = await vscode.window.showInputBox({
      prompt: '새 문서 이름을 입력하세요',
      placeHolder: '문서 이름'
    });
    
    if (!documentName) {
      return;
    }
    
    // 문서 설명 입력 받기 (선택사항)
    const documentDescription = await vscode.window.showInputBox({
      prompt: '문서 설명을 입력하세요 (선택사항)',
      placeHolder: '문서 설명'
    });
    
    // 태그 입력 받기 (선택사항)
    const tagsInput = await vscode.window.showInputBox({
      prompt: '태그를 입력하세요 (쉼표로 구분, 선택사항)',
      placeHolder: 'tag1, tag2, tag3'
    });
    
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : undefined;
    
    // 초기 내용 설정
    let initialContent = '';
    
    // 문서 유형에 따른 초기 내용 생성
    if (tags && tags.length > 0) {
      if (tags.includes('markdown') || tags.includes('documentation')) {
        initialContent = `# ${documentName}\n\n## 개요\n\n내용을 입력하세요.\n\n## 세부 내용\n\n- 항목 1\n- 항목 2\n- 항목 3\n`;
      } else if (tags.includes('code') || tags.includes('typescript')) {
        initialContent = `/**\n * ${documentName}\n * \n * ${documentDescription || '설명을 입력하세요.'}\n */\n\n// 코드를 입력하세요\n`;
      } else if (tags.includes('prompt')) {
        initialContent = `# ${documentName}\n\n## 시스템 프롬프트\n\nYou are an AI assistant for the APE project. Your role is to help with development tasks and provide guidance.\n\n## 사용자 프롬프트\n\n사용자 프롬프트를 입력하세요.\n`;
      }
    }
    
    // 기본 내용 설정 (태그에 따른 내용이 없는 경우)
    if (!initialContent) {
      initialContent = `# ${documentName}\n\n${documentDescription || ''}\n\n내용을 입력하세요.\n`;
    }
    
    // 임시 파일 생성
    const tempDir = path.join(context.globalStoragePath, 'vault-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `new_document_${Date.now()}.md`);
    fs.writeFileSync(tempFilePath, initialContent, 'utf8');
    
    // 임시 파일 열기
    const document = await vscode.workspace.openTextDocument(tempFilePath);
    await vscode.window.showTextDocument(document);
    
    // 메타데이터 설정
    const newItemData = {
      name: documentName,
      description: documentDescription,
      content: initialContent,
      tags,
      contextType: contextData.contextType
    };
    
    // Vault 아이템 생성
    const newItem = await vaultService.createItem(contextData.contextId, newItemData);
    
    // 트리 뷰 새로고침
    treeProvider.refresh();
    
    // 문서 메타데이터 저장
    document.userData = {
      vaultItemId: newItem.id,
      vaultContextId: contextData.contextId,
      vaultContextType: contextData.contextType,
      isNewDocument: true
    };
    
    vscode.window.showInformationMessage(`문서 '${documentName}'이(가) 생성되었습니다.`);
  } catch (error) {
    console.error('문서 생성 오류:', error);
    vscode.window.showErrorMessage(`문서를 생성할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 문서 삭제
 */
async function deleteDocument(
  context: vscode.ExtensionContext,
  vaultService: VaultService,
  treeProvider: VaultTreeProvider,
  metadata: any
): Promise<void> {
  if (!metadata || !metadata.itemId || !metadata.contextId) {
    vscode.window.showErrorMessage('문서 정보가 올바르지 않습니다.');
    return;
  }
  
  try {
    // 컨텍스트 및 아이템 가져오기
    const vaultContext = vaultService.getContextById(metadata.contextId);
    if (!vaultContext) {
      vscode.window.showErrorMessage('문서 카테고리를 찾을 수 없습니다.');
      return;
    }
    
    // 아이템 찾기
    const item = vaultContext.items.find(item => item.id === metadata.itemId);
    if (!item) {
      vscode.window.showErrorMessage('문서를 찾을 수 없습니다.');
      return;
    }
    
    // 삭제 확인
    const confirmed = await vscode.window.showWarningMessage(
      `'${item.name}' 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      { modal: true },
      '삭제'
    );
    
    if (confirmed !== '삭제') {
      return;
    }
    
    // 문서 삭제
    await vaultService.deleteItem(metadata.contextId, metadata.itemId);
    
    // 트리 뷰 새로고침
    treeProvider.refresh();
    
    vscode.window.showInformationMessage(`문서 '${item.name}'이(가) 삭제되었습니다.`);
  } catch (error) {
    console.error('문서 삭제 오류:', error);
    vscode.window.showErrorMessage(`문서를 삭제할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 새 카테고리 생성
 */
async function createCategory(
  context: vscode.ExtensionContext,
  vaultService: VaultService,
  treeProvider: VaultTreeProvider,
  contextTypeData: any
): Promise<void> {
  // 컨텍스트 타입 선택 (지정되지 않은 경우)
  let contextType = contextTypeData?.contextType;
  
  if (!contextType) {
    const typeOptions = [
      { label: '프로젝트 문서', value: VaultContextType.Project },
      { label: '개인 문서', value: VaultContextType.Personal },
      { label: '공유 문서', value: VaultContextType.Shared },
      { label: '템플릿 문서', value: VaultContextType.Template },
      { label: '시스템 문서', value: VaultContextType.System }
    ];
    
    const selected = await vscode.window.showQuickPick(typeOptions, {
      placeHolder: '카테고리 유형을 선택하세요'
    });
    
    if (!selected) {
      return;
    }
    
    contextType = selected.value;
  }
  
  try {
    // 카테고리 이름 입력 받기
    const categoryName = await vscode.window.showInputBox({
      prompt: '새 카테고리 이름을 입력하세요',
      placeHolder: '카테고리 이름'
    });
    
    if (!categoryName) {
      return;
    }
    
    // 카테고리 설명 입력 받기 (선택사항)
    const categoryDescription = await vscode.window.showInputBox({
      prompt: '카테고리 설명을 입력하세요 (선택사항)',
      placeHolder: '카테고리 설명'
    });
    
    // 카테고리 생성
    const newContext = await vaultService.createContext(categoryName, contextType, categoryDescription);
    
    // 트리 뷰 새로고침
    treeProvider.refresh();
    
    vscode.window.showInformationMessage(`'${categoryName}' 카테고리가 생성되었습니다.`);
  } catch (error) {
    console.error('카테고리 생성 오류:', error);
    vscode.window.showErrorMessage(`카테고리를 생성할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 카테고리 삭제
 */
async function deleteCategory(
  context: vscode.ExtensionContext,
  vaultService: VaultService,
  treeProvider: VaultTreeProvider,
  metadata: any
): Promise<void> {
  if (!metadata || !metadata.contextId) {
    vscode.window.showErrorMessage('카테고리 정보가 올바르지 않습니다.');
    return;
  }
  
  try {
    // 컨텍스트 가져오기
    const vaultContext = vaultService.getContextById(metadata.contextId);
    if (!vaultContext) {
      vscode.window.showErrorMessage('카테고리를 찾을 수 없습니다.');
      return;
    }
    
    // 삭제 확인
    const confirmed = await vscode.window.showWarningMessage(
      `'${vaultContext.name}' 카테고리와 모든 포함된 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      { modal: true },
      '삭제'
    );
    
    if (confirmed !== '삭제') {
      return;
    }
    
    // 카테고리 삭제
    await vaultService.deleteContext(metadata.contextId);
    
    // 트리 뷰 새로고침
    treeProvider.refresh();
    
    vscode.window.showInformationMessage(`'${vaultContext.name}' 카테고리가 삭제되었습니다.`);
  } catch (error) {
    console.error('카테고리 삭제 오류:', error);
    vscode.window.showErrorMessage(`카테고리를 삭제할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 문서 저장 핸들러
 */
async function handleDocumentSave(
  document: vscode.TextDocument,
  vaultService: VaultService,
  treeProvider: VaultTreeProvider
): Promise<void> {
  // 메타데이터 확인
  const userData = document.userData;
  
  if (!userData || !userData.vaultItemId || !userData.vaultContextId) {
    return;
  }
  
  try {
    // 문서 내용 가져오기
    const content = document.getText();
    
    // Vault 아이템 업데이트
    await vaultService.updateItem(userData.vaultContextId, userData.vaultItemId, {
      content
    });
    
    // 트리 뷰 새로고침
    treeProvider.refresh();
    
    // 새 문서인 경우 메시지 표시
    if (userData.isNewDocument) {
      vscode.window.showInformationMessage('문서가 Vault에 저장되었습니다.');
      delete userData.isNewDocument;
    }
  } catch (error) {
    console.error('문서 저장 오류:', error);
    vscode.window.showErrorMessage(`문서를 Vault에 저장할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 컨텍스트 타입 레이블 가져오기
 */
function getContextTypeLabel(type: VaultContextType): string {
  switch (type) {
    case VaultContextType.System:
      return '시스템 문서';
    case VaultContextType.Project:
      return '프로젝트 문서';
    case VaultContextType.Personal:
      return '개인 문서';
    case VaultContextType.Shared:
      return '공유 문서';
    case VaultContextType.Template:
      return '템플릿 문서';
    default:
      return '문서 카테고리';
  }
}