// The arcade's shared board: the best result anyone has set in each game.
// GET returns it; POST { scores: { game: result } } sends results up and
// returns the board as it stands after them. On Vercel the board lives in an
// Upstash Redis database (Storage → Upstash for Redis, connected to the project).

// Bump along with the client's BEST_KEY when a game's scoring changes.
const KEY = "arcade-records-v3";

// Plausible results only. This won't stop a determined cheat, but it keeps
// garbage and impossible numbers off the board.
const VALID = {
    // Five frames, ten-pin scoring.
    bowling: (n) => Number.isInteger(n) && n > 0 && n <= 150,
    // Seconds; three laps of the circuit at full boost take about 27.
    race: (n) => n >= 15 && n <= 3600,
    bugs: (n) => n > 0 && n <= 1_000_000,
    riff: (n) => n > 0 && n <= 1_000_000,
    // Wins only, stored as goal difference × 100 + goals scored.
    head: (n) => Number.isInteger(n) && n > 100 && Math.floor(n / 100) <= n % 100,
};

// The store keeps the highest value per game, so race times go in negated.
const toStored = (id, score) => (id === "race" ? -score : score);

const redisStore = () => {
    const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    const pipeline = async (commands) => {
        const res = await fetch(`${url}/pipeline`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(commands),
        });
        if (!res.ok) throw new Error(`Redis answered ${res.status}`);
        return (await res.json()).map((r) => {
            if (r.error) throw new Error(r.error);
            return r.result;
        });
    };
    return {
        // Writes each value unless the game already has a higher one, then
        // reads the whole board back.
        update: async (entries) => {
            const writes = entries.map(([id, value]) => ["ZADD", KEY, "GT", String(value), id]);
            const results = await pipeline([...writes, ["ZRANGE", KEY, "0", "-1", "WITHSCORES"]]);
            const flat = results.at(-1);
            const board = {};
            for (let i = 0; i < flat.length; i += 2) board[flat[i]] = Number(flat[i + 1]);
            return board;
        },
    };
};

// `store` is swapped for one in memory during development (see vite.config.js).
export const handle = async (request, store) => {
    if (!store) return Response.json({ error: "No records database" }, { status: 503 });
    let entries = [];
    if (request.method === "POST") {
        let scores;
        try {
            ({ scores } = await request.json());
        } catch {
            return Response.json({ error: "Bad JSON" }, { status: 400 });
        }
        entries = Object.entries(scores ?? {})
            .filter(([id, score]) => Object.hasOwn(VALID, id) && Number.isFinite(score) && VALID[id](score))
            .map(([id, score]) => [id, toStored(id, score)]);
    }
    const board = await store.update(entries);
    const records = {};
    for (const [id, value] of Object.entries(board)) {
        if (Object.hasOwn(VALID, id)) records[id] = toStored(id, value);
    }
    return Response.json({ records }, { headers: { "Cache-Control": "no-store" } });
};

export const GET = (request) => handle(request, redisStore());
export const POST = (request) => handle(request, redisStore());
