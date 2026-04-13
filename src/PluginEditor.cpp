#include "PluginEditor.h"

static void setupSlider(juce::Slider& s, juce::Label& l,
                         juce::Component* parent, const juce::String& name) {
    s.setSliderStyle(juce::Slider::RotaryVerticalDrag);
    s.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 60, 16);
    parent->addAndMakeVisible(s);
    l.setText(name, juce::dontSendNotification);
    l.setJustificationType(juce::Justification::centred);
    l.setFont(juce::Font(11.0f));
    parent->addAndMakeVisible(l);
}

SerumDupeEditor::SerumDupeEditor(SerumDupeProcessor& p)
    : AudioProcessorEditor(&p), processor(p) {
    setSize(780, 480);
    setResizable(true, true);
    setResizeLimits(600, 380, 1200, 900);

    // Prompt area
    addAndMakeVisible(promptBox);
    promptBox.setMultiLine(false);
    promptBox.setReturnKeyStartsNewLine(false);
    promptBox.setTextToShowWhenEmpty("Describe a sound... (e.g. dark ambient pad)",
                                      juce::Colours::grey);
    promptBox.onReturnKey = [this] { sendPrompt(); };

    addAndMakeVisible(generateBtn);
    generateBtn.onClick = [this] { sendPrompt(); };

    addAndMakeVisible(statusLabel);
    statusLabel.setJustificationType(juce::Justification::centredLeft);
    statusLabel.setFont(juce::Font(11.0f));
    statusLabel.setColour(juce::Label::textColourId, juce::Colours::lightgreen);

    // Oscillator selector
    addAndMakeVisible(oscTypeBox);
    oscTypeBox.addItem("Sine",   1);
    oscTypeBox.addItem("Saw",    2);
    oscTypeBox.addItem("Square", 3);
    addAndMakeVisible(oscLabel);
    oscLabel.setJustificationType(juce::Justification::centred);
    oscLabel.setFont(juce::Font(11.0f));

    // Sliders
    setupSlider(cutoffSlider,      cutoffLabel,      this, "Cutoff");
    setupSlider(resonanceSlider,   resonanceLabel,   this, "Resonance");
    setupSlider(attackSlider,      attackLabel,      this, "Attack");
    setupSlider(decaySlider,       decayLabel,       this, "Decay");
    setupSlider(sustainSlider,     sustainLabel,     this, "Sustain");
    setupSlider(releaseSlider,     releaseLabel,     this, "Release");
    setupSlider(reverbSizeSlider,  reverbSzLabel,    this, "Verb Size");
    setupSlider(reverbWetSlider,   reverbWtLabel,    this, "Verb Wet");

    // APVTS attachments
    auto& apvts = processor.getAPVTS();
    cutoffAtt      = std::make_unique<SliderAtt>(apvts, "cutoff",     cutoffSlider);
    resonanceAtt   = std::make_unique<SliderAtt>(apvts, "resonance",  resonanceSlider);
    attackAtt      = std::make_unique<SliderAtt>(apvts, "attack",     attackSlider);
    decayAtt       = std::make_unique<SliderAtt>(apvts, "decay",      decaySlider);
    sustainAtt     = std::make_unique<SliderAtt>(apvts, "sustain",    sustainSlider);
    releaseAtt     = std::make_unique<SliderAtt>(apvts, "release",    releaseSlider);
    reverbSizeAtt  = std::make_unique<SliderAtt>(apvts, "reverbSize", reverbSizeSlider);
    reverbWetAtt   = std::make_unique<SliderAtt>(apvts, "reverbWet",  reverbWetSlider);
    oscTypeAtt     = std::make_unique<ComboAtt> (apvts, "oscType",    oscTypeBox);
}

SerumDupeEditor::~SerumDupeEditor() {}

void SerumDupeEditor::paint(juce::Graphics& g) {
    g.fillAll(juce::Colour(0xff1a1a2e));

    g.setColour(juce::Colour(0xff16213e));
    g.fillRoundedRectangle(10, 10, getWidth() - 20, 60, 8);

    g.setColour(juce::Colour(0xff0f3460));
    g.fillRoundedRectangle(10, 80, getWidth() - 20, getHeight() - 90, 8);

    g.setColour(juce::Colours::white);
    g.setFont(juce::Font("Arial", 20.0f, juce::Font::bold));
    g.drawText("SERUM DUPE  //  AI Synth", 20, 10, 400, 60,
               juce::Justification::centredLeft);
}

