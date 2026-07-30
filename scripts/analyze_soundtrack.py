#!/usr/bin/env python3
"""Extract a deterministic beat, onset, and energy map from a soundtrack."""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np


def decode_mono(source: Path, destination: Path, sample_rate: int = 22_050) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(sample_rate),
            "-c:a",
            "pcm_s16le",
            str(destination),
        ],
        check=True,
    )


def read_wave(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as audio:
        sample_rate = audio.getframerate()
        channels = audio.getnchannels()
        width = audio.getsampwidth()
        if channels != 1 or width != 2:
            raise ValueError("analysis input must be mono 16-bit PCM")
        samples = np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2")
    return samples.astype(np.float32) / 32768.0, sample_rate


def smooth(values: np.ndarray, width: int) -> np.ndarray:
    if width <= 1:
        return values.copy()
    kernel = np.hanning(width)
    kernel /= max(kernel.sum(), 1e-9)
    return np.convolve(values, kernel, mode="same")


def spectral_flux(samples: np.ndarray, sample_rate: int) -> tuple[np.ndarray, float]:
    frame_size = 2048
    hop = 512
    frame_count = max(1, 1 + (len(samples) - frame_size) // hop)
    window = np.hanning(frame_size).astype(np.float32)
    spectra = np.empty((frame_count, frame_size // 2 + 1), dtype=np.float32)
    for index in range(frame_count):
        start = index * hop
        frame = samples[start : start + frame_size]
        if len(frame) < frame_size:
            frame = np.pad(frame, (0, frame_size - len(frame)))
        spectra[index] = np.log1p(np.abs(np.fft.rfft(frame * window)))
    differences = np.diff(spectra, axis=0, prepend=spectra[:1])
    flux = np.maximum(differences, 0).sum(axis=1)
    flux = smooth(flux, 5)
    flux -= np.median(flux)
    flux = np.maximum(flux, 0)
    peak = float(np.percentile(flux, 99.5))
    if peak > 0:
        flux /= peak
    return flux, hop / sample_rate


def estimate_tempo(flux: np.ndarray, seconds_per_frame: float) -> tuple[float, float]:
    centered = flux - flux.mean()
    correlation = np.correlate(centered, centered, mode="full")[len(centered) - 1 :]
    bpms = np.arange(64.0, 181.0, 0.05)
    lags = np.rint(60.0 / (bpms * seconds_per_frame)).astype(int)
    valid = (lags > 0) & (lags < len(correlation))
    scores = np.full_like(bpms, -np.inf)
    scores[valid] = correlation[lags[valid]]
    # Favor a stately pulse without preventing the data from selecting a faster meter.
    scores[valid] *= 0.92 + 0.08 * np.exp(-((bpms[valid] - 104.0) / 42.0) ** 2)
    bpm = float(bpms[int(np.argmax(scores))])
    period = 60.0 / bpm

    candidate_times = np.arange(len(flux)) * seconds_per_frame
    phase_candidates = np.linspace(0.0, period, 240, endpoint=False)
    phase_scores = []
    for phase in phase_candidates:
        grid = np.arange(phase, candidate_times[-1] + period, period)
        indices = np.clip(np.rint(grid / seconds_per_frame).astype(int), 0, len(flux) - 1)
        phase_scores.append(float(flux[indices].sum()))
    phase = float(phase_candidates[int(np.argmax(phase_scores))])
    return bpm, phase


def detect_onsets(
    flux: np.ndarray, seconds_per_frame: float, minimum_spacing: float = 0.22
) -> list[dict[str, float]]:
    local_width = max(5, int(round(1.5 / seconds_per_frame)))
    baseline = smooth(flux, local_width)
    threshold = baseline * 1.35 + float(np.percentile(flux, 58)) * 0.18
    candidates = [
        index
        for index in range(1, len(flux) - 1)
        if flux[index] > flux[index - 1]
        and flux[index] >= flux[index + 1]
        and flux[index] > threshold[index]
    ]
    candidates.sort(key=lambda index: float(flux[index]), reverse=True)
    selected: list[int] = []
    spacing_frames = max(1, int(round(minimum_spacing / seconds_per_frame)))
    for index in candidates:
        if all(abs(index - prior) >= spacing_frames for prior in selected):
            selected.append(index)
    selected.sort()
    return [
        {
            "time_seconds": round(index * seconds_per_frame, 6),
            "strength": round(float(flux[index]), 5),
        }
        for index in selected
    ]


def energy_sections(
    samples: np.ndarray, sample_rate: int, duration: float
) -> list[dict[str, float | str]]:
    window_seconds = 1.0
    window_samples = int(sample_rate * window_seconds)
    usable = len(samples) - (len(samples) % window_samples)
    blocks = samples[:usable].reshape(-1, window_samples)
    rms = np.sqrt(np.mean(blocks * blocks, axis=1) + 1e-12)
    smoothed = smooth(rms, 9)
    normalized = smoothed / max(float(smoothed.max()), 1e-9)

    labels = np.empty(len(normalized), dtype=object)
    labels[normalized < 0.37] = "quiet"
    labels[(normalized >= 0.37) & (normalized < 0.63)] = "building"
    labels[(normalized >= 0.63) & (normalized < 0.82)] = "strong"
    labels[normalized >= 0.82] = "climactic"

    sections: list[dict[str, float | str]] = []
    start = 0
    for index in range(1, len(labels) + 1):
        if index == len(labels) or labels[index] != labels[start]:
            sections.append(
                {
                    "start_seconds": round(start * window_seconds, 6),
                    "end_seconds": round(
                        min(index * window_seconds, duration), 6
                    ),
                    "energy": str(labels[start]),
                    "mean_level": round(float(normalized[start:index].mean()), 5),
                }
            )
            start = index
    if sections and sections[-1]["end_seconds"] < duration:
        sections[-1]["end_seconds"] = round(duration, 6)
    return sections


def analyze(source: Path) -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix="stormfather-audio-") as temp_directory:
        decoded = Path(temp_directory) / "soundtrack.wav"
        decode_mono(source, decoded)
        samples, sample_rate = read_wave(decoded)

    duration = len(samples) / sample_rate
    flux, seconds_per_frame = spectral_flux(samples, sample_rate)
    bpm, phase = estimate_tempo(flux, seconds_per_frame)
    beat_period = 60.0 / bpm
    first_beat = phase
    while first_beat - beat_period >= 0:
        first_beat -= beat_period
    beats = np.arange(first_beat, duration + beat_period, beat_period)
    beats = beats[(beats >= 0) & (beats <= duration)]

    return {
        "source": source.name,
        "duration_seconds": round(duration, 6),
        "sample_rate": sample_rate,
        "estimated_bpm": round(bpm, 3),
        "beat_period_seconds": round(beat_period, 6),
        "beat_phase_seconds": round(phase, 6),
        "beat_times_seconds": [round(float(value), 6) for value in beats],
        "onsets": detect_onsets(flux, seconds_per_frame),
        "energy_sections": energy_sections(samples, sample_rate, duration),
        "analysis": {
            "fft_size": 2048,
            "hop_size": 512,
            "spectral_flux_frame_seconds": round(seconds_per_frame, 8),
            "algorithm": "spectral-flux autocorrelation with phase-aligned beat grid",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    arguments = parser.parse_args()

    if not arguments.input.is_file():
        raise SystemExit(f"soundtrack not found: {arguments.input}")
    result = analyze(arguments.input)
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        f"{result['duration_seconds']:.6f}s, {result['estimated_bpm']:.3f} BPM, "
        f"{len(result['onsets'])} onsets"
    )


if __name__ == "__main__":
    main()
