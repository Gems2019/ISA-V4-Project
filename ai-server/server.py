from fastapi import FastAPI, File, UploadFile
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import torch
import soundfile as sf
import io
import os
import numpy as np
from contextlib import asynccontextmanager


# Model configuration
MODEL_NAME = "openai/whisper-small"


class ModelCache:
    """Container-level cache for model (persists across requests)."""
    model = None
    processor = None


def load_model():
    """Load the ASR model if not already loaded."""
    if ModelCache.model is None:
        # Detect device
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        
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

    app = FastAPI(title="Speech Transcription API", lifespan=lifespan)
    
    @app.get("/")
    async def root():
        """Health check endpoint."""
        return {"message": "Speech Transcription API", "status": "running"}
    
    @app.post("/transcribe")
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
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        
        inputs = asr_processor(
            audio_data,
            sampling_rate=sample_rate,
            return_tensors="pt",
            return_attention_mask=True
        )
        
        # Convert inputs to the same dtype as the model and move to device
        inputs = inputs.to(device)
        if dtype == torch.float16:
            inputs.input_features = inputs.input_features.half()
        
        # Generate transcription
        with torch.no_grad():
            predicted_ids = asr_model.generate(
                inputs.input_features,
                attention_mask=inputs.attention_mask,
                language="en",
                task="transcribe"
            )
        
        # Decode to get transcription
        transcription = asr_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        
        return {"text": transcription}
    
    return app


# Create the app instance for local development
app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
