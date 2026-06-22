// Stable unique id. crypto.randomUUID is available in all target browsers.
export const id = (): string => crypto.randomUUID();
