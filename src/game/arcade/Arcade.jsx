import { ArcadeIsland } from "./ArcadeIsland";
import { Bowling } from "./Bowling";
import { HeadToHead } from "./head/HeadBall";
import { BugHunt } from "./hunt/BugHunt";
import { Race } from "./race/Race";
import { Riff } from "./riff/Riff";

// The island with its bowling lane, plus the Sky Circuit, the Bug Hunt
// arena, Riff Rush's stage and Head to Head's stadium, which float off on
// their own.
export const Arcade = () => (
    <>
        <ArcadeIsland>
            <Bowling />
        </ArcadeIsland>
        <Race />
        <BugHunt />
        <Riff />
        <HeadToHead />
    </>
);
