export class IntentResolver {
  resolve(multimodalInput: string): string {
    if (
      multimodalInput.includes("Palm-Up") &&
      multimodalInput.includes("Archive")
    ) {
      return "system_archive_workspace";
    }
    return "on_invoke";
  }
}
