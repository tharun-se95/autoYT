#!/usr/bin/env python3
import sys
import os
import wave
import struct
import json
import math

def calculate_rms(frames, sample_width):
    """Calculate the Root Mean Square (RMS) of a chunk of audio frames."""
    count = len(frames) // sample_width
    if count == 0:
        return 0.0
    
    # Unpack PCM bytes into floats based on sample width (typically 16-bit = 2 bytes)
    if sample_width == 2:
        fmt = f"<{count}h" # 16-bit signed integer
        data = struct.unpack(fmt, frames)
        sum_squares = sum((float(val) / 32768.0) ** 2 for val in data)
    elif sample_width == 1:
        fmt = f"<{count}B" # 8-bit unsigned integer
        data = struct.unpack(fmt, frames)
        sum_squares = sum(((float(val) - 128.0) / 128.0) ** 2 for val in data)
    else:
        # Fallback for other formats
        return 0.1
        
    return math.sqrt(sum_squares / count)

def detect_silence_pauses(wav_path, window_sec=0.1, threshold=0.012):
    """
    Scans the WAV file and returns list of timestamps (sec) 
    where the audio energy drops (natural silence gaps).
    """
    if not os.path.exists(wav_path):
        return []

    with wave.open(wav_path, 'r') as wav:
        rate = wav.getframerate()
        width = wav.getsampwidth()
        channels = wav.getnchannels()
        total_frames = wav.getnframes()
        duration = total_frames / float(rate)
        
        # Frame size of our window
        window_size = int(rate * window_sec)
        frame_bytes_per_window = window_size * width * channels
        
        pauses = []
        
        # Slide through audio
        for i in range(0, total_frames, window_size):
            wav.setpos(i)
            chunk = wav.readframes(window_size)
            if len(chunk) < frame_bytes_per_window:
                break
                
            # If multi-channel, only take the first channel's bytes to simplify
            if channels > 1:
                mono_chunk = b""
                for j in range(0, len(chunk), width * channels):
                    mono_chunk += chunk[j:j+width]
                chunk = mono_chunk
                
            rms = calculate_rms(chunk, width)
            time_sec = i / float(rate)
            
            if rms < threshold:
                pauses.append((time_sec, rms))
                
    return pauses

def merge_consecutive_pauses(pauses, min_gap_sec=0.4):
    """Group close silence points to find clean mid-speech pause regions."""
    if not pauses:
        return []
        
    merged = []
    current_start = pauses[0][0]
    current_end = pauses[0][0]
    min_rms = pauses[0][1]
    
    for t, rms in pauses[1:]:
        if t - current_end < 0.25: # connected silence chunk
            current_end = t
            min_rms = min(min_rms, rms)
        else:
            # We hit a word chunk, finalize the previous silence gap
            center_sec = (current_start + current_end) / 2.0
            merged.append(center_sec)
            current_start = t
            current_end = t
            min_rms = rms
            
    center_sec = (current_start + current_end) / 2.0
    merged.append(center_sec)
    
    # Filter pauses to be spaced out by at least min_gap_sec
    filtered = []
    for m in sorted(merged):
        if not filtered or m - filtered[-1] > min_gap_sec:
            filtered.append(m)
            
    return filtered

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: local-aligner.py <audio_wav_path> <total_beats_count> [total_duration]"}))
        sys.exit(1)
        
    wav_path = sys.argv[1]
    try:
        beat_count = int(sys.argv[2])
    except:
        beat_count = 1
        
    try:
        duration = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
    except:
        duration = 0.0

    if not os.path.exists(wav_path):
        print(json.dumps({"error": f"File not found: {wav_path}"}))
        sys.exit(1)

    # If duration is not provided, read from WAV metadata
    if duration <= 0:
        try:
            with wave.open(wav_path, 'r') as wav:
                duration = wav.getnframes() / float(wav.getframerate())
        except:
            duration = 15.0

    if beat_count <= 1:
        # Single still block
        print(json.dumps([{
            "beatIndex": 0,
            "startSec": 0.0,
            "durationSec": duration
        }]))
        sys.exit(0)

    # 1. Scan and detect natural speech pauses
    raw_pauses = detect_silence_pauses(wav_path)
    clean_pauses = merge_consecutive_pauses(raw_pauses)
    
    # We want exactly (beat_count - 1) transition cut points
    target_cuts = beat_count - 1
    
    # If we found too many pauses, keep the most prominent/balanced ones
    # (pauses closest to even chronological intervals)
    if len(clean_pauses) > target_cuts:
        ideal_intervals = [duration * (i + 1) / float(beat_count) for i in range(target_cuts)]
        selected_cuts = []
        for ideal in ideal_intervals:
            # Find closest detected pause to this ideal interval
            closest = min(clean_pauses, key=lambda x: abs(x - ideal))
            selected_cuts.append(closest)
        cuts = sorted(list(set(selected_cuts)))
    else:
        cuts = sorted(clean_pauses)
        
    # If we found too few pauses, interpolate the missing cuts evenly
    while len(cuts) < target_cuts:
        # Find the largest gap between consecutive cuts
        temp_cuts = [0.0] + cuts + [duration]
        gaps = [temp_cuts[i+1] - temp_cuts[i] for i in range(len(temp_cuts)-1)]
        max_idx = gaps.index(max(gaps))
        
        new_cut = (temp_cuts[max_idx] + temp_cuts[max_idx+1]) / 2.0
        cuts.append(new_cut)
        cuts = sorted(cuts)

    # 2. Build aligned visual beat durations based on these cuts
    alignments = []
    boundaries = [0.0] + cuts + [duration]
    
    for idx in range(beat_count):
        start = boundaries[idx]
        end = boundaries[idx+1]
        alignments.append({
            "beatIndex": idx,
            "startSec": start,
            "durationSec": max(0.2, end - start)
        })
        
    print(json.dumps(alignments))

if __name__ == "__main__":
    main()
