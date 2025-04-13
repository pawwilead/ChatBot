export class conversation {
    id: string
    cc: number
    name: string

    // Lista de todos los perros que tiene guardados este usuario
    dogs: {
        nombre: string
        raza: string
        edad: string
        peso:string
        descripcion: string
    }[]

    // Perro actualmente seleccionado
    selectedDog?: {
        nombre: string
        raza: string
        edad: string
        peso:string
        descripcion: string
    }

    // Datos del servicio solicitado
    address: string
    tipoServicio: string
    fechaServicio: string
    inicioServicio: string
    tiempoServicio: string
    ciudad: String
    barrio: string
    precio: number
}
