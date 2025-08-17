import React from "react";

export default function Spinner({ size = 24, label }) {
  return (
    <div className="flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="animate-spin"
        aria-label={label || "Yükleniyor"}
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" fill="none" />
      </svg>
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}
