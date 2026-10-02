import { supabase } from './supabase';

export interface ForensicLog {
  roomId: string;
  victimName: string;
  victimPhone: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  totalChunks: number;
  gpsBreadcrumbs: Array<{
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp: number;
  }>;
  deviceInfo: {
    userAgent: string;
    platform: string;
    timeZone: string;
  };
}

export interface AudioBroadcastSession {
  stop: () => Promise<{ evidenceUrl: string | null; log: ForensicLog }>;
  updateLocation: (lat: number, lng: number, accuracy?: number) => void;
}

// Convert Blob to Base64 string for Realtime broadcast
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Starts silent background live audio streaming & police evidence recording
 */
export async function startLiveAudioBroadcast(
  roomId: string,
  initialLocation: { lat: number; lng: number; accuracy?: number } | null,
  onStatusChange?: (status: string) => void
): Promise<AudioBroadcastSession> {
  let stream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  const recordedChunks: Blob[] = [];
  let chunkIndex = 0;
  const startTime = new Date().toISOString();
  let latestLocation = initialLocation;

  // Retrieve user profile for legal evidence log
  let victimName = 'SafeMesh Citizen';
  let victimPhone = 'Unspecified';
  try {
    const raw = localStorage.getItem('safetymesh_profile');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.fullName) victimName = p.fullName;
      if (p.phone) victimPhone = p.phone;
    }
  } catch (e) {}

  const breadcrumbs: ForensicLog['gpsBreadcrumbs'] = [];
  if (initialLocation) {
    breadcrumbs.push({
      lat: initialLocation.lat,
      lng: initialLocation.lng,
      accuracy: initialLocation.accuracy,
      timestamp: Date.now(),
    });
  }

  // Connect to Supabase Realtime Channel
  const channel = supabase.channel(`emergency_${roomId}`, {
    config: { broadcast: { self: false } },
  });

  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        resolve();
      }
    });
  });

  // Acquire microphone quietly with standard speech optimizations
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
      },
      video: false,
    });
  } catch (err) {
    console.error('Failed to acquire microphone for emergency broadcast', err);
    if (onStatusChange) onStatusChange('MIC_ERROR');
    throw err;
  }

  // Select optimal audio MIME type supported by browser
  let mimeType = 'audio/webm;codecs=opus';
  if (typeof MediaRecorder !== 'undefined') {
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else {
        mimeType = '';
      }
    }
  }

  try {
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch (e) {
    mediaRecorder = new MediaRecorder(stream);
  }

  mediaRecorder.ondataavailable = async (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
      chunkIndex++;

      try {
        const base64Data = await blobToBase64(e.data);
        // Broadcast chunk over Supabase Realtime
        channel.send({
          type: 'broadcast',
          event: 'audio_stream',
          payload: {
            chunk: base64Data,
            mimeType: mediaRecorder?.mimeType || 'audio/webm',
            index: chunkIndex,
            timestamp: Date.now(),
            lat: latestLocation?.lat,
            lng: latestLocation?.lng,
            accuracy: latestLocation?.accuracy,
            victimName,
          },
        });
      } catch (err) {
        console.warn('Realtime chunk broadcast error', err);
      }
    }
  };

  // Capture chunks every 1000ms (1 second) for low latency
  mediaRecorder.start(1000);
  if (onStatusChange) onStatusChange('STREAMING_ACTIVE');

  return {
    updateLocation: (lat: number, lng: number, accuracy?: number) => {
      latestLocation = { lat, lng, accuracy };
      breadcrumbs.push({ lat, lng, accuracy, timestamp: Date.now() });
      // Broadcast location change to listener
      channel.send({
        type: 'broadcast',
        event: 'location_update',
        payload: { lat, lng, accuracy, timestamp: Date.now() },
      });
    },
    stop: async () => {
      const endTime = new Date().toISOString();
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // Compile final forensic evidence log
      const log: ForensicLog = {
        roomId,
        victimName,
        victimPhone,
        startTime,
        endTime,
        durationSeconds: Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000),
        totalChunks: recordedChunks.length,
        gpsBreadcrumbs: breadcrumbs,
        deviceInfo: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      // Upload cumulative audio evidence file to Supabase Storage
      let evidenceUrl: string | null = null;
      try {
        const finalBlob = new Blob(recordedChunks, {
          type: mediaRecorder?.mimeType || 'audio/webm',
        });
        const fileName = `evidence_${roomId}_${Date.now()}.webm`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('evidence_recordings')
          .upload(fileName, finalBlob, {
            contentType: finalBlob.type,
            upsert: true,
          });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from('evidence_recordings')
            .getPublicUrl(fileName);
          evidenceUrl = urlData?.publicUrl || null;
        }

        // Also upload forensic log metadata
        const logBlob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
        await supabase.storage
          .from('evidence_recordings')
          .upload(`log_${roomId}_${Date.now()}.json`, logBlob, {
            contentType: 'application/json',
            upsert: true,
          });
      } catch (err) {
        console.error('Evidence upload error:', err);
      }

      // Notify listeners stream finished
      try {
        await channel.send({
          type: 'broadcast',
          event: 'session_ended',
          payload: { evidenceUrl, log },
        });
        supabase.removeChannel(channel);
      } catch (e) {}

      return { evidenceUrl, log };
    },
  };
}
