// Thin wrapper so the rest of the app doesn't depend on the analytics vendor.
// Vercel Web Analytics is cookie-free; custom events need a Vercel Pro plan
// and are simply ignored otherwise.
import { track as vercelTrack } from "@vercel/analytics";

export const track = (name, data) => {
    try {
        vercelTrack(name, data);
    } catch {
        // Analytics must never break the site.
    }
};
