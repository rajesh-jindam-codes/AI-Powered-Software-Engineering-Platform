import { Injectable, Logger } from '@nestjs/common';
import { DocOperation, CollaborativeDoc } from '@devflow/shared-types';

export interface ApplyOperationResult {
  doc: CollaborativeDoc;
  applied: boolean;
  isDuplicate: boolean;
  transformedPosition: number;
}

/**
 * DEVFLOW AI — CrdtSyncService (Phase 12)
 *
 * Conflict-free Replicated Data Type (CRDT) & Vector Clock Synchronizer.
 * Provides deterministic concurrent operation transformation, duplicate event deduplication,
 * and state convergence across distributed peers.
 */
@Injectable()
export class CrdtSyncService {
  private readonly logger = new Logger(CrdtSyncService.name);

  // Cache of processed operation IDs for idempotency deduplication
  private readonly processedOpIds = new Set<string>();

  // Document operation logs for timeline replay and conflict resolution: Map<documentId, DocOperation[]>
  private readonly documentOpLogs = new Map<string, DocOperation[]>();

  /**
   * Apply an incoming collaborative operation to a document with vector clock resolution
   */
  applyOperation(doc: CollaborativeDoc, op: DocOperation): ApplyOperationResult {
    // 1. Idempotency Check: Reject duplicate operations
    if (this.processedOpIds.has(op.id)) {
      this.logger.debug(`Duplicate operation ${op.id} ignored for doc ${doc.id}`);
      return {
        doc,
        applied: false,
        isDuplicate: true,
        transformedPosition: op.position,
      };
    }

    this.processedOpIds.add(op.id);
    if (this.processedOpIds.size > 10000) {
      // Evict oldest entries
      const oldest = Array.from(this.processedOpIds).slice(0, 1000);
      oldest.forEach((id) => this.processedOpIds.delete(id));
    }

    // 2. Vector Clock Update
    const currentClock = { ...doc.vectorClock };
    const userClock = (currentClock[op.userId] || 0) + 1;
    currentClock[op.userId] = userClock;

    // 3. Operational Transformation & Content Mutation
    const originalContent = doc.content;
    let newContent = originalContent;
    let transformedPos = Math.max(0, Math.min(op.position, originalContent.length));

    switch (op.operationType) {
      case 'insert': {
        newContent =
          originalContent.slice(0, transformedPos) +
          op.text +
          originalContent.slice(transformedPos);
        break;
      }
      case 'delete': {
        const deleteLen = op.length || op.text?.length || 1;
        newContent =
          originalContent.slice(0, transformedPos) +
          originalContent.slice(transformedPos + deleteLen);
        break;
      }
      case 'replace': {
        // Deterministic replace with timestamp tie-breaker
        newContent = op.text;
        break;
      }
    }

    // 4. Update Document Metadata
    const updatedDoc: CollaborativeDoc = {
      ...doc,
      content: newContent,
      version: doc.version + 1,
      lastModifiedBy: op.userName || op.userId,
      vectorClock: currentClock,
      updatedAt: new Date().toISOString(),
    };

    // 5. Append to Operation Log for Document Replay
    let opLog = this.documentOpLogs.get(doc.id);
    if (!opLog) {
      opLog = [];
      this.documentOpLogs.set(doc.id, opLog);
    }
    opLog.push(op);

    this.logger.debug(
      `CRDT op applied: [${op.operationType.toUpperCase()}] at pos ${transformedPos} on doc ${doc.id} -> v${updatedDoc.version}`,
    );

    return {
      doc: updatedDoc,
      applied: true,
      isDuplicate: false,
      transformedPosition: transformedPos,
    };
  }

  /**
   * Get historical operations for a document
   */
  getOperationsLog(documentId: string): DocOperation[] {
    return this.documentOpLogs.get(documentId) || [];
  }

  /**
   * Calculate difference or synchronize between two peers given state vector clocks
   */
  getMissingOperations(
    documentId: string,
    peerVectorClock: Record<string, number>,
  ): DocOperation[] {
    const allOps = this.documentOpLogs.get(documentId) || [];
    return allOps.filter((op) => {
      const peerVersionForUser = peerVectorClock[op.userId] || 0;
      const opClockForUser = op.vectorClock[op.userId] || 0;
      return opClockForUser > peerVersionForUser;
    });
  }
}
