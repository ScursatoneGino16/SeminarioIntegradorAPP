import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Chip de filtro con borde y sombra pixelados (8bitcn no trae un "toggle chip" liviano). */
export function Chip8bit({ activo, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { activo: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      className={cn(
        'retro cursor-pointer rounded-[4px] border-2 border-ring px-2 py-1 text-[15px] leading-tight transition-transform',
        'active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        activo
          ? 'bg-primary text-primary-foreground shadow-[3px_3px_0_0_#0c0c18] [text-shadow:none]'
          : 'bg-[#0a0a26] text-foreground shadow-[3px_3px_0_0_#0c0c18] hover:text-primary',
        className,
      )}
      {...props}
    />
  );
}
