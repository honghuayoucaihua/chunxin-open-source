import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [, , manifestPathArg, modeArg = 'production'] = process.argv;

if (!manifestPathArg) {
  console.error('Usage: node scripts/upload-cloudflare-r2-manifest.mjs <manifest.tsv> [production|preview]');
  process.exit(1);
}

const manifestPath = path.resolve(manifestPathArg);
const preview = modeArg === 'preview';

const getBucketNames = async () => {
  const wranglerPath = path.resolve(process.cwd(), 'wrangler.toml');
  const content = await fs.readFile(wranglerPath, 'utf8');
  const blockMatch = content.match(/\[\[r2_buckets\]\][\s\S]*?binding\s*=\s*"COMMUNITY_BUCKET"[\s\S]*?(?=\n\[\[|$)/u);
  if (!blockMatch) {
    throw new Error('Could not find [[r2_buckets]] binding COMMUNITY_BUCKET in wrangler.toml');
  }
  const bucketName = blockMatch[0].match(/bucket_name\s*=\s*"([^"]+)"/u)?.[1];
  const previewBucketName = blockMatch[0].match(/preview_bucket_name\s*=\s*"([^"]+)"/u)?.[1];
  if (!bucketName) {
    throw new Error('Missing bucket_name for COMMUNITY_BUCKET in wrangler.toml');
  }
  return {
    bucketName,
    previewBucketName: previewBucketName || bucketName
  };
};

const parseManifest = (content) => content
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [sourcePath, objectKey] = line.split('\t');
    return {
      sourcePath: String(sourcePath || '').trim(),
      objectKey: String(objectKey || '').trim()
    };
  })
  .filter((item) => item.sourcePath && item.objectKey);

const main = async () => {
  const manifest = await fs.readFile(manifestPath, 'utf8');
  const entries = parseManifest(manifest);
  const { bucketName, previewBucketName } = await getBucketNames();
  const targetBucket = preview ? previewBucketName : bucketName;

  console.log(`Uploading ${entries.length} R2 objects to ${preview ? 'preview' : 'production'} bucket (${targetBucket})...`);

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const args = ['wrangler', 'r2', 'object', 'put', `${targetBucket}/${entry.objectKey}`, '--file', entry.sourcePath, '--remote'];

    console.log(`Uploading ${i + 1}/${entries.length}: ${entry.objectKey}`);
    const result = spawnSync('npx', args, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env
    });

    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
