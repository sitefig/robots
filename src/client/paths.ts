// Site URLs resolved from the compiled script's location (js/), so they work
// from the root page and from every /<code>/ language page alike.

export const SCHEMA_URL = new URL('../schema/report.schema.json', import.meta.url).href;
export const EXAMPLE_URL = new URL('../examples/kitchen-sink.robots.txt', import.meta.url).href;
