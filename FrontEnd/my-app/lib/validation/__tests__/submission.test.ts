/**
 * Unit tests for submission proof schema validation (FE-057).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  validateProofPayload,
  validateCreateSubmissionRequest,
  assertValidCreateSubmissionRequest,
  MAX_FILE_SIZE,
  MAX_INLINE_FILE_SIZE,
} from '../submission';
import type { CreateSubmissionRequest, ProofPayload } from '@/lib/types/api.types';

const VALID_LINK = 'https://example.com/proof.png';
const VALID_TEXT = 'This is valid proof text for the quest submission.';

function validLinkProof(): ProofPayload {
  return { type: 'link', link: VALID_LINK };
}

function validTextProof(): ProofPayload {
  return { type: 'text', text: VALID_TEXT };
}

function validInlineFileProof(): ProofPayload {
  return {
    type: 'file',
    fileName: 'proof.png',
    fileSize: 1024,
    fileType: 'image/png',
    fileContent: 'aGVsbG8=',
  };
}

function validUploadedFileProof(): ProofPayload {
  return {
    type: 'file',
    fileName: 'proof.mp4',
    fileSize: 6 * 1024 * 1024,
    fileType: 'video/mp4',
    link: 'https://cdn.example.com/uploads/proof.mp4',
  };
}

describe('validateProofPayload', () => {
  test('accepts a valid link proof', () => {
    const result = validateProofPayload(validLinkProof());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('accepts a valid text proof', () => {
    const result = validateProofPayload(validTextProof());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('accepts a valid inline file proof', () => {
    const result = validateProofPayload(validInlineFileProof());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('accepts a valid uploaded file proof with URL', () => {
    const result = validateProofPayload(validUploadedFileProof());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('accepts file proof with empty MIME when extension is allowed', () => {
    const result = validateProofPayload({
      type: 'file',
      fileName: 'proof.png',
      fileSize: 1024,
      fileType: '',
      fileContent: 'aGVsbG8=',
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects missing proof type', () => {
    const result = validateProofPayload({} as ProofPayload);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('proof.type');
  });

  test('rejects invalid proof type', () => {
    const result = validateProofPayload({
      type: 'audio' as ProofPayload['type'],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('proof.type');
  });

  test('rejects link proof without URL', () => {
    const result = validateProofPayload({ type: 'link' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.field === 'proof.link')).toBe(
      true
    );
  });

  test('rejects invalid link URL', () => {
    const result = validateProofPayload({
      type: 'link',
      link: 'not-a-url',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.field === 'proof.link')).toBe(
      true
    );
  });

  test('rejects text proof that is too short', () => {
    const result = validateProofPayload({ type: 'text', text: 'too short' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.field === 'proof.text')).toBe(
      true
    );
  });

  test('rejects text proof that is too long', () => {
    const result = validateProofPayload({
      type: 'text',
      text: 'x'.repeat(5001),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.field === 'proof.text')).toBe(
      true
    );
  });

  test('rejects file proof without content or uploaded URL', () => {
    const result = validateProofPayload({
      type: 'file',
      fileName: 'proof.png',
      fileSize: 1024,
      fileType: 'image/png',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.field === 'proof')).toBe(true);
  });

  test('rejects file proof that exceeds max size', () => {
    const result = validateProofPayload({
      type: 'file',
      fileName: 'proof.png',
      fileSize: MAX_FILE_SIZE + 1,
      fileType: 'image/png',
      fileContent: 'aGVsbG8=',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.field === 'proof.fileSize')).toBe(
      true
    );
  });

  test('rejects disallowed file type', () => {
    const result = validateProofPayload({
      type: 'file',
      fileName: 'proof.exe',
      fileSize: 1024,
      fileType: 'application/x-msdownload',
      fileContent: 'aGVsbG8=',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.field === 'proof.fileType')).toBe(
      true
    );
  });

  test('rejects inline file content above inline size limit', () => {
    const result = validateProofPayload({
      type: 'file',
      fileName: 'proof.png',
      fileSize: MAX_INLINE_FILE_SIZE + 1,
      fileType: 'image/png',
      fileContent: 'aGVsbG8=',
    });
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) => error.field === 'proof.fileContent')
    ).toBe(true);
  });
});

describe('validateCreateSubmissionRequest', () => {
  test('accepts a valid create submission request', () => {
    const payload: CreateSubmissionRequest = {
      questId: 'quest-123',
      proof: validLinkProof(),
      additionalNotes: 'Submitted after review',
    };

    const result = validateCreateSubmissionRequest(payload);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects missing quest ID', () => {
    const result = validateCreateSubmissionRequest({
      questId: '   ',
      proof: validLinkProof(),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.field === 'questId')).toBe(true);
  });

  test('rejects missing proof payload', () => {
    const result = validateCreateSubmissionRequest({
      questId: 'quest-123',
    } as CreateSubmissionRequest);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.field === 'proof')).toBe(true);
  });

  test('rejects additional notes that are too long', () => {
    const result = validateCreateSubmissionRequest({
      questId: 'quest-123',
      proof: validTextProof(),
      additionalNotes: 'x'.repeat(1001),
    });
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) => error.field === 'additionalNotes')
    ).toBe(true);
  });
});

describe('assertValidCreateSubmissionRequest', () => {
  test('does not throw for valid payload', () => {
    expect(() =>
      assertValidCreateSubmissionRequest({
        questId: 'quest-123',
        proof: validTextProof(),
      })
    ).not.toThrow();
  });

  test('throws with first validation error message', () => {
    expect(() =>
      assertValidCreateSubmissionRequest({
        questId: '',
        proof: validLinkProof(),
      })
    ).toThrow('Quest ID is required');
  });
});

describe('createSubmission API guard', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('throws before network request when payload is invalid', async () => {
    vi.doMock('@/lib/api/client', () => ({
      post: vi.fn(),
      get: vi.fn(),
      withRetry: (fn: () => Promise<unknown>) => fn(),
      apiClient: {},
      createCancelToken: vi.fn(),
      tokenManager: { getAccessToken: vi.fn() },
    }));

    const { post } = await import('@/lib/api/client');
    const { createSubmission } = await import('@/lib/api/submissions');

    await expect(
      createSubmission({
        questId: 'quest-123',
        proofType: 'link',
        proof: { type: 'link' },
      })
    ).rejects.toThrow('Link is required');

    expect(post).not.toHaveBeenCalled();
  });

  test('calls post when payload passes schema validation', async () => {
    const mockPost = vi.fn().mockResolvedValue({ id: 'sub-1' });
    vi.doMock('@/lib/api/client', () => ({
      post: mockPost,
      get: vi.fn(),
      withRetry: (fn: () => Promise<unknown>) => fn(),
      apiClient: {},
      createCancelToken: vi.fn(),
      tokenManager: { getAccessToken: vi.fn() },
    }));

    const { createSubmission } = await import('@/lib/api/submissions');

    await createSubmission({
      questId: 'quest-123',
      proofType: 'text',
      proof: {
        type: 'text',
        text: VALID_TEXT,
      },
    });

    expect(mockPost).toHaveBeenCalledOnce();
    expect(mockPost).toHaveBeenCalledWith('/quests/quest-123/submissions', {
      questId: 'quest-123',
      proof: { type: 'text', text: VALID_TEXT },
      additionalNotes: undefined,
    });
  });
});
