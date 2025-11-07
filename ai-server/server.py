from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import torch
import soundfile as sf
import io
import os
import numpy as np
from contextlib import asynccontextmanager


# Configuration / constants
MODEL_NAME = "openai/whisper-small"
APP_TITLE = "Speech Transcription API"
ROOT_PATH = "/"
TRANSCRIBE_PATH = "/transcribe"
HOST = "0.0.0.0"
DEFAULT_PORT = 8000

# Generation parameters
LANGUAGE = "en"
TASK = "transcribe"

# Device names and dtypes
CUDA_DEVICE = "cuda"
CPU_DEVICE = "cpu"
DTYPE_CUDA = torch.float16
DTYPE_CPU = torch.float32


class ModelCache:
    """Container-level cache for model (persists across requests)."""
    model = None
    processor = None


def load_model():
    """Load the ASR model if not already loaded."""
    if ModelCache.model is None:
        # Detect device
        device = CUDA_DEVICE if torch.cuda.is_available() else CPU_DEVICE
        dtype = DTYPE_CUDA if torch.cuda.is_available() else DTYPE_CPU

        print(f"Loading Whisper model on {device} with dtype {dtype}...")

        ModelCache.processor = WhisperProcessor.from_pretrained(MODEL_NAME)
        ModelCache.model = WhisperForConditionalGeneration.from_pretrained(
            MODEL_NAME,
            dtype=dtype
        ).to(device)

        print("Model loaded successfully!")
    
    return ModelCache.model, ModelCache.processor

def create_app() -> FastAPI:
    """Factory function to create and configure the FastAPI application."""
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Lifespan handler to load the model on startup."""
        load_model()
        yield

    app = FastAPI(title=APP_TITLE, lifespan=lifespan)

    # Configure simple CORS (single origin) via environment variable
    # Set CORS_ALLOWED_ORIGIN to a single origin (e.g. http://localhost:3000)
    cors_origin = os.environ.get("CORS_ALLOWED_ORIGIN")
    if cors_origin:
        print(f"Configuring CORS to allow origin: {cors_origin}")
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[cors_origin],
            allow_credentials=True,
            allow_methods=["POST", "OPTIONS"],
            allow_headers=["*"],
        )

    @app.get(ROOT_PATH)
    async def root():
        """Health check endpoint."""
        return {"message": APP_TITLE, "status": "running"}

    @app.post(TRANSCRIBE_PATH)
    async def transcribe_audio(file: UploadFile = File(...)):
        """
        Receive an audio file (MP3/WAV) and return the transcription.
        """
        # Ensure model is loaded
        asr_model, asr_processor = load_model()
        
        # Read audio file
        audio_bytes = await file.read()
        audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
        
        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)

        # Process audio - Whisper expects 16kHz sample rate
        device = CUDA_DEVICE if torch.cuda.is_available() else CPU_DEVICE
        dtype = DTYPE_CUDA if torch.cuda.is_available() else DTYPE_CPU

        inputs = asr_processor(
            audio_data,
            sampling_rate=sample_rate,
            return_tensors="pt",
            return_attention_mask=True
        )
        
        # Convert inputs to the same dtype as the model and move to device
        inputs = inputs.to(device)
        if dtype == DTYPE_CUDA:
            inputs.input_features = inputs.input_features.half()
        
        # Generate transcription
        with torch.no_grad():
            predicted_ids = asr_model.generate(
                inputs.input_features,
                attention_mask=inputs.attention_mask,
                language=LANGUAGE,
                task=TASK,
            )
        
        # Decode to get transcription
        transcription = asr_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        
        return {"text": transcription}
    
    return app


# Create the app instance for local development
app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=int(os.environ.get("PORT", DEFAULT_PORT)))
