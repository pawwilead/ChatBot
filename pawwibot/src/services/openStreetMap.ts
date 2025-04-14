import fetch from 'node-fetch';

interface NominatimResult {
  display_name: string;
  [key: string]: any;
}

export async function getLocalidadDesdeDireccion(direccion: string): Promise<{ barrio: string | null, localidad: string | null }> {
  const query = encodeURIComponent(`${direccion}, Bogotá, Colombia`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${query}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PawwiBot/1.0'
      }
    });

    const data = await res.json() as NominatimResult[];

    if (data.length > 0 && data[0].address) {
      const address = data[0].address;

      // Extraer localidad
      let localidad = address.city_district || address.city || null;
      if (localidad?.toLowerCase() === 'bogotá') {
        localidad = address.suburb || address.neighbourhood || null;
      }
      if (localidad?.toLowerCase().includes('localidad')) {
        localidad = localidad.replace(/localidad\s*/i, '').trim();
      }

      // Extraer barrio
      let barrio = address.neighbourhood || address.suburb || null;
      if (barrio?.toLowerCase().includes('localidad')) {
        barrio = barrio.replace(/localidad\s*/i, '').trim();
      }

      // Si barrio no se encontró, usar la localidad como barrio
      if (!barrio) barrio = localidad;

      return { barrio, localidad };
    }
  } catch (err) {
    console.error('Error buscando barrio/localidad:', err);
  }

  return { barrio: null, localidad: null };
}



export async function getCiudadDesdeDireccion(direccion: string): Promise<string | null> {
  const query = encodeURIComponent(`${direccion}, Colombia`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${query}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PawwiBot/1.0'
      }
    });

    const data = await res.json() as NominatimResult[];

    if (data.length > 0 && data[0].address) {
      return data[0].address.city || data[0].address.town || data[0].address.village || null;
    }
  } catch (err) {
    console.error('Error buscando ciudad:', err);
  }

  return null;
}
