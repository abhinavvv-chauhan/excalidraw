import { ReactNode } from "react";

export function IconButton({icon, onClick, activated, disabled }: {
    icon: ReactNode;
    onClick: () => void;
    activated?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`p-2 rounded-md  transition-all duration-200 
                ${activated ? "bg-blue-500/60 text-white cursor-pointer scale-110" : "hover:bg-gray-700/80 text-gray-300"}
                ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
            `}
        >
            {icon}
        </button>
    );
}
