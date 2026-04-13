#pragma once
#include <JuceHeader.h>
#include "SynthVoice.h"

class SerumDupeProcessor : public juce::AudioProcessor {
public:
    SerumDupeProcessor();
    ~SerumDupeProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override  { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 2.0; }

    int  getNumPrograms() override    { return 1; }
    int  getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    juce::AudioProcessorValueTreeState& getAPVTS() { return apvts; }

    // Called from editor after AI response arrives
    void applyAIParams(float cutoff, float resonance,
                       float attack, float decay,
                       float sustain, float release,
                       float reverbSize, float reverbWet,
                       int oscTypeIndex);

private:
    static juce::AudioProcessorValueTreeState::ParameterLayout createParams();

    juce::AudioProcessorValueTreeState apvts;
    juce::Synthesiser synth;

    static constexpr int NUM_VOICES = 8;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SerumDupeProcessor)
};
