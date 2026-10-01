// Side drawer on desktop, bottom sheet on phones.
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CloseIcon } from "./icons";
import { useT } from "../i18n";

const useIsMobile = () => {
    const query = "(max-width: 767px)";
    const [mobile, setMobile] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = () => setMobile(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);
    return mobile;
};

export const Drawer = ({ side = "right", label, onClose, children, closeTone = "light" }) => {
    const mobile = useIsMobile();
    const t = useT();
    const ref = useRef();
    const hidden = mobile ? { y: "105%" } : { x: side === "right" ? "112%" : "-112%" };

    useEffect(() => {
        ref.current?.focus({ preventScroll: true });
    }, []);

    return (
        <>
            <motion.div
                className="fixed inset-0 z-40 bg-ink/35 md:bg-ink/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.aside
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                className={`card fixed z-50 flex flex-col overflow-hidden outline-none
                    inset-x-0 bottom-0 max-h-[90dvh] rounded-b-none
                    md:inset-x-auto md:top-4 md:bottom-4 md:max-h-none md:w-[540px] md:rounded-[28px]
                    ${side === "right" ? "md:right-4" : "md:left-4"}`}
                initial={hidden}
                animate={{ x: 0, y: 0 }}
                exit={hidden}
                transition={{ type: "spring", damping: 30, stiffness: 280 }}
            >
                <button
                    onClick={onClose}
                    aria-label={t("common.close")}
                    className={`absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full transition hover:scale-105 active:scale-95 ${
                        closeTone === "light" ? "bg-white/25 text-white hover:bg-white/40" : "bg-ink/10 text-ink hover:bg-ink/15"
                    }`}
                >
                    <CloseIcon size={20} />
                </button>
                <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">{children}</div>
            </motion.aside>
        </>
    );
};

export const Section = ({ title, eyebrow, children }) => (
    <section>
        {eyebrow && <p className="eyebrow mb-0.5 text-ink-soft/70">{eyebrow}</p>}
        <h3 className="mb-3 font-display text-xl font-bold text-ink">{title}</h3>
        {children}
    </section>
);
