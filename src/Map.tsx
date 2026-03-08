import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface UserProfile {
  uid: string;
  name: string;
  skillHave: string;
  skillWant: string;
  location?: { lat: number; lng: number };
}

export default function MapView() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'users'), where('uid', '!=', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedUsers: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as UserProfile;
          if (data.location) {
            fetchedUsers.push(data);
          }
        });
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching map users:", error);
      }
    };

    fetchUsers();
  }, [user]);

  const defaultCenter: [number, number] = profile?.location 
    ? [profile.location.lat, profile.location.lng] 
    : [37.7749, -122.4194]; // Default to SF

  return (
    <div className="h-[calc(100vh-12rem)] w-full rounded-[2.5rem] overflow-hidden border border-white/10 relative z-10">
      <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom={true} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Current User Marker */}
        {profile?.location && (
          <Marker position={[profile.location.lat, profile.location.lng]}>
            <Popup className="custom-popup">
              <div className="text-black p-2">
                <h3 className="font-bold text-lg">You</h3>
                <p className="text-sm">Here you are!</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Other Users Markers */}
        {users.map((u) => (
          <Marker key={u.uid} position={[u.location!.lat, u.location!.lng]}>
            <Popup className="custom-popup">
              <div className="text-black p-2">
                <h3 className="font-bold text-lg mb-1">{u.name}</h3>
                <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">
                  Has: {u.skillHave}
                </p>
                <button 
                  onClick={() => navigate(`/chat/${u.uid}`)}
                  className="bg-black text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-gray-800 transition-colors cursor-pointer w-full"
                >
                  Message
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
