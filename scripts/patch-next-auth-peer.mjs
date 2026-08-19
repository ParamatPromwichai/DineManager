import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const peerRange = '^7.0.7 || ^8.0.5 || ^9.0.5';

async function patchJson(filePath, patch) {
  try {
    const json = JSON.parse(await readFile(filePath, 'utf8'));
    if (patch(json)) {
      await writeFile(filePath, `${JSON.stringify(json, null, 2)}\n`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

await patchJson(join(process.cwd(), 'node_modules', 'next-auth', 'package.json'), (json) => {
  if (!json.peerDependencies?.nodemailer || json.peerDependencies.nodemailer.includes('^9.0.5')) {
    return false;
  }

  json.peerDependencies.nodemailer = peerRange;
  return true;
});

await patchJson(join(process.cwd(), 'package-lock.json'), (json) => {
  const nextAuth = json.packages?.['node_modules/next-auth'];
  if (!nextAuth?.peerDependencies?.nodemailer || nextAuth.peerDependencies.nodemailer.includes('^9.0.5')) {
    return false;
  }

  nextAuth.peerDependencies.nodemailer = peerRange;
  return true;
});

await patchJson(join(process.cwd(), 'node_modules', '.package-lock.json'), (json) => {
  const nextAuth = json.packages?.['node_modules/next-auth'];
  if (!nextAuth?.peerDependencies?.nodemailer || nextAuth.peerDependencies.nodemailer.includes('^9.0.5')) {
    return false;
  }

  nextAuth.peerDependencies.nodemailer = peerRange;
  return true;
});
