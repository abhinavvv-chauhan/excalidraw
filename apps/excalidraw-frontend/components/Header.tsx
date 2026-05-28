"use client";

import { PenTool, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string;
    link?: string;
    onClick?: () => void;
    icon?: JSX.Element;
  }[];
  className?: string;
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1, y: -100 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex max-w-fit fixed top-10 inset-x-0 mx-auto border border-white/[0.2] rounded-full bg-black/80 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] pr-2 pl-8 py-2 items-center justify-center space-x-4",
          className
        )}
      >
        {navItems.map((navItem: any, idx: number) => {
          if (navItem.onClick) {
            return (
              <button
                key={`link=${idx}`}
                onClick={navItem.onClick}
                className="border text-sm font-medium relative border-white/[0.2] text-white px-4 py-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="block sm:hidden">{navItem.icon}</span>
                <span className="hidden sm:block text-sm">{navItem.name}</span>
              </button>
            );
          }
          return (
            <Link
              key={`link=${idx}`}
              href={navItem.link || ""}
              className={cn(
                "relative text-neutral-50 items-center flex space-x-1 hover:text-neutral-300"
              )}
            >
              <span className="block sm:hidden">{navItem.icon}</span>
              <span className="hidden sm:block text-sm">{navItem.name}</span>
            </Link>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
};

interface User {
    id: string;
    email: string;
    name?: string;
}

const Header = () => {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        const userInfo = localStorage.getItem("user_info");
        if (userInfo) {
            setUser(JSON.parse(userInfo));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_info");
        localStorage.removeItem("personal_room_slug");
        setUser(null);
        router.push('/');
    };

    const handleGoToCanvas = () => {
        const personalSlug = localStorage.getItem('personal_room_slug');
        if (personalSlug) {
            router.push(`/canvas/${personalSlug}`);
        } else {
            router.push('/signin');
        }
    };

    const navItems = user
      ? [
          { name: "My Canvas", onClick: handleGoToCanvas },
          { name: "Logout", onClick: handleLogout },
        ]
      : [
          { name: "Sign In", link: "/signin" },
          { name: "Sign Up", link: "/signup" },
        ];

    return (
        <div className="relative w-full">
             <FloatingNav navItems={navItems} />
        </div>
    );
};

export default Header;