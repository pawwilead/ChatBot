export class conversation {
    id: number
    cc: number
    address: string

    selectedDog: string
    newDog: string
    newDogDescription: string

    tipoServicio: string
    tiempoServicio: string
    inicioServicio: string
}

export class perro {
    nombre: string
    descripcion: string
}

export class paseador {
    cc:number
    cantidadPaseos: number
    valoracion: number
}
