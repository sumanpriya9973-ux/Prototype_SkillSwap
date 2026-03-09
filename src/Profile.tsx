import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { MapPin } from 'lucide-react';

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [contactType, setContactType] = useState<'email' | 'whatsapp'>('email');
  const [skillHave, setSkillHave] = useState('');
  const [skillWant, setSkillWant] = useState('');
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setContact(profile.contact || '');
      setContactType(profile.contactType || 'email');
      setSkillHave(profile.skillHave || '');
      setSkillWant(profile.skillWant || '');
      setLocation(profile.location || null);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const profileData: any = {
        name,
        contact,
        contactType,
        skillHave,
        skillWant,
      };
      
      if (location) {
        profileData.location = location;
      }

      await updateProfile(profileData);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get location. Please allow location access.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-4xl font-medium tracking-tight mb-10">Your Profile</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8 bg-white/[0.03] border border-white/5 p-8 md:p-10 rounded-[2.5rem]">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Your Name</label>
          <input
            required
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors"
            placeholder="e.g. Jane Doe"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Contact Method</label>
            <select
              value={contactType}
              onChange={e => setContactType(e.target.value as 'email' | 'whatsapp')}
              className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/40 transition-colors appearance-none"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold">
              {contactType === 'email' ? 'Email Address' : 'Phone Number'}
            </label>
            <input
              required
              type={contactType === 'email' ? 'email' : 'tel'}
              value={contact}
              onChange={e => setContact(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors"
              placeholder={contactType === 'email' ? 'you@example.com' : '+1234567890'}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Skill You Have</label>
          <input
            required
            type="text"
            value={skillHave}
            onChange={e => setSkillHave(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors"
            placeholder="e.g. Frontend Engineering"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Skills You Want to Learn (Press Enter to add)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {skillWant.split(',').filter(s => s.trim()).map((skill, index) => (
              <div key={index} className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full text-sm">
                <span>{skill.trim()}</span>
                <button 
                  type="button" 
                  onClick={() => {
                    const skills = skillWant.split(',').filter(s => s.trim());
                    skills.splice(index, 1);
                    setSkillWant(skills.join(', '));
                  }}
                  className="text-white/50 hover:text-white ml-1"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <input
            type="text"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = e.currentTarget.value.trim();
                if (value) {
                  const currentSkills = skillWant.split(',').filter(s => s.trim());
                  if (!currentSkills.includes(value)) {
                    setSkillWant(currentSkills.length > 0 ? `${skillWant}, ${value}` : value);
                  }
                  e.currentTarget.value = '';
                }
              }
            }}
            className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors"
            placeholder="Type a skill and press Enter..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Location (For Map)</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={getLocation}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-2xl text-sm font-medium transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              {location ? 'Update Location' : 'Get My Location'}
            </button>
            {location && <span className="text-sm text-emerald-400">Location set!</span>}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-5 rounded-2xl bg-white text-black font-semibold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform mt-4 cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
