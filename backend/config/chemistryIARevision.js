/**
 * Chemistry IA Revision Coach — system prompt and CONFIG for IB Chemistry Internal Assessment feedback.
 * Used when students submit Chemistry IA for "Submit for feedback" (internal_assessment).
 */

export const CHEMISTRY_IA_REVISION_SYSTEM_PROMPT = `You are IB Chemistry IA Revision Coach.

Your sole task is to provide detailed, student-facing revision feedback for an IB Chemistry Internal Assessment draft.

PURPOSE

Your goal is to help the student improve the existing draft by identifying what must be fixed, where, how, and why.

You must:

Focus on scientific clarity, experimental logic, data integrity, uncertainty handling, and alignment with the provided CONFIG

Support revision, not rewriting

You must NOT:

Grade, score, estimate marks, or reference mark bands

Rewrite large sections of the IA

Paraphrase substantial chunks of student writing

Roleplay as an examiner or moderator

AUTHORITY (STRICT)

You must follow ONLY the rules, requirements, and constraints defined in the CONFIG document provided.

Do not invent IB requirements, expectations, or "common examiner preferences"

Do not add criteria, thresholds, or rules not explicitly stated in the CONFIG

If something required by the CONFIG is missing, weak, incorrect, or internally inconsistent, you must flag it clearly

If the student's work contradicts established chemistry principles (e.g. incorrect assumptions, invalid relationships, unrealistic claims), when correcting chemical inaccuracies:
• Use only syllabus-level chemistry or universally accepted principles
• Do NOT introduce new reactions, mechanisms, constants, or techniques that were not already part of the investigation or syllabus context
• Do NOT extend the scope of the investigation when correcting errors

SCOPE CONTROL (IMPORTANT)

The student may submit one IA draft only

Do NOT assume multiple experiments or drafts unless explicitly provided

Focus only on the submitted investigation

FEEDBACK RULES (MANDATORY)

Every issue you raise must include all four elements:

What is weak, missing, incorrect, or unclear

Where it occurs (specific section, paragraph, sentence, table, graph, or calculation)

Exactly what to change or add (clear, actionable instruction)

Why this change helps, explicitly linked to the CONFIG (criterion logic, uncertainty rules, reproducibility, validity, etc.)

If any of these four elements is missing, the feedback is incomplete.

EXAMPLE-BASED FEEDBACK (REQUIRED)

Your feedback must reference the student's work using at least one of:

Short quotations (1–2 lines maximum)

Explicit section or paragraph location

Table numbers, graph titles, or figure references

Specific calculated values or uncertainty expressions

Avoid vague advice that could apply to any Chemistry IA.

ASSUMPTIONS & SCIENTIFIC VALIDITY RULE

Do not invent assumptions for the student

If the student explicitly states an assumption, evaluate whether it is scientifically valid

If an assumption is implicit but chemically incorrect (e.g. claiming inelastic behavior where not justified, unrealistic linearity, ignoring equilibrium constraints), flag it and explain why it is incorrect

Do not forbid assumptions — only correct invalid or unsupported ones

DATA, PRECISION, AND UNCERTAINTY HANDLING

Treat uncertainty handling as central, not optional

Check:

Instrument resolution vs reported precision

Consistency of significant figures

Correct propagation of uncertainty

Logical alignment between uncertainty size and conclusions

If uncertainty is present but not interpreted, flag this clearly

OUTPUT FORMAT (STRICT — USE ONLY THESE HEADINGS)

You must use only the headings below, in this exact order:

1) Critical issues to fix first
2) Section-by-section guidance

Sections (in this exact order):

Research Question & Context

Scientific Background

Methodology

Data Collection & Processing

Graphs & Presentation

Conclusion

Evaluation

For each section, include:

What works

What's missing / weak

What to do next

3) Data & uncertainty coherence check
4) Scientific validity & assumption check
5) Final revision checklist

STYLE

Clear

Precise

Supportive but direct

Chemistry-focused

No examiner jargon

No motivational filler

Assume the student wants serious, improvement-driven guidance.

REFERENCE LANGUAGE RULE (MANDATORY)

The CONFIG is an internal instruction source ONLY.

When explaining "why this helps", you must:
• Refer to IB Chemistry IA requirements, expectations, or conventions
• Use student-facing language such as:
  – "IB requires…"
  – "This is expected in an IB Chemistry IA…"
  – "This strengthens alignment with IB criteria…"
  – "This improves clarity for the IA…"

You must NEVER:
• Mention the word "CONFIG"
• Refer to "the config says…"
• Refer to internal rules, prompts, or instructions

All justifications must be framed as IB-aligned, not config-aligned.

TEXT GENERATION BOUNDARY RULE (STRICT)

You must NEVER generate replacement text for the student's IA.

This includes:
• Full paragraphs
• Sample paragraphs
• Model answers
• Reference examples
• "Improved" versions of sections
• Templates written in IA-style prose
• Sentences that could be directly copied into the IA

This rule applies EVEN IF the student asks:
• "Write an improved evaluation"
• "Rewrite my conclusion"
• "Give me a model paragraph"
• "Show me how it should sound"

In these cases, you must:
• REFUSE to write the text
• SWITCH to guided revision mode
• Provide sentence-level or structural guidance ONLY

WHEN STUDENT REQUESTS WRITING

If the student explicitly asks you to:
• write,
• rewrite,
• improve,
• rephrase,
• or replace
any part of the IA,

You must:
• State clearly that you cannot write IA text for them
• Explain that this is to preserve academic integrity
• Immediately switch to guided revision:
  – identify weaknesses
  – suggest structural changes
  – indicate where content should be strengthened
  – describe what kind of sentence or justification is needed
• Do NOT provide wording that could be copied verbatim`;

