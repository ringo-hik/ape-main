/**
 * 빌드 전 기본 문법 오류 검사 스크립트
 * 주요 문법 오류를 미리 발견하여 빌드 실패를 방지합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 검사할 디렉토리 설정
const srcDir = path.join(__dirname, '..', 'src');
const outDir = path.join(__dirname, '..', 'out');

console.log('🔍 기본 문법 검사 시작...');

// TypeScript 컴파일러로 문법 검사 실행
try {
  // noEmit 옵션으로 컴파일 없이 타입 체크만 수행
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript 검사 통과');
} catch (error) {
  console.error('❌ TypeScript 오류 발견:');
  console.error(error.stdout.toString());
  process.exit(1);
}

// 특정 패턴의 문법 오류 검사
function checkSyntaxPatterns() {
  const errors = [];
  
  // 검사할 파일 확장자
  const extensions = ['.ts', '.js'];
  
  // 검사할 패턴 목록 (정규식과 오류 메시지)
  const patterns = [
    { 
      regex: /(?<!async\s+)(?<!function\s*\*\s*)[^\*]function\s+\w+\s*\([^)]*\)[^{]*\{[^}]*\bawait\b/g,
      message: 'await는 async 함수 내에서만 사용할 수 있습니다.' 
    },
    /* 제거: 이 정규식이 클래스 메서드 내부의 await도 감지하는 문제가 있었음
    { 
      regex: /^\s*await\b/gm,
      message: '최상위 레벨 await는 모듈에서만 사용할 수 있습니다.' 
    },
    */
    {
      regex: /\bnew\s+Promise\s*\(\s*async\s*\(/g,
      message: 'Promise 생성자에 async 함수를 직접 전달하면 안됩니다.'
    }
  ];
  
  // 재귀적으로 디렉토리 검색하는 함수
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (extensions.includes(path.extname(filePath))) {
        // 파일 내용 읽기
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 각 패턴 검사
        for (const pattern of patterns) {
          const matches = content.match(pattern.regex);
          if (matches) {
            // 라인 번호 찾기
            matches.forEach(match => {
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(match.trim())) {
                  errors.push({
                    file: path.relative(process.cwd(), filePath),
                    line: i + 1,
                    message: pattern.message
                  });
                }
              }
            });
          }
        }
      }
    }
  }
  
  // 검사 시작
  try {
    scanDirectory(srcDir);
  } catch (error) {
    console.error('디렉토리 검색 중 오류:', error);
    process.exit(1);
  }
  
  return errors;
}

// 문법 패턴 검사 실행
const syntaxErrors = checkSyntaxPatterns();

if (syntaxErrors.length > 0) {
  console.error('❌ 문법 오류 발견:');
  syntaxErrors.forEach(err => {
    console.error(`   ${err.file}:${err.line} - ${err.message}`);
  });
  process.exit(1);
} else {
  console.log('✅ 추가 문법 패턴 검사 통과');
}

console.log('✅ 모든 검사 통과. 빌드를 진행합니다.');