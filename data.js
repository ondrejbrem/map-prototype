const areaNode = {
  id: "area_media_literacy",
  type: "area",
  label: "Mediální výchova",
  expertise: "B1-B2",
  description: "Vizualizuje síť témat a atomických cílů Mediální výchovy od porozumění systému po kritické ověřování obsahu.",
  x: 600,
  y: 420,
  radius: 430,
  labelSize: "1.2rem"
};

const baseTopics = [
  {
    id: "topic_media_system",
    type: "topic",
    label: "Mediální systém a regulace",
    expertise: "B1-B2",
    description: "Mapuje instituce, vlastnictví a pravidla, která rámují fungování médií a ochranu tvůrců.",
    x: 360,
    y: 260,
    radius: 170,
    labelSize: "0.95rem"
  },
  {
    id: "topic_content_genres",
    type: "topic",
    label: "Obsah a žánry",
    expertise: "B1-B2",
    description: "Sleduje, jak vzniká mediální obsah, jaké žánry používá a jak reprezentuje skupiny lidí.",
    x: 840,
    y: 260,
    radius: 170,
    labelSize: "1.05rem"
  },
  {
    id: "topic_manipulation_influence",
    type: "topic",
    label: "Manipulace a vliv",
    expertise: "B1-B2",
    description: "Ukazuje strategie ovlivňování, polarizační taktiky i informační útoky zaměřené na publikum.",
    x: 360,
    y: 600,
    radius: 170,
    labelSize: "0.9rem"
  },
  {
    id: "topic_critical_verification",
    type: "topic",
    label: "Kritické myšlení a ověřování",
    expertise: "B1-B2",
    description: "Opírá se o logiku, fact-checking a práci s důkazy pro posouzení kvality mediálního sdělení.",
    x: 840,
    y: 600,
    radius: 170,
    labelSize: "0.9rem"
  }
];

