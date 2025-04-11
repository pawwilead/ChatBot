import fetch from 'node-fetch';

interface NominatimResult {
  display_name: string;
  [key: string]: any;
}

export async function getLocalidadDesdeDireccion(direccion: string): Promise<string | null> {
  const query = encodeURIComponent(`${direccion}, Bogotá, Colombia`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PawwiBot/1.0'
      }
    });

    const data = await res.json() as NominatimResult[];

    if (data.length > 0) {
      return data[0].display_name || null;
    }
  } catch (err) {
    console.error('Error buscando barrio/localidad:', err);
  }

  return null;
}
