import type {
  CreateSubmissionRequest,
  ProofPayload,
} from '@/lib/types/api.types';

export type ProofType = 'link' | 'file' | 'text';

export interface SubmissionFormData {
  questId: string;
  proofType: ProofType;
  link?: string;
  text?: string;
  file?: File | null;
  additionalNotes?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Inline base64 limit for small file proofs (matches createSubmission)
const MAX_INLINE_FILE_SIZE = 5 * 1024 * 1024;

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 5000;
const MAX_LINK_LENGTH = 2000;
const MAX_ADDITIONAL_NOTES_LENGTH = 1000;

const VALID_PROOF_TYPES: ProofType[] = ['link', 'file', 'text'];

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/json',
  'video/mp4',
  'video/webm',
];

const ALLOWED_FILE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
  '.json',
  '.mp4',
  '.webm',
];

// URL pattern for link validation
const URL_PATTERN = /^https?:\/\/.+\..+/i;

export function validateSubmissionForm(
  data: Partial<SubmissionFormData>
): ValidationResult {
  const errors: ValidationError[] = [];

  // Quest ID validation
  if (!data.questId || data.questId.trim().length === 0) {
    errors.push({ field: 'questId', message: 'Quest ID is required' });
  }

  // Proof type validation
  if (!data.proofType) {
    errors.push({ field: 'proofType', message: 'Please select a proof type' });
  } else if (!['link', 'file', 'text'].includes(data.proofType)) {
    errors.push({ field: 'proofType', message: 'Invalid proof type selected' });
  }

  // Validate based on proof type
  if (data.proofType === 'link') {
    if (!data.link || data.link.trim().length === 0) {
      errors.push({ field: 'link', message: 'Link is required' });
    } else if (!URL_PATTERN.test(data.link.trim())) {
      errors.push({
        field: 'link',
        message: 'Please enter a valid URL (starting with http:// or https://)',
      });
    } else if (data.link.length > MAX_LINK_LENGTH) {
      errors.push({
        field: 'link',
        message: `Link is too long (max ${MAX_LINK_LENGTH} characters)`,
      });
    }
  }

  if (data.proofType === 'text') {
    if (!data.text || data.text.trim().length === 0) {
      errors.push({ field: 'text', message: 'Proof text is required' });
    } else if (data.text.trim().length < MIN_TEXT_LENGTH) {
      errors.push({
        field: 'text',
        message: `Proof text must be at least ${MIN_TEXT_LENGTH} characters`,
      });
    } else if (data.text.length > MAX_TEXT_LENGTH) {
      errors.push({
        field: 'text',
        message: `Proof text is too long (max ${MAX_TEXT_LENGTH} characters)`,
      });
    }
  }

  if (data.proofType === 'file') {
    if (!data.file) {
      errors.push({ field: 'file', message: 'Please upload a file' });
    } else {
      const fileErrors = validateFile(data.file);
      errors.push(...fileErrors);
    }
  }

  // Additional notes validation (optional field)
  if (
    data.additionalNotes &&
    data.additionalNotes.length > MAX_ADDITIONAL_NOTES_LENGTH
  ) {
    errors.push({
      field: 'additionalNotes',
      message: `Additional notes are too long (max ${MAX_ADDITIONAL_NOTES_LENGTH} characters)`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateFile(file: File): ValidationError[] {
  const errors: ValidationError[] = [];

  // File size validation
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    errors.push({
      field: 'file',
      message: `File is too large (${sizeMB}MB). Maximum size is 10MB`,
    });
  }

  // File type validation
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isValidType =
    ALLOWED_FILE_TYPES.includes(file.type) ||
    ALLOWED_FILE_EXTENSIONS.includes(fileExtension);

  if (!isValidType) {
    errors.push({
      field: 'file',
      message: `File type not allowed. Supported types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`,
    });
  }

  return errors;
}

export function validateLink(url: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!url || url.trim().length === 0) {
    errors.push({ field: 'link', message: 'Link is required' });
  } else if (!URL_PATTERN.test(url.trim())) {
    errors.push({ field: 'link', message: 'Please enter a valid URL' });
  } else if (url.length > MAX_LINK_LENGTH) {
    errors.push({
      field: 'link',
      message: `Link is too long (max ${MAX_LINK_LENGTH} characters)`,
    });
  }

  return errors;
}

function isAllowedFileType(fileName: string, fileType?: string): boolean {
  const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
  return (
    (!!fileType && ALLOWED_FILE_TYPES.includes(fileType)) ||
    ALLOWED_FILE_EXTENSIONS.includes(fileExtension)
  );
}

function validateFileProofMetadata(
  fileName: string | undefined,
  fileSize: number | undefined,
  fileType: string | undefined
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!fileName || fileName.trim().length === 0) {
    errors.push({
      field: 'proof.fileName',
      message: 'File name is required for file proof',
    });
  }

  if (fileSize == null || Number.isNaN(fileSize)) {
    errors.push({
      field: 'proof.fileSize',
      message: 'File size is required for file proof',
    });
  } else if (fileSize <= 0) {
    errors.push({
      field: 'proof.fileSize',
      message: 'File size must be greater than zero',
    });
  } else if (fileSize > MAX_FILE_SIZE) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    errors.push({
      field: 'proof.fileSize',
      message: `File is too large (${sizeMB}MB). Maximum size is 10MB`,
    });
  }

  if (!fileType || fileType.trim().length === 0) {
    if (!fileName || !isAllowedFileType(fileName)) {
      errors.push({
        field: 'proof.fileType',
        message: 'File type is required for file proof',
      });
    }
  } else if (fileName && !isAllowedFileType(fileName, fileType)) {
    errors.push({
      field: 'proof.fileType',
      message: `File type not allowed. Supported types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`,
    });
  }

  return errors;
}

