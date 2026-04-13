#include "SynthVoice.h"
#include "SynthSound.h"

bool SynthVoice::canPlaySound(juce::SynthesiserSound* sound) {
    return dynamic_cast<SynthSound*>(sound) != nullptr;
}

void SynthVoice::prepareToPlay(double sr, int samplesPerBlock, int numChannels) {
    sampleRate = sr;
    adsr.setSampleRate(sr);

    juce::dsp::ProcessSpec spec;
    spec.sampleRate       = sr;
    spec.maximumBlockSize = (juce::uint32) samplesPerBlock;
    spec.numChannels      = (juce::uint32) numChannels;

    filter.prepare(spec);
    filter.setType(juce::dsp::StateVariableTPTFilterType::lowpass);
    filter.setCutoffFrequency(targetCutoff);
    filter.setResonance(targetResonance);

    reverb.prepare(spec);

    smoothedCutoff.reset(sr, 0.05);   // 50 ms smoothing
    smoothedCutoff.setCurrentAndTargetValue(targetCutoff);

    smoothedRes.reset(sr, 0.05);
    smoothedRes.setCurrentAndTargetValue(targetResonance);

    prepared = true;
}

void SynthVoice::startNote(int midiNoteNumber, float velocity,
                            juce::SynthesiserSound*, int) {
    frequency = (float) juce::MidiMessage::getMidiNoteInHertz(midiNoteNumber);
    level     = velocity;
    phase     = 0.0f;
    adsr.noteOn();
}

void SynthVoice::stopNote(float /*velocity*/, bool allowTailOff) {
    adsr.noteOff();
    if (!allowTailOff)
        clearCurrentNote();
}

void SynthVoice::setADSR(float a, float d, float s, float r) {
    juce::ADSR::Parameters p { a, d, s, r };
    adsr.setParameters(p);
}

void SynthVoice::setReverbParams(float roomSize, float wetLevel) {
    juce::Reverb::Parameters rp;
    rp.roomSize  = roomSize;
    rp.wetLevel  = wetLevel;
    rp.dryLevel  = 1.0f - wetLevel;
    rp.damping   = 0.5f;
    reverb.setParameters(rp);
}

float SynthVoice::nextSample() {
    float phaseIncrement = frequency / (float) sampleRate;
    float sample = 0.0f;

    switch (oscType) {
        case OscType::Sine:
            sample = std::sin(phase * juce::MathConstants<float>::twoPi);
            break;
        case OscType::Saw:
            sample = 2.0f * phase - 1.0f;
            break;
        case OscType::Square:
            sample = phase < 0.5f ? 1.0f : -1.0f;
            break;
    }

    phase += phaseIncrement;
    if (phase >= 1.0f) phase -= 1.0f;

    return sample;
}

void SynthVoice::renderNextBlock(juce::AudioBuffer<float>& outputBuffer,
                                  int startSample, int numSamples) {
    if (!prepared || !isVoiceActive()) return;

    // Update smoothed targets
    smoothedCutoff.setTargetValue(targetCutoff);
    smoothedRes.setTargetValue(targetResonance);

    juce::AudioBuffer<float> voiceBuffer(outputBuffer.getNumChannels(), numSamples);
    voiceBuffer.clear();

    for (int s = 0; s < numSamples; ++s) {
        // Update filter params per-sample via smoothed values
        filter.setCutoffFrequency(smoothedCutoff.getNextValue());
        filter.setResonance(smoothedRes.getNextValue());

        float adsrGain = adsr.getNextSample();
        if (!adsr.isActive()) {
            clearCurrentNote();
            break;
        }

        float sample = nextSample() * level * adsrGain * 0.25f;

        for (int ch = 0; ch < voiceBuffer.getNumChannels(); ++ch)
            voiceBuffer.setSample(ch, s, sample);
    }

    // Apply filter
    juce::dsp::AudioBlock<float> block(voiceBuffer);
    juce::dsp::ProcessContextReplacing<float> ctx(block);
    filter.process(ctx);
    reverb.process(ctx);

    // Mix into output
    for (int ch = 0; ch < outputBuffer.getNumChannels(); ++ch)
        outputBuffer.addFrom(ch, startSample,
                             voiceBuffer, ch, 0, numSamples);
}