const termLibrary = {
  term_mass_media: {
    label: "Medium / mass media",
    expertise: "B1",
    description: "Tradiční platformy jako televize, rozhlas či tisk, které jednosměrně oslovují široké publikum."
  },
  term_media_ethics: {
    label: "Media ethics",
    expertise: "B1",
    description: "Soubor norem a dilemat, podle nichž redakce rozhodují o férovém obsahu."
  },
  term_copyright: {
    label: "Copyright",
    expertise: "B1",
    description: "Právní rámec, který stanovuje, kdo může dílo používat a za jakých podmínek."
  },
  term_media_ownership: {
    label: "Public-service / state / private media",
    expertise: "B1",
    description: "Struktura vlastnictví médií napříč veřejnoprávními, státními a soukromými institucemi.",
    labelSize: "0.78rem"
  },
  term_licence_fee: {
    label: "Licence fee (broadcast licence fee)",
    expertise: "B1",
    description: "Poplatek, jímž domácnosti financují veřejnoprávní vysílání a jeho nezávislost.",
    labelSize: "0.8rem"
  },
  term_news_journalism: {
    label: "News / journalism",
    expertise: "B1-B2",
    description: "Profesní proces vytváření a sdílení ověřených informací podle pravidel žurnalistiky."
  },
  term_advertising: {
    label: "Advertising / propaganda / product placement",
    expertise: "B1",
    description: "Komunikace zaměřená na přesvědčení publika, včetně propagandy a skrytého umístění produktů.",
    labelSize: "0.8rem"
  },
  term_stereotype: {
    label: "Stereotype",
    expertise: "B1-B2",
    description: "Zjednodušené a často předsudečné představy o skupinách lidí."
  },
  term_social_network_types: {
    label: "Types of social networks",
    expertise: "B1",
    description: "Rozličné sociální platformy lišící se formátem, publikem i pravidly interakce.",
    labelSize: "0.82rem"
  },
  term_disinformation: {
    label: "Disinformation / fake news / deepfake",
    expertise: "B1-B2",
    description: "Záměrně zavádějící obsah jako fake news nebo deepfaky, který narušuje důvěru v informace.",
    labelSize: "0.78rem"
  },
  term_manipulation: {
    label: "Manipulation of public opinion",
    expertise: "B1",
    description: "Techniky, které upravují veřejné mínění pomocí emocí, polopravd a opakování."
  },
  term_influencer: {
    label: "Influencer",
    expertise: "B1",
    description: "Osoba s výrazným dosahem na sociálních sítích, která může ovlivňovat postoje publika."
  },
  term_clickbait: {
    label: "Clickbait",
    expertise: "B1-B2",
    description: "Titulek navržený pro maximalizaci prokliků pomocí senzace, neúplnosti či přehánění."
  },
  term_dark_posting: {
    label: "Dark posting",
    expertise: "B1",
    description: "Cílené placené příspěvky, které jsou viditelné jen zvoleným segmentům publika.",
    labelSize: "0.78rem"
  },
  term_echo_chamber: {
    label: "Echo chamber / rabbit hole / social (filter) bubble",
    expertise: "B1",
    description: "Prostředí, kde algoritmy a kontakty opakují stejné názory a filtrují odlišné hlasy.",
    labelSize: "0.72rem"
  },
  term_hybrid_warfare: {
    label: "Hybrid warfare",
    expertise: "B1",
    description: "Kombinace vojenských, kybernetických a informačních taktik k oslabení protivníka."
  },
  term_microtargeting: {
    label: "Target audience / microtargeting",
    expertise: "B1",
    description: "Precizní doručování sdělení úzkým publikům na základě detailních dat o chování.",
    labelSize: "0.8rem"
  },
  term_critical_thinking: {
    label: "Critical thinking",
    expertise: "B1",
    description: "Kognitivní proces zpochybňování tvrzení, hledání důkazů a hodnocení zdrojů."
  },
  term_fact_checking: {
    label: "Source of information / fact-checking",
    expertise: "B1-B2",
    description: "Systematické ověřování tvrzení pomocí spolehlivých zdrojů a transparentních postupů.",
    labelSize: "0.8rem"
  },
  term_algorithm: {
    label: "Algorithm",
    expertise: "B1-B2",
    description: "Sada pravidel, která automaticky rozhoduje, třídí nebo doporučuje obsah uživatelům."
  },
  term_logical_fallacy: {
    label: "Logical fallacy",
    expertise: "B1-B2",
    description: "Opakující se chyby v argumentaci, které na první pohled působí přesvědčivě."
  }
};

