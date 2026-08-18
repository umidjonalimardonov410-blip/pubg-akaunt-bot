import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  authenticated: true,
  upload: vi.fn(),
  presign: undefined as undefined | ((input: unknown) => Promise<{ uploadUrl: string; url: string }>),
  create: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: state.authenticated, user: { id: 1, name: 'Test Seller' } }),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    media: { upload: { useMutation: () => ({ mutateAsync: state.upload, isPending: false }) }, presignUpload: { useMutation: () => ({ mutateAsync: state.presign ?? (async () => ({ uploadUrl: 'https://upload.test/put', url: 'https://cdn.test/file.mp4' })), isPending: false }) } },
    accounts: { create: { useMutation: () => ({ mutateAsync: state.create, isPending: false }) } },
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

import { SellPage } from './Home';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe('SellPage upload and submit flow', () => {
  beforeEach(() => {
    state.authenticated = true;
    state.upload.mockReset();
    state.create.mockReset();
    state.create.mockResolvedValue({ id: 901 });
  });

  afterEach(() => cleanup());

  it('shows an inline warning and blocks unsupported seller media', () => {
    const { container } = render(<SellPage onNavigate={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput!, {
      target: { files: [new File(['bad'], 'notes.txt', { type: 'text/plain' })] },
    });

    expect(screen.getByRole('alert').textContent).toContain('Faqat JPG, PNG, WEBP, MP4, MOV yoki W');
    expect(state.upload).not.toHaveBeenCalled();
  });

  it('renders a mobile thumbnail for images and a video preview for video media', async () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:match-video'),
      revokeObjectURL: vi.fn(),
    });
    const { container } = render(<SellPage onNavigate={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput!, {
      target: { files: [
        new File(['image-bytes'], 'screenshot.png', { type: 'image/png' }),
        new File(['video-bytes'], 'match.mp4', { type: 'video/mp4' }),
      ] },
    });

    expect(await screen.findByAltText('screenshot.png')).toBeTruthy();
    expect(await screen.findByLabelText('match.mp4')).toBeTruthy();
    expect(screen.getAllByText('Rasm').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Video').length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });

  it('selects media, shows pending upload progress, and submits the listing after upload completes', async () => {
    const uploadRequest = deferred<{ url: string }>();
    state.upload.mockReturnValue(uploadRequest.promise);
    const { container } = render(<SellPage onNavigate={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    fireEvent.change(fileInput!, {
      target: { files: [new File(['proof'], 'proof.jpg', { type: 'image/jpeg' })] },
    });
    expect(screen.getByText('proof.jpg')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('PUBG ID'), { target: { value: 'PUBG-901' } });
    fireEvent.change(screen.getByPlaceholderText("O'yinchi nomi"), { target: { value: 'Inferno Seller' } });
    fireEvent.change(screen.getByPlaceholderText('75'), { target: { value: '75' } });
    fireEvent.change(screen.getByPlaceholderText('1000000'), { target: { value: '1200000' } });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => expect(state.upload).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status').textContent).toContain('Media yuklanmoqda: 0/1');
    expect(screen.getByRole('status').textContent).toContain('0%');
    expect(screen.getByRole('button', { name: 'Media yuklanmoqda...' }).hasAttribute('disabled')).toBe(true);

    uploadRequest.resolve({ url: 'https://storage.example/proof.jpg' });
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'PUBG-901',
      playerName: 'Inferno Seller',
      price: 1200000,
      thumbnailUrl: 'https://storage.example/proof.jpg',
      galleryUrls: ['https://storage.example/proof.jpg'],
    }));
    await waitFor(() => expect(screen.getByText("E'lon bozorga joylandi")).toBeTruthy());
  });
});
