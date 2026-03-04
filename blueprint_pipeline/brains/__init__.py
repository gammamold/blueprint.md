# blueprint_pipeline/brains
from .base_brain import BUILDER_PROMPT as BASE_BUILDER_PROMPT
from .base_brain import CRITIC_PROMPT as BASE_CRITIC_PROMPT

def get_brain(module_name: str):
    import importlib
    mod = importlib.import_module(f"blueprint_pipeline.brains.{module_name}")
    return {
        "builder_prompt": getattr(mod, "BUILDER_PROMPT", BASE_BUILDER_PROMPT),
        "critic_prompt": getattr(mod, "CRITIC_PROMPT", BASE_CRITIC_PROMPT),
    }
