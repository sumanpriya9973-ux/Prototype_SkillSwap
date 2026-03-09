import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Star, MessageCircle, ArrowLeft, Mail } from 'lucide-react';

interface UserProfile {
  uid: string;
  name: string;
  contact: string;
  contactType: 'email' | 'whatsapp';
  skillHave: string;
  skillWant: string;
}

interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export default function UserProfileView() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isWritingReview, setIsWritingReview] = useState(false);

  useEffect(() => {
    const fetchProfileAndReviews = async () => {
      if (!uid) return;
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }

        const reviewsRef = collection(db, 'users', uid, 'reviews');
        const q = query(reviewsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedReviews: Review[] = [];
        querySnapshot.forEach((doc) => {
          fetchedReviews.push({ id: doc.id, ...doc.data() } as Review);
        });
        setReviews(fetchedReviews);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndReviews();
  }, [uid]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uid || !currentUserProfile) return;
    
    setSubmittingReview(true);
    try {
      const reviewsRef = collection(db, 'users', uid, 'reviews');
      const newReview = {
        reviewerId: user.uid,
        reviewerName: currentUserProfile.name || 'Anonymous',
        rating,
        comment,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(reviewsRef, newReview);
      setReviews([{ id: docRef.id, ...newReview, createdAt: new Date() }, ...reviews]);
      setComment('');
      setRating(5);
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div></div>;
  }

  if (!profile) {
    return <div className="text-center py-20">Profile not found</div>;
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 'No ratings yet';

  return (
    <div className="max-w-3xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="bg-white/[0.03] border border-white/5 p-8 md:p-10 rounded-[2.5rem] mb-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-4xl font-medium tracking-tight mb-2">{profile.name}</h2>
            <div className="flex items-center gap-4 text-sm text-white/50">
              <div className="flex items-center gap-1.5 uppercase tracking-widest font-semibold">
                {profile.contactType === 'email' ? <Mail className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                {profile.contactType}
              </div>
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="w-4 h-4 fill-current" />
                <span>{averageRating}</span>
                <span className="text-white/30 ml-1">({reviews.length} reviews)</span>
              </div>
            </div>
          </div>
          {user?.uid !== uid && (
            <button 
              onClick={() => navigate(`/chat/${uid}`)}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform"
            >
              <MessageCircle className="w-5 h-5" />
              Message
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Can Teach</div>
            <div className="inline-flex items-center px-5 py-2.5 rounded-full bg-white/10 border border-white/10 text-sm font-medium">
              {profile.skillHave || 'Not specified'}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Wants to Learn</div>
            <div className="flex flex-wrap gap-2">
              {profile.skillWant ? profile.skillWant.split(',').map((skill, i) => (
                <div key={i} className="inline-flex items-center px-5 py-2.5 rounded-full border border-white/20 text-white/70 text-sm font-medium">
                  {skill.trim()}
                </div>
              )) : (
                <div className="inline-flex items-center px-5 py-2.5 rounded-full border border-white/20 text-white/70 text-sm font-medium">
                  Not specified
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/5 p-8 md:p-10 rounded-[2.5rem]">
        <h3 className="text-2xl font-medium tracking-tight mb-8">Reviews</h3>
        
        {user?.uid !== uid && (
          <div className="mb-10">
            {!isWritingReview ? (
              <button
                onClick={() => setIsWritingReview(true)}
                className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:scale-105 transition-transform"
              >
                Write a review or rate
              </button>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-2 block">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-1 ${rating >= star ? 'text-yellow-500' : 'text-white/20'} hover:text-yellow-400 transition-colors`}
                      >
                        <Star className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-2 block">Review</label>
                  <textarea
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors min-h-[100px]"
                    placeholder="Write your review here..."
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWritingReview(false);
                      setComment('');
                      setRating(5);
                    }}
                    className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="space-y-6">
          {reviews.length === 0 ? (
            <p className="text-white/40 text-center py-8">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="bg-[#111] border border-white/5 p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-medium">{review.reviewerName}</div>
                    <div className="text-xs text-white/40 mt-1">
                      {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </div>
                  </div>
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-white/10'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">{review.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
