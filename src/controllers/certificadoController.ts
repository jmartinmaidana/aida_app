import { Request, Response } from 'express';
import { CertificadoService } from '../services/certificadoService.js';
import { TituloEnTramiteService } from '../services/tituloEnTramiteService.js';
import archiver from 'archiver';
import path from 'path';
import { AuditoriaRepository } from '../repositories/auditoriaRepository.js';

export class CertificadoController {

    // POST: Descargar certificado individual (HTML)
    static async generarPorLuController(req: Request, res: Response) {
        const { lu } = req.body;
        
        if (!lu) {
            const error: any = new Error("Falta la LU.");
            error.statusCode = 400;
            throw error;
        }
        
        const rutaArchivo = await CertificadoService.generarPorLU(lu);
        
        await AuditoriaRepository.registrar(req.session.usuario!.id, 'EMITIR_CERTIFICADO', `Emitió certificado individual para LU: ${lu}`);
        
        res.download(rutaArchivo, `Certificado_${lu.replace('/', '-')}.html`);
    }

    // POST: Iniciar trámite de título
    static async iniciarTramiteController(req: Request, res: Response) {
        const { lu } = req.body;
        
        if (!lu) {
            const error: any = new Error("Falta la LU.");
            error.statusCode = 400;
            throw error;
        }

        await TituloEnTramiteService.iniciarTramiteTitulo(lu);
        
        await AuditoriaRepository.registrar(req.session.usuario!.id, 'INICIAR_TRAMITE', `Inició trámite de título para LU: ${lu}`);
        
        res.status(200).json({ estado: "exito", mensaje: "Trámite de título iniciado con la fecha de hoy." });
    }

    // POST: Generar y descargar ZIP masivo
    static async generarZipPorFechaController(req: Request, res: Response) {
        const { fecha } = req.body;
        
        if (!fecha) {
            const error: any = new Error("Debe ingresar una fecha válida.");
            error.statusCode = 400;
            throw error;
        }

        const rutasArchivos = await CertificadoService.generarPorFecha(fecha);

        await AuditoriaRepository.registrar(req.session.usuario!.id, 'EMISION_MASIVA_CERTIFICADOS', `Emitió ZIP de certificados para la fecha: ${fecha}`);

        // 1. Forzamos los encabezados de descarga ZIP
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=certificados_${fecha}.zip`);

        const archive = archiver('zip', { zlib: { level: 9 } });

        // 2. Manejo de errores del compresor
        archive.on('error', (err) => {
            console.error("Error en el compresor ZIP:", err);
            if (!res.headersSent) {
                res.status(500).send({ error: err.message });
            }
        });

        // 3. Canalizar la salida directamente a la respuesta
        archive.pipe(res);

        // 4. Agregar archivos al ZIP
        for (const ruta of rutasArchivos) {
            const nombreArchivo = path.basename(ruta);
            archive.file(ruta, { name: nombreArchivo });
        }

        // 5. Finalizar y enviar
        await archive.finalize();
        console.log(`ZIP enviado exitosamente para la fecha: ${fecha}`);
    }
}