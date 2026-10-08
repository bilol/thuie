"use client";

import * as React from "react";

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      {children}
    </div>
  );
}