void SerumDupeEditor::resized() {
    auto area = getLocalBounds().reduced(14);

    // Top bar: prompt + button + status
    auto topBar = area.removeFromTop(60);
    promptBox.setBounds(topBar.removeFromLeft(topBar.getWidth() - 140).reduced(4));
    generateBtn.setBounds(topBar.removeFromLeft(100).reduced(4));
    statusLabel.setBounds(area.removeFromTop(18).reduced(4));

    area.removeFromTop(8);

    // Oscillator row
    auto oscRow = area.removeFromTop(50);
    oscLabel.setBounds(oscRow.removeFromLeft(80));
    oscTypeBox.setBounds(oscRow.removeFromLeft(120).reduced(0, 10));

    area.removeFromTop(8);

    // Knob grid: 8 knobs across
    int knobW = area.getWidth() / 8;
    int knobH = area.getHeight();

    auto placeKnob = [&](juce::Slider& s, juce::Label& l) {
        auto col = area.removeFromLeft(knobW);
        l.setBounds(col.removeFromBottom(18));
        s.setBounds(col);
    };

    placeKnob(cutoffSlider,     cutoffLabel);
    placeKnob(resonanceSlider,  resonanceLabel);
    placeKnob(attackSlider,     attackLabel);
    placeKnob(decaySlider,      decayLabel);
    placeKnob(sustainSlider,    sustainLabel);
    placeKnob(releaseSlider,    releaseLabel);
    placeKnob(reverbSizeSlider, reverbSzLabel);
    placeKnob(reverbWetSlider,  reverbWtLabel);
}

void SerumDupeEditor::sendPrompt() {
    auto prompt = promptBox.getText().trim();
    if (prompt.isEmpty()) return;

    statusLabel.setText("Sending to AI...", juce::dontSendNotification);
    generateBtn.setEnabled(false);

    // Fire HTTP request on background thread — never on the message thread
    juce::Thread::launch([this, prompt] {
        juce::String body = R"({"prompt":")" + prompt + R"("})";
        juce::URL url("http://localhost:8765/generate");
        url = url.withPOSTData(body);

        juce::StringPairArray headers;
        headers.set("Content-Type", "application/json");

        int statusCode = 0;
        auto stream = url.createInputStream(
            juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
                .withExtraHeaders("Content-Type: application/json")
                .withConnectionTimeoutMs(5000)
                .withStatusCode(&statusCode));

        if (stream == nullptr || statusCode != 200) {
            juce::MessageManager::callAsync([this] {
                statusLabel.setText("Backend not reachable. Start backend/main.py",
                                     juce::dontSendNotification);
                generateBtn.setEnabled(true);
            });
            return;
        }

        auto response = stream->readEntireStreamAsString();
        juce::MessageManager::callAsync([this, response] {
            handleBackendResponse(response);
            generateBtn.setEnabled(true);
        });
    });
}

void SerumDupeEditor::handleBackendResponse(const juce::String& jsonStr) {
    auto json = juce::JSON::parse(jsonStr);
    if (!json.isObject()) {
        statusLabel.setText("Bad response from backend.", juce::dontSendNotification);
        return;
    }

    float cutoff     = (float)(double) json["cutoff"];
    float resonance  = (float)(double) json["resonance"];
    float attack     = (float)(double) json["attack"];
    float decay      = (float)(double) json["decay"];
    float sustain    = (float)(double) json["sustain"];
    float release    = (float)(double) json["release"];
    float reverbSize = (float)(double) json["reverb_size"];
    float reverbWet  = (float)(double) json["reverb_wet"];

    juce::String oscStr = json["osc_type"].toString();
    int oscIdx = 1; // default Saw
    if      (oscStr == "sine")   oscIdx = 0;
    else if (oscStr == "saw")    oscIdx = 1;
    else if (oscStr == "square") oscIdx = 2;

    processor.applyAIParams(cutoff, resonance, attack, decay,
                             sustain, release, reverbSize, reverbWet, oscIdx);

    juce::String matched = json["matched_preset"].toString();
    float conf = (float)(double) json["confidence"];
    statusLabel.setText("Matched: \"" + matched + "\"  (" +
                         juce::String(conf * 100.0f, 1) + "% confidence)",
                         juce::dontSendNotification);
}
