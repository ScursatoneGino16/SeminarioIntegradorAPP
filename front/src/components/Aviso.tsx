import type { ReactNode } from 'react';

export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'error' | 'exito' | 'alerta'; children: ReactNode }) {
  return <div className={`aviso aviso-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>;
}
