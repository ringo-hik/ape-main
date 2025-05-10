/**
 * 확장된 TextDocument 인터페이스 정의
 * 
 * VS Code의 TextDocument에 userData 속성을 추가하여
 * Vault 통합을 위한 메타데이터를 저장할 수 있도록 합니다.
 */

import * as vscode from 'vscode';
import { VaultContextType } from '../../core/services/vaultService';

/**
 * Vault 문서 메타데이터
 */
export interface VaultDocumentMetadata {
  /** Vault 아이템 ID */
  vaultItemId: string;
  
  /** Vault 컨텍스트 ID */
  vaultContextId: string;
  
  /** Vault 컨텍스트 타입 */
  vaultContextType: VaultContextType;
  
  /** 새 문서 여부 (최초 저장 시 메시지 표시용) */
  isNewDocument?: boolean;
}

/**
 * VS Code TextDocument 인터페이스 확장
 */
export interface VaultTextDocument extends vscode.TextDocument {
  /**
   * Vault 메타데이터
   * 
   * 문서와 Vault 아이템 간의 연결 정보를 저장합니다.
   */
  userData?: VaultDocumentMetadata;
}