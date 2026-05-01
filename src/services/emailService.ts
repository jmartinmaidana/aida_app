import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
    // Configuramos el "transporte" (el servidor de correo que usaremos, por defecto Gmail)
    private static transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: Number(process.env.EMAIL_PORT) === 465, // Automáticamente true si usamos el puerto 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        family: 4, 
    } as any); // "as any" evita que TypeScript bloquee la compilación por la propiedad 'family'

    static async enviarCorreoActivacion(emailDestino: string, token: string): Promise<boolean> {
        try {
            // URL base de tu aplicación (localhost en tu PC, o la URL de Render en producción)
            const urlApp = process.env.APP_URL || 'http://localhost:3000';
            const linkActivacion = `${urlApp}/app/activar-cuenta`;

            const mailOptions = {
                from: `"Sistema AIDA" <${process.env.EMAIL_USER}>`,
                to: emailDestino,
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
            };

            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error("Error al enviar correo de activación:", error);
            return false;
        }
    }
}
