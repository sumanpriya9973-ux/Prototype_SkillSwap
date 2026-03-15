import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { MapPin, User, Mail, MessageCircle, Edit2, Coins, ChevronRight, Star, Shield, LogOut, ArrowLeft } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [editSection, setEditSection] = useState<'personal' | 'skills' | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [photoURL, setPhotoURL] = useState('');
  
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
      setPhotoURL(profile.photoURL || '');
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
        photoURL,
      };
      
      if (location) {
        profileData.location = location;
      }

      await updateProfile(profileData);
      setEditSection(null);
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

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (!editSection) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-12">
          <div className="w-32 h-32 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6 relative group">
            {profile?.photoURL && !profile.photoURL.startsWith('http') && !profile.photoURL.startsWith('data:') ? (
              <span className="text-6xl">{profile.photoURL}</span>
            ) : (
              <User className="w-12 h-12 text-white/50" />
            )}
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
              className="absolute bottom-0 right-0 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg cursor-pointer z-10"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full mt-2 z-50">
                <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                <div className="relative">
                  <EmojiPicker 
                    onEmojiClick={(emojiData) => {
                      setPhotoURL(emojiData.emoji);
                      updateProfile({ photoURL: emojiData.emoji });
                      setShowEmojiPicker(false);
                    }}
                    theme={Theme.DARK}
                  />
                </div>
              </div>
            )}
          </div>
          <h2 className="text-3xl font-medium tracking-tight mb-2">{profile?.name || 'Your Name'}</h2>
          <div className="flex items-center gap-2 text-white/50 text-sm">
            {profile?.contactType === 'email' ? <Mail className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
            {profile?.contact || 'Add contact info'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mb-4">
              <Coins className="w-6 h-6" />
            </div>
            <div className="text-2xl font-medium mb-1">{profile?.coins ?? 50}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Skill Coins</div>
          </div>
          <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <Star className="w-6 h-6" />
            </div>
            <div className="text-2xl font-medium mb-1">5.0</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Average Rating</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 px-4">Profile Settings</div>
          
          <button 
            onClick={() => setEditSection('personal')} 
            className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-3xl flex items-center justify-between hover:bg-white/[0.06] transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/70 group-hover:text-white group-hover:bg-white/10 transition-colors">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white text-lg">Personal Information</div>
                <div className="text-sm text-white/40 mt-0.5">Name, contact, and location</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          <button 
            onClick={() => setEditSection('skills')} 
            className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-3xl flex items-center justify-between hover:bg-white/[0.06] transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/70 group-hover:text-white group-hover:bg-white/10 transition-colors">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white text-lg">Skills & Preferences</div>
                <div className="text-sm text-white/40 mt-0.5">What you teach and want to learn</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          <button 
            onClick={handleLogout} 
            className="w-full bg-red-500/5 border border-red-500/10 p-5 rounded-3xl flex items-center justify-between hover:bg-red-500/10 transition-colors group mt-8 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 group-hover:text-red-300 group-hover:bg-red-500/20 transition-colors">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium text-red-400 text-lg">Log Out</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={() => setEditSection(null)}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </button>

      <h2 className="text-4xl font-medium tracking-tight mb-10">
        {editSection === 'personal' ? 'Personal Information' : 'Skills & Preferences'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8 bg-white/[0.03] border border-white/5 p-8 md:p-10 rounded-[2.5rem]">
        {editSection === 'personal' && (
          <>
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
          </>
        )}

        {editSection === 'skills' && (
          <>
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
                      className="text-white/50 hover:text-white ml-1 cursor-pointer"
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
          </>
        )}

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
