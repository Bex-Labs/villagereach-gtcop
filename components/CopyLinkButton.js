"use client";

import { useState } from "react";

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Some browsers block copying: show the link so it can be copied by hand
      window.prompt("Copy this link:", window.location.href);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className="btn btn-outline" onClick={copy}>
      {copied ? "Link copied ✓" : "Copy link"}
    </button>
  );
}