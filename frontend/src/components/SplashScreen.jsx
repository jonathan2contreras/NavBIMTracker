import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { LOGOS } from "../lib/theme";

export const SPLASH_DURATION = 6000;
export const SPLASH_VARIANTS = ["sequence", "stack", "slide", "zoom"];

const SEQ_STEP = SPLASH_DURATION / LOGOS.length; // 2000ms per logo

// Cycles through the three logos, one visible at a time.
function useLogoCycle() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= LOGOS.length - 1) return undefined;
    const t = setTimeout(() => setI((v) => v + 1), SEQ_STEP);
    return () => clearTimeout(t);
  }, [i]);
  return i;
}

const ProgressBar = ({ dark }) => (
  <div className="absolute bottom-10 left-1/2 h-1 w-40 -translate-x-1/2 overflow-hidden rounded-full"
    style={{ backgroundColor: dark ? "rgba(255,255,255,0.15)" : "#E5E5EA" }}>
    <motion.div
      className="h-full rounded-full"
      style={{ backgroundColor: dark ? "#FFFFFF" : "#1C1C1E" }}
      initial={{ width: "0%" }}
      animate={{ width: "100%" }}
      transition={{ duration: SPLASH_DURATION / 1000, ease: "linear" }}
    />
  </div>
);

function SequenceVariant() {
  const i = useLogoCycle();
  return (
    <div className="flex h-full w-full items-center justify-center bg-white">
      <AnimatePresence mode="wait">
        <motion.img
          key={i}
          src={LOGOS[i].src}
          alt={LOGOS[i].key}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-h-[120px] max-w-[80%] object-contain"
        />
      </AnimatePresence>
      <ProgressBar />
    </div>
  );
}

function StackVariant() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-9 bg-white">
      {LOGOS.map((l, idx) => (
        <motion.img
          key={l.key}
          src={l.src}
          alt={l.key}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: idx * 0.4, ease: "easeOut" }}
          className="h-[64px] max-w-[78%] object-contain sm:h-[76px]"
        />
      ))}
      <ProgressBar />
    </div>
  );
}

function SlideVariant() {
  const i = useLogoCycle();
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-white">
      <AnimatePresence mode="wait">
        <motion.img
          key={i}
          src={LOGOS[i].src}
          alt={LOGOS[i].key}
          initial={{ opacity: 0, x: 90 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -90 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="max-h-[120px] max-w-[80%] object-contain"
        />
      </AnimatePresence>
      <ProgressBar />
    </div>
  );
}

function ZoomVariant() {
  const i = useLogoCycle();
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0B0B0C]">
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.12 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center justify-center rounded-3xl bg-white px-10 py-8 shadow-2xl"
        >
          <img src={LOGOS[i].src} alt={LOGOS[i].key} className="max-h-[100px] max-w-[70vw] object-contain" />
        </motion.div>
      </AnimatePresence>
      <ProgressBar dark />
    </div>
  );
}

const RENDERERS = {
  sequence: SequenceVariant,
  stack: StackVariant,
  slide: SlideVariant,
  zoom: ZoomVariant,
};

export const SplashScreen = ({ variant = "stack", onFinish }) => {
  useEffect(() => {
    if (!onFinish) return undefined;
    const t = setTimeout(onFinish, SPLASH_DURATION);
    return () => clearTimeout(t);
  }, [onFinish]);

  const Renderer = RENDERERS[variant] || StackVariant;
  return (
    <motion.div
      className="fixed inset-0 z-[100]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      data-testid="splash-screen"
    >
      <Renderer />
    </motion.div>
  );
};
