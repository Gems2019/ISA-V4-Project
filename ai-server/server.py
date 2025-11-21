from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import torch
import soundfile as sf
import io
import os
import numpy as np
from contextlib import asynccontextmanager
from pydantic import BaseModel


class TranscriptionServer:
    """AI transcription server using Whisper model."""
    
    def __init__(self):
        # Configuration / constants
        self.MODEL_NAME = "openai/whisper-small"
        self.APP_TITLE = "Speech Transcription API"
        self.APP_DESCRIPTION = """
AI-powered speech transcription service using OpenAI's Whisper model.

## Features

* **Audio Transcription**: Convert speech to text from audio files
* **Format Support**: Accepts MP3, WAV, and other common audio formats
* **Real-time Processing**: Fast transcription using optimized Whisper model
* **GPU Acceleration**: Automatic GPU detection for faster processing

## Usage

Upload an audio file to the `/transcribe` endpoint to receive a text transcription.
"""
        self.APP_VERSION = "1.0.0"
        self.ROOT_PATH = "/API/v1"
        self.TRANSCRIBE_PATH = f"{self.ROOT_PATH}/transcribe"
        self.DOC_PATH = f"{self.ROOT_PATH}/doc"
        
        # Generation parameters
        self.LANGUAGE = "en"
        self.TASK = "transcribe"
        
        # Device names and dtypes
        self.CUDA_DEVICE = "cuda"
        self.CPU_DEVICE = "cpu"
        self.DTYPE_CUDA = torch.float16
        self.DTYPE_CPU = torch.float32
        
        # Model cache
        self.model = None
        self.processor = None
        
        # Initialize FastAPI app
        self.app = self.create_app()
    
    def load_model(self):
        """Load the ASR model if not already loaded."""
        if self.model is None:
            # Detect device
            device = self.CUDA_DEVICE if torch.cuda.is_available() else self.CPU_DEVICE
            dtype = self.DTYPE_CUDA if torch.cuda.is_available() else self.DTYPE_CPU

            print(f"Loading Whisper model on {device} with dtype {dtype}...")

            self.processor = WhisperProcessor.from_pretrained(self.MODEL_NAME)
            self.model = WhisperForConditionalGeneration.from_pretrained(
                self.MODEL_NAME,
                dtype=dtype
            ).to(device)

            print("Model loaded successfully!")
        
        return self.model, self.processor
    
    def create_app(self) -> FastAPI:
        """Factory function to create and configure the FastAPI application."""
        @asynccontextmanager
        async def lifespan(app: FastAPI):
            """Lifespan handler to load the model on startup."""
            self.load_model()
            yield

        app = FastAPI(
            title=self.APP_TITLE,
            description=self.APP_DESCRIPTION,
            version=self.APP_VERSION,
            lifespan=lifespan,
            docs_url=self.DOC_PATH,
            redoc_url=None,
            contact={
                "name": "API Support",
            },
            openapi_tags=[
                {
                    "name": "Health",
                    "description": "Health check and status endpoints",
                },
                {
                    "name": "Transcription",
                    "description": "Audio transcription operations using Whisper AI model",
                },
            ],
        )
        
        # Configure CORS
        self.setup_cors(app)
        
        # Setup routes
        self.setup_routes(app)
        
        return app
    
    def setup_cors(self, app: FastAPI):
        """Configure CORS middleware."""
        # Configure simple CORS (single origin) via environment variable
        # Set CORS_ALLOWED_ORIGIN to a single origin (e.g. http://localhost:3000)
        cors_origin = os.environ.get("CORS_ALLOWED_ORIGIN")
        if cors_origin:
            print(f"Configuring CORS to allow origin: {cors_origin}")
            app.add_middleware(
                CORSMiddleware,
                allow_origins=[cors_origin],
                allow_credentials=True,
                allow_methods=["GET", "POST", "OPTIONS"],
                allow_headers=["*"],
            )
    
    def setup_routes(self, app: FastAPI):
        """Setup API routes."""
        
        # Response models for API documentation
        class TranscriptionResponse(BaseModel):
            """Response model for transcription endpoint."""
            text: str

            class Config:
                json_schema_extra = {
                    "example": {
                        "text": "Hello, this is a test transcription of the audio file."
                    }
                }

        class HealthResponse(BaseModel):
            """Response model for health check endpoint."""
            message: str
            status: str

            class Config:
                json_schema_extra = {
                    "example": {
                        "message": "Speech Transcription API",
                        "status": "running"
                    }
                }
        
        @app.get(
            self.ROOT_PATH,
            response_model=HealthResponse,
            tags=["Health"],
            summary="Health check",
            description="Check if the API server is running and operational",
            responses={
                200: {
                    "description": "Service is running",
                    "content": {
                        "application/json": {
                            "example": {
                                "message": "Speech Transcription API",
                                "status": "running"
                            }
                        }
                    }
                }
            }
        )
        async def root():
            """Health check endpoint."""
            return {"message": self.APP_TITLE, "status": "running"}

        @app.post(
            self.TRANSCRIBE_PATH,
            response_model=TranscriptionResponse,
            tags=["Transcription"],
            summary="Transcribe audio file",
            description="""
            Upload an audio file to transcribe speech to text using OpenAI's Whisper model.
            
            **Supported Formats**: MP3, WAV, FLAC, OGG, and other common audio formats
            
            **Recommended**: 5-second audio clips at 16kHz for optimal performance
            
            **Process**:
            1. Upload your audio file
            2. The API processes it through Whisper AI model
            3. Returns transcribed text in English
            
            **Note**: Audio files are converted to mono if stereo, and resampled to 16kHz internally.
            """,
            responses={
                200: {
                    "description": "Audio transcribed successfully",
                    "content": {
                        "application/json": {
                            "example": {
                                "text": "Hello, this is a test transcription of the audio file."
                            }
                        }
                    }
                },
                400: {
                    "description": "Invalid audio file or format",
                },
                422: {
                    "description": "Validation error - missing file",
                },
                500: {
                    "description": "Internal server error during transcription",
                }
            }
        )
        async def transcribe_audio(
            file: UploadFile = File(
                ...,
                description="Audio file to transcribe (MP3, WAV, FLAC, etc.)",
                media_type="audio/*"
            )
        ):
            """
            Receive an audio file (MP3/WAV) and return the transcription.
            """
            # Ensure model is loaded
            asr_model, asr_processor = self.load_model()
            
            # Read audio file
            audio_bytes = await file.read()
            audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
            
            # Convert to mono if stereo
            if len(audio_data.shape) > 1:
                audio_data = np.mean(audio_data, axis=1)

            # Process audio - Whisper expects 16kHz sample rate
            device = self.CUDA_DEVICE if torch.cuda.is_available() else self.CPU_DEVICE
            dtype = self.DTYPE_CUDA if torch.cuda.is_available() else self.DTYPE_CPU

            inputs = asr_processor(
                audio_data,
                sampling_rate=sample_rate,
                return_tensors="pt",
                return_attention_mask=True
            )
            
            # Convert inputs to the same dtype as the model and move to device
            inputs = inputs.to(device)
            if dtype == self.DTYPE_CUDA:
                inputs.input_features = inputs.input_features.half()
            
            # Generate transcription
            with torch.no_grad():
                predicted_ids = asr_model.generate(
                    inputs.input_features,
                    attention_mask=inputs.attention_mask,
                    language=self.LANGUAGE,
                    task=self.TASK,
                )
            
            # Decode to get transcription
            transcription = asr_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
            
            return {"text": transcription}
    
    def start(self, host: str = "0.0.0.0", port: int = 8080):
        """Start the server."""
        import uvicorn
        uvicorn.run(self.app, host=host, port=port)


# Create the server instance
transcription_server = TranscriptionServer()
app = transcription_server.app

if __name__ == "__main__":
    HOST = "0.0.0.0"
    DEFAULT_PORT = 8080
    port = int(os.environ.get("PORT", DEFAULT_PORT))
    transcription_server.start(host=HOST, port=port)
