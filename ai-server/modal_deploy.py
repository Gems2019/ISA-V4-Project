import modal
from modal import App, Image, web_endpoint
import os

# Create a Modal app
app = App("isa-ai-server")

# Define the container image with all dependencies
image = (
    Image.debian_slim(python_version="3.11")
    .pip_install(
        "fastapi",
        "uvicorn",
        "transformers",
        "torch",
        "soundfile",
        "python-multipart",
        "accelerate",
        "numpy",
        "huggingface_hub",
        "peft",
        "hf_xet"
    )
)

# Full FastAPI app deployment
@app.function(
    image=image,
    gpu="T4",  # Use T4 GPU for faster inference
    timeout=600,
    scaledown_window=300,  # Keep container warm for 5 minutes after last request
)
@modal.concurrent(max_inputs=10)  # Allow up to 10 concurrent requests per container
@modal.asgi_app()
def fastapi_app():
    """
    Deploy the full FastAPI application with Modal.
    """
    from fastapi import FastAPI, File, UploadFile
    from transformers import WhisperProcessor, WhisperForConditionalGeneration
    import torch
    import soundfile as sf
    import io
    import numpy as np
    
    web_app = FastAPI(title="Speech Transcription API")
    
    # Container-level cache for model (persists across requests)
    class ModelCache:
        model = None
        processor = None
    
    def load_model():
        if ModelCache.model is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if torch.cuda.is_available() else torch.float32
            
            print(f"Loading Whisper model on {device} with dtype {dtype}...")
            
            model_name = "openai/whisper-small"
            
            ModelCache.processor = WhisperProcessor.from_pretrained(model_name)
            ModelCache.model = WhisperForConditionalGeneration.from_pretrained(
                model_name,
                dtype=dtype
            ).to(device)
            
            print("Model loaded successfully!")
        
        return ModelCache.model, ModelCache.processor
    
    @web_app.post("/transcribe")
    async def transcribe(file: UploadFile = File(...)):
        asr_model, asr_processor = load_model()
        
        audio_bytes = await file.read()
        audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
        
        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
        
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
        
        # Generate with explicit language and task parameters
        with torch.no_grad():
            predicted_ids = asr_model.generate(
                inputs.input_features,
                attention_mask=inputs.attention_mask,
                language="en",
                task="transcribe"
            )
        
        transcription = asr_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        
        return {"text": transcription}
    
    @web_app.get("/")
    async def root():
        return {"message": "Speech Transcription API", "status": "running"}
    
    return web_app


# Local testing function
@app.local_entrypoint()
def main():
    """
    Test the deployment locally.
    Usage: modal run modal_deploy.py
    """
    print("Testing Modal deployment...")
    print("Use 'modal deploy modal_deploy.py' to deploy to production")
