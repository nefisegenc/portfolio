import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../store";
import { getLandmark } from "../data/world";
import { landmarkLabel, useLang, useT } from "../i18n";
import { StarIcon } from "./icons";

const Toast = ({ toast }) => {
    const openPanel = useStore((s) => s.openPanel);
    const dismiss = useStore((s) => s.dismissToast);
    const lang = useLang();
    const t = useT();

    if (toast.kind === "complete") {
        return (
            <div className="card flex items-center gap-3 border-sun py-3 pl-3 pr-4">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-sun text-ink shadow-[0_3px_0_#c9951a]">
                    <StarIcon size={22} />
                </span>
                <div className="min-w-0">
                    <p className="eyebrow text-[#B7831A]">{t("toast.achievement")}</p>
                    <p className="font-display text-lg font-bold leading-tight">{t("toast.explorer")}</p>
                    <p className="text-sm font-semibold text-ink-soft">{t("toast.allFound")}</p>
                </div>
                <button
                    className="btn pointer-events-auto ml-1 flex-none px-3.5 py-2 text-sm"
                    style={{ "--c": "#F07A4A" }}
                    onClick={() => {
                        dismiss(toast.id);
                        openPanel({ type: "about" });
                    }}
                >
                    {t("toast.sayHi")}
                </button>
            </div>
        );
    }

    return (
        <div className="card flex items-center gap-3 py-2.5 pl-2.5 pr-5" style={{ borderColor: toast.color }}>
            <span className="grid h-10 w-10 flex-none place-items-center rounded-full text-white" style={{ background: toast.color }}>
                <StarIcon size={18} />
            </span>
            <div>
                <p className="eyebrow" style={{ color: toast.color }}>
                    {t("toast.new", { n: toast.count, total: toast.total })}
                </p>
                <p className="font-display text-lg font-bold leading-tight">{landmarkLabel(getLandmark(toast.landmarkId), lang)}</p>
            </div>
        </div>
    );
};

export const Toasts = () => {
    const toasts = useStore((s) => s.toasts);
    return (
        <div className="pointer-events-none fixed inset-x-0 top-[92px] z-[60] flex flex-col items-center gap-2 px-3 md:top-6">
            <AnimatePresence>
                {toasts.map((t) => (
                    <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: -24, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.95 }}
                        transition={{ type: "spring", damping: 20, stiffness: 340 }}
                    >
                        <Toast toast={t} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

// Short fade that hides the night switch and fast travel jumps.
export const Flash = () => {
    const flash = useStore((s) => s.flash);
    const night = useStore((s) => s.night);
    if (flash === 0) return null;
    return (
        <motion.div
            key={flash}
            className="pointer-events-none fixed inset-0 z-[65]"
            style={{ background: night ? "#0B1030" : "#FFF6EA" }}
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
        />
    );
};
