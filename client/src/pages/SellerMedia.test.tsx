import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SELLER_MEDIA_MAX_BYTES,
  SELLER_MEDIA_MAX_FILES,
  SellerUploadProgress,
  sellerUploadProgressLabel,
  validateSellerMediaFiles,
} from './Home';

describe('seller media flow', () => {
  it('accepts supported image and video files within the mobile limits', () => {
    expect(validateSellerMediaFiles([
      { type: 'image/jpeg', size: 1024 },
      { type: 'video/mp4', size: SELLER_MEDIA_MAX_BYTES },
    ])).toBeNull();
  });

  it('rejects unsupported types, oversized files, and too many selections', () => {
    expect(validateSellerMediaFiles([{ type: 'application/pdf', size: 1024 }])).toContain('Faqat');
    expect(validateSellerMediaFiles([{ type: 'image/png', size: SELLER_MEDIA_MAX_BYTES + 1 }])).toContain('200 MB');
    expect(validateSellerMediaFiles(Array.from({ length: SELLER_MEDIA_MAX_FILES + 1 }, () => ({ type: 'image/png', size: 1024 })))).toContain(`${SELLER_MEDIA_MAX_FILES} ta`);
  });

  it('renders an accessible per-file upload progress state', () => {
    render(<SellerUploadProgress completed={1} total={3} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Media yuklanmoqda: 1/3');
    expect(status.textContent).toContain('33%');
    expect(sellerUploadProgressLabel(3, 3)).toBe('Media yuklanmoqda: 3/3');
  });
});
