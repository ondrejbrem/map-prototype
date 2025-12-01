(() => {
  const svg = document.getElementById("concept-map");
  const infoPanel = document.getElementById("info-panel");
  const zoomReadout = document.getElementById("zoom-readout");
  const typeFilterEl = document.getElementById("type-filter");
  const expertiseFilterEl = document.getElementById("expertise-filter");

  if (!svg || !conceptData) {
    console.warn("Concept map: missing SVG or data");
    return;
  }

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

  const filters = {
    types: new Set(["topic", "goal", "activity", "term"]),
    expertise: new Set()
  };

  const nodes = conceptData.nodes.map((node) => ({
    ...node,
    levels: extractLevels(node.expertise)
  }));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const edges = conceptData.edges ?? [];
  const edgesById = new Map(edges.map((edge) => [edge.id, edge]));

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
      { key: "goal", label: "Goals" },
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
      if (node.type === "topic") {
        const group = document.createElementNS(ns, "g");
        group.classList.add("node", "node--topic", "detail-wide");
        group.dataset.id = node.id;

        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", node.radius || 120);
        circle.setAttribute("filter", "url(#soft-shadow)");
        group.appendChild(circle);

        const label = document.createElementNS(ns, "text");
        label.classList.add("topic-label");
        label.setAttribute("x", node.x);
        label.setAttribute("y", node.y);
        label.textContent = node.label;
        group.appendChild(label);

        const meta = document.createElementNS(ns, "text");
        meta.classList.add("topic-label");
        meta.setAttribute("x", node.x);
        meta.setAttribute("y", node.y + 20);
        meta.textContent = `${node.expertise || ""} ${node.lessons || ""}`.trim();
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
      if (node.type === "topic") {
        return;
      }
      const group = document.createElementNS(ns, "g");
      group.classList.add("node", `node--${node.type}`, detailClassForNode(node.type));
      group.dataset.id = node.id;

      if (node.type === "goal") {
        drawGoal(group, node);
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

  function drawGoal(group, node) {
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
    group.appendChild(text);
  }

  function drawTerm(group, node) {
    const size = 24;
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
    group.appendChild(text);
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
      if (event.button !== 0 || event.target.closest(".node")) {
        return;
      }
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
      const current = mapFromClient(event);
      const dx = current.x - state.panSession.origin.x;
      const dy = current.y - state.panSession.origin.y;
      state.viewBox.x = state.panSession.start.x - dx;
      state.viewBox.y = state.panSession.start.y - dy;
      clampViewBox();
      applyViewBox();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
      svg.addEventListener(type, (event) => {
        if (state.panSession && state.panSession.pointerId === event.pointerId) {
          svg.releasePointerCapture(event.pointerId);
          state.panSession = null;
        }
      });
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
    applyViewBox();
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
        <p>Highlight a topic, goal, term, or activity to see how it supports the path to mastery.</p>
        <ul>
          <li>Zoom out to compare overlapping topics.</li>
          <li>Zoom in for activities that validate learning goals.</li>
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
    if (node.lessons) {
      metaParts.push(node.lessons);
    }
    if (metaParts.length) {
      meta.textContent = metaParts.join(" | ");
      header.appendChild(meta);
    }

    infoPanel.appendChild(header);

    if (node.description) {
      const desc = document.createElement("p");
      desc.textContent = node.description;
      infoPanel.appendChild(desc);
    }

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
    if (relation === "contains") {
      if (node.type === "topic" && other.type !== "topic") {
        return "Includes";
      }
      if (other.type === "topic" && node.type !== "topic") {
        return "Part of";
      }
    }
    if (relation === "relates") {
      return "Relates to";
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

  function detailClassForNode(type) {
    if (type === "activity") {
      return "detail-close";
    }
    if (type === "goal" || type === "term") {
      return "detail-mid";
    }
    return "detail-wide";
  }

  function detailClassForEdge(relation) {
    if (relation === "validates") {
      return "close";
    }
    if (relation === "relates") {
      return "mid";
    }
    return "wide";
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
