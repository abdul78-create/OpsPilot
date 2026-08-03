/**
 * Production Log Redaction Utility
 * Masks sensitive credentials, JWT tokens, passwords, database connection strings, and secret keys.
 */
export class LogRedactorUtility {
  private static SENSITIVE_KEY_REGEX =
    /(password|secret|token|privatekey|authorization|bearer|apikey|passwd|connectionstring)/i;

  private static BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*/gi;
  private static DB_URL_REGEX = /(postgres|postgresql|mongodb|mysql|redis):\/\/([^:]+):([^@]+)@/gi;
  private static SECRET_KV_REGEX =
    /"(password|secret|token|privateKey|apiKey|clientSecret)":\s*"[^"]+"/gi;

  /**
   * Redacts sensitive strings containing JWT tokens, credentials, and connection strings.
   */
  static redactString(text: string): string {
    if (!text) return text;
    let redacted = text;

    // Redact Bearer JWT tokens
    redacted = redacted.replace(this.BEARER_REGEX, 'Bearer [REDACTED_JWT_TOKEN]');

    // Redact database credentials
    redacted = redacted.replace(this.DB_URL_REGEX, '$1://$2:[REDACTED]@');

    // Redact JSON secret key-values
    redacted = redacted.replace(this.SECRET_KV_REGEX, '"$1": "[REDACTED]"');

    return redacted;
  }

  /**
   * Recursively redacts sensitive fields in objects.
   */
  static redactObject<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return this.redactString(obj) as unknown as T;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as unknown as T;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (this.SENSITIVE_KEY_REGEX.test(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redactObject(value);
      } else if (typeof value === 'string') {
        result[key] = this.redactString(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }
}