const atomicGoals = [
  {
    id: "goal_mass_media_generalization",
    termId: "term_mass_media",
    topicId: "topic_media_system",
    label: "Masová média: vyber zobecnění",
    expertise: "B1",
    description: "Žák vybere z nabízených tvrzení to, které je platným zobecněním o masových médiích (nikoli jednotlivým faktem), a své rozhodnutí doloží dvěma relevantními příklady."
  },
  {
    id: "goal_media_ethics_generalization",
    termId: "term_media_ethics",
    topicId: "topic_media_system",
    label: "Mediální etika: dolož pravidla",
    expertise: "B1",
    description: "Žák rozhodne, které tvrzení je zobecněním o mediální etice (nikoli jednotlivým faktem), a volbu zdůvodní dvěma příklady pravidel či dilemat."
  },
  {
    id: "goal_copyright_generalization",
    termId: "term_copyright",
    topicId: "topic_media_system",
    label: "Copyright: vysvětli pravidla",
    expertise: "B1",
    description: "Žák rozhodne, které tvrzení je zobecněním o autorském právu (copyrightu) (nikoli jednotlivým faktem), a volbu podpoří dvěma příklady pravidel či situací."
  },
  {
    id: "goal_media_ownership_generalization",
    termId: "term_media_ownership",
    topicId: "topic_media_system",
    label: "Typy médií: rozliš instituce",
    expertise: "B1",
    description: "Žák vybere platné zobecnění o veřejnoprávních, státních a soukromých médiích (nikoli jednotlivým faktem) a rozhodnutí podpoří dvěma příklady institucí či znaků."
  },
  {
    id: "goal_licence_fee_generalization",
    termId: "term_licence_fee",
    topicId: "topic_media_system",
    label: "Poplatky: vysvětli fungování",
    expertise: "B1",
    description: "Žák rozhodne, které tvrzení je zobecněním o koncesionářských poplatcích (nikoli jednotlivým faktem), a volbu doloží dvěma příklady fungování."
  },
  {
    id: "goal_news_generalization",
    termId: "term_news_journalism",
    topicId: "topic_content_genres",
    label: "Žurnalistika: určuj zobecnění",
    expertise: "B1",
    description: "Žák rozhodne, které tvrzení je zobecněním o zprávách a žurnalistice (nikoli jednotlivým faktem), a volbu zdůvodní dvěma příklady z praxe."
  },
  {
    id: "goal_news_experiment_5w1h",
    termId: "term_news_journalism",
    topicId: "topic_content_genres",
    label: "Zprávy: test 5W1H",
    expertise: "B2",
    description: "Žák formuluje předpověď a navrhne, provede a vyhodnotí experiment, kterým ověří zobecnění, že zpravodajské texty obvykle odpovídají na otázky 5W1H (kdo, co, kdy, kde, proč a jak)."
  },
  {
    id: "goal_advertising_generalization",
    termId: "term_advertising",
    topicId: "topic_content_genres",
    label: "Reklama: posuď zobecnění",
    expertise: "B1",
    description: "Žák vybere platné zobecnění o reklamě, propagandě a product placementu (nikoli jednotlivým faktem) a rozhodnutí podpoří dvěma příklady."
  },
  {
    id: "goal_stereotype_generalization",
    termId: "term_stereotype",
    topicId: "topic_content_genres",
    label: "Stereotypy: rozliš tvrzení",
    expertise: "B1",
    description: "Žák rozhodne, které tvrzení je zobecněním o stereotypech (nikoli jednotlivým faktem), a volbu zdůvodní dvěma ilustračními příklady."
  },
  {
    id: "goal_stereotype_ad_analysis",
    termId: "term_stereotype",
    topicId: "topic_content_genres",
    label: "Stereotypy: analyzuj reklamy",
    expertise: "B2",
    description: "Žák prošetří platnost zobecnění, že reklamní spoty často využívají genderové stereotypy, analýzou vybraného vzorku a obhajobou závěru podloženého příklady."
  },
  {
    id: "goal_social_network_types_generalization",
    termId: "term_social_network_types",
    topicId: "topic_content_genres",
    label: "Sociální sítě: popiš typy",
    labelSize: "0.78rem",
    expertise: "B1",
    description: "Žák vybere zobecnění o typech sociálních sítí (nikoli jednotlivým faktem) a rozhodnutí doloží dvěma příklady rozdílných platforem a jejich znaků."
  },
  {
    id: "goal_disinformation_generalization",
    termId: "term_disinformation",
    topicId: "topic_manipulation_influence",
    label: "Dezinformace: identifikuj vzorce",
    expertise: "B1",
    description: "Žák rozhodne, které tvrzení je platným zobecněním o dezinformacích / fake news / deepfake (nikoli jednotlivým faktem), a volbu doloží dvěma konkrétními příklady."
  },
  {
    id: "goal_disinformation_video_verification",
    termId: "term_disinformation",
    topicId: "topic_manipulation_influence",
    label: "Deepfake video: rozhodni",
    labelSize: "0.72rem",
    expertise: "B2",
    description: "Žák vyřeší problém ověření autenticity virálního videa tak, že na základě generalizace „deepfaky často vykazují nesoulad mimiky, stínů a synchronizace zvuku s obrazem“ posoudí dvě alternativy (pravé vs. podvrh) a rozhodne ANO/NE o použití videa, přičemž uvede alespoň 2 zjištěné příznaky na podporu rozhodnutí."
  },
  {
    id: "goal_manipulation_generalization",
    termId: "term_manipulation",
    topicId: "topic_manipulation_influence",
    label: "Manipulace: dolož techniky",
    expertise: "B1",
    description: "Žák vybere zobecnění o manipulaci veřejného mínění (nikoli jednotlivým faktem) a své rozhodnutí podloží dvěma příklady technik."
  },
  {
    id: "goal_influencer_generalization",
    termId: "term_influencer",
    topicId: "topic_manipulation_influence",
    label: "Influenceři: definuj třídu",
    expertise: "B1",
    description: "Žák rozhodne, které tvrzení je platným zobecněním o influencerech jako třídě osob (nikoli jednotlivým faktem), a volbu podloží dvěma příklady."
  },
  {
    id: "goal_clickbait_generalization",
    termId: "term_clickbait",
    topicId: "topic_manipulation_influence",
    label: "Clickbait: rozpoznej znaky",
    expertise: "B1",
    description: "Žák vybere zobecnění o clickbaitu (nikoli jednotlivým faktem) a své rozhodnutí podloží dvěma příklady nadpisů."
  },
  {
    id: "goal_clickbait_source_selection",
    termId: "term_clickbait",
    topicId: "topic_manipulation_influence",
    label: "Clickbait: filtruj zdroje",
    labelSize: "0.72rem",
    expertise: "B2",
    description: "Žák vyřeší problém výběru spolehlivých článků pro referát tak, že na základě generalizace „clickbaitové titulky často používají senzacechtivá, neúplná či přehnaná tvrzení“ správně identifikuje a vyřadí alespoň 3 z 5 předložených clickbaitových titulků a ponechá 2 vhodné zdroje."
  },
  {
    id: "goal_clickbait_emotive_experiment",
    termId: "term_clickbait",
    topicId: "topic_manipulation_influence",
    label: "Clickbait: experiment s emocemi",
    labelSize: "0.72rem",
    expertise: "B2",
    description: "Žák formuluje předpověď a navrhne, provede a vyhodnotí jednoduchý experiment, kterým ověří zobecnění, že clickbaitové titulky častěji používají emotivní slova než běžné zpravodajské titulky."
  },
  {
    id: "goal_clickbait_question_audit",
    termId: "term_clickbait",
    topicId: "topic_manipulation_influence",
    label: "Clickbait: analyzuj formu",
    labelSize: "0.72rem",
    expertise: "B2",
    description: "Žák vyšetří a ověří zobecnění, že clickbaitové nadpisy častěji používají otázky nebo přehánění než informativní nadpisy, tím že porovná vzorek nadpisů a předloží logicky zdůvodněný závěr."
  },
  {
    id: "goal_dark_posting_generalization",
    termId: "term_dark_posting",
    topicId: "topic_manipulation_influence",
    label: "Dark posting: popiš scénáře",
    expertise: "B1",
    description: "Žák rozhodne, které tvrzení je platným zobecněním o dark postingu (nikoli jednotlivým faktem), a volbu zdůvodní dvěma příklady jeho použití."
  },
  {
    id: "goal_echo_chamber_generalization",
    termId: "term_echo_chamber",
    topicId: "topic_manipulation_influence",
    label: "Filtrační bubliny: ukaž jevy",
    expertise: "B1",
    description: "Žák vybere zobecnění o echo chamberu / sociální (filtrační) bublině (nikoli jednotlivým faktem) a rozhodnutí doloží dvěma příklady jevů."
  },
  {
    id: "goal_hybrid_warfare_generalization",
    termId: "term_hybrid_warfare",
    topicId: "topic_manipulation_influence",
    label: "Hybridní válka: vysvětli taktiky",
    expertise: "B1",
    description: "Žák rozhodne, které tvrzení je zobecněním o hybridní válce (nikoli jednotlivým faktem), a volbu podpoří dvěma příklady taktik."
  },
  {
    id: "goal_microtargeting_generalization",
    termId: "term_microtargeting",
    topicId: "topic_manipulation_influence",
    label: "Mikrocilení: ukaž kampaně",
    expertise: "B1",
    description: "Žák vybere platné zobecnění o cílovém publiku a mikrocilení (nikoli jednotlivým faktem) a své rozhodnutí doloží dvěma příklady kampaní."
  },
  {
    id: "goal_critical_thinking_generalization",
    termId: "term_critical_thinking",
    topicId: "topic_critical_verification",
    label: "Kritické myšlení: popiš proces",
    expertise: "B1",
    description: "Žák vybere platné zobecnění o kritickém myšlení jako kognitivním procesu (nikoli jednotlivým faktem) a rozhodnutí doloží dvěma příklady situací."
  },
  {
    id: "goal_fact_checking_generalization",
    termId: "term_fact_checking",
    topicId: "topic_critical_verification",
    label: "Fact-checking: popiš postupy",
    expertise: "B1",
    description: "Žák vybere zobecnění o zdrojích informací a fact-checkingu (nikoli jednotlivým faktem) a své rozhodnutí doloží dvěma příklady postupů."
  },
  {
    id: "goal_fact_checking_link_audit",
    termId: "term_fact_checking",
    topicId: "topic_critical_verification",
    label: "Fact-checking: počítej odkazy",
    labelSize: "0.72rem",
    expertise: "B2",
    description: "Žák vyšetří zobecnění, že články ze spolehlivých zdrojů častěji odkazují na primární zdroje než články z pochybných webů, tím že sestaví vzorek, spočítá výskyt odkazů a předloží logicky zdůvodněné zjištění."
  },
  {
    id: "goal_algorithm_generalization",
    termId: "term_algorithm",
    topicId: "topic_critical_verification",
    label: "Algoritmy: popiš chování",
    expertise: "B1",
    description: "Žák vybere zobecnění o algoritmech (nikoli jednotlivým faktem) a rozhodnutí doloží dvěma příklady jejich chování v praxi."
  },
  {
    id: "goal_algorithm_recommendations",
    termId: "term_algorithm",
    topicId: "topic_critical_verification",
    label: "Algoritmy: ověř doporučení",
    labelSize: "0.74rem",
    expertise: "B2",
    description: "Žák formuluje předpověď a navrhne, provede a vyhodnotí experiment, kterým ověří zobecnění, že algoritmus doporučování na sociální síti zvyšuje podíl obsahu k tématům, s nimiž uživatel více interaguje."
  },
  {
    id: "goal_logical_fallacy_generalization",
    termId: "term_logical_fallacy",
    topicId: "topic_critical_verification",
    label: "Logické klamy: rozpoznej vzorce",
    expertise: "B1",
    description: "Žák rozhodne, které tvrzení je zobecněním o logických klamech (nikoli jednotlivým faktem), a volbu zdůvodní dvěma příklady klamů."
  },
  {
    id: "goal_logical_fallacy_article_fix",
    termId: "term_logical_fallacy",
    topicId: "topic_critical_verification",
    label: "Logický klam: oprav závěr",
    labelSize: "0.74rem",
    expertise: "B2",
    description: "Žák vyřeší problém chybného závěru v krátkém článku tak, že na základě generalizace „logické klamy jsou opakující se vzorce chybného usuzování“ správně určí 1 přítomný klam ze 3 nabízených možností a navrhne opravu jednou větou, která klam odstraní."
  }
];

