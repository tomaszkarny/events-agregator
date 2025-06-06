import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - The potentially dangerous HTML string
 * @param options - DOMPurify options
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string, options?: any): string {
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ...(options || {})
  }
  return DOMPurify.sanitize(dirty, config) as unknown as string
}

/**
 * Sanitize text content (strips all HTML)
 * @param dirty - The potentially dangerous string
 * @returns Plain text string
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] }) as unknown as string
}