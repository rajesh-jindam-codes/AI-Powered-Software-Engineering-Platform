import { Injectable, Logger } from '@nestjs/common';
import { DbModelSummary } from '@devflow/shared-types';

/**
 * DEVFLOW AI — DbExtractorService
 *
 * Extracts Database entities, ORM models (TypeORM, Prisma, SQLAlchemy),
 * and SQL table schemas.
 */
@Injectable()
export class DbExtractorService {
  private readonly logger = new Logger(DbExtractorService.name);

  extractDbModels(filePath: string, content: string, language: string): DbModelSummary[] {
    const models: DbModelSummary[] = [];
    const lines = content.split('\n');

    if (language === 'sql') {
      this.extractSqlTables(filePath, content, models);
    } else if (language === 'typescript' || language === 'javascript') {
      this.extractTypeScriptModels(filePath, lines, models);
    } else if (language === 'python') {
      this.extractPythonModels(filePath, lines, models);
    }

    return models;
  }

  // ==========================================
  // SQL DDL Extraction
  // ==========================================
  private extractSqlTables(filePath: string, content: string, models: DbModelSummary[]): void {
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
    let match: RegExpExecArray | null;

    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];
      const fieldLines = body.split('\n');
      const fields: Array<{ name: string; type: string; nullable?: boolean; isUnique?: boolean }> = [];
      const relations: Array<{ targetModel: string; type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many' }> = [];
      let primaryKey = 'id';

      for (const rawLine of fieldLines) {
        const line = rawLine.trim().replace(/,$/, '');
        if (!line || line.startsWith('--')) continue;

        if (line.toUpperCase().includes('PRIMARY KEY')) {
          const pkMatch = line.match(/^([a-zA-Z0-9_]+)/);
          if (pkMatch) primaryKey = pkMatch[1];
        }

        const fkMatch = line.match(/FOREIGN\s+KEY\s*\(([a-zA-Z0-9_]+)\)\s*REFERENCES\s+([a-zA-Z0-9_]+)/i) ||
                        line.match(/REFERENCES\s+([a-zA-Z0-9_]+)/i);
        if (fkMatch) {
          const targetTable = fkMatch[2] || fkMatch[1];
          relations.push({ targetModel: targetTable, type: 'many-to-one' });
        }

        const colMatch = line.match(/^([a-zA-Z0-9_]+)\s+([A-Za-z0-9_()]+)/);
        if (colMatch && !['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT'].includes(colMatch[1].toUpperCase())) {
          fields.push({
            name: colMatch[1],
            type: colMatch[2],
            nullable: !line.toUpperCase().includes('NOT NULL'),
            isUnique: line.toUpperCase().includes('UNIQUE'),
          });
        }
      }

      models.push({
        id: `db_table_${tableName}`,
        name: tableName,
        tableName,
        filePath,
        startLine: 1,
        endLine: fieldLines.length,
        primaryKey,
        fields,
        relations,
      });
    }
  }

  // ==========================================
  // TypeScript (TypeORM / Prisma) Model Extraction
  // ==========================================
  private extractTypeScriptModels(filePath: string, lines: string[], models: DbModelSummary[]): void {
    let currentEntity: Partial<DbModelSummary> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // TypeORM @Entity('users') or @Entity()
      const entityMatch = line.match(/@Entity\s*\(\s*['"`]?([^'"`)]*)['"`]?\s*\)/);
      if (entityMatch) {
        const customTableName = entityMatch[1] || '';
        for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
          const classMatch = lines[j].match(/export\s+class\s+([A-Za-z0-9_]+)/);
          if (classMatch) {
            const className = classMatch[1];
            currentEntity = {
              id: `db_entity_${className}`,
              name: className,
              tableName: customTableName || className.toLowerCase() + 's',
              filePath,
              startLine: i + 1,
              endLine: i + 30,
              primaryKey: 'id',
              fields: [],
              relations: [],
            };
            break;
          }
        }
      }

      // Column fields: @Column(), @PrimaryGeneratedColumn()
      if (currentEntity) {
        if (line.includes('@PrimaryGeneratedColumn') || line.includes('@PrimaryColumn')) {
          const colNameMatch = lines[i + 1]?.match(/([a-zA-Z0-9_]+)\s*[:?]/);
          if (colNameMatch) {
            currentEntity.primaryKey = colNameMatch[1];
            currentEntity.fields?.push({ name: colNameMatch[1], type: 'UUID', nullable: false, isUnique: true });
          }
        } else if (line.includes('@Column')) {
          const colNameMatch = lines[i + 1]?.match(/([a-zA-Z0-9_]+)\s*[:?]\s*([a-zA-Z0-9_<>]+)/);
          if (colNameMatch) {
            currentEntity.fields?.push({
              name: colNameMatch[1],
              type: colNameMatch[2] || 'string',
              nullable: line.includes('nullable: true'),
              isUnique: line.includes('unique: true'),
            });
          }
        } else if (line.includes('@ManyToOne') || line.includes('@OneToMany')) {
          const relType = line.includes('@OneToMany') ? 'one-to-many' : 'many-to-one';
          const targetMatch = line.match(/=>\s*([A-Za-z0-9_]+)/);
          if (targetMatch) {
            currentEntity.relations?.push({ targetModel: targetMatch[1], type: relType });
          }
        }

        if (line.startsWith('}') && currentEntity) {
          currentEntity.endLine = i + 1;
          models.push(currentEntity as DbModelSummary);
          currentEntity = null;
        }
      }
    }
  }

  // ==========================================
  // Python (SQLAlchemy / Django) Model Extraction
  // ==========================================
  private extractPythonModels(filePath: string, lines: string[], models: DbModelSummary[]): void {
    let currentModel: Partial<DbModelSummary> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const classMatch = line.match(/^class\s+([A-Za-z0-9_]+)\s*\(\s*(?:Base|models\.Model|db\.Model)\s*\):/);
      if (classMatch) {
        const modelName = classMatch[1];
        currentModel = {
          id: `db_py_model_${modelName}`,
          name: modelName,
          tableName: modelName.toLowerCase() + 's',
          filePath,
          startLine: i + 1,
          endLine: i + 25,
          primaryKey: 'id',
          fields: [],
          relations: [],
        };
      }

      if (currentModel) {
        const tableDefMatch = line.match(/__tablename__\s*=\s*['"]([^'"]+)['"]/);
        if (tableDefMatch) {
          currentModel.tableName = tableDefMatch[1];
        }

        const colMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*Column\s*\(\s*([A-Za-z0-9_()]+)/);
        if (colMatch) {
          currentModel.fields?.push({
            name: colMatch[1],
            type: colMatch[2],
            nullable: !line.includes('nullable=False'),
            isUnique: line.includes('unique=True'),
          });
          if (line.includes('primary_key=True')) {
            currentModel.primaryKey = colMatch[1];
          }
        }

        const relMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*relationship\s*\(\s*['"]([A-Za-z0-9_]+)['"]/);
        if (relMatch) {
          currentModel.relations?.push({ targetModel: relMatch[2], type: 'many-to-one' });
        }
      }

      if (currentModel && line === '' && lines[i + 1] && !lines[i + 1].startsWith(' ')) {
        currentModel.endLine = i + 1;
        models.push(currentModel as DbModelSummary);
        currentModel = null;
      }
    }

    if (currentModel) {
      models.push(currentModel as DbModelSummary);
    }
  }
}
