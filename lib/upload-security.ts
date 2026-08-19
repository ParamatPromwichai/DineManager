const IMAGE_TYPES = new Map([
  ['image/jpeg', ['jpg', 'jpeg']],
  ['image/png', ['png']],
  ['image/webp', ['webp']],
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DATA_URL_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 128;

export function sanitizeUploadFileName(fileName: string, fallbackExtension = 'bin') {
  const baseName = fileName
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 120);

  return baseName || `upload.${fallbackExtension}`;
}

export function validateImageFile(file: File) {
  const allowedExtensions = IMAGE_TYPES.get(file.type);
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (!allowedExtensions || !allowedExtensions.includes(extension)) {
    return 'Invalid file type';
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return 'File too large';
  }
  if (/[\\/]/.test(file.name) || file.name.includes('..')) {
    return 'Invalid file name';
  }
  return null;
}

export function validateImageDataUrl(value: unknown, required = false) {
  if (value === null || value === undefined || value === '') {
    return required ? 'Image is required' : null;
  }
  if (typeof value !== 'string') {
    return 'Invalid image';
  }
  if (value.length > MAX_DATA_URL_CHARS) {
    return 'Image too large';
  }

  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) {
    return 'Invalid image format';
  }

  const base64 = match[2];
  const estimatedBytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  if (estimatedBytes <= 0 || estimatedBytes > MAX_IMAGE_BYTES) {
    return 'Image too large';
  }

  return null;
}
