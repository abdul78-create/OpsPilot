import { Test, TestingModule } from '@nestjs/testing';
import { StructuredLoggerService } from './structured-logger.service';
import { LogRedactorUtility } from './log-redactor.utility';
import { RequestContextService } from '../context/request-context.service';

describe('Structured Logging & Log Redaction Integration Test Suite', () => {
  let loggerService: StructuredLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StructuredLoggerService,
        {
          provide: RequestContextService,
          useValue: {
            getStore: jest.fn().mockReturnValue({
              requestId: 'req_test_123',
              correlationId: 'corr_test_456',
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
              spanId: '00f067aa0ba902b7',
              tenantId: 'org_test_789',
              userId: 'usr_test_000',
              requestStartTime: Date.now() - 150,
            }),
          },
        },
      ],
    }).compile();

    loggerService = module.get<StructuredLoggerService>(StructuredLoggerService);
  });

  describe('Log Redactor Utility', () => {
    it('should REDACT Bearer JWT tokens from raw log strings', () => {
      const input =
        'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const output = LogRedactorUtility.redactString(input);
      expect(output).toContain('Bearer [REDACTED_JWT_TOKEN]');
      expect(output).not.toContain('eyJhbGciOiJ');
    });

    it('should REDACT database connection credentials', () => {
      const input =
        'Connecting to postgres://dbuser:super_secret_password_123@postgres:5432/opspilot';
      const output = LogRedactorUtility.redactString(input);
      expect(output).toContain('postgres://dbuser:[REDACTED]@postgres:5432/opspilot');
      expect(output).not.toContain('super_secret_password_123');
    });

    it('should REDACT sensitive fields in nested objects', () => {
      const inputObj = {
        user: 'admin',
        password: 'my_secret_password',
        nested: {
          clientSecret: 'secret_key_999',
          normal: 'value',
        },
      };
      const redacted = LogRedactorUtility.redactObject(inputObj);
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.nested.clientSecret).toBe('[REDACTED]');
      expect(redacted.nested.normal).toBe('value');
    });
  });

  describe('Structured Logger Output', () => {
    it('should format structured JSON logs containing W3C traceId, spanId, requestId, and redacted text', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      loggerService.log('Connecting with Bearer eyJhbGciOiJIUzI1NiJ9.test.sig', 'TestContext');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const jsonStr = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonStr);

      expect(parsed.level).toBe('INFO');
      expect(parsed.context).toBe('TestContext');
      expect(parsed.message).toContain('Bearer [REDACTED_JWT_TOKEN]');
      expect(parsed.requestId).toBe('req_test_123');
      expect(parsed.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(parsed.spanId).toBe('00f067aa0ba902b7');
      expect(parsed.durationMs).toBeGreaterThanOrEqual(0);

      consoleSpy.mockRestore();
    });
  });
});
