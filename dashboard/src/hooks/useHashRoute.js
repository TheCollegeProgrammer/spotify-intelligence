import { useCallback, useEffect, useState } from "react";
import { PAGE_META } from "../data/dataset";

const VALID = new Set(Object.keys(PAGE_META));

function parseHash() {
  const match = window.location.hash.match(/^#\/([a-z]+)$/);
  return match && VALID.has(match[1]) ? match[1] : "overview";
}

export default function useHashRoute() {
  const [view, setView] = useState(parseHash);

  useEffect(() => {
    const handler = () => setView(parseHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((next) => {
    if (!VALID.has(next)) return;
    setView(next);
    const target = `#/${next}`;
    if (window.location.hash !== target) window.location.hash = target;
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      window.scrollTo(0, 0);
    }
  }, []);

  return { view, navigate };
}
