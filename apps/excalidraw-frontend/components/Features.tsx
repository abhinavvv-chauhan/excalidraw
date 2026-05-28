"use client";

import { Zap, Users, Share, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ✨ The cn function is now directly here!
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Aceternity UI's HoverEffect Component ---
export const HoverEffect = ({
  items,
  className,
}: {
  items: {
    icon: React.ComponentType<any>;
    title: string;
    description: string;
  }[];
  className?: string;
}) => {
  let [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2  lg:grid-cols-4  py-10",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          className="relative group  block p-2 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-neutral-200 dark:bg-slate-800/[0.8] block  rounded-3xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <div className="rounded-2xl h-full w-full p-8 overflow-hidden bg-gray-800/50 backdrop-blur-sm border border-transparent dark:border-white/[0.2] group-hover:border-slate-700 relative z-20">
            <div className="relative z-50">
              <item.icon className="h-12 w-12 text-white mb-6" />
              <h3 className="text-xl font-semibold text-white mb-4">{item.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">{item.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};


// --- Your Updated Features Component ---
const Features = () => {
  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Start sketching instantly. No loading screens, no heavy interfaces."
    },
    {
      icon: Users,
      title: "Real-time Collaboration",
      description: "Work together with your team in real-time. See changes as they happen."
    },
    {
      icon: Share,
      title: "Export Anywhere",
      description: "Export your drawings as PNG, SVG, or share with a simple link."
    },
    {
      icon: Smartphone,
      title: "Works Everywhere",
      description: "Draw on any device. Desktop, tablet, or mobile - it just works."
    }
  ];

  return (
    <section className="py-24 bg-black-900 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Everything you need to
            <span className="block text-gray-400">create amazing drawings</span>
          </h2>
        </div>
        
        <HoverEffect items={features} />

      </div>
    </section>
  );
};

export default Features;