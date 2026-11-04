// Race results are times in seconds; the other games count points.
export const formatScore = (id, value) => (id === "race" ? `${value.toFixed(2)}s` : String(value));
