cmake_minimum_required(VERSION 3.22)
project(SerumDupe VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 17)

# JUCE must be cloned into the JUCE/ subdirectory
add_subdirectory(JUCE)

juce_add_plugin(SerumDupe
    PLUGIN_MANUFACTURER_CODE Srmd
    PLUGIN_CODE Sdpe
    FORMATS VST3 Standalone
    PRODUCT_NAME "Serum Dupe"
    PLUGIN_MANUFACTURER_NAME "RMamujee"
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    VST3_CATEGORIES "Instrument" "Synth"
)

target_sources(SerumDupe PRIVATE
    src/PluginProcessor.cpp
    src/PluginEditor.cpp
    src/SynthVoice.cpp
    src/SynthSound.cpp
)

target_include_directories(SerumDupe PRIVATE src)

target_compile_definitions(SerumDupe PUBLIC
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
)

target_link_libraries(SerumDupe PRIVATE
    juce::juce_audio_processors
    juce::juce_audio_utils
    juce::juce_dsp
    juce::juce_gui_basics
    juce::juce_gui_extra
    PUBLIC
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warning_flags
)
