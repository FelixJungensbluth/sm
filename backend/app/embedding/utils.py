import json
import os
from huggingface_hub import hf_hub_download, snapshot_download

def download_embedding_model(repo_id: str):

    model_dir = os.path.abspath(os.path.join("models", repo_id.replace("/", "-")))

    # windows specific to fix too long path error
    if os.name == "nt":
        model_dir = "\\\\?\\" + model_dir

    os.makedirs(model_dir, exist_ok=True)

    file_path = os.path.join(model_dir, "modules.json")
    if os.path.exists(file_path):
        return model_dir

    print(f"Downloading {repo_id}...")

    hf_hub_download(
        repo_id=repo_id,
        filename="modules.json",
        local_dir=model_dir,
    )

    snapshot_download(
        repo_id=repo_id,
        allow_patterns=["*.json", "*.txt", "*.safetensors"],
        local_dir=model_dir,
    )

    return model_dir

def load_file(path):
    with open(path) as fIn:
        return json.load(fIn)