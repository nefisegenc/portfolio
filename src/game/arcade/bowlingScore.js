// Ten-pin scoring over a short game. A strike scores 10 plus the next two
// rolls, a spare 10 plus the next one; the last frame gets its bonus rolls
// in place.
export const BOWLING_FRAMES = 5;

const sum = (rolls) => rolls.reduce((a, b) => a + b, 0);
const isBonusFrame = (fr) => fr[0] === 10 || fr[0] + fr[1] === 10;

export const frameDone = (fr, last) => (last ? fr.length === (isBonusFrame(fr) ? 3 : 2) : fr[0] === 10 || fr.length === 2);

// Running total after each frame, or null while it still waits on bonus rolls.
export const frameTotals = (frames) => {
    const rolls = frames.flat();
    const out = [];
    let total = 0;
    let i = 0;
    let known = true;
    for (let f = 0; f < BOWLING_FRAMES; f++) {
        const fr = frames[f] ?? [];
        let add = null;
        if (f === BOWLING_FRAMES - 1) {
            if (fr.length && frameDone(fr, true)) add = sum(fr);
        } else if (fr[0] === 10) {
            if (rolls.length > i + 2) add = 10 + rolls[i + 1] + rolls[i + 2];
        } else if (fr.length === 2) {
            if (fr[0] + fr[1] < 10) add = fr[0] + fr[1];
            else if (rolls.length > i + 2) add = 10 + rolls[i + 2];
        }
        i += fr.length;
        if (add === null) known = false;
        if (known) total += add;
        out.push(known ? total : null);
    }
    return out;
};

// Score-sheet marks: X for a strike, / for a spare, – for a miss.
export const rollMarks = (fr = [], last = false) =>
    fr.map((n, i) => {
        // Whether this roll started on a full rack.
        const fresh = i === 0 || (last && (fr[i - 1] === 10 || (i === 2 && fr[0] + fr[1] === 10 && fr[0] !== 10)));
        if (fresh && n === 10) return "X";
        if (!fresh && fr[i - 1] + n === 10) return "/";
        return n === 0 ? "–" : String(n);
    });
