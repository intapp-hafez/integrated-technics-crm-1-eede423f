import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function AttendanceMap({
  center,
  title,
  subtitle,
  accuracy,
}: {
  center: [number, number];
  title?: string;
  subtitle?: string;
  accuracy?: number | null;
}) {
  return (
    <MapContainer center={center} zoom={15} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={center} icon={markerIcon}>
        <Popup>
          <div className="text-xs">
            {title && <div className="font-bold">{title}</div>}
            {subtitle && <div>{subtitle}</div>}
            {accuracy != null && <div className="mt-1 text-muted-foreground">Accuracy: ±{Math.round(accuracy)}m</div>}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}

export default AttendanceMap;
