import { describe, expect, it } from 'vitest';
import { sanitizeUploadFileName, validateImageDataUrl, validateImageFile } from '@/lib/upload-security';

describe('upload security validation', () => {
  it('accepts small jpeg/png/webp data URLs', () => {
    const tinyPng = 'data:image/png;base64,iVBORw0KGgo=';

    expect(validateImageDataUrl(tinyPng, true)).toBeNull();
  });

  it('rejects non-image slip payloads', () => {
    expect(validateImageDataUrl('data:text/html;base64,PHNjcmlwdD4=', true)).toBe('Invalid image format');
    expect(validateImageDataUrl('https://example.com/slip.png', true)).toBe('Invalid image format');
  });

  it('rejects oversized data URLs before database writes', () => {
    const oversized = `data:image/png;base64,${'A'.repeat(7_000_000)}`;

    expect(validateImageDataUrl(oversized, true)).toBe('Image too large');
  });

  it('requires MIME type and extension to agree for uploaded files', () => {
    const file = new File(['hello'], 'shell.php', { type: 'image/png' });

    expect(validateImageFile(file)).toBe('Invalid file type');
  });

  it('rejects path traversal file names', () => {
    const file = new File(['hello'], '../menu.png', { type: 'image/png' });

    expect(validateImageFile(file)).toBe('Invalid file name');
  });

  it('sanitizes blob object names', () => {
    expect(sanitizeUploadFileName('../bad name.png')).toBe('bad_name.png');
  });
});
