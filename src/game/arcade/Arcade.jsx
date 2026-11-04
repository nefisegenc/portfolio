import { ArcadeIsland } from "./ArcadeIsland";
import { Bowling } from "./Bowling";
import { BugSmash } from "./BugSmash";
import { Race } from "./Race";

export const Arcade = () => (
    <ArcadeIsland>
        <Bowling />
        <Race />
        <BugSmash />
    </ArcadeIsland>
);
