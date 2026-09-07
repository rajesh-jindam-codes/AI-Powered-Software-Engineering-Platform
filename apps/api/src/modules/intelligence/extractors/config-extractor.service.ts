import { Injectable, Logger } from '@nestjs/common';
import { ConfigPatternSummary } from '@devflow/shared-types';

/**
 * DEVFLOW AI — ConfigExtractorService
 *
 * Scans environment variables, configuration schemas (Joi, Zod),
 * and ConfigService key lookups.
 */
@Injectable()
export class ConfigExtractorService {
  private readonly logger = new Logger(ConfigExtractorService.name);

  extractConfigKeys(filePath: string, content: string): ConfigPatternSummary[] {
    const configs: ConfigPatternSummary[] = [];
    const lines = content.split('\n');
    const seenKeys = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match process.env.KEY_NAME or os.environ.get('KEY_NAME') or configService.get('KEY_NAME')
      const envMatches = [
        ...line.matchAll(/process\.env\.([A-Z0-9_]+)/g),
        ...line.matchAll(/configService\.get(?:<[^>]+>)?\s*\(\s*['"]([A-Z0-9_]+)['"]/g),
        ...line.matchAll(/os\.environ(?:\.get)?\s*\[?['"]([A-Z0-9_]+)['"]\]?/g),
        ...line.matchAll(/@Value\s*\(\s*"\${([A-Z0-9_.]+)}"\s*\)/g),
      ];

      for (const m of envMatches) {
        const keyName = m[1];
        if (!seenKeys.has(keyName)) {
          seenKeys.add(keyName);
          const isSecret = /secret|password|key|token|auth|credential/i.test(keyName);
          configs.push({
            id: `cfg_${keyName.toLowerCase()}`,
            keyName,
            filePath,
            lineNumber: i + 1,
            isSecret,
            schemaType: 'string',
          });
        }
      }
    }

    return configs;
  }
}
