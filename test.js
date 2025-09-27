import polyline from '@mapbox/polyline';
const apiKey = 'AIzaSyD9vhPD7sZWUMOgb3KUDLujDdRwcbrJB_I';
const origin = '28.546575, -81.501180';
const destination = '28.530962, -81.405172';
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
