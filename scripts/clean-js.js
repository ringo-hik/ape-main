/**
 * clean-js.js
 * 
 * 이 스크립트는 src 디렉토리에서 TypeScript 컴파일 과정에서 생성된 JavaScript 파일을 모두 제거합니다.
 * TypeScript 파일은 out 디렉토리로만 컴파일되어야 하지만, 가끔 소스 디렉토리에도 생성되는 문제가 있습니다.
 */

const fs = require('fs');
const path = require('path');

// src 디렉토리 경로
const srcDir = path.join(__dirname, '..', 'src');

// JavaScript 파일 제거 함수 (재귀)
function removeJsFiles(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // 디렉토리인 경우 재귀 호출
      removeJsFiles(filePath);
    } else if (stats.isFile() && file.endsWith('.js')) {
      // JavaScript 파일인 경우 삭제
      fs.unlinkSync(filePath);
      console.log(`Removed: ${filePath}`);
    }
  });
}

// 삭제 시작
console.log('Removing JavaScript files from src directory...');
removeJsFiles(srcDir);
console.log('Done!');