const topicGoalCounts = atomicGoals.reduce((map, goal) => {
  map.set(goal.topicId, (map.get(goal.topicId) || 0) + 1);
  return map;
}, new Map());

const topicNodes = baseTopics.map((topic, index) => ({
  id: topic.id,
  type: "topic",
  label: topic.label,
  discipline: "Mediální výchova",
  level: topic.expertise,
  expertise: topic.expertise,
  order: index + 1,
  parentTopicId: null,
  description: topic.description,
  lessons: `${topicGoalCounts.get(topic.id) || 0} atomic goals`,
  x: topic.x,
  y: topic.y,
  radius: topic.radius,
  labelSize: topic.labelSize
}));

const termNodes = Object.entries(termLibrary).map(([termId, term]) => ({
  id: termId,
  type: "term",
  label: term.label,
  definition: term.description,
  synonyms: [],
  category: "conceptual",
  language: "cs",
  labelSize: term.labelSize
}));

const atomicGoalNodes = atomicGoals.map((goal, index) => ({
  id: goal.id,
  type: "atomicGoal",
  label: goal.label,
  fullText: goal.description,
  expertise: goal.expertise,
  bloomsLevel: goal.bloomsLevel || "Apply",
  relatedTerms: goal.termId ? [goal.termId] : [],
  topicId: goal.topicId,
  sequence: index + 1,
  labelSize: goal.labelSize
}));

