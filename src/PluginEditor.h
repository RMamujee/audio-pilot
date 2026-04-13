#pragma once
#include <JuceHeader.h>
#include "PluginProcessor.h"

class SerumDupeEditor : public juce::AudioProcessorEditor,
                        private juce::Timer {
public:
    explicit SerumDupeEditor(SerumDupeProcessor&);
    ~SerumDupeEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    void timerCallback() override {}
    void sendPrompt();
    void handleBackendResponse(const juce::String& jsonStr);
    juce::String getBackendUrl() const;

    SerumDupeProcessor& processor;

    // --- AI prompt area ---
    juce::TextEditor    promptBox;
    juce::TextEditor    artistBox;
    juce::TextButton    generateBtn    { "Generate" };
    juce::Label         statusLabel;

    // --- Backend URL (editable, persisted in plugin state) ---
    juce::TextEditor    backendUrlBox;
    juce::Label         backendUrlLabel { {}, "Backend URL" };
    juce::TextButton    urlToggleBtn   { "Settings" };
    bool                showSettings   { false };

    // --- Synth knobs ---
    juce::Slider        cutoffSlider, resonanceSlider;
    juce::Slider        attackSlider, decaySlider, sustainSlider, releaseSlider;
    juce::Slider        reverbSizeSlider, reverbWetSlider;
    juce::ComboBox      oscTypeBox;

    juce::Label         cutoffLabel    { {}, "Cutoff" };
    juce::Label         resonanceLabel { {}, "Resonance" };
    juce::Label         attackLabel    { {}, "Attack" };
    juce::Label         decayLabel     { {}, "Decay" };
    juce::Label         sustainLabel   { {}, "Sustain" };
    juce::Label         releaseLabel   { {}, "Release" };
    juce::Label         reverbSzLabel  { {}, "Verb Size" };
    juce::Label         reverbWtLabel  { {}, "Verb Wet" };
    juce::Label         oscLabel       { {}, "Oscillator" };

    using SliderAtt = juce::AudioProcessorValueTreeState::SliderAttachment;
    using ComboAtt  = juce::AudioProcessorValueTreeState::ComboBoxAttachment;

    std::unique_ptr<SliderAtt> cutoffAtt, resonanceAtt;
    std::unique_ptr<SliderAtt> attackAtt, decayAtt, sustainAtt, releaseAtt;
    std::unique_ptr<SliderAtt> reverbSizeAtt, reverbWetAtt;
    std::unique_ptr<ComboAtt>  oscTypeAtt;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SerumDupeEditor)
};
