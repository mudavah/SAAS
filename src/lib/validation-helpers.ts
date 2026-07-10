export function isPlaceholder(value?: string): boolean {
  if (!value) return true;
  return (
    value.includes("your-domain") ||
    value.includes("...") ||
    value.includes("kaziflow.co.ke") ||
    value.trim() === "" ||
    value.endsWith("_")
  );
}
