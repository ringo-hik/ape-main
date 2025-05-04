/**
 * 설정 유효성 검증 모듈
 * 
 * settings.json 설정 파일의 유효성을 검증하는 클래스
 * JSON 스키마 기반 검증 지원
 */

/**
 * 설정 유효성 검증 클래스
 * JSON 스키마를 사용한 설정 유효성 검증
 */
export class ConfigValidatorService {
  /**
   * 스키마 캐시
   */
  private schemas: Map<string, any> = new Map();
  
  /**
   * 생성자
   */
  constructor() {
    // 기본 스키마 로드
    this.loadDefaultSchemas();
  }
  
  /**
   * 기본 스키마 로드
   */
  private loadDefaultSchemas(): void {
    // 코어 스키마
    this.schemas.set('core', {
      type: 'object',
      properties: {
        logLevel: {
          type: 'string',
          enum: ['debug', 'info', 'warn', 'error']
        },
        sslBypass: {
          type: 'boolean'
        },
        storagePath: {
          type: 'string'
        },
        offlineMode: {
          type: 'boolean'
        }
      }
    });
    
    // 플러그인 스키마
    this.schemas.set('plugins', {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean'
          },
          name: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          commands: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string'
                },
                description: {
                  type: 'string'
                },
                syntax: {
                  type: 'string'
                },
                examples: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                api: {
                  type: 'object',
                  properties: {
                    endpoint: {
                      type: 'string'
                    },
                    method: {
                      type: 'string',
                      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
                    },
                    headers: {
                      type: 'object',
                      additionalProperties: {
                        type: 'string'
                      }
                    },
                    body: {
                      type: 'object'
                    }
                  },
                  required: ['endpoint', 'method']
                }
              },
              required: ['name', 'description', 'syntax']
            }
          }
        },
        required: ['enabled', 'name']
      }
    });
  }
  
  /**
   * 설정 유효성 검증
   * @param config 검증할 설정 객체
   * @returns 유효성 여부
   */
  public async validate(config: any): Promise<boolean> {
    try {
      // 기본적인 유효성 검사
      if (!config || typeof config !== 'object') {
        console.error('유효하지 않은 설정 형식: 객체가 아님');
        return false;
      }
      
      // 필수 섹션 확인
      if (!config.core) {
        console.warn('코어 설정 섹션이 없음');
        // 필수는 아니므로 경고만 출력
      }
      
      // 코어 설정 검증
      if (config.core && !this.validateSection(config.core, this.schemas.get('core'))) {
        console.error('코어 설정 유효성 검증 실패');
        return false;
      }
      
      // 플러그인 설정 검증
      if (config.plugins && !this.validateSection(config.plugins, this.schemas.get('plugins'))) {
        console.error('플러그인 설정 유효성 검증 실패');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('설정 검증 중 오류 발생:', error);
      return false;
    }
  }
  
  /**
   * 설정 섹션 유효성 검증
   * 간단한 유효성 검사 수행 (실제로는 더 정교한 JSON 스키마 검증 라이브러리 사용 권장)
   * @param section 검증할 설정 섹션
   * @param schema JSON 스키마
   * @returns 유효성 여부
   */
  private validateSection(section: any, schema: any): boolean {
    // 이 함수는 기본적인 검증만 수행합니다.
    // 실제 구현에서는 ajv 같은 JSON 스키마 검증 라이브러리 사용을 권장합니다.
    
    try {
      // 타입 확인
      if (schema.type === 'object' && typeof section !== 'object') {
        return false;
      }
      
      // 객체 속성 확인
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries<any>(schema.properties)) {
          if (section[key] !== undefined) {
            if (propSchema.type === 'string' && typeof section[key] !== 'string') {
              return false;
            } else if (propSchema.type === 'boolean' && typeof section[key] !== 'boolean') {
              return false;
            } else if (propSchema.type === 'number' && typeof section[key] !== 'number') {
              return false;
            } else if (propSchema.type === 'array' && !Array.isArray(section[key])) {
              return false;
            } else if (propSchema.type === 'object' && (typeof section[key] !== 'object' || Array.isArray(section[key]))) {
              return false;
            }
            
            // enum 확인
            if (propSchema.enum && !propSchema.enum.includes(section[key])) {
              return false;
            }
          }
        }
      }
      
      // 필수 속성 확인
      if (schema.required) {
        for (const requiredProp of schema.required) {
          if (section[requiredProp] === undefined) {
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('설정 섹션 검증 중 오류 발생:', error);
      return false;
    }
  }
}