import { ApiExtractorService } from './extractors/api-extractor.service';
import { DbExtractorService } from './extractors/db-extractor.service';
import { AuthExtractorService } from './extractors/auth-extractor.service';
import { ConfigExtractorService } from './extractors/config-extractor.service';
import { TestExtractorService } from './extractors/test-extractor.service';

describe('Code Intelligence Extractors (Phase 7)', () => {
  let apiExtractor: ApiExtractorService;
  let dbExtractor: DbExtractorService;
  let authExtractor: AuthExtractorService;
  let configExtractor: ConfigExtractorService;
  let testExtractor: TestExtractorService;

  beforeEach(() => {
    apiExtractor = new ApiExtractorService();
    dbExtractor = new DbExtractorService();
    authExtractor = new AuthExtractorService();
    configExtractor = new ConfigExtractorService();
    testExtractor = new TestExtractorService();
  });

  describe('ApiExtractorService', () => {
    it('should extract NestJS TypeScript endpoints, HTTP verbs, paths, and guards', () => {
      const code = `
@Controller('api/v1/workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  @Get(':id')
  async getWorkspace(@Param('id') id: string) {}

  @UseGuards(RolesGuard)
  @Post()
  async createWorkspace(@Body() dto: CreateDto) {}
}
      `;
      const apis = apiExtractor.extractApis('src/controllers/workspace.controller.ts', code, 'typescript');

      expect(apis.length).toBe(2);
      expect(apis[0].method).toBe('GET');
      expect(apis[0].path).toBe('/api/v1/workspaces/:id');
      expect(apis[0].authGuards).toContain('JwtAuthGuard');

      expect(apis[1].method).toBe('POST');
      expect(apis[1].path).toBe('/api/v1/workspaces');
      expect(apis[1].authGuards).toContain('RolesGuard');
    });

    it('should extract Python FastAPI routes and handlers', () => {
      const pyCode = `
@router.get("/repositories/{repo_id}", dependencies=[Depends(get_current_user)])
async def get_repository_details(repo_id: str):
    pass

@router.post("/repositories")
def create_repository(payload: RepoCreate):
    pass
      `;
      const apis = apiExtractor.extractApis('app/routes/repos.py', pyCode, 'python');

      expect(apis.length).toBe(2);
      expect(apis[0].method).toBe('GET');
      expect(apis[0].path).toBe('/repositories/{repo_id}');
      expect(apis[0].handlerName).toBe('get_repository_details');
      expect(apis[0].authGuards).toContain('FastAPI_AuthDependency');
    });

    it('should extract Java Spring Boot REST controllers', () => {
      const javaCode = `
@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    @GetMapping("/{id}")
    public UserDto getUserById(@PathVariable String id) { return null; }

    @PostMapping
    public UserDto createUser(@RequestBody UserDto dto) { return null; }
}
      `;
      const apis = apiExtractor.extractApis('src/main/java/UserController.java', javaCode, 'java');

      expect(apis.length).toBe(2);
      expect(apis[0].method).toBe('GET');
      expect(apis[0].path).toBe('/api/v1/users/{id}');
      expect(apis[1].method).toBe('POST');
      expect(apis[1].path).toBe('/api/v1/users');
    });
  });

  describe('DbExtractorService', () => {
    it('should extract SQL CREATE TABLE statements with primary and foreign keys', () => {
      const sqlCode = `
CREATE TABLE repositories (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    workspace_id UUID REFERENCES workspaces(id)
);
      `;
      const models = dbExtractor.extractDbModels('migrations/001.sql', sqlCode, 'sql');

      expect(models.length).toBe(1);
      expect(models[0].tableName).toBe('repositories');
      expect(models[0].primaryKey).toBe('id');
      expect(models[0].relations[0].targetModel).toBe('workspaces');
    });

    it('should extract TypeORM entity classes and column metadata', () => {
      const tsEntity = `
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  action: string;

  @ManyToOne(() => Workspace)
  workspace: Workspace;
}
      `;
      const models = dbExtractor.extractDbModels('src/entities/audit-log.entity.ts', tsEntity, 'typescript');

      expect(models.length).toBe(1);
      expect(models[0].tableName).toBe('audit_logs');
      expect(models[0].name).toBe('AuditLog');
      expect(models[0].relations[0].targetModel).toBe('Workspace');
    });

    it('should extract Python SQLAlchemy models and tables', () => {
      const pyModel = `
class AgentStep(Base):
    __tablename__ = 'agent_steps'
    id = Column(String, primary_key=True)
    task_id = Column(String, nullable=False)
    task = relationship("AgentTask")
      `;
      const models = dbExtractor.extractDbModels('app/models/agent.py', pyModel, 'python');

      expect(models.length).toBe(1);
      expect(models[0].tableName).toBe('agent_steps');
      expect(models[0].primaryKey).toBe('id');
      expect(models[0].relations[0].targetModel).toBe('AgentTask');
    });
  });

  describe('AuthExtractorService', () => {
    it('should extract JWT guards, Passport strategies, and Roles decorators', () => {
      const authCode = `
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  canActivate() { return true; }
}

export class RolesGuard implements CanActivate {
  canActivate() { return true; }
}
      `;
      const patterns = authExtractor.extractAuthPatterns('src/auth/jwt-auth.guard.ts', authCode);

      expect(patterns.length).toBe(2);
      expect(patterns[0].name).toBe('JwtAuthGuard');
      expect(patterns[0].mechanism).toBe('JWT');
      expect(patterns[1].mechanism).toBe('RBAC');
    });
  });

  describe('ConfigExtractorService', () => {
    it('should extract process.env and configService keys, identifying sensitive secrets', () => {
      const configCode = `
const db = process.env.DATABASE_URL;
const secret = configService.get('JWT_SECRET');
const port = process.env.PORT;
      `;
      const configs = configExtractor.extractConfigKeys('src/config/env.ts', configCode);

      expect(configs.length).toBe(3);
      const secretKey = configs.find((c) => c.keyName === 'JWT_SECRET');
      expect(secretKey?.isSecret).toBe(true);

      const portKey = configs.find((c) => c.keyName === 'PORT');
      expect(portKey?.isSecret).toBe(false);
    });
  });

  describe('TestExtractorService', () => {
    it('should extract Jest describe blocks, test names, and map to target file', () => {
      const testCode = `
describe('WorkspaceService', () => {
  it('should create workspace with sole admin', () => {});
  test('should invite new member with role DEVELOPER', () => {});
});
      `;
      const suites = testExtractor.extractTestSuites('src/modules/workspaces/workspace.service.spec.ts', testCode);

      expect(suites.length).toBe(1);
      expect(suites[0].framework).toBe('jest');
      expect(suites[0].suiteName).toBe('WorkspaceService');
      expect(suites[0].testCasesCount).toBe(2);
      expect(suites[0].testNames).toContain('should create workspace with sole admin');
      expect(suites[0].targetSourceFiles[0]).toBe('src/modules/workspaces/workspace.service.ts');
    });
  });
});
