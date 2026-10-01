import { landmarks } from "../data/world";
import { useStore } from "../store";
import { EntranceRing, LandmarkLabel, PosterSign } from "./parts";
import { POSTER_OFFSET } from "./scenery";
import { Atelier } from "./landmarks/Atelier";
import { FirstOffice } from "./landmarks/FirstOffice";
import { Home } from "./landmarks/Home";
import { NatureCafe } from "./landmarks/NatureCafe";
import { PhoneKiosk } from "./landmarks/PhoneKiosk";
import { TaskBoard } from "./landmarks/TaskBoard";
import { Observatory } from "./landmarks/Observatory";
import { ParamTechLab } from "./landmarks/ParamTechLab";
import { ParamTower } from "./landmarks/ParamTower";
import { RimeStage } from "./landmarks/RimeStage";
import { SoapShop } from "./landmarks/SoapShop";

const MODELS = {
    soap: SoapShop,
    nature: NatureCafe,
    mobile: PhoneKiosk,
    tasks: TaskBoard,
    rime: RimeStage,
    param: ParamTower,
    paramtech: ParamTechLab,
    home: Home,
    isimiz: FirstOffice,
    arts: Atelier,
    hypatia: Observatory,
};

const Landmark = ({ landmark }) => {
    const Model = MODELS[landmark.kind];
    const active = useStore((s) => s.nearby === landmark.id);
    const discovered = useStore((s) => landmark.type !== "project" || s.discovered.includes(landmark.id));
    return (
        <group position={[landmark.x, 0, landmark.z]} rotation-y={landmark.rotY}>
            <Model />
            {landmark.type === "project" && (
                <PosterSign
                    url={`/img/posters/${landmark.id}.webp`}
                    position={[POSTER_OFFSET.x, 0, POSTER_OFFSET.z]}
                    rotation-y={POSTER_OFFSET.rot}
                />
            )}
            <EntranceRing color={landmark.color} active={active} />
            <LandmarkLabel landmark={landmark} active={active} discovered={discovered} />
        </group>
    );
};

export const Landmarks = () =>
    landmarks.map((landmark) => <Landmark key={landmark.id} landmark={landmark} />);
