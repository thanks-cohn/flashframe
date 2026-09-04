export class SelectionModel extends EventTarget {
  #items = new Set();
  get items() { return [...this.#items]; }
  get size() { return this.#items.size; }
  has(item) { return this.#items.has(item); }
  clear() { if (this.#items.size) { this.#items.clear(); this.#changed(); } }
  replace(item) { this.#items.clear(); if (item) this.#items.add(item); this.#changed(); }
  toggle(item) { this.#items.has(item) ? this.#items.delete(item) : this.#items.add(item); this.#changed(); }
  remove(item) { if (this.#items.delete(item)) this.#changed(); }
  #changed() { this.dispatchEvent(new Event("change")); }
}
