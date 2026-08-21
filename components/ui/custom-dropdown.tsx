"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomDropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomDropdownOption[] | string[];
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  dropdownClassName?: string;
  disabled?: boolean;
}

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select option",
  icon,
  className = "",
  dropdownClassName = "",
  disabled = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize options to object format
  const normalizedOptions: CustomDropdownOption[] = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs text-left transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? "border-[#f5b642] bg-[#1a150e] ring-1 ring-[#f5b642] text-white"
            : "border-[#2e2e2e] bg-[#161616] text-zinc-300 hover:border-[#f5b642]/60 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {icon && <span className="text-[#f5b642] shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#f5b642] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-amber-300" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1.5 w-full min-w-[160px] max-h-60 overflow-y-auto rounded-2xl border-2 border-[#f5b642]/80 bg-[#120e09] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 divide-y divide-[#221c13] ${dropdownClassName}`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition font-mono cursor-pointer ${
                  isSelected
                    ? "bg-[#2a2012] text-[#f5b642] font-bold"
                    : "text-zinc-300 hover:bg-[#1a140d] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#f5b642] shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
