import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';

export interface ValidatedYamlResult {
  checksum: string;
  parsed: Record<string, unknown>;
}

export class YamlValidatorUtil {
  static validateAndCanonicalize(yamlConfig: string): ValidatedYamlResult {
    if (!yamlConfig || typeof yamlConfig !== 'string' || !yamlConfig.trim()) {
      throw new BadRequestException('Pipeline YAML config cannot be empty');
    }

    const lines = yamlConfig.split('\n');
    const parsed: Record<string, unknown> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex !== -1) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        parsed[key] = value;
      }
    }

    // Basic structure validation
    if (!parsed['version']) {
      parsed['version'] = '1.0';
    }

    // Calculate canonical SHA-256 checksum
    const canonicalString = JSON.stringify(parsed, Object.keys(parsed).sort());
    const checksum = createHash('sha256').update(canonicalString).digest('hex');

    return {
      checksum,
      parsed,
    };
  }
}
