const C = {
  bg: "#111318",
  surface: "#1c1f26",
  surfaceHover: "#22262f",
  border: "#2a2d35",
  borderLight: "#32363f",
  textPrimary: "#eaedf2",
  textSecondary: "#7a8090",
  textMuted: "#4a4f5c",
  gold: "#c8a96e",
  goldBg: "#1e1a12",
  goldBorder: "#3a3020",
  teal: "#7eb8a4",
  tealBg: "#101e1b",
  tealBorder: "#1e3530",
  red: "#c0675a",
  redBg: "#1e1212",
  green: "#6aab8e",
  greenBg: "#0f1e17",
  purple: "#9b8ec4",
  purpleBg: "#18141e",
};

export { C };

import { createElement } from 'react';

export function Tag({ children, color = C.gold, bg = C.goldBg }) {
  return createElement('span', {
    style: {
      background: bg,
      color,
      border: `1px solid ${color}33`,
      borderRadius: 6,
      padding: "2px 8px",
      fontSize: 11,
      fontWeight: 600,
    },
  }, children);
}
