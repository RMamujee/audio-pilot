#pragma once
#include <JuceHeader.h>

enum class OscType { Sine, Saw, Square };

class SynthVoice : public juce::SynthesiserVoice {
public:
    bool canPlaySound(juce::SynthesiserSound* sound) override;

    void startNote(int midiNoteNumber, float velocity,
                   juce::SynthesiserSound* sound,
                   int currentPitchWheelPosition) override;

    void stopNote(float velocity, bool allowTailOff) override;

    void renderNextBlock(juce::AudioBuffer<float>& outputBuffer,
                         int startSample, int numSamples) override;

    void pitchWheelMoved(int newValue) override {}
    void controllerMoved(int controllerNumber, int newValue) override {}

    void prepareToPlay(double sampleRate, int samplesPerBlock, int numChannels);

    // Parameter setters — called from audio thread via SmoothedValue
    void setOscType(OscType type)              { oscType = type; }
    void setCutoff(float hz)                   { targetCutoff = hz; }
    void setResonance(float q)                 { targetResonance = q; }
    void setADSR(float a, float d, float s, float r);
    void setReverbParams(float roomSize, float wetLevel);

private:
    float nextSample();

    double sampleRate     { 44100.0 };
    float  phase          { 0.0f };
    float  frequency      { 440.0f };
    float  level          { 0.0f };
    OscType oscType       { OscType::Saw };

    float targetCutoff    { 8000.0f };
    float targetResonance { 0.7f };

    juce::ADSR                                   adsr;
    juce::dsp::StateVariableTPTFilter<float>     filter;
    juce::dsp::Reverb                            reverb;
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> smoothedCutoff;
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> smoothedRes;

    bool prepared { false };
};