const educationalGoalNodes = topicNodes.map((topic) => {
  const atomicIds = atomicGoalNodes.filter((goal) => goal.topicId === topic.id).map((goal) => goal.id);
  return {
    id: `edu_goal_${topic.id}`,
    type: "educationalGoal",
    label: `${topic.label} – syntéza`,
    bloomsLevel: "Evaluate",
    topicId: topic.id,
    atomicGoalIds: atomicIds
  };
});

const activityNodes = atomicGoalNodes.map((goal, index) => ({
  id: `activity_${goal.id}`,
  type: "activity",
  label: `Ověř: ${goal.label}`,
  expertise: goal.expertise,
  activityType: "exercise",
  content: {
    prompt: goal.fullText,
    format: "classification",
    instructions: "Popiš kroky, jak bys cíl ověřil v praxi."
  },
  goalId: goal.id
}));

const validateEdges = activityNodes.map((activity, index) => ({
  id: `edge_validates_${index + 1}`,
  source: activity.id,
  target: activity.goalId,
  relation: "validates"
}));

const requiresUnderstandingEdges = atomicGoalNodes.flatMap((goal) =>
  (goal.relatedTerms || []).map((termId, index) => ({
    id: `edge_requires_${goal.id}_${termId}_${index}`,
    source: goal.id,
    target: termId,
    relation: "requiresUnderstanding"
  }))
);

