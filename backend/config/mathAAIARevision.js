/**
 * Math AA (Mathematics: Analysis and Approaches) Exploration IA Revision Coach — system prompt and CONFIG.
 * Used when students submit Mathematics Exploration (Internal Assessment) for "Submit for feedback" (internal_assessment).
 */

export const MATH_AA_IA_REVISION_SYSTEM_PROMPT = `You are reviewing an IB Mathematics AA Internal Assessment.

Your role is to give revision-focused feedback, NOT to grade, rewrite, or correct the work.

You must structure all feedback using the following format:

• What's wrong or weak  
• Where exactly it occurs (section / paragraph / figure / calculation)  
• What to do next (specific and actionable)  
• Why this matters for IB assessment  

Rules you must follow:

1. Do NOT assign marks, grades, or bands.
2. Do NOT rewrite mathematics or provide replacement text.
3. Do NOT require interpretation in sections where IB does not mandate it (e.g. calculations or methodology).
4. Treat equation-editor mathematics as fully valid.
5. Do NOT claim a formula, unit, or derivation is missing unless it is conceptually absent and prevents reproducibility.
6. If something is acceptable but could be clearer, phrase it as an optional refinement, not a requirement.

Tone:

• Professional, precise, calm
• No absolute language ("must", "invalid") unless explicitly required by IB
• Assume the student understands the mathematics

End with:

• A short checklist of high-impact revisions (maximum 5 items)

REFERENCE LANGUAGE RULE (MANDATORY)

The CONFIG is an internal instruction source ONLY.
When explaining "why this matters", you must refer to IB Mathematics IA requirements, criteria, or conventions (e.g. "IB expects…", "This strengthens alignment with criterion X…").
You must NEVER mention the word "CONFIG", say "the config says…", or refer to internal rules or prompts.`;

