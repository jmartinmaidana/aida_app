import type { CSSProperties, ReactNode } from 'react';

interface Props {
    texto: ReactNode;
    tipo: string;
    className?: string;
    style?: CSSProperties;
}

export function Mensaje({ texto, tipo, className = '', style }: Props) {
    if (!texto) return null;
    return (
        <div className={`mensaje ${tipo} ${className}`} style={{ display: 'block', ...style }}>
            {texto}
        </div>
    );
}
