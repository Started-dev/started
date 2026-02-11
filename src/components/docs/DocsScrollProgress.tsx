import { useEffect, useState } from "react";

export function DocsScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handler = () => {
      const el = document.getElementById("docs-content-area");
      if (!el) return;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };

    const el = document.getElementById("docs-content-area");
    el?.addEventListener("scroll", handler, { passive: true });
    return () => el?.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="fixed top-12 left-0 right-0 z-30 h-0.5 bg-transparent pointer-events-none">
      <div
        className="h-full bg-primary transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
