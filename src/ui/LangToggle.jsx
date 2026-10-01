import { useStore } from "../store";
import { useT } from "../i18n";

// TR / EN switch. The compact version fits the HUD's icon-button grid;
// tone picks colours for dark (title screen) or light (quick view) backdrops.
export const LangToggle = ({ compact = false, tone = "dark", className = "" }) => {
    const lang = useStore((s) => s.lang);
    const setLang = useStore((s) => s.setLang);
    const t = useT();
    const next = lang === "tr" ? "en" : "tr";

    if (compact) {
        return (
            <button
                onClick={() => setLang(next)}
                aria-label={t("lang.switch")}
                title={t("lang.switch")}
                className={`icon-btn font-display text-sm font-extrabold ${className}`}
            >
                {next.toUpperCase()}
            </button>
        );
    }

    return (
        <button
            onClick={() => setLang(next)}
            aria-label={t("lang.switch")}
            className={`flex rounded-full border-2 p-1 font-display text-sm font-extrabold ${
                tone === "dark" ? "border-white/60 bg-ink/30 backdrop-blur" : "border-ink/12 bg-white"
            } ${className}`}
        >
            {["tr", "en"].map((code) => {
                const active = code === lang;
                const colors =
                    tone === "dark"
                        ? active
                            ? "bg-paper text-ink"
                            : "text-white/80"
                        : active
                          ? "bg-ink text-white"
                          : "text-ink-soft";
                return (
                    <span key={code} className={`rounded-full px-3 py-1 transition ${colors}`}>
                        {code.toUpperCase()}
                    </span>
                );
            })}
        </button>
    );
};
