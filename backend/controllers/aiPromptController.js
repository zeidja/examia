import AIPrompt from '../models/AIPrompt.js';

export const getPrompts = async (req, res) => {
  try {
    const prompts = await AIPrompt.find({ isActive: true }).sort({ key: 1 });
    res.json({ success: true, prompts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPromptByKey = async (req, res) => {
  try {
    const prompt = await AIPrompt.findOne({ key: req.params.key });
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt not found' });
    res.json({ success: true, prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPrompt = async (req, res) => {
  try {
    const prompt = await AIPrompt.create(req.body);
    res.status(201).json({ success: true, prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePrompt = async (req, res) => {
  try {
    const prompt = await AIPrompt.findOneAndUpdate({ key: req.params.key }, req.body, { new: true });
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt not found' });
    res.json({ success: true, prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
