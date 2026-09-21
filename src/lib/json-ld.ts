/**
 * Serializes structured data without allowing catalogue copy to terminate
 * the surrounding script element. JSON escaping alone does not protect the
 * HTML parser from a literal `</script>` sequence.
 */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);

  if (json === undefined) {
    throw new TypeError("JSON-LD value must be JSON-serializable");
  }

  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
