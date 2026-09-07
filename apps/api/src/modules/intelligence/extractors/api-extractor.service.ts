import { Injectable, Logger } from '@nestjs/common';
import { ApiEndpointSummary } from '@devflow/shared-types';

/**
 * DEVFLOW AI — ApiExtractorService
 *
 * Extracts REST/GraphQL API declarations across TypeScript (NestJS, Express),
 * Python (FastAPI, Flask), and Java (Spring Boot).
 */
@Injectable()
export class ApiExtractorService {
  private readonly logger = new Logger(ApiExtractorService.name);

  extractApis(filePath: string, content: string, language: string): ApiEndpointSummary[] {
    const apis: ApiEndpointSummary[] = [];
    const lines = content.split('\n');

    if (language === 'typescript' || language === 'javascript') {
      this.extractTypeScriptApis(filePath, lines, apis);
    } else if (language === 'python') {
      this.extractPythonApis(filePath, lines, apis);
    } else if (language === 'java') {
      this.extractJavaApis(filePath, lines, apis);
    }

    return apis;
  }

  // ==========================================
  // TypeScript (NestJS / Express) API Extraction
  // ==========================================
  private extractTypeScriptApis(filePath: string, lines: string[], apis: ApiEndpointSummary[]): void {
    let currentControllerPath = '';
    let currentControllerName = '';
    let classGuards: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect Controller decorator: @Controller('api/v1/jobs') or @Controller()
      const controllerMatch = line.match(/@Controller\s*\(\s*['"`]?([^'"`)]*)['"`]?\s*\)/);
      if (controllerMatch) {
        currentControllerPath = controllerMatch[1] || '';
        // Look ahead for class name
        for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
          const classMatch = lines[j].match(/export\s+class\s+([A-Za-z0-9_]+)/);
          if (classMatch) {
            currentControllerName = classMatch[1];
            break;
          }
        }
      }

      // Detect Class-level Guards: @UseGuards(JwtAuthGuard, RolesGuard)
      const classGuardMatch = line.match(/@UseGuards\s*\(([^)]+)\)/);
      if (classGuardMatch) {
        classGuards = classGuardMatch[1]
          .split(',')
          .map((g) => g.trim())
          .filter((g) => g.length > 0);
      }

      // Detect HTTP Method decorators: @Get('path'), @Post(), @Put(':id'), @Delete(), @Patch()
      const methodMatch = line.match(/@(Get|Post|Put|Delete|Patch|Options|Head)\s*\(\s*['"`]?([^'"`)]*)['"`]?\s*\)/);
      if (methodMatch) {
        const httpMethod = methodMatch[1].toUpperCase() as any;
        const subPath = methodMatch[2] || '';
        const fullPath = this.combinePaths(currentControllerPath, subPath);

        // Find handler signature on subsequent lines
        let handlerName = 'handler';
        let methodGuards: string[] = [...classGuards];
        let parameters: Array<{ name: string; type: string; source: 'body' | 'query' | 'param' | 'header' }> = [];
        let startLine = i + 1;
        let endLine = i + 1;

        // Scan downwards for method declaration and params
        for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
          const l = lines[j].trim();

          const subGuardMatch = l.match(/@UseGuards\s*\(([^)]+)\)/);
          if (subGuardMatch) {
            const extra = subGuardMatch[1]
              .split(',')
              .map((g) => g.trim())
              .filter((g) => g.length > 0);
            methodGuards.push(...extra);
          }

          const handlerMatch = l.match(/(?:async\s+)?([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
          if (handlerMatch && !l.startsWith('@')) {
            handlerName = handlerMatch[1];
            startLine = i + 1;
            endLine = j + 1;

            // Extract parameters: @Body() body: EnqueueJobRequest, @Param('id') id: string
            const rawParams = handlerMatch[2];
            if (rawParams.includes('@Body')) parameters.push({ name: 'body', type: 'object', source: 'body' });
            if (rawParams.includes('@Param')) parameters.push({ name: 'params', type: 'string', source: 'param' });
            if (rawParams.includes('@Query')) parameters.push({ name: 'query', type: 'object', source: 'query' });
            break;
          }
        }

        apis.push({
          id: `api_${httpMethod.toLowerCase()}_${fullPath.replace(/[^a-zA-Z0-9]/g, '_')}_${startLine}`,
          method: httpMethod,
          path: fullPath.startsWith('/') ? fullPath : `/${fullPath}`,
          controllerName: currentControllerName || undefined,
          handlerName,
          filePath,
          startLine,
          endLine,
          parameters,
          authGuards: Array.from(new Set(methodGuards)),
        });
      }
    }
  }

  // ==========================================
  // Python (FastAPI / Flask) API Extraction
  // ==========================================
  private extractPythonApis(filePath: string, lines: string[], apis: ApiEndpointSummary[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match @app.get("/path"), @router.post("/path", dependencies=[...])
      const routeMatch = line.match(/@(?:app|router|api_router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/);
      if (routeMatch) {
        const httpMethod = routeMatch[1].toUpperCase() as any;
        const path = routeMatch[2];
        const authGuards: string[] = [];

        if (line.includes('Depends') || line.includes('get_current_user') || line.includes('auth')) {
          authGuards.push('FastAPI_AuthDependency');
        }

        let handlerName = 'endpoint';
        for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
          const fnMatch = lines[j].match(/(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(/);
          if (fnMatch) {
            handlerName = fnMatch[1];
            break;
          }
        }

        apis.push({
          id: `api_py_${httpMethod.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}`,
          method: httpMethod,
          path: path.startsWith('/') ? path : `/${path}`,
          handlerName,
          filePath,
          startLine: i + 1,
          endLine: i + 5,
          parameters: [],
          authGuards,
        });
      }
    }
  }

  // ==========================================
  // Java (Spring Boot) API Extraction
  // ==========================================
  private extractJavaApis(filePath: string, lines: string[], apis: ApiEndpointSummary[]): void {
    let currentControllerPath = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const reqMapping = line.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/);
      if (reqMapping) {
        currentControllerPath = reqMapping[1];
      }

      const springMethodMatch = line.match(/@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)(?:\s*\(\s*(?:(?:value|path)\s*=\s*)?["']?([^"')]*)["']?\s*\))?/);
      if (springMethodMatch && line.includes('@')) {
        const verbMap: Record<string, any> = {
          GetMapping: 'GET',
          PostMapping: 'POST',
          PutMapping: 'PUT',
          DeleteMapping: 'DELETE',
          PatchMapping: 'PATCH',
        };
        const httpMethod = verbMap[springMethodMatch[1]] || 'GET';
        const subPath = springMethodMatch[2] || '';
        const fullPath = this.combinePaths(currentControllerPath, subPath);

        apis.push({
          id: `api_java_${httpMethod.toLowerCase()}_${fullPath.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}`,
          method: httpMethod,
          path: fullPath.startsWith('/') ? fullPath : `/${fullPath}`,
          handlerName: `method_line_${i + 1}`,
          filePath,
          startLine: i + 1,
          endLine: i + 5,
          parameters: [],
          authGuards: line.includes('@PreAuthorize') ? ['SpringSecurity_PreAuthorize'] : [],
        });
      }
    }
  }

  private combinePaths(base: string, sub: string): string {
    const cleanBase = base.replace(/\/+$/, '');
    const cleanSub = sub.replace(/^\/+/, '');
    if (!cleanBase && !cleanSub) return '/';
    if (!cleanBase) return `/${cleanSub}`;
    if (!cleanSub) return cleanBase.startsWith('/') ? cleanBase : `/${cleanBase}`;
    return `${cleanBase.startsWith('/') ? cleanBase : `/${cleanBase}`}/${cleanSub}`;
  }
}
