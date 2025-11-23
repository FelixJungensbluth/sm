from typing import List
from app.config.settings import SettingsDep
from app.embedding.provider.base_embedding import BaseEmbedding
import os

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel
from app.embedding.utils import download_embedding_model, load_file


class EmbeddingModel(nn.Module):
    def __init__(self, model_name):
        super().__init__()
        print(f"CUDA available: {torch.cuda.is_available()}")
        self.model_name = model_name
        self.model_path = download_embedding_model(model_name)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.config = self.load_config()
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_path, use_fast=True)
        self.auto_model = self.load_auto_model()
        self.features = None

    def load_config(self):
        modules_config = load_file(os.path.join(self.model_path, "modules.json"))

        modules = dict()
        for module_config in modules_config:
            module_type: str = module_config["type"]
            path = module_config["path"]

            if "Transformer" in module_type:
                transformer_config = load_file(
                    os.path.join(self.model_path, "sentence_bert_config.json")
                )
                modules["transformer"] = transformer_config
            if "Normalize" in module_type:
                continue
            if "Pooling" in module_type:
                pooling_config = load_file(
                    os.path.join(self.model_path, path, "config.json")
                )
                modules["pooling"] = pooling_config

        return modules

    def load_auto_model(self):
        auto_model_config = load_file(os.path.join(self.model_path, "config.json"))
        auto_model = AutoModel.from_pretrained(
            self.model_path, config=auto_model_config
        )

        auto_model.eval()
        auto_model.to(self.device)

        return auto_model

    def forward_transformer(self):
        trans_features = {
            key: value.to(self.device)
            for key, value in self.features.items()
            if key in ["input_ids", "attention_mask", "token_type_ids", "inputs_embeds"]
        }
        output_states = self.auto_model(**trans_features, return_dict=False)
        self.features["token_embeddings"] = output_states[0]

    def forward_pooling(self):
        token_embeddings = self.features["token_embeddings"]

        output_vectors = []
        cls_token = self.features.get("cls_token_embeddings", token_embeddings[:, 0])
        output_vectors.append(cls_token)
        output_vector = torch.cat(output_vectors, 1)
        self.features["sentence_embedding"] = output_vector

    def forward_normalize(self):
        self.features.update(
            {
                "sentence_embedding": F.normalize(
                    self.features["sentence_embedding"], p=2, dim=1
                )
            }
        )

    def encode(self, input_texts, batch_size=32):
        tokenized = self.tokenizer(
            input_texts,
            padding=True,
            truncation="longest_first",
            return_tensors="pt",
            max_length=self.config["transformer"]["max_seq_length"],
        )

        input_ids = tokenized["input_ids"]
        attention_mask = tokenized["attention_mask"]

        all_embeddings = []
        with torch.inference_mode():
            for start_idx in range(0, input_ids.size(0), batch_size):
                end_idx = start_idx + batch_size
                batch_input_ids = input_ids[start_idx:end_idx].to(self.device)
                batch_attention_mask = attention_mask[start_idx:end_idx].to(self.device)

                self.features = {
                    "input_ids": batch_input_ids,
                    "attention_mask": batch_attention_mask,
                }
                self.forward_transformer()
                self.forward_pooling()
                self.forward_normalize()

                batch_embeddings = self.features["sentence_embedding"].detach().cpu()
                all_embeddings.append(batch_embeddings)

        all_embeddings = torch.cat(all_embeddings, dim=0)
        return all_embeddings.tolist()


class SentenceTransformerEmbedding(BaseEmbedding):
    def __init__(self, settings: SettingsDep, model_name: str):
        super().__init__(settings, model_name)
        self.model = EmbeddingModel(model_name)

    async def embed_query(self, query: str) -> List[float]:
        return self.model.encode(query)