const aggregateEdges = educationalGoalNodes.flatMap((eduGoal) =>
  eduGoal.atomicGoalIds.map((goalId, index) => ({
    id: `edge_aggregates_${eduGoal.id}_${index + 1}`,
    source: eduGoal.id,
    target: goalId,
    relation: "aggregates"
  }))
);

const isPartOfEdges = educationalGoalNodes.map((eduGoal, index) => ({
  id: `edge_ispartof_${index + 1}`,
  source: eduGoal.id,
  target: eduGoal.topicId,
  relation: "isPartOf"
}));

const exemplifyEdges = activityNodes.flatMap((activity, index) => {
  const goal = atomicGoalNodes.find((g) => g.id === activity.goalId);
  return (goal?.relatedTerms || []).map((termId) => ({
    id: `edge_exemplifies_${activity.id}_${termId}`,
    source: activity.id,
    target: termId,
    relation: "exemplifies"
  }));
});

activityNodes.forEach((activity) => {
  delete activity.goalId;
});

const nodes = [...topicNodes, ...educationalGoalNodes, ...atomicGoalNodes, ...activityNodes, ...termNodes];
const edges = [...validateEdges, ...requiresUnderstandingEdges, ...aggregateEdges, ...isPartOfEdges, ...exemplifyEdges];

const conceptData = { nodes, edges };
