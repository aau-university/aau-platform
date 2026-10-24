'use client'

import * as React from 'react'

export function ShimmerButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[
        'relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-secondary via-yellow-500 to-secondary text-primary px-6 py-2.5 font-bold shadow-md hover:shadow-gold hover:brightness-105 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
      {...props}
    >
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-[shimmer_3s_infinite_linear]" />
      <span className="relative z-10 flex items-center gap-1.5 text-sm">
        {children}
      </span>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-12deg); }
          100% { transform: translateX(150%) skewX(-12deg); }
        }
      `}</style>
    </button>
  )
}
export default ShimmerButton
