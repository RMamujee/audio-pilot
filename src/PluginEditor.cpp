#include "PluginEditor.h"

// Default backend: HF Space URL. Falls back gracefully if unreachable.
// Users can override this in the plugin's Settings panel.
static const juce::String DEFAULT_BACKEND_URL =
    "https://mclovin6969-serum-dupe.hf.space";

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
    setSize(800, 520);
    setResizable(true, true);
    setResizeLimits(620, 420, 1200, 900);

    // Prompt fields
    addAndMakeVisible(promptBox);
    promptBox.setMultiLine(false);
    promptBox.setTextToShowWhenEmpty("Sound description (e.g. dark ambient pad)",
                                      juce::Colours::grey);
    promptBox.onReturnKey = [this] { sendPrompt(); };

    addAndMakeVisible(artistBox);
    artistBox.setMultiLine(false);
    artistBox.setTextToShowWhenEmpty("Artist name (optional)",
                                     juce::Colours::grey);
    artistBox.onReturnKey = [this] { sendPrompt(); };

    addAndMakeVisible(generateBtn);
    generateBtn.onClick = [this] { sendPrompt(); };

    addAndMakeVisible(statusLabel);
    statusLabel.setJustificationType(juce::Justification::centredLeft);
    statusLabel.setFont(juce::Font(11.0f));
    statusLabel.setColour(juce::Label::textColourId, juce::Colours::lightgreen);

    // Settings panel (hidden by default)
    addAndMakeVisible(urlToggleBtn);
    urlToggleBtn.onClick = [this] {
        showSettings = !showSettings;
        backendUrlBox.setVisible(showSettings);
        backendUrlLabel.setVisible(showSettings);
        resized();
    };

    backendUrlLabel.setFont(juce::Font(11.0f));
    backendUrlLabel.setColour(juce::Label::textColourId, juce::Colours::grey);
    addChildComponent(backendUrlLabel);

    backendUrlBox.setMultiLine(false);
    backendUrlBox.setText(DEFAULT_BACKEND_URL, juce::dontSendNotification);
    addChildComponent(backendUrlBox);

    // Oscillator
    addAndMakeVisible(oscTypeBox);
    oscTypeBox.addItem("Sine",   1);
    oscTypeBox.addItem("Saw",    2);
    oscTypeBox.addItem("Square", 3);
    addAndMakeVisible(oscLabel);
    oscLabel.setJustificationType(juce::Justification::centred);
    oscLabel.setFont(juce::Font(11.0f));

    // Knobs
    setupSlider(cutoffSlider,     cutoffLabel,    this, "Cutoff");
    setupSlider(resonanceSlider,  resonanceLabel, this, "Resonance");
    setupSlider(attackSlider,     attackLabel,    this, "Attack");
    setupSlider(decaySlider,      decayLabel,     this, "Decay");
    setupSlider(sustainSlider,    sustainLabel,   this, "Sustain");
    setupSlider(releaseSlider,    releaseLabel,   this, "Release");
    setupSlider(reverbSizeSlider, reverbSzLabel,  this, "Verb Size");
    setupSlider(reverbWetSlider,  reverbWtLabel,  this, "Verb Wet");

    auto& apvts = processor.getAPVTS();
    cutoffAtt     = std::make_unique<SliderAtt>(apvts, "cutoff",     cutoffSlider);
    resonanceAtt  = std::make_unique<SliderAtt>(apvts, "resonance",  resonanceSlider);
    attackAtt     = std::make_unique<SliderAtt>(apvts, "attack",     attackSlider);
    decayAtt      = std::make_unique<SliderAtt>(apvts, "decay",      decaySlider);
    sustainAtt    = std::make_unique<SliderAtt>(apvts, "sustain",    sustainSlider);
    releaseAtt    = std::make_unique<SliderAtt>(apvts, "release",    releaseSlider);
    reverbSizeAtt = std::make_unique<SliderAtt>(apvts, "reverbSize", reverbSizeSlider);
    reverbWetAtt  = std::make_unique<SliderAtt>(apvts, "reverbWet",  reverbWetSlider);
    oscTypeAtt    = std::make_unique<ComboAtt> (apvts, "oscType",    oscTypeBox);
}

SerumDupeEditor::~SerumDupeEditor() {}

void SerumDupeEditor::paint(juce::Graphics& g) {
    g.fillAll(juce::Colour(0xff1a1a2e));

    // Header strip
    g.setColour(juce::Colour(0xff16213e));
    g.fillRoundedRectangle(10, 10, getWidth() - 20, 100, 8);

    // Accent bar
    g.setColour(juce::Colour(0xff7c3aed));
    g.fillRoundedRectangle(10, 10, getWidth() - 20, 3, 2);

    g.setColour(juce::Colours::white);
    g.setFont(juce::Font("Arial", 18.0f, juce::Font::bold));
    g.drawText("SERUM DUPE", 20, 14, 200, 28, juce::Justification::centredLeft);

    g.setColour(juce::Colour(0xff7c3aed));
    g.setFont(juce::Font(11.0f));
    g.drawText("AI SOUND FINDER", 20, 40, 200, 16, juce::Justification::centredLeft);
}

