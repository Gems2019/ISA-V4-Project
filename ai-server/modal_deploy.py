import modal
from modal import App, Image

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
    .add_local_file("server.py", "/root/server.py")
)


@app.function(
    image=image,
    gpu="T4",
    timeout=600,
    scaledown_window=300,  # Keep container warm for 5 minutes after last request
)
@modal.concurrent(max_inputs=10)  # Allow up to 10 concurrent requests per container
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
