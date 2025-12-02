(() => {
  const svg = document.getElementById("concept-map");
  const infoPanel = document.getElementById("info-panel");
  const zoomReadout = document.getElementById("zoom-readout");
  const typeFilterEl = document.getElementById("type-filter");
  const expertiseFilterEl = document.getElementById("expertise-filter");

  fetch("data.json")
    .then((response) => response.json())
    .then((payload) => {
      const conceptData = {
        nodes: payload.nodes ?? [],
        edges: payload.edges ?? [],
        metadata: payload.metadata ?? {}
      };
      if (typeof cytoscape !== "undefined") {
        initCytoscapeMap(conceptData);
      } else {
        initSvgMap(conceptData);
      }
    })
    .catch((error) => {
      console.error("Failed to load concept data:", error);
    });

  function initSvgMap(conceptData) {
    const ns = "http://www.w3.org/2000/svg";
    const expertiseOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const baseViewBox = { width: 1200, height: 800 };
    const bounds = { minX: -200, maxX: 1400, minY: -160, maxY: 1000 };
    const state = {
      viewBox: { x: 0, y: 0, width: baseViewBox.width, height: baseViewBox.height },
      minWidth: 420,
      maxWidth: 2000,
      panSession: null,
      selectedNode: null
    };
    let viewBoxNeedsUpdate = false;

    const filters = {
      types: new Set(["topic", "educationalGoal", "atomicGoal", "activity", "term"]),
      expertise: new Set()
    };

    const nodes = conceptData.nodes.map((node) => ({
      ...node,
      levels: extractLevels(node.expertise),
      detailLevel: detailLevelForType(node.type)
    }));
    const nodesById = new Map(nodes.map((node) => [node.id, node]));

    const edges = normalizeEdges(conceptData.edges ?? []);
    const edgesById = new Map(edges.map((edge) => [edge.id, edge]));

    applyLegacyLayout(nodes, edges, nodesById);

    const adjacency = new Map();
    edges.forEach((edge) => {
      registerAdjacency(edge.source, edge);
      registerAdjacency(edge.target, edge);
    });

    const nodeElements = new Map();
    const edgeElements = new Map();
    const nodeVisibility = new Map();

    initFilters();
    renderGraph();
    initInteractions();
    applyFilters();
    applyViewBox();
    renderInfoPanel(null);

  function initFilters() {
    const levelOptions = Array.from(
      new Set(
        nodes.flatMap((node) => node.levels)
      )
    ).sort((a, b) => expertiseOrder.indexOf(a) - expertiseOrder.indexOf(b));

    if (levelOptions.length === 0) {
      levelOptions.push("A1");
    }

    levelOptions.forEach((level) => filters.expertise.add(level));

    createChips(typeFilterEl, [
      { key: "topic", label: "Topics" },
      { key: "educationalGoal", label: "Educational goals" },
      { key: "atomicGoal", label: "Atomic goals" },
      { key: "activity", label: "Activities" },
      { key: "term", label: "Terms" }
    ], filters.types);

    createChips(
      expertiseFilterEl,
      levelOptions.map((level) => ({ key: level, label: level })),
      filters.expertise
    );
  }

  function createChips(container, items, activeSet) {
    container.innerHTML = "";
    items.forEach(({ key, label }) => {
      const chip = document.createElement("button");
      chip.className = "chip is-active";
      chip.type = "button";
      chip.textContent = label;
      chip.dataset.value = key;
      chip.addEventListener("click", () => {
        if (chip.classList.contains("is-active")) {
          if (activeSet.size <= 1) {
            return;
          }
          chip.classList.remove("is-active");
          activeSet.delete(key);
        } else {
          chip.classList.add("is-active");
          activeSet.add(key);
        }
        applyFilters();
      });
      container.appendChild(chip);
    });
  }

  function renderGraph() {
    const topicLayer = document.createElementNS(ns, "g");
    topicLayer.classList.add("layer", "layer-topics");
    const linkLayer = document.createElementNS(ns, "g");
    linkLayer.classList.add("layer", "layer-links");
    const nodeLayer = document.createElementNS(ns, "g");
    nodeLayer.classList.add("layer", "layer-nodes");

    svg.appendChild(topicLayer);
    svg.appendChild(linkLayer);
    svg.appendChild(nodeLayer);

    nodes.forEach((node) => {
      if (node.type === "topic" || node.type === "educationalGoal") {
        const group = document.createElementNS(ns, "g");
        group.classList.add("node", `node--${node.type}`, "detail-wide");
        group.dataset.id = node.id;

        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", node.radius || (node.type === "topic" ? 120 : 80));
        circle.setAttribute("filter", "url(#soft-shadow)");
        group.appendChild(circle);

        const label = document.createElementNS(ns, "text");
        label.classList.add("node-label", node.type === "topic" ? "node-label--topic" : "node-label--educationalGoal", "topic-label");
        label.setAttribute("x", node.x);
        label.setAttribute("y", node.y);
        label.textContent = node.label;
        applyLabelSize(label, node);
        group.appendChild(label);

        const meta = document.createElementNS(ns, "text");
        meta.classList.add("topic-label", "topic-meta");
        meta.setAttribute("x", node.x);
        meta.setAttribute("y", node.y + 20);
        const detail = node.type === "topic" ? `${node.level || ""} ${node.lessons || ""}`.trim() : `Bloom ${node.bloomsLevel || "Understand"}`;
        meta.textContent = detail;
        meta.setAttribute("fill", "rgba(255,255,255,0.6)");
        group.appendChild(meta);

        attachNodeHandlers(group, node.id);
        topicLayer.appendChild(group);
        nodeElements.set(node.id, group);
      }
    });

    edges.forEach((edge) => {
      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);
      if (!source || !target) {
        return;
      }
      if (isStructuralEdge(source, target, edge.relation)) {
        return;
      }
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", `M ${source.x} ${source.y} L ${target.x} ${target.y}`);
      path.dataset.id = edge.id;
      path.dataset.source = edge.source;
      path.dataset.target = edge.target;
      path.dataset.relation = edge.relation;
      path.classList.add(`detail-${detailClassForEdge(edge.relation)}`);
      linkLayer.appendChild(path);
      edgeElements.set(edge.id, path);
    });

    nodes.forEach((node) => {
      if (node.type === "topic" || node.type === "educationalGoal") {
        return;
      }
      const group = document.createElementNS(ns, "g");
      group.classList.add("node", `node--${node.type}`, detailClassForNode(node.type));
      group.dataset.id = node.id;

      if (node.type === "atomicGoal") {
        drawAtomicGoal(group, node);
      } else if (node.type === "activity") {
        drawActivity(group, node);
      } else if (node.type === "term") {
        drawTerm(group, node);
      }

      attachNodeHandlers(group, node.id);
      nodeLayer.appendChild(group);
      nodeElements.set(node.id, group);
    });
  }

  function drawAtomicGoal(group, node) {
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", 26);
    group.appendChild(circle);

    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y + 42);
    text.setAttribute("text-anchor", "middle");
    text.textContent = node.label;
    text.classList.add("node-label", "node-label--goal");
    applyLabelSize(text, node);
    group.appendChild(text);
  }

  function drawActivity(group, node) {
    const width = Math.max(120, node.label.length * 6);
    const height = 44;
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", node.x - width / 2);
    rect.setAttribute("y", node.y - height / 2);
    rect.setAttribute("rx", 14);
    rect.setAttribute("ry", 14);
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    group.appendChild(rect);

    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y + 4);
    text.setAttribute("text-anchor", "middle");
    text.textContent = node.label;
    text.classList.add("node-label", "node-label--activity");
    applyLabelSize(text, node);
    group.appendChild(text);
  }

  function drawTerm(group, node) {
    const size = 10;
    const points = [
      `${node.x} ${node.y - size}`,
      `${node.x + size} ${node.y}`,
      `${node.x} ${node.y + size}`,
      `${node.x - size} ${node.y}`
    ].join(" ");
    const polygon = document.createElementNS(ns, "polygon");
    polygon.setAttribute("points", points);
    group.appendChild(polygon);

    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y + size + 18);
    text.setAttribute("text-anchor", "middle");
    text.textContent = node.label;
    text.classList.add("node-label", "node-label--term");
    applyLabelSize(text, node);
    group.appendChild(text);
  }

  function applyLabelSize(element, node) {
    if (!node || !node.labelSize) {
      return;
    }
    const value = typeof node.labelSize === "number" ? `${node.labelSize}px` : node.labelSize;
    element.style.fontSize = value;
  }

  function attachNodeHandlers(element, nodeId) {
    element.addEventListener("mouseenter", () => {
      highlightNode(nodeId);
    });

    element.addEventListener("mouseleave", () => {
      if (!state.panSession) {
        clearHover();
      }
    });

    element.addEventListener("click", (event) => {
      event.stopPropagation();
      setSelectedNode(nodeId);
    });
  }

  function initInteractions() {
    svg.addEventListener("click", (event) => {
      if (!event.target.closest(".node")) {
        setSelectedNode(null);
        clearHover();
      }
    });

    document.querySelectorAll(".zoom-buttons button").forEach((button) => {
      button.addEventListener("click", () => {
        const direction = button.dataset.zoom === "in" ? -1 : 1;
        const factor = Math.pow(1.2, direction);
        const center = {
          x: state.viewBox.x + state.viewBox.width / 2,
          y: state.viewBox.y + state.viewBox.height / 2
        };
        zoomAtPoint(center, factor);
      });
    });

    svg.addEventListener("wheel", (event) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? 1 : -1;
      const factor = Math.pow(1.12, direction);
      const point = mapFromClient(event);
      zoomAtPoint(point, factor);
    });

    svg.addEventListener("pointerdown", (event) => {
      if (event.button !== 2) {
        return;
      }
      event.preventDefault();
      state.panSession = {
        pointerId: event.pointerId,
        origin: mapFromClient(event),
        start: { ...state.viewBox }
      };
      svg.setPointerCapture(event.pointerId);
    });

    svg.addEventListener("pointermove", (event) => {
      if (!state.panSession || state.panSession.pointerId !== event.pointerId) {
        return;
      }
      event.preventDefault();
      const current = mapFromClient(event);
      const dx = current.x - state.panSession.origin.x;
      const dy = current.y - state.panSession.origin.y;
      state.viewBox.x = state.panSession.start.x - dx;
      state.viewBox.y = state.panSession.start.y - dy;
      clampViewBox();
      requestViewBoxRender();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
      svg.addEventListener(type, (event) => {
        if (state.panSession && state.panSession.pointerId === event.pointerId) {
          svg.releasePointerCapture(event.pointerId);
          state.panSession = null;
        }
      });
    });

    svg.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setSelectedNode(null);
        clearHover();
      }
    });
  }

  function mapFromClient(event) {
    const rect = svg.getBoundingClientRect();
    const x = state.viewBox.x + ((event.clientX - rect.left) / rect.width) * state.viewBox.width;
    const y = state.viewBox.y + ((event.clientY - rect.top) / rect.height) * state.viewBox.height;
    return { x, y };
  }

  function zoomAtPoint(point, factor) {
    const prevWidth = state.viewBox.width;
    const prevHeight = state.viewBox.height;
    let newWidth = prevWidth * factor;
    newWidth = clamp(newWidth, state.minWidth, state.maxWidth);
    const newHeight = (baseViewBox.height / baseViewBox.width) * newWidth;

    const scaleX = (point.x - state.viewBox.x) / prevWidth;
    const scaleY = (point.y - state.viewBox.y) / prevHeight;

    state.viewBox.x = point.x - scaleX * newWidth;
    state.viewBox.y = point.y - scaleY * newHeight;
    state.viewBox.width = newWidth;
    state.viewBox.height = newHeight;
    clampViewBox();
    requestViewBoxRender();
  }

  function clampViewBox() {
    const { width, height } = state.viewBox;
    const maxX = bounds.maxX - width;
    const maxY = bounds.maxY - height;
    state.viewBox.x = clamp(state.viewBox.x, bounds.minX, Math.max(bounds.minX, maxX));
    state.viewBox.y = clamp(state.viewBox.y, bounds.minY, Math.max(bounds.minY, maxY));
  }

  function applyViewBox() {
    const { x, y, width, height } = state.viewBox;
    svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
    updateDetailLevel(width);
    const zoomPercent = Math.round((baseViewBox.width / width) * 100);
    if (zoomReadout) {
      zoomReadout.textContent = `${zoomPercent}%`;
    }
  }

  function requestViewBoxRender() {
    if (viewBoxNeedsUpdate) {
      return;
    }
    viewBoxNeedsUpdate = true;
    requestAnimationFrame(() => {
      viewBoxNeedsUpdate = false;
      applyViewBox();
    });
  }

  function updateDetailLevel(width) {
    let level = "wide";
    if (width <= 650) {
      level = "close";
    } else if (width <= 1100) {
      level = "mid";
    }
    svg.dataset.detail = level;
  }

  function applyFilters() {
    nodes.forEach((node) => {
      const isTypeVisible = filters.types.has(node.type);
      const matchesExpertise =
        node.levels.length === 0 ||
        node.levels.some((level) => filters.expertise.has(level));
      const visible = isTypeVisible && matchesExpertise;
      const element = nodeElements.get(node.id);
      if (element) {
        element.classList.toggle("is-hidden", !visible);
      }
      nodeVisibility.set(node.id, visible);
    });

    edges.forEach((edge) => {
      const visible = (nodeVisibility.get(edge.source) ?? true) && (nodeVisibility.get(edge.target) ?? true);
      const element = edgeElements.get(edge.id);
      if (element) {
        element.classList.toggle("is-hidden", !visible);
      }
    });

    if (state.selectedNode && !nodeVisibility.get(state.selectedNode)) {
      setSelectedNode(null);
    }
  }

  function highlightNode(nodeId) {
    clearHover();
    const nodeElement = nodeElements.get(nodeId);
    if (!nodeElement || nodeElement.classList.contains("is-hidden")) {
      return;
    }
    nodeElement.classList.add("is-focused");
    const neighbors = adjacency.get(nodeId) ?? [];
    neighbors.forEach((link) => {
      if (!nodeVisibility.get(link.nodeId)) {
        return;
      }
      nodeElements.get(link.nodeId)?.classList.add("is-linked");
      edgeElements.get(link.edgeId)?.classList.add("is-linked");
    });
  }

  function clearHover() {
    nodeElements.forEach((element) => {
      element.classList.remove("is-focused", "is-linked");
    });
    edgeElements.forEach((element) => {
      element.classList.remove("is-linked");
    });
  }

  function setSelectedNode(nodeId) {
    if (state.selectedNode) {
      nodeElements.get(state.selectedNode)?.classList.remove("is-selected");
    }
    state.selectedNode = nodeId;
    if (nodeId) {
      nodeElements.get(nodeId)?.classList.add("is-selected");
      renderInfoPanel(nodesById.get(nodeId));
    } else {
      renderInfoPanel(null);
    }
  }

  function renderInfoPanel(node) {
    infoPanel.innerHTML = "";
    if (!node) {
      const wrapper = document.createElement("div");
      wrapper.className = "info-panel__empty";
      wrapper.innerHTML = `
        <h2>Select a node</h2>
        <p>Highlight a topic, educational goal, atomic goal, term, or activity to see how it supports the path to mastery.</p>
        <ul>
          <li>Zoom out to compare topics and clustered educational goals.</li>
          <li>Zoom in for atomic goals, activities, and key terms.</li>
          <li>Filters help surface the right expertise band.</li>
        </ul>
      `;
      infoPanel.appendChild(wrapper);
      return;
    }

    const header = document.createElement("div");
    header.className = "detail-header";
    const pill = document.createElement("span");
    pill.className = "detail-pill";
    pill.textContent = node.type.toUpperCase();
    header.appendChild(pill);

    const title = document.createElement("h2");
    title.textContent = node.label;
    header.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "meta";
    const metaParts = [];
    if (node.expertise) {
      metaParts.push(`Expertise ${node.expertise}`);
    }
    if (node.level && node.type === "topic") {
      metaParts.push(`Level ${node.level}`);
    }
    if (node.lessons) {
      metaParts.push(node.lessons);
    }
    if (node.bloomsLevel) {
      metaParts.push(`Bloom ${node.bloomsLevel}`);
    }
    if (node.activityType) {
      metaParts.push(`${capitalize(node.activityType)} activity`);
    }
    if (metaParts.length) {
      meta.textContent = metaParts.join(" | ");
      header.appendChild(meta);
    }

    infoPanel.appendChild(header);

    renderNodeBody(infoPanel, node);

    const connections = adjacency.get(node.id) ?? [];
    if (connections.length) {
      const section = document.createElement("div");
      section.className = "detail-section";
      const heading = document.createElement("h3");
      heading.textContent = "Connections";
      section.appendChild(heading);

      const list = document.createElement("ul");
      connections
        .map((link) => {
          const other = nodesById.get(link.nodeId);
          return other ? { other, relation: link.relation } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.other.type.localeCompare(b.other.type))
        .forEach(({ other, relation }) => {
          const item = document.createElement("li");
          item.textContent = `${describeRelation(node, other, relation)}: ${other.label}`;
          list.appendChild(item);
        });
      section.appendChild(list);
      infoPanel.appendChild(section);
    }
  }

  function renderNodeBody(container, node) {
    if (node.type === "atomicGoal") {
      const desc = document.createElement("p");
      desc.textContent = node.fullText || node.description || "";
      container.appendChild(desc);
      if (node.relatedTerms?.length) {
        const related = document.createElement("p");
        related.textContent = `Terms: ${node.relatedTerms.map((termId) => nodesById.get(termId)?.label).filter(Boolean).join(", ")}`;
        container.appendChild(related);
      }
      return;
    }
    if (node.type === "term") {
      const desc = document.createElement("p");
      desc.textContent = node.definition || node.description || "";
      container.appendChild(desc);
      if (node.synonyms?.length) {
        const synonyms = document.createElement("p");
        synonyms.textContent = `Synonyma: ${node.synonyms.join(", ")}`;
        container.appendChild(synonyms);
      }
      return;
    }
    if (node.type === "activity") {
      const desc = document.createElement("p");
      desc.textContent = node.content?.prompt || node.description || "";
      container.appendChild(desc);
      return;
    }
    if (node.type === "educationalGoal") {
      const desc = document.createElement("p");
      desc.textContent = `${(node.atomicGoalIds || []).length} atomic goals v tomto klastru.`;
      container.appendChild(desc);
      return;
    }
    const desc = document.createElement("p");
    desc.textContent = node.description || node.fullText || "";
    if (desc.textContent) {
      container.appendChild(desc);
    }
  }

  function describeRelation(node, other, relation) {
    if (relation === "validates") {
      return node.type === "activity" ? "Validates" : other.type === "activity" ? "Validated by" : "Connected";
    }
    if (relation === "requiresUnderstanding") {
      return node.type === "atomicGoal" ? "Requires" : "Supports";
    }
    if (relation === "aggregates") {
      return node.type === "educationalGoal" ? "Aggregates" : "Part of cluster";
    }
    if (relation === "isPartOf") {
      return node.type === "educationalGoal" ? "Belongs to" : "Contains";
    }
    if (relation === "exemplifies") {
      return node.type === "activity" ? "Exemplifies" : "Illustrated by";
    }
    return "Connected to";
  }

  function registerAdjacency(nodeId, edge) {
    if (!adjacency.has(nodeId)) {
      adjacency.set(nodeId, []);
    }
    const neighborId = edge.source === nodeId ? edge.target : edge.source;
    adjacency.get(nodeId).push({
      nodeId: neighborId,
      relation: edge.relation,
      edgeId: edge.id
    });
  }

  function extractLevels(value = "") {
    const normalized = value.replace(/\s+/g, "").replace(/\u2013/g, "-");
    const rangeParts = normalized.split("-");
    if (rangeParts.length === 2) {
      const start = rangeParts[0];
      const end = rangeParts[1];
      const startIndex = expertiseOrder.indexOf(start);
      const endIndex = expertiseOrder.indexOf(end);
      if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
        return expertiseOrder.slice(startIndex, endIndex + 1);
      }
    }
    const matches = normalized.match(/[A-C][1-2]/g);
    return matches ? matches : [];
  }

  function detailLevelForType(type) {
    if (type === "activity" || type === "term") {
      return "close";
    }
    if (type === "atomicGoal") {
      return "mid";
    }
    return "wide";
  }

  function detailClassForNode(type) {
    return `detail-${detailLevelForType(type)}`;
  }

  function detailLevelRank(level) {
    if (level === "wide") {
      return 0;
    }
    if (level === "mid") {
      return 1;
    }
    return 2;
  }

  function canShowDetailLevel(nodeLevel = "close", currentLevel = "close") {
    return detailLevelRank(nodeLevel) <= detailLevelRank(currentLevel);
  }

  function detailClassForEdge(relation) {
    if (relation === "validates" || relation === "exemplifies") {
      return "close";
    }
    if (relation === "requiresUnderstanding") {
      return "mid";
    }
    return "wide";
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function capitalize(value = "") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function isStructuralEdge(source, target, relation) {
    if (relation === "isPartOf" || relation === "aggregates") {
      return true;
    }
    return false;
  }

  function normalizeEdges(edgeList) {
    return edgeList.map((edge) => ({
      ...edge,
      relation: edge.relation || edge.type || edge.relationship || "related"
    }));
  }

  function initCytoscapeMap(conceptData) {
    const container = document.getElementById("concept-map");
    const infoPanel = document.getElementById("info-panel");
    const zoomReadout = document.getElementById("zoom-readout");
    const typeFilterEl = document.getElementById("type-filter");
    const expertiseFilterEl = document.getElementById("expertise-filter");

    if (!container || !infoPanel || !conceptData) {
      console.warn("Cytoscape concept map: missing container or data");
      return;
    }

    const expertiseOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const filters = {
      types: new Set(["topic", "educationalGoal", "atomicGoal", "activity", "term"]),
      expertise: new Set()
    };

    const nodes = conceptData.nodes.map((node) => ({
      ...node,
      levels: extractLevels(node.expertise),
      detailLevel: detailLevelForType(node.type)
    }));
    const edges = normalizeEdges(conceptData.edges ?? []);
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    applyLegacyLayout(nodes, edges, nodesById);
    const adjacency = buildAdjacency(edges);

    const cy = cytoscape({
      container,
      elements: buildElements(nodes, edges),
      style: buildStyles(),
      layout: { name: "preset" },
      minZoom: 0.35,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
      autoungrabify: true,
      boxSelectionEnabled: false
    });

    cy.fit(cy.nodes(), 80);
    cy.nodes().ungrabify();
    window.addEventListener("resize", () => cy.resize());

    const state = {
      selectedNodeId: null,
      detailLevel: zoomDetailLevel(cy.zoom())
    };
    container.dataset.detail = state.detailLevel;

    initFilters();
    initInteractions();
    applyFilters();
    renderInfoPanel(null);
    updateZoomReadout();

    function buildElements(nodeList, edgeList) {
      const nodeElements = nodeList.map((node) => {
        const { width, height, shape } = nodeDimensions(node);
        return {
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          expertise: node.expertise || "",
          lessons: node.lessons || "",
          description: node.description || "",
          activityType: node.activityType || "",
          detailLevel: node.detailLevel,
          width,
          height,
          shape
        },
        position: { x: node.x || 0, y: node.y || 0 },
        classes: `node-${node.type} detail-${node.detailLevel}`
      };
    });

      const edgeElements = edgeList.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          relation: edge.relation || ""
        },
        classes: edge.relation ? `edge-${edge.relation}` : ""
      }));

      return [...nodeElements, ...edgeElements];
    }

    function buildStyles() {
      return [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "font-size": 14,
          "font-family": "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif",
          "text-wrap": "wrap",
          "text-max-width": 160,
          "text-valign": "center",
          "text-halign": "center",
          color: "#f5f5f5",
          "background-color": "rgba(0,0,0,0)",
          "border-width": 2,
          "border-color": "rgba(255, 255, 255, 0.6)",
          width: "data(width)",
          height: "data(height)",
          shape: "data(shape)",
          "text-outline-width": 0
        }
      },
      {
        selector: "node.node-topic",
        style: {
          "background-color": "rgba(0,0,0,0)",
          "border-color": "rgba(248, 180, 78, 0.7)",
          "font-size": 16,
          shape: "ellipse"
        }
      },
      {
        selector: "node.node-educationalGoal",
        style: {
          "background-color": "rgba(0,0,0,0)",
          "border-color": "rgba(138, 200, 255, 0.6)",
          "font-size": 14,
          shape: "ellipse"
        }
      },
      {
        selector: "node.node-atomicGoal",
        style: {
          "background-color": "rgba(0,0,0,0)",
          "border-color": "rgba(126, 224, 255, 0.8)",
          "font-size": 12,
          shape: "ellipse"
        }
      },
      {
        selector: "node.node-activity",
        style: {
          "background-color": "rgba(0,0,0,0)",
          "border-color": "rgba(255, 126, 169, 0.8)",
          shape: "roundrectangle",
          "border-radius": 18,
          "font-size": 13
        }
      },
      {
        selector: "node.node-term",
        style: {
          "background-color": "rgba(0,0,0,0)",
          "border-color": "rgba(215, 255, 126, 0.8)",
          shape: "diamond",
          "font-size": 12
        }
      },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "rgba(255, 255, 255, 0.25)",
            "curve-style": "straight"
          }
        },
        {
          selector: ".edge-validates",
          style: {
            "line-style": "dashed",
            "line-color": "rgba(255, 126, 169, 0.5)",
            width: 3
          }
        },
        {
          selector: ".edge-requiresUnderstanding",
          style: {
            "line-style": "dashed",
            "line-color": "rgba(126, 224, 255, 0.55)"
          }
        },
        {
          selector: ".edge-exemplifies",
          style: {
            "line-style": "dashed",
            "line-color": "rgba(215, 255, 126, 0.6)"
          }
        },
        {
          selector: "node.is-focused",
          style: {
            "border-color": "#fff",
            "border-width": 4,
            "shadow-blur": 25,
            "shadow-color": "rgba(255, 255, 255, 0.4)"
          }
        },
        {
          selector: "edge.is-linked",
          style: {
            "line-color": "#fff",
            width: 4
          }
        },
        {
          selector: "node.is-linked",
          style: {
            "border-color": "#fff",
            "border-width": 3
          }
        },
        {
          selector: ".is-selected",
          style: {
            "border-color": "#fff",
            "border-width": 5,
            "shadow-blur": 30,
            "shadow-color": "rgba(255, 255, 255, 0.55)"
          }
        },
        {
          selector: ".is-hidden",
          style: {
            display: "none"
          }
        }
      ];
    }

    function nodeDimensions(node) {
      if (node.type === "topic") {
        const size = (node.radius || 120) * 2;
        return { width: size, height: size, shape: "ellipse" };
      }
      if (node.type === "educationalGoal") {
        const size = 140;
        return { width: size, height: size, shape: "ellipse" };
      }
      if (node.type === "activity") {
        const width = Math.max(220, (node.label || "").length * 7);
        return { width, height: 70, shape: "roundrectangle" };
      }
      if (node.type === "term") {
        return { width: 70, height: 70, shape: "diamond" };
      }
      if (node.type === "atomicGoal") {
        return { width: 60, height: 60, shape: "ellipse" };
      }
      return { width: 80, height: 80, shape: "ellipse" };
    }

    function initFilters() {
      const levelOptions = Array.from(
        new Set(
          nodes.flatMap((node) => node.levels)
        )
      ).sort((a, b) => expertiseOrder.indexOf(a) - expertiseOrder.indexOf(b));

      if (levelOptions.length === 0) {
        levelOptions.push("A1");
      }

      levelOptions.forEach((level) => filters.expertise.add(level));

      createChips(typeFilterEl, [
        { key: "topic", label: "Topics" },
        { key: "educationalGoal", label: "Educational goals" },
        { key: "atomicGoal", label: "Atomic goals" },
        { key: "activity", label: "Activities" },
        { key: "term", label: "Terms" }
      ], filters.types);

      createChips(
        expertiseFilterEl,
        levelOptions.map((level) => ({ key: level, label: level })),
        filters.expertise
      );
    }

    function createChips(container, items, activeSet) {
      container.innerHTML = "";
      items.forEach(({ key, label }) => {
        const chip = document.createElement("button");
        chip.className = "chip is-active";
        chip.type = "button";
        chip.textContent = label;
        chip.dataset.value = key;
        chip.addEventListener("click", () => {
          if (chip.classList.contains("is-active")) {
            if (activeSet.size <= 1) {
              return;
            }
            chip.classList.remove("is-active");
            activeSet.delete(key);
          } else {
            chip.classList.add("is-active");
            activeSet.add(key);
          }
          applyFilters();
        });
        container.appendChild(chip);
      });
    }

    function initInteractions() {
      cy.on("mouseover", "node", (event) => {
        highlightNode(event.target);
      });

      cy.on("mouseout", "node", () => {
        clearHover();
      });

      cy.on("tap", "node", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedNode(event.target.id());
      });

      cy.on("tap", (event) => {
        if (event.target === cy) {
          setSelectedNode(null);
          clearHover();
        }
      });

    cy.on("zoom", () => {
      updateZoomReadout();
      updateZoomDetailLevel();
    });

      document.querySelectorAll(".zoom-buttons button").forEach((button) => {
        button.addEventListener("click", () => {
          const direction = button.dataset.zoom === "in" ? 1 : -1;
          zoomBy(direction);
        });
      });

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          setSelectedNode(null);
          clearHover();
        }
      });
    }

    function zoomBy(direction) {
      const current = cy.zoom();
      const factor = Math.pow(1.2, direction);
      const target = clamp(current * factor, cy.minZoom(), cy.maxZoom());
      cy.zoom({ level: target, renderedPosition: { x: container.clientWidth / 2, y: container.clientHeight / 2 } });
      updateZoomReadout();
    }

    function applyFilters() {
      const currentDetail = state.detailLevel || "close";
      cy.batch(() => {
        nodes.forEach((node) => {
          const isTypeVisible = filters.types.has(node.type);
          const matchesExpertise = node.levels.length === 0 || node.levels.some((level) => filters.expertise.has(level));
          const passesDetail = canShowDetailLevel(node.detailLevel, currentDetail);
          const visible = isTypeVisible && matchesExpertise && passesDetail;
          const cyNode = cy.getElementById(node.id);
          if (cyNode.empty()) {
            return;
          }
          cyNode.toggleClass("is-hidden", !visible);
        });

        edges.forEach((edge) => {
          const sourceVisible = !cy.getElementById(edge.source).hasClass("is-hidden");
          const targetVisible = !cy.getElementById(edge.target).hasClass("is-hidden");
          const cyEdge = cy.getElementById(edge.id);
          if (cyEdge.empty()) {
            return;
          }
          cyEdge.toggleClass("is-hidden", !(sourceVisible && targetVisible));
        });
      });

      if (state.selectedNodeId && cy.getElementById(state.selectedNodeId).hasClass("is-hidden")) {
        setSelectedNode(null);
      }
    }

    function highlightNode(node) {
      if (!node || node.hasClass("is-hidden")) {
        return;
      }
      clearHover();
      node.addClass("is-focused");
      const neighbors = node.closedNeighborhood();
      neighbors.edges().addClass("is-linked");
      neighbors.nodes().forEach((neighbor) => {
        if (neighbor.id() !== node.id()) {
          neighbor.addClass("is-linked");
        }
      });
    }

    function clearHover() {
      cy.elements().removeClass("is-focused");
      cy.elements().removeClass("is-linked");
    }

    function setSelectedNode(nodeId) {
      if (state.selectedNodeId) {
        const prev = cy.getElementById(state.selectedNodeId);
        if (!prev.empty()) {
          prev.removeClass("is-selected");
        }
      }
      state.selectedNodeId = nodeId;
      if (nodeId) {
        const element = cy.getElementById(nodeId);
        if (!element.empty()) {
          element.addClass("is-selected");
        }
        renderInfoPanel(nodesById.get(nodeId));
      } else {
        renderInfoPanel(null);
      }
    }

    function updateZoomDetailLevel() {
      const next = zoomDetailLevel(cy.zoom());
      if (state.detailLevel === next) {
        return;
      }
      state.detailLevel = next;
      container.dataset.detail = next;
      applyFilters();
    }


    function renderInfoPanel(node) {
      infoPanel.innerHTML = "";
      if (!node) {
        const wrapper = document.createElement("div");
        wrapper.className = "info-panel__empty";
        wrapper.innerHTML = `
          <h2>Select a node</h2>
        <p>Highlight a topic, educational goal, atomic goal, term, or activity to see how it supports the path to mastery.</p>
        <ul>
          <li>Zoom out to compare topics and clustered educational goals.</li>
          <li>Zoom in for atomic goals, activities, and key terms.</li>
          <li>Filters help surface the right expertise band.</li>
        </ul>
        `;
        infoPanel.appendChild(wrapper);
        return;
      }

      const header = document.createElement("div");
      header.className = "detail-header";

      const pill = document.createElement("span");
      pill.className = "detail-pill";
      pill.textContent = node.type.toUpperCase();
      header.appendChild(pill);

      const title = document.createElement("h2");
      title.textContent = node.label;
      header.appendChild(title);

      const metaParts = [];
      if (node.expertise) {
        metaParts.push(`Expertise ${node.expertise}`);
      }
      if (node.level && node.type === "topic") {
        metaParts.push(`Level ${node.level}`);
      }
      if (node.lessons) {
        metaParts.push(node.lessons);
      }
      if (node.activityType) {
        metaParts.push(`${capitalize(node.activityType)} activity`);
      }
      if (node.bloomsLevel) {
        metaParts.push(`Bloom ${node.bloomsLevel}`);
      }
      if (metaParts.length) {
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = metaParts.join(" | ");
        header.appendChild(meta);
      }

      infoPanel.appendChild(header);

      renderNodeBody(infoPanel, node);

      const connections = adjacency.get(node.id) ?? [];
      if (connections.length) {
        const section = document.createElement("div");
        section.className = "detail-section";
        const heading = document.createElement("h3");
        heading.textContent = "Connections";
        section.appendChild(heading);

        const list = document.createElement("ul");
        connections
          .map((link) => {
            const other = nodesById.get(link.nodeId);
            return other ? { other, relation: link.relation } : null;
          })
          .filter(Boolean)
          .sort((a, b) => a.other.type.localeCompare(b.other.type))
          .forEach(({ other, relation }) => {
            const item = document.createElement("li");
            item.textContent = `${describeRelation(node, other, relation)}: ${other.label}`;
            list.appendChild(item);
          });

        section.appendChild(list);
        infoPanel.appendChild(section);
      }
    }

    function describeRelation(node, other, relation) {
      if (relation === "validates") {
        return node.type === "activity" ? "Validates" : other.type === "activity" ? "Validated by" : "Connected";
      }
      if (relation === "requiresUnderstanding") {
        return node.type === "atomicGoal" ? "Requires" : "Supports";
      }
      if (relation === "aggregates") {
        return node.type === "educationalGoal" ? "Aggregates" : "Part of cluster";
      }
      if (relation === "isPartOf") {
        return node.type === "educationalGoal" ? "Belongs to" : "Contains";
      }
      if (relation === "exemplifies") {
        return node.type === "activity" ? "Exemplifies" : "Illustrated by";
      }
      return "Connected to";
    }

    function buildAdjacency(edgeList) {
      const map = new Map();
      edgeList.forEach((edge) => {
        register(edge.source, edge);
        register(edge.target, edge);
      });

      function register(nodeId, edge) {
        if (!map.has(nodeId)) {
          map.set(nodeId, []);
        }
        const neighborId = edge.source === nodeId ? edge.target : edge.source;
        map.get(nodeId).push({ nodeId: neighborId, relation: edge.relation, edgeId: edge.id });
      }

      return map;
    }

    function applyLegacyLayout(nodes, edges, nodesById) {
      const topicGoals = new Map();
      const goalPrimaryTopic = new Map();
      const goalTerms = new Map();
      const goalActivities = new Map();

      edges.forEach((edge) => {
        const source = nodesById.get(edge.source);
        const target = nodesById.get(edge.target);
        if (!source || !target) {
          return;
        }
        if (edge.relation === "contains" && source.type === "topic" && target.type === "goal") {
          registerGoalToTopic(target.id, source.id);
        } else if (edge.relation === "contains" && target.type === "topic" && source.type === "goal") {
          registerGoalToTopic(source.id, target.id);
        } else if (edge.relation === "relates") {
          const goalId = source.type === "goal" ? source.id : target.type === "goal" ? target.id : null;
          const termId = source.type === "term" ? source.id : target.type === "term" ? target.id : null;
          if (goalId && termId) {
            if (!goalTerms.has(goalId)) {
              goalTerms.set(goalId, []);
            }
            goalTerms.get(goalId).push(termId);
          }
        } else if (edge.relation === "validates") {
          const goalId = source.type === "goal" ? source.id : target.type === "goal" ? target.id : null;
          const activityId = source.type === "activity" ? source.id : target.type === "activity" ? target.id : null;
          if (goalId && activityId) {
            if (!goalActivities.has(goalId)) {
              goalActivities.set(goalId, []);
            }
            goalActivities.get(goalId).push(activityId);
          }
        }
      });

      function registerGoalToTopic(goalId, topicId) {
        if (!goalPrimaryTopic.has(goalId)) {
          goalPrimaryTopic.set(goalId, topicId);
        }
        if (!topicGoals.has(topicId)) {
          topicGoals.set(topicId, []);
        }
        if (!topicGoals.get(topicId).includes(goalId)) {
          topicGoals.get(topicId).push(goalId);
        }
      }

      const goalAngles = new Map();
      topicGoals.forEach((goalIds, topicId) => {
        const topic = nodesById.get(topicId);
        if (!topic || goalIds.length === 0) {
          return;
        }
        const goalRadius = Math.max(60, (topic.radius || 110) - 35);
        const startAngle = -Math.PI / 2;
        const step = (2 * Math.PI) / goalIds.length;
        goalIds.forEach((goalId, index) => {
          const angle = startAngle + index * step;
          const goal = nodesById.get(goalId);
          if (!goal) {
            return;
          }
          goal.x = topic.x + goalRadius * Math.cos(angle);
          goal.y = topic.y + goalRadius * Math.sin(angle);
          goalAngles.set(goalId, angle);
        });
      });

      goalTerms.forEach((termIds, goalId) => {
        const angle = goalAngles.get(goalId);
        const topicId = goalPrimaryTopic.get(goalId);
        const topic = topicId ? nodesById.get(topicId) : null;
        if (!topic || angle == null) {
          return;
        }
        const baseRadius = (topic.radius || 110) + 35;
        termIds.forEach((termId, index) => {
          const term = nodesById.get(termId);
          if (!term) {
            return;
          }
          const offsetAngle = angle + (index % 2 === 0 ? 1 : -1) * 0.25 * Math.ceil(index / 2);
          const radius = baseRadius + index * 22;
          term.x = topic.x + radius * Math.cos(offsetAngle);
          term.y = topic.y + radius * Math.sin(offsetAngle);
        });
      });

      goalActivities.forEach((activityIds, goalId) => {
        const angle = goalAngles.get(goalId);
        const topicId = goalPrimaryTopic.get(goalId);
        const topic = topicId ? nodesById.get(topicId) : null;
        if (!topic || angle == null) {
          return;
        }
        const baseRadius = (topic.radius || 110) + 95;
        activityIds.forEach((activityId, index) => {
          const activity = nodesById.get(activityId);
          if (!activity) {
            return;
          }
          const offsetAngle = angle + ((index % 2 === 0 ? 1 : -1) * 0.35 * Math.ceil(index / 2));
          const radius = baseRadius + index * 30;
          activity.x = topic.x + radius * Math.cos(offsetAngle);
          activity.y = topic.y + radius * Math.sin(offsetAngle);
        });
      });
    }

    function extractLevels(value = "") {
      const normalized = value.replace(/\s+/g, "").replace(/\u2013/g, "-");
      const rangeParts = normalized.split("-");
      if (rangeParts.length === 2) {
        const startIndex = expertiseOrder.indexOf(rangeParts[0]);
        const endIndex = expertiseOrder.indexOf(rangeParts[1]);
        if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
          return expertiseOrder.slice(startIndex, endIndex + 1);
        }
      }
      const matches = normalized.match(/[A-C][1-2]/g);
      return matches ? matches : [];
    }

    function updateZoomReadout() {
      if (!zoomReadout) {
        return;
      }
      const percent = Math.round(cy.zoom() * 100);
      zoomReadout.textContent = `${percent}%`;
    }

    function capitalize(value = "") {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
  }

  function zoomDetailLevel(zoom) {
    if (zoom <= 0.6) {
      return "wide";
    }
    if (zoom <= 1.2) {
      return "mid";
    }
    return "close";
  }

})();
