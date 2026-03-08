import React, { useEffect, useRef, useState } from 'react';
import { db } from './firebase';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

interface VideoCallProps {
  chatId: string;
  userId: string;
  isInitiator: boolean;
  onEndCall: () => void;
}

export default function VideoCall({ chatId, userId, isInitiator, onEndCall }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection>(new RTCPeerConnection(servers));
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => {
          pc.current.addTrack(track, stream);
        });

        const rStream = new MediaStream();
        setRemoteStream(rStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = rStream;
        }

        pc.current.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            rStream.addTrack(track);
          });
        };

        if (isInitiator) {
          startCall();
        } else {
          joinCall();
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        alert("Could not access camera or microphone.");
        onEndCall();
      }
    };

    setupMedia();

    const callDoc = doc(db, 'chats', chatId, 'call', 'current');
    const unsubscribe = onSnapshot(callDoc, (snapshot) => {
      if (!snapshot.exists() && isMounted) {
        // Call ended by the other party
        hangup(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      hangup(true);
    };
  }, []);

  const startCall = async () => {
    const callDoc = doc(db, 'chats', chatId, 'call', 'current');
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.current.createOffer();
    await pc.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, { offer, callerId: userId });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pc.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.current.setRemoteDescription(answerDescription);
      }
    });

    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.current.addIceCandidate(candidate);
        }
      });
    });
  };

  const joinCall = async () => {
    const callDoc = doc(db, 'chats', chatId, 'call', 'current');
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    const callData = (await getDoc(callDoc)).data();
    if (!callData?.offer) return;

    const offerDescription = callData.offer;
    await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.current.addIceCandidate(candidate);
        }
      });
    });
  };

  const hangup = async (isUnmounting = false) => {
    pc.current.close();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const callDoc = doc(db, 'chats', chatId, 'call', 'current');
      const docSnap = await getDoc(callDoc);
      if (docSnap.exists()) {
        await deleteDoc(callDoc);
      }
    } catch (error) {
      console.error("Error deleting call doc:", error);
    }

    if (!isUnmounting) {
      onEndCall();
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !isMicOn;
      setIsMicOn(!isMicOn);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = !isVideoOn;
      setIsVideoOn(!isVideoOn);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#050505] flex flex-col rounded-[2.5rem] overflow-hidden">
      <div className="flex-1 relative bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {!remoteStream?.active && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/50 animate-pulse">Waiting for other user to join...</p>
          </div>
        )}
        <div className="absolute top-6 right-6 w-32 h-48 sm:w-48 sm:h-72 bg-gray-900 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="h-24 bg-[#0a0a0a] border-t border-white/10 flex items-center justify-center gap-6">
        <button onClick={toggleMic} className={`p-4 rounded-full transition-colors ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
          {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>
        <button onClick={() => hangup(false)} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
          <PhoneOff className="w-6 h-6" />
        </button>
        <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${isVideoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
          {isVideoOn ? <VideoIcon className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}
