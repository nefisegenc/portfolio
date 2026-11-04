import { ArcadeIsland } from "./ArcadeIsland";
import { Bowling } from "./Bowling";
import { BugSmash } from "./BugSmash";
import { Race } from "./race/Race";

// The island and its games, plus the Sky Circuit, which floats off on its own.
export const Arcade = () => (
    <>
        <ArcadeIsland>
            <Bowling />
            <BugSmash />
        </ArcadeIsland>
        <Race />
    </>
);