void SerumDupeEditor::resized() {
    auto area = getLocalBounds().reduced(14);
    area.removeFromTop(10); // header space

    // Title row
    auto titleRow = area.removeFromTop(60);
    titleRow.removeFromLeft(180); // skip title text area
    urlToggleBtn.setBounds(titleRow.removeFromRight(80).reduced(4));

    // Settings row (conditionally visible)
    if (showSettings) {
        auto settingsRow = area.removeFromTop(32);
        backendUrlLabel.setBounds(settingsRow.removeFromLeft(90).reduced(0, 6));
        backendUrlBox.setBounds(settingsRow.reduced(2, 6));
    }

    // Prompt + artist row
    auto promptRow = area.removeFromTop(36);
    promptBox.setBounds(promptRow.removeFromLeft(promptRow.getWidth() / 2 - 4).reduced(2));
    artistBox.setBounds(promptRow.removeFromLeft(promptRow.getWidth() - 110).reduced(2));
    generateBtn.setBounds(promptRow.reduced(2));

    // Status
    statusLabel.setBounds(area.removeFromTop(20).reduced(2));
    area.removeFromTop(6);

    // Oscillator row
    auto oscRow = area.removeFromTop(44);
    oscLabel.setBounds(oscRow.removeFromLeft(70));
    oscTypeBox.setBounds(oscRow.removeFromLeft(110).reduced(0, 8));

    area.removeFromTop(8);

    // Knob grid (8 knobs)
    int knobW = area.getWidth() / 8;
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

juce::String SerumDupeEditor::getBackendUrl() const {
    auto url = backendUrlBox.getText().trim();
    return url.isEmpty() ? DEFAULT_BACKEND_URL : url;
}

void SerumDupeEditor::sendPrompt() {
    auto prompt = promptBox.getText().trim();
    auto artist = artistBox.getText().trim();
    if (prompt.isEmpty() && artist.isEmpty()) return;

    statusLabel.setText("Querying AI backend...", juce::dontSendNotification);
    statusLabel.setColour(juce::Label::textColourId, juce::Colours::yellow);
    generateBtn.setEnabled(false);

    auto backendUrl = getBackendUrl();

    juce::Thread::launch([this, prompt, artist, backendUrl] {
        // Build JSON manually — no external JSON lib needed
        juce::String body = "{\"prompt\":\"" + prompt + "\","
                             "\"artist\":\"" + artist + "\","
                             "\"top_k\":1}";

        juce::URL url(backendUrl + "/generate");
        int statusCode = 0;

        auto stream = url.createInputStream(
            juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
                .withPOSTData(body)
                .withExtraHeaders("Content-Type: application/json")
                .withConnectionTimeoutMs(20000)  // HF Spaces can have ~10s cold start
                .withStatusCode(&statusCode));

        if (stream == nullptr || statusCode != 200) {
            juce::MessageManager::callAsync([this, statusCode] {
                juce::String msg = statusCode == 0
                    ? "Backend unreachable. Check URL in Settings."
                    : "Backend error (HTTP " + juce::String(statusCode) + ")";
                statusLabel.setText(msg, juce::dontSendNotification);
                statusLabel.setColour(juce::Label::textColourId, juce::Colours::red);
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
    auto root = juce::JSON::parse(jsonStr);

    // HF Space returns { results: [...] }, local backend may return same
    auto* resultsArr = root["results"].getArray();
    if (resultsArr == nullptr || resultsArr->isEmpty()) {
        statusLabel.setText("No results from backend.", juce::dontSendNotification);
        statusLabel.setColour(juce::Label::textColourId, juce::Colours::red);
        return;
    }

    // Take the top result
    auto top = (*resultsArr)[0];
    auto params = top["params"];

    float cutoff     = (float)(double) params["cutoff"];
    float resonance  = (float)(double) params["resonance"];
    float attack     = (float)(double) params["attack"];
    float decay      = (float)(double) params["decay"];
    float sustain    = (float)(double) params["sustain"];
    float release    = (float)(double) params["release"];
    float reverbSize = (float)(double) params["reverb_size"];
    float reverbWet  = (float)(double) params["reverb_wet"];

    juce::String oscStr = params["osc_type"].toString();
    int oscIdx = 1;
    if      (oscStr == "sine")   oscIdx = 0;
    else if (oscStr == "saw")    oscIdx = 1;
    else if (oscStr == "square") oscIdx = 2;

    processor.applyAIParams(cutoff, resonance, attack, decay,
                             sustain, release, reverbSize, reverbWet, oscIdx);

    juce::String name = top["name"].toString();
    float conf = (float)(double) top["confidence"];
    statusLabel.setText(
        "Matched: \"" + name + "\"  (" + juce::String(conf * 100.0f, 1) + "%)",
        juce::dontSendNotification);
    statusLabel.setColour(juce::Label::textColourId, juce::Colours::lightgreen);
}
