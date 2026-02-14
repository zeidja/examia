import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extract plain text from a file buffer.
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - MIME type (e.g. application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 * @param {string} [originalname] - Original filename (fallback for extension)
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromBuffer(buffer, mimetype, originalname = '') {
  const mime = (mimetype || '').toLowerCase();
  const ext = (originalname || '').split('.').pop()?.toLowerCase();

  if (mime === 'text/plain' || ext === 'txt') {
    return buffer.toString('utf8');
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      await parser.destroy();
      return result?.text ?? '';
    } catch (err) {
      throw new Error('Could not extract text from PDF: ' + (err.message || 'Invalid or corrupted file'));
    }
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword' ||
    ext === 'docx' ||
    ext === 'doc'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result?.value ?? '';
  }

  throw new Error('Unsupported file type. Use PDF, Word (.doc, .docx), or TXT.');
}