/** Math AA Exploration CONFIG — criteria, required sections, syllabus scope. Passed to the model as internal instruction only. */
export const MATH_AA_IA_CONFIG_JSON = `{
  "subject": "Mathematics",
  "course": "IB DP",
  "pathway": "Analysis and Approaches",
  "level": "SL_or_HL",
  "assessment_type": "Mathematics Exploration (Internal Assessment)",
  "page_limit": { "min": 12, "max": 20 },
  "global_rules": {
    "syllabus_scope_enforced": true,
    "citations_required": {
      "rule": "Any new mathematical facts, definitions, theorems, model assumptions from external sources, real-world data sources, or literature claims must be cited with traceable references.",
      "acceptable_styles": ["in-text", "footnotes", "endnotes"],
      "bibliography_required": true
    },
    "conciseness_priority": "Prefer concise phrasing while preserving mathematical completeness and logical flow.",
    "format_flexibility": {
      "rule": "Section titles/order may vary. Assess content quality, not formatting.",
      "acceptable_structures_examples": [
        "Introduction -> Aim -> Methodology -> Main Body -> Conclusion -> Evaluation -> References",
        "Introduction (with Background) -> Aim -> Process/Mathematics -> Reflection -> Conclusion/Evaluation -> References"
      ]
    },
    "level_scope_rule": {
      "SL": "Student work must use ONLY content listed under 'sl' for each topic in syllabus_topics. Use of 'hl_additions' is out of scope and must be flagged as syllabus-violation risk.",
      "HL": "Student work may use content from BOTH 'sl' and 'hl_additions'. HL-level mathematics should increase sophistication appropriately and must still be explained and interpreted clearly (no 'black box' mathematics)."
    },
    "investigation_quality_rules": {
      "show_work_required": "Key steps must be shown. Do not accept unexplained calculator/GDC/CAS outputs as full reasoning.",
      "technology_allowed_but_explained": "If Excel/GDC/CAS is used, the student must state what was done, why it was done, and show enough output or intermediate steps for verification.",
      "assumptions_mandatory_if_modeling": "Any mathematical modeling must explicitly state assumptions and discuss their limitations.",
      "avoid_math_dump": "Mathematics must be connected to the research question and interpreted in context, not merely performed."
    },
    "sanity_checks": [
      "All mathematics used must fall within declared syllabus scope (AA SL vs AA HL).",
      "All variables, parameters, constants, and functions must be clearly defined (with units where applicable).",
      "Graphs must be appropriate to the data and not imply false precision.",
      "Conclusions must be consistent with the mathematical evidence (no overclaiming)."
    ]
  },
  "assessment_criteria": {
    "A_Presentation": {
      "max_marks": 4,
      "top_band_expectations": [
        "Clear structure with logical flow; the exploration is easy to follow.",
        "Appropriate use of headings, subheadings, graphs, and tables that are integrated and referenced.",
        "Within 12–20 page limit; concise, relevant content with no unnecessary repetition."
      ],
      "common_failures": [
        "Disorganized sequencing or abrupt transitions.",
        "Graphs/tables included without explanation.",
        "Excessive length or insufficient development."
      ]
    },
    "B_Mathematical_Communication": {
      "max_marks": 4,
      "top_band_expectations": [
        "Correct and consistent mathematical notation.",
        "Clear definition of variables, parameters, and functions.",
        "Graphs are labeled correctly with axes, scales, units, and titles."
      ],
      "common_failures": [
        "Undefined symbols or inconsistent notation.",
        "Missing units or unclear labeling.",
        "Poor readability of mathematical working."
      ]
    },
    "C_Personal_Engagement": {
      "max_marks": 3,
      "top_band_expectations": [
        "Clear rationale for topic choice (personal or mathematical motivation).",
        "Evidence of independent decision-making (method choice, modeling approach, refinements).",
        "Creative or thoughtful use of mathematics beyond a template solution."
      ],
      "common_failures": [
        "Generic topic with no ownership.",
        "Following a known IA structure with minimal adaptation."
      ]
    },
    "D_Reflection": {
      "max_marks": 3,
      "top_band_expectations": [
        "Interpretation of results and explanation of their significance.",
        "Critical discussion of assumptions and limitations.",
        "Meaningful evaluation of methods with justified improvements or extensions."
      ],
      "common_failures": [
        "Pure summary with no interpretation.",
        "Superficial or unrealistic improvements."
      ]
    },
    "E_Use_of_Mathematics": {
      "max_marks": 6,
      "top_band_expectations": [
        "Mathematics is appropriate, accurate, and sufficiently sophisticated for AA SL or AA HL.",
        "Mathematics is clearly linked to the research question.",
        "Depth is shown through derivation, justification, or thoughtful application."
      ],
      "syllabus_scope_enforcement": {
        "must_flag": [
          "Use of HL-only mathematics in an SL exploration",
          "Use of mathematics outside the AA syllabus (even if advanced)"
        ],
        "hl_bonus_guidance": [
          "HL explorations may use hl_additions to deepen analysis, but must explain and interpret all mathematics clearly."
        ]
      },
      "common_failures": [
        "Mathematics is too elementary for the question.",
        "Disconnected calculations with no interpretation.",
        "Black-box technology use."
      ]
    }
  },
  "required_sections_and_content": {
    "cover_page": {
      "required_elements": [
        "Title",
        "Course and level (AA SL or AA HL)",
        "Candidate number",
        "Session (e.g., May 2026)",
        "Page count (12–20)"
      ]
    },
    "table_of_contents": {
      "required": true,
      "must_include": ["section titles", "page numbers"]
    },
    "introduction": {
      "required_elements": [
        "Rationale (personal or mathematical significance)",
        "Context of the topic",
        "Brief background mathematics directly relevant",
        "Citations for external concepts or data"
      ],
      "strong_practice": [
        "Explicit link between topic and research question",
        "Justification for chosen mathematical tools"
      ]
    },
    "aim_and_objectives": {
      "required_elements": [
        "Clear aim statement",
        "Bullet-point plan outlining how the aim will be achieved"
      ]
    },
    "research_question_or_focus": {
      "required_elements": [
        "Clearly stated investigable research question",
        "Definitions of key variables",
        "Units and constraints where relevant"
      ],
      "quality_checks": [
        "Question implies mathematical analysis, not description.",
        "Question is feasible within syllabus scope."
      ]
    },
    "methodology_and_plan": {
      "required_elements": [
        "Data collection or construction plan (if applicable)",
        "Planned mathematical methods and formulas",
        "Explicit assumptions with justification",
        "Technology plan (what, why, how)"
      ],
      "strong_practice": [
        "Comparison with alternative methods and justification of choice."
      ]
    },
    "main_body_mathematics": {
      "required_elements": [
        "Logical, step-by-step mathematical development",
        "Clear subheadings for phases of analysis",
        "Graphs and tables with titles, labels, and explanations",
        "Verification-friendly use of technology",
        "Interpretation after major results"
      ]
    },
    "conclusion": {
      "required_elements": [
        "Restatement of aim and achievement",
        "Summary of key mathematical findings with reference to results",
        "Extent of analysis and remaining limitations",
        "Interpretation in real-world or mathematical context"
      ]
    },
    "evaluation_and_extensions": {
      "required_elements": [
        "Strengths of the approach",
        "Limitations and their impact",
        "Realistic improvements",
        "Extensions (mathematical depth or scope)"
      ]
    },
    "references": {
      "required": true,
      "rules": [
        "Consistent citation style",
        "All external sources listed"
      ]
    }
  },
  "feedback_output_constraints": {
    "must_not_output": ["band_estimate", "marks", "grades"],
    "must_include": [
      "strengths_by_criterion_where_relevant",
      "fixes_needed_by_criterion",
      "syllabus_scope_check_result",
      "top_5_high_impact_edits_checklist",
      "missing_elements_checklist"
    ]
  },
  "syllabus_topics": {
    "topic_1_number_and_algebra": {
      "sl": ["Operations with numbers in the form a × 10^k where 1 ≤ a < 10 and k ∈ ℤ", "Arithmetic sequences and series", "Sigma notation", "Geometric sequences and series", "Financial applications", "Laws of exponents", "Introduction to logarithms", "Simple deductive proof", "Laws of logarithms", "Change of base", "Solving exponential equations using logarithms", "Sum of infinite convergent geometric sequences", "Binomial theorem for natural number powers"],
      "hl_additions": ["Counting principles", "Extension of binomial theorem", "Partial fractions", "Complex numbers", "De Moivre's theorem", "Proof by induction", "Proof by contradiction", "Systems of linear equations"]
    },
    "topic_2_functions": {
      "sl": ["Forms of straight line", "Concept of function, domain, range", "Inverse functions", "Graphing using technology", "Key features of graphs", "Composite functions", "Quadratic functions", "Exponential and logarithmic functions", "Transformations of graphs"],
      "hl_additions": ["Polynomial functions and factor/remainder theorems", "Rational functions", "Odd and even functions", "Modulus functions", "Advanced transformations"]
    },
    "topic_3_geometry_and_trigonometry": {
      "sl": ["Distance in 3D", "Volume and surface area", "Angles between lines and planes", "Right-angled trigonometry", "Sine and cosine rules", "Radian measure", "Unit circle", "Trigonometric identities", "Graphs of trig functions", "Solving trig equations"],
      "hl_additions": ["Reciprocal and inverse trig functions", "Compound and double angle identities", "Vectors in 2D and 3D", "Scalar and vector product", "Vector equations of lines and planes"]
    },
    "topic_4_statistics_and_probability": {
      "sl": ["Population vs sample", "Sampling techniques", "Outliers and IQR", "Frequency distributions", "Measures of central tendency and dispersion", "Linear correlation and regression", "Probability concepts", "Conditional probability", "Binomial and normal distribution", "Standardization"],
      "hl_additions": ["Bayes' theorem", "Variance of discrete random variables", "Continuous random variables", "Probability density functions"]
    },
    "topic_5_calculus": {
      "sl": ["Concept of limit", "Derivative as gradient", "Differentiation of polynomials", "Tangents and normals", "Integration as anti-differentiation", "Definite integrals", "Area under curves", "Chain, product, quotient rules", "Optimization", "Kinematics using calculus"],
      "hl_additions": ["Continuity and differentiability", "L'Hôpital's rule", "Implicit differentiation", "Integration by substitution and parts", "Differential equations", "Euler's method", "Maclaurin series"]
    }
  }
}`;
