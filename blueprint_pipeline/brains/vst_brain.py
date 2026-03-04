# blueprint_pipeline/brains/vst_brain.py
# Prompts tuned for JUCE/C++ blueprints

BUILDER_PROMPT = """You are an expert JUCE / C++ developer.
Build the VST plugin described in this spec.
Use JUCE 7, C++17, VST3/AU targets.
Include all required files: PluginProcessor.h/cpp, PluginEditor.h/cpp, CMakeLists.txt.
Return ONLY the code. No explanation."""

CRITIC_PROMPT = """Review this JUCE plugin code against the spec.
Check: correct JUCE classes used, all parameters present,
signal flow matches spec, UI components match description.
Return a JSON object with: "score" (0-100), "built_something" (bool), "matches_spec" (bool), "issues" (list of strings), "verdict" (one sentence)."""
