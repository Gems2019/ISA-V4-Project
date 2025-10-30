import modal
from modal import App, Image

# Create a Modal app
# Configuration / constants
APP_NAME = "isa-ai-server"
PYTHON_VERSION = "3.11"
PIP_PACKAGES = [
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
    "hf_xet",
]

# Local file to include in the Modal image (source, destination)
SERVER_LOCAL = "server.py"
SERVER_DEST = "/root/server.py"

# Deployment settings
GPU_TYPE = "T4"
TIMEOUT = 600
SCALEDOWN_WINDOW = 300  # 300 seconds = 5 mins
MAX_INPUTS = 10


app = App(APP_NAME)

# Define the container image with all dependencies
image = (
    Image.debian_slim(python_version=PYTHON_VERSION)
    .pip_install(*PIP_PACKAGES)
    .add_local_file(SERVER_LOCAL, SERVER_DEST)
)


@app.function(
    image=image,
    gpu=GPU_TYPE,
    timeout=TIMEOUT,
    scaledown_window=SCALEDOWN_WINDOW,  # Keep container warm for 5 minutes after last request
)
@modal.concurrent(max_inputs=MAX_INPUTS)  # Allow up to MAX_INPUTS concurrent requests per container
@modal.asgi_app()
def fastapi_app():
    """
    Deploy the full FastAPI application with Modal.
    Imports the app factory from server.py.
    """
    from server import create_app

    # Create and return the FastAPI application
    return create_app()


@app.local_entrypoint()
def main():
    """
    Test the deployment locally.
    Usage: modal run modal_deploy.py
    """
    print("Testing Modal deployment...")
    print("Use 'modal deploy modal_deploy.py' to deploy to production")
