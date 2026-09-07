import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionWorkerService } from './ingestion-worker.service';
import { IngestionRepository } from './ingestion.repository';
import { FileFilterService } from './filtering/file-filter.service';
import { ParserRegistryService } from './parsers/parser-registry.service';
import { TypeScriptParser } from './parsers/typescript.parser';
import { PythonParser } from './parsers/python.parser';
import { JavaParser } from './parsers/java.parser';
import { SqlParser } from './parsers/sql.parser';
import { GenericParser } from './parsers/generic.parser';
import { CodeChunkerService } from './chunking/code-chunker.service';
import { GitHubModule } from '../github/github.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [GitHubModule, WorkspacesModule],
  controllers: [IngestionController],
  providers: [
    IngestionWorkerService,
    IngestionRepository,
    FileFilterService,
    ParserRegistryService,
    TypeScriptParser,
    PythonParser,
    JavaParser,
    SqlParser,
    GenericParser,
    CodeChunkerService,
  ],
  exports: [
    IngestionWorkerService,
    IngestionRepository,
    FileFilterService,
    ParserRegistryService,
    CodeChunkerService,
  ],
})
export class IngestionModule {}
