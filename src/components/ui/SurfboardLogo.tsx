"use client";

import { cn } from "@/lib/utils/cn";

interface SurfboardLogoProps {
  className?: string;
  variant?: "blue" | "white" | "dark";
  showWordmark?: boolean;
  size?: number;
}

export function SurfboardLogo({
  className,
  variant = "blue",
  showWordmark = true,
  size = 32,
}: SurfboardLogoProps) {
  const fills = {
    blue: {
      arm: "url(#grad_arm_blue)",
      body: "url(#grad_body_blue)",
      torso: "url(#grad_torso)",
      head: "#0e44e1",
      wave: "url(#grad_wave_blue)",
      text: "#0e44e1",
    },
    white: {
      arm: "#ffffff",
      body: "#ffffffcc",
      torso: "#ffffffaa",
      head: "#ffffff",
      wave: "#ffffff",
      text: "#ffffff",
    },
    dark: {
      arm: "url(#grad_arm_blue)",
      body: "url(#grad_body_blue)",
      torso: "url(#grad_torso)",
      head: "#0a0a0a",
      wave: "#0a0a0a",
      text: "#0a0a0a",
    },
  };

  const f = fills[variant];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 271.51 225.06"
        width={size}
        height={size * (225.06 / 271.51)}
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="grad_arm_blue"
            x1="95.26"
            y1="81.38"
            x2="213.3"
            y2="72.8"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#0e44e1" />
            <stop offset="1" stopColor="#0d33b8" />
          </linearGradient>
          <linearGradient
            id="grad_body_blue"
            x1="62.1"
            y1="156.6"
            x2="177.35"
            y2="109.34"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#0e44e1" />
            <stop offset="1" stopColor="#041669" />
          </linearGradient>
          <linearGradient
            id="grad_torso"
            x1="76.18"
            y1="84.45"
            x2="214.26"
            y2="160.99"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#041c23" />
            <stop offset="0.3" stopColor="#052026" />
            <stop offset="0.52" stopColor="#08282d" />
            <stop offset="0.72" stopColor="#052027" />
            <stop offset="1" stopColor="#041c23" />
          </linearGradient>
          <linearGradient
            id="grad_wave_blue"
            y1="200.41"
            x2="271.51"
            y2="200.41"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#0d33b8" />
            <stop offset="1" stopColor="#0e44e1" />
          </linearGradient>
        </defs>
        <g>
          <path
            fill={f.arm}
            d="M221.05,81.25c-.92,3.67-27.58,2.07-52.47,4.67-2-.77-4.15-1.47-6.35-2.11C136.22,76.26,97,83,69.86,97.22,90.44,81.8,122.56,64.1,152,63.35,201.87,62.07,222.33,76.14,221.05,81.25Z"
          />
          <path
            fill={f.body}
            d="M168.63,97.87s-32-16.62-69,14.07-47.31,72.88-39.64,78,16.62-32,51.15-57.54c20.55-15.22,49.88-27.71,65.22-6.19C192.91,137.3,168.63,97.87,168.63,97.87Z"
          />
          <path
            fill={f.torso}
            d="M190.36,183.55s7.45-87.84-74.88-82.3h0c-9,.74-21.52,6.15-33.93,11.65-17.75,8-31.34,9-33.09,6.71-1.57-2.1,7.15-11.7,21.43-22.39C97,83,136.22,76.26,162.23,83.81c2.2.64,4.33,1.34,6.35,2.11,20.53,7.68,32.36,21.58,35.85,41.36C211,164.57,196.76,188.66,190.36,183.55Z"
          />
          <circle fill={f.head} cx="152" cy="32.66" r="21.74" />
          <path
            fill={f.wave}
            d="M9.85,205.58s103.79,40.62,205.39,4.54c56.42-20,64.86-37.54,49.48-33.87-62.85,15-162.58,30.31-219.22,21.46C-13.87,188.43-2.41,198.24,9.85,205.58Z"
          />
        </g>
      </svg>
      {showWordmark && (
        <span
          className="font-heading font-semibold tracking-tight leading-none"
          style={{ color: f.text }}
        >
          Surfboard
        </span>
      )}
    </span>
  );
}
