import AIPrompt from '../models/AIPrompt.js';

const UPDATABLE_FIELDS = [
  'name',
  'description',
  'systemPrompt',
  'userPromptTemplate',
  'configJson',
  'systemSuffix',
  'category',
  'sortOrder',
  'isActive',
];

function pickUpdatable(body) {
  const out = {};
  for (const k of UPDATABLE_FIELDS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

export const getPrompts = async (req, res) => {
  try {
    const prompts = await AIPrompt.find({})
      .sort({ category: 1, sortOrder: 1, key: 1 })
      .lean();
    res.json({ success: true, prompts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPromptByKey = async (req, res) => {
  try {
    const prompt = await AIPrompt.findOne({ key: req.params.key }).lean();
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt not found' });
    res.json({ success: true, prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPrompt = async (req, res) => {
  try {
    const { key, name, systemPrompt, userPromptTemplate = '', description = '', configJson = '', systemSuffix = '', category = 'other', sortOrder = 999 } = req.body;
    if (!key || !name || !systemPrompt) {
      return res.status(400).json({ success: false, message: 'key, name, and systemPrompt are required' });
    }
    if (!/^[a-z0-9_]+$/.test(key)) {
      return res.status(400).json({ success: false, message: 'key must be lowercase letters, digits, and underscores only' });
    }
    const prompt = await AIPrompt.create({
      key,
      name,
      systemPrompt,
      userPromptTemplate,
      description,
      configJson,
      systemSuffix,
      category,
      sortOrder,
      isActive: req.body.isActive !== false,
    });
    res.status(201).json({ success: true, prompt });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'A prompt with this key already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePrompt = async (req, res) => {
  try {
    const updates = pickUpdatable(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }
    if (updates.sortOrder !== undefined) {
      updates.sortOrder = Number(updates.sortOrder);
      if (Number.isNaN(updates.sortOrder)) delete updates.sortOrder;
    }
    const prompt = await AIPrompt.findOneAndUpdate({ key: req.params.key }, { $set: updates }, { new: true });
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt not found' });
    res.json({ success: true, prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
