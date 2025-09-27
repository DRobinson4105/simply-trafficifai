import polyline from '@mapbox/polyline';
const apiKey = 'AIzaSyD9vhPD7sZWUMOgb3KUDLujDdRwcbrJB_I';
const origin = '25.758209, -80.373659';
const destination = '25.479467, -80.427881';
import fs from 'fs';
async function getRoute() {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  const encoded = data.routes[0].overview_polyline.points;
  const coords = polyline.decode(encoded).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

  console.log(coords);
  
  fs.writeFileSync('route.json', JSON.stringify(coords, null, 2));
}

getRoute();
