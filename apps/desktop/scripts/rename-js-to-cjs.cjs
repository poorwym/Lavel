const fs = require('fs');
const path = require('path');

function fixRequirePaths(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 修复 require 路径，将 .js 文件的引用改为 .cjs
  const fixedContent = content.replace(
    /require\(['"]\.\/([^'"]*?)(?:\.js)?['"]\)/g,
    (match, modulePath) => {
      // 检查是否存在对应的 .cjs 文件
      const cjsPath = path.join(path.dirname(filePath), modulePath + '.cjs');
      if (fs.existsSync(cjsPath)) {
        return `require('./${modulePath}.cjs')`;
      }
      return match;
    }
  );
  
  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent);
    console.log(`修复导入路径: ${path.basename(filePath)}`);
  }
}

function renameJsToCjs(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 递归处理子目录
      renameJsToCjs(fullPath);
    } else if (file.endsWith('.js')) {
      // 重命名 .js 文件为 .cjs
      const newPath = fullPath.replace(/\.js$/, '.cjs');
      fs.renameSync(fullPath, newPath);
      console.log(`重命名: ${file} -> ${path.basename(newPath)}`);
    }
  }
}

function fixAllRequirePaths(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 递归处理子目录
      fixAllRequirePaths(fullPath);
    } else if (file.endsWith('.cjs')) {
      // 修复 .cjs 文件中的 require 路径
      fixRequirePaths(fullPath);
    }
  }
}

// 从 out 目录开始
const outDir = path.join(__dirname, '../out');
if (fs.existsSync(outDir)) {
  console.log('开始重命名 .js 文件为 .cjs...');
  renameJsToCjs(outDir);
  console.log('重命名完成!');
  
  console.log('开始修复 require 路径...');
  fixAllRequirePaths(outDir);
  console.log('修复完成!');
} else {
  console.log('out 目录不存在，跳过重命名');
} 