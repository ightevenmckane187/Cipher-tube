import { PredatorModule } from './schema';

export function validateModule(doc: any): asserts doc is PredatorModule {
  if (!doc.module || typeof doc.module !== 'string') {
    throw new Error('Invalid or missing module name');
  }

  if (!doc.version || typeof doc.version !== 'string') {
    throw new Error('Invalid or missing version');
  }

  if (!doc.config || typeof doc.config !== 'object') {
    throw new Error('Invalid or missing config object');
  }

  if (doc.pipelines && !Array.isArray(doc.pipelines)) {
    throw new Error('pipelines must be an array');
  }

  if (doc.workflows && !Array.isArray(doc.workflows)) {
    throw new Error('workflows must be an array');
  }

  // Basic structure validation passed
  // In a real implementation, we would recursively validate each pipeline and workflow
}
