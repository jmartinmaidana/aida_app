// c:\Users\Martin\Escritorio\TPBDD\src\services\emailService.ts

import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Inicializamos el cliente de Resend con la clave de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
    static async enviarCorreoActivacion(emailDestino: string, token: string): Promise<boolean> {
        try {
            // URL base de tu aplicación
            const urlApp = process.env.APP_URL || 'http://localhost:3000';
            const linkActivacion = `${urlApp}/app/activar-cuenta`;

            // Enviamos el correo usando la API de Resend
            const { data, error } = await resend.emails.send({
                // Nota: Resend proporciona un email de prueba (onboarding@resend.dev) 
                // Puedes usar tu propio dominio una vez verificado.
                from: `"Sistema AIDA" <onboarding@resend.dev>`, 
                to: [emailDestino],
                subject: 'Bienvenido a AIDA - Activa tu cuenta',
                html: `
                    <h2>¡Bienvenido al Sistema de Gestión Académica AIDA!</h2>
                    <p>Tu cuenta como alumno ha sido creada. Para establecer tu contraseña y acceder al sistema, haz clic en el botón e ingresa el siguiente <b>código de activación</b>:</p>
                    <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px dashed #cbd5e1;">
                        <span style="font-size: 16px; font-weight: bold; color: #0f172a; word-break: break-all;">${token}</span>
                    </div>
                    <a href="${linkActivacion}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Ir a la página de activación</a>
                    <p style="margin-top: 20px; color: #64748b; font-size: 14px;"><i>Este código expirará en 24 horas.</i></p>
                `,
            });

            if (error) {
                console.error("❌ Error de la API de Resend:", error);
                return false;
            }

            console.log("✅ Correo de activación enviado con éxito (ID:", data?.id, ")");
            return true;
            
        } catch (error) {
            console.error("❌ Excepción al enviar correo de activación:", error);
            return false;
        }
    }
}
