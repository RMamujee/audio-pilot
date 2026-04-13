#pragma once
#include <JuceHeader.h>

// A simple sound that all voices can play
class SynthSound : public juce::SynthesiserSound {
public:
    bool appliesToNote(int) override    { return true; }
    bool appliesToChannel(int) override { return true; }
};
