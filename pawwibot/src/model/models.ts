export class conversation {
    id: number
    cc: number
    address: string

    // Lista de todos los perros que tiene guardados este usuario
    dogs: {
        nombre: string
        descripcion: string
    }[]

    // Perro actualmente seleccionado
    selectedDog?: {
        nombre: string
        descripcion: string
    }

    // Datos del servicio solicitado
    tipoServicio: string
    tiempoServicio: string
    inicioServicio: string
}
