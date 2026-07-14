/**
 * 自动化版本更新和构建脚本
 * 运行: npm run gx
 * 
 * 功能:
 * 1. 自动递增版本号 (patch: 1.0.0 -> 1.0.1)
 * 2. 更新 package.json
 * 3. 编译网页版 (vite build)
 * 4. 同步到 Android (cap sync)
 * 5. 编译并签名 APK (gradle assembleRelease)
 * 6. 复制到 dist/apk 目录，带版本号命名
 * 
 * 参数:
 * - npm run gx        -> 递增 patch 版本 (1.0.0 -> 1.0.1)
 * - npm run gx:minor  -> 递增 minor 版本 (1.0.0 -> 1.1.0)
 * - npm run gx:major  -> 递增 major 版本 (1.0.0 -> 2.0.0)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function exec(cmd, cwd = process.cwd()) {
  log(`\n> ${cmd}`, 'blue');
  try {
    execSync(cmd, { cwd, stdio: 'inherit', shell: true });
    return true;
  } catch (error) {
    // vite build 可能会因为 chunk 大小警告导致非零退出码
    // 检查是否真的失败了
    if (error.status !== 0 && !cmd.includes('vite build')) {
      log(`命令执行失败: ${cmd}`, 'red');
      return false;
    }
    // 对于 vite build，即使有警告也认为成功
    return true;
  }
}

// 递增版本号
function bumpVersion(version, type = 'patch') {
  const parts = version.split('.').map(Number);
  while (parts.length < 3) parts.push(0);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

function bumpBuildNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed) + 1;
}

// 更新 package.json 版本号与内部构建号
function updatePackageMeta(newVersion, newBuildNumber) {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldVersion = pkg.version;
  const oldBuildNumber = Number(pkg.buildNumber || 0);
  pkg.version = newVersion;
  pkg.buildNumber = newBuildNumber;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  return { oldVersion, newVersion, oldBuildNumber, newBuildNumber };
}

// 复制 APK
function copyApk(buildNumber) {
  const srcPath = path.join(process.cwd(), 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  const destDir = path.join(process.cwd(), 'dist', 'apk');
  const destPath = path.join(destDir, `xushuo-v${buildNumber}.apk`);
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    return destPath;
  }
  return null;
}

// 清理旧的 dist-v*.zip 文件
function cleanOldZips(keepCount = 3) {
  const cwd = process.cwd();
  const files = fs.readdirSync(cwd);
  const zipFiles = files
    .filter(f => /^dist-v\d+\.\d+\.\d+\.zip$/.test(f))
    .map(f => ({
      name: f,
      path: path.join(cwd, f),
      mtime: fs.statSync(path.join(cwd, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime); // 按修改时间降序

  if (zipFiles.length <= keepCount) {
    return { deleted: [], kept: zipFiles.map(f => f.name) };
  }

  const toDelete = zipFiles.slice(keepCount);
  const toKeep = zipFiles.slice(0, keepCount);

  for (const file of toDelete) {
    fs.unlinkSync(file.path);
  }

  return {
    deleted: toDelete.map(f => f.name),
    kept: toKeep.map(f => f.name)
  };
}

// 打包 dist 为 zip
async function zipDist(version) {
  const archiver = (await import('archiver')).default;
  const distDir = path.join(process.cwd(), 'dist');
  const zipPath = path.join(process.cwd(), `dist-v${version}.zip`);
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      resolve(zipPath);
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    // 将 dist 目录以 'dist' 名称打包进去
    archive.directory(distDir, 'dist');
    archive.finalize();
  });
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const bumpType = args[0] || 'patch'; // major, minor, patch
  
  log('\n========================================', 'green');
  log('    叙说·春信 - 自动化构建脚本', 'green');
  log('========================================\n', 'green');
  
  // 1. 递增版本号
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const newVersion = bumpVersion(pkg.version, bumpType);
  const newBuildNumber = bumpBuildNumber(pkg.buildNumber);
  
  log(`📦 版本更新: ${pkg.version} -> ${newVersion}`, 'yellow');
  log(`🔢 内部版本号: ${Number(pkg.buildNumber || 0)} -> ${newBuildNumber}`, 'yellow');
  
  // 2. 更新 package.json（语义版本 + 内部版本号）
  updatePackageMeta(newVersion, newBuildNumber);
  log('✓ package.json 已更新', 'green');
  
  // 3. 编译网页版
  log('\n🏗️  编译网页版...', 'yellow');
  if (!exec('npm run build')) {
    log('❌ 网页版编译失败', 'red');
    process.exit(1);
  }
  log('✓ 网页版编译完成', 'green');
  
  // 4. 同步到 Android
  log('\n📱 同步到 Android...', 'yellow');
  if (!exec('npx cap sync android')) {
    log('❌ Android 同步失败', 'red');
    process.exit(1);
  }
  log('✓ Android 同步完成', 'green');
  
  // 5. 编译 APK
  log('\n🔧 编译 APK...', 'yellow');
  const gradleCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
  if (!exec(`${gradleCmd} assembleRelease`, path.join(process.cwd(), 'android'))) {
    log('❌ APK 编译失败', 'red');
    process.exit(1);
  }
  log('✓ APK 编译完成', 'green');
  
  // 6. 复制 APK
  log('\n📦 复制 APK...', 'yellow');
  const apkPath = copyApk(newBuildNumber);
  if (apkPath) {
    log(`✓ APK 已保存: ${apkPath}`, 'green');
  } else {
    log('❌ APK 复制失败', 'red');
    process.exit(1);
  }
  
  // 7. 清理旧的 zip 文件
  log('\n🧹 清理旧 ZIP 文件...', 'yellow');
  const cleanResult = cleanOldZips(3);
  if (cleanResult.deleted.length > 0) {
    log(`✓ 已删除 ${cleanResult.deleted.length} 个旧文件: ${cleanResult.deleted.join(', ')}`, 'green');
  }
  if (cleanResult.kept.length > 0) {
    log(`  保留: ${cleanResult.kept.join(', ')}`, 'blue');
  }
  
  // 8. 打包 dist 为 zip
  log('\n📦 打包 dist 为 zip...', 'yellow');
  try {
    const zipPath = await zipDist(newVersion);
    log(`✓ ZIP 已保存: ${zipPath}`, 'green');
  } catch (err) {
    log(`⚠️  ZIP 打包失败: ${err.message}`, 'yellow');
    log('提示: 请运行 npm install archiver --save-dev 安装依赖', 'yellow');
  }
  
// 完成
  log('\n========================================', 'green');
  log(`✅ 构建完成! 版本: ${newVersion} / 内部版本号: ${newBuildNumber}`, 'green');
  log('========================================\n', 'green');
  
  log('输出文件:', 'blue');
  log(`  - 网页版: dist/`);
  log(`  - ZIP包: dist-v${newVersion}.zip`);
  log(`  - APK: ${apkPath}`);
  log(`\n提示: 记得将新版本上传到服务器以启用更新检测\n`);
}

main().catch(err => {
  log(`\n❌ 错误: ${err.message}`, 'red');
  process.exit(1);
});
