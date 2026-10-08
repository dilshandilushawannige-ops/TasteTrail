const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');

function load(file, modules, globals = {}) {
  const code = transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, babelrc: false, configFile: false,
    presets: ['@babel/preset-typescript'],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const output = {};
  vm.runInNewContext(code, {
    exports: output,
    require(name) { assert.ok(name in modules, `Unexpected import: ${name}`); return modules[name]; },
    Blob, TextEncoder, Uint8Array, ...globals,
  });
  return output;
}

// Exercise the installed Expo converter that throws the screenshot's exact error.
const { convertFormDataAsync } = load('node_modules/expo/src/winter/fetch/convertFormData.ts', {
  '../../utils/blobUtils': { blobToArrayBufferAsync: blob => blob.arrayBuffer() },
});
class NativeFormData {
  parts = [];
  append(name, value) { this.parts.push([name, value]); }
  entries() { return this.parts; }
}
class NativeFile {
  constructor(uri) {
    this.uri = uri;
    this.name = uri.split('/').pop();
    this.type = uri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
  }
  async bytes() { return new TextEncoder().encode('review-file-content'); }
}

async function main() {
  const brokenForm = new NativeFormData();
  brokenForm.append('file', { uri: 'file:///photo.jpg', type: 'image/jpeg', name: 'photo.jpg' });
  await assert.rejects(convertFormDataAsync(brokenForm), /Unsupported FormDataPart implementation/);

  for (const platform of ['android', 'ios', 'web']) {
    let request;
    let uploadError = false;
    const fetch = async (url, options) => {
      request = { url, options };
      const { body } = await convertFormDataAsync(options.body, 'review-test-boundary');
      const encoded = new TextDecoder().decode(body);
      assert.match(encoded, /review-file-content/);
      assert.match(encoded, /name="upload_preset"/);
      assert.match(encoded, /review-test-preset/);
      assert.match(encoded, /name="folder"/);
      assert.match(encoded, /reviews/);
      return {
        ok: !uploadError,
        json: async () => uploadError ? { error: { message: 'Upload rejected' } } : {
          secure_url: 'https://res.cloudinary.com/test/upload/review-file',
        },
      };
    };
    const { uploadReviewMedia } = load('src/services/reviewMediaService.ts', {
      'react-native': { Platform: { OS: platform } },
      'expo-file-system': { File: NativeFile },
      'expo/fetch': { fetch },
      '@/config/cloudinary': { CLOUDINARY_CONFIG: { cloudName: 'test', uploadPreset: 'review-test-preset' } },
    }, { FormData: platform === 'web' ? FormData : NativeFormData });

    for (const type of ['image', 'video']) {
      const asset = {
        uri: `file:///review.${type === 'video' ? 'mp4' : 'jpg'}`,
        type, fileName: `review.${type === 'video' ? 'mp4' : 'jpg'}`,
        ...(platform === 'web' ? { file: new Blob(['review-file-content'], { type: type === 'video' ? 'video/mp4' : 'image/jpeg' }) } : {}),
      };
      const uploaded = await uploadReviewMedia(asset);
      assert.equal(uploaded.type, type);
      assert.match(uploaded.url, /^https:/);
      assert.equal(request.url, 'https://api.cloudinary.com/v1_1/test/auto/upload');
      if (platform !== 'web') assert.ok(request.options.body.parts[0][1] instanceof NativeFile);
    }
    uploadError = true;
    await assert.rejects(uploadReviewMedia({ uri: 'file:///review.jpg', type: 'image',
      ...(platform === 'web' ? { file: new Blob(['review-file-content']) } : {}),
    }), /Upload rejected/);
    console.log(`PASS: ${platform} photo/video multipart encoding and upload failure handling`);
  }
  console.log('PASS: reproduced old FormDataPart error; corrected uploads pass the actual Expo converter');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
