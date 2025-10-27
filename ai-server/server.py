from fastapi import FastAPI, File, UploadFile
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from huggingface_hub import login
import torch
import soundfile as sf
import io
import os
import numpy as np

app = FastAPI(title="Speech Transcription API")

# Global variables to store the model and processor
model = None
processor = None

def load_model():
    """Load the ASR model if not already loaded."""
    global model, processor
    if model is None:
        # Detect device
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        
        print(f"Loading Whisper model on {device} with dtype {dtype}...")
        
        # Use Whisper for accurate word-by-word transcription
        # whisper-small is a good balance between speed and accuracy
        model_name = "openai/whisper-small"
        
        processor = WhisperProcessor.from_pretrained(model_name)
        
        model = WhisperForConditionalGeneration.from_pretrained(
            model_name,
            dtype=dtype
        ).to(device)
        
        # Force English transcription for better accuracy (remove if you need multilingual)
        model.config.forced_decoder_ids = processor.get_decoder_prompt_ids(language="en", task="transcribe")
        
        print("Model loaded successfully!")
    
    return model, processor

@app.on_event("startup")
async def startup_event():
    """Load the model on startup."""
    load_model()

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Receive an audio file (e.g., WAV/MP3) and return the verbatim transcription.
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
        return_tensors="pt"
    )
    
    # Convert inputs to the same dtype as the model and move to device
    inputs = inputs.to(device)
    if dtype == torch.float16:
        inputs.input_features = inputs.input_features.half()
    
    # Generate transcription
    with torch.no_grad():
        predicted_ids = asr_model.generate(inputs.input_features)
    
    # Decode to get the verbatim transcription
    transcription = asr_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
    
    return {"text": transcription}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
