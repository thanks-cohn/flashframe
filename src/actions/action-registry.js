export class ActionRegistry {
  #actions = new Map();

  register(definition) {
    if (!definition?.id || !definition?.label || typeof definition.run !== "function") throw new TypeError("An action needs an id, label, and run function");
    if (this.#actions.has(definition.id)) throw new Error(`Action already registered: ${definition.id}`);
    this.#actions.set(definition.id, Object.freeze({ appliesTo: () => true, ...definition }));
    return () => this.#actions.delete(definition.id);
  }

  get(id) { return this.#actions.get(id) ?? null; }
  available(selection, context = {}) {
    const snapshot = [...selection];
    return [...this.#actions.values()].filter((action) => action.appliesTo(snapshot, context));
  }

  async run(id, context) {
    const action = this.get(id);
    if (!action) throw new Error(`Unknown action: ${id}`);
    const selection = [...(context.selection || [])];
    if (!action.appliesTo(selection, context)) throw new Error(`${action.label} is not available for this selection`);
    return action.run({ ...context, selection });
  }
}

export async function runBatch(items, operation, { concurrency = 3, signal, onProgress = () => {} } = {}) {
  const values = [...items];
  const results = new Array(values.length);
  let cursor = 0;
  let completed = 0;
  async function worker() {
    while (cursor < values.length) {
      if (signal?.aborted) throw signal.reason || new DOMException("Cancelled", "AbortError");
      const index = cursor++;
      try { results[index] = { status: "fulfilled", value: await operation(values[index], index) }; }
      catch (reason) { results[index] = { status: "rejected", reason }; }
      onProgress(++completed, values.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), values.length) }, worker));
  return results;
}
