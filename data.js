const conceptData = {
  nodes: [
    {
      id: "topic_computer_basics",
      type: "topic",
      label: "Computer Basics",
      expertise: "A1-A2",
      lessons: "2 lessons",
      description: "Students become comfortable naming hardware and using core OS features.",
      x: 300,
      y: 220,
      radius: 170
    },
    {
      id: "topic_digital_communication",
      type: "topic",
      label: "Digital Communication",
      expertise: "A2-B1",
      lessons: "3 lessons",
      description: "Structure messages and collaborate safely in online spaces.",
      x: 640,
      y: 210,
      radius: 150
    },
    {
      id: "topic_web_foundations",
      type: "topic",
      label: "Web Foundations",
      expertise: "A2-B1",
      lessons: "4 lessons",
      description: "Plan and build a static web page with semantic HTML and accessible styling.",
      x: 950,
      y: 360,
      radius: 190
    },
    {
      id: "topic_programming_fundamentals",
      type: "topic",
      label: "Programming Fundamentals",
      expertise: "B1",
      lessons: "4 lessons",
      description: "Model algorithms and implement them with sequencing, selection, and iteration.",
      x: 460,
      y: 420,
      radius: 190
    },
    {
      id: "topic_cybersecurity",
      type: "topic",
      label: "Cybersecurity Basics",
      expertise: "B1-B2",
      lessons: "3 lessons",
      description: "Protect personal data, vet communication channels, and respond to incidents.",
      x: 760,
      y: 520,
      radius: 170
    },
    {
      id: "goal_identify_hardware",
      type: "goal",
      label: "Identify hardware components",
      expertise: "A1",
      description: "Name and describe the purpose of core PC hardware parts.",
      x: 210,
      y: 150
    },
    {
      id: "activity_label_pc",
      type: "activity",
      label: "Label-the-PC challenge",
      expertise: "A1",
      description: "Students drag labels to motherboard, CPU, RAM, ports in a timed exercise.",
      x: 140,
      y: 100
    },
    {
      id: "term_cpu",
      type: "term",
      label: "CPU",
      expertise: "A1",
      description: "Central processing unit; executes program instructions.",
      x: 260,
      y: 80
    },
    {
      id: "goal_file_management",
      type: "goal",
      label: "Organize files with folders",
      expertise: "A2",
      description: "Create structures, rename files, and use search effectively.",
      x: 330,
      y: 270
    },
    {
      id: "activity_file_sort",
      type: "activity",
      label: "File explorer quest",
      expertise: "A2",
      description: "Pairs reorganize messy folders until rubric criteria are met.",
      x: 380,
      y: 320
    },
    {
      id: "term_os",
      type: "term",
      label: "Operating system",
      expertise: "A2",
      description: "Software that manages hardware, storage, and programs.",
      x: 320,
      y: 200
    },
    {
      id: "goal_compose_email",
      type: "goal",
      label: "Compose a complete email",
      expertise: "A2",
      description: "Write subject lines, attach files, and pick channels based on intent.",
      x: 640,
      y: 150
    },
    {
      id: "activity_peer_email",
      type: "activity",
      label: "Peer-feedback thread",
      expertise: "A2",
      description: "Students exchange draft emails and evaluate clarity & tone.",
      x: 700,
      y: 110
    },
    {
      id: "term_cc_bcc",
      type: "term",
      label: "CC/BCC",
      expertise: "A2",
      description: "Carbon copy / blind carbon copy recipients in email tools.",
      x: 590,
      y: 90
    },
    {
      id: "goal_chat_etiquette",
      type: "goal",
      label: "Apply chat etiquette",
      expertise: "B1",
      description: "Moderate tone, respond with empathy, and leverage structured threads.",
      x: 570,
      y: 230
    },
    {
      id: "goal_structure_html",
      type: "goal",
      label: "Structure HTML semantically",
      expertise: "A2",
      description: "Use headings, sections, and descriptive tags to convey meaning.",
      x: 900,
      y: 260
    },
    {
      id: "activity_profile_page",
      type: "activity",
      label: "Profile page build",
      expertise: "A2",
      description: "Students create a single-page site introducing a fictional mentee.",
      x: 960,
      y: 230
    },
    {
      id: "term_dom",
      type: "term",
      label: "DOM",
      expertise: "A2",
      description: "Document Object Model; tree abstraction of web content.",
      x: 930,
      y: 190
    },
    {
      id: "goal_style_css",
      type: "goal",
      label: "Style layouts with CSS",
      expertise: "B1",
      description: "Combine flexbox, spacing, and color systems for accessibility.",
      x: 1030,
      y: 320
    },
    {
      id: "goal_use_variables",
      type: "goal",
      label: "Use variables & expressions",
      expertise: "B1",
      description: "Trace values through assignments in block or text languages.",
      x: 500,
      y: 360
    },
    {
      id: "activity_pair_programming",
      type: "activity",
      label: "Pair-programming kata",
      expertise: "B1",
      description: "Students alternate driver/navigator to implement short challenges.",
      x: 430,
      y: 350
    },
    {
      id: "goal_debug",
      type: "goal",
      label: "Debug with intention",
      expertise: "B1",
      description: "Form hypotheses, isolate bugs, and document fixes.",
      x: 520,
      y: 470
    },
    {
      id: "term_algorithm",
      type: "term",
      label: "Algorithm",
      expertise: "B1",
      description: "Finite set of steps that solve a category of problems.",
      x: 470,
      y: 300
    },
    {
      id: "goal_secure_passwords",
      type: "goal",
      label: "Create secure passwords",
      expertise: "B1",
      description: "Evaluate password strength and coach peers on passphrases.",
      x: 710,
      y: 470
    },
    {
      id: "activity_password_audit",
      type: "activity",
      label: "Password audit clinic",
      expertise: "B1",
      description: "Students run checklists on sample credentials and suggest upgrades.",
      x: 660,
      y: 420
    },
    {
      id: "goal_spot_phishing",
      type: "goal",
      label: "Spot phishing attempts",
      expertise: "B2",
      description: "Dissect suspicious links, headers, and urgency cues.",
      x: 780,
      y: 580
    },
    {
      id: "activity_phishing_sim",
      type: "activity",
      label: "Phishing simulation",
      expertise: "B2",
      description: "Learners classify inbox items and justify decisions.",
      x: 830,
      y: 540
    },
    {
      id: "term_two_factor",
      type: "term",
      label: "Two-factor auth",
      expertise: "B1",
      description: "Authentication with something you know plus something you have.",
      x: 820,
      y: 480
    }
  ],
  edges: [
    { id: "e_topic_goal_1", source: "topic_computer_basics", target: "goal_identify_hardware", relation: "contains" },
    { id: "e_topic_goal_2", source: "topic_computer_basics", target: "goal_file_management", relation: "contains" },
    { id: "e_topic_term_1", source: "topic_computer_basics", target: "term_os", relation: "contains" },
    { id: "e_topic_activity_1", source: "topic_computer_basics", target: "activity_label_pc", relation: "contains" },
    { id: "e_topic_activity_2", source: "topic_computer_basics", target: "activity_file_sort", relation: "contains" },
    { id: "e_topic_goal_3", source: "topic_digital_communication", target: "goal_compose_email", relation: "contains" },
    { id: "e_topic_goal_4", source: "topic_digital_communication", target: "goal_chat_etiquette", relation: "contains" },
    { id: "e_topic_goal_5", source: "topic_web_foundations", target: "goal_structure_html", relation: "contains" },
    { id: "e_topic_goal_6", source: "topic_web_foundations", target: "goal_style_css", relation: "contains" },
    { id: "e_topic_goal_7", source: "topic_programming_fundamentals", target: "goal_use_variables", relation: "contains" },
    { id: "e_topic_goal_8", source: "topic_programming_fundamentals", target: "goal_debug", relation: "contains" },
    { id: "e_topic_goal_9", source: "topic_cybersecurity", target: "goal_secure_passwords", relation: "contains" },
    { id: "e_topic_goal_10", source: "topic_cybersecurity", target: "goal_spot_phishing", relation: "contains" },
    { id: "e_activity_goal_1", source: "activity_label_pc", target: "goal_identify_hardware", relation: "validates" },
    { id: "e_activity_goal_2", source: "activity_file_sort", target: "goal_file_management", relation: "validates" },
    { id: "e_activity_goal_3", source: "activity_peer_email", target: "goal_compose_email", relation: "validates" },
    { id: "e_activity_goal_4", source: "activity_profile_page", target: "goal_structure_html", relation: "validates" },
    { id: "e_activity_goal_5", source: "activity_pair_programming", target: "goal_use_variables", relation: "validates" },
    { id: "e_activity_goal_6", source: "activity_password_audit", target: "goal_secure_passwords", relation: "validates" },
    { id: "e_activity_goal_7", source: "activity_phishing_sim", target: "goal_spot_phishing", relation: "validates" },
    { id: "e_term_goal_1", source: "term_cpu", target: "goal_identify_hardware", relation: "relates" },
    { id: "e_term_goal_2", source: "term_os", target: "goal_file_management", relation: "relates" },
    { id: "e_term_goal_3", source: "term_cc_bcc", target: "goal_compose_email", relation: "relates" },
    { id: "e_term_goal_4", source: "term_dom", target: "goal_structure_html", relation: "relates" },
    { id: "e_term_goal_5", source: "term_algorithm", target: "goal_use_variables", relation: "relates" },
    { id: "e_term_goal_6", source: "term_two_factor", target: "goal_secure_passwords", relation: "relates" },
    { id: "e_term_goal_7", source: "term_algorithm", target: "goal_structure_html", relation: "relates" },
    { id: "e_goal_overlap_1", source: "goal_chat_etiquette", target: "topic_cybersecurity", relation: "contains" },
    { id: "e_goal_overlap_2", source: "goal_spot_phishing", target: "goal_compose_email", relation: "relates" }
  ]
};
