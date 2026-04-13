#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "SynthSound.h"

juce::AudioProcessorValueTreeState::ParameterLayout SerumDupeProcessor::createParams() {
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "cutoff", "Filter Cutoff", 20.0f, 20000.0f, 8000.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "resonance", "Resonance", 0.1f, 10.0f, 0.7f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "attack",  "Attack",  0.001f, 5.0f, 0.01f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "decay",   "Decay",   0.001f, 5.0f, 0.3f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "sustain", "Sustain", 0.0f,   1.0f, 0.7f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "release", "Release", 0.001f, 8.0f, 0.5f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "reverbSize", "Reverb Size", 0.0f, 1.0f, 0.3f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "reverbWet", "Reverb Wet", 0.0f, 1.0f, 0.1f));
    params.push_back(std::make_unique<juce::AudioParameterChoice>(
        "oscType", "Oscillator", juce::StringArray { "Sine", "Saw", "Square" }, 1));

    return { params.begin(), params.end() };
}

SerumDupeProcessor::SerumDupeProcessor()
    : AudioProcessor(BusesProperties()
          .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "Parameters", createParams()) {
    synth.addSound(new SynthSound());
    for (int i = 0; i < NUM_VOICES; ++i)
        synth.addVoice(new SynthVoice());
}

SerumDupeProcessor::~SerumDupeProcessor() {}

void SerumDupeProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    synth.setCurrentPlaybackSampleRate(sampleRate);
    for (int i = 0; i < synth.getNumVoices(); ++i) {
        if (auto* voice = dynamic_cast<SynthVoice*>(synth.getVoice(i)))
            voice->prepareToPlay(sampleRate, samplesPerBlock, 2);
    }
}

void SerumDupeProcessor::releaseResources() {}

void SerumDupeProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                       juce::MidiBuffer& midiMessages) {
    juce::ScopedNoDenormals noDenormals;
    buffer.clear();

    // Sync voice params from APVTS each block
    float cutoff      = apvts.getRawParameterValue("cutoff")->load();
    float resonance   = apvts.getRawParameterValue("resonance")->load();
    float attack      = apvts.getRawParameterValue("attack")->load();
    float decay       = apvts.getRawParameterValue("decay")->load();
    float sustain     = apvts.getRawParameterValue("sustain")->load();
    float release     = apvts.getRawParameterValue("release")->load();
    float reverbSize  = apvts.getRawParameterValue("reverbSize")->load();
    float reverbWet   = apvts.getRawParameterValue("reverbWet")->load();
    int   oscIdx      = (int) apvts.getRawParameterValue("oscType")->load();

    for (int i = 0; i < synth.getNumVoices(); ++i) {
        if (auto* voice = dynamic_cast<SynthVoice*>(synth.getVoice(i))) {
            voice->setCutoff(cutoff);
            voice->setResonance(resonance);
            voice->setADSR(attack, decay, sustain, release);
            voice->setReverbParams(reverbSize, reverbWet);
            voice->setOscType(static_cast<OscType>(oscIdx));
        }
    }

    synth.renderNextBlock(buffer, midiMessages, 0, buffer.getNumSamples());
}

void SerumDupeProcessor::applyAIParams(float cutoff, float resonance,
                                        float attack, float decay,
                                        float sustain, float release,
                                        float reverbSize, float reverbWet,
                                        int oscTypeIndex) {
    auto setParam = [&](const char* id, float val) {
        if (auto* p = apvts.getParameter(id))
            p->setValueNotifyingHost(
                apvts.getParameterRange(id).convertTo0to1(val));
    };

    setParam("cutoff",     cutoff);
    setParam("resonance",  resonance);
    setParam("attack",     attack);
    setParam("decay",      decay);
    setParam("sustain",    sustain);
    setParam("release",    release);
    setParam("reverbSize", reverbSize);
    setParam("reverbWet",  reverbWet);

    if (auto* p = dynamic_cast<juce::AudioParameterChoice*>(
            apvts.getParameter("oscType")))
        p->setValueNotifyingHost(p->convertTo0to1((float) oscTypeIndex));
}

juce::AudioProcessorEditor* SerumDupeProcessor::createEditor() {
    return new SerumDupeEditor(*this);
}

void SerumDupeProcessor::getStateInformation(juce::MemoryBlock& destData) {
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void SerumDupeProcessor::setStateInformation(const void* data, int sizeInBytes) {
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
    if (xmlState && xmlState->hasTagName(apvts.state.getType()))
        apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
    return new SerumDupeProcessor();
}
