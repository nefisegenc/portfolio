import { ArcadeIsland } from "./ArcadeIsland";
import { Bowling } from "./Bowling";
import { BugHunt } from "./hunt/BugHunt";
import { Race } from "./race/Race";

// The island with its bowling lane, plus the Sky Circuit and the Bug Hunt
// arena, which float off on their own.
export const Arcade = () => (
    <>
        <ArcadeIsland>
            <Bowling />
        </ArcadeIsland>
        <Race />
        <BugHunt />
    </>
);
