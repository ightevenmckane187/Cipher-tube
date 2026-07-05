export declare class MergeResolver {
  private git;
  constructor();
  attemptSmartMerge(targetBranch?: string): Promise<boolean>;
  private resolveConflicts;
  private resolveFileConflict;
}
