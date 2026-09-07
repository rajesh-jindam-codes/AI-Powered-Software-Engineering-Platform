import { Injectable } from '@nestjs/common';
import * as path from 'path';

export interface FilterDecision {
  process: boolean;
  reason?: 'IGNORED_PATH' | 'SECRET_FILE' | 'BINARY_FILE' | 'FILE_TOO_LARGE' | 'EMPTY_FILE';
  language: string;
  isBinary: boolean;
  isSecret: boolean;
}

@Injectable()
export class FileFilterService {
  private readonly maxFileSizeBytes = 1024 * 1024; // 1 MB

  private readonly ignoredDirectories = new Set([
    '.git',
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.next',
    'out',
    'venv',
    '.venv',
    '__pycache__',
    '.turbo',
    '.gradle',
    '.idea',
    '.vscode',
    'target',
    'vendor',
    'bin',
    'obj',
  ]);

  private readonly ignoredFiles = new Set([
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'cargo.lock',
    'gemfile.lock',
    'composer.lock',
    'poetry.lock',
    '.DS_Store',
    'Thumbs.db',
  ]);

  private readonly secretPatterns = [
    /^\.env(\..+)?$/i,
    /\.pem$/i,
    /\.key$/i,
    /^id_rsa/i,
    /^id_ed25519/i,
    /\.pfx$/i,
    /\.p12$/i,
    /\.keystore$/i,
    /^credentials\.json$/i,
    /secrets?\.ya?ml$/i,
  ];

  private readonly binaryExtensions = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.webp',
    '.bmp',
    '.tiff',
    '.pdf',
    '.zip',
    '.tar',
    '.gz',
    '.7z',
    '.rar',
    '.exe',
    '.bin',
    '.dll',
    '.so',
    '.dylib',
    '.class',
    '.jar',
    '.war',
    '.pyc',
    '.pyo',
    '.pyd',
    '.wasm',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.mp4',
    '.mp3',
    '.mov',
    '.avi',
    '.flac',
    '.ogg',
    '.db',
    '.sqlite',
    '.parquet',
  ]);

  private readonly extensionToLanguage: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.mjs': 'JavaScript',
    '.cjs': 'JavaScript',
    '.py': 'Python',
    '.pyw': 'Python',
    '.java': 'Java',
    '.sql': 'SQL',
    '.go': 'Go',
    '.rs': 'Rust',
    '.cpp': 'C++',
    '.cc': 'C++',
    '.cxx': 'C++',
    '.c': 'C',
    '.h': 'C',
    '.hpp': 'C++',
    '.cs': 'C#',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.kts': 'Kotlin',
    '.scala': 'Scala',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.md': 'Markdown',
    '.mdx': 'Markdown',
    '.html': 'HTML',
    '.htm': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.less': 'LESS',
    '.sh': 'Shell',
    '.bash': 'Shell',
    '.zsh': 'Shell',
    '.dockerfile': 'Dockerfile',
  };

  /**
   * Evaluates whether a file should be ingested and parsed
   */
  shouldProcess(
    filePath: string,
    sizeBytes: number = 0,
    content?: string | Buffer,
  ): FilterDecision {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fileName = path.basename(normalizedPath);
    const extension = path.extname(normalizedPath).toLowerCase();
    const segments = normalizedPath.split('/');

    const language = this.resolveLanguage(normalizedPath, fileName, extension);

    // 1. Check Ignored Directories
    for (const seg of segments) {
      if (this.ignoredDirectories.has(seg)) {
        return {
          process: false,
          reason: 'IGNORED_PATH',
          language,
          isBinary: false,
          isSecret: false,
        };
      }
    }

    // 2. Check Ignored Files
    if (this.ignoredFiles.has(fileName)) {
      return {
        process: false,
        reason: 'IGNORED_PATH',
        language,
        isBinary: false,
        isSecret: false,
      };
    }

    // 3. Check Secrets
    for (const pattern of this.secretPatterns) {
      if (pattern.test(fileName)) {
        return {
          process: false,
          reason: 'SECRET_FILE',
          language,
          isBinary: false,
          isSecret: true,
        };
      }
    }

    // 4. Check Binary Extensions
    if (this.binaryExtensions.has(extension)) {
      return {
        process: false,
        reason: 'BINARY_FILE',
        language,
        isBinary: true,
        isSecret: false,
      };
    }

    // 5. Check Content Null-byte heuristics for binary files
    if (content) {
      const sample = typeof content === 'string'
        ? content.slice(0, 512)
        : content.subarray(0, 512).toString('binary');
      if (sample.includes('\0')) {
        return {
          process: false,
          reason: 'BINARY_FILE',
          language,
          isBinary: true,
          isSecret: false,
        };
      }
    }

    // 6. Check Size Limit
    if (sizeBytes > this.maxFileSizeBytes) {
      return {
        process: false,
        reason: 'FILE_TOO_LARGE',
        language,
        isBinary: false,
        isSecret: false,
      };
    }

    return {
      process: true,
      language,
      isBinary: false,
      isSecret: false,
    };
  }

  resolveLanguage(filePath: string, fileName: string, extension: string): string {
    if (fileName.toLowerCase() === 'dockerfile') return 'Dockerfile';
    if (fileName.toLowerCase() === 'makefile') return 'Makefile';
    if (this.extensionToLanguage[extension]) {
      return this.extensionToLanguage[extension];
    }
    return 'Text';
  }
}
