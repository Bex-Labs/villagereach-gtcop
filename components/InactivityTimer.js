"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const LIMIT_MS = 60 * 60 * 1000; // 60 minutes (A-01 AC4, to confirm with VillageReach)
const KEY = "gtcop-last-activity";

// Shared between tabs, so working in one tab keeps the others signed in too
function readLast() {
  try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; }
}
function writeLast(time) {
  try { localStorage.setItem(KEY, String(time)); } catch { /* storage blocked: this tab still works */ }
}

export default function InactivityTimer() {
  useEffect(() => {
    let last = Date.now();
    let lastSaved = 0;
    writeLast(last);

    const onActivity = () => {
      last = Date.now();
      if (last - lastSaved > 15000) { // save at most every 15 seconds
        writeLast(last);
        lastSaved = last;
      }
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    // Check once a minute
    const timer = setInterval(async () => {
      const newest = Math.max(last, readLast());
      if (Date.now() - newest >= LIMIT_MS) {
        clearInterval(timer);
        await createClient().auth.signOut();
        window.location.href = "/sign-in?expired=1";
      }
    }, 60 * 1000);

    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, []);

  return null; // nothing to show
}