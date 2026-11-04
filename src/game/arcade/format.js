// Race results are times in seconds, Head to Head's are wins stored as goal
// difference × 100 + goals scored (shown as the score line); the other games
// count points.
export const formatScore = (id, value) => {
    if (id === "race") return `${value.toFixed(2)}s`;
    if (id === "head") {
        const goals = value % 100;
        return `${goals}–${goals - Math.floor(value / 100)}`;
    }
    return String(value);
};
