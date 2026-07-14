import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function toSafeInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function normalizeVersion(version) {
  return String(version || '').trim().replace(/\+.*$/, '');
}

function bumpPatchVersion(version) {
  return bumpPatchVersionBy(version, 1);
}

function bumpPatchVersionBy(version, amount) {
  const parts = normalizeVersion(version).split('.').map((item) => Number(item) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += Math.max(0, Math.floor(Number(amount) || 0));
  return parts.slice(0, 3).join('.');
}

function compareVersion(left, right) {
  const a = normalizeVersion(left).split('.').map((item) => Number(item) || 0);
  const b = normalizeVersion(right).split('.').map((item) => Number(item) || 0);
  const length = Math.max(a.length, b.length, 3);
  for (let index = 0; index < length; index += 1) {
    const av = a[index] || 0;
    const bv = b[index] || 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

async function readLatestMetadata(metadataUrl, fetchImpl) {
  if (!metadataUrl || typeof fetchImpl !== 'function') return null;
  try {
    const response = await fetchImpl(metadataUrl, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function readLatestMetadataFromFile(metadataPath) {
  const normalizedPath = String(metadataPath || '').trim();
  if (!normalizedPath) return null;
  try {
    if (!fs.existsSync(normalizedPath)) return null;
    return JSON.parse(fs.readFileSync(normalizedPath, 'utf8'));
  } catch {
    return null;
  }
}

function createBuildSequenceMetadata(env, packageVersion, packageBuildNumber) {
  const buildSequence = toSafeInt(env.APK_BUILD_SEQUENCE || env.GITHUB_RUN_NUMBER, 0);
  if (buildSequence <= 0) return null;
  const baseOffset = Math.max(0, buildSequence - 1);
  return {
    version: bumpPatchVersionBy(packageVersion, baseOffset),
    versionCode: packageBuildNumber + baseOffset,
    source: 'build-sequence'
  };
}

function pickLatestMetadata(items) {
  return items
    .filter(Boolean)
    .map((item) => ({
      ...item,
      version: normalizeVersion(item.version || ''),
      versionCode: toSafeInt(item.versionCode, 0)
    }))
    .filter((item) => item.version || item.versionCode > 0)
    .sort((left, right) => {
      if (left.versionCode !== right.versionCode) return right.versionCode - left.versionCode;
      return compareVersion(right.version, left.version);
    })[0] || null;
}

export async function resolveApkReleaseMeta({
  packageJsonPath = path.join(repoRoot, 'package.json'),
  env = process.env,
  fetchImpl = globalThis.fetch
} = {}) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const packageVersion = normalizeVersion(pkg.version || '1.0.0');
  const packageBuildNumber = toSafeInt(pkg.buildNumber, 1) || 1;

  const latestMetadataFromFile = readLatestMetadataFromFile(env.APK_PREVIOUS_METADATA_PATH);
  const metadataUrl = String(env.APK_PREVIOUS_METADATA_URL || '').trim()
    || (String(env.R2_PUBLIC_BASE_URL || '').trim() ? `${String(env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '')}/apk/latest.json` : '');
  const latestMetadataFromUrl = await readLatestMetadata(metadataUrl, fetchImpl);
  const buildSequenceMetadata = createBuildSequenceMetadata(env, packageVersion, packageBuildNumber);
  const latestMetadata = pickLatestMetadata([latestMetadataFromFile, latestMetadataFromUrl, buildSequenceMetadata]);
  const latestVersion = normalizeVersion(latestMetadata?.version || '');
  const latestBuildNumber = toSafeInt(latestMetadata?.versionCode, 0);

  const preferLatestMetadata = latestBuildNumber > packageBuildNumber
    || (latestBuildNumber === packageBuildNumber && compareVersion(latestVersion, packageVersion) > 0);

  const baseVersion = preferLatestMetadata && latestVersion ? latestVersion : packageVersion;
  const baseBuildNumber = preferLatestMetadata && latestBuildNumber > 0 ? latestBuildNumber : packageBuildNumber;

  const versionName = bumpPatchVersion(baseVersion);
  const buildNumber = baseBuildNumber + 1;

  return {
    baseVersion,
    baseBuildNumber,
    versionName,
    buildNumber,
    apkName: `xushuo-v${buildNumber}.apk`,
    metadataSource: latestMetadata?.source || '',
    metadataUrl,
    metadataPath: String(env.APK_PREVIOUS_METADATA_PATH || '').trim()
  };
}

if (process.argv[1] === __filename) {
  const meta = await resolveApkReleaseMeta();
  process.stdout.write(JSON.stringify(meta, null, 2));
}
