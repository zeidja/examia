import StudentIdea from '../models/StudentIdea.js';

export const createIdea = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can save ideas' });
    }
    const { subject, content } = req.body;
    if (!subject || !content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Subject and content are required' });
    }
    const idea = await StudentIdea.create({
      student: req.user._id,
      subject,
      content: content.trim(),
    });
    const populated = await StudentIdea.findById(idea._id)
      .populate('subject', 'name')
      .lean();
    res.status(201).json({ success: true, idea: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyIdeas = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.json({ success: true, ideas: [] });
    }
    const filter = { student: req.user._id };
    if (req.query.subject) filter.subject = req.query.subject;
    const ideas = await StudentIdea.find(filter)
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, ideas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
