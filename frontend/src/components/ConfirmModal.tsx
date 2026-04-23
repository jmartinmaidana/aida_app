import { Warning, Trash, X } from '@phosphor-icons/react';

interface Props {
    isOpen: boolean;
    titulo: string;
    mensaje: string;
    onConfirm: () => void;
    onCancel: () => void;
    textoConfirmar?: string;
    textoCancelar?: string;
}

export function ConfirmModal({ isOpen, titulo, mensaje, onConfirm, onCancel, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar' }: Props) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <Warning size={32} color="#ef4444" weight="fill" />
                    <h3>{titulo}</h3>
                </div>
                <p>{mensaje}</p>
                <div className="modal-actions">
                    <button className="btn-cancelar" onClick={onCancel} style={{ marginTop: 0 }}>
                        <X size={18} /> {textoCancelar}
                    </button>
                    <button className="btn-accion-principal" onClick={onConfirm} style={{ backgroundColor: '#ef4444', width: 'auto', marginTop: 0 }}>
                        <Trash size={18} /> {textoConfirmar}
                    </button>
                </div>
            </div>
        </div>
    );
}