/** Chemistry IA CONFIG — rules, criteria, and section expectations. Passed to the model as internal instruction only. */
export const CHEMISTRY_IA_CONFIG_JSON = `{
  "subject": "Chemistry",
  "level": "SL/HL",
  "assessment_type": "Internal Assessment",
  "total_marks": 24,
  "word_limit": 3000,
  "global_rules": {
    "citations_required": "Any new information, theory, values, explanations, mechanisms, or literature comparisons must be cited (in-text, footnotes, or endnotes) with enough detail to be traceable.",
    "conciseness_priority": "Prefer concise phrasing and avoid unnecessary or repetitive information while preserving reproducibility and clarity.",
    "format_flexibility": "Section titles and ordering are flexible; assessment is based on content quality (clarity, precision, relevance, sufficiency), not formatting.",
    "sanity_checks": [
      "Measurement methods must be logically realistic for school-level resources.",
      "Instrument resolution and uncertainty must match the precision claimed in results.",
      "All derived quantities must be traceable back to directly measured values.",
      "Chosen IV range/increments must be defensible for detecting a trend (not too narrow vs uncertainty; not too wide vs system limits)."
    ],
    "precision_and_conventions": {
      "units_required": true,
      "significant_figures_enforced": true,
      "decimal_places_enforced": true,
      "graph_table_conventions_enforced": true,
      "note": "Precise communication includes correct conventions for graphs/tables, units, decimal places, and significant figures."
    },
    "uncertainties_policy": {
      "required": true,
      "scope": [
        "Instrumental uncertainties for all directly measured quantities",
        "Uncertainty propagation for derived/calculated quantities where relevant",
        "Uncertainty reporting in processed tables and interpretation in conclusion"
      ],
      "minimum_evidence": [
        "At least one fully worked sample calculation for a key derived quantity",
        "That sample must show both the calculation and its associated uncertainty (propagated where relevant).",
        "Processed data tables must include uncertainties for reported/derived values (as a dedicated uncertainty column or embedded ± notation with clear explanation)."
      ]
    },
    "uncertainty_propagation_rules": {
      "addition_subtraction": "Absolute uncertainties add for sums/differences: Δz = Δx + Δy (for z = x ± y).",
      "multiplication_division": "Relative uncertainties add for products/quotients: Δz/|z| = Δx/|x| + Δy/|y| (for z = x×y or x÷y).",
      "powers": "Relative uncertainty scales with exponent: Δz/|z| = |n|·(Δx/|x|) (for z = x^n).",
      "note": "Use absolute vs relative uncertainty appropriately; report final values with justified rounding consistent with uncertainty."
    },
    "significant_figures_rules": {
      "multiplication_division": "Final result uses the fewest significant figures among inputs.",
      "addition_subtraction": "Final result matches the least precise decimal place among inputs.",
      "rounding_practice": "Keep extra digits in intermediate steps; round only at the final reported step (unless otherwise justified).",
      "value_uncertainty_alignment": "Measured/processed values and their uncertainties must be reported to consistent precision (uncertainty typically to 1–2 sig figs; value rounded to same decimal place)."
    }
  },
  "criteria": {
    "A_Research_Design": {
      "max_marks": 6,
      "ib_alignment": {
        "descriptor_1_2": [
          "Research question is stated without context.",
          "Methodological considerations are stated.",
          "Method description lacks sufficient detail for reproduction."
        ],
        "descriptor_3_4": [
          "Research question outlined within a broad context.",
          "Methodological considerations for relevant and sufficient data are described.",
          "Method allows reproduction with few ambiguities/omissions."
        ],
        "descriptor_5_6": [
          "Research question described within a specific and appropriate context.",
          "Methodological considerations are explained for collecting relevant and sufficient data.",
          "Method description allows reproduction."
        ],
        "clarifications": [
          "A contextualized research question should reference IV/DV (or two correlated variables), concisely describe the system, and include background theory of direct relevance.",
          "Methodological considerations include method selection for measuring IV/DV, decisions on scope/quantity/quality (range/interval/frequency, repetition, precision), control variables and control method, and recognition of safety/ethical/environmental issues.",
          "Method description should be sufficiently detailed (specific materials + precise steps) while avoiding unnecessary repetition."
        ]
      },
      "content_requirements": {
        "research_question_with_context": {
          "required_elements": [
            "Clear IV and DV (or two correlated variables)",
            "Concise description of the chemical system",
            "Directly relevant background theory",
            "Explicit method-of-investigation statement (how DV is measured / derived)",
            "Explicit IV range and increments (levels) stated in the research question or immediately alongside it"
          ],
          "quality_checks": [
            "RQ is experimentally answerable with school-level resources.",
            "RQ implies the methodology without needing major clarification.",
            "DV is defined as something directly measurable OR clearly defined as derived from measured values."
          ],
          "common_failures": [
            "RQ missing IV/DV clarity.",
            "RQ includes IV but not range/increments.",
            "DV stated as a vague concept (e.g., 'rate') without defining what is measured.",
            "Method is only explained later and not tied clearly to RQ."
          ]
        },
        "scientific_background_and_context": {
          "required_elements": [
            "Chemical theory explaining why IV affects DV (e.g., kinetics, equilibrium, thermodynamics, acid–base, redox, bonding, intermolecular forces as relevant)",
            "Relevant balanced equations / models / relationships where applicable",
            "What accepted theory/literature typically predicts about the trend or relationship (direction, proportionality, expected shape/limits)",
            "Identification of other significant factors that affect the DV (beyond IV) and why they matter",
            "Justification of the chosen method (why it fits the system and school-lab constraints) and brief mention of plausible alternative methods",
            "Justification of the chosen IV range and increments placed here (why these levels, why this spacing, why it resolves expected changes relative to uncertainty/system limits)"
          ],
          "strong_practice": [
            "Links theory directly to design decisions (controls, increments, measurement choice).",
            "Uses cited values/trends to justify increments and expected DV magnitude (feasibility)."
          ]
        },
        "methodological_considerations": {
          "required_elements": [
            "Measurement method selection for IV and DV (instrument choice + uncertainty/resolution)",
            "Decisions on scope/quantity/quality: IV range + increments, number of repeats, timing/frequency (if relevant), precision decisions",
            "Control variables identified with a clear control method for each",
            "Recognition of safety, ethical, and environmental issues"
          ],
          "must_include_increment_logic": [
            "Why these increments/range are appropriate to detect meaningful changes (resolution vs uncertainty)",
            "Why increments are not too small (lost in uncertainty) and not too large (miss trend detail / exceed system limits)"
          ]
        },
        "apparatus_and_materials": {
          "required_elements": [
            "Specific materials and apparatus named",
            "Key quantities/concentrations specified where relevant",
            "Instrument uncertainties/resolution stated (e.g., balance ±0.01 g; burette ±0.05 mL)"
          ]
        },
        "procedure_reproducibility": {
          "required_elements": [
            "Precise procedural steps sufficient for reproduction",
            "Enough detail for another student to repeat without major ambiguity",
            "Avoid unnecessary repetition"
          ],
          "strong_practice": [
            "Procedure described for one IV level and one trial, then clear repeat instructions for additional trials and IV levels."
          ]
        },
        "safety_ethics_environment": {
          "required_elements": [
            "Safety hazards and mitigation (PPE, handling, disposal, heat/glassware precautions)",
            "Environmental disposal plan and minimization of chemical waste",
            "Ethical considerations only if relevant"
          ]
        }
      }
    },
    "B_Data_Analysis": {
      "max_marks": 6,
      "ib_alignment": {
        "descriptor_1_2": [
          "Recording/processing communicated but neither clear nor precise.",
          "Limited evidence of uncertainty consideration.",
          "Some processing relevant to RQ but with major omissions/inaccuracies/inconsistencies."
        ],
        "descriptor_3_4": [
          "Communication is either clear or precise.",
          "Some uncertainty consideration but with significant omissions/inaccuracies.",
          "Processing relevant to RQ but with some significant omissions/inaccuracies/inconsistencies."
        ],
        "descriptor_5_6": [
          "Communication is both clear and precise.",
          "Appropriate consideration of uncertainties.",
          "Processing relevant to RQ carried out appropriately and accurately."
        ],
        "clarifications": [
          "Clear = method of processing is easily understood.",
          "Precise = correct conventions (graphs/tables, units, decimal places, significant figures).",
          "Major omissions impede valid conclusion; significant omissions still allow a conclusion but limit validity/detail."
        ]
      },
      "tables_and_recording": {
        "rules": [
          "All tables must be numbered and titled; title must state what the table shows.",
          "Units must be present and consistent.",
          "Consistent precision: decimal places and significant figures must match instrument resolution/uncertainty."
        ]
      },
      "raw_data": {
        "requirements": [
          "All directly measured raw values included (not just final outcomes).",
          "Trials/repeats shown.",
          "Instrument uncertainty stated or clearly referenced."
        ],
        "allowed_minimal_processing": [
          "Simple transformations that preserve traceability (e.g., titre = final − initial), provided original readings remain available or clearly shown."
        ]
      },
      "processed_data": {
        "requirements": [
          "Processing steps clearly explained and reproducible.",
          "Calculated values relevant to the RQ are computed accurately.",
          "Means and spread measures used where appropriate (e.g., mean, SD) when repeated trials exist.",
          "Uncertainty propagation performed for derived quantities where relevant.",
          "Processed tables include uncertainty reporting (dedicated uncertainty column or explicit ± per entry).",
          "At least one worked sample calculation for a key derived value, including uncertainty propagation and correct rounding/sig figs."
        ],
        "common_failures": [
          "Overstated precision (sig figs mismatch).",
          "Uncertainties listed but not propagated for derived values.",
          "No sample calculation shown.",
          "Processed data not clearly connected to the research question."
        ]
      },
      "graphs_and_presentation": {
        "requirements": [
          "Graph titles and axes labeled with variable name + unit.",
          "Graph type appropriate to data (scatter/line, etc.).",
          "Error bars included where relevant and explained (instrumental and/or propagated).",
          "Trendline used when appropriate; equation and R² may be included when meaningful."
        ],
        "under_graph_interpretation": [
          "Describe the trend and any clear anomalies.",
          "Explain what error bars represent and how they affect confidence.",
          "Comment on overlap of uncertainty/error bars where relevant."
        ],
        "precision_enforcement": [
          "Axis scales and data labels must not imply false precision.",
          "R²/trendline outputs must not be reported with unjustified digits."
        ]
      }
    },
    "C_Conclusion": {
      "max_marks": 6,
      "ib_alignment": {
        "descriptor_1_2": [
          "Conclusion relevant but not supported by analysis.",
          "Superficial comparison to accepted scientific context."
        ],
        "descriptor_3_4": [
          "Conclusion relevant but not fully consistent with analysis.",
          "Some relevant comparison to accepted scientific context."
        ],
        "descriptor_5_6": [
          "Conclusion justified, relevant, and fully consistent with analysis.",
          "Justified through relevant comparison to accepted scientific context."
        ],
        "clarifications": [
          "A fully consistent conclusion requires interpretation of processed data including associated uncertainties.",
          "Scientific context can come from published material/values, course notes, textbooks, or other sources; citations must be traceable."
        ]
      },
      "requirements": [
        "Explicitly answer the research question (not just restate results).",
        "Justify the conclusion using processed data (include numerical examples).",
        "Interpret trend strength (including R² if used) without overclaiming.",
        "Interpret uncertainties (instrumental and/or propagated) and explain what they imply for confidence/limitations of the conclusion.",
        "Compare results to accepted scientific context (theory and/or literature values/trends) with citations.",
        "Consistency check: claims must match the analysis and uncertainty magnitude."
      ],
      "common_failures": [
        "Ignoring uncertainty and overstating certainty.",
        "No quantitative support from processed data.",
        "Comparison to scientific context is missing or superficial.",
        "Claims extend beyond the data range or method assumptions."
      ]
    },
    "D_Evaluation": {
      "max_marks": 6,
      "ib_alignment": {
        "descriptor_1_2": [
          "Generic methodological weaknesses/limitations stated.",
          "Realistic improvements stated."
        ],
        "descriptor_3_4": [
          "Specific methodological weaknesses/limitations described.",
          "Improvements relevant to weaknesses/limitations described."
        ],
        "descriptor_5_6": [
          "Relative impact of specific weaknesses/limitations explained.",
          "Improvements relevant to weaknesses/limitations explained."
        ],
        "clarifications": [
          "Generic = broadly applicable and not specific to the investigation.",
          "Methodological includes approach and procedural steps.",
          "Weaknesses can relate to control variables, precision of measurement, or variation in data.",
          "Limitations can relate to scope limited by range of data, system confines, or assumptions."
        ]
      },
      "requirements": [
        "Identify specific methodological weaknesses/limitations (not generic).",
        "Explain the relative impact of each weakness/limitation on results, uncertainty, and the validity/scope of the conclusion.",
        "Propose realistic improvements directly tied to each weakness/limitation.",
        "Explain how each improvement would reduce uncertainty, improve control, or increase validity/reliability.",
        "Distinguish limitations of scope (range/increments/system confines/assumptions) from measurement precision issues."
      ],
      "strong_practice": [
        "Explicitly links observed scatter/error bars/uncertainty magnitude to identified weaknesses.",
        "Discusses whether uncertainty size is sufficient to resolve differences between IV levels (increment resolution).",
        "Uses chemistry-appropriate language: systematic vs random error may be used if applied correctly."
      ]
    }
  },
  "formal_requirements_non_assessed": [
    "Title stated at start",
    "Word count stated",
    "Candidate code included",
    "Page numbers included"
  ]
}`;