/**
 * Validates a proof payload before it is sent to the API.
 */
export function validateProofPayload(proof: ProofPayload): ValidationResult {
  const errors: ValidationError[] = [];

  if (!proof?.type) {
    errors.push({ field: 'proof.type', message: 'Proof type is required' });
    return { isValid: false, errors };
  }

  if (!VALID_PROOF_TYPES.includes(proof.type)) {
    errors.push({ field: 'proof.type', message: 'Invalid proof type' });
    return { isValid: false, errors };
  }

  if (proof.type === 'link') {
    errors.push(...validateLink(proof.link ?? '').map((error) => ({
      ...error,
      field: 'proof.link',
    })));
  }

  if (proof.type === 'text') {
    const text = proof.text ?? '';
    if (text.trim().length === 0) {
      errors.push({ field: 'proof.text', message: 'Proof text is required' });
    } else if (text.trim().length < MIN_TEXT_LENGTH) {
      errors.push({
        field: 'proof.text',
        message: `Proof text must be at least ${MIN_TEXT_LENGTH} characters`,
      });
    } else if (text.length > MAX_TEXT_LENGTH) {
      errors.push({
        field: 'proof.text',
        message: `Proof text is too long (max ${MAX_TEXT_LENGTH} characters)`,
      });
    }
  }

  if (proof.type === 'file') {
    errors.push(
      ...validateFileProofMetadata(proof.fileName, proof.fileSize, proof.fileType)
    );

    const hasInlineContent =
      typeof proof.fileContent === 'string' && proof.fileContent.length > 0;
    const hasUploadedLink =
      typeof proof.link === 'string' && proof.link.trim().length > 0;

    if (!hasInlineContent && !hasUploadedLink) {
      errors.push({
        field: 'proof',
        message:
          'File proof must include inline content or an uploaded file URL',
      });
    }

    if (hasInlineContent && proof.fileSize != null && proof.fileSize > MAX_INLINE_FILE_SIZE) {
      errors.push({
        field: 'proof.fileContent',
        message: 'Inline file content is only allowed for files up to 5MB',
      });
    }

    if (hasUploadedLink) {
      errors.push(
        ...validateLink(proof.link!).map((error) => ({
          ...error,
          field: 'proof.link',
        }))
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a create-submission request payload before it is sent to the API.
 */
export function validateCreateSubmissionRequest(
  payload: CreateSubmissionRequest
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!payload?.questId || payload.questId.trim().length === 0) {
    errors.push({ field: 'questId', message: 'Quest ID is required' });
  }

  if (!payload?.proof) {
    errors.push({ field: 'proof', message: 'Proof payload is required' });
  } else {
    const proofResult = validateProofPayload(payload.proof);
    errors.push(...proofResult.errors);
  }

  if (
    payload.additionalNotes &&
    payload.additionalNotes.length > MAX_ADDITIONAL_NOTES_LENGTH
  ) {
    errors.push({
      field: 'additionalNotes',
      message: `Additional notes are too long (max ${MAX_ADDITIONAL_NOTES_LENGTH} characters)`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Throws when a create-submission payload fails schema validation.
 */
export function assertValidCreateSubmissionRequest(
  payload: CreateSubmissionRequest
): void {
  const result = validateCreateSubmissionRequest(payload);
  if (!result.isValid) {
    throw new Error(
      result.errors[0]?.message ?? 'Invalid submission payload'
    );
  }
}

export function getFieldError(
  errors: ValidationError[],
  field: string
): string | undefined {
  const error = errors.find((e) => e.field === field);
  return error?.message;
}

export function sanitizeSubmissionData(
  data: SubmissionFormData
): SubmissionFormData {
  return {
    ...data,
    link: data.link?.trim(),
    text: data.text?.trim(),
    additionalNotes: data.additionalNotes?.trim(),
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

export {
  MAX_FILE_SIZE,
  MAX_INLINE_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  ALLOWED_FILE_EXTENSIONS,
};
