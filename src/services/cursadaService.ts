import { CursadasRepository } from "../repositories/cursadaRepository.js";
import { AcademicoService } from "./academicoService.js";
export class CursadaService {
    static async verificarCursadaValida( lu: string, idMateria: string, año: string, cuatrimestre: string, nota: string ) {
        
        if (!lu || !idMateria || !año || !cuatrimestre || nota === undefined) {
            const error: any = new Error("Falta completar datos.");
            error.statusCode = 400; // Le avisamos al errorHandler que es culpa del usuario (Bad Request)
            throw error;        
        }

        const notaNum = parseInt(nota);

        if (notaNum < 1 || notaNum > 10) {  //isNan(notaNum)
            const error: any = new Error("La nota debe ser un número entero entre 1 y 10.");
            error.statusCode = 400;
            throw error;        
        }
     
        const nuevaCursada = await AcademicoService.procesarCursadaAprobada(
            lu, idMateria, año, cuatrimestre, notaNum 
        );

        return nuevaCursada;
    }
}